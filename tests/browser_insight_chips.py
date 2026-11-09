import os,subprocess,tempfile,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
os.chdir(root)
with tempfile.TemporaryDirectory() as tmp:
 f=Path(tmp)/'fixture.json';f.write_bytes(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))']))
 server=subprocess.Popen(['node','server.js','--fixture'],env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(f)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   browser=p.chromium.launch();page=browser.new_page(viewport={'width':1600,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8399');expect(page.locator('#epic-count')).to_have_text('6')
   chips=page.locator('.insight-chip');assert chips.count()>=7
   for i in range(chips.count()):
    chips.nth(i).click();expect(page.locator('.insight-chip[aria-pressed=true]')).to_have_count(1);expect(page.locator('#clear-filters')).to_be_visible();page.locator('#clear-filters').click();expect(page.locator('.insight-chip[aria-pressed=true]')).to_have_count(0);expect(page.locator('#row-count')).to_have_text('Showing 6 of 6 epics')
   assert page.locator('#review-insights').bounding_box()['height']<190
   assert not errors,errors
   print('Compact tile clicks, active state, reset and desktop geometry passed');browser.close()
 finally:server.terminate();server.wait()
