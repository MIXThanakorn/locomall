import { parseGoogleOAuthCallback } from "./googleOAuth";
import { requireRecoveryVerifier, supabase } from "./supabase";

// StrictMode and duplicate native link events must exchange a one-use code once.
let pending: { code: string; result: Promise<string> } | null = null;
export async function acceptRecoveryCallback(url: string, expected: string): Promise<string> {
  const { code } = parseGoogleOAuthCallback(url, expected);
  if (pending?.code === code) return pending.result;
  const result = (async () => {
    await requireRecoveryVerifier();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session || !("redirectType" in data) || data.redirectType !== "recovery") throw new Error("ลิงก์กู้รหัสผ่านใช้ไม่ได้หรือหมดอายุ กรุณาขอลิงก์ใหม่บนเครื่องนี้");
    return data.session.user.id;
  })();
  pending = { code, result };
  return result;
}
