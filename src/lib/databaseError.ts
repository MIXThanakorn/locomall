type ErrorLike = { code?: string; message?: string } | null | undefined;

export function translateDatabaseError(error: ErrorLike) {
  const message = error?.message?.toLowerCase() ?? "";
  if (message.includes("row-level security") || error?.code === "42501") return "ระบบไม่อนุญาตให้ทำรายการนี้ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ หากยังพบปัญหาให้ติดต่อผู้ดูแล";
  if (message.includes("same subdistrict") || message.includes("primary subdistrict")) return "พื้นที่หลักของคุณต้องอยู่ตำบลเดียวกับตลาดชุมชนนี้";
  if (message.includes("already pending") || message.includes("is not pending")) return "คำขอนี้ถูกดำเนินการไปแล้ว กรุณารีเฟรชข้อมูล";
  if (message.includes("market unavailable")) return "ตลาดชุมชนนี้ยังไม่พร้อมรับคำขอ";
  if (message.includes("store unavailable")) return "ร้านค้านี้ยังไม่พร้อมรับคำขอ";
  if (message.includes("rejection reason required")) return "กรุณาระบุเหตุผลที่ปฏิเสธคำขอ";
  if (message.includes("pickup is limited to 10 km")) return "นัดรับได้เมื่ออยู่ห่างจุดรวมสินค้าไม่เกิน 10 กิโลเมตร";
  if (message.includes("cannot purchase from your own store")) return "คุณไม่สามารถสั่งซื้อสินค้าจากร้านที่คุณเป็นเจ้าของหรือร่วมขายอยู่ได้";
  if (message.includes("only cancelled orders can be deleted")) return "กรุณายกเลิกออเดอร์ก่อนลบออกจากระบบ";
  if (message.includes("location unavailable")) return "ไม่พบตำแหน่งสำหรับคำนวณระยะทาง กรุณาตรวจสอบพื้นที่หลักหรือเปิดตำแหน่งอุปกรณ์";
  if (message.includes("forbidden or invalid state")) return "บัญชีนี้ไม่ใช่ผู้ซื้อของคำสั่งซื้อนี้ หรือยังไม่ถึงขั้นตอนยืนยันรับสินค้า";
  if (message.includes("listing not found")) return "คุณแก้ไขได้เฉพาะจำนวนสินค้าของตนเอง และจำนวนต้องไม่น้อยกว่าสินค้าที่มีลูกค้าสั่งไว้";
  if (message.includes("forbidden")) return "บัญชีนี้ไม่มีสิทธิ์ทำรายการดังกล่าว";
  if (message.includes("network") || message.includes("fetch")) return "เชื่อมต่อระบบไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต";
  return "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}
