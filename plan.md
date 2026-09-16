# Locomall — Implementation Plan

## Goal
Build Locomall as a community marketplace using React Native, Expo, TypeScript, Supabase, PostgreSQL, Supabase Auth, Storage, Realtime, Antigravity, VS Code, Figma, and Git/GitHub. `skill.md` is the business/technical source of truth.

## Phase 0 — Audit
- Inspect current Expo/React Native project, navigation, auth, Supabase client, screens, components, SQL/schema.
- Identify obsolete generic `Shop → Product` architecture.
- Identify reusable code versus conflicting code.
- Verify the app starts before major changes.

## Phase 1 — Foundation
- Verify Expo, TypeScript, environment variables, Supabase client, navigation, loading/error patterns.
- Keep code strongly typed; avoid `any`.

## Phase 2 — Authentication
Implement registration, login, logout, session persistence, current-user retrieval, and protected navigation using Supabase Auth.

Test: register, login, logout, restart/session persistence, protected screens.

## Phase 3 — Profile & Address
Implement profile and address CRUD including province, district, sub-district and required fields.

Test ownership: users can modify only their own data.

## Phase 4 — Database Schema
Create/verify:
`profiles`, `user_addresses`, `markets`, `market_members`, `market_products`, `seller_listings`, `orders`, `order_items`, `order_allocations`, `chat_rooms`, `chat_messages`, `reviews`, `wallet_transactions`, `seller_wallet_transactions`, `market_wallet_transactions`.

Important: `orders` must have `market_id`; use actual keys such as `order_item_id`, not nonexistent `item_id`.

Remove/isolate obsolete generic tables.

## Phase 5 — Constraints & Indexes
Add PK/FK, uniqueness, checks, and indexes. Enforce positive prices, non-negative stock, valid statuses, one membership per user/Market, and one Seller Listing per seller/Market Product.

## Phase 6 — RLS & Authorization
Enable RLS on private/business tables. Protect ownership, seller membership, Market Owner, Admin, orders, allocations, chat, reviews and ledgers.

Business-critical mutations should use secure RPCs/functions rather than trusting client requests.

Test buyer/seller/admin isolation and forged allocation attempts.

## Phase 7 — Market Creation & Approval
Flow:
`Create Market → Pending → Admin Review → Approved → Active`.

Implement secure Admin approval/rejection. Only approved Markets are publicly active.

## Phase 8 — Market Browsing
Build Market list/detail with community area, owner, status, images, and Market Products.

Test that normal browsing excludes unapproved/inactive Markets.

## Phase 9 — Seller Membership
Flow:
`User → Select Market → Apply → Area Verification → Pending → Market Owner Review → Approved/Rejected`.

Implement secure concepts such as `apply_to_market()` and `review_market_member()`.

Test duplicate applications, area mismatch, self-approval prevention, and seller eligibility.

## Phase 10 — Market Products
Market Owner can create/edit/activate/deactivate Market Products. Product types belong to Markets, not individual sellers.

Test ownership and duplicate product prevention.

## Phase 11 — Seller Listings
Approved sellers create/update their listing for an existing Market Product. Store seller-specific price, stock, reserved stock, and active state.

Prefer secure `upsert_seller_listing()` RPC.

Test seller ownership, membership status, price and stock validation.

## Phase 12 — Product Detail
Display product information, participating sellers, seller-specific prices, available stock, and relevant seller identity.

Do not imply one seller owns the Market Product.

## Phase 13 — Cart
Keep cart/order scoped to one Market. Prevent silent mixing of products from different Markets.

Test same-Market additions and cross-Market attempts.

## Phase 14 — Order Creation
Implement secure `create_order(p_market_id, p_address_id, p_items)` or equivalent.

Backend must validate buyer, Market, address, products, seller listings; lock rows; allocate stock; reserve inventory; create order/items/allocations; calculate allocation-based total; commit transaction.

Client sends requested quantities only; backend decides allocation and totals.

## Phase 15 — Allocation Algorithm
Primary rule: distribute as equally as possible among eligible sellers. Capacity-aware redistribution is mandatory.

Example:
`30 requested; A=100, B=100, C=100 → 10/10/10`.

Shortage example:
`30 requested; A=5, B=100, C=100 → A≤5 and remaining quantity distributed to B/C`.

Never allocate more than available stock.

## Phase 16 — Allocation Pricing
Each allocation stores the actual seller unit price.

Canonical case:
`A 10×20=200; B 10×20=200; C 10×22=220; total=620`.

Never calculate the final total as minimum price × requested quantity.

## Phase 17 — Order & Allocation Status
Keep order status separate from allocation status. One seller completing their allocation must not incorrectly complete the whole order.

