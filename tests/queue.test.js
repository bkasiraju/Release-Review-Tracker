const {test}=require('node:test'),assert=require('node:assert/strict');const {EpicQueue}=require('../public/queue');
test('background queue bounds parallelism, serializes an epic, and continues after failure',async()=>{
 const queue=new EpicQueue(4);let active=0,peak=0;const keys=new Set(),order=[];
 const run=(key,fail=false)=>queue.add(key,async()=>{assert.ok(!keys.has(key));keys.add(key);peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,8));keys.delete(key);active--;order.push(key);if(fail)throw Error('network');return key;});
 const result=await Promise.allSettled([run('a',true),run('a'),run('b'),run('c'),run('d'),run('e')]);
 assert.equal(peak,4);assert.equal(result[0].status,'rejected');assert.equal(result[1].status,'fulfilled');assert.equal(order.length,6);
});
