#!/usr/bin/env python3
"""Parse the published Hourglass reports (core-foundational-services/hourglass/reports/*.html) into headline metrics.
Usage: published.py REPORTS_DIR OUT.json   -> {team_key: {sprint: {prs, median_h, p80_h, pct_under_24h}}}"""
import json, re, sys, glob, os

def num(rx, html):
    m = re.search(rx, html, re.S)
    return float(m.group(1)) if m else None

def main(src, out):
    res = {}
    for f in sorted(glob.glob(os.path.join(src, '*_PR_CycleTime_*.html'))):
        key, sprint = re.match(r'(.+)_PR_CycleTime_(.+)\.html', os.path.basename(f)).groups()
        h = open(f, encoding='utf-8', errors='ignore').read()
        m = re.search(r'(\d+)\s+PRs analyzed', h)
        res.setdefault(key, {})[sprint] = {
            'prs': int(m.group(1)) if m else None,
            'median_h': num(r'Median Cycle(?: Time)?</div>\s*<div class="value"[^>]*>([0-9.]+)', h),
            'p80_h': num(r'P80 Cycle(?: Time)?</div>\s*<div class="value"[^>]*>([0-9.]+)', h),
            'pct_under_24h': num(r'(?:Merged|PRs)[^<]{0,20}&lt;\s*24h</div>\s*<div class="value"[^>]*>([0-9.]+)', h)}
    json.dump(res, open(out, 'w'), separators=(',', ':'))
    print(len(res), 'teams', sum(len(v) for v in res.values()), 'reports')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
