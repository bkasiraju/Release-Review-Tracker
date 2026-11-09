# Release Intelligence

A GUS Apps dashboard for reviewing a release's epics month by month.

**2.0.0-GA · GOLDEN BUILD** — user-designated stable rollback baseline. See [golden build and recovery](docs/GOLDEN_BUILD.md).

## What it does

- Save or delete shared releases (including directly from each release’s dropdown trash button) and edit their epic sources at any time. Deleting a release preserves GUS epics, comments and saved epic drafts. Accepts saved GUS epic list-view URLs, multiple individual epic links, and Salesforce record IDs. Fetch refreshes saved-list membership and retains drafts for removed epics.
- Fetch epic owners, health, path to green, completion, and story point breakdowns. Unavailable fields appear as unavailable rather than invented values.
- Automatically create month columns from `ADM_Epic__c.Epic_Health_Comments__c`. Understands headings such as `[Oct update]:`, `Mid Oct Update:`, `Sept Update`, and `November 2026 Update:`.
- Click **Save update** for immediate UI feedback. The background queue persists the selected month, publishes that saved revision to GUS, and verifies readback. Other months, original notes, and untouched rich text are preserved. Conflicts retain drafts for explicit review.
- Fetch uses four parallel workers, with one epic per hosted request. Saves and Fetch share per-epic serialization. In the shared backend, persisted drafts require explicit review after reconnecting. See [background save behavior](docs/background-saves.md).
- Detect remote conflicts, competing saved drafts, stale previews, and ambiguous legacy years. Failed writes or failed verification retain the pending drafts.
- Click an epic to open its work items, status, assignee, sprint name/dates, priority, and story points. Work items are read-only. Load up to 2,000 items, using a 2,001-row sentinel query; larger epics display an explicit warning that totals and filters cover the loaded subset.
- **Release Overview** contains the monthly review table and editor; duplicate Monthly Updates navigation has been removed. Source & sync controls remain in the sidebar and footer.

The **V2MOM Executive Summary** tab presents a concise paragraph for every epic, grouped by Project measure and team, using fresh GUS epic health comments. Executive generation uses current-month health comments first, with previous months as historical context; it excludes work-item counts and separate accomplishment/risk/plan sections. Copy exports the same paragraphs. The official GUS Apps AppletAI SDK synthesizes prose using its configured model, with format and numeric checks; these checks do not prove factual grounding, so review before sharing. If unavailable, the app combines source excerpts into a short paragraph. Earlier reporting periods remain identified; undated comments are not presented as current progress.
- Searchable multi-select release, health, owner, and work-item status menus include Select all and Clear all. Duplicate release scopes are grouped without deleting records; selecting several releases displays each epic once.
- Column preferences save independently of list imports, with captured release IDs and revision checks. Table widths adapt to the selected columns, the review month is highlighted, and spacing is compact across desktop/mobile.

- Generated leadership drafts target two short sentences and at most 280 characters/45 words including timing provenance, with outcomes and next delivery steps rather than implementation inventories.
- **AI Summarise** beside a monthly cell prepares an outcome-focused leadership draft from epic goals/criteria, health comments and delivery descriptions/statuses. The draft fills the main editor automatically; review or edit it, then select **Save update** to publish only that month. Generated text retains snapshot timing where work evidence cannot establish the historical month. SDK generation requires normal GUS Apps AI configuration; source-based fallbacks are labeled.
- Core table columns always show Epic Name, Health, monthly updates, Path to Green and Development Lead. Optional columns remain available in preferences. GUS source metadata remains available even when its fields are not default columns.

- Save release lists with explicit Add/Edit controls; select up to five releases at a time. Connected-list aliases are grouped without deleting their stored history.
- **Full updates** removes monthly table clipping. The sidebar shows all derived months in colored sections with pencil editing; changing one month preserves the others.

## Production: GUS Apps

The production backend is **`backend/index.js`**, exporting `handleRequest(ctx)`. It uses the host's Salesforce connection. The browser calls:

```
POST /api/applets/cfs-release-review-tracker/handler
```

The manifest requests user-context access. Host configuration must also enable running Salesforce operations as the signed-in user. `ctx.userConnection` and known user-scoped clients are preferred over the fallback `ctx.sf` client. The connection indicator exposes the source and, when available, signed-in username. Tokens are never returned to the browser.

### Required access

The execution user needs read access to `ADM_Epic__c`, `ADM_Work__c`, related owners/assignees/sprints, and the relevant fields. Updating requires edit access to `Epic_Health_Comments__c`. Saved releases and drafts require **read/create on `ContentVersion`, edit access to the commit records they create, and create/read on `ContentDocumentLink`**. This app explicitly shares its dashboard journal files with authenticated users in the current GUS organization using Viewer links. Cached fields, comments and drafts may therefore be visible more broadly than the original epic records. Direct GUS epic/work-item permissions are unchanged. New sessions require explicit review of persisted shared drafts before publication.

