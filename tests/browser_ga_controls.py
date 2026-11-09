"""Isolated browser verification of GA controls and Slack reminder preparation."""
import json,os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='cfs-ga-controls-') as tmp:
 fixture=Path(tmp)/'data.json';fixture.write_text(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./scripts/fixture").seed()))'],cwd=ROOT,text=True))
 server=subprocess.Popen(['node','server.js','--fixture'],cwd=ROOT,env={**os.environ,'PORT':'8415','CFS_FIXTURE_FILE':str(fixture)},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review' in server.stdout.readline()
  with sync_playwright() as p:
   browser=p.chromium.launch();page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8415');expect(page.locator('.epic-summary-row')).to_have_count(6)
   expect(page.locator('.footer-version')).to_have_text('v2.0.0-GA');assert 'GOLDEN BUILD' not in page.locator('body').inner_text();assert page.locator('.dashboard-footer').evaluate('e=>getComputedStyle(e).justifyContent')=='center';assert page.locator('.footer-version').evaluate('e=>getComputedStyle(e).borderWidth')=='0px'
   toggle=page.locator('#toggle-all-epics');assert toggle.evaluate("e=>e.nextElementSibling.id")=='expand-button';toggle.click();expect(page.locator('.epic-detail-row')).to_have_count(6);expect(toggle).to_have_attribute('aria-expanded','true');page.locator('.epic-expand-toggle').first.click();expect(toggle).to_have_attribute('aria-expanded','false');toggle.click();expect(page.locator('.epic-detail-row')).to_have_count(6);toggle.click();expect(page.locator('.epic-detail-row')).to_have_count(0)
   page.locator('.metric[data-filter="attention"] .metric-value').click();expect(page.locator('.epic-summary-row')).to_have_count(2);page.locator('.metric[data-filter="all"]').focus();page.keyboard.press('Enter');expect(page.locator('.epic-summary-row')).to_have_count(6)
   page.locator('#search').fill('no match');expect(toggle).to_be_disabled();page.locator('#search').fill('');expect(toggle).to_be_enabled();page.locator('.epic-title').first.click();expect(page.locator('.slack-nudge-section')).to_be_visible();page.locator('.slack-nudge-section summary').click()
   def nudge(route):
    data=route.request.post_data_json
    if data.get('action')=='slack-nudge':route.fulfill(json={'ok':True,'payload':{'lead':'Example Lead','hasUpdate':False,'month':'2026-11','slackUserId':'U123456789','notice':'Recipient matched using the Development Lead’s GUS email.','text':'Hi Example Lead, please add November 2026 health updates. https://gus.lightning.force.com/lightning/r/ADM_Epic__c/a3Q000000000001/view'}})
    else:route.continue_()
   page.route('**/api/handler',nudge);page.locator('[data-do="prepare-nudge"]').click();expect(page.locator('#slack-nudge-text')).to_contain_text('Example Lead');expect(page.locator('#slack-nudge-body')).to_contain_text('Nothing has been sent');assert page.locator('a[href="slack://user?id=U123456789"]').count()==1;assert not errors,errors;browser.close();print('GA browser checks passed: footer, tile click/keyboard, expansion state/filtering, Slack preparation (mock identity; no sends).')
 finally:server.terminate();server.wait(timeout=10)
