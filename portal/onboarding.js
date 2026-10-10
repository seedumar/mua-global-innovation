import {stageLabels,nextStage,canInvite,onboardingFollowupArgs,followupLabel} from './onboarding-core.mjs';
const $=s=>document.querySelector(s);
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;}
const date=v=>v?new Date(v).toLocaleString('en-NG',{timeZone:'Africa/Lagos',dateStyle:'medium',timeStyle:'short'}):'Not recorded';
export function createOnboarding(api,appointments){
 let page=0,detail=null,busy=false,generation=0,listGeneration=0;
 const dialog=$('#onboarding-dialog'),note=$('#onboarding-message');
 const status=text=>note.textContent=text;
 async function load(){
  const ticket=++listGeneration;$('#onboarding-error').textContent='Loading onboarding…';$('#onboarding-cards').replaceChildren();$('#onboarding-prev').disabled=true;$('#onboarding-next').disabled=true;
  try{
   const result=await api.rpc('mua_onboarding_list',{p_offset:page*12,p_search:$('#onboarding-search').value.trim().slice(0,200),p_stage:$('#onboarding-filter').value});
   if(ticket!==listGeneration)return;
   $('#onboarding-stats').replaceChildren(...[['Due today',result.due??0],['Overdue',result.overdue??0],['Accepted',result.accepted],['Needs a letter',result.letter],['Needs an account link',result.invite],['Awaiting sign-in',result.signin],['Ready to start',result.ready],['Access paused',result.paused]].map(([label,value])=>{const card=el('div',undefined,'stat');card.append(el('strong',value),el('span',label));return card;}));
   const rows=result.rows.slice(0,12);
   $('#onboarding-cards').replaceChildren(...rows.map(row=>{const card=el('article',undefined,'card');card.append(el('span',stageLabels[row.stage],'badge '+(row.stage==='ready'?'accepted':'')),el('h2',row.full_name),el('p',row.email),el('p',row.reference),el('p',row.state),el('p',followupLabel(row.followup_date,result.today,row.stage),'followup '+(row.reminder||'')));const button=el('button','Open checklist');button.onclick=()=>open(row.id);card.append(button);return card;}));
   $('#onboarding-count').textContent=rows.length?rows.length+' accepted applicants on this page. Summary cards cover all accepted applicants.':'No accepted applicants match this view.';
   $('#onboarding-page').textContent='Page '+(page+1);$('#onboarding-prev').disabled=page===0;$('#onboarding-next').disabled=result.rows.length<=12;$('#onboarding-error').textContent='';
  }catch(error){if(ticket===listGeneration){$('#onboarding-stats').replaceChildren();$('#onboarding-error').textContent=error.message+' If this is the first update, run ambassador-onboarding-followups.sql.';}}
 }
 function render(){
  const stage=nextStage(detail);$('#onboarding-name').textContent=detail.application.full_name;
  $('#onboarding-stage').textContent=stageLabels[stage]||'Application no longer accepted';
  const checks=[['Accepted application',detail.application.status==='accepted',detail.application.reference],['Appointment letter issued',Boolean(detail.letter_reference),detail.letter_reference||'Issue the letter first'],['Portal account linked',Boolean(detail.member_id),detail.member?.email||'Link an existing account or send an invitation'],['Invitation request / existing account',Boolean(detail.member_id),detail.invitation_requested_at?'Invitation requested: '+date(detail.invitation_requested_at):detail.member_id?'Existing account linked; no invitation date recorded':'No invitation request recorded'],['Portal sign-in confirmed',Boolean(detail.member?.first_portal_sign_in_at),date(detail.member?.first_portal_sign_in_at)],['Account access enabled',Boolean(detail.member?.active),detail.member_id?(detail.member?.active?'Access enabled':'Access paused — use Admin → Ambassadors to manage access'):'No linked account']];
  $('#onboarding-checks').replaceChildren(...checks.map(([label,done,info])=>{const li=el('li',undefined,done?'check-done':'check-pending');li.append(el('strong',(done?'✓ ':'○ ')+label),el('span',info));return li;}));
  $('#onboarding-notes').value=detail.notes;
  $('#onboarding-followup').value=detail.followup_date||'';
  $('#onboarding-followup-status').textContent=followupLabel(detail.followup_date,detail.today,stage);
  $('#onboarding-letter').hidden=detail.application.status!=='accepted';
  $('#onboarding-invite').hidden=!canInvite(detail);
  const select=$('#onboarding-account');select.replaceChildren(new Option('Choose matching account',''),...detail.candidates.map(c=>new Option(c.full_name+' · '+c.email+(c.active?'':' · access paused'),c.id)));
  const linkable=stage==='invite'&&detail.candidates.length>0;$('#onboarding-link-fields').hidden=!linkable;
  $('#onboarding-save').disabled=detail.application.status!=='accepted';
 }
 async function open(id){
  if(busy)return;const ticket=++generation;detail=null;$('#onboarding-checks').replaceChildren();$('#onboarding-actions').hidden=true;$('#onboarding-name').textContent='Loading…';status('Loading checklist…');if(!dialog.open)dialog.showModal();
  try{const next=await api.rpc('mua_onboarding_detail',{p_application_id:id});if(ticket!==generation||!dialog.open)return;detail=next;render();$('#onboarding-actions').hidden=false;status('No delivery confirmation is inferred from an invitation request.');}
  catch(error){status(error.message);}
 }
 async function save(memberId){
  if(!detail||busy)return;const id=detail.application.id;busy=true;lock(true);
  try{await api.rpc('mua_save_onboarding_followup',onboardingFollowupArgs(detail,memberId,$('#onboarding-notes').value,$('#onboarding-followup').value));busy=false;await open(id);status('Checklist saved.');await load();}
  catch(error){status(error.message);}finally{busy=false;lock(false);}
 }
 function lock(value){for(const button of dialog.querySelectorAll('button'))button.disabled=value;if(!value&&detail)$('#onboarding-save').disabled=detail.application.status!=='accepted';}
 $('#onboarding-close').onclick=()=>{if(!busy){generation++;dialog.close();detail=null;}};
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();else{generation++;detail=null;}});
 $('#onboarding-check-refresh').onclick=()=>{if(detail&&!busy)open(detail.application.id)};
 $('#onboarding-letter').onclick=()=>{if(detail)appointments.open(detail.application)};
 $('#onboarding-link').onclick=()=>{const selected=$('#onboarding-account').value;if(!selected){status('Choose the matching account first.');return;}save(selected)};
 $('#onboarding-save').onclick=()=>save(detail?.member_id||null);
 $('#onboarding-invite').onclick=async()=>{
  if(!detail||busy||!canInvite(detail))return;
  if(!window.confirm('Request a portal invitation for '+detail.application.email+'?'))return;
  const id=detail.application.id,notes=$('#onboarding-notes').value,followup=$('#onboarding-followup').value,revision=detail.revision;busy=true;lock(true);status('Requesting invitation…');
  try{
   // Recheck authoritative status and matching accounts immediately before a send.
   const fresh=await api.rpc('mua_onboarding_detail',{p_application_id:id});
   if(!canInvite(fresh)||fresh.revision!==revision)throw new Error('The checklist changed or an account already exists. Refresh before continuing.');
   onboardingFollowupArgs(fresh,null,notes,followup); // Validate before requesting email.
   await api.invite(fresh.application.email,fresh.application.full_name);
   const after=await api.rpc('mua_onboarding_detail',{p_application_id:id});
   if(after.candidates.length!==1||after.revision!==revision)throw new Error('Invitation requested, but account linking needs review. Refresh the checklist.');
   await api.rpc('mua_save_onboarding_followup',onboardingFollowupArgs(after,after.candidates[0].id,notes,followup));
   busy=false;await open(id);status('Invitation requested and account linked. Delivery is not confirmed; readiness waits for portal sign-in.');await load();
  }catch(error){status(error.message+' Do not repeatedly resend. Refresh this checklist to check whether an account was created.');}
  finally{busy=false;lock(false);}
 };
 let timer;$('#onboarding-search').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{page=0;load()},300)};
 $('#onboarding-filter').onchange=()=>{page=0;load()};$('#onboarding-prev').onclick=()=>{page--;load()};$('#onboarding-next').onclick=()=>{page++;load()};$('#onboarding-refresh').onclick=load;
 return {load,open,clear(){listGeneration++;generation++;if(dialog.open)dialog.close();detail=null;$('#onboarding-cards').replaceChildren();$('#onboarding-checks').replaceChildren();}};
}
