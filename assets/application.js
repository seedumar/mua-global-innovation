(() => {
 const form=document.querySelector('#apply-form'), steps=[...document.querySelectorAll('.step')], progress=[...document.querySelectorAll('.steps li')], next=document.querySelector('#next'), prev=document.querySelector('#previous'), submit=document.querySelector('#submit'), error=document.querySelector('#form-error'), config=window.MUA_APPLICATION_CONFIG||{}; let current=0, busy=false, widget, captchaToken="", captchaReady=false;
 document.querySelector('#year').textContent=new Date().getFullYear();
 const showError=message=>{error.textContent=message;error.hidden=false;error.scrollIntoView({behavior:"smooth",block:"center"});};
 function valid(){for(const el of steps[current].querySelectorAll('input,select,textarea')){if(!el.checkValidity()){showError(el.type==="checkbox"?"Please tick all three acknowledgements before submitting.":"Please check the highlighted field.");el.reportValidity();return false;}}if(current===1&&!form.querySelector('[name=audiences]:checked')){showError('Please choose at least one group you can reach.');return false;}return true;}
 function values(){const data=Object.fromEntries(new FormData(form));data.audiences=[...form.querySelectorAll('[name=audiences]:checked')].map(x=>x.value);return data;}
 function review(){const target=document.querySelector('#review');target.replaceChildren();const data=values(); for(const key of ['full_name','email','phone','state','city','occupation','qualification','profile_url','motivation','experience','outreach_plan','availability','audiences']){const row=document.createElement('div');row.className='review-row';const title=document.createElement('b');title.textContent=key.replaceAll('_',' ').replace(/^./,x=>x.toUpperCase());const answer=document.createElement('span');answer.textContent=Array.isArray(data[key])?data[key].join(', '):data[key]||'Not provided';row.append(title,answer);target.append(row);}}
 function show(){error.hidden=true;steps.forEach((s,i)=>s.hidden=i!==current);progress.forEach((s,i)=>{s.classList.toggle('active',i===current);if(i===current)s.setAttribute('aria-current','step');else s.removeAttribute('aria-current');});prev.hidden=current===0;next.hidden=current===2;submit.hidden=current!==2;document.querySelector('#step-count').textContent=`Step ${current+1} of 3`;if(current===2){review();if(captchaReady&&widget===undefined)mountCaptcha();}steps[current].querySelector('h3').setAttribute('tabindex','-1');steps[current].querySelector('h3').focus({preventScroll:true});}
 next.addEventListener('click',()=>{error.hidden=true;if(valid()){current++;show();}});prev.addEventListener('click',()=>{if(!busy){current--;show();}});
 form.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&current<2){e.preventDefault();next.click();}});
 // Avoid native validation trying to focus required fields in hidden steps.
 form.noValidate=true;
 async function sendApplication(e){
  e.preventDefault();if(busy)return;error.hidden=true;
  if(current!==2){if(valid()){current++;show();}return;}
  if(!valid())return;
  if(!config.endpoint||!config.turnstileSiteKey){showError('The application connection is not configured yet. Please contact MUA.');return;}
  if(!captchaToken){showError('Please wait for the security check to finish. If it does not appear, refresh the page or disable extensions blocking it.');return;}
  busy=true;submit.disabled=true;prev.disabled=true;submit.textContent='Submitting…';
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
   const data=values();data.turnstileToken=captchaToken;
   const response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:controller.signal});
   let result;try{result=await response.json();}catch{throw new Error('The application server returned an unexpected response. Please contact MUA.');}
   if(!response.ok||!result.reference)throw new Error(result.message||'We could not confirm your application. Please try again.');
   form.hidden=true;document.querySelector('#reference').textContent=result.reference;document.querySelector('#success').hidden=false;document.querySelector('#success').scrollIntoView({behavior:'smooth',block:'center'});
  }catch(err){
   showError(err.name==='AbortError'?'The connection timed out. Please try again.':err.message==='Failed to fetch'?'Cannot reach the application server. Please check your internet connection or contact MUA.':err.message||'Unable to submit. Please try again.');
   captchaToken='';try{if(widget!==undefined)window.turnstile?.reset(widget);}catch{}
  }finally{clearTimeout(timer);busy=false;submit.disabled=false;prev.disabled=false;submit.textContent='Submit application ↗';}
 }
 // Explicit click handling avoids browser submission quirks and always gives feedback.
 submit.type='button';submit.addEventListener('click',sendApplication);
 form.addEventListener('submit',sendApplication);
 function mountCaptcha(){
  try{widget=window.turnstile.render('#captcha',{
   sitekey:config.turnstileSiteKey,action:'ambassador-apply',
   callback:token=>{captchaToken=token;},
   'expired-callback':()=>{captchaToken='';},
   'error-callback':()=>{captchaToken='';showError('The security check could not complete. Please refresh and try again.');}
  });}catch{showError('The security check could not start. Please refresh or contact MUA.');}
 }
 if(config.turnstileSiteKey){
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.onload=()=>{captchaReady=true;if(current===2)mountCaptcha();};
  script.onerror=()=>showError('The security check could not load. Please refresh or try again later.');
  document.head.append(script);
 }
})();
