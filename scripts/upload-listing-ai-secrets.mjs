// Never upload the entire Expo .env.local or echo private values into shell history.
import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const project = process.argv[2];
if (!project || !/^[a-z]{20}$/.test(project)) throw new Error("Usage: node scripts/upload-listing-ai-secrets.mjs PROJECT_REF [ENV_FILE]");
loadEnvFile(process.argv[3] ?? ".env.local");
const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (envUrl && new URL(envUrl).hostname !== `${project}.supabase.co`) throw new Error("Project does not match the app Supabase URL");
const secrets = { AI_PROVIDER: "gemini", GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_MODEL: process.env.GEMINI_MODEL,
  GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.8-flash" };
if (!secrets.GEMINI_API_KEY || !secrets.GEMINI_MODEL) throw new Error("Missing Gemini configuration");
// Invoke Node shim without cmd/PowerShell interpolation. CLI output is not echoed on failures.
const result = spawnSync(process.execPath, [resolve("node_modules/supabase/dist/supabase.js"), "secrets", "set", "--project-ref", project,
  ...Object.entries(secrets).map(([name,value]) => `${name}=${value}`)], { encoding: "utf8", timeout: 60000, windowsHide: true });
console.log(JSON.stringify({ uploaded: result.status === 0, names: Object.keys(secrets), exitCode: result.status }));
if (result.status !== 0) process.exitCode = 1;
