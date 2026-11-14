## Unreleased — palette refresh, contributors heading

- **Palette:** purple/aubergine accents across the CSS were shifted to blue-slate; the velocity chart bars no longer inherit the black SVG outline, chart labels are dark slate, Committed/Completed bars are light blue-grey/bright blue, the chart tooltip is a light card instead of dark navy, the Say-Do/Points/Items and Pulse/Standup pills use a solid blue selected state with a blue focus ring, and the hub banner is a lighter blue gradient. Overrides live at the end of `hub.css`.
- **Sprints:** the contributors section is titled "Current sprint contributors" with the sprint name beside it (plain "Sprint contributors" when a past sprint is selected). Cache-bust `4.0.0-GA-plan9`.

## Unreleased — default team fallback, per-team release lists

- **Default team fallback:** if the browser blocks localStorage ("Unable to save locally"), the default team is saved as a per-user preference in the backend settings journal (`pref-<userId>`, actions `pref-get` / `pref-set`). localStorage is still used whenever it works.
- **Release Planning releases** are filtered per team by name prefix across scrum teams (MAPS → MAPS 266/268, MQ → MQ 266/268), de-duplicated by name, and still limited to current and future releases. Teams with no name-matched releases fall back to their own Planned Releases list. Cache-bust `4.0.0-GA-plan8`.

## Unreleased — default team, future releases only, planner dropdowns

- **Default team:** a star next to each team in the team dropdown (or `D` while open) sets or clears the default team, saved in this browser's localStorage (`cfs.hub.defaultTeam`) and applied on load. It is the only user preference stored locally; the old implicit last-selected-team key is removed. Release Planning's new tab receives the current team in its URL.
- **Release Planning:** the planned-release picker lists only releases that have not ended (`End_Date__c >= TODAY`); the planner's release, project and engineer dropdowns now use the same custom dropdown as the team picker. Cache-bust `4.0.0-GA-plan7`.

## Unreleased — Release Planning: automatic program tagging, validation at save

The Program field is gone from the planner. On save to GUS, new projects are tagged automatically to the team's `<Team> - 268` program (looked up in GUS; existing GUS projects keep theirs). If a team has no such program (Caching Services today) the review blocks with a clear message. The planner itself is free text with no live validation; every check (epic name, project, planned release, effort > 0, program) runs when Review & save to GUS is clicked and is listed per epic. Cache-bust `4.0.0-GA-plan6`.

## Unreleased — Release Planning is the last tab and opens full screen in a new tab

Release Planning moved to the end of the page tabs, rail and Team Hub tiles. Clicking it opens `#/plan?full` in a new browser tab in focus (full screen) mode (Esc or Exit full screen returns to the normal layout). Opening the URL directly renders it in place. Cache-bust `4.0.0-GA-plan5`.

## Unreleased — Release Planning program picker

The Program picker lists only the `<Team> - 268` programs (constant `PROGRAM_RELEASE` in `backend/plan.js`), narrowed to the selected team (MAPS, MQ, VegaCache, VegaCache FACE, VegaStore). Teams with no matching program (Caching Services) see all five. Bump `PROGRAM_RELEASE` for the next release. Cache-bust `4.0.0-GA-plan4`.

## Unreleased — On-call effort in Release Planning

The leaves popup (now "Leaves, holidays & on-call") has an On-call (days) column per engineer, saved in the plan's `people` entry (`oncall`). Available = working days − leave − holidays − on-call. On-call is dashboard-only, not written to GUS. Cache-bust `4.0.0-GA-plan3`.

## Unreleased fix — team dropdown reopened natively

Picking a team in the custom dropdown re-clicked the hidden native select through the wrapping `<label for>`, so the OS menu popped open again. The label's activation is now suppressed (clicking the TEAM text focuses the custom button). Cache-bust `4.0.0-GA-plan2`.

## Unreleased (on top of 4.0.0-GA) — Release Planning tab

New hub tab **Release Planning** (`public/plan.js`, `backend/plan.js`, actions `plan-get`, `plan-save`, `plan-refs`, `plan-commit`). Engineers plan per team: projects (linked to a GUS Program), epics (priority, planned release, project, ABL/BTL) and workstreams (engineer, effort in days, tentative sprint). The dashboard recomputes live: available capacity (working days in the planning window minus per-engineer leave and holidays, entered in the "Leaves & holidays" popup), planned ABL/BTL, headroom, effort by theme/method (project theme, else the project-name prefix before ":") and per-engineer load. The draft is stored in the settings journal under `plan-<teamId>`.

"Review & save to GUS" previews, then writes ONLY ABL epics: creates or links the `PPM_Project__c` (with its `PPM_Program__c`), then creates or updates the `ADM_Epic__c` with Project, Planned Release, Priority and Planned Effort (days, in `Planned_Story_Points__c`). BTL epics, tentative sprint, workstreams, leaves and holidays stay dashboard-only. Retries update rather than duplicate. The 4.0.0-GA golden build is unchanged. Team Hub tile grid now fits 9 tiles. Cache-bust suffix `4.0.0-GA-plan1`.

Validation: `tests/plan.test.js` (5 tests, mocked GUS) and a stubbed browser harness. The commit path has NOT been exercised against live GUS. Node suite 212 pass / 38 fail (the same 38 pre-existing failures).

## 4.0.0-GA — GOLDEN BUILD (Release Intelligence team hub)

User-designated GOLDEN BUILD and preferred rollback baseline (14 November 2026). Includes the Team Hub redesign (team first, leaders last in fixed order, aligned summary tiles), V2MOM Updates rename, new logo, shared column sizing, 25-row pagination, status colours, Open-in-GUS link bars, Test Failures filters, Bugs pagination, focus mode and custom team dropdown. Tags `v4.0.0-GA`, `GOLDEN-BUILD-4.0.0-GA`; archive `releases/4.0.0-GA/`. Previous baseline: `GOLDEN-BUILD-3.0.0-GA`. Verified on a stubbed harness only; node suite 207 pass / 38 fail, identical to the pre-change baseline. Private GOLDEN Dataset not re-captured for 4.0.0-GA (3.0.0-GA dataset remains the latest).

