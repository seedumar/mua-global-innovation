export const stageLabels={letter:'Issue appointment',invite:'Link or invite account',signin:'Awaiting portal sign-in',paused:'Access paused',ready:'Ready to start'};
export function nextStage(detail){
 if(detail.application.status!=='accepted')return 'not_accepted';
 if(!detail.letter_reference)return 'letter';
 if(!detail.member_id)return 'invite';
 if(!detail.member?.active)return 'paused';
 return detail.member.first_portal_sign_in_at?'ready':'signin';
}
export function canInvite(detail){return nextStage(detail)==='invite'&&detail.candidates.length===0;}
export function followupDate(value){
 if(value===''||value==null)return null;
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'0001-01-01')throw new Error('Choose a valid follow-up date.');
 const parsed=new Date(value+'T12:00:00Z');
 if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)throw new Error('Choose a valid follow-up date.');
 return value;
}
export function followupLabel(value,today,stage){
 if(!value)return 'No follow-up scheduled';
 const label=new Date(value+'T12:00:00Z').toLocaleDateString('en-NG',{timeZone:'Africa/Lagos',day:'numeric',month:'short',year:'numeric'});
 if(stage==='ready'||stage==='not_accepted')return 'Previous follow-up: '+label+' · no active reminder';
 return (value<today?'Overdue: ':value===today?'Due today: ':'Follow-up: ')+label;
}
export function onboardingFollowupArgs(detail,memberId,notes,value){return {...onboardingArgs(detail,memberId,notes),p_followup_date:followupDate(value)};}
export function onboardingArgs(detail,memberId,notes){
 if(detail.application.status!=='accepted')throw new Error('Accepted application required.');
 if(typeof notes!=='string'||notes.length>2000)throw new Error('Notes must be at most 2000 characters.');
 if(memberId&&(!detail.letter_reference||!detail.candidates.some(c=>c.id===memberId)&&detail.member_id!==memberId))throw new Error('Choose a matching account after issuing the appointment letter.');
 return {p_application_id:detail.application.id,p_member_id:memberId||null,p_notes:notes.trim(),p_expected_revision:detail.revision};
}
