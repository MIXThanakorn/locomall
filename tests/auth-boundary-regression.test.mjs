import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { parseGoogleOAuthCallback } from "../src/lib/googleOAuth.ts";
const read = p => readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test("recovery exchanges once, requires a local recovery verifier, and rejects a normal OAuth flow", async()=>{
 const source=read('src/lib/authRecovery.ts').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
 let calls=0,verified=0;
 const auth={exchangeCodeForSession:async code=>{calls++;await Promise.resolve();return {data:{session:{user:{id:'recovered-user'}},redirectType:code==='oauth'?'signin':'recovery'},error:null};}};
 const accept=new Function('supabase','requireRecoveryVerifier','parseGoogleOAuthCallback',stripTypeScriptTypes(source)+';return acceptRecoveryCallback;')({auth},async()=>{verified++;},parseGoogleOAuthCallback);
 await assert.rejects(accept('https://evil.example/?code=a','locomall://new-password'));
 await assert.rejects(accept('locomall://new-password#access_token=a&refresh_token=b','locomall://new-password'));
 assert.equal(calls,0);
 const result=await Promise.all([accept('locomall://new-password?code=recovery','locomall://new-password'),accept('locomall://new-password?code=recovery','locomall://new-password')]);
 assert.deepEqual(result,['recovered-user','recovered-user']);assert.equal(calls,1);assert.equal(verified,1);
 await assert.rejects(accept('locomall://new-password?code=oauth','locomall://new-password'),/ลิงก์กู้รหัสผ่าน/);
 const blocked=new Function('supabase','requireRecoveryVerifier','parseGoogleOAuthCallback',stripTypeScriptTypes(source)+';return acceptRecoveryCallback;')({auth},async()=>{throw Error('no recovery verifier');},parseGoogleOAuthCallback);
 const before=calls;
 await assert.rejects(blocked('locomall://new-password?code=unrequested','locomall://new-password'),/no recovery verifier/);
 assert.equal(calls,before);
});

test("private screens remount per identity, while recovery is gated to its verified account",()=>{
 const root=read('app/_layout.tsx');
 assert.match(root,/screenLayout=\{accountScreenLayout\}/);
 assert.match(root,/key=\{session\?\.user.id \?\? "guest"\}/);
 assert.match(root,/route.name === "\(auth\)"/);
 const recovery=read('app/(auth)/new-password.tsx');
 assert.match(recovery,/session\?\.user.id !== verifiedUser/);
 assert.ok(!recovery.includes('auth.setSession'));
 assert.match(read('src/lib/supabase.ts'),/flowType: "pkce"/);
 assert.match(read('src/hooks/useAccountPage.ts'),/rows: scoped \? state.rows : \[\]/);
 assert.match(read('src/context/BadgeContext.tsx'),/countsOwner === userId \? cartCount : 0/);
});
