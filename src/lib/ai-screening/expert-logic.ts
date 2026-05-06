/**
 * 전문가 판단 지원 · 리스크 관리 (스크리닝 관점)
 * UI·카피는 진단 단정이 아닌 감별 평가 후보·불확실성·다음 행동 권고로 유지합니다.
 */

export type ExpertRiskGuidance = {
  /** 영상·모델 한계에 대한 정직한 불확실성 안내 */
  uncertaintyNote: string;
  /** 스크리닝 차원에서 교차 검토할 감별 평가 후보(Clinical Screening & Differential Evaluation) */
  differentialEvaluationCandidates: string[];
  /** 물리치료 관점 권장 검사·행동 */
  nextAction: string;
};

const DEFAULT_GUIDANCE: ExpertRiskGuidance = {
  uncertaintyNote:
    "단일 영상·단면 정보와 자동 스크리닝 표현만으로는 개인차·촬영 조건에 따른 오차가 있을 수 있습니다. 임상 평가와 병행해 해석하세요.",
  differentialEvaluationCandidates: ["인접 부위 연관 패턴", "기능적 제한의 비영상적 요인"],
  nextAction:
    "VAS·ROM·부하 시험 등 정직한 계측 데이터를 영상 스크리닝 요지와 교차 확인하고, 필요 시 담당 전문가 협진을 검토하세요.",
};

const BY_PART: Partial<Record<string, ExpertRiskGuidance>> = {
  SHOULDER: {
    uncertaintyNote:
      "초음파 등 표면 중심 영상에서는 심부 인대·연부 조직의 미세 변화가 과소·과대평가될 수 있습니다.",
    differentialEvaluationCandidates: ["경추 신경근 기능 평가 관점", "석회 침착·건 과부하 패턴 스크리닝"],
    nextAction: "Neer·Hawkins-Kennedy 등 검사와 통증 재현 패턴을 영상 소견과 함께 정리하는 것을 권장합니다.",
  },
  LUMBAR: {
    uncertaintyNote:
      "MRI·CT 단면 간격·창 설정에 따라 미세한 추간 변화가 드러나지 않거나 과장될 수 있습니다.",
    differentialEvaluationCandidates: ["천장관절 기능 평가 관점", "고관절·이상근 관련 기능 패턴 스크리닝"],
    nextAction: "하지 직거상(SLR) 등 신경인장 검사와 영상 계측값의 방향성 일치 여부를 확인하는 것이 좋습니다.",
  },
};

export function getExpertRiskGuidance(partKey: string): ExpertRiskGuidance {
  return BY_PART[partKey] ?? DEFAULT_GUIDANCE;
}