Required connection methods are `query`, `create`, and `update`. `describe` or `sobject().describe()` improve schema discovery; otherwise known fields are probed using read-only queries. Large result sets require `queryMore` or `request`. Where `request` is available, epic updates use a conditional REST PATCH with `If-Unmodified-Since`. The lightweight query/create/update facade instead rechecks immediately before the update and verifies afterwards. The dashboard indicates this mode because it cannot guarantee an atomic compare-and-write against another simultaneous GUS writer.

### Where data is saved

Releases, epic snapshots, monthly drafts, and year mappings are saved in GUS `ContentVersion` records prefixed **`CFSMonthlyReview_v1_`**. Monthly drafts are shared for each epic across releases visible to the execution user.

Storage uses immutable, compressed change records in `Description` chunks, followed by a completion marker. Partial uploads are ignored; committed changes are replayed in order. Independent concurrent monthly changes merge. Competing edits retain both alternatives and block GUS sync pending resolution. Revision checks catch stale forms; the append-only change history also retains the original events for recovery. The decoder supports GUS Apps runtimes without `structuredClone`. No database or secret file is bundled with the applet.

Workspace discovery reads grouped titles rather than all historical descriptions. Per-entity reads stop at a 10,001-row sentinel and fail safely above 10,000 rows; grouped catalogs stop at the 2,000-title boundary. There is no automatic deletion or rolling age cutoff. See [the retention and archive policy](docs/storage-retention.md).

### Saved epic lists

Paste a URL such as:

```
https://gus.lightning.force.com/lightning/o/ADM_Epic__c/list?filterName=MAPS_266_Review_Tracker1
```

