# 5.1.1-GA · PLATINUM BUILD (master build)

Designated 15 November 2026 as the best working, master build. Tags `v5.1.1-GA`, `PLATINUM-BUILD-5.1.1-GA`; ZIP and SHA-256 (`834238937c16ff99aa628b921efb25cbd9828f7a75f2110b9c8e2ad7e83d7a80`) in `releases/5.1.1-GA/`. Revision 20261115-67.

Only two rollback builds are maintained:

1. **PLATINUM — 5.1.1-GA** (`PLATINUM-BUILD-5.1.1-GA`): first choice for any rollback.
2. **GOLDEN — 5.0.0-GA** (`GOLDEN-BUILD-5.0.0-GA`, frozen at revision 20261115-65): second choice.

To revert: deploy the exact ZIP from `releases/<version>/` (verify its checksum against `build.json`), then confirm the footer shows the matching version. Application rollback must preserve live GUS data.

Includes everything in 5.0.0-GA plus the GUS open-link icon on the active tab and: unassigned workstreams stay in an highlighted Unassigned allocation row, workstream effort as the only allocation baseline with ABL only for ATL-tagged workstreams, delta-only Save to GUS with a reviewed summary and duplicate guards, distinct project colour bars, fixed Open TFs / Test Failures table widths, WS Est before Epic Est, calmer page loads without bounce, and faster planner reference loads.
