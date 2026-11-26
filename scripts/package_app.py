#!/usr/bin/env python3
"""Build the exact GUS Apps artifact; never include local state or credentials."""
from pathlib import Path
import json
import os
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def package():
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    assert manifest['slug'] == 'cfs-release-review-tracker', 'Unexpected deployment slug'
    out = ROOT / 'dist' / 'cfs-release-review-tracker.zip'
    out.parent.mkdir(exist_ok=True)
    paths = [ROOT / 'manifest.json', *sorted((ROOT / 'backend').glob('*.js')),
             *sorted((ROOT / 'public').glob('*'))]
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in paths:
            if file.is_file():
                archive.write(file, file.relative_to(ROOT))
        # Build stamp shown in the review deck footer: the commit this package was built from.
        commit, dirty = '', False
        try:
            if os.environ.get('NO_BUILD_STAMP'):
                raise RuntimeError('stamp disabled (golden archive)')
            commit = subprocess.check_output(['git', '-C', str(ROOT), 'rev-parse', '--short=7', 'HEAD'], text=True).strip()
            dirty = bool(subprocess.check_output(['git', '-C', str(ROOT), 'status', '--porcelain', '--', 'public', 'backend', 'manifest.json'], text=True).strip())
        except Exception:
            commit, dirty = '', False
        if commit:
            archive.writestr('public/build.json', json.dumps({'commit': commit + ('+' if dirty else '')}))
    return out


if __name__ == '__main__':
    print(package())
