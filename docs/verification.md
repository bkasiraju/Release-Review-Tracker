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


# Monthly comment headings — current v2.0.0-GA GOLDEN BUILD

Read-only live GUS and shared-journal inspection identified the missed format: November comments - and September comments -. Fetch had stored the engineer text; the prior parser produced no monthly keys. The current source had already been manually relabeled to update headings before inspection. Replaying the earlier journal text with the fix yields November/September month keys without changing the text. No production comments were changed during diagnosis.

Month suffixes now include comments, notes and reports (including decorated/numeric/rich headings). A trailing hyphen without following whitespace is accepted only at end of heading; full dates and ordinary narrative remain notes. Explicit Older/Previous/Earlier/Undated/Original comment sections terminate a dated section and remain undated. Those raw ranges remain outside monthly replacements. Equal-sign dividers are treated as formatting.

142 Node tests pass, including CRLF engineer formats, rich-link preservation, no-op merge, other-month/undated-history preservation, full-date/narrative negatives and Fetch/shared-service parsing without writes. Browser checks verify manual Fetch, correct November/September rendering, persistence across reload, no AI generation and no GUS comment changes; the monthly AI save regression also passes. Independent review ran13 focused parser/comment-view tests and confirmed all27 packaged files match source.

Reviewed/deployed ZIP SHA256:60d03f00beace6be3ec5f94bf95c506c3333c25070ac717f341bebd32e9067a4. Activated through staging/review/promotion; all21 deployed text files match source. Canonical GA includes this fix. Production browser/model behavior remains unverified; source diagnosis was confirmed with actual read-only GUS/journal evidence.

---

# Release-selection guidance — current v2.0.0-GA GOLDEN BUILD

For a loaded dashboard with available releases and no selected release, the release picker shows an arrow and soft highlight. Motion lasts four seconds then becomes static; reduced-motion preference suppresses motion. The cue is removed when a release is chosen, remains absent during initial loading and when no releases exist, and makes no extra GUS/AI calls. The overlay survives MultiSelect label rebuilds and does not intercept pointer events.

All138 Node checks and browser release-cue/Escape regressions pass. Cue checks verify menu updates, selection/removal, full text at320–1440px, reduced motion and no source fetch. Independent review confirmed all27 artifact files match source. Reviewed/deployed ZIP SHA256:eeb3c53292ec122c70b12c9ab8335761128242361a2ce6ce06cd60dee9fcd022; all21 deployed text files match reviewed source. This latest update is folded into canonical GA per explicit user request. Production model behavior is unchanged and not newly verified.

---

# Consolidated current GOLDEN BUILD — v2.0.0-GA

The user explicitly requested folding every latest change into v2.0.0-GA and making that new consolidated release the GOLDEN BUILD going forward. This supersedes the earlier tag immutability instruction for this one consolidation. The preceding GA commit/archive are preserved under GOLDEN-BUILD-2.0.0-GA-original and releases/2.0.0-GA-original; canonical GA tags and recovery metadata now identify the consolidated build. No shared GUS data was changed by consolidation.

Includes AI token notifications, executive action order, product/context heading swap, Core Foundation Services wording, method-summary fixes and all earlier functionality. Expand/collapse and release-add icons use centered SVG geometry; dropdown trigger labels are right-aligned with separate fixed chevrons. Accessible control labels and selection behavior remain. Asset query identifiers distinguish the consolidated build from the earlier same-version release.

All138 Node tests pass. Targeted browser checks verify icon centers, expand/collapse, right-aligned labels/carets, multiple-owner selection and no mobile/tablet overflow. Compact epic, AI usage and method-summary browser regressions pass. Independent review ran nine controls tests, confirmed all27 ZIP files match source and verified the original archive checksum. Production model output was not re-verified; inherited platform limitations remain.

Current GOLDEN BUILD ZIP SHA256: ebc3fc2b478e0bfda4efc0e30bd29b8a5528f0bead9354295b718f70799cdf77. Activated through staging/review/promotion; all21 deployed text files match source. Original historical archive SHA256:96ff7a49e2707682511017abbda6dabda6ef1e8370649061a63300415020b5fc.

---

# Parent product heading and CFS context — v2.0.3

Release Intelligence and its subtitle now occupy the parent top bar. Core Foundation Services / Release Review appears in the lower context section, with Foundation replacing Foundational in current app/Pages wording. One h1 remains; existing controls and behavior are unchanged.

Targeted browser checks at 320,390,620,700,760,1000,1440 and1920px verify visible separator and Release Review text, exact wording, no duplicate title, no clipping and no page overflow. The explicit child-display override fixes an inherited tablet rule that hid breadcrumb children. No full Node rerun for this markup/CSS/version-only update; prior138 checks are retained.

Reviewed ZIP SHA256: 6e2c23769d62e5cb6a71a9af5776f14b4eb2d743d6cefc7e930497f5e5d5d5d1. Activated through staging/review/promotion; all21 deployed text files match source. The golden2.0.0-GA archive and tags are unchanged.

---

# Executive action order — v2.0.2

The header actions now appear in DOM/keyboard order: Generate summary, Generate V2MOM Method Summary, Copy leadership update. A targeted browser check confirms left-to-right order at 1440px and no page overflow at 390px. No generation, saving or token-accounting logic changed. The preceding 138 Node tests were not repeated for the markup/version-only change.

Reviewed ZIP SHA256: a86ce0f57d8d66c4eeb3ae153b1a7971417573f47d1eaf7875e69371f4070896. Activated through staging/review/promotion; all 21 deployed text files match source. Golden baseline remains unchanged.

---

# AI token usage notifications — v2.0.1

Explicit monthly, executive-per-epic and consolidated-method generation collect SDK-returned usage for each attempted request. A correction request contributes its own usage. Input totals include Anthropic input_tokens, cache_read_input_tokens and cache_creation_input_tokens; output uses output_tokens. Cached input is shown separately as already included, not added to the displayed total a second time. No prompt-size estimates or cost estimates are used.

Missing/incomplete/invalid counts and thrown SDK calls remain explicitly unreported. Measured zero remains distinguishable from missing metadata. A backend-produced summary without SDK usage is marked unknown rather than presented as measured zero. Per-operation notices use the existing top-right shell, five-second dismissal and ×. Tab navigation and shared polling do not trigger these AI notices. Existing GUS refresh/save notices remain separate and exclude AI usage.

All 138 Node tests pass. Browser checks verify executive batch totals, method totals, correction-call totals, unavailable usage, top-right placement, five-second/× dismissal, no view-triggered notices, mobile fit and no GUS writes. Method and monthly AI regression checks pass. Independent review ran 18 AI tests and verified the 27-file artifact. Test usage is controlled; actual production model usage was not observed. The cache schema follows the inspected official GUS Apps SDK's raw Anthropic usage response.

Reviewed ZIP SHA256: df4fdec17463979e68f2f334e8e8d986f8192855eab064e12e56c84ffbe4fed5. Activated through staging/review/promotion; all 21 deployed text files match reviewed source. The GOLDEN-BUILD-2.0.0-GA tag, source baseline, archive and checksum remain unchanged.

---

# Release Intelligence — 2.0.0-GA · GOLDEN BUILD

The user designated 2.0.0-GA as the stable rollback baseline and requested the existing bkasiraju/Release-Review-Tracker repository/Pages destination. The tool is named Release Intelligence; redundant CFS Release Review heading/breadcrumb wording is removed. Golden build identity is visible in the footer.

A reproduced consolidation mismatch is fixed: model context included V2MOM identifiers and numeric goals in epic titles while numeric validation considered summary prose alone. Validation now considers the same measure/team/title/summary evidence supplied to the model, with explicit instructions distinguishing goals from achievements. Method calls use the SDK's supported systemPromptOverride to avoid conflicting length/style instructions. Unknown numeric claims remain invalid; one correction attempt remains bounded by the shared deadline. These are lexical checks, not semantic proof.

Measure/team outcomes complete independently. Valid AI consolidations remain visible; a failed group's existing source summaries remain accessible and are explicitly labeled as not consolidated AI. Copy retains that label. No unsupported text is relabeled AI, no empty global result hides other teams, and no summary-generation action writes GUS comments.

All 135 Node tests pass. Browser method, monthly AI and Escape checks pass, including GA naming/badge, correction/date handling, visible labeled fallbacks, scope binding, copy, monthly save/reload and no unintended GUS writes. Independent review ran 15 AI tests and confirmed all 27 packaged files match source. Production browser/model output was not verified because the connector remains unavailable. Central GUS Apps live list-view metadata limitations remain.

Golden archive SHA256: 96ff7a49e2707682511017abbda6dabda6ef1e8370649061a63300415020b5fc. Activated through staging/review/promotion; all 21 deployed text files match reviewed source. The exact immutable archive, checksum, build manifest and rollback instructions are stored under releases/2.0.0-GA and docs/GOLDEN_BUILD.md. Git tags are v2.0.0-GA and GOLDEN-BUILD-2.0.0-GA.

---

# Consolidated method generation recovery — v1.16.1

The v1.16.0 method branch rejected any paragraph beyond 300 characters/45 words and compared numeric date labels against summary prose while omitting reporting-period metadata from validation. These paths were reproduced with controlled responses; the original production response was not available for inspection. The method agent prompt and validation now agree on a target of 45–65 words/500 characters and a hard complete-paragraph bound of 650 characters/90 words. Cosmetic bold, labels and JSON summary wrappers are normalized without shortening sentences. Only exact known reporting-period date labels are exempted from numeric-metric checking, not bare years or unsupported numeric claims.

A rejected method response receives at most one correction request using the original evidence and the failed criteria. Both SDK calls share the existing 60-second deadline. The second response must independently pass validation; invalid output, empty text and placeholders remain failures. No truncated summary is labeled successful and no comments are written to GUS. Existing all-groups completion and current release/month binding remain.