## 3.0.0-GA — GOLDEN BUILD tooltip status chips

Summary tooltip headings now show left-aligned Epic Status and Release Review Status chips beneath the epic title. Review Status uses the saved value only when valid for the current Epic Status and free of storage conflict; otherwise shows Not set or Not required. No data is modified.

Validation: focused isolated browser flow checks both chip labels, saved Review Status and left alignment, retaining monthly availability colors, recovery visibility and coverage spacing. Syntax/diff checks passed. No production model call or dataset mutation.

## 3.0.0-GA — GOLDEN BUILD clean dropdown alignment

Watch epic Summary tooltips also use red-tinted amber for Path to Green; focused browser color assertion passed.

Removed the From GUS source chip from the epic table toolbar. Release, health, owner and grouping dropdown labels align left with carets at the right edge in empty and selected states.

Validation: focused isolated browser flow verifies source-label removal and label/caret geometry at 1600 and 1100px, including selected filter state. Syntax/diff checks passed. No backend or dataset changes.

## 3.0.0-GA — GOLDEN BUILD monthly AI actions

Missing review-month Summary tooltips include AI Summarise, opening the matching epic/month sidebar and generating a draft. Generated text that needs review has Copy to monthly update and Undo copy actions. Transfer is explicit, retains the validation warning, and never auto-saves or syncs. Accepted drafts continue to populate the editor with Undo.

Validation: focused isolated browser flow with controlled AI responses verifies epic/month navigation, rejected-text transfer, retained warning, undo, accepted-draft behavior and absence of implicit save/sync requests. Syntax/diff checks passed. No live production model call or dataset mutation.

## 3.0.0-GA — GOLDEN BUILD semantic tooltip month colors

Review Status dropdowns now share a fixed trailing warning slot, keeping populated and required selectors aligned; warning icons appear after the selector. Focused browser comparison checks equal x-position/width and trailing icon placement.

All populated dated month sections in Summary tooltips use green. Missing month sections use red-tinted amber, independent of their position; the missing review-month guidance remains visible. Completed epics remain exempt. Colors indicate update availability, not delivery health. Engineer comments and backend data are unchanged.

Validation: focused isolated browser assertions for green populated sections and red-tinted amber missing review month, plus retained recovery visibility and chart spacing checks. Syntax/diff checks passed. No production model call or dataset mutation.

## 3.0.0-GA — GOLDEN BUILD missing review-month guidance

Summary tooltips show the missing review month as an amber section with a prompt to add the latest status or use AI Summarise. Existing fallback/general content is retained. Completed epics remain exempt; populated monthly updates keep their normal styling.

Validation: focused isolated browser checks for amber guidance, populated review month, Completed exemption, On Track recovery suppression, and coverage alignment. Syntax/diff checks passed. No dataset mutation or production model invocation.

## 3.0.0-GA — GOLDEN BUILD tooltip and coverage refinement

On Track epic Summary tooltips display monthly updates without the Path to Green section, whether a recovery field is populated or empty. Other statuses retain that section. No stored comments or Path to Green values are changed. Monthly coverage uses intrinsic label widths and a dedicated gap so labels, bars and counts remain separate.

Validation: focused isolated browser check for On Track with/without saved recovery text, Watch recovery visibility and three monthly sections; label/bar/count separation at 1600, 1280 and 900px. Syntax and diff checks passed. No production model invocation or dataset mutation.

## 3.0.0-GA — consolidated GOLDEN BUILD: independent text mode and expansion

At the user's explicit request, the tooltip patch and update-view fix are folded back into the current 3.0.0-GA GOLDEN BUILD. The prior exact 3.0.0-GA archive is preserved at releases/3.0.0-GA-original/ and its source is retained at GOLDEN-BUILD-3.0.0-GA-original. Older 2.0.0-GA and 3.0.1-GA releases remain intact. The private GOLDEN Dataset is unchanged.

Compact/Full Updates now controls only monthly-text clipping. It does not expand/collapse rows or groups. Expand All, Collapse All and individual row toggles change expansion only and never reset the chosen text mode. Nested grouped views, applied filters, selected dashboard view and retained horizontal positions remain intact. The unified light tooltip system from 3.0.1-GA is included, with no native/duplicate title hints.

Validation: one focused isolated browser flow first reproduced Full Updates incorrectly opening every row, then passed after decoupling. It checks compact clipping/full text, unchanged expansion on mode changes, retained mode on single/all row toggles, nested group collapse/expansion, filtered scopes and horizontal position during mode changes. UI-only fix; syntax/diff and exact package checks passed. No unrelated Node/full suite, live model call or dataset mutation. Previous tooltip verification remains recorded in the 3.0.1-GA history.

## 3.0.1-GA — unified light dashboard tooltips

Replaces native browser title hints with one shared dashboard tooltip surface. Initial and dynamically added titles are migrated, preventing duplicate native/custom hints. Summary and AI-preview triggers retain their rich popovers without a second plain tooltip. The shared hint uses a subtle light blue background, black Salesforce Sans text, rounded border, restrained shadow and viewport-safe wrapping. Existing rich popover headers use matching light colors.

Tooltips support keyboard focus, scoped aria-describedby cleanup, Escape dismissal, hoverable text, dynamic title updates and hiding on click, scroll, resize or removed controls. Content is rendered as text, not HTML. The local preview server serves the new asset. No GUS data, AI generation or persistence behavior changed.

Validation: one focused isolated browser flow verifies zero native title attributes after dynamic rendering, the missing-update hint, single rich-summary popover, keyboard focus/Escape, dynamic additions/updates/removal and long-content viewport wrapping. Syntax/diff and package checks passed. No unrelated Node/full suite or production model test. The 3.0.0-GA GOLDEN BUILD tags, archives and private GOLDEN Dataset remain unchanged and are still the preferred recovery baseline.

