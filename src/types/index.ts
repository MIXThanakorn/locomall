export type UserRole = "user" | "seller" | "market_owner" | "admin";
export type GenderType = "man" | "girl" | "other";

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  phone_number?: string;
  age?: number;
  gender?: GenderType;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

export interface UserAddress {
  id: string;
  user_id: string;
  title: "Home" | "Work" | "Other";
  province: string;
  district: string;
  sub_district: string;
  house_no_details: string;
  is_primary: boolean;
  created_at?: string;
}

export interface Market {
  id: string;
  owner_id: string;
  owner_name?: string;
  name: string;
  category: string;
  description: string;
  banner_url?: string;
  status: "draft" | "active" | "paused" | "closed";
  rating?: number;
  followers_count?: number;
  seller_count?: number;
  products_count?: number;
  created_at: string;
}

export interface MarketProduct {
  id: string;
  market_id: string;
  market_name?: string;
  name: string;
  description: string;
  unit_price: number;
  unit_label: string; // e.g. "ลูก", "ก้อน", "kg", "ขวด"
  image_url?: string;
  status: "active" | "inactive" | "archived";
  seller_count?: number;
  total_available_stock?: number;
  rating?: number;
  reviews_count?: number;
}

export interface SellerListing {
  id: string;
  market_product_id: string;
  seller_id: string;
  seller_name?: string;
  initial_quantity: number;
  reserved_quantity: number;
  fulfilled_quantity: number;
  status: "active" | "paused" | "closed";
  created_at: string;
}

export interface CartItem {
  market_product_id: string;
  product: MarketProduct;
  quantity: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  buyer_name?: string;
  address_id: string;
  address?: UserAddress;
  total_amount: number;
  status: "pending_payment" | "paid" | "preparing" | "shipping" | "completed" | "cancelled";
  payment_status: "unpaid" | "paid" | "refunded";
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  market_product_id: string;
  market_product_name?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  allocations?: OrderAllocation[];
}

export interface OrderAllocation {
  id: string;
  order_item_id: string;
  listing_id: string;
  seller_id: string;
  seller_name?: string;
  market_product_name?: string;
  allocated_quantity: number;
  fulfilled_quantity: number;
  unit_price: number;
  seller_amount: number;
  status: "pending" | "preparing" | "ready" | "shipping" | "completed" | "cancelled";
  tracking_number?: string;
  courier_name?: string;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  allocation_id?: string;
  type: "deposit" | "purchase" | "sale" | "refund" | "withdrawal" | "adjustment";
  amount: number;
  balance_after: number;
  reference_no?: string;
  description?: string;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  buyer_id: string;
  market_id: string;
  market_name?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name?: string;
  message: string;
  attachments?: {
    product_id?: string;
    product_name?: string;
    product_price?: number;
    unit_label?: string;
    image_url?: string;
  }[];
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  reference_type?: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewer_name?: string;
  score: number;
  review_description?: string;
  created_at: string;
}
