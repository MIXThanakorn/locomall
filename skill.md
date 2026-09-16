---
description: แนวทางและข้อกำหนดสำหรับพัฒนาเอกสาร ออกแบบระบบ ฐานข้อมูล API
  และโค้ดของโครงงาน Locomall โดยยึดระบบ Local Community Marketplace
  แบบตลาดชั่วคราวและการกระจายออเดอร์ให้ผู้ขายหลายราย แทนโมเดล Online
  Shopping/ร้านค้าเดี่ยวแบบเดิม
name: locomall-community-marketplace
---

# Locomall Community Marketplace --- Project Skill

## 1. Purpose

ใช้ไฟล์นี้เป็น source of truth สำหรับงานพัฒนาต่อของโครงงาน **Locomall**
โดยเฉพาะงานที่เกี่ยวกับ:

-   วิเคราะห์และออกแบบระบบ
-   แก้ไขบทที่ 1--3 ของเอกสารโครงงาน
-   Database / ERD / Data Dictionary
-   Supabase / PostgreSQL / RLS
-   Use Case / Activity / Sequence / Class Diagram
-   API / RPC
-   Flutter application
-   Order allocation และ seller settlement
-   Chat / Review / Wallet / Notification

เอกสารเดิมทั้ง 3 บทมีแนวคิดพื้นฐานของแพลตฟอร์มซื้อขายสินค้าชุมชน แต่ส่วนสำคัญของ
business flow และ database เดิมยังเป็นโมเดล e-commerce ทั่วไปที่มี
`shop -> product -> order` โดย order ถูกส่งไปยังร้านค้าเดียว

**ต้องถือว่าโมเดลเดิมนี้ถูกแทนที่ด้วยโมเดล Community Marketplace ด้านล่าง**

------------------------------------------------------------------------

# 2. Current Business Model --- MUST FOLLOW

Locomall ไม่ใช่ระบบที่ผู้ขายแต่ละคนต้องเปิดร้านแยกกันเพื่อขายสินค้าเป็นหลัก

ระบบใหม่ใช้แนวคิด:

> **Temporary Community Market + Shared Product + Multiple Sellers +
> Automatic Order Allocation**

### ตัวอย่าง

มีตลาด:

> ตลาดมะพร้าวชุมชน

สินค้า:

> มะพร้าวน้ำหอม

ผู้สร้างตลาดกำหนดราคากลางของรายการขาย:

> 20 บาท / ลูก

ผู้ขายที่มีสินค้าชนิดเดียวกันสามารถเข้าร่วมตลาดได้:

-   Seller A มี 100 ลูก
-   Seller B มี 100 ลูก
-   Seller C มี 100 ลูก

ลูกค้าสั่ง:

> 30 ลูก

ระบบต้องกระจายคำสั่งซื้อให้ผู้ขายที่มีรายการสินค้านี้แบบเท่า ๆ กัน:

-   Seller A → 10 ลูก
-   Seller B → 10 ลูก
-   Seller C → 10 ลูก

รายได้ของแต่ละ seller:

> fulfilled_quantity × unit_price

ดังนั้น:

-   A ได้ 10 × 20 = 200 บาท
-   B ได้ 10 × 20 = 200 บาท
-   C ได้ 10 × 20 = 200 บาท

หลักการนี้เป็น core business rule ของระบบใหม่

------------------------------------------------------------------------

# 3. Important Terminology

ให้ใช้คำต่อไปนี้อย่างสม่ำเสมอ

  Old concept                  New concept
  ---------------------------- ----------------------------------------
  Shop / ร้านค้าเดี่ยว             Market / ตลาดชุมชน
  Shop owner                   Market owner
  Product owned by shop        Market product
  Product stock                Seller listing quantity
  One seller receives order    Order is allocated to multiple sellers
  Order -\> shop               Order -\> order items -\> allocations
  Shop wallet                  Seller earnings / wallet transactions
  Shop product management      Market + market product management
  Seller sells independently   Seller joins a market/product listing

ห้ามกลับไปใช้คำว่า `shop_id` เป็นตัวเชื่อมหลักของ order ใน design ใหม่

------------------------------------------------------------------------

# 4. Source Documents

ข้อมูลพื้นฐานของโครงงานมาจาก:

