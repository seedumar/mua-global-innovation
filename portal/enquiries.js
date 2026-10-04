export const enquiryStatuses={new:'New',contacted:'Contacted',quoted:'Quoted',won:'Won',closed:'Closed'};
export function enquiryDue(row,today){return !['won','closed'].includes(row.status)&&Boolean(row.follow_up_date)&&row.follow_up_date<=today;}
export function filterEnquiries(rows,{search='',status='',dueOnly=false,today}){
  const needle=search.trim().toLowerCase();
  return rows.filter(row=>(!status||row.status===status)&&(!dueOnly||enquiryDue(row,today))&&(!needle||[row.full_name,row.contact_details,row.organisation,row.service_name,row.assigned_to].join(' ').toLowerCase().includes(needle)));
}
export function createEnquiryInbox(api,{element,button,labelRow,action,date,lagosToday,notify}){
  const $=selector=>document.querySelector(selector);let rows=[],error='',current;
  function render(){
    const today=lagosToday(), visible=filterEnquiries(rows,{search:$('#enquiry-search').value,status:$('#enquiry-status-filter').value,dueOnly:$('#enquiry-due-filter').checked,today});
    $('#enquiry-error').hidden=!error;$('#enquiry-error').textContent=error;
    const stats=$('#enquiry-stats');stats.replaceChildren();
    for(const [label,value] of [['All enquiries',rows.length],['New enquiries',rows.filter(r=>r.status==='new').length],['Follow-ups due',rows.filter(r=>enquiryDue(r,today)).length],['Won',rows.filter(r=>r.status==='won').length]]){
      const card=element('div',undefined,'stat');card.append(element('strong',String(value)),element('span',label));stats.append(card);
    }
    const list=$('#enquiry-list');list.replaceChildren();$('#empty-enquiries').hidden=Boolean(visible.length)||Boolean(error);
    for(const row of visible){
      const tr=element('tr'),client=element('td');client.append(element('strong',row.organisation||row.full_name),element('small',row.organisation?row.full_name+' · '+row.contact_details:row.contact_details),element('small','Received '+date(row.created_at)));
      const service=element('td');service.append(element('strong',row.service_name),element('small',row.preferred_timing||'Timing not specified'));
      const progress=element('td');progress.append(element('span',enquiryStatuses[row.status],'badge '+row.status));
      const follow=element('td',row.follow_up_date?date(row.follow_up_date):'Not scheduled');if(enquiryDue(row,today))follow.append(element('small','Follow-up due'));
      const actions=element('td');actions.append(button('View / Update',()=>open(row)));
      tr.append(client,service,progress,element('td',row.assigned_to||'Unassigned'),follow,actions);labelRow(tr,['Client & contact','Service','Progress','Assigned to','Follow-up','Action']);list.append(tr);
    }
  }
  function open(row){
    current=row;const form=$('#enquiry-form');form.reset();form.querySelector('.form-message').textContent='';
    const brief=$('#enquiry-brief');brief.replaceChildren();
    for(const [label,value] of [['Name',row.full_name],['Contact',row.contact_details],['Organisation',row.organisation||'Not supplied'],['Service',row.service_name],['Timing',row.preferred_timing||'Not supplied'],['Project details',row.details]]){brief.append(element('dt',label),element('dd',value));}
    for(const key of ['status','assigned_to','follow_up_date','notes'])form.elements.namedItem(key).value=row[key]||'';
    $('#enquiry-dialog').showModal();
  }
  async function load(){
    try{rows=await api.enquiries();error='';}catch{rows=[];error='Website enquiries could not be loaded. For the first update, run website-enquiries.sql in Supabase. Otherwise, check your connection and refresh.';}
    render();
  }
  $('#enquiry-search').addEventListener('input',render);$('#enquiry-status-filter').addEventListener('change',render);$('#enquiry-due-filter').addEventListener('change',render);
  $('#enquiry-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;action(async()=>{
    if(!current)throw new Error('Reopen the enquiry before saving.');const data=new FormData(form);
    await api.rpc('portal_update_enquiry',{p_id:current.id,p_expected_updated_at:current.updated_at,p_status:data.get('status'),p_assigned_to:String(data.get('assigned_to')||'').trim(),p_follow_up_date:data.get('follow_up_date')||null,p_notes:String(data.get('notes')||'').trim()});
    $('#enquiry-dialog').close();await load();notify('Enquiry updated.');
  },form);});
  return {load,render};
}
