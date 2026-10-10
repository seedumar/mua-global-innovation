export function todayLagos(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=k=>parts.find(p=>p.type===k).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
export function letterDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))throw new Error('Choose a valid start date.');
 const date=new Date(value+'T12:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error('Choose a valid start date.');
 return date.toLocaleDateString('en-NG',{timeZone:'Africa/Lagos',day:'numeric',month:'long',year:'numeric'});
}
export function appointmentText(start){letterDate(start);return `We are pleased to appoint you as an Ambassador of MUA Global Innovation Ltd, with effect from the appointment start date stated above. We welcome your contribution to connecting schools, businesses, organisations and communities with MUA’s technology services.

Your responsibilities
Introduce MUA’s approved services, identify prospective clients, record and follow up enquiries, and submit proposals through the ambassador portal for MUA’s review. Represent the company professionally and keep client information confidential. Use approved company materials and confirm service scope, pricing and delivery commitments with MUA before communicating them as agreed terms.

Commission arrangements
This is a commission-based appointment. A fixed commission amount is agreed and approved by MUA for each eligible project; there is no universal commission percentage or fixed salary. For an approved commission, 50% becomes payable after the client’s agreed deposit is confirmed and the remaining 50% after full client payment. Actual payouts are recorded separately in the portal. Confirm the project’s approved commission and payment terms with MUA before proceeding.

Working with MUA
Coordinate client opportunities and progress updates with the MUA management team. Client payments must go through MUA’s authorised payment channels. Commitments and contracts require MUA’s approval. Portal access is provided separately after invitation and account activation.

Please acknowledge receipt of this letter and confirm your willingness to carry out these responsibilities. We look forward to building practical solutions and lasting client relationships together.`;}
export function appointmentArgs(application,start,text){
 if(application?.status!=='accepted')throw new Error('Accept this application before issuing a letter.');
 letterDate(start);if(typeof text!=='string'||text.trim().length<100||text.trim().length>12000)throw new Error('The letter must contain 100 to 12000 characters.');
 return {p_application_id:application.id,p_effective_date:start,p_letter_text:text.trim()};
}
