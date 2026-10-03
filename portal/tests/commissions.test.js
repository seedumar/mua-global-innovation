import test from 'node:test';
import assert from 'node:assert/strict';
import { commissionEligible } from '../core.js';
test('fixed commissions become payable half after the required deposit and fully after payment',()=>{
 assert.equal(commissionEligible(10000,150000,0),0);
 assert.equal(commissionEligible(10000,150000,89999.99),0);
 assert.equal(commissionEligible(10000,150000,90000),5000);
 assert.equal(commissionEligible(10000,150000,149999.99),5000);
 assert.equal(commissionEligible(10000,150000,150000),10000);
 assert.equal(commissionEligible(10000,150000,150000,false),0);
 assert.equal(commissionEligible(10000,0,0),0);
});
test('commission halves and deposit thresholds round consistently to kobo',()=>{
 assert.equal(commissionEligible(1.01,10.01,6),0);
 assert.equal(commissionEligible(1.01,10.01,6.01),0.51);
 assert.equal(commissionEligible(1.01,10.01,10.01),1.01);
 assert.equal(commissionEligible('invalid',10,10),0);
});
