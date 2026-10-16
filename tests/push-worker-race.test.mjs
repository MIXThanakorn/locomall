import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { currentRegistration, retryAt, ticketOutcome } from "../supabase/functions/push-notification/core.ts";

test("a late successful push ticket does not re-enable a logged-out device; duplicate wake does not resend",async()=>{
 const tables={
  push_delivery_jobs:[{job_id:1,notification_id:1,push_device_id:1,user_id:'A',registration_version:'v1',ticket_id:null,attempts:0,receipt_checks:0,status:'pending'}],
  user_push_devices:[{push_device_id:1,user_id:'A',registration_version:'v1',enabled:true,expo_push_token:'test-device'}],
  notifications:[{notification_id:1,user_id:'A',title:'Private',body:'Message',category:'chat',entity_type:'chat',entity_id:1}],
 };
 class Query {
  constructor(table){this.table=table;this.filters=[];this.patch=null;}
  select(){return this;}in(k,values){this.filters.push(r=>values.includes(r[k]));return this;}
  eq(k,v){this.filters.push(r=>r[k]===v);return this;}update(patch){this.patch=patch;return this;}
  then(resolve,reject){try{const rows=tables[this.table].filter(r=>this.filters.every(f=>f(r)));if(this.patch)rows.forEach(r=>Object.assign(r,this.patch));return Promise.resolve({data:structuredClone(rows),error:null}).then(resolve,reject);}catch(e){return Promise.reject(e).then(resolve,reject);}}
 }
 const db={from:table=>new Query(table),rpc:async()=>{const rows=tables.push_delivery_jobs.filter(j=>j.status==='pending');rows.forEach(j=>{j.status='sending';j.attempts++;});return{data:structuredClone(rows),error:null};}};
 let handler,sends=0;
 const Deno={env:{get:key=>({LOCOMALL_PUSH_WEBHOOK_SECRET:'test-secret',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service'})[key]},serve:fn=>{handler=fn;}};
 const source=readFileSync(new URL('../supabase/functions/push-notification/index.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
 const fakeFetch=async()=>{sends++;tables.user_push_devices[0].enabled=false;tables.user_push_devices[0].registration_version='v2';return Response.json({data:[{status:'ok',id:'provider-ticket'}]});};
 new Function('Deno','createClient','currentRegistration','retryAt','ticketOutcome','fetch',stripTypeScriptTypes(source))(Deno,()=>db,currentRegistration,retryAt,ticketOutcome,fakeFetch);
 const request=()=>new Request('https://edge.example',{method:'POST',headers:{'x-locomall-webhook-secret':'test-secret'},body:JSON.stringify({type:'DRAIN'})});
 assert.equal((await handler(new Request('https://edge.example',{method:'POST',body:'{}'}))).status,401);
 assert.equal((await handler(request())).status,200);
 assert.equal(tables.user_push_devices[0].enabled,false);assert.equal(tables.user_push_devices[0].registration_version,'v2');
 assert.equal(tables.push_delivery_jobs[0].status,'accepted');assert.equal(tables.push_delivery_jobs[0].ticket_id,'provider-ticket');
 await handler(request());assert.equal(sends,1);
});
