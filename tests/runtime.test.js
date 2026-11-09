const {test}=require('node:test');const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),zlib=require('node:zlib');
test('saved journal decodes in a GUS Apps sandbox without structuredClone',()=>{
  const sandbox={module:{exports:{}},require:require('node:module').createRequire(require.resolve('../backend/store')),Buffer};
  vm.runInNewContext(fs.readFileSync(require.resolve('../backend/store'),'utf8'),sandbox);
  const revision='11111111-1111-4111-8111-111111111111',Title='CFSMonthlyReview_v1_release_one';
  const payload={revision,updatedAt:'2026-11-02',_changes:[{path:['name'],after:'Release 266',remove:false}]};
  const encoded=zlib.gzipSync(Buffer.from(JSON.stringify(payload))).toString('base64');
  const rows=[{Title,Description:`cfsc1:${revision}`},{Title,Description:`cfs1:${revision}:0:1:${encoded}`}];
  const store=new sandbox.module.exports.ContentStore({});
  assert.equal(store.decode(rows).get(Title).name,'Release 266');
});
test('epic and saved-list links parse without a host-provided URL global',async()=>{
  const sandbox={module:{exports:{}},require:require('node:module').createRequire(require.resolve('../backend/gus')),Buffer};
  vm.runInNewContext(fs.readFileSync(require.resolve('../backend/gus'),'utf8'),sandbox);
  const mod=sandbox.module.exports;
  assert.equal(mod.parseEpicLinks('https://gus.lightning.force.com/lightning/r/ADM_Epic__c/a0B000000000001/view')[0],'a0B000000000001');
  const gus=new mod.Gus({query:async()=>({records:[{Id:'a0B000000000001'}],done:true}),request:async()=>({query:'SELECT Name FROM ADM_Epic__c'})});
  assert.equal((await gus.resolveEpicInputs('https://gus.lightning.force.com/lightning/o/ADM_Epic__c/list?filterName=00B000000000001')).ids.length,1);
});
