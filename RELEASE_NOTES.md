- Removed the "GUS Apps Hub" footer link; added "For feedback, reach out to Bhanu Kasiraju" at the end of the footer. The 5.0.0-GA golden build is unchanged.

## 8.0.0-GA · GOLDEN BUILD

Designated by the user on 22 November 2026 as the GOLDEN BUILD and rollback baseline. It is 7.0.121-GA: two-way GUS sync, compact review table and full screen, flicker-free refresh, ATL/BTL tiles, and the Slack nudge changes. Any further changes are folded into 8.0.0-GA only; no new version numbers. The earlier 7.0.0-GA golden stays immutable.

### 8.0.0-GA r65 (folded)

- Audit log: removed the "No changes recorded" block (empty periods show zero tiles instead), and the Release Health Metrics section no longer appears under the audit page.

### 8.0.0-GA r64 (folded)

- **Audit log** (hidden page, open it at `#audit-log`; it has no tab, tile or menu entry). Per team: who changed what and when. A dashboard shows Changes, People, Areas touched and Latest change, plus By area, By person, Activity by day (weekly for 90/180 days), By team (All teams only) and the latest changes. Double-click (or Enter on) any tile, bar, day or row for the full list with search and area/person filters; Esc closes it.
- Recorded: release plan edits and saves to GUS, epic/workstream/project changes, GUS record updates, Release Review changes (status, path to green, drafts, publish, releases, settings), sprint actions, team settings, and Slack/Chatter/comment posts (the fact that they were sent, never the message text). Autosaves by the same person within 10 minutes are merged (×count).
- Kept 180 days (latest 1,500 events per team). Events are recorded from this deployment onward; earlier changes are not backfilled. Release Review changes are not tied to one team and appear under "Release reviews (shared)". Recording is best effort and never blocks or fails the change itself.

### 8.0.0-GA r63 (folded)

- Review deck: the Home / Epics / Filter controls moved from the dark top-right corner (where they were invisible) into the bottom action bar, with the filter panel opening above it.

### 8.0.0-GA r62 (folded)

- Review/epic deck: the Epics index and workstream tables no longer get the host page's auto-fit, sort arrows (↕) or pager, which pushed the Health column past the right edge. The deck's tables are now opted out and fixed to the slide width.
- Review deck: top-right controls with labels: **Home** (first slide), **Epics** (the list), **Filter** (by status, owner or theme; slides show only the matching epics; options narrow to what the other filters allow). **Esc** clears all filters first, and closes the deck only when none are active.
- Release Planning: **Present** and **Download deck** now sit after the **Pull from GUS / Save to GUS** buttons. Release Review uses the same icon buttons ("Present", "Download deck").

### 8.0.0-GA r61 (folded)

- Epic review deck: **Refresh** button re-reads the latest data while presenting and redraws in place (same slide and view; your notes and asks are kept). In the planner it reads the linked epics from GUS read-only (health, dates, goal, name, priority, story status) and never changes the plan; on the Release review page it runs the same GUS fetch as the Fetch button. Downloaded decks stay static.

### 8.0.0-GA r60 (folded)

- Review deck footer shows the build commit (short id, with "+" if built from uncommitted changes), taken from a `build.json` stamp the packager adds to the deploy zip. The review deck line-clamp now starts from the tallest update card.
- Review deck cover: plain white slide with the same blue side bar as the other slides (no blue gradient), and `deck.js` is now loaded with a revision-specific URL so browsers refetch it instead of showing a cached older cover.
- Review deck: text before the first monthly heading is now shown as a Status update card instead of being dropped; an Outcome written on the line after "Outcome:" is picked up; the plain-comment fallback is also cut with a pointer to GUS; heading and label matching no longer backtracks on long whitespace.

### 8.0.0-GA r59 (folded)

- Review deck: monthly update text is never clipped silently. If an update does not fit its card, it is cut at the last line that fits and the card says "Continues in the epic comments in GUS" with a link to the epic.

### 8.0.0-GA r58 (folded)

- Monthly review deck: the epic slide now shows the **Outcome** in a highlighted banner and the full text of the two latest monthly updates (for example November and October) side by side, with Outcome/Progress, Blockers and Next steps labelled; older months are noted. Nothing is truncated any more. Long workstream names are limited to two lines.

### 8.0.0-GA r57 (folded)

- Epic review deck layout: the cover is now light with dark text (no blue gradient); the Epics index is paginated (15 per page, so no epic is dropped) with fixed columns; the host's column-filter rows no longer appear inside the deck; workstream names wrap when there is room.

### 8.0.0-GA r56 (folded)

- Epic review deck: **Share to Slack** posts a text summary (health counts, one line per epic, asks) to a channel you choose each time: a configured team channel or a pasted link/ID. It asks for confirmation before posting, and the HTML file is not attached.

### 8.0.0-GA r55 (folded)

- Epic review deck: **Edit notes** adds a presenter note to each epic and an Asks & Decisions slide. In the planner they are saved with the plan; on the Release review page they are kept in this browser. Downloaded decks include them.

### 8.0.0-GA r54 (folded)

- New epic review deck: a slide template written once (`deck.js`) and filled from data. It has a title, an at-a-glance slide, an epic agenda, one slide per epic (workstreams, owners, effort, progress, checks) and a wrap-up of gaps or risks. A Planning view and a Monthly review view (progress, status update, path to green, risks) share the same template.
- Buttons: Present and Download deck in the planner toolbar; Present, Planning deck and Monthly review deck in the Release summary; Present and Review deck in the Release review. Download saves one self-contained HTML file that opens offline.

### 8.0.0-GA r53 (folded)

- Pull from GUS now always picks up a rename of a linked project (for example GCP Migration → GCP). The dashboard shows linked project titles as read-only, so a baseline recorded after the rename can no longer hide it.
- The GUS project read is split in two, so an unreadable extra field can no longer hide a project's title, method and program; a failed read is now reported in the Pull dialog.
- The "Synced from GUS" status moved to the top header, before the Team dropdown.

### 8.0.0-GA r52 (folded)

- When Pull from GUS finds nothing to apply, a "What was checked" section lists every dashboard project with its GUS link, the name GUS returns and its program, so a project that is not linked or not returned by GUS is visible.

### 8.0.0-GA r51 (folded)

- A visible sync indicator next to Pull from GUS shows "Syncing from GUS…", the last sync time and how many items were updated, or a failure.
- Fix: a GUS rename of a project (for example "GCP Migration" to "GCP") was missed when it happened before the dashboard had a baseline for it. Project title/method and epic name/project/release differences are now pulled even on first sight; other fields still start from a quiet baseline.

### 8.0.0-GA r50 (folded)

- The "what to sync" screen is tidied: two aligned columns, checkbox then label on the left, a plain collapsed Workstreams section.

### 8.0.0-GA r49 (folded)

- Pull from GUS first asks what to sync: Project and Epic are shown with their critical fields ticked (project title, method, program/move, link; epic name, project, release, owner, priority); Workstreams are collapsed (name, days, owner, new/linked ticked; status optional). SMART goal and description are offered unticked. The choice is saved with the team's plan and also drives the automatic sync.

### 8.0.0-GA r48 (folded)

- Pull from GUS only lists (and the automatic sync only applies) fields whose GUS value changed since the dashboard last saw them. Differences that already existed (for example story status, owner or days on imported user stories) are recorded as the starting point and no longer listed.

### 8.0.0-GA r47 (folded)

- Automatic GUS-to-dashboard sync never overwrites a dashboard edit. A field is pulled only when GUS changed since the dashboard last saw it (a stored baseline per field) and the dashboard value still equals that baseline; if the dashboard value changed (pending or saved), or both sides changed, it is left alone and only listed in the manual Pull dialog.
- Pull dialog columns line up: the filter row sits under each column header with fixed column widths (the filter classes had collided with the summary filter bar styles, which is also fixed).

### 8.0.0-GA r46 (folded)

- Pull from GUS is quiet: GUS-only fields (project summary/health/manager/ranking, epic health/dates/success criteria) are copied onto the dashboard silently instead of being listed (the first pull used to list 203 of them). The automatic GUS-to-dashboard sync now also applies project program/link, epic owner, priority, SMART goal, description, new user stories and story status, so GUS changes reflect on the dashboard like dashboard edits reach GUS. Only moving a project to the team program (which edits GUS) still needs a tick. Filter row in the Pull list no longer overlaps.

### 8.0.0-GA r45 (folded)

- Pull from GUS finds projects that the team's dashboard epics use in GUS but that sit in another program, and offers (per project, on tick only) to link the epic's dashboard project to it and move it into the team's program. Refused if another team's epics use it.

### 8.0.0-GA r44 (folded)

- A dashboard project that sits outside the team's GUS program is offered in Pull as "Move project to this team's program (edits GUS)"; applying it sets the project's Program in GUS to the team program. Refused when another team's epics also use the project, and never done automatically.
- User stories without the "WS:" prefix now also compare name, owner and status (GUS status mapped to Planned / In Progress / Completed / On Hold), besides days.

### 8.0.0-GA r43 (folded)

- Workstreams and GUS user stories are the same thing on an epic. The "WS:" title prefix only marks the ones created from the dashboard; user stories filed directly in GUS on an epic are compared by the same delta rules (matched by story link, GUS id or name, linked quietly, only new or changed ones listed) for dashboard-created epics as well as imported ones.

### 8.0.0-GA r42 (folded)

- The Pull from GUS list has inline filters under the column headers (item, field, dashboard value, GUS value), Select all / Unselect all that act on the rows currently shown (full or filtered view), a header tick box, a shown/ticked counter and an Apply count.

### 8.0.0-GA r41 (folded)

- Pull from GUS now reads and compares the real GUS fields: project summary, health, manager and V2MOM priority/ranking (PPM_Project__c); epic health, planned start/end and success criteria (ADM_Epic__c); and story status and points (ADM_Work__c). Values are stored as plain text, length-limited, and only changed values are listed.
- Workstreams already on the dashboard are never re-imported: a GUS story is matched by its story link, its GUS id or its name, linked quietly, and only genuine differences are listed. Only stories missing from the dashboard show as new.

### 8.0.0-GA r40 (folded)

- Pull from GUS compares much more. Projects: title, V2MOM method and program; dashboard projects not yet linked are matched to the team's GUS project by name and linked (the GCP vs GCP Migration case). Epics: name, project, release, owner (development lead), priority, SMART goal, description (when written on the dashboard) and the estimate of an epic that only has the placeholder. Workstreams: name, owner and days, new and removed ones, now also for imported epics (compared by GUS story). Everything is listed for you to tick; nothing is applied silently, and applying saves to the shared plan.
- A linked project whose GUS record sits outside the team's program no longer makes Pull report that everything matches: its title and method still refresh, and the program difference is listed.

### 8.0.0-GA r39 (folded)

- Projects stay inside the team's own program. Epic search and Add existing epic only return this team's epics, and an epic whose project belongs to another program is added without that project. Pull from GUS and refresh never bring in another team's project, and project pickers list only the team's program.
- New projects are always created in the team's program and used only for that team's epics. A different program name, or an existing project outside the team's program, is refused with a clear message.

### 8.0.0-GA r38 (folded)

- Theme now sits right before Priority in the default planner column order (Theme was after Epic Name). Browsers with a saved column layout are moved once, so Theme also lands before Priority there; later reordering is kept.
- Epic Name column narrowed (28% to 21%) and Workstream widened (28% to 35%) so workstream names have more room (r37).

### 8.0.0-GA r36 (folded)

- Theme is now required on every epic: a required Theme field in Add epic (both "Create new epic" and "Add existing GUS epic", with suggestions from themes already used), a red "Theme (required)" cell in the planner table for epics without one, and "Theme is required" as a blocker when saving to GUS (epics of other teams excepted). The Theme cell stays editable on each row and auto-saves with the plan as before; auto-save itself is never blocked.

### 8.0.0-GA r35 (folded)

- Planner table: the Theme header is left-aligned again (Priority and Actions stay centred), and Theme now sits right after Epic Name in the default column order and in the column chooser. A column order you saved in your browser is kept.

### 8.0.0-GA r34 (folded)

- Planner table: the Priority, Theme and Actions column headers are centred.

### 8.0.0-GA r33 (folded)

- Dragging a workstream that is already a story in GUS into another epic now moves it in GUS too (new action plan-move-workstream re-parents the story), so Pull from GUS no longer brings it back under the old epic as a copy. If the target epic is not in GUS yet the move is refused with a hint; if GUS rejects the move the workstream is put back.
- The workstream row button is now a clearly red "Delete workstream" (circle with ×).

### 8.0.0-GA r32 (folded)

- The in-app "Unsaved changes" prompt (Stay / Leave) now also guards the V2MOM import wizard, the Add/Edit action item dialog, the Nudge message dialog (edited, unsent text) and the legacy drawer / Path to Green popup; native browser confirms there (and on Remove team) were replaced with the in-app dialog.

### 8.0.0-GA r31 (folded)

- The unsaved-changes prompt in planner dialogs now uses the in-app confirmation dialog (Stay / Leave) instead of the browser's native popup.

### 8.0.0-GA r30 (folded)

- Planner dialogs (create/add epic, project, move epic, etc.): after you type in a field, clicking outside the dialog, pressing Esc, × or Cancel asks "You have unsaved changes. Leave without saving?" instead of silently discarding your input.

### 8.0.0-GA r29 (folded)

- Pull from GUS: when a project's title changes in GUS, the dashboard's short label now follows it (unless it was customised), and a project line no longer shows a doubled code such as "GB M3.4.1 – M3.4.1 - …".

### 8.0.0-GA r28 (folded)

- V2MOM import: re-importing adds only the delta. A measure already on the dashboard (same project id, short form or name, hidden ones included) is skipped and left unchanged: no new GUS project, and its name, short form and method are never overridden. The result summary reports new vs. unchanged.
- V2MOM import: a tab named M<n> is always method M<n> (a title cell naming another method no longer relabels it); up to 30 method tabs can be read.

### 8.0.0-GA r27 (folded)

- Planner table: the Theme column is wider (190px) so theme values are readable; Epic Name and Workstream take slightly less width so the later columns sit closer to the left.

### 8.0.0-GA r26 (folded)

