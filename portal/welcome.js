import {welcomeProgress} from './welcome-core.mjs';
export function createWelcomePack({element,showView,openLead,openProposal}){
 const $=s=>document.querySelector(s),section=$('#welcome-view');
 if(!section)return {render(){}};
 $('#welcome-add-lead').addEventListener('click',()=>openLead());
 $('#welcome-new-proposal').addEventListener('click',()=>openProposal());
 return {render(profile,leads,proposals,services,leadError){
  const available=profile?.active&&profile.role==='ambassador';
  document.querySelectorAll('[data-view="welcome"]').forEach(node=>{node.hidden=!available});
  if(!available){section.hidden=true;$('#welcome-checklist').replaceChildren();$('#welcome-name').textContent='';return;}
  $('#welcome-name').textContent='Welcome, '+(profile.full_name||'MUA Ambassador')+'.';
  const steps=welcomeProgress(profile,leads,proposals,leadError),completed=steps.filter(step=>step.done===true).length;
  $('#welcome-progress').value=completed;$('#welcome-progress-summary').textContent=completed+' of '+steps.length+' first-project steps completed'+(steps.some(step=>step.done===null)?' · some records are unavailable.':'.');
  $('#welcome-checklist').replaceChildren(...steps.map(step=>{
   const item=element('li',undefined,'welcome-step '+(step.done?'complete':''));
   const body=element('div');body.append(element('span',step.done===null?'Unavailable':step.done?'Completed':'Next step','welcome-state'),element('h3',step.title),element('p',step.description));
   const button=element('button',step.done?'View records':'Open '+(step.view==='leads'?'client outreach':'proposals'),'outline');button.type='button';button.addEventListener('click',()=>showView(step.view));item.append(body,button);return item;
  }));
  const active=services.filter(service=>service.active);
  $('#welcome-services').replaceChildren(...active.map(service=>element('li',service.name)));
  $('#welcome-no-services').hidden=active.length>0;
  $('#welcome-new-proposal').disabled=active.length===0;$('#welcome-add-lead').disabled=Boolean(leadError);
 }};
}