All 134 Node tests pass. Browser checks verify per-team automatic correction, complete paragraphs beyond the former 300-character limit, known reporting dates, loading/copy/scope behavior, safe final failures, no GUS mutations and the unchanged monthly AI draft/save/reload workflow. Independent review ran 14 focused AI tests and verified all 27 packaged files match source. Guards are structural and lexical, not proof of factual grounding or semantic coverage; review before sharing remains necessary.

Reviewed ZIP SHA256: b767199f92689801825e6f595a7f485ce47ca88d44e19dc8c6ef085fe303eb2b. Activated through staging/review/promotion; all 21 deployed text files match reviewed source. The browser connector returned browser.user is unavailable, so no actual production model response or hosted-browser behavior was verified.

---

# Consolidated V2MOM method updates — v1.16.0

After all epic summaries are generated, Generate V2MOM Method Summary consolidates every generated epic summary within its measure/team using the existing GUS Apps AI SDK agent. Each request includes epic names, full summary text, reporting months and undated-context flags. Inputs over 40,000 serialized characters fail rather than dropping epics. Outputs must pass existing third-person/numeric guardrails and strict 300-character/45-word limits without shortening. This is not semantic proof that every source is covered; leadership review remains necessary.

The result is shown in a compact section above existing per-epic summaries, with Copy method update. Generation uses the bounded background queue and progress animation. The complete set is displayed only after every group succeeds. Errors, AI unavailability or invalid output show a retry note without a partial result. Scope changes hide older results; regenerating epic summaries invalidates the roll-up. Generation and copying perform no GUS writes. Results remain in the current browser session, matching existing epic-summary behavior.

All 130 Node tests pass. Browser method checks verify six unique epics reach team-scoped SDK synthesis, loading state, preservation of existing epic summaries, copying, month-scope invalidation, failure/unavailability behavior and no GUS mutations. Existing shared-feature browser checks also pass after updating their setup to expand the current compact landing table. Independent review verified all 27 ZIP files match source and independently ran ten AI tests, including rejection of oversized single-sentence output.

Reviewed ZIP SHA256: f04cbc34cf6d44f23e53cecaa3ab70d901ce182aa02670ba68fdf7e0a0e37272. Activated through staging/review/promotion; all 21 deployed text files match reviewed source. SDK browser tests use mocks; actual production model output and hosted-browser behavior were not verified. Existing central host live list-view metadata limitations remain.

---

# Executive monthly synthesis, compact previews, Escape shortcuts — v1.15.0

Single Escape outside an open menu, preview or editor removes the most recently applied active filter. Later single presses remove remaining filters in reverse order. A 400ms gesture window distinguishes rapid double Escape: it cancels the single-filter operation, clears filters/expanded rows and invokes the existing manual refresh for selected releases. Open menus and previews close first; editors retain their unsaved-change protection. Holding Escape does not repeatedly trigger actions.

Monthly AI drafts now use a structured current executive paragraph and separate Previous months context. Dated GUS work status transitions and closure dates prioritize carried-over work and avoid attributing later status to historical months. Read-only GUS history confirmed November transitions for W-24791042. All selected evidence reaches the model within the explicit budget; evidence-key references are structural validation, not proof of semantic coverage. Human review remains necessary. The source fallback uses a limited concise subject/status synthesis; no production AI result or epic comment write was performed during verification.

Epic hover previews show compact distinct colored month tiles, preserving full source comments and Path to Green. Tooltip keyboard association and outside-scroll dismissal are improved.

All 127 Node tests pass. Isolated browser checks pass for reverse filter order, edited-search precedence, menu/preview priority, exactly one manual refresh on double Escape, metric removal, distinct compact month tiles, mobile fit, monthly SDK draft adoption/save/reload and compact epic interactions. Independent review confirmed all 27 ZIP files match source and independently ran 18 focused tests.

Reviewed ZIP SHA256: 2daacad709aac498dd93cd45a26c713e50f67598a58176eb2fb8c8ff55f9640c. Activated through staging/review/promotion; all 21 deployed text files match reviewed source. Production hosted-browser/model behavior was not verified. Central host live list-view metadata limitations remain.

---

# Month-scoped work evidence for AI Summary — v1.14.0

A read-only GUS query of epic a3QEE000002ehUv2AI found W-24791042, [Core] VegaCache prism skills for batch 2 scenarios, Ready for Review, sprint2026.11a with Nov1–15 dates and a Nov5 creation timestamp. Previous code fetched work but did not prioritize sprint month, and health-first fallback shortening could omit work evidence.

Monthly summary evidence now prioritizes sprint overlap, then structured sprint-name month when dates are absent, then created/modified-in-month activity when sprint scope cannot be established. Historical work is not excluded merely because later edits changed LastModifiedDate. Future-created items are excluded. Sprint dates describe planned scope; current status snapshots still cannot prove a transition in that month. Other known sprint months are historical context; unscoped work is explicitly timing-unverified context.

Exact serialized evidence budgeting drops optional descriptions if necessary and rejects oversized subject/status sets instead of silently omitting records. Every selected-month subject and status is included intact, with sprint and basis, in deliveryEvidence and an expandable draft evidence panel. Primary work comes before health comments in source fallback. The prompt directs the GUS Apps SDK to cover primary delivery capability/status, with Ready for Review treated as review readiness. A lexical coverage check after shortening rejects a model paragraph that entirely omits meaningful primary-subject terms, retaining a source-based draft instead. This is not semantic grounding verification and may reject abstract wording. Existing compact content budgets, explicit Save and month-preserving write paths remain.

120 Node checks pass, including overlapping/cross-month sprints, November work modified in December, older/future sprint context, calendar-end exclusion, full subject/status evidence and model omission fallback. The native SDK browser mock checks primary November subject/status in the prompt and evidence panel, short draft adoption, Undo/regeneration, explicit fixture save and reload. Compact epic UI browser checks pass. The actual work-item record was replayed read-only through the selector and matched November; no production comment was written.

Reviewed ZIP SHA256: 1d32fd848000a19262a4f958fe6f57ca0a72f73f43008c30107f1874d6690842 (27 files). Activated through staging/review/promotion; all21 deployed text files match reviewed source. Independent reviewer ran eight monthly tests. Hosted-browser verification was unavailable because the browser connector returned browser.user is unavailable; no production AI result or production comment write is claimed.

---

# Compact landing header — v1.13.1

The release-intelligence label, title and subtitle use one naturally wrapping flex row at wide widths; the minimum 70px heading height is removed. The dashboard navigation/actions sit directly below with reduced vertical padding and margins. Every original text label and action is retained. Narrow screens wrap text and controls rather than clipping or hiding them. No backend or application logic changed apart from version strings.

An isolated browser geometry check at 320,390,760,1000,1280,1440 and1920px verifies visible labels/actions with scrollWidth within clientWidth and no page overflow. Wide-screen heading height is at most35px. The compact epic interaction browser suite passes. The unchanged Node/data logic retains the prior116 passing checks; tests were not redundantly repeated for this CSS-only update.

Reviewed ZIP SHA256: 4522e2a773c37c7aea7c910e5a5ce04cf9b16cc805a2151490f88899dda9b342 (27 files). Activated through staging/review/promotion; all21 deployed text files match reviewed source. Header geometry is verified in isolated browsers; this release was not rechecked in the hosted browser.

---

# Compact epic landing view and general update context — v1.13.0

The landing table shows compact Epic Name, Health and Development Lead rows, with sortable headers. Each +/− button opens/closes the original GUS-column/monthly table below its epic. Column choices apply to expanded tables. Full updates expands visible rows and removes the text clamp. Expansions are client view state, default collapsed on page reload. The CR navigation placeholder is removed.

Row hover or keyboard focus opens a read-only, hoverable popup after 450ms, showing the review month plus recent monthly comments and Path to Green from existing shared data. No GUS/model call occurs on this hover. Escape/× closes the popup without reopening it on the row revealed beneath; pointer/touch/keyboard entries and dismissal are handled separately. Touch users expand a row for the same data. Shared polling pauses while the popup is active. Monthly work-item/AI detail interactions remain in the expanded table.

Owner/health triggers show short selection counts. Existing full-name removable filter chips wrap below the toolbar instead of clipping the selected name. Metric details use On Track or Completed and Watch, Blocked, or At Risk.

A leading generic preamble appears before current-review-month content with a General update · Undated label, including the hover popup and monthly editor's read-only context. It never becomes the dated editor value, inferred monthly source, coverage count or an automatic GUS write. Historical dated comments remain separate. Completely unrecognized month histories still use the v1.12.1 display-only fallback in every visible month.

116 Node checks pass. The compact-row browser test covers default row heights, no-request hover, keyboard dismissal, expandable month table, an actual fixture save/publish/readback, sort, Full updates, phone scrolling, six owner chips and no CR badge. It also checks generic+dated display, generic-only current month, a blank dated editor, and preserved source text. Work-item metadata and hourly notification regressions pass. Production v1.12.1 parser/fallback was observed in a signed-in browser; native production AI was not exercised.

Central metadata investigation: official GUS MIYO guide links to #gus-miyo. Official channel messages identify gusprodops-emu/gus-apps-hub as platform repository. Current CLI access returns404, so connector source cannot be changed here. Current app administration exposes Transfer Ownership and Sharing, not a list-view REST toggle. Published /api/applet-skill documents query/CRUD/batch/Chatter methods and no generic request/list-view describe. Automatic future metadata detection remains a platform change, not an applet sharing fix. No message was sent and no permission setting changed. Support link: https://salesforce.enterprise.slack.com/archives/C0AKLTZVDMZ . Repository reference: https://salesforce.enterprise.slack.com/archives/C0AKLTZVDMZ/p1777584653999199 .

Reviewed ZIP SHA256: 4b46c78bca49af2842288899d4b5e7f4809236548de7075d4f28fe3bfc9b68da (27 files). Activated through staging/review/promotion; all 21 deployed text files match reviewed source. Signed-in production browser verification confirms v1.13.0, connected GUS state, compact rows, removal of CR, status capitalization, affected epic expansion, generic November preamble, October original wording and September text. The live popup screenshot shows all three month sections and Path to Green. Verification changed only local release selection/search/expansion, not GUS comments. Native production AI was not tested. Static review retains minor tooltip screen-reader announcement and scroll-dismissal caveats.

