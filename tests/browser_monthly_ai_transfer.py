import os,json,tempfile,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
os.chdir(Path(__file__).resolve().parents[1])
with tempfile.TemporaryDirectory() as tmp:
 server=subprocess.Popen(['node','server.js','--fixture'],env={**os.environ,'PORT':'8399','CFS_FIXTURE_FILE':str(Path(tmp)/'data.json')},stdout=subprocess.PIPE,text=True)
 try:
  assert 'Release Review:' in server.stdout.readline()
  with sync_playwright() as p:
   b=p.chromium.launch();page=b.new_page(viewport={'width':1600,'height':1000});calls=[];draft='November validation remains in progress. Deployment awaits approval.';approved=False
   def handler(route):
    data=route.request.post_data_json;calls.append(data)
    if data.get('action')=='monthly-summary':route.fulfill(json={'draftReady':approved,'blurb':draft if approved else '', 'aiRejectedDraft':json.dumps({'currentUpdate':draft}), 'aiNotice':'Completion claims need matching evidence.','aiAttempted':False})
    else:route.continue_()
   page.route('**/api/handler',handler);page.goto('http://127.0.0.1:8399');expect(page.locator('#epic-count')).to_have_text('6');id='a0B000000000005';page.locator(f'.epic-summary-trigger[data-id="{id}"]').hover();panel=page.locator('#epic-updates-preview');expect(panel).to_be_visible();panel.locator('[data-do=ai-month]').click();expect(page.locator('#drawer')).to_be_visible();expect(page.locator('#copy-ai-to-month')).to_be_visible();expect(page.locator('#monthly-text')).to_have_value('');request=next(c for c in calls if c['action']=='monthly-summary');assert request['epicId']==id and request['month']=='2026-11';expect(panel).to_be_hidden();expect(page.locator('#ai-month-preview')).to_contain_text('Completion claims need matching evidence.')
   page.locator('#monthly-text').fill('Existing unsaved engineer text.');page.locator('#copy-ai-to-month').click();expect(page.locator('#monthly-text')).to_have_value(draft);expect(page.locator('#copy-ai-month-status')).to_contain_text('Copied to the editor only');expect(page.locator('#ai-month-preview')).to_contain_text('Completion claims need matching evidence.');assert not any(c['action'] in ['save-draft','sync','save-path-to-green'] for c in calls)
   page.locator('#undo-copied-ai-month').click();expect(page.locator('#monthly-text')).to_have_value('Existing unsaved engineer text.');expect(page.locator('#copy-ai-to-month')).to_be_enabled()
   approved=True;page.locator('#ai-month-button').click();expect(page.locator('#monthly-text')).to_have_value(draft);expect(page.locator('#undo-ai-month')).to_be_visible();page.locator('#undo-ai-month').click();expect(page.locator('#monthly-text')).to_have_value('Existing unsaved engineer text.');b.close();print('PASS tooltip AI action routes correct epic/month; rejected text transfers only on explicit click, warning persists, undo restores editor; approved drafts still populate automatically; no save or sync triggered.')
 finally:server.terminate();server.wait(timeout=10)
