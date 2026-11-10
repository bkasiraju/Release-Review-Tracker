import os,subprocess,tempfile,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
os.chdir(Path(__file__).resolve().parents[1])
with tempfile.TemporaryDirectory() as tmp:
 seed=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))']))
 statuses=['Not Started','Canceled','Watch','Completed','On Track','Blocked']
 for i,(id,e) in enumerate(seed['remote'].items()):
  e['health']=statuses[i];seed['docs']['epic:'+id]['health']=statuses[i]
 f=Path(tmp)/'data.json';f.write_text(json.dumps(seed));server=subprocess.Popen(['node','server.js','--fixture'],env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(f)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':1800,'height':1000});page.goto('http://127.0.0.1:8399');expect(page.locator('#epic-count')).to_have_text('6');colors={}
   for status in statuses:
    id=list(seed['remote'])[statuses.index(status)];badge=page.locator(f'[data-epic-status="{id}"]').locator('..');expect(badge).to_be_visible();colors[status]=badge.evaluate('e=>({bg:getComputedStyle(e).backgroundColor,dot:getComputedStyle(e,"::before").backgroundColor})')
   assert len({c['bg'] for c in colors.values()})==6,colors
   assert len({c['dot'] for c in colors.values()})==6,colors
   page.locator('.metric').filter(has_text='On track').click();expect(page.locator('.epic-summary-row')).to_have_count(2);page.locator('#clear-filters').click();id=list(seed['remote'])[0];page.locator(f'[data-epic-status="{id}"]').select_option('Canceled');expect(page.locator('#toasts')).to_contain_text('Epic Status saved and verified in GUS.');assert json.loads(f.read_text())['remote'][id]['health']=='Canceled';expect(page.locator(f'[data-review-status="{id}"] option')).to_have_text(['Select review status','De-Prioritised','Mistakenly Added','Not a Priority']);page.reload();expect(page.locator(f'[data-epic-status="{id}"]')).to_have_value('Canceled');page.locator(f'[data-epic-status="{id}"]').select_option('Watch');expect(page.locator('#drawer')).to_be_visible();assert json.loads(f.read_text())['remote'][id]['health']=='Canceled';b.close();print('PASS inline status save verified in fixture GUS and reload, review reasons updated, missing Watch PTG opens editor without writing; six unique visible badge/dot colors and healthy filter includes Completed and On Track.')
 finally:server.terminate();server.wait(timeout=10)
