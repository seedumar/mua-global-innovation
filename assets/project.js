(() => {
 const form=document.querySelector('.project-wizard'); if(!form)return;
 const steps=[...form.querySelectorAll('[data-project-step]')];
 const progress=form.querySelector('.project-progress');const actions=form.querySelector('.wizard-actions');
 const next=form.querySelector('.wizard-next');const back=form.querySelector('.wizard-back');
 const status=form.querySelector('.wizard-status');const review=form.querySelector('.project-review');
 let current=0;progress.hidden=false;actions.hidden=false;
 function show(index,focus=false){
  current=index;steps.forEach((step,i)=>step.hidden=i!==index);
  form.querySelectorAll('[data-progress]').forEach((item,i)=>{if(i===index)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});
  back.hidden=index===0;next.hidden=index===steps.length-1;
  status.textContent='Step '+(index+1)+' of '+steps.length;
  review.hidden=index!==2;
  if(index===2){const service=form.elements.service.value;const message=form.elements.message.value;form.querySelector('[data-review]').textContent=service+' — '+message;}
  if(focus){steps[index].querySelector('legend').tabIndex=-1;steps[index].querySelector('legend').focus();}
 }
 next.addEventListener('click',()=>{for(const input of steps[current].querySelectorAll('input,select,textarea')){if(!input.reportValidity())return;}show(current+1,true);});
 back.addEventListener('click',()=>show(current-1,true));
 form.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.tagName==='INPUT'&&current<2){event.preventDefault();next.click();}});
 // Expose the step containing an invalid field so browser validation can focus it.
 form.addEventListener('invalid',event=>{const step=event.target.closest('[data-project-step]');if(step)show(steps.indexOf(step));},true);
 show(0);
})();
