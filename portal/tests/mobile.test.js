import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('mobile table rows retain table roles and labelled values',()=>{
 const definition=app.slice(app.indexOf('function labelRow('),app.indexOf('function setMobileMenu('));
 const labelRow=vm.runInNewContext(definition+';labelRow');
 const node=()=>({attributes:{},setAttribute(key,value){this.attributes[key]=value}});
 const row=node();row.children=[node(),node(),node()];labelRow(row,['Client','Cost','Action']);
 assert.equal(row.attributes.role,'row');
 assert.deepEqual(row.children.map(cell=>cell.attributes['data-label']),['Client','Cost','Action']);
 assert(row.children.every(cell=>cell.attributes.role==='cell'));
});
test('menu toggle updates navigation state, label and keyboard focus',()=>{
 const definition=app.slice(app.indexOf('function setMobileMenu('),app.indexOf('function showView('));
 const state={};const nodes={
  '#portal-sidebar':{classList:{toggle(key,open){state.open=open;state.className=key}}},
  '#mobile-menu-toggle':{setAttribute(key,value){state[key]=value},set textContent(value){state.label=value},focus(){state.focused=true}}
 };
 const toggle=vm.runInNewContext(definition+';setMobileMenu',{$:selector=>nodes[selector]});
 toggle(true);assert.equal(state.open,true);assert.equal(state['aria-expanded'],'true');assert.equal(state.label,'Close menu');
 toggle(false,true);assert.equal(state.open,false);assert.equal(state['aria-expanded'],'false');assert.equal(state.label,'Menu');assert.equal(state.focused,true);
});
test('both dashboards include responsive styles, menu controls and card-capable tables',()=>{
 for(const file of ['index.html','admin.html']){
  const html=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.match(html,/media="screen" href="mobile\.css/);
  assert.match(html,/aria-controls="portal-navigation portal-account"/);
  assert.match(html,/table-wrap mobile-cards/);
  assert.match(html,/<table role="table">/);
 }
 const css=fs.readFileSync(new URL('../mobile.css',import.meta.url),'utf8');
 assert.match(css,/@media screen and \(max-width:850px\)/);
 assert.match(css,/@media screen and \(max-width:700px\)/);
 assert.match(css,/font-size:16px;min-height:48px/);
 assert.doesNotMatch(css,/@media print/);
});
