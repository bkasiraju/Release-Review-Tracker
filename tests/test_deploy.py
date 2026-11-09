import importlib
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
deploy = importlib.import_module('deploy')


class DeploymentTests(unittest.TestCase):
    def test_uploaded_update_is_activated_before_live_verification(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'dist').mkdir()
            artifact = root / 'app.zip'
            artifact.write_bytes(b'package')
            (root / 'package.json').write_text(json.dumps({'version': '9.0.0'}))
            calls = []

            def call(url, headers, body=None, method=None):
                calls.append((url, method, json.loads(body) if body and method == 'PATCH' else None))
                if url.endswith('/deploy'):
                    return {'ok': True, 'promoted': False, 'applet': {'hasPendingUpdate': True}}
                if url.endswith('/promote'):
                    return {'ok': True, 'promoted': True}
                action = json.loads(body)['action']
                return {'ok': True, 'payload': {'connected': True, 'version': '9.0.0'} if action == 'connection' else {'releases': []}}

            with patch.object(deploy, 'ROOT', root), patch.object(deploy, 'package', return_value=artifact), patch.object(deploy, 'auth_headers', return_value={}), patch.object(deploy, 'call', side_effect=call):
                deploy.main()
            self.assertEqual(calls[1][1:], ('PATCH', {'promoted': True}))
            self.assertTrue(json.loads((root / 'dist/deployment-status.json').read_text())['activated'])

    def test_nested_upload_rejection_does_not_activate_anything(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            artifact = root / 'app.zip'
            artifact.write_bytes(b'package')
            with patch.object(deploy, 'ROOT', root), patch.object(deploy, 'package', return_value=artifact), patch.object(deploy, 'auth_headers', return_value={}), patch.object(deploy, 'call', return_value={'ok': True, 'payload': {'ok': False, 'error': 'Rejected package'}}) as call:
                with self.assertRaisesRegex(RuntimeError, 'Rejected package'):
                    deploy.main()
                self.assertEqual(call.call_count, 1)


if __name__ == '__main__':
    unittest.main()