## 3.0.0-GA — current GOLDEN BUILD and verified private GOLDEN Dataset

Promotes the complete current Release Intelligence implementation to 3.0.0-GA. This is the user-designated preferred recovery version going forward. New immutable tags v3.0.0-GA and GOLDEN-BUILD-3.0.0-GA and an exact ZIP/checksum preserve the application baseline. Earlier 2.0.0-GA tags and archives remain unchanged.

Includes shared executive delta caching with hourly evidence validation, changed-epic/affected-team regeneration, concise grounded summaries, shared release/monthly history and status workflows, Completed exemption, icon-only exceptions and subtle GUS links. GUS links now occupy a fixed icon slot in every row regardless of missing-update icons, including grouped views. The dashboard footer and connection API report 3.0.0-GA. The release entry page and recovery instructions use the new version.

The live shared backend journal and materialized saved records were captured separately as Backend - GOLDEN Dataset, uploaded to a private Salesforce ContentVersion file in GUS and verified by full download checksum and dataset equality. Only nonsensitive verification metadata/checksum is in Git; actual data, record IDs, local backup and credentials remain private. No live dataset records, comments or drafts were overwritten. Application rollback preserves the live backend; dataset restoration is a separate explicitly authorized recovery action.

Validation: 30 focused snapshot/cache/executive checks and one release browser flow passed; no full suite. Browser verifies the version, consistent GUS link positioning with/without missing-update icons and groups, new-tab navigation without expanding rows, and no GOLDEN badge in the dashboard. Actual production backend snapshot upload/download was verified. Actual production model generation was not reverified. See docs/GOLDEN_BUILD.md and GOLDEN_DATASET.json.

## 2.0.0-GA — shared executive delta cache and subtle epic links

Successful epic analysis and measure/team summaries now persist in the existing shared GUS Apps backend. One-hour source validation reuses fresh shared epic/work snapshots; elapsed time alone never expires successful AI analysis. Content fingerprints cover the review month, comment/health revision, relevant goals/context/recovery and work evidence. Changed epics alone are regenerated, then only their affected measure/team consolidations. Membership and rule version are part of cache identity. Manual Refresh and shared local edits invalidate relevant source freshness. Rejected/failed/stale summaries never become ready cached prose; saves recheck scope, evidence and dependencies. Page-session memo provides reuse during transient shared-cache failures. Cache-only operations produce no AI-usage notification.

Removed the yellow last-verified-column-layout banner. Sources & connection retains the underlying details. Added a subtle unboxed 13px GUS link icon with a 24px target beside each epic name; opens its Salesforce GUS record in a new tab without expanding the row. Existing history, status edits and factual checks remain.

Validation: 27 focused cache/executive tests and one isolated browser flow. Repeated generation and page reload used zero additional AI calls; a single status change and then a comment change each regenerated one epic and one affected team. Tests cover hourly unchanged-evidence reuse, work-status deltas, manual refresh, scope rejection and unsupported/stale cache writes. Browser verifies the removed banner and accessible GUS links. No full suite, live production model call or real epic mutation. Concurrent users may both generate an uncached result; caching does not claim an atomic distributed generation lock.

## 2.0.0-GA — icon-only warnings and Completed epic exemption

Missing updates now show only the red animated calendar/exclamation icon, retaining a month-specific hover title, accessible label and editor shortcut. Required-review icons no longer animate. Completed epics are exempt from missing-month markers, awaiting filters/counts, monthly coverage requirements and all Slack reminder preparation. Empty completed-month cells say Not required; existing comments and history remain visible. Fresh GUS Health__c is checked before creating single or grouped Slack reminders, including when an epic completes after the dashboard was fetched.

Validation: eight focused Slack nudge tests and one isolated browser flow verify icon-only warnings, styling/reduced-motion, Completed marker/count/filter exemption, month navigation and fixture save behavior. Syntax/diff checks passed. No full suite or live GUS/model writes.

## 2.0.0-GA — simple row exception labels

Missing review-month updates now use plain red text with an unboxed calendar/exclamation icon instead of filled chips. Required Review Status uses a red prompt and bare exclamation icon with a neutral dropdown. Only the small exception icons pulse gently three times; reduced-motion preferences disable animation. Existing month-specific accessible labels, editor shortcuts, status editing and save behavior remain.

Validation: one focused isolated browser check verifies border/background removal, red text, icon animation/reduced-motion, grouped/month-specific markers, editor navigation, fixture save and narrow-screen accessibility. No Node/full suite or live GUS/model writes.

## 2.0.0-GA — AI gateway recovery and concise grounded summaries

Fixed the generic catch-all message that hid provider errors. All summary SDK flows now share a two-request concurrency limit, give every initial/correction call its own 60-second timeout, and automatically retry one transient network/rate-limit failure. Authentication, budget and non-transient errors do not trigger blind retries; safe provider-specific diagnostics distinguish these from evidence rejection. Actual SDK attempts and reported usage remain counted.

Executive and measure paragraphs reject missing-update/metrics boilerplate and leadership instructions. Pending negotiations must retain their source meaning rather than becoming unsupported blocked claims. Prompts target 30–45 words/300–350 characters within the existing 500-character/70-word cap. Whole-sentence compaction runs only after the entire original response passes factual checks, retains dependency/risk/recovery sentences, and validates the selected result again. It cannot conceal an unsupported claim, invent a fallback or publish an invalid/empty paragraph.

Validation: 29 focused executive/grounding tests; one 26-epic isolated browser flow for generation, compact measure/team output, copy and refresh preservation; actual host SDK source exercised with a simulated gateway for retry/usage contract. No full suite or real authenticated production model call. Deployment authentication cannot supply Salesforce session context; actual user-session model behavior is not verified.

## 2.0.0-GA — missing-review-month indicator on epic rows

