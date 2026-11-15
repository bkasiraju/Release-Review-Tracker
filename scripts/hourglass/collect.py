#!/usr/bin/env python3
"""Hourglass collector: PR cycle-time metrics per team and sprint, from GUS + git.soma. No LLM, no cost.

Method mirrors the Hourglass pr-cycle-time-analyzer skill (core-foundational-services/hourglass):
  GUS work items of the team's sprint -> git.soma PR search by @W-number (title must carry it) ->
  merged PRs in the sprint window -> cycle = created -> merged. Extras: time to first human review (pull reviews),
  PR size, rework rounds. Root causes are rule-based tags (see tag()).
Needs: `sf` (authenticated to GUS) and `gh` (authenticated to git.soma.salesforce.com).
Usage: collect.py --teams teams.json --sprints 2026.10b 2026.11a --out out.json [--cache DIR]
"""
import argparse, json, os, re, subprocess, sys, time, statistics, hashlib, threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

HOST = 'git.soma.salesforce.com'
BOTS = re.compile(r'(\[bot\]$|^tok-|autointegrate|^renovate|^dependabot|-bot$|^sfdc-|^svc)', re.I)
ENV = dict(os.environ, GH_HOST=HOST)
LOCK = threading.Lock()
CACHE = None

def sh(cmd, retries=4):
    for i in range(retries):
        p = subprocess.run(cmd, capture_output=True, text=True, env=ENV)
        if p.returncode == 0:
            return p.stdout
        err = (p.stderr or '') + (p.stdout or '')
        if re.search(r'rate limit|secondary|403|429', err, re.I):
            time.sleep(20 * (i + 1)); continue
        if '404' in err or 'Not Found' in err:
            return None
        time.sleep(2 * (i + 1))
    return None

def cached(key, fn):
    if CACHE:
        f = os.path.join(CACHE, hashlib.md5(key.encode()).hexdigest() + '.json')
        if os.path.exists(f):
            return json.load(open(f))
    v = fn()
    if CACHE and v is not None:
        with LOCK:
            json.dump(v, open(f, 'w'))
    return v

def gus(q):
    p = subprocess.run(['sf', 'data', 'query', '-q', q, '--json'], capture_output=True, text=True)
    j = json.loads(p.stdout)
    if j.get('status') != 0:
        raise SystemExit('GUS query failed: ' + str(j)[:300])
    return j['result']['records']

def api(path):
    out = sh(['gh', 'api', path])
    return json.loads(out) if out else None

def search_prs(wnum):
    def go():
        res, page = [], 1
        while page <= 5:
            j = api(f'search/issues?q={wnum}+type:pr&per_page=100&page={page}')
            if not j: break
            res += j.get('items', [])
            if len(j.get('items', [])) < 100: break
            page += 1
        return [{k: i.get(k) for k in ('html_url', 'title', 'state', 'created_at', 'closed_at', 'comments', 'user')} | {'merged_at': (i.get('pull_request') or {}).get('merged_at')} for i in res]
    return cached('s:' + wnum, go) or []

def pr_detail(org, repo, n):
    def go():
        d = api(f'repos/{org}/{repo}/pulls/{n}')
        if not d: return None
        rv = api(f'repos/{org}/{repo}/pulls/{n}/reviews?per_page=100') or []
        return {'additions': d.get('additions', 0), 'deletions': d.get('deletions', 0), 'files': d.get('changed_files', 0),
                'review_comments': d.get('review_comments', 0), 'comments': d.get('comments', 0),
                'merged_by': (d.get('merged_by') or {}).get('login'), 'author': (d.get('user') or {}).get('login'),
                'reviews': [{'u': (r.get('user') or {}).get('login'), 's': r.get('state'), 't': r.get('submitted_at')} for r in rv]}
    return cached(f'd:{org}/{repo}/{n}', go)

def ts(s): return datetime.fromisoformat(s.replace('Z', '+00:00')) if s else None
def hrs(a, b): return round((b - a).total_seconds() / 3600, 2)
def pct(vals, p):
    if not vals: return None
    v = sorted(vals); k = (len(v) - 1) * p / 100; f = int(k); c = min(f + 1, len(v) - 1)
    return round(v[f] + (v[c] - v[f]) * (k - f), 2)

