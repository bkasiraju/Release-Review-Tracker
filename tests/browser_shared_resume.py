"""Shared drafts must not be automatically published in another session."""
import asyncio,json,os,subprocess,tempfile
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
async def main():
 with tempfile.TemporaryDirectory(prefix='cfs-shared-resume-') as tmp:
  fixture=Path(tmp)/'data.json';data=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))'],cwd=ROOT));r=next(d for k,d in data['docs'].items() if k.startswith('release:'));id=r['epicIds'][0];data['docs']['epic:'+id]['drafts']={'2026-11':{'value':'Another user pending draft','base':'Old','autoSync':True,'releaseId':r['id'],'revision':'pending-rev','requestId':'11111111-1111-4111-8111-111111111111'}};fixture.write_text(json.dumps(data));server=subprocess.Popen(['node','server.js','--fixture'],cwd=ROOT,env={**os.environ,'PORT':'8388','CFS_FIXTURE_FILE':str(fixture)},stdout=subprocess.PIPE,text=True)
  try:
   assert 'Release Review:' in server.stdout.readline()
   async with async_playwright() as p:
    browser=await p.chromium.launch();page=await browser.new_page();calls=[]
    async def route_handler(route):
     body=route.request.post_data_json;calls.append(body['action'])
     if body['action']=='connection':
      response=await route.fetch();payload=await response.json();payload['payload']['sharedBackend']=True;payload['payload']['testMode']=False;await route.fulfill(response=response,json=payload)
     else:await route.continue_()
    await page.route('**/api/handler',route_handler);await page.goto('http://127.0.0.1:8388');await expect(page.locator('#sync-count')).to_have_text('1');await asyncio.sleep(1.2);assert 'publish-month' not in calls and 'sync' not in calls,calls
    assert json.loads(fixture.read_text())['remote'][id]['comments']==data['remote'][id]['comments'];await browser.close();print('Shared-session safety passed: another session’s saved draft is visible but never auto-published.')
  finally:server.terminate();server.wait(timeout=10)
asyncio.run(main())
