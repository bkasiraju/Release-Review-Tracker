import os,json,tempfile,subprocess,copy
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
os.chdir(Path(__file__).resolve().parents[1])
with tempfile.TemporaryDirectory() as tmp:
 seed=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))']));templates=list(seed['remote'].values());seed['remote']={};seed['docs']={k:v for k,v in seed['docs'].items() if not k.startswith('epic:')};ids=[]
 for i in range(26):
  e=copy.deepcopy(templates[i%len(templates)]);e['id']='a0B'+str(i+1).zfill(12);e['name']=f'Reliability outcome {i+1}';ids.append(e['id']);seed['remote'][e['id']]=e;seed['docs']['epic:'+e['id']]=copy.deepcopy(e)
 for k,r in seed['docs'].items():
  if k.startswith('release:'):r['epicIds']=ids;r['inputLinks']='\n'.join(ids)
 f=Path(tmp)/'data.json';f.write_text(json.dumps(seed));server=subprocess.Popen(['node','server.js','--fixture'],env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(f)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':1800,'height':1800});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.add_init_script("window.copied='';window.measureCalls=0;Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.copied=t;}}});window.AppletAI={isAvailable:()=>true,complete:async(_,o)=>{if(o.message.includes('All epic summaries:')){window.measureCalls++;return {text:'Reliability validation is progressing, with partner readiness still pending.'};}return {text:'Regional validation remains in progress.'};}};")
   page.goto('http://127.0.0.1:8399');expect(page.locator('#epic-count')).to_have_text('26');assert page.locator('#table-scroll').evaluate('e=>getComputedStyle(e).maxHeight')=='none';assert page.locator('#table-scroll').evaluate('e=>e.clientHeight>560&&e.scrollHeight<=e.clientHeight+1');assert page.locator('main').evaluate('e=>e.getBoundingClientRect().bottom>=innerHeight-80');page.set_viewport_size({'width':1400,'height':900});page.wait_for_timeout(180);assert page.locator('#table-scroll').evaluate('e=>e.scrollHeight<=e.clientHeight+1')
   page.locator('[data-view=executive]').click();page.locator('#generate-executive').click();expect(page.locator('#method-summary .method-team-update')).to_have_count(3,timeout=20000);expect(page.locator('#copy-executive')).to_be_enabled(timeout=15000);expect(page.locator('#executive-content .executive-source-updates')).to_have_count(1);assert not page.locator('.executive-source-updates').evaluate('e=>e.open');expect(page.locator('#executive-content .executive-blurb')).to_have_count(26);assert page.evaluate('window.measureCalls')==3
   for el in page.locator('#method-summary .method-team-update>p').all():assert len(el.inner_text())<=500
   page.locator('#copy-executive').click();copied=page.evaluate('window.copied');assert copied.count('Reliability validation is progressing')==3;assert 'Regional validation remains in progress.' not in copied;assert copied.count('M1.1.1')==1
   page.locator('#expand-executive').click();assert page.locator('.executive-source-updates').evaluate('e=>e.open');page.locator('#collapse-executive').click();assert not page.locator('.executive-source-updates').evaluate('e=>e.open');page.locator('#fetch-button').click();expect(page.locator('#fetch-button')).to_be_enabled(timeout=15000);expect(page.locator('#method-summary .method-team-update')).to_have_count(3);assert not page.locator('.executive-source-updates').evaluate('e=>e.open');assert not errors,errors;b.close();print('PASS 26-row full-page table; one-click per-measure/team consolidation; compact primary output and clipboard; collapsed epic evidence, expand/collapse and refresh preservation.')
 finally:server.terminate();server.wait(timeout=10)
