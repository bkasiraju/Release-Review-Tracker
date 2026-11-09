"""Exercise immediate feedback, parallel fetch, durable retry, and month preservation."""
import asyncio,json,os,subprocess,tempfile
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
async def main():
 with tempfile.TemporaryDirectory(prefix='cfs-background-') as tmp:
  fixture=Path(tmp)/'data.json';env={**os.environ,'PORT':'8385','CFS_FIXTURE_FILE':str(fixture)}
  server=subprocess.Popen(['node','server.js','--fixture'],cwd=ROOT,env=env,stdout=subprocess.PIPE,text=True)
  try:
   assert 'Release Review:' in server.stdout.readline()
   async with async_playwright() as p:
    browser=await p.chromium.launch();page=await browser.new_page(viewport={'width':1400,'height':950});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    counts={'active':0,'peak':0,'fail':True,'saveFail':True}
    async def handler(route):
     body=route.request.post_data_json;action=body.get('action')
     if action=='publish-month' and counts['fail']:
      counts['fail']=False;await asyncio.sleep(.5);await route.fulfill(status=503,content_type='application/json',body='{}');return
     if action=='save-draft' and body.get('epicId')=='a0B000000000002' and counts['saveFail']:
      counts['saveFail']=False;await route.fetch();await route.fulfill(status=503,content_type='application/json',body='{}');return
     if action=='save-draft':await asyncio.sleep(.8)
     if action=='fetch' and 'cursor' in body:
      counts['active']+=1;counts['peak']=max(counts['peak'],counts['active'])
      try:
       await asyncio.sleep(.2);response=await route.fetch();await route.fulfill(response=response)
      finally:counts['active']-=1
      return
     await route.continue_()
    await page.route('**/api/handler',handler)
    await page.goto('http://127.0.0.1:8385');await expect(page.locator('#epic-count')).to_have_text('6')
    original=json.loads(fixture.read_text()) if fixture.exists() else json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))'],cwd=ROOT))
    await page.locator('[data-do="month"][data-id="a0B000000000001"][data-month="2026-11"]').click();await page.locator('#monthly-text').fill('Fast monthly save')
    await page.locator('#save-draft').click();await expect(page.locator('#drawer')).to_have_class(__import__('re').compile(r'\bhidden\b'),timeout=500)
    await expect(page.locator('#save-status')).to_contain_text('Saving update')
    await expect(page.locator('#save-status')).to_contain_text('HTTP 503',timeout=10000)
    data=json.loads(fixture.read_text());assert data['docs']['epic:a0B000000000001']['drafts']['2026-11']['autoSync']
    assert data['remote']['a0B000000000001']['comments']==original['remote']['a0B000000000001']['comments']
    await page.reload();await expect(page.locator('#save-status')).to_contain_text('Saved to GUS',timeout=15000)
    data=json.loads(fixture.read_text());assert 'Fast monthly save' in data['remote']['a0B000000000001']['comments'];assert not data['docs']['epic:a0B000000000001']['drafts']
    assert 'Design review completed.' in data['remote']['a0B000000000001']['comments'];assert 'Implementation complete.' in data['remote']['a0B000000000001']['comments']
    await page.locator('[data-do="dismiss-save"]').click();await expect(page.locator('#save-status')).to_be_hidden()
    await page.clock.install()
    await page.locator('[data-do="month"][data-id="a0B000000000002"][data-month="2026-11"]').click();await page.locator('#monthly-text').fill('Recover lost save response');await page.locator('#save-draft').click()
    await expect(page.locator('#save-status')).to_contain_text('HTTP 503',timeout=10000)
    await page.locator('[data-do="retry-save"][data-id="a0B000000000002"]').click();await expect(page.locator('.save-progress').last).to_contain_text('Saved to GUS',timeout=10000)
    await expect(page.locator('#save-status')).to_contain_text('Saved to GUS',timeout=10000)
    await expect(page.locator('#sync-count')).to_have_text('0',timeout=10000)
    assert 'Recover lost save response' in json.loads(fixture.read_text())['remote']['a0B000000000002']['comments']
    await page.clock.fast_forward(10100);await expect(page.locator('#save-status')).to_be_hidden()
    await page.locator('#fetch-button').click();await expect(page.locator('#fetch-button')).to_be_enabled(timeout=15000);assert 1<counts['peak']<=4,counts
    assert not errors,errors
    await browser.close();print('Background save browser checks passed: immediate close, durable draft, retry after reload, verified GUS save, month preservation, and four-worker Fetch.')
  finally:server.terminate();server.wait(timeout=10)
asyncio.run(main())
