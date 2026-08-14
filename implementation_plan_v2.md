# Locomall Community Marketplace --- Implementation Plan v2

## 0. Goal

Implement Locomall with React Native + Expo + Supabase.

Legacy `Shop → Product → Order` is not implemented.

Core architecture:

`Market → Market Product → Seller Listings → Cart → Order → Order Items → Order Allocations → Multiple Sellers → Fulfillment → Seller Earnings`

## 1. Stack

Frontend: - React Native - Expo - Expo Router - TypeScript

Backend: - Supabase Auth - PostgreSQL - Supabase Storage - Supabase
Realtime - RLS - PostgreSQL Functions / RPC

## 2. Database Tables

Implement:

1.  profiles
2.  user_addresses
3.  markets
4.  market_products
5.  seller_listings
6.  orders
7.  order_items
8.  order_allocations
9.  wallet_transactions
10. chat_rooms
11. chat_participants
12. chat_messages
13. notifications
14. reviews

Do not implement `shops`, `shop_products`, or
`market_wallet_transactions` in the current release.

### profiles

``` sql
id uuid primary key references auth.users(id) on delete cascade
full_name text not null
username text unique not null
phone_number text
age int
gender text
avatar_url text
role text not null default 'user'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### user_addresses

``` sql
id uuid primary key default gen_random_uuid()
user_id uuid not null references profiles(id) on delete cascade
title text not null
province text not null
district text not null
sub_district text not null
details text not null
is_default boolean not null default false
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### markets

``` sql
id uuid primary key default gen_random_uuid()
owner_id uuid not null references profiles(id)
name text not null
category text not null
description text
image_url text
status text not null default 'draft'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### market_products

``` sql
id uuid primary key default gen_random_uuid()
market_id uuid not null references markets(id) on delete cascade
name text not null
description text
unit_label text not null
unit_price numeric(12,2) not null check (unit_price >= 0)
image_url text
status text not null default 'active'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### seller_listings

``` sql
id uuid primary key default gen_random_uuid()
market_product_id uuid not null references market_products(id) on delete cascade
seller_id uuid not null references profiles(id)
initial_quantity int not null check (initial_quantity >= 0)
reserved_quantity int not null default 0 check (reserved_quantity >= 0)
fulfilled_quantity int not null default 0 check (fulfilled_quantity >= 0)
status text not null default 'active'
created_at timestamptz not null default now()
updated_at timestamptz not null default now()

unique (market_product_id, seller_id)
check (reserved_quantity + fulfilled_quantity <= initial_quantity)
```

### orders

``` sql
id uuid primary key default gen_random_uuid()
buyer_id uuid not null references profiles(id)
address_id uuid not null references user_addresses(id)
total_amount numeric(12,2) not null check (total_amount >= 0)
status text not null default 'pending_payment'
payment_status text not null default 'unpaid'
idempotency_key text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Use a suitable unique index/constraint for `(buyer_id, idempotency_key)`
so retries cannot create duplicate orders.

### order_items

``` sql
id uuid primary key default gen_random_uuid()
order_id uuid not null references orders(id) on delete cascade
market_product_id uuid not null references market_products(id)
quantity int not null check (quantity > 0)
unit_price numeric(12,2) not null check (unit_price >= 0)
total_amount numeric(12,2) not null check (total_amount >= 0)
created_at timestamptz not null default now()
```

### order_allocations

``` sql
id uuid primary key default gen_random_uuid()
order_item_id uuid not null references order_items(id) on delete cascade
listing_id uuid not null references seller_listings(id)
seller_id uuid not null references profiles(id)
allocated_quantity int not null check (allocated_quantity > 0)
fulfilled_quantity int not null default 0 check (fulfilled_quantity >= 0)
unit_price numeric(12,2) not null check (unit_price >= 0)
seller_amount numeric(12,2) not null default 0 check (seller_amount >= 0)
status text not null default 'pending'
tracking_number text
courier_name text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()

