const approvalLabels: Record<string, string> = {
  pending: "กำลังรอตรวจสอบ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่ผ่านการอนุมัติ",
  suspended: "ระงับการใช้งานชั่วคราว",
};

const orderLabels: Record<string, string> = {
  awaiting_preparation: "รอผู้ขายเริ่มเตรียมสินค้า",
  preparing: "ผู้ขายกำลังเตรียมสินค้า",
  at_hub: "สินค้าถึงจุดรวมแล้ว",
  consolidated: "รวมสินค้าเป็นพัสดุแล้ว",
  shipped: "กำลังจัดส่ง",
  delivered: "ลูกค้าได้รับสินค้าแล้ว",
  cancelled: "ยกเลิกคำสั่งซื้อแล้ว",
};

const buyerOrderLabels: Record<string, string> = {
  awaiting_preparation: "รอผู้ขายรับคำสั่งซื้อ",
  preparing: "ผู้ขายกำลังเตรียมสินค้าให้คุณ",
  at_hub: "สินค้าของคุณถึงจุดรวมแล้ว",
  consolidated: "รวมสินค้าเป็นพัสดุของคุณแล้ว",
  shipped: "สินค้ากำลังส่งมาหาคุณ",
  delivered: "คุณได้รับสินค้าแล้ว",
  cancelled: "คำสั่งซื้อของคุณถูกยกเลิก",
};

const allocationLabels: Record<string, string> = {
  awaiting_preparation: "รอผู้ขายรับออเดอร์",
  preparing: "กำลังเตรียมสินค้า",
  ready_for_pickup: "พร้อมให้เจ้าของตลาดมารับ",
  collected: "เจ้าของตลาดรับสินค้าแล้ว",
  at_hub: "สินค้าถึงจุดรวมแล้ว",
  cancelled: "ยกเลิกรายการแล้ว",
};

const sellerAllocationLabels: Record<string, string> = {
  awaiting_preparation: "รอคุณรับออเดอร์",
  preparing: "คุณกำลังเตรียมสินค้า",
  ready_for_pickup: "สินค้าพร้อมส่งให้เจ้าของตลาด",
  collected: "เจ้าของตลาดรับสินค้าจากคุณแล้ว",
  at_hub: "สินค้าของคุณถึงจุดรวมแล้ว",
  cancelled: "งานขายรายการนี้ถูกยกเลิก",
};

const auditActionLabels: Record<string, string> = {
  submitted: "ส่งคำขอแล้ว",
  approved: "อนุมัติคำขอแล้ว",
  rejected: "ปฏิเสธคำขอแล้ว",
  review_market: "ตรวจสอบคำขอเปิดตลาดชุมชน",
  review_store: "ตรวจสอบคำขอเปิดร้านค้า",
  review_store_seller: "ตรวจสอบคำขอร่วมขายสินค้า",
  update_market: "แก้ไขข้อมูลตลาดชุมชน",
  update_store: "แก้ไขข้อมูลร้านค้า",
  cancel_order: "ยกเลิกคำสั่งซื้อ",
  confirm_delivery: "ยืนยันว่าลูกค้าได้รับสินค้า",
};

const auditEntityLabels: Record<string, string> = {
  market: "ตลาดชุมชน",
  store: "ร้านค้า",
  seller: "ผู้สมัครร่วมขายสินค้า",
  order: "คำสั่งซื้อ",
  user: "ผู้ใช้",
};

export const approvalStatusLabel = (status?: string | null) => approvalLabels[status ?? ""] ?? "ไม่ทราบสถานะ";
export const orderStatusLabel = (status?: string | null) => orderLabels[status ?? ""] ?? "กำลังตรวจสอบสถานะ";
export const buyerOrderStatusLabel = (status?: string | null) => buyerOrderLabels[status ?? ""] ?? "กำลังตรวจสอบสถานะ";
export const allocationStatusLabel = (status?: string | null) => allocationLabels[status ?? ""] ?? "กำลังตรวจสอบสถานะ";
export const sellerAllocationStatusLabel = (status?: string | null) => sellerAllocationLabels[status ?? ""] ?? "กำลังตรวจสอบสถานะ";
export const auditActionLabel = (action?: string | null) => auditActionLabels[action ?? ""] ?? "การดำเนินการในระบบ";
export const auditEntityLabel = (entity?: string | null) => auditEntityLabels[entity ?? ""] ?? "ข้อมูลในระบบ";