Fetched epics without a dated update for the selected review month now show an amber calendar/exclamation icon and Missing update badge beside the epic name. Its accessible label and hover title name the missing month. Clicking opens that month’s editor directly. The indicator appears on the parent epic row, including grouped/expanded views, without repeating it inside the detailed table. At narrow widths the text label folds away while the icon and accessible month label remain.

Pending save text and saved drafts count as available update text, so the marker disappears immediately when an update is submitted. Other months and undated fallback notes do not satisfy the selected-month check. Unfetched epics and unavailable comments are not falsely labeled as confirmed missing updates. The missing-month filter and headline count use the same value resolution, including pending saves.

Validation: one focused isolated browser flow checks missing/current months, grouped rows, October/November/December switching, correct editor navigation, fixture GUS save and marker removal, and narrow-screen icon/accessibility. UI-only change; syntax and diff checks pass. No Node/full suite or live GUS/model calls were run.

## 2.0.0-GA — compact V2MOM outcome updates and full-page epic table

Generate V2MOM update now prepares grounded epic summaries and automatically synthesizes one compact paragraph per measure/team. The primary output combines related delivery outcomes rather than displaying concatenated epic reports. The runtime GUS Apps AI SDK system/user instructions aim for 40–55 words with a hard 500-character/70-word cap, selecting two or three material outcome themes, meaningful supplied metrics and critical dependencies/risks with documented recovery or next actions. Current review-month evidence leads; older progress supplies only necessary context. Technical inventories and repeated historical narration are omitted when not material. Goals, Closed, Ready for Review and Released remain distinct; existing factual/temporal/numeric guards and empty-output rejection remain. Screenshot examples guide style only and supply no runtime facts. Instructions are documented in docs/V2MOM_UPDATE_INSTRUCTIONS.md and embedded in the SDK payload.

Detailed epic paragraphs remain under a collapsed supporting section. Expand All/Collapse All include that section. Copy leadership update exports only ready compact measure/team paragraphs, grouped once by measure and full team name. The separate measure action can regenerate consolidation from existing epic summaries without repeating the epic phase. Incomplete/rejected output remains in diagnostics; partial coverage is not represented as complete. Existing refresh-state preservation is retained.

The overview table no longer uses the fixed 560px vertical cap. It lays out all rows naturally and fills available page height, with the footer after the table; horizontal scrolling and the explicit fullscreen mode remain available. Executive view keeps its independent layout.

Validation: eleven focused executive tests pass, including all-source inclusion, runtime SDK override, compact caps and existing evidence/empty-output safeguards. One combined isolated browser flow verifies 26 rows without internal vertical clipping, one-click consolidation, three compact team paragraphs, measure-level clipboard, hidden supporting detail, expand/collapse and manual-fetch state preservation. No full suite or actual production model/GUS mutation was performed.

## 2.0.0-GA — reject empty-looking AI summaries and omit empty cards

Fixed quoted-empty AI responses such as two quote characters being accepted as nonempty summaries. Native executive, SDK executive and consolidated-measure validation now reject quote-only, punctuation-only, placeholder and standalone-status responses while retaining valid short prose. Existing evidence, numeric, chronology and status checks remain. A bounded correction may still recover a usable paragraph; repeated empty output remains non-ready rather than fabricated fallback prose.

UI readiness applies the same content check defensively, including legacy payloads that incorrectly declare empty text ready. Empty epic results cannot create a measure/team group or enter the copied leadership update. Consolidated measure/team cards and their copy action are created only for substantive ready paragraphs. Failed consolidations remain in a separate collapsed generation-details section, rather than empty measure cards. Real source gaps and failures are not hidden as successful coverage.

Validation: ten focused executive tests pass, including quote/punctuation/placeholder/status rejection, bounded native/SDK empty responses, existing evidence checks and preference behavior. One isolated browser flow tests all-empty and mixed valid/legacy-empty responses, zero empty executive/consolidated cards, copy-action visibility and clipboard exclusion, diagnostics, and successful retry. No full suite run or live GUS/model calls.

## 2.0.0-GA — full-width executive updates

Removed the 1100px executive paragraph cap. Executive updates now use the full available measure/team content width with the existing compact side padding, matching consolidated updates. Long unbroken text wraps within the available width. No update text, AI rules or GUS data is changed.

Validation: one focused isolated browser flow generates representative executive and consolidated output and verifies paragraph width equals the parent content width with no overflow at 2400px, 1200px and 760px. CSS-only change; no Node or broad regression suite run.

## 2.0.0-GA — preserve review state during background refresh

Fixed the executive summary disappearing during GUS fetch/repaint. Generated summary scope is now the selected release IDs and review month, independent of cache document revisions. Per-epic fetch revisions no longer hide executive or consolidated measure output or disable its copy action. Meaningful source evidence changes retain the existing summary and show a separate regeneration prompt; summaries are not silently regenerated or represented as newly generated from changed evidence.

Executive rendering skips identical output, preserving the actual DOM through routine cache refresh. Open/collapsed measure and evidence sections survive repaint. Viewport and table/drawer/nested-table scroll positions and table-control focus are retained when DOM must be rebuilt. Selected owner/health filters remain selected even if refreshed values no longer contain them, so users can explicitly clear them rather than silently losing the filter. Fetch error dialogs no longer replace an active drawer/editor. Existing unsaved-editor/recovery guards continue to defer automatic refresh. No summary is persisted to browser storage; a full browser page reload starts a fresh session as requested. Manual GUS fetch also retains summaries and review state.

Validation: one isolated browser flow deliberately changes cache revisions on automatic state responses, generates executive/measure output, checks DOM identity and collapse state, runs manual GUS fetch, changes source comments and checks retained copyable output plus regeneration notice, then checks search, expanded rows and unsaved monthly text survive refresh. Four focused grouping/sorting tests also pass, retaining the new review-priority default. No full suite or live data/model calls were performed.

## 2.0.0-GA — review-priority default Epic Status sorting

