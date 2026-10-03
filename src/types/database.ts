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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
          fulfillment_method: string
          market_id: number
          order_id: number
          order_number: string
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
          fulfillment_method?: string
          market_id: number
          order_id?: never
          order_number?: string
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
          fulfillment_method?: string
          market_id?: number
          order_id?: never
          order_number?: string
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
      cancel_order: {
        Args: {
          p_admin_override?: boolean
          p_order_id: number
          p_reason?: string
        }
        Returns: undefined
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
      delete_cancelled_order: {
        Args: { p_order_id: number; p_reason: string }
        Returns: undefined
      }
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
      get_my_chat_inbox: {
        Args: never
        Returns: {
          room_id: number
          store_name: string
          product_name: string | null
          market_name: string
          partner_name: string
          partner_role: string
          last_message: string | null
          last_message_at: string | null
          last_sender_id: string | null
          sort_at: string
          unread_count: number
        }[]
      }
      get_public_store_prices: {
        Args: { p_store_ids: number[] }
        Returns: { store_id: number; unit_price: number }[]
      }
      get_market_catalog: { Args: { p_market_id: number }; Returns: Json }
      get_or_create_chat_room: { Args: { p_store_id: number }; Returns: number }
      get_pickup_eligibility: {
        Args: { p_lat?: number; p_lng?: number; p_market_id: number }
        Returns: {
          distance_km: number
          eligible: boolean
          hub_address: string
        }[]
      }
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
      get_store_catalog: { Args: { p_store_id: number }; Returns: Json }
      increment_cart_item: {
        Args: { p_increment?: number; p_store_id: number }
        Returns: number
      }
      mark_allocation_ready: {
        Args: { p_allocation_id: number }
        Returns: undefined
      }
      mark_notification_read: {
        Args: { p_notification_id: number }
        Returns: undefined
      }
      mark_my_chat_room_read: { Args: { p_room_id: number }; Returns: undefined }
      mark_my_non_chat_notifications_read: { Args: never; Returns: undefined }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      disable_my_push_devices: { Args: never; Returns: undefined }
      disable_my_push_device: {
        Args: { p_expo_push_token: string }
        Returns: undefined
      }
      register_my_push_device: {
        Args: {
          p_device_name?: string | null
          p_expo_push_token: string
          p_platform: string
        }
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
      remove_cart_item: { Args: { p_store_id: number }; Returns: undefined }
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
      set_market_image: {
        Args: { p_image_url: string; p_market_id: number }
        Returns: undefined
      }
      set_store_image: {
        Args: { p_image_url: string; p_store_id: number }
        Returns: undefined
      }
      ship_order: {
        Args: {
          p_courier_name: string
          p_order_id: number
          p_tracking_number: string
        }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
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
