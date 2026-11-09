"""Empty selection guidance survives menu updates and stops after release selection."""
import os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='cfs-cue-') as tmp:
 f=Path(tmp)/'data.json';f.write_bytes(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))'],cwd=ROOT))
 server=subprocess.Popen(['node','server.js','--fixture'],cwd=ROOT,env={**os.environ,'PORT':'8413','CFS_FIXTURE_FILE':str(f)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review' in server.stdout.readline()
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':1440,'height':1000});calls=[];page.on('request',lambda r:calls.append(r.post_data_json.get('action')) if r.method=='POST' and r.url.endswith('/api/handler') else None);page.goto('http://127.0.0.1:8413');expect(page.locator('#epic-count')).to_have_text('6');expect(page.locator('.release-selection-cue')).to_have_count(0)
   page.get_by_role('button',name='Releases',exact=True).click();page.locator('#release-select-options').get_by_role('button',name='Clear all',exact=True).click();page.keyboard.press('Escape');expect(page.locator('.release-selection-cue')).to_be_visible();expect(page.get_by_role('button',name='Releases',exact=True)).to_have_attribute('aria-describedby','release-selection-hint');assert page.locator('.release-selection-cue').evaluate('e=>getComputedStyle(e).animationName')=='release-select-nudge';assert page.locator('.release-selection-cue').evaluate('e=>getComputedStyle(e).animationIterationCount')=='2'
   for width in [320,390,760,1440]:
    page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width;assert page.locator('.release-picker .multi-trigger-label').evaluate('e=>e.scrollWidth<=e.clientWidth'),width
   page.emulate_media(reduced_motion='reduce');assert page.locator('.release-selection-cue').evaluate('e=>getComputedStyle(e).animationName')=='none';page.set_viewport_size({'width':1440,'height':1000});page.screenshot(path='/tmp/cfs-release-selection-cue.png');page.get_by_role('button',name='Releases',exact=True).click();page.locator('#release-select-options input[type=checkbox]').first.check();page.keyboard.press('Escape');expect(page.locator('.release-selection-cue')).to_have_count(0);expect(page.locator('#epic-count')).to_have_text('6');assert 'fetch' not in calls;b.close();print('Release cue checks passed: only loaded empty selection, survives menu sync, disappears after selection, full text320–1440px, reduced motion and no extra GUS fetch.')
 finally:server.terminate();server.wait(timeout=10)