-   บทที่ 1: บทนำ / ที่มา / วัตถุประสงค์ / ขอบเขต
-   บทที่ 2: ทฤษฎี เทคโนโลยี Supabase PostgreSQL และฐานข้อมูล
-   บทที่ 3: Use Case / Activity / Sequence / Class Diagram
    และรายละเอียดการทำงาน

เอกสารเดิมระบุแนวคิดสำคัญ เช่น การเป็นสื่อกลางให้ผู้ค้ารายย่อยขายสินค้า
การลดการพึ่งพาคนกลาง และการให้ผู้ซื้อเข้าถึงสินค้าท้องถิ่นโดยตรง

เมื่อข้อมูลในเอกสารเดิมขัดกับ business model ใหม่นี้ ให้ใช้ **business model
ใหม่เป็นหลัก** และแก้เอกสารให้สอดคล้องกันทั้งระบบ

------------------------------------------------------------------------

# 5. Main Actors

## 5.1 User / Buyer

ผู้ใช้งานสามารถ:

-   สมัครสมาชิก / Login
-   แก้ไข profile
-   จัดการที่อยู่
-   ค้นหาตลาด
-   ดู market products
-   ดูผู้ขายที่เข้าร่วมรายการสินค้า
-   ซื้อสินค้า
-   เติมเงิน / ใช้ wallet
-   ติดตาม order
-   สนทนา
-   รีวิวหลัง order completed

## 5.2 Seller

User ทุกคนสามารถเป็น seller ได้ตามสิทธิของระบบ

Seller สามารถ:

-   เข้าร่วมตลาด
-   ลงรายการสินค้าที่ตรงกับ market product
-   ระบุจำนวน stock ที่มี
-   ดูรายการ allocation ที่ระบบกระจายให้
-   ยืนยัน/จัดเตรียมสินค้าของ allocation
-   อัปเดตสถานะการจัดส่งของส่วนที่ตนรับผิดชอบ
-   ดูรายได้จากสินค้าที่ส่งจริง
-   ดูประวัติธุรกรรม

## 5.3 Market Owner

ผู้สร้างตลาดชั่วคราว

สามารถ:

-   สร้าง market
-   กำหนด category
-   กำหนดรายละเอียด
-   สร้าง market product
-   กำหนดราคาขาย
-   ดู seller ที่เข้าร่วม
-   ดู order และ allocation ภาพรวม

Market owner ไม่ได้หมายความว่าเป็นเจ้าของ stock ของ seller ทุกคน

## 5.4 Admin

สามารถจัดการ:

-   ผู้ใช้งาน
-   ตลาด
-   รายการสินค้า
-   รายงาน
-   การระงับ market/listing
-   transaction ที่ต้องตรวจสอบ
-   moderation

------------------------------------------------------------------------

# 6. Database Architecture

ใช้:

-   Supabase Auth
-   PostgreSQL
-   Supabase Storage
-   Supabase Realtime
-   PostgreSQL RLS
-   PostgreSQL Functions / RPC สำหรับ business-critical transactions

Authentication ใช้ `auth.users` ของ Supabase

ข้อมูล profile อยู่ใน:

`public.profiles`

------------------------------------------------------------------------

# 7. Current Database Model

## 7.1 profiles

แทน `users_tb` เดิม

``` text
user_id uuid PK -> auth.users.id
full_name
username
phone_num
age
gender
role
user_img_url
wallet_balance
created_at
updated_at
```

ไม่ควรเก็บ password ใน `profiles`

Email และ authentication credentials ให้ใช้ Supabase Auth

------------------------------------------------------------------------

## 7.2 user_addresses

แทน `user_address_tb`

``` text
address_id PK
user_id FK -> profiles.user_id
address_name
province
district
sub_district
detail
is_default
created_at
updated_at
```

User หนึ่งคนมีหลาย address ได้

------------------------------------------------------------------------

## 7.3 markets

แทนแนวคิด `shops_tb`

``` text
market_id PK
owner_id FK -> profiles.user_id
market_name
market_category
market_description
market_img_url
status
created_at
updated_at
```

Market คือพื้นที่ขายสินค้าประเภท/กิจกรรมหนึ่งประเภท ไม่ใช่ร้านค้าส่วนตัวของ seller
แต่ละคน