---

# Critical generalized month parsing and display fallback — v1.12.1

A read-only query of affected epic a3QEE000002e3Fl2AI reproduced headings like [Oct Update] followed immediately by body text, which the former parser missed. Heading recognition now handles bracket/Markdown decoration, month names/abbreviations, explicit numeric month-year/year-month, inline bodies and rich-text headings. Conservative heading boundaries keep narrative mentions and complete calendar dates out of month parsing. Undated introductory text remains preserved. Generalized heading styles do not require an LLM or normalize/write engineer comments.

When there are zero recognized source months, a display-only fallback shows the complete plain-text source comments in each visible month with an explicit Month not identified label. It never creates dated backend entries, counts as a dated update or automatically writes GUS. Explicit cleared drafts/jobs take precedence. Opening the fallback shows the original undated notes; Add dated update opens a blank monthly editor with the correct empty baseline.

115 Node checks pass. Independent focused review ran nine parser/formatting checks. An isolated browser using the affected epic's exact comment string verifies October/September text displays and source strings remain identical; a second fixture verifies three fallback cells and a blank dated editor. No production comments were modified. The focused artifact was built from deployed v1.12.0, keeping the in-progress compact landing UI out of the hotfix.

Reviewed ZIP SHA256: 39dc958372ef3e595e9fba19aedfaba86d650649d47c7ab1b02f7f167ac9d847 (27 files). Activated through staging/review/promotion; all 21 deployed text files match isolated reviewed source.

---

# GUS source columns and movable optional layout — v1.12.0

Linked releases use source column keys, labels and order, with Epic Health Comments expanded into monthly columns. Only Epic Name and Health are required and their own move buttons are disabled; optional columns can move across them or be hidden. Individual-record releases default to Project, Epic Name, Status (epic health), Development Lead, months and Path to Green. Linked lists retain their actual GUS labels/order instead of renaming Health or imposing the manual default sequence. The current MAPS list was read via authenticated Salesforce describe on 9 Nov 2026 and verified to have 14 visible columns, beginning Project/Epic Name/Development Lead/Priority/Health.

New linked releases receive source columns. Legacy existing linked layouts render source order and migrate persisted layout on actual Fetch. Custom preferences persist while source metadata is unchanged; source column additions, removal, labels or ordering changes reset the layout to source order on an actual hourly/manual Fetch. Use GUS order restores following mode. Monthly visibility preferences and health-comment text remain intact. Project is an explicit supported cell; table sticky-first-column assumptions no longer pin an arbitrary Project column. columnMode is schema-validated and journal conflict-protected.

Important deployment limitation: the centrally hosted GUS Apps connection still lacks live list-view REST/describe capability in prior production diagnostics. Its verified-definition fallback is labeled in the table and documentation. This release refreshes the packaged MAPS definition, but cannot automatically detect future GUS definition changes through that restricted host. The live-capable path is implemented/tested; full automatic production metadata sync remains dependent on the platform exposing the supported capability. No credentials were added and no unsupported host endpoint is assumed.

112 Node checks pass, including source defaults, existing-layout migration, retained custom choices, reset on changed definition, and no epic comment writes. An isolated browser test verifies new/existing list mapping, source order/add/remove changes, shared reload, optional move/hide and GUS-order reset. Work-item metadata, month visibility, monthly AI save and hourly-notification browser regressions pass. Source layouts without Health Comments can still enable month columns through Columns or Add month; both paths explicitly enable the monthly group and are browser-checked. Production list metadata was read only; no production epic records were modified.

Reviewed ZIP SHA256: 6bdc7dbd058f37b8ab911f0ebdc47e6306577e290ee2149ce8262f63e528ca5c (27 files). Activated through staging/review/promotion; all 21 deployed text files match reviewed source. Hosted browser verification was not performed. Automatic future column-definition sync remains subject to the host capability limitation described above.

---

# Add releases beyond five saved lists — v1.11.4

The old five-release storage cap disabled both + and Add new release once the shared catalog reached five. That cap is removed from frontend and backend. All saved release lists stay in the searchable dropdown and manager, and existing lists are not replaced or deleted. The release selector now explicitly limits the active view to five releases, with an explanatory note, bounded Select all and unselected options disabled only while five are selected. Clear all and deselection unlock other options. Health/owner/status filters remain unrestricted. Backend revision checks, per-release epic bounds and verified-list metadata requirements are unchanged.

111 Node checks pass. Capacity tests verify seven stored releases, edits and alias year separation while preserving GUS records. The release-setup browser suite adds a sixth release through + and a seventh through Lists, verifies prefetch and a second session reading all seven, then verifies five-selection limit, Clear all and selecting the seventh release. All tests use isolated data; production release lists were not modified by verification.

Shared-feature and UX browser regressions pass. Reviewed ZIP SHA256: 1ec57e7677a2b398c4edfec2a5c20a6020e3218d44429aeb43a7bd2f2d501542 (27 files). Activated through staging/review/promotion; all 21 deployed text files match reviewed source. Hosted browser verification was not performed.

---

# Single dashboard Refresh control — v1.11.3

Removed the duplicate connection-check icon next to Connected to GUS. The labeled Refresh button beside the release controls remains the dashboard refresh entry point; live fetch timing and five-second usage notifications are unchanged. Sources & connection offers a recovery-only Reconnect to GUS action when the connection is unavailable, using the existing connection flow. It disappears after recovery. No backend write or cache behavior changed.

Isolated browser checks cover single refresh control, preserved GUS comments, separate publish confirmation, failed initial connection and successful recovery. The theme check now expects the current overview metric filtering behavior (overview remains visible); this was an outdated assertion, not an app change.

Theme, hourly notification schedule and 111 Node checks pass. Reviewed ZIP SHA256: aea77ea6f01f74a1370f8a24dfa64d47e1ae59dff32395a8baa9ca2759fdac04 (27 files). Activated through staging/review/promotion; all 21 deployed text files match reviewed source. Hosted browser verification was not performed.

---

# Readable work-item metadata — v1.11.2

The epic work-item sidebar expands to a viewport-bounded 1120px. Status, owner and sprint tracks use bounded content-length sizing shared by all rows and headers, based on all loaded items to keep sorting/filtering stable. Long metadata wraps instead of being clipped. Titles remain compact with full text available through row expansion. Narrow viewports use a focusable horizontal scroll region with a scroll hint, preserving all six sortable headers in one row. No backend data or sync behavior changes.

An isolated browser fixture with a long Closed - No Fix - Working as Designed status and Yashasvi Chennawar owner verifies full metadata, aligned headers, expansion and sorting at desktop and phone widths. Existing shared-feature browser checks pass. Production work items were not modified.

111 Node checks pass. Reviewed ZIP SHA256: 05e3be596041cdb54964b6459e62348828566d78748912c0f06d56c1cc4b060b (27 files). Activated through staging/review/promotion; all 21 deployed text files match reviewed source. Hosted browser verification was not performed.

---

# Notify only for live sync activity — v1.11.1

The usage note previously appeared after every one-minute shared-state reread, even when the one-hour freshness guard skipped all live GUS list/epic fetching. Notifications are now gated by an operation-level realSync marker. Cached loads, minute polling, focus/visibility rereads and server cache-hit responses remain silent and do not reset an existing note timer.

Manual refresh attempts mark live activity explicitly; automatic refresh marks it only after the backend confirms it is not a cache hit. Monthly save/publish and bulk publication also mark actual user-initiated write activity. A multi-release sweep shares one marker and reports once. Five-second automatic dismissal and × dismissal are unchanged.

Live-fetch scheduling is unchanged: browser and backend use the shared one-hour freshness guard, while a manual Refresh bypasses the cache. Read-only shared-state checks still occur every minute to render other users’ saved updates without another live epic fetch.

111 Node checks pass. A simulated-clock browser test proves fresh initial loads and multiple minute checks issue no live fetch or token note; after expiry an actual automatic fetch reports once; the next minute stays silent; manual refresh inside the hour still fetches and reports; a client-stale/server-fresh cache race issues no false note or live page requests. Existing manual refresh/save/failure usage checks and two-user shared refresh checks pass. Preview, missing-state, compact-metric and UI preference browser suites are also checked against isolated data. No production health-comment writes are used for verification.

Reviewed ZIP SHA256: 15cb9a7876032b00c452a8c0632c8ceeca1fbd53220cbde98e6b9e573e507373 (27 files). Activated through staging/review/promotion; all 21 deployed text files match reviewed source. Hosted browser verification was not performed.

---

# Formatted comments, read-only AI previews and compact metrics — v1.11.0

Engineer updates receive presentation-only paragraphs, spacing, existing-label emphasis and preserved bullet styling. Escaped blank-line separators are displayed as paragraph spacing. A small local comments-view.js helper escapes all text; source strings, editor values and saved GUS comments are not rewritten by formatting.

Deliberate mouse hover or keyboard focus (800ms dwell) opens a separate read-only summary using the displayed monthly text, live epic health/path-to-green, goals and eligible work-item delivery evidence through the existing GUS Apps AI SDK flow. A Preview button supports click/touch and focuses the close control. Popup content is hoverable, dismissible by ×/Escape/outside click, and does not replace the editor or issue save/publish calls. Background shared refresh waits while a preview is open. Previews retain snapshot-timing caveats and clearly label source-based fallback if AI is unavailable.

At most one hover generation runs at a time. Up to 40 recent source-specific model results are cached for up to one hour (source-only fallback for one minute); quick pass-over hovers and touch pointer-over events do not generate. Cached results invalidate with displayed text, health/modified/fetch metadata or release-year mapping/identity/AI-availability changes. Dismissed responses cannot reopen old UI. The model wait is outside the epic write queue; an in-flight preview cannot block an explicit monthly save. Generating a preview may consume AI tokens; existing sync-only metrics explicitly exclude AI summaries.

