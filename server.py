#!/usr/bin/env python3
"""
CFS Release Review Dashboard — Local server with GUS write-back API.
Serves static files and proxies GUS updates via sf CLI.
"""

import http.server
import json
import subprocess
import urllib.parse
import urllib.error
import urllib.request
import os
import sys

PORT = int(os.environ.get('SERVER_PORT', '8282'))
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))
RISKS_FILE = os.path.join(STATIC_DIR, 'data', 'risks.json')

DEFAULT_LLM_GATEWAY = (
    'https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl/chat/completions'
)

FIELD_MAP = {
    'health':    'Health__c',
    'pathToGreen': 'Path_to_Green__c',
    'slippage':  'Slippage_Comments__c',
    'priority':  'Priority__c',
    'plannedStartDate': 'Planned_Start_Date__c',
    'plannedEndDate':   'Planned_End_Date__c',
}

HEALTH_VALUES = {'On Track', 'Watch', 'Blocked', 'Not Started', 'On Hold', 'Completed', 'Canceled'}

MONTH_SHORT_TO_FULL = {
    'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April',
    'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August',
    'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December',
}

MONTH_ORDER_FULL = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]


def month_field_to_full(field):
    """month-Dec → December (browser sends 3-letter month after month-)."""
    if not field.startswith('month-') or len(field) < 9:
        return None
    short = field[6:]
    return MONTH_SHORT_TO_FULL.get(short)


def normalize_epic_id(epic_id):
    return (epic_id or '').strip() if isinstance(epic_id, str) else ''


def resolve_epic_id_for_rest(epic_id):
    """Prefer 18-char Id for REST PATCH (sheet / DOM may supply 15-char keys)."""
    e = normalize_epic_id(epic_id)
    if not e:
        return e
    if len(e) >= 18:
        return e
    if len(e) == 15:
        try:
            rows = run_sf_query(
                f"SELECT Id FROM ADM_Epic__c WHERE Id = '{soql_quote_literal(e)}' LIMIT 1"
            )
            if rows and rows[0].get('Id'):
                return rows[0]['Id']
        except Exception:
            pass
    return e


def soql_quote_literal(value):
    return (value or '').replace("'", "''")


def run_sf_query(soql):
    result = subprocess.run(
        ['sf', 'data', 'query', '-q', soql, '--json', '-o', 'GusProduction'],
        capture_output=True, text=True, timeout=30
    )
    data = json.loads(result.stdout)
    return data.get('result', {}).get('records', [])


def org_rest_credentials():
    """Instance URL + token + REST version segment (e.g. v67.0) for GusProduction."""
    result = subprocess.run(
        ['sf', 'org', 'display', '--json', '-o', 'GusProduction'],
        capture_output=True, text=True, timeout=30,
    )
    data = json.loads(result.stdout or '{}')
    if data.get('status') != 0:
        raise RuntimeError(data.get('message') or result.stderr or 'sf org display failed')
    res = data.get('result') or {}
    instance = (res.get('instanceUrl') or '').rstrip('/')
    token = res.get('accessToken') or ''
    if not instance or not token:
        raise RuntimeError('sf org display missing instanceUrl or accessToken')
    ver = str(res.get('apiVersion', '62.0'))
    if not ver.startswith('v'):
        ver = 'v' + ver
    return instance, token, ver


def run_sf_update(creds, object_name, record_id, values):
    """PATCH record via REST so values can contain quotes, newlines, and unicode."""
    instance_url, token, api_ver_path = creds
    url = f'{instance_url}/services/data/{api_ver_path}/sobjects/{object_name}/{record_id}'
    body = json.dumps(values).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='PATCH')
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            if resp.status in (200, 204):
                return True, {'statusCode': resp.status}
            raw = resp.read().decode('utf-8', errors='replace')
            return False, {'message': raw, 'statusCode': resp.status}
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8', errors='replace')
        try:
            err = json.loads(raw)
        except json.JSONDecodeError:
            return False, {'message': raw, 'statusCode': e.code}
        if isinstance(err, list) and err:
            first = err[0]
            return False, {
                'message': first.get('message', raw),
                'errorCode': first.get('errorCode', ''),
                'fields': first.get('fields'),
                'full': err,
            }
        if isinstance(err, dict):
            return False, err
        return False, {'message': raw, 'statusCode': e.code}


def get_current_comments(epic_id):
    eid = soql_quote_literal(normalize_epic_id(epic_id))
    records = run_sf_query(
        f"SELECT Id, Epic_Health_Comments__c FROM ADM_Epic__c WHERE Id = '{eid}' LIMIT 1"
    )
    if records:
        return records[0].get('Epic_Health_Comments__c') or ''
    return ''


def epic_exists(epic_id):
    eid = soql_quote_literal(normalize_epic_id(epic_id))
    records = run_sf_query(f"SELECT Id FROM ADM_Epic__c WHERE Id = '{eid}' LIMIT 1")
    return bool(records)


