## 2.0.0-GA — grouped review and Slack follow-ups

- Multi-select Group by supports Measure (GUS Project), Team, Health/Epic Status, Development Lead and completion bands (0%, 1–24%, 25–49%, 50–74%, 75–99%, 100%, not reported). Multiple choices create nested groups in menu order. Group counts reflect current filters; each group collapses independently. Existing sorting and monthly editing remain available. Grouping is a session display choice and makes no GUS or AI requests.
- Epic expand/collapse controls now appear at the far left. Expand All also reveals collapsed groups.
- Toolbar Slack Nudge prepares follow-ups across all saved epics in selected releases, including uncached epics, with a 500-epic review limit. Missing-month-only is selected initially; uncheck for all assigned epics. Each current Development Lead receives one combined template with every in-scope epic reference. A Lead group action uses exactly that group’s filtered members. Per-epic Slack Nudge remains in the sidebar.
- Follow-up preparation reads current assignments and comments from GUS, honors saved year mappings, separates different lead identities even when names match, and refuses mixed assignments, missing records or oversized Slack text rather than dropping references. No messages are sent by preparation.
- Reminder preview uses Slack mrkdwn: verified user-ID mention, epic links, bold emphasis and progress/risk/next-step prompts. Copy supports rich HTML and plain-text fallback. Copy & open DM includes the resolved workspace ID and user ID, and binds recipient identity across asynchronous clipboard access. No invalid DM link is offered if workspace resolution fails.
- Slack’s documented deep links cannot prefill a composer. The user pastes the copied reminder into the DM, confirms the native @mention and sends. Native mention conversion on paste, production Slack identity, actual DM navigation and production model behavior were not verified. No Slack test messages or production epic edits were performed.

Validation: 163 Node tests and isolated browser checks for grouping, exact group scopes, bulk references, clipboard recipient-change protection, workspace-qualified link generation (mock identity), mobile fit, compact rows/edit/save and monthly AI save. Deployment source must match the reviewed ZIP before promotion.


## 2.0.0-GA — monthly missing-update filter

The review-month updates tile and its footer action now filter the table to fetched epics without a saved draft or parsed GUS update for the selected month. A removable Awaiting month update chip explains the filter; Clear or Escape restores all rows. Changing the review month updates the missing-update filter. Counts and matching use the same saved-draft precedence. Isolated browser checks verify tile/link activation, one missing epic from six fixtures, clearing and Escape. No GUS or AI request is needed to filter.

## 2.0.0-GA — consolidated update, 9 November 2026

- Added source-evidence checks for AI completion, release, production and risk-closure claims. Unsupported model claims use a clearly labeled source fallback; goals and descriptions do not establish achievement. These are conservative heuristic checks, not a semantic guarantee.
- Monthly GUS writes now order updates from oldest to newest, preserving other months, undated notes and supported rich links; unsafe markup ordering fails without publishing.
- Added one Expand All/Collapse All control before fullscreen, applying to visible rows.
- Whole metric tiles filter the epic table by click or keyboard. All footer notes are centered; the version is plain and GOLDEN BUILD is retained only in Git/release metadata.
- Added Slack Nudge in the epic sidebar. It reads the current Development Lead from GUS, prepares a review-month reminder and optionally resolves the lead by GUS email through the host Slack identity helper. Copy/Open Slack requires the user to send the message. The documented host helper cannot send arbitrary direct messages; missing identity capability is shown honestly. No automated reminders or test Slack messages were sent.

Validation: 156 Node tests, deployment unit checks, and isolated browser checks for controls, Fetch/reload and monthly AI save. The Slack browser check uses a mock identity response; production Slack lookup and native LLM quality were not verified. Production epic comments were not edited during testing.


# 2.0.0-GA · GOLDEN BUILD — monthly comment headings

Fixed Fetch display for engineer headings such as November comments - and September comments -. Also recognizes comments/notes/reports variants, preserves older undated notes separately, and keeps source wording intact. No AI regeneration or GUS field rewrite is required to display fetched comments.

---

# 2.0.0-GA · GOLDEN BUILD — release-selection guidance

When releases are available and none is selected, a brief animated arrow highlights the selector. It settles to static guidance after four seconds and disappears on selection. Reduced-motion support, full mobile labels and no extra GUS/AI calls are verified. Folded into the current GA golden baseline at the user’s request.

---

# 2.0.0-GA · GOLDEN BUILD — consolidated update

At the user’s explicit request, all recent changes are folded into the canonical GA release:

- Reported AI token notifications for executive, consolidated and monthly summaries.
- Generate actions first, Copy last.
- Release Intelligence as parent heading; Core Foundation Services / Release Review below.
- Centered expand/add icons and right-aligned dropdown labels/chevrons.

The earlier canonical GA source and exact archive are preserved as GOLDEN-BUILD-2.0.0-GA-original and releases/2.0.0-GA-original/. The refreshed canonical GA tags identify this consolidated baseline. Shared GUS data is preserved.

---

# 2.0.3 — Product heading and CFS context

Release Intelligence is the parent header. Core Foundation Services / Release Review appears below; Foundation replaces Foundational in current wording. Desktop, mobile and tablet visibility checked. Golden rollback baseline remains 2.0.0-GA.

---

# 2.0.2 — Executive action order

Generate summary → Generate V2MOM Method Summary → Copy leadership update. Actual DOM order also provides the matching keyboard sequence. Desktop/mobile layout verified; business logic is unchanged. Golden rollback baseline remains 2.0.0-GA.

---

# 2.0.1 — AI usage notifications

Executive, consolidated V2MOM and explicit monthly-summary generation now show operation-level reported token usage in a top-right five-second/× notification. Counts include input, output, cached prompt tokens and automatic correction calls. Missing counts are labeled unavailable; no token estimates or costs are invented. Read-only views and polling do not generate these notices.

The immutable GOLDEN-BUILD-2.0.0-GA baseline and its recovery archive remain unchanged.

---

# 2.0.0-GA · GOLDEN BUILD

Release Intelligence is the user-designated stable rollback baseline. It replaces the older Pages dashboard with a release entry point linked to the authenticated GUS Apps application.

This release includes the consolidated V2MOM summary fixes, consistent evidence validation for measure identifiers and epic goals, method-specific AI instructions, per-team results with explicitly labeled source fallback, and the naming cleanup. Earlier working monthly updates, shared saves, compact views and shortcuts are retained.

Validation: 135 Node tests and isolated browser method, monthly AI and Escape checks passed. Production AI output was not independently verified. Detailed limitations remain in `docs/verification.md`.

Use the exact archive and SHA-256 in `releases/2.0.0-GA/`. Rollback steps are in `docs/GOLDEN_BUILD.md`. Tags `v2.0.0-GA` and `GOLDEN-BUILD-2.0.0-GA` must remain immutable.
