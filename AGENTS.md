# Release Intelligence

The user designated **2.0.0-GA** as the **GOLDEN BUILD**, the stable rollback baseline. On 9 November 2026, the user explicitly requested folding subsequent changes into this version. The earlier baseline is preserved at `GOLDEN-BUILD-2.0.0-GA-original` and `releases/2.0.0-GA-original/`; the consolidated baseline retains the canonical GA tags.

- Keep this baseline immutable. Do not move or overwrite its `v2.0.0-GA` or `GOLDEN-BUILD-2.0.0-GA` Git tags, archive, or checksum.
- If a future release introduces a regression, use this build as the rollback target; follow `docs/GOLDEN_BUILD.md`. Preserve unrelated working changes.
- Roll back application code only. Never delete or replace shared GUS records, release lists, comments, drafts, or journal history as part of rollback.
- Keep credentials, `.local/` state, session files, cached GUS data and deployment tokens out of Git and Pages.
- GUS Apps is the authenticated production application. GitHub Pages cannot supply its GUS backend.
- Release notes must distinguish fixture verification from actual production model/session verification.
