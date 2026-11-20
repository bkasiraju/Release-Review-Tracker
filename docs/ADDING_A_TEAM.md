# Adding a team to ReleaseIQ

Teams are configured in one place: `backend/teams.config.js`. Add one entry to `TEAMS`; the hub, planner, people lists, theme and tag defaults, @user search and PagerDuty digest all read from it.

## 1. GUS prerequisites
- An active scrum team in GUS (`ADM_Scrum_Team__c`) with members.
- A program named `<short name> - <release>` (for example `MAPS - 268`) and a planned release.
- The product tags the team uses (the default tag is optional).

## 2. Add the entry
```js
{ key: 'myteam', group: 'My Team', gus: 'My Team Name', short: 'MYT', theme: 'MYT', tag: 'My Product Tag',
  leaders: ['AMIT', 'JAYANT'] }
```
Fields are documented at the top of `backend/teams.config.js`. A trailing `%` in `gus` matches every team starting with that text. If a person must be a leader, add them to `LEADER_IDS` in `backend/hub.js`.

## 3. Verify and ship
1. `node --test tests/teams.config.test.js`
2. Follow the normal release steps (version bump, release notes, push, tag, `scripts/deploy.py --staging-only`, then `scripts/deploy.py`).
3. Open the hub, pick the team, and check people, the planner Theme chip (`R<release>_<theme>_Workstream`) and the default product tag.
