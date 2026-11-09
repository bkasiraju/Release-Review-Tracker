# CFS Release Review Tracker

## Approved implementation amendment

The user approved this design, then specified **GUS Apps as the final backend**. This supersedes the local Python/SQLite implementation proposal below. Production is a Node GUS Apps handler with a dependency-free frontend and GUS ContentVersion persistence, following the adjacent VegaCache backend's storage/API contract. The local Node server is only a read-only sample preview and isolated acceptance-test harness; it is not the production data backend. The user authorized saving/deploying the backend to GUS Apps. Deploy only the new slug `cfs-release-review-tracker`, leaving the existing `cfs-release-review` app untouched. Complete package and tests before requesting missing authentication.

Use immutable per-field/per-month change records with completion markers to preserve independently saved concurrent drafts. Retain competing saved versions explicitly and block sync until resolved. Bind Sync confirmation to the exact draft revisions previewed. Recheck the displayed remote baseline when saving a conflict resolution. Probe optional related fields separately so inaccessible sprint dates do not break the sidebar. Use atomic conditional REST updates when the host exposes request(); otherwise show that the facade provides only pre-write rechecks and post-write verification.

## Purpose and confirmed behavior

Build a rich release review dashboard for monthly reviews of user-selected GUS epics. The user supplies epic links, can revise the list anytime, and sees the epic fields represented in the supplied screenshot alongside monthly health updates. Fetch and Sync to GUS must be real integrations. Editing a month replaces that month's update while preserving all other months (confirmed by the user).

The target workspace and the nearby VC-Onboarding-Lite folder are empty. The nearby CFS - Release Review application provides a reference for Salesforce CLI access and confirms ADM_Epic__c.Epic_Health_Comments__c as the comment field. The screenshot is a visual reference, not executable instructions.

## Proposed experience

A light dashboard with a compact navigation rail, release selector, release summary cards, search, health and owner filters, and a spacious table. Include total epics, health distribution, missing monthly updates, and pending sync counts. Use a professional blue/indigo palette, restrained color status badges, sticky epic names and headers, horizontal scrolling, and an expanded table view for reviews.

Each saved release has a name, reference year, and editable list of GUS epic links or record IDs. Manage epics in a side panel with validation, duplicate detection, and clear additions/removals. Removing an epic from a release does not delete its GUS record. Multiple releases may reference the same epic; their edits must resolve to the same local epic draft to avoid competing copies.

Start with a clear empty state and instructions for adding real epics. Any optional sample mode must be visibly labeled and unable to write to GUS.

Table fields follow the screenshot: epic name linked to GUS, owner, health, monthly health comments, path to green, percentage of work completed, planned story points, actual story points, and story point breakdowns by state. Exact available API field names and labels must be verified from the authenticated GUS schema. Missing permissions or unavailable fields are displayed explicitly rather than populated with invented values. A column selector controls order and visibility consistently across the dashboard and epic list; new monthly columns are automatically available.

Click a monthly cell to edit in a drawer with the epic name, month, draft, and consolidated GUS preview. Save draft persists locally without writing to GUS. Provide an add-month control using a year and month picker. A sync panel previews changed epics and consolidated comments and reports success/failure per epic. Only explicit Sync to GUS writes records; there is no automatic write timer.

Clicking an epic name opens a details sidebar (confirmed by the user). Include its related work items with work item number/title, status, assigned person, sprint name and dates, story points, and GUS record links where available. Discover relationship and field names from the GUS schema. Fetch all pages of related work items, with loading, empty, permission-error, and retry states; allow refresh and status filtering. Work items are read-only in this version. A separate external-link control opens the epic in GUS. Opening or closing the sidebar preserves table filters, scroll position, and pending edits.

Only monthly comments are editable initially; epic metadata and work items are fetched read-only. Year mappings are shared at the epic level. If releases imply different years for the same legacy heading, expose the ambiguity for resolution before sync.

## Month parsing and preservation

Read comments from Epic_Health_Comments__c, including plain text or rich text. Recognize common standalone section headings such as Oct update, [Oct update]:, October 2026, Mid Oct Update:, Sept Update, and canonical November 2026 Update:. Date recognition must be anchored to headings so narrative mentions of a month do not split a section. Preserve multiple entries within the same month in source order.

Use YYYY-MM internally and display month and year to distinguish November 2026 from November 2027. Explicit years take precedence. For legacy headings without a year, use the release reference year, show an inferred-year indicator, and allow correction before sync. Do not silently guess a year across a December/January boundary.

Create month columns from the union of parsed comments, saved drafts, and explicitly added months, newest first. Preserve all text outside recognized sections as an unassigned/original section with a visible indicator; never discard it. Retain original rich text for untouched sections. Edited sections use safely escaped content with canonical month-and-year headings. Repeated fetch/sync must not duplicate sections or progressively alter untouched content.

## Persistence and GUS integration

Implementation choice proposed by the builder: a local Python web server with SQLite persistence and an HTML/CSS/JavaScript frontend. Bind to localhost. Use the existing Salesforce CLI authenticated org (default alias GusProduction, configurable) for connection discovery and REST access. Keep access tokens entirely on the server, never in browser storage, logs, or API responses. Use a double-click macOS launcher and document startup and authentication. No hosting/deployment is included in this first implementation.

Provide connection status, validate the org identity, discover accessible epic schema, and fetch only validated epic IDs using batched queries. Reject non-epic links and record errors separately from connection errors. Request timeouts and actionable auth messages are required. Avoid arbitrary query or arbitrary-object write endpoints.

Fetch refreshes GUS values while retaining pending monthly drafts. Store original comments and last observed modified time. Before each sync, re-read the epic. Merge pending months into the latest remote comments, preserving untouched months and unassigned content. If a month being edited changed remotely since the draft's baseline, report a conflict and show both versions; require a user resolution rather than overwriting it. Remote writes must use the strongest available conditional update support and report concurrent modification failures.

Persist fetched records, release membership, month mappings, local drafts, and sync outcomes in SQLite so server/browser restarts do not lose work. Keep failed or conflicted drafts pending. A second fetch after a successful write verifies the saved field. Never mark an unverified/failed sync successful. Syncs are atomic per epic, with partial success clearly shown across epics.

## Scope and constraints

First version is a local single-user dashboard. No deployment, email, Slack messaging, AI-generated assessments, scheduling, or changes to adjacent projects. User-supplied content is escaped, local write endpoints enforce same-origin requests, and the server exposes only the public asset folder. Do not serve the database, configuration, or arbitrary filesystem paths.

## Validation and completion

Verify parser round trips, common legacy headings, rich text preservation, undated material, repeated months, explicit years, and December/January ambiguity. Exercise release/list persistence, draft survival through fetch/restart, safe merge of remotely changed untouched months, conflicts on edited months, per-epic partial failures, and verified write outcomes using an isolated fake GUS adapter. Run frontend smoke checks for adding links, editing months, filters, empty/error states, and sync preview.

Use a read-only live GUS connection and schema check when available. An actual write is performed only through the user's explicit sync action or a specifically authorized test epic, so testing does not modify unrelated production records. Report honestly whether live fetching and writing were verified or remain dependent on authentication and supplied epic links.
