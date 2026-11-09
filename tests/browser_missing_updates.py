"""Missing monthly updates use one compact row while preserving manual/AI entry."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='cfs-missing-') as tmp:
 fixture=Path(tmp)/'data.json';seed=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))'],cwd=ROOT))
 for key,row in seed['docs'].items():
  if key.startswith('epic:'):row['comments']='';seed['remote'][row['id']]['comments']=''
 fixture.write_text(json.dumps(seed));server=subprocess.Popen(['node','server.js','--fixture'],cwd=ROOT,env={**os.environ,'PORT':'8404','CFS_FIXTURE_FILE':str(fixture)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   browser=p.chromium.launch();page=browser.new_page(viewport={'width':1500,'height':1000});page.add_init_script("window.sdkCalls=0;window.AppletAI={isAvailable:()=>true,complete:async()=>{window.sdkCalls++;await new Promise(r=>setTimeout(r,300));return {text:'The team is progressing toward readiness. Partner validation is the next delivery step.'};}};");page.goto('http://127.0.0.1:8404');expect(page.locator('#epic-count')).to_have_text('6');expect(page.locator('.missing-update-row')).to_have_count(18);expect(page.locator('.missing-update')).to_have_count(0);expect(page.locator('[data-do="ai-peek"]')).to_have_count(0);assert page.locator('.missing-update-row').first.evaluate('(e)=>e.getBoundingClientRect().height')<=32;expect(page.locator('.missing-status').first).to_have_text('Missing Update');expect(page.locator('.is-missing .ai-summarise').first).to_have_text('AI Summary');page.screenshot(path='/tmp/cfs-v1110-missing.png')
   target=page.locator('.missing-update-trigger').first;target.hover();page.wait_for_timeout(950);assert page.evaluate('window.sdkCalls')==0;target.click();expect(page.locator('#monthly-text')).to_have_value('');page.get_by_role('button',name='Close sidebar').click();page.locator('.is-missing [data-do="ai-month"]').first.click();expect(page.locator('.ai-month-loading')).to_be_visible();expect(page.locator('#monthly-text')).to_have_value(__import__('re').compile('^The team is progressing toward readiness.'),timeout=15000);assert page.evaluate('window.sdkCalls')==1;assert json.loads(fixture.read_text())['remote']==seed['remote'];assert json.loads(fixture.read_text())['docs']==seed['docs'];browser.close();print('Missing update checks passed: compact Missing + AI row, no repeated large boxes, manual entry, intentional AI draft and no automatic writes.')
 finally:server.terminate();server.wait(timeout=10)
