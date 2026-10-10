import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {welcomeProgress} from '../welcome-core.mjs';
const profile={id:'me',role:'ambassador',active:true};
function navigation(adminArea,role){
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const definition=app.slice(app.indexOf('function showView('),app.indexOf('function renderProposals('));
 const nodes=Object.fromEntries(['welcome','proposals','leads','members','services','performance','projects','commissions','enquiries'].map(name=>['#'+name+'-view',{hidden:name!=='proposals'}]));nodes['#dashboard-title']={textContent:'Initial'};
 const show=vm.runInNewContext(definition+';showView',{adminArea,profile:{role},$:s=>nodes[s],setMobileMenu(){},document:{querySelectorAll(){return []}}});return {show,nodes};
}
test('Ambassadors can navigate to welcome without leaving proposals visible',()=>{const {show,nodes}=navigation(false,'ambassador');show('welcome');assert.equal(nodes['#welcome-view'].hidden,false);assert.equal(nodes['#proposals-view'].hidden,true);assert.equal(nodes['#dashboard-title'].textContent,'Your MUA welcome pack.');show('proposals');assert.equal(nodes['#welcome-view'].hidden,true);});
test('Admin dashboards do not enter the ambassador welcome view',()=>{for(const adminArea of [true,false]){const {show,nodes}=navigation(adminArea,'admin');show('welcome');assert.equal(nodes['#welcome-view'].hidden,true);assert.equal(nodes['#proposals-view'].hidden,false);}});
test('New ambassadors have three pending steps',()=>{const rows=welcomeProgress(profile,[],[]);assert.equal(rows.length,3);assert(rows.every(row=>row.done===false));});
test('Another ambassador’s records cannot complete my checklist',()=>{const rows=welcomeProgress(profile,[{owner_id:'other'}],[{owner_id:'other',status:'approved'}]);assert(rows.every(row=>row.done===false));});
test('A draft completes preparation but not submission',()=>{const rows=welcomeProgress(profile,[{owner_id:'me'}],[{owner_id:'me',status:'draft'}]);assert.deepEqual(rows.map(row=>row.done),[true,true,false]);});
test('Submitted, returned and approved proposals confirm a submission',()=>{for(const status of ['submitted','changes_requested','approved'])assert.equal(welcomeProgress(profile,[],[{owner_id:'me',status}])[2].done,true);});
test('Unavailable outreach is unknown rather than falsely incomplete',()=>{const rows=welcomeProgress(profile,[],[],'Network unavailable');assert.equal(rows[0].done,null);assert.match(rows[0].description,/could not be loaded/);});
test('Inactive accounts and admins receive no ambassador checklist',()=>{for(const p of [null,{...profile,active:false},{...profile,role:'admin'}])assert.deepEqual(welcomeProgress(p,[],[]),[]);});
test('Welcome markup uses existing support contacts and separates commission from client deposit',()=>{const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/id="welcome-view"/);assert.match(html,/tel:\+2347068744549/);assert.match(html,/tel:\+2348025063991/);assert.match(html,/60% client deposit/);assert.match(html,/First 50%/);assert.match(html,/Remaining 50%/);assert.match(html,/Payable.*eligible for payment/);assert.match(html,/data-view="welcome"/);});
test('Welcome module DOM selectors each resolve in ambassador HTML',()=>{const js=readFileSync(new URL('../welcome.js',import.meta.url),'utf8'),html=readFileSync(new URL('../index.html',import.meta.url),'utf8');for(const id of new Set([...js.matchAll(/\$\('#([^\']+)'\)/g)].map(m=>m[1])))assert.equal([...html.matchAll(new RegExp('id="'+id+'"','g'))].length,1,id);});
