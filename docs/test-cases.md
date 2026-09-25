# Locomall V1 Test Cases

สถานะ `Automated` หมายถึงมีการตรวจด้วย `npm test`; สถานะ `Manual/E2E`
ต้องรันด้วยบัญชีแยกบทบาทบน preview build ก่อน release.

## Authentication and profile

| ID | Case | Expected | Type |
|---|---|---|---|
| AUTH-01 | สมัครด้วยอีเมลใหม่ | สร้าง `auth.users`/`profiles`, ได้ session ทันทีโดยไม่ต้องยืนยันอีเมล และไป Location onboarding | Automated + E2E |
| AUTH-02 | เข้า route ที่ต้อง login แบบ guest | ถูกส่งไป Sign in | Manual/E2E |
| AUTH-03 | Logout แล้วเปิดแอปใหม่ | session เดิมใช้ไม่ได้ | Manual/E2E |
| AUTH-04 | Reset password ผ่าน email link | ตั้งรหัสใหม่และ login ได้ | Manual/E2E |
| AUTH-05 | ผู้ใช้แก้ role/wallet ใน profile | ค่า authorization ไม่เปลี่ยน | Manual/E2E |
| AUTH-06 | ผู้ใช้ทั่วไปเปิดหน้า Admin URL ตรง | เห็นหน้าไม่มีสิทธิ์และ RPC ปฏิเสธ | Automated + E2E |
| AUTH-07 | Admin login ด้วยรหัสผ่าน | เข้า Admin workspace โดยตรวจ `platform_roles` และไม่ขอ email/MFA | Automated + E2E |
| AUTH-08 | ผู้ใช้ทั่วไปพยายามเปิด `/admin` | ถูกส่งกลับแอปผู้ใช้และอ่านข้อมูล Admin ไม่ได้ | Automated + E2E |

## Admin workspace

| ID | Case | Expected | Type |
|---|---|---|---|
| ADM-01 | Admin login สำเร็จ | เข้า `/admin` อัตโนมัติ ไม่เข้า Home ของผู้ใช้ | Automated + E2E |
| ADM-02 | เปิด Dashboard | แสดงจำนวน Market, ร้าน, ผู้ขายที่รออนุมัติ และออเดอร์ที่กำลังดำเนินการ | Manual/E2E |
| ADM-03 | เปิดคิวอนุมัติ | เห็นคำขอ Market, ร้าน และผู้ขายที่รอตรวจ | Manual/E2E |
| ADM-04 | Approve/reject พร้อมบันทึกหมายเหตุ | สถานะเปลี่ยนครั้งเดียวและเขียน approval event/audit log | Manual/E2E |
| ADM-05 | เปิดหน้าออเดอร์ Admin | เห็นออเดอร์ที่ยังไม่จบและเปิดรายละเอียดได้ | Manual/E2E |
| ADM-06 | Admin override ยกเลิกออเดอร์ | ยกเลิกตาม state rule, คืน reserved stock ครั้งเดียว และเขียน audit log | Manual/E2E |
| ADM-07 | เปิดประวัติการดำเนินการ | แสดง admin audit logs และ approval events ล่าสุด | Manual/E2E |
| ADM-08 | Admin ใช้งานโดยไม่มี email จริง/MFA | สิทธิ์มาจาก `platform_roles` เท่านั้นและทำงานได้โดยไม่ส่งอีเมล | Automated + E2E |

## Location and address

| ID | Case | Expected | Type |
|---|---|---|---|
| LOC-01 | เลือกจังหวัด | แสดงเฉพาะอำเภอของจังหวัดนั้น | Manual/E2E |
| LOC-02 | เลือกอำเภอ | แสดงเฉพาะตำบลของอำเภอนั้น | Manual/E2E |
| LOC-03 | บันทึกพื้นที่หลัก | บันทึกจังหวัด/อำเภอ/ตำบลทันทีโดยไม่รอ GPS และใช้ centroid เป็น fallback | Automated + E2E |
| LOC-04 | เข้าหน้าหลักและอนุญาต GPS | ใช้พิกัดอุปกรณ์ค้นหาใกล้ตัวแบบชั่วคราว แต่ไม่บันทึก exact GPS ลงฐานข้อมูล | Automated + E2E |
| LOC-05 | อ่านที่อยู่ของผู้ใช้อื่น | RLS ไม่คืนข้อมูล | Manual/E2E |
| LOC-06 | ตรวจ reference data | 77 จังหวัด, 928 อำเภอ, 7,364 ตำบล | Database |
| LOC-07 | เข้าหน้าหลักและปฏิเสธ GPS | Discovery ใช้ centroid ของตำบลที่บันทึกไว้ | Manual/E2E |

## Market, store and seller approval

