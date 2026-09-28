# Locomall RLS security audit — 2026-09-28

รายงานนี้เป็นการตรวจแบบ read-only ของ live Supabase project `LOCO_MALL`
ณ วันที่ 28 กันยายน 2026 ครอบคลุม public/private policies, table grants,
`SECURITY DEFINER` functions, Storage policies และข้อมูลที่ anonymous/authenticated
roles อ่านหรือแก้ได้โดยตรงผ่าน Data API.

> สถานะ: **พบแล้ว ยังไม่ได้แก้** ตามขอบเขตที่กำหนดในรอบนี้

## สรุป

| ระดับ | จำนวน | ใจความสำคัญ |
|---|---:|---|
| High | 3 | ผู้ขายแก้คอลัมน์ระบบของ listing, ผู้ใช้ปลอมพื้นที่หลัก, buyer ย้าย chat room |
| Medium | 6 | catalog/allocations เปิด metadata มากไป, private ownership oracle, รูปคำขออยู่ public bucket, cart เขียนตรง, URL รูปตรวจไม่เข้ม |
| Low / Hardening | 3 | grants กว้าง, notification/address integrity, trigger function executable |

สิ่งที่ทำถูกต้องแล้ว:

- เปิด RLS ครบทั้ง 22 ตารางใน `public`
- ตาราง role, audit log และ approval history ไม่มี policy เขียนจากผู้ใช้ทั่วไป
- order/order item ใช้ participant-based SELECT และการเขียนหลักผ่าน RPC
- Storage write policies ของ market/store/avatar ตรวจ path ownership ทั้ง `USING` และ `WITH CHECK`
- public `SECURITY DEFINER` functions ไม่ให้ `anon` หรือ `PUBLIC` execute
- ไม่มี view ใน `public` หรือ `private` ที่อาจข้าม RLS

## Findings

### RLS-01 — ผู้ขายแก้คอลัมน์ระบบใน `seller_listings` ได้เอง

- Severity: **High**
- Policy: `listing_self_update`
- เงื่อนไขตรวจเพียง `seller_id = auth.uid()` ทั้ง `USING` และ `WITH CHECK`
- ผลคือผู้ขายแก้ได้ทุกคอลัมน์ของ row ตนเอง ไม่ใช่แค่ stock/status ได้แก่
  `store_id`, `reserved_quantity`, `fulfilled_quantity`, `last_allocated_at` และสถานะ
  `suspended`
- สามารถย้าย listing ไปอีกร้าน, เปลี่ยนยอดจอง/ยอดส่งมอบ หรือบิด fairness cursor
  โดยไม่ผ่าน `update_my_listing_stock`

แนวแก้ที่เสนอ: ถอน direct `UPDATE` policy แล้วบังคับใช้ RPC ที่จำกัดคอลัมน์ หรือใช้
column-level privileges/trigger ป้องกัน system-managed columns.

### RLS-02 — ผู้ใช้ปลอมพื้นที่หลักและพิกัดของตนเองได้

- Severity: **High**
- Policy: `locations_self` ให้เจ้าของ row `ALL`
- ผู้ใช้แก้ `province_code`, `district_code`, `subdistrict_code`, `geography`,
  `source` และ `gps_consent` ตรงผ่าน REST ได้
- FK แยกแต่ละรหัสไม่ได้ยืนยันว่าจังหวัด → อำเภอ → ตำบลอยู่ใน hierarchy เดียวกัน
- flow สมัครเปิดร้าน/ร่วมขายเชื่อ `user_locations.subdistrict_code` จึงอาจปลอมว่าอยู่
  ตำบลเดียวกับ Market และ exact geography อาจกระทบ eligibility ระยะทาง

แนวแก้ที่เสนอ: ห้าม direct write และเขียนผ่าน validated RPC เท่านั้น พร้อม composite
hierarchy validation และกำหนดว่า geography ใดมาจาก centroid/GPS ที่เชื่อถือได้.

### RLS-03 — Buyer สามารถย้าย `chat_rooms` ที่มีข้อความเดิมไปอีกร้าน

