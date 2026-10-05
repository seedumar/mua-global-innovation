const audienceOptions=['Schools','Businesses','NGOs','Community groups','Students','Other'];
const occupationOptions=['Student','NYSC member','Employed','Self-employed','Other'];
const qualificationOptions=['SSCE','NCE','ND','HND','Bachelor’s degree','Postgraduate qualification','Other'];
const hoursOptions=['Under 3 hours','3–5 hours','6–10 hours','More than 10 hours'];
const states='Abia,Adamawa,Akwa Ibom,Anambra,Bauchi,Bayelsa,Benue,Borno,Cross River,Delta,Ebonyi,Edo,Ekiti,Enugu,FCT Abuja,Gombe,Imo,Jigawa,Kaduna,Kano,Katsina,Kebbi,Kogi,Kwara,Lagos,Nasarawa,Niger,Ogun,Ondo,Osun,Oyo,Plateau,Rivers,Sokoto,Taraba,Yobe,Zamfara'.split(',');
Deno.serve(async(req:Request)=>{
 const origins=(Deno.env.get('ALLOWED_ORIGINS')||'https://muaglobalinnovation.com,https://www.muaglobalinnovation.com').split(',').map(x=>x.trim());
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(status:number,message:string,extra={})=>new Response(JSON.stringify({message,...extra}),{status,headers});
 if(!origins.includes(origin))return reply(403,'Request not permitted.');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,'Use POST.');
 const secret=Deno.env.get('TURNSTILE_SECRET_KEY'), url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret||!url||!key)return reply(503,'Applications are temporarily unavailable.');
 try{
 const raw=await req.text();if(new TextEncoder().encode(raw).length>20000)return reply(413,'Application too large.');
 const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))return reply(400,'Invalid application.');
 if(data.website)return reply(400,'Unable to submit this application.');
 const record:Record<string,unknown>={};
 for(const field of ['full_name','email','phone','state','city','occupation','qualification','motivation','experience','outreach_plan','availability']){
 const long=['motivation','experience','outreach_plan'].includes(field);const value=data[field];
 if(typeof value!=='string'||value.trim().length<(long?20:1)||value.length>(long?2000:200))return reply(400,`Please check ${field.replaceAll('_',' ')}.`);
 record[field]=value.trim();
 }
 record.email=(record.email as string).toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email as string))return reply(400,'Please enter a valid email.');
 if(!/^[+\d\s()-]{7,30}$/.test(record.phone as string))return reply(400,'Please enter a valid phone number.');
 for(const [field,options] of Object.entries({state:states,occupation:occupationOptions,qualification:qualificationOptions,availability:hoursOptions}))if(!options.includes(record[field] as string))return reply(400,`Please check ${field}.`);
 if(!Array.isArray(data.audiences)||data.audiences.length<1||data.audiences.length>6||data.audiences.some((x:unknown)=>typeof x!=='string'||!audienceOptions.includes(x)))return reply(400,'Please choose valid outreach groups.');
 record.audiences=[...new Set(data.audiences)];
 if(data.accurate!=='on'||data.terms!=='on'||data.privacy!=='on')return reply(400,'Please accept the application acknowledgements.');
 const profile=data.profile_url||'';if(typeof profile!=='string'||profile.length>200)return reply(400,'Please check your profile link.');
 if(profile){try{if(!['https:','http:'].includes(new URL(profile).protocol))throw new Error();}catch{return reply(400,'Please enter a valid profile URL.');}}
 record.profile_url=profile;
 if(typeof data.turnstileToken!=='string'||data.turnstileToken.length>2048)return reply(400,'Please complete the security check.');
 const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret,response:data.turnstileToken}),signal:AbortSignal.timeout(10000)});
 const checked=await verification.json();
 const hostnames=origins.map(x=>new URL(x).hostname);
 if(!checked.success||checked.action!=='ambassador-apply'||!hostnames.includes(checked.hostname))return reply(400,'Security check expired. Please try again.');
 const reference='MUA-AMB-'+crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase();record.reference=reference;record.consent_version='2026-10-05';
 const saved=await fetch(`${url}/rest/v1/mua_ambassador_applications`,{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':`Bearer ${key}`,'Prefer':'return=minimal'},body:JSON.stringify(record),signal:AbortSignal.timeout(10000)});
 if(!saved.ok)return reply(503,'We could not save your application. Please try again later.');
 return reply(201,'Application received.',{reference});
 }catch{return reply(400,'We could not process the application. Check your connection and try again.');}
});
