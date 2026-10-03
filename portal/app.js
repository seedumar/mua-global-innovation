import { PortalAPI } from './api.js';
import { statuses, validateBrief, canEdit, canPrint, money, paymentBreakdown, date, reference } from './core.js?v=20261003-payment';
const api = new PortalAPI(window.MUA_PORTAL_CONFIG || {});
const $ = selector => document.querySelector(selector);
let profile, proposals = [], services = [], members = [], current, noticeTimer;
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
    if (!api.session) { profile = null; $('#workspace').hidden = true; $('#auth-screen').hidden = false; }
  } finally { controls.forEach(control => { control.disabled = false; }); }
}
function button(text, callback, cls = 'outline') { const node = element('button', text, cls); node.type = 'button'; node.addEventListener('click', () => action(() => callback(node), null, node)); return node; }
function badge(status) { return element('span', statuses[status] || status, 'badge ' + status); }
function showView(name) {
  if (!adminArea && name !== 'proposals') return;
  ['proposals', 'members', 'services'].forEach(view => { $('#' + view + '-view').hidden = view !== name; });
  document.querySelectorAll('[data-view]').forEach(node => { node.classList.toggle('active', node.dataset.view === name); if (node.dataset.view === name) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current'); });
  $('#dashboard-title').textContent = name === 'members' ? 'Your ambassador network.' : name === 'services' ? 'A consistent proposal standard.' : adminArea ? 'All proposals.' : 'Your proposals.';
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
    const actions = element('td'); actions.append(button('View', () => openDetail(p.id))); row.append(actions); list.append(row);
  }
}
function renderMembers() {
  const list = $('#member-list'); list.replaceChildren();
  for (const member of members.filter(m => m.role === 'ambassador')) {
    const row = element('tr'); row.append(element('td', member.full_name || 'Not specified'), element('td', member.email), element('td', member.active ? 'Active' : 'Inactive'));
    const actions = element('td'); actions.append(button(member.active ? 'Deactivate' : 'Activate', async () => {
      if (!confirm(`${member.active ? 'Deactivate' : 'Activate'} access for ${member.full_name || member.email}?`)) return;
      await api.rpc('portal_set_member_active', { p_id: member.id, p_active: !member.active }); await loadData(); notify('Account access updated.');
    })); row.append(actions); list.append(row);
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
  renderProposals(); if (adminArea) { renderMembers(); renderServices(); }
}
async function openWorkspace() {
  await loadData();
  $('#auth-screen').hidden = true; $('#workspace').hidden = false;
  document.querySelectorAll('.admin-only').forEach(node => { node.hidden = !adminArea; });
  $('#identity').textContent = `${profile.full_name || profile.email} · ${profile.role === 'admin' ? 'Administrator' : 'Ambassador'}`;
  $('#dashboard-kicker').textContent = adminArea ? 'MUA administration' : 'Your workspace';
  const other = $('#other-dashboard'); other.hidden = profile.role !== 'admin'; other.href = adminArea ? 'index.html' : 'admin.html'; other.textContent = adminArea ? 'Open ambassador workspace ↗' : 'Open admin dashboard ↗';
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
function buildLetter(p) {
  const letter = element('article', undefined, 'letter-preview');
  const watermark = element('img', undefined, 'letter-watermark'); watermark.src = './letterhead-watermark.png'; watermark.alt = ''; watermark.setAttribute('aria-hidden', 'true'); letter.append(watermark);
  const brand = element('header', undefined, 'letter-brand'), image = element('img'); image.src = './letterhead-logo.png'; image.alt = 'MUA Global Innovation Ltd'; image.width = 479; image.height = 388;
  const lockup = element('div', undefined, 'letter-company'); lockup.append(element('strong', 'MUA GLOBAL INNOVATION LTD'), element('span', 'Technology • Innovation • Digital Solutions', 'letter-tagline'));
  for (const line of ['No. 106, Abs House, Zoo Road', '07068744549 | 08025063991', 'muaglobalinnovation@gmail.com', 'www.muaglobalinnovation.com | RC 8815036']) lockup.append(element('span', line, 'letter-company-detail'));
  brand.append(image, lockup); letter.append(brand);
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
$('#login-form').addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget; action(async () => { const data = new FormData(form); await api.signIn(data.get('email').trim(), data.get('password')); try { await openWorkspace(); } catch (error) { await api.signOut(); throw error; } form.reset(); }, form); });
$('#forgot-password').addEventListener('click', () => action(async () => { const email = $('#login-form').elements.email; if (!email.reportValidity()) return; await api.recover(email.value.trim()); notify('If this email has an account, a password-reset link will be sent.'); }, $('#login-form')));
$('#sign-out').addEventListener('click', () => action(async () => { await api.signOut(); location.reload(); }, null, $('#sign-out')));
$('#refresh').addEventListener('click', () => action(async () => { await loadData(); notify('Dashboard updated.'); }, null, $('#refresh')));
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