The landing table now defaults to Epic Status priority rather than epic name. Watch and Not Started precede On Track and Completed. Blocked/At Risk are highest priority; Canceled follows completed work, and unreported status is placed last. Other unrecognized active statuses stay before healthy work. Names provide deterministic ordering within a status priority. Health grouping uses the same priority, while rows inside other groups retain the selected table order. Clicking the status header reverses the priority, and manual name/lead sorting remains available. Reload restores the requested default status sort. No GUS data is changed by sorting.

Validation: four focused grouping/sorting tests and one isolated browser flow covering default row order, reverse status order, manual name sorting and reload. No full suite run; no live GUS writes or model calls.

## 2.0.0-GA — inline Watch recovery and readable summary tooltips

Selecting a Watch Review Status without Path to Green now opens a small inline popup beside the control. The user enters a recovery action and next step, then Save & apply status writes both GUS Path_to_Green__c and Epic_Health_Comments__c in one Salesforce record update. The selected review month receives a new append-only entry retaining its latest engineer update plus the explicit Path to Green. Original rich comment history and pending dashboard drafts remain intact. Both fields are reread and verified before the shared Review Status is applied. Invalid reasons, changed remote plans, stale shared revisions and unverifiable writes do not silently apply a review reason. Cancel leaves data unchanged. Failed saves retain entered text in the popup.

Recent-update tooltips now use content-sensitive widths constrained to the viewport and available space beside the Summary-button column. Long URLs and unbroken text wrap inside month tiles; long bodies scroll vertically. Summary buttons remain unobstructed. Click opening waits for table scroll positioning so a narrow-view auto-scroll cannot immediately close the tooltip.

Validation: three focused tests cover the combined recovery write, current-month entry and rich-history/draft preservation, retry idempotency, stale-plan/invalid-reason/verification failures, and conditional Health Comments plus Path-to-Green adapter fields. One isolated browser flow checks popup cancel/save, both remote fixture fields, Review Status reload, long-link wrapping, viewport bounds and clear Summary-button lane at 1600px and 900px. No full suite run. No live GUS data was changed by tests; actual production write permissions remain user/session dependent. Existing non-atomic fallback and shared-store failure caveats remain: if GUS succeeds but dashboard persistence subsequently fails, the UI reports the failure and retains text for review.

## 2.0.0-GA — distinct status colors and inline GUS Epic Status editing

Epic Status is editable inline in parent and optionally visible detail rows, including grouped views. The app loads active GUS Health picklist values when metadata access is available and respects read-only permissions. Every save checks release membership, current shared revision and current GUS status, writes only Health__c, and verifies the actual GUS value before updating shared dashboard state. Pending monthly drafts and engineer comments are preserved. Changing status clears the old dashboard Review Status reason so the user selects a reason appropriate to the new status. Watch requires saved Path to Green; selecting it without recovery text opens the existing editor first. Normal GUS refresh continues to bring externally changed statuses into the shared dashboard.

Distinct status colors now apply to badges, inline controls, legends and the Epic Health chart: Not Started grey, Canceled yellow, Watch amber, Blocked/At Risk red, Completed blue and On Track green. Healthy metric semantics are retained: Completed and On Track remain healthy despite their different visual colors.

Validation: three focused service/adapter tests cover verified Health-only writes, stale/invalid edits, preservation, review-reason reset, external refresh, Watch recovery, verification failure, active picklist metadata, permission denial and conditional headers. One isolated browser flow verified six unique badge/dot colors, healthy filtering, inline status writes and reload, updated review options and missing-Watch recovery. No full suite run and no live GUS records were changed by tests. Actual production write permissions and model responses remain session-dependent and unverified by the isolated flow.

## 2.0.0-GA — AI dependency recovery and clearer review controls

Removed automatic Google Sheets lookup from read-only previews, monthly/executive generation and individual comment publication. These paths use GUS comments and verified work evidence directly; absent Measure remains unassigned and is called out separately, never guessed. Normal generation/publication still requires the epic goal and applicable Path to Green. Read-only preview uses the displayed engineer text, needs no mapping/goal/recovery metadata and never writes. Summary evidence, chronology, status and release guards remain unchanged. Removed repetitive Review epic recovery buttons and clarified the optional reference settings.

Not Started now requires one of Planned, Bandwidth Constraints, Dependency-Blocker or To be re-prioritised. The shared save/schema/publication checks match, and saving Review Status preserves pending monthly drafts. Parent columns balance epic titles with readable leads, statuses and summary controls. Epic Health has a distinct pulse icon. Selected monthly editor appears first; remaining months retain chronological order. Review & publish is hidden when no drafts await action and retained for pending recovery.

Added a visible dashboard loading spinner until shared data loads or an actionable error appears. Recent-update tooltip opens beside the Summary-button column, keeping that column clear for moving to the next row. Reduced-motion preference is respected.

Validation: 12 focused Node tests and one combined isolated browser flow covering enum save/reload/publication, column widths, displayed-text preview and monthly/executive/measure SDK flows with Sheets unavailable, active-month order, loading lifecycle, tooltip placement and next-summary navigation. No full suite run. Production source deployment is checked separately; actual production SDK/model responses and authenticated browser remain unverified. No live GUS comments or Slack messages are modified by these tests.

## 2.0.0-GA — clean measure updates and streamlined review layout

The user explicitly made Method optional. A populated GUS Project/Measure now permits AI generation and publication without Method metadata, private Google Sheets access or Method review. Only an absent measure needs resolution; existing goal and recovery checks remain. Manual measure confirmation no longer requires a Method. Annual reference settings remain available for missing-measure fallback and context.

Executive updates now use a dedicated validated prose path for SDK/native AI with one bounded correction. Engineer comments remain primary; fresh month-scoped work subject/description/status facts supplement them. Shareable output contains only supported third-person TPM program/measure paragraphs. Raw source fallback, “The team reports,” Done/Outcome/context labels, repeated KPI inventories, health badges and missing-update callouts no longer appear in update paragraphs or copied updates. Evidence and generation problems remain in a collapsed inspection section, separate from copyable prose. Unavailable or rejected AI returns no copyable paragraph rather than raw source fragments. Valid undated accomplishments may be stated without invented month attribution; an explicit current-month claim still needs dated support. Completion/release/phase guards remain.

