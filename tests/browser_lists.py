"""List import/navigation/truncation UI checks against temporary fixtures only."""
import os, subprocess, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
URL="https://gus.lightning.force.com/lightning/o/ADM_Epic__c/list?filterName=MAPS_266_Review_Tracker1"
with tempfile.TemporaryDirectory(prefix="cfs-list-ui-") as directory:
 server=subprocess.Popen(["node","server.js","--fixture"],cwd=ROOT,env={**os.environ,"PORT":"8384","CFS_FIXTURE_FILE":str(Path(directory)/"state.json")},stdout=subprocess.PIPE,text=True)
 try:
  assert "Release Review:" in server.stdout.readline()
  with sync_playwright() as p:
   browser=p.chromium.launch();page=browser.new_page(viewport={"width":1440,"height":900});errors=[];page.on("pageerror",lambda e:errors.append(str(e)));page.goto("http://127.0.0.1:8384")
   expect(page.locator(".epic-title")).to_have_count(6)
   link=page.get_by_role("link",name="Back to Hub");expect(link).to_have_attribute("href","/");expect(link).to_have_attribute("target","_top")
   page.locator("#new-release").click();page.locator("#release-name").fill("MAPS list review");page.locator("#epic-links").fill(URL);page.locator("#save-release").click();expect(page.locator("#drawer")).to_be_hidden()
   page.locator("#fetch-button").click();expect(page.locator("#fetch-button")).to_be_enabled();expect(page.locator(".epic-title")).to_have_count(6);expect(page.locator("#table-head")).to_contain_text("Owner First Name");expect(page.locator("#table-body")).to_contain_text("Jordan")
   page.locator("#columns-button").click();page.locator("#save-columns").click();expect(page.locator("#drawer")).to_be_hidden();page.locator("#manage-button").click();expect(page.locator("#epic-links")).to_have_value(URL);page.get_by_role("button",name="Close sidebar").click()
   def truncate(route):
    import json
    payload=route.request.post_data_json
    if payload.get("action")=="work-items":route.fulfill(json={"ok":True,"payload":{"items":[{"id":"a07000000000001","number":"W-1","title":"Loaded work item","status":"New","points":3}],"unavailable":[],"truncated":True,"limit":2000}})
    else:route.continue_()
   page.route("**/api/handler",truncate);page.locator(".epic-title").first.click();expect(page.locator("#work-body")).to_contain_text("Additional items exist in GUS");expect(page.locator("#work-body")).to_contain_text("apply only to these loaded items");page.get_by_role("button",name="Close sidebar").click()
   for width in [390,320]:
    page.set_viewport_size({"width":width,"height":844});expect(link).to_be_visible();print(page.evaluate("JSON.stringify([...document.querySelectorAll(\"body *\")].filter(e=>!e.closest(\".table-scroll,.drawer,.toasts\")&&e.getBoundingClientRect().right>innerWidth).slice(0,10).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})))")) if page.evaluate("document.documentElement.scrollWidth > innerWidth") else None;assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"),f"Mobile overflow at {width}px"
   assert not errors,errors
   browser.close();print("List-view import, source columns, saved URL retention, truncation warning, and hub navigation passed in isolated browser tests.")
 finally:
  server.terminate();server.wait(timeout=10)
