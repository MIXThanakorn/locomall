type ErrorLike = { code?: string; message?: string } | null | undefined;

export function translateDatabaseError(error: ErrorLike) {
  const message = error?.message?.toLowerCase() ?? "";
  if (message.includes("row-level security") || error?.code === "42501") return "ระบบไม่อนุญาตให้ทำรายการนี้ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ หากยังพบปัญหาให้ติดต่อผู้ดูแล";
  if (message.includes("same subdistrict") || message.includes("primary subdistrict")) return "พื้นที่หลักของคุณต้องอยู่ตำบลเดียวกับ Market";
  if (message.includes("already pending") || message.includes("is not pending")) return "คำขอนี้ถูกดำเนินการไปแล้ว กรุณารีเฟรชข้อมูล";
  if (message.includes("market unavailable")) return "Market นี้ยังไม่พร้อมรับคำขอ";
  if (message.includes("store unavailable")) return "ร้านค้านี้ยังไม่พร้อมรับคำขอ";
  if (message.includes("forbidden")) return "บัญชีนี้ไม่มีสิทธิ์ทำรายการดังกล่าว";
  if (message.includes("network") || message.includes("fetch")) return "เชื่อมต่อระบบไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต";
  return "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}
