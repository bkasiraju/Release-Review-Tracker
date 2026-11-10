# Executive delta cache

Successful epic and measure/team summaries are persisted as shared GUS Apps settings records using the existing authenticated ContentVersion store and its sharing policy. Page reloads and other users can reuse the same validated analysis. No epic comments are changed by caching or generation.

Source evidence has a one-hour validation window. Fresh shared dashboard epic data is reused; older data is checked against GUS. Work evidence is checked hourly and after a manual epic refresh. Direct dashboard comment/health/recovery edits invalidate source snapshots immediately. An hourly check does not itself cause an AI call: an unchanged content fingerprint reuses the previous successful paragraph.

Analysis identity includes review month, summary-rule version, exact comment/health revision, relevant epic context, goals, recovery information and scoped work evidence. Storage revisions, fetch timestamps and incidental modified timestamps do not represent delivery changes. Work status or description changes detected during validation invalidate the affected analysis. Existing factual, phase, date and metric checks apply before a generated paragraph is saved to the cache.

Consolidation identity includes measure, team, epic membership and the successful epic analysis fingerprints. One changed epic regenerates that epic and affected consolidation only. Unaffected summaries are reused. Failed/unsupported responses never become ready cached prose. Cache writes recheck membership, local evidence and consolidation dependencies to reject stale results. The rule-version constant must change when summary-generation rules change.

A bounded page-session memo provides reuse if shared cache persistence is temporarily unavailable. Concurrent users may both generate the same uncached result; this is content-addressed reuse, not an atomic distributed generation lock. Reported AI usage reflects actual SDK calls only; cache-only operations do not emit token notifications.
