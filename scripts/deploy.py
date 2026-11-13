#!/usr/bin/env python3
"""Deploy the new applet using the existing GUS Apps upload contract.

Tokens/cookies are read from the environment and never printed or saved.
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from package_app import package, ROOT

HOST = 'https://gus-apps.internal.salesforce.com'
SLUG = 'cfs-release-review-tracker'


def auth_headers():
    token = os.environ.get('GUS_DEPLOY_TOKEN', '')
    cookie = os.environ.get('GUS_APPS_COOKIE', '')
    if token:
        return {'Authorization': 'Bearer ' + token}
    if cookie:
        return {'Cookie': 'connect.sid=' + cookie.removeprefix('connect.sid=')}
    result = subprocess.run(['sf', 'org', 'display', '--target-org',
                             os.environ.get('GUS_ORG', 'GusProduction'), '--json'],
                            capture_output=True, text=True, timeout=40,
                            env={**os.environ, 'SF_DISABLE_LOG_FILE': 'true'})
    try:
        data = json.loads(result.stdout)
    except ValueError:
        data = {}
    token = data.get('result', {}).get('accessToken') if data.get('status') == 0 else None
    if not token:
        raise RuntimeError('Deployment authentication is missing. Set GUS_DEPLOY_TOKEN or GUS_APPS_COOKIE in your terminal, or sign in with: sf org login web --instance-url https://gus.my.salesforce.com --alias GusProduction')
    return {'Authorization': 'Bearer ' + token}


def call(url, headers, body=None, method=None):
    req = urllib.request.Request(url, data=body, headers=headers,
                                 method=method or ('POST' if body is not None else 'GET'))
    with urllib.request.urlopen(req, timeout=120) as response:
        return json.load(response)


def unwrap(data):
    for _ in range(6):
        if isinstance(data, dict) and data.get('ok') is False:
            raise RuntimeError(data.get('error', 'GUS Apps rejected the request.'))
        if isinstance(data, dict) and 'payload' in data:
            data = data['payload']
        else:
            return data
    return data


def main():
    artifact = package()
    print('Package ready:', artifact)
    headers = auth_headers()
    boundary = '----CFS' + uuid.uuid4().hex
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{artifact.name}"\r\n'
            'Content-Type: application/zip\r\n\r\n').encode() + artifact.read_bytes() + f'\r\n--{boundary}--\r\n'.encode()
    deployed = call(HOST + '/api/applets/deploy',
                    {**headers, 'Content-Type': 'multipart/form-data; boundary=' + boundary}, body)
    deployed = unwrap(deployed)
    if deployed.get('ok') is not True:
        raise RuntimeError('GUS Apps did not confirm deployment. Check the applet in GUS Apps before retrying.')
    expected_version = json.loads((ROOT / 'package.json').read_text())['version']
    report = {'uploaded': True, 'activated': False, 'slug': SLUG, 'url': HOST + '/applets/' + SLUG,
              'expectedBackendVersion': expected_version, 'verified': False}
    (ROOT / 'dist' / 'deployment-status.json').write_text(json.dumps(report, indent=2))
    print('Uploaded:', report['url'])
    if '--staging-only' in sys.argv:
        print('Staged for the required build review. Production was not activated.')
        return
    print('Upload accepted. Activating the approved update…')
    try:
        # The platform requires a current review verdict for the staged build before promotion.
        # It comes from an independent review (see .local/platform-review-verdict.json), never auto-generated here.
        verdict_path = ROOT / '.local' / 'platform-review-verdict.json'
        if '--verdict' in sys.argv:
            verdict_path = Path(sys.argv[sys.argv.index('--verdict') + 1])
        if not verdict_path.is_file():
            raise RuntimeError('Staged but not activated: no review verdict at ' + str(verdict_path) + '. Run an independent review of this build and save its verdict there.')
        json_headers = {**headers, 'Content-Type': 'application/json'}
        unwrap(call(HOST + '/api/applets/' + SLUG + '/review-verdict', json_headers,
                    verdict_path.read_bytes(), method='POST'))
        promoted = unwrap(call(HOST + '/api/applets/' + SLUG + '/promote', json_headers,
                              json.dumps({'decision': 'approve'}).encode(), method='PATCH'))
        if promoted.get('promoted') is not True:
            raise RuntimeError('GUS Apps did not confirm activation. The update remains staged.')
        report['activated'] = True
        (ROOT / 'dist' / 'deployment-status.json').write_text(json.dumps(report, indent=2))
    except Exception:
        report['activationError'] = 'Activation was not confirmed. Use the platform promotion/review flow; do not treat upload as publication.'
        (ROOT / 'dist' / 'deployment-status.json').write_text(json.dumps(report, indent=2))
        raise
    print('Update activated. Checking the live backend version…')
    checks = {}
    handler_headers = headers
    if os.environ.get('GUS_APPS_COOKIE'):
        handler_headers = {'Cookie': 'connect.sid=' + os.environ['GUS_APPS_COOKIE'].removeprefix('connect.sid=')}
    try:
        for action in ('connection', 'state'):
            checks[action] = unwrap(call(HOST + '/api/applets/' + SLUG + '/handler',
                                          {**handler_headers, 'Content-Type': 'application/json'},
                                          json.dumps({'action': action}).encode()))
    except RuntimeError as error:
        report['backendCheckError'] = str(error)
        (ROOT / 'dist' / 'deployment-status.json').write_text(json.dumps(report, indent=2))
        if 'Salesforce auth context' in str(error):
            raise RuntimeError('Applet update uploaded and activated. The deployment token does not provide a Salesforce user session. Verify the live backend in a signed-in GUS Apps session.') from None
        raise
    report['liveBackendVersion'] = checks['connection'].get('version')
    report['verified'] = (checks['connection'].get('connected') is True
                          and report['liveBackendVersion'] == expected_version
                          and isinstance(checks['state'].get('releases'), list))
    (ROOT / 'dist' / 'deployment-status.json').write_text(json.dumps(report, indent=2))
    if not report['verified']:
        raise RuntimeError('Code uploaded, but backend verification did not pass. Check run-as-user and ContentVersion permissions.')
    print('Deployment and read-only backend checks passed:', report['url'])


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, subprocess.SubprocessError, urllib.error.URLError) as error:
        # Avoid dumping HTTP response bodies, request objects or credentials.
        message = str(error) if isinstance(error, RuntimeError) else type(error).__name__ + ': deployment connection failed.'
        print(message, file=sys.stderr)
        sys.exit(1)
