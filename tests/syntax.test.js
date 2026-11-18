const test=require('node:test'),assert=require('node:assert'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const dir=path.join(__dirname,'..','public');
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.js')))
  test('public/'+f+' parses',()=>{const r=spawnSync(process.execPath,['--check',path.join(dir,f)],{encoding:'utf8'});assert.strictEqual(r.status,0,r.stderr);});