ตัวอย่าง:

``` text
ตลาดมะพร้าวชุมชน
ตลาดสินค้า OTOP
ตลาดผักชุมชน
ตลาดกล้วย
```

------------------------------------------------------------------------

## 7.4 market_products

แทน `products_tb` เดิม

``` text
market_product_id PK
market_id FK -> markets.market_id
product_name
product_description
unit
product_price
product_img_url
status
created_at
updated_at
```

Market product เป็นสินค้าในตลาดที่ทุก seller
สามารถเข้าร่วมขายได้หากมีสินค้าประเภทเดียวกัน

ตัวอย่าง:

``` text
Market:
    ตลาดมะพร้าวชุมชน

Market Product:
    มะพร้าวน้ำหอม
    20 บาท / ลูก
```

------------------------------------------------------------------------

## 7.5 seller_listings

ตารางใหม่ที่สำคัญมาก

``` text
listing_id PK
market_product_id FK
seller_id FK -> profiles.user_id
quantity
reserved_quantity
sold_quantity
status
created_at
updated_at
```

ใช้เก็บว่า seller แต่ละคนมีสินค้าใน market product นั้นเท่าไร

ตัวอย่าง:

``` text
market_product = มะพร้าวน้ำหอม

Seller A -> quantity 100
Seller B -> quantity 100
Seller C -> quantity 100
```

`reserved_quantity` ใช้สำหรับจำนวนที่ถูกจองจาก order แต่ยังไม่ fulfilled

`sold_quantity` ใช้สำหรับจำนวนที่ขาย/ส่งสำเร็จแล้ว

------------------------------------------------------------------------

# 8. Order Architecture

## 8.1 orders

Order เป็นของ buyer

``` text
order_id PK
buyer_id FK -> profiles.user_id
address_id FK -> user_addresses.address_id
total_amount
status
payment_status
created_at
updated_at
```

**ห้ามมี `shop_id` ใน orders เป็น foreign key หลักอีกต่อไป**

เพราะ order เดียวสามารถถูกกระจายไปยัง seller หลายคน

------------------------------------------------------------------------

## 8.2 order_items

``` text
order_item_id PK
order_id FK
market_product_id FK
quantity
unit_price
total_amount
created_at
```

ต้องเก็บ `unit_price` ตอนซื้อเพื่อเป็น price snapshot

อย่าดึงราคาปัจจุบันจาก market product มาใช้คำนวณ order เก่า

------------------------------------------------------------------------

## 8.3 order_allocations

เป็นตาราง core ของระบบใหม่

``` text
allocation_id PK
order_item_id FK
listing_id FK
seller_id FK
allocated_quantity
fulfilled_quantity
unit_price
seller_amount
status
created_at
updated_at
```

ตัวอย่าง:

``` text
Order Item:
    มะพร้าว 30 ลูก

Allocation:
    Seller A -> allocated 10 -> fulfilled 10
    Seller B -> allocated 10 -> fulfilled 10
    Seller C -> allocated 10 -> fulfilled 10
```

รายได้ seller:

``` text
seller_amount = fulfilled_quantity × unit_price
```

ไม่ควรคิดรายได้จาก `allocated_quantity` หาก seller ยังไม่ได้ส่งจริง

------------------------------------------------------------------------

# 9. Order Allocation Rules

## Core rule

เมื่อ buyer สั่งสินค้า:

1.  ตรวจสอบ market product
2.  ตรวจสอบ seller listings ที่ active
3.  ตรวจสอบ stock ที่พร้อมใช้
4.  เลือก seller ที่มี stock พร้อมขาย
5.  กระจาย quantity ให้ seller อย่างเท่า ๆ กัน
6.  ถ้าหารไม่ลงตัว ให้กระจายเศษตาม deterministic rule
7.  ห้าม allocated quantity เกิน available quantity
8.  เพิ่ม reserved quantity ของแต่ละ listing
9.  สร้าง `order_allocations`
10. บันทึก transaction ภายใน database transaction เดียว

### ตัวอย่าง 30 / 3

``` text
30 ÷ 3 = 10

A = 10
B = 10
C = 10
```

