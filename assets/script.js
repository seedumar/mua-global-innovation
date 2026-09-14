const header=document.querySelector('.site-header');
const menu=document.querySelector('.menu-toggle');
const nav=document.querySelector('.primary-nav');
const links=[...document.querySelectorAll('.primary-nav a[href^="#"]')];

const closeMenu=()=>{menu.classList.remove('open');nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');document.body.style.overflow=''};
menu?.addEventListener('click',()=>{const open=!nav.classList.contains('open');menu.classList.toggle('open',open);nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');document.body.style.overflow=open?'hidden':''});
links.forEach(link=>link.addEventListener('click',closeMenu));
window.addEventListener('scroll',()=>header.classList.toggle('scrolled',window.scrollY>24),{passive:true});

const sections=[...document.querySelectorAll('main section[id]')];
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){links.forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+entry.target.id));}})},{rootMargin:'-35% 0px -55%',threshold:0});
sections.forEach(section=>observer.observe(section));

document.querySelector('#contact-form')?.addEventListener('submit',event=>{
  event.preventDefault();
  const data=new FormData(event.currentTarget);
  const message=`Hello MUA Global Innovation Ltd,%0A%0AMy name is ${encodeURIComponent(data.get('name'))}.%0AContact: ${encodeURIComponent(data.get('contact'))}%0AService: ${encodeURIComponent(data.get('service'))}%0A%0AProject details:%0A${encodeURIComponent(data.get('message'))}`;
  window.open(`https://wa.me/2347068744549?text=${message}`,'_blank','noopener,noreferrer');
  document.querySelector('#form-note').textContent='Your enquiry is ready in WhatsApp. Please tap send to complete it.';
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
