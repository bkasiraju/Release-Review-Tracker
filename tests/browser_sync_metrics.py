"""Accurate per-operation sync metrics and five-second/manual dismissal."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='cfs-sync-metrics-') as tmp:
 fixture=Path(tmp)/'data.json';seed=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))'],cwd=ROOT));fixture.write_text(json.dumps(seed));server=subprocess.Popen(['node','server.js','--fixture'],cwd=ROOT,env={**os.environ,'PORT':'8400','CFS_FIXTURE_FILE':str(fixture)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   browser=p.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1000});page.goto('http://127.0.0.1:8400');expect(page.locator('#epic-count')).to_have_text('6');note=page.locator('#sync-metrics');expect(note).to_be_hidden()
   page.locator('#fetch-button').click();expect(page.locator('#fetch-button')).to_be_enabled(timeout=15000);expect(note).to_contain_text('GUS refresh');expect(note).to_contain_text('8 app requests');expect(note).to_contain_text('0 sync AI tokens');expect(note).to_contain_text('6 epics checked');expect(note).to_contain_text('AI summaries excluded');bounds=note.bounding_box();assert bounds['x']>900 and bounds['y']<30;expect(note).to_be_hidden(timeout=6500)
   page.locator('[data-do="month"][data-month="2026-11"]').first.click();page.locator('#monthly-text').fill('Validated rollout readiness with the owning team.');page.locator('#save-draft').click();expect(note).to_be_visible();expect(note).to_contain_text('GUS sync');expect(note).to_contain_text('2 app requests');expect(note).to_contain_text('Monthly update saved and verified in GUS');page.get_by_role('button',name='Dismiss sync metrics').click();expect(note).to_be_hidden()
   def fail_fetch(route):
    if route.request.post_data_json.get('action')=='fetch':route.fulfill(json={'ok':False,'error':'Fixture source unavailable'})
    else:route.continue_()
   page.route('**/api/handler',fail_fetch);page.locator('#fetch-button').click();expect(page.locator('#fetch-button')).to_be_enabled(timeout=10000);expect(note).to_contain_text('1 app request');expect(note).to_contain_text('Some sync activity needs attention');page.set_viewport_size({'width':390,'height':844});assert note.bounding_box()['x']>=0;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');browser.close();print('Sync metrics checks passed: measured load/refresh/save/failure requests, 0 sync AI tokens, top-right placement, automatic five-second and x dismissal.')
 finally:server.terminate();server.wait(timeout=10)
