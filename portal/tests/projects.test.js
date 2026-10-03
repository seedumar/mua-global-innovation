import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProject, projectBalance, projectOverdue } from '../core.js';
const valid={client_name:'Dutse Model School',service_name:'Result system',status:'in_progress',total_cost:'150000',amount_received:'90000',deadline:'2026-10-10'};
test('confirmed payments and balances use kobo precision and cannot exceed the cost',()=>{
 assert.equal(validateProject(valid),valid);assert.equal(projectBalance(valid.total_cost,valid.amount_received),60000);
 assert.equal(projectBalance('100.01','60.01'),40);
 for(const patch of [{amount_received:'150000.01'},{amount_received:'-1'},{total_cost:''},{amount_received:'not a number'},{total_cost:'1.234'}])assert.throws(()=>validateProject({...valid,...patch}));
 assert.equal(validateProject({...valid,status:'completed',amount_received:'0'}).amount_received,'0');
});
test('delivery rejects missing names, invalid stages and impossible deadlines',()=>{
 for(const patch of [{client_name:' '},{service_name:''},{status:'won'},{deadline:'2026-02-30'},{notes:'x'.repeat(5001)}])assert.throws(()=>validateProject({...valid,...patch}));
});
test('only unfinished projects with a past deadline are overdue',()=>{
 assert(projectOverdue({status:'client_review',deadline:'2026-10-02'},'2026-10-03'));
 assert(!projectOverdue({status:'in_progress',deadline:'2026-10-03'},'2026-10-03'));
 assert(!projectOverdue({status:'completed',deadline:'2026-10-02'},'2026-10-03'));
 assert(!projectOverdue({status:'not_started',deadline:null},'2026-10-03'));
});
