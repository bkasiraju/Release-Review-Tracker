"""Full work metadata stays readable and aligned across viewport sizes."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='cfs-metric-size-') as tmp:
 fixture=Path(tmp)/'data.json';fixture.write_bytes(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))'],cwd=ROOT));server=subprocess.Popen(['node','server.js','--fixture'],cwd=ROOT,env={**os.environ,'PORT':'8405','CFS_FIXTURE_FILE':str(fixture)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   browser=p.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1000})
   def metadata(route):
    if route.request.post_data_json.get('action')!='work-items':return route.continue_()
    response=route.fetch();data=response.json()
    for i,w in enumerate(data.get('payload',data)['items']):
     w['status']='Closed - No Fix - Working as Designed' if i==0 else w['status']
     w['assignee']='Yashasvi Chennawar' if i==0 else w['assignee']
     w['sprint']='2026.09b - MAPS' if i==0 else w['sprint']
    route.fulfill(response=response,json=data)
   page.route('**/api/handler',metadata)
   page.goto('http://127.0.0.1:8405');expect(page.locator('#epic-count')).to_have_text('6');page.locator('[data-do="epic"]').first.click();expect(page.locator('.work-item')).to_have_count(3)
   for width in [1440,1000,760,390]:
    page.set_viewport_size({'width':width,'height':1000})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    for selector in ['.work-row .health-badge','.work-assignee','.work-sprint']:
     assert page.locator(selector).evaluate_all('(els)=>els.every(e=>e.scrollWidth<=e.clientWidth+1 && e.scrollHeight<=e.clientHeight+1)'),(width,selector)
    rows=page.locator('.work-item summary');headers=page.locator('.work-headers')
    assert rows.first.evaluate('(e)=>getComputedStyle(e).gridTemplateColumns')==headers.evaluate('(e)=>getComputedStyle(e).gridTemplateColumns')
   page.set_viewport_size({'width':1440,'height':1000});page.screenshot(path='/tmp/cfs-work-metadata-v1112.png')
   page.get_by_role('button',name='Sort by Owner, ascending',exact=True).click();expect(page.locator('.inline-status')).to_contain_text('Sorted by Owner ascending')
   page.locator('.work-item summary').first.click();expect(page.locator('.work-expanded').first).to_be_visible()
   browser.close();print('Work metadata checks passed: full status/owner/sprint, aligned sortable headers, narrow-screen scrolling and expansion.')
 finally:server.terminate();server.wait(timeout=10)