### ตัวอย่าง 31 / 3

ระบบต้องกำหนด deterministic remainder rule เช่น:

``` text
A = 11
B = 10
C = 10
```

หรือ algorithm ที่มีการหมุนลำดับ seller เพื่อความยุติธรรม

ต้องเลือกกฎเดียวและใช้สม่ำเสมอ

------------------------------------------------------------------------

# 10. Concurrency Requirement

การ allocate stock เป็น critical transaction

ห้ามทำ logic สำคัญทั้งหมดบน frontend เพราะอาจเกิด race condition:

``` text
Buyer A สั่ง 50
Buyer B สั่ง 50
```

พร้อมกันในช่วงที่ stock เหลือ 50

ต้องใช้ PostgreSQL transaction และ row locking เช่น:

``` sql
SELECT ...
FOR UPDATE;
```

หรือทำผ่าน Supabase RPC / PostgreSQL function

เป้าหมายคือ:

-   stock ติดลบไม่ได้
-   allocation ซ้ำไม่ได้
-   order ไม่ถูกสร้างครึ่งเดียว
-   reserved quantity ถูกต้อง
-   wallet transaction ไม่ซ้ำ

------------------------------------------------------------------------

# 11. Wallet Architecture

ใช้ `wallet_transactions` สำหรับ user

``` text
transaction_id
user_id
amount
transaction_type
status
reference_type
reference_id
description
created_at
```

ประเภท transaction:

``` text
deposit
purchase
sale
refund
withdrawal
adjustment
```

ไม่ควรให้ client สามารถเพิ่ม wallet transaction เพื่อเพิ่มเงินเองโดยตรง

การเพิ่ม/ลดเงินต้องผ่าน secure RPC / server-side transaction

------------------------------------------------------------------------

# 12. Seller Earnings

Seller ไม่ควรมี "shop wallet" แบบเดิม

รายได้เกิดจาก:

``` text
fulfilled_quantity × unit_price
```

ตัวอย่าง:

``` text
Seller A
fulfilled = 10
price = 20

earning = 200
```

เมื่อ seller ส่งสินค้าสำเร็จ ให้ระบบสร้าง sale transaction:

``` text
transaction_type = sale
amount = seller_amount
reference_type = order_allocation
reference_id = allocation_id
```

ควรป้องกันการสร้าง sale transaction ซ้ำ

------------------------------------------------------------------------

# 13. Chat

ระบบเดิมใช้:

``` text
user + shop + message
```

ระบบใหม่ควรใช้:

``` text
chat_rooms
chat_messages
```

Room สามารถผูก buyer กับ market ได้

``` text
chat_rooms
    room_id
    buyer_id
    market_id
```

ข้อความ:

``` text
chat_messages
    message_id
    room_id
    sender_id
    message
    created_at
```

ใช้ Supabase Realtime เพื่ออัปเดตข้อความแบบทันที

------------------------------------------------------------------------

# 14. Reviews

Review ผูกกับ order

``` text
review_id PK
order_id FK
reviewer_id FK
score 1-5
review_description
created_at
```

Review ทำได้เมื่อ order เป็น:

``` text
completed
```

และ reviewer ต้องเป็น buyer ของ order นั้น

หนึ่ง order มี review ได้หนึ่งครั้ง

------------------------------------------------------------------------

# 15. Supabase Authentication

ใช้:

``` text
auth.users
```

สำหรับ:

-   email
-   password
-   session
-   authentication
-   password reset
-   OTP หากเปิดใช้งาน

เมื่อ user สมัครสมาชิก ให้ trigger:

``` text
auth.users
    ↓
profiles
```

สร้าง profile อัตโนมัติ

Frontend ไม่ควรสร้าง password ลง public table

------------------------------------------------------------------------

# 16. Supabase Storage

แนะนำแบ่ง bucket ตามประเภท:

``` text
profile-images
market-images
product-images
```

เก็บเฉพาะ URL/path ใน PostgreSQL

เช่น:

``` text
profiles.user_img_url
markets.market_img_url
market_products.product_img_url
```

------------------------------------------------------------------------

# 17. RLS Principles

ทุก public table ที่มีข้อมูล user/business ต้องเปิด RLS

หลักสำคัญ:

### profiles

