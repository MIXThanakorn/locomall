# Locomall Community Marketplace --- Project Skill v2

## 1. Source of Truth

This file is the source of truth for Locomall business rules,
database/domain model, Supabase architecture, security, RPC,
transactions, wallet settlement, and documentation rules.

Related: - `implementation_plan_v2.md` = technical implementation plan -
`ui_spec.md` = UX/UI and Figma adaptation

Priority: 1. Current business model 2. Database/security invariants 3.
`ui_spec.md` for UX/UI 4. `implementation_plan_v2.md` for implementation
order 5. Legacy Chapters 1--3 and old Figma as historical references

The legacy `Shop -> Product -> Order` architecture must not be
reintroduced.

## 2. Technology Stack

Frontend: - React Native - Expo - Expo Router - TypeScript

Backend: - Supabase Auth - PostgreSQL - Supabase Storage - Supabase
Realtime - PostgreSQL RLS - PostgreSQL Functions / RPC

The current application is Expo/React Native. Legacy Flutter references
in the old documents must be updated.

## 3. Core Business Model

Locomall is a community marketplace.

``` text
User
  ↓
Market
  ↓
Market Product
  ↓
Seller Listings
  ↓
Buyer Cart
  ↓
Order
  ↓
Order Items
  ↓
Order Allocations
  ↓
Multiple Sellers
  ↓
Fulfilled Quantity
  ↓
Seller Earnings
```

Example: - Market: ตลาดมะพร้าวชุมชน - Market Product: มะพร้าวน้ำหอม - Price:
20 THB / ลูก - Seller A/B/C: 100 ลูก each - Buyer orders: 30 ลูก -
Allocation: 10 / 10 / 10 - Earnings: fulfilled quantity × unit price

## 4. Actors

### Buyer/User

Can register, manage profile/address, browse markets/products, add to
cart, checkout, view own orders, use payment/wallet, chat with permitted
participants, and review completed orders.

### Seller

Any permitted user may sell. A seller joins an existing Market Product,
creates a seller listing with quantity, views own allocations, fulfills
them, updates shipping, and receives earnings based on actual fulfilled
quantity.

A seller does NOT create an independent shop/product catalog.

### Market Owner

Creates and manages markets and their market products, sets current
product price, and views participating sellers and market
order/allocation summaries. The owner does not own seller stock.

### Admin

Moderation, user/market/listing management, reports, and transaction
review. If not implemented in the current release, keep it as a later
phase.

## 5. Terminology

  Legacy               Current
  -------------------- ------------------------------------
  Shop                 Market
  Shop Owner           Market Owner
  Shop Product         Market Product
  Product stock        Seller Listing quantity
  One-shop order       Order Items + multiple Allocations
  Shop wallet          Seller wallet transactions
  Product management   Market Product management

Never use `shop_id` as the main order relationship.

## 6. Database Model

Public tables: 1. `profiles` 2. `user_addresses` 3. `markets` 4.
`market_products` 5. `seller_listings` 6. `orders` 7. `order_items` 8.
`order_allocations` 9. `wallet_transactions` 10. `chat_rooms` 11.
`chat_participants` 12. `chat_messages` 13. `notifications` 14.
`reviews`

`auth.users` is the authentication source.

Do not implement `shops`, `shop_products`, or
`market_wallet_transactions` unless a separate market/platform wallet
business rule is explicitly introduced.

## 7. Data Invariants

### Profiles

`profiles.id = auth.users.id`. No passwords in public tables. Private
fields must not be publicly readable.

### Seller Listings

A seller can have only one listing per market product:

`UNIQUE(market_product_id, seller_id)`

### Stock

Do not store shared stock on `market_products`.

Recommended listing fields: - `initial_quantity` - `reserved_quantity` -
`fulfilled_quantity` - `status`

Available quantity:

`initial_quantity - reserved_quantity - fulfilled_quantity`

All quantities must be non-negative and:
`reserved_quantity + fulfilled_quantity <= initial_quantity`.

## 8. Price Snapshot

`market_products.unit_price` is the current price.

At order creation: - `order_items.unit_price` = historical snapshot -
`order_allocations.unit_price` = historical snapshot

Old orders must not change when current price changes.

## 9. Multi-Item Orders

One order may contain multiple market products.

``` text
Order
├── Order Item A
│   └── Allocations
├── Order Item B
│   └── Allocations
└── Order Item C
    └── Allocations
```

Never use `product_id_01`, `quantity_01`, etc.

## 10. Allocation Algorithm

Allocation runs inside one PostgreSQL transaction.

For each order item: 1. Validate product is active. 2. Lock eligible
seller listings with `FOR UPDATE`. 3. Use deterministic ordering:
`created_at ASC, id ASC`. 4. Calculate available stock. 5. Reject if
total available is insufficient. 6. Distribute as equally as possible.
7. Respect each seller's capacity. 8. Redistribute deficits to sellers
with remaining capacity. 9. Apply remainder according to deterministic
ordering. 10. Insert allocations. 11. Increase reserved quantities. 12.
Verify allocated total equals requested total.

Examples: - 30 across A/B/C with enough stock → 10/10/10. - 31 →
deterministic 11/10/10. - A has only 5 while B/C have capacity → A
cannot receive 10; the missing amount is redistributed to B/C.

Must guarantee: - no over-allocation - no negative stock - deterministic
results - no duplicate allocation - concurrency safety

## 11. Order and Allocation Status

Order: `pending_payment`, `paid`, `preparing`, `shipping`, `completed`,
`cancelled`

Allocation: `pending`, `preparing`, `ready`, `shipping`, `completed`,
`cancelled`

