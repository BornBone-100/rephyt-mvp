"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  UploadCloud,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  BrainCircuit,
  Activity,
  CheckCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  SlidersHorizontal,
  UserCircle,
  FileWarning,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { Tables } from "@/types/supabase";
import { computeRadiometricDisplay, type RadiometricResult } from "@/lib/ai-screening/radiometrics";
import {
  DICOM_VIEW_PRESETS,
  defaultDicomPresetForPart,
  type DicomWindowPresetKey,
} from "@/lib/dicom/view-presets";
import { normalizeVisionDicomVolume } from "@/lib/dicom/normalize-volume";
import type { DicomVolumePayload } from "@/lib/dicom/normalize-volume";
import { getExpertRiskGuidance } from "@/lib/ai-screening/expert-logic";
import { finalizeSoapAuditLog } from "@/lib/ai-screening/finalize";
import {
  normalizeVisionAnalyzeResponse,
  type VisionAnalyzeFlatPayload,
} from "@/lib/ai-screening/vision-analyze-contract";

/** 부위 코드 — AI/백엔드에서 내려주는 region 코드와 1:1 매핑 가능 */
type BodyPartKey =
  | "CERVICAL"
  | "SHOULDER"
  | "ELBOW"
  | "WRIST"
  | "HAND"
  | "LUMBAR"
  | "HIP"
  | "KNEE"
  | "ANKLE"
  | "FOOT";

/** 스크리닝 초점 부위 카드 표시 순서: 경추 → … → 족부 */
const SCREENING_PART_ORDER: BodyPartKey[] = [
  "CERVICAL",
  "SHOULDER",
  "ELBOW",
  "WRIST",
  "HAND",
  "LUMBAR",
  "HIP",
  "KNEE",
  "ANKLE",
  "FOOT",
];

/**
 * 스크리닝 UI용 환자 카드 모델 (환자 목록과 동일 DB `patients` 행을 매핑)
 *
 * DB( Supabase `public.patients` ) → UI 필드 대응:
 * - `name` ← patients.name
 * - `info` ← patients.gender + " / " + patients.age + "세" (분석·리포트 요약용)
 * - `gender`, `ageLabel` ← 카드 표시용
 * - `chartFocusTag` ← patients.diagnosis (차트에 저장된 텍스트를 스크리닝 초점 태그로 표시, 임상 단정 아님)
 * - `phone` ← patients.phone
 * - `status` ← DB 컬럼 없음: 목록의 「차트 보기」 액션과 동일 의미의 고정 라벨
 */
type LinkedPatient = {
  id: string;
  name: string;
  info: string;
  gender: string;
  ageLabel: string;
  phone: string;
  /** 환자 관리 목록과 동일한 액션 의미(고정 카피) */
  status: string;
  /** 차트 diagnosis 필드 기반 스크리닝 초점 표시용 */
  chartFocusTag: string;
};

function mapPatientRowToLinked(row: Tables<"patients">): LinkedPatient {
  const agePart = row.age != null ? `${row.age}세` : "-";
  return {
    id: row.id,
    name: row.name?.trim() || "이름 없음",
    info: `${row.gender || "-"} / ${agePart}`,
    gender: row.gender?.trim() || "—",
    ageLabel: agePart,
    phone: row.phone?.trim() ?? "",
    status: "차트 보기",
    chartFocusTag: row.diagnosis?.trim() || "—",
  };
}

type BodyMetricDef = {
  name: string;
  normal: string;
  unit: string;
};

type BodyKnowledge = {
  label: string;
  /** 주요 평가 요지 (질병 단정 없이 물리치료 평가 관점) */
  primaryEvaluation: string;
  metrics: BodyMetricDef[];
  standardEvidence: string;
  /** 우측 프로토콜·가이드 초안 */
  careGuides: string[];
  /** 통합 패널용 임상 스크리닝 한줄 요약 (정직한 데이터·수치 중심) */
  clinicalReportHeadline: string;
  clinicalReportBullets: string[];
  /** 히트맵·타깃 박스 중심 (선택 부위 기준 고정 데모 좌표) */
  heatmapPos: { top: string; left: string };
};

const BODY_KNOWLEDGE_BASE: Record<BodyPartKey, BodyKnowledge> = {
  CERVICAL: {
    label: "Cervical (경추)",
    primaryEvaluation: "경추 배열 및 심부굴근 안정성 기능 저하 경향",
    metrics: [
      { name: "C-Curve 각도 (Cobb)", normal: "20–35", unit: "deg" },
      { name: "추간판 높이 비율 (Disc Height)", normal: "80 이상", unit: "%" },
    ],
    standardEvidence: "경추 전만 소실 경향 및 신경공 주변 신호 변화",
    careGuides: [
      "심부굴근 등척성 (chin tuck)",
      "상흉곽 이완 및 견갑 안정화",
      "자세 교육 (모니터 높이·작업 거리)",
    ],
    clinicalReportHeadline: "장시간 전굴 자세 후 경부 통증 악화",
    clinicalReportBullets: ["• 경추 측만 굴곡: 통증 유발", "• ULTT (median): 경도 양성"],
    heatmapPos: { top: "22%", left: "50%" },
  },
  SHOULDER: {
    label: "Shoulder joint (어깨관절)",
    primaryEvaluation: "견관부 외회전·거상 시 기능적 가동성 제한 경향",
    metrics: [
      { name: "견봉하 공간 (Subacromial Space)", normal: "9–10", unit: "mm" },
      { name: "극상근 건 두께 (Supraspinatus)", normal: "4–6", unit: "mm" },
    ],
    standardEvidence: "견봉하 부위 고신호 강도 및 연부조직 부종 경향 관찰",
    careGuides: [
      "통증 없는 범위 내 견관절 패킹·등척성 활성화",
      "견봉하 공간 확보를 위한 견갑 리듬 교육",
      "견관절 외전·외회전 계열 점진적 부하 (저항 밴드)",
    ],
    clinicalReportHeadline: "견관절 수동 외회전 시 통증 증가 및 ROM 제한",
    clinicalReportBullets: ["• ABER 90° 외회전: 통증 유발", "• Empty can: 중등도 양성"],
    heatmapPos: { top: "38%", left: "46%" },
  },
  ELBOW: {
    label: "Elbow joint (주관절)",
    primaryEvaluation: "주관절 신전·회전 시 기능적 가동성 및 부하 분담 제한 경향",
    metrics: [
      { name: "굴곡 ROM (Flexion)", normal: "135–150", unit: "deg" },
      { name: "신전 잔여각 (Extension lag)", normal: "0–5", unit: "deg" },
    ],
    standardEvidence: "상완 요척 부위 연부조직 신호 변화 및 관절낭 삼출 경향 관찰",
    careGuides: [
      "통증 없는 범위 신전·굴곡 슬라이더",
      "전완 등척성 및 손목 중립 유지 교육",
      "일상 동작에서 반복 부하 분산",
    ],
    clinicalReportHeadline: "반복 수작업 후 주관절 통증 악화",
    clinicalReportBullets: ["• Cozen’s: 경도 양성", "• Mill’s: 통증 재현"],
    heatmapPos: { top: "44%", left: "44%" },
  },
  WRIST: {
    label: "Wrist joint (수관절)",
    primaryEvaluation: "수관절 신전·요골 편위 시 통증·가동성 이슈 경향",
    metrics: [
      { name: "수관절 배굴 각 (Palmar Flexion)", normal: "60–80", unit: "deg" },
      { name: "요골 변위 지수 (Ulnar variance idx)", normal: "0.0–0.5", unit: "idx" },
    ],
    standardEvidence: "원위 요척 관절 주변 신호 변화 및 연부조직 부종 경향",
    careGuides: [
      "수관절 중립 유지·타이핑 자세 교육",
      "전완 신전근 스트레칭 및 근력",
      "통증 없는 범위 내 손목 ROM 패턴",
    ],
    clinicalReportHeadline: "키보드 작업 후 수관절 통증 및 묵직함",
    clinicalReportBullets: ["• Finkelstein: 경도 양성", "• Phalen: 20초 내 증상"],
    heatmapPos: { top: "48%", left: "42%" },
  },
  HAND: {
    label: "Hand (수부)",
    primaryEvaluation: "수부 MCP·PIP 가동성 및 파지·분할 동작 기능 저하 경향",
    metrics: [
      { name: "제2 MCP 굴곡 ROM", normal: "85–95", unit: "deg" },
      { name: "핀치 그립력 지수 (Pinch)", normal: "4.5 이상", unit: "kg" },
    ],
    standardEvidence: "수부 근건·관절낭 주변 신호 변화 및 부종 경향",
    careGuides: [
      "집게·맞집게근 등척성 및 tendon glide",
      "작은 물체 집기·실끼우기 등 미세 운동",
      "수부 온열·부종 관리",
    ],
    clinicalReportHeadline: "장시간 스마트폰 사용 후 수부 피로",
    clinicalReportBullets: ["• 핀치 그립: 좌우 비대칭", "• MCP 굴곡: 통증 유발"],
    heatmapPos: { top: "52%", left: "40%" },
  },
  LUMBAR: {
    label: "Lumbar (요추)",
    primaryEvaluation: "요추 L4–L5 수준 기능적 가동성 및 부하 분담 제한 경향",
    metrics: [
      { name: "추간판 돌출 정도 (Disc Protrusion)", normal: "3 이하", unit: "mm" },
      { name: "척추관 유효 직경 (Canal Diameter)", normal: "12 이상", unit: "mm" },
    ],
    standardEvidence: "신경근 주변 신호 변화 및 황색인대 비후 경향 관찰",
    careGuides: [
      "멕켄지 신전 운동 (통증 없는 범위)",
      "요추–골반 리듬 회복 (Pelvic Tilt)",
      "다발성 근육 긴장 완화 (장요근·둔근)",
    ],
    clinicalReportHeadline: "요추 전굴 시 하지 방사통 양성",
    clinicalReportBullets: ["• Flexion ROM: 약 40° 제한", "• SLR (R): 약 35°에서 증상 재현"],
    heatmapPos: { top: "62%", left: "50%" },
  },
  HIP: {
    label: "Hip joint (고관절)",
    primaryEvaluation: "고관절 신전·외회전 시 체중 이전 및 고관절 캡슐 가동성 제한 경향",
    metrics: [
      { name: "Center–edge 각 (CE angle)", normal: "25–40", unit: "deg" },
      { name: "고관절 간격 (Joint space width)", normal: "4–5", unit: "mm" },
    ],
    standardEvidence: "대전자 주변 연부조직 신호 변화 및 관절낭 주변 부종 경향",
    careGuides: [
      "둔근·고관절 외전근 등척성",
      "보행 초기 입각기 고관절 신전 교육",
      "통증 없는 범위 내 90–90 고관절 mobilization",
    ],
    clinicalReportHeadline: "보행 시 고관절 앞쪽 당김 및 보행 거리 감소",
    clinicalReportBullets: ["• FABER: 통증 재현", "• Trendelenburg: 경도 양성"],
    heatmapPos: { top: "58%", left: "48%" },
  },
  KNEE: {
    label: "Knee joint (슬관절)",
    primaryEvaluation: "슬개대–대퇴 관절 정렬 및 체중 분담 기능 제한 경향",
    metrics: [
      { name: "관절 간격 (Joint Space)", normal: "4–5", unit: "mm" },
      { name: "인대 신호 강도 (Signal Intensity)", normal: "Low", unit: "idx" },
    ],
    standardEvidence: "반월상 연골 주변 선상 신호 변화 및 관절 삼출 경향",
    careGuides: [
      "체중 분담 교육 및 보행 리듬 재교육",
      "대사두·둔근 활성화 (클램쉘·미니 스쿼트)",
      "슬개골 추적 개선용 폐쇄사슬 운동",
    ],
    clinicalReportHeadline: "계단 하행 시 앞무릎 통증 및 종창 호소",
    clinicalReportBullets: ["• Thessaly test: 중등도 양성", "• 부종 지수: 경도"],
    heatmapPos: { top: "68%", left: "50%" },
  },
  ANKLE: {
    label: "Ankle joint (족관절)",
    primaryEvaluation: "족관절 배굴·저굴 가동성 비대칭 및 체중 지지 시 안정성 이슈 경향",
    metrics: [
      { name: "배굴 ROM (Dorsiflexion)", normal: "15–20", unit: "deg" },
      { name: "전거골–경골 각 (Talocrural)", normal: "8–12", unit: "deg" },
    ],
    standardEvidence: "전거골 주변 인대 신호 변화 및 관절낭 삼출 경향",
    careGuides: [
      "족관절 배굴 모빌리제이션 및 종아근 스트레칭",
      "단일 다리 체중 지지·프로프리오셉션 패드",
      "보행 시 입각기 습관 교정",
    ],
    clinicalReportHeadline: "계단 상행 시 족관절 앞쪽 통증",
    clinicalReportBullets: ["• 전방 인대 스트레스: 경도 양성", "• 단일 다리 서기: 흔들림"],
    heatmapPos: { top: "78%", left: "49%" },
  },
  FOOT: {
    label: "Foot (족부)",
    primaryEvaluation: "족부 종골·중족부 하중 분담 및 제1중족 관절 가동성 이슈 경향",
    metrics: [
      { name: "종골 내전각 (Heel eversion)", normal: "5–10", unit: "deg" },
      { name: "제1 MTP 배굴 (Hallux DF)", normal: "65 이상", unit: "deg" },
    ],
    standardEvidence: "족저막·제1중족 주변 연부조직 신호 변화 경향",
    careGuides: [
      "짧은 족근 운동 및 아치 리프팅",
      "제1중족 관절 mobilization",
      "보행 패턴에서 전족부 하중 분산",
    ],
    clinicalReportHeadline: "장시간 보행 후 족저 통증 및 뻣뻣함",
    clinicalReportBullets: ["• Windlass 시험: 통증 재현", "• 단일 다리 점프: 회피"],
    heatmapPos: { top: "88%", left: "50%" },
  },
};

