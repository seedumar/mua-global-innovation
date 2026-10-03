import test from 'node:test';
import assert from 'node:assert/strict';
import { projectWorkFee, validateProject, commissionEligible } from '../core.js';
const project={client_name:'Client',service_name:'Website',status:'not_started',total_cost:'150000',amount_received:'90000'};
test('work fee deducts infrastructure costs with kobo precision',()=>{
 assert.equal(projectWorkFee(150000,10000,20000),120000);
 assert.equal(projectWorkFee('100.01','30.01','20'),50);
 assert.equal(projectWorkFee(100,0,0),100);
 assert.equal(projectWorkFee(100,60,40),0);
 for(const fees of [[null,null],['',''],[0,null],[60,41],[-1,0],['invalid',0],[1.234,0]]) assert.equal(projectWorkFee(100,...fees),null);
});
test('fees may be unknown, but supplied fees must be complete and reconcile',()=>{
 for(const fees of [{},{domain_fee:'',hosting_fee:''},{domain_fee:null,hosting_fee:null},{domain_fee:'10000',hosting_fee:'20000'},{domain_fee:'0',hosting_fee:'0'}]) assert.doesNotThrow(()=>validateProject({...project,...fees}));
 for(const fees of [{domain_fee:'10'},{domain_fee:'',hosting_fee:'0'},{domain_fee:'-1',hosting_fee:'0'},{domain_fee:'100000',hosting_fee:'50000.01'},{domain_fee:'1.234',hosting_fee:'0'}]) assert.throws(()=>validateProject({...project,...fees}));
 assert.equal(commissionEligible(10000,project.total_cost,project.amount_received),5000);
});