User อ่าน/แก้ไข profile ของตัวเอง

### user_addresses

User CRUD ได้เฉพาะ address ของตัวเอง

### markets

Authenticated users ดู market ที่ active ได้

Owner จัดการ market ของตัวเองได้

### market_products

Market owner จัดการ product ของ market ตัวเอง

### seller_listings

Seller จัดการ listing ของตัวเอง

User อื่นดู active listing ได้

### orders

Buyer ดู order ของตัวเอง

### order_items

Buyer ดูรายการของ order ที่ตนเป็นเจ้าของ

### order_allocations

Seller ดู allocation ที่เป็นของตัวเอง

Seller แก้ไขเฉพาะ allocation ของตัวเองตาม state ที่อนุญาต

### wallet_transactions

User ดู transaction ของตัวเอง

ไม่ควรเปิด insert/update wallet transaction ให้ frontend โดยตรง

### reviews

Authenticated users อ่านได้

สร้าง review ได้เฉพาะ order ที่ตนซื้อและ completed แล้ว

### chat

ผู้เข้าร่วม room เท่านั้นที่อ่าน/ส่งข้อความได้

------------------------------------------------------------------------

# 18. RLS and Business Logic Separation

RLS ใช้สำหรับ:

> "ใครมีสิทธิ์เห็นหรือแก้ข้อมูล"

RPC / PostgreSQL Function ใช้สำหรับ:

> "ธุรกรรมต้องเกิดขึ้นอย่างไร"

ตัวอย่าง:

RLS:

``` text
Seller A เห็น allocation ของ Seller A
Seller B เห็น allocation ของ Seller B
```

RPC:

``` text
สร้าง order
ตรวจ stock
lock rows
allocate seller
reserve stock
สร้าง allocation
สร้าง payment transaction
```

อย่าใช้ RLS แทน business transaction logic

------------------------------------------------------------------------

# 19. Updated Use Cases

Use Case เดิมในบทที่ 3 ต้องปรับให้เข้ากับระบบใหม่

รายการหลักควรเป็น:

``` text
UC1 สมัครสมาชิก
UC2 เข้าสู่ระบบ
UC3 จัดการ Wallet
UC4 ค้นหา/ดูตลาด
UC5 ดู Market Product และ Seller Listings
UC6 เข้าร่วมขายสินค้าในตลาด
UC7 สร้าง/จัดการ Market
UC8 สร้าง/จัดการ Market Product
UC9 สั่งซื้อสินค้า
UC10 ระบบกระจาย Order ไปยัง Seller
UC11 Seller จัดการ Allocation
UC12 Buyer ติดตาม Order
UC13 Seller ดูรายได้/ประวัติการขาย
UC14 จัดการ Profile / Address
UC15 Chat
UC16 Review
UC17 Notification
UC18 Admin Management
```

------------------------------------------------------------------------

# 20. Updated Order Use Case

แทน flow เดิม:

``` text
Buyer
 ↓
เลือกสินค้า
 ↓
สร้าง Order
 ↓
ชำระเงิน
 ↓
ตรวจสอบ stock
 ↓
ระบบ allocate
 ↓
Seller A / B / C
 ↓
แต่ละ seller เตรียมสินค้า
 ↓
แต่ละ seller ส่งส่วนของตัวเอง
 ↓
ระบบติดตาม allocation
 ↓
Order completed
 ↓
Seller earnings
 ↓
Buyer review
```

------------------------------------------------------------------------

# 21. Order Status vs Allocation Status

ต้องแยกสองระดับ

## Order

``` text
pending_payment
paid
preparing
shipping
completed
cancelled
```

## Allocation

``` text
pending
preparing
ready
shipping
completed
cancelled
```

เพราะ seller แต่ละคนสามารถมีสถานะต่างกันได้

ตัวอย่าง:

``` text
Order #1001

Seller A -> completed
Seller B -> shipping
Seller C -> preparing
```

Order ยังไม่ควรเป็น `completed` จนกว่า allocation ที่จำเป็นทั้งหมดจะ completed

------------------------------------------------------------------------

# 22. Updated Database Relationships

