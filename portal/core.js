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
export const projectStatuses = { not_started: 'Not started', in_progress: 'In progress', client_review: 'Client review', completed: 'Completed' };
export function projectOverdue(project, today = lagosToday()) { return !!project.deadline && project.status !== 'completed' && project.deadline < today; }
export function projectBalance(total, received) { return (Math.round(Number(total)*100)-Math.round(Number(received)*100))/100; }
export function commissionEligible(fixed, total, received, approved = true) {
  const fee = Math.round(Number(fixed)*100), cost = Math.round(Number(total)*100), paid = Math.round(Number(received)*100);
  if (!approved || !Number.isFinite(fee) || !Number.isFinite(cost) || !Number.isFinite(paid) || fee<=0 || cost<=0) return 0;
  return (paid>=cost ? fee : paid>=Math.round(cost*0.6) ? Math.round(fee*0.5) : 0)/100;
}
export function receiptAvailable(project, documents) {
  const issued = documents.filter(doc => doc.project_id === project.id && doc.kind === 'receipt').reduce((total,doc)=>total+Math.round(Number(doc.amount)*100),0);
  return Math.max(0,(Math.round(Number(project.amount_received)*100)-issued)/100);
}
export function validateReceipt(data, available, today = lagosToday()) {
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount<=0 || amount>available || Math.abs(amount*100-Math.round(amount*100))>0.00001) throw new Error('Enter a payment amount within the confirmed amount available for receipt.');
  if (!data.paid_on || !/^\d{4}-\d{2}-\d{2}$/.test(data.paid_on) || !Number.isFinite(Date.parse(data.paid_on)) || new Date(data.paid_on).toISOString().slice(0,10)!==data.paid_on || data.paid_on>today) throw new Error('Enter a valid payment date that is not in the future.');
  if (!data.payment_reference?.trim() || data.payment_reference.length>200) throw new Error('Enter the payment reference of up to 200 characters.');
  if (!['Bank transfer','Cash','POS'].includes(data.payment_method)) throw new Error('Choose a payment method.');
  return data;
}
export function validateProject(data) {
  for (const field of ['client_name','service_name']) if (!data[field]?.trim() || data[field].length > 200) throw new Error('Enter a client and service name of up to 200 characters.');
  if (!Object.hasOwn(projectStatuses,data.status)) throw new Error('Choose a project status.');
  for (const [field,limit] of [['assigned_to',200],['payment_notes',2000],['notes',5000]]) if ((data[field] || '').length>limit) throw new Error('Keep '+field.replaceAll('_',' ')+' within '+limit+' characters.');
  for (const field of ['total_cost','amount_received']) {
    if (data[field] == null || data[field] === '' || !Number.isFinite(Number(data[field])) || Number(data[field])<0 || Number(data[field])>999999999 || Math.abs(Number(data[field])*100-Math.round(Number(data[field])*100))>0.00001) throw new Error('Enter valid amounts in NGN with up to two decimal places.');
  }
  if (projectBalance(data.total_cost,data.amount_received)<0) throw new Error('Confirmed payments cannot exceed the project cost.');
  if (data.deadline && (!/^\d{4}-\d{2}-\d{2}$/.test(data.deadline) || !Number.isFinite(Date.parse(data.deadline)) || new Date(data.deadline).toISOString().slice(0,10)!==data.deadline)) throw new Error('Choose a valid deadline.');
  return data;
}
export function ambassadorPerformance(members, leads, proposals, today = lagosToday()) {
  return members.filter(member => member.role === 'ambassador').map(member => {
    const owned = leads.filter(lead => lead.owner_id === member.id);
    const letters = proposals.filter(proposal => proposal.owner_id === member.id);
    const won = owned.filter(lead => lead.stage === 'won').length;
    return { id: member.id, name: member.full_name || member.email || 'Ambassador', email: member.email || '', active: member.active,
      leads: owned.length, proposals: letters.length, due: owned.filter(lead => leadDue(lead,today)).length, won,
      conversion: owned.length ? won / owned.length * 100 : null };
  });
}
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
