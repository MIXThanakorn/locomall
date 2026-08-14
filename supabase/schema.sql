-- ==============================================================================
-- LOCOMALL: COMMUNITY MARKETPLACE DATABASE SCHEMA & RPCs
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('man', 'girl', 'other')),
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'seller', 'market_owner', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. User Addresses Table
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (title IN ('Home', 'Work', 'Other')),
  province TEXT NOT NULL,
  district TEXT NOT NULL,
  sub_district TEXT NOT NULL,
  house_no_details TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Markets Table
CREATE TABLE IF NOT EXISTS public.markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Market Products Table
CREATE TABLE IF NOT EXISTS public.market_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
  unit_label TEXT NOT NULL DEFAULT 'unit',
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Seller Listings Table (Pool of sellers supplying a Market Product)
CREATE TABLE IF NOT EXISTS public.seller_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_product_id UUID NOT NULL REFERENCES public.market_products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  initial_quantity INTEGER NOT NULL CHECK (initial_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  fulfilled_quantity INTEGER NOT NULL DEFAULT 0 CHECK (fulfilled_quantity >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_stock CHECK (reserved_quantity + fulfilled_quantity <= initial_quantity),
  UNIQUE (market_product_id, seller_id)
);

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  address_id UUID NOT NULL REFERENCES public.user_addresses(id) ON DELETE RESTRICT,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'preparing', 'shipping', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  market_product_id UUID NOT NULL REFERENCES public.market_products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Order Allocations Table
CREATE TABLE IF NOT EXISTS public.order_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.seller_listings(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  allocated_quantity INTEGER NOT NULL CHECK (allocated_quantity > 0),
  fulfilled_quantity INTEGER NOT NULL DEFAULT 0 CHECK (fulfilled_quantity >= 0 AND fulfilled_quantity <= allocated_quantity),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  seller_amount NUMERIC(12,2) NOT NULL CHECK (seller_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'shipping', 'completed', 'cancelled')),
  tracking_number TEXT,
  courier_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Wallet Transactions Table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  allocation_id UUID REFERENCES public.order_allocations(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'purchase', 'sale', 'refund', 'withdrawal', 'adjustment')),
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  reference_no TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Chat Rooms & Messages
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(buyer_id, market_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- TRANSACTIONAL RPC: create_order_from_cart
-- Multi-item Cart Equal Seller Allocation with Deterministic Remainder Handling
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  p_buyer_id UUID,
  p_address_id UUID,
  p_items JSONB -- Array of { market_product_id: UUID, quantity: INT }
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item RECORD;
  v_item_id UUID;
  v_product RECORD;
  v_order_total NUMERIC(12,2) := 0;
  v_item_total NUMERIC(12,2);
  v_active_sellers RECORD;
  v_seller_count INT;
  v_base_qty INT;
  v_remainder INT;
  v_allocated INT;
  v_rem_counter INT := 0;
BEGIN
  -- Insert Master Order
  INSERT INTO public.orders (buyer_id, address_id, total_amount, status, payment_status)
  VALUES (p_buyer_id, p_address_id, 0, 'paid', 'paid')
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(market_product_id UUID, quantity INT)
  LOOP
    -- Lock Product & Fetch Price Snapshot
    SELECT * INTO v_product FROM public.market_products WHERE id = v_item.market_product_id AND status = 'active';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Market product % not found or inactive', v_item.market_product_id;
    END IF;

    v_item_total := v_product.unit_price * v_item.quantity;
    v_order_total := v_order_total + v_item_total;

    -- Insert Order Item
    INSERT INTO public.order_items (order_id, market_product_id, quantity, unit_price, total_amount)
    VALUES (v_order_id, v_item.market_product_id, v_item.quantity, v_product.unit_price, v_item_total)
    RETURNING id INTO v_item_id;

    -- Count active sellers with capacity
    SELECT COUNT(*) INTO v_seller_count
    FROM public.seller_listings
    WHERE market_product_id = v_item.market_product_id AND status = 'active'
      AND (initial_quantity - reserved_quantity - fulfilled_quantity) > 0;

    IF v_seller_count = 0 THEN
      RAISE EXCEPTION 'No active sellers available for product %', v_product.name;
    END IF;

    v_base_qty := v_item.quantity / v_seller_count;
    v_remainder := v_item.quantity % v_seller_count;

    -- Allocate among sellers ordered deterministically
    FOR v_active_sellers IN
      SELECT * FROM public.seller_listings
      WHERE market_product_id = v_item.market_product_id AND status = 'active'
        AND (initial_quantity - reserved_quantity - fulfilled_quantity) > 0
      ORDER BY created_at ASC, id ASC
      FOR UPDATE
    LOOP
      v_allocated := v_base_qty;
      IF v_rem_counter < v_remainder THEN
        v_allocated := v_allocated + 1;
        v_rem_counter := v_rem_counter + 1;
      END IF;

      IF v_allocated > 0 THEN
        -- Reserve Seller Stock
        UPDATE public.seller_listings
        SET reserved_quantity = reserved_quantity + v_allocated
        WHERE id = v_active_sellers.id;

        -- Insert Order Allocation
        INSERT INTO public.order_allocations (
          order_item_id, listing_id, seller_id, allocated_quantity, unit_price, seller_amount, status
        )
        VALUES (
          v_item_id,
          v_active_sellers.id,
          v_active_sellers.seller_id,
          v_allocated,
          v_product.unit_price,
          v_product.unit_price * v_allocated,
          'preparing'
        );
      END IF;
    END LOOP;
  END LOOP;

  -- Update total amount on Order
  UPDATE public.orders SET total_amount = v_order_total WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

-- ==============================================================================
-- TRANSACTIONAL RPC: fulfill_allocation
-- Seller Earnings Calculation & Wallet Credit upon Delivery
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fulfill_allocation(
  p_allocation_id UUID,
  p_fulfilled_quantity INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alloc RECORD;
  v_earned_amount NUMERIC(12,2);
  v_current_balance NUMERIC(12,2) := 0;
BEGIN
  -- Lock and fetch allocation
  SELECT * INTO v_alloc FROM public.order_allocations WHERE id = p_allocation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allocation % not found', p_allocation_id;
  END IF;

  IF v_alloc.status = 'completed' THEN
    RAISE EXCEPTION 'Allocation % is already completed', p_allocation_id;
  END IF;

  -- Calculate seller earnings strictly: fulfilled_quantity * unit_price
  v_earned_amount := p_fulfilled_quantity * v_alloc.unit_price;

  -- Update Listing Stock
  UPDATE public.seller_listings
  SET reserved_quantity = reserved_quantity - p_fulfilled_quantity,
      fulfilled_quantity = fulfilled_quantity + p_fulfilled_quantity
  WHERE id = v_alloc.listing_id;

  -- Update Allocation
  UPDATE public.order_allocations
  SET fulfilled_quantity = p_fulfilled_quantity,
      seller_amount = v_earned_amount,
      status = 'completed'
  WHERE id = p_allocation_id;

  -- Fetch last balance
  SELECT balance_after INTO v_current_balance
  FROM public.wallet_transactions
  WHERE user_id = v_alloc.seller_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;

  -- Credit Seller Wallet
  INSERT INTO public.wallet_transactions (
    user_id, allocation_id, type, amount, balance_after, description
  )
  VALUES (
    v_alloc.seller_id,
    p_allocation_id,
    'sale',
    v_earned_amount,
    v_current_balance + v_earned_amount,
    'Fulfillment earnings for Allocation #' || p_allocation_id
  );
END;
$$;
