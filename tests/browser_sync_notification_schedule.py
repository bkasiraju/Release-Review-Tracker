"""Silent minute checks; notification only for actual hourly/manual live sync."""
import json,os,subprocess,tempfile
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='cfs-sync-schedule-') as tmp:
 fixture=Path(tmp)/'data.json';clock_file=Path(tmp)/'clock.json';clock_file.write_text('0');seed=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))'],cwd=ROOT));now=datetime.now(timezone.utc)
 for key,row in seed['docs'].items():
  if key.startswith('epic:'):row['fetchedAt']=now.isoformat()
 fixture.write_text(json.dumps(seed));launcher="const fs=require('fs'),RealDate=Date;global.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[Date.now()]))}static now(){return RealDate.now()+JSON.parse(fs.readFileSync(process.env.CFS_CLOCK_FILE))}};const ctx=require('./scripts/fixture').context();require('./server').createServer(ctx).listen(8406,'127.0.0.1',()=>console.log('Release Review: test'));";server=subprocess.Popen(['node','-e',launcher],cwd=ROOT,env={**os.environ,'CFS_FIXTURE_FILE':str(fixture),'CFS_CLOCK_FILE':str(clock_file)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   browser=p.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1000});page.clock.install(time=datetime.now(timezone.utc));actions=[]
   def route_handler(route):
    body=route.request.post_data_json;actions.append(body);response=route.fetch();data=response.json()
    if body['action']=='connection':data['payload']['testMode']=False;data['payload']['sharedBackend']=True
    route.fulfill(response=response,json=data)
   page.route('**/api/handler',route_handler);page.goto('http://127.0.0.1:8406');expect(page.locator('#epic-count')).to_have_text('6');note=page.locator('#sync-metrics');expect(note).to_be_hidden();assert not [a for a in actions if a['action']=='fetch']
   for _ in range(3):
    with page.expect_response(lambda r:'/api/handler' in r.url and r.request.post_data_json['action']=='state'):page.clock.fast_forward(60000)
    expect(note).to_be_hidden()
   assert len([a for a in actions if a['action']=='state'])>=4;assert not [a for a in actions if a['action']=='fetch']
   clock_file.write_text(str(61*60000));page.clock.fast_forward(58*60000);expect(note).to_be_visible(timeout=15000);expect(note).to_contain_text('Dashboard sync');expect(note).to_contain_text('6 epics checked');assert any(a['action']=='fetch' and a.get('automatic') is True for a in actions);live_pages=len([a for a in actions if a['action']=='fetch' and 'cursor' in a]);assert live_pages==6
   page.clock.fast_forward(5100);expect(note).to_be_hidden()
   with page.expect_response(lambda r:'/api/handler' in r.url and r.request.post_data_json['action']=='state'):page.clock.fast_forward(60000)
   expect(note).to_be_hidden();assert len([a for a in actions if a['action']=='fetch' and 'cursor' in a])==live_pages
   page.locator('#fetch-button').click();expect(note).to_be_visible(timeout=15000);expect(note).to_contain_text('GUS refresh');assert len([a for a in actions if a['action']=='fetch' and 'cursor' in a])==12;page.get_by_role('button',name='Dismiss sync metrics').click();expect(note).to_be_hidden()
   # Browser appears stale, but another user's freshly saved server cache wins.
   with page.expect_response(lambda r:'/api/handler' in r.url and r.request.post_data_json['action']=='fetch'):page.clock.fast_forward(61*60000)
   expect(note).to_be_hidden();assert len([a for a in actions if a['action']=='fetch' and 'cursor' in a])==12
   browser.close();print('Sync schedule checks passed: cached load and minute checks silent, real hourly/manual sync notified, fresh-cache race silent and five-second close retained.')
 finally:server.terminate();server.wait(timeout=10)
