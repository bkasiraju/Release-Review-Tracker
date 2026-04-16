# CFS Release Review Tracker

**264 Release planning dashboard for Caching Services** — VegaCache, MAPS & MQ teams.

Tracks epics, workstreams, capacity, and health across the release with live GUS sync.

## Features

- **Epic Tracking** — Full table view of all epics grouped by V2MOM method and measure, with health status, story-point delivery bars, monthly comments, and scope-churn signals.
- **Capacity Planning** — Per-engineer planned vs actual story-point allocation with burndown charts (ECharts, Salesforce Sans font).
- **Risk Assessment (AI Generated)** — Automated planning and release-execution risk analysis derived from epic health, story-point churn, and sprint coverage.
- **V2MOM Updates (AI Generated)** — LLM-generated monthly summaries per V2MOM method using epic health comments and delivery metrics.
- **Live GUS Sync** — Two-way sync engine: fetch epic data (health, SP, comments, Development Lead) from GUS and push edits back. Auto-sync with configurable interval (15 s – 2 min). Success/failure confirmation in the sync bar and toast notifications.
- **Owner Mismatch Detection** — Owner column displays the Google Sheet planning value (read-only). If the GUS Development Lead differs, the cell turns red with `**` and a hover tooltip showing the GUS name. Fuzzy name matching tolerates minor spelling variations.
- **Fullscreen Mode** — Zoom button expands the epic table to a fullscreen overlay with month toggles and sync controls.
- **Story-Point Source Labelling** — "Google Sheet · A · C · churn · burn" column header clarifies data provenance.

## Environments

| Environment | URL | Fetch/Push to GUS |
|---|---|---|
| **GUS-Apps** | `https://gus-apps.internal.salesforce.com/applets/cfs-release-review` | Yes — uses logged-in user's Salesforce session via backend proxy |
| **GitHub Pages** | `https://bkasiraju.github.io/Release-Review-Tracker/public/` | Yes — connects to local `server.py` proxy on port 8282, or uses the Salesforce CLI (`sf`) session |

## Project Structure

```
index.html            # Root dashboard (GUS-Apps serves from public/)
public/index.html     # GitHub Pages / GUS-Apps public bundle
backend/index.js      # GUS-Apps backend — SOQL query/DML proxy
manifest.json         # GUS-Apps applet manifest
server.py             # Local dev server (port 8282) — proxies SOQL via sf CLI
scripts/
  deploy-gus-apps.sh  # Package & deploy to gus-apps
  sync-branches.sh    # Fast-forward master to main
  dev.sh              # Start local dev server
```

## Deployment

### GUS-Apps

```bash
bash scripts/deploy-gus-apps.sh
```

Requires an active Salesforce CLI session: `sf org login web -o GusProduction`

### GitHub Pages

Push to `main` on the `github` remote. The `public/` directory is served at the Pages URL.

```bash
git push github main
```

### Local Development

```bash
python3 server.py   # starts on http://localhost:8282
```

## Version

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for the full changelog.
