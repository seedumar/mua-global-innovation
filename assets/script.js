const header=document.querySelector('.site-header');
const menu=document.querySelector('.menu-toggle');
const nav=document.querySelector('.primary-nav');
const links=[...document.querySelectorAll('.primary-nav a[href^="#"]')];
const navLinks=[...document.querySelectorAll('.primary-nav a')];

const compactNavigation=window.matchMedia('(max-width:1100px)');
const closeMenu=()=>{if(!menu||!nav)return;menu.classList.remove('open');nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');nav.inert=compactNavigation.matches;document.body.style.overflow=''};
menu?.addEventListener('click',()=>{const open=!nav.classList.contains('open');menu.classList.toggle('open',open);nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');nav.inert=!open&&compactNavigation.matches;document.body.style.overflow=open?'hidden':''});
compactNavigation.addEventListener('change',()=>{const moveFocus=compactNavigation.matches&&nav?.contains(document.activeElement);closeMenu();if(moveFocus)menu?.focus();});
closeMenu();
navLinks.forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{
  if(!nav?.classList.contains('open'))return;
  if(event.key==='Escape'){closeMenu();menu?.focus();}
  if(event.key==='Tab'){
    const last=navLinks[navLinks.length-1];
    if(event.shiftKey&&document.activeElement===menu){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();menu?.focus();}
  }
});
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',window.scrollY>24),{passive:true});

const sections=[...document.querySelectorAll('main section[id]')];
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){links.forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+entry.target.id));}})},{rootMargin:'-35% 0px -55%',threshold:0});
sections.forEach(section=>observer.observe(section));

document.querySelector('#contact-form')?.addEventListener('submit',event=>{
  event.preventDefault();
  const data=new FormData(event.currentTarget);
  const extra = [...event.currentTarget.querySelectorAll('[data-question]')].filter(field=>field.value&&(!['checkbox','radio'].includes(field.type)||field.checked)).map(field=>`${field.dataset.question} ${field.value}`).join('\n');
  const message=`Hello MUA Global Innovation Ltd,%0A%0AMy name is ${encodeURIComponent(data.get('name'))}.%0AContact: ${encodeURIComponent(data.get('contact'))}%0AService: ${encodeURIComponent(data.get('service'))}%0A%0AProject details:%0A${encodeURIComponent(data.get('message'))}${extra ? '%0A%0A' + encodeURIComponent(extra) : ''}`;
  const url=`https://wa.me/2347068744549?text=${message}`;
  const opened=window.open(url,'_blank','noopener,noreferrer');
  const note=document.querySelector('#form-note');
  note.replaceChildren(document.createTextNode('WhatsApp should open with your enquiry. Please tap send there to complete it. If it did not open, '));
  const fallback=document.createElement('a');fallback.href=url;fallback.target='_blank';fallback.rel='noopener noreferrer';fallback.textContent='open WhatsApp here';note.append(fallback,document.createTextNode('.'));
});

const year=document.querySelector('#year');
if(year) year.textContent=new Date().getFullYear();

document.querySelectorAll('.footer-bottom a[href="#top"], .footer-bottom a[href="#main"]').forEach(link=>{
  link.addEventListener('click',event=>{
    event.preventDefault();
    window.scrollTo({
      top:0,
      left:0,
      behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'
    });
    window.history.replaceState(null,'',window.location.pathname+window.location.search);
  });
});

if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  const revealItems=[...document.querySelectorAll('main section > .container, .service-card, .value-grid article, .solution-detail, .venture-principles article')];
  revealItems.forEach(item=>item.classList.add('reveal-ready'));
  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('revealed');revealObserver.unobserve(entry.target);}
    });
  },{threshold:.08,rootMargin:'0px 0px -45px'});
  revealItems.forEach(item=>revealObserver.observe(item));
}

// Select the service requested from a quotation button.
const requestedService=new URLSearchParams(window.location.search).get('service');
const serviceSelect=document.querySelector('#contact-form select[name="service"]');
if(requestedService&&serviceSelect&&[...serviceSelect.options].some(option=>option.value===requestedService)) serviceSelect.value=requestedService;
