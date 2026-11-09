const {test}=require('node:test'),assert=require('node:assert/strict');
const server=require('../backend/executive').validateClaims,client=require('../public/ai').validateClaims;
const evidence=()=>({month:'2026-11',updates:[{month:'2026-09',text:'Broker avoidance design completed.'},{month:'2026-11',text:'Phase one latency review is in progress. Rollout remains pending.'}],work:[{subject:'Stop routing to slow brokers',statusAtReview:'Closed'},{subject:'Phase one latency signal',statusAtReview:'Ready for Review'}]});
function verify(text,expected,g=evidence(),section='current'){assert.equal(server(text,g,section).valid,expected,text);assert.deepEqual(client(text,g,section),server(text,g,section));}
test('closed tasks never prove release, deployment, production or risk elimination',()=>{
 for(const text of ['Slow broker routing shipped.','Slow broker routing was deployed.','Slow broker routing is in production.','Slow broker routing eliminated the connection pool risk.','Slow broker routing achieved its availability goal.'])verify(text,false);
 verify('Slow broker routing completed.',true);verify('Phase one latency signal is ready for review.',true);verify('Phase one latency signal completed.',false);
});
test('no-fix/cancelled closures, missing historical status and goals do not prove delivered outcomes',()=>{
 for(const status of ['Closed - No Fix - Won\'t Do','Cancelled','Closed - Duplicate',null])verify('Slow broker routing completed.',false,{...evidence(),work:[{subject:'Stop routing to slow brokers',statusAtReview:status}]});
 const g={...evidence(),goals:'Slow broker routing shipped and all risks resolved.',work:[]};verify('Slow broker routing shipped.',false,g);verify('All risks resolved.',false,g);verify('Slow broker routing is not released.',false);
});
test('current claims cannot borrow old accomplishments; explicit prior-month context stays valid',()=>{
 verify('Broker avoidance design completed.',false);verify('In September, broker avoidance design completed.',true);verify('Broker avoidance design completed.',true,evidence(),'previous');verify('In December, slow broker routing completed.',false);
});
test('release, deployment and production remain distinct verified facts',()=>{
 const g={month:'2026-11',updates:[],work:[{subject:'Canary rollout',statusAtReview:'Released'}]};verify('Canary rollout released.',true,g);verify('Canary rollout deployed.',false,g);verify('Canary rollout is in production.',false,g);
 g.work[0].statusAtReview='Deployed';verify('Canary rollout deployed.',true,g);verify('Canary rollout is in production.',false,g);g.work[0].statusAtReview='In Production';verify('Canary rollout is in production.',true,g);
});
test('engineer-reported outcomes are supported, plans and review readiness are not treated as completion',()=>{
 const g={month:'2026-11',updates:[{month:'2026-11',text:'Canary rollout shipped. Pool exhaustion risk resolved. Plan to complete broker routing next.'}],work:[]};verify('Canary rollout released.',true,g);verify('Pool exhaustion risk resolved.',true,g);verify('Broker routing completed.',false,g);verify('Complete broker routing next.',true,g);verify('All delivery completed.',false,g);
});

test('one completed/released subject never supplies evidence for a coordinated different outcome',()=>{
 for(const [status,word] of [['Closed','completed'],['Released','released']]){const g={month:'2026-11',updates:[],work:[{subject:'Canary rollout',statusAtReview:status}]};for(const connector of ['and','as well as','along with'])verify('Canary rollout '+word+' '+connector+' regional failover '+word+'.',false,g);}
 const g={month:'2026-11',updates:[{month:'2026-11',text:'Canary rollout completed and regional failover remains pending.'}],work:[]};verify('Regional failover completed.',false,g);
});
test('shared product words cannot validate a new feature and completed design cannot imply completed implementation',()=>{
 const g={month:'2026-11',updates:[],work:[{subject:'Regional canary rollout',statusAtReview:'Closed'}]};verify('Regional canary failover completed.',false,g);g.work[0]={subject:'Broker avoidance design',statusAtReview:'Closed'};verify('Broker avoidance completed.',false,g);verify('Broker avoidance design completed.',true,g);
});

test('validation phase cannot be dropped from a completed task',()=>{for(const subject of ['Broker routing validation','Validate broker routing','Broker routing validated']){const g={month:'2026-11',updates:[],work:[{subject,statusAtReview:'Closed'}]};verify('Broker routing completed.',false,g);}});
test('a future recovery infinitive is not a claim that the action is complete',()=>{verify('The documented recovery action is to complete dependency validation.',true);verify('Dependency validation completed.',false);});

test('fresh epic health supports its exact blocked state but never an invented cause or historical state',()=>{const g={month:'2026-11',health:'Blocked',updates:[],work:[]};verify('The epic remains blocked.',true,g);verify('Health is blocked due to an invented database regression.',false,g);verify('The epic remains blocked.',false,{...g,health:null});verify('The epic remains blocked.',false,g,'previous');});
test('progress toward readiness is not a claim that review or release has happened',()=>{const g={month:'2026-11',updates:[],work:[{subject:'Regional validation',statusAtReview:'In Progress'}]};verify('Regional validation is progressing toward review readiness.',true,g);verify('Regional validation has reached review readiness.',false,g);verify('Regional validation was released.',false,g);});
