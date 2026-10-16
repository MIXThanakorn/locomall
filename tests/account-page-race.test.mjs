import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

test("a late account A response cannot populate account B, including a failed B load",async()=>{
 const source=readFileSync(new URL('../src/hooks/useAccountPage.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
 const slots=[];let index=0,user='A',effect,lastEffect,cleanup;
 const useState=initial=>{const n=index++;if(!(n in slots))slots[n]=initial;return[slots[n],v=>{slots[n]=typeof v==='function'?v(slots[n]):v;}];};
 const useRef=initial=>{const n=index++;if(!(n in slots))slots[n]={current:initial};return slots[n];};
 const useCallback=(fn,deps)=>{const n=index++;const prior=slots[n];if(!prior||deps.some((v,i)=>!Object.is(v,prior.deps[i])))slots[n]={fn,deps};return slots[n].fn;};
 const hook=new Function('useState','useRef','useCallback','useFocusEffect','useAuth',stripTypeScriptTypes(source)+';return useAccountPage;')(useState,useRef,useCallback,fn=>{effect=fn;},()=>({session:user?{user:{id:user}}:null}));
 const requests=[];
 const fetch=(id)=>new Promise((resolve,reject)=>requests.push({id,resolve,reject}));
 const cursor=row=>({created_at:row.created_at,id:row.id});
 const render=()=>{index=0;const view=hook(fetch,cursor);if(effect!==lastEffect){cleanup?.();cleanup=effect();lastEffect=effect;}return view;};
 assert.deepEqual(render().rows,[]);assert.equal(requests[0].id,'A');
 user='B';assert.deepEqual(render().rows,[]);assert.equal(requests[1].id,'B');
 requests[0].resolve([{id:1,created_at:'2026-10-01T00:00:00Z',private:'A'}]);await Promise.resolve();await Promise.resolve();
 assert.deepEqual(render().rows,[]);
 requests[1].reject(Error('offline'));await Promise.resolve();await Promise.resolve();
 const failed=render();assert.equal(failed.error,true);assert.deepEqual(failed.rows,[]);
 user=null;assert.deepEqual(render().rows,[]);cleanup?.();
});