Empty month cells now use one small Missing Update indicator plus an AI Summary pill instead of large repeated Add monthly update boxes and long AI labels. Missing opens manual entry, AI opens the existing draft editor and requires explicit Save. Existing updates show small Preview/AI actions on pointer hover or keyboard focus, with visible actions on touch layouts. Saved-cleared or failed drafts keep distinct status labels.

111 Node checks pass, including safe formatting/wording preservation, preview evidence and zero backend writes. Browser tests verify raw editor text and saved source remain identical after formatting/hover, SDK evidence includes health/work context, delayed activation, caching, hoverable popup, keyboard/touch entry, dismissal, and no automatic saves. A blocked AI response test proves an explicit monthly save still finishes. Missing-state tests cover all 18 empty cells, compact geometry, manual entry and deliberate AI draft generation without writes. Existing monthly AI save, full-update, month selection, shared refresh and sync-metric suites pass. Metric tiles are substantially smaller, with duplicate context tags removed from their visible body while actual counts, percentages and drill-down actions stay intact. Release metrics and Health & delivery are independently collapsible native details groups, both expanded on page load. Browser checks bound desktop card height at 155px and the complete expanded overview at 350px for the fixture, verify all counts/ratios, independent keyboard toggling, retention across data renders, default-open reload and phone widths.

A client-side SDK timeout race also ensures an SDK that ignores AbortSignal cannot hold subsequent previews indefinitely. Underlying already-started model work may still continue if the provider ignores cancellation.

SDK model responses are mocked in isolated browser tests; no production model-quality or host-browser benchmark is claimed.

Reviewed ZIP SHA256: 40664966b6b4caa429ca331d02bf65d1dc1513a13509b5d9c740d522aa6ef890 (27 files). Activated through staging/review/promotion; all 21 deployed text files match reviewed source.

---

# Three-month default with optional full history — v1.10.0

Without an explicit visible-month selection, the table shows the review month and preceding two calendar months (Nov/Oct/Sep for Nov 2026), honoring previously hidden months. The complete month catalog still includes release settings, saved visibility settings, all parsed epic-comment months and drafts. Columns preferences list every catalog month, including August and future/history months, with default-visible entries checked and older entries available unchecked.

Saving Columns writes an explicit visibleMonths selection to each selected release, preserving existing hide/show semantics including zero visible months. Adding a month extends the selected releases’ visible columns, unhides that month and keeps the current review month unchanged. Older visibility choices persist through Fetch, reload and release edits. No data, health comments, sidebar history or summary evidence are removed. New derived months remain available in preferences; an explicit saved selection governs the table until edited.

The backend validates/deduplicates visibleMonths and the saved journal validates its schema. Visible and hidden month preference fields now participate in the same journal conflict detection as columns/months.

108 Node tests pass, including calendar year boundaries, legacy hidden months, custom older/all-hidden selections, validation, persistence through release edits and real ContentStore replay. Browser tests include August GUS comments but show only three default headers; they enable August, reload four columns, hide/show all, then add August while retaining November as review month. Source comments remain unchanged. Full-update and shared-refresh regression checks also run against isolated data.

Reviewed ZIP SHA256: 412bdbc9574d23130bab12da818ecff3e788dcff4616740ffc14db510088acdc (26 files). Activated through staging/review/promotion; all 20 deployed text files match reviewed source.

---

# Consistent controls, sorting and readable selections — v1.9.9

Release, review-month, Lists and Refresh controls share a 36px outer height, 1px border and 7px radius. Release and month widths stay fixed while scripts, fonts and data load. Native multiple selects are hidden in the HTML/CSS before JavaScript; matching placeholders render immediately, custom dropdowns are disabled until shared state loads, and the empty table says Loading rather than falsely prompting first-release setup. The review display reads Review Month: Nov 2026 (derived from the selected month), with the existing native month input overlaid for selection and a visible focus ring.

The footer centers the Hub and Sources links, removes repeated decorative icons and backend/reference-year labels, and places Last updated at the far right. On phones it wraps into a compact two-row layout.

The view is named Executive V2MOM Summary in tabs, rail, panel and heading. Epic Name, Health and Development Lead headers support natural, case-insensitive ascending/descending sorting with aria-sort and missing values last. Known team names display MAPS, VC, MQ and VS, retaining full names on hover and in source data/search. Undated notes replaces Original notes with a compact, readable chip opening preserved comments locally.

Selected release names occupy a full wrapping chip row rather than clipped dropdown children. Individual × buttons unselect scopes without deleting releases. Applied health, owner, search, insight and metric criteria appear in readable removable chips. Group-health removal also clears its underlying health selection. Clear includes all filter types, has a subtle red border/background, and pulses three times for 3.6 seconds, with reduced-motion support. Narrow layouts wrap instead of squeezing controls or names.

106 Node checks pass, including natural/missing-last epic sorting and team abbreviation. A dedicated browser check pauses app.js and then the connection request, verifying pre-script and data-loading geometry and no listbox distortion. It verifies the renamed view, month format, sorting directions, full team tooltips/undated notes, readable filter removal, group-filter removal, all five full release names, unselection and mobile bounds. Existing shared refresh, release setup, controls (including 320/390px menus), full-update, icon, monthly AI save, month visibility and sync-metrics browser checks pass. Screenshots of loading, filters and five-release selection were inspected. Backend logic and GUS data are unchanged; no production health-comment writes were performed.

Reviewed ZIP SHA256: 12818df79d3d001c2ffc5a7f70c5147b46ea7bd4a43f13a496d45ce4c8788475 (26 files). Activated through staging/review/promotion; all 20 deployed text files match reviewed source.

---

# Lightweight dimensional icons — v1.9.8

Inspected the supplied Core 3PP app’s source and matched its small 3D WebP illustration style. Four corresponding local assets (open-source, deviation, sla and automation) were copied from the adjacent 3pp-Core-CARE-Initiative project; together they total 13,184 bytes. They are bundled locally and reused by URL, with explicit dimensions and asynchronous decoding. No remote CDN, 3D engine, canvas renderer, model call or extra GUS call is introduced.

A small deferred icons.js helper supplies illustrations and colored beveled inline SVG badges for cards, navigation, buttons, epic links, work-item links, AI actions and month pencils. All diagonal-arrow glyphs are removed from app markup; link actions retain their original hrefs and accessible labels. Functional sort-direction and date-range indicators remain. Icons are decorative (aria-hidden) next to retained text labels. Introductory motion is globally limited to four seconds so data re-renders cannot restart it indefinitely. Hover/focus transitions remain available; reduced-motion disables animation and transforms.

104 Node tests pass. Browser checks verify decoded local art, preserved link/filter actions, no diagonal arrows, finite introduction, reduced motion, 390px overflow checks and no more than four distinct cached art resources. The overview screenshot was visually inspected. Existing full-update, shared-refresh, metrics, monthly AI save/reload and month visibility browser suites also pass. The added artwork size is bounded; an identical live-host before/after page-load benchmark is not claimed.

Reviewed ZIP SHA256: af4c456f2aa5e5718220d045a54d562c8ed454e9c562a481da4d36f4b2082f6c (26 files). Activated through staging/review/promotion; all 20 deployed text files match reviewed source.

---

# Sync usage flash note — v1.9.7

A top-right, dismissible notification now reports dashboard load, shared-state synchronization, live refresh and GUS publication activity. It closes five seconds after the latest completed operation or immediately on ×. It reports operation-scoped dashboard request attempts, elapsed browser time, outcome/cache reuse and 0 sync AI tokens. These instrumented paths invoke no LLM. The note explicitly excludes AI summary generation and identifies request counts as dashboard calls, not underlying Salesforce API calls or quota consumption. No AI token totals or estimates are fabricated for summary generation.

Request counters are passed into the relevant API calls as per-operation objects, preserving correct counts when independent operations overlap. Nested refreshes share their parent tracker and issue one aggregate note. This instrumentation adds no network requests or persistence writes of its own.

Isolated browser checks verify initial load (2 requests), six-epic refresh (8), monthly save/publish (2), failed refresh (1), accurate zero sync-token scope, top-right/mobile positioning, × dismissal and five-second timeout. Existing shared refresh, AI save/reload and month visibility suites pass. Backend sync semantics are unchanged.

Reviewed ZIP SHA256: 369c1d2f740a85fed855907684e512c5e6a8f0e8de077bd5c6d54c3c361d52e7. Activated through staging/review/promotion; all 19 deployed text files match reviewed source. 104 Node checks pass.

---

# Shared hourly refresh and compact navigation — v1.9.6

CFS branding now renders a single centered label instead of separate grid children. Tabs and Release/Month/Lists/Refresh controls share one desktop row, with smaller spacing, short labels and compact refresh progress. The last successful refresh time and Shared GUS status move to the footer. Smaller screens wrap controls without horizontal page overflow.

Automatic refresh first reloads shared dashboard state, then skips live list/epic fetches while both the last completed release refresh (when available) and every associated cached epic are under one hour old. Individual epic edits cannot extend the release refresh window. This guard exists in both browser and backend. At one hour or with missing data, automatic Fetch can proceed. Manual Refresh bypasses the age guard. Epics, including unchanged records, persist a checked-at timestamp to shared storage; successful paged fetch completion derives the release timestamp from the oldest persisted epic timestamp. Empty saved lists receive a completion timestamp after their membership query. Other active viewers reload shared snapshots on the existing 60-second/focus checks, without forcing another live epic fetch within the cache window. Explicit AI generation, work-item opening and write verification retain their necessary reads.

104 Node checks pass, including shared-cache reuse across Service instances, manual override, expiry, missing-cache behavior and timestamp persistence for unchanged epics. A two-session browser test verifies no live fetch for fresh cached data, manual source changes persisted to backend, another viewer rendering that shared result after its state refresh, and another manual refresh inside the hour. Desktop controls align at 1920/1440/1280; 390px layout has no horizontal overflow and the CFS mark fits its tile. Existing release setup, full-month view, month visibility and AI save/reload browser suites pass. Test source and backend are isolated; no production health-comment writes were performed.

