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

FIELD_MAP = {
    'month-Apr': 'Epic_Health_Comments__c',
    'month-May': 'Epic_Health_Comments__c',
    'month-Jun': 'Epic_Health_Comments__c',
    'month-Jul': 'Epic_Health_Comments__c',
    'health':    'Health__c',
    'pathToGreen': 'Path_to_Green__c',
    'slippage':  'Slippage_Comments__c',
    'priority':  'Priority__c',
    'plannedStartDate': 'Planned_Start_Date__c',
    'plannedEndDate':   'Planned_End_Date__c',
}

HEALTH_VALUES = {'On Track', 'Watch', 'Blocked', 'Not Started', 'On Hold', 'Completed', 'Canceled'}
MONTH_ORDER = ['April', 'May', 'June', 'July']
MONTH_KEY_MAP = {'month-Apr': 'April', 'month-May': 'May', 'month-Jun': 'June', 'month-Jul': 'July'}


def normalize_epic_id(epic_id):
    return (epic_id or '').strip() if isinstance(epic_id, str) else ''


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
    sections = {}
    current_month = None
    lines = (existing_comments or '').split('\n')

    for line in lines:
        stripped = line.strip()
        matched = False
        for m in MONTH_ORDER:
            if stripped.lower().startswith(m.lower() + ':') or stripped.lower().startswith(m.lower() + ' '):
                current_month = m
                rest = stripped[len(m):].lstrip(':').strip()
                sections[m] = rest
                matched = True
                break
        if not matched and current_month:
            sections[current_month] = sections.get(current_month, '') + '\n' + line

    sections[month_label] = new_text.strip()

    result_parts = []
    for m in MONTH_ORDER:
        if m in sections and sections[m].strip():
            result_parts.append(f"{m}: {sections[m].strip()}")
    return '\n'.join(result_parts)


class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == '/api/gus-query':
            self._handle_gus_query()
        elif parsed.path == '/api/gus-update':
            self._handle_gus_update()
        elif parsed.path == '/api/gus-batch-update':
            self._handle_gus_batch_update()
        else:
            self.send_error(404, 'Not Found')

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json_response(self, status, data):
        self.send_response(status)
        self._cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

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
                month_label = MONTH_KEY_MAP.get(field)
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
                        month_label = MONTH_KEY_MAP.get(field)
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


if __name__ == '__main__':
    print(f'\n  CFS Release Dashboard Server')
    print(f'  http://localhost:{PORT}/index.html')
    print(f'  GUS write-back: POST /api/gus-update')
    print(f'  GUS batch:      POST /api/gus-batch-update\n')

    server = http.server.HTTPServer(('', PORT), DashboardHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down.')
        server.shutdown()
