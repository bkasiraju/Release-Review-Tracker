"""One refresh entry point; publishing remains a separate reviewed write."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='cfs-sync-controls-') as tmp:
 fixture=Path(tmp)/'data.json';data=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))'],cwd=ROOT));fixture.write_text(json.dumps(data));original={k:v['comments'] for k,v in data['remote'].items()}
 server=subprocess.Popen(['node','server.js','--fixture'],cwd=ROOT,env={**os.environ,'PORT':'8398','CFS_FIXTURE_FILE':str(fixture)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   browser=p.chromium.launch();page=browser.new_page(viewport={'width':1536,'height':1040});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8398');expect(page.locator('#epic-count')).to_have_text('6')
   expect(page.locator('#fetch-button')).to_contain_text('Refresh');expect(page.locator('#connection-refresh')).to_have_count(0);expect(page.locator('#sync-button')).to_contain_text('Review & publish')
   page.locator('#source-sync-button').click();expect(page.locator('#drawer-title')).to_have_text('GUS release sources');expect(page.locator('[data-do=source-fetch],[data-do=source-preview]')).to_have_count(0);expect(page.locator('#drawer')).to_contain_text('Refresh from GUS reads current epic data and keeps your drafts.');page.get_by_role('button',name='Close sidebar').click()
   page.locator('#fetch-button').click();expect(page.locator('#fetch-button')).to_be_enabled(timeout=30000)
   current=json.loads(fixture.read_text());assert {k:v['comments'] for k,v in current['remote'].items()}==original
   response=page.request.post('http://127.0.0.1:8398/api/handler',data={'action':'state'}).json();state=response.get('payload',response);epic=state['epics'][0];month='2026-11'
   saved=page.request.post('http://127.0.0.1:8398/api/handler',data={'action':'save-draft','epicId':epic['id'],'month':month,'value':'Pending review, not yet published.','revision':epic.get('drafts',{}).get(month,{}).get('revision')}).json();assert saved.get('ok') is not False,saved
   page.reload();expect(page.locator('#sync-button')).to_be_enabled();page.locator('#sync-button').click();expect(page.locator('#confirm-sync')).to_be_visible();expect(page.locator('#confirm-sync')).to_contain_text('Publish')
   current=json.loads(fixture.read_text());assert {k:v['comments'] for k,v in current['remote'].items()}==original
   retry=browser.new_page();attempts=[]
   def connection_once(route):
    if route.request.post_data_json.get('action')=='connection':
     attempts.append(True)
     if len(attempts)==1:return route.fulfill(json={'ok':False,'error':'Temporary connection failure'})
    route.continue_()
   retry.route('**/api/handler',connection_once);retry.goto('http://127.0.0.1:8398');expect(retry.locator('#connection')).to_have_text('GUS connection unavailable');retry.locator('#source-sync-button').click();retry.get_by_role('button',name='Reconnect to GUS',exact=True).click();expect(retry.locator('#connection')).to_have_text('Isolated test backend');expect(retry.get_by_role('button',name='Reconnect to GUS',exact=True)).to_have_count(0);assert len(attempts)==2
   assert not errors,errors;browser.close();print('Refresh has one entry point, preserves GUS comments, and publishing requires a separate preview confirmation.')
 finally:server.terminate();server.wait(timeout=10)
