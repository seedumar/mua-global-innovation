// Public intake only. No client can read enquiries through this endpoint.
const services = ['School website','Business website','Organisation website','Software development','Networking','IT Training','CCTV Installation','Solar Installation','Product strategy and design','Digital transformation','MUA Trust Homes','Partnership or investment','Something else'];
const timings = ['', 'As soon as practical','Within a month','Within three months','Exploring options'];
const root = Deno.env.get('SUPABASE_URL');
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const salt = Deno.env.get('ENQUIRY_RATE_SALT');
const allowed = (Deno.env.get('ENQUIRY_ALLOWED_ORIGINS') || '').split(',').map(s=>s.trim()).filter(Boolean);
Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin') || '';
  const permitted = allowed.includes(origin);
  const headers: Record<string,string> = {'Content-Type':'application/json','Vary':'Origin','Access-Control-Allow-Headers':'apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if (permitted) headers['Access-Control-Allow-Origin'] = origin;
  const reply = (status:number, body:object) => new Response(JSON.stringify(body), {status,headers});
  if (!root || !secret || !salt || !allowed.length) return reply(503,{message:'Enquiries are temporarily unavailable. Please contact MUA on WhatsApp.'});
  if (!permitted) return reply(403,{message:'This website is not allowed.'});
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (request.method !== 'POST') return reply(405,{message:'POST required.'});
  try {
    // Bound actual streamed bytes, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return reply(400,{message:'Enter your enquiry details.'});
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>24000){await reader.cancel();return reply(413,{message:'Please shorten your enquiry.'});} chunks.push(value); }
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    let body; try { body=JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply(400,{message:'Invalid enquiry. Please try again.'}); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400,{message:'Invalid enquiry.'});
    const text = (key:string,max:number,required=false) => {const value=body[key];if(typeof value!=='string' || value.length>max || (required&&!value.trim()))throw new Error('Please check your enquiry details.');return value.trim();};
    const trap=text('website',200);
    if (trap) return reply(400,{message:'Please leave the website field empty.'});
    const id=text('request_id',36,true);
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return reply(400,{message:'Refresh the page and try again.'});
    const name=text('name',200,true), contact=text('contact',254,true), service=text('service',200,true), details=text('message',5000,true), organisation=text('organisation',200), timing=text('timing',100);
    const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const phone=/^[+\d\s().-]+$/.test(contact)&&contact.replace(/\D/g,'').length>=7&&contact.replace(/\D/g,'').length<=15;
    if(!email&&!phone) return reply(400,{message:'Enter a valid phone number or email address.'});
    if(!services.includes(service)||!timings.includes(timing)) return reply(400,{message:'Select a service and preferred timing from the list.'});
    const identity=email ? contact.toLowerCase() : contact.replace(/\D/g,'');
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+'|'+identity));
    const rateKey=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
    const response=await fetch(root+'/rest/v1/rpc/portal_receive_enquiry',{method:'POST',headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({p_id:id,p_name:name,p_contact:contact,p_service:service,p_details:details,p_organisation:organisation,p_timing:timing,p_rate_key:rateKey}),signal:AbortSignal.timeout(15000)});
    if(!response.ok){const error=await response.json().catch(()=>({}));if(error.message==='enquiry_rate_limit')return reply(429,{message:'Too many enquiries recently. Please contact MUA on WhatsApp or try again later.'});if(error.message==='enquiry_request_conflict')return reply(409,{message:'Refresh the page before submitting a different enquiry.'});return reply(503,{message:'We could not confirm your enquiry. Retry with the same details or use WhatsApp.'});}
    return reply(200,{request_id:id,message:'Your enquiry has been saved. MUA will contact you using the details provided.'});
  } catch(error) { return reply(error instanceof Error && error.message==='Please check your enquiry details.' ? 400 : 503,{message: error instanceof Error && error.message==='Please check your enquiry details.' ? error.message : 'We could not confirm your enquiry. Retry or contact MUA on WhatsApp.'}); }
});
