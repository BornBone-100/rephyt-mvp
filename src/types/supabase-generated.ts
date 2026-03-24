// ---------------------------------------------------------------------
// NOTE:
// 이 파일은 "초기 세팅용" 샘플 타입입니다.
// 실제 운영에서는 Supabase Dashboard/CLI로 자동 생성한 타입으로 교체하는 것을 권장합니다.
// ---------------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Sex = "M" | "F" | "Other";

export type Database = {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          created_by: string;
          primary_therapist_id: string | null;

          full_name: string;
          birth_date: string | null;
          sex: Sex | null;
          occupation: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;

          chief_complaint: string | null;
          primary_pain_area: string | null;
          pain_areas: string[];
          onset_date: string | null;
          mechanism_of_injury: string | null;
          pmhx: string | null;
          notes: string | null;

          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          primary_therapist_id?: string | null;

          full_name: string;
          birth_date?: string | null;
          sex?: Sex | null;
          occupation?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;

          chief_complaint?: string | null;
          primary_pain_area?: string | null;
          pain_areas?: string[];
          onset_date?: string | null;
          mechanism_of_injury?: string | null;
          pmhx?: string | null;
          notes?: string | null;

          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["patients"]["Insert"]>;
      };

      assessments: {
        Row: {
          id: string;
          patient_id: string;
          therapist_id: string | null;
          assessed_at: string;

          rom: string | null;
          mmt: string | null;
          special_tests: string | null;

          pain_vas_mm: number | null;
          pain_nrs: number | null;

          breathing_score: number | null;
          breathing_notes: string | null;
          centering_score: number | null;
          centering_notes: string | null;
          ribcage_placement_score: number | null;
          ribcage_placement_notes: string | null;
          shoulder_girdle_org_score: number | null;
          shoulder_girdle_org_notes: string | null;
          head_neck_placement_score: number | null;
          head_neck_placement_notes: string | null;

          extra: Json;

          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          therapist_id?: string | null;
          assessed_at?: string;

          rom?: string | null;
          mmt?: string | null;
          special_tests?: string | null;

          pain_vas_mm?: number | null;
          pain_nrs?: number | null;

          breathing_score?: number | null;
          breathing_notes?: string | null;
          centering_score?: number | null;
          centering_notes?: string | null;
          ribcage_placement_score?: number | null;
          ribcage_placement_notes?: string | null;
          shoulder_girdle_org_score?: number | null;
          shoulder_girdle_org_notes?: string | null;
          head_neck_placement_score?: number | null;
          head_neck_placement_notes?: string | null;

          extra?: Json;

          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assessments"]["Insert"]>;
      };

      sessions: {
        Row: {
          id: string;
          patient_id: string;
          therapist_id: string;

          session_no: number | null;
          started_at: string;
          ended_at: string | null;
          location: string | null;
          status: string | null;

          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          therapist_id: string;

          session_no?: number | null;
          started_at?: string;
          ended_at?: string | null;
          location?: string | null;
          status?: string | null;

          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
      };

      soap_notes: {
        Row: {
          id: string;
          session_id: string;
          patient_id: string;
          therapist_id: string;

          assessment_id: string | null;

          subjective: string | null;
          adl_limitations: string | null;
          assessment: string | null;
          plan: string | null;

          ai_generated_note: string | null;
          ai_model: string | null;
          ai_prompt_version: string | null;
          is_final: boolean;

          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          patient_id: string;
          therapist_id: string;

          assessment_id?: string | null;

          subjective?: string | null;
          adl_limitations?: string | null;
          assessment?: string | null;
          plan?: string | null;

          ai_generated_note?: string | null;
          ai_model?: string | null;
          ai_prompt_version?: string | null;
          is_final?: boolean;

          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["soap_notes"]["Insert"]>;
      };
    };

    Views: Record<string, never>;
    Functions: {
      upsert_session_bundle: {
        Args: {
          p_patient_id: string;
          p_started_at?: string;
          p_ended_at?: string | null;
          p_location?: string | null;
          p_status?: string | null;
          p_session_no?: number | null;

          p_subjective?: string | null;
          p_adl_limitations?: string | null;
          p_assessment?: string | null;
          p_plan?: string | null;
          p_ai_generated_note?: string | null;
          p_ai_model?: string | null;
          p_ai_prompt_version?: string | null;
          p_is_final?: boolean | null;

          p_create_assessment?: boolean | null;
          p_assessed_at?: string;
          p_rom?: string | null;
          p_mmt?: string | null;
          p_special_tests?: string | null;
          p_pain_vas_mm?: number | null;
          p_pain_nrs?: number | null;
          p_breathing_score?: number | null;
          p_breathing_notes?: string | null;
          p_centering_score?: number | null;
          p_centering_notes?: string | null;
          p_ribcage_placement_score?: number | null;
          p_ribcage_placement_notes?: string | null;
          p_shoulder_girdle_org_score?: number | null;
          p_shoulder_girdle_org_notes?: string | null;
          p_head_neck_placement_score?: number | null;
          p_head_neck_placement_notes?: string | null;
          p_extra?: Json;
        };
        Returns: {
          session_id: string;
          assessment_id: string | null;
          soap_note_id: string;
        }[];
      };
    };

    Enums: {
      sex: Sex;
    };
    CompositeTypes: Record<string, never>;
  };
};

