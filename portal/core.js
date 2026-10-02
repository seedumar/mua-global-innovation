export const statuses = { draft: 'Draft', submitted: 'Awaiting review', changes_requested: 'Changes requested', approved: 'Approved' };
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
export function date(value) { return new Intl.DateTimeFormat('en-NG', { dateStyle: 'long' }).format(new Date(value)); }
export function reference(value) { return value || 'Assigned when saved'; }