Order completion is derived from allocation outcomes and must not occur
while required allocations remain unresolved.

## 12. Fulfillment and Earnings

Seller earnings:

`fulfilled_quantity × allocation.unit_price`

Example: allocated = 10, fulfilled = 7, price = 20 → seller earns 140
THB.

`seller_amount` is calculated by PostgreSQL, never trusted from the
client.

## 13. Cancellation and Refund

Before fulfillment: - release reservation - refund cancelled quantity

Partial fulfillment: - keep fulfilled quantity as seller earnings -
release unfulfilled reservation - refund only the unfulfilled/cancelled
quantity

All money and stock changes are atomic.

## 14. Wallet / Ledger

Use `wallet_transactions` as an append-only transaction history.

Types: - deposit - purchase - sale - refund - withdrawal - adjustment

Seller sale: - created only from valid fulfillment - amount = fulfilled
quantity × unit price - must be idempotent

Prevent duplicate sale transactions with a database uniqueness rule such
as a unique `(reference_type, reference_id, type)` for sale
transactions.

Client cannot insert/update wallet transactions.

## 15. Payment

Wallet payment must atomically check funds, create purchase transaction,
and mark the order paid.

External payment must be confirmed by a trusted server-side operation.

Client cannot simply set `payment_status = paid`.

## 16. Idempotency

Critical operations need idempotency: - order creation - payment
confirmation - fulfillment/settlement

Use an idempotency key or unique reference so retries do not create
duplicate orders or money movements.

## 17. RPC

Required business-critical responsibilities:

### `create_order_from_cart`

Accept multiple cart items, validate ownership/address/product state,
snapshot prices, lock listings, allocate each item, reserve stock,
process payment, and return the order.

### `confirm_payment`

Trusted payment confirmation.

### `fulfill_allocation`

Validate seller ownership and quantity, update allocation/listing stock,
calculate earnings, create an idempotent sale transaction, and update
order state.

### `cancel_order` / `cancel_allocation`

Release reservations and create refunds according to rules.

### `complete_order_if_ready`

Derive order completion from allocation states.

`SECURITY DEFINER` functions must set a safe search path, validate
`auth.uid()`, validate ownership, and expose only required EXECUTE
permissions.

## 18. RLS

Enable RLS on all protected public tables.

-   `profiles`: own/private-safe profile access.
-   `user_addresses`: owner only.
-   `markets`: active markets readable; owner manages own.
-   `market_products`: active products readable; owner manages own
    market.
-   `seller_listings`: active listings readable; seller manages own.
-   `orders`: buyer reads own; order creation through RPC.
-   `order_items`: buyer reads own order items.
-   `order_allocations`: seller reads own allocations; buyer sees only
    permitted allocation information for own orders.
-   `wallet_transactions`: own read; no direct client writes.
-   `chat_*`: only room participants.
-   `notifications`: own user.
-   `reviews`: completed-order buyer can create one review.

Do not use broad `SELECT true` on profiles.

## 19. Chat

Use: - `chat_rooms` - `chat_participants` - `chat_messages`

Membership is determined by `chat_participants`.

Supports buyer ↔ seller and buyer ↔ market owner without reintroducing
Shop.

Realtime delivers messages; PostgreSQL/RLS remains authoritative.

## 20. Notifications

Create `notifications` with: - id - user_id - type - title - message -
reference_type - reference_id - is_read - created_at

Examples: `order_created`, `payment_confirmed`, `allocation_created`,
`allocation_updated`, `order_shipped`, `order_completed`,
`refund_created`, `sale_credited`.

## 21. Storage

Buckets: - `profile-images` - `market-images` - `product-images`

Store only paths/URLs in PostgreSQL. Storage policies must enforce
ownership/authorization.

## 22. Realtime

Use for: - chat messages - order updates - allocation updates -
notifications - relevant listing refresh

Realtime is never the authority for stock or money.

## 23. Constraints and Indexes

Important constraints: - unique seller listing per market product -
unique review per order - non-negative quantities/money -
`fulfilled_quantity <= allocated_quantity` - valid foreign keys and
statuses

Recommended indexes: - seller_listings(market_product_id, status) -
seller_listings(seller_id, status) - orders(buyer_id, created_at) -
order_items(order_id) - order_allocations(seller_id, status) -
order_allocations(order_item_id) - wallet_transactions(user_id,
created_at) - notifications(user_id, is_read, created_at) -
chat_messages(room_id, created_at)

## 24. Security Rules

Never: - store passwords in public tables - trust client stock
calculations - trust client seller IDs or seller amounts - allow direct
wallet mutation - allow cross-seller allocation edits - allow cross-user
order reads - allow unauthorized chat access - credit earnings merely
when allocation is created

Always use: - `auth.uid()` - RLS - secure RPC - constraints - row
locking - idempotency - price snapshots

## 25. Documentation Rules

Legacy Chapters 1--3 and old Figma are historical references.

Current documentation must describe:

`Market → Market Product → Seller Listings → Order → Order Items → Order Allocations → Multiple Sellers → Fulfilled Quantity → Seller Earnings`

Chapter 2 must describe Supabase Auth, PostgreSQL, Storage, Realtime,
RLS, RPC, ACID/transactions, normalization, and the current schema.

Chapter 3 diagrams must show multiple-seller allocation, not one-shop
fulfillment.

Use React Native + Expo as the current implementation stack.

## 26. Final Principle

One Market Product may have many Seller Listings, and one Order Item may
produce many Order Allocations.

Seller income is determined by what the seller actually fulfills.
