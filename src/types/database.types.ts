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
      attribute_definitions: {
        Row: {
          code: string
          data_type: string
          id: string
          is_filterable: boolean
          name_en: string
          name_fa: string
          sort_order: number
          unit: string | null
        }
        Insert: {
          code: string
          data_type?: string
          id?: string
          is_filterable?: boolean
          name_en: string
          name_fa: string
          sort_order?: number
          unit?: string | null
        }
        Update: {
          code?: string
          data_type?: string
          id?: string
          is_filterable?: boolean
          name_en?: string
          name_fa?: string
          sort_order?: number
          unit?: string | null
        }
        Relationships: []
      }
      auth_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          title_fa: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          title_fa: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          title_fa?: string
        }
        Relationships: []
      }
      auth_user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "auth_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          is_featured: boolean
          logo_url: string | null
          name_en: string
          name_fa: string
          slug: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_featured?: boolean
          logo_url?: string | null
          name_en: string
          name_fa: string
          slug: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_featured?: boolean
          logo_url?: string | null
          name_en?: string
          name_fa?: string
          slug?: string
          website_url?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description_fa: string | null
          icon_name: string
          id: string
          is_active: boolean
          parent_id: string | null
          slug: string
          sort_order: number
          title_en: string
          title_fa: string
        }
        Insert: {
          created_at?: string
          description_fa?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          parent_id?: string | null
          slug: string
          sort_order?: number
          title_en: string
          title_fa: string
        }
        Update: {
          created_at?: string
          description_fa?: string | null
          icon_name?: string
          id?: string
          is_active?: boolean
          parent_id?: string | null
          slug?: string
          sort_order?: number
          title_en?: string
          title_fa?: string
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
      category_attributes: {
        Row: {
          attribute_id: string
          category_id: string
          is_required: boolean
        }
        Insert: {
          attribute_id: string
          category_id: string
          is_required?: boolean
        }
        Update: {
          attribute_id?: string
          category_id?: string
          is_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "category_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attribute_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          id: string
          product_id: string
          value_boolean: boolean | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          attribute_id: string
          id?: string
          product_id: string
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          attribute_id?: string
          id?: string
          product_id?: string
          value_boolean?: boolean | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attribute_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text_fa: string | null
          created_at: string
          id: string
          image_url: string
          is_cover: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          alt_text_fa?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_cover?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          alt_text_fa?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_cover?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          color_hex: string
          color_name_en: string
          color_name_fa: string
          cost_price_toman: number
          created_at: string
          id: string
          is_published: boolean
          original_price_toman: number | null
          part_number: string | null
          price_toman: number
          product_id: string
          ram: string | null
          sim_type: string
          sku: string
          storage: string
          updated_at: string
          warranty_id: string
        }
        Insert: {
          barcode?: string | null
          color_hex: string
          color_name_en: string
          color_name_fa: string
          cost_price_toman?: number
          created_at?: string
          id?: string
          is_published?: boolean
          original_price_toman?: number | null
          part_number?: string | null
          price_toman: number
          product_id: string
          ram?: string | null
          sim_type?: string
          sku: string
          storage: string
          updated_at?: string
          warranty_id: string
        }
        Update: {
          barcode?: string | null
          color_hex?: string
          color_name_en?: string
          color_name_fa?: string
          cost_price_toman?: number
          created_at?: string
          id?: string
          is_published?: boolean
          original_price_toman?: number | null
          part_number?: string | null
          price_toman?: number
          product_id?: string
          ram?: string | null
          sim_type?: string
          sku?: string
          storage?: string
          updated_at?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge: string | null
          brand_id: string
          category_id: string
          created_at: string
          description_fa: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          model_name: string
          rating_average: number
          reviews_count: number
          slug: string
          specs_summary: Json
          title_en: string
          title_fa: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          brand_id: string
          category_id: string
          created_at?: string
          description_fa?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          model_name: string
          rating_average?: number
          reviews_count?: number
          slug: string
          specs_summary?: Json
          title_en: string
          title_fa: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          brand_id?: string
          category_id?: string
          created_at?: string
          description_fa?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          model_name?: string
          rating_average?: number
          reviews_count?: number
          slug?: string
          specs_summary?: Json
          title_en?: string
          title_fa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
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
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          balance_after: number
          created_at: string
          id: string
          idempotency_key: string | null
          movement_type: string
          notes: string | null
          operator_id: string | null
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
          shelf_location: string | null
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          movement_type: string
          notes?: string | null
          operator_id?: string | null
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
          shelf_location?: string | null
          variant_id: string
          warehouse_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          movement_type?: string
          notes?: string | null
          operator_id?: string | null
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
          shelf_location?: string | null
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_stock: {
        Row: {
          id: string
          min_stock_alert: number
          quantity_on_hand: number
          reserved_qty: number
          shelf_location: string
          updated_at: string
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          min_stock_alert?: number
          quantity_on_hand?: number
          reserved_qty?: number
          shelf_location?: string
          updated_at?: string
          variant_id: string
          warehouse_id: string
        }
        Update: {
          id?: string
          min_stock_alert?: number
          quantity_on_hand?: number
          reserved_qty?: number
          shelf_location?: string
          updated_at?: string
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_central: boolean
          manager_name: string | null
          name_fa: string
          phone: string | null
          postal_code: string | null
        }
        Insert: {
          address: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_central?: boolean
          manager_name?: string | null
          name_fa: string
          phone?: string | null
          postal_code?: string | null
        }
        Update: {
          address?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_central?: boolean
          manager_name?: string | null
          name_fa?: string
          phone?: string | null
          postal_code?: string | null
        }
        Relationships: []
      }
      warranties: {
        Row: {
          coverage_fa: string
          duration_months: number
          id: string
          is_active: boolean
          provider_name: string
          terms_url: string | null
        }
        Insert: {
          coverage_fa: string
          duration_months?: number
          id?: string
          is_active?: boolean
          provider_name: string
          terms_url?: string | null
        }
        Update: {
          coverage_fa?: string
          duration_months?: number
          id?: string
          is_active?: boolean
          provider_name?: string
          terms_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_storefront_products: {
        Row: {
          badge: string | null
          barcode: string | null
          brand: string | null
          category: string | null
          categoryFa: string | null
          colors: Json | null
          descriptionFa: string | null
          discountPercent: number | null
          discountPrice: number | null
          englishTitle: string | null
          galleryImages: string[] | null
          id: string | null
          image: string | null
          imageUrl: string | null
          inStock: boolean | null
          isBestseller: boolean | null
          isExpressDelivery: boolean | null
          isNew: boolean | null
          isPublished: boolean | null
          isSpecialOffer: boolean | null
          name: string | null
          originalPrice: number | null
          partNumber: string | null
          price: number | null
          ramOptions: string[] | null
          rating: number | null
          reviewsCount: number | null
          selectedColor: string | null
          selectedStorage: string | null
          shelfLocation: string | null
          sku: string | null
          slug: string | null
          specs: Json | null
          stock: number | null
          stockCount: number | null
          storageOptions: string[] | null
          titleEn: string | null
          titleFa: string | null
          warranty: string | null
          warrantyFa: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      rpc_record_stock_movement: {
        Args: {
          p_idempotency_key?: string
          p_movement_type: string
          p_notes?: string
          p_quantity_change: number
          p_reference_id?: string
          p_reference_type?: string
          p_shelf_location?: string
          p_variant_id: string
          p_warehouse_id: string
        }
        Returns: Json
      }
      rpc_transfer_warehouse_stock: {
        Args: {
          p_destination_warehouse_id: string
          p_idempotency_key?: string
          p_notes?: string
          p_quantity: number
          p_shelf_location_dest?: string
          p_source_warehouse_id: string
          p_variant_id: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_has_permission: { Args: { required_perm: string }; Returns: boolean }
      user_has_role: { Args: { required_role: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
