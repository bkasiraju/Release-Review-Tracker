"""Local 3D art, preserved link actions, reduced motion and responsive layout."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='cfs-icons-') as tmp:
 fixture=Path(tmp)/'data.json';fixture.write_bytes(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))'],cwd=ROOT));server=subprocess.Popen(['node','server.js','--fixture'],cwd=ROOT,env={**os.environ,'PORT':'8401','CFS_FIXTURE_FILE':str(fixture)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   browser=p.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1100});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8401');expect(page.locator('#epic-count')).to_have_text('6');assert '↗' not in page.locator('body').inner_text();expect(page.locator('#metrics .metric-header .cfs-icon')).to_have_count(4);assert page.locator('.cfs-icon').count()>30;page.wait_for_function("[...document.querySelectorAll('.cfs-icon img')].every(e=>e.complete&&e.naturalWidth>0)");assert page.locator('#table-body a[aria-label="Open epic in GUS"]').first.get_attribute('href').startswith('https://gus.my.salesforce.com/');page.screenshot(path='/tmp/cfs-v198-overview.png',full_page=True)
   expect(page.locator('html')).not_to_have_class(__import__('re').compile('icons-intro'),timeout=5500);assert page.locator('#metrics .cfs-icon').first.evaluate('(e)=>getComputedStyle(e).animationName')=='none';page.emulate_media(reduced_motion='reduce');assert page.locator('.rail-button .cfs-icon').first.evaluate('(e)=>getComputedStyle(e).animationName')=='none'
   page.locator('.metric-link[data-filter="healthy"]').click();expect(page.locator('#row-count')).to_contain_text('4 of 6');page.locator('#clear-filters').click();page.locator('[data-do="epic"]').first.click();expect(page.locator('.work-item')).to_have_count(3);assert '↗' not in page.locator('#drawer').inner_text();page.get_by_role('button',name='Close sidebar').click();page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
   assets=page.evaluate("performance.getEntriesByType('resource').filter(r=>r.name.includes('icon-3d-')).map(r=>r.name)");assert len(set(assets))<=4;assert all('127.0.0.1:8401' in a for a in assets);browser.close();print('3D icon checks passed: local art decoded, links/actions preserved, intro ends, reduced motion, mobile fit, four cached art resources.')
 finally:server.terminate();server.wait(timeout=10)
