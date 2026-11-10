import os,json,tempfile,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
os.chdir(Path(__file__).resolve().parents[1])
with tempfile.TemporaryDirectory() as tmp:
 seed=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))']))
 for source in [seed['remote'],{k.removeprefix('epic:'):v for k,v in seed['docs'].items() if k.startswith('epic:')}]:
  source['a0B000000000001']['pathToGreen']='Stored recovery text remains unchanged.'
 seed['docs']['epic:a0B000000000005']['reviewStatus']={'epicStatus':'blocked','value':''}
 seed['docs']['epic:a0B000000000003']['reviewStatus']={'epicStatus':'watch','value':'Delayed'}
 f=Path(tmp)/'data.json';f.write_text(json.dumps(seed));server=subprocess.Popen(['node','server.js','--fixture'],env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(f)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':1600,'height':1000});page.goto('http://127.0.0.1:8399');expect(page.locator('#epic-count')).to_have_text('6')
   for id,has_path in [('a0B000000000001',False),('a0B000000000002',False),('a0B000000000003',True)]:
    page.locator(f'.epic-summary-trigger[data-id="{id}"]').hover();panel=page.locator('#epic-updates-preview');expect(panel).to_be_visible();expect(panel.locator('.epic-tooltip-month')).to_have_count(3);expect(panel.locator('#epic-updates-statuses')).to_contain_text('Epic Status:');expect(panel.locator('#epic-updates-statuses')).to_contain_text('Release Review Status:');assert panel.locator('#epic-updates-statuses').evaluate('e=>getComputedStyle(e).justifyContent')=='flex-start';expect(panel.locator('.epic-tooltip-path')).to_have_count(int(has_path))
    if has_path:
     expect(panel.locator('#epic-updates-statuses')).to_contain_text('Delayed')
     assert panel.locator('.epic-tooltip-path').evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(255, 240, 232)'
    page.locator('#close-epic-updates').click()
   for id,missing in [('a0B000000000001',False),('a0B000000000005',True),('a0B000000000006',False)]:
    page.locator(f'.epic-summary-trigger[data-id="{id}"]').hover();panel=page.locator('#epic-updates-preview');expect(panel).to_be_visible();warning=panel.locator('.is-missing-review');expect(warning).to_have_count(int(missing))
    if missing:
     expect(warning).to_contain_text('Missing updates for November 2026');expect(warning).to_contain_text('use AI Summarise');assert warning.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(255, 240, 232)'
    for tile in panel.locator('.epic-tooltip-month.has-update').all():
     assert tile.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(239, 249, 242)'
    page.locator('#close-epic-updates').click()
   # Compare a populated and required selector in the same review-status column.
   page.locator('[data-epic-status="a0B000000000005"]').select_option('Watch')
   selects=page.locator('.epic-summary-row .inline-review-status select');expect(selects).to_have_count(2)
   boxes=selects.evaluate_all('nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,width:r.width}})');assert abs(boxes[0]['x']-boxes[1]['x'])<=1,boxes;assert abs(boxes[0]['width']-boxes[1]['width'])<=1,boxes
   mark=page.locator('.epic-summary-row .inline-review-status.is-required');assert mark.evaluate('e=>e.querySelector(".review-required-mark").getBoundingClientRect().left>=e.querySelector("select").getBoundingClientRect().right')
   for width in [1600,1280,900]:
    page.set_viewport_size({'width':width,'height':1000});assert page.locator('.coverage-row').evaluate_all('rows=>rows.every(e=>{const [label,bar,count]=[...e.children].map(n=>n.getBoundingClientRect());return label.right+7<=bar.left&&bar.right+7<=count.left})'),width
   b.close();print('PASS On Track tooltips contain months only, Watch retains Path to Green; coverage labels/bars/counts do not overlap at 1600/1280/900px.')
 finally:server.terminate();server.wait(timeout=10)
