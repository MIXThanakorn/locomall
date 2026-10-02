type AuthErrorLike = { code?: string; message?: string } | null | undefined;

export function translateAuthError(error: AuthErrorLike) {
  const code = error?.code ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }
  if (["user_already_exists", "email_exists"].includes(code) || message.includes("already registered")) {
    return "อีเมลนี้ถูกใช้สมัครสมาชิกแล้ว";
  }
  if (code === "email_address_invalid") return "อีเมลนี้ใช้สมัครไม่ได้ กรุณาใช้อีเมลจริงที่รับข้อความได้ (ไม่ใช่โดเมนตัวอย่าง)";
  if (code === "email_address_not_authorized") return "ระบบยังไม่สามารถส่งอีเมลถึงที่อยู่นี้ได้ กรุณาติดต่อผู้ดูแลระบบ";
  if (code === "email_provider_disabled" || code === "signup_disabled") return "ระบบปิดการสมัครสมาชิกชั่วคราว กรุณาติดต่อผู้ดูแลระบบ";
  if (code === "email_not_confirmed") return "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
  if (code === "validation_failed" && message.includes("email")) return "รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบชื่อก่อน @ และชื่อโดเมน";
  if (code === "weak_password" || message.includes("password")) {
    return "รหัสผ่านไม่ผ่านเงื่อนไขความปลอดภัย กรุณาตรวจสอบอีกครั้ง";
  }
  if (code === "over_email_send_rate_limit" || message.includes("rate limit")) {
    return "ดำเนินการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }
  if (code === "captcha_failed") return "การตรวจสอบความปลอดภัยไม่ผ่าน กรุณาลองใหม่อีกครั้ง";
  if (code === "unexpected_failure" || message.includes("database error")) return "ระบบสมัครสมาชิกขัดข้องชั่วคราว กรุณาลองอีกครั้ง หากยังไม่สำเร็จให้ติดต่อผู้ดูแลระบบ";
  if (message.includes("network") || message.includes("fetch")) {
    return "ไม่สามารถเชื่อมต่อระบบได้ กรุณาตรวจสอบอินเทอร์เน็ต";
  }
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}
