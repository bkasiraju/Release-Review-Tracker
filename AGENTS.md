# Release Intelligence

The user designated **2.0.0-GA** as the **GOLDEN BUILD**, the stable rollback baseline. On 9 November 2026, the user explicitly requested folding subsequent changes into this version. The earlier baseline is preserved at `GOLDEN-BUILD-2.0.0-GA-original` and `releases/2.0.0-GA-original/`; the consolidated baseline retains the canonical GA tags.

- Keep this baseline immutable. Do not move or overwrite its `v2.0.0-GA` or `GOLDEN-BUILD-2.0.0-GA` Git tags, archive, or checksum.
- If a future release introduces a regression, use this build as the rollback target; follow `docs/GOLDEN_BUILD.md`. Preserve unrelated working changes.
- Roll back application code only. Never delete or replace shared GUS records, release lists, comments, drafts, or journal history as part of rollback.
- Keep credentials, `.local/` state, session files, cached GUS data and deployment tokens out of Git and Pages.
- GUS Apps is the authenticated production application. GitHub Pages cannot supply its GUS backend.
- Release notes must distinguish fixture verification from actual production model/session verification.

## Explicit AI evidence requirement

The user explicitly requires summaries to use only provided engineer comments or verified GUS work-item facts. Validate status, completion and release claims against source evidence. Closed is not Released; Ready for Review is not Completed; goals/descriptions are not achieved outcomes. Preserve the applicable month and use dated history for historical transitions. Do not invent comments, status, risk closure or release/completion dates. Keep unknown facts unknown. AI text still requires explicit user review/save before GUS publication.

On 9 November 2026 the user explicitly adopted the EpicPulse guide after reviewing conflicts. This supersedes the earlier oldest-first/month-replacement rule: approved updates are now prepended as new dated entries, append-only, preserving existing rich history byte-for-byte. Goals, verified V2MOM mapping (or engineer-confirmed none) and Path to Green for Watch/Blocked or reported blockers are prerequisites for AI generation/publication. Review Status is a dashboard-only shared enum paired with current GUS Epic Status. Never auto-change Epic Status from a summary.

## Validation speed preference (9 November 2026)
The user explicitly requests focused validation for the changed feature. Run relevant module tests and one targeted browser flow when UI behavior changes; skip unrelated regression suites unless a concrete cross-cutting risk justifies them. Publish the verified GUS Apps change promptly. Do not delay the live-app completion message for the separate Pages build; report Pages status accurately.

## Executive output refinement (10 November 2026)
The user explicitly made Method optional: a verified GUS Project/Measure is sufficient; do not force Method lookup or mapping review when Measure exists. Shareable executive/measure output must contain only validated third-person TPM narrative, grouped by measure and full team name. Keep reporting prefixes, source-fallback fragments, KPI inventories, status badges, missing-context notes and validation diagnostics out of copied prose. Put evidence/failures in separate collapsed inspection. Never fill a failed AI paragraph with raw engineer text or fabricated progress. Preserve actual historical timing, source meaning and review/save controls. Expanded detail tables hide Epic Status and Review Status by default; the parent row always retains both.

## AI dependency recovery (10 November 2026)
AI preview, monthly and executive generation, and individual health-comment publication must not automatically read Google Sheets. Use GUS Project/Measure when available; keep missing measures unassigned and flag them separately without inventing mappings. Method remains optional. Normal generation/publication retains goal and Path-to-Green checks; read-only previews may summarize displayed comments without those prerequisites and never write records. Not Started requires Review Status: Planned, Bandwidth Constraints, Dependency-Blocker or To be re-prioritised.

## Completed epic monthly review exemption (10 November 2026)
GUS Health = Completed requires no monthly update. Exclude these epics from missing-update exceptions, awaiting-update filters/counts, monthly coverage requirements and Slack monthly nudges. Preserve existing comments/history. Missing-update warnings use an animated icon only, with accessible month-specific labels and hover text.
