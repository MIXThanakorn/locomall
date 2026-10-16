# Locomall V1 Test Cases

สถานะ `Automated` หมายถึงมีการตรวจด้วย `npm test`; สถานะ `Manual/E2E`
ต้องรันด้วยบัญชีแยกบทบาทบน preview build ก่อน release.

## Demo wallet / reviews / saved catalog (V1 academic demo)

| ID | Case | Expected | Type |
|---|---|---|---|
| DEMO-01 | ส่งคำขอเติมยอด UUID เดิมซ้ำ / เปลี่ยนยอดโดยใช้ UUID เดิม | คำขอเดียว; payload ต่างกันถูกปฏิเสธ | Automated + E2E |
| DEMO-02 | Buyer ปลอมการอนุมัติยอดหรือเขียน ledger/account ตรง | ฐานข้อมูลปฏิเสธ; ยอดไม่เปลี่ยน | Automated + E2E |
| DEMO-03 | Admin อนุมัติ top-up ซ้ำ | ยอดเพิ่มครั้งเดียว | Automated + E2E |
| DEMO-04 | Checkout ยอดไม่พอหรือสต็อกไม่พอ | ไม่เกิดออเดอร์/จองสต็อก/หักยอดค้าง | Automated + E2E |
| DEMO-05 | ส่ง checkout request ID เดิมซ้ำ | คืน order ID เดิม ไม่หักซ้ำ | Automated + E2E |
| DEMO-06 | ยกเลิกออเดอร์ wallet ซ้ำ | คืนยอดครั้งเดียวและสถานะเป็น `demo_refunded` | Automated + E2E |
| DEMO-07 | Buyer รับสินค้าและ Admin บันทึกโอนซ้ำ | ยอดผู้ขายเกิดตาม allocation ครั้งเดียว; บันทึกโอนครั้งเดียว | Automated + E2E |
| DEMO-08 | Buyer/Seller/Admin คนละบัญชีอ่าน wallet/ledger ของผู้อื่น | Buyer/Seller อ่านไม่ได้; Admin อ่านเพื่อตรวจสอบได้ | Automated + E2E |
| DEMO-09 | เปิดออเดอร์ COD เก่าหลัง migration | ยังเป็น COD และอ่านประวัติได้ | Manual/E2E |
| DEMO-10 | รีวิวก่อนรับสินค้า/ออเดอร์คนอื่น/รีวิวซ้ำ | ปฏิเสธก่อนรับหรือไม่ใช่เจ้าของ; รีวิวซ้ำเป็นการแก้ของเดิม | Automated + E2E |
| DEMO-11 | Admin ซ่อนรีวิวพร้อมเหตุผล | รีวิวสาธารณะและคะแนนเฉลี่ยไม่รวมรายการที่ซ่อน | Automated + E2E |
| DEMO-12 | Favorite/Follow ซ้ำและเอาออก | ไม่สร้างแถวซ้ำ; Favorite ไม่ส่งแจ้งเตือน | Automated + E2E |
| DEMO-13 | อนุมัติร้านใหม่ / สต็อกกลับมาพร้อมขาย | แจ้งผู้ติดตามเท่านั้น ไม่แจ้งทุกครั้งที่ตัวเลขสต็อกเปลี่ยน | Automated + E2E |
| DEMO-14 | Admin อนุมัติคำขอขณะ Buyer เปิด Wallet ค้างไว้ แล้วทดสอบดึงลงรีเฟรชเมื่อเน็ตหลุด | ยอด สถานะคำขอ และประวัติอัปเดตเอง; ดึงลงแล้วกู้ข้อมูลล่าสุดได้ | Manual/E2E |
| DEMO-15 | ดูยอด/QR ใน APK ทุกหน้า | ป้าย “เงินจำลอง” ชัด และ QR ใช้กับธนาคารไม่ได้ | Manual/E2E |

การทดสอบ SQL ในหน่วยความจำอยู่ที่ `tests/demo-v1-db.test.mjs`; ต้องทดสอบซ้ำกับ
Supabase Test Project และ APK หลายบัญชี เพราะ harness ไม่ครอบคลุม PostGIS/Realtime/Push จริง.

