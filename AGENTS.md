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

Monthly health-comment writes must order dated sections chronologically, oldest first, regardless of which month was edited, while preserving other months, rich links and undated notes.

## Validation speed preference (9 November 2026)
The user explicitly requests focused validation for the changed feature. Run relevant module tests and one targeted browser flow when UI behavior changes; skip unrelated regression suites unless a concrete cross-cutting risk justifies them. Publish the verified GUS Apps change promptly. Do not delay the live-app completion message for the separate Pages build; report Pages status accurately.
