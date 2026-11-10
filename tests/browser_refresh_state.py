import os,json,tempfile,subprocess,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from datetime import datetime,timezone
os.chdir(Path(__file__).resolve().parents[1])
with tempfile.TemporaryDirectory() as tmp:
 seed=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))']));now=datetime.now(timezone.utc).isoformat()
 for k,e in seed['docs'].items():
  if k.startswith('epic:'):e['fetchedAt']=now
  if k.startswith('release:'):e['lastGusRefreshAt']=now
 f=Path(tmp)/'data.json';f.write_text(json.dumps(seed));server=subprocess.Popen(['node','server.js','--fixture'],env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(f)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':1700,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));changed=[False]
   page.add_init_script("const originalInterval=window.setInterval;window.setInterval=(fn,ms,...args)=>{if(ms===60000)window.triggerSharedRefresh=fn;return originalInterval(fn,ms,...args)};window.AppletAI={isAvailable:()=>true,complete:async()=>({text:'Regional validation remains in progress.'})};")
   def recheck(route):
    action=route.request.post_data_json.get('action');response=route.fetch();body=response.json();payload=body.get('payload',body)
    if action=='connection':payload['testMode']=False
    if action=='state':
     for e in payload['epics']:
      e['revision']=str(uuid.uuid4());e['fetchedAt']=now
      if changed[0]:e['comments']+='\nAdditional source context.'
     for r in payload['releases']:r['lastGusRefreshAt']=now
    route.fulfill(response=response,json=body)
   page.route('**/api/handler',recheck);page.goto('http://127.0.0.1:8399');expect(page.locator('#epic-count')).to_have_text('6');page.locator('[data-view=executive]').click();page.locator('#generate-executive').click();expect(page.locator('#generate-executive')).to_be_enabled(timeout=15000);expect(page.locator('.executive-blurb')).to_have_count(6);page.locator('#generate-method').click();expect(page.locator('#generate-method')).to_be_enabled(timeout=15000);expect(page.locator('.method-team-update')).to_have_count(3);original=page.locator('#executive-content').text_content();page.locator('#collapse-executive').click();page.evaluate('window.summaryNode=document.querySelector(".executive-blurb")');page.evaluate('window.triggerSharedRefresh()');expect(page.locator('.executive-blurb')).to_have_count(6);assert page.evaluate('window.summaryNode===document.querySelector(".executive-blurb")');assert page.locator('#executive-content').text_content()==original;expect(page.locator('#copy-executive')).to_be_enabled();assert all(not el.evaluate('e=>e.open') for el in page.locator('.executive-measure').all());expect(page.locator('.method-team-update')).to_have_count(3)
   page.locator('#fetch-button').click();expect(page.locator('#fetch-button')).to_be_enabled(timeout=15000);expect(page.locator('.executive-blurb')).to_have_count(6);expect(page.locator('.method-team-update')).to_have_count(3);assert all(not el.evaluate('e=>e.open') for el in page.locator('.executive-measure').all())
   changed[0]=True;page.evaluate('window.triggerSharedRefresh()');expect(page.locator('.executive-blurb')).to_have_count(6);expect(page.locator('#executive-status')).to_contain_text('saved summary retained');expect(page.locator('#copy-executive')).to_be_enabled();expect(page.locator('.method-team-update')).to_have_count(3)
   page.locator('[data-view=overview]').click();page.locator('#search').fill('cache');page.locator('#search').dispatch_event('input');page.evaluate('window.triggerSharedRefresh()');expect(page.locator('#search')).to_have_value('cache');page.locator('#clear-filters').click();page.locator('.epic-expand-toggle').first.click();expect(page.locator('.epic-expanded-table')).to_have_count(1);page.evaluate('window.triggerSharedRefresh()');expect(page.locator('.epic-expanded-table')).to_have_count(1)
   page.locator('.epic-expanded-table [data-do=month]').first.click();page.locator('#monthly-text').fill('Unsaved engineer update must remain.');page.locator('#monthly-text').dispatch_event('input');page.evaluate('window.triggerSharedRefresh()');expect(page.locator('#monthly-text')).to_have_value('Unsaved engineer update must remain.');assert not errors,errors;b.close();print('PASS background revision changes preserve executive/measure DOM and collapsed sections; source changes retain copyable summary with notice; filters, expanded row and unsaved monthly editor survive refresh.')
 finally:server.terminate();server.wait(timeout=10)
