const MONTH_ORDER = ['April', 'May', 'June', 'July'];
const MONTH_KEY_MAP = { 'month-Apr': 'April', 'month-May': 'May', 'month-Jun': 'June', 'month-Jul': 'July' };
const HEALTH_VALUES = new Set(['On Track', 'Watch', 'Blocked', 'Not Started', 'On Hold', 'Completed', 'Canceled']);

function normalizeEpicId(id) {
  if (id == null) return '';
  return String(id).trim();
}

function soqlEscapeLiteral(s) {
  return String(s || '').replace(/'/g, "''");
}

function crossRefHint(msg) {
  const m = (msg || '').toLowerCase();
  if (!m.includes('invalid cross reference') && !m.includes('invalid_cross_reference')) return '';
  return ' This often means the epic Id is not in the org your session targets, or the epic has invalid lookup data; fix in GUS or re-auth to GusProduction.';
}

/**
 * Prefer a user-scoped JSForce / connection object when the host exposes one, so SOQL
 * respects the browser user’s sharing like Lightning. Falls back to ctx.sf.
 */
function resolveSalesforceConnection(ctx) {
  const c = ctx && typeof ctx === 'object' ? ctx : {};
  const ordered = [
    ['userConnection', c.userConnection],
    ['userSf', c.userSf],
    ['sfAsUser', c.sfAsUser],
    ['sfUser', c.sfUser],
    ['connectionAsUser', c.connectionAsUser],
    ['orgAsUser', c.orgAsUser],
    ['salesforceUser', c.salesforceUser],
    ['sf', c.sf],
  ];
  for (const [name, val] of ordered) {
    if (val && typeof val === 'object' && typeof val.query === 'function') {
      return { sf: val, connectionSource: name };
    }
  }
  const fallback = c.sf || {};
  return { sf: fallback, connectionSource: typeof fallback.query === 'function' ? 'sf' : 'none' };
}

function mergeMonthComment(existing, monthLabel, newText) {
  const sections = {};
  let currentMonth = null;
  for (const line of (existing || '').split('\n')) {
    const stripped = line.trim();
    let matched = false;
    for (const m of MONTH_ORDER) {
      if (stripped.toLowerCase().startsWith(m.toLowerCase() + ':') || stripped.toLowerCase().startsWith(m.toLowerCase() + ' ')) {
        currentMonth = m;
        sections[m] = stripped.slice(m.length).replace(/^[:\s]+/, '').trim();
        matched = true;
        break;
      }
    }
    if (!matched && currentMonth) {
      sections[currentMonth] = (sections[currentMonth] || '') + '\n' + line;
    }
  }
  sections[monthLabel] = newText.trim();
  return MONTH_ORDER
    .filter(m => sections[m] && sections[m].trim())
    .map(m => `${m}: ${sections[m].trim()}`)
    .join('\n');
}

module.exports.handleRequest = async (ctx) => {
  const req = ctx.request || ctx;
  const body = req.body || req;
  const action = body.action;
  const { sf, connectionSource } = resolveSalesforceConnection(ctx);

  if (action === 'debug') {
    const sfInfo = {
      type: typeof sf,
      keys: Object.keys(sf),
      methods: Object.keys(sf).filter(k => typeof sf[k] === 'function'),
      hasQuery: typeof sf.query === 'function',
      hasUpdate: typeof sf.update === 'function',
      hasSobject: typeof sf.sobject === 'function',
      hasRequest: typeof sf.request === 'function',
    };
    if (sf.constructor) sfInfo.constructorName = sf.constructor.name;
    const ctxKeys = Object.keys(ctx || {});
    const sfRelatedCtxKeys = ctxKeys.filter(k => /sf|user|org|conn|session|salesforce/i.test(k));
    return {
      ok: true,
      payload: {
        sfInfo,
        connectionSource,
        sfRelatedCtxKeys,
        ctxKeys,
        reqKeys: req ? Object.keys(req) : [],
        bodyKeys: Object.keys(body),
      },
    };
  }

  if (action === 'query') {
    const { soql } = body;
    if (!soql) return { ok: false, error: 'soql required' };
    if (typeof sf.query !== 'function') {
      return {
        ok: true,
        payload: {
          status: 'error',
          error: 'Salesforce connection has no query() — check applet runtime wiring.',
          records: [],
        },
      };
    }
    try {
      const result = await sf.query(soql);
      const rec = result && Array.isArray(result.records) ? result.records : [];
      const totalSize = result && result.totalSize != null ? result.totalSize : rec.length;
      return {
        ok: true,
        payload: {
          status: 'ok',
          records: rec,
          totalSize,
          done: result ? !!result.done : true,
        },
      };
    } catch (e) {
      const msg = e.message || String(e);
      const code = e.errorCode || e.name || '';
      return { ok: true, payload: { status: 'error', error: msg, errorCode: code, records: [] } };
    }
  }

  if (action === 'update') {
    let { epicId, field, value } = body;
    epicId = normalizeEpicId(epicId);
    if (!epicId || !field) return { ok: false, error: 'epicId and field required' };

    let gusField, gusValue;

    if (field.startsWith('month-')) {
      const monthLabel = MONTH_KEY_MAP[field];
      if (!monthLabel) return { ok: false, error: `Unknown month field: ${field}` };
      const eid = soqlEscapeLiteral(epicId);
      const existing = await sf.query(
        `SELECT Id, Epic_Health_Comments__c FROM ADM_Epic__c WHERE Id = '${eid}' LIMIT 1`
      );
      const row = (existing.records || [])[0];
      if (!row) {
        return {
          ok: true,
          payload: {
            status: 'error',
            epicId,
            gusField: 'Epic_Health_Comments__c',
            error: 'Epic Id not found in GUS for this org (no ADM_Epic__c row).',
          },
        };
      }
      const current = row.Epic_Health_Comments__c || '';
      gusField = 'Epic_Health_Comments__c';
      gusValue = mergeMonthComment(current, monthLabel, value || '');
    } else if (field === 'health') {
      if (!HEALTH_VALUES.has(value)) return { ok: false, error: `Invalid health: ${value}` };
      gusField = 'Health__c';
      gusValue = value;
    } else {
      const fieldMap = {
        pathToGreen: 'Path_to_Green__c',
        slippage: 'Slippage_Comments__c',
        priority: 'Priority__c',
        plannedStartDate: 'Planned_Start_Date__c',
        plannedEndDate: 'Planned_End_Date__c'
      };
      gusField = fieldMap[field];
      if (!gusField) return { ok: true, payload: { status: 'skipped', reason: `Field ${field} not mapped` } };
      gusValue = value;
    }

    if (!field.startsWith('month-')) {
      const eid = soqlEscapeLiteral(epicId);
      const chk = await sf.query(`SELECT Id FROM ADM_Epic__c WHERE Id = '${eid}' LIMIT 1`);
      if (!(chk.records || [])[0]) {
        return {
          ok: true,
          payload: {
            status: 'error',
            epicId,
            gusField,
            error: 'Epic Id not found in GUS for this org (no ADM_Epic__c row).',
          },
        };
      }
    }

    try {
      const result = await sf.update('ADM_Epic__c', epicId, { [gusField]: gusValue });
      const success = result && (result.id || result.success !== false);
      return { ok: true, payload: { status: success ? 'ok' : 'error', epicId, gusField, result } };
    } catch (e) {
      const base = e.message || String(e);
      return {
        ok: true,
        payload: { status: 'error', epicId, gusField, error: base + crossRefHint(base) },
      };
    }
  }

  if (action === 'batchUpdate') {
    const { updates } = body;
    if (!updates || !updates.length) return { ok: false, error: 'updates array required' };

    const results = [];
    for (const upd of updates) {
      const epicId = normalizeEpicId(upd.epicId);
      const { fields } = upd;
      if (!epicId || !fields) { results.push({ epicId, status: 'skipped' }); continue; }

      const gusUpdates = {};
      const monthUpdates = {};

      for (const [field, value] of Object.entries(fields)) {
        if (field.startsWith('month-')) {
          const ml = MONTH_KEY_MAP[field];
          if (ml) monthUpdates[ml] = value;
        } else if (field === 'health' && HEALTH_VALUES.has(value)) {
          gusUpdates.Health__c = value;
        } else {
          const map = { pathToGreen: 'Path_to_Green__c', slippage: 'Slippage_Comments__c', priority: 'Priority__c' };
          if (map[field]) gusUpdates[map[field]] = value;
        }
      }

      if (Object.keys(monthUpdates).length) {
        const eid = soqlEscapeLiteral(epicId);
        const existing = await sf.query(
          `SELECT Id, Epic_Health_Comments__c FROM ADM_Epic__c WHERE Id = '${eid}' LIMIT 1`
        );
        const row = (existing.records || [])[0];
        if (!row) {
          results.push({
            epicId,
            status: 'error',
            error: 'Epic Id not found in GUS for this org (no ADM_Epic__c row).',
            fields: ['Epic_Health_Comments__c'],
          });
          continue;
        }
        let merged = row.Epic_Health_Comments__c || '';
        for (const [ml, text] of Object.entries(monthUpdates)) {
          merged = mergeMonthComment(merged, ml, text);
        }
        gusUpdates.Epic_Health_Comments__c = merged;
      }

      if (Object.keys(gusUpdates).length && !Object.keys(monthUpdates).length) {
        const eid = soqlEscapeLiteral(epicId);
        const chk = await sf.query(`SELECT Id FROM ADM_Epic__c WHERE Id = '${eid}' LIMIT 1`);
        if (!(chk.records || [])[0]) {
          results.push({
            epicId,
            status: 'error',
            error: 'Epic Id not found in GUS for this org (no ADM_Epic__c row).',
            fields: Object.keys(gusUpdates),
          });
          continue;
        }
      }

      if (Object.keys(gusUpdates).length) {
        try {
          const result = await sf.update('ADM_Epic__c', epicId, gusUpdates);
          results.push({ epicId, status: (result && (result.id || result.success !== false)) ? 'ok' : 'error', result, fields: Object.keys(gusUpdates) });
        } catch (e) {
          const base = e.message || String(e);
          results.push({ epicId, status: 'error', error: base + crossRefHint(base), fields: Object.keys(gusUpdates) });
        }
      } else {
        results.push({ epicId, status: 'skipped', reason: 'no GUS fields' });
      }
    }

    return { ok: true, payload: { status: 'ok', results } };
  }

  if (action === 'einsteinSummarise') {
    const { prompt } = body;
    if (!prompt) return { ok: false, error: 'prompt required' };
    if (typeof sf.einsteinPromptGeneration !== 'function') return { ok: false, error: 'einsteinPromptGeneration not available' };
    try {
      const result = await sf.einsteinPromptGeneration(prompt);
      return { ok: true, payload: { status: 'ok', text: result?.generations?.[0]?.text || result?.text || (typeof result === 'string' ? result : JSON.stringify(result)) } };
    } catch (e) {
      return { ok: true, payload: { status: 'error', error: e.message || String(e) } };
    }
  }

  return { ok: false, error: `Unknown action: ${action}` };
};

/** Declarative hints for gus-apps / Spaces hosts that read module metadata when wiring ctx.sf. */
module.exports.handlerExecutionContext = 'USER';
module.exports.executionContext = 'USER';