- Importing an existing GUS epic now brings in the user stories already on it as workstreams (name, owner, days from the story's planned days or story points), read-only: they are never renamed or written back to GUS, and the "Planned in GUS" placeholder is used only when the epic has no stories.
- Repaired GOLDEN_BUILD.json and releases/8.0.0-GA/build.json, which had been committed empty since r18 (restored from r17 with the current revision and checksum).

### 8.0.0-GA r25 (folded)

- Live sync: when GUS Apps answers "Could not verify who you are (identity unavailable)", the background refresh now retries once after 8 seconds, then pauses live sync for 10 minutes with a single clear message (reload to sign in again) instead of repeating the error every minute. The last known data stays on screen. Any successful refresh clears the pause.

### 8.0.0-GA r24 (folded)

- Add existing GUS epic: the Planned release field now applies in this mode too. An epic of the team brought in from an earlier release (e.g. 266 into 268) has its Planned Release updated in GUS to the chosen release, and its Scheduled Build set to the build named after the release number (268), or cleared if no such build exists. Epics of other teams are not changed.
- Release Planner: hovering the epic "E" icon shows the GUS epic Description (rich text, read live from GUS and cached for 2 minutes) in a card styled like the SMART goal card; the SMART goal block is left out of it.

### 8.0.0-GA r23 (folded)

- Add epic: new rich-text Description (bold, italic, underline, strikethrough, bulleted/numbered lists, indent, links, clear formatting; paste is cleaned). It is sanitised to formatting tags and written to the GUS epic Description as entered; later commits of that epic keep this text instead of regenerating the description.
- Add epic: Workstreams start collapsed behind an "Add Workstreams" button; clicking it shows the first row, "+ Add workstream" adds more, and rows can all be removed.

### 8.0.0-GA r22 (folded)

- Epic updates popup: the "Release Review Status: Not required" chip is no longer shown (e.g. for On Track epics); the chip appears only when a review status is set or needed.

### 8.0.0-GA r21 (folded)

- Teams dialog: leader chips fixed (oversized checkbox and wrapped names); each chip is a compact pill with a normal checkbox, name and role on one line.

### 8.0.0-GA r20 (folded)

- Teams dialog: built-in teams are shown as compact chips; only teams added in the app are listed as rows with Edit / Remove.

### 8.0.0-GA r19 (folded)

- Teams dialog restyled to match the other modals: compact team list, carded form with tidy fields and helper text, the HRP option as a clear checkbox card, a bordered "More page settings" disclosure, and a solid blue Add team button in a sticky footer.

### 8.0.0-GA r18 (folded)

- Fixed console errors (ERR_TOO_MANY_REDIRECTS on gus.lightning.force.com/visualforce/recsession): GUS-hosted profile photos (Chatter comment avatars, People fallback photos) can't load inside the applet, so they are no longer requested. Slack avatars are used where available, otherwise initials.

### 8.0.0-GA r17 (folded)

- Teams: new "Start without the shared HRP projects" option when adding a team; its planner opens with the shared catalog hidden for that team only (first plan load; other teams unaffected).
- Release Planner: Import / Export → "Remove shared HRP projects" bulk-hides the shared HRP projects for this team only, after a confirmation with the count. Projects that have epics are kept; nothing is deleted in GUS.

### 8.0.0-GA r16 (folded)

- Release Planner: when a linked planned release's dates change in GUS (e.g. MQ 268 end moved from 28 Feb to 31 Mar) the plan window now follows it on load, and the Leaves, holidays & on-call dialog shows the new working-day total. Engineers whose Total days still equalled the old window's weekdays move to the new total; entered leave, holidays, on-call and deliberately custom totals are never changed. Changing the release or dates by hand does the same.
- Planner page bar: team selector, "Back to Team Hub" and the ⚙ button now flow in order with even spacing instead of the back button being pinned over the selector; all three share one 34px row, vertically centred, with 10px gaps; the ⚙ tile is exactly 34×34 with no outer shadow.

### 8.0.0-GA r15 (folded)

- Back to Hub / Back to Team Hub restyled again: light tint with a dark-blue label and border instead of solid blue. On the planner the team selector and ⚙ button now keep clear of "Back to Team Hub" (no overlap). The buttons are compact. The Teams ⚙ button is now a 3D icon tile like the page icons and sits last in the page bar, after Refresh.

### 8.0.0-GA r14 (folded)

- "Back to Hub" and "Back to Team Hub" are now a solid dark-blue pill with a white label and arrow (the pale tint made the label unreadable), with a hover shift and a visible focus ring.

### 8.0.0-GA r13 (folded)

- Teams dialog, "More page settings" (optional): Daily Chronicle page link (enables the rail button), Hourglass team key (only for teams present in the Hourglass data file) and the PagerDuty Slack channel (Trust Champion alerts). Validated server-side; PagerDuty channels now include teams added in the app.

### 8.0.0-GA r12 (folded)

- Teams dialog: the active GUS product tags of the chosen scrum team are listed under "Default product tag" as buttons to pick (click again to clear); a single tag is pre-filled when adding a team. Loaded with the leaders by the `team-leaders` action.

### 8.0.0-GA r11 (folded)

- Teams dialog: leaders are now chosen per team from GUS. After you pick the scrum team, its Scrum Lead, Engineering Manager and Architect (team record and member roles) appear as chips and are pre-selected; Product Owner and other members can be added. Selections are saved as GUS user ids and shown in the team's people list. Amit and Jayant are no longer forced onto teams added in the app (built-in teams are unchanged). New `team-leaders` action.
- Release Planner: switching team no longer flashes empty Planned Release / date controls and a blank planner header; only the loading indicator shows until the plan is ready.

### 8.0.0-GA r10 (folded)

- Teams added from the Teams dialog now always get a workstream theme (defaults to the short name when left blank), so Release Planner can name `R<release>_<theme>_Workstream` themes for them. Tests cover the planner's program lookup and theme for an added team.

### 8.0.0-GA r9 (folded)

- Every page URL now carries the selected team (`team=<id>` or `team=all`), e.g. `#/plan?full&team=a00B…`. The address updates when the team dropdown changes, and opening, reloading or going back to a link selects that team, so links are team-specific and shareable. A URL without a team falls back to your saved/default team.

### 8.0.0-GA r9 (folded)

- Teams can be onboarded from the UI: a ⚙ button beside the Team selector opens a Teams dialog. Search an active GUS scrum team, set display name, short name, key, workstream theme, default product tag and leaders, then save. Saved teams live in the shared store, show in the team picker, Release Review (planned releases) and the hub, and can be edited or removed. Built-in teams stay in `backend/teams.config.js`. Teams that overlap an existing team, or that contain unsafe characters, are rejected.
- Fixed the Columns dialog text that still said Epic Name is required.

### 8.0.0-GA r8 (folded)

- Epic name is now an optional column: unchecked by default in the Columns dialog and no longer locked, so it can be added to the expanded detail when wanted. Defaults are Project, the review month and the two before it, Path to green and Work complete. Releases with their own saved column choice keep it.

### 8.0.0-GA r7 (folded)

- The expanded epic detail no longer repeats the Epic name column (the epic row above already shows it). Columns are Project, the review month and the two before it, Path to green and Work complete; the freed width goes to the month columns.

### 8.0.0-GA r6 (folded)

- Removed the empty white band to the right of the review table. The summary table was getting two column groups, which doubled its width and forced a sideways scroll; it now fits the card exactly.
- Default review columns for every team are now Project, Epic name, the review month plus the two before it, Path to green and Work complete (Development lead is no longer a default). Releases whose columns were customised in the Columns dialog keep their own choice.

### 8.0.0-GA r5 (folded)

- The gap between the Release Review tab bar and Release Health Metrics is about 26px shorter (the empty control row's margins and the Metrics heading's padding).

### 8.0.0-GA r4 (folded)

- Release Review can now take its epic list from a GUS Planned Release (`ADM_Planned_Release__c`) and the epics related to it, instead of saved list views. Paste a Planned Release URL or ID, or pick one from the new Planned releases list in the Add/Edit release drawer. Columns, order, selection and dashboard are unchanged; the epic list is re-read from GUS on each refresh.
- The drawer lists every planned release filed on the selected team (past, current and future, from the team's Planned Releases related list) with dates, epic count and a phase label, so it works for every team. A ☆ Set default button marks the planned release a team's review opens on (shared, stored per team), for example 268 once planning ends. Saved list-view releases keep working.
- Not verified against live GUS or in a signed-in browser. The checks used a stubbed GUS client.

### 8.0.0-GA r3 (folded)

- Epics that still need a Review Status (Watch, Canceled, Not Started) get an amber edge and tint in the review table. When a publish is refused for a missing Review Status, the page scrolls to that epic, highlights it and focuses its Review Status field, and the message says to set it in the highlighted row.

### 8.0.0-GA r2 (folded)

- Epic drawers (Monthly Health Update, Epic Details, Path to Green, V2MOM measure, notes, legacy years) now show the Development Lead under the epic name.

## 7.0.121-GA

- Review dashboard: the row Nudge button no longer turns dark blue on hover or focus; it uses the same light style and the same smaller font size as the Summary button.

## 7.0.120-GA

- Nudge: dark-blue buttons replaced with the light blue palette (selected message type, Send, Copy).
- Nudge message for epics now asks specifically for the month's Epic Health comment in GUS, listing what it should cover (progress, completed work, risks/blockers with Path to Green, next milestone and ETA). ETA and Blocked variants are specific too.
- Slack posts are formatted cleanly: `@Name` in the message becomes a real Slack @mention (no duplicate greeting line), `*bold*` is kept, and the GUS URL becomes an `Open in GUS` link with no unfurl card.

## 7.0.119-GA

- Epic table: the expand (+) column is pinned to the compact 28px, so the wide variant with the large gap before the epic icon can no longer appear.

## 7.0.118-GA

- No more flicker: the table is only redrawn when its content actually changes, so background refreshes, focus and resize no longer repaint rows or close an open tooltip or preview. Auto-refresh also waits while a tooltip is showing or the pointer is on the table.

## 7.0.117-GA

- Full screen: tooltips, previews, drawers, dialogs and toasts now appear above the full-screen epic table. Full screen is requested for the whole page, so popups are no longer hidden outside the table.

## 7.0.116-GA

- Full screen: rows other than the one under the pointer are strongly faded (30%); hovering or focusing a row brings it back to full strength with the blue highlight, and an expanded row stays at full strength.

## 7.0.115-GA

- Release epics full screen is now literally full screen: the table covers the whole window edge to edge above the page header, and the table fills the full height with the footer pinned at the bottom. Where the browser allows it, it also uses the browser's real full-screen mode; press Esc or the close button to leave.

## 7.0.114-GA

- Expanded epic rows: found why the column widths never applied. The generic table auto-sizer was injecting its own pixel column widths ahead of the table's. It now leaves this table alone, so Epic Name, Lead, the month columns, Path to Green and Work Complete take their intended widths. Checked in a headless browser against the fixture data: seven columns fill the full row width.
- Review epic rows now follow the planner row style: muted at rest, and the hovered or focused row gets the blue highlight with everything on it (buttons, dropdowns, details) at full strength. The expanded row stays softly highlighted.

## 7.0.113-GA

- Expanded epic rows: column widths are now set on the header cells themselves, so they are honoured. Epic Name is wide, monthly update columns are equal (the review month no longer takes most of the row), and Path to Green and Work Items Complete stay visible.
- Epic table: tighter gap between the expand button and the epic icon.

## 7.0.112-GA

- Expanded epic rows: removed the repeated epic title and "Monthly updates · GUS release columns" line above the detail table (the epic is already shown in the row above it) and tightened the spacing.

## 7.0.111-GA

- Expanded epic rows: the detail table now uses a fixed layout with column widths set as percentages of the row, so the columns always fill the full width with no empty band on the right. Project and Epic Name get a wider minimum so titles stop wrapping one word per line, and monthly update columns take the largest share. The table scrolls inside its own frame only when the window is too narrow.

## 7.0.110-GA

- Planning metrics: "Total planned" is split into two tiles, "ATL (Planned)" (above the line, counted toward allocation) and "BTL (Planned, not priority)" (shown for reference only). Remaining capacity is now Available minus ATL planned, and the "used" percentage in the summary line uses ATL only. Clicking each tile filters to that line.

## 7.0.109-GA

- Expanded epic rows: the detail table now keeps each column at its sized width and shares spare room across columns, so Epic Name no longer wraps one word per line next to a huge update column, and there are no empty white bands. When only a few narrow columns are shown (for example just Work Items Complete) the table shrinks to fit instead of stretching.

## 7.0.108-GA

- Expanded table columns: the default selection is now a lean set: Epic Name, Development Lead, Monthly updates (review month and two preceding), Path to Green and % of Work Items Complete. Epic Status stays required above each detail table. Releases where someone has already saved their own column choices keep them, and "Use GUS order" now resets to this lean set.

## 7.0.107-GA

- Release Review: the RELEASE picker and the separate selected-release chip are merged into one control. The picker now shows the selected release name (for example "VegaCache · 266"), or "N releases" when several are selected. Remove or add releases from its dropdown.

## 7.0.106-GA

- Epic table: restored the narrow expand column. Hiding it in 7.0.104-GA shifted the header and filter cells so Epic Name was squeezed and its text vanished. The column is now 28px with a small 18px button, and the whole row stays clickable.

## 7.0.105-GA

- Release Review: the "Selected Teams or Releases" row is gone. The selected-release chips now sit inline right after the release picker's + button, so there is no extra row or gap.
- Release Review: the Team selector is now the first control, before RELEASE.

## 7.0.104-GA

- Epic table: click anywhere on a row to expand or collapse its monthly details (links, dropdowns, buttons and text selection still work as before, and Enter works on a focused row). The "+" column is removed to save space.
- Epic details drawer: the Nudge button no longer takes a column in the work-item grid, which had shifted Owner, Sprint and SP out from under their headers and wrapped the sprint name one word per line. Nudge now has its own right-hand column.

## 7.0.103-GA

- The expand "+" button on the epic table is smaller (20px) and its column is narrower, so the Epic Name header, its filter and the other column headers line up and are no longer pushed right.

## 7.0.102-GA

- Fixed "Could not load the plan" (Cannot set properties of null) introduced in 7.0.101-GA. The planner removes its page heading, which took the "Last saved to GUS" note with it. The note now lives in the top bar, before TEAM, and only shows on the planner.

## 7.0.101-GA

- Dashboard and GUS now sync both ways automatically. Edits to a linked workstream's name, owner or planned days are pushed to GUS on save. GUS changes (epic fields, workstreams) are pulled in on load, when you return to the tab and every 60 seconds, so the Pull from GUS dialog normally has nothing to show.
- If both sides changed the same field, GUS wins. The first sync after upgrading has no baseline, so dashboard values are pushed to GUS.
- The "Last saved to GUS" note moved into the page header, before the team name, and the header action row is aligned on one line.

## 7.0.100-GA

- Epics with no SMART goal now say "SMART goal missing" in the full-screen epic lists and the epic dialog. Clicking it (or Enter) closes the dialog and jumps to that epic's row in the planner, highlighted.
- Fixed the SMART goal hover card in the full-screen list, which was not receiving the epic id in 7.0.99-GA.

## 7.0.99-GA

- In the full-screen epic lists (for example P0 epics), hovering "SMART goal" under an epic shows the SMART goal card, the same one used elsewhere in the planner.

## 7.0.98-GA

- Theme Payload Distribution: each slice (4% or more of the total) shows its points as a label, and the theme legend is one column so names and points are never cut off.

## 7.0.97-GA

- Clicking a project or epic row to expand or collapse no longer flickers or jumps: the grid keeps its scroll position and skips the fade transitions while it redraws.

## 7.0.96-GA

- Saved epics and the full-screen list: the last column header and its filter no longer spill past the card edge. Headers wrap, filter boxes shrink with their column, and the card scrolls sideways only if it must.

## 7.0.95-GA

- Priority board header is one line: title, status counts, the drag hint (plain text, shortened with … and a tooltip when narrow) and the epic count on the right.

## 7.0.94-GA

- The top filter bar is hidden on Priority board and Saved epics (they have column filters). It stays on Overview, Epic review and Engineer View. If filters set on another tab are still applied, a one-line note with "Clear them" appears.

## 7.0.93-GA

- Planned Release Summary: every table has column filters. Saved epics and the full-screen epic list get a filter row under the header; Priority board and Epic review get a filter box under each column heading; Engineer View filters by engineer and by epic/project/theme. Filters persist while you switch tabs and redraw.
- The Summary filter dropdowns use the app's standard dropdown (the same one as the rest of the hub), replacing the generic list added in 7.0.92.
- The summary line above the tabs is plain text, with no border or tint.

## 7.0.92-GA

- Every dropdown on the planner (filters, Group by, Sort, engineer pickers and the rest) now opens the same styled list as Planned Release: rounded card, check on the current choice, hover tint, keyboard Up/Down/Enter, Esc to close. Values and change handling are unchanged.

## 7.0.91-GA

- Planned Release is now a custom dropdown: the release name is large and the dates sit beside it as a small pill, both in the closed picker and in the open list. The current choice has a check and a tint; Esc closes the list.

## 7.0.90-GA

- Planned Release dates are larger (11px, still smaller than the 13px name) and darker, and the picker no longer shrinks.

## 7.0.89-GA

- The leave / on-call / holidays button is now named "Availability register".

## 7.0.88-GA

- The "Leaves & on-call" button is renamed "Leave/Oncall/Holidays register".

## 7.0.87-GA

- The Planned Release picker now fits its label (no empty space) and shows a dropdown chevron.

## 7.0.86-GA

- "Project" is now "Project (Measure)" in the planner column, summary filter, board and sort labels; the divider "Projects without epics" is now "Projects\\Measures without Epics".

## 7.0.85-GA

- Fixed the Planned Release picker showing the release label twice (overlapping text).

## 7.0.84-GA

- On projects with no epics yet, the "+ Epic" button has a light red border that flashes, so empty projects are easy to spot. Reduced-motion users get a steady red border.

## 7.0.83-GA

- The V2MOM Ref hover card no longer blocks the pointer: moving down over it reaches the rows and buttons beneath, and the card closes.

## 7.0.82-GA

- The Planned Release picker shows "Release Name (Start - End)", with the dates in a smaller font than the name.

## 7.0.81-GA

- The release summary line ("N epics planned… Needs attention…") now sits to the right of the Overview / Priority board / Epic review / Engineer View / GUS Summary tabs.

## 7.0.80-GA

- On project rows, the method chip is renamed "V2MOM Ref" and moved to the right, just before the "X epics" chip; its expanded text stays beside it on the left.
- The comment-count chip now uses the same dimmed/hover opacity as the rest of the row.

## 7.0.79-GA

- Pressing Esc twice quickly refreshes the page. Pending edits are saved first; if the plan cannot be saved, the page is not refreshed and a message says why.

## 7.0.78-GA

- One "Save to GUS" button replaces "Save plan" and "Review & push to GUS": it saves the plan to GUS Apps for the whole team, then lists only the epics that are new or differ from GUS; accepting writes them to GUS. The review now compares each epic with its live GUS record (name, project, release, effort, priority, lead, description), so epics the auto-sync already updated are not offered again. If nothing differs it says "Everything is already saved to GUS".
- Tooltips on Leaves & on-call, Pull from GUS and Save to GUS explain what each does.
- Clicking anywhere on a project or group row (not on a button, link or chip) expands or collapses it, the same as its caret.

## 7.0.77-GA

- The V2MOM method chip now comes before the P icon on every initiative row.

## 7.0.76-GA

- Comments filter: Esc clears it even while a comment hover preview is showing; if a comment thread or menu is open, the first Esc closes that and the next Esc clears the filter.

## 7.0.75-GA

- Planning metrics, By theme / method and Engineer bandwidth sit side by side on one line. Click one to expand it full width underneath (the other two close); click it again to collapse.

## 7.0.74-GA

- Comments on initiatives: every project row shows a chat chip with the total number of GUS Chatter posts across its epics. Click it to show only that project's epics that have comments; click again or press Esc to clear. Comment counts now load for all epics when the plan opens, so the badge on each epic shows without hovering.
- Planning metrics: reduced to the seven essential tiles on one line (Available, Total planned with ABL/BTL split, Remaining capacity, Over-allocated, Unassigned effort, Incomplete epics, Pending GUS save). Removed: ABL epics, BTL epics, Planned ABL, Planned BTL, Headroom, Time off & on-call, Saved in GUS.
- "+ Epic" on a project row is shown at 75% opacity and becomes fully opaque when the row is hovered.

## 7.0.73-GA

- Summary tiles: every tile now filters the epics grid. "Remaining capacity" shows the epics of engineers who still have unplanned days, and "Saved in GUS" shows epics already in GUS. Clicking the active tile again clears the filter.

## 7.0.72-GA

- Engineer bandwidth: more space between the ABL, BTL and Remaining figures in the allocation label.

## 7.0.71-GA

- Engineer bandwidth: the ABL, BTL and Remaining percentages now show the days in brackets, e.g. "ABL - 88% (43d), BTL - 0% (0d), Remaining - 12% (6d)", also on the Team total row.

## 7.0.70-GA

- Engineer bandwidth: engineers are listed from highest to lowest allocation (ABL + BTL as a share of availability); ties by name, engineers with no availability last.

## 7.0.69-GA

- Engineer bandwidth: the 85% / 100% highlights are now gentler. The whole engineer row gets a soft yellow (ABL above 85%) or soft red (above 100%) tint with a coloured edge, so the name and the allocation read as one row; the label keeps normal text colour with a small pill ("Above 85%" / "Over 100%") instead of a full-width coloured band.

## 7.0.68-GA

- Engineer bandwidth: the allocation label now reads "ABL - x%, BTL - y%, Remaining - z%" and no longer shows the "= 100%" total. Above 85% ABL is highlighted yellow; above 100% it is flagged OUTLIER.

## 7.0.67-GA

- Engineer bandwidth: the yellow (above 85%) and outlier (above 100%) highlights are driven by Prioritised (ABL) only, as a share of availability. BTL work no longer triggers them.

## 7.0.66-GA

- Engineer bandwidth: an engineer allocated above 85% now gets a yellow highlighter on the allocation figure and bar; above 100% it shows as a red outlier badge. Applies to the Team total row too.

## 7.0.65-GA

- Editing at the same time is now safe for every user. If a teammate saved the plan first, their changes and yours are merged automatically and silently when you touched different things (different epics, fields, workstreams or actions, or items added on both sides). Only when you both changed the same value is a small dialog shown, listing each overlap with your value and theirs; yours is kept unless you tick "use theirs". Previously you were told to reload and lost your edits.
- Not covered: writes to GUS itself are still last-write-wins.

## 7.0.64-GA

- Comments are available on every epic that exists in GUS, including epics owned by another team (Chatter follows the signed-in user's own GUS access).

## 7.0.63-GA

- Comments: fixed "body must be a non-empty string or array of message segments". The host's chatter.post / comment take a plain array of segments ({type:'mention',id} / {type:'text',text}), as the OneJDK dashboard uses; that form is now sent first (capitalised Connect form second). Not yet verified against live GUS.

## 7.0.62-GA

- Comments: posts and replies go through the host's own Chatter helper (sf.chatter.post / comment), so @mentions are real and notify the tagged GUS user. The body shape is not documented, so two likely shapes are tried; if neither is accepted and the comment contains a tag, nothing is posted and the error is shown (no silent plain-text post). Comments without tags still fall back to the record-based post. Not yet verified against live GUS.

## 7.0.61-GA

- Diagnostic only: runtime-capabilities also shows the parameter count and the start of the source of the host's chatter.post / comment / getFeed / getComments helpers (host code, no data).

## 7.0.60-GA

- Diagnostic only: runtime-capabilities also lists the member names of the host's sf.chatter object.

## 7.0.59-GA

- Diagnostic only: new backend action runtime-capabilities lists the names (no values or data) of the calls the GUS Apps host exposes, to find a route for real Chatter @mentions. No behaviour change.

## 7.0.58-GA

- Comments: compact type (12 px), one tinted card per message with the author, time and a ↩ Reply chip on one line, @mentions shown as chips, the epic as a chip under the title, and a smaller comment box, so more of the thread fits.

## 7.0.57-GA

- Comments: reading the thread no longer fails with "FeedItem requires a filter by Id" (the epic's feed is read from ADM_Epic__Feed, replies via FeedComment). Popover is wider (up to 62% of the screen, 760 px), the comment box is full width, and the title reads "Comments · GUS Chatter". Posts are made as the signed-in GUS user; @mentions remain plain text in this runtime.

## 7.0.56-GA

- Comments fix: the GUS Apps runtime has no Connect API, so the thread failed with "cannot reach Chatter". It now reads the epic's FeedItem / FeedComment records and posts through the same sObjects (plain text: an @name is shown but does not notify; with Connect API access real mentions are still used).
- Comments UX: hovering the button previews the latest GUS messages; clicking opens the thread with the ✓ and × in the header and a full-width box; the refresh button is gone (the thread reloads each time it opens).

## 7.0.55-GA

- Epic Comments: a Comments button next to Action Log opens an inline popover with the epic's GUS Chatter thread (posts and replies, oldest first). Post with ✓ or Ctrl/⌘+Enter; type @ to mention a GUS user (sent as a real Chatter mention); Reply on any post; ↻ re-reads GUS, so replies made in GUS show on open. Nothing is stored in the plan. Only for epics that exist in GUS. New backend actions epic-chat-read / epic-chat-post / epic-chat-users. Not yet exercised against live GUS Chatter; unit tests use a stubbed GUS client.

## 7.0.54-GA

- Pull from GUS now covers projects, epics and workstreams: project titles and V2MOM methods (including projects with no epics), epic names / projects / releases, and workstream names, owners, days, plus workstreams added in GUS. Everything is listed for review and only ticked items are applied. Workstreams are traced only for epics created from the planner.

## 7.0.53-GA

- Fixed: when grouped by Outcome (or any non-Project grouping) the plain project list was also drawn underneath the groups, so every project appeared twice. The project list now only draws in Project grouping. (Introduced in 7.0.27.)

## 7.0.52-GA

- Outcome grouping: workstream rows are indented one step under their epic (they previously sat left of the epic).

## 7.0.51-GA

- Action Log popover: Owner / ETA row re-laid out with padding, a wider owner select (flexible) and a fixed-width ETA; clean select with a chevron, and a modern date field with focus ring and softer calendar icon.

## 7.0.50-GA

- Action Log popover: the save ✓ and close × buttons now share one 28 px circular format (green ✓, soft grey ×).

## 7.0.49-GA

- Row highlight borders are now subtle: hairline 1 px lines in soft tints for expanded and hovered rows (the hovered row reads by tint and a slim left bar).

## 7.0.48-GA

- All-epics Action Log: the owner is shown as an avatar (name on hover) so the Epic and Action item columns get the space, and type sizes are consistent (12.5 px items, 12 px epic and ETA, 10.5 px headers).

## 7.0.47-GA

- Smooth transitions in the planner grid: row highlight, expand / collapse tint and chip fades ease over about 0.18 s, and epic rows fade in when a project is expanded. Only colour, shadow and opacity animate, never layout, and users who prefer reduced motion get no animation.

## 7.0.46-GA

- Hovering or expanding a project / outcome row no longer shifts the layout: borders keep a constant 1 px top and no bottom border, the highlight lines are inset shadows, and the project name keeps the same weight on hover (bold only when expanded).

## 7.0.45-GA

- The project / outcome row under the mouse now stands out clearly: a stronger blue fill, a 2 px blue line above and below, full-strength bold name and chips.

## 7.0.44-GA

- Expanded project / outcome rows are now clearly highlighted (stronger blue tint, bold dark name, a line above and below); collapsed rows recede (very light background, lighter name text, slightly muted chips). Done with colour and weight rather than opacity so text stays readable.

## 7.0.43-GA

- Group by Project orders the projects by the measure number in their short form (HRP M1.1.1, M1.2.4, M1.2.10, M2.2.1 …), compared number by number, in both the "with epics" and "without epics" sections. Projects with no number go last.

## 7.0.42-GA

- Planner toolbar buttons are tinted by purpose: **+ Project** green, **Projects / Epics** blue, **Columns** violet, **Import / Export** amber, **Group by** indigo, **Action Log** orange (matching its icon), **Expand / Collapse all** teal and **Full screen** slate.

## 7.0.41-GA

- Group by Project now lists the projects that have epics first, then a thin "Projects without epics" separator, then the projects with no epics yet. Order within each part is unchanged.

## 7.0.40-GA

- Epic Action Log popover: a **×** close button at the top right, and a **+ Add** button that opens the add form (action item, owner, ETA) once the epic already has items. While the form is open the green ✓ saves; after saving, the list is shown again.

## 7.0.39-GA

- The all-epics Action Log window is more compact: a narrower window, tighter margins, a plain summary line instead of a boxed note and slimmer rows.

## 7.0.38-GA

- Action items can be edited: click an item's text (in the epic's Action Log popover, or in the all-epics list, which jumps to that epic's popover) to load it into the form, change the action, owner or ETA, and press ✓ to save the changes (or "Editing — cancel").

## 7.0.37-GA

- The top **Action Log** window is now a plain list: one aligned row per action item (tick, action item, epic, owner, ETA, delete), open and overdue first, closed struck through. The add form and the per-column filter boxes were removed there; add items from the Action Log icon on an epic row.

## 7.0.36-GA

- The top **Action Log** button moved from the planner title to the toolbar on the right, directly before **Collapse all**.

## 7.0.35-GA

- The Action Log count badge on the epic row is no longer clipped by the cell edge (smaller badge, with room reserved to its right and above).

## 7.0.34-GA

- Action Log popover layout: the green ✓ save is at the top right, the action-item box spans the full popover width, owner and ETA sit side by side below it, and a very light frame marks the controls area.

## 7.0.33-GA

- Clicking an epic's Action Log icon now shows its action items first (open ones first, then closed), with the add box (action item, owner, ETA, ✓) underneath.

## 7.0.32-GA

- Epic-row icons (GUS link, SMART goal, Outcome, Action Log) are now the same size with equal 8 px gaps; the SMART goal edit pencil no longer adds extra space until hovered.

## 7.0.31-GA

- The Action Log, Outcome and SMART goal popovers now open inside the dashboard (including in full-screen mode, where they were previously attached outside it and could not be seen or used).

## 7.0.30-GA

- The epic Action Log is now a small popover next to its icon instead of a modal: a long action-item box, then owner (defaults to the epic owner) and ETA (defaults to today + 3 working days), and a green ✓ to save. Existing items of the epic are listed underneath to tick done or delete. The top **Action Log** button (all epics) keeps its window and uses the same default ETA.

## 7.0.29-GA

- The epic Action Log icon now shows its state: blue when the epic has no action items, orange with the open count while any are open, and green with a ✓ once all are closed. The tooltip reads e.g. "2 open · 3 closed".

## 7.0.28-GA

- **Action Log**: a checklist button on every epic row (next to Outcome, with an open-item count) opens a small popup to add an action item with owner (defaults to the epic owner) and ETA, tick it done or delete it. A new **Action Log** button before Full screen lists the action items of all epics (epic, action item, owner, ETA; open and overdue first) and adds new ones. Items are stored with the epic in the plan (up to 50 per epic) and are not sent to GUS.

## 7.0.27-GA

- Outcome view hierarchy: each level is now indented one step (outcome → project → epic; epics sit under the outcome when Projects are not shown), and the levels have subtly different tints — indigo for outcome rows, neutral grey-blue for project rows, white for epics.

## 7.0.26-GA

- A new workstream now defaults its workstream owner to the epic owner, both from the **+** on an epic row and in the New workstream dialog (which follows the chosen epic until you pick an engineer yourself). It can be changed afterwards as before; epics with no owner still start unassigned.

## 7.0.25-GA

- Group by Outcome now has a **View** switch: **Outcome → Epics** (as before) or **Outcome → Projects → Epics**, which nests each outcome's epics under their project rows (each folds independently).

## 7.0.24-GA

- Group by Outcome: hovering a measure chip in a group header now shows that measure's card (name, owner, V2MOM mapping) after the usual 1 s delay, replacing the generic "Measures served by this outcome" text.

## 7.0.23-GA

- Outcome is no longer a grid column (the text is long). Each epic row now has an **Outcome** flag button next to the SMART goal button: click it to write, edit or clear the outcome and Save. It turns green once set and shows the text on hover. Group by → Outcome and the GUS write (first line of Epic Health Comments, `Outcome: …`) are unchanged.

## 7.0.22-GA

- **Outcome** on every epic: new editable Outcome column in the planner grid. On **Review & push to GUS** it is written as the first line of Epic Health Comments (`Outcome: <text>`); an existing first `Outcome:` line is replaced and the rest of the comments are untouched. Clearing it removes the line. A read-only comments field never fails the epic save; it is noted on the result instead.
- New **Group by → Outcome** option: epics are grouped by outcome, each group header lists the measures (project short forms) that serve it, and epics without an outcome land in "No outcome".
- Not yet: pulling an existing `Outcome:` line from GUS back into the planner.

## 7.0.21-GA

- Epic detail window: the SMART goal now shows right under the epic name, and the ATL/BTL status appears both as a chip (with the epic's days) and as a column in the workstream table.

## 7.0.20-GA

- Planner header buttons reordered and renamed to say what they do: **Leaves & on-call**, **Save plan** (saves to the GUS Apps tracker only, nothing goes to GUS), **Pull from GUS** (was "Refresh from GUS"; now after Save), **Review & push to GUS** (was "Review & save to GUS").

## 7.0.19-GA

- The **P** (project measure) card now opens to the right of the mouse pointer, flipping to the left and clamping vertically when near a screen edge.
- Fixed the `parseRef` test for Meir references (no product change).

## 7.0.18-GA

- V2MOM card: **Meir** and **T&I** references are now the same source (the FY27 Meir Amiel V2MOM, tabs M1–M9) and show their measure names. "Meir M5.3.5" resolves to T&I 5.3.5. The private snapshot now holds HPS and T&I (573 measures); T&P names are still unavailable.

## 7.0.17-GA

- Hover delay for the V2MOM and **P** measure cards is now 1 s (was 1.5 s).
- V2MOM card: the reference code is a compact chip beside the measure name (no more full-width bars), with owner and cross-reference underneath.
- V2MOM measure names now display: when the live sheet read isn't available, the card falls back to a private point-in-time copy of the HPS FY27 V2MOM (327 measures) that ships with the deployed app but is not in this public repo. It can go stale; T&P and T&I names still need a readable source.

## 7.0.16-GA

- The **P** (project measure) hover card now also waits 1.5 s before appearing, like the V2MOM card.

## 7.0.15-GA

- **V2MOM tooltip.** Appears after a 1.5 s hover instead of instantly; softer colours (the dark blue reference chips are now light grey) and smaller text, also on the SMART goal card. When the HPS / T&P sheets cannot be read the card says so instead of "not found".

## 7.0.14-GA

- **Save to GUS review explains "Update".** Each epic marked Update now says why: it is already in GUS, and the box lists what this save will change (new or changed workstreams, or that the epic has not been synced from the planner before). New epics say they will be created.

## 7.0.13-GA

- **Measure names in the V2MOM tooltip.** Hover the **V2MOM** chip on a project row to see each method reference (for example HPS M6.2.2) with its measure name, owner and, for HPS, the mapped T&I / T&P number. Names are read live from the HPS FY27 and T&P FY27 V2MOM sheets (`backend/v2mom-measures.js`); nothing is stored in the repo. T&I needs its sheet added to `SOURCES` (one line) because no T&I V2MOM sheet was found.

## 7.0.12-GA

- **SMART goal on hover.** Hover (or focus) the target icon on an epic with a saved goal to see a card with the epic name, its project and release, and the goal just below. Click the icon to view or edit.
- **Redesigned epic list.** The P0 / ABL / BTL / theme epic lists now open with summary tiles (epics, points, above/below the line with a split bar) and richer rows: priority badge, project code chip, release, ABL/BTL pill, engineer avatars and a days bar.

## 7.0.11-GA

- **SMART goal drafting shows progress.** While the AI drafts, the box reads "Generating…", the button shows "Generating…" and the note animates, so it is clear something is happening.
- **Deadline is a quarter, not a release.** The goal now ends with the fiscal quarter of the release end date (for example "before the end of Q4") instead of naming the release. Quarters follow the Salesforce fiscal year (starts 1 Feb; Nov–Jan is Q4).

## 7.0.10-GA

- **Cleaner Save to GUS review.** The dialog is larger (not full screen) with a fixed header and footer; only the epic list scrolls. Summary counts are one compact row of chips, the planned releases sit beneath, the long explanation is behind "How this works", each epic is a single row (name, Create/Update, ABL/BTL, days) that opens to a four-column detail grid and an aligned workstream table, and the review checkbox sits beside Cancel and Accept in the footer.

## 7.0.9-GA

- The Team selector in the header now uses the same type size and weight as the neighbouring header buttons (it was heavier and taller).

## 7.0.8-GA

- **HRP measure details are now live.** The **P** icon hover card reads every measure from the *HRP FY27 V2MOM* in GUS (title, status, owners, V2MOM refs and the full description, with bullets and headings), so all measures load, not just 1.1.1 and 1.1.3. Sub-codes such as 1.2.1.2 show their parent measure. The bundled 1.1.1 / 1.1.3 text remains as an offline fallback.
- **Sorting on every Planned Release Summary tab.** Click a column heading to sort ascending, again for descending, a third time to return to the default order: Priority board, Epic review and GUS Summary headings, plus a sort bar for Engineer View (name, epics, ABL, BTL).
- **Config-driven teams.** Teams (GUS name, short form, theme, default product tag, leaders, PagerDuty channel) are defined in `backend/teams.config.js`; the hub, planner and people lists read from it. Steps are in `docs/ADDING_A_TEAM.md`. Behaviour for the existing five teams is unchanged.

## 7.0.7-GA

- Hover (or focus / click) the **P** icon on a project row to see its HRP measure: number and title, V2MOM refs, scope, goals and dates, with an "Open tracker" link to the HRP V2MOM Tracker. Details are bundled for HRP M1.1.1 and M1.1.3 (`public/hrp-measures.js`); other projects show their name and V2MOM refs until an entry is added.

## 7.0.6-GA

- Drill-down popups (epic and workstream detail) now size to their content: a 3-workstream epic gets a short popup instead of a full-screen one; long lists grow up to the screen height and then scroll.

## 7.0.5-GA

- Fixed: pressing Escape on the Release Planner could clear the first epic name (the page's generic "Escape clears filters" fallback treated the epic name box as a filter). Escape now only clears real filter boxes; epic and workstream fields are skipped.

## 7.0.4-GA

- **SMART Goal** is now drafted with the GUS Apps AI SDK (`AppletAI`, the same agent the summaries use) in the browser. The earlier server-side Einstein call failed with "requestBody object is required", which is why only a template appeared. The goal is now ONE sentence of at most 45 words (change, metric and target, deadline), with no labels, explanations or restated title. If the AI is not available no template is forced; the box stays empty with a hint.
- The SMART Goal button is now a small target icon (green when a goal is saved); the pencil still appears on hover.

## 7.0.3-GA

- SMART Goal prompt now uses the software-engineering criteria: exact technical change, engineering metrics (p95 latency, rollback or recovery time, coverage, bug count, deployment frequency) taken from the epic name and description, capacity-based achievability, roadmap/reliability relevance and a sprint, quarter or release deadline. Numbers and baselines are never invented.

## 7.0.2-GA

- **SMART Goal** now follows the full definition. GUS Apps AI drafts five labelled lines (Specific, Measurable, Achievable, Relevant, Time-bound) under a one-line headline, using only facts from the epic name, workstreams, effort, release and GUS description. The reply is parsed by label (one retry), and when AI fails the popover says why and shows a template in the same five-part shape. The goal keeps its line breaks in the plan and at the top of the GUS epic description. The popover text is smaller and taller. 7.0.0-GA (golden) is unchanged.

## 7.0.1-GA

- Release Planning header buttons (Refresh from GUS, Leaves & on-call, Save, Review & save to GUS) now share one consistent, subtle style: same height, radius and indigo outline, with the save-to-GUS action in soft green. 7.0.0-GA (golden) is unchanged.

## 7.0.0-GA · GOLDEN BUILD (revision r2: SMART Goal folded in)

- **SMART Goal** chip next to the epic's open-in-GUS icon. Click it to get an executive-ready SMART goal drafted by GUS Apps AI from the epic name, its workstreams, the planned release and (for GUS epics) the GUS description; a template draft is shown if AI is unavailable. Edit it and Save. A pencil appears on hover to edit a saved goal.
- Save stores the goal in the shared plan and writes `SMART Goal: …` at the very top of the GUS epic description (replacing the previous one; the epic must belong to the team). Epics not yet in GUS get it at commit.
- The first 7.0.0-GA snapshot is preserved as `releases/7.0.0-GA-original/` (tags `v7.0.0-GA-original`, `GOLDEN-BUILD-7.0.0-GA-original`, commit 66e3525). Tags `v7.0.0-GA` and `GOLDEN-BUILD-7.0.0-GA` now point at this revision.

## 7.0.0-GA · GOLDEN BUILD

Designated by the user as the best working version and the rollback baseline. Contains everything through 6.26.99-GA: engineer hover card and Engineer View, universal filters and Group by, Epic review tab, compact Overview deck, board column reordering, Move to project and Refresh from GUS, last-saved label, daily private backup, Remaining (was Unplanned) capacity wording, and the Planned Releases GUS link.

## 6.26.99-GA

- Release Planning: the open-in-GUS icon in the tab header now opens the team's Planned Releases related list (ADM_Scrum_Team__c → Planned_Releases__r) instead of its Epics.

## 6.26.98-GA

- "Unplanned" is now **Remaining** (Remaining capacity in the metrics): the available days not yet planned as ABL or BTL. Updated in the engineer headers, hover card, legend and planning metrics.

## 6.26.97-GA

- **Move to project…** on each epic row: pick a project, the dashboard updates instantly and the new project is written to GUS in the background (validated against the team program). Workstreams, priority and engineers stay with the epic. A stale dashboard never overwrites a project changed in GUS: the project is only sent when it was changed here.
- **Refresh from GUS** (header button): pulls each GUS-linked epic's name, project and release, shows what differs, and applies only what you tick. GUS wins.
- Header shows "Saved to GUS Apps · date, time" before the team picker, with a soft green flash on each save.
- Planning metrics order is now Planned (total) → ABL → BTL, then Unplanned.
- Epic GUS link sits right after the epic name.

## 6.26.96-GA

- Engineer hover card: "Detailed summary" now opens the Engineer View reliably (the card no longer closes on mouse-down before the click lands).

## 6.26.95-GA

- Full-screen drill-down popups restyled in the dashboard indigo system: light header with a gradient accent line, soft close button, colour-coded chips (priority rose, ABL green, BTL amber, theme sky) and indigo table headers.

## 6.26.94-GA

- Overview metric cards and health tiles are now compact: smaller type, tighter padding, flat light tints, no oversized icons.

## 6.26.93-GA

- Name tooltip now opens beside the name, level with its own row, so it no longer covers the rows above or below.

## 6.26.92-GA

- Leaves & on-call: the Add engineer row is now compact and on one line (small text, short select and button), with the hint as one small line below.

## 6.26.91-GA

- Name tooltip is now subtle (light background, small text) and appears after a 1.5 second hover.

## 6.26.90-GA

- Overview: five bright metric cards (Total payload, P0, P1, P2, BTL/P3, each opening its full screen view) plus a health row (epics, workstreams, engineers, in GUS, capacity used, headroom, no owner, no release).
- New "Epic review" tab in the Planned Summary: the full-screen review layout (epic rows expand to workstreams with theme, priority, owner, status and points, Expand/Collapse all, per-epic full-screen button). It follows the universal filters and Group by.

## 6.26.89-GA

- Priority board: drag a column heading onto another to reorder the columns; the order is remembered in this browser.
- Engineer View: engineer cards are collapsed by default (the one opened from "Detailed summary" still opens).

## 6.26.88-GA

- Fixed the name tooltip and click-to-highlight on planner rows: that code sat outside the planner module, so it failed silently. Hovering a project, epic or workstream name now shows the full name, and clicking a row keeps it at full opacity.

## 6.26.87-GA

- Daily backup now runs at 09:00 and also at login or wake if that run was missed (Mac asleep or logged out). It skips when today's snapshot is already saved and pushed, and before 09:00.

## 6.26.86-GA

- Engineer hover card: it no longer disappears when you move the mouse from the allocation bar to the card. It waits a moment before closing, stays open while the pointer is on the bar or the card, and is not rebuilt on every mouse move, so "Detailed summary" can be clicked.

## 6.26.85-GA

- Project row chips are subtle tints again (green epic count, soft blue ABL, soft amber BTL) and project rows follow the same 65% resting opacity as epic and workstream rows.
- New daily backup: `scripts/daily_backup.js` writes one JSON snapshot of the GUS Apps shared backend per day to a private repo (bkasiraju/Release-Review-Tracker-backups), scheduled at 08:00 by launchd. It refuses to run if the backup repo is not private.

## 6.26.84-GA

- Engineer hover card: the "Detailed summary" button, Total chip and ABL chip use the dashboard blue with readable text. Clicking an allocation bar pins the card open so the button can be clicked; click elsewhere or press Esc to close it.

## 6.26.83-GA

- Engineer View: the bandwidth figures (total, leave, holidays, on-call, available, ABL, BTL, unplanned and the bar) now sit at the right of each engineer header line instead of in a row below it.

## 6.26.82-GA

- Epic and workstream names no longer show a border on hover (only the full-name tooltip). The edit border and highlight appear only once you click into the name.

## 6.26.81-GA

- Fixed the "Open in GUS" icon overlapping the "N workstreams · Nd" text on collapsed epic rows. The caret, icon, name and GUS link now sit in one flex row inside the Epic Name cell.

## 6.26.79-GA

- Project row chips (epic count, ABL days, BTL days) are now solid, darker and bold so they are clearly readable. Project rows rest at 85% opacity so these chips stay legible; epic and workstream rows stay at 65%.

## 6.26.78-GA

- Engineer View: workstream column headers and rows now share one grid, so Priority, ATL/BTL, Sprint, Status and Days line up. The priority pill no longer stretches across its column.

## 6.26.77-GA

- Summary drill-down popups (theme, priority, ATL/BTL, epic) are redesigned: nearly full screen with a gradient header and round close button, summary chips, a scrolling table with sticky headers, priority and ATL/BTL pills, and engineer chips.
- Esc now works in order: it closes a popup, then clears the Planned Release Summary filters, then clears the planner grid filters, then falls back to the page-wide behaviour.
- The planner opens fully collapsed (projects and epics) on every load instead of remembering the last expanded state. Rows you add afterwards stay open.

## 6.26.76-GA

- Planned Release Summary: one set of filters for every tab (search, project, theme, ATL/BTL, priority, engineer, status, release) and a Group by option for Priority board, Engineer View and GUS Summary. Shows "Showing X of Y epics" and a Clear filters button.
- "Saved in GUS" is now "GUS Summary"; "By engineer" is now "Engineer View", laid out like the planner accordion (engineer, then epic, then workstream, with carets and a colour stripe).

## 6.26.75-GA

- Removed the "Executive epics" tab from the Planned Release Summary.

## 6.26.74-GA

- Engineer hover card: ABL, BTL and Unplanned on one line, epics in the next section, and a "Detailed summary" button that opens the Planned Release Summary on the By engineer view, scrolled to that engineer.
- By engineer view: each engineer shows bandwidth (total, leave, holidays, on-call, available, ABL, BTL, unplanned or over-by) and a utilisation bar; epics are collapsible and open to workstreams with priority, ATL/BTL, sprint, status and days. Expand all / Collapse all.
- Project, epic and workstream rows rest at 65% opacity and go to 100% on hover, focus or click. Names look like plain text until clicked, and hovering shows the full name in a bright tooltip.

## 6.26.73-GA

- New "By engineer" view in the Planned Release Summary: for each engineer, the epics they work on ordered by priority with their workstreams, priority, ATL/BTL and days, plus ABL and BTL totals. Unassigned work is listed last.

## 6.26.72-GA

- An epic with no workstreams keeps the same indent as one with workstreams (the fold arrow space is kept), so Project > Epic > Workstream line up.

## 6.26.71-GA

- The red * for a project without epics or an epic without workstreams is now drawn on the top-right corner of the P or E icon itself.

## 6.26.70-GA

- The save status (Saved hh:mm, Saving, Unsaved) moves to the top bar, just before the team dropdown.

## 6.26.69-GA

- Notifications move from the bottom right to the top right, with a softer background; they still flash briefly.

## 6.26.68-GA

- Removing a workstream in GUS: when GUS refuses the delete (insufficient access), the story is set to status "Never" in GUS instead and removed from the dashboard, and the message says so. Workstreams with status Never are not fetched back.

## 6.26.67-GA

- The Epic Est column now shows the epic total (sum of its ABL workstream days) on the epic row.

## 6.26.66-GA

- Theme box on epic rows is empty by default (grey "Theme" hint instead of the project name) and styled like the other fields.

## 6.26.65-GA

- The red * now sits on the top corner of the P or E badge and takes no extra space.

## 6.26.64-GA

- The red * for a project without epics or an epic without workstreams now sits right after the P or E badge, before the name.

## 6.26.63-GA

- Removed the workstream note above the planner header. Workstreams of planner-created epics are still fetched from GUS on load.

## 6.26.62-GA

- Softer row colours for projects, epics and workstreams.
- A small red * marks a project with no epics and an epic with no workstreams.

## 6.26.61-GA

- Table text: project names 12px, epic names 13.5px, workstream names 13px.

## 6.26.60-GA

- The workstream name field now spans the Workstream and the (empty) Epic Owner columns on workstream rows, so it is one complete text field.

## 6.26.59-GA

- Name text in the table is a bit smaller again: project 13px, epic and workstream 12.5px.

## 6.26.58-GA

- Release Planner: the side navigation rail and its blue edge tab are removed from this view.

## 6.26.57-GA

- Refreshing the page loads the default (starred) team. The team in a full-screen planner link is only used when the tab is first opened from the hub, not on a refresh.

## 6.26.56-GA

- Name text in the table is a little smaller than 6.26.55: project 13.5px, epic and workstream 13px.

## 6.26.55-GA

- Larger text for project, epic and workstream names in the table.

## 6.26.54-GA

- The workstream note is shorter and generic: workstreams are fetched from GUS by "WS:" title or workstream theme; older epics may need them added manually.

## 6.26.53-GA

- Default team (star) is also saved to the backend and read back when the browser has no local copy, so it survives a hard refresh.
- + on an epic row adds an empty workstream line in place (no popup); the + is gone from workstream rows. A named workstream is created in GUS in the background.
- ATL/BTL: new epics default to ABL, epic rows show their real state, and switching an epic switches all its workstreams.
- Grid: workstream rows start at the left edge, one step in from the epic; epic and workstream rows are tinted across every cell (no white gaps).
- The workstream note sits above the header and can be closed with x. Save notices and the save indicator flash.

## 6.26.52-GA

- Add existing GUS epic: the workstreams disclaimer spans the full dialog width instead of a narrow column; GUS epic, ATL/BTL and priority sit on one line.

## 6.26.51-GA

- Add epic dialog: epic name on its own row, ATL/BTL, priority, development lead and planned release on one line below it; planned release defaults to the release selected at the top of the planner; the automatic Team/Program/Owner info is collapsed; tighter padding.

## 6.26.50-GA

- Epics created from the planner now get their workstreams fetched from GUS by the "WS: " title or the R<release>_<team>_Workstream theme, on load and with a new "Fetch from GUS" button. Existing workstreams are matched, not duplicated.
- A permanent note under the planner header says this does not work for older epics added with "Add existing GUS epic": their workstreams must be added manually.

## 6.26.49-GA (19 November 2026)

Adding an existing GUS epic now shows a note in the dialog, and again in the confirmation toast, that its workstreams are not imported (there is no way to trace the workstreams of an older epic) and have to be added manually. Not checked in a browser.

## 6.26.48-GA (19 November 2026)

Project rows now carry a dark blue "P" badge and epic rows a soft teal "E" badge before the name, so the levels are recognisable at a glance. Not checked in a browser.

## 6.26.47-GA (19 November 2026)

Planner grid layout: an epic is now its own row and every workstream is listed on a row of its own below it, indented one step in, with the engineers, days, sprint and workstream status on the workstream row. The project short form is gone from epic rows and the epic name moves to the left. An epic row carries only the epic name, Owners, ATL/BTL, Priority and Theme, all editable. Planned release, epic status, the epic effort total, doc link and the other epic columns are blank on the epic row (the epic still saves them to GUS as before); the project of an epic is changed by moving it between projects instead of the old per-row project dropdown. Not checked in a browser.

## 6.26.46-GA (19 November 2026)

Adding an existing GUS epic now brings in its owner: the development lead, or the GUS record owner when no lead is set (queues are ignored). Epics already in the plan with an empty Owners cell are filled in from GUS when the planner opens, and saved to the shared plan without writing anything back to GUS. An owner who is not on the team roster still shows by name. New backend action plan-epic-leads, with a test against a mocked GUS only; not checked against live GUS or in a browser.

## 6.26.45-GA (19 November 2026)

The confirm button in the Add project, New workstream and Add epic dialogs is now solid green with a tick (for example "✓ Add epic") once the required values are entered, and plain grey until then. The grey button can still be pressed and then names the missing field. Not checked in a browser.

## 6.26.44-GA (19 November 2026)

Removing an epic or a workstream that already exists in GUS now asks where to remove it: from the dashboard only (GUS keeps it, the default) or in GUS as well, which needs an explicit acknowledgement. Deleting an epic in GUS also deletes its own workstream stories; GUS delete is refused, and the item stays on the dashboard, when other work items are still under it. Epics of another team can only be removed from the dashboard. Items not yet in GUS are removed as before. New backend actions plan-delete-epic and plan-delete-workstream, with tests against a mocked GUS only; not checked against live GUS or in a browser.

## 6.26.43-GA (19 November 2026)

Planner grid: project (measure) rows have a blue-grey band, epic cells a soft blue tint and workstream cells (engineers, days, sprint) a soft amber tint with a thin divider, so the three levels are easy to tell apart. Hover darkens each tint. CSS only; not checked in a browser.

## 6.26.42-GA (19 November 2026)

Add project, New workstream and Add epic dialogs now close the moment the input passes validation. The GUS calls and the plan save carry on in the background, with a "Saving in the background" toast and a result toast when done. If GUS rejects something, the dialog comes back with the error and everything that was typed, so nothing is lost. Not checked in a browser.

## 6.26.41-GA (19 November 2026)

The New workstream dialog showed a made-up theme ("Workstream · WS: HRP M1.1.1 › name"). It now shows the theme that is actually applied in GUS, R<release>_<team short>_Workstream (for example R268_VC_Workstream for Caching Services). The automatic values (story type, subject, theme, parent; team, program, owner) are plain lines of text, one per line, instead of pills. Not checked in a browser.

## 6.26.40-GA (19 November 2026)

Planner grid: epic rows are indented under their project (measure) row. The project cell moves in with a small tree connector, and the epic name is indented a further step, with the workstream and the other columns following. CSS only; not checked in a browser.

## 6.26.39-GA (19 November 2026)

The planned release error now says which release was selected (name, dates and the GUS team it is filed under), which team it was checked against and which upcoming releases that team has. A release filed directly under the team is always accepted. The commit review names the release too. Not checked against live GUS or in a browser.

## 6.26.38-GA (19 November 2026)

Fixes two errors on Caching Services. (1) "That release is not one of this team's planned releases" when creating an epic with VegaCache 268: the check used a list capped at 100 rows ordered oldest first, so upcoming releases could be missing; it now checks the upcoming releases first (the same list the picker shows), and the commit review does the same. (2) "No 268 program found in GUS for this team": the program was looked up as "<team name> - 268", which does not exist for Caching Services; it now also tries "<planned release name> - 268" (VegaCache - 268) and then the 268 program the team's existing epics already use. Not checked against live GUS or in a browser.

## 6.26.37-GA (19 November 2026)

Workstream engineer pickers (the Engineers column, the New workstream dialog and the workstream owners popup) now list every member of the team GUS roster, sorted by name, including leaders and people hidden from the capacity table. Epic owners and capacity are unchanged. Not checked in a browser.

## 6.26.36-GA (19 November 2026)

Solid blue buttons are now subtle: Back to Hub and Back to Team Hub are a soft blue tint, Review & save to GUS is a soft green tint, and other primary buttons are a soft teal tint, each with a matching border and text colour. Delete confirmations keep their red. CSS only; not checked in a browser.

## 6.26.35-GA (19 November 2026)

Project dialog: the GUS program box was filled in with the team program, and the browser list only shows entries that match the text already typed, so no other program could be picked. The box now clears when you click it (the old value comes back if you pick nothing) and shows every program ending in - 268; any other program name can still be typed. Not checked in a browser.

## 6.26.34-GA (19 November 2026)

Epics and workstreams created from the planner are saved to the shared team plan on the backend immediately after GUS creates them, instead of after the 1.5 second autosave delay, so they show for every user of the team even if the tab is closed or the team switched right away. If another user saved the plan first, the new epic is added to their latest plan and saved again; if saving still fails, the toast says the item is in GUS but not yet in the shared plan and the Retry button at the top of the table saves it. Not checked in a browser.

## 6.26.33-GA (19 November 2026)

Project colour strips on the planner rows and project headers are now shown at full strength (previously blended 45 to 60% with white) and are 5px wide. CSS only; not checked in a browser.

## 6.26.32-GA (19 November 2026)

Planner header separators now have equal spacing (12px, line, 12px) between every section: + Project | Projects, Epics | Columns | Import / Export | Group by | Collapse/Expand all, Full screen. CSS only; not checked in a browser.

## 6.26.31-GA (19 November 2026)

Planner header is now a single line, right aligned: + Project, Projects, Epics, Columns, Open in GUS, Import / Export, Group by, Collapse/Expand all, Full screen. No second line. Controls are smaller (24px high, 11.5px text). CSS only; not checked in a browser.

## 6.26.30-GA (19 November 2026)

Planner header: + Project, Projects, Epics and Columns are back on line 1, before Group by (line 1 reads title, + Project, Projects, Epics, Columns, Group by, Collapse/Expand all, Full screen). Line 2 holds Open in GUS and Import / Export on the right. CSS only; not checked in a browser.

## 6.26.29-GA (19 November 2026)

Planner Group by dropdown now has the same subtle border, radius and height as the neighbouring buttons. CSS only; not checked in a browser.

## 6.26.28-GA (19 November 2026)

Release Planner / Planned Release Summary are styled as real tabs (underlined bar, the active tab joined to the page with a coloured top edge) instead of pill buttons, and the gap between the page header and the tabs is reduced. CSS only; not checked in a browser. The remaining gap above the tabs may come from the page header's own spacing, which I did not change.

## 6.26.27-GA (19 November 2026)

Planner header line 1: Group by moved to the right, just before the fold button. Collapse all / Expand all is now one button whose label follows the table: it reads Collapse all while any group is open and Expand all once every group is collapsed. Not checked in a browser.

## 6.26.26-GA (19 November 2026)

Planning metrics: tile titles (Planned ABL, Total planned, Headroom, Unassigned effort, Over-allocated, Time off & on-call, Incomplete epics, Pending GUS save, Saved in GUS) and their sub-lines are shown in full. A 64px padding reserved for the hidden status chip was cutting them. CSS only; not checked in a browser.

## 6.26.25-GA (19 November 2026)

Planning metrics: the Expand / Collapse label and the summary line now toggle the section (only the arrow and title did before). Tile labels in the expanded view are no longer cut off ("PLANNED ..."). Not checked in a browser.

## 6.26.24-GA (19 November 2026)

Planner header line 1: Collapse all and Expand all now sit at the far right, next to Full screen; Group by stays on the left after the title. CSS only; not checked in a browser.

## 6.26.23-GA (19 November 2026)

Fixed the planner header order from 6.26.22: an older, more specific CSS rule kept + Project, Projects and Epics ahead of the title. Line 1 is now the title, Group by, Collapse/Expand all and Full screen, and line 2 holds + Project, Projects, Epics, Columns, Open in GUS and Import / Export. CSS only; not checked in a browser.

## 6.26.22-GA (19 November 2026)

Planner header: line 1 holds the title, Group by, Collapse all / Expand all and Full screen. Line 2, right-aligned, holds + Project, Projects, Epics, Columns, Open in GUS and Import / Export. CSS only; not checked in a browser.

## 6.26.21-GA (19 November 2026)

Planner header: Group by is now the first control on line 1, followed by + Project, Projects, Epics, Columns, Collapse all, Expand all and Full screen. The Open in GUS and Import / Export menus on line 2 are pushed to the far right (the Import / Export menu is right-aligned even when Open in GUS is not shown). Not checked in a browser.

## 6.26.20-GA (19 November 2026)

Planner header layout: the title, grid controls (+ Project, Projects, Epics, Group by, Columns, Collapse all, Expand all) and Full screen share the first line; Open in GUS and the Import / Export menu sit on the second line, right-aligned. CSS only; not checked in a browser.

## 6.26.19-GA (19 November 2026)

Planner header: V2MOM Import, file Import and Export template are merged into one "Import / Export" menu with a short description under each item. Full screen stays separate. The V2MOM Import chip is hidden on the planner (it is now in the menu) and stays on other pages. Not checked in a browser.

## 6.26.18-GA (19 November 2026)

Add project now shows an editable GUS program field (defaulting to the team's program, or the last one you entered for the team). Typing or picking a program loads the projects tagged to it, so the "Pick from GUS" list works for teams whose program is not named "<team> - 268" (e.g. Caching Services). New projects are created in the program shown. New action `plan-program-projects`; the chosen program is remembered per team in the browser. Not checked against live GUS data or in a browser.

## 6.26.17-GA (19 November 2026)

Add project / pick from GUS now lists only projects tagged to the team's R268 program. Projects from other programs or releases are no longer offered (projects already in the plan are unchanged). If the team has no 268 program, any program named "… - 268" is used. Not checked against live GUS data or in a browser.

## 6.26.16-GA (19 November 2026)

Planner Group by now offers Project, Priority, ATL/BTL, Theme, Workstream owner, Epic owner and V2MOM method. Each group row has a fold caret and ABL/BTL totals, and Collapse all / Expand all cover the groups. An epic with several workstream owners is grouped under their combined names, and epics with no value fall into a "No …" group at the end. Not checked in a browser.

## 6.26.15-GA (19 November 2026)

Planner toolbar: Collapse all and Expand all moved to the end, after Columns. Not checked in a browser.

## 6.26.14-GA (19 November 2026)

Fixed the planner controls being cut off above the table. The header wrapper added in 6.26.11 reused the class name `pl-bar`, which an existing rule sets to a 12px-high clipped progress bar. Renamed it to `pl-hdr`. Not checked in a browser.

## 6.26.13-GA (19 November 2026)

The planner header and toolbar stay pinned at the top while the grid scrolls (also in full screen), so the controls are always reachable. CSS only; not checked in a browser.

## 6.26.12-GA (19 November 2026)

The ten planning tiles are now one collapsible "Planning metrics" section, collapsed by default with a one-line brief (ABL, BTL, unplanned, % used) and expandable on click. Inside, compact tiles are grouped as Planned (ABL, BTL, total, ABL epics, BTL epics), Unplanned (unplanned capacity, headroom, unassigned effort, over-allocated) and Capacity & delivery (available, time off, incomplete epics, pending GUS save, saved in GUS). New tiles: unplanned capacity, ABL epics, BTL epics, saved in GUS. Not checked in a browser.

## 6.26.11-GA (19 November 2026)

Planner header and toolbar are now one bordered section. The title row holds Open in GUS and V2MOM Import, then Export template and Import, then Full screen. A second row beneath it holds the grid controls in labelled groups: + Project, Projects and Epics lists, Collapse/Expand all, Group by, and Columns. Buttons keep their ids and behaviour; layout and CSS only, not checked in a browser.

## 6.26.10-GA (19 November 2026)

Planner project bars: project names, V2MOM method text and the fold caret are now black on a white row, with the font sizes unchanged. CSS only; not checked in a browser.

## 6.26.9-GA (19 November 2026)

The open-in-GUS icon button in the planner grid and project rows no longer has a border; it uses a subtle blue highlight (darker on hover). CSS only; not checked in a browser.

## 6.26.8-GA (19 November 2026)

Save to GUS dialog cleaned up: the below-the-line checkbox sits inline with its label, the six summary tiles share one row (planned releases moved to a line under them), and when there is nothing to save the dialog shows one "Nothing to save yet" message with a Close button instead of zero tiles and a disabled Accept button. Mocked only; not checked in a browser.

## 6.26.7-GA (19 November 2026)

Import wizard review step: each measure is now one tidy row (checkbox, full-width name field with its character counter, owners underneath), the selected count sits on the toolbar, and suggested names are cut to the 80-character GUS limit at a word boundary instead of showing 400+ characters. Mocked only; not checked in a browser.

## 6.26.6-GA (18 November 2026)

V2MOM import: the HTML snapshot layout (headings like "M1 · Title (15G 9Y 1R)" above tables with HRP# / Title / Status / Owner / Comment columns) is now read. The Measure column may be called Title or Objective, the code column may end in "#", the method name is taken from the heading above each table, and only the first line of a multi-line title is used as the measure name. Checked against HRP-V2MOM-Snapshot-2026-11-18_2.html with the parser: 78 measures across 5 methods, 29 owned by Amit Kumar. The browser-side HTML reading itself was not run in a browser.

## 6.26.5-GA (18 November 2026)

Import wizard fixes: the "No measures matched" message printed "[object Object]"; it now lists each tab with the reason (no Measure/Owner header row, or how many measures were found and none owned by the names given). The Cancel / Parse sheet / Back / Continue buttons had broken sizing from the shared button styles and overlapped; the wizard now has its own button style. Mocked only; not checked in a browser.

## 6.26.4-GA (18 November 2026)

V2MOM import wizard: besides a Google Sheet link and .xlsx, it now reads an .html export (File > Download > Web page in Google Sheets, or a Publish-to-web page). Every table is a method tab, named from its "Mx)" title. PDF is rejected with a clear message: PDF has no table structure, so owners and columns cannot be recovered reliably. Mocked only; the HTML reader has not been run against a real export or in a browser.

## 6.26.3-GA (18 November 2026)

V2MOM import wizard: step 1 simplified to the sheet link (or .xlsx) and the owners to import, with the tab list tucked under "Advanced". Inputs are now styled full-width, the close button sits in the header, and the Cancel / Parse buttons are aligned. Mocked only; not checked in a browser.

## 6.26.2-GA (18 November 2026)

Planner: removed the Release, ATL/BTL, Engineer and Theme filter bar (with Clear filters and the epic count); the column filters in the grid header replace it. Filter values saved earlier are cleared so nothing filters invisibly. Mocked only; not checked in a browser.

## 6.26.1-GA (18 November 2026)

Fixed the V2MOM Import button: the wizard script read `window.Hub` before hub.js had loaded, so clicking it threw "Cannot read properties of undefined (reading 'hasTeam')". It now looks the hub up when clicked. The ERR_TOO_MANY_REDIRECTS lines for GUS profile photos are a GUS session issue, unrelated to this app. Mocked only; not checked in a browser.

## 6.26.0-GA (18 November 2026)

- **V2MOM Import** button next to "Open in GUS": a 3-step wizard reads a V2MOM Google Sheet link (link-shared) or an .xlsx, filters measures by owner, lets you pick and rename them, then creates them as GUS projects under the program you name (default: the team's program) and adds them to the current team's plan with their V2MOM methods. Projects join the shared catalog.
- Anyone can now create epics, workstreams, projects and save plans to GUS (the plan-administrator restriction is removed; GUS still enforces its own permissions).
- Priority is mandatory when adding an epic (defaults to P0), is written to GUS, is inherited by new workstreams, and the Priority column is shown by default in the planner grid (added once to existing saved column choices).
- Planner heading renamed "V2MOM Measures & Epics Plan".
- Planned release summary revamped: one headline sentence, then a view switcher (Overview, Priority board, Executive epics, Saved in GUS) with Overview open, instead of a stack of collapsed cards.
- Mocked only; not checked in a signed-in browser.

## 6.25.3-GA (18 November 2026)

Planned summary: "By theme / method" and "By priority" are now one section with a Theme / method | Priority switch. Mocked only; not checked in a browser.

## 6.25.2-GA (18 November 2026)

Removed the blank space under short or filtered tables: table panels no longer keep a minimum height, and a column filter that matches nothing shows one compact "No rows match the column filters." row. Mocked only; not checked in a browser.

## 6.25.1-GA (18 November 2026)

Column filters now appear only on text columns. The blank expand column, action columns (Actions, Links, Summary, Nudge) and columns made of dropdowns or buttons (Epic Status, Review Status) no longer get a filter box. Mocked only; not checked in a browser.

## 6.25.0-GA (18 November 2026)

- Release Planning: new "Group by" (Project or Priority) above the grid, and a "By priority" card in the planned summary showing ABL and BTL days per priority.
- Release Review: "Priority" added to the Group by list (reads the GUS epic Priority field; epics fetched before this build show "Not reported" until the next refresh).
- Leaves, holidays & on-call: engineers can be removed from the plan (×) and any member of any CFS team can be added from a picker. Stored in the plan only; the GUS team roster is unchanged and existing workstream assignments are kept.
- Mocked only; not checked in a signed-in browser.

## 6.24.2-GA (18 November 2026)

Fixed a syntax error in `app.js` (introduced in 6.24.0) that stopped the whole page loading. Added a test that every `public/*.js` file parses, so this cannot ship again. 6.24.0 and 6.24.1 must not be used.

## 6.24.1-GA (18 November 2026)

Removed the global Search bar (and its suggestions and chips) from Release Planning; the column filters and the Release, ATL/BTL, Engineer and Theme filters replace it. Any saved search text or chips are cleared on load so nothing filters invisibly. Mocked only; not checked in a browser.

## 6.24.0-GA (18 November 2026)

- Release Planning: the Release Window dates show only when "Custom dates" is selected; picking a planned release hides them because the release supplies the dates.
- Every data table now has a per-column filter row under its header (new `colfilter.js`), with a Clear button. The Release Planner grid keeps its own column search. Mocked only; not checked in a signed-in browser.
- Fetch: when every failed epic reports "Session expired or invalid", the toast now says the GUS session expired and to reload and retry, instead of listing each epic.

## 6.23.1-GA (18 November 2026)

The Team selector stays on the top row of the page bar, level with and just before "Back to Team Hub", instead of dropping to a row of its own. Mocked only; not checked in a browser.

## 6.23.0-GA (18 November 2026)

The Team selector now sits in the same place on every page: at the right end of the page bar, directly before "Back to Team Hub" where that button is shown. The separate Team box inside the Release Planning toolbar is gone, since the page-bar selector does the same job. The Planned Release dropdown now has a visible border like the other controls. On narrow windows the selector stays at the right of its row, and the space reserved for the Back button is only used when that button is shown. Mocked only; not checked in a browser.

## 6.22.4-GA (18 November 2026)

The "Open in GUS" menu button now has white text and arrow on its blue background; the text was rendering dark and hard to read. Mocked only; not checked in a browser.

## 6.22.3-GA (18 November 2026)

Review fixes for the full-screen pop-ups. Toast messages (save results, GUS errors) are now visible while the planner is full screen. Pop-ups opened in the page-wide Focus mode stay inside the page body, so they keep their styling. Escape closes an open dialog first instead of leaving full screen. Mocked only; not checked in a browser.

## 6.22.2-GA (18 November 2026)

Full screen: the "+ Epic" and "+ Project" dialogs, the confirmation dialogs, the tooltips and the other pop-ups were drawn behind the planner while it was in browser full screen, so they could not be seen. They are now attached inside the full-screen element so they always appear on top, and they move there if you enter or leave full screen while one is open. Also fixes from the 6.22.1 review: "Move to next sprint" no longer fails with "H is not defined", Escape now closes the confirmation dialog and the Open in GUS menu instead of being swallowed by the page, and the Create drafts / Review & save button keeps its permission tooltip. Mocked only; not checked in a browser.

## 6.22.1-GA (18 November 2026)

Review fixes. The in-app confirm dialog definition no longer fails when the page loads (it also stopped the new Open in GUS menu from working). The "Create N drafts in GUS" button is now always visible: it counts only above-the-line drafts, and when there are none it reads "Review & save to GUS" again, because that action still re-saves project, priority and description changes that edits do not send on their own. The Open in GUS menu opens leftwards on the planner so it is not cut off, and the arrow keys are safer. Mocked only; not checked in a browser.

## 6.22.0-GA (18 November 2026)

The row of "Open in GUS" chips (New Epic, Epics, Projects, Programs and the equivalents on other pages) is now one "Open in GUS" menu. Open it to pick a destination: "Create" items (New Epic, New work item …) and "Go to list" items (Epics, Projects, Programs …). It opens in a new GUS tab, closes on Escape or an outside click, and works with the arrow keys. Same links as before on every page. Mocked only; not checked in a browser.

## 6.21.0-GA (18 November 2026)

"Review & save to GUS" becomes "Create N drafts in GUS" while the plan has above-the-line epics that are not in GUS yet (6.22.1: it stays visible and goes back to "Review & save to GUS" when there are none). The review dialog is unchanged. Mocked GUS only; not checked in a browser.

## 6.20.1-GA (18 November 2026)

Fix for 6.20.0: the first manual edit of a release date after picking a planned release no longer snaps back. Also: a release with no GUS dates is no longer left half-cleared, ended releases show as "Saved release", and tile tooltips no longer double-escape "&" and apostrophes. Mocked GUS only; not checked in a browser.

## 6.20.0-GA (18 November 2026)

New "Planned Release" dropdown above the Release Window dates in Release Planning. Each option shows the GUS planned release with its start and end dates; picking one fills the window dates automatically from GUS, and the capacity figures recalculate. "Custom dates" lets you type your own dates, and editing a date by hand switches the dropdown back to Custom. The choice is saved with the plan. Releases without dates in GUS cannot fill the window. A release that has since ended still shows as "Saved release" instead of silently reverting to Custom. Also includes the 6.18.0 darker green row highlight (project and epic rows) and the 6.19.0 compact summary tiles; the open-in-GUS icon and the +Epic and V2MOM buttons keep their own hover colours on a highlighted row. Mocked GUS only; not checked in a browser.

## 6.19.0-GA (18 November 2026)

The ten summary tiles at the top of Release Planning are smaller (about 50px tall instead of 72px). Each tile now has a clearer, darker label in capitals, a bold value with its unit (d = days), and a one-line explanation underneath; hover a tile to read the full explanation. The status chip stays at the top right. Mocked GUS only; not checked in a browser.

## 6.18.0-GA (18 November 2026)

The row under the mouse in the Release Planning table is now highlighted in a darker green (project rows and epic rows). Mocked GUS only; not checked in a browser.

## 6.17.1-GA (18 November 2026)

Review fixes for the project open-in-GUS link. It is now 24px (matching the other project-row controls) with even spacing, clicking it while a menu is open opens GUS instead of only closing the menu, and its screen-reader label names the project. Mocked GUS only; not checked in a browser.

## 6.17.0-GA (18 November 2026)

The "Open in GUS" icon on a project row now sits right after the measure name, before the V2MOM button, instead of at the far right of the row. Mocked GUS only; not checked in a browser.

## 6.16.3-GA (18 November 2026)

Review fixes for 6.16.2. Switching from "Add existing GUS epic" back to "Create new epic" now shows the Workstreams section again after another team's epic was picked (and a stray error when opening Add project is gone). Pressing Enter while composing text in the find box no longer submits the dialog. The Add button label updates after the workstream inputs are cleared. Mocked GUS only; not checked in a browser.

## 6.16.2-GA (18 November 2026)

Follow-up fixes for the epic search. Saving the plan now looks up each epic's real team in GUS instead of trusting the flag saved in the browser, so another team's epic can never have its release, effort or description overwritten. Epics found by search are no longer dropped when they belong to your team but to a different project. Workstreams are hidden when you pick another team's epic (they cannot be created under it). Inline grid edits to another team's epic are skipped rather than failing. Pressing Enter while composing text in the search box no longer submits. Mocked GUS only; not checked in a browser.

## 6.16.1-GA (18 November 2026)

Review fixes for the epic search. An epic found from another team is now only tagged to the project: saving the plan changes its project and nothing else (its release, effort, priority, description and owner are left alone), and the release and effort checks are skipped for it, so it can no longer block saving the rest of the plan. The dialog says so when you pick one. Epics of your own team are saved in full as before. Results found by the search are no longer lost if the project's epic list finishes loading afterwards. Edits made in the grid to another team's epic are not written to GUS (only the project tag is). Mocked GUS only; not checked in a browser.

## 6.16.0-GA (18 November 2026)

Add any GUS epic to a project. In "Add epic" > "Add existing GUS epic" there is a new "Find any GUS epic" search. Enter the W-number of a work item (its epic is added), an epic Id or a GUS epic link, or part of the epic's name, and the matching epics from any team or project are listed (with their current project and team). Pick one, choose ABL/BTL, optionally add workstreams, and it is added to the table; saving the plan to GUS tags the epic to this project (its project is changed to this one). The dialog tells you when the epic currently belongs to another project. The list still starts with the project's own GUS epics. Also fixes from the 6.15.0 review: the "x of y epics" count no longer disappears while typing in a column search, and an input-method composition is no longer cut off by a pending redraw. Note that GUS epics have no W-number of their own; a W-number resolves to the epic of that work item. Tested against a mocked GUS only; not checked in a browser.

## 6.15.0-GA (18 November 2026)

Remaining review items for the planner table. Project rows have 10px side padding as intended. The blue drop-position line shows again when dragging an epic row. The project row's GUS link, expand arrow, "+ Epic" and delete buttons are 24px click targets. Column search: the "x of y epics" count is announced to screen readers, typing with an input-method editor (Chinese, Japanese, etc.) is no longer interrupted by the redraw, "Clear filters" updates while you type in a column search, and the Status search matches the epic's own status only (workstream statuses are searched in the "WS status" column). Not checked in a browser.

## 6.14.1-GA (18 November 2026)

Review fixes for 6.14.0-GA. Epic and workstream rows had kept a bright 7px project-colour bar at the left; they now use the same faint 3px accent as the project rows, so no bright coloured lines remain in the table. The column search row keeps its compact height, project rows highlight on hover again, and the header row has a fixed 28px height so the search row sits flush under it. Not checked in a browser.

## 6.14.0-GA (18 November 2026)

Compact Release Planning table. Smaller type throughout: column headers 11px, project names 12.5px (were 14px bold), V2MOM chip, epic/ABL/BTL counters and "+ Epic"/delete buttons 10.5-11px, and tighter project rows. The per-project coloured lines are gone; project rows use one thin neutral separator with a faint left accent in the project colour. Same structure and columns. Also the column search boxes are now 22px. Note: 6.11.1 to 6.13.1 were uploaded but their activation was rejected (the review verdict used an invalid recommendation value), so they were not live until 6.13.1-GA was activated; this release includes all of them. Not checked in a browser.

## 6.13.1-GA (18 November 2026)

Review fixes for the column search. The Doc, HRP V2MOM and CFS V2MOM column searches now look at what those columns show (the Doc search matched nothing before). Searches in a column you then hide no longer filter silently. Creating an epic, clicking a summary tile, or "Clear filters" also clears the column searches, and "Clear filters" is enabled when only column searches are set. Typing no longer pulls focus back from a cell you clicked into, and the search boxes keep their 24px size. Not checked in a browser.

## 6.13.0-GA (18 November 2026)

Inline column search in the Release Planning table. A second header row has a "Search" box under every column (Project, Epic Name, Workstream, Epic Owner, Workstream Owner(s), WS Est, Epic Est, ATL/BTL, Theme and any other column you add). Type free text and the grid is filtered as you type; a box with text is highlighted, several boxes combine (all must match), and a "Clear" button under Actions resets them. An epic is shown when its own value or any of its workstreams matches the column text (e.g. a Workstream Owner search keeps the whole epic with its workstreams). Searching Project alone also lists matching projects that have no epics yet. The box texts are not saved between visits. Works with the existing filters and "Clear filters". Unit-level check only; not checked in a browser.

## 6.12.0-GA (18 November 2026)

Release Planning table styling. Column headers are larger (12px, bold, dark blue) instead of the 10px grey. Project rows no longer use a different bright colour line per project: they have one thin neutral separator, a soft left accent in the project's colour, a light background and a hover state. The ABL/BTL counters, "+ Epic" and delete buttons are larger and use the same blue and neutral palette as the rest of the dashboard. CSS only; not checked in a browser.

## 6.11.1-GA (18 November 2026)

Review fixes for 6.11.0-GA. The automatic linking of a team's shared projects to its own GUS projects is now saved (it was applied on screen but the save was skipped because the planner reset to "saved" right after). On commit, a shared project still linked to another team's program is treated as unlinked and found or created by name in this team's own program, so epics never go under another team's GUS project. Removed an unused parameter. Unit tests only; not checked in a browser.

## 6.11.0-GA (18 November 2026)

The shared HRP projects are now created in GUS for the teams, not by users. The "Create shared projects in GUS for all teams" button added in 6.10.0-GA is removed. The 24 `HRP M…` projects (with V2MOM methods) were created once in the GUS programs MQ - 268, MAPS - 268, VegaCache - 268, VegaCache FACE - 268 and VegaStore - 268 (120 records). Release Planning now links each team's shared projects to its own GUS project automatically when the plan opens (exact name match in the team's program), so epics commit under the team's own project. Caching Services has no "Caching Services - 268" program in GUS, so no projects were created for it. Unit tests only; not checked in a browser.

## 6.10.0-GA (18 November 2026)

Per-team GUS projects. The Projects menu has a new "Create shared projects in GUS for all teams" button (plan administrators only, with a confirmation step). For each team in the dashboard it creates the shared HRP projects in that team's own GUS program ("<team> - 268") with their V2MOM method, or links the project if one with the same name already exists there, then saves the GUS links in that team's plan. Safe to run again. The GUS link and program are now per team: they are no longer shared through the project catalog, so each team's projects belong to its own program. A team with no GUS program is reported and skipped. Review fixes: a project linked to another team's program is relinked to this team's; the GUS links are applied to a fresh copy of the plan so a save made during the run is not lost (and a failed save is reported, re-running links the existing projects); one run per team at a time; the program is looked up once per team instead of once per project; unsaved edits are saved before the run and the planner is not overwritten afterwards. Unit tests only; nothing has been created in GUS yet, and not checked in a browser.

## 6.9.1-GA (18 November 2026)

Review fixes for the shared HRP projects: editing a project no longer drops the catalog's seed marker (which caused repeated catalog rewrites and possible lost updates), deleting a project from GUS now clears its GUS link for other teams, and a hidden project an epic still uses is kept. Open and not fixed: simultaneous edits to the shared catalog by two teams are still last-write-wins; re-adding a hidden GUS project can create a duplicate; the first team to commit a seeded project creates it in its own GUS program and other teams then attach to it. Unit tests only.

## 6.9.0-GA (18 November 2026)

Shared HRP V2MOM projects. The 24 FY27 HRP measures owned by Amit Kumar (GCP method excluded) are added once to the shared project catalog, named `HRP M1.1.1 - <measure>`, with the V2MOM method set to the refs from the FY27 HRP V2MOM Review sheet (`HPS M2.1.1 | HPS M2.1.2 | ...`, or `NO V2MOM Reference`). Every team's Release Planning lists them. They are plan-level projects: nothing is created in GUS until a team commits an epic under one, and then the method is written to the GUS project as before. Removing a project from the dashboard now hides it for that team only (saved in that team's plan as `hiddenProjects`); before, removing it deleted it from the shared catalog for every team. Leaves, holidays and on-call were already saved per team in GUS Apps storage and used in the capacity calculation; tests now cover that round trip. Verified by unit tests only (5 new); not checked in a signed-in browser or against live GUS. Refs come from the review sheet, which is not the same version as the snapshot.

## 6.8.0-GA (18 November 2026)

The open-in-GUS icon button is smaller (18px button, 11px icon). CSS only; not checked in a signed-in browser.

## 6.7.0-GA (18 November 2026)

Release Planning grid: the "+" (add workstream) button now appears on every workstream row, not just the first and last. It adds the new workstream directly below that row. Order can still be changed with the grip handle on each row (drag, or Up/Down keys). Epic delete stays on the first row. The "open in GUS" button on project and epic rows now uses the box-with-arrow icon instead of the circled arrow. Review fixes: the Theme input placeholder is now HTML-escaped (it became a default column in 6.6.0), the V2MOM chip font declaration is valid, and a dead CSS rule was removed. Also: a workstream added with the New workstream dialog now inherits the epic's ABL/BTL (it was always BTL before, so it did not count toward ABL capacity), and the project title row keeps its flex layout so the V2MOM chip sits on one line. Verified by syntax check and unit tests only; not checked in a signed-in browser.

## 6.6.0-GA (18 November 2026)

Release Planning grid decluttered: the project header is now one line (project name, then a small "V2MOM ▸" chip). The V2MOM method shows on hover, or inline on the same line when the chip is clicked (session-only). The Theme column replaces Sprint in the default columns; anyone who already chose their own columns keeps them, and Sprint stays available in the column chooser. Verified by unit tests only; the layout has not been checked in a signed-in browser.

## 6.5.0-GA (18 November 2026)

Follow-up to the 6.4.0-GA review caveats: workstream theme short forms match whole words only ("Roadmaps" is no longer MAPS, "VegaCache Interface" is not VC-FACE); every GUS rejection message when creating projects, epics, workstream stories, themes and plan updates now reads as plain text (object errors no longer print as `[object Object]`, HTML is stripped); the "no theme short form" warning now tells users to ask a plan administrator. Verified by unit tests only (focused plan tests pass; full-suite baseline of 38 pre-existing failures unchanged); not verified against live GUS.

## 6.4.0-GA (18 November 2026)

Workstream theme short forms are now fixed per team: Message Queue = MQ, MAPS = MAPS, Caching Services = VC, VegaCache FACE = VC-FACE, VegaStore = VS (theme `R<release>_<short>_Workstream`, e.g. `R268_VC-FACE_Workstream`). A team with no short form no longer falls into a shared catch-all theme: the workstream is still created and a warning explains that no theme was applied. A theme-creation race is now recovered when GUS answers "duplicate value" as well as "already exists", and GUS error objects are formatted as text instead of `[object Object]`. Verified by unit tests only (focused plan tests pass; full-suite baseline of 38 pre-existing failures unchanged); not verified against live GUS. Assumption to confirm: Caching Services maps to VC.

## 6.3.0-GA (18 November 2026)

Workstream stories now carry a single generic theme named `R<release>_<team>_Workstream` (for example `R268_MQ_Workstream`) that separates workstreams from engineers' user stories. The release number comes from the epic's planned release (falling back to the planning release 268) and the team short name from the team. The per-workstream theme (`WS: <project> › <name>`) and the bare `Workstream` theme are no longer applied; themes already created in GUS are left untouched. An existing theme with that name, even one owned by another team, is reused instead of failing with "A theme with this name already exists", and GUS error text is stripped of HTML (including unclosed tags) before it is shown. Verified by unit tests only (focused plan tests pass; full-suite baseline of 38 pre-existing failures unchanged); not verified against live GUS.

## 6.2.0-GA (18 November 2026)

Follow-up to the 6.1.0-GA review caveats: the plan commit review now blocks a new (not yet in GUS) project whose name is over 80 characters, with a pointer to the Projects panel; the server message reports the real length; the suggestion box no longer offers an empty suggestion. Verified by unit tests only; not render-verified in a browser.

## 6.1.0-GA (18 November 2026)

Release Planning search box placeholder simplified to "Search by project, epic, workstream or person". Release Planning "Add project" and "Add epic": when a Project (Measure) or Epic name exceeds the GUS limit of 80 characters, the dialog shows a live counter and a smart suggestion that fits (collapses "Expanded Name (ACRC)" to "ACRC", abbreviates common words, drops trailing timing such as "by Q3", then cuts at a clause or word boundary) with a one-click "Use suggestion" button. Project names over 80 are now rejected up front on both client and server instead of surfacing GUS's "data value too large" error. Verification: unit tests for the shortener and plan backend pass; not render-verified in a signed-in browser. 6.0.0-GA (GOLDEN) and 5.1.1-GA (PLATINUM) are unchanged.

## 6.0.0-GA · GOLDEN BUILD (15 November 2026)

Designated GOLDEN BUILD by the user. Contains everything through 5.8.0-GA (selected-teams label, animated and smoother sidebar). Also restyled the sprint picker on the standup page as a blue pill with calendar icon and chevron. Renamed the applet and dashboard header from Release Intelligence to ReleaseIQ (manifest title, page title, header, nav labels, logo aria-labels, Slack nudge signature, docs); slug unchanged. Header now shows "ReleaseIQ - <tagline>" on one line. Header tagline reworded to describe the dashboard's purpose. Home tab, sidebar tooltip and back-links now say "Team Hub" (not ReleaseIQ). Standup action log: work items with open action items show a distinct rose, pulsing icon (with count when more than one); hovering opens a card listing each open item (details, priority, status, owner) with Resolve and ETA update (new `sal-eta` backend action). Action-item hover card no longer sticks open (it was re-opened by the focus returning to the icon after the dialog closed; it now opens on hover or keyboard focus only and closes on blur). Adding an action item now closes the dialog immediately and saves in the background, showing the item at once and rolling back with a message if the save fails. Sprint Action Log: Actions column widened so no button clips, and a new Edit action (details, owner, priority, ETA; saves in the background with rollback on failure; new `sal-edit` backend action). Cleaner nudge message: work items now link to ADM_Work__c (they were wrongly sent as ADM_Epic__c), action-item text is no longer cut mid-word or split across lines, the copied Slack DM no longer starts with a raw <@ID> mention, and the draft is laid out as greeting / nudge / ask / link. Nudge: new **Send on Slack** button sends the message as a DM from the shared Slack bot (recipient resolved server-side, "Sent by <name> via ReleaseIQ" appended, message link shown); Copy message stays as the fallback. The bot token is never stored in this repo: it is read at runtime from the secret document the OneJDK dashboard maintains (or SLACK_BOT_TOKEN). If the token is unavailable or Slack rejects the send, the dialog falls back to copy. Nudges: Send on Slack now posts through GUS MIYO into a per-team Slack channel (engineer @mentioned, confirmation names the channel); channels are configured in the nudge dialog under Slack channels… and shared by everyone. The old bot-token DM path is no longer used. Trust Champion: the PD on-call / Trust Hero rota cards and Slack rota import are removed; the page is now the PagerDuty alerts table (sortable columns: time, alert, type, severity, urgency, scope, client, meaning, action items, service, thread, plus PagerDuty/Argus links and summary chips). It reads the team's PagerDuty Slack channel (MAPS: #maps-pagerduty, MQ: #mq-pagerduty) through the GUS MIYO platform Slack helper (channel declared in manifest.json slack.channels; shared bot token only as fallback), read-only, last 45 days; Refresh always fetches fresh and the page auto-refreshes every 3 minutes; click an alert's replies to read its Slack thread in place, and hover an alert for an AI summary and next steps of its thread; shows a clear message if the bot cannot read the channel. Sprint pages: select open work items (checkbox next to the work ID) and use Move Work to Next Sprint to set their GUS Sprint to the team's next sprint (confirmation first; closed items are never moved). Work items tables: Epic column narrowed (32-34% to 20%) so Subject gets the extra width. Immutable rollback baseline; 5.1.1-GA remains PLATINUM.

## 5.8.0-GA (15 November 2026)

Sidebar open/close is slower and smoother (~0.5s ease, staggered label fade, 450ms close delay).

## 5.7.0-GA (15 November 2026)

Side-menu tab now has a continuous subtle bounce and glow (stops on hover/open, off under reduced-motion) so the hidden sidebar is discoverable.

## 5.6.0-GA (15 November 2026)

Added a "Selected Teams or Releases:" label before the selected team/release chips (Release Review and V2MOM Updates).

## 5.5.0-GA (15 November 2026)

Removed the "Open in GUS" chips (Epics, New Epic) from the V2MOM Updates page; the tab's open-link icon remains.

## 5.4.0-GA (15 November 2026)

Added spacing between the tab bar and the applied filter chips (selected release).

## 5.3.0-GA (15 November 2026)

Removed the "Open in GUS" chips (New Epic, All epics, New work item) from the Release Review page; the tab's open-link icon remains.

## 5.2.0-GA (15 November 2026)

First minor version after the PLATINUM 5.1.1-GA (which, with GOLDEN 5.0.0-GA, stays untouched). The open-link icon on the Hourglass tab now opens the Hourglass site (https://git.soma.salesforce.com/pages/core-foundational-services/hourglass/) instead of a GUS page.

## 5.1.1-GA — PLATINUM BUILD (15 November 2026)

Designated by the user as the master build and first rollback choice (revision 20261115-67); 5.0.0-GA stays as the GOLDEN BUILD second rollback baseline, frozen at revision 20261115-65. Same code as the final 5.0.0-GA revision with the version, footer (`v5.1.1-GA`) and asset suffix updated. Revision 20261115-67 also adds an open-link icon inside the right end of the active tab that opens the selected team's matching GUS related list (Sprints, Epics, Team Dependencies, Work items, team members, or the team record; object list view for All teams). Highlights since the first 5.0.0-GA snapshot: Release Planner allocation rules (workstream effort baseline, ABL only for ATL-tagged workstreams, split among assigned engineers, highlighted Unassigned row and filter), delta-only Save to GUS with reviewed summary, distinct project colour bars, WS Est before Epic Est, fixed Test Failures table widths, calmer page loads and faster planner reference loads.

## 5.0.0-GA — GOLDEN BUILD (15 November 2026)

Designated by the user as the best working state and rollback baseline (previous: 4.0.0-GA). Rolls up everything since 4.0.0-GA (plans 133–139):

- Hourglass: team-level trend, seven-section team view, clickable filters from tiles, donuts, bars and trend; links to PRs, repos and GUS work items; Engineer column; hover reasons; best-practice thresholds, guardrail strip and per-PR recommendations.
- Dimensional 3D side-bar icons; Daily Chronicle side-bar link (MQ only); header logo; tooltips above the side bar.
- Footer: GUS Apps Hub link removed, "For feedback, reach out to Bhanu Kasiraju" added; the duplicate header "Sources & connection" button removed (the footer link remains).
- Sources & connection panel redesigned into five numbered sections (Release, GUS epic lists and links, Connection, Drafts, Annual V2MOM baseline) with status chips, link chips for the GUS lists and a verified-definition card; Edit sources is now the primary footer action.
- New product logo: stacked 3D layers with an AI spark (replaces the bar-chart-and-magnifier mark) in the side-bar brand, header and favicon.
- Loading animation: removed the 3-second minimum display time (the screen leaves as soon as the page has settled). The Plan, Execute, Review, Iterate chips now step once per second, each in its own colour with a smooth cross-fade.
- Sprint dates: three 3D calendar icons (start, end, days left) sit at the far right of the Standup toolbar, followed by Full-Screen as the last item; they are hidden on Pulse. They also appear in the Epics header, with the date embedded: sprint start, sprint end (both from the GUS sprint record) and days left. Days left is recomputed from the end date at local midnight and when the tab regains focus; the tooltip also shows GUS's own working-days figure. The sprint payload now includes Start_Date__c and End_Date__c.
- Epics header: "Epics" and its count on the left, the calendar icons at the right of the same line.
- Sprints (Full-Screen): the Sprint header is centred over the three timeline tiles.
- Release Planning: the Open in GUS chips now sit inline, before the Full screen / Export template / Import controls.
- Sprints (Full-Screen): the sprint timeline tiles now carry a "Sprint <name>" header with the sprint icon above them; icon and font sizes tightened.
- Release Planning: KPI tiles restyled to the neutral white card style used on Bugs and Home (no coloured bars or gradients; consistent label/number/sub sizes; neutral chips).
- Bugs: the 12-week trend chart is drawn at its real width (no more scaling), shorter, with slim bars and thin lines matching the rest of the UI.
- Home: tiles are capped at three lines — title, number and label inline (e.g. "8 open P0–P2 bugs"), then chips or a two-line description; fonts tightened.
- Sprints (Full-Screen): with an epic selected, the first Esc clears only the epic filter; the next Esc exits full-screen.
- Sprints: new 3D agile-sprint icon (iterate-loop arrow with a gear magnifier, supplied artwork redrawn as a 3D SVG) before the Sprint title on the sprint row.
- Sprints (Standup): the page description now describes the standup walkthrough instead of the Pulse text.
- Sprints: deep links — `#/sprints/pulse` and `#/sprints/standup` open that view directly; the address bar follows the Pulse/Standup toggle.
- Sprints (Standup): engineer tiles show Planned · Actual · Completed · In progress · Blocked as icon + count (same order as the engineer header).
- Sprints (Standup): Esc (after closing any popup/filter) clears the selected engineer tile, same as a refresh.
- Sprints (Standup): extra spacing between the header row and the sprint row.
- Sprints (Standup): Prev/Next buttons removed; Shuffle moved to the controls row before Refresh.
- Sprints: the third date tile is now a number tile showing days remaining in the sprint (e.g. 10, 5, 4); Standup sprint row centred.
- Sprints (Full-Screen): sprint timeline shown as larger tiles at the extreme right, beside the epic tiles.
- Sprints: Standup title is now "Sprint"; sprint date icons are borderless, compact and always on one line.
- Header: the redundant "<Team> / <Page>" breadcrumb is removed; the page tab now reads "<Team> - <Page>" (follows the team dropdown).
- Sprints (Standup): Open in GUS bar removed; "Standup Summary for - <sprint>" and the sprint dates share a centred second line.
- Sprints: description is top-aligned on the same row as the controls in both views.
- Sprints: header rebuilt as a grid so Pulse and Standup share one clean layout (description left, controls right, dates beneath).
- Sprints (Standup): sprint dates and days-left sit on a second line, right-aligned below the buttons.
- Sprints: description on the left and the button group on the right share one line in both views; vertical spacing tightened.
- Sprints: toolbar buttons stay in the same position in Pulse and Standup (sprint selector row sits below), with padding clear of the rule above.
- Sprints: the Pulse/Standup, Action Log, Refresh, Full-Screen and sprint-date group is pinned to the extreme right of the toolbar.
- Sprints: in "Open in GUS", New work item is now the last link.
- Footer: the feedback contact name links to the owner's Slack profile for direct messages.
- Footer items are centered with · separators and sit a little lower.
- Standup alignment, bullet-driven executive summary, instant loader avatars.
- Release Planning: the "New project" / "New epic" popup is about 50% wider (the 300px cap is lifted), so the Measure name field has room; the Release Window dates now sit right after the Team dropdown.
- Bugs: the trend bars (opened / closed per week) and the Open-by-priority chips are now clickable and filter the bug table (bars list every bug opened or closed that week; click again or "Clear filter" to reset; a priority chip shows that priority's open bugs).
- Hourglass: all numbered sections are collapsible (click the header); sections 1-2 start expanded, 3-7 collapsed.
- Release Planning: every field in the New project / New epic popup (Project, Epic name, Planned release, ATL/BTL, Short form) now spans the full popup width.
- Release Planning: the New project / New epic popups are restructured: a titled header, bordered 36px fields with a focus ring (epic: name on top, Project / Planned release / ATL-BTL in one row), and a bordered footer with Cancel and Add.
- Test Failures: the Status dropdown in the Open TFs tables no longer clips; columns have fixed widths (ID, Assignee, Found in, Scheduled, Age, Status) and Subject takes the remaining space.
- Release Planning: the filter bar and the grid actions are one line - Search and the Release / ATL-BTL / Engineer / Theme / Group by filters, Clear and the epic count on the left; + Epic, + Project, Projects and Columns grouped on the right.
- Release Planning: the filter-bar search is narrower (so Release / ATL-BTL / Engineer / Theme / Group by have room) and the epic count is aligned on the same baseline as the controls.
- Test Failures: Status column widened to 230px so long statuses are not clipped; the page assets (CSS and scripts) now carry a revision in their URL so browsers pick up each update instead of serving a cached copy.
- Release Planning: removed the "Open in GUS" chips (New Epic, Epics, Projects, Programs) from the page.
- Release Planning: "Open in GUS" chips are back on the Release Planner tab and stay hidden on the Planned Release Summary tab.
- Release Planning, Save to GUS: the review step is now a detailed summary (epics to create / update, new projects, planned days, planned releases; per epic: project, program, release, priority, owners, theme / HRP / V2MOM, design doc and every workstream with engineer, days and status) and nothing is written until the user ticks an explicit acceptance box and presses "Accept & create in GUS" (the backend rejects confirmation without it). Epics are created or updated under their planned release with project, priority, planned effort, development lead and a description carrying all plan details; if the org rejects the description or lead fields the epic is saved with the core fields and the result says so.
- Release Planning: added a "Pending GUS save" KPI tile (above-the-line epics not yet created in GUS, out of all ABL epics) to fill the free slot in the summary row.
- Release Planning: the summary KPI tiles are clickable and filter the Projects & epics grid - Planned ABL / Headroom to above-the-line work, Planned BTL to below-the-line work, Over-allocated and Time off & on-call to the engineers concerned, Unassigned effort / Incomplete epics / Pending GUS save to the matching epics, Available and Total planned to everything. Click the active tile again (or Clear filters) to reset.
- Save to GUS is delta-only: each saved epic stores a fingerprint of what was last written (epic fields, description, and each workstream). The review marks every epic Create / Update / Unchanged and flags workstreams New / Changed; unchanged epics send nothing, a new workstream on a saved epic updates that epic's effort and description (never creates another epic), BTL-only changes are not sent, two unsaved epics with the same name are blocked, and a second save while one is running is refused.
- Faster loads: Release Planning reference lookups no longer wait on each other (team lookup and releases run together, team name cached 10 minutes, reference lists cached 60 seconds per team and cleared on Save to GUS); the loading screen leaves 100 ms sooner once the page has settled.
- Calmer page load: removed the slide-in animation on every page render and the bobbing tab icons, hover lift on tiles/KPIs, smooth-scroll jumps and the swap animation; reserved the scrollbar gutter so the page no longer shifts sideways when a scrollbar appears.
- Test Failures page tables: column widths are now set on the table itself (colgroup + inline width, independent of cached CSS); Status dropdown fills its column, ID and Nudge stay on one line, subject is uncapped.
- Open TFs tables (Hourglass): fixed, content-sized column widths with the subject taking the slack; the Status dropdown stays inside its column and nothing spills past the table edge.
- Project colour bars (planner grid and priority board) use a high-contrast palette (distinct hue per measure/project, golden-angle hues beyond 14) with a white gap beside the bar. Re-instated after a brief revert; this is the wanted behaviour.
- Release Planner grid: WS Est now sits before Epic Est (also applied to saved column layouts where they were adjacent).
- Release Planning allocation: a workstream with no engineer of its own stays in **Unassigned**, even when its epic has owners. The engineer allocation table shows one highlighted "Unassigned" row with that ABL/BTL effort; clicking it (or the "Unassigned effort" tile) filters the grid to the epics that have such workstreams. Workstream effort is the only allocation baseline (the epic total is just the sum of its workstreams, no epic-estimate fallback), and effort counts as ABL only when that workstream is tagged ATL; otherwise it is BTL. Marking an epic BTL marks every workstream under it BTL.
- Release Planning allocation: the equal split applies at both levels - a workstream with several engineers divides its days by the number of engineers (unchanged), and an epic that has an Epic Est but no workstream days is now counted too, divided equally among its owners. Epics with workstream days are not double counted.
- Folded into the same version at the user's request (revision 20261115-65); the first 5.0.0-GA snapshot is kept at `releases/5.0.0-GA-original/` and tag `GOLDEN-BUILD-5.0.0-GA-original`.
- Rollback: `releases/5.0.0-GA/` ZIP (SHA-256 in `build.json`), tag `GOLDEN-BUILD-5.0.0-GA`.
- Verification: unit tests 225 pass / 38 fail (same as baseline); UI changes not render-verified in a signed-in browser.

## Unreleased on top of 4.0.0-GA (plan139) — tooltips above the side bar

- Tooltips no longer render behind the side bar; they sit above it, and tooltips for side-bar icons open to the right of the icon.

## Unreleased on top of 4.0.0-GA (plan139) — Daily Chronicle

- The side-bar MQ Chronicle entry is renamed Daily Chronicle and opens the selected team's chronicle page in a new tab. Only MQ has a page today; other teams show it disabled until their page is added to the `CHRON` map in `public/rail.js`.

## Unreleased on top of 4.0.0-GA (plan139) — MQ Chronicle enabled for MQ only

- The MQ Chronicle side-bar icon links out only when the MQ team is selected; for every other team (and All) it is greyed out and not clickable,.

## Unreleased on top of 4.0.0-GA (plan139) — MQ Chronicle in the side bar, header logo

- New side-bar entry "MQ Chronicle" with a 3D timeline-ledger icon; it opens the MQ Chronicle page (git.soma Pages) in a new tab. The header title now starts with the product logo.

## Unreleased on top of 4.0.0-GA (plan139) — Hourglass links, engineers, hover reasons, guardrails

- Slowest PRs: PR title, repo and #number link to the PR / git.soma; the work item links to GUS; new Engineer column (avatar and git login), 1st review and Size columns, delay tags and a per-PR recommendation with its best-practice threshold.
- Hover reasons on cycle time, first review, size, comments, tags and repository notes explain the number against the target.
- Root causes now show the best-practice threshold, the recommended action and linked example PRs with author and cycle time; recommendations show their threshold.
- Guardrail strip (median ≤ 8h, P80 ≤ 16h, ≥ 90% merged within 24h, first review < 4h, size ≤ 400 lines) on the team and all-teams views, with actual vs target.
- Data: `prs` now carries `author` and `wi`.
- Verified on unit tests only (no live render check).

## Unreleased on top of 4.0.0-GA (plan138) — Hourglass charts rebuilt and clickable

- Trend redrawn at its real pixel width (no more scaled, oversized bold axis text); fonts now match the rest of the app. Target labels no longer collide. Clicking a sprint on the trend opens that sprint.
- Summary Metrics now has one balanced two-pane row: merge-time donuts and the cycle-time distribution on the left, the trend (with its tiles) on the right.
- Tiles, donuts and distribution bars are clickable filters (median / P80 slower than target, merged within or over 24h, above-average comments, each cycle-time bucket). The filter updates Cycle Time by Repository, Slowest PRs (count and "show all"), Root Cause Analysis and Recommendations, with a Filtered bar showing the slice's count, median and P80 and a Clear button. The filter resets when the team or sprint changes.
- The data file now carries every merged PR per generated sprint (for the filters), rebuilt from the cached GUS and git.soma data; headline numbers are unchanged. Sprints shown only from the published reports (07a to 09a for MAPS and MQ) have no PR list and so no filters.

## Unreleased on top of 4.0.0-GA (plan137) — loader avatars paint immediately

- The loading screen's avatar strip is now drawn by a small inline script right after the loader markup, so the circles and their photos start fetching during HTML parse instead of after the app scripts and the roster call finish. It uses the last roster the app saw (`hub-boot-strip`, refreshed on every load), or a built-in list of team members on a first visit. Leaders are excluded as before. Added a preconnect to the Slack avatar host.
- The deferred loader code no longer rebuilds the strip when it was pre-painted, so the animation does not restart; it only refreshes the saved list for the next load.

## Unreleased on top of 4.0.0-GA (plan136) — Hourglass executive summary as bullets

- The Executive Summary paragraph is now a one-line verdict plus two bullet panels: Accomplished (targets met, PRs merged and work-item coverage, improvement versus the previous sprint, fast first review) and Growth areas (targets missed, slowdown versus the previous sprint, top root cause with hours lost, slow first-review share, large PRs, slowest PR). Rule-based from the existing metrics; no AI.

## Unreleased on top of 4.0.0-GA (plan135) — Sprint standup work-item rows realigned

- Fixed the standup member view where every cell sat one column to the right of its header (subject under QA, status under Planned, churn wrapping onto a second line). The SAL button was a stray extra grid cell; it now sits inside the Work cell. Status pills no longer wrap, and the numeric cells are right-aligned under their headers.

## Unreleased on top of 4.0.0-GA (plan134) — dimensional side-bar icons

- Replaced the basic side-bar glyph tiles with purpose-drawn dimensional icons named for each page: house (Home), rocket (Sprints), node graph (Dependencies), flask (Tests), shield (Trust Champion), bug (Bugs), hourglass (Hourglass), package with check (Review), roadmap calendar (Planning), target with arrow (V2MOM) and database (Sources). Inline SVG with extruded edge, gloss and shadow; no image assets. Other icons in the app are unchanged.

## Unreleased on top of 4.0.0-GA (plan133) — Hourglass follows the top-level team and the original report layout

- Removed the page-level Team selector: Hourglass now uses the top-level team (MAPS, MQ, VegaCache). "All" shows the 3-team comparison; other teams get a note that Hourglass covers those three.
- Trend redrawn in the Bugs-trend style (fixed 760x220 chart, 10.5px axes, light grid, tiles above, legend, dashed 8h/16h targets).
- Team view restructured into the original sections: Executive Summary, Summary Metrics (six tiles and three donuts; % Core PRs shows n/a because Core-on-Git PRs are not collected), Cycle Time by Repository (bars and notes), Slowest PRs (with root-cause sentence), Root Cause Analysis (expandable, badges), Recommendations (priority, owner, expected impact) and Visibility Gaps.

## Unreleased on top of 4.0.0-GA (plan132) — Wider Projects popovers

- The Projects popover and the New project popup are wider so full project / measure names are visible.

## Unreleased on top of 4.0.0-GA (plan131) — Hourglass limited to MAPS, MQ, VegaCache; Release Window label

- Hourglass data now covers only MAPS, MQ and VegaCache (VegaCache generated for 09a, 10a, 10b, 11a; it has no published Hourglass reports).
- Release Planning: the "Window" date label is now "Release Window".

## Unreleased on top of 4.0.0-GA (plan130) — Loading animation shows team members only

- The loading marquee skips the CFS leaders and shows only team members.

## Unreleased on top of 4.0.0-GA (plan129) — Hourglass PR cycle-time page

- New Hourglass tab and page: PR cycle time per team and sprint (median, P80, % merged under 24h, first-review time), distribution, trend 07a to 11a, rule-based root causes and recommendations, repositories, slowest PRs, visibility gaps, and an all-teams comparison against the Hourglass targets (8h, 16h, 90%).
- Data is a static file (`public/hourglass-data.json`) built offline by `scripts/hourglass/` from GUS and git.soma. No AI or cost. Sprints 10b and 11a (in progress) are generated for 30 HRP teams; 07a to 09a headline numbers come from the published Hourglass reports.
- Known limit: PRs are matched by the `@W-` number in the title and Core-on-Git change lists are not included, so counts are a lower bound (MAPS 09a check: median 4.7h matched, 38 PRs vs 49 published).
- Refresh: run `collect.py`, `published.py`, `build.py`, bump the fetch suffix in `public/hourglass.js`, deploy.

## Unreleased on top of 4.0.0-GA (plan128) — Visible handle for the hidden side bar

- A small blue tab with a chevron sits at the left edge, vertically centered, so the side bar is discoverable. It nudges three times on load, widens on hover, and hides while the side bar is open.

## Unreleased on top of 4.0.0-GA (plan127) — Bug trend summary; auto-hiding side bar

- Bugs page: new "Bug trend · last 12 weeks" card with Opened, Closed, Net and Open-backlog tiles, open-by-priority chips, and a chart of weekly opened vs closed bars with the open backlog line (new `hub-bug-trend` action; weekly buckets computed from CreatedDate and Closed_On__c, backlog rebuilt from today's open count).
- Side bar auto-hides off-screen so it never overlaps page content, and the page uses the full width. Moving the pointer to the left edge (or tabbing into it, or tapping the edge) slides it in with the dock animation; moving away hides it.

## Unreleased on top of 4.0.0-GA (plan126) — Action Log buttons no longer clip

- The Actions column in the full-screen Action Log is pinned to the right edge with a fixed width, so resolve, follow-up and delete are always visible; subject and details columns are narrower.

## Unreleased on top of 4.0.0-GA (plan125) — Nudge redesign; delete action items

- Nudge modal redesigned: gradient header with the W-ID and subject, a segmented Slack / GUS Chatter switch, a single recipient field with avatar chip and search-as-you-type results with avatars and titles, quick message styles (Status update / ETA check / Blocked?), a character counter, a clear info or warning callout, and a footer with Cancel and the primary action.
- Sprint Action Log: each row has a delete button (click once, then click again to confirm). Server action `sal-delete` removes the item from the team's record; tests added.

## Unreleased on top of 4.0.0-GA (plan124) — Fix request timeouts and avatar redirect storm

- Action-log reads no longer run the retention sweep (it listed every team's record on first load and could push a request past the 25-second limit). The sweep now runs after a save or resolve, capped at 8 seconds, and a failure never fails the request.
- Avatars: the browser no longer pre-loads every person's GUS photo fallback, which triggered dozens of `ERR_TOO_MANY_REDIRECTS` session redirects. The fallback loads only when the Slack photo fails to load, and a failed image falls back to initials.
- The roster lookup gives each Slack avatar 2.5 seconds, then uses the GUS photo or initials, so one slow avatar can't delay or time out the page.

## Unreleased on top of 4.0.0-GA (plan123) — 30-day retention for the Sprint Action Log; Standup Full-Screen button restored

- Action items are kept for at most 30 days (by creation date) for every team. Expired items are dropped on every list, save and resolve, and each team's record is rewritten as a full snapshot so earlier diffs no longer carry the expired data.
- A throttled (6-hourly) sweep converts all team records to snapshots and then permanently deletes `actions` files older than 30 days. It deletes only after every record is a snapshot, so no live record depends on a deleted event. If the GUS Apps session cannot delete files, the failure is returned and the app-level cutoff still applies.
- ETA can be at most 30 days out. The log states the 30-day retention.
- Standup: the Full-Screen button is shown again when no engineer is selected (it opens the first engineer).
- Release journals are unchanged; the 30-day rule applies only to the action log (see docs/storage-retention.md).

## Unreleased on top of 4.0.0-GA (plan122) — Dock-style side bar

- The left side bar now expands on hover or keyboard focus to show a short label under each icon, floats over the page (content does not shift) and shrinks again when the pointer leaves. Icons magnify toward the pointer like the macOS Dock, with a smooth width, label and shadow animation. Reduced-motion users get no animation. The native hover tooltips are replaced by the labels (accessible names are unchanged).

## Unreleased on top of 4.0.0-GA (plan121) — Sprint Action Log; cleaner Release Planning header

- Sprints: a small notepad icon after every W-ID (Pulse table, engineer full-screen view and Standup list) opens a small modal to capture the W-ID, assignee, action owner (any member of the selected team, defaulting to the assignee), action item details, ETA (date picker) and priority (Critical/High/Medium/Low). A red dot on the icon marks work items that already have open action items.
- New "Action Log" button on the Sprints header (with an open-count badge) opens a full-screen log of the team's action items: Open / Resolved / All filter, owner filter (team members only), mark resolved / reopen, and a Slack follow-up icon per open item that reuses the existing Nudge modal (Slack DM prepare + GUS Chatter).
- "Daily Slack summary" in the log builds the thread: header "🧵 <Team> - <Sprint> - Action Items Summary - <Date>" and one reply listing every open item grouped by owner with ETA and priority (overdue flagged). Copy header / Copy reply / Copy both. The app cannot post to a Slack channel itself (its Slack connector only does identity lookup), so the thread is pasted into Slack by hand.
- Storage: one shared record per team (`actions`) in the same GUS Apps store as plans; the owner is validated against the team's members server-side.
- Release Planning: the description paragraph, separate heading row and breadcrumb are gone. Tabs, planning window and the Team / Leaves & on-call / Save / Review & save controls now share one row; save state is shortened to "Saving…" / "✓ Saved hh:mm".

## Unreleased on top of 4.0.0-GA (plan120) — Standup starts with no engineer selected; type chips are independent

- Sprints → Standup: no engineer is selected on first view. Pick an engineer (pill, dot, Next or arrow key) and that engineer is highlighted and their epics and work items appear below. Shuffle also returns to the unselected state.
- Work-item type chips (All / User Story / Bug / …) no longer accumulate: each chip selects only its own type, and All clears the filter.

## Unreleased on top of 4.0.0-GA (plan119) — Summary sections collapsed by default; loader chips start at once

- Planned Release Summary: every section (theme distribution, priority breakdown, planning health, priority board, executive summary, saved epics) now opens collapsed. Click a heading to expand; the choice is kept while you stay on the page.
- Loader: the Plan chip is highlighted from the first frame (it used to wait about 1.3 s with nothing lit) and the chips step Plan, Execute, Review, Iterate every 0.9 s, so all four show within the 3-second minimum. The "Connecting to GUS" line is gone; the first message is the Plan one.

## Unreleased on top of 4.0.0-GA (plan118) — Incomplete epics tile counted below-the-line epics wrongly

- Fix: the "Incomplete epics" tile treated an epic as having no estimate when its epic estimate was 0, but below-the-line (BTL) epics always show 0 there because only above-the-line effort counts. It now checks the workstream days instead, so a BTL epic with effort entered is no longer flagged.

## Unreleased on top of 4.0.0-GA (plan117) — RoB/KTLO chip

- The "Capacity lost" chip on the Time off & on-call tile in Release Planning now reads "RoB/KTLO".

## Unreleased on top of 4.0.0-GA (plan116) — Priority board in Planned Release Summary

- New "Priority board" on the Planned Release Summary tab: every epic as a ranked row, in two groups (above and below the line). Each row shows a drag handle, a priority selector, the epic and its theme, planned release, status badge, a progress ring (share of workstreams marked Completed), effort in days, owner and project, with the project's colour bar on the left.
- Reorder by dragging an epic onto another in the same group (it takes that epic's priority and place), or change the priority in the row. Both save automatically through the normal plan auto-save; nothing is written to GUS until "Review & save to GUS".
- A status legend with counts sits above the list. On narrow windows the secondary columns are hidden.

## Unreleased on top of 4.0.0-GA (plan115) — Balanced planning header, subtler tiles, four risk tiles

- Release Planning header: description, save status, Team, Leaves, Save and Review buttons share one aligned row at one height; tabs and the planning window share the next row with even spacing.
- Summary tiles are subtler (thin border, light tint, no lift on hover; the 3D icons are unchanged).
- Four new tiles for planning risk: Time off & on-call (days of capacity lost), Over-allocated (engineers planned beyond availability, with names), Unassigned effort (days with no engineer) and Incomplete epics (no owner or no estimate). They turn amber or rose when something needs attention.

## Unreleased on top of 4.0.0-GA (plan114) — Smaller planner table

- Release Planner table: smaller text (11px, headers 10px), smaller days boxes, ABL/BTL toggle, estimate cells and action icons, and tighter cell padding.

## Unreleased on top of 4.0.0-GA (plan113) — Compact Release Planning

- Release Planning is more compact: less empty space above the page tab, smaller headings, summary cards, filter bar and table rows (about 25% shorter rows), and tighter tab and button heights. Layout and features are unchanged.

## Unreleased on top of 4.0.0-GA (plan112) — Release Review controls on two lines

- Release Review and Release Status: the page tab and the release / review month / Lists / Refresh controls share one line, with the controls on the right. "Open in GUS" links and the selected-release chips share the next line (links left, chips right), instead of three separate rows.
- On narrow windows the controls wrap below the tab and stay right-aligned.

## Unreleased on top of 4.0.0-GA (plan111) — Avatars on Release Planning and Release Review

- The engineer table on Release Planning and the Development Lead / Owner column on Release Review now show each person's photo before their name (initials until the photo is known or when none exists).
- One shared avatar helper (`Hub.avatarHtml`) is used for these; when a team roster finishes loading, photos are added to avatars already on screen, so no page needs a re-render and any page that uses the helper loads its roster by itself.
- Live check: the `hub-people` action returns Slack photo URLs for the MAPS and MQ rosters, so the data is there.

## Unreleased on top of 4.0.0-GA (plan110) — Avatars always load

- Fix: avatars on Sprints could be missing. The loader pre-fetches all five team rosters, and the avatar lookup only trusted the last roster loaded, so it often missed the current team's people. Rosters are now kept per team, a lookup checks the current team first and then every other loaded roster (assignees and QA can sit on another team), and rosters read from the browser cache when not yet fetched.
- A failed roster load is retried twice, and Sprints re-renders its avatars as soon as any roster arrives.

## Unreleased on top of 4.0.0-GA (plan109) — Project colours, top bar to the far right

- Release Planning: each measure/project gets its own colour for the bar on the left of its rows (14-colour palette, by the project's order in the plan), so projects are easy to tell apart. ABL/BTL remains in its own column.
- The top bar's Team selector, connection status and buttons now sit at the extreme right (a leftover 150px gutter reserved for a button that no longer exists was removed).

## Unreleased on top of 4.0.0-GA (plan108) — No more sideways page overflow

- Fix: on Release Review (and Status) the Release / Review Month / Lists / Refresh toolbar was pushed past the right edge, making the whole page scroll sideways and shoving the header out of view. The dashboard bar now wraps, and the page content can no longer widen the page (wide tables keep scrolling inside their own containers).
- Checked every page (Home, Release Review, Sprints, Planning, Bugs, Tests, TDs, Rotations, Status) at 1430, 1100 and 800 px wide on the local harness: no horizontal page scroll.

## Unreleased on top of 4.0.0-GA (plan107) — Loader shows for at least 3 seconds

- The loading animation now stays up for a minimum of 3 seconds from page start, even when the page is ready sooner, so it can actually be seen. Slower loads are unaffected (it still waits for the page to settle).

## Unreleased on top of 4.0.0-GA (plan106) — Loader chips: Plan, Execute, Review, Iterate

- The loader's four chips are now Plan, Execute, Review and Iterate on a single line, lighting up in turn with the status message. All use the app's teal highlight.

## Unreleased on top of 4.0.0-GA (plan105) — Saved history loads without queryMore()

- Fix: "GUS Apps must expose queryMore() to read the complete saved history." The saved-history reader now falls back to keyset paging (CreatedDate, Id) when GUS Apps provides neither queryMore() nor request(), so a long history loads in full. It still uses queryMore()/request() when available, and still fails with the same message only if no continuation is possible. Work-item reads in `backend/gus.js` keep the old behaviour.

## Unreleased on top of 4.0.0-GA (plan104) — Smoother loader

- Avatars now fill fixed slots in place and fade in, instead of the whole strip being rebuilt each time a team's roster arrives (which restarted the marquee and looked choppy). Cached rosters fill the strip immediately; on a first visit the remaining slots are filled once the rosters arrive.
- Removed the per-avatar bobbing and the line's drop-shadow filter, slowed the marquee, and trimmed the blur radius, so the loader animates on the compositor with less repainting.

## Unreleased on top of 4.0.0-GA (plan103) — Informative engineer allocation tooltip

- Hovering (or focusing) an engineer's Allocation % cell opens a hover card: coloured chips for Prioritised (ABL), Planned, Not Priority (BTL), Unplanned and Total; then each theme (with its colour and days) and the engineer's epics under it with ABL/BTL day chips. Long lists are trimmed to 6 themes and 5 epics per theme with a "+N more" note. Escape or scrolling closes it.

## Unreleased on top of 4.0.0-GA (plan102) — Dashboard blurred behind the loader

- While loading, the real dashboard now renders behind the loading animation, fully blurred. The animation has no card or background of its own and floats on the blurred dashboard. The page is still non-interactive until loading settles.
- Fix: the avatar marquee was collapsing to zero size because of leftover orbit positioning, so no avatars ever showed. It now renders.

## Unreleased on top of 4.0.0-GA (plan101) — Loader shows what it reads

- The loading screen gains Projects, Releases, Builds and Teams chips that light up in turn with the status message ("Reading projects and epics…", "Mapping planned releases…", "Checking builds and release health…", "Lining up every team…").
- The avatar strip shows shimmering placeholders until team members arrive, so it is never blank on a first visit. Avatars come from all five rosters (MAPS, MQ, VegaCache, VegaStore, Caching Services).

## Unreleased on top of 4.0.0-GA (plan100) — Coloured plan header actions

- (Revised in plan102) The plan header actions use the app's own teal palette: "Leaves, holidays & on-call" is teal-outlined with a calendar icon, "Save" is solid teal with a save icon, "Review & save to GUS" keeps the standard primary style, and the Team selector is back to the standard look.

## Unreleased on top of 4.0.0-GA (plan99) — Allocation naming

- Allocation % legend and tooltips: Planned (ABL) is now "Prioritised (ABL)", Unplanned (BTL) is "Planned, Not Priority (BTL)", and Unallocated is "Unplanned".
- Engineer bandwidth headers: "Prioritised (ABL)" and "Not Priority (BTL)" (full name on hover), columns widened to stay on one line.

## Unreleased on top of 4.0.0-GA (plan98) — Multi-select filters with search; flashing Clear filters

- Release Planning filter bar: Release, ATL/BTL, Engineer and Theme are now multi-select dropdowns with a search box, Select all / Clear, and checkboxes. The button shows "All", the single choice, or "N selected".
- Selections are saved per team (in memory and localStorage) and restored on return. Group by stays single-choice.
- "Clear filters" gets a red border that flashes while any filter or search is applied (static red ring under reduced-motion).

## Unreleased on top of 4.0.0-GA (plan97) — Total days per engineer, ATL/BTL label

- New editable "Total (days)" per engineer, auto-filled with the weekdays in the planning window (so it follows window changes until edited) and stored per engineer only when it differs. Available = Total − Leave − Holidays − On-call. The Leaves, holidays & on-call dialog shows Total, Leave, Holidays, On-call, Available; the Engineer bandwidth table now runs Total (bold), Leave, Holidays, On-call, Available (bold), Planned (bold), Unplanned, Allocation, and spans the full width when open.
- The "Line" filter and table headings are labelled "ATL/BTL".

## Unreleased on top of 4.0.0-GA (plan96) — One-line bandwidth headers

- Every Engineer bandwidth header is on one line; "Un-planned (BTL)" is now "Unplanned (BTL)" (and "Unallocated" in the allocation legend), with the columns resized to fit. (Plan95 fixed the Save to GUS permission lookup — the button now enables for the allowed users.)

## Unreleased on top of 4.0.0-GA (plan95) — Fix: Save to GUS permission lookup

- The live GUS connection exposes no identity call, so the allow-list check in plan92 found no username and disabled the button for everyone. The check now takes the signed-in user id (connection userId, else identity) and reads that user's Username and Email from GUS before matching the allow-list. It still fails closed.

## Unreleased on top of 4.0.0-GA (plan94) — Leaves and On-call columns

- Engineer bandwidth gains Leaves and On-call columns right after Available, with each engineer's days as the team provided them (and a Team total row). The small "x d leave · y d holiday · z d on-call" line under each engineer name is removed. (plan93 was folded into this entry.)

## Unreleased on top of 4.0.0-GA (plan92) — Un-allocated share and restricted Save to GUS

- Allocation per engineer now reads "Planned + Un-planned + Un-allocated = 100%" (un-allocated is the free remainder, 0 once over capacity, where the total shows above 100%). A "Team total" row sums available days, planned and un-planned days and the same three shares.
- "Review & save to GUS" is limited to bkasiraju@salesforce.com and bkasiraju@gus.com. The backend rejects plan-commit (preview and confirm) for anyone else, matching the signed-in identity's username or email; the button is disabled with a tooltip for everyone else, and until the permission check returns. The connection action reports canCommit. Plan auto-save to the shared backend is not affected. If the host does not expose an identity, the check fails closed.

## Unreleased on top of 4.0.0-GA (plan91) — Allocation split into Planned vs Un-planned

- Engineer bandwidth "Allocation %" is a two-colour stacked bar: solid blue = Planned (ABL), hatched amber = Un-planned (BTL), with a legend in the header. Each row's label reads "10% + 6% = 16%" (hover for the days). The total turns amber above 85% and red above 100%, and the bar gets a red outline when over capacity.

## Unreleased on top of 4.0.0-GA (plan90) — Auto-save for Release Planning

- Every edit is saved to the backend in the background about 1.5 s after the last change, with no popup; a 2-minute heartbeat retries anything still unsaved (for example after a failed save). The status note reads "Auto-save on", "Changes pending — auto-saving…", "Saving…", then "✓ All changes saved at hh:mm · auto-save on". Conflicts and errors show in the note with Reload / Retry; only the explicit Save button toasts.
- This is the plan save to GUS Apps; creating or updating GUS epics is still done by the Save-to-GUS action.

## Unreleased on top of 4.0.0-GA (plan89) — Full template and auto-save on import

- The exported template now carries every plan field as a column: the original ten plus Epic Est (calculated, ignored), Epic Status, Planned Release, Theme, WS Status, Doc link, GUS epic (reference only), HRP V2MOM method and CFS V2MOM. The new columns are optional; blank cells never overwrite what an existing epic already has. Lists gained Status and Releases, with dropdowns on Epic Status, Planned Release and WS Status.
- Import reads those optional columns (first value per epic wins; invalid status is an error, unknown release or non-http doc link is a warning and is ignored).
- After "Replace plan with this file" the plan is saved to the backend automatically (same save as the Save button) and the toast says whether it succeeded.

## Unreleased on top of 4.0.0-GA (plan88) — Dashboard-building loader

- The loading screen replaces the avatar ring with a dashboard assembling (bars rising, an amber trend line drawing), rotating status lines, a progress sweep, and a scrolling strip of every team member across MAPS, MQ, VegaCache, VegaStore and Caching Services.

## Unreleased on top of 4.0.0-GA (plan87) — One-line bandwidth headers

- Engineer bandwidth headers are single-line: Engineer, Available, Planned (ABL), Un-planned (BTL), Allocation % (was Load).

## Unreleased on top of 4.0.0-GA (plan86) — Orbiting-avatar loader, product name, per-member type chips

- The loading screen shows every team member from MAPS, MQ, VegaCache, VegaStore and Caching Services orbiting the Release Intelligence mark (cached rosters paint at once, the rest fill in as they load). The title reads "Loading Release Intelligence…".
- The home page and rail are named "Release Intelligence" instead of "Team Hub".
- Sprint work-item type chips (User Story / Investigation …) are independent toggles; All resets them. The selection no longer carries over to the next team member.

## Unreleased on top of 4.0.0-GA (plan85) — Clean, correctly grouped import; ATL/BTL editable after import; Sprints Full-Screen button

- **Bug fix (introduced in plan72):** an epic's ATL/BTL was derived from values that were forced to BTL while the epic itself was BTL, so imported epics (which start as BTL) stayed BTL and the toggle could not change them. The derivation now reads each workstream's own value; saved plans are re-derived on load so already-imported epics become editable.
- **Clean import:** the file is the source of truth. Epics not in the file are removed from the plan (epics already in GUS stay in GUS); epics matched by project + name keep their GUS link, release and status; order follows the file. The popup states how many epics will be removed, previews the epic → workstream grouping, and the button reads "Replace plan with this file". After applying, a self-check compares workstream counts and total days per epic with the file.
- **Grouping:** blank Project or Epic Name cells continue the epic above (merged cells). The header row is found by name (title rows above are ignored) with aliases. Workstream Est accepts "5d".
- **Priority and owners:** each row's Priority is kept on its workstream; the epic takes the highest priority (lowest P-number) of its rows. Epic Owner values from all rows of an epic are combined, so nothing is dropped and no "differs between rows" warnings are raised.
- **Engineer names:** a unique partial match (for example a first name) is accepted with a note; unknown names stay errors and suggest close matches.
- **Sprints:** the standup "Open" button is now "Full-Screen" with a flashing border (steady border with reduced-motion).

## Unreleased on top of 4.0.0-GA (plan83) — Slimmer Google Sheet / Excel template

- The export template and import no longer have Epic Est (calculated by the dashboard), Status, or Planned Release columns. The sheet is now: Project, Measure name, Epic Name, Workstream, Epic Owner(s), Workstream Owner(s), WS Est, ATL/BTL, Sprint, Priority.
- Older sheets that still contain those columns import fine: the three columns are ignored (no errors, no "no Planned Release" warning).
- Imported new epics get the default planned release (the team's highest-numbered release, as when adding an epic in the UI); existing epics keep their status and release.
- The Lists and Instructions sheets and dropdown validations were updated to match.

## Unreleased on top of 4.0.0-GA (plan82) — Column picker works when browser storage is blocked

- Column choice and order are now held in memory for the session, with localStorage as best-effort persistence. Before, every toggle/reorder was written only to localStorage and re-read from it; if storage is blocked in the GUS Apps frame the write silently failed, so nothing changed in the picker or the table. This is the likely cause of the live-only "cannot check/uncheck" report that did not reproduce on the local harness.
- Known, not changed: `ERR_TOO_MANY_REDIRECTS` console errors come from GUS profile-photo URLs (`gus.file.force.com/profilephoto/...`) redirecting in a loop for the browser session. Avatars fall back to initials. This is outside the applet's code.

## Unreleased on top of 4.0.0-GA (plan81) — Back button goes to the applet root

- "Back to Release Intelligence" now navigates the whole window to `/applets/cfs-release-review-tracker/` (the full app with its header and rail) instead of only switching to the in-page Team Hub, which in full-screen mode left the user on a header-less view. When the path is not an applet path (local harness) it falls back to the in-page Team Hub. The unsaved-changes confirmation is kept.

## Unreleased on top of 4.0.0-GA (plan80) — Richer 3D icons in the planner

- Reverts the flat icon tiles from plan75. KPI tiles now have larger (52 px) 3D icons: glossy gradient body, top highlight, bevel, coloured underside and glow, and a glyph that floats with a drop shadow. Section-card and Projects & epics heading icons get the same treatment at their own size.
- Hover lifts the KPI icon.

## Unreleased on top of 4.0.0-GA (plan79) — Engineer bandwidth: theme column removed

- The "By theme (effort)" column added in plan77 is removed. Engineer bandwidth shows Engineer, Available, Planned Effort (ABL), Un-planned Effort (BTL) and Load, centred. The per-engineer BTL counting fix stays.

## Unreleased on top of 4.0.0-GA (plan78) — Engineer bandwidth centred

- Headers and values for Available, By theme, Planned Effort (ABL), Un-planned Effort (BTL) and Load are centre-aligned. The engineer name stays left-aligned.

## Unreleased on top of 4.0.0-GA (plan77) — Engineer bandwidth: By theme (effort), renamed effort columns

- Engineer bandwidth gains a "By theme (effort)" column right after Available: per-engineer effort split by theme as chips.
- ABL / BTL columns renamed "Planned Effort (ABL)" and "Un-planned Effort (BTL)"; column widths rebalanced so the Load bar stays inside the card.
- Fix: the BTL column was always 0 because BTL workstreams were never counted per engineer. BTL effort is now counted per engineer and in the theme totals.

## Unreleased on top of 4.0.0-GA (plan76) — Expand/Collapse labels are clickable

- The "Expand" / "Collapse" text on the By theme / method, Engineer bandwidth and Executive Epics Summary cards now toggles the card, not just the arrow. Hover shows it is clickable.

## Unreleased on top of 4.0.0-GA (plan75) — Back button matches dashboard; flat planner icons

- "Back to Release Intelligence" now uses the same solid teal button style as "Back to Hub" (white text, small radius), still at the far right of the tab row.
- Planner KPI tiles, section cards and the Projects & epics heading use flat tinted icon tiles with outline icons instead of glossy 3D gradients.

## Unreleased on top of 4.0.0-GA (plan74) — "Enter value" placeholders

- Both fields in the + Project popup (Measure name, Short form) now show "Enter value" when empty. The example format stays in the label hint.

## Unreleased on top of 4.0.0-GA (plan73) — Wider New project popup

- The + Project popup is now up to 620 px wide (was 300 px) so long measure names are readable.

## Unreleased on top of 4.0.0-GA (plan72) — BTL epics force BTL workstreams; Projects popover stays on the page

- An epic marked BTL now treats every workstream under it as BTL (client display, effort/ABL totals, and backend review/commit). The workstream is the unit; the epic is the group.
- The Projects popover is right-aligned to its button and capped to the viewport width (full-width sheet on narrow windows), so it no longer runs off the right edge. Name and short-form fields shrink to fit.

## Unreleased on top of 4.0.0-GA (plan71) — Back button moved to the tab row

- "Back to Release Intelligence" now sits at the far top-right of the page-tab row (same row as the Release Planning tab) instead of inside the header actions.
- Restyled as a teal-to-blue gradient pill with an arrow icon, hover lift and focus ring. Still shown in focus mode, and still asks before leaving with unsaved changes.
- The button is removed when leaving the planner.

## Unreleased on top of 4.0.0-GA (plan70) — Full-page blurred loading overlay

- On page load or refresh the whole page is blurred behind a centred loading animation; it fades out once the first page has finished loading, replacing the intermediate "Loading your team hub…" strip.

## Unreleased on top of 4.0.0-GA (plan69) — + Epic / + Project popups before Columns

- The project strip above the grid is gone. + Epic, + Project and Projects ▾ now sit just before Columns; nothing opens until clicked.
- + Epic opens a small popup (Project, Epic name, Planned release, ATL/BTL) and adds the epic at the end of the grid. + Project keeps its Measure name / Short form popup. Projects ▾ opens a small menu to rename, edit the short form of, or delete projects.

## Unreleased on top of 4.0.0-GA (plan66–plan68) — Loading screen, ATL/BTL per workstream, column picker, new epics at the end

- First load keeps the loading screen up until the page stops changing, so sections no longer appear and jump; the gap between the tab and the content below is removed.
- ATL/BTL is now set per workstream (one toggle on every workstream row). An epic counts as ABL when any workstream is ABL; Epic Est, capacity, bandwidth, summary and the GUS Planned Story Points use only the ABL workstreams' days. Import/export carry the ATL/BTL value per workstream row; the line filter matches any workstream.
- Column picker: ticking a column is handled on click (more robust), the menu fits the viewport and has a Done button.
- + Epic adds the new epic at the end of the grid (under the last project) and scrolls to it.

## Unreleased on top of 4.0.0-GA (plan65) — Owners multi-select popover

- Epic Owner and Workstream Owner(s) now open a small popover just above the button (below if there is no room) with checkboxes, Cancel and Save, replacing the full-width dropdown list. Nothing changes until Save in the popover; Esc or clicking outside cancels. The plan itself is still saved with the Save button.

## Unreleased on top of 4.0.0-GA (plan63–plan64) — Colourful tiles with icons; column picker with ordering

- Release Planner KPI tiles are tinted per metric (blue/green/amber/violet/teal, rose when over capacity) with a glossy icon and a status chip. Section headings on both tabs carry icons and a coloured top accent.
- Columns menu: choosing a column no longer redraws the menu back to the top (which made lower items unselectable). Chosen columns can be reordered by dragging or with the ▲/▼ buttons; the order and selection are remembered in this browser.

## Unreleased on top of 4.0.0-GA (plan62) — Back to Release Intelligence on the planner

- The planner header has a "← Back to Release Intelligence" button that returns to Team Hub for the same team. It stays visible in full-screen mode (where the top bar is hidden) and warns before leaving with unsaved changes.

## Unreleased on top of 4.0.0-GA (plan61) — Effort entered vs missing; saves serialized

- WS Est cells have a green border when effort is entered and a red border when it is empty/0; updates as you type.
- Saves are now queued one at a time, so clicking Save while another save is in flight (or twice) no longer sends a stale revision, which caused the "Someone else changed this plan — Reload" conflict.

## Unreleased on top of 4.0.0-GA (plan60) — Actions column header

- The grid's last column (drag, add, remove, delete icons) now has an "Actions" header.

## Unreleased on top of 4.0.0-GA (plan59) — Save only on click; prefetch console error

- The planner no longer autosaves 700 ms after an edit; changes stay as "Unsaved changes — click Save" until Save (or Review & save to GUS) is clicked. Closing the tab with unsaved changes prompts a warning.
- Fixed `requestIdleCallback` TypeError in `H.prefetch` (it was passed a number instead of `{timeout}`).

## Unreleased on top of 4.0.0-GA (plan58) — Grid column widths

- Epic Name and Workstream get the spare width; Project, owners, estimates, ATL/BTL and Sprint shrink to content with minimal padding.

## Unreleased on top of 4.0.0-GA (plan57) — Page tab visible on the planner, flush with its content

- The page tab (Release Planning (Quarterly), Team Hub, etc.) is no longer hidden in full-screen/focus mode, so the planner shows its tab like the other pages.
- The gap between the tab and the content below is removed so the tab sits directly on the content it holds.

## Unreleased on top of 4.0.0-GA (plan56) — coloured planner tabs and borderless grid dropdowns

- Release Planner / Planned Release Summary tabs are now pill tabs like Standup and Pulse: green and teal tile colours, an icon on each, and the active tab's icon animates (reduced-motion respected).
- Dropdowns in the planner grid are borderless with a visible chevron; a light background and border appear on hover, focus and when open.

## Unreleased on top of 4.0.0-GA (plan55) — planner action order and return to Team Hub

- Release Planning actions now read: Team, Leaves/holidays & on-call, Save, Review & save to GUS.
- The "Release Intelligence" title in the top bar is a link that returns to the Team Hub for the team currently selected.

## Unreleased on top of 4.0.0-GA (plan54) — export template and import for Release Planning

- **Export template** downloads an Excel file (.xlsx) of the current plan: a Plan sheet (one row per workstream, with Project short form, Measure name, Epic, Workstream, Epic/Workstream owners, Epic Est, WS Est, ATL/BTL, Sprint, Priority, Status, Planned Release), a Lists sheet with the allowed values, and an Instructions sheet. The Plan sheet has dropdowns for project, ATL/BTL, priority, status and release, and owner cells with a pick-list that also accepts comma-separated names.
- **Import** reads the same template, validates every row, and shows errors and warnings in a dialog before anything changes. With errors, nothing can be imported. Without errors, **Import into plan** merges: an existing epic (same project and name) is updated and its workstreams replaced by the file's rows; epics not in the file are untouched; unknown projects are created (Measure name required).
- Validation covers required Epic Name and Project, numeric WS Est, ATL/BTL, priority, status, planned release and engineer names, plus conflicting epic-level values and duplicate workstreams.
- Excel files are built and read in the browser (`public/plan-io.js`), with no new dependencies.

## Unreleased on top of 4.0.0-GA (plan53) — new project popover with short form

- "+ Project" opens a small popover beside the button asking for the Measure name (the project in GUS, with GUS project suggestions) and the Short form (e.g. HRP M1.1.3). Enter adds, Esc cancels; the name is required, and the short form defaults from the name when left blank.
- Project chips have a Short form field. The Project column in the grid shows it, with the full name on hover.
- The plan backend now stores the project short form (`short`, up to 30 characters).

## Unreleased on top of 4.0.0-GA (plan52) — row actions and drag-to-move workstreams

- Row actions are now consistent icon buttons with hover states: grip, add workstream (+), remove workstream (minus), delete epic (trash, red on hover). Icons keep a fixed position per row.
- Workstreams can be dragged by the grip to reorder within an epic or move into another epic (drop line shows above/below the target row). Up/Down on the focused grip nudges it one place. An epic can be left with no workstreams.

## Unreleased on top of 4.0.0-GA (plan51) — project short code

- The Project column shows the short code (for example HRP M1.1.4) without truncation; hovering shows the full measure or project name. Names without a colon but starting with a code like "HRP M1.1.4 …" are shortened the same way.

## Unreleased on top of 4.0.0-GA (plan50) — inline delete confirmations

- Deleting an epic or project in Release Planning now asks in a small popover just above the clicked button (Cancel / Delete; Esc or a click elsewhere cancels) instead of the browser's confirm dialog.

## Unreleased on top of 4.0.0-GA (plan49) — Project column width

- The Project column now shrinks to its content with 8px padding (it was stretched by a first-column width rule: 166px down to 112px).

## Unreleased on top of 4.0.0-GA (plan48) — planner grid column order

- Default columns: Project, Epic Name, Workstream, Epic Owner, Workstream Owner(s), Epic Est, WS Est, ATL/BTL, Sprint, actions. Priority, Status and Release are now off by default and can be turned on from Columns.

## Unreleased on top of 4.0.0-GA (plan47) — ATL-only effort roll-up and planner layout

- New epics default to the latest planned release (highest trailing number in the release name).
- Epic est. and WS est. columns are now adjacent. Epic est. is read-only: the sum of its workstreams' effort, counted only when the epic is ABL. BTL epics show 0.
- Available/headroom/engineer-bandwidth and summary totals use workstream effort of ABL epics only; BTL and the old epic-level fallback estimate are ignored.
- GUS save writes the epic-level sum to Planned Story Points on the Epic; Priority (P0 = 0, P1 = 1 …) was already saved as the numeric Priority field.
- The Planning window dates moved to the right end of the tab bar.

## Unreleased on top of 4.0.0-GA (plan46) — planner grid column widths

- Epic Name and Workstream / Feature share all spare width; every other column shrinks to its content with 8px side padding, so gaps between columns are small. The grid fills the page width and no longer uses fixed per-column pixel widths.

## Unreleased on top of 4.0.0-GA (plan45) — team selector on Release Planning

- A highlighted Team dropdown sits left of the Planning window and shows whose release plan this is. Changing it switches the whole app's team (same as the header picker), so the plan, summary and breadcrumb reload for that team.

## Unreleased on top of 4.0.0-GA (plan44) — labelled work items and SP

- Standup Completed / In progress / Blocked chips now read "11 items · 22 SP" instead of "11 · 22 SP" ("1 item" when singular).

## Unreleased on top of 4.0.0-GA (plan43) — signal hover card no longer overlaid

- The signal card was drawn underneath the avatar strip and page body, so text collided. The dialog header now sits above the strip and body, and the card is fully opaque with a stronger shadow and outline.

## Unreleased on top of 4.0.0-GA (plan42) — sprint selector placement, Current Sprint Summary

- (plan41) Standup view: the sprint selector (with Prev/Next/Shuffle/Open) sits before the Pulse/Standup buttons. Pulse view: the selector is pinned to the far right of the bar.
- (plan42) The "Current sprint" heading is now "Current Sprint Summary" (shown in Pulse; the Standup bar hides the heading as before).

## Unreleased on top of 4.0.0-GA (plan40) — smooth engineer-to-engineer transition

- Moving between engineers (Prev/Next, avatar strip, arrow keys) no longer re-fades the dark backdrop, which caused the flicker. The header and body now dissolve in over ~0.4s with a brief brightness flash and slight blur; skipped when the system prefers reduced motion.

## Unreleased on top of 4.0.0-GA (plan39) — coloured status dropdown list

- Status dropdowns (work items, bugs, team dependencies) open a styled list: each option has a solid status-coloured fill, a thick left colour bar, spacing between rows, and an outlined checked option. Uses the customisable select (Chrome 135+); browsers without it keep the native list. The closed select looks as before.

## Unreleased on top of 4.0.0-GA (plan38) — engineer dialog centre axis

- The name/chips block and the avatar strip now share the page's centre line (both measured at x=750 in a 1500px window). Side columns are equal, so Shuffle/Close no longer pull the strip off-centre; the engineer's avatar hangs to the left of the centred text.

## Unreleased on top of 4.0.0-GA (plan37) — sprint selector highlight, centred engineer header

- (plan36) The Current sprint selector has an accent border and tinted fill, and its glow pulses three times on load, then stays highlighted (no pulse with reduced-motion).
- (plan37) In the engineer dialog the avatar, name and chip rows are centred on the page between Previous and Next.

## Unreleased on top of 4.0.0-GA (plan35) — tile titles without (Monthly)/(Quarterly)

- Team Hub tiles show "Release Review" and "Release Planning"; the tile caption no longer says "monthly". Tab and rail names are unchanged.

## Unreleased on top of 4.0.0-GA (plan34) — Team Hub tile layout

- Tiles now have a fixed rhythm: header (icon, title, go-arrow), value, caption, chips pinned to the bottom. The big value sits on its own line above its caption. A small arrow icon on every tile signals it opens that tab; it nudges on hover.

## Unreleased on top of 4.0.0-GA (plan33) — grouped standup chips, signal tooltips, new tagline

- Standup header line 1 groups Planned, Actual, Completed, In progress and Blocked (items · SP). Line 2 "Signals": Churn, closed, spillover, added, removed, pts changed. Hovering or focusing a signal shows a card with what it means, the metrics, and the work items behind it (W-id, subject, status, SP).
- Tagline now covers all tabs: "Release Priorities - Sprints and standups, dependencies, test and bug health, monthly reviews, quarterly planning, and V2MOM updates."

## Unreleased on top of 4.0.0-GA (plan32) — compact standup dialog header

- The engineer dialog header is about half its former height: name and chips on one line between Previous/Next, a thin progress line, and one row with the avatar strip centred and Shuffle/Close at the right. Avatars are 50% opaque, full on hover, focus or when selected; clicking one switches to that engineer (Previous/Next follow in the same order). Cache-bust `4.0.0-GA-plan32`.

## Unreleased on top of 4.0.0-GA (plan31) — standup controls in the Current sprint bar

- Prev / Next and Shuffle / Open moved from the standup card into the "Current sprint" bar, at the far right (Standup view only). Prev/Next, Shuffle and Open were clicked-tested for Next on the local harness; the card keeps the member pills, count and dots. Cache-bust `4.0.0-GA-plan31`.

## Unreleased on top of 4.0.0-GA (plan30) — distinct status colours

- Inline status selects: Closed/Fixed/Completed blue; In Progress green; Ready for Review (and other review/QA states) a teal-green; New/Not Started grey; Blocked/Waiting/On hold amber; Never/Duplicate/Rejected red. Checked computed colours on the local harness (New, Closed, Fixed, Never); the green and amber states are the same rules but were not in the seed data. Cache-bust `4.0.0-GA-plan30`.

## Unreleased on top of 4.0.0-GA (plan29) — standup engineer avatar strip

- The standup review dialog shows a strip of small avatars for the whole team (in the current standup order). Clicking one jumps to that engineer; Previous/Next then follow from that engineer in the same order. Cache-bust `4.0.0-GA-plan29`.

## Unreleased on top of 4.0.0-GA (plan28) — Sprints Pulse layout

- Pulse now shows **Team velocity** first, then a "Current sprint" bar holding the sprint filter, then the sprint tiles and contributors. The sprint filter left the page heading; in Standup the same bar sits above the standup. Cache-bust `4.0.0-GA-plan28`.

## Unreleased on top of 4.0.0-GA (plan27) — no duplicate page titles

- The page title row (icon + name) under the active tab is hidden on every tab, since the tab and breadcrumb already name the page. Descriptions and action buttons stay. Checked on the local harness for all eight tabs (no visible title). Cache-bust `4.0.0-GA-plan27`.

## Unreleased on top of 4.0.0-GA (plan26) — tab order

- Release Review (Monthly) and Release Planning (Quarterly) now sit just before V2MOM Updates (rail, active-tab bar and Team Hub tiles). Order: Team Hub, Sprints, Team Dependencies, Test Failures, Trust Champion, Bugs, Release Review (Monthly), Release Planning (Quarterly), V2MOM Updates. Cache-bust `4.0.0-GA-plan26`.

## Unreleased on top of 4.0.0-GA (plan25) — no "Open in GUS" bar on Team Hub

- The "Open in GUS" bar is hidden on Team Hub only; all other tabs keep it. Verified on the local harness (hidden on Hub home, shown on Release Planning). Cache-bust `4.0.0-GA-plan25`.

## Unreleased on top of 4.0.0-GA (plan24) — Planned Release Summary dashboard panels

- Removed the "By planned release / By status" card. Planned Release Summary now follows the MAPS release-plan dashboard: **Theme Payload Distribution** donut (planned pts, all-themes legend), **Priority & Strategic Investment Breakdown** (P0–P3+/BTL bar and tinted theme cards) and a collapsible **Executive Epics Summary** (above-the-line epic cards with workstreams and owner). Slices, themes, priority labels and epics open a full-screen detail dialog; Planning health and Saved epics remain.
- Built from the supplied screenshots (the sheet's dashboard tab exposes no readable code). "pts" are the plan's days, which is what is written to Planned Story Points. Verified on the local harness only. Cache-bust `4.0.0-GA-plan24`.

## Unreleased on top of 4.0.0-GA (plan23) — navigation restructure, grid-only Release Planning

- "Open in GUS" bar sits below each page heading (title left, actions right, one line). Tabs reordered: Team Hub, Release Review (Monthly), Release Planning (Quarterly), Sprints, Team Dependencies, Test Failures, Trust Champion, Bugs, V2MOM Updates. Quick Links removed. The tab bar shows only the active tab; the rail switches pages; the breadcrumb reads `<Team> / <Tab>`; the Team Hub people heading follows the team dropdown.
- Avatar fix for Rachita Saha (snapshot URL corrected; people cache key `hub-people2-`). `amit.k` could not be verified via Slack. Amit Kumar is last in every team.
- Global Full screen removed; Release Planning's "Projects & epics" has its own Full screen.
- **Release Planning is grid-only**: Form view and the Form/Grid toggle removed. A project strip above the grid edits project names (GUS link / New), adds an epic to a project and deletes a project. Column chooser (saved per browser in `pl-grid-cols`), new default order, narrower Project column.
- Tabs renamed **Release Planner** and **Planned Release Summary**; the summary opens with a By theme donut; Saved epics columns are now Project, Epic, Release, Line, GUS, Development Lead (epic owners), Planned Story Points.
- Verified on the local harness only; commit-to-GUS and BTL paths were not run live. Cache-bust `4.0.0-GA-plan23`.

## Unreleased — explicit Save, optional BTL commit, Saved epics list

- **Save** button (always visible next to Review & save to GUS): saves the engineer's entries to the shared GUS Apps backend right now and confirms with a toast (entries were already autosaved; this is the explicit action).
- **Review & save to GUS** is unchanged by default (ABL epics are created/updated as GUS projects and epics; GUS ids are written back to the plan), and now has a checkbox **Also save below-the-line (BTL) epics to GUS** (off by default; backend `includeBtl`). Failures are listed per epic and retries never duplicate records.
- **Release Review → Saved epics**: every epic with its project and a link to the GUS epic/project (or "Not saved to GUS"), count in GUS vs total and the last save time.
- Workstreams, owners, theme, V2MOM, status and doc fields remain plan-only (stored in the GUS Apps backend); GUS receives project, epic, planned release, priority and planned effort. Cache-bust `4.0.0-GA-plan22`.

## Unreleased — Release Planning: subtabs and header alignment

Subtabs are now **Release Planned** (the planner) and **Release Review** (high-level metrics only: priority KPIs, effort by priority, planning health such as epics, ABL/BTL, in GUS vs draft, capacity used, no owner / no release / unassigned workstreams, plus by-release and by-status counts). The theme and engineer-bandwidth views are not repeated in Release Review. The Release Planning header, planning-window row, tabs and toolbars now share one vertical rhythm and 36px control height. Cache-bust `4.0.0-GA-plan21`.

## Unreleased — planner: inline dropdowns, owners, defaults, sheet-parity fields

- **Inline dropdowns everywhere** in the planner, including the Grid (the app's custom dropdown, not the native one), sized to their values. In Grid the Project column shows the short code (text before ":", e.g. M1) with the full name on hover; the full project name is what is stored and saved to GUS.
- **Multi-select owners:** workstreams take several engineers (days are split evenly across them in Engineer bandwidth) and epics take several Owners (plan-only, not written to GUS).
- **Defaults:** new epics and workstreams start at **P0** (P0–P5; an unset priority reads as P0) and new epics default the planned release to the team's 268 release when it exists. The Summary subtab now buckets P0 / P1 / P2 / P3+ / BTL.
- **Parity with the team's sheet planning:** Theme (per epic, defaults to the project theme and is now a visible column and filter), HRP V2MOM method, CFS V2MOM, Owner(s), Epic estimate (used when workstreams have no days), Status (epic and workstream: Planned / In Progress / Completed / On Hold), Sprint target, GUS epic link and Doc link. Available in Form (a details row) and as Grid columns (the grid scrolls sideways).
- Search box is wider. Cache-bust `4.0.0-GA-plan20`. New plan fields are plan-only; only the existing epic fields are written to GUS on commit.

## Unreleased — planner priorities, Grid view, collapsed summary cards, Release Planning Summary

- **Priority as P1, P2, P3…** Epic and workstream priority are now P-pickers (P1–P5; a legacy value outside that range stays selectable). Epic priority keeps its numeric value (still written to GUS `Priority__c` on commit); workstream priority is a new plan-only field (`priority`, cleaned in backend `cleanPlan`, not written to GUS).
- **Form / Grid toggle** in the Projects & epics toolbar: Grid is a flat table, one row per workstream with epic fields on the first row, all editable inline (project, priority, name, release, ABL/BTL, workstream, engineer, days, sprint), + workstream per epic, delete, + Epic. It honours search, filters and Group by. Project names are still edited in Form view. View state is not saved.
- **By theme / method and Engineer bandwidth start collapsed** with Expand/Collapse.
- **Release Planning Summary subtab** (Planner | Release Planning Summary): read-only roll-up in days — Total ABL payload, P1/P2/P3 cards, BTL effort, theme donut, priority bar and theme cards; each card/theme opens a full-screen list of its epics. ABL epics without P1–P3 count in the total as "other"; BTL is shown separately.

Cache-bust `4.0.0-GA-plan19`.

## Unreleased — Release Planning: filter and group epics

"Projects & epics" now has a toolbar: search (epic, workstream or project name), filters for Planned release, Line (ABL/BTL), Engineer and Theme, a Clear filters button, an "x of N epics" count, and **Group by** Project (default, editable), Planned release, ABL/BTL or Theme. Grouped views show per-group epic count and ABL/BTL days, list each epic under its project name, and are for review (add epics/projects from the Project grouping). Filters are view-only session state: they never change or save the plan. Cache-bust `4.0.0-GA-plan17`.

## Unreleased — popup prev/next cleanup

In the standup popup the Previous/Next engineer controls are no longer stretched boxes: they sit at the outer edges, hug the name with a bottom rule only (no side borders), and the "n of N" line under the engineer's name is removed (the Standup page nav keeps its count). Cache-bust `4.0.0-GA-plan16`.

## Unreleased — metric definitions on hover

Closed / Spillover / Added / Removed / pts chg chips (Pulse cards, standup header, popup header and per-work-item tags) now show a hover definition with the numbers: spillover = committed at sprint start, not closed, carries from the selected sprint to the next sprint (or backlog); added = not in the start forecast, +N SP; removed = committed at N SP and taken out; pts chg = estimate from X to Y. Epic cells in work-item tables use the compact 12px font. Cache-bust `4.0.0-GA-plan15`.

## Unreleased — work-item type chips in Standup

A "Work items" header with the item count and small Type chips (All plus one per Type with counts, e.g. User Story 12, Bug 1) now sits above the work-item list on the Standup page and in the full-screen popup. Chips multi-select, the selection carries across engineers, a selected type with no items for an engineer shows count 0, and "All" clears it. It combines with the epic filter. Cache-bust `4.0.0-GA-plan14`.

## Unreleased — readable Subject/Epic, true full-screen standup popup

Work-item tables (Pulse, Standup page, popup): Subject (14px) and Epic (13.5px) are the widest columns and wrap fully; Type, QA, Status and the effort/churn columns use a compact 11–11.5px. The standup popup now fills the whole viewport (100vw × 100vh, no rounded corners). Cache-bust `4.0.0-GA-plan13`.

## Unreleased — standup per-engineer metrics and QA column

Standup (page and full-screen popup): each engineer header now shows the Pulse metrics (closed, spillover, added, removed, pts chg) and every work item carries its own tag (Closed, Spillover, Added, Removed, Δ pts chg). The Assignee column is replaced by **QA** (the work item's `QA_Engineer__c`, with avatar; "—" when unset; read-only). The sprint query now selects `Work__r.QA_Engineer__c/.Name`. Epic and Subject get the widest columns and wrap. Cache-bust `4.0.0-GA-plan12`.

## Unreleased — standup roster and navigation alignment

Standup view: engineer pills form an aligned grid (avatar, name, fixed-width Planned/Actual/WI chips); the nav row is grouped as Prev/Next on the left, "n of N" with dots centred, Shuffle/Open on the right. Cache-bust `4.0.0-GA-plan11`.

## Unreleased — standup modal shows every detail

The per-engineer standup modal is wider (up to 1560px), its work-item table no longer clips the Actual/Churn columns, and long subjects, epic names and epic-card titles wrap instead of truncating with an ellipsis. Cache-bust `4.0.0-GA-plan10`.

## Unreleased — palette refresh, contributors heading

- **Palette:** purple/aubergine accents across the CSS were shifted to blue-slate; the velocity chart bars no longer inherit the black SVG outline, chart labels are dark slate, Committed/Completed bars are light blue-grey/bright blue, the chart tooltip is a light card instead of dark navy, the Say-Do/Points/Items and Pulse/Standup pills use a solid blue selected state with a blue focus ring, and the hub banner is a lighter blue gradient. Overrides live at the end of `hub.css`.
- **Sprints:** the contributors section is titled "Current sprint contributors" with the sprint name beside it (plain "Sprint contributors" when a past sprint is selected). Cache-bust `4.0.0-GA-plan9`.

## Unreleased — default team fallback, per-team release lists

- **Default team fallback:** if the browser blocks localStorage ("Unable to save locally"), the default team is saved as a per-user preference in the backend settings journal (`pref-<userId>`, actions `pref-get` / `pref-set`). localStorage is still used whenever it works.
- **Release Planning releases** are filtered per team by name prefix across scrum teams (MAPS → MAPS 266/268, MQ → MQ 266/268), de-duplicated by name, and still limited to current and future releases. Teams with no name-matched releases fall back to their own Planned Releases list. Cache-bust `4.0.0-GA-plan8`.

## Unreleased — default team, future releases only, planner dropdowns

- **Default team:** a star next to each team in the team dropdown (or `D` while open) sets or clears the default team, saved in this browser's localStorage (`cfs.hub.defaultTeam`) and applied on load. It is the only user preference stored locally; the old implicit last-selected-team key is removed. Release Planning's new tab receives the current team in its URL.
- **Release Planning:** the planned-release picker lists only releases that have not ended (`End_Date__c >= TODAY`); the planner's release, project and engineer dropdowns now use the same custom dropdown as the team picker. Cache-bust `4.0.0-GA-plan7`.

## Unreleased — Release Planning: automatic program tagging, validation at save

The Program field is gone from the planner. On save to GUS, new projects are tagged automatically to the team's `<Team> - 268` program (looked up in GUS; existing GUS projects keep theirs). If a team has no such program (Caching Services today) the review blocks with a clear message. The planner itself is free text with no live validation; every check (epic name, project, planned release, effort > 0, program) runs when Review & save to GUS is clicked and is listed per epic. Cache-bust `4.0.0-GA-plan6`.

## Unreleased — Release Planning is the last tab and opens full screen in a new tab

Release Planning moved to the end of the page tabs, rail and Team Hub tiles. Clicking it opens `#/plan?full` in a new browser tab in focus (full screen) mode (Esc or Exit full screen returns to the normal layout). Opening the URL directly renders it in place. Cache-bust `4.0.0-GA-plan5`.

## Unreleased — Release Planning program picker

The Program picker lists only the `<Team> - 268` programs (constant `PROGRAM_RELEASE` in `backend/plan.js`), narrowed to the selected team (MAPS, MQ, VegaCache, VegaCache FACE, VegaStore). Teams with no matching program (Caching Services) see all five. Bump `PROGRAM_RELEASE` for the next release. Cache-bust `4.0.0-GA-plan4`.

## Unreleased — On-call effort in Release Planning

The leaves popup (now "Leaves, holidays & on-call") has an On-call (days) column per engineer, saved in the plan's `people` entry (`oncall`). Available = working days − leave − holidays − on-call. On-call is dashboard-only, not written to GUS. Cache-bust `4.0.0-GA-plan3`.

## Unreleased fix — team dropdown reopened natively

Picking a team in the custom dropdown re-clicked the hidden native select through the wrapping `<label for>`, so the OS menu popped open again. The label's activation is now suppressed (clicking the TEAM text focuses the custom button). Cache-bust `4.0.0-GA-plan2`.

## Unreleased (on top of 4.0.0-GA) — Release Planning tab

New hub tab **Release Planning** (`public/plan.js`, `backend/plan.js`, actions `plan-get`, `plan-save`, `plan-refs`, `plan-commit`). Engineers plan per team: projects (linked to a GUS Program), epics (priority, planned release, project, ABL/BTL) and workstreams (engineer, effort in days, tentative sprint). The dashboard recomputes live: available capacity (working days in the planning window minus per-engineer leave and holidays, entered in the "Leaves & holidays" popup), planned ABL/BTL, headroom, effort by theme/method (project theme, else the project-name prefix before ":") and per-engineer load. The draft is stored in the settings journal under `plan-<teamId>`.

"Review & save to GUS" previews, then writes ONLY ABL epics: creates or links the `PPM_Project__c` (with its `PPM_Program__c`), then creates or updates the `ADM_Epic__c` with Project, Planned Release, Priority and Planned Effort (days, in `Planned_Story_Points__c`). BTL epics, tentative sprint, workstreams, leaves and holidays stay dashboard-only. Retries update rather than duplicate. The 4.0.0-GA golden build is unchanged. Team Hub tile grid now fits 9 tiles. Cache-bust suffix `4.0.0-GA-plan1`.

Validation: `tests/plan.test.js` (5 tests, mocked GUS) and a stubbed browser harness. The commit path has NOT been exercised against live GUS. Node suite 212 pass / 38 fail (the same 38 pre-existing failures).

## 4.0.0-GA — GOLDEN BUILD (Release Intelligence team hub)

User-designated GOLDEN BUILD and preferred rollback baseline (14 November 2026). Includes the Team Hub redesign (team first, leaders last in fixed order, aligned summary tiles), V2MOM Updates rename, new logo, shared column sizing, 25-row pagination, status colours, Open-in-GUS link bars, Test Failures filters, Bugs pagination, focus mode and custom team dropdown. Tags `v4.0.0-GA`, `GOLDEN-BUILD-4.0.0-GA`; archive `releases/4.0.0-GA/`. Previous baseline: `GOLDEN-BUILD-3.0.0-GA`. Verified on a stubbed harness only; node suite 207 pass / 38 fail, identical to the pre-change baseline. Private GOLDEN Dataset not re-captured for 4.0.0-GA (3.0.0-GA dataset remains the latest).

## 3.0.0-GA — GOLDEN BUILD tooltip status chips

Summary tooltip headings now show left-aligned Epic Status and Release Review Status chips beneath the epic title. Review Status uses the saved value only when valid for the current Epic Status and free of storage conflict; otherwise shows Not set or Not required. No data is modified.

Validation: focused isolated browser flow checks both chip labels, saved Review Status and left alignment, retaining monthly availability colors, recovery visibility and coverage spacing. Syntax/diff checks passed. No production model call or dataset mutation.

## 3.0.0-GA — GOLDEN BUILD clean dropdown alignment

Watch epic Summary tooltips also use red-tinted amber for Path to Green; focused browser color assertion passed.

Removed the From GUS source chip from the epic table toolbar. Release, health, owner and grouping dropdown labels align left with carets at the right edge in empty and selected states.

Validation: focused isolated browser flow verifies source-label removal and label/caret geometry at 1600 and 1100px, including selected filter state. Syntax/diff checks passed. No backend or dataset changes.

## 3.0.0-GA — GOLDEN BUILD monthly AI actions

Missing review-month Summary tooltips include AI Summarise, opening the matching epic/month sidebar and generating a draft. Generated text that needs review has Copy to monthly update and Undo copy actions. Transfer is explicit, retains the validation warning, and never auto-saves or syncs. Accepted drafts continue to populate the editor with Undo.

Validation: focused isolated browser flow with controlled AI responses verifies epic/month navigation, rejected-text transfer, retained warning, undo, accepted-draft behavior and absence of implicit save/sync requests. Syntax/diff checks passed. No live production model call or dataset mutation.

## 3.0.0-GA — GOLDEN BUILD semantic tooltip month colors

Review Status dropdowns now share a fixed trailing warning slot, keeping populated and required selectors aligned; warning icons appear after the selector. Focused browser comparison checks equal x-position/width and trailing icon placement.

All populated dated month sections in Summary tooltips use green. Missing month sections use red-tinted amber, independent of their position; the missing review-month guidance remains visible. Completed epics remain exempt. Colors indicate update availability, not delivery health. Engineer comments and backend data are unchanged.

Validation: focused isolated browser assertions for green populated sections and red-tinted amber missing review month, plus retained recovery visibility and chart spacing checks. Syntax/diff checks passed. No production model call or dataset mutation.

## 3.0.0-GA — GOLDEN BUILD missing review-month guidance

Summary tooltips show the missing review month as an amber section with a prompt to add the latest status or use AI Summarise. Existing fallback/general content is retained. Completed epics remain exempt; populated monthly updates keep their normal styling.

Validation: focused isolated browser checks for amber guidance, populated review month, Completed exemption, On Track recovery suppression, and coverage alignment. Syntax/diff checks passed. No dataset mutation or production model invocation.

## 3.0.0-GA — GOLDEN BUILD tooltip and coverage refinement

On Track epic Summary tooltips display monthly updates without the Path to Green section, whether a recovery field is populated or empty. Other statuses retain that section. No stored comments or Path to Green values are changed. Monthly coverage uses intrinsic label widths and a dedicated gap so labels, bars and counts remain separate.

Validation: focused isolated browser check for On Track with/without saved recovery text, Watch recovery visibility and three monthly sections; label/bar/count separation at 1600, 1280 and 900px. Syntax and diff checks passed. No production model invocation or dataset mutation.

## 3.0.0-GA — consolidated GOLDEN BUILD: independent text mode and expansion

At the user's explicit request, the tooltip patch and update-view fix are folded back into the current 3.0.0-GA GOLDEN BUILD. The prior exact 3.0.0-GA archive is preserved at releases/3.0.0-GA-original/ and its source is retained at GOLDEN-BUILD-3.0.0-GA-original. Older 2.0.0-GA and 3.0.1-GA releases remain intact. The private GOLDEN Dataset is unchanged.

Compact/Full Updates now controls only monthly-text clipping. It does not expand/collapse rows or groups. Expand All, Collapse All and individual row toggles change expansion only and never reset the chosen text mode. Nested grouped views, applied filters, selected dashboard view and retained horizontal positions remain intact. The unified light tooltip system from 3.0.1-GA is included, with no native/duplicate title hints.

Validation: one focused isolated browser flow first reproduced Full Updates incorrectly opening every row, then passed after decoupling. It checks compact clipping/full text, unchanged expansion on mode changes, retained mode on single/all row toggles, nested group collapse/expansion, filtered scopes and horizontal position during mode changes. UI-only fix; syntax/diff and exact package checks passed. No unrelated Node/full suite, live model call or dataset mutation. Previous tooltip verification remains recorded in the 3.0.1-GA history.

## 3.0.1-GA — unified light dashboard tooltips

Replaces native browser title hints with one shared dashboard tooltip surface. Initial and dynamically added titles are migrated, preventing duplicate native/custom hints. Summary and AI-preview triggers retain their rich popovers without a second plain tooltip. The shared hint uses a subtle light blue background, black Salesforce Sans text, rounded border, restrained shadow and viewport-safe wrapping. Existing rich popover headers use matching light colors.

Tooltips support keyboard focus, scoped aria-describedby cleanup, Escape dismissal, hoverable text, dynamic title updates and hiding on click, scroll, resize or removed controls. Content is rendered as text, not HTML. The local preview server serves the new asset. No GUS data, AI generation or persistence behavior changed.

Validation: one focused isolated browser flow verifies zero native title attributes after dynamic rendering, the missing-update hint, single rich-summary popover, keyboard focus/Escape, dynamic additions/updates/removal and long-content viewport wrapping. Syntax/diff and package checks passed. No unrelated Node/full suite or production model test. The 3.0.0-GA GOLDEN BUILD tags, archives and private GOLDEN Dataset remain unchanged and are still the preferred recovery baseline.

## 3.0.0-GA — current GOLDEN BUILD and verified private GOLDEN Dataset

Promotes the complete current Release Intelligence implementation to 3.0.0-GA. This is the user-designated preferred recovery version going forward. New immutable tags v3.0.0-GA and GOLDEN-BUILD-3.0.0-GA and an exact ZIP/checksum preserve the application baseline. Earlier 2.0.0-GA tags and archives remain unchanged.

Includes shared executive delta caching with hourly evidence validation, changed-epic/affected-team regeneration, concise grounded summaries, shared release/monthly history and status workflows, Completed exemption, icon-only exceptions and subtle GUS links. GUS links now occupy a fixed icon slot in every row regardless of missing-update icons, including grouped views. The dashboard footer and connection API report 3.0.0-GA. The release entry page and recovery instructions use the new version.

The live shared backend journal and materialized saved records were captured separately as Backend - GOLDEN Dataset, uploaded to a private Salesforce ContentVersion file in GUS and verified by full download checksum and dataset equality. Only nonsensitive verification metadata/checksum is in Git; actual data, record IDs, local backup and credentials remain private. No live dataset records, comments or drafts were overwritten. Application rollback preserves the live backend; dataset restoration is a separate explicitly authorized recovery action.

Validation: 30 focused snapshot/cache/executive checks and one release browser flow passed; no full suite. Browser verifies the version, consistent GUS link positioning with/without missing-update icons and groups, new-tab navigation without expanding rows, and no GOLDEN badge in the dashboard. Actual production backend snapshot upload/download was verified. Actual production model generation was not reverified. See docs/GOLDEN_BUILD.md and GOLDEN_DATASET.json.

## 2.0.0-GA — shared executive delta cache and subtle epic links

Successful epic analysis and measure/team summaries now persist in the existing shared GUS Apps backend. One-hour source validation reuses fresh shared epic/work snapshots; elapsed time alone never expires successful AI analysis. Content fingerprints cover the review month, comment/health revision, relevant goals/context/recovery and work evidence. Changed epics alone are regenerated, then only their affected measure/team consolidations. Membership and rule version are part of cache identity. Manual Refresh and shared local edits invalidate relevant source freshness. Rejected/failed/stale summaries never become ready cached prose; saves recheck scope, evidence and dependencies. Page-session memo provides reuse during transient shared-cache failures. Cache-only operations produce no AI-usage notification.

Removed the yellow last-verified-column-layout banner. Sources & connection retains the underlying details. Added a subtle unboxed 13px GUS link icon with a 24px target beside each epic name; opens its Salesforce GUS record in a new tab without expanding the row. Existing history, status edits and factual checks remain.

Validation: 27 focused cache/executive tests and one isolated browser flow. Repeated generation and page reload used zero additional AI calls; a single status change and then a comment change each regenerated one epic and one affected team. Tests cover hourly unchanged-evidence reuse, work-status deltas, manual refresh, scope rejection and unsupported/stale cache writes. Browser verifies the removed banner and accessible GUS links. No full suite, live production model call or real epic mutation. Concurrent users may both generate an uncached result; caching does not claim an atomic distributed generation lock.

## 2.0.0-GA — icon-only warnings and Completed epic exemption

Missing updates now show only the red animated calendar/exclamation icon, retaining a month-specific hover title, accessible label and editor shortcut. Required-review icons no longer animate. Completed epics are exempt from missing-month markers, awaiting filters/counts, monthly coverage requirements and all Slack reminder preparation. Empty completed-month cells say Not required; existing comments and history remain visible. Fresh GUS Health__c is checked before creating single or grouped Slack reminders, including when an epic completes after the dashboard was fetched.

Validation: eight focused Slack nudge tests and one isolated browser flow verify icon-only warnings, styling/reduced-motion, Completed marker/count/filter exemption, month navigation and fixture save behavior. Syntax/diff checks passed. No full suite or live GUS/model writes.

## 2.0.0-GA — simple row exception labels

Missing review-month updates now use plain red text with an unboxed calendar/exclamation icon instead of filled chips. Required Review Status uses a red prompt and bare exclamation icon with a neutral dropdown. Only the small exception icons pulse gently three times; reduced-motion preferences disable animation. Existing month-specific accessible labels, editor shortcuts, status editing and save behavior remain.

Validation: one focused isolated browser check verifies border/background removal, red text, icon animation/reduced-motion, grouped/month-specific markers, editor navigation, fixture save and narrow-screen accessibility. No Node/full suite or live GUS/model writes.

## 2.0.0-GA — AI gateway recovery and concise grounded summaries

Fixed the generic catch-all message that hid provider errors. All summary SDK flows now share a two-request concurrency limit, give every initial/correction call its own 60-second timeout, and automatically retry one transient network/rate-limit failure. Authentication, budget and non-transient errors do not trigger blind retries; safe provider-specific diagnostics distinguish these from evidence rejection. Actual SDK attempts and reported usage remain counted.

Executive and measure paragraphs reject missing-update/metrics boilerplate and leadership instructions. Pending negotiations must retain their source meaning rather than becoming unsupported blocked claims. Prompts target 30–45 words/300–350 characters within the existing 500-character/70-word cap. Whole-sentence compaction runs only after the entire original response passes factual checks, retains dependency/risk/recovery sentences, and validates the selected result again. It cannot conceal an unsupported claim, invent a fallback or publish an invalid/empty paragraph.

Validation: 29 focused executive/grounding tests; one 26-epic isolated browser flow for generation, compact measure/team output, copy and refresh preservation; actual host SDK source exercised with a simulated gateway for retry/usage contract. No full suite or real authenticated production model call. Deployment authentication cannot supply Salesforce session context; actual user-session model behavior is not verified.

## 2.0.0-GA — missing-review-month indicator on epic rows

Fetched epics without a dated update for the selected review month now show an amber calendar/exclamation icon and Missing update badge beside the epic name. Its accessible label and hover title name the missing month. Clicking opens that month’s editor directly. The indicator appears on the parent epic row, including grouped/expanded views, without repeating it inside the detailed table. At narrow widths the text label folds away while the icon and accessible month label remain.

Pending save text and saved drafts count as available update text, so the marker disappears immediately when an update is submitted. Other months and undated fallback notes do not satisfy the selected-month check. Unfetched epics and unavailable comments are not falsely labeled as confirmed missing updates. The missing-month filter and headline count use the same value resolution, including pending saves.

Validation: one focused isolated browser flow checks missing/current months, grouped rows, October/November/December switching, correct editor navigation, fixture GUS save and marker removal, and narrow-screen icon/accessibility. UI-only change; syntax and diff checks pass. No Node/full suite or live GUS/model calls were run.

## 2.0.0-GA — compact V2MOM outcome updates and full-page epic table

Generate V2MOM update now prepares grounded epic summaries and automatically synthesizes one compact paragraph per measure/team. The primary output combines related delivery outcomes rather than displaying concatenated epic reports. The runtime GUS Apps AI SDK system/user instructions aim for 40–55 words with a hard 500-character/70-word cap, selecting two or three material outcome themes, meaningful supplied metrics and critical dependencies/risks with documented recovery or next actions. Current review-month evidence leads; older progress supplies only necessary context. Technical inventories and repeated historical narration are omitted when not material. Goals, Closed, Ready for Review and Released remain distinct; existing factual/temporal/numeric guards and empty-output rejection remain. Screenshot examples guide style only and supply no runtime facts. Instructions are documented in docs/V2MOM_UPDATE_INSTRUCTIONS.md and embedded in the SDK payload.

Detailed epic paragraphs remain under a collapsed supporting section. Expand All/Collapse All include that section. Copy leadership update exports only ready compact measure/team paragraphs, grouped once by measure and full team name. The separate measure action can regenerate consolidation from existing epic summaries without repeating the epic phase. Incomplete/rejected output remains in diagnostics; partial coverage is not represented as complete. Existing refresh-state preservation is retained.

The overview table no longer uses the fixed 560px vertical cap. It lays out all rows naturally and fills available page height, with the footer after the table; horizontal scrolling and the explicit fullscreen mode remain available. Executive view keeps its independent layout.

Validation: eleven focused executive tests pass, including all-source inclusion, runtime SDK override, compact caps and existing evidence/empty-output safeguards. One combined isolated browser flow verifies 26 rows without internal vertical clipping, one-click consolidation, three compact team paragraphs, measure-level clipboard, hidden supporting detail, expand/collapse and manual-fetch state preservation. No full suite or actual production model/GUS mutation was performed.

## 2.0.0-GA — reject empty-looking AI summaries and omit empty cards

Fixed quoted-empty AI responses such as two quote characters being accepted as nonempty summaries. Native executive, SDK executive and consolidated-measure validation now reject quote-only, punctuation-only, placeholder and standalone-status responses while retaining valid short prose. Existing evidence, numeric, chronology and status checks remain. A bounded correction may still recover a usable paragraph; repeated empty output remains non-ready rather than fabricated fallback prose.

UI readiness applies the same content check defensively, including legacy payloads that incorrectly declare empty text ready. Empty epic results cannot create a measure/team group or enter the copied leadership update. Consolidated measure/team cards and their copy action are created only for substantive ready paragraphs. Failed consolidations remain in a separate collapsed generation-details section, rather than empty measure cards. Real source gaps and failures are not hidden as successful coverage.

Validation: ten focused executive tests pass, including quote/punctuation/placeholder/status rejection, bounded native/SDK empty responses, existing evidence checks and preference behavior. One isolated browser flow tests all-empty and mixed valid/legacy-empty responses, zero empty executive/consolidated cards, copy-action visibility and clipboard exclusion, diagnostics, and successful retry. No full suite run or live GUS/model calls.

## 2.0.0-GA — full-width executive updates

Removed the 1100px executive paragraph cap. Executive updates now use the full available measure/team content width with the existing compact side padding, matching consolidated updates. Long unbroken text wraps within the available width. No update text, AI rules or GUS data is changed.

Validation: one focused isolated browser flow generates representative executive and consolidated output and verifies paragraph width equals the parent content width with no overflow at 2400px, 1200px and 760px. CSS-only change; no Node or broad regression suite run.

## 2.0.0-GA — preserve review state during background refresh

Fixed the executive summary disappearing during GUS fetch/repaint. Generated summary scope is now the selected release IDs and review month, independent of cache document revisions. Per-epic fetch revisions no longer hide executive or consolidated measure output or disable its copy action. Meaningful source evidence changes retain the existing summary and show a separate regeneration prompt; summaries are not silently regenerated or represented as newly generated from changed evidence.

Executive rendering skips identical output, preserving the actual DOM through routine cache refresh. Open/collapsed measure and evidence sections survive repaint. Viewport and table/drawer/nested-table scroll positions and table-control focus are retained when DOM must be rebuilt. Selected owner/health filters remain selected even if refreshed values no longer contain them, so users can explicitly clear them rather than silently losing the filter. Fetch error dialogs no longer replace an active drawer/editor. Existing unsaved-editor/recovery guards continue to defer automatic refresh. No summary is persisted to browser storage; a full browser page reload starts a fresh session as requested. Manual GUS fetch also retains summaries and review state.

Validation: one isolated browser flow deliberately changes cache revisions on automatic state responses, generates executive/measure output, checks DOM identity and collapse state, runs manual GUS fetch, changes source comments and checks retained copyable output plus regeneration notice, then checks search, expanded rows and unsaved monthly text survive refresh. Four focused grouping/sorting tests also pass, retaining the new review-priority default. No full suite or live data/model calls were performed.

## 2.0.0-GA — review-priority default Epic Status sorting

The landing table now defaults to Epic Status priority rather than epic name. Watch and Not Started precede On Track and Completed. Blocked/At Risk are highest priority; Canceled follows completed work, and unreported status is placed last. Other unrecognized active statuses stay before healthy work. Names provide deterministic ordering within a status priority. Health grouping uses the same priority, while rows inside other groups retain the selected table order. Clicking the status header reverses the priority, and manual name/lead sorting remains available. Reload restores the requested default status sort. No GUS data is changed by sorting.

Validation: four focused grouping/sorting tests and one isolated browser flow covering default row order, reverse status order, manual name sorting and reload. No full suite run; no live GUS writes or model calls.

## 2.0.0-GA — inline Watch recovery and readable summary tooltips

Selecting a Watch Review Status without Path to Green now opens a small inline popup beside the control. The user enters a recovery action and next step, then Save & apply status writes both GUS Path_to_Green__c and Epic_Health_Comments__c in one Salesforce record update. The selected review month receives a new append-only entry retaining its latest engineer update plus the explicit Path to Green. Original rich comment history and pending dashboard drafts remain intact. Both fields are reread and verified before the shared Review Status is applied. Invalid reasons, changed remote plans, stale shared revisions and unverifiable writes do not silently apply a review reason. Cancel leaves data unchanged. Failed saves retain entered text in the popup.

Recent-update tooltips now use content-sensitive widths constrained to the viewport and available space beside the Summary-button column. Long URLs and unbroken text wrap inside month tiles; long bodies scroll vertically. Summary buttons remain unobstructed. Click opening waits for table scroll positioning so a narrow-view auto-scroll cannot immediately close the tooltip.

Validation: three focused tests cover the combined recovery write, current-month entry and rich-history/draft preservation, retry idempotency, stale-plan/invalid-reason/verification failures, and conditional Health Comments plus Path-to-Green adapter fields. One isolated browser flow checks popup cancel/save, both remote fixture fields, Review Status reload, long-link wrapping, viewport bounds and clear Summary-button lane at 1600px and 900px. No full suite run. No live GUS data was changed by tests; actual production write permissions remain user/session dependent. Existing non-atomic fallback and shared-store failure caveats remain: if GUS succeeds but dashboard persistence subsequently fails, the UI reports the failure and retains text for review.

## 2.0.0-GA — distinct status colors and inline GUS Epic Status editing

Epic Status is editable inline in parent and optionally visible detail rows, including grouped views. The app loads active GUS Health picklist values when metadata access is available and respects read-only permissions. Every save checks release membership, current shared revision and current GUS status, writes only Health__c, and verifies the actual GUS value before updating shared dashboard state. Pending monthly drafts and engineer comments are preserved. Changing status clears the old dashboard Review Status reason so the user selects a reason appropriate to the new status. Watch requires saved Path to Green; selecting it without recovery text opens the existing editor first. Normal GUS refresh continues to bring externally changed statuses into the shared dashboard.

Distinct status colors now apply to badges, inline controls, legends and the Epic Health chart: Not Started grey, Canceled yellow, Watch amber, Blocked/At Risk red, Completed blue and On Track green. Healthy metric semantics are retained: Completed and On Track remain healthy despite their different visual colors.

Validation: three focused service/adapter tests cover verified Health-only writes, stale/invalid edits, preservation, review-reason reset, external refresh, Watch recovery, verification failure, active picklist metadata, permission denial and conditional headers. One isolated browser flow verified six unique badge/dot colors, healthy filtering, inline status writes and reload, updated review options and missing-Watch recovery. No full suite run and no live GUS records were changed by tests. Actual production write permissions and model responses remain session-dependent and unverified by the isolated flow.

## 2.0.0-GA — AI dependency recovery and clearer review controls

Removed automatic Google Sheets lookup from read-only previews, monthly/executive generation and individual comment publication. These paths use GUS comments and verified work evidence directly; absent Measure remains unassigned and is called out separately, never guessed. Normal generation/publication still requires the epic goal and applicable Path to Green. Read-only preview uses the displayed engineer text, needs no mapping/goal/recovery metadata and never writes. Summary evidence, chronology, status and release guards remain unchanged. Removed repetitive Review epic recovery buttons and clarified the optional reference settings.

Not Started now requires one of Planned, Bandwidth Constraints, Dependency-Blocker or To be re-prioritised. The shared save/schema/publication checks match, and saving Review Status preserves pending monthly drafts. Parent columns balance epic titles with readable leads, statuses and summary controls. Epic Health has a distinct pulse icon. Selected monthly editor appears first; remaining months retain chronological order. Review & publish is hidden when no drafts await action and retained for pending recovery.

Added a visible dashboard loading spinner until shared data loads or an actionable error appears. Recent-update tooltip opens beside the Summary-button column, keeping that column clear for moving to the next row. Reduced-motion preference is respected.

Validation: 12 focused Node tests and one combined isolated browser flow covering enum save/reload/publication, column widths, displayed-text preview and monthly/executive/measure SDK flows with Sheets unavailable, active-month order, loading lifecycle, tooltip placement and next-summary navigation. No full suite run. Production source deployment is checked separately; actual production SDK/model responses and authenticated browser remain unverified. No live GUS comments or Slack messages are modified by these tests.

## 2.0.0-GA — clean measure updates and streamlined review layout

The user explicitly made Method optional. A populated GUS Project/Measure now permits AI generation and publication without Method metadata, private Google Sheets access or Method review. Only an absent measure needs resolution; existing goal and recovery checks remain. Manual measure confirmation no longer requires a Method. Annual reference settings remain available for missing-measure fallback and context.

Executive updates now use a dedicated validated prose path for SDK/native AI with one bounded correction. Engineer comments remain primary; fresh month-scoped work subject/description/status facts supplement them. Shareable output contains only supported third-person TPM program/measure paragraphs. Raw source fallback, “The team reports,” Done/Outcome/context labels, repeated KPI inventories, health badges and missing-update callouts no longer appear in update paragraphs or copied updates. Evidence and generation problems remain in a collapsed inspection section, separate from copyable prose. Unavailable or rejected AI returns no copyable paragraph rather than raw source fragments. Valid undated accomplishments may be stated without invented month attribution; an explicit current-month claim still needs dated support. Completion/release/phase guards remain.

Executive export groups clean paragraphs by measure and full team name; consolidated output uses the same clean measure/team grouping. The summary row order is Epic Name, Development Lead, Epic Status, Review Status, Review Summary. Summary buttons have an actual aligned Review Summary column. The nested expanded table hides both status columns by default; users can opt in from Columns. These shared preferences survive reload and release edits, and the parent statuses always remain visible. Tabs are reduced to a compact 13px/34px treatment while retaining selected-state contrast. Tiles are reordered in the DOM for matching visual/keyboard order: Release scope, Story point delivery, Epic health, On track, Needs attention, review-month updates, Monthly coverage.

Validation: eight focused tests covering measure-only resolution without Google/Method, bounded native/SDK correction, no fallback export, clean consolidation, undated-versus-current timing and shared preference persistence through release edits. One combined browser flow checked literal clipboard content, SDK correction, parent row order, Summary heading, default checkbox states and reload persistence, compact tabs and tile order. No full suite run. Actual production SDK/model output remains unverified; no live GUS comments or Slack messages were modified in tests.

## 2.0.0-GA — Path to Green in monthly updates

Removed Path to Green capture buttons from compact and expanded epic Status cells. The monthly-update editor now contains the recovery-plan field, required for Watch/Blocked, with an explicit Save Path to Green action. Save update validates and saves any changed plan through the verified GUS endpoint before queueing comment publication. The plan remains the epic-level GUS field. Existing Review Status and source-evidence publication checks remain. Validation: focused browser workflow verified no row PTG buttons, mandatory monthly field, verified GUS path save, status persistence, grouping and summary controls; JavaScript syntax check passed. No unrelated test suites run.

## 2.0.0-GA — inline Epic Health legend

Status/count pairs now sit side by side with 8px gaps and wrap neatly at the tile edge. Each label stays with its count; status-filter actions remain. The chart and backend behavior are unchanged. Validation: one focused browser flow at wide/narrow sizes checked adjacency, no clipping and filtering; no unrelated tests rerun.

## 2.0.0-GA — review statuses, EpicPulse policy and measure/team summaries

Renamed the status header to Epic Status and added shared, inline Review Status in compact, expanded and grouped rows plus the epic sidebar. Watch accepts Delayed or At-Risk; Canceled accepts De-Prioritised, Mistakenly Added or Not a Priority. Missing required values show !. Values are scoped to the current fresh GUS status, persisted in the dashboard journal and retained on fetch. Stale status/revision saves are rejected. Review Status does not overwrite GUS Health.

Watch requires a saved Path to Green before Review Status/publication. Watch, Blocked or explicit reported blockers require Path to Green for AI/publishing. The editor writes the actual GUS Path_to_Green__c with prechecks/conditional write where available and a post-save verification. No AI silently invents or changes a recovery plan.

The user explicitly adopted the linked EpicPulse guide after choosing its conflicts over prior behavior. New approved comments are now prepended append-only rather than replacing/sorting older entries. Exact existing rich history is preserved, repeat saves are idempotent, and empty updates cannot erase history. The monthly editor and AI use only the newest same-month entry; older entries remain separately available. Goal/Success Criteria, verified mapping or engineer-confirmed none, and required recovery data are checked before AI/GUS publication. Engineer comments are primary; work evidence supplements them. Missing-data caveats stay separate from polished prose.

Sources & connection now exposes a shared editable annual V2MOM sheet, fiscal year and tabs, initially the supplied FY27 HRP sheet. Project V2MOM mapping is primary; sheet fallback reads fresh data through an authenticated host Sheets adapter (or accessible Google export), matches exact measure codes/labels and rejects ambiguity. The supplied private sheet export returns HTTP 401. GUS Apps Google Sheets authentication is therefore still required for automatic private-sheet fallback; no stale snapshot or memorized mapping is used. Engineer-confirmed mapping is explicitly saved and tied to the complete reference configuration, including tabs, and expires on any reference change.

Executive and consolidated updates use one expandable V2MOM measure header with full team sections beneath it. Added Expand All, Collapse All and per-measure +/− controls. Risks are ordered first within each team; deterministic completion/target/story-point KPIs remain separate from narrative paragraphs. Verified team context no longer causes false completion rejection in method consolidation; wrong phases, dates and release claims still fail. Rejected AI method text is escaped and shown separately for review, never applied as a supported summary.

Health distribution uses compact status/count legends so seven metric tiles no longer stretch vertically. Navigation tabs have larger text, subtle backgrounds and a stronger selected state.

Validation: 10 focused workflow tests plus 4 targeted AI checks, and one combined browser flow covering status persistence, GUS path save, groups/details, annual settings, newest-entry editor/history, one measure/three team sections, all accordion controls, tabs and compact tile height. No full suite run. Production LLM output and the host Google Sheets adapter remain unverified; no live GUS epic comments or Slack messages were changed by tests. Slack capture/posting portions of the external guide are outside this summary adaptation; reminder preparation remains user-controlled.

## 2.0.0-GA — compact metrics, grouped collapse and explicit summaries

Removed bottom action links/dividers from the first four metric tiles; the whole tile still filters the table. Larger metric doughnuts and the health distribution remain; monthly coverage and story-point delivery use bars and raw totals. Seven tiles retain equal height in one scrollable section. Blue/teal replaces the primary purple review accents. Updated the Release Priorities subtitle.

Collapse All now closes every group level and epic detail, including partially expanded grouped views. Expand All reopens groups and details. Collapsed rows provide an explicit Summary button; expanded rows have no source tooltip trigger and monthly AI Preview requires a click, so hovering visible content consumes no tokens.

Monthly AI formatting cleanup accepts harmless emphasis and converts first-person wording before factual/style validation, without another model call. Numeric matching is lossless and normalizes only valid thousands separators; comma lists and distinct large integers remain distinct. Genuine failures name the unsupported number/reason and show escaped, read-only generated text for review without applying it or changing the editor. Existing source-evidence status/release checks remain.

Validation: six targeted Node tests and one combined fixture browser flow covering layout, restored bars, grouped collapse/expand, source Summary, no AI on expanded hover, correction, failure preservation and explicit save/reload. No full suite run. Production SDK/model output remains unverified; no production epic comments or Slack messages were changed in tests.

## 2.0.0-GA — monthly AI acceptance recovery and seven health tiles

The monthly validator no longer discards a supported current paragraph solely because optional historical text is missing/invalid, citation metadata omits known keys, or the paragraph slightly exceeds the preferred short target. Invalid historical content is omitted with a visible review note; missing citation coverage is also a note rather than an assertion of full coverage. JSON, JSON summary aliases and finished plain prose share the same factual/style checks. Current prose has a bounded hard limit (500 characters/85 words), while the prompt retains its shorter preferred target. Invented citations, unsupported current completion/release claims, status inventories, empty/error tokens and first person remain failures. Correction and the final warning now receive the specific validation reason.

Fixed a concrete false rejection: progressing toward review readiness is future progress, not proof that review readiness has already been reached. Existing unsupported-release and current-ready-state checks remain. A valid current update can be shown after one model call even if optional prior context needs review; no raw task/status fallback was reintroduced. Original editor text remains unchanged when the current paragraph fails.

Release metrics and Health & delivery are now one default-expanded collapsible Release Health Metrics section. All seven cards use the same compact styling and 3D icon scale in one grid row. Narrow screens scroll the strip horizontally without clipping values or forcing page overflow. Existing tile filters, health/coverage/story-point controls remain.

User preference is recorded in AGENTS.md: validate affected modules and one relevant UI flow; do not rerun unrelated suites or hold the live app completion for Pages. Validation here: 48 focused monthly/AI/grounding tests and one browser flow for seven-card layout, collapse, correction, failed editor preservation and explicit save/reload. No full suite run. Production LLM output remains unverified because the signed-in browser tool is unavailable; the change addresses reproducible validator failures and adds precise diagnostics rather than claiming model perfection. No production comments or Slack messages were written in tests.


## 2.0.0-GA — epic leadership AI instruction policy

Added a reusable runtime instruction file (`backend/monthly-instructions.js`) and matching human-readable guide (`docs/AI_EPIC_SUMMARY_INSTRUCTIONS.md`). The existing backend first fetches the epic, goals/description/success criteria, health comments, Path to Green and month/sprint work evidence. The SDK then receives the policy as its system prompt and the complete supplied primary delivery evidence as data; the model has no query/write/tool authority.

Current-month engineer updates and verified transitions lead; review-month sprint subjects/descriptions/status support the narrative, goals explain purpose, and older comments provide a separate historical sentence. Current updates are a third-person leadership paragraph (up to360 characters/60 words), with supported risks and documented recovery/next actions where available. Prior context stays within160 characters/28 words. Descriptions, Closed and Ready for Review never establish release or completion of the entire epic. Historical health cannot inherit a later snapshot. A documented infinitive recovery action is not a completed outcome.

Both SDK and native paths reject subject/status inventories, including dash, colon, equals and bracket forms, in either paragraph. A rejected response gets one automatic correction within the existing shared deadline (SDK60s/native12s), and SDK token accounting includes both attempts. Failed/unavailable generation now returns no ready draft and preserves the existing editor and unsaved state; raw work lists are no longer substituted or labelled ready. Saving remains an explicit user action.

Validation: 175 Node tests; isolated browser generation/correction, repeated-invalid editor/source preservation, explicit Save and reload checks pass with mocked SDK responses. Runtime instruction/document parity was independently verified. Production LLM quality and hosted-browser behavior remain unverified; heuristic claim checks are not semantic proof. No production epic comments or Slack messages were written in testing.


## 2.0.0-GA — Escape grouping reset and Slack epic hyperlinks

Every selected Group by field now participates in the same last-applied-first Escape undo sequence as health, owner, search and metric filters. Group choices have removable applied-filter chips. Clear and rapid double Escape also reset grouping; double Escape retains its one manual GUS refresh. Existing open-menu, tooltip and unsaved-editor handling remains first priority. Release selection and review month remain the review scope rather than removable filters.

Slack reminder epic names are rendered as explicitly styled, embedded GUS hyperlinks and copied as text/html anchors. The old renderer applied italic formatting after generating HTML, which could corrupt the underscores inside ADM_Epic__c URLs. The new formatter tokenizes approved epic links and expected mentions before styling text, so emphasis cannot touch a URL. Plain-text clipboard fallback contains readable names plus full GUS URLs. User-provided content stays escaped; unsupported URLs never become generated anchors.

Validation: 166 Node tests pass, including exact URL/label preservation, field-name underscores, text escaping and fallback links. Isolated browser checks exercise interleaved grouping/filter Escape undo, Clear, one double-Escape refresh, and inspect the actual copied HTML anchors and plain text. Actual native Slack paste/mention conversion and production browser behavior remain unverified. No Slack messages or production GUS comments were written.


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
