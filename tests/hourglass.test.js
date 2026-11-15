const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/hourglass-data.json'), 'utf8'));
test('hourglass data covers 30 teams with 10b/11a keyed by plain sprint id', () => {
  assert.strictEqual(Object.keys(d.teams).length, 30);
  for (const t of Object.values(d.teams)) for (const k of Object.keys(t.sprints)) assert.match(k, /^\d{4}\.\d+[a-z]$/);
  assert.ok(Object.values(d.teams).filter(t => t.sprints['2026.10b']).length >= 20);
});
test('hourglass sprint reports carry the sections the page renders', () => {
  for (const t of Object.values(d.teams)) for (const s of Object.values(t.sprints)) {
    for (const k of ['summary', 'dist', 'repos', 'slowest', 'root_causes', 'recommendations', 'gaps', 'sprint']) assert.ok(k in s, k);
    assert.ok(s.summary.median_h == null || s.summary.median_h >= 0);
  }
});