| ID | Case | Expected | Type |
|---|---|---|---|
| APR-01 | ผู้ใช้ขอเปิด Market | สถานะ `pending`; Admin ได้ notification | Manual/E2E |
| APR-02 | ผู้ใช้ทั่วไป review Market | RPC ปฏิเสธ | Manual/E2E |
| APR-03 | Admin approve/reject Market | เปลี่ยนสถานะและเขียน audit/event | Manual/E2E |
| APR-04 | เปิดร้านใน Market ที่ไม่ active | RPC ปฏิเสธ | Manual/E2E |
| APR-05 | เจ้าของ Market เปิดร้านตนเอง | เข้าคิว Platform Admin | Manual/E2E |
| APR-06 | เจ้าของ Market approve ร้านของผู้อื่น | ร้าน active และ manager เป็น seller แรก | Manual/E2E |
| APR-07 | ผู้ขายต่างตำบลสมัครร้าน | RPC ปฏิเสธ | Manual/E2E |
| APR-08 | เจ้าของ Market อนุมัติตนเอง | RPC ปฏิเสธ | Manual/E2E |
| APR-09 | คำขอ Market สำเร็จแต่อัปโหลดรูป retry | ใช้ request เดิมและไม่สร้าง pending ซ้ำ | Automated + E2E |
| APR-10 | อัปโหลดรูป Market/Store ด้วย path ของเจ้าของ | Storage RLS อนุญาต; path ของผู้อื่นถูกปฏิเสธ | Automated + E2E |
| APR-11 | ส่งคำขอ Market ซ้ำขณะยัง pending | อัปเดตคำขอเดิมและคืน `market_id` เดิม | Automated + E2E |
| APR-12 | ส่งคำขอเปิดร้านซ้ำขณะยัง pending | อัปเดตคำขอเดิมและไม่สร้างร้านซ้ำ | Automated + E2E |
| APR-13 | ส่งคำขอร่วมขายซ้ำ | คำขอ pending/approved เดิมถูกนำกลับมาใช้ ส่วน rejected กลับเป็น pending ได้ | Automated + E2E |

## Catalog, Storage and discovery

| ID | Case | Expected | Type |
|---|---|---|---|
| CAT-01 | Guest อ่าน Market/Store approved | อ่านได้โดยไม่เห็นข้อมูลส่วนตัว | Manual/E2E |
| CAT-02 | อัปโหลด avatar ไป path ผู้ใช้อื่น | Storage RLS ปฏิเสธ | Automated + E2E |
| CAT-03 | อัปโหลด Market/Store image โดยไม่ใช่ owner | Storage RLS ปฏิเสธ | Automated + E2E |
| CAT-04 | อัปโหลดไฟล์เกิน 5 MB หรือ MIME อื่น | bucket ปฏิเสธ | Automated + E2E |
| CAT-05 | มีผลลัพธ์ใน 10 กม. | ไม่ขยาย radius | Manual/E2E |
| CAT-06 | ไม่มีผลลัพธ์ใน 10 กม. | ขยาย 15, 20, ... 100 กม. | Manual/E2E |
| CAT-07 | ไม่มีผลลัพธ์ใน 100 กม. | คืนรายการใกล้สุดทั่วประเทศ | Manual/E2E |

## Cart, order and allocation

| ID | Case | Expected | Type |
|---|---|---|---|
| ORD-01 | เพิ่มร้านเดิมสองครั้ง | จำนวนใน cart เป็น 2 ไม่รีเซ็ตเป็น 1 | Automated + E2E |
| ORD-02 | เพิ่มสินค้าคนละ Market | RPC ปฏิเสธ | Manual/E2E |
| ORD-03 | Client ส่งราคา/ผู้ขายปลอม | Server ไม่อ่านค่าเหล่านั้น | Database |
| ORD-04 | สั่ง 30 จาก stock 100/100/100 | allocation 10/10/10 | Automated |
| ORD-05 | สั่ง 30 จาก stock 5/100/100 | allocation 5/13/12 หรือ 5/12/13 | Automated |
| ORD-06 | stock รวมไม่พอ | transaction rollback ทั้งหมด | Automated |
| ORD-07 | checkout พร้อมกันเกิน stock | มีเพียงปริมาณที่ lock ได้; stock ไม่ติดลบ | Manual/E2E |
| ORD-08 | เปลี่ยนราคาหลังสั่ง | order snapshot ไม่เปลี่ยน | Manual/E2E |
| ORD-09 | address ไม่ใช่ของ buyer | RPC ปฏิเสธ | Manual/E2E |
| ORD-10 | cancellation ซ้ำ | reserved stock ถูกคืนครั้งเดียว | Manual/E2E |
| ORD-11 | cancel หลัง shipped โดยไม่ใช่ Admin | RPC ปฏิเสธ | Manual/E2E |

## Logistics, chat and notifications

| ID | Case | Expected | Type |
|---|---|---|---|
| LOG-01 | Seller เปลี่ยน allocation ของคนอื่น | RPC ปฏิเสธ | Manual/E2E |
| LOG-02 | รวม order ก่อนทุก allocation ถึง hub | RPC ปฏิเสธ | Manual/E2E |
| LOG-03 | ส่ง order ก่อน consolidated | RPC ปฏิเสธ | Manual/E2E |
| LOG-04 | Tracking number | อยู่ระดับ order เพียงรายการเดียว | Manual/E2E |
| LOG-05 | Buyer ยืนยัน delivery ของผู้อื่น | RPC ปฏิเสธ | Manual/E2E |
| CHAT-01 | บุคคลที่สามอ่าน chat room | RLS ไม่คืนข้อมูล | Manual/E2E |
| CHAT-02 | Buyer/manager ส่งข้อความ | อีกฝ่ายได้รับผ่าน Realtime | Manual/E2E |
| NOTI-01 | Approval เปลี่ยนสถานะ | เจ้าของคำขอได้รับ notification | Manual/E2E |

## Release verification

```bash
npm test
npm run typecheck
npm run lint -- --quiet
npx expo export --platform web --output-dir dist
npm audit --omit=dev --audit-level=high
```

ทดสอบ Manual/E2E ด้วยบัญชีอย่างน้อย 6 บัญชี: Platform Admin, Market owner,
Store manager, Seller A, Seller B และ Buyer. ห้ามใช้บัญชีเดียวสลับทุกบทบาท เพราะจะ
ไม่สามารถพิสูจน์ isolation ของ RLS ได้.