type EvidenceMetric = {
  name: string;
  value: string;
  normal: string;
  unit: string;
};

type PreciseMeasurement = {
  label: string;
  pixel_val: number;
  physical_val: number;
  pixel_spacing: number;
  unit: "mm";
  status: "NORMAL" | "INVALID_SCALE";
};

type ActiveAnalysis = {
  key: BodyPartKey;
  partName: string;
  mainFinding: string;
  confidence: number;
  confidenceMetrics: {
    score: number;
    grade: "A" | "B" | "C";
    sensitivity: number;
  };
  protocolMetadata: {
    body_part: string;
    view_type: string;
    modality: string;
    quality_score: string;
  };
  protocolReliability: {
    score: number;
    grade: string;
  };
  preciseMeasurements?: PreciseMeasurement[] | null;
  preciseReliabilityGrade?: "EXPERT" | "REFERRAL_ONLY";
  isCalibrated: boolean;
  evidenceList: EvidenceMetric[];
  expertOpinion: string;
  correlationScore: string;
  careGuides: string[];
  clinicalReportHeadline: string;
  clinicalReportBullets: string[];
  heatmapPos: { top: string; left: string };
  /** 스크리닝 결과가 귀속될 차트(환자) 식별자 */
  patientId: string;
  patientName: string;
  patientInfo: string;
  patientPhone: string;
  patientListStatus: string;
  chartFocusTag: string;
  /** 서버가 pixelDistance·pixelSpacing 을 줄 때만 채워짐 */
  radiometric?: RadiometricResult | null;
  pixelSpacingMm?: number | null;
  quantCorrelationNote?: string | null;
  /** 다층 DICOM·볼륨: 슬라이스별 히트 좌표(%). 서버 `dicomVolume` 연동 시 설정 */
  dicomVolume?: DicomVolumePayload | null;
};

const AnalysisDisclaimer = () => (
  <div className="mb-4 border-l-4 border-amber-400 bg-amber-50 p-4">
    <p className="text-xs font-bold text-amber-700">
      본 결과는 Clinical Screening &amp; Differential Evaluation 용도이며 의학적 판단을 확정하지 않습니다. 최종
      판단은 전문의 진료를 권장합니다.
    </p>
  </div>
);

const MedicalDisclaimer = () => (
  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-100 p-4">
    <div className="mb-2 flex items-center gap-2">
      <span className="rounded bg-slate-400 px-1.5 py-0.5 text-[10px] font-black text-white">NOTICE</span>
      <p className="text-[11px] font-bold uppercase tracking-tighter text-slate-600">Medical Disclaimer</p>
    </div>
    <ul className="list-disc space-y-1 pl-4 text-[10px] leading-relaxed text-slate-500">
      <li>본 서비스는 의료기기가 아니며, 의학적 판단을 제공하지 않습니다.</li>
      <li>제공 수치는 영상 데이터 기반 통계적 소견으로 운동 가이드 및 스크리닝 참고 자료입니다.</li>
      <li>의학적 판단은 반드시 의사 또는 영상의학 전문의와 상의하십시오.</li>
    </ul>
  </div>
);

type ClinicalGuardrailData = {
  finding: string;
  status: "NORMAL" | "REVIEW_REQUIRED" | "REJECT";
  referral: boolean;
  action_guide: string;
  legal_notice: string;
};

type QualityFinalizePayload = {
  feedback: "APPROVED" | "MODIFIED" | "REJECTED";
  modified_val: number;
};

