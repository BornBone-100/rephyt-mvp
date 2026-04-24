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
      /** Re:PhyT MVP 대시보드용 환자 테이블 (실제 DB 컬럼과 맞춤) */
      patients: {
        Row: {
          id: string;
          created_by: string | null;
          name: string;
          gender: string;
          age: number;
          phone: string | null;
          diagnosis: string | null;
          memo: string | null;
          is_first_visit: boolean | null;
          past_history: string | null;
          symptom_change: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          name: string;
          gender: string;
          age: number;
          phone?: string | null;
          diagnosis?: string | null;
          memo?: string | null;
          is_first_visit?: boolean | null;
          past_history?: string | null;
          symptom_change?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["patients"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };

      /** MVP SOAP 차트 + 세션 번들 양쪽 모두 커버하도록 필드 병합 */
      soap_notes: {
        Row: {
          id: string;
          session_id: string | null;
          patient_id: string;
          therapist_id: string | null;
          created_by: string | null;

          assessment_id: string | null;

          subjective: string | null;
          objective: string | null;
          adl_limitations: string | null;
          assessment: string | null;
          plan: string | null;

          joint: string | null;
          pain_scale: number | null;

          ai_generated_note: string | null;
          ai_model: string | null;
          ai_prompt_version: string | null;
          is_final: boolean;
          is_shared: boolean;

          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          patient_id: string;
          therapist_id?: string | null;
          created_by?: string | null;

          assessment_id?: string | null;

          subjective?: string | null;
          objective?: string | null;
          adl_limitations?: string | null;
          assessment?: string | null;
          plan?: string | null;

          joint?: string | null;
          pain_scale?: number | null;

          ai_generated_note?: string | null;
          ai_model?: string | null;
          ai_prompt_version?: string | null;
          is_final?: boolean;
          is_shared?: boolean;

          created_at?: string;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["soap_notes"]["Insert"]>;
        Relationships: [];
      };

      treatments: {
        Row: {
          id: string;
          patient_id: string;
          content: string;
          created_by: string | null;
          /** 방문 특이사항·다음 내원 플래그 등 (special_notes, is_flagged, change_log, created_at) */
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          content: string;
          created_by?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["treatments"]["Insert"]>;
        Relationships: [];
      };

      cdss_guardrail_logs: {
        Row: {
          id: string;
          patient_id: string | null;
          user_id: string | null;
          diagnosis_area: string | null;
          overall_score: number | null;
          clinical_reasoning: string | null;
          differential_diagnosis: string | null;
          logic_audit: Json | null;
          cpg_compliance: Json | null;
          audit_defense: Json | null;
          predictive_trajectory: Json | null;
          compliance_score: number | null;
          /** Step1~4 루브릭 기반 문서 방어 점수(비-AI) */
          defense_score: number | null;
          /** Step1~4 기반 회복 예측도 (10~95) */
          recovery_score: number | null;
          /** 예상 회복 기간 한글 스냅샷 */
          recovery_timeframe: string | null;
          detected_condition_id: string | null;
          has_red_flag: boolean | null;
          matched_aliases: Json | null;
          score_breakdown: Json | null;
          intervention_strategy: string | null;
          professional_discussion: string | null;
          assessment_data: Json | null;
          original_data: Json | null;
          raw_ai_response: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          user_id?: string | null;
          diagnosis_area?: string | null;
          overall_score?: number | null;
          clinical_reasoning?: string | null;
          differential_diagnosis?: string | null;
          logic_audit?: Json | null;
          cpg_compliance?: Json | null;
          audit_defense?: Json | null;
          predictive_trajectory?: Json | null;
          compliance_score?: number | null;
          defense_score?: number | null;
          recovery_score?: number | null;
          recovery_timeframe?: string | null;
          detected_condition_id?: string | null;
          has_red_flag?: boolean | null;
          matched_aliases?: Json | null;
          score_breakdown?: Json | null;
          intervention_strategy?: string | null;
          professional_discussion?: string | null;
          assessment_data?: Json | null;
          original_data?: Json | null;
          raw_ai_response?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cdss_guardrail_logs"]["Insert"]>;
        Relationships: [];
      };

      profiles: {
        Row: {
          id: string;
          plan_tier: string | null;
          plan_type: string | null;
          name?: string | null;
          phone_number?: string | null;
          slogan?: string | null;
          metadata?: Json | null;
        };
        Insert: {
          id: string;
          plan_tier?: string | null;
          plan_type?: string | null;
          name?: string | null;
          phone_number?: string | null;
          slogan?: string | null;
          metadata?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };

      /** 회원가입 SMS OTP (서비스 롤 API 전용) */
      signup_sms_challenges: {
        Row: {
          id: string;
          phone_e164: string;
          code_hash: string;
          expires_at: string;
          verified_at: string | null;
          session_token: string | null;
          session_expires_at: string | null;
          consumed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          phone_e164: string;
          code_hash: string;
          expires_at: string;
          verified_at?: string | null;
          session_token?: string | null;
          session_expires_at?: string | null;
          consumed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["signup_sms_challenges"]["Insert"]>;
        Relationships: [];
      };

      patient_consents: {
        Row: {
          id: string;
          patient_id: string | null;
          therapist_id: string;
          signature_image_url: string;
          agreed_at: string;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          therapist_id: string;
          signature_image_url: string;
          agreed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["patient_consents"]["Insert"]>;
        Relationships: [];
      };

      /** 커뮤니티 공유용 비식별 SOAP 스냅샷 (Supabase에 동일 스키마 테이블 필요) */
      community_posts: {
        Row: {
          id: string;
          user_id: string;
          content: Json;
          likes: number;
          views: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: Json;
          likes?: number;
          views?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["community_posts"]["Insert"]>;
        Relationships: [];
      };

      /** 게시글 댓글 — 원문 + Medical English 번역 (Supabase에 동일 스키마 테이블 필요) */
      community_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          original_content: string;
          translated_content: string;
          author_lang: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          original_content: string;
          translated_content: string;
          author_lang?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["community_comments"]["Insert"]>;
        Relationships: [];
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