## Realtime ข้อมูลหลัก

| ID | Case | Expected | Type |
|---|---|---|---|
| RT-01 | Buyer เปิดรายการที่ซื้อค้างไว้ แล้ว Seller รับงาน/ส่งสินค้า | สถานะเปลี่ยนเองโดยไม่ปิดหน้า และไม่มีออเดอร์ของผู้อื่นปน | Manual/E2E |
| RT-02 | Seller เปิดรายการที่ขายค้างไว้ แล้ว Market owner รับของ | งานขายเปลี่ยนสถานะเองเฉพาะรายการที่ Seller มีสิทธิ์ | Manual/E2E |
| RT-03 | Buyer เปิดตะกร้าบนสองเครื่อง แล้วเพิ่ม/ลดสินค้าจากอีกเครื่อง | รายการและเลข badge อัปเดตเอง รวมถึงเมื่อลบสินค้า | Manual/E2E |
| RT-04 | เปิดคิว Admin/Market owner แล้วส่งคำขอร้านใหม่จากอีกบัญชี | คิวและจำนวนงานเปลี่ยนเอง; ผู้ใช้ทั่วไปไม่เห็นคำขอคนอื่น | Manual/E2E |
| RT-05 | ปิดอินเทอร์เน็ตระหว่างเปิดหน้า แล้วต่อใหม่หรือกลับจากพื้นหลัง | ข้อมูลล่าสุดกลับมา; ดึงลงรีเฟรชยังใช้ได้ | Manual/E2E |

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
| ORD-02 | เพิ่มสินค้าคนละ Market | เก็บได้ทั้งสองตลาด; แสดงกลุ่มตลาดและ checkout แยก | Automated + E2E |
| ORD-03 | Client ส่งราคา/ผู้ขายปลอม | Server ไม่อ่านค่าเหล่านั้น | Database |
| ORD-04 | สั่ง 30 จาก stock 100/100/100 | allocation 10/10/10 | Automated |
| ORD-05 | สั่ง 30 จาก stock 5/100/100 | allocation 5/13/12 หรือ 5/12/13 | Automated |
| ORD-06 | stock รวมไม่พอ | transaction rollback ทั้งหมด | Automated |
| ORD-07 | checkout พร้อมกันเกิน stock | มีเพียงปริมาณที่ lock ได้; stock ไม่ติดลบ | Manual/E2E |
| ORD-08 | เปลี่ยนราคาหลังสั่ง | order snapshot ไม่เปลี่ยน | Manual/E2E |
| ORD-09 | address ไม่ใช่ของ buyer | RPC ปฏิเสธ | Manual/E2E |
| ORD-10 | cancellation ซ้ำ | reserved stock ถูกคืนครั้งเดียว | Manual/E2E |
| ORD-11 | cancel หลัง allocation แรกเป็น collected แม้ order ยัง preparing | RPC ปฏิเสธ; ไม่คืน stock/ยอดเงิน | Automated + E2E |
| ORD-12 | สั่งเฉพาะตลาด A ขณะมี A/B ในตะกร้า | รายการตลาด B และตะกร้าผู้อื่นยังอยู่ | Automated + E2E |
| ORD-13 | บันทึกสินค้าถึง hub ซ้ำ และยืนยันรับซ้ำ | ตัด on-hand/ยอดจองครั้งเดียวที่ hub; เพิ่มยอดขายครั้งเดียวตอนรับ | Automated + E2E |
| ORD-14 | Migration พบยอดจองเก่าไม่ตรง | Rollback ทั้ง migration ไม่ปรับยอดบางส่วนค้างไว้ | Automated |

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
| NOTI-01 | Login บนเครื่องจริงครั้งแรก | ระบบขอสิทธิ์แจ้งเตือน และการปฏิเสธไม่บล็อกการใช้งาน | Device/E2E |
| NOTI-02 | อนุญาตแจ้งเตือนบน Development/Production Build | Expo push token ถูกลงทะเบียนให้ user ปัจจุบันผ่าน RPC | Device/Integration |
| NOTI-03 | Logout แล้วเปลี่ยนบัญชีบนเครื่องเดิม | token ของบัญชีก่อนหน้าถูก disable และไม่รับข้อมูลส่วนตัวต่อ | Device/Security |
| NOTI-04 | เปิดหน้าการแจ้งเตือน | filter ทั้งหมด/คำสั่งซื้อ/คำขอ/แชต/ระบบ และเฉพาะยังไม่อ่านทำงานถูกต้อง | UI/E2E |
| NOTI-05 | แตะ Push ของ Order/Market/Store/Chat | แอปเปิดหน้ารายละเอียด entity ที่เกี่ยวข้อง | Device/E2E |
| NOTI-01 | Approval เปลี่ยนสถานะ | เจ้าของคำขอได้รับ notification | Manual/E2E |