List IDs (`00B…`) and list API names are supported. API names are resolved through `ListView`, then the authenticated Salesforce [List View Describe API](https://developer.salesforce.com/docs/platform/api-rest/guide/resources-listviewdescribe.html) provides the filters and visible columns. The backend fetches the complete matching membership up to 500 epics; lists exceeding that limit require narrower filters and are never silently truncated. Recently Viewed is not a stable saved list and is rejected with an explanation. Work-item list views are not accepted as epic sources.

The production host exposes a query-only Salesforce facade. For the supplied MAPS, MQ, VegaCache, VegaCache FACE and VegaStore lists, `backend/list-definitions.js` contains their actual Salesforce-verified filters and visible columns (14 for MAPS, 13 for MQ), imported on 2 November 2026. Fetch runs those filters against current GUS records; it does not use a fixed epic-ID snapshot. The source drawer identifies this mode and its verification date. Changes to the GUS list filters or columns require refreshing that definition and redeploying. Other lists need native `request()`/`listview().describe()` support or their own verified definition; unknown lists fail explicitly. Manual multi-epic links remain supported. List-specific column values survive fetch and sync.

Refresh metadata using `python3 scripts/refresh_list_definition.py --name MAPS_266_Review_Tracker1 --org GusProduction`, then review and deploy the resulting definition.

### Package and deploy

Requires Python 3 and Node.js 20+ for validation and the local preview; the deployed app uses the GUS Apps Node runtime.

```sh
npm test
npm run package
```

Upload **`dist/cfs-release-review-tracker.zip`** through GUS Apps' applet upload flow, or deploy using the included script:

```sh
npm run deploy
```

The script reads `GUS_DEPLOY_TOKEN` or `GUS_APPS_COOKIE` from the terminal environment. As a fallback, it uses the authenticated `GusProduction` Salesforce CLI org (`GUS_ORG` overrides the alias). To restore that org session:

```sh
sf org login web --instance-url https://gus.my.salesforce.com --alias GusProduction
```

Do not paste credentials into chat or commit them. The deploy script never prints credentials. It uploads the applet to staging, activates the reviewed build through the platform promotion flow, then checks the deployed `connection` and `state` actions without modifying epics. A current platform review is required before activation. Use `--staging-only` to upload without activating. It records the upload/verification result in `dist/deployment-status.json` when an upload succeeds. An upload is reported separately from a verified backend.

The new slug is **`cfs-release-review-tracker`**, distinct from the adjacent existing `cfs-release-review` app. The intended URL is:

[GUS Apps deployment target](https://gus-apps.internal.salesforce.com/applets/cfs-release-review-tracker)

Version **2.0.0-GA** is activated at this URL. A normal signed-in production session verified the live backend and the MAPS saved list resolving to 23 epics and 14 source columns; MQ query-only preflight resolves 27 epics and 13 columns. Deployment-token checks alone do not supply Salesforce user context. See `docs/verification.md` for recorded live checks and limits.

## Local preview

Double-click **`Launch Tracker.command`**, or run:

```sh
npm start -- --demo
```

Open [the sample preview](http://localhost:8383). It uses clearly labeled fictitious data, is read-only, and cannot write to GUS. Local preview is not the production backend.

For browser acceptance tests only:

```sh
node server.js --fixture
python3 tests/browser_smoke.py
```

`python3 tests/browser_conflicts.py` additionally starts its own temporary backend on port 8384 and checks competing-draft resolution and legacy-year correction.

This isolated backend stores sample edits in `.local/fixture.json`. It never contacts Salesforce. The browser test needs the Python Playwright package and its Chromium browser. Delete that fixture file before a fresh test run, after stopping the server. Set `CFS_FIXTURE_FILE` and `CFS_TEST_URL` to isolate multiple test runs.

## Monthly review workflow

1. Create a release, set the reference year, and paste its saved epic list URL or multiple epic links.
2. Choose **Save & pre-fetch** to load current epic fields and comments automatically into the shared backend. **Refresh from GUS** updates them later.
3. Choose a review month or add a month. Click a monthly cell, edit, and **Save update**.
4. Continue working while the status progresses from saving, to saved in the dashboard, to **Saved to GUS** after verification.
5. A failed save keeps its text and provides Retry. Same-month conflicts or ambiguous years retain a backend draft for **Review & sync**; resolve them before publication.
6. Persisted shared drafts remain available for explicit Review & sync after reconnecting. Keep the page open while work is pending; this host does not supply a separate server job runner.

Only monthly comments are editable. Health and work-item metadata remain read-only. Background writes follow explicit Save update actions and resume their persisted intent. No deployment-time epic edits, Slack messages, or scheduled operations are performed.

## Files

| Path | Purpose |
|---|---|
| `public/` | Dashboard assets, with no external runtime dependencies |
| `backend/comments.js` | Lossless month parsing and consolidation |
| `backend/gus.js` | Schema-aware epic/work-item access and comment writes |
| `backend/store.js` | GUS-hosted durable change journal |
| `backend/service.js` | Release, draft, conflict and sync workflow |
| `backend/index.js` | GUS Apps handler |
| `scripts/package_app.py`, `scripts/deploy.py` | Exact package and deployment checks |
| `server.js`, `scripts/fixture.js` | Local sample and isolated test server; not deployed |


Automatic live GUS list/epic refresh reuses shared cached data for one hour. Manual Refresh always fetches and saves the latest snapshot. Open dashboards continue checking shared saved state every minute and on focus, so another user’s manual refresh becomes visible without another live epic fetch.

The icon treatment follows [Core 3PP Remediation CARE](https://gus-apps.internal.salesforce.com/applets/core-3pp-remediation-care/?view=snapshot), using four bundled WebP illustrations and small dimensional SVG action badges. Intro animation is brief, reduced motion is honored, and no external graphics runtime is loaded.

Linked GUS lists supply the dashboard column labels and order (the health-comments field expands into monthly columns). Existing legacy layouts migrate to source order; optional custom layouts persist until the source definition changes. Only Epic Name and Health are required. Use GUS order restores source layout. Source metadata is reread on actual hourly/manual fetches when the host exposes list-view REST/describe access. A verified-definition fallback is visibly labeled; without that host capability, future GUS list changes cannot be detected automatically. The MAPS definition was refreshed on 9 Nov 2026. Individual-record releases default to Project, Epic Name, Status, Development Lead, monthly updates and Path to Green.

The landing view uses compact Epic Name/Health/Development Lead rows. Hover or keyboard focus previews the review month plus recent monthly updates and Path to Green from shared data, without API or AI requests. Expand a row for the selected GUS columns and monthly editing; Full updates expands the visible rows. Filters show selection counts and complete removable name chips. The navigation placeholder CR badge is removed.

The Executive V2MOM Summary supports a second synthesis step: after generating all epic summaries, choose **Generate V2MOM Method Summary**. It sends every generated epic summary to GUS Apps AI within its measure/team group, keeps historical reporting periods, and displays one concise leadership paragraph per group above the epic details. **Copy method update** copies that consolidated view. Results are read-only and scoped to the selected releases/review month; regenerating epic summaries invalidates the roll-up. Each measure/team completes independently. If AI remains unavailable or invalid after one correction, its existing source summaries are retained and explicitly labeled; successful AI consolidations for other teams remain visible. No GUS comments are written by summary generation.
