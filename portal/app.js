import { PortalAPI } from './api.js?v=20261003-documents';
import { statuses, validateBrief, canEdit, canPrint, money, paymentBreakdown, date, reference, leadStages, validateLead, lagosToday, leadDue, ambassadorPerformance, projectStatuses, projectOverdue, projectBalance, validateProject, receiptAvailable, validateReceipt } from './core.js?v=20261003-documents';
const api = new PortalAPI(window.MUA_PORTAL_CONFIG || {});
const $ = selector => document.querySelector(selector);
let profile, proposals = [], services = [], members = [], current, noticeTimer, leads = [], leadError = '', projects = [], projectError = '', billingProject, billingDocuments = [];
const adminArea = document.body.dataset.area === 'admin';
function element(tag, text, cls) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; }
function notify(message) { clearTimeout(noticeTimer); $('#notice').textContent = message; $('#notice').hidden = false; noticeTimer = setTimeout(() => { $('#notice').hidden = true; }, 6500); }
async function action(work, form, button) {
  const controls = [...(form ? form.querySelectorAll('button') : button ? [button] : [])];
  const message = form?.querySelector('.form-message');
  if (message) message.textContent = '';
  controls.forEach(control => { control.disabled = true; });
  try { await work(); } catch (error) {
    if (message) message.textContent = error.message; else notify(error.message);
    if (!api.session) { setMobileMenu(false); profile = null; $('#workspace').hidden = true; $('#auth-screen').hidden = false; }
  } finally { controls.forEach(control => { control.disabled = false; }); }
}
function button(text, callback, cls = 'outline') { const node = element('button', text, cls); node.type = 'button'; node.addEventListener('click', () => action(() => callback(node), null, node)); return node; }
function badge(status) { return element('span', statuses[status] || status, 'badge ' + status); }
function labelRow(row, labels) {
  row.setAttribute('role', 'row');
  [...row.children].forEach((cell, index) => { cell.setAttribute('role', 'cell'); cell.setAttribute('data-label', labels[index] || ''); });
}
function setMobileMenu(open, restoreFocus = false) {
  const drawer = $('#mobile-nav-dialog');
  if (open && !drawer.open) drawer.showModal();
  if (!open && drawer.open) drawer.close();
  document.body.classList.toggle('menu-open', open);
  $('#mobile-menu-toggle').setAttribute('aria-expanded', String(open));
  $('#mobile-menu-toggle').textContent = open ? 'Close menu' : 'Menu';
  if (restoreFocus) $('#mobile-menu-toggle').focus();
}
function showView(name) {
  if (!adminArea && !['proposals','leads'].includes(name)) return;
  setMobileMenu(false);
  ['proposals', 'leads', 'members', 'services', 'performance', 'projects'].forEach(view => { const section = $('#' + view + '-view'); if (section) section.hidden = view !== name; });
  document.querySelectorAll('[data-view]').forEach(node => { node.classList.toggle('active', node.dataset.view === name); if (node.dataset.view === name) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current'); });
  $('#dashboard-title').textContent = name === 'projects' ? 'Project delivery.' : name === 'performance' ? 'Ambassador performance.' : name === 'leads' ? (adminArea ? 'All client outreach.' : 'Your client outreach.') : name === 'members' ? 'Your ambassador network.' : name === 'services' ? 'A consistent proposal standard.' : adminArea ? 'All proposals.' : 'Your proposals.';
}
function renderProposals() {
  const stats = $('#stats'); stats.replaceChildren();
  [['Total proposals', proposals.length], ['Awaiting review', proposals.filter(p => p.status === 'submitted').length], ['Approved', proposals.filter(p => p.status === 'approved').length], ['Drafts & revisions', proposals.filter(canEdit).length]].forEach(([label, value]) => {
    const card = element('div', undefined, 'stat'); card.append(element('strong', String(value)), element('span', label)); stats.append(card);
  });
  const search = $('#search').value.toLowerCase().trim(), status = $('#status-filter').value;
  const rows = proposals.filter(p => (!status || p.status === status) && (!search || (p.client_name + ' ' + p.reference).toLowerCase().includes(search)));
  const list = $('#proposal-list'); list.replaceChildren(); $('#empty-proposals').hidden = rows.length > 0;
  for (const p of rows) {
    const row = element('tr'), recipient = element('td'); recipient.append(element('strong', p.client_name));
    if (adminArea) recipient.append(element('small', members.find(m => m.id === p.owner_id)?.full_name || 'Ambassador'));
    row.append(recipient, element('td', p.service_name), element('td', p.reference));
    const state = element('td'); state.append(badge(p.status)); row.append(state, element('td', date(p.updated_at)));
    const actions = element('td'); actions.append(button('View', () => openDetail(p.id))); row.append(actions); labelRow(row, ['Recipient','Service','Reference','Status','Updated','Action']); list.append(row);
  }
}
function renderLeads() {
  const today = lagosToday(), stats = $('#lead-stats'); stats.replaceChildren();
  const active = leads.filter(lead => !['won','lost'].includes(lead.stage));
  for (const [label, count] of [['Total leads',leads.length],['Active conversations',active.length],['Follow-ups due',leads.filter(lead => leadDue(lead,today)).length],['Projects won',leads.filter(lead => lead.stage === 'won').length]]) {
    const card = element('div', undefined, 'stat'); card.append(element('strong', String(count)), element('span', label)); stats.append(card);
  }
  $('#lead-error').hidden = !leadError; $('#lead-error').textContent = leadError; $('#new-lead').disabled = !!leadError;
  const search = $('#lead-search').value.trim().toLowerCase(), stage = $('#lead-stage-filter').value, dueOnly = $('#lead-due-filter').checked, owner = adminArea ? $('#lead-owner-filter').value : '';
  const rows = leads.filter(lead => (!owner || lead.owner_id === owner) && (!stage || lead.stage === stage) && (!dueOnly || leadDue(lead,today)) && (!search || [lead.company_name,lead.contact_name,lead.contact_details,adminArea ? members.find(m => m.id === lead.owner_id)?.full_name : ''].join(' ').toLowerCase().includes(search)))
    .sort((a,b) => Number(leadDue(b,today))-Number(leadDue(a,today)) || (a.follow_up_date || '9999').localeCompare(b.follow_up_date || '9999') || b.updated_at.localeCompare(a.updated_at));
  const list = $('#lead-list'); list.replaceChildren(); $('#empty-leads').hidden = rows.length > 0 || !!leadError;
  for (const lead of rows) {
    const row = element('tr'), client = element('td'); client.append(element('strong',lead.company_name));
    if (lead.contact_name) client.append(element('small',lead.contact_name));
    if (lead.contact_details) client.append(element('p',lead.contact_details,'lead-contact'));
    if (adminArea) client.append(element('small','Owner: ' + (members.find(m => m.id === lead.owner_id)?.full_name || 'Ambassador')));
    const state = element('td'); state.append(element('span',leadStages[lead.stage] || lead.stage,'badge '+lead.stage));
    const follow = element('td',lead.follow_up_date ? date(lead.follow_up_date+'T12:00:00+01:00') : 'Not scheduled');
    if (leadDue(lead,today)) follow.append(element('span',lead.follow_up_date === today ? 'Due today' : 'Overdue','badge follow-up-due'));
    const actions = element('td'); actions.append(button('View / Update',()=>openLeadEditor(lead))); row.append(client,state,follow,actions); labelRow(row, ['Company & contact','Progress','Next follow-up','Action']); list.append(row);
  }
}
function openLeadEditor(lead, proposal) {
  if (leadError) { notify(leadError); return; }
  const form = $('#lead-form'); form.reset(); form.querySelector('.form-message').textContent = '';
  $('#lead-editor-title').textContent = lead ? 'Update client outreach.' : 'Add a lead.';
  if (lead) for (const field of ['id','company_name','contact_name','contact_details','client_address','stage','follow_up_date','notes']) form.elements[field].value = lead[field] || '';
  if (proposal) { form.elements.company_name.value = proposal.client_name; form.elements.contact_name.value = proposal.client_contact; form.elements.client_address.value = proposal.client_address; form.elements.notes.value = 'Proposal reference: ' + proposal.reference + '\nService: ' + proposal.service_name; }
  const owner = lead ? (members.find(m => m.id === lead.owner_id)?.full_name || (lead.owner_id === profile.id ? profile.full_name : 'Ambassador')) : profile.full_name;
  $('#lead-owner').textContent = 'Lead owner: ' + (owner || profile.email) + '. Update the stage after each conversation.';
  $('#lead-dialog').showModal();
}
function renderPerformance() {
  if (!adminArea) return;
  const search = $('#performance-search').value.trim().toLowerCase(), access = $('#performance-access').value, sort = $('#performance-sort').value;
  const rows = ambassadorPerformance(members,leads,proposals).filter(row => (!search || (row.name+' '+row.email).toLowerCase().includes(search)) && (!access || row.active === (access === 'active')))
    .sort((a,b) => sort === 'name' ? a.name.localeCompare(b.name) : (b[sort] ?? -1)-(a[sort] ?? -1) || a.name.localeCompare(b.name));
  $('#performance-error').hidden = !leadError;
  const stats = $('#performance-stats'); stats.replaceChildren();
  const sum = key => rows.reduce((total,row) => total+row[key],0);
  for (const [label,value] of [['Ambassadors shown',rows.length],['Total leads',leadError ? '—' : sum('leads')],['Follow-ups due',leadError ? '—' : sum('due')],['Projects won',leadError ? '—' : sum('won')]]) {
    const card = element('div',undefined,'stat'); card.append(element('strong',String(value)),element('span',label)); stats.append(card);
  }
  const list = $('#performance-list'); list.replaceChildren(); $('#empty-performance').hidden = rows.length > 0;
  for (const report of rows) {
    const row = element('tr'), identity = element('td'); identity.append(element('strong',report.name),element('small',report.email));
    row.append(identity,element('td',report.active ? 'Active' : 'Inactive'),element('td',leadError ? '—' : String(report.leads)),element('td',String(report.proposals)),element('td',leadError ? '—' : String(report.due)),element('td',leadError ? '—' : String(report.won)),element('td',leadError || report.conversion == null ? '—' : report.conversion.toFixed(1)+'%'));
    const actions = element('td'), view = button('View leads', () => {
      $('#lead-search').value = ''; $('#lead-stage-filter').value = ''; $('#lead-due-filter').checked = false; $('#lead-owner-filter').value = report.id;
      renderLeads(); showView('leads');
    }); view.disabled = !!leadError; actions.append(view); row.append(actions); labelRow(row, ['Ambassador','Access','Leads','Proposals','Follow-ups due','Projects won','Conversion','Action']); list.append(row);
  }
}
function renderProjects() {
  if (!adminArea) return;
  const search = $('#project-search').value.trim().toLowerCase(), status = $('#project-status-filter').value, overdue = $('#project-overdue-filter').checked;
  const rows = projects.filter(project => (!status || project.status === status) && (!overdue || projectOverdue(project)) && (!search || [project.client_name,project.service_name,project.assigned_to].join(' ').toLowerCase().includes(search)))
    .sort((a,b) => Number(projectOverdue(b))-Number(projectOverdue(a)) || (a.deadline || '9999').localeCompare(b.deadline || '9999') || b.updated_at.localeCompare(a.updated_at));
  $('#project-error').hidden = !projectError; $('#project-error').textContent = projectError; $('#new-project').disabled = !!projectError;
  const stats = $('#project-stats'); stats.replaceChildren();
  const sumKobo = key => rows.reduce((total,project) => total+Math.round(Number(project[key])*100),0);
  for (const [label,value] of [['Active projects',rows.filter(project => project.status !== 'completed').length],['Overdue',rows.filter(project => projectOverdue(project)).length],['Confirmed payments',money(sumKobo('amount_received')/100)],['Outstanding balance',money((sumKobo('total_cost')-sumKobo('amount_received'))/100)]]) {
    const card = element('div',undefined,'stat'); card.append(element('strong',projectError ? '—' : String(value)),element('span',label)); stats.append(card);
  }
  const list = $('#project-list'); list.replaceChildren(); $('#empty-projects').hidden = !!projectError || rows.length > 0;
  for (const project of rows) {
    const row = element('tr'), client = element('td'); client.append(element('strong',project.client_name),element('small',project.service_name));
    const statusCell = element('td'); statusCell.append(element('span',projectStatuses[project.status],'badge '+project.status));
    const deadline = element('td',project.deadline ? date(project.deadline+'T12:00:00+01:00') : 'Not set');
    if (projectOverdue(project)) deadline.append(element('span','Overdue','badge follow-up-due'));
    const amounts = element('td'); amounts.append(element('div','Cost: '+money(project.total_cost)),element('div','Received: '+money(project.amount_received)),element('strong','Balance: '+money(projectBalance(project.total_cost,project.amount_received))));
    const actions = element('td'); actions.append(button('View / Update',()=>openProjectEditor(project)),button('Invoices / Receipts',()=>openBilling(project.id))); row.append(client,element('td',project.assigned_to || 'Unassigned'),statusCell,deadline,amounts,actions); labelRow(row, ['Client & service','Assigned to','Progress','Deadline','Cost / received / balance','Action']); list.append(row);
  }
}
function updateProjectPaymentSummary() {
  const form = $('#delivery-form'), summary = $('#project-payment-summary'), total = form.elements.total_cost.value, received = form.elements.amount_received.value;
  if (total === '' || received === '') { summary.textContent = 'Enter the project cost and confirmed payments to calculate the balance.'; return; }
  const breakdown = paymentBreakdown(total), balance = projectBalance(total,received);
  summary.textContent = !breakdown || !Number.isFinite(balance) || Number(received)<0 || balance<0 ? 'Enter valid amounts. Confirmed payments must not exceed the cost.' : 'Expected deposit (60%): '+money(breakdown.deposit)+' · Confirmed received: '+money(received)+' · Outstanding: '+money(balance);
}
function openProjectEditor(project, proposal) {
  if (!adminArea) return;
  if (projectError) { notify(projectError); return; }
  const form = $('#delivery-form'); form.reset(); form.querySelector('.form-message').textContent = '';
  $('#project-editor-title').textContent = project ? 'Update project delivery.' : 'Add a project.';
  if (project) { for (const field of ['id','client_name','service_name','assigned_to','deadline','status','total_cost','amount_received','payment_notes','notes']) form.elements[field].value = project[field] ?? ''; form.elements.expected_updated_at.value = project.updated_at; }
  if (proposal) { form.elements.client_name.value = proposal.client_name; form.elements.service_name.value = proposal.service_name; form.elements.total_cost.value = proposal.amount ?? ''; form.elements.notes.value = 'Proposal reference: '+proposal.reference; }
  updateProjectPaymentSummary(); $('#project-dialog').showModal();
}
async function openBilling(projectId) {
  if (!adminArea) return;
  const [latest, docs] = await Promise.all([api.projects(),api.documents()]);
  billingProject = latest.find(project=>project.id===projectId);
  if (!billingProject) throw new Error('Project unavailable. Refresh your dashboard.');
  billingDocuments = docs.filter(doc=>doc.project_id===projectId);
  $('#billing-title').textContent = 'Documents for '+billingProject.client_name;
  const available = receiptAvailable(billingProject,billingDocuments);
  $('#billing-summary').textContent = 'Cost: '+money(billingProject.total_cost)+' · Confirmed received: '+money(billingProject.amount_received)+' · Available for new receipts: '+money(available);
  $('#new-receipt').disabled = available<=0;
  const list = $('#billing-list'); list.replaceChildren();
  for (const doc of billingDocuments) { const row = element('tr'); row.append(element('td',doc.reference),element('td',doc.kind==='invoice' ? 'Invoice' : 'Receipt'),element('td',date(doc.issued_at)),element('td',money(doc.kind==='receipt' ? doc.amount : doc.total_cost))); const actions=element('td'); actions.append(button('View / Print',()=>openBillingDocument(doc.id))); row.append(actions); labelRow(row, ['Reference','Document','Issued','Amount','Action']); list.append(row); }
  $('#empty-billing').hidden = billingDocuments.length>0;
  if (!$('#billing-dialog').open) $('#billing-dialog').showModal();
}
function buildBillingDocument(doc) {
  const letter=letterPage(), isReceipt=doc.kind==='receipt';
  letter.append(element('h2',isReceipt ? 'PAYMENT RECEIPT' : 'INVOICE','letter-subject'),element('p','Reference: '+doc.reference+' · Issued: '+date(doc.issued_at)),element('p','Client: '+doc.client_name),element('p','Service / project: '+doc.service_name));
  const section=element('section',undefined,'letter-quotation'), table=element('table',undefined,'quotation-table'), body=element('tbody'); table.append(element('caption',isReceipt ? 'Verified payment details' : 'Project cost and payment summary'));
  const deposit=Math.round(Number(doc.total_cost)*100*Number(doc.deposit_percent)/100)/100;
  const rows=isReceipt ? [['This payment received',money(doc.amount)],['Payment date',date(doc.paid_on+'T12:00:00+01:00')],['Payment method',doc.payment_method],['Payment reference',doc.payment_reference]] : [['Total project cost',money(doc.total_cost)],['Required deposit ('+doc.deposit_percent+'%)',money(deposit)],['Deposit still due',money(Math.max(0,projectBalance(deposit,doc.confirmed_received)))]];
  rows.push(['Total confirmed received at issue',money(doc.confirmed_received)],['Outstanding balance at issue',money(projectBalance(doc.total_cost,doc.confirmed_received))]);
  for (const [label,value] of rows) { const row=element('tr'), heading=element('th',label); heading.scope='row';row.append(heading,element('td',value));body.append(row); } table.append(body);section.append(table);
  if (!isReceipt) section.append(element('p','Payment terms: '+doc.deposit_percent+'% deposit; remaining '+(100-doc.deposit_percent)+'% balance. Amounts already confirmed are reflected above.'),element('h3','Payment details'),element('p','Bank: '+doc.bank_name+'\nAccount name: '+doc.account_name+'\nAccount number: '+doc.account_number,'letter-bank'),element('p','Use this invoice reference as your payment narration.'));
  else section.append(element('p','MUA Global Innovation Ltd acknowledges the verified payment shown above. The project totals reflect the records at the time this receipt was issued.'));
  letter.append(section,element('p','Issued by: '+doc.issuer_name+'\nFor MUA Global Innovation Ltd','letter-bank'),element('p','MUA Global Innovation Ltd • Building practical digital solutions','letter-footer'));
  return letter;
}
async function openBillingDocument(id) {
  const doc=(await api.documents()).find(item=>item.id===id);
  if (!doc) throw new Error('Document unavailable.');
  $('#billing-dialog').close(); $('#document-title').textContent=doc.reference;
  $('#document-preview').replaceChildren(...buildBillingDocument(doc).childNodes);
  $('#document-actions').replaceChildren(button('Print / Save as PDF',async()=>{
    const fresh=(await api.documents()).find(item=>item.id===id);if(!fresh)throw new Error('Document unavailable.');
    $('#print-letter').replaceChildren(buildBillingDocument(fresh));$('#document-dialog').close();window.print();
  },'primary'),button('Back to project documents',async()=>{ $('#document-dialog').close();await openBilling(doc.project_id); }));
  $('#document-dialog').showModal();
}
function renderMembers() {
  const list = $('#member-list'); list.replaceChildren();
  for (const member of members.filter(m => m.role === 'ambassador')) {
    const row = element('tr'); row.append(element('td', member.full_name || 'Not specified'), element('td', member.email), element('td', member.active ? 'Active' : 'Inactive'));
    const actions = element('td'); actions.append(button(member.active ? 'Deactivate' : 'Activate', async () => {
      if (!confirm(`${member.active ? 'Deactivate' : 'Activate'} access for ${member.full_name || member.email}?`)) return;
      await api.rpc('portal_set_member_active', { p_id: member.id, p_active: !member.active }); await loadData(); notify('Account access updated.');
    })); row.append(actions); labelRow(row, ['Name','Email','Access','Action']); list.append(row);
  }
  if (!list.children.length) { const row = element('tr'), cell = element('td', 'No ambassador accounts yet. Invite an approved applicant above.'); cell.colSpan = 4; row.append(cell); list.append(row); }
}
function renderServices() {
  const list = $('#service-list'); list.replaceChildren();
  for (const service of services) {
    const card = element('article', undefined, 'service-card'); card.append(element('h3', service.name), element('span', service.active ? 'Available' : 'Hidden from new proposals', 'badge'), element('p', service.body), button('Edit template', () => openService(service))); list.append(card);
  }
}
async function loadData() {
  // Re-read membership so deactivation takes effect in the UI as well as in database policies.
  profile = await api.profile();
  if (!profile?.active) { api.clearSession(); throw new Error('Your account is inactive. Contact MUA for access.'); }
  if (adminArea && profile.role !== 'admin') { api.clearSession(); throw new Error('This dashboard is for MUA administrators. Use the ambassador login page.'); }
  [proposals, services, members] = await Promise.all([api.proposals(), api.services(), adminArea ? api.profiles() : Promise.resolve([])]);
  if (!adminArea) proposals = proposals.filter(p => p.owner_id === profile.id);
  try { leads = await api.leads(); leadError = ''; } catch (error) { leads = []; leadError = 'Client outreach is unavailable. If this is your first update, ask the administrator to run outreach-tracker.sql in Supabase, then refresh. Otherwise, check your connection and try again.'; }
  if (!adminArea) leads = leads.filter(lead => lead.owner_id === profile.id);
  if (adminArea) {
    const select = $('#lead-owner-filter'), chosen = select.value; select.replaceChildren();
    const all = element('option','All owners'); all.value = ''; select.append(all);
    for (const member of members) { const option = element('option',member.full_name || member.email); option.value = member.id; select.append(option); }
    select.value = members.some(member => member.id === chosen) ? chosen : '';
  }
  renderLeads(); renderProposals(); if (adminArea) { renderMembers(); renderServices(); renderPerformance();
    try { projects = await api.projects(); projectError = ''; } catch (error) { projects = []; projectError = 'Project delivery is unavailable. If this is your first update, run project-delivery.sql in Supabase and refresh. Otherwise, check your connection and retry.'; }
    renderProjects(); }
}
async function openWorkspace() {
  await loadData();
  $('#auth-screen').hidden = true; $('#workspace').hidden = false;
  document.querySelectorAll('.admin-only').forEach(node => { node.hidden = !adminArea; });
  $('#identity').textContent = `${profile.full_name || profile.email} · ${profile.role === 'admin' ? 'Administrator' : 'Ambassador'}`;
  $('#dashboard-kicker').textContent = adminArea ? 'MUA administration' : 'Your workspace';
  const other = $('#other-dashboard'); other.hidden = profile.role !== 'admin'; other.href = adminArea ? 'index.html' : 'admin.html'; other.textContent = adminArea ? 'Open ambassador workspace ↗' : 'Open admin dashboard ↗';
  $('#drawer-identity').textContent = $('#identity').textContent;
  const drawerOther = $('#drawer-other-dashboard'); drawerOther.hidden = other.hidden; drawerOther.href = other.href; drawerOther.textContent = other.textContent;
  showView('proposals');
}
function openEditor(proposal) {
  const form = $('#proposal-form'); form.reset(); form.querySelector('.form-message').textContent = '';
  $('#editor-title').textContent = proposal ? 'Update your draft.' : 'Prepare a proposal.';
  const select = $('#service-select'); select.replaceChildren();
  const empty = element('option', 'Select a service'); empty.value = ''; select.append(empty);
  services.filter(service => service.active).forEach(service => { const option = element('option', service.name); option.value = service.id; select.append(option); });
  if (proposal) for (const field of ['id', 'service_id', 'client_name', 'client_contact', 'client_address', 'notes']) form.elements[field].value = proposal[field] || '';
  $('#proposal-dialog').showModal();
}
function letterPage() {
  const letter = element('article', undefined, 'letter-preview');
  const watermark = element('img', undefined, 'letter-watermark'); watermark.src = './letterhead-watermark.png'; watermark.alt = ''; watermark.setAttribute('aria-hidden', 'true'); letter.append(watermark);
  const brand = element('header', undefined, 'letter-brand'), image = element('img'); image.src = './letterhead-logo.png'; image.alt = 'MUA Global Innovation Ltd'; image.width = 479; image.height = 388;
  const lockup = element('div', undefined, 'letter-company'); lockup.append(element('strong', 'MUA GLOBAL INNOVATION LTD'), element('span', 'Technology • Innovation • Digital Solutions', 'letter-tagline'));
  for (const line of ['No. 106, Abs House, Zoo Road', '07068744549 | 08025063991', 'muaglobalinnovation@gmail.com', 'www.muaglobalinnovation.com | RC 8815036']) lockup.append(element('span', line, 'letter-company-detail'));
  brand.append(image, lockup); letter.append(brand);
  return letter;
}
function buildLetter(p) {
  const letter = letterPage();
  if (!canPrint(p)) letter.append(element('p', 'DRAFT · FOR MUA REVIEW', 'draft-stamp'));
  letter.append(element('p', `${date(p.approved_at || p.created_at)} · Ref: ${reference(p.reference)}`));
  const address = element('p', undefined, 'letter-address'); address.append(element('strong', p.client_name), document.createTextNode('\n' + p.client_address + (p.client_contact ? '\nAttention: ' + p.client_contact : ''))); letter.append(address);
  letter.append(element('p', 'PROPOSAL: ' + p.service_name, 'letter-subject'), element('p', 'Dear Sir/Madam,'), element('div', p.letter_text, 'letter-body'));
  const payment = paymentBreakdown(p.amount);
  const quotation = element('section', undefined, 'letter-quotation');
  quotation.append(element('h3', 'Project quotation'));
  if (payment) {
    const table = element('table', undefined, 'quotation-table');
    const caption = element('caption', 'Quotation for ' + p.service_name); table.append(caption);
    const head = element('thead'), headings = element('tr');
    for (const title of ['Service', 'Amount (NGN)']) { const cell = element('th', title); cell.scope = 'col'; headings.append(cell); }
    head.append(headings); table.append(head);
    const body = element('tbody'), row = element('tr'); row.append(element('td', p.service_name), element('td', money(payment.total))); body.append(row); table.append(body);
    const foot = element('tfoot'), total = element('tr'); total.append(element('th', 'Total project cost'), element('td', money(payment.total))); foot.append(total); table.append(foot);
    quotation.append(table, element('p', 'Deposit (60%): ' + money(payment.deposit), 'payment-deposit'), element('p', 'Remaining balance (40%): ' + money(payment.balance)));
  } else quotation.append(element('p', 'Project cost: To be agreed. A 60% deposit and 40% remaining balance apply once the quotation is confirmed.'));
  quotation.append(element('h3', 'Payment details'), element('p', 'Bank: Moniepoint\nAccount name: Mua Global Innovation Ltd\nAccount number: 6520592152', 'letter-bank'), element('p', 'Use the proposal reference as your payment narration.', 'payment-note'));
  if (!canPrint(p)) quotation.append(element('p', 'Draft quotation — subject to admin approval.', 'payment-note'));
  letter.append(quotation);
  if (canPrint(p)) {
    const sign = element('p', undefined, 'letter-sign'); sign.append(document.createTextNode('Yours faithfully,\n'), element('strong', p.signatory_name), document.createTextNode('\n' + p.signatory_title)); sign.style.whiteSpace = 'pre-line'; letter.append(sign);
  } else letter.append(element('p', 'Signatory and any quoted amount are confirmed during admin approval.', 'small'));
  letter.append(element('p', 'MUA Global Innovation Ltd • Building practical digital solutions', 'letter-footer'));
  return letter;
}
async function openDetail(id) {
  // Fetch fresh status before offering approval or printing.
  const latest = await api.proposals(); proposals = latest; current = latest.find(p => p.id === id);
  if (!current) throw new Error('This proposal is no longer available.');
  const p = current; $('#detail-title').textContent = p.client_name;
  $('#detail-meta').replaceChildren(badge(p.status), element('span', p.reference), element('span', p.service_name));
  $('#feedback').hidden = !p.feedback; $('#feedback').textContent = 'Review notes: ' + p.feedback;
  $('#letter-preview').replaceChildren(...buildLetter(p).childNodes);
  const actions = $('#detail-actions'); actions.replaceChildren();
  if (canEdit(p)) {
    actions.append(button('Edit draft', () => { $('#detail-dialog').close(); openEditor(p); }));
    actions.append(button('Submit for review', async () => { await api.rpc('portal_submit_proposal', { p_id: p.id }); await loadData(); await openDetail(p.id); notify('Proposal submitted for MUA review.'); }, 'primary'));
  }
  if (canPrint(p)) actions.append(button('Print / Save as PDF', async () => {
    const latest = (await api.proposals()).find(item => item.id === p.id);
    if (!latest || !canPrint(latest)) throw new Error('Only an approved proposal can be printed.');
    $('#print-letter').replaceChildren(buildLetter(latest));
    $('#detail-dialog').close(); window.print();
  }, 'primary'));
  if (adminArea && canPrint(p)) actions.append(button('Create delivery project', () => { $('#detail-dialog').close(); openProjectEditor(null,p); }));
  actions.append(button('Add to client outreach', () => { $('#detail-dialog').close(); openLeadEditor(null, p); }));
  const review = $('#review-form'); review.hidden = !(adminArea && p.status === 'submitted'); review.reset(); review.querySelector('.form-message').textContent = '';
  review.elements.letter_text.value = p.letter_text; review.elements.amount.value = p.amount ?? ''; review.elements.feedback.value = p.feedback || '';
  const events = await api.events(p.id); $('#event-list').replaceChildren(...events.map(event => element('li', `${date(event.created_at)} — ${event.kind}${event.detail ? ': ' + event.detail : ''}`)));
  if (!$('#detail-dialog').open) $('#detail-dialog').showModal();
}
function openService(service) {
  const form = $('#service-form'); form.reset(); form.querySelector('.form-message').textContent = '';
  if (service) { form.elements.id.value = service.id; form.elements.name.value = service.name; form.elements.body.value = service.body; form.elements.active.checked = service.active; }
  $('#service-dialog').showModal();
}
async function reviewProposal(decision) {
  const form = $('#review-form'), data = new FormData(form);
  if (decision === 'approved' && !form.reportValidity()) return;
  if (decision === 'changes_requested' && !String(data.get('feedback')).trim()) throw new Error('Explain what needs to change.');
  if (!confirm(decision === 'approved' ? 'Approve this letter and make it available for PDF printing?' : 'Return this proposal with your review notes?')) return;
  await api.rpc('portal_review_proposal', { p_id: current.id, p_decision: decision, p_feedback: data.get('feedback'), p_letter_text: data.get('letter_text'), p_amount: data.get('amount') === '' ? null : Number(data.get('amount')), p_signatory_name: data.get('signatory_name'), p_signatory_title: data.get('signatory_title') });
  await loadData(); await openDetail(current.id); notify(decision === 'approved' ? 'Proposal approved.' : 'Changes requested.');
}
$('#drawer-navigation').replaceChildren(...[...$('#portal-navigation').children].map(node => node.cloneNode(true)));
$('#login-form').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; action(async () => { const data = new FormData(form); await api.signIn(data.get('email').trim(), data.get('password')); try { await openWorkspace(); } catch (error) { await api.signOut(); throw error; } form.reset(); }, form); });
$('#forgot-password').addEventListener('click', () => action(async () => { const email = $('#login-form').elements.email; if (!email.reportValidity()) return; await api.recover(email.value.trim()); notify('If this email has an account, a password-reset link will be sent.'); }, $('#login-form')));
$('#sign-out').addEventListener('click', () => action(async () => { await api.signOut(); location.reload(); }, null, $('#sign-out')));
$('#refresh').addEventListener('click', () => action(async () => { await loadData(); notify('Dashboard updated.'); }, null, $('#refresh')));
if (adminArea) {
  $('#new-invoice').addEventListener('click',()=>action(async()=>{
    if(!billingProject || !confirm('Issue a new invoice using this project’s saved cost and confirmed payments?'))return;
    const id=await api.rpc('portal_issue_document',{p_project_id:billingProject.id,p_kind:'invoice',p_amount:null,p_paid_on:null,p_payment_reference:null,p_payment_method:null,p_expected_updated_at:billingProject.updated_at});
    await openBillingDocument(id);notify('Invoice issued and saved.');
  },null,$('#new-invoice')));
  $('#new-receipt').addEventListener('click',()=>{
    const form=$('#receipt-form');form.reset();form.querySelector('.form-message').textContent='';form.elements.paid_on.max=lagosToday();
    $('#receipt-available').textContent='Available confirmed payments: '+money(receiptAvailable(billingProject,billingDocuments))+'. Enter one verified payment, not the cumulative project total.';
    $('#billing-dialog').close();$('#receipt-dialog').showModal();
  });
  $('#receipt-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;action(async()=>{
    if(!form.elements.verified.checked)throw new Error('Confirm that you verified this payment.');
    const data=validateReceipt(Object.fromEntries(new FormData(form)),receiptAvailable(billingProject,billingDocuments));
    const id=await api.rpc('portal_issue_document',{p_project_id:billingProject.id,p_kind:'receipt',p_amount:Number(data.amount),p_paid_on:data.paid_on,p_payment_reference:data.payment_reference,p_payment_method:data.payment_method,p_expected_updated_at:billingProject.updated_at});
    $('#receipt-dialog').close();await openBillingDocument(id);notify('Payment receipt issued and saved.');
  },form);});
  $('#new-project').addEventListener('click',()=>openProjectEditor());
  $('#project-search').addEventListener('input',renderProjects); $('#project-status-filter').addEventListener('change',renderProjects); $('#project-overdue-filter').addEventListener('change',renderProjects);
  for (const field of ['total_cost','amount_received']) $('#delivery-form').elements[field].addEventListener('input',updateProjectPaymentSummary);
  $('#delivery-form').addEventListener('submit',event=>{ event.preventDefault(); const form=event.currentTarget; action(async()=>{
    const data=validateProject(Object.fromEntries(new FormData(form)));
    await api.rpc('portal_save_project',{p_id:data.id || null,p_expected_updated_at:data.expected_updated_at || null,p_client_name:data.client_name,p_service_name:data.service_name,p_assigned_to:data.assigned_to,p_deadline:data.deadline || null,p_status:data.status,p_total_cost:Number(data.total_cost),p_amount_received:Number(data.amount_received),p_payment_notes:data.payment_notes,p_notes:data.notes});
    $('#project-dialog').close(); await loadData(); showView('projects'); notify('Project delivery updated.');
  },form); });
}
$('#mobile-menu-toggle').addEventListener('click', () => setMobileMenu($('#mobile-menu-toggle').getAttribute('aria-expanded') !== 'true'));
$('#drawer-close').addEventListener('click', () => setMobileMenu(false, true));
$('#drawer-sign-out').addEventListener('click', () => { setMobileMenu(false); $('#sign-out').click(); });
$('#mobile-nav-dialog').addEventListener('cancel', event => { event.preventDefault(); setMobileMenu(false, true); });
$('#mobile-nav-dialog').addEventListener('close', () => { document.body.classList.remove('menu-open'); $('#mobile-menu-toggle').setAttribute('aria-expanded', 'false'); $('#mobile-menu-toggle').textContent = 'Menu'; });
$('#mobile-nav-dialog').addEventListener('click', event => {
  if (event.target !== event.currentTarget) return;
  const box = event.currentTarget.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setMobileMenu(false, true);
});
window.matchMedia('(max-width:850px)').addEventListener('change', event => { if (!event.matches) setMobileMenu(false); });
$('#new-lead').addEventListener('click', () => openLeadEditor());
$('#lead-owner-filter').addEventListener('change', renderLeads);
if (adminArea) { $('#performance-search').addEventListener('input', renderPerformance); $('#performance-access').addEventListener('change', renderPerformance); $('#performance-sort').addEventListener('change', renderPerformance); }
$('#lead-search').addEventListener('input', renderLeads); $('#lead-stage-filter').addEventListener('change', renderLeads); $('#lead-due-filter').addEventListener('change', renderLeads);
$('#lead-form').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; action(async () => {
  const data = validateLead(Object.fromEntries(new FormData(form)));
  await api.rpc('portal_save_lead', { p_id: data.id || null, p_company_name: data.company_name, p_contact_name: data.contact_name, p_contact_details: data.contact_details, p_client_address: data.client_address, p_stage: data.stage, p_follow_up_date: data.follow_up_date || null, p_notes: data.notes });
  $('#lead-dialog').close(); await loadData(); showView('leads'); notify('Client outreach saved.');
}, form); });
$('#new-proposal').addEventListener('click', () => openEditor());
$('#new-service').addEventListener('click', () => openService());
$('#search').addEventListener('input', renderProposals); $('#status-filter').addEventListener('change', renderProposals);
document.querySelectorAll('[data-view]').forEach(node => node.addEventListener('click', () => showView(node.dataset.view)));
document.querySelectorAll('.close-dialog').forEach(node => node.addEventListener('click', () => node.closest('dialog').close()));
$('#proposal-form').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; action(async () => {
  const data = validateBrief(Object.fromEntries(new FormData(form)));
  const id = await api.rpc('portal_save_proposal', { p_id: data.id || null, p_service_id: data.service_id, p_client_name: data.client_name, p_client_address: data.client_address, p_client_contact: data.client_contact, p_notes: data.notes });
  $('#proposal-dialog').close(); await loadData(); await openDetail(id); notify('Draft saved. Review it before submitting.');
}, form); });
$('#review-form').addEventListener('submit', event => { event.preventDefault(); action(() => reviewProposal('approved'), event.currentTarget); });
$('#request-changes').addEventListener('click', () => action(() => reviewProposal('changes_requested'), $('#review-form')));
$('#service-form').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; action(async () => { const data = new FormData(form); await api.rpc('portal_save_service', { p_id: data.get('id') || null, p_name: data.get('name'), p_body: data.get('body'), p_active: form.elements.active.checked }); $('#service-dialog').close(); await loadData(); notify('Service template updated.'); }, form); });
$('#invite-form').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; action(async () => { const data = new FormData(form); await api.invite(data.get('email').trim(), data.get('full_name').trim()); form.reset(); await loadData(); notify('Invitation sent. The ambassador can set their password using the email link.'); }, form); });
$('#password-form').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; action(async () => { if (form.elements.password.value !== form.elements.confirm.value) throw new Error('The two passwords must match.'); await api.setPassword(form.elements.password.value); $('#password-dialog').close(); form.reset(); await openWorkspace(); notify('Your password has been updated.'); }, form); });
$('#setup-note').hidden = api.configured;
if (!api.configured) document.querySelectorAll('#login-form button').forEach(button => { button.disabled = true; });
async function start() {
  const callback = new URLSearchParams(location.hash.slice(1));
  if (callback.get('error_description')) { $('#auth-message').textContent = callback.get('error_description'); history.replaceState(null, '', location.pathname); return; }
  if (callback.get('access_token') && callback.get('refresh_token') && ['invite', 'recovery'].includes(callback.get('type'))) {
    api.setSession({ access_token: callback.get('access_token'), refresh_token: callback.get('refresh_token'), expires_in: callback.get('expires_in') });
    history.replaceState(null, '', location.pathname); await api.user(); $('#password-dialog').showModal(); return;
  }
  if (api.session && api.configured) {
    try { await openWorkspace(); } catch (error) { api.clearSession(); $('#workspace').hidden = true; $('#auth-screen').hidden = false; $('#auth-message').textContent = error.message; }
  }
}
start().catch(error => { api.clearSession(); $('#auth-message').textContent = error.message; });
