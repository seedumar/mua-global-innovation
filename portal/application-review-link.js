// Add one link without replacing the existing dashboard or its navigation code.
const nav=document.querySelector('#portal-navigation');
if(nav&&!document.querySelector('#application-review-link')){
 const link=document.createElement('a');link.id='application-review-link';link.href='applications.html';link.className='nav-item admin-only';link.textContent='Application review';link.hidden=true;nav.append(link);
 const workspace=document.querySelector('#workspace');
 const update=()=>{link.hidden=!workspace||workspace.hidden;};
 if(workspace)new MutationObserver(update).observe(workspace,{attributes:true,attributeFilter:['hidden']});update();
}
