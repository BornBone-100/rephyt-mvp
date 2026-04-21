// JOSPT 임상진료지침(CPG) 기반 치료 기반 분류(TBC) 마스터 데이터
export const JOSPT_TBC_DB: Record<string, string[]> = {
  neck: [
    "가동성 결함 (Mobility Deficits)",
    "운동 조절 결함 (Movement Coordination Impairments / WAD)",
    "경성 두통 (Cervicogenic Headache)",
    "방사통 (Radiating Pain)",
  ],
  shoulder: [
    "점액낭/회전근개 병변 (Subacromial Pain Syndrome)",
    "유착성 관절낭염 (Adhesive Capsulitis)",
    "관절 불안정성 (Shoulder Instability)",
    "견갑골 운동이상증 (Scapular Dyskinesia)",
  ],
  elbow: [
    "외측 상과염 (Lateral Epicondylalgia / Tennis Elbow)",
    "내측 상과염 (Medial Epicondylalgia)",
    "인대 불안정성 (Ligament Instability)",
  ],
  wrist: [
    "수근관 증후군 (Carpal Tunnel Syndrome)",
    "건병증 및 건막염 (Tendinopathy / De Quervain's)",
    "삼각섬유연골 복합체 손상 (TFCC Lesion)",
  ],
  hand: ["수지 관절염 (Hand Osteoarthritis)", "방아쇠 수지 (Trigger Finger)", "수지 인대 손상 (Digit Sprain)"],
  lumbar: [
    "가동성 결함 / 도수치료 카테고리 (Manipulation Category)",
    "운동 조절 결함 / 안정화 카테고리 (Stabilization Category)",
    "방향 특이성 / 특정 운동 카테고리 (Directional Preference)",
    "방사통 / 견인 카테고리 (Traction Category)",
  ],
  hip: [
    "고관절 관절염 (Hip Osteoarthritis)",
    "비관절성 고관절 통증 (Nonarthritic Hip Pain / FAI)",
    "대전자 통증 증후군 (Greater Trochanteric Pain Syndrome)",
  ],
  knee: [
    "반월상 및 관절 연골 병변 (Meniscal / Articular Cartilage)",
    "인대 손상 및 불안정성 (Ligament Sprain / ACL, PCL, MCL)",
    "슬개대퇴 통증 증후군 (Patellofemoral Pain)",
    "무릎 관절염 (Knee Osteoarthritis)",
  ],
  ankle: [
    "급성 발목 염좌 (Acute Ankle Sprain / Ligamentous)",
    "만성 발목 불안정성 (Chronic Ankle Instability)",
    "아킬레스 건병증 (Achilles Tendinopathy)",
  ],
  foot: [
    "족저근막염 / 발뒤꿈치 통증 (Plantar Fasciitis / Heel Pain)",
    "후경골근 기능 부전 (Posterior Tibial Tendon Dysfunction)",
    "지간 신경종 (Morton's Neuroma)",
  ],
};

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