Test mixed states such as A fulfilled while B/C are preparing.

## Phase 18 — Seller Fulfillment
Implement secure allocation status/fulfillment functions. Validate seller ownership and state; update fulfilled quantity; adjust reserved stock; create idempotent seller ledger entry if used.

Test repeated fulfillment and over-fulfillment.

## Phase 19 — Cancellation
Implement secure `cancel_order()` or equivalent. Validate cancellable state, cancel relevant allocations, release reserved stock, and update order transactionally.

Test that reserved stock is released exactly once.

## Phase 20 — Order Tracking
Buyer: order list/detail, products, allocations, seller information, statuses, totals.
Seller: incoming allocations, quantities, price, status, fulfillment actions.

Test the 30-unit coconut order end-to-end.

## Phase 21 — Seller Earnings Ledger
If included, calculate earnings as `fulfilled_quantity × actual_unit_price`. Use an idempotent allocation reference to prevent duplicates.

Wallet/payment/refund UI is not a primary milestone unless explicitly requested.

## Phase 22 — Chat
Implement the selected buyer/Market, buyer/seller, or order-related chat model. Enforce room membership and message ownership. Realtime may be used for chat.

## Phase 23 — Reviews
Allow reviews only for eligible completed orders. Validate buyer ownership, completion state, cancellation state, and duplicate-review rules.

## Phase 24 — Realtime & Notifications
Use Supabase Realtime for useful live features such as chat, allocation status, order status, and notifications. Realtime is never the source of truth for transactions or authorization.

## Phase 25 — Admin Management
Implement Admin Market approval/rejection and appropriate monitoring. Keep Admin actions separate from normal buyer/seller UI.

## Phase 26 — Profile/Account UX
Complete profile, addresses, seller membership status, owned Market status, seller status, and logout. Clearly show pending/approved/rejected states.

## Phase 27 — UI/UX Refinement
Redesign around:
`Market → Market Product → Sellers → Quantity → Allocation → Order Tracking`.

Use a clean, modern, community-focused UI. Figma is visual reference only and cannot override `skill.md`.

## Phase 28 — Integration Test
Canonical setup:
- Market A
- Coconut
- Seller A: 20 THB / 100
- Seller B: 20 THB / 100
- Seller C: 22 THB / 100
- Buyer requests 30

Expected:
`A=10, B=10, C=10`
`A=200, B=200, C=220`
`Total=620`

## Phase 29 — Edge Cases
Test:
- one seller lacks stock
- total inventory insufficient
- seller inactive
- membership rejected/pending
- Market not approved
- concurrent orders for limited stock
- duplicate fulfillment/retry
- cancellation after reservation

Never create negative or fake stock.

## Phase 30 — Security Verification
Verify RLS, ownership checks, role checks, Market membership checks, Admin checks, RPC validation, row locking, server-side totals/allocation, reserved-stock protection, and ledger idempotency.

UI hiding is not a security mechanism.

## Phase 31 — Cleanup
Remove obsolete Shop/Product architecture, unused screens/queries, duplicated business logic, stale types/statuses, incorrect schema references, and avoidable `any`.

Run TypeScript checks, Expo checks, database/RLS verification, canonical scenario, and edge cases.

# Definition of Done
1. Authentication works.
2. Users manage addresses.
3. Approved Markets are browsable.
4. Admin can approve Markets.
5. Users can apply to Markets.
6. Market Owners can approve/reject sellers.
7. Approved sellers can create Seller Listings.
8. Market Products are shared product types.
9. Buyers can create Market-scoped orders.
10. Backend allocates quantities among sellers.
11. Allocation is capacity-aware.
12. Actual seller prices determine totals.
13. Seller fulfillment is tracked independently.
14. Seller earnings use fulfilled quantity.
15. Cancellation releases reservations.
16. RLS protects private/business data.
17. Chat/reviews follow the selected design.
18. UI clearly communicates the community-market model.
19. Coconut test produces 10/10/10 and 620 THB.
20. Old `Shop → Product` architecture is no longer the primary model.

# Agent Execution Rules
Before each phase:
1. Read `skill.md`.
2. Inspect the current code/schema.
3. Check dependencies from previous phases.
4. Make the smallest safe change.
5. Do not silently change business rules.
6. Test the affected flow.
7. Fix errors before proceeding.
8. Keep TypeScript types aligned with Supabase schema.
9. Avoid `any`.
10. Never bypass RLS/security for convenience.

# Priority
When requirements conflict:
`Approved business requirements > skill.md > database integrity/security > plan.md > existing implementation > Figma reference > old generated code`.
