'use strict';
const MONTH=/^20\d{2}-(0[1-9]|1[0-2])$/,FIELD=/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/,KEY=/^(?:[A-Za-z][A-Za-z0-9_]*|gus:[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)$/;
function object(v){return v&&typeof v==='object'&&!Array.isArray(v);}
function check(ok){if(!ok)throw Error('Saved dashboard data has an invalid schema. No changes were made.');}
function validateDoc(d){
 check(object(d));if(d.id!==undefined)check(typeof d.id==='string'&&/^[A-Za-z0-9-]{1,60}$/.test(d.id));
 if(d.year!==undefined)check(Number.isInteger(d.year)&&d.year>=2000&&d.year<=2099);
 for(const k of ['name','project','owner','health','team','lead','comments','pathToGreen'])if(d[k]!==undefined&&d[k]!==null)check(typeof d[k]==='string');
 for(const k of ['completion','planned','actual','closed','inProgress','newPoints','waiting'])if(d[k]!==undefined&&d[k]!==null)check(typeof d[k]==='number'&&Number.isFinite(d[k])||typeof d[k]==='string'&&/^-?\d+(?:\.\d+)?$/.test(d[k]));
 if(d.months!==undefined)check(Array.isArray(d.months)&&d.months.length<=120&&d.months.every(m=>typeof m==='string'&&MONTH.test(m)));
 if(d.visibleMonths!==undefined)check(Array.isArray(d.visibleMonths)&&d.visibleMonths.length<=120&&d.visibleMonths.every(m=>typeof m==='string'&&MONTH.test(m)));
 if(d.hiddenMonths!==undefined)check(Array.isArray(d.hiddenMonths)&&d.hiddenMonths.length<=120&&d.hiddenMonths.every(m=>typeof m==='string'&&MONTH.test(m)));
 if(d.lastGusRefreshAt!==undefined)check(typeof d.lastGusRefreshAt==='string'&&/^20\d{2}-\d{2}-\d{2}T/.test(d.lastGusRefreshAt)&&Number.isFinite(Date.parse(d.lastGusRefreshAt)));
 if(d.columnMode!==undefined)check(['gus','custom'].includes(d.columnMode));
 if(d.columns!==undefined&&d.columns!==null)check(Array.isArray(d.columns)&&d.columns.length<=200&&d.columns.every(k=>typeof k==='string'&&KEY.test(k)));
 if(d.epicIds!==undefined)check(Array.isArray(d.epicIds)&&d.epicIds.length<=500&&d.epicIds.every(id=>typeof id==='string'&&/^[A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?$/.test(id)));
 if(d._deletedAliases!==undefined)check(Array.isArray(d._deletedAliases)&&d._deletedAliases.length<=2000&&d._deletedAliases.every(id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id)));
 if(d.yearMapping!==undefined){check(object(d.yearMapping));for(const [a,b] of Object.entries(d.yearMapping))check(MONTH.test(a)&&typeof b==='string'&&MONTH.test(b));}
 if(d.drafts!==undefined){check(object(d.drafts)&&Object.keys(d.drafts).length<=120);for(const [m,v] of Object.entries(d.drafts)){check(MONTH.test(m)&&object(v));check(typeof v.value==='string'&&v.value.length<=50000);if(v.base!==undefined)check(typeof v.base==='string'&&v.base.length<=50000);if(v.revision!==undefined)check(typeof v.revision==='string'&&/^[A-Za-z0-9-]{1,100}$/.test(v.revision));}}
 if(d.sourceColumns!==undefined){check(Array.isArray(d.sourceColumns)&&d.sourceColumns.length<=100);for(const c of d.sourceColumns)check(object(c)&&typeof c.key==='string'&&KEY.test(c.key)&&typeof c.field==='string'&&FIELD.test(c.field)&&typeof c.label==='string'&&c.label.length<=300);}
 return d;
}
module.exports={validateDoc};