## Release verification

### Backend consistency and compact filters

- Seller A/B ในออเดอร์ร่วมกัน: อ่าน order/order_items ทั้งชุดไม่ได้; RPC ได้เฉพาะ allocation ของตน
- ผู้ซื้อ/เจ้าของตลาด/Admin ยังอ่านรายการที่ตนมีสิทธิ์ได้ตามเดิม; บุคคลที่สามไม่ได้ข้อมูล
- รวมพัสดุ/บันทึกส่งซ้ำด้วย payload เดิมเป็น no-op; payload ต่างหรือออเดอร์ยกเลิกต้องถูกปฏิเสธ
- หลัง delivered แล้ว retry การส่ง/รวมต้องไม่ลดสถานะ; ทดสอบจริงหลาย connection ก่อน release
- NaN/Infinity ถูกปฏิเสธที่ตาราง รวมยอดร้าน ออเดอร์ Wallet และ ledger
- เบอร์ว่างทำธุรกรรมใหม่ไม่ได้; กรอกเบอร์แล้วทำต่อได้; ออเดอร์เก่าไม่ถูกยกเลิกเอง
- ออเดอร์ 5 ครั้ง/นาทีและค้าง 10 รายการ; top-up 3 ครั้ง/นาทีและค้าง 3;
  chat 30 ครั้ง/นาที; การ retry top-up เดิมไม่เพิ่มยอดซ้ำหรือเผา quota เพิ่ม
- เวลา chat ถูกกำหนดโดย server แม้ payload ส่งเวลาอนาคต; quota อ่าน/เขียนเองไม่ได้
- หน้า Home ตัวกรองแถวเดียวเลื่อนแนวนอนได้; ปิด sheet ไม่เปลี่ยนค่า กดใช้จึงเปลี่ยน ล้างกลับค่าเริ่มต้น
- ทดสอบบนจอเล็ก ตัวอักษรขยาย iOS/Android และโหมด gesture/3 ปุ่มหลัง build ใหม่

### Home catalog filters

