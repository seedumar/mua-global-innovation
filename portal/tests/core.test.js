import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBrief, canEdit, canPrint, money, paymentBreakdown } from '../core.js';
test('recipient details are required and bounded', () => {
 assert.throws(() => validateBrief({}), /service/);
 assert.throws(() => validateBrief({service_id:'s',client_name:' ',client_address:'A'}), /recipient/);
 assert.throws(() => validateBrief({service_id:'s',client_name:'Company',client_address:''}), /address/);
 assert.throws(() => validateBrief({service_id:'s',client_name:'Company',client_address:'Address',notes:'a'.repeat(5001)}), /5,000/);
 assert.equal(validateBrief({service_id:'s',client_name:'Company',client_address:'Address'}).client_name, 'Company');
});
test('submitted and approved records cannot be edited, only approved records print', () => {
 for (const status of ['draft','changes_requested']) { assert(canEdit({status})); assert(!canPrint({status})); }
 for (const status of ['submitted','approved']) assert(!canEdit({status}));
 assert(!canPrint({status:'submitted'})); assert(canPrint({status:'approved'}));
});
test('unquoted amounts do not become zero-price claims', () => {
 assert.equal(money(null), 'To be agreed'); assert.match(money(150000), /150,000/);
});
test('60 percent deposit and balance preserve the quoted total to the kobo', () => {
 assert.deepEqual(paymentBreakdown(150000), { total: 150000, deposit: 90000, balance: 60000 });
 assert.deepEqual(paymentBreakdown('100.01'), { total: 100.01, deposit: 60.01, balance: 40 });
 assert.deepEqual(paymentBreakdown(0), { total: 0, deposit: 0, balance: 0 });
 for (const amount of [null, undefined, '', -1, Infinity, 'invalid']) assert.equal(paymentBreakdown(amount), null);
});
