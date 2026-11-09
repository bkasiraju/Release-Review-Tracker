#!/usr/bin/env python3
"""Read an exact saved-list definition via an authenticated Salesforce CLI org.

Stores metadata only. No access token, session cookie, epic records, or passwords
are included in the generated GUS Apps backend configuration.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def sf_json(args):
    result = subprocess.run(['sf', *args, '--json'], capture_output=True, text=True,
                            timeout=60, env={**os.environ, 'SF_DISABLE_LOG_FILE': 'true'})
    data = json.loads(result.stdout)
    if data.get('status') != 0:
        raise RuntimeError(data.get('message', 'Salesforce CLI request failed.'))
    return data['result']


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--name', default='MAPS_266_Review_Tracker1')
    parser.add_argument('--org', default='GusProduction')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]{0,79}', args.name):
        raise RuntimeError('Use a saved list API name.')
    rows = sf_json(['data', 'query', '--target-org', args.org, '-q',
                    "SELECT Id, Name, DeveloperName, SobjectType FROM ListView "
                    f"WHERE SobjectType = 'ADM_Epic__c' AND DeveloperName = '{args.name}' LIMIT 2"])['records']
    if len(rows) != 1:
        raise RuntimeError('The authenticated GUS org did not return exactly one matching epic list.')
    record = rows[0]
    creds = sf_json(['org', 'display', '--target-org', args.org])
    instance = creds['instanceUrl'].rstrip('/')
    if not re.fullmatch(r'https://[A-Za-z0-9.-]+\.salesforce\.com', instance):
        raise RuntimeError('Unexpected Salesforce instance URL.')
    record_id = record['Id']
    if not re.fullmatch(r'00B[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?', record_id):
        raise RuntimeError('Salesforce returned an invalid list ID.')
    request = urllib.request.Request(
        f'{instance}/services/data/v62.0/sobjects/ADM_Epic__c/listviews/{record_id}/describe',
        headers={'Authorization': 'Bearer ' + creds['accessToken']})
    with urllib.request.urlopen(request, timeout=60) as response:
        description = json.load(response)
    query = description.get('query')
    if not isinstance(query, str) or not re.match(r'^SELECT\b[\s\S]*?\bFROM\s+ADM_Epic__c\b', query, re.I):
        raise RuntimeError('This saved list did not provide a compatible epic SOQL query.')
    columns = [{key: c[key] for key in ['fieldNameOrPath', 'label', 'hidden'] if key in c}
               for c in description.get('columns', [])]
    definition = {'id': record_id, 'developerName': record['DeveloperName'],
                  'objectApiName': 'ADM_Epic__c', 'label': record['Name'],
                  'query': query, 'columns': columns,
                  'verifiedAt': datetime.now(timezone.utc).isoformat(),
                  'digest': hashlib.sha256(json.dumps({'query': query, 'columns': columns},
                                                    sort_keys=True).encode()).hexdigest()}
    path = ROOT / 'backend' / 'list-definitions.js'
    source = path.read_text()
    existing = json.loads(re.search(r'module\.exports\s*=\s*([\s\S]+);\s*$', source).group(1))
    definitions = [d for d in existing if d['developerName'].lower() != args.name.lower()]
    definitions.append(definition)
    path.write_text("'use strict';\n// Verified Salesforce list metadata only; contains no credentials or epic records.\nmodule.exports = "
                    + json.dumps(definitions, indent=2) + ';\n')
    print(json.dumps({'saved': True, 'name': definition['developerName'], 'listId': record_id,
                      'visibleColumns': len([c for c in columns if not c.get('hidden')]),
                      'verifiedAt': definition['verifiedAt'], 'digest': definition['digest']}, indent=2))


if __name__ == '__main__':
    main()