Executive export groups clean paragraphs by measure and full team name; consolidated output uses the same clean measure/team grouping. The summary row order is Epic Name, Development Lead, Epic Status, Review Status, Review Summary. Summary buttons have an actual aligned Review Summary column. The nested expanded table hides both status columns by default; users can opt in from Columns. These shared preferences survive reload and release edits, and the parent statuses always remain visible. Tabs are reduced to a compact 13px/34px treatment while retaining selected-state contrast. Tiles are reordered in the DOM for matching visual/keyboard order: Release scope, Story point delivery, Epic health, On track, Needs attention, review-month updates, Monthly coverage.

Validation: eight focused tests covering measure-only resolution without Google/Method, bounded native/SDK correction, no fallback export, clean consolidation, undated-versus-current timing and shared preference persistence through release edits. One combined browser flow checked literal clipboard content, SDK correction, parent row order, Summary heading, default checkbox states and reload persistence, compact tabs and tile order. No full suite run. Actual production SDK/model output remains unverified; no live GUS comments or Slack messages were modified in tests.

## 2.0.0-GA — Path to Green in monthly updates

Removed Path to Green capture buttons from compact and expanded epic Status cells. The monthly-update editor now contains the recovery-plan field, required for Watch/Blocked, with an explicit Save Path to Green action. Save update validates and saves any changed plan through the verified GUS endpoint before queueing comment publication. The plan remains the epic-level GUS field. Existing Review Status and source-evidence publication checks remain. Validation: focused browser workflow verified no row PTG buttons, mandatory monthly field, verified GUS path save, status persistence, grouping and summary controls; JavaScript syntax check passed. No unrelated test suites run.

## 2.0.0-GA — inline Epic Health legend

Status/count pairs now sit side by side with 8px gaps and wrap neatly at the tile edge. Each label stays with its count; status-filter actions remain. The chart and backend behavior are unchanged. Validation: one focused browser flow at wide/narrow sizes checked adjacency, no clipping and filtering; no unrelated tests rerun.

## 2.0.0-GA — review statuses, EpicPulse policy and measure/team summaries

Renamed the status header to Epic Status and added shared, inline Review Status in compact, expanded and grouped rows plus the epic sidebar. Watch accepts Delayed or At-Risk; Canceled accepts De-Prioritised, Mistakenly Added or Not a Priority. Missing required values show !. Values are scoped to the current fresh GUS status, persisted in the dashboard journal and retained on fetch. Stale status/revision saves are rejected. Review Status does not overwrite GUS Health.

Watch requires a saved Path to Green before Review Status/publication. Watch, Blocked or explicit reported blockers require Path to Green for AI/publishing. The editor writes the actual GUS Path_to_Green__c with prechecks/conditional write where available and a post-save verification. No AI silently invents or changes a recovery plan.

The user explicitly adopted the linked EpicPulse guide after choosing its conflicts over prior behavior. New approved comments are now prepended append-only rather than replacing/sorting older entries. Exact existing rich history is preserved, repeat saves are idempotent, and empty updates cannot erase history. The monthly editor and AI use only the newest same-month entry; older entries remain separately available. Goal/Success Criteria, verified mapping or engineer-confirmed none, and required recovery data are checked before AI/GUS publication. Engineer comments are primary; work evidence supplements them. Missing-data caveats stay separate from polished prose.

Sources & connection now exposes a shared editable annual V2MOM sheet, fiscal year and tabs, initially the supplied FY27 HRP sheet. Project V2MOM mapping is primary; sheet fallback reads fresh data through an authenticated host Sheets adapter (or accessible Google export), matches exact measure codes/labels and rejects ambiguity. The supplied private sheet export returns HTTP 401. GUS Apps Google Sheets authentication is therefore still required for automatic private-sheet fallback; no stale snapshot or memorized mapping is used. Engineer-confirmed mapping is explicitly saved and tied to the complete reference configuration, including tabs, and expires on any reference change.

Executive and consolidated updates use one expandable V2MOM measure header with full team sections beneath it. Added Expand All, Collapse All and per-measure +/− controls. Risks are ordered first within each team; deterministic completion/target/story-point KPIs remain separate from narrative paragraphs. Verified team context no longer causes false completion rejection in method consolidation; wrong phases, dates and release claims still fail. Rejected AI method text is escaped and shown separately for review, never applied as a supported summary.

Health distribution uses compact status/count legends so seven metric tiles no longer stretch vertically. Navigation tabs have larger text, subtle backgrounds and a stronger selected state.

Validation: 10 focused workflow tests plus 4 targeted AI checks, and one combined browser flow covering status persistence, GUS path save, groups/details, annual settings, newest-entry editor/history, one measure/three team sections, all accordion controls, tabs and compact tile height. No full suite run. Production LLM output and the host Google Sheets adapter remain unverified; no live GUS epic comments or Slack messages were changed by tests. Slack capture/posting portions of the external guide are outside this summary adaptation; reminder preparation remains user-controlled.

## 2.0.0-GA — compact metrics, grouped collapse and explicit summaries

Removed bottom action links/dividers from the first four metric tiles; the whole tile still filters the table. Larger metric doughnuts and the health distribution remain; monthly coverage and story-point delivery use bars and raw totals. Seven tiles retain equal height in one scrollable section. Blue/teal replaces the primary purple review accents. Updated the Release Priorities subtitle.

Collapse All now closes every group level and epic detail, including partially expanded grouped views. Expand All reopens groups and details. Collapsed rows provide an explicit Summary button; expanded rows have no source tooltip trigger and monthly AI Preview requires a click, so hovering visible content consumes no tokens.

Monthly AI formatting cleanup accepts harmless emphasis and converts first-person wording before factual/style validation, without another model call. Numeric matching is lossless and normalizes only valid thousands separators; comma lists and distinct large integers remain distinct. Genuine failures name the unsupported number/reason and show escaped, read-only generated text for review without applying it or changing the editor. Existing source-evidence status/release checks remain.

