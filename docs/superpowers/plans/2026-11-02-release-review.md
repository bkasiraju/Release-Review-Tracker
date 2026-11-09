# Release Review Implementation Plan

**Execution amendment:** The user selected GUS Apps during implementation. Python/SQLite interfaces below were replaced with Node modules `backend/comments.js`, `gus.js`, `store.js`, `service.js`, and `index.js`; persistence is an immutable ContentVersion change journal. Tests are `node --test tests/*.test.js`, with `tests/browser_smoke.py` exercising the UI against an isolated local fixture. Packaging and deployment scripts are Python standard-library tools. User authorization covers deployment; authentication is required to complete the live upload.

> **For agentic workers:** Use superpowers:executing-plans to implement this plan in this session. The user approved implementation; continue without another approval round.

**Goal:** A usable local release review dashboard with persistent monthly drafts, live GUS fetch/sync and an epic work-item sidebar.

**Architecture:** Standard-library Python HTTP server and SQLite store, schema-aware Salesforce REST adapter authenticated through sf CLI, and dependency-free browser frontend. Keep parser, GUS transport, persistence/service and HTTP boundaries separate.

**Tech Stack:** Python 3, SQLite, HTML, CSS, JavaScript. No build step.

**Spec:** docs/superpowers/specs/2026-11-02-release-review-design.md

## Global Constraints

- Only modify this project; leave the dirty parent workspace alone.
- Bind to localhost and serve public assets only; tokens remain on the server.
- Monthly edits replace one month while preserving all others and unassigned material.
- No real production writes as a test; the user initiates sync from the dashboard.
- Implement individual epic links first; list-view import is not confirmed.

## Review Focus

- Legacy rich text headings must preserve untouched markup and unassigned notes.
- Missing years and conflicting release years must not silently merge across years.
- Fetch and concurrent edits must preserve persisted drafts and detect conflicts.
- Partial write or verification failures must retain drafts with accurate feedback.
- Work-item pagination and inaccessible optional fields must not masquerade as empty results.

### Task 1: Month parser

**Files:** tracker/comments.py, tests/test_comments.py.
**Interfaces:** parse_comments(raw: str, year: int) -> dict with sections, months, unassigned and inferred; merge_comments(raw: str, year: int, changes: dict) -> str; month_text(parsed: dict, month: str) -> str.

- [ ] Write tests for legacy headings, anchored narrative dates, repeated sections, rich text, explicit years, unassigned material, replacement/deletion and repeated sync.
- [ ] Run `python3 -m unittest tests.test_comments -v`; expect failure before implementation.
- [ ] Implement lossless section boundaries and safe edited rich text. Make unresolved cross-year sequences explicit.
- [ ] Run the same tests; expect PASS.

### Task 2: Persistent service and GUS adapter

**Files:** tracker/gus.py, tracker/store.py, tracker/service.py, tests/test_service.py, tests/test_gus.py.
**Interfaces:** Gus.status(), Gus.epics(ids), Gus.epic(id), Gus.work_items(id), Gus.update_comments(id, text, modified); Store.state(), Store.save_release(payload), Store.save_draft(payload); Service.fetch(release_id), Service.preview(release_id), Service.sync(release_id).

- [ ] Write isolated fake-adapter tests for persistence, list edits, validation, conflicting months, fresh remote merges, partial sync, failed verification, stale drafts and year conflicts. Test transport pagination, metadata-driven fields and conditional headers.
- [ ] Run tests; expect failure for absent interfaces.
- [ ] Implement SQLite persistence, validation, schema discovery, relationship fields and REST pagination. Refresh credentials from sf without exposing tokens. Sync uses conditional writes and verification.
- [ ] Run all tests; expect PASS.

### Task 3: HTTP application and dashboard

**Files:** server.py, public/index.html, public/styles.css, public/app.js, Launch Tracker.command, README.md, .gitignore, tests/test_http.py.
**Interfaces:** GET /api/state, /api/connection, /api/work-items?epic=ID; POST /api/release, /api/draft, /api/fetch, /api/preview, /api/sync. JSON errors use an error string, sync returns per-epic results.

- [ ] Write endpoint tests for public-only assets, same-origin mutation guards, input validation and safe errors; run before implementation.
- [ ] Build responsive dashboard, release manager, month controls, filters, shared column preferences, epic sidebar, month editor, sync preview/conflict resolution and clear connection/empty/error states. Provide read-only sample mode.
- [ ] Add launcher and startup/authentication guide; run HTTP tests and JavaScript syntax checks.

### Task 4: Verification and review

- [ ] Run `python3 -m unittest discover -v`; expect all PASS.
- [ ] Run a browser smoke check against an isolated demo/fake backend: add/revise release, edit month, preview, open epic sidebar, filters and restart persistence.
- [ ] Run read-only live connection check; record any authentication limitation honestly.
- [ ] Request a fresh code review as required by executing-plans, fix material findings, rerun affected checks, and record verification in docs/verification.md.

Execution note: Work in the user-selected project folder. Do not create a worktree or commit the dirty parent home workspace. This avoids moving or capturing unrelated projects.

## Execution ledger

- Task 1 complete in the GUS Apps JavaScript runtime: comment parsing/merging tests pass, including rich-text preservation and year ambiguity.
- Task 2 complete with durable ContentVersion change records: release/draft persistence, partial uploads, concurrent changes, remote conflicts, stale preview binding and readback verification covered by passing tests.
- Task 3 complete: responsive frontend, work-item sidebar, action handler, sample/test server, exact applet package, launcher and deployment guide. Public-only assets and same-origin local writes tested.
- Task 4 verification complete locally: 28 automated tests, browser smoke workflow and browser conflict/year regression checks passed. Fresh independent reviewer findings fixed with regression coverage. See docs/verification.md.
- Remaining external step: upload and live backend/epic verification require deployment authentication. The package is complete; no live production record was modified.
- Ruling: GUS Apps replaces the initial Python/SQLite proposal, per explicit user instruction. The local server is a preview/test harness only.
- Ruling: individual epic link/ID import is the approved starting assumption; list-view import was not confirmed. The UI validates this constraint explicitly.
- Ruling: use the strongest host-supported write protection. REST-capable connections receive conditional PATCH; lightweight facades use an immediate recheck and readback verification, with that limitation visible in the UI. These cannot guarantee an atomic write against simultaneous direct GUS edits.
- Deferred review findings: none.
