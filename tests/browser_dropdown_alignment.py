import os,tempfile,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
os.chdir(Path(__file__).resolve().parents[1])
with tempfile.TemporaryDirectory() as tmp:
 server=subprocess.Popen(['node','server.js','--fixture'],env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(Path(tmp)/'data.json')},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':1600,'height':1000});page.goto('http://127.0.0.1:8399');expect(page.locator('#epic-count')).to_have_text('6');expect(page.get_by_text('From GUS',exact=True)).to_have_count(0)
   for width in [1600,1100]:
    page.set_viewport_size({'width':width,'height':1000})
    for id in ['release-select','health-filter','owner-filter','group-by']:
     button=page.locator(f'#{id}').locator('..').locator('.multi-trigger');assert button.evaluate('e=>{const label=e.querySelector(".multi-trigger-label"),caret=e.querySelector(".multi-caret"),r=e.getBoundingClientRect(),l=label.getBoundingClientRect(),c=caret.getBoundingClientRect();return getComputedStyle(label).textAlign==="left"&&l.left-r.left<20&&r.right-c.right<20&&c.left>=l.right}'),id
   page.locator('#health-filter').evaluate("e=>{for(const o of e.options)o.selected=o.value==='watch';e.dispatchEvent(new Event('change',{bubbles:true}))}");label=page.locator('#health-filter').locator('..').locator('.multi-trigger-label');assert label.evaluate('e=>getComputedStyle(e).textAlign')=='left';b.close();print('PASS source label removed; release/health/owner/group dropdown labels left and arrows right at 1600/1100px, including selected state.')
 finally:server.terminate();server.wait(timeout=10)
