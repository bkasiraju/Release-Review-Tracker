import os,json,tempfile,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
os.chdir(Path(__file__).resolve().parents[1])
with tempfile.TemporaryDirectory() as tmp:
 seed=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))']));id='a0B000000000003';history='November 2026 Update:\nValidation in progress. Evidence: https://docs.google.com/document/d/'+('LongUnbrokenReference'*100)+'/edit\n\nOctober 2026 Update:\nDesign reviewed.'
 for e in [seed['remote'][id],seed['docs']['epic:'+id]]:e['health']='Watch';e['pathToGreen']='';e['comments']=history
 f=Path(tmp)/'data.json';f.write_text(json.dumps(seed));server=subprocess.Popen(['node','server.js','--fixture'],env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(f)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':1600,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8399');expect(page.locator('#epic-count')).to_have_text('6');row=page.locator(f'.epic-summary-row[data-epic-preview="{id}"]');row.locator('[data-review-status]').select_option('Delayed');popup=page.locator('#review-recovery-popup');expect(popup).to_be_visible();expect(popup).to_contain_text('Epic Health Comments');page.locator('#recovery-cancel').click();assert json.loads(f.read_text())['remote'][id]['comments']==history
   row.locator('[data-review-status]').select_option('At-Risk');page.locator('#recovery-text').fill('Complete validation after the partner environment is ready.');page.locator('#recovery-save').click();expect(popup).to_be_hidden();expect(page.locator(f'[data-review-status="{id}"]')).to_have_value('At-Risk');remote=json.loads(f.read_text())['remote'][id];assert remote['pathToGreen']=='Complete validation after the partner environment is ready.';assert remote['comments'].endswith(history);assert 'Path to Green:' in remote['comments'];page.reload();expect(page.locator(f'[data-review-status="{id}"]')).to_have_value('At-Risk')
   for width in [1600,900]:
    page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(160);button=page.locator(f'.epic-summary-row[data-epic-preview="{id}"] .epic-summary-trigger');button.click();panel=page.locator('#epic-updates-preview');expect(panel).to_be_visible();assert panel.evaluate('e=>e.scrollWidth<=e.clientWidth+1');assert page.locator('#epic-updates-body').evaluate('e=>e.scrollWidth<=e.clientWidth+1');assert panel.evaluate('e=>{const p=e.getBoundingClientRect();return p.left>=0&&p.right<=innerWidth}');assert panel.evaluate('e=>{const p=e.getBoundingClientRect();return [...document.querySelectorAll(".epic-summary-trigger")].every(b=>{const r=b.getBoundingClientRect();return p.right<=r.left||p.left>=r.right||p.bottom<=r.top||p.top>=r.bottom})}');page.locator('#close-epic-updates').click()
   assert not errors,errors;b.close();print('PASS inline popup cancel/save, verified dual-field fixture save, history preserved, Review Status/reload, long URL wrapping and unobstructed responsive tooltip.')
 finally:server.terminate();server.wait(timeout=10)
