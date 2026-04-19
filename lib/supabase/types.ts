export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      attachments: {
        Row: {
          charge_id: string
          created_at: string
          deleted_at: string | null
          id: string
          mime_type: string
          original_name: string | null
          owner_id: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          charge_id: string
          created_at?: string
          deleted_at?: string | null
          id: string
          mime_type: string
          original_name?: string | null
          owner_id: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          charge_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          mime_type?: string
          original_name?: string | null
          owner_id?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string
          deleted_at: string | null
          due_date: string
          id: string
          notes: string | null
          owner_id: string
          paid_amount_cents: number | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["charge_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          client_id: string
          created_at?: string
          deleted_at?: string | null
          due_date: string
          id: string
          notes?: string | null
          owner_id: string
          paid_amount_cents?: number | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          owner_id?: string
          paid_amount_cents?: number | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["charge_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived_at: string | null
          created_at: string
          cycle_anchor_date: string
          cycle_end_date: string | null
          cycle_every: number
          cycle_kind: Database["public"]["Enums"]["cycle_kind"]
          default_amount_cents: number
          deleted_at: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone_e164: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          cycle_anchor_date: string
          cycle_end_date?: string | null
          cycle_every: number
          cycle_kind: Database["public"]["Enums"]["cycle_kind"]
          default_amount_cents: number
          deleted_at?: string | null
          id: string
          name: string
          notes?: string | null
          owner_id: string
          phone_e164?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          cycle_anchor_date?: string
          cycle_end_date?: string | null
          cycle_every?: number
          cycle_kind?: Database["public"]["Enums"]["cycle_kind"]
          default_amount_cents?: number
          deleted_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone_e164?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          currency: string
          daily_reminder_time: string
          daily_reminder_timezone: string
          default_cycle_every: number
          default_cycle_kind: Database["public"]["Enums"]["cycle_kind"]
          email_reminders_enabled: boolean
          locale: string
          message_template: string
          notify_only_if_any: boolean
          owner_id: string
          updated_at: string
        }
        Insert: {
          currency?: string
          daily_reminder_time?: string
          daily_reminder_timezone?: string
          default_cycle_every?: number
          default_cycle_kind?: Database["public"]["Enums"]["cycle_kind"]
          email_reminders_enabled?: boolean
          locale?: string
          message_template: string
          notify_only_if_any?: boolean
          owner_id: string
          updated_at?: string
        }
        Update: {
          currency?: string
          daily_reminder_time?: string
          daily_reminder_timezone?: string
          default_cycle_every?: number
          default_cycle_kind?: Database["public"]["Enums"]["cycle_kind"]
          email_reminders_enabled?: boolean
          locale?: string
          message_template?: string
          notify_only_if_any?: boolean
          owner_id?: string
          updated_at?: string
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
      charge_status: "pending" | "paid" | "canceled"
      cycle_kind: "days" | "weeks" | "months"
      payment_method: "pix" | "cash" | "transfer" | "other"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      charge_status: ["pending", "paid", "canceled"],
      cycle_kind: ["days", "weeks", "months"],
      payment_method: ["pix", "cash", "transfer", "other"],
    },
  },
} as const

