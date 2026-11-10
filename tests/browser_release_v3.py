import os,tempfile,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
os.chdir(Path(__file__).resolve().parents[1])
with tempfile.TemporaryDirectory() as tmp:
 server=subprocess.Popen(['node','server.js','--fixture'],env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(Path(tmp)/'data.json')},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   browser=p.chromium.launch();context=browser.new_context(viewport={'width':1800,'height':1100});context.route('https://gus.*force.com/**',lambda route:route.fulfill(status=200,content_type='text/html',body='<p>Isolated GUS link navigation check</p>'));page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8399');expect(page.locator('#epic-count')).to_have_text('6');expect(page.locator('.footer-version')).to_have_text('v3.0.0-GA');assert 'GOLDEN BUILD' not in page.locator('body').inner_text();links=page.locator('.epic-summary-row .epic-gus-link');expect(links).to_have_count(6);xs=links.evaluate_all('nodes=>nodes.map(e=>e.getBoundingClientRect().x)');assert max(xs)-min(xs)<=1,xs;assert page.locator('.missing-review-update').count()>0
   first=links.first;href=first.get_attribute('href')
   with page.expect_popup() as info:first.click()
   popup=info.value;expect(popup).to_have_url(href);assert not page.locator('.epic-summary-row.is-open').count();popup.close();page.locator('#group-by').evaluate("e=>{e.value='health';e.dispatchEvent(new Event('change',{bubbles:true}))}");xs=links.evaluate_all('nodes=>nodes.map(e=>e.getBoundingClientRect().x)');assert max(xs)-min(xs)<=1,xs;assert not errors,errors;browser.close();print('PASS 3.0.0-GA footer/assets, consistently aligned GUS links with/without missing icons and grouped rows, new-tab navigation without row expansion; no GOLDEN label on dashboard.')
 finally:server.terminate();server.wait(timeout=10)