| ID | ขั้นตอน | ผลที่คาดหวัง | วิธีตรวจ |
|---|---|---|---|
| HOME-01 | เปิด Home โดยไม่เลือกตัวกรอง | แสดงตลาดและร้านทุกระยะเรียงใกล้ก่อน รวมรายการเกิน 10 กม. | Automated + Device |
| HOME-02 | เลือกตลาด/ร้านค้า และใช้คำค้น | พบเฉพาะประเภทและคำค้นที่เลือก รวมหน้าถัดไป | Automated + Device |
| HOME-03 | เลือกใกล้เคียง | ระยะ 9.999 และ 10 กม. เข้าได้; 10.001 กม. ไม่เข้า แม้ปัดเลขเป็น 10 | Automated |
| HOME-04 | รวมใกล้เคียง ประเภท และพื้นที่หลัก | ใช้เงื่อนไขร่วมกันก่อนแบ่งหน้า ไม่ใช้พื้นที่ของบัญชีอื่น | Automated + Device |
| HOME-05 | ไม่มี GPS และไม่มีพื้นที่หลัก | ใกล้เคียงไม่มีผลลัพธ์พร้อมคำแนะนำ ไม่ขยายเป็นทั้งประเทศ | Automated + Device |
| HOME-06 | เปลี่ยนตัวกรองขณะโหลด/ล้างตัวกรอง | ไม่ปะปนผลเก่า เริ่มหน้าใหม่; คำค้นและพื้นที่หลักคงเดิม | Contract + Device |
| HOME-07 | ลากลงรีเฟรช/โหลดต่อหลังกรอง | ใช้ตัวกรองเดิม ไม่ซ้ำหรือข้ามรายการที่ระยะเท่ากัน | Automated + Device |
| HOME-08 | เปิดพร้อมขาย | ไม่แสดงร้านสต็อกศูนย์/จองเต็ม/หยุดขาย; ตลาดต้องมีอย่างน้อยหนึ่งร้านที่สั่งได้ | Automated + Device |
| HOME-09 | เลือกคะแนนสูงสุด | คะแนนมาก่อน ไม่มีรีวิวอยู่ท้าย คะแนนเท่ากันเรียงระยะทาง | Automated + Device |
| HOME-10 | เรียงราคาทั้งสองทิศทาง | ใช้ราคาเริ่มต้นสำหรับตลาด; ราคาศูนย์เป็นราคาจริง ไม่ใช่ไม่มีราคา; ราคาไม่มีอยู่ท้าย | Automated + Device |
| HOME-11 | รวมพร้อมขาย/ระยะ/ประเภท/ค้นหา/คะแนน | กรองทุกเงื่อนไขก่อนแบ่งหน้า และใช้เฉพาะพื้นที่บัญชีปัจจุบัน | Automated + Device |
| HOME-12 | โหลดหลายหน้าเมื่อราคา/คะแนนเท่ากันหรือไม่มีพิกัด | cursor ไม่ทำให้รายการซ้ำหรือหาย และล้างตัวกรองคืนค่าเดิม | Automated + Device |

```bash
npm test
npm run typecheck
npm run lint -- --quiet
npx expo export --platform web --output-dir dist
npm audit --omit=dev --audit-level=high
```

### Security boundary regression — 16 Oct 2026

- PKCE: refuse implicit tokens, foreign callbacks and duplicate codes; require the local recovery verifier and recovered account before changing a password. Request a fresh link on the same device.
- Shared device: resolve an A request after switching to B, fail B's load, and confirm neither private rows nor badge counts from A appear; check retained Back history on actual devices.
- Snapshot: edit a saved address after checkout and confirm the order recipient stays unchanged. Historical orders must not pretend that current address data is a checkout snapshot. A legacy invalid phone must not block changing the default of a different valid address, but must block a new delivery using that invalid address.
- Limits: reject oversized names/descriptions/addresses at the DB boundary; enforce address/room/device caps, but opening an existing chat remains possible at the cap. Check stock/review/registration rate limits without changing internal order processing.
- Push: authenticated Vault wake returns 200 with no jobs; client roles cannot claim/read jobs. Mock a logout between send and successful ticket: enabled remains false. Duplicate wake does not resend accepted work; check actual provider receipts on real APK tests.
- Paging: load more than 25 rows across ties in created_at, filter notifications before paging, and open a logistics deep link outside the first window.

ทดสอบ Manual/E2E ด้วยบัญชีอย่างน้อย 6 บัญชี: Platform Admin, Market owner,
Store manager, Seller A, Seller B และ Buyer. ห้ามใช้บัญชีเดียวสลับทุกบทบาท เพราะจะ
ไม่สามารถพิสูจน์ isolation ของ RLS ได้.

## Catalog presentation (2026-10-16)

- Home/market: use a 320–390 logical-pixel viewport and font scale 1.0/1.3/1.5. Cards should switch to one column when needed; names must not overlap prices or stock badges.
- Product cards: display the product image/name, shop, sale-unit price, true ready-stock status, and rating only when loaded. Sold quantities are order units, not universally pieces. Missing/broken images must show a fallback.
- Market: search both shop and product names; combine search with ready-stock filtering; clear filters from the empty state. Shops appear before the latest three reviews, with one review request per target.
- Store: select quantity and see subtotal before full reviews; stock refresh must clamp selected quantity. Check add-to-cart, self-purchase protection, guest sign-in, chat, and the market link.
- Real devices: verify the bottom purchase button clears the Android gesture bar/iOS home indicator, including large text and keyboard-open states. Browser checks do not replace APK/iOS verification.
