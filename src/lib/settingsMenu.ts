export type SettingsAction = {
  title: string;
  description: string;
  icon: string;
  route?: string;
  command?: "notification-permission";
};
export type SettingsGroup = { title: string; actions: SettingsAction[] };
type SettingsAccess = { isAdmin: boolean; isMarketOwner: boolean; isStoreManager: boolean; isSeller: boolean };

export function getSettingsGroups(access: SettingsAccess): SettingsGroup[] {
  const groups: SettingsGroup[] = [
    { title: "บัญชีและความปลอดภัย", actions: [
      { title: "ข้อมูลส่วนตัว", description: "แก้ไขชื่อ รูปโปรไฟล์ และเบอร์มือถือ", icon: "person-outline", route: "/profile/edit-profile" },
      { title: "เปลี่ยนรหัสผ่าน", description: "ดูแลความปลอดภัยของบัญชี", icon: "lock-closed-outline", route: "/profile/change-password" },
      { title: "สลับบัญชี", description: "เลือกบัญชีที่เคยเข้าสู่ระบบบนเครื่องนี้", icon: "swap-horizontal-outline", route: "/(auth)/switch-account" },
    ] },
    { title: "การซื้อและ Wallet", actions: [
      { title: "คำสั่งซื้อของฉัน", description: "ติดตามสถานะและรีวิวหลังรับสินค้า", icon: "receipt-outline", route: "/(tabs)/orders" },
      { title: "ตะกร้าสินค้า", description: "ดูและแก้ไขสินค้าก่อนสั่งซื้อ", icon: "cart-outline", route: "/order/cart" },
      { title: "Wallet เงินจำลอง", description: "ยอด ประวัติ และคำขอเติมเงินสำหรับสาธิต", icon: "wallet-outline", route: "/profile/wallet" },
      { title: "รายการที่บันทึกและติดตาม", description: "ตลาดและร้านค้าที่คุณสนใจ", icon: "heart-outline", route: "/profile/saved" },
    ] },
    { title: "พื้นที่และการจัดส่ง", actions: [
      { title: "กรองตลาดในพื้นที่เดียวกัน", description: "เลือกดูทุกพื้นที่ หรือเฉพาะตำบลเดียวกับพื้นที่หลัก", icon: "filter-outline", route: "/settings/catalog" },
      { title: "พื้นที่หลัก", description: "ชุมชนหลักและพื้นที่สำหรับสมัครขายสินค้า", icon: "navigate-outline", route: "/profile/location" },
      { title: "ที่อยู่จัดส่ง", description: "เพิ่มหรือแก้ไขที่อยู่สำหรับรับสินค้า", icon: "location-outline", route: "/profile/shipping-address" },
    ] },
  ];
  if (access.isStoreManager || access.isSeller) groups.push({ title: "สำหรับผู้ขาย", actions: [
    { title: "งานขายสินค้าของฉัน", description: "ภาพรวมร้านและงานที่ต้องเตรียม", icon: "storefront-outline", route: "/seller/dashboard" },
    ...(access.isStoreManager ? [{ title: "จัดการร้านของฉัน", description: "ข้อมูลร้าน สินค้า และราคา", icon: "create-outline", route: "/seller/stores" }] : []),
    { title: "สต็อกสินค้าของฉัน", description: "จัดการจำนวนสินค้าที่พร้อมขาย", icon: "cube-outline", route: "/seller/listings" },
    ...(access.isSeller ? [{ title: "งานเตรียมสินค้า", description: "รับงานและส่งสินค้าไปจุดรวม", icon: "clipboard-outline", route: "/seller/allocations" }] : []),
  ] });
  if (access.isMarketOwner) groups.push({ title: "สำหรับเจ้าของตลาด", actions: [
    { title: "จัดการตลาดชุมชน", description: "ข้อมูลตลาด ร้านค้า และคำขอร่วมขาย", icon: "business-outline", route: "/market/manage/home" },
    { title: "จุดรวมและจัดส่ง", description: "รับสินค้า รวมพัสดุ และจัดส่ง", icon: "car-outline", route: "/market/manage/logistics" },
  ] });
  if (!access.isMarketOwner || (!access.isStoreManager && !access.isSeller)) groups.push({ title: "เริ่มต้นขายสินค้า", actions: [
    ...(!access.isStoreManager && !access.isSeller ? [{ title: "วิธีเริ่มขายสินค้า", description: "เลือกตลาด เปิดร้าน หรือสมัครร่วมขาย", icon: "storefront-outline", route: "/guide?section=seller" }] : []),
    ...(!access.isMarketOwner ? [{ title: "ขอเปิดตลาดชุมชน", description: "ยื่นคำขอให้ผู้ดูแลระบบตรวจสอบ", icon: "people-outline", route: "/market/create" }] : []),
  ] });
  groups.push({ title: "แอปและความช่วยเหลือ", actions: [
    { title: "สิทธิ์การแจ้งเตือน", description: "เปิดการตั้งค่าของเครื่องเพื่ออนุญาตหรือปิดแจ้งเตือน", icon: "notifications-outline", command: "notification-permission" },
    { title: "คู่มือการใช้งาน", description: "ขั้นตอนสำหรับผู้ซื้อ ผู้ขาย และเจ้าของตลาด", icon: "help-circle-outline", route: "/guide" },
    { title: "เกี่ยวกับ Locomall", description: "เวอร์ชันแอปและขอบเขตระบบสาธิต", icon: "information-circle-outline", route: "/settings/about" },
  ] });
  if (access.isAdmin) groups.push({ title: "สำหรับผู้ดูแลระบบ", actions: [
    { title: "แผงผู้ดูแลระบบ", description: "อนุมัติคำขอ ดูแลร้าน ยอดจำลอง และรีวิว", icon: "shield-checkmark-outline", route: "/admin" },
  ] });
  return groups;
}
