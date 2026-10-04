import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {validateEnquiry,whatsappURL,sendEnquiry} from '../../assets/enquiry-core.mjs';
import {enquiryDue,filterEnquiries} from '../enquiries.js';
const data={request_id:'2f854abc-6279-47bc-a062-d7d2a9f56721',name:'Client',contact:'08025063991',service:'Business website',message:'A & B <script> need a website',organisation:'A & B',timing:'Within a month',website:''};
const config={supabaseUrl:'https://project.supabase.co',publishableKey:'test-public-key'};
test('contact validation accepts email and formatted phones and rejects arbitrary text',()=>{
 assert.equal(validateEnquiry(data),'');assert.equal(validateEnquiry({...data,contact:'client@example.com'}),'');assert.equal(validateEnquiry({...data,contact:'+234 (802) 506-3991'}),'');assert(validateEnquiry({...data,contact:'call me'}));assert(validateEnquiry({...data,message:'  '}));
});
test('public submission confirms the matching request and exposes recoverable failures',async()=>{
 let request;const fetcher=async(url,options)=>{request={url,options};return new Response(JSON.stringify({request_id:data.request_id}));};
 await sendEnquiry(config,data,fetcher);assert(request.url.endsWith('/functions/v1/submit-enquiry'));assert.equal(JSON.parse(request.options.body).message,data.message);assert.equal(request.options.headers.Authorization,undefined);
 await assert.rejects(sendEnquiry(config,data,async()=>new Response('{"message":"Try later"}',{status:429})),/Try later/);
 await assert.rejects(sendEnquiry(config,data,async()=>new Response('{"request_id":"other"}')),/could not confirm/);
 await assert.rejects(sendEnquiry(config,data,async()=>new Response('not JSON')),/could not confirm/);
});
test('WhatsApp safely encodes client text and closed enquiries do not become overdue',()=>{
 const url=new URL(whatsappURL(data));assert(url.searchParams.get('text').includes(data.message));assert(url.searchParams.get('text').includes(data.organisation));
 const row={...data,status:'new',follow_up_date:'2026-10-04',full_name:'Client',service_name:'Business website',contact_details:data.contact,assigned_to:'Umar'};
 assert(enquiryDue(row,'2026-10-04'));assert(!enquiryDue({...row,status:'won'},'2026-10-05'));assert(!enquiryDue({...row,status:'closed'},'2026-10-05'));
 assert.equal(filterEnquiries([row],{search:'umar',dueOnly:true,today:'2026-10-04'}).length,1);assert.equal(filterEnquiries([row],{status:'quoted',today:'2026-10-04'}).length,0);
});
const source=fs.readFileSync(new URL('../backend/functions/submit-enquiry/index.ts',import.meta.url),'utf8');
function edge({dbStatus=200,dbMessage='',environment={}}={}){
 let handler,calls=[];
 const env={SUPABASE_URL:config.supabaseUrl,SUPABASE_SERVICE_ROLE_KEY:'server-only',ENQUIRY_RATE_SALT:'private-salt',ENQUIRY_ALLOWED_ORIGINS:'https://muaglobalinnovation.com',...environment};
 vm.runInNewContext(stripTypeScriptTypes(source),{Deno:{env:{get:key=>env[key]},serve:fn=>handler=fn},Response,TextDecoder,TextEncoder,Uint8Array,crypto,AbortSignal,fetch:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(dbStatus===200?data.request_id:{message:dbMessage}),{status:dbStatus});}});
 return {calls,invoke:(body=data,origin='https://muaglobalinnovation.com',method='POST')=>handler(new Request('https://project.supabase.co/functions/v1/submit-enquiry',{method,headers:{Origin:origin,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})}))};
}
test('edge accepts validated intake using server credentials and hashes the rate identity',async()=>{
 const app=edge();const result=await app.invoke();assert.equal(result.status,200);assert.equal((await result.json()).request_id,data.request_id);assert.equal(app.calls.length,1);
 const saved=JSON.parse(app.calls[0].options.body);assert.equal(saved.p_details,data.message);assert.match(saved.p_rate_key,/^[a-f0-9]{64}$/);assert(!saved.p_rate_key.includes(data.contact));assert.equal(saved.p_status,undefined);assert.equal(app.calls[0].options.headers.Authorization,'Bearer server-only');
});
test('edge rejects bad origins, spam trap, invalid fields, unbounded payloads and privileged field injection',async()=>{
 const app=edge();assert.equal((await app.invoke(data,'https://evil.invalid')).status,403);assert.equal((await app.invoke({...data,website:'bot'})).status,400);assert.equal((await app.invoke({...data,contact:'no contact'})).status,400);assert.equal((await app.invoke({...data,service:'Unsupported'})).status,400);assert.equal((await app.invoke({...data,name:'X'.repeat(201)})).status,400);assert.equal((await app.invoke({...data,message:'X'.repeat(25000)})).status,413);assert.equal(app.calls.length,0);
 assert.equal((await app.invoke({...data,status:'won',notes:'Injected',assigned_to:'attacker'})).status,200);const saved=JSON.parse(app.calls[0].options.body);assert.equal(saved.p_status,undefined);assert.equal(saved.p_notes,undefined);assert.equal(saved.p_assigned_to,undefined);
});
test('edge fails clearly on unavailable backend and rate limiting without exposing SQL or secrets',async()=>{
 const limited=edge({dbStatus:400,dbMessage:'enquiry_rate_limit'});assert.equal((await limited.invoke()).status,429);
 const failed=edge({dbStatus:500,dbMessage:'secret SQL error'});const response=await failed.invoke();assert.equal(response.status,503);assert(!JSON.stringify(await response.json()).includes('secret SQL'));
 assert.equal((await edge({environment:{ENQUIRY_RATE_SALT:''}}).invoke()).status,503);
 const app=edge();assert.equal((await app.invoke(data,undefined,'OPTIONS')).status,204);assert.equal(app.calls.length,0);
});
test('public form prevents concurrent submissions, retains retry identity and locks after confirmation',async()=>{
 const code=fs.readFileSync(new URL('../../assets/enquiry.js',import.meta.url),'utf8').replace(/^import .*;\n/,'');
 const controls=[{disabled:false},{disabled:false}],submit=controls[0],note={replaceChildren(...items){this.items=items}};let listener,attempts=0,ids=[],uuidCount=0,release;
 const form={reportValidity:()=>true,querySelector:selector=>selector==='button[type="submit"]'?submit:selector==='.wizard-actions'?{hidden:false}:null,querySelectorAll:()=>controls,addEventListener:(type,fn)=>listener=fn};
 const document={querySelector:selector=>selector==='#contact-form'?form:note,createElement:()=>({}),createTextNode:text=>text};
 const send=async(config,value)=>{ids.push(value.request_id);attempts++;if(attempts===1){await new Promise(resolve=>release=resolve);throw new TypeError('Network interrupted');}return {request_id:value.request_id};};
 vm.runInNewContext(code,{document,window:{MUA_PORTAL_CONFIG:config},validateEnquiry,whatsappURL,sendEnquiry:send,FormData:class{get(key){return data[key]}},crypto:{randomUUID:()=>{uuidCount++;return data.request_id}},console});
 const event={preventDefault(){}};
 const first=listener(event);await listener(event);assert.equal(attempts,1);assert(controls.every(c=>c.disabled));release();await first;
 assert(controls.every(c=>!c.disabled));await listener(event);assert.equal(attempts,2);assert.equal(uuidCount,1);assert.equal(ids[0],ids[1]);assert(controls.every(c=>c.disabled));assert.equal(submit.textContent,'Enquiry received ✓');await listener(event);assert.equal(attempts,2);
});
