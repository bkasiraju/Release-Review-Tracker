# Release Notes

## v2.0.0-Beta — 2026-04-16

### New Features

- **Risk Assessment tab** — New "Risk Assessment - AI Generated" tab after Capacity Planning, showing planning risks and release execution risks in a dedicated view.
- **Owner mismatch detection** — Owner column now compares the Google Sheet planning owner against the GUS `Development_Lead__r.Name`. Mismatches are highlighted in red with `**` and a tooltip showing the GUS dev lead. Fuzzy matching tolerates minor spelling differences (e.g. Vashist / Vashisht).
- **Sync confirmation** — Fetch and Push operations now display success/failure confirmation in both the sync bar label ("Fetch complete ✓" / "Fetch failed ✗") and a bottom toast notification.
- **Story-point source label** — Column header "P" renamed to "Google Sheet" for clarity ("Google Sheet · A · C · churn · burn").

### Changes

- **Owner & Priority → read-only** — Owner and Priority columns are no longer editable in the table. Values are sourced from the Google Sheet planning data.
- **Tab rename** — "AI Summarise" tab renamed to "V2MOM Updates - AI Generated" and moved to the last position.
- **Flat row colors** — Method, measure, and epic row backgrounds changed from multi-stop gradients to flat light-blue tones for a cleaner look.
- **Measure row accent** — Left border color changed from purple (#7c3aed) to blue (#3b82f6) for visual consistency with the method row.

### Technical

- Added `Development_Lead__r.Name` to all GUS SOQL queries (`_queryEpicsByIds`, `fetchReleaseData`, `mergeGusLiveEpicFields`, `refreshEpicDataFromGUS`).
- Extracted `renderRiskAssessmentTab()` method from `renderPlanVsActual()`.
- GUS refresh now updates owner mismatch indicators in the DOM after each sync cycle.

---

## v1.0.0-Alpha — 2026-04-15

Initial release with epic tracking, capacity planning, AI summarise, fullscreen mode, and two-way GUS sync.
