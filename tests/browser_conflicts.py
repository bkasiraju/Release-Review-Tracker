"""UI regression checks for saved-draft conflict resolution and inferred-year editing."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='cfs-review-ui-') as directory:
    fixture = Path(directory) / 'fixture.json'
    data = json.loads(subprocess.check_output(['node', '-e',
        'process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))'], cwd=ROOT))
    one, two = 'a0B000000000001', 'a0B000000000002'
    data['remote'][one]['comments'] = 'Oct Update\nLegacy update'
    data['docs']['epic:' + one]['comments'] = 'Oct Update\nLegacy update'
    e = data['docs']['epic:' + two]
    e['drafts'] = {'2026-11': {'value': 'Saved B', 'base': 'Expanded automated coverage to deployment rollback and service recovery scenarios.', 'revision': 'draft-b'}}
    e['_storageConflicts'] = [{'path': 'drafts.2026-11', 'previous': {'value': 'Saved A'}, 'incoming': {'value': 'Saved B'}}]
    fixture.write_text(json.dumps(data))
    env = {**os.environ, 'PORT': '8384', 'CFS_FIXTURE_FILE': str(fixture)}
    server = subprocess.Popen(['node', 'server.js', '--fixture'], cwd=ROOT, env=env,
                              stdout=subprocess.PIPE, text=True)
    try:
        assert 'Release Review:' in server.stdout.readline()
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={'width': 1280, 'height': 900})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto('http://127.0.0.1:8384')
            expect(page.locator('#sync-count')).to_have_text('1')
            page.locator('#sync-button').click()
            expect(page.locator('.sync-status')).to_contain_text('draft-conflict')
            page.get_by_role('button', name='Resolve this month').click()
            expect(page.locator('#conflict-reference')).to_contain_text('Saved A')
            page.locator('#monthly-text').fill('Combined A and B')
            page.locator('#save-draft').click()
            expect(page.locator('#drawer')).to_be_hidden()
            page.locator('#sync-button').click()
            expect(page.locator('#confirm-sync')).to_be_enabled()
            page.locator('#confirm-sync').click()
            expect(page.locator('#drawer-title')).to_have_text('GUS publish results')
            expect(page.locator('.sync-status')).to_have_text('synced')
            page.get_by_role('button', name='Close sidebar').click()

            page.locator(f'[data-do="month"][data-id="{one}"][data-month="2026-10"]').click()
            page.get_by_role('button', name='Confirm legacy comment years').click()
            page.locator('#year-2026-10').fill('2025')
            page.locator('#confirm-year').click()
            expect(page.locator('#drawer')).to_be_hidden()
            page.locator(f'[data-do="month"][data-id="{one}"][data-month="2025-10"]').click()
            expect(page.locator('#monthly-text')).to_have_value('Legacy update')
            page.locator('#monthly-text').fill('Correctly dated update')
            page.locator('#save-draft').click()
            expect(page.locator('#drawer')).to_be_hidden()
            expect(page.locator('#save-status')).to_contain_text('Saved to GUS', timeout=15000)
            saved = json.loads(fixture.read_text())
            assert 'October 2025 Update:' in saved['remote'][one]['comments']
            assert 'Correctly dated update' in saved['remote'][one]['comments']
            assert not errors, errors
            browser.close()
        print('Browser regression checks passed: competing draft resolution and ordinary legacy-year correction.')
    finally:
        server.terminate()
        server.wait(timeout=10)
