type ErrorLike = { code?: string; message?: string } | null | undefined;

export function translateDatabaseError(error: ErrorLike) {
  const message = error?.message?.toLowerCase() ?? "";
  if (message.includes("order cancellation closed after seller handoff")) return "ยกเลิกไม่ได้ เนื่องจากเจ้าของตลาดรับสินค้าจากผู้ขายแล้วอย่างน้อยหนึ่งราย";
  if (message.includes("stock reservation mismatch")) return "ข้อมูลสต็อกไม่ตรงกับยอดจอง ระบบยังไม่เปลี่ยนรายการ กรุณาติดต่อผู้ดูแล";
  if (message.includes("cancellation reason required")) return "กรุณาระบุเหตุผลการยกเลิกสำหรับผู้ดูแล";
  if (message.includes("row-level security") || error?.code === "42501") return "ระบบไม่อนุญาตให้ทำรายการนี้ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่ หากยังพบปัญหาให้ติดต่อผู้ดูแล";
  if (message.includes("same subdistrict") || message.includes("primary subdistrict")) return "พื้นที่หลักของคุณต้องอยู่ตำบลเดียวกับตลาดชุมชนนี้";
  if (message.includes("already pending") || message.includes("is not pending")) return "คำขอนี้ถูกดำเนินการไปแล้ว กรุณารีเฟรชข้อมูล";
  if (message.includes("market unavailable")) return "ตลาดชุมชนนี้ยังไม่พร้อมรับคำขอ";
  if (message.includes("store unavailable")) return "ร้านค้านี้ยังไม่พร้อมรับคำขอ";
  if (message.includes("store moderation reason required")) return "กรุณาระบุเหตุผลที่ระงับหรือคืนสิทธิ์ร้านค้า ความยาวไม่เกิน 500 ตัวอักษร";
  if (message.includes("store moderation state changed")) return "ข้อมูลร้านค้าเปลี่ยนไปแล้ว กรุณารีเฟรชและตรวจสถานะก่อนดำเนินการอีกครั้ง";
  if (message.includes("invalid store moderation")) return "เปลี่ยนสถานะได้เฉพาะร้านที่เปิดขายหรือถูกระงับเท่านั้น กรุณารีเฟรชข้อมูล";
  if (message === "invalid store") return "ร้านค้าในออเดอร์นี้ไม่พร้อมขาย (อาจปิดขายหรือถูกระงับ) กรุณานำออกจากตะกร้าก่อนสั่งซื้อ";
  if (message.includes("sale unit cannot change")) return "ร้านที่อนุมัติแล้วหรือมีสต็อก/ตะกร้า/ออเดอร์อยู่ เปลี่ยนหน่วยขายไม่ได้ หากต้องขายขนาดใหม่ให้ขอเปิดร้านสินค้าใหม่";
  if (message.includes("invalid sale unit")) return "หน่วยสินค้าไม่ถูกต้อง กรุณาเลือกหน่วยและระบุปริมาณใหม่";
  if (message.includes("rejection reason required")) return "กรุณาระบุเหตุผลที่ปฏิเสธคำขอ";
  if (message.includes("pickup is limited to 10 km")) return "นัดรับได้เมื่ออยู่ห่างจุดรวมสินค้าไม่เกิน 10 กิโลเมตร";
  if (message.includes("cannot purchase from your own store")) return "คุณไม่สามารถสั่งซื้อสินค้าจากร้านที่คุณเป็นเจ้าของหรือร่วมขายอยู่ได้";
  if (message.includes("only cancelled orders can be deleted")) return "กรุณายกเลิกออเดอร์ก่อนลบออกจากระบบ";
  if (message.includes("demo financial history")) return "ออเดอร์นี้มีประวัติยอดจำลอง จึงต้องเก็บไว้ตรวจสอบและลบถาวรไม่ได้";
  if (message.includes("insufficient demo balance")) return "ยอดเงินจำลองไม่พอ กรุณาขอยอดทดสอบหรือเลือกชำระเมื่อรับสินค้า";
  if (message.includes("request id was already used")) return "รายการนี้ใช้รหัสคำขอเดิมกับข้อมูลใหม่ กรุณาเริ่มรายการอีกครั้ง";
  if (message.includes("insufficient stock")) return "จำนวนสินค้าที่พร้อมขายไม่พอ กรุณาลดจำนวนแล้วลองใหม่";
  if (message.includes("request already decided")) return "คำขอนี้มีผู้ดูแลดำเนินการแล้ว กรุณารีเฟรชข้อมูล";
  if (message.includes("review requires a delivered order")) return "รีวิวได้หลังจากคุณยืนยันรับสินค้าของออเดอร์นี้แล้วเท่านั้น";
  if (message.includes("order item not purchased")) return "คุณรีวิวได้เฉพาะสินค้าที่ซื้อจริงในออเดอร์นี้";
  if (message.includes("hidden reviews cannot be edited")) return "รีวิวนี้ถูกผู้ดูแลซ่อนและไม่สามารถแก้ไขได้";
  if (message.includes("moderation reason required")) return "กรุณาระบุเหตุผลที่ซ่อนรีวิว";
  if (message.includes("no pending demo settlement")) return "ผู้ขายรายนี้ไม่มียอดจำลองค้างบันทึกโอน";
  if (message.includes("location unavailable")) return "ไม่พบตำแหน่งสำหรับคำนวณระยะทาง กรุณาตรวจสอบพื้นที่หลักหรือเปิดตำแหน่งอุปกรณ์";
  if (message.includes("forbidden or invalid state")) return "บัญชีนี้ไม่ใช่ผู้ซื้อของคำสั่งซื้อนี้ หรือยังไม่ถึงขั้นตอนยืนยันรับสินค้า";
  if (message.includes("listing not found")) return "คุณแก้ไขได้เฉพาะจำนวนสินค้าของตนเอง และจำนวนต้องไม่น้อยกว่าสินค้าที่มีลูกค้าสั่งไว้";
  if (message.includes("forbidden")) return "บัญชีนี้ไม่มีสิทธิ์ทำรายการดังกล่าว";
  if (message.includes("network") || message.includes("fetch")) return "เชื่อมต่อระบบไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต";
  return "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}
