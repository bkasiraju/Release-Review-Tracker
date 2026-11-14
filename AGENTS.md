# Release Intelligence

The user designated **4.0.0-GA** (14 November 2026) as the current **GOLDEN BUILD** and preferred rollback reference; it supersedes 3.0.0-GA, which remains immutable at `GOLDEN-BUILD-3.0.0-GA`. Earlier note: the user designated **3.0.0-GA** as the **GOLDEN BUILD** and preferred rollback reference on 10 November 2026. On 10 November 2026, the user explicitly requested folding the tooltip and view-state updates into this canonical version. The prior exact 3.0.0-GA archive/source are preserved at releases/3.0.0-GA-original/ and GOLDEN-BUILD-3.0.0-GA-original. Preserve older release tags and archives. The dataset has a separate private GOLDEN Dataset backup; it must never be published in Git or Pages.

- Keep `v4.0.0-GA`, `GOLDEN-BUILD-4.0.0-GA` and `releases/4.0.0-GA/` immutable unless the user explicitly redesignates a build; for regressions restore that exact artifact/checksum.
- Keep `v3.0.0-GA`, `GOLDEN-BUILD-3.0.0-GA` and `releases/3.0.0-GA/` immutable unless the user explicitly redesignates a build.
- For future regressions, restore the exact 3.0.0-GA artifact/checksum; follow `docs/GOLDEN_BUILD.md` and preserve unrelated work.
- Application rollback must preserve live GUS epics, comments, release lists, drafts and journal history. Dataset restoration is separate and requires explicit user authorization at restore time.
- Keep credentials, `.local/` state, private dataset backups, session files and deployment tokens out of Git and Pages. Public release metadata may contain backup hashes/status, never dataset records.
- GUS Apps is the authenticated production application. GitHub Pages cannot supply its GUS backend.
- Release notes must distinguish fixture verification from actual production model/session verification.

## Explicit AI evidence requirement

The user explicitly requires summaries to use only provided engineer comments or verified GUS work-item facts. Validate status, completion and release claims against source evidence. Closed is not Released; Ready for Review is not Completed; goals/descriptions are not achieved outcomes. Preserve the applicable month and use dated history for historical transitions. Do not invent comments, status, risk closure or release/completion dates. Keep unknown facts unknown. AI text still requires explicit user review/save before GUS publication.

On 9 November 2026 the user explicitly adopted the EpicPulse guide after reviewing conflicts. This supersedes the earlier oldest-first/month-replacement rule: approved updates are now prepended as new dated entries, append-only, preserving existing rich history byte-for-byte. Goals, verified V2MOM mapping (or engineer-confirmed none) are prerequisites for AI generation/publication; Path to Green for Watch/Blocked or reported blockers is required only when saving/publishing (updated 13 November 2026), never to generate AI summaries. Review Status is a dashboard-only shared enum paired with current GUS Epic Status. Never auto-change Epic Status from a summary.

## Validation speed preference (9 November 2026)
The user explicitly requests focused validation for the changed feature. Run relevant module tests and one targeted browser flow when UI behavior changes; skip unrelated regression suites unless a concrete cross-cutting risk justifies them. Publish the verified GUS Apps change promptly. Do not delay the live-app completion message for the separate Pages build; report Pages status accurately.

## Executive output refinement (10 November 2026)
The user explicitly made Method optional: a verified GUS Project/Measure is sufficient; do not force Method lookup or mapping review when Measure exists. Shareable executive/measure output must contain only validated third-person TPM narrative, grouped by measure and full team name. Keep reporting prefixes, source-fallback fragments, KPI inventories, status badges, missing-context notes and validation diagnostics out of copied prose. Put evidence/failures in separate collapsed inspection. Never fill a failed AI paragraph with raw engineer text or fabricated progress. Preserve actual historical timing, source meaning and review/save controls. Expanded detail tables hide Epic Status and Review Status by default; the parent row always retains both.

## AI dependency recovery (10 November 2026)
AI preview, monthly and executive generation, and individual health-comment publication must not automatically read Google Sheets. Use GUS Project/Measure when available; keep missing measures unassigned and flag them separately without inventing mappings. Method remains optional. Normal generation retains the goal check only; Path to Green is enforced when saving/publishing, never when generating AI summaries; read-only previews may summarize displayed comments without those prerequisites and never write records. Not Started requires Review Status: Planned, Bandwidth Constraints, Dependency-Blocker or To be re-prioritised.

