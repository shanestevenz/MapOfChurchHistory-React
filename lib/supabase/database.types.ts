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
      edit_suggestions: {
        Row: {
          contributor: string
          created_at: string
          event_id: string
          event_title: string
          id: string
          note: string
          reviewed_at: string | null
          reviewed_by: string | null
          source: Json | null
          status: Database["public"]["Enums"]["suggestion_status"]
        }
        Insert: {
          contributor?: string
          created_at?: string
          event_id: string
          event_title: string
          id?: string
          note: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Json | null
          status?: Database["public"]["Enums"]["suggestion_status"]
        }
        Update: {
          contributor?: string
          created_at?: string
          event_id?: string
          event_title?: string
          id?: string
          note?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Json | null
          status?: Database["public"]["Enums"]["suggestion_status"]
        }
        Relationships: [
          {
            foreignKeyName: "edit_suggestions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_parents: {
        Row: {
          event_id: string
          parent_id: string
          sort_order: number
        }
        Insert: {
          event_id: string
          parent_id: string
          sort_order?: number
        }
        Update: {
          event_id?: string
          parent_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_parents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      suggestion_changes: {
        Row: {
          after_value: string
          before_value: string
          field: Database["public"]["Enums"]["suggestable_field"]
          id: number
          suggestion_id: string
        }
        Insert: {
          after_value: string
          before_value: string
          field: Database["public"]["Enums"]["suggestable_field"]
          id?: never
          suggestion_id: string
        }
        Update: {
          after_value?: string
          before_value?: string
          field?: Database["public"]["Enums"]["suggestable_field"]
          id?: never
          suggestion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_changes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "edit_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_rate_limits: {
        Row: {
          rate_limit_key: string
          request_count: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          rate_limit_key: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          rate_limit_key?: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          created_at: string
          created_by: string | null
          date_label: string
          detail: string
          group_id: string | null
          icon: Json
          id: string
          key_figures: string[]
          kind: string
          links: Json
          summary: string
          title: string
          tradition_id: string
          updated_at: string
          updated_by: string | null
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_label: string
          detail?: string
          group_id?: string | null
          icon: Json
          id: string
          key_figures?: string[]
          kind: string
          links?: Json
          summary: string
          title: string
          tradition_id: string
          updated_at?: string
          updated_by?: string | null
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_label?: string
          detail?: string
          group_id?: string | null
          icon?: Json
          id?: string
          key_figures?: string[]
          kind?: string
          links?: Json
          summary?: string
          title?: string
          tradition_id?: string
          updated_at?: string
          updated_by?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "timeline_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_tradition_id_fkey"
            columns: ["tradition_id"]
            isOneToOne: false
            referencedRelation: "traditions"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_groups: {
        Row: {
          auto_expand_zoom: number
          created_at: string
          date_label: string
          end_year: number
          id: string
          start_year: number
          title: string
          updated_at: string
        }
        Insert: {
          auto_expand_zoom?: number
          created_at?: string
          date_label: string
          end_year: number
          id: string
          start_year: number
          title: string
          updated_at?: string
        }
        Update: {
          auto_expand_zoom?: number
          created_at?: string
          date_label?: string
          end_year?: number
          id?: string
          start_year?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      traditions: {
        Row: {
          blurb: string
          created_at: string
          family: string
          id: string
          lane: number
          name: string
          updated_at: string
        }
        Insert: {
          blurb: string
          created_at?: string
          family: string
          id: string
          lane: number
          name: string
          updated_at?: string
        }
        Update: {
          blurb?: string
          created_at?: string
          family?: string
          id?: string
          lane?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_timeline_event: { Args: { target_id: string }; Returns: undefined }
      delete_timeline_group: { Args: { target_id: string }; Returns: undefined }
      is_curator: { Args: never; Returns: boolean }
      purge_expired_suggestion_data: { Args: never; Returns: undefined }
      review_edit_suggestion: {
        Args: { decision: string; suggestion_id: string }
        Returns: undefined
      }
      save_timeline_event: {
        Args: { event_data: Json; parent_ids?: string[] }
        Returns: undefined
      }
      save_timeline_group: { Args: { group_data: Json }; Returns: undefined }
      submit_edit_suggestion: {
        Args: {
          changes_data: Json
          rate_limit_key: string
          suggestion_data: Json
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "viewer" | "curator"
      suggestable_field: "title" | "dateLabel" | "summary" | "detail"
      suggestion_status: "pending" | "approved" | "declined"
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
      app_role: ["viewer", "curator"],
      suggestable_field: ["title", "dateLabel", "summary", "detail"],
      suggestion_status: ["pending", "approved", "declined"],
    },
  },
} as const