``` text
auth.users
    1
    │
    1
profiles
    │
    ├── 1:N user_addresses
    │
    ├── 1:N markets
    │        │
    │        └── 1:N market_products
    │                     │
    │                     └── 1:N seller_listings
    │                                  │
    │                                  └── seller
    │
    ├── 1:N orders
    │        │
    │        └── 1:N order_items
    │                     │
    │                     └── 1:N order_allocations
    │                                  │
    │                                  └── seller
    │
    ├── 1:N wallet_transactions
    │
    ├── 1:N chat_rooms
    │
    ├── 1:N chat_messages
    │
    └── 1:N reviews
```

------------------------------------------------------------------------

# 23. Important Database Design Rules

ห้ามใช้ schema แบบ:

``` text
product_id_01
product_id_02
product_id_03

quantity_01
quantity_02
quantity_03
```

ให้ใช้ normalized rows:

``` text
order_items
```

หนึ่ง row = หนึ่ง product ใน order

และ:

``` text
order_allocations
```

หนึ่ง row = allocation ของ seller หนึ่งราย

------------------------------------------------------------------------

# 24. Price Snapshot

ราคาใน `market_products.product_price` สามารถเปลี่ยนได้

แต่ order เก่าต้องไม่เปลี่ยนตาม

ดังนั้น:

``` text
market_products.product_price
```

คือ current price

ส่วน:

``` text
order_items.unit_price
order_allocations.unit_price
```

คือ price snapshot ตอนเกิดธุรกรรม

------------------------------------------------------------------------

# 25. Stock Model

อย่าใช้ stock เดียวที่ market product ถ้ามี seller หลายคน

ผิด:

``` text
market_products.stock = 300
```

ถูก:

``` text
seller A listing = 100
seller B listing = 100
seller C listing = 100
```

Available stock ของ market product คือผลรวม stock ที่ seller listings
พร้อมขาย

โดยควรคำนวณจาก:

``` text
quantity
- reserved_quantity
- sold_quantity
```

ตาม business rule ที่กำหนด

------------------------------------------------------------------------

# 26. API / RPC Design

Supabase สามารถใช้ auto-generated REST API สำหรับ CRUD ที่ไม่ซับซ้อน

แต่ business-critical operations ควรทำเป็น RPC

ตัวอย่าง RPC ที่ควรมี:

``` text
create_order_and_allocate()
confirm_payment()
seller_confirm_allocation()
seller_mark_allocation_ready()
seller_ship_allocation()
complete_allocation()
complete_order_if_ready()
record_seller_sale()
refund_order()
```

ชื่อ function สามารถเปลี่ยนได้ตาม implementation แต่ต้องรักษา responsibility

------------------------------------------------------------------------

# 27. Realtime

Supabase Realtime เหมาะกับ:

-   Chat messages
-   Order status
-   Allocation status
-   Stock updates
-   Notifications

ไม่ควรใช้ Realtime เป็นตัวตัดสิน business transaction

Realtime มีหน้าที่:

> แจ้งให้ client เห็นการเปลี่ยนแปลง

Database transaction มีหน้าที่:

> ทำให้ข้อมูลถูกต้อง

------------------------------------------------------------------------

# 28. Updated Documentation Rules

เมื่อแก้บทที่ 1--3:

## บทที่ 1

ต้องเปลี่ยนจากการอธิบายว่า:

> ผู้ขายมีร้านค้าและนำสินค้าในร้านมาขาย

เป็น:

> แพลตฟอร์มทำหน้าที่เป็นตลาดกลางดิจิทัลสำหรับสินค้าชุมชน
> โดยสามารถสร้างตลาดชั่วคราวตามประเภทสินค้า
> และเปิดให้ผู้ขายหลายรายที่มีสินค้าประเภทเดียวกันเข้าร่วมขายในตลาดเดียวกันได้

ควรอธิบายประโยชน์ของการรวมสินค้าจากหลายผู้ขายและการกระจายคำสั่งซื้ออย่างเป็นธรรม

## บทที่ 2

ต้องเปลี่ยน Data Dictionary จาก:

``` text
users
shops
products
orders
```

เป็น:

``` text
auth.users
profiles
user_addresses
markets
market_products
seller_listings
orders
order_items
order_allocations
wallet_transactions
market_wallet_transactions
chat_rooms
chat_messages
reviews
```

