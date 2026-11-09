"""Acceptance checks for bundled fonts, black text and the VegaCache visual baseline."""
import os,subprocess,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="cfs-theme-") as directory:
 server=subprocess.Popen(["node","server.js","--fixture"],cwd=ROOT,env={**os.environ,"PORT":"8384","CFS_FIXTURE_FILE":str(Path(directory)/"fixture.json")},stdout=subprocess.PIPE,text=True)
 try:
  assert "Release Review:" in server.stdout.readline()
  with sync_playwright() as p:
   browser=p.chromium.launch();page=browser.new_page(viewport={"width":1440,"height":1000});
   def connection_without_conditional_writes(route):
    if route.request.post_data_json.get("action")=="connection":route.fulfill(json={"ok":True,"payload":{"connected":True,"demo":False,"testMode":False,"conditionalWrites":False,"version":"1.2.1"}})
    else:route.continue_()
   page.route("**/api/handler",connection_without_conditional_writes);page.goto("http://127.0.0.1:8384");expect(page.locator(".epic-title")).to_have_count(6)
   expect(page.locator(".breadcrumb")).to_contain_text("Core Foundation Services")
   expect(page.locator("#global-banner")).to_be_visible();page.get_by_role("button",name="Dismiss notice").click();expect(page.locator("#global-banner")).to_be_hidden();page.reload();expect(page.locator(".epic-title")).to_have_count(6);expect(page.locator("#global-banner")).to_be_hidden()
   page.locator('[data-filter="attention"]').click();expect(page.locator(".epic-title")).to_have_count(2);expect(page.locator("#overview-panel")).to_be_visible();page.locator("#clear-filters").click();page.locator('[data-view="overview"]').click();expect(page.locator("#overview-panel")).to_be_visible()
   page.locator("#source-sync-button").click();expect(page.locator("#drawer-title")).to_have_text("GUS release sources");page.get_by_role("button",name="Close",exact=True).click();expect(page.locator("#drawer")).to_be_hidden()
   assert page.request.get("http://127.0.0.1:8384/SalesforceSans-Regular.woff").body()[:4]==b"wOFF"
   assert page.evaluate("document.fonts.load('400 14px \"Salesforce Sans\"').then(f=>f.length>0&&f.every(x=>x.status==='loaded'))")
   for selector in ["h1",".subtitle",".metric-header","th",".epic-title",".update-button","#search"]:
    assert "Salesforce Sans" in page.locator(selector).first.evaluate("e=>getComputedStyle(e).fontFamily"),selector
    assert page.locator(selector).first.evaluate("e=>getComputedStyle(e).color")=="rgb(0, 0, 0)",selector
   page.screenshot(path=str(ROOT/"dist/dashboard-v1.2-preview.png"),full_page=True)
   page.locator(".epic-title").first.click();expect(page.locator(".work-item")).to_have_count(3)
   for selector in [".drawer-header h2",".work-title",".work-details"]:
    assert "Salesforce Sans" in page.locator(selector).first.evaluate("e=>getComputedStyle(e).fontFamily")
    assert page.locator(selector).first.evaluate("e=>getComputedStyle(e).color")=="rgb(0, 0, 0)"
   page.screenshot(path=str(ROOT/"dist/sidebar-v1.2-preview.png"),full_page=True);page.get_by_role("button",name="Close sidebar").click()
   for width in [390,320]:
    page.set_viewport_size({"width":width,"height":844});expect(page.get_by_role("link",name="Back to Hub")).to_be_visible();assert page.evaluate("document.documentElement.scrollWidth<=innerWidth"),f"Overflow at {width}"
   browser.close();print("Bundled Salesforce Sans, black text, sidebar typography, hub navigation and narrow-screen layout verified.")
 finally:
  server.terminate();server.wait(timeout=10)
