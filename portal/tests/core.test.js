import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBrief, canEdit, canPrint, money } from '../core.js';
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
