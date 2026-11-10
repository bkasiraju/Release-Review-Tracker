import os,json,tempfile,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
os.chdir(Path(__file__).resolve().parents[1])
with tempfile.TemporaryDirectory() as tmp:
 seed=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))']));statuses=['Completed','Watch','On Track','Not Started','Blocked','Watch']
 for i,(id,e) in enumerate(seed['remote'].items()):e['health']=statuses[i];seed['docs']['epic:'+id]['health']=statuses[i]
 f=Path(tmp)/'data.json';f.write_text(json.dumps(seed));server=subprocess.Popen(['node','server.js','--fixture'],env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(f)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page();page.goto('http://127.0.0.1:8399');expect(page.locator('#epic-count')).to_have_text('6');values=lambda:page.locator('.epic-summary-row [data-epic-status]').evaluate_all('(es)=>es.map(e=>e.value)');assert values()==['Blocked','Watch','Watch','Not Started','On Track','Completed'];page.locator('#table-head [data-key=health]').click();assert values()==['Completed','On Track','Not Started','Watch','Watch','Blocked'];page.locator('#table-head [data-key=name]').click();expect(page.locator('#table-head [data-key=name]').locator('..')).to_have_attribute('aria-sort','ascending');page.reload();expect(page.locator('#epic-count')).to_have_text('6');assert values()==['Blocked','Watch','Watch','Not Started','On Track','Completed'];b.close();print('PASS default review-priority status order, reversible header sorting, manual name sorting and reload default.')
 finally:server.terminate();server.wait(timeout=10)
