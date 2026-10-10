// Application review stays inside the dashboard, with the existing sidebar.
const nav=document.querySelector('#portal-navigation'),workspace=document.querySelector('#workspace'),dashboard=document.querySelector('main.dashboard');
if(nav&&workspace&&dashboard){
 const sessionKey='mua-portal-session-v1',returnKey='mua-review-return-view';
 let active=false,frame=null,sessionOnOpen='';
 let link=nav.querySelector('[data-application-review]');
 if(!link){link=document.createElement('a');link.id='application-review-link';link.href='applications.html';link.className='nav-item admin-only';link.textContent='Application review';link.dataset.applicationReview='true';link.hidden=true;nav.append(link);}
 const panel=document.createElement('section');panel.id='application-review-panel';panel.hidden=true;dashboard.append(panel);
 const pending=sessionStorage.getItem(returnKey);sessionStorage.removeItem(returnKey);let pendingApplied=false;
 function sync(){
  document.querySelectorAll('[data-application-review]').forEach(n=>{n.hidden=workspace.hidden});
  const drawer=document.querySelector('#drawer-navigation');
  if(drawer&&!drawer.querySelector('[data-application-review]')){const copy=link.cloneNode(true);copy.removeAttribute('id');drawer.append(copy);}
  if(workspace.hidden){active=false;panel.hidden=true;if(frame){frame.remove();frame=null;}}
  if(pending&&!pendingApplied&&!workspace.hidden){pendingApplied=true;document.querySelector('[data-view="'+CSS.escape(pending)+'"]')?.click();}
 }
 function resize(){if(frame)frame.style.height=Math.max(580,window.innerHeight-190)+'px'}
 function open(){
  active=true;sessionOnOpen=sessionStorage.getItem(sessionKey)||'';
  for(const section of dashboard.children)if(section.tagName==='SECTION')section.hidden=section!==panel;
  for(const n of document.querySelectorAll('[data-view]')){n.classList.remove('active');n.removeAttribute('aria-current');}
  document.querySelectorAll('[data-application-review]').forEach(n=>{n.classList.add('active');n.setAttribute('aria-current','page')});
  document.querySelector('#dashboard-title').textContent='Ambassador applications.';
  if(!frame){frame=document.createElement('iframe');frame.title='Ambassador application review';frame.src='applications.html?embedded=1';frame.style.cssText='width:100%;display:block;border:0;background:#f3f6fa;border-radius:12px';panel.append(frame);resize();}
  const menu=document.querySelector('#mobile-nav-dialog');if(menu?.open)menu.close();
  document.body.classList.remove('menu-open');const toggle=document.querySelector('#mobile-menu-toggle');if(toggle){toggle.setAttribute('aria-expanded','false');toggle.textContent='Menu';toggle.focus();}
 }
 document.addEventListener('click',event=>{
  const review=event.target.closest('[data-application-review]');if(review){event.preventDefault();open();return;}
  const target=event.target.closest('[data-view]');if(target&&active){
   // A refreshed session in the embedded panel must also reach the dashboard API.
   if((sessionStorage.getItem(sessionKey)||'')!==sessionOnOpen){event.preventDefault();event.stopImmediatePropagation();sessionStorage.setItem(returnKey,target.dataset.view);location.reload();return;}
   active=false;panel.hidden=true;document.querySelectorAll('[data-application-review]').forEach(n=>{n.classList.remove('active');n.removeAttribute('aria-current')});
  }
  if(event.target.closest('#refresh')&&active){event.preventDefault();event.stopImmediatePropagation();if(frame)frame.src='applications.html?embedded=1&refresh='+Date.now();}
 },true);
 window.addEventListener('message',event=>{if(frame&&event.source===frame.contentWindow&&event.origin===location.origin&&event.data?.type==='mua-review-signout')location.reload()});
 window.addEventListener('resize',resize);
 new MutationObserver(sync).observe(workspace,{attributes:true,attributeFilter:['hidden']});
 const drawer=document.querySelector('#drawer-navigation');if(drawer)new MutationObserver(sync).observe(drawer,{childList:true});sync();
}