check (fulfilled_quantity <= allocated_quantity)
unique (order_item_id, listing_id)
```

### wallet_transactions

``` sql
id uuid primary key default gen_random_uuid()
user_id uuid not null references profiles(id)
type text not null
amount numeric(12,2) not null check (amount <> 0)
reference_type text
reference_id uuid
allocation_id uuid references order_allocations(id)
description text
created_at timestamptz not null default now()
```

Do not accept a client-provided `balance_after` as authoritative.

### chat_rooms

``` sql
id uuid primary key default gen_random_uuid()
created_at timestamptz not null default now()
```

### chat_participants

``` sql
room_id uuid not null references chat_rooms(id) on delete cascade
user_id uuid not null references profiles(id) on delete cascade
joined_at timestamptz not null default now()
primary key (room_id, user_id)
```

### chat_messages

``` sql
id uuid primary key default gen_random_uuid()
room_id uuid not null references chat_rooms(id) on delete cascade
sender_id uuid not null references profiles(id)
message text not null
attachments jsonb
created_at timestamptz not null default now()
```

### notifications

``` sql
id uuid primary key default gen_random_uuid()
user_id uuid not null references profiles(id) on delete cascade
type text not null
title text not null
message text not null
reference_type text
reference_id uuid
is_read boolean not null default false
created_at timestamptz not null default now()
```

### reviews

``` sql
id uuid primary key default gen_random_uuid()
order_id uuid unique not null references orders(id) on delete cascade
reviewer_id uuid not null references profiles(id)
score int not null check (score between 1 and 5)
review_description text
created_at timestamptz not null default now()
```

## 3. Indexes

Create:

``` text
seller_listings(market_product_id, status)
seller_listings(seller_id, status)
orders(buyer_id, created_at)
order_items(order_id)
order_allocations(seller_id, status)
order_allocations(order_item_id)
wallet_transactions(user_id, created_at)
notifications(user_id, is_read, created_at)
chat_messages(room_id, created_at)
```

## 4. Authentication

Use Supabase Auth.

Implement: - sign up - sign in - sign out - session persistence -
password reset - auth state listener - automatic profile creation
trigger

`profiles.id = auth.users.id`.

## 5. RLS

Enable RLS on all public tables.

Minimum policy intent:

  -----------------------------------------------------------------------
  Table                   Read                    Write
  ----------------------- ----------------------- -----------------------
  profiles                own/private-safe        own profile
                          profile                 

  user_addresses          own                     own

  markets                 active + own            own

  market_products         active + own market     market owner

  seller_listings         active + own            own

  orders                  own                     RPC

  order_items             own order               RPC

  order_allocations       own seller allocation + RPC
                          permitted buyer summary 

  wallet_transactions     own                     RPC only

  chat_rooms              participants            controlled RPC

  chat_participants       participants            controlled RPC

  chat_messages           participants            participants

  notifications           own                     own read state

  reviews                 permitted reviews       completed-order buyer
  -----------------------------------------------------------------------

Do not use broad public profile SELECT access when private fields exist.

## 6. Secure RPC Rules

Every `SECURITY DEFINER` function must: - validate `auth.uid()` - set a
safe `search_path` - validate ownership - never trust client-provided
seller/user IDs - grant EXECUTE only to required roles - perform
critical writes atomically

## 7. Order Creation RPC

Replace the current single-product RPC with:

`create_order_from_cart(p_items jsonb, p_address_id uuid, p_idempotency_key text, ...)`

It must support multiple cart items.

For every cart item: 1. Validate product is active. 2. Read current
price. 3. Lock eligible seller listings. 4. Calculate total available
stock. 5. Reject insufficient stock. 6. Create an order item with price
snapshot. 7. Allocate to sellers. 8. Reserve stock.

Everything happens in one transaction.

## 8. Allocation Algorithm

``` text
1. Lock eligible listings ORDER BY created_at ASC, id ASC.
2. Calculate each listing available quantity.
3. Verify total availability >= requested quantity.
4. Calculate fair target allocation.
5. Cap target by each seller capacity.
6. Redistribute remaining quantity.
7. Apply remainder deterministically.
8. Insert allocations.
9. Increase reserved_quantity.
10. Verify allocated total == requested quantity.
```

Tests: - 30 / 3 sellers → 10/10/10 - 31 / 3 sellers → deterministic
11/10/10 - low-capacity seller → deficit redistributed - concurrent
orders → no over-allocation

## 9. Payment

Wallet payment must atomically: - verify buyer - verify funds - create
purchase transaction - mark order paid

External payment must use trusted confirmation.

Client cannot set `payment_status = paid`.

## 10. Fulfillment / Seller Settlement

Implement:

`fulfill_allocation(allocation_id, fulfilled_quantity, tracking_number, courier_name)`

Validate seller ownership and state.

Atomically: 1. update allocation 2. update seller listing
reserved/fulfilled quantities 3. calculate `seller_amount` 4. create
idempotent sale transaction 5. create notification 6. update order
status when all required allocations are resolved

Earnings:

`fulfilled_quantity × unit_price`

Partial fulfillment must not credit the unfulfilled amount.

## 11. Cancellation / Refund

Implement order/allocation cancellation.

Rules: - release unfulfilled reservations - refund only
cancelled/unfulfilled quantity - preserve valid earnings for fulfilled
quantity

## 12. Realtime

Use Realtime for: - chat - order updates - allocation updates -
notifications - relevant listing refresh

Realtime is not authoritative for stock or money.

## 13. Storage

Buckets: - `profile-images` - `market-images` - `product-images`

Use Storage policies for ownership/authorization.

## 14. Expo Router

Use:

``` text
src/app/
├── _layout.tsx
├── index.tsx
├── (auth)/
├── (tabs)/
├── market/
├── seller/
├── order/
└── profile/
```

Required concepts: - `market/` - `market/product/` -
`seller/listings/` - `seller/allocations/` - `order/cart` -
`order/checkout` - `order/[id]`

Do not create: - `shop/` - `seller/products/` - `seller/orders/` -
`setup-shop.tsx`

## 15. UI

Follow `ui_spec.md`.

Figma is a visual reference only. It must not force the old Shop
business flow.

Preserve useful visual language while adapting: - Shop → Market -
Product → Market Product - Seller product → Seller Listing - One-shop
order → multiple allocations

## 16. Types

Create: - Profile - UserAddress - Market - MarketProduct -
SellerListing - Order - OrderItem - OrderAllocation -
WalletTransaction - ChatRoom - ChatParticipant - ChatMessage -
Notification - Review

Do not create Shop/ShopProduct/ShopOrder domain types.

## 17. Error Handling

Handle: - auth errors - RLS denied - inactive product/market -
insufficient stock - insufficient wallet - payment failure - duplicate
request - invalid state transition - network/RPC errors

## 18. Verification

### Database/RPC

-   migration success
-   constraints
-   indexes
-   multi-item order
-   allocation fairness
-   capacity-aware allocation
-   insufficient stock rollback
-   concurrent order safety
-   price snapshot
-   idempotency
-   partial fulfillment
-   cancellation/refund
-   duplicate settlement protection

### RLS

-   cross-user order isolation
-   cross-seller listing isolation
-   cross-seller allocation isolation
-   wallet write protection
-   private chat isolation
-   profile privacy
-   market owner isolation

### UI

Every major screen must be screenshot-compared against the Figma
reference/design language before being marked complete.

## 19. Implementation Phases

Phase 0 --- Audit: - remove legacy Shop architecture - read
`AGENT_v2.md` - read `ui_spec.md` - map screens before coding

Phase 1 --- Expo foundation: - theme - components - types

Phase 2 --- Supabase Auth: - client - session - profile trigger

Phase 3 --- Database: - migrations - constraints - indexes

Phase 4 --- Security: - RLS - Storage policies - security tests

Phase 5 --- Backend transactions: - order RPC - allocation - payment -
fulfillment - settlement - cancellation/refund - idempotency

Phase 6 --- Auth UI

Phase 7 --- Market / Market Product

Phase 8 --- Seller Listings / Allocations

Phase 9 --- Cart / Checkout / Orders

Phase 10 --- Wallet / Notifications / Chat / Reviews

Phase 11 --- Realtime / E2E / RLS / visual regression

Do not implement the next phase until the current phase passes its
verification criteria.

## 20. Definition of Done

A feature is complete only when: - business model is correct - UI
follows `ui_spec.md` - database model is correct - RLS is correct -
business-critical writes use RPC - concurrency is safe - money/stock are
server-authoritative - retries are idempotent - tests pass - no legacy
Shop architecture remains