Validation: six targeted Node tests and one combined fixture browser flow covering layout, restored bars, grouped collapse/expand, source Summary, no AI on expanded hover, correction, failure preservation and explicit save/reload. No full suite run. Production SDK/model output remains unverified; no production epic comments or Slack messages were changed in tests.

## 2.0.0-GA — monthly AI acceptance recovery and seven health tiles

The monthly validator no longer discards a supported current paragraph solely because optional historical text is missing/invalid, citation metadata omits known keys, or the paragraph slightly exceeds the preferred short target. Invalid historical content is omitted with a visible review note; missing citation coverage is also a note rather than an assertion of full coverage. JSON, JSON summary aliases and finished plain prose share the same factual/style checks. Current prose has a bounded hard limit (500 characters/85 words), while the prompt retains its shorter preferred target. Invented citations, unsupported current completion/release claims, status inventories, empty/error tokens and first person remain failures. Correction and the final warning now receive the specific validation reason.

Fixed a concrete false rejection: progressing toward review readiness is future progress, not proof that review readiness has already been reached. Existing unsupported-release and current-ready-state checks remain. A valid current update can be shown after one model call even if optional prior context needs review; no raw task/status fallback was reintroduced. Original editor text remains unchanged when the current paragraph fails.

Release metrics and Health & delivery are now one default-expanded collapsible Release Health Metrics section. All seven cards use the same compact styling and 3D icon scale in one grid row. Narrow screens scroll the strip horizontally without clipping values or forcing page overflow. Existing tile filters, health/coverage/story-point controls remain.

User preference is recorded in AGENTS.md: validate affected modules and one relevant UI flow; do not rerun unrelated suites or hold the live app completion for Pages. Validation here: 48 focused monthly/AI/grounding tests and one browser flow for seven-card layout, collapse, correction, failed editor preservation and explicit save/reload. No full suite run. Production LLM output remains unverified because the signed-in browser tool is unavailable; the change addresses reproducible validator failures and adds precise diagnostics rather than claiming model perfection. No production comments or Slack messages were written in tests.


## 2.0.0-GA — epic leadership AI instruction policy

Added a reusable runtime instruction file (`backend/monthly-instructions.js`) and matching human-readable guide (`docs/AI_EPIC_SUMMARY_INSTRUCTIONS.md`). The existing backend first fetches the epic, goals/description/success criteria, health comments, Path to Green and month/sprint work evidence. The SDK then receives the policy as its system prompt and the complete supplied primary delivery evidence as data; the model has no query/write/tool authority.

Current-month engineer updates and verified transitions lead; review-month sprint subjects/descriptions/status support the narrative, goals explain purpose, and older comments provide a separate historical sentence. Current updates are a third-person leadership paragraph (up to360 characters/60 words), with supported risks and documented recovery/next actions where available. Prior context stays within160 characters/28 words. Descriptions, Closed and Ready for Review never establish release or completion of the entire epic. Historical health cannot inherit a later snapshot. A documented infinitive recovery action is not a completed outcome.

Both SDK and native paths reject subject/status inventories, including dash, colon, equals and bracket forms, in either paragraph. A rejected response gets one automatic correction within the existing shared deadline (SDK60s/native12s), and SDK token accounting includes both attempts. Failed/unavailable generation now returns no ready draft and preserves the existing editor and unsaved state; raw work lists are no longer substituted or labelled ready. Saving remains an explicit user action.

Validation: 175 Node tests; isolated browser generation/correction, repeated-invalid editor/source preservation, explicit Save and reload checks pass with mocked SDK responses. Runtime instruction/document parity was independently verified. Production LLM quality and hosted-browser behavior remain unverified; heuristic claim checks are not semantic proof. No production epic comments or Slack messages were written in testing.


## 2.0.0-GA — Escape grouping reset and Slack epic hyperlinks

Every selected Group by field now participates in the same last-applied-first Escape undo sequence as health, owner, search and metric filters. Group choices have removable applied-filter chips. Clear and rapid double Escape also reset grouping; double Escape retains its one manual GUS refresh. Existing open-menu, tooltip and unsaved-editor handling remains first priority. Release selection and review month remain the review scope rather than removable filters.

Slack reminder epic names are rendered as explicitly styled, embedded GUS hyperlinks and copied as text/html anchors. The old renderer applied italic formatting after generating HTML, which could corrupt the underscores inside ADM_Epic__c URLs. The new formatter tokenizes approved epic links and expected mentions before styling text, so emphasis cannot touch a URL. Plain-text clipboard fallback contains readable names plus full GUS URLs. User-provided content stays escaped; unsupported URLs never become generated anchors.

Validation: 166 Node tests pass, including exact URL/label preservation, field-name underscores, text escaping and fallback links. Isolated browser checks exercise interleaved grouping/filter Escape undo, Clear, one double-Escape refresh, and inspect the actual copied HTML anchors and plain text. Actual native Slack paste/mention conversion and production browser behavior remain unverified. No Slack messages or production GUS comments were written.


## 2.0.0-GA — grouped review and Slack follow-ups

