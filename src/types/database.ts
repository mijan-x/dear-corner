// Generated from the Dear-Corner-SG database (Supabase type generator).
// Do not edit by hand: regenerate after every migration.

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line: string
          area: string
          created_at: string
          district: string
          division: string
          full_name: string
          id: string
          is_default: boolean
          label: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line: string
          area: string
          created_at?: string
          district: string
          division: string
          full_name: string
          id?: string
          is_default?: boolean
          label?: string
          phone: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          address_line?: string
          area?: string
          created_at?: string
          district?: string
          division?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_activity: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          summary: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: never
          summary?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: never
          summary?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          quantity: number
          updated_at: string
          user_id: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          quantity: number
          updated_at?: string
          user_id?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          banner_desktop_path: string | null
          banner_mobile_path: string | null
          card_image_path: string | null
          created_at: string
          description: string
          id: string
          intro: string
          is_active: boolean
          is_sample: boolean
          name: string
          parent_id: string | null
          position: number
          seo_description: string | null
          seo_title: string | null
          show_in_nav: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          banner_desktop_path?: string | null
          banner_mobile_path?: string | null
          card_image_path?: string | null
          created_at?: string
          description?: string
          id?: string
          intro?: string
          is_active?: boolean
          is_sample?: boolean
          name: string
          parent_id?: string | null
          position?: number
          seo_description?: string | null
          seo_title?: string | null
          show_in_nav?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          banner_desktop_path?: string | null
          banner_mobile_path?: string | null
          card_image_path?: string | null
          created_at?: string
          description?: string
          id?: string
          intro?: string
          is_active?: boolean
          is_sample?: boolean
          name?: string
          parent_id?: string | null
          position?: number
          seo_description?: string | null
          seo_title?: string | null
          show_in_nav?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          banner_desktop_path: string | null
          banner_mobile_path: string | null
          card_image_path: string | null
          created_at: string
          description: string
          id: string
          intro: string
          is_active: boolean
          name: string
          position: number
          rule: Database["public"]["Enums"]["collection_rule"]
          rule_value: number | null
          seo_description: string | null
          seo_title: string | null
          show_in_nav: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          banner_desktop_path?: string | null
          banner_mobile_path?: string | null
          card_image_path?: string | null
          created_at?: string
          description?: string
          id?: string
          intro?: string
          is_active?: boolean
          name: string
          position?: number
          rule?: Database["public"]["Enums"]["collection_rule"]
          rule_value?: number | null
          seo_description?: string | null
          seo_title?: string | null
          show_in_nav?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          banner_desktop_path?: string | null
          banner_mobile_path?: string | null
          card_image_path?: string | null
          created_at?: string
          description?: string
          id?: string
          intro?: string
          is_active?: boolean
          name?: string
          position?: number
          rule?: Database["public"]["Enums"]["collection_rule"]
          rule_value?: number | null
          seo_description?: string | null
          seo_title?: string | null
          show_in_nav?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          admin_note: string
          created_at: string
          email: string | null
          handled_at: string | null
          id: string
          message: string
          name: string
          order_number: string | null
          phone: string
          status: Database["public"]["Enums"]["message_status"]
          user_id: string | null
        }
        Insert: {
          admin_note?: string
          created_at?: string
          email?: string | null
          handled_at?: string | null
          id?: string
          message: string
          name: string
          order_number?: string | null
          phone: string
          status?: Database["public"]["Enums"]["message_status"]
          user_id?: string | null
        }
        Update: {
          admin_note?: string
          created_at?: string
          email?: string | null
          handled_at?: string | null
          id?: string
          message?: string
          name?: string
          order_number?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["message_status"]
          user_id?: string | null
        }
        Relationships: []
      }
      coupon_categories: {
        Row: {
          category_id: string
          coupon_id: string
        }
        Insert: {
          category_id: string
          coupon_id: string
        }
        Update: {
          category_id?: string
          coupon_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_categories_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount: number
          id: string
          order_id: string
          phone: string
          released_at: string | null
          user_id: string | null
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount: number
          id?: string
          order_id: string
          phone: string
          released_at?: string | null
          user_id?: string | null
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount?: number
          id?: string
          order_id?: string
          phone?: string
          released_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_subtotal: number
          per_customer_limit: number | null
          starts_at: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          usage_limit: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_subtotal?: number
          per_customer_limit?: number | null
          starts_at?: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_subtotal?: number
          per_customer_limit?: number | null
          starts_at?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      geo_areas: {
        Row: {
          area: string
          district: string
          division: string
          id: number
          is_dhaka_city: boolean
        }
        Insert: {
          area: string
          district: string
          division: string
          id?: never
          is_dhaka_city?: boolean
        }
        Update: {
          area?: string
          district?: string
          division?: string
          id?: never
          is_dhaka_city?: boolean
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          actor_id: string | null
          created_at: string
          delta: number
          id: number
          note: string | null
          order_id: string | null
          product_id: string | null
          reason: Database["public"]["Enums"]["stock_reason"]
          sku: string
          stock_after: number
          variant_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delta: number
          id?: never
          note?: string | null
          order_id?: string | null
          product_id?: string | null
          reason: Database["public"]["Enums"]["stock_reason"]
          sku: string
          stock_after: number
          variant_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delta?: number
          id?: never
          note?: string | null
          order_id?: string | null
          product_id?: string | null
          reason?: Database["public"]["Enums"]["stock_reason"]
          sku?: string
          stock_after?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          category_id: string | null
          compare_at_price: number | null
          id: string
          image_path: string | null
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          product_slug: string
          quantity: number
          sku: string
          unit_price: number
          variant_id: string | null
          variant_title: string
        }
        Insert: {
          category_id?: string | null
          compare_at_price?: number | null
          id?: string
          image_path?: string | null
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          product_slug: string
          quantity: number
          sku: string
          unit_price: number
          variant_id?: string | null
          variant_title?: string
        }
        Update: {
          category_id?: string | null
          compare_at_price?: number | null
          id?: string
          image_path?: string | null
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_slug?: string
          quantity?: number
          sku?: string
          unit_price?: number
          variant_id?: string | null
          variant_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          order_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          order_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          id: number
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: never
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: never
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_line: string
          area: string
          coupon_code: string | null
          coupon_id: string | null
          courier_name: string | null
          created_at: string
          customer_name: string
          delivery_fee: number
          delivery_max_days: number
          delivery_min_days: number
          delivery_note: string
          discount: number
          district: string
          division: string
          email: string | null
          id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          shipping_zone_id: string | null
          shipping_zone_name: string
          status: Database["public"]["Enums"]["order_status"]
          stock_restored_at: string | null
          subtotal: number
          total: number
          tracking_code: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_line: string
          area: string
          coupon_code?: string | null
          coupon_id?: string | null
          courier_name?: string | null
          created_at?: string
          customer_name: string
          delivery_fee: number
          delivery_max_days: number
          delivery_min_days: number
          delivery_note?: string
          discount?: number
          district: string
          division: string
          email?: string | null
          id?: string
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone: string
          shipping_zone_id?: string | null
          shipping_zone_name: string
          status?: Database["public"]["Enums"]["order_status"]
          stock_restored_at?: string | null
          subtotal: number
          total: number
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_line?: string
          area?: string
          coupon_code?: string | null
          coupon_id?: string | null
          courier_name?: string | null
          created_at?: string
          customer_name?: string
          delivery_fee?: number
          delivery_max_days?: number
          delivery_min_days?: number
          delivery_note?: string
          discount?: number
          district?: string
          division?: string
          email?: string | null
          id?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string
          shipping_zone_id?: string | null
          shipping_zone_name?: string
          status?: Database["public"]["Enums"]["order_status"]
          stock_restored_at?: string | null
          subtotal?: number
          total?: number
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_zone_id_fkey"
            columns: ["shipping_zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      product_collections: {
        Row: {
          collection_id: string
          position: number
          product_id: string
        }
        Insert: {
          collection_id: string
          position?: number
          product_id: string
        }
        Update: {
          collection_id?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          height: number | null
          id: string
          option_value_id: string | null
          path: string
          position: number
          product_id: string
          thumb_path: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string
          created_at?: string
          height?: number | null
          id?: string
          option_value_id?: string | null
          path: string
          position?: number
          product_id: string
          thumb_path?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string
          created_at?: string
          height?: number | null
          id?: string
          option_value_id?: string | null
          path?: string
          position?: number
          product_id?: string
          thumb_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_option_value_id_fkey"
            columns: ["option_value_id"]
            isOneToOne: false
            referencedRelation: "product_option_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_values: {
        Row: {
          created_at: string
          id: string
          option_id: string
          position: number
          product_id: string
          swatch_hex: string | null
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          position?: number
          product_id: string
          swatch_hex?: string | null
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          position?: number
          product_id?: string
          swatch_hex?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_values_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_option_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string
          id: string
          is_color: boolean
          name: string
          position: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_color?: boolean
          name: string
          position: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_color?: boolean
          name?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          created_at: string
          id: string
          image_id: string | null
          is_active: boolean
          low_stock_threshold: number
          option1: string | null
          option2: string | null
          option3: string | null
          position: number
          price: number
          product_id: string
          sku: string
          stock: number
          title: string
          updated_at: string
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string
          id?: string
          image_id?: string | null
          is_active?: boolean
          low_stock_threshold?: number
          option1?: string | null
          option2?: string | null
          option3?: string | null
          position?: number
          price: number
          product_id: string
          sku: string
          stock?: number
          title?: string
          updated_at?: string
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string
          id?: string
          image_id?: string | null
          is_active?: boolean
          low_stock_threshold?: number
          option1?: string | null
          option2?: string | null
          option3?: string | null
          position?: number
          price?: number
          product_id?: string
          sku?: string
          stock?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "product_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_option1_fkey"
            columns: ["option1"]
            isOneToOne: false
            referencedRelation: "product_option_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_option2_fkey"
            columns: ["option2"]
            isOneToOne: false
            referencedRelation: "product_option_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_option3_fkey"
            columns: ["option3"]
            isOneToOne: false
            referencedRelation: "product_option_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          card_images: Json
          category_id: string
          colors: string[]
          compare_at_price: number | null
          created_at: string
          default_variant_id: string | null
          description: string
          details_and_care: string
          discount_percent: number
          featured_rank: number | null
          id: string
          is_bestseller: boolean
          is_featured: boolean
          is_gift: boolean
          is_sample: boolean
          max_discount_percent: number
          name: string
          new_until: string | null
          on_sale: boolean
          price_max: number | null
          price_min: number | null
          published_at: string | null
          rating_avg: number | null
          rating_count: number
          search_vector: unknown
          seo_description: string | null
          seo_title: string | null
          short_description: string
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          swatches: Json
          updated_at: string
          variant_count: number
        }
        Insert: {
          card_images?: Json
          category_id: string
          colors?: string[]
          compare_at_price?: number | null
          created_at?: string
          default_variant_id?: string | null
          description?: string
          details_and_care?: string
          discount_percent?: number
          featured_rank?: number | null
          id?: string
          is_bestseller?: boolean
          is_featured?: boolean
          is_gift?: boolean
          is_sample?: boolean
          max_discount_percent?: number
          name: string
          new_until?: string | null
          on_sale?: boolean
          price_max?: number | null
          price_min?: number | null
          published_at?: string | null
          rating_avg?: number | null
          rating_count?: number
          search_vector?: unknown
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          swatches?: Json
          updated_at?: string
          variant_count?: number
        }
        Update: {
          card_images?: Json
          category_id?: string
          colors?: string[]
          compare_at_price?: number | null
          created_at?: string
          default_variant_id?: string | null
          description?: string
          details_and_care?: string
          discount_percent?: number
          featured_rank?: number | null
          id?: string
          is_bestseller?: boolean
          is_featured?: boolean
          is_gift?: boolean
          is_sample?: boolean
          max_discount_percent?: number
          name?: string
          new_until?: string | null
          on_sale?: boolean
          price_max?: number | null
          price_min?: number | null
          published_at?: string | null
          rating_avg?: number | null
          rating_count?: number
          search_vector?: unknown
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          swatches?: Json
          updated_at?: string
          variant_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      review_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          review_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string
          review_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_note: string
          body: string
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          order_id: string
          order_item_id: string
          product_id: string
          rating: number
          reviewer_name: string
          status: Database["public"]["Enums"]["review_status"]
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string
          body: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          order_id: string
          order_item_id: string
          product_id: string
          rating: number
          reviewer_name: string
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string
          body?: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          order_id?: string
          order_item_id?: string
          product_id?: string
          rating?: number
          reviewer_name?: string
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zone_areas: {
        Row: {
          area: string | null
          created_at: string
          district: string
          id: string
          zone_id: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          district: string
          id?: string
          zone_id: string
        }
        Update: {
          area?: string | null
          created_at?: string
          district?: string
          id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_zone_areas_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          created_at: string
          fee: number
          id: string
          is_active: boolean
          is_default: boolean
          max_days: number
          min_days: number
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_days: number
          min_days: number
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_days?: number
          min_days?: number
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          announcement_enabled: boolean
          announcement_link: string | null
          announcement_text: string
          contact_address: string
          contact_email: string
          contact_phone: string
          contact_whatsapp: string
          facebook_url: string
          free_delivery_threshold: number | null
          homepage: Json
          id: number
          instagram_handle: string
          instagram_url: string
          max_items_per_order: number
          max_open_orders_per_phone: number
          max_quantity_per_item: number
          opening_hours: string
          reply_time: string
          tiktok_url: string
          updated_at: string
        }
        Insert: {
          announcement_enabled?: boolean
          announcement_link?: string | null
          announcement_text?: string
          contact_address?: string
          contact_email?: string
          contact_phone?: string
          contact_whatsapp?: string
          facebook_url?: string
          free_delivery_threshold?: number | null
          homepage?: Json
          id?: number
          instagram_handle?: string
          instagram_url?: string
          max_items_per_order?: number
          max_open_orders_per_phone?: number
          max_quantity_per_item?: number
          opening_hours?: string
          reply_time?: string
          tiktok_url?: string
          updated_at?: string
        }
        Update: {
          announcement_enabled?: boolean
          announcement_link?: string | null
          announcement_text?: string
          contact_address?: string
          contact_email?: string
          contact_phone?: string
          contact_whatsapp?: string
          facebook_url?: string
          free_delivery_threshold?: number | null
          homepage?: Json
          id?: number
          instagram_handle?: string
          instagram_url?: string
          max_items_per_order?: number
          max_open_orders_per_phone?: number
          max_quantity_per_item?: number
          opening_hours?: string
          reply_time?: string
          tiktok_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cart_add: {
        Args: { p_quantity?: number; p_variant_id: string }
        Returns: number
      }
      cart_count: { Args: never; Returns: number }
      cart_merge: { Args: { p_items: Json }; Returns: number }
      cart_set_quantity: {
        Args: { p_quantity: number; p_variant_id: string }
        Returns: number
      }
      catalog_facets: {
        Args: { p_category?: string; p_collection?: string; p_search?: string }
        Returns: Json
      }
      catalog_products: {
        Args: {
          p_category?: string
          p_collection?: string
          p_colors?: string[]
          p_exclude?: string
          p_flag?: string
          p_in_stock?: boolean
          p_limit?: number
          p_max_price?: number
          p_min_price?: number
          p_offset?: number
          p_on_sale?: boolean
          p_search?: string
          p_sort?: string
        }
        Returns: Database["public"]["CompositeTypes"]["product_card"][]
        SetofOptions: {
          from: "*"
          to: "product_card"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_listing: { Args: { p_kind: string; p_slug: string }; Returns: Json }
      get_product: { Args: { p_slug: string }; Returns: Json }
      home_feed: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      my_access: { Args: never; Returns: Json }
      my_order: { Args: { p_order_number: string }; Returns: Json }
      normalize_bd_phone: { Args: { raw: string }; Returns: string }
      order_next_statuses: {
        Args: { p_status: Database["public"]["Enums"]["order_status"] }
        Returns: Database["public"]["Enums"]["order_status"][]
      }
      order_status_label: {
        Args: { p_status: Database["public"]["Enums"]["order_status"] }
        Returns: string
      }
      place_order: {
        Args: {
          p_coupon_code?: string
          p_customer: Json
          p_expected_total?: number
          p_items: Json
        }
        Returns: Json
      }
      quote_cart: {
        Args: {
          p_area?: string
          p_coupon_code?: string
          p_district?: string
          p_items: Json
          p_phone?: string
        }
        Returns: Json
      }
      quote_my_cart: {
        Args: {
          p_area?: string
          p_coupon_code?: string
          p_district?: string
          p_phone?: string
        }
        Returns: Json
      }
      related_products: {
        Args: { p_limit?: number; p_product_id: string }
        Returns: Database["public"]["CompositeTypes"]["product_card"][]
        SetofOptions: {
          from: "*"
          to: "product_card"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      report_review: {
        Args: { p_reason?: string; p_review_id: string }
        Returns: undefined
      }
      search_suggestions: { Args: { p_query: string }; Returns: Json }
      shipping_zone_for: {
        Args: { p_area: string; p_district: string }
        Returns: {
          created_at: string
          fee: number
          id: string
          is_active: boolean
          is_default: boolean
          max_days: number
          min_days: number
          name: string
          position: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "shipping_zones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      storefront_nav: { Args: never; Returns: Json }
      submit_contact_message: {
        Args: {
          p_email?: string
          p_message: string
          p_name: string
          p_order_number?: string
          p_phone: string
        }
        Returns: string
      }
      submit_review: {
        Args: {
          p_body: string
          p_display_name?: string
          p_order_item_id: string
          p_order_number?: string
          p_phone?: string
          p_rating: number
          p_title?: string
        }
        Returns: string
      }
      subscribe_newsletter: {
        Args: { p_email: string; p_source?: string }
        Returns: undefined
      }
      track_order: {
        Args: { p_order_number: string; p_phone: string }
        Returns: Json
      }
    }
    Enums: {
      collection_rule:
        | "manual"
        | "new_arrivals"
        | "max_price"
        | "on_sale"
        | "bestsellers"
        | "gifts"
      coupon_type: "percent" | "fixed"
      message_status: "new" | "read" | "done"
      order_status:
        | "placed"
        | "confirmed"
        | "packed"
        | "handed_to_courier"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "returned"
      payment_method: "cash_on_delivery"
      payment_status: "unpaid" | "paid" | "refunded"
      product_status: "draft" | "active" | "archived"
      review_status: "pending" | "approved" | "rejected"
      stock_reason:
        | "initial"
        | "manual"
        | "order"
        | "cancelled"
        | "returned"
        | "correction"
      user_role: "admin" | "customer"
    }
    CompositeTypes: {
      product_card: {
        id: string | null
        slug: string | null
        name: string | null
        category_id: string | null
        price_min: number | null
        price_max: number | null
        compare_at_price: number | null
        discount_percent: number | null
        card_images: Json | null
        swatches: Json | null
        variant_count: number | null
        default_variant_id: string | null
        is_new: boolean | null
        is_bestseller: boolean | null
        is_gift: boolean | null
        on_sale: boolean | null
        stock_total: number | null
        low_stock: boolean | null
        sold_out: boolean | null
        rating_avg: number | null
        rating_count: number | null
        total_count: number | null
      }
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
      collection_rule: [
        "manual",
        "new_arrivals",
        "max_price",
        "on_sale",
        "bestsellers",
        "gifts",
      ],
      coupon_type: ["percent", "fixed"],
      message_status: ["new", "read", "done"],
      order_status: [
        "placed",
        "confirmed",
        "packed",
        "handed_to_courier",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
      ],
      payment_method: ["cash_on_delivery"],
      payment_status: ["unpaid", "paid", "refunded"],
      product_status: ["draft", "active", "archived"],
      review_status: ["pending", "approved", "rejected"],
      stock_reason: [
        "initial",
        "manual",
        "order",
        "cancelled",
        "returned",
        "correction",
      ],
      user_role: ["admin", "customer"],
    },
  },
} as const
