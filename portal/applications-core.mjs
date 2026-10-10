export const statuses=['new','shortlisted','accepted','declined'];
export function reviewArgs(record,status,notes){
 if(!statuses.includes(status))throw new Error('Choose a valid status.');
 if(typeof notes!=='string'||notes.length>5000)throw new Error('Notes must be at most 5000 characters.');
 if(!Number.isInteger(record.review_version))throw new Error('Run application-review.sql before reviewing applications.');
 return {p_id:record.id,p_status:status,p_notes:notes.trim(),p_expected_version:record.review_version};
}
export function applicationQuery({search='',status='',state='',page=0}={}){
 const q=new URLSearchParams({select:'id,reference,full_name,email,state,city,qualification,status,created_at',order:'created_at.desc,id.desc',limit:'13',offset:String(page*12)});
 if(status){if(!statuses.includes(status))throw new Error('Invalid status');q.set('status','eq.'+status)}
 if(state)q.set('state','eq.'+state);
 const cleaned=search.replace(/[^\p{L}\p{N}@ ._+-]/gu,'').trim().slice(0,100);
 if(cleaned)q.set('or',`(full_name.ilike.*${cleaned}*,email.ilike.*${cleaned}*,reference.ilike.*${cleaned}*)`);
 return '/rest/v1/mua_ambassador_applications?'+q;
}