const ClinicalGuardrailUI = ({ guardData }: { guardData: ClinicalGuardrailData }) => {
  const isReject = guardData.status === "REJECT";
  const isReview = guardData.status === "REVIEW_REQUIRED";

  return (
    <div
      className={`rounded-3xl border-2 p-6 transition-all ${
        isReject
          ? "border-rose-200 bg-rose-50"
          : isReview
            ? "border-amber-200 bg-amber-50"
            : "border-slate-100 bg-slate-50"
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        {isReject ? (
          <AlertOctagon className="text-rose-600" />
        ) : isReview ? (
          <AlertTriangle className="text-amber-600" />
        ) : (
          <CheckCircle className="text-emerald-600" />
        )}
        <h4 className={`text-sm font-black ${isReject ? "text-rose-700" : isReview ? "text-amber-700" : "text-slate-700"}`}>
          {isReject ? "분석 제한 안내" : isReview ? "정밀 검토 요망" : "스크리닝 결과"}
        </h4>
      </div>

      <p className="mb-4 text-sm font-bold leading-relaxed text-slate-800">{guardData.finding}</p>

      <div className="rounded-2xl border border-white bg-white/60 p-4">
        <p className="mb-1 text-[11px] font-black uppercase text-slate-400">Expert Guide</p>
        <p className="text-xs font-medium leading-normal text-slate-600">{guardData.action_guide}</p>
      </div>

      {guardData.referral ? (
        <div className="mt-4 rounded-xl bg-rose-600 p-3 text-center animate-pulse">
          <p className="text-[10px] font-black uppercase text-white">전문의 협진 권고 대상</p>
        </div>
      ) : null}

      <p className="mt-3 text-[10px] font-semibold text-slate-500">{guardData.legal_notice}</p>
    </div>
  );
};

const QualityFeedbackModule = ({
  aiData,
  onFinalize,
  loading,
}: {
  aiData: { metrics: Array<{ physical_val: number }> };
  onFinalize: (payload: QualityFinalizePayload) => void;
  loading: boolean;
}) => {
  const baseVal = aiData.metrics[0]?.physical_val ?? 0;
  const [modifiedValue, setModifiedValue] = useState(baseVal);

  useEffect(() => {
    setModifiedValue(baseVal);
  }, [baseVal]);

  const handleComplete = () => {
    const feedbackType: QualityFinalizePayload["feedback"] = modifiedValue === baseVal ? "APPROVED" : "MODIFIED";
    onFinalize({
      feedback: feedbackType,
      modified_val: modifiedValue,
    });
  };

  return (
    <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6 shadow-inner">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-indigo-600" />
        <h4 className="text-[11px] font-black uppercase text-indigo-700">Quality Audit Loop</h4>
      </div>

      <div className="mb-6 space-y-4">
        <p className="text-xs font-bold text-indigo-900">
          치료사님의 수정 사항은 Re:PhyT AI 정밀도 향상을 위한 재학습 데이터로 활용됩니다.
        </p>
        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">Verified Metric</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={Number.isFinite(modifiedValue) ? modifiedValue : 0}
              onChange={(e) => setModifiedValue(Number(e.target.value))}
              className="w-16 text-right font-black text-slate-900 focus:outline-none"
            />
            <span className="text-xs font-bold text-slate-400 underline underline-offset-4">mm</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleComplete}
        disabled={loading}
        className="w-full rounded-2xl bg-indigo-600 py-4 text-sm font-black text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "검토 결과 저장 중..." : "검토 완료 및 SOAP 전송"}
      </button>
    </div>
  );
};

const PreciseMeasurementReport = ({
  measurements,
  grade,
}: {
  measurements: PreciseMeasurement[];
  grade: "EXPERT" | "REFERRAL_ONLY";
}) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="mb-6 flex items-center justify-between">
      <h4 className="text-sm font-black uppercase tracking-tight text-slate-800">Anatomical Measurement (mm)</h4>
      <span
        className={`rounded px-2 py-1 text-[9px] font-black ${
          grade === "EXPERT" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        }`}
      >
        {grade === "EXPERT" ? "UNIT: MM (CALIBRATED)" : "UNIT: PIXEL (RELATIVE)"}
      </span>
    </div>

    <div className="space-y-4">
      {measurements.map((m, idx) => {
        const gauge = Math.max(0, Math.min(100, (m.physical_val / 20) * 100));
        return (
          <div key={`${m.label}-${idx}`} className="group">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-xs font-bold text-slate-500">{m.label}</span>
              <div className="text-right">
                <span className="text-2xl font-black text-slate-900">{m.physical_val}</span>
                <span className="ml-1 text-xs font-bold text-slate-400">mm</span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full transition-all duration-1000 ${m.status === "NORMAL" ? "bg-indigo-500" : "bg-rose-500"}`}
                style={{ width: `${gauge}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>

    <div className="mt-6 border-t border-dashed border-slate-200 pt-4">
      <p className="text-[9px] font-medium text-slate-400">
        RAW DATA LOG: {measurements[0]?.pixel_val ?? 0}px mapped via {measurements[0]?.pixel_spacing ?? 0}mm/px
      </p>
    </div>
  </div>
);

/** 데모용 고정 스크리닝 일치도·정합 점수 (실서비스에서는 API/검증 파이프라인 값으로 대체) */
const DEMO_SCREENING_CONFIDENCE = 98.4;
const DEMO_CORRELATION_SCORE = "94.2";

/** 부위별 고정 계측 표시값 (랜덤 없음 — 선택 부위와 1:1 매핑) */
const FIXED_METRIC_VALUES: Record<BodyPartKey, [string, string]> = {
  CERVICAL: ["26", "85"],
  SHOULDER: ["6.2", "4.8"],
  ELBOW: ["128", "4"],
  WRIST: ["68", "0.35"],
  HAND: ["88", "5.1"],
  LUMBAR: ["5.8", "11.2"],
  HIP: ["32", "4.4"],
  KNEE: ["3.2", "1.2"],
  ANKLE: ["14", "9.5"],
  FOOT: ["8", "72"],
};

function buildDeterministicAnalysis(partKey: BodyPartKey, patient: LinkedPatient): ActiveAnalysis {
  const base = BODY_KNOWLEDGE_BASE[partKey];
  const vals = FIXED_METRIC_VALUES[partKey];
  const evidenceList: EvidenceMetric[] = base.metrics.map((m, i) => ({
    name: m.name,
    value: vals[i] ?? "—",
    normal: m.normal,
    unit: m.unit,
  }));

  return {
    key: partKey,
    partName: base.label,
    mainFinding: base.primaryEvaluation,
    confidence: DEMO_SCREENING_CONFIDENCE,
    confidenceMetrics: {
      score: DEMO_SCREENING_CONFIDENCE,
      grade: "B",
      sensitivity: 0.9,
    },
    protocolMetadata: {
      body_part: partKey,
      view_type: "UNKNOWN",
      modality: "XRAY",
      quality_score: "STANDARD",
    },
    protocolReliability: {
      score: DEMO_SCREENING_CONFIDENCE,
      grade: "REFERENCE",
    },
    preciseMeasurements: null,
    preciseReliabilityGrade: "REFERRAL_ONLY",
    isCalibrated: false,
    evidenceList,
    expertOpinion: base.standardEvidence,
    correlationScore: DEMO_CORRELATION_SCORE,
    careGuides: base.careGuides,
    clinicalReportHeadline: base.clinicalReportHeadline,
    clinicalReportBullets: base.clinicalReportBullets,
    heatmapPos: base.heatmapPos,
    patientId: patient.id,
    patientName: patient.name,
    patientInfo: patient.info,
    patientPhone: patient.phone,
    patientListStatus: patient.status,
    chartFocusTag: patient.chartFocusTag,
  };
}

const ANALYZE_ERROR_MESSAGES: Record<string, string> = {
  multipart_required: "요청 형식이 올바르지 않습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.",
  image_required: "영상 파일이 필요합니다.",
  image_size_invalid: "파일 크기가 허용 범위를 벗어났습니다. (최대 15MB)",
  image_type_not_supported: "지원하지 않는 이미지 형식입니다. JPG·PNG·WEBP를 사용해 주세요.",
  upstream_invalid_json: "비전 서버 응답을 해석하지 못했습니다. 연결 URL·응답 형식을 확인해 주세요.",
  upstream_unreachable:
    "비전 백엔드에 연결할 수 없습니다. FastAPI(uvicorn) 실행 여부와 .env.local의 AI_SCREENING_VISION_URL을 확인해 주세요.",
  analyze_failed: "서버에서 분석을 처리하지 못했습니다.",
  vision_error: "비전 분석 서버가 오류를 반환했습니다.",
  vision_status_not_success: "비전 분석이 완료되지 않았습니다. 응답 status 필드를 확인해 주세요.",
  invalid_json_shape: "비전 응답 형식이 올바르지 않습니다.",
};

/**
 * 비전 분석 요청 URL.
 * - 기본: `/api/ai-screening/analyze` (동일 출처 — 브라우저에서 `Failed to fetch` 방지)
 * - API 라우트가 개발 모드에서 FastAPI(`127.0.0.1:8000`)로 프록시; 스텁만 쓰려면 `.env.local`에 `AI_SCREENING_VISION_URL=`
 * - 다른 주소면 `AI_SCREENING_VISION_URL` 설정. 브라우저 직결 디버그는 `NEXT_PUBLIC_AI_VISION_ANALYZE_URL` (CORS 주의)
 */
const VISION_ANALYZE_URL =
  typeof process.env.NEXT_PUBLIC_AI_VISION_ANALYZE_URL === "string" &&
  process.env.NEXT_PUBLIC_AI_VISION_ANALYZE_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_AI_VISION_ANALYZE_URL.trim()
    : "/api/ai-screening/analyze";

const SOAP_TRANSFER_URL =
  typeof process.env.NEXT_PUBLIC_AI_SOAP_TRANSFER_URL === "string" &&
  process.env.NEXT_PUBLIC_AI_SOAP_TRANSFER_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_AI_SOAP_TRANSFER_URL.trim()
    : "http://127.0.0.1:8000/api/ai-screening/transfer-to-soap";

const AUDIT_LOOP_URL =
  typeof process.env.NEXT_PUBLIC_AI_AUDIT_LOOP_URL === "string" &&
  process.env.NEXT_PUBLIC_AI_AUDIT_LOOP_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_AI_AUDIT_LOOP_URL.trim()
    : "http://localhost:8000/api/admin/audit-and-loop";

function parseBodyPartKey(raw: unknown, fallback: BodyPartKey): BodyPartKey {
  const s = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (s && (SCREENING_PART_ORDER as readonly string[]).includes(s)) return s as BodyPartKey;
  return fallback;
}

function clampNum(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function parsePercentFromCss(css: string): number {
  const m = /^([\d.]+)%$/.exec(String(css).trim());
  if (!m) return 50;
  return clampNum(parseFloat(m[1]), 0, 100);
}

function resolveHeatmapPos(
  coords: { x?: number; y?: number } | undefined | null,
  fallback: { top: string; left: string },
): { top: string; left: string } {
  const fx = coords?.x;
  const fy = coords?.y;
  const x =
    typeof fx === "number" && Number.isFinite(fx) ? clampNum(fx, 0, 100) : parsePercentFromCss(fallback.left);
  const y =
    typeof fy === "number" && Number.isFinite(fy) ? clampNum(fy, 0, 100) : parsePercentFromCss(fallback.top);
  return { top: `${y}%`, left: `${x}%` };
}

/** 구조화 metrics · 레거시 문자열 배열을 부위 템플릿 행과 병합 */
function buildEvidenceListFromVision(
  base: BodyKnowledge,
  fixed: [string, string],
  vision: VisionAnalyzeFlatPayload,
): EvidenceMetric[] {
  const detailed = vision.metricsDetailed;
  const legacyStrings =
    vision.metricValues && vision.metricValues.length >= base.metrics.length
      ? vision.metricValues.slice(0, base.metrics.length).map(String)
      : vision.metrics &&
          vision.metrics.length >= base.metrics.length &&
          vision.metrics.every((x) => typeof x === "string")
        ? (vision.metrics as string[]).slice(0, base.metrics.length)
        : null;

  return base.metrics.map((m, i) => {
    const row = detailed?.[i] ?? detailed?.find((r) => r.name.trim() === m.name.trim());
    if (row) {
      const val =
        typeof row.value === "number" && Number.isFinite(row.value)
          ? String(row.value)
          : String(row.value ?? "—");
      return {
        name: row.name.trim() ? row.name : m.name,
        value: val,
        normal: row.normal?.trim() ? row.normal : m.normal,
        unit: row.unit?.trim() ? row.unit : m.unit,
      };
    }
    const legacy = legacyStrings?.[i] ?? fixed[i] ?? "—";
    return {
      name: m.name,
      value: legacy,
      normal: m.normal,
      unit: m.unit,
    };
  });
}

/** 비전 API JSON + 지식베이스 템플릿을 합쳐 `ActiveAnalysis` 생성 */
function buildAnalysisFromVisionApi(
  partKey: BodyPartKey,
  patient: LinkedPatient,
  vision: VisionAnalyzeFlatPayload,
): ActiveAnalysis {
  const base = BODY_KNOWLEDGE_BASE[partKey];
  const fixed = FIXED_METRIC_VALUES[partKey];
  const evidenceList = buildEvidenceListFromVision(base, fixed, vision);

  const confRaw =
    typeof vision.confidence === "number" && Number.isFinite(vision.confidence)
      ? vision.confidence
      : DEMO_SCREENING_CONFIDENCE;
  const confidence = Math.round(clampNum(confRaw, 0, 100) * 10) / 10;
  const confidenceScoreRaw =
    typeof vision.confidenceMetrics?.score === "number" && Number.isFinite(vision.confidenceMetrics.score)
      ? vision.confidenceMetrics.score
      : confidence;
  const confidenceScore = Math.round(clampNum(confidenceScoreRaw, 0, 100) * 10) / 10;
  const gradeRaw = (vision.confidenceMetrics?.grade ?? "").toString().trim().toUpperCase();
  const confidenceGrade: "A" | "B" | "C" = gradeRaw === "A" || gradeRaw === "B" || gradeRaw === "C" ? gradeRaw : "B";
  const sensitivityRaw =
    typeof vision.confidenceMetrics?.sensitivity === "number" && Number.isFinite(vision.confidenceMetrics.sensitivity)
      ? vision.confidenceMetrics.sensitivity
      : 0.9;
  const confidenceSensitivity = Math.round(clampNum(sensitivityRaw, 0, 1) * 100) / 100;
  const qualityScore = confidenceGrade === "A" ? "HIGH" : confidenceGrade === "B" ? "MEDIUM" : "LOW";

  const finding =
    typeof vision.finding === "string" && vision.finding.trim() !== ""
      ? vision.finding.trim()
      : base.primaryEvaluation;

  const correlationScore =
    typeof vision.correlationScore === "string" && vision.correlationScore.trim() !== ""
      ? vision.correlationScore.trim()
      : DEMO_CORRELATION_SCORE;

  const expertOpinionMerged =
    typeof vision.expertOpinion === "string" && vision.expertOpinion.trim() !== ""
      ? vision.expertOpinion.trim()
      : base.standardEvidence;

  const ps =
    typeof vision.pixelSpacing === "number" && Number.isFinite(vision.pixelSpacing) && vision.pixelSpacing > 0
      ? vision.pixelSpacing
      : null;
  const pd =
    typeof vision.pixelDistance === "number" && Number.isFinite(vision.pixelDistance) ? vision.pixelDistance : null;

  let radiometric: RadiometricResult | null = null;
  let pixelSpacingMm: number | null = null;
  let preciseMeasurements: PreciseMeasurement[] | null = null;
  let preciseReliabilityGrade: "EXPERT" | "REFERRAL_ONLY" = "REFERRAL_ONLY";
  if (ps != null && pd != null) {
    pixelSpacingMm = ps;
    radiometric = computeRadiometricDisplay(partKey, pd, ps);
    const physical = Math.round(pd * ps * 100) / 100;
    const valid = physical >= 1.0 && physical <= 30.0;
    preciseMeasurements = [
      {
        label: radiometric?.targetLabel ?? base.metrics[0]?.name ?? "Anatomical measurement",
        pixel_val: pd,
        physical_val: physical,
        pixel_spacing: ps,
        unit: "mm",
        status: valid ? "NORMAL" : "INVALID_SCALE",
      },
    ];
    preciseReliabilityGrade = valid ? "EXPERT" : "REFERRAL_ONLY";
  }

  const quantCorrelationNote =
    radiometric != null
      ? `차트 초점 「${patient.chartFocusTag}」·표시 정합 ${correlationScore}%와 아래 계측값을 함께 검토하세요. 의학적 평가는 담당 전문가에게 따릅니다.`
      : null;

  const heatmapPos = resolveHeatmapPos(vision.coords, base.heatmapPos);
  const dicomVolume = normalizeVisionDicomVolume(vision.dicomVolume ?? null, {
    x: parsePercentFromCss(heatmapPos.left),
    y: parsePercentFromCss(heatmapPos.top),
  });

  return {
    key: partKey,
    partName: base.label,
    mainFinding: finding,
    confidence,
    confidenceMetrics: {
      score: confidenceScore,
      grade: confidenceGrade,
      sensitivity: confidenceSensitivity,
    },
    protocolMetadata: {
      body_part: partKey,
      view_type: "LATERAL",
      modality: "XRAY",
      quality_score: qualityScore,
    },
    protocolReliability: {
      score: confidenceScore,
      grade: confidenceGrade === "A" ? "EXPERT_LEVEL" : confidenceGrade === "B" ? "CLINICAL_REVIEW" : "RECHECK",
    },
    preciseMeasurements,
    preciseReliabilityGrade,
    isCalibrated: vision.isCalibrated === true,
    evidenceList,
    expertOpinion: expertOpinionMerged,
    correlationScore,
    careGuides: base.careGuides,
    clinicalReportHeadline: base.clinicalReportHeadline,
    clinicalReportBullets: base.clinicalReportBullets,
    heatmapPos,
    patientId: patient.id,
    patientName: patient.name,
    patientInfo: patient.info,
    patientPhone: patient.phone,
    patientListStatus: patient.status,
    chartFocusTag: patient.chartFocusTag,
    radiometric,
    pixelSpacingMm,
    quantCorrelationNote,
    ...(dicomVolume ? { dicomVolume } : {}),
  };
}

/** MP4 등 브라우저 video 요소로 미리보기할 수 있는 포맷 */
function isBrowserPreviewVideo(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|webm|ogg|mov|m4v)(\b|$)/i.test(file.name);
}

/** DICOM — 브라우저 img 요소로는 표시 불가 */
function isDicomLikeFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith(".dcm") || file.type.includes("dicom");
}

/** TIFF 의료 영상 등 — Chrome 등에서 img 디코딩 미지원인 경우가 많음 */
function isTiffLikeFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith(".tif") || n.endsWith(".tiff") || file.type === "image/tiff";
}

// [우선순위 1] 데이터셋 고도화: TIFF 미리보기 지원(플레이스홀더)
const getPreviewUrl = async (file: File): Promise<string> => {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "tif" || extension === "tiff") {
    return "/images/dicom-placeholder.svg";
  }
  return URL.createObjectURL(file);
};

/**
 * iPhone 사진 등: 확장자·MIME이 HEIC/HEIF 계열인지 (일부 기기는 `image/heif`만 오고 `image/heic`가 아님 →
 * 변환 분기를 놓치면 Chrome에서 raw 그대로 img에 넣었다가 onError → 검은 화면 + 안내 문구가 뜸)
 */
function isHeicOrHeifFile(file: File): boolean {
  const n = file.name.toLowerCase();
  if (n.endsWith(".heic") || n.endsWith(".heif")) return true;
  const t = file.type.toLowerCase();
  if (t === "image/heic" || t === "image/heif") return true;
  return false;
}

export default function PreAssessmentScreening() {
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [targetPart, setTargetPart] = useState<BodyPartKey>("LUMBAR");
  const [linkedPatients, setLinkedPatients] = useState<LinkedPatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsFetchError, setPatientsFetchError] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<LinkedPatient | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<ActiveAnalysis | null>(null);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(75);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rasterPreviewFailed, setRasterPreviewFailed] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isTransferLoading, setIsTransferLoading] = useState(false);
  /** 포맷 검사 후 브라우저 미리보기·변환 관련 안내 (DICOM/TIFF/HEIC 실패 등) */
  const [fileError, setFileError] = useState<string | null>(null);
  /** 다층 DICOM 뷰어 */
  const [dicomSliceIndex, setDicomSliceIndex] = useState(0);
  const [dicomWindowPreset, setDicomWindowPreset] = useState<DicomWindowPresetKey>("LUMBAR_SOFT");

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return;
        setUserId(data.user?.id ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setUserId(null);
      });
    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function logPatientActivity(input: {
    patientId: string;
    activityType: string;
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) {
    if (!userId) return;
    try {
      await fetch("/api/patient-activities/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...input }),
      });
    } catch (e) {
      console.error("patient activity log failed:", e);
    }
  }

  const uploadToStorage = async (file: File): Promise<string> => {
    if (!selectedPatient?.id) {
      throw new Error("환자 선택 정보가 없어 업로드를 진행할 수 없습니다.");
    }
    const fileExt = file.name.split(".").pop() || "bin";
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${selectedPatient.id}/${fileName}`;

    const { error } = await supabase.storage.from("ai-screening-uploads").upload(filePath, file);
    if (error) {
      console.error("Storage 업로드 실패:", error.message);
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("ai-screening-uploads").getPublicUrl(filePath);
    return publicUrl;
  };

  const fetchLinkedPatients = useCallback(async () => {
    setPatientsLoading(true);
    setPatientsFetchError(null);
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data ?? []).map(mapPatientRowToLinked);
      setLinkedPatients(mapped);
      setSelectedPatient((prev) => {
        if (mapped.length === 0) return null;
        if (prev && mapped.some((p) => p.id === prev.id)) return prev;
        return mapped[0];
      });
    } catch (e) {
      console.error(e);
      setPatientsFetchError("환자 목록을 불러오지 못했습니다. 네트워크·로그인 상태를 확인해 주세요.");
      setLinkedPatients([]);
      setSelectedPatient(null);
    } finally {
      setPatientsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchLinkedPatients();
  }, [fetchLinkedPatients]);

  useEffect(() => {
    let mounted = true;
    let objectUrlToRevoke: string | null = null;

    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    if (isDicomLikeFile(selectedFile)) {
      setPreviewUrl(null);
      return;
    }

    void (async () => {
      const url = await getPreviewUrl(selectedFile);
      if (!mounted) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        return;
      }
      setPreviewUrl(url);
      objectUrlToRevoke = url.startsWith("blob:") ? url : null;
    })();

    return () => {
      mounted = false;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [selectedFile]);

  useEffect(() => {
    setRasterPreviewFailed(false);
  }, [previewUrl]);

  useEffect(() => {
    if (!activeAnalysis?.dicomVolume) return;
    setDicomSliceIndex(0);
    setDicomWindowPreset(defaultDicomPresetForPart(activeAnalysis.key));
  }, [activeAnalysis]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    const handleFileUpload = async (originalFile: File): Promise<File | null> => {
      if (typeof window === "undefined") {
        return null;
      }

      let displayFile = originalFile;

      if (isHeicOrHeifFile(originalFile)) {
        setIsConverting(true);
        try {
          const heic2any = (await import("heic2any")).default;
          const converted = await heic2any({
            blob: originalFile,
            toType: "image/jpeg",
            quality: 0.8,
          });
          const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
          const baseName = originalFile.name.replace(/\.[^/.]+$/, "");
          displayFile = new File([convertedBlob as Blob], `${baseName}.jpg`, { type: "image/jpeg" });
        } catch (err) {
          console.error("HEIC conversion error:", err);
          setFileError("HEIC·HEIF 변환에 실패했습니다. JPG 또는 PNG로 저장한 뒤 다시 올려 주세요.");
          return null;
        } finally {
          setIsConverting(false);
        }
      }

      return displayFile;
    };

    const displayFile = await handleFileUpload(file);
    if (!displayFile) {
      setSelectedFile(null);
      e.target.value = "";
      return;
    }

    if (isDicomLikeFile(displayFile) || isTiffLikeFile(displayFile)) {
      setSelectedFile(displayFile);
      setFileError(
        "의료용 원시 포맷(DICOM·TIFF 등)은 이 웹 뷰어에서 배경 미리보기를 제공하지 않습니다. 캡처·보내기한 JPG·PNG·WEBP를 권장합니다. 스크리닝 분석은 파일이 선택된 상태에서 계속 진행할 수 있습니다.",
      );
      return;
    }

    setSelectedFile(displayFile);
  };

  const handleStartAnalysis = async () => {
    if (!selectedPatient) {
      alert("환자를 선택해 주세요.");
      return;
    }
    if (!selectedFile) {
      alert("영상을 먼저 업로드해 주세요.");
      return;
    }

    const runRealVisionAnalysis = async () => {
      if (!selectedPatient || !selectedFile) return;

      setStep(2);
      setActiveAnalysis(null);
      void logPatientActivity({
        patientId: selectedPatient.id,
        activityType: "AI_SCREENING_ANALYSIS_STARTED",
        title: `${targetPart} 임상 데이터 분석 시작`,
        description: `${selectedPatient.name} 환자 영상 기준 스크리닝 처리를 시작했습니다.`,
        metadata: { patient_id: selectedPatient.id, body_part: targetPart, file_name: selectedFile.name },
      });

      const fileUrl = await uploadToStorage(selectedFile);

      const response = await fetch(VISION_ANALYZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: fileUrl,
          imageName: selectedFile.name,
          bodyPartHint: targetPart,
          patientId: selectedPatient.id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("서버 응답 내용:", errorText);
        throw new Error(`서버 에러: ${response.status} - ${errorText}`);
      }

      const text = await response.text();
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(text) as unknown;
      } catch {
        console.error("서버 JSON 파싱 실패:", text);
        throw new Error("서버 응답이 JSON 형식이 아닙니다. 백엔드 로그를 확인해 주세요.");
      }

      const normalized = normalizeVisionAnalyzeResponse(rawJson);
      if (!normalized.ok) {
        const msg = ANALYZE_ERROR_MESSAGES[normalized.code ?? ""] ?? normalized.error;
        throw new Error(msg);
      }

      const partKey = parseBodyPartKey(normalized.payload.part, targetPart);
      setActiveAnalysis(buildAnalysisFromVisionApi(partKey, selectedPatient, normalized.payload));
      setStep(3);
      void logPatientActivity({
        patientId: selectedPatient.id,
        activityType: "AI_SCREENING_ANALYSIS_COMPLETED",
        title: `${partKey} 임상 데이터 분석 및 가이드 생성 완료`,
        description: `${partKey} 부위 스크리닝 결과가 생성되었습니다. (신뢰도 ${Math.round((normalized.payload.confidence ?? 0) * 10) / 10}%)`,
        metadata: { patient_id: selectedPatient.id, body_part: partKey, confidence: normalized.payload.confidence ?? null },
      });
    };

    try {
      await runRealVisionAnalysis();
    } catch (e) {
      console.error("백엔드 연결 실패:", e);
      alert(
        e instanceof Error
          ? e.message
          : "AI 서버가 응답하지 않습니다. `backend`에서 uvicorn 실행 여부를 확인하세요.",
      );
      setStep(1);
    }
  };

  const handleExport = (feedbackType: string) => {
    const pid = activeAnalysis?.patientId ?? selectedPatient?.id ?? "—";
    const messages: Record<string, string> = {
      accept: `[${pid}] AI Care Guide가 SOAP 초안에 이관되었습니다. (학습 데이터: 긍정 기록)`,
      modify: `[${pid}] 수정 모드로 전환합니다. 수정 후 SOAP에 이관됩니다. (파인튜닝 기록)`,
      reject: `[${pid}] 기각되었습니다. 재학습 데이터로 분리 저장됩니다.`,
    };
    alert(messages[feedbackType]);
  };

  const handleSoapTransfer = async (qualityPayload?: QualityFinalizePayload) => {
    if (!activeAnalysis || !selectedPatient) return;

    setIsTransferLoading(true);
    try {
      const aiMetricVal = Number(activeAnalysis.preciseMeasurements?.[0]?.physical_val ?? Number(activeAnalysis.evidenceList[0]?.value ?? 0));
      const feedbackType = qualityPayload?.feedback ?? "APPROVED";
      const modifiedVal = Number.isFinite(qualityPayload?.modified_val as number)
        ? Number(qualityPayload?.modified_val)
        : aiMetricVal;

      const response = await fetch(SOAP_TRANSFER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          analysisData: activeAnalysis,
          therapistOpinion: "물리치료사 성준 검토 완료",
        }),
      });

      const result: unknown = await response.json();
      if (!response.ok) {
        const rec =
          typeof result === "object" && result !== null ? (result as Record<string, unknown>) : null;
        const detail =
          typeof rec?.detail === "string"
            ? rec.detail
            : typeof rec?.error === "string"
              ? rec.error
              : "데이터 이관 중 오류가 발생했습니다.";
        throw new Error(detail);
      }

      const rec =
        typeof result === "object" && result !== null ? (result as Record<string, unknown>) : null;
      if (rec?.status === "success") {
        try {
          const finalDecision = `${activeAnalysis.mainFinding} / 검증 계측 ${modifiedVal}mm`;
          const auditMetrics = activeAnalysis.evidenceList.map((m) => ({
            name: m.name,
            value: m.value,
            normal: m.normal,
            unit: m.unit,
          }));

          await fetch(AUDIT_LOOP_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              analysis_id: (activeAnalysis as { analysis_id?: string }).analysis_id ?? `analysis-${Date.now()}`,
              model_version: "v1.0.4-beta",
              ai_raw_output: { metrics: { physical_val: aiMetricVal }, finding: activeAnalysis.mainFinding },
              final_human_output: { metrics: { physical_val: modifiedVal }, finding: finalDecision },
              feedback_type: feedbackType,
            }),
          });

          await finalizeSoapAuditLog({
            supabase,
            patientId: selectedPatient.id,
            originalAiOutput: activeAnalysis.mainFinding,
            finalTherapistDecision: finalDecision,
            metrics: auditMetrics,
          });
          void logPatientActivity({
            patientId: selectedPatient.id,
            activityType: "AI_SCREENING_LINK_CONFIRMED",
            title: `${activeAnalysis.key} 스크리닝 연계 확정`,
            description: `${selectedPatient.name} 환자 스크리닝 결과가 기록되었습니다. (피드백 ${feedbackType}, drift 검증값 ${modifiedVal}mm)`,
            metadata: {
              patient_id: selectedPatient.id,
              body_part: activeAnalysis.key,
              feedback_type: feedbackType,
              verified_mm: modifiedVal,
            },
          });
          alert(typeof rec.message === "string" ? rec.message : "SOAP 연계 완료");
        } catch (auditErr) {
          console.error("품질 감사 로그 저장 실패:", auditErr);
          alert(
            `${selectedPatient.name} 환자 SOAP 이관은 완료되었지만 품질 감사 로그 저장이 실패했습니다. 권한(RLS)과 soap_history 테이블 마이그레이션을 확인해 주세요.`,
          );
        }
        return;
      }
      throw new Error("이관 응답 형식이 올바르지 않습니다.");
    } catch (error) {
      console.error("이관 실패:", error);
      alert(
        error instanceof Error
          ? error.message
          : "서버 연결 실패. FastAPI가 8000번 포트에서 실행 중인지 확인하세요.",
      );
    } finally {
      setIsTransferLoading(false);
    }
  };

  const analysis = activeAnalysis;

  const showDicomExpertViewer = Boolean(
    analysis?.dicomVolume && selectedFile && isDicomLikeFile(selectedFile),
  );
  const dicomVol = analysis?.dicomVolume ?? null;
  const dicomSliceClamped =
    dicomVol != null ? clampNum(dicomSliceIndex, 0, dicomVol.totalSlices - 1) : 0;
  const dicomSliceCoords =
    dicomVol != null ? (dicomVol.slices[dicomSliceClamped] ?? { x: 50, y: 50 }) : { x: 50, y: 50 };

  const expertRiskGuidance = analysis ? getExpertRiskGuidance(analysis.key) : null;
  const guardData: ClinicalGuardrailData | null = analysis
    ? (() => {
        const score = analysis.confidenceMetrics.score;
        const metricsStatus = analysis.preciseMeasurements?.some((m) => m.status === "INVALID_SCALE")
          ? "INVALID_SCALE"
          : "NORMAL";
        if (score < 70 || metricsStatus === "INVALID_SCALE") {
          return {
            finding: "데이터 품질 저하로 인한 판독 보류",
            status: "REJECT",
            referral: true,
            action_guide: "영상 해상도 확인 후 재촬영하거나 전문의 판독을 권고합니다.",
            legal_notice: "본 결과는 스크리닝 용도이며 의학적 판단을 확정하지 않습니다.",
          };
        }
        if (score < 85) {
          return {
            finding: "추가 검토가 필요한 소견 관찰",
            status: "REVIEW_REQUIRED",
            referral: true,
            action_guide: "이학적 검증(Physical Test) 결과와 반드시 대조하십시오.",
            legal_notice: "본 결과는 스크리닝 용도이며 의학적 판단을 확정하지 않습니다.",
          };
        }
        return {
          finding: "특정 유형의 정렬 변화 경향성 관찰",
          status: "NORMAL",
          referral: false,
          action_guide: "정기적인 스크리닝을 통한 추적 관찰을 권장합니다.",
          legal_notice: "본 결과는 스크리닝 용도이며 의학적 판단을 확정하지 않습니다.",
        };
      })()
    : null;
  const suppressDetailedResults = guardData?.status === "REJECT";

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 text-slate-800 font-sans bg-slate-50 min-h-screen">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BrainCircuit className="w-7 h-7 text-indigo-600" />
          Re:PhyT AI - 사전 스크리닝 (Global Body-Part Engine)
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          <strong className="text-slate-700">환자(차트) 선택 → 부위·영상 설정 → 스크리닝 결과 귀속</strong> 순서로 동작합니다.
          환자 카드는 Supabase <strong className="text-slate-700">patients</strong> 테이블을 조회해 환자 관리 목록과 동일
          데이터를 표시합니다. 지표·일치도는 시연용 고정값입니다. 본 화면은 의학적 판단을 대체할 수 없는 보조 도구입니다.
        </p>
      </div>

      <div className="flex items-center justify-between max-w-2xl mx-auto mb-8 px-4">
        {[
          { num: 1, label: "1. 환자·부위·영상" },
          { num: 2, label: "2. 스크리닝 처리" },
          { num: 3, label: "3. 결과·Care Guide" },
        ].map((item) => (
          <div key={item.num} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300 ${
                step >= item.num ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"
              }`}
            >
              {step > item.num ? <CheckCircle2 className="w-5 h-5" /> : item.num}
            </div>
            <span className={`text-xs mt-2 font-medium ${step >= item.num ? "text-indigo-900" : "text-slate-400"}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase text-slate-500">
              <UserCircle className="h-4 w-4 text-indigo-500" />
              대상 환자 선택 (Re:PhyT 환자 관리 · DB 연동)
            </h3>
            {patientsFetchError ? (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                {patientsFetchError}
                <button
                  type="button"
                  onClick={() => void fetchLinkedPatients()}
                  className="font-bold text-rose-900 underline underline-offset-2 hover:text-rose-950"
                >
                  다시 시도
                </button>
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {patientsLoading ? (
                <div className="col-span-full flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                  <p className="text-sm font-bold">환자 목록 불러오는 중…</p>
                </div>
              ) : linkedPatients.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm font-semibold text-slate-600">
                  등록된 환자가 없습니다. 환자 관리에서 환자를 추가한 뒤 이 페이지를 새로고침해 주세요.
                </div>
              ) : (
                linkedPatients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPatient(p)}
                    className={`flex w-full items-stretch rounded-2xl border-2 p-5 text-left transition-all ${
                      selectedPatient?.id === p.id
                        ? "border-indigo-600 bg-indigo-50 shadow-md"
                        : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-lg font-black leading-tight text-slate-900">{p.name}</p>
                      <dl className="space-y-1 text-xs text-slate-600">
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 font-bold text-slate-400">성별</dt>
                          <dd className="min-w-0 font-semibold text-slate-700">{p.gender}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 font-bold text-slate-400">나이</dt>
                          <dd className="min-w-0 font-semibold text-slate-700">{p.ageLabel}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 font-bold text-slate-400">차트 초점</dt>
                          <dd className="min-w-0 break-words font-semibold text-slate-700">{p.chartFocusTag}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-16 shrink-0 font-bold text-slate-400">연락처</dt>
                          <dd className="min-w-0 break-all font-semibold text-slate-700">{p.phone || "—"}</dd>
                        </div>
                      </dl>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-sm font-black uppercase text-indigo-600">1. 스크리닝 초점 부위 선택</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {SCREENING_PART_ORDER.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTargetPart(key)}
                  className={`rounded-2xl border-2 px-2 py-3 text-center text-[11px] font-bold leading-snug transition-all sm:text-xs ${
                    targetPart === key
                      ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                      : "border-slate-100 bg-white text-slate-700 hover:border-slate-200"
                  }`}
                >
                  {BODY_KNOWLEDGE_BASE[key].label}
                </button>
              ))}
            </div>

            <h3 className="border-t border-slate-100 pt-6 text-sm font-black uppercase text-indigo-600">
              2. 영상·이미지 업로드
            </h3>
            <div
              className={`group relative rounded-3xl border-4 border-dashed p-10 text-center transition-all ${
                fileError
                  ? "border-rose-200 bg-rose-50/50 hover:bg-rose-50/70"
                  : "border-indigo-100 hover:bg-indigo-50/30"
              }`}
            >
              <input
                type="file"
                accept="image/*,video/*,.dcm,.tif,.tiff,.heic,.heif"
                disabled={isConverting}
                onChange={handleFileChange}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
              {isConverting ? (
                <div className="pointer-events-none flex flex-col items-center py-4">
                  <Loader2 className="mb-4 h-12 w-12 animate-spin text-indigo-500" />
                  <p className="text-sm font-bold text-slate-600">고해상도 이미지(HEIC·HEIF) 변환 중…</p>
                </div>
              ) : selectedFile && isDicomLikeFile(selectedFile) ? (
                <div className="pointer-events-none max-w-md px-4 py-2 text-center text-xs font-semibold leading-relaxed text-slate-500">
                  DICOM(.dcm)은 이 화면에서 미리보기되지 않습니다. Step 3에서도 배경으로 그려지지 않습니다. JPG·PNG·WEBP
                  또는 MP4를 사용해 주세요.
                </div>
              ) : selectedFile && isTiffLikeFile(selectedFile) ? (
                <div className="pointer-events-none max-w-md px-4 py-2 text-center text-xs font-semibold leading-relaxed text-slate-500">
                  TIFF는 브라우저에서 미리보기되지 않을 수 있습니다. JPG·PNG·WEBP로 변환 후 업로드해 주세요.
                </div>
              ) : previewUrl && selectedFile && !isDicomLikeFile(selectedFile) && isBrowserPreviewVideo(selectedFile) ? (
                <div className="pointer-events-none py-2">
                  <video
                    src={previewUrl}
                    className="mx-auto max-h-40 rounded-lg shadow-md"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <p className="mt-3 text-sm font-bold text-slate-600">{selectedFile.name}</p>
                  <p className="mt-1 text-xs text-slate-400">HEIC, DICOM, JPG, PNG · MP4 등</p>
                </div>
              ) : previewUrl && selectedFile && !isDicomLikeFile(selectedFile) && !rasterPreviewFailed ? (
                <div className="pointer-events-none py-2">
                  <img
                    src={previewUrl}
                    alt="업로드 미리보기"
                    className="mx-auto max-h-40 rounded-lg object-contain shadow-md"
                    onError={() => setRasterPreviewFailed(true)}
                  />
                  <p className="mt-3 text-sm font-bold text-slate-600">{selectedFile.name}</p>
                  <p className="mt-1 text-xs text-slate-400">HEIC, DICOM, JPG, PNG · MP4 등</p>
                </div>
              ) : (
                <>
                  <UploadCloud
                    className={`mx-auto mb-3 h-14 w-14 ${selectedFile ? "text-green-500" : "text-indigo-400 opacity-50"}`}
                  />
                  <p className="text-sm font-bold text-slate-600">
                    {selectedFile ? selectedFile.name : "파일을 선택하거나 이 영역을 눌러 업로드"}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">HEIC, DICOM, JPG, PNG · MP4 등</p>
                </>
              )}
            </div>

            {fileError && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
                <div className="text-sm font-medium leading-relaxed">
                  <p className="mb-1 text-xs font-black uppercase tracking-wide text-rose-900">브라우저 미리보기 제한</p>
                  <p>{fileError}</p>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isConverting || patientsLoading || !selectedFile || !selectedPatient}
              onClick={handleStartAnalysis}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-5 text-lg font-black text-white shadow-md transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <BrainCircuit className="h-6 w-6 shrink-0" />
              {patientsLoading
                ? "환자 목록 불러오는 중…"
                : selectedPatient
                  ? `${selectedPatient.name} 님 차트에 귀속 · 스크리닝 분석 시작`
                  : "환자를 선택해 주세요"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-16 text-center animate-in fade-in duration-300">
          <Loader2 className="mx-auto mb-6 h-14 w-14 animate-spin text-indigo-600" />
          <h2 className="text-xl font-black text-slate-800">선택 부위·영상 기준 스크리닝 처리 중</h2>
          <p className="mt-3 text-sm text-slate-500">
            {selectedPatient ? (
              <>
                <span className="font-semibold text-slate-700">{selectedPatient.name}</span> ({selectedPatient.id}) 차트에
                귀속될 세션으로 처리 중입니다.
              </>
            ) : (
              "선택된 환자 정보를 불러오지 못했습니다."
            )}{" "}
            실서비스에서는 비전 API·EMR 저장으로 대체됩니다.
          </p>
        </div>
      )}

      {step === 3 && analysis && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="flex flex-col space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  AI 분석 히트맵 (Grad-CAM)
                </h2>
                <span className="flex items-center gap-1 rounded bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                  <AlertCircle className="h-3.5 w-3.5" />{" "}
                  {suppressDetailedResults ? "분석 제한: 재촬영 권고" : `스크리닝 일치도 ${analysis.confidence}%`}
                </span>
              </div>

              <div className="space-y-4">
                {showDicomExpertViewer && dicomVol ? (
                  <div className="grid grid-cols-1 gap-4 rounded-[2rem] border-[10px] border-slate-800 bg-slate-900 p-4 shadow-inner lg:grid-cols-12 lg:gap-6 lg:p-6">
                    <div className="flex flex-row items-center justify-between gap-4 border-slate-700/50 pb-4 lg:col-span-1 lg:flex-col lg:justify-between lg:border-r lg:pb-0 lg:pr-2 lg:pt-4">
                      <span className="hidden font-black uppercase tracking-widest text-indigo-400 lg:block lg:[writing-mode:vertical-rl] lg:text-[10px]">
                        Slice Selector
                      </span>
                      <div className="flex flex-1 flex-col items-center gap-3 lg:w-full">
                        <div className="flex h-36 w-full items-center justify-center lg:h-52">
                          <input
                            type="range"
                            min={0}
                            max={Math.max(0, dicomVol.totalSlices - 1)}
                            value={dicomSliceClamped}
                            onChange={(e) => setDicomSliceIndex(Number(e.target.value))}
                            aria-label="슬라이스 선택"
                            className="w-full max-w-[220px] cursor-pointer accent-indigo-500 lg:max-w-none lg:w-56 lg:-rotate-90"
                          />
                        </div>
                        <span className="font-black text-xs text-white">
                          {dicomSliceClamped + 1}/{dicomVol.totalSlices}
                        </span>
                      </div>
                    </div>

                    <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-3xl bg-black lg:col-span-11 lg:min-h-[560px]">
                      {/* 서버 정규화 픽셀: /api/dicom/render → SVG 스텁 또는 DICOM_RENDER_SERVICE_URL */}
                      <img
                        src={`/api/dicom/render?slice=${dicomSliceClamped}&mode=${encodeURIComponent(dicomWindowPreset)}&name=${encodeURIComponent(selectedFile?.name ?? "")}`}
                        className="h-full w-full object-contain opacity-95"
                        alt="DICOM 슬라이스"
                      />

                      {showHeatmap ? (
                        <>
                          <div
                            className="pointer-events-none absolute z-10 transition-all duration-300 ease-out"
                            style={{
                              top: `${dicomSliceCoords.y}%`,
                              left: `${dicomSliceCoords.x}%`,
                              width: "180px",
                              height: "180px",
                              transform: "translate(-50%, -50%)",
                              background: `radial-gradient(circle, rgba(225, 29, 72, ${heatmapOpacity / 100}) 0%, rgba(245, 158, 11, ${heatmapOpacity / 150}) 40%, transparent 70%)`,
                              mixBlendMode: "screen",
                            }}
                          />
                          <div
                            className="absolute z-20 rounded-lg border-2 border-dashed border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.5)] transition-all duration-300"
                            style={{
                              top: `${dicomSliceCoords.y}%`,
                              left: `${dicomSliceCoords.x}%`,
                              width: "100px",
                              height: "80px",
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            <div className="absolute -top-7 left-0 flex max-w-[min(280px,70vw)] items-center gap-1 rounded bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white shadow-lg">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                슬라이스 {dicomSliceClamped + 1} · {analysis.mainFinding}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : null}

                      <div className="absolute right-3 top-3 z-30 flex max-w-[calc(100%-1.5rem)] flex-wrap justify-end gap-2 sm:right-4 sm:top-4">
                        {(Object.entries(DICOM_VIEW_PRESETS) as [DicomWindowPresetKey, (typeof DICOM_VIEW_PRESETS)["LUMBAR_SOFT"]][]).map(
                          ([key, val]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setDicomWindowPreset(key)}
                              className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition-all ${
                                dicomWindowPreset === key
                                  ? "bg-indigo-600 text-white shadow-md"
                                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              {val.label}
                            </button>
                          ),
                        )}
                      </div>

                      {analysis.pixelSpacingMm != null && analysis.pixelSpacingMm > 0 ? (
                        <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex items-center gap-2 rounded-lg border border-white/25 bg-black/70 px-2.5 py-1.5 text-[10px] font-bold text-white/95 shadow-lg backdrop-blur-sm">
                          <span
                            className="inline-block h-3 w-14 rounded-sm bg-gradient-to-r from-white to-white/30 opacity-90"
                            aria-hidden
                          />
                          <span>스케일: 1 px ≈ {analysis.pixelSpacingMm} mm</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                <div className="relative flex h-[500px] items-center justify-center overflow-hidden rounded-3xl border border-slate-800 bg-black shadow-2xl">
                  {!selectedFile ? (
                    <div className="font-bold italic text-slate-500">No Scan Data</div>
                  ) : isDicomLikeFile(selectedFile) ? (
                    <div className="h-full w-full p-6">
                      <div className="flex h-full flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-700 bg-slate-900/50 text-center backdrop-blur-xl">
                        <Activity className="mb-4 h-12 w-12 animate-pulse text-indigo-400" aria-hidden />
                        <p className="text-lg font-black text-white">전문 판독용 데이터 로드됨</p>
                        <p className="mt-2 text-xs font-medium text-slate-400">
                          DICOM 원시 데이터 분석 모드로 전환되었습니다. 미리보기는 제한되며 결과·계측은 우측 패널에서 확인할 수
                          있습니다.
                        </p>
                      </div>
                    </div>
                  ) : !previewUrl ? (
                    <div className="max-w-md px-6 text-center text-sm font-semibold leading-relaxed text-slate-400">
                      미리보기 URL을 만들지 못했습니다. 다른 파일을 선택하거나 JPG·PNG·WEBP를 사용해 주세요.
                    </div>
                  ) : isBrowserPreviewVideo(selectedFile) ? (
                    <video
                      key={previewUrl}
                      src={previewUrl}
                      className="h-full w-full object-contain opacity-80"
                      controls
                      playsInline
                      muted
                      preload="metadata"
                    />
                  ) : rasterPreviewFailed ? (
                    <div className="max-w-md px-6 text-center text-sm font-semibold leading-relaxed text-slate-400">
                      브라우저가 이 파일을 이미지로 디코딩하지 못했습니다. HEIC·HEIF·일부 의료 포맷은 환경에 따라 실패할 수
                      있습니다. JPG·PNG·WEBP로 저장한 뒤 다시 업로드해 보세요.
                    </div>
                  ) : (
                    <img
                      key={previewUrl}
                      src={previewUrl}
                      alt="업로드된 스캔"
                      className="h-full w-full object-contain opacity-80"
                      onError={() => setRasterPreviewFailed(true)}
                    />
                  )}

                  {showHeatmap && (
                    <div
                      className="pointer-events-none absolute z-10 transition-all duration-500 ease-in-out"
                      style={{
                        top: analysis.heatmapPos.top,
                        left: analysis.heatmapPos.left,
                        width: "180px",
                        height: "180px",
                        transform: "translate(-50%, -50%)",
                        background: `radial-gradient(circle, rgba(225, 29, 72, ${heatmapOpacity / 100}) 0%, rgba(245, 158, 11, ${heatmapOpacity / 150}) 40%, transparent 70%)`,
                        mixBlendMode: "screen",
                      }}
                    />
                  )}

                  {showHeatmap && (
                    <div
                      className="absolute z-20 rounded-lg border-2 border-dashed border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.5)] transition-all duration-500"
                      style={{
                        top: analysis.heatmapPos.top,
                        left: analysis.heatmapPos.left,
                        width: "100px",
                        height: "80px",
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div className="absolute -top-7 left-0 flex items-center gap-1 rounded bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white shadow-lg">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span className="max-w-[220px] truncate">SCREENING: {analysis.mainFinding}</span>
                      </div>
                    </div>
                  )}

                  {analysis.pixelSpacingMm != null && analysis.pixelSpacingMm > 0 && (
                    <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex items-center gap-2 rounded-lg border border-white/25 bg-black/70 px-2.5 py-1.5 text-[10px] font-bold text-white/95 shadow-lg backdrop-blur-sm">
                      <span
                        className="inline-block h-3 w-14 rounded-sm bg-gradient-to-r from-white to-white/30 opacity-90"
                        aria-hidden
                      />
                      <span>
                        스케일: 1 px ≈ {analysis.pixelSpacingMm} mm
                      </span>
                    </div>
                  )}

                  {suppressDetailedResults ? (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-6 text-center">
                      <div className="max-w-md space-y-2 rounded-2xl border border-rose-300 bg-rose-50/95 p-5">
                        <p className="text-sm font-black text-rose-700">데이터 품질 저하로 상세 결과 노출이 제한됩니다.</p>
                        <p className="text-xs font-semibold text-rose-600">영상 해상도 확인 후 재촬영하거나 전문의 판독을 권고합니다.</p>
                      </div>
                    </div>
                  ) : null}
                </div>
                )}

                <div className="flex flex-col items-stretch gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-black shadow-sm transition-all ${
                      showHeatmap
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {showHeatmap ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    AI 히트맵 {showHeatmap ? "활성화" : "비활성화"}
                  </button>
                  <div className="flex flex-1 items-center gap-4 border-slate-100 sm:border-l sm:pl-6">
                    <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="w-12 shrink-0 text-xs font-bold text-slate-500">투명도</span>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={Math.max(10, heatmapOpacity)}
                      onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                      disabled={!showHeatmap}
                      className={`h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-100 accent-indigo-600 ${
                        !showHeatmap && "cursor-not-allowed opacity-50 grayscale"
                      }`}
                    />
                    <span className="w-8 shrink-0 text-right text-xs font-black text-indigo-600">
                      {Math.max(10, heatmapOpacity)}%
                    </span>
                  </div>
                </div>

                {!suppressDetailedResults && analysis.radiometric ? (
                  <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 p-6 shadow-sm">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.04]"
                      style={{
                        backgroundImage: "linear-gradient(90deg, #0f172a 1px, transparent 1px)",
                        backgroundSize: "10px 100%",
                      }}
                      aria-hidden
                    />
                    <div className="relative space-y-4">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                            Anatomical metric
                          </p>
                          <h4 className="text-lg font-black text-slate-800">{analysis.radiometric.targetLabel}</h4>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {analysis.radiometric.normalRangeText}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-4xl font-black ${
                              analysis.radiometric.severity === "serious"
                                ? "text-rose-600"
                                : analysis.radiometric.severity === "moderate"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                            }`}
                          >
                            {analysis.radiometric.valueMm}
                          </span>
                          <span className="ml-1 text-xl font-bold text-slate-400">mm</span>
                          <p className="mt-1 text-[11px] font-bold text-slate-500">
                            {analysis.radiometric.severityLabelKo}
                          </p>
                        </div>
                      </div>

                      <div className="relative h-4 rounded-full bg-slate-200 shadow-inner">
                        <div className="absolute inset-0 flex overflow-hidden rounded-full opacity-80">
                          <div className="h-full flex-[3] bg-rose-400/80" />
                          <div className="h-full flex-[2] bg-amber-400/80" />
                          <div className="h-full flex-[5] bg-emerald-400/80" />
                        </div>
                        <div
                          className="absolute top-1/2 z-10 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                          style={{ left: `${analysis.radiometric.rulerPositionPct}%` }}
                        />
                      </div>

                      {analysis.quantCorrelationNote ? (
                        <p className="text-xs font-semibold leading-relaxed text-slate-600">
                          {analysis.quantCorrelationNote}
                        </p>
                      ) : null}

                      <p className="flex items-start gap-2 text-sm font-bold text-slate-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                        {analysis.radiometric.deviationText}
                      </p>
                    </div>
                  </div>
                ) : null}

                {!suppressDetailedResults && analysis.preciseMeasurements && analysis.preciseMeasurements.length > 0 ? (
                  <PreciseMeasurementReport
                    measurements={analysis.preciseMeasurements}
                    grade={analysis.preciseReliabilityGrade ?? "REFERRAL_ONLY"}
                  />
                ) : null}
              </div>

              {!suppressDetailedResults ? (
                <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">
                    상세 지표/교차 검증 보기
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Imaging metrics</p>
                      <div className="space-y-2">
                        {analysis.evidenceList.map((m, idx) => (
                          <div
                            key={`${m.name}-${idx}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm"
                          >
                            <span className="font-semibold text-slate-600">{m.name}</span>
                            <div className="text-right">
                              <span className="text-lg font-bold text-rose-600">
                                {m.value}
                                {m.unit}
                              </span>
                              <span className="block text-[10px] text-slate-400">참고 정상: {m.normal}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
                      <h3 className="mb-2 text-sm font-bold text-indigo-900">임상 교차 검증 (Cross-check)</h3>
                      <p className="text-sm leading-relaxed text-indigo-800">
                        <strong className="text-indigo-950">{analysis.patientName}</strong> 님(
                        {analysis.patientId}) 차트 · 차트 초점 <strong>{analysis.chartFocusTag}</strong>와 영상 기반{" "}
                        <strong className="font-extrabold text-indigo-900">{analysis.partName}</strong> 평가,{" "}
                        <strong className="text-rose-600">{analysis.mainFinding}</strong> 스크리닝 요지를 함께 참고할 수
                        있습니다.
                      </p>
                    </div>
                  </div>
                </details>
              ) : null}
            </div>

            <div className="flex flex-col gap-6 lg:col-span-5">
              {expertRiskGuidance ? (
                <div className="relative space-y-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl">
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-transparent"
                    aria-hidden
                  />

                  <AnalysisDisclaimer />

                  {analysis.confidenceMetrics.grade === "C" ? (
                    <div className="flex items-center gap-2 rounded-2xl bg-rose-100 p-4 text-sm font-black text-rose-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      데이터 품질 저하: 재촬영 또는 전문의 판독을 권고합니다.
                    </div>
                  ) : null}

                  <div className="relative flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white">
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-indigo-300">
                        Reliability (AUC/Sensitivity)
                      </p>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-3xl font-black">{analysis.confidenceMetrics.score}%</span>
                        <span className="text-xs font-bold text-slate-300">
                          Grade {analysis.confidenceMetrics.grade} · Sensitivity{" "}
                          {Math.round(analysis.confidenceMetrics.sensitivity * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                          analysis.isCalibrated ? "bg-emerald-500 text-white" : "bg-slate-500 text-white"
                        }`}
                      >
                        {analysis.isCalibrated ? "CALIBRATED (mm)" : "RELATIVE (pixel)"}
                      </span>
                      <p className="mt-2 text-[10px] font-semibold text-slate-300">
                        표시 정합: {analysis.correlationScore}% · 차트 교차 검토 권장
                      </p>
                    </div>
                  </div>

                  {guardData ? <ClinicalGuardrailUI guardData={guardData} /> : null}

                  <details className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-600">
                      전문가 상세 가이드 펼치기
                    </summary>
                    <div className="mt-4 space-y-4">
                      <div className="relative space-y-2">
                        <h4 className="flex items-center gap-2 text-sm font-black uppercase text-slate-800">
                          <BrainCircuit className="h-4 w-4 shrink-0 text-rose-500" aria-hidden />
                          스크리닝 감별 평가 후보
                        </h4>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Clinical Screening &amp; Differential Evaluation
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {expertRiskGuidance.differentialEvaluationCandidates.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="relative rounded-3xl border border-slate-200 border-l-[6px] border-l-amber-400 bg-white p-6">
                        <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-slate-400">
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                          불확실성 · 영상 해석 한계
                        </p>
                        <p className="text-sm font-medium italic leading-relaxed text-slate-600">
                          {expertRiskGuidance.uncertaintyNote}
                        </p>
                      </div>

                      <div className="relative rounded-3xl bg-slate-900 p-6 text-white">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-emerald-400">
                          Recommended next step (PT)
                        </p>
                        <p className="text-sm leading-relaxed text-slate-200">{expertRiskGuidance.nextAction}</p>
                      </div>
                    </div>
                  </details>

                  <QualityFeedbackModule
                    aiData={{
                      metrics: [
                        {
                          physical_val: Number(
                            analysis.preciseMeasurements?.[0]?.physical_val ?? Number(analysis.evidenceList[0]?.value ?? 0),
                          ),
                        },
                      ],
                    }}
                    loading={isTransferLoading}
                    onFinalize={(payload) => void handleSoapTransfer(payload)}
                  />

                  <MedicalDisclaimer />
                </div>
              ) : null}

              <details className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <summary className="cursor-pointer text-xs font-bold text-slate-500">
                  추가 피드백 도구 (기각/수정/승인)
                </summary>
                <div className="mt-4 space-y-4">
                  <h4 className="mb-1 text-xs font-bold text-slate-500">스크리닝 결과 피드백 및 SOAP 이관</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleExport("reject")}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-3 text-rose-600 shadow-sm transition hover:bg-rose-100"
                    >
                      <span className="text-xl">👎</span>
                      <span className="text-[11px] font-bold">기각 (재평가)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("modify")}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-3 text-amber-700 shadow-sm transition hover:bg-amber-100"
                    >
                      <span className="text-xl">✍️</span>
                      <span className="text-[11px] font-bold">수정 후 이관</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("accept")}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-indigo-700 shadow-sm transition hover:bg-indigo-100"
                    >
                      <span className="text-xl">👍</span>
                      <span className="text-[11px] font-bold">그대로 이관</span>
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-400">
                    선택하신 피드백은 기존 SOAP 노트에 영향을 주지 않으며,
                    <br />
                    모델 고도화를 위한 학습 데이터로 분리 저장됩니다.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
