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
      appointments: {
        Row: {
          created_at: string
          date: string
          delivery: Database["public"]["Enums"]["delivery_choice"] | null
          diagnosis: string | null
          feedback: string | null
          follow_up_date: string | null
          health_education: string | null
          id: string
          is_student: boolean | null
          medical_aid: Json | null
          medication_received: boolean | null
          notes: string | null
          nurse_id: string | null
          nurse_name: string | null
          paid: boolean
          patient_id: string
          patient_name: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          price: number
          rating: number | null
          service_id: string
          service_name: string
          status: Database["public"]["Enums"]["appointment_status"]
          time: string
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string
          zoom_link: string | null
        }
        Insert: {
          created_at?: string
          date: string
          delivery?: Database["public"]["Enums"]["delivery_choice"] | null
          diagnosis?: string | null
          feedback?: string | null
          follow_up_date?: string | null
          health_education?: string | null
          id?: string
          is_student?: boolean | null
          medical_aid?: Json | null
          medication_received?: boolean | null
          notes?: string | null
          nurse_id?: string | null
          nurse_name?: string | null
          paid?: boolean
          patient_id: string
          patient_name: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          price: number
          rating?: number | null
          service_id: string
          service_name: string
          status?: Database["public"]["Enums"]["appointment_status"]
          time: string
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
          zoom_link?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          delivery?: Database["public"]["Enums"]["delivery_choice"] | null
          diagnosis?: string | null
          feedback?: string | null
          follow_up_date?: string | null
          health_education?: string | null
          id?: string
          is_student?: boolean | null
          medical_aid?: Json | null
          medication_received?: boolean | null
          notes?: string | null
          nurse_id?: string | null
          nurse_name?: string | null
          paid?: boolean
          patient_id?: string
          patient_name?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          price?: number
          rating?: number | null
          service_id?: string
          service_name?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          time?: string
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
          zoom_link?: string | null
        }
        Relationships: []
      }
      medical_documents: {
        Row: {
          created_at: string
          data: Json
          id: string
          nurse_id: string
          nurse_name: string
          patient_id: string
          patient_name: string
          type: Database["public"]["Enums"]["medical_document_type"]
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          nurse_id: string
          nurse_name: string
          patient_id: string
          patient_name: string
          type: Database["public"]["Enums"]["medical_document_type"]
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          nurse_id?: string
          nurse_name?: string
          patient_id?: string
          patient_name?: string
          type?: Database["public"]["Enums"]["medical_document_type"]
        }
        Relationships: []
      }
      nurse_slots: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          nurse_id: string
          nurse_name: string
          start_time: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          nurse_id: string
          nurse_name: string
          start_time: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          nurse_id?: string
          nurse_name?: string
          start_time?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          dob: string | null
          email: string | null
          gender: string | null
          id: string
          is_student: boolean
          name: string
          phone: string | null
          surname: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          gender?: string | null
          id: string
          is_student?: boolean
          name?: string
          phone?: string | null
          surname?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_student?: boolean
          name?: string
          phone?: string | null
          surname?: string | null
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "nurse" | "admin"
      appointment_status: "pending" | "confirmed" | "completed" | "cancelled"
      appointment_type: "virtual" | "inclinic"
      delivery_choice: "collect" | "courier"
      medical_document_type: "sick_note" | "prescription" | "referral"
      payment_method: "online" | "eft" | "cash" | "card" | "medical-aid"
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
      app_role: ["patient", "nurse", "admin"],
      appointment_status: ["pending", "confirmed", "completed", "cancelled"],
      appointment_type: ["virtual", "inclinic"],
      delivery_choice: ["collect", "courier"],
      medical_document_type: ["sick_note", "prescription", "referral"],
      payment_method: ["online", "eft", "cash", "card", "medical-aid"],
    },
  },
} as const
