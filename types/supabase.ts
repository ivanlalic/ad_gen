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
  public: {
    Tables: {
      batches: {
        Row: {
          adapt_formats: boolean
          completed_at: string | null
          created_at: string
          generate_images: boolean
          id: string
          key_offers: string | null
          nb2_aspect_ratios: string[]
          nb2_model: string
          nb2_negative_prompt: string | null
          nb2_seed: number | null
          nb2_style_preset: string | null
          pinned_concept_text: string | null
          product_id: string
          selected_templates: number[] | null
          status: string
          total_concepts: number
        }
        Insert: {
          adapt_formats?: boolean
          completed_at?: string | null
          created_at?: string
          generate_images?: boolean
          id?: string
          key_offers?: string | null
          nb2_aspect_ratios?: string[]
          nb2_model?: string
          nb2_negative_prompt?: string | null
          nb2_seed?: number | null
          nb2_style_preset?: string | null
          pinned_concept_text?: string | null
          product_id: string
          selected_templates?: number[] | null
          status?: string
          total_concepts?: number
        }
        Update: {
          adapt_formats?: boolean
          completed_at?: string | null
          created_at?: string
          generate_images?: boolean
          id?: string
          key_offers?: string | null
          nb2_aspect_ratios?: string[]
          nb2_model?: string
          nb2_negative_prompt?: string | null
          nb2_seed?: number | null
          nb2_style_preset?: string | null
          pinned_concept_text?: string | null
          product_id?: string
          selected_templates?: number[] | null
          status?: string
          total_concepts?: number
        }
        Relationships: [
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      concepts: {
        Row: {
          batch_id: string
          body_copy: string | null
          created_at: string
          headline: string | null
          id: string
          image_status: string | null
          image_url: string | null
          image_url_9_16: string | null
          is_pinned: boolean
          nb2_prompt: string | null
          source_grounding: string
          template_name: string | null
          template_number: number | null
          variation: number | null
          visual_description: string | null
        }
        Insert: {
          batch_id: string
          body_copy?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          image_status?: string | null
          image_url?: string | null
          image_url_9_16?: string | null
          is_pinned?: boolean
          nb2_prompt?: string | null
          source_grounding: string
          template_name?: string | null
          template_number?: number | null
          variation?: number | null
          visual_description?: string | null
        }
        Update: {
          batch_id?: string
          body_copy?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          image_status?: string | null
          image_url?: string | null
          image_url_9_16?: string | null
          is_pinned?: boolean
          nb2_prompt?: string | null
          source_grounding?: string
          template_name?: string | null
          template_number?: number | null
          variation?: number | null
          visual_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concepts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      product_inputs: {
        Row: {
          content_text: string | null
          created_at: string
          file_url: string | null
          id: string
          is_simulated: boolean
          product_id: string
          source: string | null
          type: string
        }
        Insert: {
          content_text?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          is_simulated?: boolean
          product_id: string
          source?: string | null
          type: string
        }
        Update: {
          content_text?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          is_simulated?: boolean
          product_id?: string
          source?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_inputs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          claims_allowed: string[] | null
          claims_forbidden: string[] | null
          created_at: string
          has_reviews: boolean
          hex_primary: string | null
          hex_secondary: string | null
          id: string
          name: string
          niche: string | null
          store_id: string
          target_age_max: number | null
          target_age_min: number | null
          target_sex: string | null
          tone_adjectives: string[] | null
          words_avoid: string[] | null
        }
        Insert: {
          claims_allowed?: string[] | null
          claims_forbidden?: string[] | null
          created_at?: string
          has_reviews?: boolean
          hex_primary?: string | null
          hex_secondary?: string | null
          id?: string
          name: string
          niche?: string | null
          store_id: string
          target_age_max?: number | null
          target_age_min?: number | null
          target_sex?: string | null
          tone_adjectives?: string[] | null
          words_avoid?: string[] | null
        }
        Update: {
          claims_allowed?: string[] | null
          claims_forbidden?: string[] | null
          created_at?: string
          has_reviews?: boolean
          hex_primary?: string | null
          hex_secondary?: string | null
          id?: string
          name?: string
          niche?: string | null
          store_id?: string
          target_age_max?: number | null
          target_age_min?: number | null
          target_sex?: string | null
          tone_adjectives?: string[] | null
          words_avoid?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          country: string
          created_at: string
          id: string
          language: string
          logo_url: string | null
          name: string
          user_id: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          language: string
          logo_url?: string | null
          name: string
          user_id: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          language?: string
          logo_url?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