def tag(pr):
    t = []
    c = pr['cycle_h']
    if c <= 24: return t
    if pr['human_reviews'] == 0 and pr['comments'] <= 0 or pr['ttfr_h'] is None: t.append('Idle · no human review')
    if pr['ttfr_h'] is not None and pr['ttfr_h'] > 24: t.append('Slow review pickup')
    if pr['rounds'] >= 3: t.append('Multiple rework rounds')
    if pr['size'] > 500: t.append('Large PR')
    if pr['approve_to_merge_h'] is not None and pr['approve_to_merge_h'] > 4: t.append('Merge delay after approval')
    a, b = ts(pr['created']), ts(pr['merged'])
    if (b - a).days >= 1 and any((a + timedelta(days=i)).weekday() >= 5 for i in range((b - a).days + 1)) and c < 24 * 6: t.append('Weekend stall')
    if c > 24 * 7: t.append('Open longer than a week')
    return t

PRIO = ['Idle · no human review', 'Slow review pickup', 'Multiple rework rounds', 'Large PR', 'Merge delay after approval', 'Weekend stall', 'Open longer than a week']
ADVICE = {
 'Idle · no human review': ('Nudge reviewers early and set a same-day review expectation', 'Team (EM + tech lead)', 'Add a daily review slot and a stale-PR reminder; PRs with no human review account for most of the delay.'),
 'Slow review pickup': ('Cut time-to-first-review below 24h', 'Team (EM + tech lead)', 'Rotate a review buddy per day and post new PRs in the team channel.'),
 'Multiple rework rounds': ('Agree design and test expectations before coding', 'Tech lead', 'Short design notes or draft PRs up front reduce repeated review rounds.'),
 'Large PR': ('Split PRs above ~500 changed lines', 'Authors', 'Smaller, stacked PRs review and merge faster.'),
 'Merge delay after approval': ('Reduce approval-to-merge wait (CI / merge queue)', 'Team + CI / DevInfra', 'Check CI duration and flaky checks after approval; merge as soon as green.'),
 'Weekend stall': ('Open PRs early in the week', 'Authors', 'PRs opened late Thursday or Friday wait over the weekend; aim to open by midweek.'),
 'Open longer than a week': ('Close or split long-running PRs', 'Authors + tech lead', 'Review PRs open more than 7 days in standup and decide merge, split or close.'),
}