## Completed epic monthly review exemption (10 November 2026)
GUS Health = Completed requires no monthly update. Exclude these epics from missing-update exceptions, awaiting-update filters/counts, monthly coverage requirements and Slack monthly nudges. Preserve existing comments/history. Missing-update warnings use an animated icon only, with accessible month-specific labels and hover text.

## Executive delta cache (10 November 2026)
Reuse successful executive epic analysis from the shared GUS Apps backend until its evidence fingerprint changes; the one-hour window expires source validation, not AI analysis. Revalidate GUS epic/work evidence at most hourly unless manually refreshed or shared local evidence changes. Recompute only changed epics and their affected measure/team consolidations, including month, membership and summary-rule version in cache identity. Never cache rejected drafts as ready or count cache reuse as AI token usage.

## Independent text and expansion controls
Compact/Full Updates changes monthly-text clipping only. Single/all row and group expansion controls must never mutate that mode. Mode changes must not reset expanded rows, collapsed groups, applied filters or dashboard view.

## Automated release to GUS Apps (no manual promotion)

Every requested change follows this sequence end to end without asking the user to promote manually:
1. `git pull`, implement, run focused tests, commit and push to `main`.
2. Stage with `python3 scripts/deploy.py --staging-only` (packages `dist/cfs-release-review-tracker.zip`).
3. Run an independent read-only review (code-review subagent) of `git diff <last deployed commit> HEAD` against `.local/gus-review-rubric.md`. Save its honest verdict (`recommendation`, `summary`, `blockingIssues`, `caveats`; reference the reviewed commit and say whether it was static-only; the final deploy repackages, so match by commit, not ZIP hash) to `.local/platform-review-verdict.json`. Never write an approval the reviewer did not give.
4. If `blockingIssues` is non-empty or the recommendation is Reject: stop, fix or report to the user. Otherwise run `python3 scripts/deploy.py`, which POSTs the verdict to `/api/applets/cfs-release-review-tracker/review-verdict`, promotes with `{"decision":"approve"}`, and verifies the live version.
5. Report git and GUS Apps status accurately (uploaded / activated / verified).

## Release Planning tab

`#pl-save` forces a plan save (flush) and is always visible. `commitPlan(sf,store,teamId,confirm,includeBtl)`: BTL epics are written only when `includeBtl===true`. Release Review lists saved epics with their GUS links from `epic.gusId` / `project.gusId`.

Planner dropdowns are always `H.customSelect`; multi-selects (`msel`, `.ms`) are plan.js-local. Epic plan-only fields: `theme,hrp,v2mom,estimate,status,doc,owners,ownerNames`; workstream: `priority,status,engIds,engNames`. Defaults: priority 0, release = team's 268 (`defRel`). Grid project cells show `data-short` (hub.js customSelect). Only the original epic fields are written to GUS.

Priority is shown as P<n> (select; stored numeric). Workstreams carry a plan-only `priority`. Release Planning is grid-only (no Form view; project names are edited in the `.pl-pstrip` above the grid; grid rows are `tr[data-e]` with `td[data-w]` cells so the shared `onInput` ctx logic applies). Summary cards fold via `P.open`. The Release Planning Summary subtab (`P.tab`, `drawRps`) is read-only and derived from the plan.

Planner view state `P.view` (search, release, line, engineer, theme, group) is session-only, rendered by `drawTools()` into `#pl-tools` and applied in `drawPlanner()`; it must never be written to the plan. Grouped (non-Project) views are read-only for add/remove.

`public/plan.js` (client) + `backend/plan.js` (actions `plan-get|plan-save|plan-refs|plan-commit`). Draft stored as settings key `plan-<teamId>`. Only ABL epics are written to GUS (project -> program, epic -> project + planned release, days -> `Planned_Story_Points__c`); everything else is dashboard-only. Leaders are excluded from capacity via `H.leaderRank(name)`.

Release Planning is the last NAV entry; hub.js intercepts its tab/tile/rail click and opens `#/plan?full` in a new tab (`H.standalone` then enables focus mode).

Palette: blue-slate accents on light surfaces; no purple or dark-navy fills, and chart SVG elements must set `stroke:none` (global `svg{stroke:currentColor}` otherwise outlines them in black). Overrides sit at the end of `public/hub.css`.

Only user-level preference: default team (`cfs.hub.defaultTeam`, localStorage; falls back to the backend `pref-<userId>` settings key only when browser storage is blocked). Do not add other browser-stored preferences without being asked.
