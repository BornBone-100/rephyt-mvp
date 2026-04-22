/** JOSPT TBC 칩 라벨 + 진단 기준(Inclusion) 요약 */
export type JosptTbcItem = { label: string; description: string };

// JOSPT 임상진료지침(CPG) 기반 치료 기반 분류(TBC) 마스터 데이터
export const JOSPT_TBC_DB: Record<string, JosptTbcItem[]> = {
  neck: [
    {
      label: "가동성 결함 (Mobility Deficits)",
      description:
        "경추 주관절·척추 가동범위 제한이 주 증상이고, 방향 특이적 재현 운동에서 증상·가동성 변화가 관찰될 때 선택합니다.",
    },
    {
      label: "운동 조절 결함 (Movement Coordination Impairments / WAD)",
      description:
        "가속도 손상(WAD) 병력과 함께 경부 통제·지지 전략 저하, 두통·경부통이 머리 거상·점진적 운동과 연관될 때 선택합니다.",
    },
    {
      label: "경성 두통 (Cervicogenic Headache)",
      description:
        "두통이 경추 자세·운동과 시간적으로 연관되고, 경부 압배·수동 검사에서 재현되며 상지 방사보다 경부 기원이 우세할 때 선택합니다.",
    },
    {
      label: "방사통 (Radiating Pain)",
      description:
        "상지 방사통·감각 이상이 신경근 분포와 일치하고, Spurling 등 신경 긴장 시험에서 증상이 재현될 때 선택합니다.",
    },
  ],
  shoulder: [
    {
      label: "점액낭/회전근개 병변 (Subacromial Pain Syndrome)",
      description:
        "어깨 외전 시 통증 호(Painful arc)가 있고, Neer/Hawkins 등 충돌 시험이 양성이며 회전근개·점액낭 병변을 시사할 때 선택합니다.",
    },
    {
      label: "유착성 관절낭염 (Adhesive Capsulitis)",
      description:
        "견관절 관절낭의 단계적 가동 제한(특히 외회전·외전)이 두드러지고, 통증 이후 제한 패턴이 전형적일 때 선택합니다.",
    },
    {
      label: "관절 불안정성 (Shoulder Instability)",
      description:
        "탈구·반탈구 병력, 공포감(Apprehension), 불안정성 시험 양성 등으로 전방·하방 불안정이 의심될 때 선택합니다.",
    },
    {
      label: "견갑골 운동이상증 (Scapular Dyskinesia)",
      description:
        "상지 거상·투구 동작 시 견갑골 비대칭·각도 이상, 견갑 흉곽 리듬 장애가 관찰되고 증상과 연관될 때 선택합니다.",
    },
  ],
  elbow: [
    {
      label: "외측 상과염 (Lateral Epicondylalgia / Tennis Elbow)",
      description:
        "외측 상과 부착부 압통, 손목 신전·중지 신전 반복 시 통증 재현, Cozen 등 시험 양성일 때 선택합니다.",
    },
    {
      label: "내측 상과염 (Medial Epicondylalgia)",
      description:
        "내측 상과 부착부 압통, 손목 굴곡·전완 회내 시 통증 악화, Valgus stress와 연관된 과부하 병력이 있을 때 선택합니다.",
    },
    {
      label: "인대 불안정성 (Ligament Instability)",
      description:
        "외반·내반 스트레스 시 통증·이완감, 변형 후 관절 유동성 증가 등 인대 손상·불안정 소견이 있을 때 선택합니다.",
    },
  ],
  wrist: [
    {
      label: "수근관 증후군 (Carpal Tunnel Syndrome)",
      description:
        "정중신경 분포 감각 이상·야간 통증, Phalen/Tinel 양성, 임상적으로 압박성 신경병증이 의심될 때 선택합니다.",
    },
    {
      label: "건병증 및 건막염 (Tendinopathy / De Quervain's)",
      description:
        "척측 손목·건초 부위 압통, 엄지 수지 굴곡·요골 편위 시 통증(Finkelstein 양성 등)으로 건 과부하가 명확할 때 선택합니다.",
    },
    {
      label: "삼각섬유연골 복합체 손상 (TFCC Lesion)",
      description:
        "척측 손목 통증·클릭, 선회·파지 시 악화, TFCC 스트레스·운동 시험에서 재현될 때 선택합니다.",
    },
  ],
  hand: [
    {
      label: "수지 관절염 (Hand Osteoarthritis)",
      description:
        "CMC·DIP 등 변형·압통, 조영 운동 시 통증, 방사선상 퇴행 소견과 임상이 부합할 때 선택합니다.",
    },
    {
      label: "방아쇠 수지 (Trigger Finger)",
      description:
        "굴근 건 쪽 촉지 결절, 수지 굴곡 시 걸림·타격감(Triggering), 굴곡 유지 시 통증이 있을 때 선택합니다.",
    },
    {
      label: "수지 인대 손상 (Digit Sprain)",
      description:
        "외상 후 수지 부종·압통, 부측·주관절 불안정성 시험에서 인대 손상이 의심될 때 선택합니다.",
    },
  ],
  lumbar: [
    {
      label: "가동성 결함 / 도수치료 카테고리 (Manipulation Category)",
      description:
        "요추 세그먼트 가동 제한·비대칭, 고속 저진폭 시술 시 통증·가동성 즉각 개선 등 도수 반응이 있을 때 선택합니다.",
    },
    {
      label: "운동 조절 결함 / 안정화 카테고리 (Stabilization Category)",
      description:
        "반복 동작·장시간 자세에서 요부 통증, 심부근 제어 저하·불안정 패턴이 주 문제일 때 선택합니다.",
    },
    {
      label: "방향 특이성 / 특정 운동 카테고리 (Directional Preference)",
      description:
        "전굴·후굴 등 특정 방향 반복 시 증상 중심화·외측화 변화가 나타나 방향 특이적 운동에 반응할 때 선택합니다.",
    },
    {
      label: "방사통 / 견인 카테고리 (Traction Category)",
      description:
        "하지 방사통·신경 증상이 신경성 기전을 시사하고, 견인·신경 활주 시 증상 완화가 기대될 때 선택합니다.",
    },
  ],
  hip: [
    {
      label: "고관절 관절염 (Hip Osteoarthritis)",
      description:
        "고관절 주변 통증·조영 제한, 보행 시 악화, 방사선·임상적으로 퇴행성 관절염이 의심될 때 선택합니다.",
    },
    {
      label: "비관절성 고관절 통증 (Nonarthritic Hip Pain / FAI)",
      description:
        "고관절 충돌 징후(FADIR 등), 젊은 활동층의 전방·고관절 통증, 내회전·굴곡 시 악화가 있을 때 선택합니다.",
    },
    {
      label: "대전자 통증 증후군 (Greater Trochanteric Pain Syndrome)",
      description:
        "대전자 부위 압통, 측와위 시 악화, 외전근 건·과막 통증이 주 증상일 때 선택합니다.",
    },
  ],
  knee: [
    {
      label: "반월상 및 관절 연골 병변 (Meniscal / Articular Cartilage)",
      description:
        "관절선 부종·기계적 걸림·잠김, 맥머리·회전 시험 양성 등 반월상·연골 병변이 의심될 때 선택합니다.",
    },
    {
      label: "인대 손상 및 불안정성 (Ligament Sprain / ACL, PCL, MCL)",
      description:
        "급·만성 외상 병력, 전방·내·외측 불안정 시험(Lachman 등) 양성으로 인대 손상이 의심될 때 선택합니다.",
    },
    {
      label: "슬개대퇴 통증 증후군 (Patellofemoral Pain)",
      description:
        "계단·쪼그려 앉기 시 앞무릎 통증, 슬개 압배·패텔라 추적 이상, 점프 시 악화가 있을 때 선택합니다.",
    },
    {
      label: "무릎 관절염 (Knee Osteoarthritis)",
      description:
        "만성 관절 부종·조영 제한, 내외반 변형·방사선 퇴행 소견과 일치하는 퇴행성 무릎 통증일 때 선택합니다.",
    },
  ],
  ankle: [
    {
      label: "급성 발목 염좌 (Acute Ankle Sprain / Ligamentous)",
      description:
        "요골·전방·후방 탈구 외상 후 외측 부종·압통, 전방 추진 시험 등에서 급성 인대 손상이 의심될 때 선택합니다.",
    },
    {
      label: "만성 발목 불안정성 (Chronic Ankle Instability)",
      description:
        "반복 염좌 병력, 외측 불안정·자세 흔들림, Star excursion 등에서 기능 저하가 있을 때 선택합니다.",
    },
    {
      label: "아킬레스 건병증 (Achilles Tendinopathy)",
      description:
        "건체 부위 압통·아침 경직, Single-leg heel raise 시 통증, 점진적 부하 시 반응이 전형적일 때 선택합니다.",
    },
  ],
  foot: [
    {
      label: "족저근막염 / 발뒤꿈치 통증 (Plantar Fasciitis / Heel Pain)",
      description:
        "기상 첫 보행 시 족저 통증, 내측 종골 부착부 압통, Windlass 시험 양성 등이 있을 때 선택합니다.",
    },
    {
      label: "후경골근 기능 부전 (Posterior Tibial Tendon Dysfunction)",
      description:
        "내측 족관절 통증·부종, 편평족 진행, 단일 발 들기 시 후경골근 약화가 있을 때 선택합니다.",
    },
    {
      label: "지간 신경종 (Morton's Neuroma)",
      description:
        "전족부 화끈거림·이물감, 좁은 신발에서 악화, 지간 압배 시 재현되는 신경압박 소견이 있을 때 선택합니다.",
    },
  ],
};