def analyze(team, sprint, wis, win):
    start, end = win
    wmap = {w['Name']: w for w in wis}
    prs, seen = [], {}
    def work(w):
        return w['Name'], search_prs(w['Name'])
    with ThreadPoolExecutor(8) as ex:
        results = list(ex.map(work, wmap.values()))
    resolved = set()
    for wn, items in results:
        for i in items:
            m = re.search(r'git\.soma\.salesforce\.com/([^/]+)/([^/]+)/pull/(\d+)', i['html_url'])
            if not m: continue
            org, repo, num = m.group(1), m.group(2), int(m.group(3))
            if not re.search(r'W-?' + wn[2:] + r'(?!\d)', i['title'] or '', re.I): continue
            login = (i['user'] or {}).get('login', '')
            if BOTS.search(login) or org.lower() == login.lower(): continue
            if i['state'] == 'closed' and not i['merged_at']: continue
            cr, mg = ts(i['created_at']), ts(i['merged_at'])
            ref = mg or cr
            if not (start <= ref < end + timedelta(days=1)): continue
            key = (org, repo, num)
            if key in seen:
                seen[key]['wis'].add(wn); resolved.add(wn); continue
            seen[key] = {'org': org, 'repo': repo, 'num': num, 'title': i['title'], 'url': i['html_url'], 'author': login, 'created': i['created_at'], 'merged': i['merged_at'], 'wis': {wn}}
            resolved.add(wn)
    plist = list(seen.values())
    with ThreadPoolExecutor(8) as ex:
        details = list(ex.map(lambda p: pr_detail(p['org'], p['repo'], p['num']), plist))
    merged = []
    for p, d in zip(plist, details):
        if not p['merged']: continue
        cr, mg = ts(p['created']), ts(p['merged'])
        rev = [r for r in (d or {}).get('reviews', []) if r['u'] and r['u'] != p['author'] and not BOTS.search(r['u']) and r['t']]
        rev.sort(key=lambda r: r['t'])
        appr = [r for r in rev if r['s'] == 'APPROVED']
        d = d or {}
        pr = {'repo': f"{p['org']}/{p['repo']}", 'num': p['num'], 'title': (p['title'] or '')[:140], 'url': p['url'], 'author': p['author'], 'wi': sorted(p['wis'])[0],
              'created': p['created'], 'merged': p['merged'], 'cycle_h': hrs(cr, mg), 'ttfr_h': hrs(cr, ts(rev[0]['t'])) if rev else None,
              'approve_to_merge_h': hrs(ts(appr[-1]['t']), mg) if appr and ts(appr[-1]['t']) <= mg else None,
              'human_reviews': len(rev), 'rounds': 1 + sum(1 for r in rev if r['s'] == 'CHANGES_REQUESTED'),
              'comments': (d.get('comments', 0) or 0) + (d.get('review_comments', 0) or 0), 'size': (d.get('additions', 0) or 0) + (d.get('deletions', 0) or 0),
              'self_merged': bool(d.get('merged_by') and d.get('merged_by') == p['author'])}
        pr['cycle_h'] = max(0, pr['cycle_h']); pr['tags'] = tag(pr)
        merged.append(pr)
    cyc = [p['cycle_h'] for p in merged]
    ttfr = [p['ttfr_h'] for p in merged if p['ttfr_h'] is not None]
    # root-cause attribution: delay beyond 24h goes to the highest-priority tag on each PR
    causes = {}
    for p in merged:
        if not p['tags']: continue
        main = min(p['tags'], key=PRIO.index); lost = max(0, p['cycle_h'] - 24)
        c = causes.setdefault(main, {'cause': main, 'prs_affected': 0, 'hours_lost': 0.0, 'examples': []})
        c['prs_affected'] += 1; c['hours_lost'] = round(c['hours_lost'] + lost, 1)
        if len(c['examples']) < 3: c['examples'].append(f"{p['repo'].split('/')[1]}#{p['num']} ({p['cycle_h']:.0f}h)")
    total_lost = sum(c['hours_lost'] for c in causes.values()) or 1
    rc = sorted(causes.values(), key=lambda c: -c['hours_lost'])
    for i, c in enumerate(rc, 1): c['rank'] = i; c['pct_of_delay'] = round(100 * c['hours_lost'] / total_lost)
    recs = []
    for i, c in enumerate(rc[:3]):
        a = ADVICE[c['cause']]
        recs.append({'priority': f'P{i + 1}', 'action': a[0], 'description': a[2], 'owner': a[1], 'impact': f"Addresses ~{c['hours_lost']:.0f}h ({c['pct_of_delay']}%) of delay over 24h"})
    repos = {}
    for p in merged:
        r = repos.setdefault(p['repo'], {'repo': p['repo'], 'prs': 0, 'cyc': []}); r['prs'] += 1; r['cyc'].append(p['cycle_h'])
    repo_stats = sorted(({'repo': r['repo'], 'prs': r['prs'], 'avg_cycle_h': round(sum(r['cyc']) / len(r['cyc']), 1), 'median_cycle_h': round(statistics.median(r['cyc']), 1)} for r in repos.values()), key=lambda r: -r['prs'])
    buckets = [('<4h', 0, 4), ('4–24h', 4, 24), ('1–2d', 24, 48), ('2–7d', 48, 168), ('>7d', 168, 1e9)]
    dist = [{'label': l, 'n': sum(1 for c in cyc if lo <= c < hi)} for l, lo, hi in buckets]
    slow = sorted(merged, key=lambda p: -p['cycle_h'])[:10]
    n_code = len(resolved)
    return {
        'summary': {'work_items': len(wis), 'work_items_with_pr': n_code, 'prs': len(plist), 'merged': len(merged), 'open': len(plist) - len(merged),
                    'median_h': round(statistics.median(cyc), 1) if cyc else None, 'p80_h': pct(cyc, 80), 'p90_h': pct(cyc, 90),
                    'pct_under_24h': round(100 * sum(1 for c in cyc if c < 24) / len(cyc)) if cyc else None,
                    'median_ttfr_h': round(statistics.median(ttfr), 1) if ttfr else None, 'pct_ttfr_over_24h': round(100 * sum(1 for t in ttfr if t > 24) / len(ttfr)) if ttfr else None,
                    'avg_comments': round(sum(p['comments'] for p in merged) / len(merged), 1) if merged else None,
                    'avg_size': round(sum(p['size'] for p in merged) / len(merged)) if merged else None,
                    'pct_large': round(100 * sum(1 for p in merged if p['size'] > 500) / len(merged)) if merged else None,
                    'pct_no_human_review': round(100 * sum(1 for p in merged if p['human_reviews'] == 0) / len(merged)) if merged else None,
                    'pct_self_merged': round(100 * sum(1 for p in merged if p['self_merged']) / len(merged)) if merged else None},
        'dist': dist, 'repos': repo_stats[:12], 'slowest': [{k: p[k] for k in ('repo', 'num', 'title', 'url', 'author', 'wi', 'cycle_h', 'ttfr_h', 'comments', 'size', 'tags')} for p in slow],
        'prs': [{k: p[k] for k in ('repo', 'num', 'title', 'url', 'author', 'wi', 'cycle_h', 'ttfr_h', 'comments', 'size', 'tags')} for p in sorted(merged, key=lambda p: -p['cycle_h'])],
        'root_causes': rc, 'recommendations': recs,
        'gaps': {'work_items': len(wis), 'with_pr': n_code, 'no_pr': len(wis) - n_code, 'non_code': sum(1 for w in wis if (w.get('RecordType') or {}).get('Name') in ('Investigation', 'ToDo'))},
    }

