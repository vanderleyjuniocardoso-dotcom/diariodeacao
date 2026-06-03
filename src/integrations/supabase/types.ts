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
      admin_broadcasts: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          title?: string
        }
        Relationships: []
      }
      admin_volunteers: {
        Row: {
          cpf: string
          created_at: string
          created_by: string | null
          credencial: string | null
          full_name: string
          source: string
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          created_by?: string | null
          credencial?: string | null
          full_name: string
          source?: string
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          created_by?: string | null
          credencial?: string | null
          full_name?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      feed_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ggl_groups: {
        Row: {
          cities: string[]
          created_at: string
          id: string
          unit_actions: string[]
          unit_name: string
          updated_at: string
        }
        Insert: {
          cities?: string[]
          created_at?: string
          id?: string
          unit_actions?: string[]
          unit_name: string
          updated_at?: string
        }
        Update: {
          cities?: string[]
          created_at?: string
          id?: string
          unit_actions?: string[]
          unit_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ggl_members: {
        Row: {
          created_at: string
          ggl_id: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          ggl_id: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          ggl_id?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ggl_members_ggl_id_fkey"
            columns: ["ggl_id"]
            isOneToOne: false
            referencedRelation: "ggl_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      magna_enrollments: {
        Row: {
          booking_id: string | null
          class_code: string
          completed_at: string | null
          created_at: string
          id: string
          progress: number
          registration_id: string | null
          started: boolean
          started_at: string | null
          updated_at: string
          video_watched: boolean
          volunteer_email: string | null
          volunteer_name: string
          volunteer_phone: string | null
        }
        Insert: {
          booking_id?: string | null
          class_code: string
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          registration_id?: string | null
          started?: boolean
          started_at?: string | null
          updated_at?: string
          video_watched?: boolean
          volunteer_email?: string | null
          volunteer_name: string
          volunteer_phone?: string | null
        }
        Update: {
          booking_id?: string | null
          class_code?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          registration_id?: string | null
          started?: boolean
          started_at?: string | null
          updated_at?: string
          video_watched?: boolean
          volunteer_email?: string | null
          volunteer_name?: string
          volunteer_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "magna_enrollments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "welcome_meeting_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magna_enrollments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "volunteer_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      motivational_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          preset: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          preset?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          preset?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cpf: string | null
          created_at: string
          email: string
          full_name: string
          ggl_id: string | null
          id: string
          phone: string | null
          social_name: string | null
          unit: string | null
          updated_at: string
          volunteer_credential: string | null
          volunteer_level: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          full_name: string
          ggl_id?: string | null
          id: string
          phone?: string | null
          social_name?: string | null
          unit?: string | null
          updated_at?: string
          volunteer_credential?: string | null
          volunteer_level?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string
          ggl_id?: string | null
          id?: string
          phone?: string | null
          social_name?: string | null
          unit?: string | null
          updated_at?: string
          volunteer_credential?: string | null
          volunteer_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_ggl_id_fkey"
            columns: ["ggl_id"]
            isOneToOne: false
            referencedRelation: "ggl_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voluntagram_access_requests: {
        Row: {
          created_at: string
          enrollment_id: string | null
          id: string
          registration_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          enrollment_id?: string | null
          id?: string
          registration_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string | null
          id?: string
          registration_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "voluntagram_access_requests_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "magna_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voluntagram_access_requests_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "volunteer_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_actions: {
        Row: {
          action_date: string
          action_name: string
          category: string | null
          created_at: string
          description: string | null
          donated_hours: number
          id: string
          location: string
          people_impacted: number
          photo_url: string | null
          satisfaction_action: number | null
          satisfaction_support: number | null
          updated_at: string
          user_id: string
          volunteer_credential: string | null
          volunteer_name: string | null
        }
        Insert: {
          action_date: string
          action_name: string
          category?: string | null
          created_at?: string
          description?: string | null
          donated_hours: number
          id?: string
          location: string
          people_impacted?: number
          photo_url?: string | null
          satisfaction_action?: number | null
          satisfaction_support?: number | null
          updated_at?: string
          user_id: string
          volunteer_credential?: string | null
          volunteer_name?: string | null
        }
        Update: {
          action_date?: string
          action_name?: string
          category?: string | null
          created_at?: string
          description?: string | null
          donated_hours?: number
          id?: string
          location?: string
          people_impacted?: number
          photo_url?: string | null
          satisfaction_action?: number | null
          satisfaction_support?: number | null
          updated_at?: string
          user_id?: string
          volunteer_credential?: string | null
          volunteer_name?: string | null
        }
        Relationships: []
      }
      volunteer_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      volunteer_registrations: {
        Row: {
          address: string
          agreed_terms: boolean
          area_of_work: string
          birth_date: string
          cejam_unit: string | null
          city: string
          cpf: string
          created_at: string
          education: string
          email: string
          full_name: string
          gender: string
          how_found_program: string
          id: string
          kit_unit: string
          marital_status: string
          neighborhood: string
          photo_url: string | null
          profession: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rg: string
          shirt_size: string
          social_name: string | null
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
          welcome_booking_id: string | null
          whatsapp: string
          works_at_cejam: boolean
        }
        Insert: {
          address: string
          agreed_terms?: boolean
          area_of_work: string
          birth_date: string
          cejam_unit?: string | null
          city: string
          cpf: string
          created_at?: string
          education: string
          email: string
          full_name: string
          gender: string
          how_found_program: string
          id?: string
          kit_unit: string
          marital_status: string
          neighborhood: string
          photo_url?: string | null
          profession: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rg: string
          shirt_size: string
          social_name?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          welcome_booking_id?: string | null
          whatsapp: string
          works_at_cejam: boolean
        }
        Update: {
          address?: string
          agreed_terms?: boolean
          area_of_work?: string
          birth_date?: string
          cejam_unit?: string | null
          city?: string
          cpf?: string
          created_at?: string
          education?: string
          email?: string
          full_name?: string
          gender?: string
          how_found_program?: string
          id?: string
          kit_unit?: string
          marital_status?: string
          neighborhood?: string
          photo_url?: string | null
          profession?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rg?: string
          shirt_size?: string
          social_name?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          welcome_booking_id?: string | null
          whatsapp?: string
          works_at_cejam?: boolean
        }
        Relationships: []
      }
      welcome_meeting_bookings: {
        Row: {
          attended: boolean
          checked_at: string | null
          created_at: string
          id: string
          registration_id: string | null
          reminder_sent_at: string | null
          slot_id: string
          volunteer_email: string | null
          volunteer_name: string
          volunteer_phone: string | null
        }
        Insert: {
          attended?: boolean
          checked_at?: string | null
          created_at?: string
          id?: string
          registration_id?: string | null
          reminder_sent_at?: string | null
          slot_id: string
          volunteer_email?: string | null
          volunteer_name: string
          volunteer_phone?: string | null
        }
        Update: {
          attended?: boolean
          checked_at?: string | null
          created_at?: string
          id?: string
          registration_id?: string | null
          reminder_sent_at?: string | null
          slot_id?: string
          volunteer_email?: string | null
          volunteer_name?: string
          volunteer_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "welcome_meeting_bookings_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "volunteer_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welcome_meeting_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "welcome_meeting_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      welcome_meeting_slots: {
        Row: {
          capacity: number
          created_at: string
          created_by: string | null
          id: string
          month: number
          notes: string | null
          slot_date: string
          slot_time: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          notes?: string | null
          slot_date: string
          slot_time: string
        }
        Update: {
          capacity?: number
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          notes?: string | null
          slot_date?: string
          slot_time?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_registration: { Args: { _id: string }; Returns: undefined }
      check_cpf: {
        Args: { _cpf: string }
        Returns: {
          found: boolean
          full_name: string
          has_account: boolean
          has_registration_pending: boolean
        }[]
      }
      confirm_attendance: {
        Args: { _attended?: boolean; _booking_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_video_watched: {
        Args: { _enrollment_id: string }
        Returns: undefined
      }
      next_credential: { Args: never; Returns: string }
      reject_registration: {
        Args: { _id: string; _reason?: string }
        Returns: undefined
      }
      request_voluntagram_access: {
        Args: { _enrollment_id: string }
        Returns: string
      }
      set_magna_progress: {
        Args: { _enrollment_id: string; _progress: number }
        Returns: undefined
      }
      start_magna: { Args: { _enrollment_id: string }; Returns: undefined }
      submit_volunteer_registration: {
        Args: {
          _address: string
          _agreed_terms: boolean
          _area_of_work: string
          _birth_date: string
          _cejam_unit: string
          _city: string
          _cpf: string
          _education: string
          _email: string
          _full_name: string
          _gender: string
          _how_found_program: string
          _kit_unit: string
          _marital_status: string
          _neighborhood: string
          _photo_url: string
          _profession: string
          _rg: string
          _shirt_size: string
          _social_name: string
          _whatsapp: string
          _works_at_cejam: boolean
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
      registration_status: "pending" | "approved" | "rejected"
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
      registration_status: ["pending", "approved", "rejected"],
    },
  },
} as const