/** 부위 키에 맞는 TBC 목록. DB에 없을 때만 폴백 라벨을 사용합니다. */
export function getTbcOptionsForRegion(regionKey: string, fallbackLabels: string[] | undefined): JosptTbcItem[] {
  const list = JOSPT_TBC_DB[regionKey as keyof typeof JOSPT_TBC_DB];
  if (list?.length) return list;
  return (fallbackLabels ?? []).map((label) => ({
    label,
    description:
      "JOSPT CPG의 임상·검사 소견과 일치할 때 선택하세요. 세부 inclusion 기준은 해당 질환 CPG를 참고하세요.",
  }));
}

// JOSPT 기준 부위별 핵심 기능 평가 척도 (Outcome Measures)
export const JOSPT_OUTCOME_DB: Record<string, { id: string; name: string; max: number; unit: string }[]> = {
  neck: [{ id: "ndi", name: "NDI (경추 장애 지수)", max: 100, unit: "%" }],
  shoulder: [
    { id: "spadi", name: "SPADI (어깨 통증/장애 지수)", max: 100, unit: "점" },
    { id: "quickdash", name: "QuickDASH (상지 기능 평가)", max: 100, unit: "점" },
  ],
  elbow: [{ id: "prtee", name: "PRTEE (테니스 엘보우 평가)", max: 100, unit: "점" }],
  wrist: [{ id: "prwe", name: "PRWE (손목 평가)", max: 100, unit: "점" }],
  hand: [{ id: "mhq", name: "MHQ (미시간 수부 평가)", max: 100, unit: "점" }],
  lumbar: [{ id: "odi", name: "ODI (요추 장애 지수)", max: 100, unit: "%" }],
  hip: [
    { id: "hoos", name: "HOOS (고관절 기능 평가)", max: 100, unit: "점" },
    { id: "lefs", name: "LEFS (하지 기능 척도)", max: 80, unit: "점" },
  ],
  knee: [
    { id: "koos", name: "KOOS (슬관절 기능 평가)", max: 100, unit: "점" },
    { id: "lysholm", name: "Lysholm Score (인대/반월상 평가)", max: 100, unit: "점" },
  ],
  ankle: [{ id: "faam", name: "FAAM (발목 기능 평가)", max: 100, unit: "%" }],
  foot: [{ id: "ffi", name: "FFI (족부 기능 지수)", max: 100, unit: "점" }],
};

