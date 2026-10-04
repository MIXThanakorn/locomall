export const GOOGLE_OAUTH_CALLBACK_PATH = "sign-in";
export const GOOGLE_OAUTH_TIMEOUT_MS = 120_000;

export async function withGoogleOAuthTimeout<T>(operation: Promise<T>, timeoutMs = GOOGLE_OAUTH_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Google ไม่ส่งกลับเข้าแอปภายใน 2 นาที กรุณาตรวจสอบ Redirect URL ใน Supabase")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type GoogleOAuthCallback =
  | { kind: "tokens"; accessToken: string; refreshToken: string }
  | { kind: "code"; code: string };

export function parseGoogleOAuthCallback(url: string, redirectUrl: string): GoogleOAuthCallback {
  const callback = new URL(url);
  const expected = new URL(redirectUrl);
  if (callback.protocol !== expected.protocol || callback.host !== expected.host || callback.pathname !== expected.pathname) {
    throw new Error("Google ส่งกลับมายังที่อยู่แอปไม่ตรงกัน กรุณาลองใหม่อีกครั้ง");
  }

  const hash = new URLSearchParams(callback.hash.slice(1));
  const query = callback.searchParams;
  const get = (name: string) => hash.get(name) ?? query.get(name);
  const oauthError = get("error_description") ?? get("error");
  if (oauthError) throw new Error(oauthError);

  const accessToken = get("access_token");
  const refreshToken = get("refresh_token");
  if (accessToken && refreshToken) return { kind: "tokens", accessToken, refreshToken };

  const code = get("code");
  if (code) return { kind: "code", code };
  throw new Error("ไม่ได้รับข้อมูลเข้าสู่ระบบจาก Google กรุณาตรวจสอบ Redirect URL ของ Supabase");
}
