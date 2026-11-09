"""Two sessions reuse fresh cache; manual refresh always publishes the latest shared snapshot."""
import json,os,subprocess,tempfile
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='cfs-refresh-') as tmp:
 fixture=Path(tmp)/'data.json';seed=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))'],cwd=ROOT));now=datetime.now(timezone.utc).isoformat();epic_id=next(iter(seed['remote']))
 for key,row in seed['docs'].items():
  if key.startswith('epic:'):row['fetchedAt']=now
 fixture.write_text(json.dumps(seed));launcher="const fs=require('fs'),ctx=require('./scripts/fixture').context(),original=ctx.gus.epics;ctx.gus.epics=async(...args)=>{Object.assign(ctx.store.data.remote,JSON.parse(fs.readFileSync(process.env.CFS_FIXTURE_FILE)).remote);return original(...args)};require('./server').createServer(ctx).listen(8399,'127.0.0.1',()=>console.log('Release Review: test'));";server=subprocess.Popen(['node','-e',launcher],cwd=ROOT,env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(fixture)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   browser=p.chromium.launch();actions=[]
   def setup(page):
    def route_handler(route):
     body=route.request.post_data_json;actions.append((page,body));response=route.fetch();data=response.json()
     if body['action']=='connection':data['payload']['testMode']=False;data['payload']['sharedBackend']=True
     route.fulfill(response=response,json=data)
    page.route('**/api/handler',route_handler)
   one=browser.new_page(viewport={'width':1440,'height':1000});setup(one);one.goto('http://127.0.0.1:8399');expect(one.locator('#epic-count')).to_have_text('6');one.wait_for_timeout(300);assert not [b for _,b in actions if b['action']=='fetch']
   for width in [1920,1440,1280]:
    one.set_viewport_size({'width':width,'height':1000});assert one.locator('.dashboard-bar').evaluate("e=>{const nodes=[...e.querySelectorAll('.view-nav button,.release-picker,.review-picker,.heading-actions button')],ys=nodes.map(n=>{const r=n.getBoundingClientRect();return r.y+r.height/2});return Math.max(...ys)-Math.min(...ys)<6}");assert one.evaluate('document.documentElement.scrollWidth<=innerWidth')
   expect(one.locator('.brand')).to_have_text('CFS');assert one.locator('.brand').evaluate('(e)=>e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight');one.locator('.dashboard-bar').screenshot(path='/tmp/cfs-v196-header.png');one.set_viewport_size({'width':390,'height':844});assert one.evaluate('document.documentElement.scrollWidth<=innerWidth');one.set_viewport_size({'width':1440,'height':1000})
   two=browser.new_page(viewport={'width':1440,'height':1000});setup(two);two.goto('http://127.0.0.1:8399');expect(two.locator('#epic-count')).to_have_text('6');two.wait_for_timeout(300);assert not [b for _,b in actions if b['action']=='fetch']
   latest=json.loads(fixture.read_text());latest['remote'][epic_id]['name']='Latest shared outcome after manual refresh';fixture.write_text(json.dumps(latest));one.locator('#fetch-button').click();expect(one.locator('#fetch-button')).to_be_enabled(timeout=15000);expect(one.locator('#table-body')).to_contain_text('Latest shared outcome after manual refresh');assert any(b['action']=='finish-fetch' for _,b in actions);assert json.loads(fixture.read_text())['docs']['epic:'+epic_id]['name']=='Latest shared outcome after manual refresh'
   two.bring_to_front();two.evaluate("window.dispatchEvent(new Event('focus'))");expect(two.locator('#table-body')).to_contain_text('Latest shared outcome after manual refresh');assert not [b for page,b in actions if page==two and b['action']=='fetch']
   before=len([b for _,b in actions if b['action']=='fetch']);one.locator('#fetch-button').click();expect(one.locator('#fetch-button')).to_be_enabled(timeout=15000);assert len([b for _,b in actions if b['action']=='fetch'])>before;assert all(not b.get('automatic') for _,b in actions if b['action']=='fetch');browser.close();print('Shared refresh checks passed: fresh cache avoids live fetch, manual override persists, second session renders shared data, header/logo responsive.')
 finally:server.terminate();server.wait(timeout=10)