def main():
    global CACHE
    ap = argparse.ArgumentParser(); ap.add_argument('--teams'); ap.add_argument('--sprints', nargs='+'); ap.add_argument('--out'); ap.add_argument('--cache'); ap.add_argument('--only', nargs='*')
    a = ap.parse_args(); CACHE = a.cache
    if CACHE: os.makedirs(CACHE, exist_ok=True)
    teams = json.load(open(a.teams))  # {key: gusTeamName}
    ids = json.load(open(os.path.join(os.path.dirname(a.teams), 'gus_teams.json')))
    out = json.load(open(a.out)) if os.path.exists(a.out) else {'generated': None, 'teams': {}}
    for key, name in teams.items():
        if a.only and key not in a.only: continue
        tid = ids[name]
        cond = ' OR '.join(f"Name LIKE '{s}%'" for s in a.sprints)
        sprints = gus(f"SELECT Id, Name, Start_Date__c, End_Date__c FROM ADM_Sprint__c WHERE Scrum_Team__c = '{tid}' AND ({cond})")
        t = out['teams'].setdefault(key, {'name': name, 'sprints': {}})
        for sp in sprints:
            ver = re.match(r'\d{4}\.\d+[a-z]', sp['Name']).group(0)
            wis = gus(f"SELECT Id, Name, Subject__c, Status__c, RecordType.Name FROM ADM_Work__c WHERE Sprint__c = '{sp['Id']}'")
            win = (ts(sp['Start_Date__c'] + 'T00:00:00Z'), ts(sp['End_Date__c'] + 'T00:00:00Z'))
            m = analyze(name, ver, wis, win)
            m['sprint'] = {'name': sp['Name'], 'start': sp['Start_Date__c'], 'end': sp['End_Date__c'], 'in_progress': datetime.now(timezone.utc) <= win[1] + timedelta(days=1)}
            t['sprints'][ver] = m
            s = m['summary']; print(f"{key:34s} {ver}  WI {s['work_items']:3d}  PR {s['merged']:3d}  med {s['median_h']}h  p80 {s['p80_h']}h  <24h {s['pct_under_24h']}%", flush=True)
        out['generated'] = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        json.dump(out, open(a.out, 'w'))
if __name__ == "__main__":
    main()
