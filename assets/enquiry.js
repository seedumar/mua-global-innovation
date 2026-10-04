import {validateEnquiry,whatsappURL,sendEnquiry} from './enquiry-core.mjs?v=20261004-inbox';
const form=document.querySelector('#contact-form');
if(form){
  const note=document.querySelector('#form-note'), submit=form.querySelector('button[type="submit"]');
  let requestId='',snapshot='',busy=false,saved=false;
  const linkFor=data=>{const link=document.createElement('a');link.href=whatsappURL(data);link.target='_blank';link.rel='noopener noreferrer';link.textContent='Continue on WhatsApp ↗';return link;};
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||saved)return;
    if(!form.reportValidity())return;
    const values=new FormData(form), data={};
    for(const field of ['name','contact','service','message','organisation','timing','website'])data[field]=String(values.get(field)||'').trim();
    const error=validateEnquiry(data);if(error){note.textContent=error;return;}
    const nextSnapshot=JSON.stringify(data);
    if(snapshot!==nextSnapshot){requestId=crypto.randomUUID();snapshot=nextSnapshot;}
    data.request_id=requestId;busy=true;const controls=[...form.querySelectorAll('input,textarea,select,button')];const disabled=controls.map(control=>control.disabled);controls.forEach(control=>control.disabled=true);submit.textContent='Sending enquiry…';note.textContent='Please wait while we save your enquiry.';
    try{
      await sendEnquiry(window.MUA_PORTAL_CONFIG,data);
      saved=true;submit.textContent='Enquiry received ✓';
      form.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=true);
      const actions=form.querySelector('.wizard-actions');if(actions)actions.hidden=true;
      note.replaceChildren(document.createTextNode('Your enquiry has been saved. MUA will contact you using the details provided. You can also '),linkFor(data));
    }catch(error){
      note.replaceChildren(document.createTextNode((error.name==='TimeoutError'||error.name==='TypeError' ? 'We could not confirm your enquiry. Check your connection and retry with the same details.' : error.message)+' '),linkFor(data));
      controls.forEach((control,index)=>control.disabled=disabled[index]);submit.textContent='Retry enquiry →';
    }finally{busy=false;}
  });
}
