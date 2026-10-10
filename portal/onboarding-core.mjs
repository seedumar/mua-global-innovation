export const stageLabels={letter:'Issue appointment',invite:'Link or invite account',signin:'Awaiting portal sign-in',paused:'Access paused',ready:'Ready to start'};
export function nextStage(detail){
 if(detail.application.status!=='accepted')return 'not_accepted';
 if(!detail.letter_reference)return 'letter';
 if(!detail.member_id)return 'invite';
 if(!detail.member?.active)return 'paused';
 return detail.member.first_portal_sign_in_at?'ready':'signin';
}
export function canInvite(detail){return nextStage(detail)==='invite'&&detail.candidates.length===0;}
export function onboardingArgs(detail,memberId,notes){
 if(detail.application.status!=='accepted')throw new Error('Accepted application required.');
 if(typeof notes!=='string'||notes.length>2000)throw new Error('Notes must be at most 2000 characters.');
 if(memberId&&(!detail.letter_reference||!detail.candidates.some(c=>c.id===memberId)&&detail.member_id!==memberId))throw new Error('Choose a matching account after issuing the appointment letter.');
 return {p_application_id:detail.application.id,p_member_id:memberId||null,p_notes:notes.trim(),p_expected_revision:detail.revision};
}
