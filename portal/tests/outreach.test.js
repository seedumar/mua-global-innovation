import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLead, leadDue, lagosToday } from '../core.js';
test('outreach validates names, stages, notes and calendar dates', () => {
 const lead = { company_name:'Dutse Model School',stage:'new',follow_up_date:'2026-10-03' };
 assert.equal(validateLead(lead),lead);
 assert.throws(()=>validateLead({...lead,company_name:' '}),/company/);
 assert.throws(()=>validateLead({...lead,stage:'approved'}),/stage/);
 assert.throws(()=>validateLead({...lead,notes:'a'.repeat(5001)}),/5[ ,]?000/);
 assert.throws(()=>validateLead({...lead,follow_up_date:'2026-02-30'}),/date/);
 assert.throws(()=>validateLead({...lead,follow_up_date:'03/10/2026'}),/date/);
 assert.equal(validateLead({...lead,follow_up_date:''}).follow_up_date,'');
});
test('follow-up reminders exclude closed leads and respect Nigerian midnight', () => {
 const today = lagosToday(new Date('2026-10-02T23:30:00Z'));
 assert.equal(today,'2026-10-03');
 assert(leadDue({stage:'contacted',follow_up_date:'2026-10-02'},today));
 assert(leadDue({stage:'interested',follow_up_date:'2026-10-03'},today));
 assert(!leadDue({stage:'new',follow_up_date:'2026-10-04'},today));
 for (const stage of ['won','lost']) assert(!leadDue({stage,follow_up_date:'2026-10-01'},today));
 assert(!leadDue({stage:'new',follow_up_date:null},today));
});
