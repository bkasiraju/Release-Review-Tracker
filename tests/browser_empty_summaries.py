import os,json,tempfile,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
os.chdir(Path(__file__).resolve().parents[1])
with tempfile.TemporaryDirectory() as tmp:
 seed=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))']));id='a0B000000000001'
 for e in [seed['remote'][id],seed['docs']['epic:'+id]]:e['project']='M9.9.9 Empty measure';e['team']='Empty team'
 f=Path(tmp)/'data.json';f.write_text(json.dumps(seed));server=subprocess.Popen(['node','server.js','--fixture'],env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(f)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page();page.add_init_script("window.aiMode='empty';window.copied='';Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.copied=t;}}});window.AppletAI={isAvailable:()=>true,complete:async()=>({text:window.aiMode==='empty'?'\"\"':'Regional validation remains in progress.'})};")
   def legacy_empty(route):
    action=route.request.post_data_json;response=route.fetch();body=response.json()
    if action.get('action')=='executive-blurb' and id in action.get('epicIds',[]):
     payload=body['payload'];payload.pop('ai',None);payload.update(blurb='""',draftReady=True,mode='assisted')
    route.fulfill(response=response,json=body)
   page.route('**/api/handler',legacy_empty);page.goto('http://127.0.0.1:8399');expect(page.locator('#epic-count')).to_have_text('6');page.locator('[data-view=executive]').click();page.locator('#generate-executive').click();expect(page.locator('#generate-executive')).to_be_enabled(timeout=15000);expect(page.locator('#executive-content .executive-measure')).to_have_count(0);expect(page.locator('#copy-executive')).to_be_disabled();expect(page.locator('#executive-content .executive-inspection')).to_have_count(1)
   page.evaluate("window.aiMode='valid'");page.locator('#generate-executive').click();expect(page.locator('#generate-executive')).to_be_enabled(timeout=15000);expect(page.locator('.executive-blurb')).to_have_count(5);assert 'Empty measure' not in ''.join(page.locator('#executive-content .executive-measure>summary').all_text_contents());page.locator('#copy-executive').click();assert '""' not in page.evaluate('window.copied');assert 'Empty team' not in page.evaluate('window.copied')
   page.evaluate("window.aiMode='empty'");page.locator('#generate-method').click();expect(page.locator('#generate-method')).to_be_enabled(timeout=15000);expect(page.locator('#method-summary .executive-measure')).to_have_count(0);expect(page.locator('#method-summary .method-team-update')).to_have_count(0);expect(page.locator('#copy-method')).to_have_count(0);expect(page.locator('#method-summary')).to_contain_text('need review')
   page.evaluate("window.aiMode='valid'");page.locator('#generate-method').click();expect(page.locator('#generate-method')).to_be_enabled(timeout=15000);expect(page.locator('#method-summary .method-team-update')).to_have_count(3);page.locator('#copy-method').click();assert '""' not in page.evaluate('window.copied');b.close();print('PASS empty and legacy quoted output create no executive/measure cards or copy action; valid summaries remain and failed responses stay in diagnostics.')
 finally:server.terminate();server.wait(timeout=10)
