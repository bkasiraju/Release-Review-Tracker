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
