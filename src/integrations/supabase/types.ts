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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_configurations: {
        Row: {
          api_name: string
          api_secret: string | null
          api_uid: string | null
          created_at: string
          id: string
          is_enabled: boolean | null
          updated_at: string
          use_sandbox: boolean | null
        }
        Insert: {
          api_name: string
          api_secret?: string | null
          api_uid?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
          use_sandbox?: boolean | null
        }
        Update: {
          api_name?: string
          api_secret?: string | null
          api_uid?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string
          use_sandbox?: boolean | null
        }
        Relationships: []
      }
      g2bulk_products: {
        Row: {
          created_at: string
          currency: string | null
          denomination: string | null
          fields: Json | null
          g2bulk_product_id: string
          g2bulk_type_id: string
          game_name: string
          id: string
          is_active: boolean | null
          price: number
          product_name: string
          product_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          denomination?: string | null
          fields?: Json | null
          g2bulk_product_id: string
          g2bulk_type_id: string
          game_name: string
          id?: string
          is_active?: boolean | null
          price: number
          product_name: string
          product_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          denomination?: string | null
          fields?: Json | null
          g2bulk_product_id?: string
          g2bulk_type_id?: string
          game_name?: string
          id?: string
          is_active?: boolean | null
          price?: number
          product_name?: string
          product_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      game_verification_configs: {
        Row: {
          api_code: string
          api_provider: string
          created_at: string
          default_zone: string | null
          game_name: string
          id: string
          is_active: boolean
          requires_zone: boolean
          updated_at: string
        }
        Insert: {
          api_code: string
          api_provider?: string
          created_at?: string
          default_zone?: string | null
          game_name: string
          id?: string
          is_active?: boolean
          requires_zone?: boolean
          updated_at?: string
        }
        Update: {
          api_code?: string
          api_provider?: string
          created_at?: string
          default_zone?: string | null
          game_name?: string
          id?: string
          is_active?: boolean
          requires_zone?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          created_at: string
          description: string | null
          g2bulk_category_id: string | null
          id: string
          image: string | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          g2bulk_category_id?: string | null
          id?: string
          image?: string | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          g2bulk_category_id?: string | null
          id?: string
          image?: string | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          amount: string
          created_at: string
          g2bulk_product_id: string | null
          g2bulk_type_id: string | null
          game_id: string
          icon: string | null
          id: string
          label: string | null
          label_bg_color: string | null
          label_icon: string | null
          label_text_color: string | null
          name: string
          price: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          amount: string
          created_at?: string
          g2bulk_product_id?: string | null
          g2bulk_type_id?: string | null
          game_id: string
          icon?: string | null
          id?: string
          label?: string | null
          label_bg_color?: string | null
          label_icon?: string | null
          label_text_color?: string | null
          name: string
          price: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          amount?: string
          created_at?: string
          g2bulk_product_id?: string | null
          g2bulk_type_id?: string | null
          game_id?: string
          icon?: string | null
          id?: string
          label?: string | null
          label_bg_color?: string | null
          label_icon?: string | null
          label_text_color?: string | null
          name?: string
          price?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          config: Json | null
          created_at: string
          enabled: boolean | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_qr_settings: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string
          id: string
          instructions: string | null
          is_enabled: boolean | null
          payment_method: string
          qr_code_image: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_enabled?: boolean | null
          payment_method: string
          qr_code_image?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_enabled?: boolean | null
          payment_method?: string
          qr_code_image?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
          wallet_balance: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
          wallet_balance?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          wallet_balance?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      special_packages: {
        Row: {
          amount: string
          created_at: string
          g2bulk_product_id: string | null
          g2bulk_type_id: string | null
          game_id: string
          icon: string | null
          id: string
          label: string | null
          label_bg_color: string | null
          label_icon: string | null
          label_text_color: string | null
          name: string
          price: number
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          amount: string
          created_at?: string
          g2bulk_product_id?: string | null
          g2bulk_type_id?: string | null
          game_id: string
          icon?: string | null
          id?: string
          label?: string | null
          label_bg_color?: string | null
          label_icon?: string | null
          label_text_color?: string | null
          name: string
          price: number
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          amount?: string
          created_at?: string
          g2bulk_product_id?: string | null
          g2bulk_type_id?: string | null
          game_id?: string
          icon?: string | null
          id?: string
          label?: string | null
          label_bg_color?: string | null
          label_icon?: string | null
          label_text_color?: string | null
          name?: string
          price?: number
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_packages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      topup_orders: {
        Row: {
          amount: number
          card_codes: Json | null
          created_at: string
          currency: string | null
          g2bulk_order_id: string | null
          g2bulk_product_id: string | null
          game_name: string
          id: string
          package_name: string
          payment_method: string | null
          player_id: string
          player_name: string | null
          server_id: string | null
          status: string | null
          status_message: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          card_codes?: Json | null
          created_at?: string
          currency?: string | null
          g2bulk_order_id?: string | null
          g2bulk_product_id?: string | null
          game_name: string
          id?: string
          package_name: string
          payment_method?: string | null
          player_id: string
          player_name?: string | null
          server_id?: string | null
          status?: string | null
          status_message?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          card_codes?: Json | null
          created_at?: string
          currency?: string | null
          g2bulk_order_id?: string | null
          g2bulk_product_id?: string | null
          game_name?: string
          id?: string
          package_name?: string
          payment_method?: string | null
          player_id?: string
          player_name?: string | null
          server_id?: string | null
          status?: string | null
          status_message?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      payment_gateways_public: {
        Row: {
          config: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string | null
          name: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          config?: never
          created_at?: string | null
          enabled?: boolean | null
          id?: string | null
          name?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: never
          created_at?: string | null
          enabled?: boolean | null
          id?: string | null
          name?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_wallet_transaction: {
        Args: {
          _amount: number
          _description?: string
          _reference_id?: string
          _type: string
          _user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
