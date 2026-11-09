#!/usr/bin/env python3
"""Build the exact GUS Apps artifact; never include local state or credentials."""
from pathlib import Path
import json
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
    return out


if __name__ == '__main__':
    print(package())
