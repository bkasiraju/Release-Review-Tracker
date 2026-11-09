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