- Severity: **High**
- Policy: `rooms_buyer_update`
- `WITH CHECK` ตรวจเพียง `buyer_id = auth.uid()` แต่ไม่ล็อก `store_id`
- Buyer จึงแก้ `store_id` ของห้องเดิมได้ ทำให้ manager ร้านใหม่อ่านประวัติข้อความเดิม
  และทำลายความถูกต้องของคู่สนทนา

แนวแก้ที่เสนอ: ไม่อนุญาต UPDATE ห้องโดย client หรือบังคับ `store_id`/`buyer_id`
immutable; การสร้างห้องควรทำผ่าน RPC/INSERT ที่ตรวจร้าน approved เท่านั้น.

### RLS-04 — Public catalog เปิดเผยคอลัมน์ภายในมากกว่าที่จำเป็น

- Severity: **Medium**
- Anonymous อ่าน approved rows จาก `markets`, `stores` และ active rows จาก
  `seller_listings` ได้ทั้ง row
- เปิดเผย UUID ของ owner/manager/seller, exact stock, reserved/fulfilled counts,
  `last_allocated_at`, raw geography, timestamps และ metadata ภายในอื่น ๆ
- RLS กรองได้ระดับ row แต่กรอง column ไม่ได้

แนวแก้ที่เสนอ: ถอน anonymous SELECT จาก base tables และเปิด `security_invoker`
catalog views/RPC ที่คืนเฉพาะ public fields และ aggregate stock.

### RLS-05 — Buyer/participant อ่าน seller allocation breakdown ได้

- Severity: **Medium**
- Policy: `allocations_participants`
- `private.can_access_allocation` อนุญาต seller **หรือ** ผู้ที่เข้าถึง order item
- Buyer จึงอ่าน `seller_id`, `listing_id`, quantity และสถานะรายผู้ขายทั้งหมดผ่าน REST
  แม้ UI จะกรองและแสดงเพียงข้อมูลรวม

แนวแก้ที่เสนอ: base allocation ให้ seller/manager/owner/admin เท่านั้น และให้ buyer อ่าน
สถานะรวมผ่าน view/RPC ที่ไม่คืน seller identity.

### RLS-06 — Ownership helper เป็น oracle ที่ `anon` เรียกได้

- Severity: **Medium**
- Functions: `private.market_owner(bigint, uuid)` และ
  `private.store_manager(bigint, uuid)`
- ทั้งสองเป็น `SECURITY DEFINER` และ `anon` มี EXECUTE พร้อมส่ง UUID เป้าหมายเองได้
- ใช้ทดสอบความสัมพันธ์ระหว่าง UUID กับ Market/Store ได้ แม้ helper ไม่ควรเป็น API

แนวแก้ที่เสนอ: revoke จาก `anon`/`PUBLIC`; helper ต้องตรวจ current identity ภายใน
หรือให้ execute เฉพาะ role ที่จำเป็นต่อ policy จริง.

### RLS-07 — รูปหลักฐานสมัครผู้ขายอยู่ใน public bucket

- Severity: **Medium**
- คำขอสมัครผู้ขายเก็บ `product_image_url` ใต้ public bucket `avatars`
- Public bucket download ไม่อาศัย Storage SELECT policy ผู้ที่รู้ URL จึงเปิดรูปได้ก่อน
  approval แม้ข้อมูลคำขอควรเห็นเฉพาะ applicant/approver

แนวแก้ที่เสนอ: แยก private bucket สำหรับ application evidence และออก signed URL
เฉพาะผู้มีสิทธิ์ตรวจคำขอ.

### RLS-08 — ผู้ใช้เขียน cart/cart items ตรงและข้าม business API ได้

- Severity: **Medium-Low**
- Policies `carts_self` และ `cart_items_self` ให้เจ้าของ `ALL`
- Client ดัดแปลง `market_id`, `store_id` และ quantity ตรงได้โดยไม่ผ่าน cart RPC
- `create_cod_order` ตรวจซ้ำ จึงยังไม่พบทางแก้ราคา/stock แต่ทำให้ cart state ผิดรูป,
  UI/notification ทำงานคลาดเคลื่อน และเพิ่ม attack surface

แนวแก้ที่เสนอ: จำกัด client เป็น SELECT และ mutate ผ่าน RPC ที่ validate Market เดียว.

