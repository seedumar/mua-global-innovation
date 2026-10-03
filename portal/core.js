export const statuses = { draft: 'Draft', submitted: 'Awaiting review', changes_requested: 'Changes requested', approved: 'Approved' };
export const leadStages = { new: 'New lead', contacted: 'Contacted', proposal_sent: 'Proposal sent', interested: 'Interested', won: 'Won', lost: 'Lost' };
export function validateLead(data) {
  if (!data.company_name?.trim() || data.company_name.length > 200) throw new Error('Enter a company name of up to 200 characters.');
  if (!Object.hasOwn(leadStages, data.stage)) throw new Error('Choose a lead stage.');
  for (const [field, limit] of [['contact_name',200],['contact_details',500],['client_address',1000],['notes',5000]]) {
    if ((data[field] || '').length > limit) throw new Error('Keep ' + field.replaceAll('_',' ') + ' within ' + limit + ' characters.');
  }
  if (data.follow_up_date && (!/^\d{4}-\d{2}-\d{2}$/.test(data.follow_up_date) || !Number.isFinite(Date.parse(data.follow_up_date)) || new Date(data.follow_up_date).toISOString().slice(0,10) !== data.follow_up_date)) throw new Error('Choose a valid follow-up date.');
  return data;
}
export function lagosToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(now);
  const value = type => parts.find(p => p.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function leadDue(lead, today = lagosToday()) { return !!lead.follow_up_date && !['won','lost'].includes(lead.stage) && lead.follow_up_date <= today; }
export function validateBrief(data) {
  if (!data.service_id) throw new Error('Choose a service.');
  if (!data.client_name?.trim() || data.client_name.length > 200) throw new Error('Enter a recipient name of up to 200 characters.');
  if (!data.client_address?.trim() || data.client_address.length > 1000) throw new Error('Enter an address of up to 1,000 characters.');
  if ((data.notes || '').length > 5000) throw new Error('Keep project details within 5,000 characters.');
  return data;
}
export function canEdit(proposal) { return ['draft', 'changes_requested'].includes(proposal.status); }
export function canPrint(proposal) { return proposal.status === 'approved'; }
export function money(amount) { return amount == null ? 'To be agreed' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount); }
export function paymentBreakdown(amount) {
  if (amount == null || amount === '') return null;
  const total = Number(amount);
  if (!Number.isFinite(total) || total < 0) return null;
  const totalKobo = Math.round(total * 100);
  const depositKobo = Math.round(totalKobo * 0.6);
  return { total: totalKobo / 100, deposit: depositKobo / 100, balance: (totalKobo - depositKobo) / 100 };
}
export function date(value) { return new Intl.DateTimeFormat('en-NG', { dateStyle: 'long' }).format(new Date(value)); }
export function reference(value) { return value || 'Assigned when saved'; }
