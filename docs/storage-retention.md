# Bounded journal reads and retention

Releases and monthly drafts are reconstructed from an immutable journal. Applying a rolling age cutoff to the current journal would discard earlier months and can also remove the original baseline used to detect conflicts. This release therefore retains history and bounds active reads instead of silently expiring records.

## Active read strategy

- Workspace enumeration selects only grouped `Title` values, up to a single 2,000-result aggregate batch. It no longer transfers every historical Description across every epic merely to discover saved records. At the batch boundary, loading stops with an archive-maintenance message rather than hiding records. Aggregate queries never call queryMore.
- Each entity loads at most 10,001 journal rows. The extra row is a sentinel: if more than 10,000 rows are needed, decoding is refused with an explicit maintenance message. A truncated journal is never accepted as complete state.
- Entity journals load in batches of four, bounding concurrent requests.
- Earlier month content remains available regardless of age. No ContentVersion record is deleted or modified by this retention change.

## Archive strategy

Before an entity reaches the journal limit, schedule a maintenance window and pause writes to that entity. Export the exact-title history including all chunks and commit records, replay it, and verify the reconstructed release, original comments, monthly drafts, year mappings, and stored conflicts against the dashboard. Keep that export as the recoverable audit archive.

An administrator can then use a verified full-state checkpoint as the new active history and move the pre-checkpoint records to a separate archive namespace. This must be done while writes are paused so no in-flight change falls between the checkpoint and the archive boundary. Verify the new active state against the export before resuming writes. Keep the original archived records until the organization's retention policy permits removal.

Automatic pruning/checkpoint rotation is intentionally not performed by this version; this document describes the safe maintenance policy. The implemented read limits stop growth from causing unbounded application reads, and errors preserve existing records. Introducing automatic rotation requires an atomic checkpoint/active-generation mechanism on the GUS host; a timestamp filter alone is unsafe for this change journal.

Salesforce documents the aggregate-query pagination restriction in its [GROUP BY considerations](https://developer.salesforce.com/docs/platform/salesforce-soql-sosl/guide/sforce-api-calls-soql-select-group-by-considerations.html).
