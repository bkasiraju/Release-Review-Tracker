# Hourglass page

Static data `public/hourglass-data.json`, built offline (no AI, no cost):

1. `python3 scripts/hourglass/collect.py --teams teams.json --sprints 2026.10b 2026.11a --out out.json --cache DIR` (needs `sf` for GUS and `gh` for git.soma; `gus_teams.json` beside `teams.json`).
2. `python3 scripts/hourglass/published.py <hourglass>/reports published.json`
3. `python3 scripts/hourglass/build.py out.json published.json public/hourglass-data.json`
4. Bump the `?v=` in `fetch` in `public/hourglass.js`, then the standard flow.

Method: GUS sprint work items -> git.soma PR search by `@W-N` in title; bots, forks, closed-unmerged excluded; PRs merged in the sprint window; cycle = created to merged. Core-on-Git change lists are not included, so counts are a lower bound.

Scope: MAPS, MQ and VegaCache only. VegaCache is not an HRP team, so use a teams file {"VegaCache":"VegaCache FACE"} with its GUS id in gus_teams.json.
