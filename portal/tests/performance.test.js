import test from 'node:test';
import assert from 'node:assert/strict';
import { ambassadorPerformance } from '../core.js';
test('performance separates owners, keeps inactive and zero-activity ambassadors, and excludes admins', () => {
 const members=[{id:'a',role:'ambassador',full_name:'A',active:true},{id:'b',role:'ambassador',email:'b@example.com',active:false},{id:'admin',role:'admin',active:true}];
 const leads=[{owner_id:'a',stage:'won',follow_up_date:'2026-10-01'},{owner_id:'a',stage:'contacted',follow_up_date:'2026-10-03'},{owner_id:'a',stage:'lost',follow_up_date:'2026-10-01'},{owner_id:'admin',stage:'won'}];
 const rows=ambassadorPerformance(members,leads,[{owner_id:'a'},{owner_id:'a'},{owner_id:'admin'}],'2026-10-03');
 assert.equal(rows.length,2);
 assert.equal(rows[0].leads,3);assert.equal(rows[0].proposals,2);assert.equal(rows[0].due,1);assert.equal(rows[0].won,1);assert(Math.abs(rows[0].conversion-100/3)<1e-10);
 assert.equal(rows[1].name,'b@example.com');assert.equal(rows[1].active,false);assert.equal(rows[1].leads,0);assert.equal(rows[1].conversion,null);
});
