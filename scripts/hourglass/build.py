#!/usr/bin/env python3
"""Merge collector output and parsed published reports into public/hourglass-data.json.
Usage: build.py COLLECTED.json PUBLISHED.json OUT.json"""
import json, sys
col, pub, out = (json.load(open(sys.argv[1])), json.load(open(sys.argv[2])), sys.argv[3])
teams = {}
for key in sorted(set(col['teams']) | set(pub)):
    c = col['teams'].get(key, {})
    teams[key] = {'name': c.get('name') or key, 'published': pub.get(key, {}), 'sprints': {__import__('re').match(r'\d{4}\.\d+[a-z]', k).group(0): v for k, v in c.get('sprints', {}).items()}}
json.dump({'generated': col.get('generated'), 'teams': teams}, open(out, 'w'), separators=(',', ':'))
print(len(teams), 'teams', sum(len(t['sprints']) for t in teams.values()), 'sprint reports')
