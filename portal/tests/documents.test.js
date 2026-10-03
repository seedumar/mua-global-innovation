import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptAvailable, validateReceipt } from '../core.js';
test('receipts reconcile individual payments against the confirmed cumulative total',()=>{
 const project={id:'p',amount_received:'90000.01'};
 const docs=[{project_id:'p',kind:'invoice',amount:150000},{project_id:'p',kind:'receipt',amount:'30000.01'},{project_id:'other',kind:'receipt',amount:5000}];
 assert.equal(receiptAvailable(project,docs),60000);
 const data={amount:'60000',paid_on:'2026-10-03',payment_reference:'BANK-123',payment_method:'Bank transfer'};
 assert.equal(validateReceipt(data,60000,'2026-10-03'),data);
 for(const patch of [{amount:'60000.01'},{amount:'0'},{amount:'1.234'},{paid_on:'2026-10-04'},{paid_on:'2026-02-30'},{payment_reference:' '},{payment_method:'Unknown'}]) assert.throws(()=>validateReceipt({...data,...patch},60000,'2026-10-03'));
 assert.equal(receiptAvailable({...project,amount_received:'30000.01'},docs),0);
});
