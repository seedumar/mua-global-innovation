export function welcomeProgress(profile,leads,proposals,leadError=''){
 if(!profile?.active||profile.role!=='ambassador')return [];
 const ownLeads=leads.filter(row=>row.owner_id===profile.id);
 const ownProposals=proposals.filter(row=>row.owner_id===profile.id);
 return [
  {title:'Record your first client lead',done:leadError?null:ownLeads.length>0,view:'leads',description:leadError?'Outreach records could not be loaded. Refresh or contact MUA.':'Add the organisation, contact details, conversation and next follow-up.'},
  {title:'Prepare your first proposal',done:ownProposals.length>0,view:'proposals',description:'Choose an available service and enter the recipient’s needs and address.'},
  {title:'Submit a proposal for MUA review',done:ownProposals.some(row=>['submitted','changes_requested','approved'].includes(row.status)),view:'proposals',description:'Open your draft and submit it. Address feedback before sharing the approved letter.'}
 ];
}
