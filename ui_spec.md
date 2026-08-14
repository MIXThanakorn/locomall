# Locomall UI Specification v1

## 1. Purpose

The provided Figma was designed around the old online-shopping/Shop
model.

Use it as a visual reference, not as business architecture.

Sources: - `AGENT_v2.md` = business logic - `implementation_plan_v2.md`
= technical implementation - `ui_spec.md` = UX/UI adaptation

## 2. Preserve From Figma

Preserve useful visual language: - color palette - typography - card
style - header style - bottom navigation - buttons - inputs - spacing -
border radius - image treatment - icon style

Do not blindly preserve: - Shop flows - independent shop ownership -
seller product catalogs - one-shop order flow

## 3. New UX

### Buyer

``` text
Home
 ↓
Markets
 ↓
Market Detail
 ↓
Market Product Detail
 ↓
Add to Cart
 ↓
Cart
 ↓
Checkout
 ↓
Order Detail
 ↓
Review
```

### Seller

``` text
Seller Dashboard
 ↓
Available Markets
 ↓
Market Product
 ↓
Join Selling
 ↓
Set Quantity
 ↓
My Listings
 ↓
Allocations
 ↓
Fulfill
 ↓
Earnings
```

### Market Owner

``` text
My Markets
 ↓
Create/Edit Market
 ↓
Market Products
 ↓
Sellers
 ↓
Orders / Allocations Overview
```

## 4. Mapping Old Figma to New Concepts

### Old Shop Front

Use as the visual reference for `Market Detail`.

Replace: - Shop name → Market name - shop product catalog → Market
Products - shop identity → Market Owner/market information where
useful - shop followers → relevant market/product participation
information

Do not recreate a personal Shop concept.

### Old Product Detail

Use as visual reference for `Market Product Detail`.

Show: - product image - product name - price/unit - market name -
participating seller count - aggregate available quantity -
description - quantity selector - Add to Cart

Buyer does not manually choose a seller.

### Old Product Management

Use as visual reference for `Market Product Management`.

Only Market Owner manages Market Products.

### Old Seller Dashboard

Use as visual reference for `Seller Dashboard`.

Replace: - product management → seller listings - shop orders →
allocations - stock → initial/reserved/fulfilled quantities - sales →
fulfilled earnings

### Old Order Management

Use as visual reference for `Seller Allocations`.

A seller sees only allocations assigned to them.

Example:

``` text
Order #1001
มะพร้าวน้ำหอม

Allocated: 10 ลูก
Fulfilled: 7 ลูก
Price: ฿20 / ลูก
Actual earnings: ฿140
```

### Old Seller Wallet

Use as visual reference for `Seller Earnings Wallet`.

Income is based on fulfilled quantity, not allocated quantity.

## 5. Screen Map

### Authentication

-   Splash
-   Sign In
-   Sign Up
-   Recover Password
-   OTP
-   New Password

### Buyer

-   Home
-   Market List
-   Market Detail
-   Market Product Detail
-   Cart
-   Checkout
-   Order List
-   Order Detail
-   Notification
-   Chat
-   Profile
-   Wallet
-   Addresses
-   Review

### Seller

-   Seller Dashboard
-   Browse Markets
-   Join Market Product
-   My Listings
-   Edit Listing
-   My Allocations
-   Allocation Detail
-   Seller Wallet

### Market Owner

-   My Markets
-   Create Market
-   Market Dashboard
-   Market Products
-   Create/Edit Market Product
-   Seller Overview
-   Order/Allocation Overview

## 6. Data Rules

UI may display: - product name - market name - price - unit - seller
count - aggregate availability

UI must not calculate authoritative: - stock - allocation - seller
earnings - wallet balance - payment status

These come from Supabase/RPC.

## 7. Cart

Cart may contain multiple market products.

Adding to cart does not reserve stock.

Stock is reserved only during successful checkout/order transaction.

## 8. Seller Listing UI

Seller joins an existing Market Product.

Example:

``` text
มะพร้าวน้ำหอม
฿20 / ลูก

จำนวนที่มี:
100

[เข้าร่วมขาย]
```

After joining, show: - initial quantity - reserved quantity - fulfilled
quantity - available quantity - status

## 9. Allocation Detail UI

Show: - order - product - allocated quantity - fulfilled quantity - unit
price - potential amount - actual earnings - status - tracking/courier

Do not show another seller's private allocation.

## 10. Order Detail UI

Buyer sees: - order number - order items - total - payment status -
order status - delivery address - fulfillment summary permitted by the
security model

Do not expose unnecessary seller private data.

## 11. Visual Validation

For every major screen: 1. Implement according to this specification. 2.
Run Expo. 3. Capture a screenshot. 4. Compare with the corresponding
Figma visual reference. 5. Fix layout, spacing, typography, colors,
icons, dimensions. 6. Repeat before marking the screen complete.

The goal is visual consistency with the Figma design language while
using the new business flow.

## 12. No Generic Redesign

Do not replace the visual direction with generic Expo UI.

If Figma contains a reusable visual component, preserve its
characteristics.

## 13. Separation of Responsibilities

Figma answers: "What should it look like?"

`AGENT_v2.md` answers: "How should the business work?"

`implementation_plan_v2.md` answers: "How should it be implemented?"

Never infer database/business architecture from the old Figma alone.
