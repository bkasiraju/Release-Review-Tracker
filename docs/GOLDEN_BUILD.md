# 3.0.0-GA · GOLDEN BUILD

The user designated 3.0.0-GA as the current preferred recovery baseline on 10 November 2026. At the user’s explicit request, the canonical 3.0.0-GA was consolidated with the light-tooltip patch and independent Compact/Full Updates versus expansion controls. Its earlier exact archive is preserved at releases/3.0.0-GA-original/ and GOLDEN-BUILD-3.0.0-GA-original. The private dataset snapshot is unchanged. It includes all changes through the shared executive delta cache, hourly evidence validation, status/review workflow, icon-only exceptions, Completed exemption, and consistently aligned GUS links. This is a user-designated recovery reference; verification limits remain documented below.

## Immutable application baseline

- Tags: `v3.0.0-GA` and `GOLDEN-BUILD-3.0.0-GA`
- Exact application ZIP: `releases/3.0.0-GA/cfs-release-review-tracker.zip`
- SHA-256, review and deployment metadata: `releases/3.0.0-GA/`
- Production: https://gus-apps.internal.salesforce.com/applets/cfs-release-review-tracker/

Preserve these tags and artifacts for future recovery. Earlier `v2.0.0-GA`, `GOLDEN-BUILD-2.0.0-GA`, original tags and archives remain unchanged. They are older recovery options, not the current preferred baseline.

## Backend — GOLDEN Dataset

The complete shared GUS Apps backend was captured separately as a private Salesforce ContentVersion file named **Release Intelligence Backend - GOLDEN Dataset - 3.0.0-GA**. It contains materialized release/epic/settings records and the complete app journal, including deleted release entries, drafts, comment history and stored source fields. Two identical journal reads established a stable capture. The uploaded compressed file was downloaded again and verified by SHA-256 and parsed dataset equality.

Public metadata/checksum is in `GOLDEN_DATASET.json`. The private recovery manifest, authenticated Salesforce file link and additional local copy are under `.local/golden-datasets/3.0.0-GA/`. Dataset contents, Salesforce record IDs and credentials must never enter Git or Pages. The backup created no anonymous download link or new organization-wide share. It preserves saved dashboard data, not an independently queried backup of every underlying Salesforce object or attachment.

## Application recovery

1. Preserve unrelated work. Obtain the exact ZIP and checksum from the 3.0.0-GA release or an isolated checkout of `GOLDEN-BUILD-3.0.0-GA`.
2. Verify the archive SHA-256 against `build.json`. Use the stored ZIP; rebuilding can change ZIP timestamps.
3. Upload that archive and complete GUS Apps review/promotion for the existing slug. Staging alone is not activation.
4. Verify activation and connection/footer version `3.0.0-GA`, then the affected workflow.

Application rollback must preserve live GUS records, comments, releases, drafts and journal history. Never automatically restore the dataset during code rollback: that could discard newer legitimate user work. Dataset restoration requires explicit authorization at restore time, a new pre-restore backup and compatibility checks. Prefer selective recovery through normal backend save paths; preserve the private snapshot as immutable evidence.

## Verification

Focused cache/executive tests and isolated browser checks cover prior feature changes. The 3.0.0-GA release additionally checks private snapshot integrity, application version and GUS icon alignment. Actual production backend journal capture/upload/readback was verified. Actual production model generation was not reverified. See `docs/verification.md` for detailed scope. A GOLDEN designation does not imply untested production behavior was verified.