### RLS-09 — การตรวจ URL รูปสมัครผู้ขาย spoof ได้

- Severity: **Medium**
- `apply_to_sell_in_store` ตรวจเพียงว่าข้อความ URL มี substring
  `/object/public/avatars/{auth.uid()}/`
- URL ภายนอกที่ฝัง substring นี้ผ่าน validation ได้ ทำให้หน้า approver โหลด resource
  จากผู้โจมตี (tracking content/ไฟล์ไม่ตรงชนิด)

แนวแก้ที่เสนอ: รับเฉพาะ storage object key ไม่รับ URL เต็ม ตรวจ bucket/path ด้วยข้อมูล
ใน `storage.objects` และสร้าง URL ฝั่ง server/client ที่เชื่อถือได้.

### RLS-10 — สิทธิ์ระดับตารางกว้างเกินหลัก least privilege

- Severity: **Low / Defense in depth**
- `anon` และ `authenticated` ได้ `SELECT, INSERT, UPDATE, DELETE, TRUNCATE,
  REFERENCES, TRIGGER` บนทุก public table
- RLS ยังป้องกัน row-level access และ `TRUNCATE` ใช้ไม่ได้เมื่อ RLS เปิด แต่ grant กว้าง
  ทำให้ผลกระทบรุนแรงขึ้นทันทีหากมี policy ผิดหรือถูกปิดในอนาคต

แนวแก้ที่เสนอ: revoke privileges ที่ไม่ใช้เป็นรายตาราง/operation แล้ว grant เฉพาะ API
surface ที่ตั้งใจเปิด.

### RLS-11 — Self-update rows บางตารางแก้ metadata ได้กว้าง

- Severity: **Low**
- `notifications_self_update` ยอมให้ผู้รับแก้ type/title/body/entity/created_at ของ
  notification ตนเอง ไม่ได้จำกัดแค่สถานะอ่านแล้ว
- `user_addresses` ให้เจ้าของ `ALL` และยังไม่มี composite hierarchy validation
- ไม่ใช่ cross-user data leak แต่ทำให้ audit/UI integrity ลดลง

แนวแก้ที่เสนอ: notification ใช้ RPC mark-read หรือ column privilege; address ตรวจ parent
codes/postal code ก่อน write.

### RLS-12 — Trigger helper ยัง executable โดย API roles

- Severity: **Low / Hardening**
- `private.notify_approval()` เป็น `SECURITY DEFINER` trigger function แต่ `anon` และ
  `authenticated` ยังมี EXECUTE
- PostgreSQL ไม่อนุญาตเรียก trigger function ตรงแบบ function ปกติ จึงยังไม่พบ exploit
  โดยตรง แต่ privilege นี้ไม่จำเป็นและขัดหลัก helper ไม่ควรเป็น API

แนวแก้ที่เสนอ: revoke EXECUTE จาก `PUBLIC`, `anon`, `authenticated` สำหรับ trigger/helper
ทุกตัว แล้ว grant เฉพาะกรณีที่พิสูจน์ว่าจำเป็น.

## Supabase Security Advisor

ผลตรวจวันเดียวกันไม่มี Critical/High แต่มี warnings:

1. `authenticated_security_definer_function_executable` จำนวน 24 RPC — ไม่ได้แปลว่า
   ทุก RPC เป็นช่องโหว่ แต่เป็น privileged attack surface ที่ต้องตรวจ auth, ownership,
   state transition และ input ทีละตัว ดูแนวทางจาก
   [Supabase database linter](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
2. Leaked-password protection ยังปิด ดู
   [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## ขอบเขตและสิ่งที่ยังไม่ได้ทำ

- ไม่ได้แก้ policy, grants, functions, Storage หรือ Auth setting ใด ๆ
- ไม่ได้ใช้ exploit กับข้อมูลผู้ใช้จริง และไม่ได้ทดสอบ destructive operation
- ยังควรทำ automated role-matrix tests ด้วย JWT แยก `anon`, buyer, seller, manager,
  market owner และ admin รวมถึง concurrent checkout/cancellation
- หลังแก้แต่ละ finding ต้องรัน Security/Performance Advisors, contract tests และ regression
  กับ REST/RPC/Storage ใหม่ทั้งหมด