- Multi-select Group by supports Measure (GUS Project), Team, Health/Epic Status, Development Lead and completion bands (0%, 1–24%, 25–49%, 50–74%, 75–99%, 100%, not reported). Multiple choices create nested groups in menu order. Group counts reflect current filters; each group collapses independently. Existing sorting and monthly editing remain available. Grouping is a session display choice and makes no GUS or AI requests.
- Epic expand/collapse controls now appear at the far left. Expand All also reveals collapsed groups.
- Toolbar Slack Nudge prepares follow-ups across all saved epics in selected releases, including uncached epics, with a 500-epic review limit. Missing-month-only is selected initially; uncheck for all assigned epics. Each current Development Lead receives one combined template with every in-scope epic reference. A Lead group action uses exactly that group’s filtered members. Per-epic Slack Nudge remains in the sidebar.
- Follow-up preparation reads current assignments and comments from GUS, honors saved year mappings, separates different lead identities even when names match, and refuses mixed assignments, missing records or oversized Slack text rather than dropping references. No messages are sent by preparation.
- Reminder preview uses Slack mrkdwn: verified user-ID mention, epic links, bold emphasis and progress/risk/next-step prompts. Copy supports rich HTML and plain-text fallback. Copy & open DM includes the resolved workspace ID and user ID, and binds recipient identity across asynchronous clipboard access. No invalid DM link is offered if workspace resolution fails.
- Slack’s documented deep links cannot prefill a composer. The user pastes the copied reminder into the DM, confirms the native @mention and sends. Native mention conversion on paste, production Slack identity, actual DM navigation and production model behavior were not verified. No Slack test messages or production epic edits were performed.

Validation: 163 Node tests and isolated browser checks for grouping, exact group scopes, bulk references, clipboard recipient-change protection, workspace-qualified link generation (mock identity), mobile fit, compact rows/edit/save and monthly AI save. Deployment source must match the reviewed ZIP before promotion.


## 2.0.0-GA — monthly missing-update filter

The review-month updates tile and its footer action now filter the table to fetched epics without a saved draft or parsed GUS update for the selected month. A removable Awaiting month update chip explains the filter; Clear or Escape restores all rows. Changing the review month updates the missing-update filter. Counts and matching use the same saved-draft precedence. Isolated browser checks verify tile/link activation, one missing epic from six fixtures, clearing and Escape. No GUS or AI request is needed to filter.

## 2.0.0-GA — consolidated update, 9 November 2026

- Added source-evidence checks for AI completion, release, production and risk-closure claims. Unsupported model claims use a clearly labeled source fallback; goals and descriptions do not establish achievement. These are conservative heuristic checks, not a semantic guarantee.
- Monthly GUS writes now order updates from oldest to newest, preserving other months, undated notes and supported rich links; unsafe markup ordering fails without publishing.
- Added one Expand All/Collapse All control before fullscreen, applying to visible rows.
- Whole metric tiles filter the epic table by click or keyboard. All footer notes are centered; the version is plain and GOLDEN BUILD is retained only in Git/release metadata.
- Added Slack Nudge in the epic sidebar. It reads the current Development Lead from GUS, prepares a review-month reminder and optionally resolves the lead by GUS email through the host Slack identity helper. Copy/Open Slack requires the user to send the message. The documented host helper cannot send arbitrary direct messages; missing identity capability is shown honestly. No automated reminders or test Slack messages were sent.

Validation: 156 Node tests, deployment unit checks, and isolated browser checks for controls, Fetch/reload and monthly AI save. The Slack browser check uses a mock identity response; production Slack lookup and native LLM quality were not verified. Production epic comments were not edited during testing.


# 2.0.0-GA · GOLDEN BUILD — monthly comment headings

Fixed Fetch display for engineer headings such as November comments - and September comments -. Also recognizes comments/notes/reports variants, preserves older undated notes separately, and keeps source wording intact. No AI regeneration or GUS field rewrite is required to display fetched comments.

---

# 2.0.0-GA · GOLDEN BUILD — release-selection guidance

When releases are available and none is selected, a brief animated arrow highlights the selector. It settles to static guidance after four seconds and disappears on selection. Reduced-motion support, full mobile labels and no extra GUS/AI calls are verified. Folded into the current GA golden baseline at the user’s request.

---

# 2.0.0-GA · GOLDEN BUILD — consolidated update

At the user’s explicit request, all recent changes are folded into the canonical GA release:

- Reported AI token notifications for executive, consolidated and monthly summaries.
- Generate actions first, Copy last.
- Release Intelligence as parent heading; Core Foundation Services / Release Review below.
- Centered expand/add icons and right-aligned dropdown labels/chevrons.

The earlier canonical GA source and exact archive are preserved as GOLDEN-BUILD-2.0.0-GA-original and releases/2.0.0-GA-original/. The refreshed canonical GA tags identify this consolidated baseline. Shared GUS data is preserved.

---

# 2.0.3 — Product heading and CFS context

Release Intelligence is the parent header. Core Foundation Services / Release Review appears below; Foundation replaces Foundational in current wording. Desktop, mobile and tablet visibility checked. Golden rollback baseline remains 2.0.0-GA.

---

# 2.0.2 — Executive action order

Generate summary → Generate V2MOM Method Summary → Copy leadership update. Actual DOM order also provides the matching keyboard sequence. Desktop/mobile layout verified; business logic is unchanged. Golden rollback baseline remains 2.0.0-GA.

---

# 2.0.1 — AI usage notifications

Executive, consolidated V2MOM and explicit monthly-summary generation now show operation-level reported token usage in a top-right five-second/× notification. Counts include input, output, cached prompt tokens and automatic correction calls. Missing counts are labeled unavailable; no token estimates or costs are invented. Read-only views and polling do not generate these notices.

The immutable GOLDEN-BUILD-2.0.0-GA baseline and its recovery archive remain unchanged.

---

# 2.0.0-GA · GOLDEN BUILD

Release Intelligence is the user-designated stable rollback baseline. It replaces the older Pages dashboard with a release entry point linked to the authenticated GUS Apps application.

This release includes the consolidated V2MOM summary fixes, consistent evidence validation for measure identifiers and epic goals, method-specific AI instructions, per-team results with explicitly labeled source fallback, and the naming cleanup. Earlier working monthly updates, shared saves, compact views and shortcuts are retained.

Validation: 135 Node tests and isolated browser method, monthly AI and Escape checks passed. Production AI output was not independently verified. Detailed limitations remain in `docs/verification.md`.

Use the exact archive and SHA-256 in `releases/2.0.0-GA/`. Rollback steps are in `docs/GOLDEN_BUILD.md`. Tags `v2.0.0-GA` and `GOLDEN-BUILD-2.0.0-GA` must remain immutable.