Existing host limitations remain: concurrent stale viewers can both begin a fetch because there is no atomic refresh lease. Per-epic refresh timestamps add small journal entries on unchanged fetches. Shared-state polling continues because it is needed to show other users' saved changes; the hourly policy governs live epic/list refreshes.

Reviewed ZIP SHA256: e192c257066b227138982617f82ca311b849458c368c2bddb2a8d90ffc0151b8. Activated via staging/review/promotion; all 19 deployed text files match reviewed source.

---

# Subtle action highlights — v1.9.5

Epic toolbar actions use distinct soft blue, lavender, teal, amber and slate backgrounds with black labels. Enabled actions run a gentle box-shadow pulse for three 1.4-second cycles, finishing within 4.8 seconds including the longest delay; disabled publish stays neutral and still requires pending drafts. Hover/focus stop the cue; reduced-motion preference disables animation and transition. No backend behavior changed.

Isolated browser verification confirms distinct backgrounds, three-cycle animation on enabled controls, no animation on disabled publish, and no animation under reduced motion. Existing full-update/layout and month-column visibility suites pass. The local toolbar screenshot was visually inspected. No production health-comment writes were performed.

Reviewed ZIP SHA256: 1ad5a53306cefd84bf7ebd61285adc03d9977ad06fa3444d2aeaaa40a4c225b8. Activated via staging/review/promotion; all 19 deployed text files match reviewed source.

---

# Optional month columns — v1.9.4

Columns preferences now list each derived month with its own checkbox, including the review month, and a Monthly updates group checkbox to toggle all months. Hidden months are omitted from both headers and table cells. The shared release setting records hiddenMonths; new derived months appear by default. When several releases are selected, a month is visible if enabled in any selected release. Saving the preference applies the chosen visibility to every selected release while preserving hidden months outside the current timeline.

This is display configuration only. Original health comments, monthly drafts, sidebar history and AI summary evidence are preserved. Release edits and Fetch retain hidden-month settings. Input and journal schema validation reject invalid month keys; settings retain the existing release-revision check.

101 Node tests pass, including hide/show settings validation and persistence through Fetch/release edits without health-comment writes. Isolated browser checks verify hiding individual/review/all months, persistence after reload, restoring all months and unchanged remote comments. Existing full-update and monthly AI browser suites are also used for regression verification.

Reviewed ZIP SHA256: 52743c293205f103765f47e646c5cc37f7abd38a28a1879e28b90f7efb5bf1c7. Activated through staging/review/promotion; all 19 deployed text files match reviewed source. No production health-comment writes were used for verification. Existing platform caveats remain; competing visibility settings can replay last-write without a storage conflict banner.

---

# Chronological monthly sidebar and compact epic controls — v1.9.3

All sidebar month sections, including the active editor, are rendered oldest to newest using year-month keys. Switching pencils keeps September, October and November in chronological order rather than moving the selected editor ahead of the history. Existing selected-month save, AI draft and unsaved-switch checks are unchanged.

The epic card combines its title, count, From GUS chip, search, health/owner filters and actions into one desktop toolbar. The release/month description remains available to assistive technology; the selected release and review month remain visible above the card. Smaller screens wrap controls without page overflow.

Browser checks pass at desktop widths 1920, 1440 and 1280 for a single control row, and at 390 for no page overflow. They verify chronological order with each of September, October and November active, full-text visibility, pencil switching, save confirmation and preservation of other months. AI generate/save/reload checks also pass. All 100 Node tests passed. Tests use an isolated fixture, with no production health-comment writes.

Exact reviewed ZIP SHA256: 51af5eb5aab286f598e58630404e6ce0bd50349c31f09794db03b4bf873515ef (21 files). Independent static review approved with existing platform caveats. Activated through staging/review/promotion; all 19 deployed text files match reviewed source. The regression checks also open both filter menus on a 390px screen and exercise selected chips/Clear at 1280px. Hosted browser interaction is not claimed.

---

# Five-release management and full monthly views — v1.9.2

Release Lists now opens an explicit manager with Add new release, Show epics and Edit actions, avoiding accidental replacement through a default edit form. UI/backend capacity counts up to five logical scopes. Connected-list aliases share stable year/source identity plus explicit manually added epic IDs, independent of changing membership snapshots and display names. Projected edit checks prevent alias splitting beyond capacity. Existing duplicate records remain preserved. Simultaneous cross-session creates remain non-atomic and can still exceed the ordinary capacity check.

Release dropdown search resets on opening, so a stale menu search cannot hide saved choices. Activating a release clears table/search/health/owner/insight filters that could hide the newly selected scope.

A guarded live prefetch created and populated the missing VegaStore and FACE release associations. Verified shared backend now has five logical dropdown scopes: VegaCache FACE 12/12 cached, VegaStore 12/12, VegaCache Review Tracker 25/25, MAPS 23/23, MQ 27/27. The older MQ alias remains stored, not deleted. Writes were restricted to ContentVersion and ContentDocumentLink; zero Epic Health Comments writes occurred. Report: .local/v192-data-prefetch.json.

Full updates toggles the table's monthly line clamp off for side-by-side reading. The month sidebar shows its active auto-sized editor plus all other derived monthly updates as colored, escaped sections, each with a pencil action. Switching with unsaved text requires confirmation. The existing selected-month save pipeline remains unchanged.

100 Node checks pass, including max-five capacity, edit/deletion slots, stable aliases and projected alias-edit rejection. Browser release setup verifies all five dropdown options, clearing stale search, explicit editing, stale table-filter clearing and scoped cache persistence. Browser full-update checks verify long text without clipping, side-by-side month columns, all three sidebar tiles, pencil editing and preservation of other months. The SDK monthly generate/save/reload browser flow also passes.

Exact reviewed ZIP SHA256: 411c9554505398fefd584f3ee99e707437a4b65389b2dea00f1d95e28df3350e (21 files). Activated through review/promotion; all 19 deployed text files match reviewed source. Hosted browser interaction is not claimed; live shared-backend reads/writes and isolated browser tests are recorded separately.

---

# Release list setup and automatic prefetch — v1.9.0

Release Lists exposes saved name/year/links, connected-list chips and a read-only Preview GUS links action. Save & pre-fetch uses the existing shared release persistence, activates the release and automatically runs bounded per-epic fetching into the shared backend. Missing-cache release selections queue fetching when controls become idle, including selections made during another fetch. Overview metrics and table rows derive from the selected release IDs; no automatic AI model invocation or health-comment publication was added.

Individual GUS epic links/IDs are queried directly. Connected saved-list URLs use their actual definitions. Unknown saved-list URLs still need metadata access/connection and are not silently treated as usable lists. No guessed filter or universal-URL claim is introduced.

97 Node checks pass. The new isolated release-setup browser suite verifies chip URL selection/removal, preview without writes, Save without a manual Fetch click, fresh remote fields replacing stale cache, shared fixture persistence, reload through a release bookmark and release-specific display. Shared-feature and controls browser suites also pass. No production records were created or updated for this verification.

Reviewed ZIP SHA256: d9596bdc79ae5f09fa18716814904384f2d921ff5246a88785b49aada01d7ffd (21 files). Hosted activation and source matching are recorded separately.

---

# Supplied VegaCache/VegaStore list views — v1.8.3

Added actual GUS List View Describe metadata, retrieved through the authenticated GusProduction CLI connection, for VegaCache_266_Review_Tracker (00BEE00000EzIkj2AF), VegaCache_FACE_R266_Epics (00BEE00000EzMI52AN), and VegaStore_266_Review_Tracker (00BEE00000EzHAP2A3). No filters were inferred from names. Metadata contains no credentials or epic record snapshots.

Read-only query-only-facade preflight resolved 25/14, 12/15 and 12/14 epics/visible columns respectively. 97 Node checks pass. No GUS records were written for verification. Existing individual-epic and multi-list parsing paths remain unchanged.

