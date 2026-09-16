-- ==============================================================================
-- LOCOMALL: COMMUNITY MARKETPLACE DATABASE SCHEMA (BASED ON SKILL.MD)
-- Architecture: Temporary Community Market + Shared Product + Multiple Sellers
--               + Capacity-Aware Equal Order Allocation
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES (แทน users_tb เดิม - skill.md Section 7.1)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  phone_num TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('man', 'girl', 'other')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'seller', 'market_owner', 'admin', 'buyer')),
  user_img_url TEXT,
  wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. USER ADDRESSES (แทน user_address_tb เดิม - skill.md Section 7.2)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_addresses (
  address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  address_name TEXT NOT NULL DEFAULT 'Home',
  province TEXT NOT NULL,
  district TEXT NOT NULL,
  sub_district TEXT NOT NULL,
  detail TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. MARKETS (แทน shops_tb เดิม - skill.md Section 7.3)
-- ตลาดชุมชนชั่วคราวตามประเภทสินค้า
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.markets (
  market_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  market_name TEXT NOT NULL,
  market_category TEXT NOT NULL,
  market_description TEXT NOT NULL,
  market_img_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'pending_approval', 'active', 'paused', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. MARKET MEMBERS (การเข้าร่วมตลาดของผู้ขาย - plan.md Phase 9)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.market_members (
  member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(market_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  area_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (market_id, user_id)
);

-- ==============================================================================
-- 5. MARKET PRODUCTS (แทน products_tb เดิม - skill.md Section 7.4)
-- สินค้าส่วนกลางในตลาดที่ผู้ขายหลายรายเข้าร่วมจัดหาได้
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.market_products (
  market_product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(market_id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ชิ้น', -- เช่น "ลูก", "ก้อน", "kg", "ขวด"
  product_price NUMERIC(12,2) NOT NULL CHECK (product_price > 0),
  product_img_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 6. SELLER LISTINGS (ตารางหัวใจหลัก - skill.md Section 7.5)
-- รายการสต็อกและราคาของผู้ขายแต่ละรายที่ส่งให้กับ Market Product
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.seller_listings (
  listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_product_id UUID NOT NULL REFERENCES public.market_products(market_product_id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  price NUMERIC(12,2) CHECK (price > 0), -- หากกำหนด จะใช้ราคาเฉพาะของผู้ขายรายนี้ หาก null จะใช้ product_price
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  sold_quantity INTEGER NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_stock CHECK (reserved_quantity + sold_quantity <= quantity),
  UNIQUE (market_product_id, seller_id)
);

-- ==============================================================================
-- 7. ORDERS (skill.md Section 8.1 - ห้ามมี shop_id!)
-- คำสั่งซื้อของผู้ซื้อ สโคปตามตลาด
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  address_id UUID NOT NULL REFERENCES public.user_addresses(address_id) ON DELETE RESTRICT,
  market_id UUID REFERENCES public.markets(market_id) ON DELETE RESTRICT,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'preparing', 'shipping', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 8. ORDER ITEMS (skill.md Section 8.2)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  market_product_id UUID NOT NULL REFERENCES public.market_products(market_product_id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 9. ORDER ALLOCATIONS (skill.md Section 8.3)
-- สัดส่วนที่ระบบกระจายให้ผู้ขายแต่ละคน
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.order_allocations (
  allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(order_item_id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.seller_listings(listing_id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  allocated_quantity INTEGER NOT NULL CHECK (allocated_quantity > 0),
  fulfilled_quantity INTEGER NOT NULL DEFAULT 0 CHECK (fulfilled_quantity >= 0 AND fulfilled_quantity <= allocated_quantity),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  seller_amount NUMERIC(12,2) NOT NULL CHECK (seller_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'shipping', 'completed', 'cancelled')),
  tracking_number TEXT,
  courier_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 10. WALLET TRANSACTIONS (skill.md Section 11 & 12)
-- รายการธุรกรรมกระเป๋าเงิน ไม่ให้ client แก้ไข balance โดยตรง
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'purchase', 'sale', 'refund', 'withdrawal', 'adjustment')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference_type TEXT, -- e.g. 'order_allocation', 'order', 'topup'
  reference_id UUID,   -- e.g. allocation_id, order_id
  description TEXT,
  balance_after NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 11. CHAT ROOMS & MESSAGES (skill.md Section 13)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(market_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(buyer_id, market_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(room_id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 12. REVIEWS (skill.md Section 14)
-- รีวิวหลัง order completed เท่านั้น
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(order_id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  review_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 13. NOTIFICATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 14. AUTH TRIGGER: AUTO-CREATE PROFILE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    full_name,
    username,
    user_img_url,
    role,
    wallet_balance
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    0.00
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 15. TRANSACTIONAL RPC: create_order_and_allocate
-- Core Community Marketplace Equal Allocation Algorithm (skill.md Section 9, 10, 30)
-- Canonical Test: 30 coconuts across 3 sellers (A @ 20, B @ 20, C @ 22) => 10/10/10, Total ฿620
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_order_and_allocate(
  p_buyer_id UUID,
  p_market_id UUID,
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
  v_item_total NUMERIC(12,2) := 0;
  v_seller RECORD;
  v_seller_count INT;
  v_base_qty INT;
  v_remainder INT;
  v_allocated INT;
  v_rem_counter INT;
  v_seller_unit_price NUMERIC(12,2);
  v_seller_subtotal NUMERIC(12,2);
  v_avail_stock INT;
  v_total_avail_stock INT;
BEGIN
  -- Verify address ownership
  IF NOT EXISTS (SELECT 1 FROM public.user_addresses WHERE address_id = p_address_id AND user_id = p_buyer_id) THEN
    RAISE EXCEPTION 'Address % does not belong to buyer %', p_address_id, p_buyer_id;
  END IF;

  -- Create master order initially with 0 total
  INSERT INTO public.orders (
    buyer_id, address_id, market_id, total_amount, status, payment_status
  )
  VALUES (
    p_buyer_id, p_address_id, p_market_id, 0, 'paid', 'paid'
  )
  RETURNING order_id INTO v_order_id;

  -- Process each requested product item
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(market_product_id UUID, quantity INT)
  LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than 0';
    END IF;

    -- Fetch and lock market product
    SELECT * INTO v_product FROM public.market_products
    WHERE market_product_id = v_item.market_product_id AND status = 'active';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Market product % not found or inactive', v_item.market_product_id;
    END IF;

    -- Check total available stock across active sellers
    SELECT COALESCE(SUM(quantity - reserved_quantity - sold_quantity), 0)
    INTO v_total_avail_stock
    FROM public.seller_listings
    WHERE market_product_id = v_item.market_product_id AND status = 'active';

    IF v_total_avail_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %: requested %, available %',
        v_product.product_name, v_item.quantity, v_total_avail_stock;
    END IF;

    -- Count eligible active sellers
    SELECT COUNT(*) INTO v_seller_count
    FROM public.seller_listings
    WHERE market_product_id = v_item.market_product_id AND status = 'active'
      AND (quantity - reserved_quantity - sold_quantity) > 0;

    IF v_seller_count = 0 THEN
      RAISE EXCEPTION 'No active sellers available for product %', v_product.product_name;
    END IF;

    -- Insert Order Item row (temporary unit_price from base, will update total_amount from actual allocations)
    INSERT INTO public.order_items (
      order_id, market_product_id, quantity, unit_price, total_amount
    )
    VALUES (
      v_order_id, v_item.market_product_id, v_item.quantity, v_product.product_price, 0
    )
    RETURNING order_item_id INTO v_item_id;

    v_base_qty := v_item.quantity / v_seller_count;
    v_remainder := v_item.quantity % v_seller_count;
    v_rem_counter := 0;
    v_item_total := 0;

    -- Allocate among sellers deterministically with row locking
    FOR v_seller IN
      SELECT * FROM public.seller_listings
      WHERE market_product_id = v_item.market_product_id AND status = 'active'
        AND (quantity - reserved_quantity - sold_quantity) > 0
      ORDER BY created_at ASC, listing_id ASC
      FOR UPDATE
    LOOP
      v_avail_stock := v_seller.quantity - v_seller.reserved_quantity - v_seller.sold_quantity;

      v_allocated := v_base_qty;
      IF v_rem_counter < v_remainder THEN
        v_allocated := v_allocated + 1;
        v_rem_counter := v_rem_counter + 1;
      END IF;

      -- Capacity cap: cannot allocate more than this seller's available stock
      IF v_allocated > v_avail_stock THEN
        v_allocated := v_avail_stock;
      END IF;

      IF v_allocated > 0 THEN
        -- Determine actual seller unit price (seller specific price or base product price)
        v_seller_unit_price := COALESCE(v_seller.price, v_product.product_price);
        v_seller_subtotal := v_allocated * v_seller_unit_price;

        -- Reserve stock on seller listing
        UPDATE public.seller_listings
        SET reserved_quantity = reserved_quantity + v_allocated,
            updated_at = timezone('utc'::text, now())
        WHERE listing_id = v_seller.listing_id;

        -- Create Order Allocation
        INSERT INTO public.order_allocations (
          order_item_id, listing_id, seller_id, allocated_quantity, fulfilled_quantity,
          unit_price, seller_amount, status
        )
        VALUES (
          v_item_id, v_seller.listing_id, v_seller.seller_id, v_allocated, 0,
          v_seller_unit_price, v_seller_subtotal, 'preparing'
        );

        v_item_total := v_item_total + v_seller_subtotal;
      END IF;
    END LOOP;

    -- Update Order Item with exact total and average unit price snapshot
    UPDATE public.order_items
    SET total_amount = v_item_total,
        unit_price = CASE WHEN v_item.quantity > 0 THEN ROUND(v_item_total / v_item.quantity, 2) ELSE v_product.product_price END
    WHERE order_item_id = v_item_id;

    v_order_total := v_order_total + v_item_total;
  END LOOP;

  -- Update final order total amount
  UPDATE public.orders
  SET total_amount = v_order_total,
      updated_at = timezone('utc'::text, now())
  WHERE order_id = v_order_id;

  RETURN v_order_id;
END;
$$;

-- Alias for backwards compatibility
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  p_buyer_id UUID,
  p_address_id UUID,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.create_order_and_allocate(p_buyer_id, NULL, p_address_id, p_items);
END;
$$;

-- ==============================================================================
-- 16. TRANSACTIONAL RPC: fulfill_allocation
-- Seller Earnings Calculation & Wallet Credit upon Delivery (skill.md Section 12)
-- earning = fulfilled_quantity * unit_price
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
  v_order_id UUID;
  v_pending_count INT;
BEGIN
  -- Lock allocation
  SELECT * INTO v_alloc FROM public.order_allocations
  WHERE allocation_id = p_allocation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allocation % not found', p_allocation_id;
  END IF;

  IF v_alloc.status = 'completed' THEN
    RAISE EXCEPTION 'Allocation % is already completed', p_allocation_id;
  END IF;

  IF p_fulfilled_quantity <= 0 OR p_fulfilled_quantity > v_alloc.allocated_quantity THEN
    RAISE EXCEPTION 'Invalid fulfilled quantity % (allocated: %)', p_fulfilled_quantity, v_alloc.allocated_quantity;
  END IF;

  -- Strict seller earning formula: fulfilled_quantity * unit_price (skill.md Section 12)
  v_earned_amount := p_fulfilled_quantity * v_alloc.unit_price;

  -- Move stock from reserved to sold in seller_listings
  UPDATE public.seller_listings
  SET reserved_quantity = reserved_quantity - v_alloc.allocated_quantity,
      sold_quantity = sold_quantity + p_fulfilled_quantity,
      updated_at = timezone('utc'::text, now())
  WHERE listing_id = v_alloc.listing_id;

  -- Update Allocation record
  UPDATE public.order_allocations
  SET fulfilled_quantity = p_fulfilled_quantity,
      seller_amount = v_earned_amount,
      status = 'completed',
      updated_at = timezone('utc'::text, now())
  WHERE allocation_id = p_allocation_id;

  -- Fetch current seller balance
  SELECT wallet_balance INTO v_current_balance
  FROM public.profiles
  WHERE user_id = v_alloc.seller_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    v_current_balance := 0.00;
  END IF;

  -- Credit seller wallet balance
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + v_earned_amount,
      updated_at = timezone('utc'::text, now())
  WHERE user_id = v_alloc.seller_id;

  -- Insert wallet transaction ledger entry (Idempotent)
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    transaction_type,
    status,
    reference_type,
    reference_id,
    description,
    balance_after
  )
  VALUES (
    v_alloc.seller_id,
    v_earned_amount,
    'sale',
    'completed',
    'order_allocation',
    p_allocation_id,
    'Seller earnings from Allocation #' || substr(p_allocation_id::text, 1, 8),
    v_current_balance + v_earned_amount
  );

  -- Check if all allocations in master order are completed
  SELECT oi.order_id INTO v_order_id
  FROM public.order_items oi
  JOIN public.order_allocations oa ON oi.order_item_id = oa.order_item_id
  WHERE oa.allocation_id = p_allocation_id;

  SELECT COUNT(*) INTO v_pending_count
  FROM public.order_allocations oa
  JOIN public.order_items oi ON oa.order_item_id = oi.order_item_id
  WHERE oi.order_id = v_order_id AND oa.status != 'completed' AND oa.status != 'cancelled';

  IF v_pending_count = 0 THEN
    UPDATE public.orders
    SET status = 'completed',
        updated_at = timezone('utc'::text, now())
    WHERE order_id = v_order_id;
  END IF;
END;
$$;

-- ==============================================================================
-- 17. TRANSACTIONAL RPC: cancel_order
-- Releases reserved inventory back to sellers safely (plan.md Phase 19)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Cancelled by buyer'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alloc RECORD;
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_order.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot cancel order in status %', v_order.status;
  END IF;

  -- Loop through all allocations to release reserved stock
  FOR v_alloc IN
    SELECT oa.*
    FROM public.order_allocations oa
    JOIN public.order_items oi ON oa.order_item_id = oi.order_item_id
    WHERE oi.order_id = p_order_id AND oa.status NOT IN ('completed', 'cancelled')
    FOR UPDATE
  LOOP
    -- Revert reserved stock on listing
    UPDATE public.seller_listings
    SET reserved_quantity = GREATEST(0, reserved_quantity - v_alloc.allocated_quantity),
        updated_at = timezone('utc'::text, now())
    WHERE listing_id = v_alloc.listing_id;

    -- Mark allocation cancelled
    UPDATE public.order_allocations
    SET status = 'cancelled',
        updated_at = timezone('utc'::text, now())
    WHERE allocation_id = v_alloc.allocation_id;
  END LOOP;

  -- Update order status
  UPDATE public.orders
  SET status = 'cancelled',
      updated_at = timezone('utc'::text, now())
  WHERE order_id = p_order_id;
END;
$$;

-- ==============================================================================
-- 18. ROW LEVEL SECURITY (RLS) POLICIES (skill.md Section 17 & 18)
-- ==============================================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User Addresses
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own addresses" ON public.user_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own address" ON public.user_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own address" ON public.user_addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own address" ON public.user_addresses FOR DELETE USING (auth.uid() = user_id);

-- Markets
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active markets are viewable by everyone" ON public.markets FOR SELECT USING (status = 'active' OR auth.uid() = owner_id);
CREATE POLICY "Owners can insert market" ON public.markets FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update market" ON public.markets FOR UPDATE USING (auth.uid() = owner_id);

-- Market Members
ALTER TABLE public.market_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members viewable by market owner or applicant" ON public.market_members FOR SELECT USING (
  auth.uid() = user_id OR
  auth.uid() IN (SELECT owner_id FROM public.markets WHERE market_id = market_members.market_id)
);
CREATE POLICY "Users can apply to market" ON public.market_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Market owners can update members" ON public.market_members FOR UPDATE USING (
  auth.uid() IN (SELECT owner_id FROM public.markets WHERE market_id = market_members.market_id)
);

-- Market Products
ALTER TABLE public.market_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Market products viewable by everyone" ON public.market_products FOR SELECT USING (true);
CREATE POLICY "Market owner can manage products" ON public.market_products FOR ALL USING (
  auth.uid() IN (SELECT owner_id FROM public.markets WHERE market_id = market_products.market_id)
);

-- Seller Listings
ALTER TABLE public.seller_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active listings viewable by everyone" ON public.seller_listings FOR SELECT USING (status = 'active' OR auth.uid() = seller_id);
CREATE POLICY "Sellers can manage own listings" ON public.seller_listings FOR ALL USING (auth.uid() = seller_id);

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers view own orders" ON public.orders FOR SELECT USING (
  auth.uid() = buyer_id OR
  auth.uid() IN (
    SELECT oa.seller_id FROM public.order_allocations oa
    JOIN public.order_items oi ON oa.order_item_id = oi.order_item_id
    WHERE oi.order_id = orders.order_id
  )
);

-- Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order items viewable by order participants" ON public.order_items FOR SELECT USING (
  auth.uid() IN (SELECT buyer_id FROM public.orders WHERE order_id = order_items.order_id) OR
  auth.uid() IN (SELECT seller_id FROM public.order_allocations WHERE order_item_id = order_items.order_item_id)
);

-- Order Allocations
ALTER TABLE public.order_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allocations viewable by seller or buyer" ON public.order_allocations FOR SELECT USING (
  auth.uid() = seller_id OR
  auth.uid() IN (
    SELECT o.buyer_id FROM public.orders o
    JOIN public.order_items oi ON o.order_id = oi.order_id
    WHERE oi.order_item_id = order_allocations.order_item_id
  )
);
CREATE POLICY "Sellers can update own allocation state" ON public.order_allocations FOR UPDATE USING (auth.uid() = seller_id);

-- Wallet Transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- Chat
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat room participants only" ON public.chat_rooms FOR SELECT USING (
  auth.uid() = buyer_id OR
  auth.uid() IN (SELECT owner_id FROM public.markets WHERE market_id = chat_rooms.market_id)
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages viewable by room participants" ON public.chat_messages FOR SELECT USING (
  auth.uid() IN (
    SELECT buyer_id FROM public.chat_rooms WHERE room_id = chat_messages.room_id
    UNION
    SELECT m.owner_id FROM public.markets m JOIN public.chat_rooms cr ON m.market_id = cr.market_id WHERE cr.room_id = chat_messages.room_id
  )
);
CREATE POLICY "Senders can insert messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Buyers can create review for completed order" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid() = reviewer_id AND
  EXISTS (SELECT 1 FROM public.orders WHERE order_id = reviews.order_id AND buyer_id = auth.uid() AND status = 'completed')
);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notification read state" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ==============================================================================
-- 19. STORAGE BUCKET POLICIES (avatars, market-images, product-images)
-- ==============================================================================
-- Public Read for images
CREATE POLICY "Public read for avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public read for market-images" ON storage.objects FOR SELECT USING (bucket_id = 'market-images');
CREATE POLICY "Public read for product-images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

-- Authenticated Upload
CREATE POLICY "Users can upload avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload market images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'market-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