พร้อมอธิบาย:

-   PostgreSQL
-   Supabase Auth
-   Storage
-   Realtime
-   RLS
-   RPC
-   Transaction / ACID
-   Normalization

## บทที่ 3

Use Case / Activity / Sequence / Class Diagram ต้องสะท้อน:

``` text
Market
    ↓
Market Product
    ↓
Seller Listings
    ↓
Order
    ↓
Order Allocation
    ↓
Multiple Sellers
```

โดยเฉพาะ Use Case "การสั่งสินค้า" ต้องไม่เขียนว่า order ถูกส่งให้ร้านค้าเดียว

------------------------------------------------------------------------

# 29. Updated Sequence Diagram --- Order

Sequence ที่ควรใช้:

``` text
Buyer
  │
  │ create order
  ▼
Flutter App
  │
  │ RPC
  ▼
Supabase
  │
  ├── validate buyer
  ├── validate product
  ├── lock seller listings
  ├── check available stock
  ├── calculate allocation
  ├── create order
  ├── create order item
  ├── create allocations
  ├── reserve stock
  └── create payment transaction
  │
  ▼
Database
  │
  └── commit
  │
  ▼
Flutter App
  │
  └── show order status
```

------------------------------------------------------------------------

# 30. Example Allocation Algorithm

Pseudo logic:

``` text
requested_quantity = 30

available sellers:
A = 100
B = 100
C = 100

seller_count = 3

base = 30 / 3
remainder = 30 % 3

A = base
B = base
C = base
```

Result:

``` text
A = 10
B = 10
C = 10
```

สำหรับจำนวนที่หารไม่ลงตัว ให้กำหนด deterministic remainder rule และเก็บผล
allocation จริงลง database

------------------------------------------------------------------------

# 31. Security Rules

ห้าม:

-   เก็บ password เองใน public table
-   ให้ client แก้ wallet balance โดยตรง
-   ให้ client สร้าง sale transaction เพื่อเพิ่มเงินเอง
-   ให้ client กำหนด seller_id เป็นของคนอื่น
-   ให้ seller แก้ allocation ของ seller คนอื่น
-   ให้ buyer อ่าน order ของคนอื่น
-   ให้ user อ่าน private chat room ของคนอื่น
-   ใช้ frontend เป็น authority สำหรับ stock allocation
-   คำนวณเงินสำคัญเฉพาะ frontend แล้วเชื่อผลจาก client

ควร:

-   ใช้ `auth.uid()`
-   ใช้ RLS
-   ใช้ RPC สำหรับ transaction สำคัญ
-   ใช้ database constraints
-   ใช้ foreign keys
-   ใช้ check constraints
-   ใช้ row locking เมื่อ allocate stock
-   เก็บ transaction history แบบ append-only เท่าที่ทำได้

------------------------------------------------------------------------

# 32. Naming Convention

ใช้ snake_case:

``` text
market_id
market_product_id
listing_id
order_id
order_item_id
allocation_id
seller_id
buyer_id
created_at
updated_at
```

หลีกเลี่ยง:

``` text
Item_id
product_id_01
quantity_01
shop_wallet
```

ชื่อ table ใช้ plural:

``` text
profiles
user_addresses
markets
market_products
seller_listings
orders
order_items
order_allocations
wallet_transactions
chat_rooms
chat_messages
reviews
```

------------------------------------------------------------------------

# 33. Final Architecture Principle

Locomall คือ:

> **Community marketplace ที่รวมผู้ขายหลายรายเข้ากับตลาด/หมวดสินค้าชั่วคราวเดียวกัน
> และใช้ระบบกระจายคำสั่งซื้ออย่างเท่าเทียม
> พร้อมคำนวณรายได้ตามจำนวนสินค้าที่ผู้ขายส่งจริง**

Core data flow:

``` text
User
 ↓
Market
 ↓
Market Product
 ↓
Seller Listings
 ↓
Buyer Order
 ↓
Order Item
 ↓
Order Allocations
 ↓
Multiple Sellers
 ↓
Fulfilled Quantity
 ↓
Seller Earnings
```

นี่คือ architecture หลักที่ต้องใช้เป็นมาตรฐานในการพัฒนาต่อจากนี้
