# 2.0.0-GA · GOLDEN BUILD

The user designated this release as the best working build and stable rollback baseline on 9 November 2026. This consolidated build includes the summary fixes, AI token usage notices, generation/copy order, parent heading swap, Core Foundation Services wording, centered expand icons and right-aligned dropdown triggers. The user explicitly requested folding all changes into GA on 9 November 2026. This designation does not remove the verification limits documented in `verification.md`.

## Immutable baseline

- Version: `2.0.0-GA`
- Git tags: `v2.0.0-GA` and `GOLDEN-BUILD-2.0.0-GA`
- Packaged application: `releases/2.0.0-GA/cfs-release-review-tracker.zip`
- SHA-256 and deployment metadata: `releases/2.0.0-GA/build.json`
- Production: https://gus-apps.internal.salesforce.com/applets/cfs-release-review-tracker/

The pre-consolidation baseline is preserved at `GOLDEN-BUILD-2.0.0-GA-original` and `releases/2.0.0-GA-original/`. The canonical GA tags were moved only for this explicit consolidation request. Do not replace these tags or overwrite the consolidated archive when shipping future versions. Future release notes should retain this as the preferred recovery target until the user explicitly designates a replacement.

## Recover from a later regression

1. Preserve any unrelated working changes. Create an isolated checkout of `GOLDEN-BUILD-2.0.0-GA`, or download this release's ZIP and checksum from Git.
2. Verify the stored ZIP's SHA-256 matches `build.json`. Use the stored ZIP for byte-identical restoration; rebuilding from a checkout can produce different ZIP timestamps.
3. Upload that exact archive through the GUS Apps applet deployment screen. Complete the platform's required build review and promotion flow for `cfs-release-review-tracker`. Do not confuse staging/upload with activation.
4. Verify activation and the connection version `2.0.0-GA` in a signed-in GUS Apps session, then check the affected workflow. Record the rollback result.

Rollback restores application files only. Preserve all GUS epics, monthly comments, releases, drafts and shared journal history. Never run a destructive Git reset over a user's working changes. If a future release changes the shared data format, assess compatibility before rollback rather than discarding data.

## Verification scope

The consolidated GA source passes 138 Node checks plus isolated browser checks for consolidation recovery, monthly save/reload and Escape shortcuts. The deployed source is compared with the reviewed artifact. Full production model output and live authenticated backend behavior were not re-verified for this branding release; see the detailed verification record. Live automatic list-column metadata remains dependent on central GUS Apps capabilities.
