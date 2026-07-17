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
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json
          resource_id: string | null
          resource_type: string | null
          status: string
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          status?: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          status?: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          created_at: string
          duplicates_removed: number
          event: string
          id: string
          jobs_imported: number
          message: string | null
          metadata: Json
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          duplicates_removed?: number
          event: string
          id?: string
          jobs_imported?: number
          message?: string | null
          metadata?: Json
          source: string
          status?: string
        }
        Update: {
          created_at?: string
          duplicates_removed?: number
          event?: string
          id?: string
          jobs_imported?: number
          message?: string | null
          metadata?: Json
          source?: string
          status?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
          candidate_name: string
          consultancy_id: string | null
          created_at: string
          email: string | null
          experience: string | null
          id: string
          linked_job_id: string | null
          notes: string | null
          phone: string | null
          resume_url: string | null
          skills: string[]
          status: Database["public"]["Enums"]["candidate_status"]
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          candidate_name: string
          consultancy_id?: string | null
          created_at?: string
          email?: string | null
          experience?: string | null
          id?: string
          linked_job_id?: string | null
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          skills?: string[]
          status?: Database["public"]["Enums"]["candidate_status"]
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          candidate_name?: string
          consultancy_id?: string | null
          created_at?: string
          email?: string | null
          experience?: string | null
          id?: string
          linked_job_id?: string | null
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          skills?: string[]
          status?: Database["public"]["Enums"]["candidate_status"]
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_consultancy_id_fkey"
            columns: ["consultancy_id"]
            isOneToOne: false
            referencedRelation: "consultancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_linked_job_id_fkey"
            columns: ["linked_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      collected_jobs: {
        Row: {
          company_name: string
          company_website: string | null
          created_at: string
          description: string | null
          employment_type: string | null
          experience_level: string | null
          id: string
          job_title: string
          job_url: string | null
          location: string | null
          posted_date: string | null
          raw_payload: Json | null
          salary_text: string | null
          skills: string[]
          source: string | null
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          company_name: string
          company_website?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string | null
          experience_level?: string | null
          id?: string
          job_title: string
          job_url?: string | null
          location?: string | null
          posted_date?: string | null
          raw_payload?: Json | null
          salary_text?: string | null
          skills?: string[]
          source?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          company_name?: string
          company_website?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string | null
          experience_level?: string | null
          id?: string
          job_title?: string
          job_url?: string | null
          location?: string | null
          posted_date?: string | null
          raw_payload?: Json | null
          salary_text?: string | null
          skills?: string[]
          source?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      consultancies: {
        Row: {
          company_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          phone: string | null
          status: string
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          status?: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          status?: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
        }
        Relationships: []
      }
      export_audit_log: {
        Row: {
          created_at: string
          filters: Json
          format: string
          id: string
          page_key: string
          row_count: number
          scope: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          format: string
          id?: string
          page_key: string
          row_count?: number
          scope: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          format?: string
          id?: string
          page_key?: string
          row_count?: number
          scope?: string
          user_id?: string
        }
        Relationships: []
      }
      export_jobs: {
        Row: {
          completed_at: string | null
          consultancy_id: string
          created_at: string
          error: string | null
          file_path: string | null
          filters: Json
          format: string
          id: string
          page_key: string
          row_count: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          consultancy_id: string
          created_at?: string
          error?: string | null
          file_path?: string | null
          filters?: Json
          format: string
          id?: string
          page_key: string
          row_count?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          consultancy_id?: string
          created_at?: string
          error?: string | null
          file_path?: string | null
          filters?: Json
          format?: string
          id?: string
          page_key?: string
          row_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_consultancy_id_fkey"
            columns: ["consultancy_id"]
            isOneToOne: false
            referencedRelation: "consultancies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          consultancy_id: string
          created_at: string
          n8n_webhook_secret: string | null
          n8n_webhook_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          consultancy_id: string
          created_at?: string
          n8n_webhook_secret?: string | null
          n8n_webhook_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          consultancy_id?: string
          created_at?: string
          n8n_webhook_secret?: string | null
          n8n_webhook_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_settings_consultancy_id_fkey"
            columns: ["consultancy_id"]
            isOneToOne: true
            referencedRelation: "consultancies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_bookmarks: {
        Row: {
          collected_job_id: string
          created_at: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          collected_job_id: string
          created_at?: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          collected_job_id?: string
          created_at?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_bookmarks_collected_job_id_fkey"
            columns: ["collected_job_id"]
            isOneToOne: false
            referencedRelation: "collected_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_events: {
        Row: {
          changed_by: string | null
          consultancy_id: string | null
          created_at: string
          id: string
          job_id: string
          new_status: string
          old_status: string | null
          processed_at: string | null
        }
        Insert: {
          changed_by?: string | null
          consultancy_id?: string | null
          created_at?: string
          id?: string
          job_id: string
          new_status: string
          old_status?: string | null
          processed_at?: string | null
        }
        Update: {
          changed_by?: string | null
          consultancy_id?: string | null
          created_at?: string
          id?: string
          job_id?: string
          new_status?: string
          old_status?: string | null
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_status_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_name: string
          created_at: string
          created_by: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          experience_level: Database["public"]["Enums"]["experience_level"]
          id: string
          job_description: string | null
          job_title: string
          job_url: string | null
          location: string | null
          posted_date: string
          required_skills: string[]
          salary_range: string | null
          source: string | null
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string
          created_by?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          experience_level?: Database["public"]["Enums"]["experience_level"]
          id?: string
          job_description?: string | null
          job_title: string
          job_url?: string | null
          location?: string | null
          posted_date?: string
          required_skills?: string[]
          salary_range?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          created_by?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          experience_level?: Database["public"]["Enums"]["experience_level"]
          id?: string
          job_description?: string | null
          job_title?: string
          job_url?: string | null
          location?: string | null
          posted_date?: string
          required_skills?: string[]
          salary_range?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          consultancy_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          consultancy_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          consultancy_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_consultancy_id_fkey"
            columns: ["consultancy_id"]
            isOneToOne: false
            referencedRelation: "consultancies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          consultancy_id: string | null
          created_at: string
          id: string
          is_shared: boolean
          name: string
          query: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          consultancy_id?: string | null
          created_at?: string
          id?: string
          is_shared?: boolean
          name: string
          query?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          consultancy_id?: string | null
          created_at?: string
          id?: string
          is_shared?: boolean
          name?: string
          query?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_consultancy_id_fkey"
            columns: ["consultancy_id"]
            isOneToOne: false
            referencedRelation: "consultancies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          page_key: string
          params: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          page_key: string
          params?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          page_key?: string
          params?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_consultancy_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "consultancy_admin" | "consultancy_recruiter"
      candidate_status:
        | "submitted"
        | "screening"
        | "interview"
        | "offer"
        | "hired"
        | "rejected"
      employment_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "contract_to_hire"
        | "internship"
      experience_level: "entry" | "mid" | "senior" | "lead" | "principal"
      job_status: "open" | "on_hold" | "closed" | "filled"
      subscription_plan: "starter" | "professional" | "enterprise"
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
      app_role: ["super_admin", "consultancy_admin", "consultancy_recruiter"],
      candidate_status: [
        "submitted",
        "screening",
        "interview",
        "offer",
        "hired",
        "rejected",
      ],
      employment_type: [
        "full_time",
        "part_time",
        "contract",
        "contract_to_hire",
        "internship",
      ],
      experience_level: ["entry", "mid", "senior", "lead", "principal"],
      job_status: ["open", "on_hold", "closed", "filled"],
      subscription_plan: ["starter", "professional", "enterprise"],
    },
  },
} as const