def merge_month_comment(existing_comments, month_label, new_text):
    """Merge one month section; preserve first-seen month order when re-serializing."""
    sections = {}
    order_seen = []
    current_month = None
    lines = (existing_comments or '').split('\n')

    for line in lines:
        stripped = line.strip()
        matched = False
        for m in MONTH_ORDER_FULL:
            low = stripped.lower()
            if low.startswith(m.lower() + ':') or low.startswith(m.lower() + ' '):
                current_month = m
                rest = stripped[len(m):].lstrip(':').strip()
                sections[m] = rest
                matched = True
                if m not in order_seen:
                    order_seen.append(m)
                break
        if not matched:
            for abbrev, full in sorted(MONTH_SHORT_TO_FULL.items(), key=lambda x: len(x[0]), reverse=True):
                low = stripped.lower()
                if low.startswith(abbrev.lower() + ':') or low.startswith(abbrev.lower() + ' '):
                    current_month = full
                    rest = stripped[len(abbrev):].lstrip(':').strip()
                    sections[full] = rest
                    matched = True
                    if full not in order_seen:
                        order_seen.append(full)
                    break
        if not matched and current_month:
            sections[current_month] = sections.get(current_month, '') + '\n' + line

    sections[month_label] = new_text.strip()
    if month_label not in order_seen:
        order_seen.append(month_label)

    result_parts = []
    for m in order_seen:
        if m in sections and sections[m].strip():
            result_parts.append(f"{m}: {sections[m].strip()}")
    return '\n'.join(result_parts)


