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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assessment_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          type_name: string
          weight_percentage: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          type_name: string
          weight_percentage: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          type_name?: string
          weight_percentage?: number
        }
        Relationships: []
      }
      classes: {
        Row: {
          class_name: string
          created_at: string
          id: string
          section: string | null
        }
        Insert: {
          class_name: string
          created_at?: string
          id?: string
          section?: string | null
        }
        Update: {
          class_name?: string
          created_at?: string
          id?: string
          section?: string | null
        }
        Relationships: []
      }
      comment_templates: {
        Row: {
          comment_text: string
          comment_type: string
          created_at: string
          id: string
          is_active: boolean | null
          max_average: number
          min_average: number
          updated_at: string
        }
        Insert: {
          comment_text: string
          comment_type: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_average: number
          min_average: number
          updated_at?: string
        }
        Update: {
          comment_text?: string
          comment_type?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_average?: number
          min_average?: number
          updated_at?: string
        }
        Relationships: []
      }
      grading_systems: {
        Row: {
          created_at: string
          description: string | null
          grade_name: string
          id: string
          is_active: boolean | null
          max_percentage: number
          min_percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          grade_name: string
          id?: string
          is_active?: boolean | null
          max_percentage: number
          min_percentage: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          grade_name?: string
          id?: string
          is_active?: boolean | null
          max_percentage?: number
          min_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      pending_submissions: {
        Row: {
          created_at: string | null
          grade: string | null
          id: string
          marks_obtained: number
          remarks: string | null
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          subject_id: string
          submitted_at: string | null
          teacher_id: string
          term_id: string
        }
        Insert: {
          created_at?: string | null
          grade?: string | null
          id?: string
          marks_obtained: number
          remarks?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          subject_id: string
          submitted_at?: string | null
          teacher_id: string
          term_id: string
        }
        Update: {
          created_at?: string | null
          grade?: string | null
          id?: string
          marks_obtained?: number
          remarks?: string | null
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          subject_id?: string
          submitted_at?: string | null
          teacher_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_submissions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_submissions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_submissions_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      report_cards: {
        Row: {
          achievement_level: string | null
          class_teacher_comment: string | null
          created_at: string
          fees_balance: number | null
          generated_at: string | null
          headteacher_comment: string | null
          id: string
          overall_average: number | null
          overall_grade: string | null
          overall_identifier: number | null
          pdf_url: string | null
          printed_date: string | null
          status: string | null
          student_id: string
          template: Database["public"]["Enums"]["template_type"] | null
          term_id: string
        }
        Insert: {
          achievement_level?: string | null
          class_teacher_comment?: string | null
          created_at?: string
          fees_balance?: number | null
          generated_at?: string | null
          headteacher_comment?: string | null
          id?: string
          overall_average?: number | null
          overall_grade?: string | null
          overall_identifier?: number | null
          pdf_url?: string | null
          printed_date?: string | null
          status?: string | null
          student_id: string
          template?: Database["public"]["Enums"]["template_type"] | null
          term_id: string
        }
        Update: {
          achievement_level?: string | null
          class_teacher_comment?: string | null
          created_at?: string
          fees_balance?: number | null
          generated_at?: string | null
          headteacher_comment?: string | null
          id?: string
          overall_average?: number | null
          overall_grade?: string | null
          overall_identifier?: number | null
          pdf_url?: string | null
          printed_date?: string | null
          status?: string | null
          student_id?: string
          template?: Database["public"]["Enums"]["template_type"] | null
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_report_cards_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_report_cards_term_id"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      school_info: {
        Row: {
          created_at: string
          email: string | null
          id: string
          location: string | null
          logo_url: string | null
          motto: string | null
          po_box: string | null
          school_name: string
          telephone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          motto?: string | null
          po_box?: string | null
          school_name: string
          telephone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          motto?: string | null
          po_box?: string | null
          school_name?: string
          telephone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      student_marks: {
        Row: {
          a1_score: number | null
          a2_score: number | null
          a3_score: number | null
          achievement_level: string | null
          average_score: number | null
          created_at: string
          eighty_percent: number | null
          final_grade: string | null
          hundred_percent: number | null
          id: string
          identifier: number | null
          student_id: string
          subject_code: string | null
          subject_id: string
          teacher_initials: string | null
          term_id: string
          twenty_percent: number | null
        }
        Insert: {
          a1_score?: number | null
          a2_score?: number | null
          a3_score?: number | null
          achievement_level?: string | null
          average_score?: number | null
          created_at?: string
          eighty_percent?: number | null
          final_grade?: string | null
          hundred_percent?: number | null
          id?: string
          identifier?: number | null
          student_id: string
          subject_code?: string | null
          subject_id: string
          teacher_initials?: string | null
          term_id: string
          twenty_percent?: number | null
        }
        Update: {
          a1_score?: number | null
          a2_score?: number | null
          a3_score?: number | null
          achievement_level?: string | null
          average_score?: number | null
          created_at?: string
          eighty_percent?: number | null
          final_grade?: string | null
          hundred_percent?: number | null
          id?: string
          identifier?: number | null
          student_id?: string
          subject_code?: string | null
          subject_id?: string
          teacher_initials?: string | null
          term_id?: string
          twenty_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_student_marks_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student_marks_subject_id"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student_marks_term_id"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_marks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_marks_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          age: number | null
          class_id: string
          created_at: string
          gender: string
          house: string | null
          id: string
          name: string
          photo_url: string | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          class_id: string
          created_at?: string
          gender: string
          house?: string | null
          id?: string
          name: string
          photo_url?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          class_id?: string
          created_at?: string
          gender?: string
          house?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_students_class_id"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string
          created_at: string
          id: string
          max_marks: number | null
          subject_code: string | null
          subject_name: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          max_marks?: number | null
          subject_code?: string | null
          subject_name: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          max_marks?: number | null
          subject_code?: string | null
          subject_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_subjects_class_id"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_subjects: {
        Row: {
          created_at: string | null
          id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean | null
          start_date: string
          term_name: string
          year: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean | null
          start_date: string
          term_name: string
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          term_name?: string
          year?: number
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
      app_role: "admin" | "teacher" | "student" | "headteacher"
      template_type: "classic" | "modern" | "professional" | "minimal"
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
      app_role: ["admin", "teacher", "student", "headteacher"],
      template_type: ["classic", "modern", "professional", "minimal"],
    },
  },
} as const