This is a specific-list fix, not universal dashboard-only list discovery. Confirmed limitations: ListView SOQL exposes no executable query/filter field; the deployed sf facade has no request/list-view describe method; official AppletAI/BuilderTools publish query/describe interfaces only; read-only OPTIONS discovery found no /api/sf/request, /api/sf/rest, /api/sf/listviews/ADM_Epic__c or /api/sf/listview/ADM_Epic__c route (query's POST route exists). A platform connector metadata capability is required for arbitrary URL-only imports. The platform repository/connector owner was requested; no guessed queries, credentials workaround or fake claim of generic support was introduced.

Reviewed ZIP SHA256: 2744fd69a75705c4724f3f89a564ea9e46a4bf52fd3d2a99eff7e3e16a2536c3 (21 files). This version retains v1.8.2 concise-generation changes.

---

# Executive-length AI drafts — v1.8.2

AI prompts now request two short sentences: grounded outcome/readiness progress, then the main supported risk or next delivery step. They omit implementation lists, API/configuration detail, repeated epic titles and missing-evidence filler. Monthly output targets 25–30 words before timing provenance; executive output targets 30–40 words.

Generated output is capped at 280 characters and 45 words, including the shortened snapshot note: “Status as of YYYY-MM-DD; review-month timing unverified.” Backend and SDK formatting agree, retain complete sentences and never truncate words or conditional clauses. If no complete sentence fits, output explicitly says a concise draft could not be generated rather than inventing an abbreviated fact. Underlying evidence, permissions, editor population, Undo and explicit Save remain unchanged.

97 Node checks pass, including length/provenance/native/SDK parity and no mid-claim truncation. The isolated SDK browser flow passes with <=4 measured editor text lines, direct Save, reload persistence, Undo and no-change handling. This is an SDK contract/browser test; the user's actual model account was not invoked. Reviewed ZIP SHA256: 8d2a90fc7a9a73895c725595ff3b218e5665b5274d909e367173070877722b22 (21 files).

---

# AI draft save handoff — v1.8.1

Reproduced the user's path against the prior build: Generate filled a separate proposed-text preview while Save update still read the unchanged main editor. Saving without Use this draft could therefore submit an empty/no-op update and leave both dashboard and GUS blank.

Generation now puts the result directly in the main editable field, marks it unsaved, and offers Undo to restore the prior text and unsaved state. Save remains the only publication trigger. Unchanged fields with no pending draft now produce a No changes notice rather than a save confirmation; deliberate clearing of an existing update remains supported.

95 Node checks pass. The updated isolated SDK browser regression fails on the old path and passes after this fix: generation, direct Save, dashboard/GUS fixture persistence after reload, Undo, unchanged-save handling and absence of draft leftovers. No production health comments were changed. The CLI connection's visible shared catalog did not include the screenshot's MAPS-262 release, so no claim is made that its prior generated response was recovered or its actual production publication verified.

Reviewed ZIP SHA256: d2a695b1b8fc5b2e9034d89318ae1cbb73c9b54fbf93adcf8e68fa7d5aaa470d (21 files). Deployment source matching and activation are recorded separately.

---

# Native AI monthly drafts and complete epic coverage — v1.8.0

Includes all pending work since v1.6.3: sortable work-item headers (natural ID/sprint, numeric points, both directions, missing values last); one compact epic metadata row; mandatory default Epic Name/Health/months/Path to Green/Development Lead columns with optional extras; one header From GUS chip instead of repeated cell source/year labels; and a named third-person leadership paragraph for every selected epic, grouped by measure and team. Current review comments lead, earlier comments are historical context, and undated background is marked. Per-epic queue keys permit four workers rather than serializing each team.

The official GUS Apps AppletAI SDK is primary when configured. Its supported complete(agentName,{message,signal}) interface was checked against the host SDK source. The manifest declares a one-shot release-summary agent with no tools. Prompts contain only authorized evidence; no API keys or custom gateway client are bundled. Native Einstein and explicitly labeled source-based drafts remain fallbacks. User-key model execution was not exercised in the hosted browser.

AI Summarise is available beside monthly cells and in the month editor. It reads epic descriptions/goals/criteria, current and historical health comments, and related delivery descriptions/statuses. Truncated work lists fail explicitly. The proposed paragraph stays separate from editor text until Use this draft; only the existing explicit Save publishes. Work snapshots carry their retrieval date and unverified review-month timing inside adopted text, including SDK/native/fallback paths. Generation itself writes no GUS records.

95 Node checks pass. Isolated browser suites pass for controls, shared features, and SDK monthly draft loading, preview, adoption and selected-month save. Browser SDK execution uses a stub; it is a contract/flow test, not a test of the user's model key. Live read-only GUS checks covered all 27 MQ epics with zero work-item queries for executive generation, and monthly preparation successfully read one available epic goal field plus five delivery records, preserved the snapshot qualifier and performed zero writes. No production health comments were changed.

Reviewed build SHA256: 2fb388b2b941ac3d0ad845b1a0f21448083b02378754bebf0ec1dfb7cfa5c5a3 (21 files including fonts). See deployment-status.json for activation/source verification.

---

# Compact GUS work-item sidebar — v1.6.3

Replaces padded multi-line cards with dense desktop rows for ID, title, status, assignee, sprint and points. Native keyboard-operable disclosure expands full titles, assignment, sprint dates and priority. Mobile metadata uses a second short line. GUS links, read-only data and status filtering are preserved. No backend data operation changed.

Isolated browser assertions pass for desktop row height <=50 px, single-line title, disclosure expansion, full sprint details and 390 px page overflow. Existing shared-feature regression passes. Reviewed artifact SHA256: cf8329e203d8131451d19282eb3c1e3eb4ab475b31dccb74764721f8e78d984f.

---

# Fresh executive grouping, loading feedback and simplified navigation — v1.6.2

Executive generation first reads live GUS Project measures and teams, then summarizes each group with the existing membership/classification recheck. Project is now a canonical fetched field so a stale cached project cannot override the live value. Missing measures are flagged separately and still generate team paragraphs. A live read-only GUS integration produced two MQ groups including the missing-measure group, without work-item queries.

The animated accessible loader stays visible during planning and group generation, reports actual completed groups, hides partial output, and disables Copy until the complete result is available. Errors remain inline with retry guidance. Reduced-motion preferences are respected.

Monthly Updates used the same table, data and editor as Release Overview; its only separate behavior was hiding the cards and scrolling to the review month. Its duplicate navigation was removed. The monthly metric shortcut scrolls the existing overview table. Source & sync remains available via rail/footer controls rather than another navigation tab.

85 Node checks and isolated shared-feature/controls browser checks pass. Browser coverage includes deliberately stale cached project data, delayed generation with visible loader, Copy guard, missing-measure flag, complete paragraphs, clipboard parity and simplified navigation. No production health comments were modified. Native Einstein output and hosted browser interaction are not claimed. Exact reviewed build SHA256: c6bd0a5694ac2c482ef0f437685f3d5c03c68523c7338b1c2468426e00587d94.

---

# Executive paragraphs and inline toolbar — v1.6.0

The executive tab now contains one short paragraph per Project measure and team. Generate reads fresh GUS epic health comments in groups, with membership and grouping validation. It performs no work-item query or publication. Copy exports the same paragraph text, including earlier reporting-period qualifiers. Undated-only content is not misrepresented as current progress.

84 Node checks pass. Isolated browser controls and shared-feature checks pass, including desktop single-line toolbar geometry, narrow-screen overflow, paragraph grouping, absence of work-item counts/section cards, and clipboard parity. A read-only live GUS integration generated two MQ measure/team paragraphs (35 and 70 words), with zero work-item queries. Native Einstein generation was not exercised by that OAuth adapter; source-excerpt fallback was verified. Native AI prose is checked for format and source numeric values, but this is not proof of factual grounding; review before sharing.

Build SHA-256: `3f392779f1c5ae0c89858e6a10d859dd4542660755e236cfb9b09d6a55273cda`. Hosted browser interaction is not claimed for this build. See deployment-status.json for activation/source-match results.

Earlier results below are historical and superseded where versions/flows differ.

---

# Shared workspace and dropdown deletion — v1.5.1

The user explicitly approved authenticated-organization `AllUsers` sharing, including possible community/external GUS accounts. No public/anonymous download link is created.

Version **1.5.1** is activated through the supported review/promotion flow. Exact reviewed ZIP SHA-256: `68dcfc20e3521a4744f770417fe309ed1ca00a45c43310166a5b96b486b9b4e4`. All 17 deployed text files match the reviewed package (19 files including fonts). Independent static verdict: ApproveWithCaveats, no blockers.

- **81 Node checks pass.** Browser tests pass for selected and unselected release deletion directly from the searchable dropdown, cancellation without selection changes, keyboard focus return, shared-state reload, preservation of epic data and drafts, and later recreation of the same scope.
- Browser tests also cover compact metadata widths and progress labels across tabs/expanded views, chips, source-backed executive grouping, no duplicate Epic Explorer, saved-confirmation × dismissal and 10-second timeout, and prevention of cross-session automatic publication.
- GUS initially rejected `InternalUsers` on Organization links. After explicit user approval, the supported org-ID/Viewer/`AllUsers` links were applied in batches of 10 to avoid the existing GUS trigger’s SOQL limit. **209 existing files were migrated.** Later verification found **290/290 app journal documents shared**, including new MQ records and temporary validation history.
- Live integration ran the reviewed backend source directly through authenticated Salesforce API operations using a query-only facade: created **MQ-266**, fetched **27 epics and 13 source columns**, verified shared storage round trips, created/deleted only a named temporary validation release, and read executive facts from GUS. No test production health comments were written.
- Initial MQ cache population took 54.509 seconds; a steady refresh took **17.153 seconds** and left every unchanged cache revision intact. These timings measure the authenticated backend integration, not browser/GUS Apps wrapper overhead.
- The MQ epics currently have **zero populated Project measures**. The executive view correctly shows “Measure not set in GUS”; it does not fabricate V2MOM group labels.

The final shared-backend integration was not automated through the hosted browser. Existing authenticated Chrome disallows injected AppleScript JavaScript; no browser security setting was changed, and no credentials were extracted. Deployment source matching, actual GUS API integration, org-file link verification, and isolated browser checks are recorded separately in `dist/deployment-status.json`.

Earlier results below are historical and superseded where versions/flows differ.

---

# Signed-in production verification — 2 November 2026

The user completed normal GUS Apps sign-in. The active **v1.4.0** backend and page assets were verified in that session.

- The full saved-list Fetch completed in **16.27 seconds**, with **four concurrent Fetch requests**, **23/23 epics**, and the success message “23 epics fetched. Saved updates were preserved.”
- A subsequent backend read confirmed **23 saved epics**, **14 source columns**, and no pending drafts for the selected full-list release.
- The live release multi-select opened with Search, Select all, Clear all, and two distinct release choices; duplicate MAPS-266 entries were grouped.
- The live highlighted review month, compact header, purple Back to Hub, and adaptive table were inspected.
- **Save columns succeeded in production** using the existing selections. The persisted release revision changed while its columns and all 23 epic memberships stayed unchanged. No production Epic Health Comments were modified.

These signed-in results supersede earlier statements below that hosted verification was pending. `dist/deployment-status.json` records the successful checks separately from source-match and automated-test evidence. Actual monthly publication remains covered by isolated tests; no fabricated test update was added to a production epic.

---

# Compact controls and preference saves — version 1.4.0

Activated through the official GUS Apps review/promotion flow. Reviewed ZIP SHA-256: `f663cd9e3dd7aca0d20acfcb56c1ef82932c84fce58fab5d286be43728651043`. Independent review: ApproveWithCaveats, no blockers. After promotion, all 14 text source files retrieved from the app source API matched this reviewed source exactly. The package contains 16 files including the two bundled fonts. Signed-in hosted interaction checks were not run; the earlier diagnostic login expired without a new sign-in.

**66 Node checks pass.** The new controls browser test passes: duplicate scope grouping; multi-release union; checkbox search/Select all/Clear all; case-insensitive filters; empty healthy drill-down on a blocked-only release; column preference save/reload; adaptive two-column table width; highlighted review month; purple Back to Hub; work-item status multi-select; Escape closes its menu without closing the sidebar; and menus/page fit 320/390 px. Background-save, conflict/year-resolution, and list-import/mobile browser regressions also pass against isolated fixtures. No production health comments were changed.

Column/month preferences now use a dedicated `save-settings` action, so preferences do not resolve/reimport source list metadata or resubmit full release setup. Only the requested settings change; revision and column allowlist checks remain. UI submissions retain the releases captured when the preferences editor opened, and update saved release records locally. Multi-release preference saves can partially succeed before a later release conflicts; they do not form a cross-record transaction.

Duplicate release choices group the same name/year/membership/source using the latest saved record. Underlying release records are retained. Distinct scopes sharing a name have distinct visible labels. Release, health, owner, and work-item status menus share the bundled accessible checkbox control. The review month remains a calendar input identifying the single highlighted review month, rather than a dropdown.

Earlier results follow for history and are superseded where the current flow differs.

---

# Background monthly saves — version 1.3.0

The reviewed artifact `879159bbf6908fba038edc2892aeffda901c50acd267863c7b7bbb1ea57f3306` was activated through the official review/promotion flow. Independent static review: ApproveWithCaveats, no blockers. Hosted verification is pending normal user sign-in; upload/promotion success is not represented as a hosted performance result.

**62 Node checks pass**, plus two deployment tests. `tests/browser_background.py` passes in isolated fixtures with intentionally delayed/failed network responses: editor closes in under 500 ms, backend draft commits before publication, publication failure recovers after reload, a committed draft whose response is lost can be retried safely, readback confirms the selected month, other months remain intact, and Fetch runs concurrent requests with a four-worker bound. The updated conflict/year browser regression also passes. No test text was written into production health comments.

The screenshot's error was reproduced when the cached epic was absent. Save now validates the saved release, hydrates a missing cache automatically, and keeps the displayed month baseline for conflict checks. The selected production epic's cache was present during the read-only investigation; the older screenshot alone does not establish why its earlier cache was absent.

Direct publication is authorized by the user's explicit Save update request, scoped to one stored month/revision, with a final draft-revision recheck, remote conflict detection and readback verification. Only the selected month is published; unrelated pending drafts and unmapped/mapped legacy headings remain unchanged. Background execution is browser-scoped; persisted drafts resume on reconnect. No claim is made that unpersisted work keeps running after closing the page or that network/database writes complete instantly.

Prior verification follows for history; current results above supersede earlier save-flow/version statements.

---

# Current production verification — 2 November 2026

Version **1.2.3** is activated through the official GUS Apps review and promotion flow. An upload only stages a build; activation and signed-in runtime checks are recorded separately.

- Exact reviewed package SHA-256: `68f40444c7bd29b020531ea2338ea9967b68653c1f9761b16c3c317e3f6bd261`.
- Independent full review plus corrective delta review: **ApproveWithCaveats**, no remaining blockers; High risk under the platform Bulk Write rubric.
- **55 Node checks pass**, including the absent-runtime-global decoder regression, stored-HTML column rejection, conflict/draft preservation, storage bounds, and revision-guarded one-epic Fetch pages. **2 deployment tests pass**.
- Browser list checks pass: list imports, source columns, saved URLs, work-item truncation notices, and hub navigation at desktop and 320/390 px.
- Browser theme checks pass: bundled Salesforce Sans loads, black text, exact requested header, dismissible timed connection notice, metric filters, and source drawer. The layout was compared with the signed-in VegaCache Onboarding Lite reference.
- Actual production connection exposes query/create/update and batch helpers, without REST/list-view describe or atomic conditional writes. The supplied MAPS list uses its actual verified metadata definition, not guessed filters or a stored epic-ID list.
- Signed-in production v1.2.1 inspection resolved **23 epics and 14 visible source columns**. A separate query-only OAuth preflight independently returned 23 epics, September/October month sections, and no unavailable epic fields.
- The original full Fetch hit the host's **25-second handler deadline**. Version 1.2.2 introduced membership refresh separately, then processes one epic per request, with progress and a release-revision guard. Live Fetch and subsequent state reload completed: **23 of 23 epics**, **14 source columns**, and **September/October 2026** parsed month sections. Five related work items loaded for a selected epic. A saved-release deep link rendered all 23 cached epics in the hosted dashboard.

Final signed-in checks confirmed version **1.2.3**, a successful read-only per-epic Preview (no drafts), and hosted page assets using version 1.2.3. The complete 23-epic Fetch and persisted-state verification used v1.2.2; its Fetch implementation is unchanged in v1.2.3.

No production Epic Health Comments were changed during verification. Fetch writes dashboard/cache records in GUS ContentVersion. Explicit comment-sync behavior was exercised in isolated test fixtures. Version 1.2.3 also sends Preview and confirmed Sync one epic per request, validates release membership, skips unrelated epic journals, and retains per-epic failures. Browser conflict resolution and explicit sync regression checks pass. No production comment write was used to establish live write permissions or timings. The actual facade's pre-save recheck and post-save verification cannot provide atomic writes.

The verified MAPS definition must be refreshed after changing GUS list filters/columns. Other unregistered lists require their own verified metadata or native list-view REST support. History bounds fail explicitly and archive maintenance is documented in `storage-retention.md`; no saved histories were pruned.

The following is historical evidence from earlier versions; the status above supersedes earlier statements that live authentication or promotion was pending.

---

# Verification · 2 November 2026

## Version 1.1.0 follow-up

The user reported a live `Saved dashboard record cannot be decoded` error. Reproduced the exact failure in a `vm` sandbox that omits `structuredClone`, then replaced the decoder's dependency with JSON-compatible copying. The new sandbox regression passes without changing or deleting existing saved records. This explains a concrete runtime failure path; the deployment token cannot confirm the signed-in user's live fetch outcome.

Added saved epic list-view URL import, including the supplied `MAPS_266_Review_Tracker1` API-name URL on `gus.lightning.force.com`, direct list IDs, and pasted Markdown links. Membership refresh preserves drafts for removed epics. Source list columns appear in the dashboard, and list-specific values survive monthly sync and fetches for other releases. The independent review identified and regression-covered a quoted `LIMIT` filter-literal bug and a shared-extra-fields retention bug; both are fixed.

Replaced the brand link and added a top-right **Back to Hub** link to `/`, targeting the top frame. Work-item queries use `LIMIT 2001`, display at most 2,000 records, and return a truncation warning explaining that totals and filters cover only the loaded subset. Storage enumeration now fetches grouped titles in one bounded aggregate batch; each entity history is read with a 10,001-row sentinel and rejected above 10,000 rows rather than decoded incompletely. No automatic age cutoff or data deletion is used; see `storage-retention.md` for the archive policy.

**43 automated tests pass.** Sandbox checks also verify that epic/list URL parsing works without a host-provided `URL` global, using the explicit Node built-in import. `tests/browser_lists.py` passes against temporary fixtures: the supplied URL format resolves to multiple epics; source columns and the original URL survive edits; truncation warnings are displayed; and the hub link is visible without page overflow at 390 px and 320 px. Those tests use isolated fixtures, not the user's live list contents. The applet's JavaScript/CSS asset version is 1.1.0 to avoid stale frontend assets after refresh.

The decoder hotfix was uploaded before completing list import. The complete 1.1.0 package is then uploaded to the same applet; `dist/deployment-status.json` records the latest upload/verification outcome. User-context Salesforce fetch/sync still cannot be verified using the deployment token alone.

## Implemented

GUS Apps Node backend, manifest and deployable frontend; persistent release lists and monthly draft journal; schema-aware epic fetch; comment splitting/consolidation; reviewed-revision sync with remote conflict detection and readback verification; epic work-item sidebar with status/assignee/sprint/points; column controls, search/filters, month controls, expanded view, and read-only sample.

## Automated checks

`npm test`: **28 tests passed**. Includes common/inline/repeated month headings; explicit and inferred years; rich text and untouched link preservation; new/cleared monthly sections; cross-year ambiguity; validated GUS epic links; draft retention across fetch and new service instances; remote month conflicts and changed conflict baselines; partial write failures; failed verification/retry; stale release forms; reviewed-preview revision binding; all work-item pages; optional inaccessible sprint fields; conditional PATCH headers; compressed ContentVersion chunk persistence; partial upload recovery; concurrent independent month saves; competing saved drafts and resolution; full release/draft/sync lifecycle through new ContentStore instances; bounded connection identity; restricted action allowlist; same-origin local server writes and public-only file serving.

`python3 tests/browser_smoke.py`: **passed**, using only `node server.js --fixture`. Verified:

- Epic sidebar opens, loads three related work items and sprint details, and filters by status.
- Monthly draft saves, survives reload, and remains pending through fetch.
- Consolidated preview includes the draft; explicit sync is reported verified and clears the saved revision.
- Added month columns and selected column settings persist.
- Health filters, duplicate epic links, edited release membership, and new empty releases behave correctly.
- Mobile view fits a 390 px viewport without page-level horizontal overflow.
- No browser page errors during the checked workflow.

Final read-only sample verified separately at `http://localhost:8383`. Screenshots in `dist/`: `dashboard-preview.png`, `epic-sidebar-preview.png`, and `mobile-preview.png`. Sample data is fictitious and cannot write to GUS.

`python3 tests/browser_conflicts.py`: **passed** against a temporary isolated backend. Exercised competing saved-draft review, resolution, successful verified sync, and correction of an ordinary inferred October heading from 2026 to 2025, with its correctly dated consolidated preview. No browser page errors.

## Independent review

A fresh code reviewer identified five material issues. All were fixed:

1. Concurrent snapshot saves could erase another month's draft. Replaced snapshot overwrites with immutable per-field/month change records. Regression checks preserve independent months and retain competing versions explicitly.
2. Saving a resolution could adopt a newer GUS comment than the one shown. Resolution now requires the displayed remote value to remain unchanged.
3. Sync could include drafts changed after preview. Sync now accepts only approved epic/draft revisions and rejects a stale preview.
4. Ordinary inferred years lacked a correction entry point. The monthly editor now exposes legacy-year confirmation.
5. An inaccessible sprint date could break all work-item results. Optional relationship fields are probed separately and reported unavailable.

No review findings were deferred. The user changed the backend target from local Python/SQLite to GUS Apps; the production implementation and package follow that instruction. The local server is only a preview/test harness. The dirty parent workspace and adjacent existing apps were not modified or committed.

## Live deployment status

**Applet uploaded; live Salesforce checks pending sign-in.** The initial attempt had no inherited deployment credentials and `sf org list --json` returned no authenticated orgs. After the user confirmed their deployment token was configured, its literal assignment was found in the shell profile and used without exposing or saving the token. GUS Apps confirmed the applet upload. The deployed handler then returned **“Missing Salesforce auth context.”** The deployment token authorizes code upload but supplies no signed-in Salesforce user session for this user-context applet. Token-authenticated page/asset requests redirect to sign-in (HTTP 302).

The ready upload artifact is `dist/cfs-release-review-tracker.zip`. It contains only `manifest.json`, five backend JavaScript modules, and the four public assets. It excludes fixtures, local data, credentials, tests, and documentation. Its new slug is `cfs-release-review-tracker`.

Uploaded URL: https://gus-apps.internal.salesforce.com/applets/cfs-release-review-tracker

Open the uploaded app and sign in through the normal GUS Apps flow, then supply real epic links and run a live fetch. Verify an actual write only through an explicitly chosen epic and user-initiated Sync to GUS. No production epic was modified in this session. Upload and check results are saved in `dist/deployment-status.json`.

Automatic approval review rejected an attempted reuse of a named existing browser-session keychain entry because this session access was outside deployment-token authorization. The rejected command did not execute and no browser session was retrieved. Verification continues through normal user sign-in; no workaround was attempted.

## Runtime limitations to verify on the host

- Host user-context configuration, object/field permissions, and saved-document sharing require the deployed GUS Apps environment.
- When the host exposes only query/create/update, sync uses a pre-save recheck plus readback verification, and the interface states that atomic conditional updates are unavailable. Full REST-capable connections use conditional PATCH.
- The append-only state history requires full pagination support as it grows. The backend fails explicitly rather than silently loading an incomplete history.
- The first version imports individual epic links/IDs; GUS list-view URL/column-metadata import was not confirmed and is not included.

## Release Planning (post-4.0.0-GA)

- plan22: Save button, BTL checkbox in the commit dialog and Saved epics list verified on the local harness; the BTL commit path is unit-tested for review only and was never run against live GUS.

- plan20: inline multi-select owners/engineers (day split), P0/268 defaults, sheet-parity fields and 20-column Grid verified on the local harness only (no 268 release exists there, so the release default was not exercised live).

- plan18/19: P-priority selects, Grid edit (workstream priority edit round-trips to Form), collapsed summary cards and the Summary subtab (5 KPI cards, theme drill-down modal) verified on the local harness only; not against live GUS data.

- plan17: filter/group toolbar verified on the local harness (group by ABL/BTL gives 2 groups; search narrows to 1 of 2 epics). Not verified against live GUS data.

Automated: `node --test tests/plan.test.js` (5 pass; mocked sf/store). Manual on stub harness: tab renders, live KPI/theme/engineer recompute, 9-tile hub grid. Not verified: live GUS create/update of PPM_Project__c and ADM_Epic__c; first real commit should be previewed and reviewed by the user.

- plan23: grid-only Release Planning, project strip, active-tab-only nav, Planner/Summary tab names, theme card and Saved epics columns — verified on the local harness (screenshots at 1500px) only.

- plan24: Planned Release Summary theme donut, priority/theme cards and executive epic cards; epic/theme dialogs open — local harness only.

- plan25: Open in GUS bar hidden on Team Hub only — local harness only.

- plan26: tab order change (rail, tiles) — local harness only.

- plan27: duplicate page titles hidden on all tabs — local harness only.

- plan28: Pulse order velocity -> sprint bar -> tiles; filter follows into Standup — local harness only.

- plan29: standup avatar strip jumps to the chosen engineer, prev/next follow — local harness only.

- plan30: status colour palette — computed colours checked for 4 of 6 states on the local harness.

- plan31: standup Prev/Next/Shuffle/Open in the sprint bar; Next click advances member — local harness only (Shuffle/Open/Prev not clicked).

- plan32: compact standup dialog header and dim-until-hover avatars — local harness screenshot only.

- plan33: grouped standup chips with signal hover cards and updated tagline — local harness screenshot only (spillover card seen; In progress/Blocked have 0 items in seed data).

- plan34: Team Hub tile layout and go-arrow — local harness screenshot at 1500px only.

- plan35: Team Hub tile titles without Monthly/Quarterly — local harness screenshot only.

- plan36/37: sprint selector highlight and centred dialog header — local harness screenshots only; pulse animation seen as a single frame, not as motion.

- plan38: engineer dialog chips and avatar strip centred on one axis — local harness, measured at 1500px only.

- plan39: coloured status dropdown list — option colours confirmed via computed styles and the closed select by screenshot on the local harness; the open list itself could not be screenshotted in headless Chrome.

- plan40: engineer navigation dissolve — confirmed by computed styles on the local harness (backdrop animation off, content animation on, ends opaque); motion itself not watched.

- plan41/42: sprint selector placement and heading rename — local harness screenshots at 1500px only (Standup row seen on one screen size).

- plan43: signal hover card layering — local harness screenshot (Added card, 1500px) only; other signal cards share the same styles but were not each captured.

- plan44: items/SP labels on group chips — local harness screenshot only.

- plan45: Release Planning team dropdown — local harness: switching to MAPS reloaded the page and breadcrumb; unsaved edits were not tested across a switch (plan saves automatically).

- plan46: planner grid column sizing — local harness screenshot at 1900px only; very narrow windows and every optional column (Theme, Doc, V2MOM…) not checked.

- plan47: ATL-only roll-up, adjacent read-only Epic est., latest-release default, planning window in tab bar — local harness only (column order, read-only cells, date position); the GUS commit path was not run live.

- plan48: planner default column order/labels — local harness header check only; Priority/Release hidden by default.

- plan49: Project column width — local harness measurement at 1500px only.

- plan50: inline delete popover — local harness: popover sits 8px above the button and Delete removes the epic; the project-delete popover and keyboard/Esc paths were not exercised.

- plan51: project short code — local harness with a simulated 'HRP M1.1.4' option (button text, full-name title, width); real GUS project names not checked.

- plan52: row action icons and workstream drag — local harness with synthetic drag events (moved a workstream into another epic); real mouse dragging and keyboard Up/Down not exercised.

- plan53: new-project popover — local harness: popover added a project with name and short form, and the grid dropdown showed the short form; the backend stores `short` but a live GUS save with it was not run.

- plan54: export template/import — local headless Chrome round trip (export → import shows 0 errors; a deliberately bad row reports 5 errors) and a node test of the zip writer. The exported file was not opened in Excel, Numbers or Google Sheets, so the dropdowns are unconfirmed there; the real file picker and applying an import were not exercised.

- plan55: action order and title link — local harness: after switching to MAPS, clicking the title opened Team Hub with MAPS still selected. The page heading and tab already render on the harness; the missing heading in the user's screenshot was not reproduced.

- plan56: planner tabs and grid dropdowns — local harness screenshot only; icon animation checked by CSS, not as motion; open dropdown list not viewed.

- plan57: page tab shown in focus mode and flush with content; verified by headless screenshots of Home and Plan on the local harness only.

- plan58: grid column widths; verified by headless screenshot on the local harness only.

- plan59: save-on-click and prefetch fix; unit tests only plus code inspection, local harness.

- plan60: Actions header; code change only, tests run, local harness.

- plan61: effort colouring and serialized saves; double-click Save on local harness ended 'Saved', no conflict.

- plan62: back button; harness check in focus mode: visible and routes to #/home.

- plan63/64: tile styling checked by headless screenshots; column toggle and reorder checked by script on the local harness.

- plan65: owners popover; scripted check on local harness: opens above the button, Save applies, button label updates, plan marked unsaved.

- plan66-68: scripted harness checks: loader settles with 0 gap, per-workstream toggle changes rows, column ticks incl. Priority and Done, + Epic focuses last row.

- plan69: scripted harness check: no popups on load; + Epic popup adds at end; Projects menu and + Project popup open on click.

- plan70: overlay seen in a local headless screenshot (blurred shell, centred spinner); fade-out and end-of-load timing on real data not observed.

- plan71: Back button in tab row, far right (local harness, headless Chrome, normal and focus mode: right edge 1674/1700, same row as tab, click returns to #/home and button removed). Not verified on the live app.

- plan72: BTL epic forces BTL workstreams; Projects popover within viewport (local harness, headless Chrome at 1000 and 1700 px wide: popover 362-882/1000, 1062-1582/1700). Not verified on the live app.

- plan73: wider + Project popup (CSS only; not visually re-checked in a browser, not verified on the live app).

- plan74: + Project popup placeholders set to 'Enter value' (string change; not visually re-checked, not verified on the live app).

- plan75: Back button restyled to match Back to Hub; planner icons flattened (local harness screenshot of the planner; not verified on the live app).

- plan76: Expand/Collapse labels toggle cards (local harness, headless Chrome: both summary cards went collapsed to open on label click; not verified on the live app).

- plan77: Engineer bandwidth by-theme column, renamed effort columns, BTL now counted (local harness, headless Chrome at 1500 and 1100 px: Load bar inside card; not verified on the live app).

- plan78: engineer bandwidth centred (local harness: header and value centres match, offset 0 px; not verified on the live app).

- plan79: theme column removed from engineer bandwidth (local harness: 5 columns, Load bar inside card; not verified on the live app).

- plan80: richer CSS 3D icons in planner tiles and headings (local harness screenshot; not verified on the live app; Planned Release Summary tab not re-screenshotted).

- plan81: Back button navigates to the applet root URL. Only the local-harness fallback (in-page #/home) was exercised; the applet-URL branch was not run live.