class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/risks':
            self._handle_risks_get()
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == '/api/gus-query':
            self._handle_gus_query()
        elif parsed.path == '/api/gus-update':
            self._handle_gus_update()
        elif parsed.path == '/api/gus-batch-update':
            self._handle_gus_batch_update()
        elif parsed.path == '/api/gus-rest-patch':
            self._handle_gus_rest_patch()
        elif parsed.path == '/api/risks':
            self._handle_risks_post()
        elif parsed.path == '/api/llm':
            self._handle_llm_proxy()
        else:
            self.send_error(404, 'Not Found')

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def _json_response(self, status, data):
        self.send_response(status)
        self._cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _handle_risks_get(self):
        try:
            if os.path.exists(RISKS_FILE):
                with open(RISKS_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            else:
                data = []
            self._json_response(200, {'status': 'ok', 'risks': data})
        except Exception as e:
            self._json_response(500, {'error': str(e)})

    def _handle_llm_proxy(self):
        """Forward JSON body to Salesforce AI gateway.

        Token resolution (first match wins):
        1) Authorization: Bearer <token> from the browser request (runtime UI / curl override)
        2) LLM_BEARER_TOKEN or GEMINI_GATEWAY_TOKEN in the server environment
        """
        auth_hdr = (self.headers.get('Authorization') or '').strip()
        token = ''
        if auth_hdr.lower().startswith('bearer '):
            token = auth_hdr[7:].strip()
        if not token:
            token = (os.environ.get('LLM_BEARER_TOKEN') or os.environ.get('GEMINI_GATEWAY_TOKEN') or '').strip()
        if not token:
            self._json_response(
                503,
                {'error': 'LLM proxy not configured — paste token in AI tab (session), or export LLM_BEARER_TOKEN on the server'},
            )
            return
        try:
            length = int(self.headers.get('Content-Length') or '0')
            raw = self.rfile.read(length) if length else b'{}'
            payload = raw.decode('utf-8')
            gateway = (os.environ.get('LLM_GATEWAY_URL') or DEFAULT_LLM_GATEWAY).strip()
            req = urllib.request.Request(gateway, data=payload.encode('utf-8'), method='POST')
            req.add_header('Content-Type', 'application/json')
            req.add_header('Authorization', 'Bearer ' + token)
            try:
                with urllib.request.urlopen(req, timeout=180) as resp:
                    body_out = resp.read()
                    code = resp.getcode()
            except urllib.error.HTTPError as e:
                body_out = e.read()
                code = e.code
            self.send_response(code)
            self._cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(body_out)
        except Exception as e:
            self._json_response(502, {'error': str(e)})

    def _handle_risks_post(self):
        try:
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            risks = body.get('risks', [])
            os.makedirs(os.path.dirname(RISKS_FILE), exist_ok=True)
            with open(RISKS_FILE, 'w', encoding='utf-8') as f:
                json.dump(risks, f, indent=2, ensure_ascii=False)
            self._json_response(200, {'status': 'ok', 'count': len(risks)})
        except Exception as e:
            self._json_response(500, {'error': str(e)})

    def _handle_gus_query(self):
        try:
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            soql = body.get('soql', '')
            if not soql:
                return self._json_response(400, {'error': 'soql required'})
            records = run_sf_query(soql)
            self._json_response(200, {'status': 'ok', 'records': records})
        except subprocess.TimeoutExpired:
            self._json_response(504, {'error': 'GUS query timed out'})
        except Exception as e:
            self._json_response(500, {'error': str(e)})

    def _handle_gus_update(self):
        try:
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            epic_id = normalize_epic_id(body.get('epicId'))
            field = body.get('field')
            value = body.get('value', '')

            if not epic_id or not field:
                return self._json_response(400, {'error': 'epicId and field required'})

            if field.startswith('month-'):
                month_label = month_field_to_full(field)
                if not month_label:
                    return self._json_response(400, {'error': f'Unknown month field: {field}'})
                existing = get_current_comments(epic_id)
                merged = merge_month_comment(existing, month_label, value)
                gus_field = 'Epic_Health_Comments__c'
                gus_value = merged
            elif field == 'health':
                if value not in HEALTH_VALUES:
                    return self._json_response(400, {'error': f'Invalid health value: {value}'})
                gus_field = 'Health__c'
                gus_value = value
            elif field in FIELD_MAP:
                gus_field = FIELD_MAP[field]
                gus_value = value
            else:
                return self._json_response(200, {'status': 'skipped', 'reason': f'Field {field} not mapped to GUS'})

            if not epic_exists(epic_id):
                return self._json_response(200, {
                    'status': 'error',
                    'epicId': epic_id,
                    'gusField': gus_field,
                    'error': 'Epic Id not found in GUS for this org (no ADM_Epic__c row).',
                })

            creds = org_rest_credentials()
            success, result = run_sf_update(creds, 'ADM_Epic__c', epic_id, {gus_field: gus_value})

            if success:
                self._json_response(200, {
                    'status': 'ok',
                    'epicId': epic_id,
                    'gusField': gus_field,
                    'updated': True
                })
            else:
                msg = result.get('message') or json.dumps(result)[:500]
                self._json_response(200, {
                    'status': 'error',
                    'epicId': epic_id,
                    'gusField': gus_field,
                    'error': msg,
                    'detail': result,
                })

        except Exception as e:
            self._json_response(500, {'error': str(e)})

    def _handle_gus_batch_update(self):
        try:
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            updates = body.get('updates', [])
            results = []
            creds = org_rest_credentials()

            for upd in updates:
                epic_id = normalize_epic_id(upd.get('epicId'))
                fields = upd.get('fields', {})
                if not epic_id or not fields:
                    results.append({'epicId': epic_id, 'status': 'skipped'})
                    continue

                gus_updates = {}
                month_updates = {}

                for field, value in fields.items():
                    if field.startswith('month-'):
                        month_label = month_field_to_full(field)
                        if month_label:
                            month_updates[month_label] = value
                    elif field == 'health' and value in HEALTH_VALUES:
                        gus_updates['Health__c'] = value
                    elif field in FIELD_MAP:
                        gus_updates[FIELD_MAP[field]] = value

                if month_updates:
                    existing = get_current_comments(epic_id)
                    merged = existing or ''
                    for month_label, text in month_updates.items():
                        merged = merge_month_comment(merged, month_label, text)
                    gus_updates['Epic_Health_Comments__c'] = merged

                if gus_updates:
                    if not epic_exists(epic_id):
                        results.append({
                            'epicId': epic_id,
                            'status': 'error',
                            'error': 'Epic Id not found in GUS for this org (no ADM_Epic__c row).',
                        })
                        continue
                    success, result = run_sf_update(creds, 'ADM_Epic__c', epic_id, gus_updates)
                    row = {
                        'epicId': epic_id,
                        'status': 'ok' if success else 'error',
                        'fields': list(gus_updates.keys()),
                    }
                    if not success:
                        row['error'] = result.get('message') or json.dumps(result)[:500]
                    results.append(row)
                else:
                    results.append({'epicId': epic_id, 'status': 'skipped', 'reason': 'no GUS fields'})

            self._json_response(200, {'status': 'ok', 'results': results})

        except Exception as e:
            self._json_response(500, {'error': str(e)})

    def _handle_gus_rest_patch(self):
        """PATCH ADM_Epic__c with Salesforce API field names (browser REST is CORS-blocked locally)."""
        try:
            body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            epic_id = resolve_epic_id_for_rest(body.get('epicId'))
            fields = body.get('fields') or {}
            if not epic_id or not isinstance(fields, dict) or not fields:
                return self._json_response(400, {'error': 'epicId and fields required'})
            creds = org_rest_credentials()
            ok, detail = run_sf_update(creds, 'ADM_Epic__c', epic_id, fields)
            if ok:
                self._json_response(200, {'status': 'ok', 'epicId': epic_id})
            else:
                msg = detail.get('message') if isinstance(detail, dict) else str(detail)
                err_code = (detail.get('errorCode') if isinstance(detail, dict) else None) or ''
                status = 400 if err_code in ('ENTITY_IS_DELETED', 'NOT_FOUND', 'MALFORMED_ID') else 502
                self._json_response(status, {'status': 'error', 'error': msg[:1200], 'detail': detail})
        except Exception as e:
            self._json_response(500, {'error': str(e)})


if __name__ == '__main__':
    print(f'\n  CFS Release Dashboard Server')
    print(f'  http://localhost:{PORT}/index.html')
    print(f'  GUS write-back: POST /api/gus-update')
    print(f'  GUS batch:      POST /api/gus-batch-update')
    print(f'  Risk register:  GET/POST /api/risks  ({RISKS_FILE})\n')

    server = http.server.HTTPServer(('', PORT), DashboardHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down.')
        server.shutdown()
