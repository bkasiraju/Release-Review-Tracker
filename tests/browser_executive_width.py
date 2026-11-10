import os,tempfile,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
os.chdir(Path(__file__).resolve().parents[1])
with tempfile.TemporaryDirectory() as tmp:
 server=subprocess.Popen(['node','server.js','--fixture'],env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(Path(tmp)/'data.json')},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':2400,'height':1000});page.add_init_script("window.AppletAI={isAvailable:()=>true,complete:async()=>({text:'Regional validation remains in progress.'})};");page.goto('http://127.0.0.1:8399');expect(page.locator('#epic-count')).to_have_text('6');page.locator('[data-view=executive]').click();page.locator('#generate-executive').click();expect(page.locator('#generate-executive')).to_be_enabled(timeout=15000);expect(page.locator('.executive-blurb')).to_have_count(6);page.locator('#generate-method').click();expect(page.locator('#generate-method')).to_be_enabled(timeout=15000);expect(page.locator('.method-team-update')).to_have_count(3)
   for width in [2400,1200,760]:
    page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(150)
    for paragraph in page.locator('.executive-blurb,.method-team-update>p').all():
     assert paragraph.evaluate('e=>{const p=e.parentElement,s=getComputedStyle(p),available=p.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight);return Math.abs(e.getBoundingClientRect().width-available)<2&&e.scrollWidth<=e.clientWidth+1}'),width
   b.close();print('PASS executive and consolidated update paragraphs use full content width at 2400px, 1200px and 760px without overflow.')
 finally:server.terminate();server.wait(timeout=10)
