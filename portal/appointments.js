import {appointmentText,appointmentArgs,todayLagos,letterDate} from './appointments-core.mjs';
const $=s=>document.querySelector(s);
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function render(record,draft){
 const letter=el('article',undefined,'appointment-letter');
 const mark=el('img',undefined,'appointment-watermark');mark.src='appointment-letterhead-watermark.png';mark.alt='';letter.append(mark);
 const header=el('div',undefined,'appointment-brand'),logo=el('img');logo.src='appointment-letterhead-logo.png';logo.alt='MUA Global Innovation Ltd';logo.width=479;logo.height=388;
 const company=el('div',undefined,'appointment-company');company.append(el('strong','MUA GLOBAL INNOVATION LTD'),el('span','Technology • Innovation • Digital Solutions','appointment-tagline'));
 for(const line of ['No. 106, Abs House, Zoo Road','07068744549 | 08025063991','muaglobalinnovation@gmail.com','www.muaglobalinnovation.com | RC 8815036'])company.append(el('span',line));header.append(logo,company);letter.append(header);
 if(draft)letter.append(el('p','DRAFT · REVIEW BEFORE ISSUE','appointment-draft'));
 const issued=record.issued_at?new Date(record.issued_at).toLocaleDateString('en-NG',{timeZone:'Africa/Lagos',day:'numeric',month:'long',year:'numeric'}):letterDate(todayLagos());
 letter.append(el('p',issued+' · Ref: '+(record.reference||'Assigned on issue'),'appointment-meta'),el('p',record.full_name+'\n'+record.city+', '+record.state+'\n'+record.email,'appointment-recipient'),el('h3','APPOINTMENT AS MUA AMBASSADOR'),el('p','Appointment start date: '+letterDate(record.effective_date)),el('p','Dear '+record.full_name+','),el('div',record.letter_text,'appointment-body'));
 const signature=el('div',undefined,'appointment-signature');signature.append(el('p','Yours faithfully,','appointment-sign'),el('p','____________________________','appointment-signature-line'),el('strong',record.signatory_name||'Umar Saeed Umar'),el('p',record.signatory_title||'Co-founder & Chief Executive Officer','appointment-title'),el('p','For MUA Global Innovation Ltd'));letter.append(signature);
 letter.append(el('p','Acknowledged by: ____________________    Date: ____________________','appointment-ack'),el('p','MUA Global Innovation Ltd • Building practical digital solutions','appointment-footer'));
 $('#appointment-preview').replaceChildren(letter);
}
export function createAppointments(api){
 let application=null,issued=null,busy=false,generation=0;
 const dialog=$('#appointment-dialog'),form=$('#appointment-form'),note=$('#appointment-message');
 const status=text=>note.textContent=text;
 function editor(){form.hidden=Boolean(issued);$('#appointment-print').hidden=!issued;$('#appointment-state').textContent=issued?'Issued appointment · '+issued.reference:'Draft appointment';}
 function draft(){if(!application||issued)return;try{render({...application,effective_date:form.elements.effective_date.value,letter_text:form.elements.letter_text.value},true);}catch(e){status(e.message);}}
 async function open(record){
  const ticket=++generation;application=null;issued=null;form.reset();form.hidden=true;$('#appointment-preview').replaceChildren();$('#appointment-print').hidden=true;status('Loading appointment…');$('#appointment-state').textContent='Appointment letter';dialog.showModal();
  try{
   const [rows,letters]=await Promise.all([api.request('/rest/v1/mua_ambassador_applications?id=eq.'+encodeURIComponent(record.id)+'&select=id,full_name,email,city,state,status'),api.request('/rest/v1/mua_appointment_letters?application_id=eq.'+encodeURIComponent(record.id)+'&select=*')]);
   if(ticket!==generation||!dialog.open)return;if(!rows[0])throw new Error('Application unavailable.');application=rows[0];issued=letters[0]||null;
   if(!issued&&application.status!=='accepted')throw new Error('Accept this application before issuing an appointment letter.');
   if(issued){render(issued,false);status('Saved letter. Reprints use its original details.');}
   else{form.elements.effective_date.value=todayLagos();form.elements.letter_text.value=appointmentText(todayLagos());draft();status('Review the start date and wording before issuing.');}editor();
  }catch(e){status(e.message);}
 }
 $('#appointment-close').onclick=()=>{if(!busy){generation++;dialog.close();application=null;issued=null;$('#appointment-preview').replaceChildren();}};
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();else{generation++;application=null;issued=null;$('#appointment-preview').replaceChildren();}});
 form.elements.letter_text.oninput=()=>{form.elements.confirmed.checked=false;draft()};
 form.elements.effective_date.onchange=()=>{form.elements.confirmed.checked=false;try{letterDate(form.elements.effective_date.value);draft();status('Start date updated. Review any dates you added to the custom wording.');}catch(e){status(e.message)}};
 $('#appointment-reset').onclick=()=>{form.elements.confirmed.checked=false;try{form.elements.letter_text.value=appointmentText(form.elements.effective_date.value);draft();status('Standard wording restored.');}catch(e){status(e.message)}};
 form.onsubmit=async e=>{
  e.preventDefault();if(busy||!application)return;if(!form.elements.confirmed.checked){status('Confirm that you reviewed the letter.');return;}
  busy=true;$('#appointment-issue').disabled=true;$('#appointment-close').disabled=true;
  try{issued=await api.rpc('mua_issue_appointment',appointmentArgs(application,form.elements.effective_date.value,form.elements.letter_text.value));render(issued,false);editor();status('Appointment letter issued and saved. Use Print / Save PDF.');}
  catch(e){status(e.message+' If your connection failed, reopen this letter before retrying.');}
  finally{busy=false;$('#appointment-issue').disabled=false;$('#appointment-close').disabled=false;}
 };
 $('#appointment-print').onclick=async()=>{
  if(!issued)return;const button=$('#appointment-print');button.disabled=true;
  try{await api.profile().then(p=>{if(!p?.active||p.role!=='admin')throw new Error('Admin access required.')});
   await Promise.all([...$('#appointment-preview').querySelectorAll('img')].map(img=>img.decode()));
   await document.fonts.ready;window.addEventListener('afterprint',()=>document.body.classList.remove('printing-appointment'),{once:true});document.body.classList.add('printing-appointment');window.print();
  }catch(e){document.body.classList.remove('printing-appointment');status('Unable to print: '+e.message+' Check the letterhead images and try again.');}
  finally{button.disabled=false;}
 };
 return {open,clear(){generation++;if(dialog.open)dialog.close();application=null;issued=null;$('#appointment-preview').replaceChildren();}};
}
