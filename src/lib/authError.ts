type AuthErrorLike = { code?: string; message?: string } | null | undefined;

export function translateAuthError(error: AuthErrorLike) {
  const code = error?.code ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }
  if (code === "user_already_exists" || message.includes("already registered")) {
    return "อีเมลนี้ถูกใช้สมัครสมาชิกแล้ว";
  }
  if (code === "weak_password" || message.includes("password")) {
    return "รหัสผ่านไม่ผ่านเงื่อนไขความปลอดภัย กรุณาตรวจสอบอีกครั้ง";
  }
  if (code === "over_email_send_rate_limit" || message.includes("rate limit")) {
    return "ดำเนินการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "ไม่สามารถเชื่อมต่อระบบได้ กรุณาตรวจสอบอินเทอร์เน็ต";
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}
