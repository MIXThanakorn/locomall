// Generated from the public schema; preserve explicit nullable RPC argument overrides.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string
          audit_id: number
          created_at: string
          entity_id: number | null
          entity_type: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id: string
          audit_id?: never
          created_at?: string
          entity_id?: number | null
          entity_type: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string
          audit_id?: never
          created_at?: string
          entity_id?: number | null
          entity_type?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      allocation_status_events: {
        Row: {
          actor_id: string
          allocation_id: number
          created_at: string
          event_id: number
          from_status: string | null
          to_status: string
        }
        Insert: {
          actor_id: string
          allocation_id: number
          created_at?: string
          event_id?: never
          from_status?: string | null
          to_status: string
        }
        Update: {
          actor_id?: string
          allocation_id?: number
          created_at?: string
          event_id?: never
          from_status?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocation_status_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "allocation_status_events_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "order_allocations"
            referencedColumns: ["allocation_id"]
          },
        ]
      }
      approval_events: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity_id: number
          entity_type: string
          event_id: number
          note: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity_id: number
          entity_type: string
          event_id?: never
          note?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity_id?: number
          entity_type?: string
          event_id?: never
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: number
          cart_item_id: number
          quantity: number
          store_id: number
        }
        Insert: {
          cart_id: number
          cart_item_id?: never
          quantity: number
          store_id: number
        }
        Update: {
          cart_id?: number
          cart_item_id?: never
          quantity?: number
          store_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["cart_id"]
          },
          {
            foreignKeyName: "cart_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["store_id"]
          },
        ]
      }
      carts: {
        Row: {
          buyer_id: string
          cart_id: number
          market_id: number | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          cart_id?: never
          market_id?: number | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          cart_id?: never
          market_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "carts_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["market_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          message: string
          message_id: number
          room_id: number
          sender_id: string
        }
        Insert: {
          created_at?: string
          message: string
          message_id?: never
          room_id: number
          sender_id: string
        }
        Update: {
          created_at?: string
          message?: string
          message_id?: never
          room_id?: number
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          buyer_id: string
          created_at: string
          room_id: number
          store_id: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          room_id?: never
          store_id: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          room_id?: never
          store_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_rooms_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["store_id"]
          },
        ]
      }
      demo_accounts: {
        Row: {
          seller_pending: number
          seller_settled: number
          updated_at: string
          user_id: string
          wallet_balance: number
        }
        Insert: {
          seller_pending?: number
          seller_settled?: number
          updated_at?: string
          user_id: string
          wallet_balance?: number
        }
        Update: {
          seller_pending?: number
          seller_settled?: number
          updated_at?: string
          user_id?: string
          wallet_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "demo_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      demo_ledger: {
        Row: {
          created_at: string
          entry_id: number
          entry_type: string
          order_id: number | null
          seller_delta: number
          settlement_id: string | null
          topup_request_id: string | null
          user_id: string
          wallet_delta: number
        }
        Insert: {
          created_at?: string
          entry_id?: never
          entry_type: string
          order_id?: number | null
          seller_delta?: number
          settlement_id?: string | null
          topup_request_id?: string | null
          user_id: string
          wallet_delta?: number
        }
        Update: {
          created_at?: string
          entry_id?: never
          entry_type?: string
          order_id?: number | null
          seller_delta?: number
          settlement_id?: string | null
          topup_request_id?: string | null
          user_id?: string
          wallet_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "demo_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "demo_ledger_settlement_fk"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "demo_settlements"
            referencedColumns: ["settlement_id"]
          },
          {
            foreignKeyName: "demo_ledger_topup_request_id_fkey"
            columns: ["topup_request_id"]
            isOneToOne: false
            referencedRelation: "demo_topup_requests"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "demo_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      demo_order_requests: {
        Row: {
          order_id: number | null
          payload: Json
          request_id: string
          user_id: string
        }
        Insert: {
          order_id?: number | null
          payload: Json
          request_id: string
          user_id: string
        }
        Update: {
          order_id?: number | null
          payload?: Json
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_order_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "demo_order_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      demo_settlements: {
        Row: {
          amount: number
          created_at: string
          evidence_note: string
          recorded_by: string
          seller_id: string
          settlement_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          evidence_note: string
          recorded_by: string
          seller_id: string
          settlement_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          evidence_note?: string
          recorded_by?: string
          seller_id?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_settlements_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "demo_settlements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      demo_topup_requests: {
        Row: {
          amount: number
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          request_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          request_id?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          request_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_topup_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "demo_topup_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      markets: {
        Row: {
          approval_note: string | null
          approval_status: string
          created_at: string
          description: string
          district_code: string
          geography: unknown
          hub_address: string
          image_url: string | null
          market_id: number
          name: string
          owner_id: string
          province_code: string
          rating_average: number
          rating_count: number
          subdistrict_code: string
          updated_at: string
        }
        Insert: {
          approval_note?: string | null
          approval_status?: string
          created_at?: string
          description?: string
          district_code: string
          geography: unknown
          hub_address: string
          image_url?: string | null
          market_id?: never
          name: string
          owner_id: string
          province_code: string
          rating_average?: number
          rating_count?: number
          subdistrict_code: string
          updated_at?: string
        }
        Update: {
          approval_note?: string | null
          approval_status?: string
          created_at?: string
          description?: string
          district_code?: string
          geography?: unknown
          hub_address?: string
          image_url?: string | null
          market_id?: never
          name?: string
          owner_id?: string
          province_code?: string
          rating_average?: number
          rating_count?: number
          subdistrict_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "markets_district_code_fkey"
            columns: ["district_code"]
            isOneToOne: false
            referencedRelation: "thai_districts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "markets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "markets_province_code_fkey"
            columns: ["province_code"]
            isOneToOne: false
            referencedRelation: "thai_provinces"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "markets_subdistrict_code_fkey"
            columns: ["subdistrict_code"]
            isOneToOne: false
            referencedRelation: "thai_subdistricts"
            referencedColumns: ["code"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          category: string
          created_at: string
          dismissed_at: string | null
          entity_id: number | null
          entity_type: string | null
          notification_id: number
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          dismissed_at?: string | null
          entity_id?: number | null
          entity_type?: string | null
          notification_id?: never
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          dismissed_at?: string | null
          entity_id?: number | null
          entity_type?: string | null
          notification_id?: never
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      order_allocations: {
        Row: {
          allocation_id: number
          created_at: string
          listing_id: number
          order_item_id: number
          quantity: number
          seller_id: string
          status: string
          stock_deducted_at: string | null
          updated_at: string
        }
        Insert: {
          allocation_id?: never
          created_at?: string
          listing_id: number
          order_item_id: number
          quantity: number
          seller_id: string
          status?: string
          stock_deducted_at?: string | null
          updated_at?: string
        }
        Update: {
          allocation_id?: never
          created_at?: string
          listing_id?: number
          order_item_id?: number
          quantity?: number
          seller_id?: string
          status?: string
          stock_deducted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_allocations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "seller_listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "order_allocations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "order_allocations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      order_items: {
        Row: {
          order_id: number
          order_item_id: number
          product_image_url: string | null
          product_name: string
          quantity: number
          store_id: number
          total_amount: number
          unit: string
          unit_price: number
        }
        Insert: {
          order_id: number
          order_item_id?: never
          product_image_url?: string | null
          product_name: string
          quantity: number
          store_id: number
          total_amount: number
          unit: string
          unit_price: number
        }
        Update: {
          order_id?: number
          order_item_id?: never
          product_image_url?: string | null
          product_name?: string
          quantity?: number
          store_id?: number
          total_amount?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["store_id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: number | null
          buyer_id: string
          courier_name: string | null
          created_at: string
          delivered_at: string | null
          delivery_address_snapshot: Json | null
          fulfillment_method: string
          market_id: number
          order_id: number
          order_number: string
          payment_method: string
          payment_status: string
          pickup_distance_km: number | null
          pickup_ready_at: string | null
          shipped_at: string | null
          status: string
          total_amount: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          address_id?: number | null
          buyer_id: string
          courier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address_snapshot?: Json | null
          fulfillment_method?: string
          market_id: number
          order_id?: never
          order_number?: string
          payment_method?: string
          payment_status?: string
          pickup_distance_km?: number | null
          pickup_ready_at?: string | null
          shipped_at?: string | null
          status?: string
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          address_id?: number | null
          buyer_id?: string
          courier_name?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address_snapshot?: Json | null
          fulfillment_method?: string
          market_id?: number
          order_id?: never
          order_number?: string
          payment_method?: string
          payment_status?: string
          pickup_distance_km?: number | null
          pickup_ready_at?: string | null
          shipped_at?: string | null
          status?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "user_addresses"
            referencedColumns: ["address_id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "orders_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["market_id"]
          },
        ]
      }
      platform_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          bio: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          gender: string | null
          locale: string
          phone_num: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
          user_img_url: string | null
          username: string | null
          wallet_balance: number
        }
        Insert: {
          age?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          gender?: string | null
          locale?: string
          phone_num?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
          user_img_url?: string | null
          username?: string | null
          wallet_balance?: number
        }
        Update: {
          age?: number | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          gender?: string | null
          locale?: string
          phone_num?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
          user_img_url?: string | null
          username?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      purchase_reviews: {
        Row: {
          body: string
          buyer_id: string
          created_at: string
          hidden_at: string | null
          hidden_by: string | null
          hide_reason: string | null
          market_id: number | null
          order_id: number
          order_item_id: number | null
          review_id: number
          stars: number
          store_id: number | null
          updated_at: string
        }
        Insert: {
          body?: string
          buyer_id: string
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          hide_reason?: string | null
          market_id?: number | null
          order_id: number
          order_item_id?: number | null
          review_id?: never
          stars: number
          store_id?: number | null
          updated_at?: string
        }
        Update: {
          body?: string
          buyer_id?: string
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          hide_reason?: string | null
          market_id?: number | null
          order_id?: number
          order_item_id?: number | null
          review_id?: never
          stars?: number
          store_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_reviews_hidden_by_fkey"
            columns: ["hidden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_reviews_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["market_id"]
          },
          {
            foreignKeyName: "purchase_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "purchase_reviews_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "purchase_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["store_id"]
          },
        ]
      }
      push_delivery_jobs: {
        Row: {
          attempts: number
          created_at: string
          job_id: number
          last_error: string | null
          lease_until: string | null
          next_attempt_at: string
          notification_id: number
          push_device_id: number
          receipt_checks: number
          registration_version: string
          status: string
          ticket_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          job_id?: never
          last_error?: string | null
          lease_until?: string | null
          next_attempt_at?: string
          notification_id: number
          push_device_id: number
          receipt_checks?: number
          registration_version: string
          status?: string
          ticket_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          job_id?: never
          last_error?: string | null
          lease_until?: string | null
          next_attempt_at?: string
          notification_id?: number
          push_device_id?: number
          receipt_checks?: number
          registration_version?: string
          status?: string
          ticket_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_delivery_jobs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["notification_id"]
          },
          {
            foreignKeyName: "push_delivery_jobs_push_device_id_fkey"
            columns: ["push_device_id"]
            isOneToOne: false
            referencedRelation: "user_push_devices"
            referencedColumns: ["push_device_id"]
          },
          {
            foreignKeyName: "push_delivery_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      seller_listings: {
        Row: {
          created_at: string
          fulfilled_quantity: number
          last_allocated_at: string | null
          listing_id: number
          reserved_quantity: number
          seller_id: string
          status: string
          stock_quantity: number
          store_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fulfilled_quantity?: number
          last_allocated_at?: string | null
          listing_id?: never
          reserved_quantity?: number
          seller_id: string
          status?: string
          stock_quantity?: number
          store_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fulfilled_quantity?: number
          last_allocated_at?: string | null
          listing_id?: never
          reserved_quantity?: number
          seller_id?: string
          status?: string
          stock_quantity?: number
          store_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "seller_listings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["store_id"]
          },
        ]
      }
      store_seller_applications: {
        Row: {
          applicant_id: string
          application_id: number
          created_at: string
          note: string | null
          product_image_url: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          store_id: number
        }
        Insert: {
          applicant_id: string
          application_id?: never
          created_at?: string
          note?: string | null
          product_image_url?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          store_id: number
        }
        Update: {
          applicant_id?: string
          application_id?: never
          created_at?: string
          note?: string | null
          product_image_url?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          store_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_seller_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "store_seller_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "store_seller_applications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["store_id"]
          },
        ]
      }
      stores: {
        Row: {
          approval_note: string | null
          approval_status: string
          created_at: string
          description: string
          image_url: string | null
          manager_id: string
          market_id: number
          name: string
          product_name: string
          rating_average: number
          rating_count: number
          store_id: number
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          approval_note?: string | null
          approval_status?: string
          created_at?: string
          description?: string
          image_url?: string | null
          manager_id: string
          market_id: number
          name: string
          product_name: string
          rating_average?: number
          rating_count?: number
          store_id?: never
          unit?: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          approval_note?: string | null
          approval_status?: string
          created_at?: string
          description?: string
          image_url?: string | null
          manager_id?: string
          market_id?: number
          name?: string
          product_name?: string
          rating_average?: number
          rating_count?: number
          store_id?: never
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "stores_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["market_id"]
          },
        ]
      }
      thai_districts: {
        Row: {
          code: string
          geography: unknown
          name_en: string
          name_th: string
          province_code: string
          source: string
          source_version: string
        }
        Insert: {
          code: string
          geography?: unknown
          name_en: string
          name_th: string
          province_code: string
          source: string
          source_version: string
        }
        Update: {
          code?: string
          geography?: unknown
          name_en?: string
          name_th?: string
          province_code?: string
          source?: string
          source_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "thai_districts_province_code_fkey"
            columns: ["province_code"]
            isOneToOne: false
            referencedRelation: "thai_provinces"
            referencedColumns: ["code"]
          },
        ]
      }
      thai_provinces: {
        Row: {
          code: string
          geography: unknown
          name_en: string
          name_th: string
          source: string
          source_version: string
        }
        Insert: {
          code: string
          geography?: unknown
          name_en: string
          name_th: string
          source: string
          source_version: string
        }
        Update: {
          code?: string
          geography?: unknown
          name_en?: string
          name_th?: string
          source?: string
          source_version?: string
        }
        Relationships: []
      }
      thai_subdistricts: {
        Row: {
          code: string
          district_code: string
          geography: unknown
          name_en: string
          name_th: string
          postal_code: string | null
          province_code: string
          source: string
          source_version: string
        }
        Insert: {
          code: string
          district_code: string
          geography?: unknown
          name_en: string
          name_th: string
          postal_code?: string | null
          province_code: string
          source: string
          source_version: string
        }
        Update: {
          code?: string
          district_code?: string
          geography?: unknown
          name_en?: string
          name_th?: string
          postal_code?: string | null
          province_code?: string
          source?: string
          source_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "thai_subdistricts_district_code_fkey"
            columns: ["district_code"]
            isOneToOne: false
            referencedRelation: "thai_districts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "thai_subdistricts_province_code_fkey"
            columns: ["province_code"]
            isOneToOne: false
            referencedRelation: "thai_provinces"
            referencedColumns: ["code"]
          },
        ]
      }
      user_addresses: {
        Row: {
          address_id: number
          address_line: string
          created_at: string
          is_default: boolean
          label: string
          phone: string
          postal_code: string
          recipient_name: string
          subdistrict_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_id?: never
          address_line: string
          created_at?: string
          is_default?: boolean
          label?: string
          phone: string
          postal_code: string
          recipient_name: string
          subdistrict_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_id?: never
          address_line?: string
          created_at?: string
          is_default?: boolean
          label?: string
          phone?: string
          postal_code?: string
          recipient_name?: string
          subdistrict_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_addresses_subdistrict_code_fkey"
            columns: ["subdistrict_code"]
            isOneToOne: false
            referencedRelation: "thai_subdistricts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_catalog_links: {
        Row: {
          created_at: string
          kind: string
          target_id: number
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: string
          target_id: number
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          target_id?: number
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_catalog_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_locations: {
        Row: {
          district_code: string
          geography: unknown
          gps_consent: boolean
          province_code: string
          source: string
          subdistrict_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          district_code: string
          geography: unknown
          gps_consent?: boolean
          province_code: string
          source: string
          subdistrict_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          district_code?: string
          geography?: unknown
          gps_consent?: boolean
          province_code?: string
          source?: string
          subdistrict_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_locations_district_code_fkey"
            columns: ["district_code"]
            isOneToOne: false
            referencedRelation: "thai_districts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_locations_province_code_fkey"
            columns: ["province_code"]
            isOneToOne: false
            referencedRelation: "thai_provinces"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_locations_subdistrict_code_fkey"
            columns: ["subdistrict_code"]
            isOneToOne: false
            referencedRelation: "thai_subdistricts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_push_devices: {
        Row: {
          created_at: string
          device_name: string | null
          enabled: boolean
          expo_push_token: string
          last_error: string | null
          last_seen_at: string
          last_success_at: string | null
          platform: string
          push_device_id: number
          registration_version: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          enabled?: boolean
          expo_push_token: string
          last_error?: string | null
          last_seen_at?: string
          last_success_at?: string | null
          platform: string
          push_device_id?: never
          registration_version?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          enabled?: boolean
          expo_push_token?: string
          last_error?: string | null
          last_seen_at?: string
          last_success_at?: string | null
          platform?: string
          push_device_id?: never
          registration_version?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_push_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_allocation: {
        Args: { p_allocation_id: number }
        Returns: undefined
      }
      apply_for_market: {
        Args: {
          p_description: string
          p_hub_address: string
          p_image_url?: string
          p_name: string
          p_subdistrict_code: string
        }
        Returns: number
      }
      apply_to_open_store: {
        Args: {
          p_description: string
          p_image_url?: string
          p_market_id: number
          p_name: string
          p_product_name: string
          p_unit: string
          p_unit_price: number
        }
        Returns: number
      }
      apply_to_sell_in_store: {
        Args: {
          p_note?: string
          p_product_image_url?: string
          p_store_id: number
        }
        Returns: number
      }
      begin_stripe_order: {
        Args: { p_payload: Json; p_request: string; p_user: string }
        Returns: Json
      }
      cancel_order: {
        Args: {
          p_admin_override?: boolean
          p_order_id: number
          p_reason?: string
        }
        Returns: undefined
      }
      claim_push_delivery_jobs: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          job_id: number
          last_error: string | null
          lease_until: string | null
          next_attempt_at: string
          notification_id: number
          push_device_id: number
          receipt_checks: number
          registration_version: string
          status: string
          ticket_id: string | null
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "push_delivery_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_location_onboarding: {
        Args: {
          p_district_code: string
          p_gps_consent?: boolean
          p_lat?: number
          p_lng?: number
          p_province_code: string
          p_subdistrict_code: string
        }
        Returns: undefined
      }
      confirm_delivery: { Args: { p_order_id: number }; Returns: undefined }
      consolidate_order: { Args: { p_order_id: number }; Returns: undefined }
      create_cod_order: {
        Args: {
          p_address_id: number
          p_fulfillment_method?: string
          p_items: Json
          p_lat?: number
          p_lng?: number
          p_market_id: number
        }
        Returns: number
      }
      create_cod_order_once: {
        Args: { p_request_id: string; p_market_id: number; p_address_id: number | null; p_items: Json; p_fulfillment_method?: string; p_lat?: number; p_lng?: number }
        Returns: number
      }
      create_demo_wallet_order: {
        Args: {
          p_address_id: number | null
          p_fulfillment_method?: string
          p_items: Json
          p_lat?: number
          p_lng?: number
          p_market_id: number
          p_request_id: string
        }
        Returns: number
      }
      decide_demo_topup: {
        Args: { p_approve: boolean; p_note?: string; p_request_id: string }
        Returns: undefined
      }
      delete_cancelled_order: {
        Args: { p_order_id: number; p_reason: string }
        Returns: undefined
      }
      disable_my_push_device: {
        Args: { p_expo_push_token: string }
        Returns: undefined
      }
      disable_my_push_devices: { Args: never; Returns: undefined }
      discover_catalog_page: {
        Args: {
          p_after_distance_km?: number | null
          p_after_entity_id?: number | null
          p_after_entity_type?: string | null
          p_kind?: string
          p_lat?: number | null
          p_limit?: number
          p_lng?: number | null
          p_query?: string | null
        }
        Returns: {
          available_stock: number
          description: string
          distance_km: number | null
          entity_id: number
          entity_type: string
          image_url: string | null
          market_id: number
          name: string
          radius_km: number
        }[]
      }
      discover_filtered_catalog_page: {
        Args: {
          p_after_distance_km?: number
          p_after_entity_id?: number
          p_after_entity_type?: string
          p_after_missing?: boolean
          p_after_value?: number
          p_in_stock_only?: boolean
          p_kind?: string
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_nearby_only?: boolean
          p_query?: string
          p_same_area?: boolean
          p_sort?: string
        }
        Returns: {
          available_stock: number
          cursor_missing: boolean
          cursor_value: number
          description: string
          distance_km: number
          entity_id: number
          entity_type: string
          image_url: string
          market_id: number
          name: string
          radius_km: number
          rating_average: number
          rating_count: number
          unit_price: number
        }[]
      }
      discover_nearby: {
        Args: {
          p_kind?: string
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_query?: string
        }
        Returns: {
          available_stock: number
          description: string
          distance_km: number
          entity_id: number
          entity_type: string
          image_url: string
          market_id: number
          name: string
          radius_km: number
        }[]
      }
      discover_nearby_catalog_page: {
        Args: {
          p_after_distance_km?: number
          p_after_entity_id?: number
          p_after_entity_type?: string
          p_kind?: string
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_query?: string
          p_same_area?: boolean
        }
        Returns: {
          available_stock: number
          description: string
          distance_km: number
          entity_id: number
          entity_type: string
          image_url: string
          market_id: number
          name: string
          radius_km: number
        }[]
      }
      discover_same_area_catalog_page: {
        Args: {
          p_after_distance_km?: number
          p_after_entity_id?: number
          p_after_entity_type?: string
          p_kind?: string
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_query?: string
        }
        Returns: {
          available_stock: number
          description: string
          distance_km: number
          entity_id: number
          entity_type: string
          image_url: string
          market_id: number
          name: string
          radius_km: number
        }[]
      }
      dismiss_my_read_notifications: { Args: never; Returns: number }
      get_catalog_card_details: {
        Args: { p_market_ids: number[]; p_store_ids: number[] }
        Returns: {
          entity_id: number
          entity_type: string
          market_name: string
          min_price: number
          product_name: string
          rating_average: number
          rating_count: number
          sold_quantity: number
          unit: string
        }[]
      }
      get_catalog_card_metrics: {
        Args: { p_market_ids: number[]; p_store_ids: number[] }
        Returns: {
          entity_id: number
          entity_type: string
          min_price: number
          rating_average: number
          rating_count: number
          sold_quantity: number
        }[]
      }
      get_catalog_review_page: {
        Args: {
          p_target_type: string
          p_target_id: number
          p_stars?: number | null
          p_limit?: number
          p_before_created_at?: string | null
          p_before_review_id?: number | null
        }
        Returns: Json
      }
      get_catalog_reviews: {
        Args: { p_target_id: number; p_target_type: string }
        Returns: Json
      }
      get_chat_messages_page: {
        Args: {
          p_cursor_at?: string
          p_cursor_id?: number
          p_limit?: number
          p_newer?: boolean
          p_room_id: number
        }
        Returns: {
          created_at: string
          message: string
          message_id: number
          sender_id: string
        }[]
      }
      get_chat_order_context: {
        Args: { p_room_id: number }
        Returns: {
          allocation_id: number
          created_at: string
          item_amount: number
          order_id: number
          order_item_id: number
          order_number: string
          order_status: string
          product_name: string
          quantity: number
          unit: string
          viewer_is_buyer: boolean
        }[]
      }
      get_chat_room_header: {
        Args: { p_room_id: number }
        Returns: {
          market_name: string
          partner_name: string
          partner_role: string
          product_name: string
          store_id: number
          store_name: string
        }[]
      }
      get_market_application_contacts: {
        Args: never
        Returns: {
          applicant_name: string
          applicant_phone: string
          applicant_username: string
          application_id: number
        }[]
      }
      get_market_catalog: { Args: { p_market_id: number }; Returns: Json }
      get_market_seller_contacts: {
        Args: { p_order_id?: number }
        Returns: {
          allocation_id: number
          order_id: number
          seller_name: string
          seller_phone: string
          seller_username: string
        }[]
      }
      get_market_seller_contacts_page: {
        Args: { p_order_ids: number[] }
        Returns: {
          allocation_id: number
          order_id: number
          seller_name: string
          seller_phone: string
          seller_username: string
        }[]
      }
      get_my_chat_inbox: {
        Args: never
        Returns: {
          last_message: string
          last_message_at: string
          last_sender_id: string
          market_name: string
          partner_name: string
          partner_role: string
          product_name: string
          room_id: number
          sort_at: string
          store_name: string
          unread_count: number
        }[]
      }
      get_my_chat_visuals: {
        Args: { p_room_ids?: number[] }
        Returns: {
          partner_image_url: string
          product_image_url: string
          room_id: number
        }[]
      }
      get_my_demo_seller_held: { Args: never; Returns: number }
      get_my_notification_target: {
        Args: { p_notification_id: number }
        Returns: {
          entity_id: number
          entity_type: string
        }[]
      }
      get_my_seller_allocations: {
        Args: { p_allocation_id?: number }
        Returns: Json
      }
      get_my_seller_allocations_page: {
        Args: {
          p_before_created_at?: string
          p_before_id?: number
          p_limit?: number
        }
        Returns: Json
      }
      get_or_create_chat_room: { Args: { p_store_id: number }; Returns: number }
      get_pickup_eligibility: {
        Args: { p_lat?: number; p_lng?: number; p_market_id: number }
        Returns: {
          distance_km: number
          eligible: boolean
          hub_address: string
        }[]
      }
      get_public_store_prices: {
        Args: { p_store_ids: number[] }
        Returns: {
          store_id: number
          unit_price: number
        }[]
      }
      get_store_catalog: { Args: { p_store_id: number }; Returns: Json }
      get_store_request_detail: {
        Args: { p_store_id: number }
        Returns: {
          applicant_id: string
          applicant_name: string
          applicant_phone: string
          applicant_username: string
          approval_note: string
          approval_status: string
          created_at: string
          description: string
          district_name: string
          image_url: string
          market_id: number
          market_name: string
          product_name: string
          province_name: string
          store_id: number
          store_name: string
          subdistrict_name: string
          unit: string
          unit_price: number
        }[]
      }
      increment_cart_item: {
        Args: { p_increment?: number; p_store_id: number }
        Returns: number
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_allocation_ready: {
        Args: { p_allocation_id: number }
        Returns: undefined
      }
      mark_my_chat_room_read: {
        Args: { p_room_id: number }
        Returns: undefined
      }
      mark_my_non_chat_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { p_notification_id: number }
        Returns: undefined
      }
      moderate_purchase_review: {
        Args: { p_hide: boolean; p_reason?: string; p_review_id: number }
        Returns: undefined
      }
      record_allocation_at_hub: {
        Args: { p_allocation_id: number }
        Returns: undefined
      }
      record_allocation_collected: {
        Args: { p_allocation_id: number }
        Returns: undefined
      }
      record_demo_settlement: {
        Args: {
          p_evidence_note: string
          p_request_id: string
          p_seller_id: string
        }
        Returns: string
      }
      register_my_push_device: {
        Args: {
          p_device_name?: string | null
          p_expo_push_token: string
          p_platform: string
        }
        Returns: undefined
      }
      remove_cart_item: { Args: { p_store_id: number }; Returns: undefined }
      request_demo_topup: {
        Args: { p_amount: number; p_request_id: string }
        Returns: string
      }
      reserve_listing_ai_request: { Args: { p_user_id: string }; Returns: Json }
      review_market: {
        Args: { p_approve: boolean; p_market_id: number; p_note?: string }
        Returns: undefined
      }
      review_store: {
        Args: { p_approve: boolean; p_note?: string; p_store_id: number }
        Returns: undefined
      }
      review_store_seller: {
        Args: { p_application_id: number; p_approve: boolean; p_note?: string }
        Returns: undefined
      }
      save_my_address: {
        Args: {
          p_address_id: number | null
          p_address_line: string
          p_is_default?: boolean
          p_phone: string
          p_recipient_name: string
          p_subdistrict_code: string
        }
        Returns: number
      }
      save_purchase_review: {
        Args: {
          p_body?: string
          p_order_id: number
          p_order_item_id: number
          p_stars: number
        }
        Returns: number
      }
      set_catalog_link: {
        Args: {
          p_enabled: boolean
          p_kind: string
          p_target_id: number
          p_target_type: string
        }
        Returns: undefined
      }
      set_market_image: {
        Args: { p_image_url: string; p_market_id: number }
        Returns: undefined
      }
      set_store_image: {
        Args: { p_image_url: string; p_store_id: number }
        Returns: undefined
      }
      set_store_suspension: {
        Args: {
          p_expected_updated_at: string
          p_note: string
          p_store_id: number
          p_suspend: boolean
        }
        Returns: boolean
      }
      ship_order: {
        Args: {
          p_courier_name: string
          p_order_id: number
          p_tracking_number: string
        }
        Returns: undefined
      }
      stripe_context: {
        Args: { p_order: number; p_user: string }
        Returns: Json
      }
      stripe_due_payments: { Args: never; Returns: Json }
      sync_stripe_payment: {
        Args: {
          p_amount: number
          p_currency: string
          p_intent?: string
          p_order: number
          p_refund?: string
          p_session: string
          p_state: string
          p_url: string
        }
        Returns: Json
      }
      update_market: {
        Args: {
          p_description: string
          p_hub_address: string
          p_image_url?: string
          p_market_id: number
          p_name: string
        }
        Returns: undefined
      }
      update_my_listing_stock: {
        Args: {
          p_listing_id: number
          p_status?: string
          p_stock_quantity: number
        }
        Returns: undefined
      }
      update_store: {
        Args: {
          p_description: string
          p_image_url?: string
          p_name: string
          p_product_name: string
          p_store_id: number
          p_unit: string
          p_unit_price: number
        }
        Returns: undefined
      }
      upsert_cart_item: {
        Args: { p_quantity: number; p_store_id: number }
        Returns: undefined
      }
    }
    Enums: {
      allocation_status:
        | "pending"
        | "preparing"
        | "ready"
        | "shipping"
        | "completed"
        | "cancelled"
      listing_status: "active" | "paused" | "sold_out"
      market_member_status: "pending" | "approved" | "rejected" | "removed"
      market_status: "pending" | "active" | "closed" | "suspended" | "rejected"
      member_status: "pending" | "approved" | "rejected" | "suspended"
      order_status:
        | "pending_payment"
        | "paid"
        | "preparing"
        | "shipping"
        | "completed"
        | "cancelled"
      payment_status: "pending" | "paid" | "refunded" | "failed"
      transaction_status: "pending" | "completed" | "cancelled"
      transaction_type: "deposit" | "purchase" | "sale" | "refund" | "withdraw"
      user_role: "buyer" | "seller" | "admin"
      wallet_transaction_status:
        | "pending"
        | "completed"
        | "failed"
        | "cancelled"
      wallet_transaction_type:
        | "deposit"
        | "purchase"
        | "sale"
        | "refund"
        | "withdrawal"
        | "adjustment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      allocation_status: [
        "pending",
        "preparing",
        "ready",
        "shipping",
        "completed",
        "cancelled",
      ],
      listing_status: ["active", "paused", "sold_out"],
      market_member_status: ["pending", "approved", "rejected", "removed"],
      market_status: ["pending", "active", "closed", "suspended", "rejected"],
      member_status: ["pending", "approved", "rejected", "suspended"],
      order_status: [
        "pending_payment",
        "paid",
        "preparing",
        "shipping",
        "completed",
        "cancelled",
      ],
      payment_status: ["pending", "paid", "refunded", "failed"],
      transaction_status: ["pending", "completed", "cancelled"],
      transaction_type: ["deposit", "purchase", "sale", "refund", "withdraw"],
      user_role: ["buyer", "seller", "admin"],
      wallet_transaction_status: [
        "pending",
        "completed",
        "failed",
        "cancelled",
      ],
      wallet_transaction_type: [
        "deposit",
        "purchase",
        "sale",
        "refund",
        "withdrawal",
        "adjustment",
      ],
    },
  },
} as const