export const JOSPT_ICF_DB: Record<string, { impairment: string[]; activity: string[]; participation: string[] }> = {
  neck: {
    impairment: ["경추 ROM(가동범위) 제한", "심부굴곡근 약화", "경추-흉추 연쇄 움직임 손상", "상지 방사통 및 감각 저하"],
    activity: ["고개 돌리기(운전 등) 제한", "장시간 컴퓨터 모니터 주시 곤란", "머리 위로 쳐다보기 통증"],
    participation: ["수면 장애 (야간통)", "사무직 직무 수행 능력 저하", "독서 및 여가 활동 제약"],
  },
  shoulder: {
    impairment: ["관절낭 패턴 가동성 제한", "회전근개 근력 약화 및 조절 부전", "견갑골 하방회전 증후군", "상완골 전방 활주 증후군"],
    activity: ["머리 위로 팔 올리기(Overhead) 불가", "등 뒤로 손 뻗기 제한", "무거운 물건 들기 및 밀기 통증"],
    participation: ["오버헤드 스포츠(테니스, 수영 등) 불가", "상의 탈의 등 일상생활(ADL) 의존도 증가", "육아(아이 안기) 곤란"],
  },
  elbow: {
    impairment: ["주관절 신전 제한", "악력(Grip strength) 저하", "신전근/굴곡근 힘줄 압통"],
    activity: ["물건 쥐고 비틀기(걸레 짜기) 통증", "문고리 돌리기 제한", "타이핑 시 통증"],
    participation: ["라켓 스포츠 참여 불가", "수작업 직무(목수, 요리사 등) 제약", "가사 노동 제약"],
  },
  wrist: {
    impairment: ["수관절 배측/장측 굴곡 제한", "수근관 내 신경 활주 저하", "척골 변위(Ulnar variance) 손상"],
    activity: ["바닥 짚고 일어서기 통증", "무거운 프라이팬 들기 불가", "마우스/키보드 장시간 사용 곤란"],
    participation: ["컴퓨터 관련 직무 중단", "체조/웨이트 트레이닝 제약", "수유 및 아이 안기 곤란"],
  },
  hand: {
    impairment: ["수지 관절 가동성 제한", "핀치 력(Pinch grip) 저하", "손가락 굴근건 활주 제한"],
    activity: ["단추 꿰기, 젓가락질 곤란", "스마트폰 조작 시 통증", "펜 쥐고 글씨 쓰기 제한"],
    participation: ["정밀 수작업(치과의사, 미용사 등) 불가", "악기 연주(피아노, 기타) 제약", "독립적인 식사 제약"],
  },
  lumbar: {
    impairment: ["요추부 굴곡/신전 ROM 제한", "체간 코어 근육 활성화 지연", "하지 방사통 및 신경학적 징후", "골반 비대칭 및 천장관절 기능부전"],
    activity: ["바닥에서 무거운 물건 들기 불가", "오래 앉아있기 곤란", "아침 기상 시 허리 펴기 힘듦"],
    participation: ["장거리 운전 불가", "골프/축구 등 회전 스포츠 제약", "무거운 장비 착용 직무 제약"],
  },
  hip: {
    impairment: ["고관절 내회전/신전 가동성 제한", "고관절 외전근(중둔근) 근력 약화", "대퇴직근 단축"],
    activity: ["의자에서 일어서기 곤란", "양말 신기/발톱 깎기 제한", "계단 오르기 통증"],
    participation: ["장거리 보행 및 하이킹 불가", "쪼그려 앉는 직무(농업 등) 제약", "보행 보조기 의존 증가"],
  },
  knee: {
    impairment: ["슬관절 굴곡/신전 제한", "대퇴사두근 억제(AMI) 및 근위축", "슬개골 활주 제한", "관절 내 부종"],
    activity: ["계단 내려가기 통증 심화", "쪼그려 앉기(Squat) 불가", "방향 전환(Pivoting) 시 불안정성"],
    participation: ["마라톤/러닝 스포츠 중단", "구기 종목(축구, 농구) 복귀 지연", "육체 노동 직무 제약"],
  },
  ankle: {
    impairment: ["족관절 배측굴곡(DF) 제한", "비골근 반응 시간 지연", "발목 고유수용성 감각 저하"],
    activity: ["오르막/내리막 걷기 통증", "까치발 서기 불가", "불균형한 지면 보행 시 불안정성"],
    participation: ["점프 스포츠(배구, 농구) 불가", "장시간 서있는 직무(교사, 승무원) 제약", "등산 불가"],
  },
  foot: {
    impairment: ["발의 내재근(Intrinsic muscle) 약화", "거골하 관절 엎침(Pronation) 증가", "족저근막 유연성 저하"],
    activity: ["아침 첫 발 내디딜 때 통증", "장시간 보행 시 발바닥 피로", "맨발 걷기 곤란"],
    participation: ["러닝/조깅 제약", "군인/경찰 등 행군 직무 제약", "일반적인 신발 착용 곤란"],
  },
};
