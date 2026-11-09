"""Browser acceptance checks. Run against `node server.js --fixture`, never production."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('CFS_TEST_URL', 'http://127.0.0.1:8383')

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1536, 'height': 1040}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    expect(page.locator('#connection')).to_have_text('Isolated test backend')
    expect(page.locator('.epic-title')).to_have_count(6)
    page.locator('#review-month').fill('2026-11')
    page.locator('#review-month').dispatch_event('change')
    (ROOT / 'dist').mkdir(exist_ok=True)
    page.screenshot(path=str(ROOT / 'dist/dashboard-preview.png'), full_page=True)

    page.locator('.epic-title').first.click()
    expect(page.locator('.work-item')).to_have_count(3)
    expect(page.locator('.work-details').first).to_contain_text('CFS · Nov Sprint 1')
    page.locator('#work-status').select_option('Closed')
    expect(page.locator('.work-item')).to_have_count(1)
    page.screenshot(path=str(ROOT / 'dist/epic-sidebar-preview.png'), full_page=True)
    page.get_by_role('button', name='Close sidebar').click()

    page.locator('.month-cell .update-button').first.click()
    page.locator('#monthly-text').fill('Browser-verified November progress.\nNext: partner validation.')
    page.locator('#save-draft').click()
    expect(page.locator('#drawer')).to_be_hidden()
    expect(page.locator('#sync-count')).to_have_text('1')
    page.reload()
    expect(page.locator('#sync-count')).to_have_text('1')
    page.locator('#fetch-button').click()
    expect(page.locator('#fetch-button')).to_be_enabled()
    expect(page.locator('#sync-count')).to_have_text('1')
    page.locator('#sync-button').click()
    expect(page.locator('#confirm-sync')).to_be_visible()
    expect(page.locator('.preview-box')).to_contain_text('Browser-verified November progress.')
    page.locator('#confirm-sync').click()
    expect(page.locator('#drawer-title')).to_have_text('GUS publish results')
    expect(page.locator('#sync-count')).to_have_text('0')
    expect(page.locator('.sync-status')).to_contain_text('synced')
    page.get_by_role('button', name='Close sidebar').click()

    page.locator('#add-month').click()
    page.locator('#new-month').fill('2026-12')
    page.locator('#save-month').click()
    expect(page.locator('#drawer')).to_be_hidden()
    expect(page.locator('.month-head')).to_have_count(4)
    page.locator('#columns-button').click()
    page.locator('#col-actual').uncheck()
    page.locator('#save-columns').click()
    expect(page.locator('#drawer')).to_be_hidden()
    expect(page.locator('#table-head')).not_to_contain_text('Actual SP')
    page.locator('#health-filter').select_option('Blocked')
    expect(page.locator('.epic-title')).to_have_count(1)
    page.locator('#clear-filters').click()
    expect(page.locator('.epic-title')).to_have_count(6)

    page.locator('#manage-button').click()
    page.locator('#epic-links').fill('a0B000000000001\na0B000000000001\na0B000000000002')
    page.locator('#save-release').click()
    expect(page.locator('#drawer')).to_be_hidden()
    expect(page.locator('.epic-title')).to_have_count(2)
    page.locator('#new-release').click()
    page.locator('#release-name').fill('Browser smoke · empty release')
    page.locator('#save-release').click()
    expect(page.locator('#empty-state')).to_contain_text('Your release is ready for its epics')
    page.reload()
    expect(page.locator('#release-select option')).to_have_count(2)

    page.set_viewport_size({'width': 390, 'height': 844})
    expect(page.locator('#manage-button')).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Page overflow on mobile'
    assert not errors, errors
    browser.close()
    print('Browser smoke passed: sidebar, filters, drafts, reload, fetch preservation, sync, columns, month, list edits, empty state and mobile layout.')
