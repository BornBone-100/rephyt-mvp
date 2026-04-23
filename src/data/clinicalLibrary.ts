export interface ClinicalData {
  id: string;
  category: string;
  title: string;
  summary: string;
  tags: string[];
  content_md: string;
  updatedAt: string;
}

const baseClinicalLibraryData: ClinicalData[] = [
  // 🟢 [경추] 데이터
  {
    id: "cervical-1",
    category: "경추",
    title: "경추 신경근병증 (Cervical Radiculopathy) 감별 클러스터",
    summary: "Wainner의 임상예측규칙(CPR)을 활용한 신경근병증 정확도 99% 감별법",
    tags: ["신경근병증", "CPR", "ULTT", "Spurling"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Wainner의 임상예측규칙(CPR). 
1) Upper Limb Tension Test (A) 
2) Spurling Test 
3) Distraction Test 
4) 경추 회전 60도 미만
**4개 모두 양성 시 특이도 99%**로 확진 가능합니다.

### 2. 평가 및 중재 프로토콜
- 민감도가 높은 **ULTT로 먼저 Rule-out**을 진행합니다.
- 이후 **Spurling과 Distraction으로 Rule-in** 합니다.

> **💡 20년 차 임상 팁**
> Distraction 시 견갑골을 고정하지 않고 무작정 머리만 당기면 효과가 없습니다. 환자의 턱을 가볍게 당긴(Tuck) 상태에서 후두골을 잡고 상방 견인해야 진짜 신경근 압박이 풀립니다.
    `,
  },
  {
    id: "cervical-2",
    category: "경추",
    title: "상부 경추 불안정성 (Upper Cervical Instability) 레드플래그",
    summary: "류마티스, 다운증후군, 교통사고 환자의 상부 경추 인대 손상 감별",
    tags: ["레드플래그", "Sharp-Purser", "교통사고"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
류마티스 관절염, 다운증후군 환자에게 흔한 횡인대(Transverse lig.) 및 익상인대(Alar lig.) 손상 위험이 있습니다.

### 2. 평가 및 중재 프로토콜
- **Sharp-Purser Test 시행:** 경추 굴곡 시 증상 발생, 후방 병진 시 '덜컹'하며 증상 감소 여부 확인.

> **💡 20년 차 임상 팁**
> 교통사고(Whiplash) 직후 환자에게 함부로 가동범위 검사부터 하지 마세요. 입술 주변 저림이나 연하곤란(삼킴 장애)이 있다면 묻지도 따지지도 않고 엑스레이(Open mouth view)부터 찍게 해야 합니다.
    `,
  },
  {
    id: "cervical-3",
    category: "경추",
    title: "경추동맥 기능부전 (VBI) 레드플래그",
    summary: "경추 수기치료 전 반드시 확인해야 할 뇌허혈 증상 5D 감별법",
    tags: ["VBI", "뇌허혈", "수기치료금기"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
경추 신전 및 회전 시 추골동맥(Vertebral Artery) 압박으로 인한 뇌허혈 증상 
*(5D: Dizziness, Drop attacks, Diplopia, Dysarthria, Dysphagia)*

### 2. 평가 및 중재 프로토콜
- 수기치료 전 앉은 자세에서 경추 능동 신전+회전 상태 10초 유지
- 안구진탕(Nystagmus) 및 대화 가능 여부 확인.

> **💡 20년 차 임상 팁**
> 검사할 때 환자에게 계속 숫자를 세게 하거나 말을 걸어야 합니다. 환자가 갑자기 발음이 어눌해지거나 눈동자가 튀는(진탕) 증상이 나오면 경추 도수치료는 절대 금기입니다.
    `,
  },
  {
    id: "cervical-4",
    category: "경추",
    title: "경추성 두통 (Cervicogenic Headache)",
    summary: "상부 경추 후관절 문제로 인한 두통 감별 및 SNAGs 적용",
    tags: ["두통", "FRT", "SNAGs", "상부경추"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
두통의 원인이 경추 상부(C1-C3) 후관절 및 인대에 있는 경우. **Flexion-Rotation Test(FRT) 양성.**

### 2. 평가 및 중재 프로토콜
- 최대 경추 굴곡 상태에서 좌우 회전 각도 비교 (정상 45도, 10도 이상 차이 나면 양성). 
- C1-C2 SNAGs 적용.

> **💡 20년 차 임상 팁**
> 편두통(안구 뒤쪽 통증, 빛 번짐)과 헷갈리지 마세요. 경추성 두통은 후두부에서 시작해 눈썹 위로 올라오며, 목의 움직임이나 특정 자세(거북목)에 의해 통증이 유발/악화되는 특징이 명확합니다.
    `,
  },
  {
    id: "cervical-5",
    category: "경추",
    title: "심부 경추 굴곡근 (DNF) 지구력 평가",
    summary: "만성 목 통증 환자의 SCM 과활성화 및 심부 근육 약화 평가",
    tags: ["JOSPT", "CCFT", "가동성결함"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
JOSPT 가이드라인. 만성 목 통증 환자는 표면 근육(SCM, 사각근) 과활성화 및 DNF(경장근, 두장근) 약화가 필수적으로 동반됨.

### 2. 평가 및 중재 프로토콜
- **Craniocervical Flexion Test (CCFT):** 턱을 당긴 채 머리를 2.5cm 들고 버티는 시간 측정 (정상 성인 남성 평균 38초, 여성 29초).

> **💡 20년 차 임상 팁**
> 버티라고 할 때 환자의 턱이 자꾸 들린다면(Chin poke) 이미 DNF는 풀리고 SCM으로 버티는 겁니다. 즉시 시간을 멈추고 거기가 그 환자의 한계점임을 인지시켜야 합니다.
    `,
  },

  // 🔵 [요추] 데이터
  {
    id: "lumbar-1",
    category: "요추",
    title: "요추 수기치료 (Manipulation) CPR 코호트",
    summary: "Flynn의 요추 수기치료 성공을 위한 5가지 예측 규칙",
    tags: ["수기치료", "CPR", "요추골반"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Flynn의 요추 수기치료 성공을 위한 5가지 예측 규칙. 
1) 최근 16일 이내 발병 
2) 무릎 아래 방사통 없음 
3) FABQ 점수 19점 미만 
4) 요추 분절 저운동성 
5) 고관절 내회전 35도 이상.
**4개 이상 충족 시 성공률 95%.**

### 2. 평가 및 중재 프로토콜
- 해당 조건 충족 시 Supine 요추 골반 Thrust(SIJ manipulation) 1~2회 적용.

> **💡 20년 차 임상 팁**
> 허리 아픈 지 한 달이 넘었거나 발끝까지 저린 환자에게 뼈 소리(Cavitation) 내겠다고 허리 비틀지 마세요. CPR에 맞지 않는 환자에게 수기치료는 플라시보일 뿐, 예후를 바꾸지 못합니다.
    `,
  },
  {
    id: "lumbar-2",
    category: "요추",
    title: "특정 방향 선호 (Directional Preference, 멕켄지)",
    summary: "방사통의 중심화 현상(Centralization)을 활용한 방향 선호도 평가",
    tags: ["멕켄지", "중심화현상", "디스크"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
요통 환자의 약 70%는 특정 방향(주로 신전)으로 움직일 때 방사통이 척추 중심으로 모이는 중심화 현상(Centralization)을 보임.

### 2. 평가 및 중재 프로토콜
- 반복적인 엎드려 허리 펴기(Prone Press-up) 10회 시행 후 다리 저림의 위치 변화 확인.

> **💡 20년 차 임상 팁**
> 허리 통증은 심해져도 다리 저림이 발끝에서 종아리로 올라왔다면(Centralization) 치료가 아주 잘 되고 있는 겁니다. 환자에게 "허리가 더 아픈 건 신경이 뿌리 쪽으로 모이는 좋은 신호입니다"라고 미리 교육해야 환자가 도망가지 않습니다.
    `,
  },
  {
    id: "lumbar-3",
    category: "요추",
    title: "천장관절 (SI Joint) 통증 감별 클러스터",
    summary: "Laslett의 4가지 SIJ 도발 검사 클러스터링",
    tags: ["천장관절", "SIJ", "Laslett"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Laslett의 SIJ 통증 감별 4가지 검사 
(Distraction, Compression, Thigh Thrust, Sacral Thrust). **2개 이상 양성 시 특이도 78%.**

### 2. 평가 및 중재 프로토콜
- 허리 디스크(Centralization 부재)를 먼저 룰아웃한 뒤 SIJ 클러스터 검사 시행.

> **💡 20년 차 임상 팁**
> 천장관절 문제는 주로 편측성이고, PSIS(후상장골극) 주변을 손가락으로 정확히 짚을 수 있는 통증(Fortin finger sign)을 보입니다. 두루뭉술하게 아프다고 하면 요추 문제입니다.
    `,
  },
  {
    id: "lumbar-4",
    category: "요추",
    title: "척추 종양 및 감염 (Spinal Tumor/Infection) 레드플래그",
    summary: "비기계적 요통의 가장 위험한 원인 감별 및 야간통 확인",
    tags: ["레드플래그", "종양감염", "야간통"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
비기계적 요통(자세나 움직임과 무관한 통증)의 가장 위험한 원인.

### 2. 평가 및 중재 프로토콜
- 50세 이상, 과거 암 병력, 설명되지 않는 체중 감소, **야간통(침대에 누우면 더 아파서 잠을 깸)** 4가지 확인.

> **💡 20년 차 임상 팁**
> 야간통의 기준을 명확히 하세요. "자다가 뒤척일 때 아픈가요?"는 기계적 요통입니다. "가만히 누워있어도 통증이 맥박 뛰듯이 욱신거려서 잠을 아예 못 자나요?"가 암이나 감염을 시사하는 진짜 레드플래그입니다.
    `,
  },
  {
    id: "lumbar-5",
    category: "요추",
    title: "척추관 협착증 (Neurogenic Claudication) 감별",
    summary: "혈관성 파행과 신경인성 파행의 명확한 감별 테스트",
    tags: ["협착증", "신경인성파행", "자전거테스트"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
혈관성 파행(Vascular claudication)과 신경인성 파행의 감별이 핵심.

### 2. 평가 및 중재 프로토콜
- **자전거 타기 검사:** 자전거를 탈 때처럼 굽힌 자세에서는 오래 사이클링이 가능하지만, 서서 걸을 때는 얼마 못 가 다리가 저림.

> **💡 20년 차 임상 팁**
> 걷다가 다리가 터질 것 같을 때, 선 채로 가만히 쉬면 혈관성 파행이고, 반드시 쪼그려 앉거나 허리를 굽혀야(Shopping cart sign) 저림이 풀린다면 협착증(신경인성)입니다.
    `,
  },

  // 🟠 [어깨] 데이터
  {
    id: "shoulder-1",
    category: "어깨",
    title: "어깨 충돌증후군 (Impingement) 클러스터",
    summary: "Michener의 5가지 어깨 충돌증후군 검사 조합",
    tags: ["충돌증후군", "Hawkins-Kennedy", "EmptyCan"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Michener의 5가지 검사 (Hawkins-Kennedy, Neer, Painful Arc, Empty Can, External Rotation Resistance). **3개 이상 양성 시 충돌증후군 가능성 매우 높음.**

### 2. 평가 및 중재 프로토콜
- 하나만 양성이라고 확진하지 말고 반드시 3개 이상 클러스터를 확인.

> **💡 20년 차 임상 팁**
> Empty can(극상근) 검사 시 환자가 팔을 버티지 못하는 것이 '통증 때문에 힘이 빠지는 것'인지, '진짜 힘줄이 끊어져서 툭 떨어지는 것'인지 저항의 느낌을 손끝으로 철저히 구분해야 합니다.
    `,
  },
  {
    id: "shoulder-2",
    category: "어깨",
    title: "전방 불안정성 및 관절순 파열 (Anterior Instability)",
    summary: "Apprehension & Relocation Test를 활용한 불안정성 평가",
    tags: ["불안정성", "Bankart", "Apprehension"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
탈구 병력이 있거나 던지는 동작에서 통증을 느끼는 경우. Apprehension & Relocation Test의 높은 진단 가치.

### 2. 평가 및 중재 프로토콜
- 누운 상태에서 90도 외전/외회전 시 불안감(통증 아님) 호소 
- 상완골두를 전면에서 후면으로 눌러주면(Relocation) 불안감이 사라지고 외회전 각도가 증가함.

> **💡 20년 차 임상 팁**
> 이 검사는 '아픈가요?'를 묻는 게 아닙니다. '팔이 빠질 것 같은 두려움(Apprehension)'을 느끼는지가 핵심입니다. 눈동자가 커지며 몸을 움츠리면 양성입니다.
    `,
  },
  {
    id: "shoulder-3",
    category: "어깨",
    title: "유착성 관절낭염 (Frozen Shoulder) 감별 단계",
    summary: "관절낭 패턴(Capsular pattern) 확인 및 3단계 진단",
    tags: ["오십견", "관절낭패턴", "가동범위"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
관절낭 패턴(Capsular pattern). 능동(AROM)과 수동(PROM) 가동범위가 모두 제한되며, 특히 외회전(ER)의 제한이 가장 심함.

### 2. 평가 및 중재 프로토콜
- 외회전 -> 외전 -> 내회전 순서의 가동범위 제한 확인. (Freezing - Frozen - Thawing 3단계 감별)

> **💡 20년 차 임상 팁**
> 초기 통증기(Freezing) 환자의 어깨를 억지로 찢지 마세요. 염증성 단계에서는 스트레칭할수록 관절낭이 더 두꺼워집니다. 이 시기엔 가벼운 진자 운동(Pendulum)과 염증 조절이 먼저입니다.
    `,
  },
  {
    id: "shoulder-4",
    category: "어깨",
    title: "내회전 결핍 (GIRD)",
    summary: "오버헤드 스포츠 선수의 후방 관절낭 단축 평가",
    tags: ["GIRD", "스포츠재활", "후방관절낭"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
오버헤드 스포츠(야구, 테니스 등) 선수에게 흔한 후방 관절낭 단축 현상 (Glenohumeral Internal Rotation Deficit).

### 2. 평가 및 중재 프로토콜
- 양측 어깨 90도 외전 상태에서 내회전 각도 측정. 
- 건측 대비 20도 이상 내회전이 부족하면 GIRD로 진단.

> **💡 20년 차 임상 팁**
> 내회전 각도를 잴 때 견갑골이 앞쪽으로 툭 튀어나오는(Anterior tilt) 보상작용을 반드시 손으로 꽉 눌러서 막아야 합니다. 견갑골 고정 안 하고 재면 전부 다 정상 각도로 나옵니다.
    `,
  },
  {
    id: "shoulder-5",
    category: "어깨",
    title: "흉곽출구증후군 (Thoracic Outlet Syndrome, TOS)",
    summary: "경추 신경근병증과의 감별 및 Roos Test 활용법",
    tags: ["TOS", "흉곽출구", "RoosTest"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
사각근, 쇄골하 공간, 소흉근 아래에서 상완신경총이나 혈관이 압박되는 질환. Roos Test(3분간 팔 들고 잼잼)의 임상적 활용도.

### 2. 평가 및 중재 프로토콜
- 양팔을 90도 외전/외회전 하고 3분간 손을 쥐었다 폈다 반복. 
- 3분 이내에 팔이 무거워 떨어지거나 저림이 발생하면 양성.

> **💡 20년 차 임상 팁**
> 목 디스크(Cervical Radiculopathy)와 감별하는 가장 쉬운 방법은 통증의 분포입니다. 목 디스크는 특정 피부분절(Dermatome)을 따라 선명하게 저리지만, TOS는 손 전체가 붓는 느낌이나 모호하고 넓은 범위의 무거운 통증을 호소합니다.
    `,
  },

  // 🟣 [무릎] 데이터
  {
    id: "knee-1",
    category: "무릎",
    title: "반월상 연골판 파열 (Meniscus Tear) 감별",
    summary: "체중 지지 상태에서 정확도를 높이는 Thessaly Test",
    tags: ["연골판", "Thessaly", "반월상"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Thessaly Test (20도 굴곡 체중지지 회전 검사). 5도 굴곡보다 20도 굴곡에서 민감도/특이도가 가장 높음(90% 이상).

### 2. 평가 및 중재 프로토콜
- 환자가 한 발로 서서 무릎을 20도 굽힌 채 몸통을 좌우로 비틀 때 관절면(Joint line)의 통증이나 클릭음(Clicking) 확인.

> **💡 20년 차 임상 팁**
> 누워서 하는 McMurray Test는 급성기 환자나 무릎이 부어있는 환자에게 위음성(False Negative)이 많습니다. 체중을 실어서 찢어진 연골판을 직접 맷돌처럼 갈아보는 Thessaly가 훨씬 정확합니다.
    `,
  },
  {
    id: "knee-2",
    category: "무릎",
    title: "슬개대퇴통증증후군 (PFPS, Runner's Knee)",
    summary: "대퇴골 내회전 보상작용 확인 및 고관절 중재",
    tags: ["PFPS", "러너스니", "DynamicValgus"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
무릎 앞쪽 통증의 80%는 무릎 자체가 아니라 고관절 외전근(Gluteus Medius) 약화로 인한 대퇴골의 내회전(Femoral IR) 보상작용 때문.

### 2. 평가 및 중재 프로토콜
- Single Leg Squat 시 무릎이 발가락 안쪽으로 무너지는지(Dynamic Valgus) 확인. 
- 중재는 VMO 강화보다 고관절 외전/신전근 강화가 우선.

> **💡 20년 차 임상 팁**
> 환자에게 "무릎 바깥쪽으로 벌리며 스쿼트 하세요"라고 백날 말해도 못 고칩니다. 무릎 사이에 루프 밴드를 걸어주고 "밴드가 헐렁해지지 않게 팽팽하게 찢으면서 내려가세요"라고 외부 집중(External Focus) 큐잉을 줘야 모터 컨트롤이 바뀝니다.
    `,
  },
  {
    id: "knee-3",
    category: "무릎",
    title: "슬개건병증 (Patellar Tendinopathy)",
    summary: "건 리모델링을 위한 점진적 하중 프로토콜(HSR)",
    tags: ["건병증", "점퍼스니", "Eccentric"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
건병증 치료의 핵심은 염증 감소가 아니라 콜라겐 조직의 재배열(Remodeling)을 위한 점진적 하중 부여(Heavy Slow Resistance).

### 2. 평가 및 중재 프로토콜
- Decline Board(25도 기울어진 발판)에서 실시하는 Single Leg Eccentric Squat. (내려갈 때 3~4초 천천히 버팀).

> **💡 20년 차 임상 팁**
> 건병증 재활에서 '통증 0'을 목표로 하면 재활에 실패합니다. 운동 중 혹은 운동 직후 VAS 3~4 정도의 통증은 콜라겐 리모델링을 위한 정상적인 역치입니다. 24시간 이내에 통증이 가라앉는다면 운동 강도를 올리세요.
    `,
  },
  {
    id: "knee-4",
    category: "무릎",
    title: "오타와 무릎 규칙 (Ottawa Knee Rules)",
    summary: "외상 후 무릎 골절 배제를 위한 97% 민감도 규칙",
    tags: ["레드플래그", "골절감별", "Ottawa"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
외상 후 무릎 환자의 불필요한 X-ray 촬영을 줄이기 위한 임상 규칙 (민감도 97%).

### 2. 평가 및 중재 프로토콜
- 55세 이상, 비골두 단독 압통, 슬개골 단독 압통, 90도 굴곡 불가, 네 걸음 이상 체중 지지 불가. 
- 이 중 하나라도 해당하면 X-ray 즉각 의뢰.

> **💡 20년 차 임상 팁**
> 환자가 다리를 절뚝거리더라도 '네 걸음(체중을 양다리에 번갈아 싣는 것)'을 걸을 수 있다면 골절 확률은 1% 미만입니다. 안심시키고 연부조직 평가로 넘어가셔도 됩니다.
    `,
  },
  {
    id: "knee-5",
    category: "무릎",
    title: "전방십자인대 (ACL) 스포츠 복귀 (RTS) 기준",
    summary: "재파열 방지를 위한 객관적 LSI 지표 및 Hop Test",
    tags: ["ACL", "스포츠복귀", "HopTest"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
단순히 기간(수술 후 6개월)이 지났다고 복귀하면 재파열률 30% 증가. 객관적인 Limb Symmetry Index (LSI) 지표 필수.

### 2. 평가 및 중재 프로토콜
- 건측 대비 대퇴사두근 근력 90% 이상 
- Hop Test (Single, Triple, Crossover) 4종 모두 건측 대비 90% 이상 거리 달성 시 복귀 허가.

> **💡 20년 차 임상 팁**
> 점프하고 착지할 때 거리가 90% 나왔더라도, 착지 시 무릎이 흔들리거나(Dynamic Valgus) 쿵 소리가 나게 불안정하게 착지한다면 아직 복귀시키면 안 됩니다. '거리'보다 '착지 퀄리티(Quality of movement)'가 재파열을 막습니다.
    `,
  },

  // 🟤 [신경계] 데이터 (이전 대화 맥락에서 복원)
  {
    id: "neuro-1",
    category: "신경계",
    title: "상위운동신경원 (UMN) 징후 감별 (Hoffmann / Babinski)",
    summary: "중추신경계 병변 확진을 위한 필수 반사 검사",
    tags: ["UMN", "레드플래그", "Babinski", "Hoffmann"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
말초신경이나 디스크 문제(LMN)가 아닌, 뇌나 척수 중추신경계(UMN)의 압박이나 병변을 감별.

### 2. 평가 및 중재 프로토콜
- **바빈스키 반사:** 발바닥 외측을 긁어올릴 때 엄지발가락이 배굴되고 나머지 발가락이 부채꼴로 펴지는지 확인.

> **💡 20년 차 임상 팁**
> 족저근막이 너무 예민해서 간지럼을 타며 발을 빼는 것(Withdrawal)과 진짜 양성 반응을 헷갈리면 안 됩니다. 바빈스키가 애매하다면 발목을 빠르고 강하게 배측굴곡시켜 클로누스(Clonus)가 나타나는지 교차 검증하세요.
    `,
  },
  {
    id: "neuro-2",
    category: "신경계",
    title: "경추 척수증 (Cervical Myelopathy) 진단 클러스터",
    summary: "Cook의 척수증 감별 CPR 및 수기치료 금기",
    tags: ["척수증", "CPR", "수기치료금기"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Cook의 척수증 임상예측규칙. 1) 보행 이상, 2) Hoffmann 양성, 3) Inverted Supinator sign, 4) Babinski 양성, 5) 나이 45세 이상. **3개 이상 양성 시 특이도 99%.**

### 2. 평가 및 중재 프로토콜
- 양손의 미세 운동(셔츠 단추 채우기, 젓가락질)의 최근 저하 여부를 반드시 문진.

> **💡 20년 차 임상 팁**
> 손이 저리다고 목 디스크로 오인하고 경추 견인(Traction)을 세게 걸면 척수가 더 좁아져 영구 하반신 마비가 올 수 있습니다. '양손이 둔해지고 젓가락질이 안 된다'고 하면 절대 건드리면 안 됩니다.
    `,
  },
  {
    id: "neuro-3",
    category: "신경계",
    title: "양성돌발성두위현훈 (BPPV) 감별",
    summary: "이석증 감별을 위한 Dix-Hallpike 테스트 및 안구진탕",
    tags: ["BPPV", "이석증", "어지럼증"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
어지럼증의 가장 흔한 원인인 이석증(후반고리관) 감별 진단 (민감도 80% 이상).

### 2. 평가 및 중재 프로토콜
- 앉은 자세에서 고개를 45도 돌리고 빠르게 눕혀 목을 20도 신전. 
- 10~20초 잠복기 후 발생하는 위로 향하는 회전성 안구진탕 확인.

> **💡 20년 차 임상 팁**
> 환자가 눈을 꽉 감아버리면 안구진탕을 볼 수 없습니다. 검사 전에 "어지러워도 제 코를 끝까지 쳐다보셔야 치료가 됩니다"라고 단단히 일러두세요.
    `,
  },
  {
    id: "neuro-4",
    category: "신경계",
    title: "뇌졸중 후 편마비 회복 단계 (Brunnstrom Stages)",
    summary: "경직(Spasticity)과 시너지 패턴의 이해 및 운동 평가",
    tags: ["뇌졸중", "편마비", "Brunnstrom"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
뇌졸중 환자의 운동 기능 회복은 이완기 -> 시너지 패턴 발현 -> 경직 최고조 -> 분리 운동 시작의 일정한 패턴을 따름.

### 2. 평가 및 중재 프로토콜
- 환자가 시너지 패턴(예: 밥 먹으려 팔을 들 때 어깨가 올라가고 팔꿈치가 굽어지는 현상)을 벗어나 독립적으로 움직일 수 있는지 평가.

> **💡 20년 차 임상 팁**
> 경직이 심한 환자의 팔을 힘으로 억지로 펴려고 하지 마세요. 체간(Trunk)의 안정화를 먼저 잡아주고 견갑골을 천천히 전인(Protraction)시키면 팔은 자연스럽게 스르르 풀립니다.
    `,
  },
  {
    id: "neuro-5",
    category: "신경계",
    title: "파킨슨병 동결보행 (Freezing of Gait) 중재",
    summary: "외부 단서(External Cues)를 활용한 운동 피질 자극 보행",
    tags: ["파킨슨병", "동결보행", "시각단서"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
기저핵 손상으로 인한 운동 개시 불능. 시각적/청각적 외부 단서가 운동 피질을 직접 우회 자극하여 보행을 유도함.

### 2. 평가 및 중재 프로토콜
- 환자 발앞에 레이저 포인터로 선을 긋거나, 일정한 메트로놈 소리(100-120 bpm)를 제공하여 보행 개시 훈련.

> **💡 20년 차 임상 팁**
> 좁은 공간에서 환자의 발이 바닥에 붙어버렸을 때 억지로 당기지 마세요. 환자의 발 바로 앞에 치료사의 발을 가로로 대주고 "제 발을 훌쩍 넘어가 보세요!"라고 시각적 타겟을 바꿔주면 마법처럼 발이 떨어집니다.
    `,
  },
];

const appendedClinicalLibraryData: ClinicalData[] = [
  // ==========================================
  // 🟢 1. [경추 / Cervical] 데이터 10선
  // ==========================================
  {
    id: "cervical-1",
    category: "경추",
    title: "편타성 손상 증후군 (WAD, 교통사고 후유증)",
    summary: "조기 고정보다 능동 가동성 훈련이 만성화를 막는 생체역학적 이유",
    tags: ["WAD", "교통사고", "가동성"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
퀘벡 태스크 포스(QTF) 분류. 외상 후 목 통증은 조기 고정(Collar)보다 조기 능동 가동성 훈련이 만성화(Chronic pain)를 막는 데 우수함.

### 2. 평가 및 중재 프로토콜
- 통증 없는 범위 내에서 시선 추적(Gaze stability)과 결합한 경추 회전 운동 조기 실시.

> **💡 20년 차 임상 팁**
> "아프니까 깁스하고 누워계세요"는 옛날 방식입니다. 사고 직후 목을 뻣뻣하게 굳히는 환자에게는 눈동자를 먼저 움직이게 한 뒤 고개를 따라가게 하는 안구-경추 반사(Cervico-ocular reflex)를 이용하면 통증 없이 가동범위가 나옵니다.
    `,
  },
  {
    id: "cervical-2",
    category: "경추",
    title: "경추 견인치료 (Cervical Traction) 성공 CPR",
    summary: "Raney의 임상예측규칙을 활용한 견인치료 79% 성공 감별법",
    tags: ["견인치료", "CPR", "말초화"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Raney의 임상예측규칙. 1) 55세 이상, 2) Bakody's sign(팔 올리면 저림 감소) 양성, 3) ULTT A 양성, 4) 어깨 외전 검사 양성, 5) 경추 신전 시 말초화(Peripheralization).
**3개 이상 양성 시 견인치료 성공률 79% 이상.**

### 2. 평가 및 중재 프로토콜
- 해당 조건 충족 시 기계적/도수 견인치료 적극 적용.

> **💡 20년 차 임상 팁**
> 목 디스크라고 무조건 견인하지 마세요. 고개를 뒤로 젖힐 때 팔이 터질 듯이 저린 환자(말초화 현상)에게 견인이 가장 극적인 효과를 봅니다.
    `,
  },
  {
    id: "cervical-3",
    category: "경추",
    title: "상부교차증후군 (Upper Crossed Syndrome) 심화",
    summary: "단순 스트레칭이 아닌 하부 승모근의 모터 컨트롤 회복 전략",
    tags: ["상부교차", "하부승모근", "Janda"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Janda의 근육 불균형 패턴. 단순히 가슴을 펴는 것이 아니라, 하부 승모근의 '타이밍(Motor control)' 지연을 해결하는 것이 핵심.

### 2. 평가 및 중재 프로토콜
- Prone Y-raise 실시 전, 반드시 흉추 신전과 견갑골 후방경사(Posterior tilt)를 먼저 세팅.

> **💡 20년 차 임상 팁**
> 라운드 숄더 환자에게 백날 소흉근 마사지만 해봐야 다음 날이면 돌아갑니다. 벽에 기대서 팔을 올리는 Wall Angel을 시킬 때, 허리가 벽에서 떨어지면(요추 보상) 하부 승모근 운동이 전혀 안 되고 있는 것입니다. 코어를 먼저 잠그세요.
    `,
  },
  {
    id: "cervical-4",
    category: "경추",
    title: "T4 증후군 (T4 Syndrome) 감별",
    summary: "손 저림과 두통을 유발하는 상부 흉추 기능부전",
    tags: ["T4증후군", "손저림", "흉추가동술"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
상부/중부 흉추(T2-T7)의 기능 부전이 교감신경절을 자극하여 손에 장갑을 낀 듯한(Glove-like) 이상 감각과 두통을 유발.

### 2. 평가 및 중재 프로토콜
- T4 주변 후관절의 압통 및 저운동성 확인 후 흉추 P-A 가동술/수기치료 적용.

> **💡 20년 차 임상 팁**
> 목 디스크 검사(Spurling 등)는 다 음성인데, 밤만 되면 양손이 붓고 장갑 낀 것처럼 저리다고 하면 T4 증후군을 의심하세요. 목을 건드리지 않고 등뼈(흉추)만 펴줘도 손 저림이 마법처럼 사라집니다.
    `,
  },
  {
    id: "cervical-5",
    category: "경추",
    title: "경추성 어지럼증 (Cervicogenic Dizziness)",
    summary: "상부 경추의 고유수용감각 오류 감별 (SPNT 검사)",
    tags: ["어지럼증", "SPNT", "고유수용감각"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
BPPV(이석증)가 룰아웃된 후, 상부 경추의 고유수용성 감각 오류로 발생하는 어지럼증. Smooth Pursuit Neck Torsion (SPNT) 검사.

### 2. 평가 및 중재 프로토콜
- 머리는 가만히 두고 몸통만 회전시킨 상태에서 눈으로 타겟을 추적할 때 안구진탕이나 어지럼증 재현 확인.

> **💡 20년 차 임상 팁**
> 이석증은 세상이 빙글빙글 도는 느낌(Vertigo)이지만, 경추성 어지럼증은 배를 탄 것처럼 둥둥 떠다니거나 멍한 느낌(Lightheadedness)에 가깝습니다. 후두하근(Suboccipital) 릴리즈가 특효입니다.
    `,
  },
  {
    id: "cervical-6",
    category: "경추",
    title: "흉곽출구증후군 (TOS) - 제1늑골 (First Rib) 평가",
    summary: "CRLF 검사를 통한 제1늑골 거상 및 호흡 역학 확인",
    tags: ["TOS", "제1늑골", "CRLF"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
사각근 사이 공간 압박의 주원인인 제1늑골의 거상(Elevation) 및 흡기 시 고정 현상. Cervical Rotation Lateral Flexion (CRLF) 검사.

### 2. 평가 및 중재 프로토콜
- 경추를 최대한 회전시킨 후, 반대쪽으로 측굴(Lateral flexion) 시 가동범위 제한 및 딱딱한 끝느낌 확인.

> **💡 20년 차 임상 팁**
> 환자가 숨을 깊게 들이마실 때 첫 번째 갈비뼈가 올라왔다가, 내쉴 때 내려가지 않고 턱 걸려있다면 사각근이 굳어있는 겁니다. 사각근만 누르지 말고 내쉬는 호흡에 맞춰 제1늑골을 발쪽(Caudal)으로 강하게 내려주세요.
    `,
  },
  {
    id: "cervical-7",
    category: "경추",
    title: "후관절 증후군 (Cervical Facet Syndrome) 3차원 패턴",
    summary: "닫힘 제한과 열림 제한의 3차원 짝운동(Coupled motion) 분석",
    tags: ["후관절증후군", "짝운동", "SNAGs"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
닫힘 제한(Closing restriction)과 열림 제한(Opening restriction)의 3차원 짝운동(Coupled motion) 분석.

### 2. 평가 및 중재 프로토콜
- 우측 회전/신전 시 우측 통증: 닫힘 제한(충돌)
- 좌측 회전/굴곡 시 우측 통증: 열림 제한(스트레칭 결함)

> **💡 20년 차 임상 팁**
> 엑스레이에 디스크 공간이 멀쩡한데 고개 돌릴 때 특정 각도에서만 '악!' 하고 찌르는 통증이 있다면 90% 후관절입니다. 이럴 땐 견인(Traction)보다 엎드린 상태에서 관절면을 따라 밀어주는 SNAGs가 즉각적입니다.
    `,
  },
  {
    id: "cervical-8",
    category: "경추",
    title: "근막통증증후군 (MPS) 방사통 vs 신경근병증",
    summary: "가짜 디스크(Pseudo-radiculopathy)를 걸러내는 트리거 포인트 확인",
    tags: ["MPS", "방사통", "가짜디스크"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Travell & Simons의 트리거 포인트 방사통. 극하근이나 사각근의 TP는 목 디스크(C5-C6)와 완벽하게 동일한 팔 저림을 유발.

### 2. 평가 및 중재 프로토콜
- 신경학적 검사 정상 확인 후, 극하근 밸리를 강하게 압박하여 팔로 내려가는 평소의 저림이 재현되는지 확인.

> **💡 20년 차 임상 팁**
> 목 디스크 수술을 앞둔 환자의 팔 저림이 극하근을 세게 꼬집었을 때 유발된다면, 그 환자는 수술할 필요가 없습니다. 가짜 디스크를 걸러내는 것이 치료사의 진짜 실력입니다.
    `,
  },
  {
    id: "cervical-9",
    category: "경추",
    title: "텍스트 넥 (Text Neck) 생체역학",
    summary: "상부 경추 과신전과 하부 경추 굴곡의 이중 역학 분리 재활",
    tags: ["거북목", "생체역학", "흉추신전"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
고개를 15도 숙일 때마다 하중 2배 증가. 하부 경추는 굴곡, 상부 경추는 과신전되는 이중 역학.

### 2. 평가 및 중재 프로토콜
- 단순히 고개를 드는 것이 아니라, 후두하근 스트레칭과 경하부 신전근 강화의 분리 적용.

> **💡 20년 차 임상 팁**
> 거북목 환자에게 "턱 당기세요"만 시키면 목에 쥐가 납니다. 이미 뻣뻣해진 상부 흉추(등뼈)를 먼저 펴주지 않으면, 턱을 아무리 당겨도 구조적으로 경추가 제자리로 돌아갈 수 없습니다.
    `,
  },
  {
    id: "cervical-10",
    category: "경추",
    title: "뇌진탕 후 증후군 (Post-Concussion) 경추 개입",
    summary: "가벼운 뇌손상(mTBI) 환자의 Joint Position Error (JPE) 평가",
    tags: ["뇌진탕", "mTBI", "JPE"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
외상성 뇌손상 후 두통과 어지럼증의 상당 부분은 뇌가 아니라 경추 고유수용감각 오류에서 기인. Joint Position Error (JPE) 테스트.

### 2. 평가 및 중재 프로토콜
- 레이저 포인터를 머리에 달고 눈을 감은 채 고개를 돌렸다가 정중앙으로 돌아왔을 때의 오차 범위 측정.

> **💡 20년 차 임상 팁**
> 머리를 부딪힌 후 어지럽다는 환자, MRI상 뇌출혈이 없다면 경추부 미세 손상을 의심하세요. 고개를 눈 감고 돌리게 했을 때 제자리(정면)를 못 찾는다면 고유수용감각 재활이 필수입니다.
    `,
  },

  // ==========================================
  // 🔵 2. [요추 / Lumbar] 데이터 10선
  // ==========================================
  {
    id: "lumbar-1",
    category: "요추",
    title: "요추관 협착증 트레드밀 테스트 (Treadmill Test for LSS)",
    summary: "오르막 걷기를 통한 혈관성 파행과 신경인성 파행의 명확한 감별",
    tags: ["협착증", "파행", "트레드밀"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
요추 굴곡 시 척추관 면적이 넓어지는 역학. 신경인성 파행과 혈관성 파행 감별.

### 2. 평가 및 중재 프로토콜
- 평지 트레드밀 걷기 -> 오르막(Incline) 트레드밀 걷기. 오르막에서 통증 없이 걷는 시간이 길어지면 협착증 확진.

> **💡 20년 차 임상 팁**
> 오르막을 걸을 때는 자연스럽게 허리가 숙여지므로 협착증 환자는 훨씬 편안해합니다. 반면 혈관이 막힌 환자는 오르막에서 종아리가 더 빨리 터질 듯 아픕니다.
    `,
  },
  {
    id: "lumbar-2",
    category: "요추",
    title: "슬럼프 테스트 (Slump Test)의 함정 감별",
    summary: "신경막 긴장(Dural tension)과 햄스트링 단축의 완벽 감별법",
    tags: ["슬럼프테스트", "신경긴장", "햄스트링"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
신경막 긴장과 단순 근육 단축의 구별. 경추 신전에 따른 증상 변화 확인.

### 2. 평가 및 중재 프로토콜
- 슬럼프 자세에서 무릎 펴고 발목 당길 때 뒤벅지가 당길 시, **고개를 위로 들게 했을 때 당기는 느낌이 사라지면 양성(신경 문제)**.

> **💡 20년 차 임상 팁**
> 고개를 젖혔는데도 똑같이 다리가 당긴다면 그건 그냥 햄스트링이 짧은 겁니다. 고개 움직임에 따라 증상이 변해야 진짜 신경 긴장입니다.
    `,
  },
  {
    id: "lumbar-3",
    category: "요추",
    title: "이상근 증후군 (Piriformis Syndrome) 팩트 체크",
    summary: "L5 디스크와의 감별 및 FAIR Test 적용",
    tags: ["이상근", "좌골신경통", "FAIR"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
좌골신경통의 6% 미만만이 진짜 이상근 증후군. 대부분은 숨겨진 요추 디스크. FAIR Test 적용.

### 2. 평가 및 중재 프로토콜
- 고관절을 90도 굴곡, 내전, 내회전시켜 이상근을 최대 신장할 때 방사통 재현 확인.

> **💡 20년 차 임상 팁**
> 허리는 안 아프고 엉덩이만 아프다고 이상근 증후군이 아닙니다. 요추 5번 디스크가 허리 통증 없이 엉덩이 통증만 유발하는 경우가 수두룩합니다.
    `,
  },
  {
    id: "lumbar-4",
    category: "요추",
    title: "요추 분리증/전방전위증 (Spondylolysis/Listhesis)",
    summary: "신전 금기 요통의 Stork Test 평가 및 항신전 코어 전략",
    tags: ["전방전위증", "StorkTest", "항신전"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
관절간부 결손. 신전(Extension) 운동이 철저히 금기되는 요통. Stork Test 활용.

### 2. 평가 및 중재 프로토콜
- 한 발로 서서 허리를 뒤로 젖힐 때 디딤발 쪽 요추의 국소적인 날카로운 통증.

> **💡 20년 차 임상 팁**
> 10대 운동선수가 허리가 아프다고 할 때 멕켄지 시키면 뼈가 완전히 부러집니다. 이 환자군에게 요추 신전은 독이며, 철저한 항신전 코어 운동이 필수입니다.
    `,
  },
  {
    id: "lumbar-5",
    category: "요추",
    title: "다열근 지방 침투 (Multifidus Fatty Infiltration)",
    summary: "만성 요통의 주범인 다열근 위축 초음파 소견 및 촉진",
    tags: ["다열근", "지방침투", "만성요통"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
파괴된 다열근은 자연 회복되지 않고 지방으로 대체됨. 만성 요통의 가장 큰 원인.

### 2. 평가 및 중재 프로토콜
- 초음파 소견 확인 또는 엎드려 다리를 들게 했을 때 척추기립근만 튀어나오고 다열근 위치가 꺼져있는지 촉진.

> **💡 20년 차 임상 팁**
> 플랭크 5분 버틴다고 다열근이 강한 게 아닙니다. 팔다리를 움직이기 0.1초 전에 먼저 척추를 잠가주는(Feed-forward) 훈련을 안 하면 요통은 무조건 재발합니다.
    `,
  },
  {
    id: "lumbar-6",
    category: "요추",
    title: "코어 3대장 (McGill's Big 3) 안정화 역학",
    summary: "척추 압박 부하 최소화를 위한 3대 코어 운동 원리",
    tags: ["McGill", "코어안정화", "버드독"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Stuart McGill 박사의 척추 압박 부하 최소화 운동. 윗몸일으키기는 요추에 치명적인 하중 부과.

### 2. 평가 및 중재 프로토콜
- Curl-up, Side plank, Bird-dog 수행 시 요추-골반 중립 절대 유지.

> **💡 20년 차 임상 팁**
> 버드독을 시킬 때 허리에 물이 담긴 종이컵을 올려두세요. 팔다리를 높이 드는 게 중요한 게 아니라, 요추가 1도도 회전하지 않게 락(Lock)을 거는 것이 목적입니다.
    `,
  },
  {
    id: "lumbar-7",
    category: "요추",
    title: "장요근 단축의 가짜 양성 (Thomas Test Trap)",
    summary: "대퇴직근 단축과의 명확한 감별 및 대둔근 발화 패턴 확인",
    tags: ["ThomasTest", "장요근", "대퇴직근"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Thomas Test 시 다리가 들린다고 무조건 장요근 단축이 아님. 대퇴직근과의 감별.

### 2. 평가 및 중재 프로토콜
- 다리가 들린 상태에서 무릎을 굽혔을 때 더 들리면 대퇴직근 단축, 변화 없으면 장요근 단축.

> **💡 20년 차 임상 팁**
> 고관절 신전 시 대둔근(Glute Max)이 먼저 쓰이는지, 햄스트링이 먼저 쓰이는지 '발화 순서(Firing pattern)'를 체크하는 게 진짜 실력입니다.
    `,
  },
  {
    id: "lumbar-8",
    category: "요추",
    title: "측면 편위 (Lateral Shift) 디스크 역학",
    summary: "내측 탈출과 외측 탈출에 따른 보상적 척추 측만 감별",
    tags: ["LateralShift", "디스크역학", "측만증"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
디스크가 신경뿌리의 외측으로 터졌는지 내측으로 터졌는지에 따라 환자의 보상적 회피 방향이 다름.

### 2. 평가 및 중재 프로토콜
- 아픈 다리 쪽으로 기울면 내측 디스크, 반대쪽으로 기울면 외측 디스크 가능성.

> **💡 20년 차 임상 팁**
> 허리가 옆으로 틀어진 환자에게 다짜고짜 뒤로 젖히는 신전을 시키면 신경이 찢어집니다. 벽에 기대서 골반을 밀어 넣어 측면 정렬부터 맞춘 뒤에 뒤로 젖혀야 합니다.
    `,
  },
  {
    id: "lumbar-9",
    category: "요추",
    title: "디스크 흡수 현상 (Spontaneous Resorption)",
    summary: "파열된 디스크(Sequestration)의 자연 흡수 확률과 보존적 치료",
    tags: ["디스크흡수", "대식세포", "보존적치료"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
디스크가 심하게 터져서 신경관으로 흘러내릴수록, 대식세포의 탐식 작용이 활발해져 자연 흡수될 확률 80% 이상.

### 2. 평가 및 중재 프로토콜
- 마미증후군, 족하수(Foot drop)가 없다면 3~6개월 보존적 치료 유지.

> **💡 20년 차 임상 팁**
> 완전히 터져 흘러내린 디스크는 면역 세포가 이물질로 인식해서 깨끗하게 갉아먹습니다. 두려워하는 환자의 멘탈을 잡아주는 것이 우선입니다.
    `,
  },
  {
    id: "lumbar-10",
    category: "요추",
    title: "요추 후관절 캡슐 포착 (Facet Capsule Entrapment)",
    summary: "급성 요추 잠김(Acute locked back)의 캡슐 찝힘 감별",
    tags: ["후관절포착", "급성요통", "요추잠김"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
허리를 굽혔다 펼 때 갑자기 허리가 잠기는 흔한 원인. 관절낭 포착.

### 2. 평가 및 중재 프로토콜
- 멕켄지 신전 시 통증 극심. 다리로 내려가는 방사통 없이 허리에 국한된 띠 모양 통증.

> **💡 20년 차 임상 팁**
> 억지로 허리를 펴게 하지 말고, 태아 자세(Flexion)로 눕혀서 관절을 벌려준 뒤 호흡을 유도하면 찝힌 캡슐이 빠지며 즉시 걸어 나갑니다.
    `,
  },

  // ==========================================
  // 🟠 3. [어깨 / Shoulder] 데이터 10선
  // ==========================================
  {
    id: "shoulder-1",
    category: "어깨",
    title: "SLAP 병변 (상부 관절순 파열) 감별",
    summary: "O'Brien's Test를 활용한 AC 관절 손상과의 완벽 감별",
    tags: ["SLAP", "관절순", "OBrien"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
O'Brien's Test (Active Compression Test). 이두근 장두와 관절순 복합체 손상 평가.

### 2. 평가 및 중재 프로토콜
- 팔을 90도 굴곡/10도 내전. 엄지 아래 저항(통증) -> 엄지 위 저항(통증 감소) 시 양성.

> **💡 20년 차 임상 팁**
> 아픈 위치를 물어보세요. "어깨 위쪽 피부"는 AC 문제고, "어깨 관절 아주 깊은 속(Deep inside)"이 아프다고 해야 진짜 SLAP입니다.
    `,
  },
  {
    id: "shoulder-2",
    category: "어깨",
    title: "이두근 건병증 (Biceps Tendinopathy)의 진실",
    summary: "단독 손상 5% 미만, 견갑골 불안정성 동반 평가 및 Yergason Test",
    tags: ["이두근", "Yergason", "건병증"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
이두근 건병증 단독 발생은 5% 미만. 거의 항상 회전근개 파열이나 충돌증후군 동반.

### 2. 평가 및 중재 프로토콜
- Yergason's Test: 팔꿈치 90도 굴곡, 치료사가 회외 방해 시 이두근구 통증.

> **💡 20년 차 임상 팁**
> 이두근 힘줄에만 초음파 치료해봐야 낫지 않습니다. 이두근이 왜 무리하는지 견갑골 불안정성 원인을 찾아 세팅해 줘야 합니다.
    `,
  },
  {
    id: "shoulder-3",
    category: "어깨",
    title: "견쇄관절 (AC Joint) 손상 감별",
    summary: "충돌증후군과의 명확한 핀포인트 감별 (Cross-body Test)",
    tags: ["AC관절", "견쇄관절", "Paxinos"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Cross-body Adduction Test 및 Paxinos Sign. 국소적인 점 통증.

### 2. 평가 및 중재 프로토콜
- 팔을 반대쪽 어깨로 최대한 넘겼을 때 AC 관절부 통증 재현.

> **💡 20년 차 임상 팁**
> 환자에게 가장 아픈 곳을 짚어보라고 했을 때, 삼각근 부위를 넓게 짚으면 충돌증후군, 어깨 꼭대기 뼈를 정확히 짚으면 AC 조인트 문제입니다.
    `,
  },
  {
    id: "shoulder-4",
    category: "어깨",
    title: "견갑골 운동이상증 (Scapular Dyskinesis) Kibler 분류",
    summary: "Type I, II, III 시각적 평가와 전거근 하부 섬유의 정확한 타겟팅",
    tags: ["견갑골", "Dyskinesis", "익상견갑"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
어깨 통증 환자 60% 이상 동반. Type I(하각), Type II(내측연), Type III(상각 거상).

### 2. 평가 및 중재 프로토콜
- Wall Push-up 시 견갑골 익상(Winging) 패턴 시각적 평가.

> **💡 20년 차 임상 팁**
> 하각 들림(Type I) 환자에게 누워서 펀치 뻗는 전거근 운동만 시키면 더 심해집니다. 팔을 120도 이상 올린 상태(Wall slide)에서 운동해야 견갑골이 등에 밀착됩니다.
    `,
  },
  {
    id: "shoulder-5",
    category: "어깨",
    title: "후방 내부 충돌증후군 (Internal Impingement)",
    summary: "오버헤드 선수의 최대 외회전 시 발생하는 관절순 후상방 찝힘",
    tags: ["내부충돌", "오버헤드", "후방관절낭"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
투수가 팔을 최대 외회전 했을 때 극상근/극하근 후방 섬유가 찝히는 현상.

### 2. 평가 및 중재 프로토콜
- 어깨 90도 외전 및 최대 외회전 시 어깨 '앞'이 아닌 '뒤쪽' 깊은 곳의 통증.

> **💡 20년 차 임상 팁**
> 앞이 아프면 전방 불안정성, 뒤가 아프면 내부 충돌입니다. 튜빙 밴드로 외회전(ER) 운동만 미친 듯이 시키면 캡슐이 더 두꺼워집니다. 흉추 가동성 확보가 먼저입니다.
    `,
  },
  {
    id: "shoulder-6",
    category: "어깨",
    title: "대/소흉근 단축 역학 (Pectoralis Tightness)",
    summary: "소흉근 단축으로 인한 견갑골 전방경사 역학과 호흡 스트레칭",
    tags: ["소흉근", "전방경사", "라운드숄더"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
소흉근 단축은 견갑골 전방경사와 내회전을 유발해 서브아크로미알 공간을 좁히는 주범.

### 2. 평가 및 중재 프로토콜
- Supine 자세에서 어깨 후면(Acromion)이 테이블에서 손가락 2마디 이상 뜨면 단축.

> **💡 20년 차 임상 팁**
> 소흉근 푼다고 오훼돌기(Coracoid) 멍들게 찌르지 마세요. 폼롤러 위에 눕히고 호흡과 함께 팔을 W자로 내리게 하는 능동적 이완이 훨씬 안전합니다.
    `,
  },
  {
    id: "shoulder-7",
    category: "어깨",
    title: "거대 회전근개 파열 (Massive Cuff Tear) 징후",
    summary: "수술 불가 환자의 역형 견관절(Reverse TSA) 재활 전략",
    tags: ["거대파열", "Hornblower", "DropSign"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
극하근, 소원근까지 완전히 끊어진 상태. Hornblower's Sign, Drop Sign 양성.

### 2. 평가 및 중재 프로토콜
- 나팔 불듯이 손을 올릴 때, 외회전 힘이 없어 팔꿈치가 먼저 하늘로 들리는 보상작용 관찰.

> **💡 20년 차 임상 팁**
> 끊어진 힘줄은 테라밴드 운동으로 붙지 않습니다. 삼각근 전면부(Anterior Deltoid)를 집중 훈련시켜 회전근개를 대체하게 만드는 방식으로 접근하세요.
    `,
  },
  {
    id: "shoulder-8",
    category: "어깨",
    title: "견갑상 신경 포착 (Suprascapular Nerve Entrapment)",
    summary: "낭종이나 신경 압박으로 인한 극하근 단독 위축 감별",
    tags: ["신경포착", "극하근위축", "견갑상신경"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
신경이 눌리는 위치(상부 절흔 vs 스피노글레노이드 절흔)에 따른 근육 마비 차이.

### 2. 평가 및 중재 프로토콜
- 극상근은 멀쩡한데 극하근만 푹 꺼져있는지(위축) 시진 및 무거운 후방 통증 확인.

> **💡 20년 차 임상 팁**
> 뼈가 만져질 정도로 극하근이 파여있다면 100% 신경 압박이나 낭종입니다. 근육 뭉침으로 착각하고 마사지만 하지 말고 즉시 초음파 의뢰하세요.
    `,
  },
  {
    id: "shoulder-9",
    category: "어깨",
    title: "어깨 골관절염 (Shoulder OA)",
    summary: "오십견으로 오진하기 쉬운 퇴행성 관절염 감별 팁",
    tags: ["관절염", "오십견감별", "Crepitus"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
연골 마모로 인한 Crepitus(관절 잡음)와 뼈가 부딪히는 딱딱한 Bony end-feel.

### 2. 평가 및 중재 프로토콜
- 60대 이상에서 수년에 걸쳐 서서히 가동범위 감소 확인. (오십견은 급성기 통증 위주)

> **💡 20년 차 임상 팁**
> 관절염 환자의 팔을 오십견처럼 강제로 꺾으면 남은 연골이 다 찢어집니다. 뼈가 닿는 느낌이 나면 거기가 끝입니다. 통증 조절에 집중하세요.
    `,
  },
  {
    id: "shoulder-10",
    category: "어깨",
    title: "GIRD 스트레칭의 진실 (Cross-body vs Sleeper)",
    summary: "어깨 충돌을 유발하는 슬리퍼 스트레치 대신 견갑골을 고정한 스트레칭",
    tags: ["GIRD", "스트레칭", "후방관절낭"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Sleeper stretch는 어깨 충돌 유발 위험이 높음. Cross-body adduction stretch가 후방 관절낭 신장에 훨씬 우수.

### 2. 평가 및 중재 프로토콜
- 견갑골 외측연을 침대나 치료사 몸으로 단단히 고정한 상태에서 팔을 당기기.

> **💡 20년 차 임상 팁**
> 환자 혼자 팔을 당기면 견갑골이 척추에서 통째로 멀어지며 등 근육만 늘어납니다. 치료사가 한 손으로 견갑골을 꽉 눌러 고정해야 진짜 관절 주머니가 늘어납니다.
    `,
  },

  // ==========================================
  // 🟣 4. [무릎 / Knee] 데이터 10선
  // ==========================================
  {
    id: "knee-1",
    category: "무릎",
    title: "장경인대 증후군 (IT Band Syndrome)",
    summary: "마찰이 아닌 대퇴골 측면 지방 패드 압박 모델 이해",
    tags: ["장경인대", "러너스니", "지방패드"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
IT 밴드 통증의 원인은 마찰(Friction)이 아니라 대퇴골 외상과 부근 지방 패드의 압박(Compression)임.

### 2. 평가 및 중재 프로토콜
- Noble Compression Test (30도 굴곡 시 외측 통증). TFL과 둔근에 집중적인 중재.

> **💡 20년 차 임상 팁**
> 허벅지 옆면을 폼롤러로 문지르면 염증 난 지방 패드를 짓누르는 꼴입니다. 중둔근(Glute Medius)이 약해 골반이 무너지는 현상부터 고치세요.
    `,
  },
  {
    id: "knee-2",
    category: "무릎",
    title: "후방십자인대 (PCL) 손상 재활 금기",
    summary: "급성기 햄스트링 운동 금지 및 대퇴사두근 우선 강화 원리",
    tags: ["PCL", "후방십자인대", "SagSign"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
PCL은 경골의 후방 전위를 막음. Quadriceps Active Test 및 Posterior Sag Sign.

### 2. 평가 및 중재 프로토콜
- 누워서 90도 굽혔을 때 정강이뼈가 중력에 의해 뒤로 푹 꺼지는지 확인.

> **💡 20년 차 임상 팁**
> PCL 수술 후 엎드려서 뒤벅지 운동(Hamstring curl) 시키면 이식 건이 다 늘어납니다. 대퇴사두근을 강력하게 키워 정강이뼈를 앞쪽으로 당겨야 합니다.
    `,
  },
  {
    id: "knee-3",
    category: "무릎",
    title: "내측측부인대 (MCL) 스프레인 감별",
    summary: "0도와 30도 Valgus stress test를 통한 단독 손상 vs 복합 파열 감별",
    tags: ["MCL", "외반력", "ValgusTest"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
0도와 30도 굴곡 상태에서의 밖굽이 스트레스 검사(Valgus stress test).

### 2. 평가 및 중재 프로토콜
- 0도에서 덜렁거리면 ACL 복합 파열, 30도 굽히고 덜렁거리면 얕은 MCL 단독 손상.

> **💡 20년 차 임상 팁**
> 환자 무릎 안쪽을 누를 때 뼈 관절선이 아픈지, 관절선 아래 정강이뼈 부착부위가 아픈지 명확히 촉진하세요. 내측 연골판 파열과 구분해야 합니다.
    `,
  },
  {
    id: "knee-4",
    category: "무릎",
    title: "햄스트링 손상 재활 (Askling L-Protocol)",
    summary: "원심성 수축(Eccentric) 상황 파열 방지를 위한 노르딕 컬 적용",
    tags: ["햄스트링", "원심성수축", "노르딕컬"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
햄스트링 파열의 대부분은 원심성 수축 상황에서 발생. 원심성 제동 근력 강화가 필수.

### 2. 평가 및 중재 프로토콜
- 노르딕 컬 및 고관절 굴곡 상태에서의 슬관절 신전 운동(L-protocol) 적용.

> **💡 20년 차 임상 팁**
> 완전히 쪼그려 앉은 상태에서 일어나는 데 통증이 없어야 하고, 빠른 속도로 다리를 뻗었을 때 정확히 브레이크가 걸려야 복귀할 수 있습니다.
    `,
  },
  {
    id: "knee-5",
    category: "무릎",
    title: "슬개골 불안정성 (Patellar Instability)",
    summary: "MPFL 파열 동반 확인 및 안전한 가동범위(Safe Zone) 설정",
    tags: ["슬개골탈구", "MPFL", "안전구역"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
주로 10~20대 Valgus 무릎 여성. 내측슬개대퇴인대(MPFL) 파열 동반. Apprehension Test.

### 2. 평가 및 중재 프로토콜
- 무릎 20도 굽히고 슬개골을 바깥쪽으로 밀 때 환자가 소스라치게 놀라며 대퇴사두근 힘을 주면 양성.

> **💡 20년 차 임상 팁**
> 레그 익스텐션 끝까지 차면 슬개골 또 빠집니다. 무릎이 0~30도 펴질 때가 가장 불안정하므로 재활 초기엔 90도~45도 안전 구역에서만 운동해야 합니다.
    `,
  },
  {
    id: "knee-6",
    category: "무릎",
    title: "오스굿-슐라터병 (Osgood-Schlatter Disease)",
    summary: "급성장기 청소년의 견인성 건초염과 부하 조절 전략",
    tags: ["오스굿", "급성장기", "견인성건초염"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
정강이뼈 결절의 견인성 건초염. 뼈가 자라는 속도를 인대가 못 따라가서 발생.

### 2. 평가 및 중재 프로토콜
- 점프/달리기 시 결절 부위 극심한 통증 및 뼛조각 돌출 관찰. 부하 조절(Load management) 핵심.

> **💡 20년 차 임상 팁**
> 마사지로 낫는 병이 아닙니다. 대퇴직근 스트레칭과 염증을 관리하며 성장판 닫힐 때까지 운동 부하를 철저히 조절하는 것이 유일한 완치법입니다.
    `,
  },
  {
    id: "knee-7",
    category: "무릎",
    title: "무릎 골관절염 (Knee OA) 관절 가동술",
    summary: "퇴행성 무릎 윤활 작용 회복을 위한 Traction 및 A-P Glide",
    tags: ["퇴행성관절염", "가동술", "Traction"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
초중기 환자에게 대퇴골에 대한 경골의 견인(Traction) 및 A-P Glide는 통증 조절에 탁월함.

### 2. 평가 및 중재 프로토콜
- 관절낭 패턴 확인 후, 통증 없는 범위 내에서 Grade I-II 진동 가동술 적용.

> **💡 20년 차 임상 팁**
> O자 다리 환자의 다리를 일자로 펴겠다고 바깥쪽을 세게 누르면 안쪽 연골이 완전히 으스러집니다. 역학을 거스르지 말고 근육 강화로 접근하세요.
    `,
  },
  {
    id: "knee-8",
    category: "무릎",
    title: "호파 지방패드 증후군 (Hoffa's Fat Pad Syndrome)",
    summary: "슬개건병증과의 감별 및 백니(Genu recurvatum) 통제",
    tags: ["호파증후군", "지방패드", "과신전"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
슬개건 바로 뒤 신경이 풍부한 지방 패드의 염증. 무릎 과신전 시 찝히며 통증 유발.

### 2. 평가 및 중재 프로토콜
- 슬개골 하극 양옆을 깊게 눌러 압통 확인. 무릎을 완전히 펼 때 압박 찌름 통증.

> **💡 20년 차 임상 팁**
> 이 환자들에게는 무릎 밑에 작은 수건을 대주고 약간 굽힌 채 걷게(Taping) 하거나, 굽은 무릎 자세를 교육하면 찝히는 통증이 즉시 사라집니다.
    `,
  },
  {
    id: "knee-9",
    category: "무릎",
    title: "오금근 건병증 (Popliteus Tendinopathy)",
    summary: "후외측 통증 감별 및 Garrick Test를 활용한 오금근 언락킹 문제 파악",
    tags: ["오금근", "후외측통증", "Unlocking"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
내리막 달리기 시 무릎의 잠김을 푸는(Unlocking) 오금근의 손상. 후외측 통증.

### 2. 평가 및 중재 프로토콜
- Garrick Test: 고관절 90/무릎 90 굴곡에서 저항성 내회전 시 오금 통증.

> **💡 20년 차 임상 팁**
> 다리 뒤 오금이 아프다고 종아리만 주무르지 마세요. 내리막길에서 아프다고 하면 오금근 건(Tendon)을 촉진해서 마찰 마사지를 적용해 보세요.
    `,
  },
  {
    id: "knee-10",
    category: "무릎",
    title: "베이커 낭종 (Baker's Cyst)",
    summary: "단순 물혹이 아닌, 반월상 연골 파열 등 관절 내 원인 추적의 중요성",
    tags: ["베이커낭종", "물혹", "원인추적"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
베이커 낭종은 관절 내부 문제(연골 파열, 관절염)로 인해 윤활액이 뒤로 새어 나간 '결과물'임.

### 2. 평가 및 중재 프로토콜
- 엎드려 오금을 촉진할 때 낭종 확인. 무릎 굴곡/신전 시 압박감. 관절 내 원인 평가 필수.

> **💡 20년 차 임상 팁**
> 주사기로 물을 빼도 며칠 뒤면 또 찹니다. 밑빠진 독에 물 붓기입니다. 낭종을 유발하는 무릎 관절 안쪽의 진짜 범인을 찾아야 완치됩니다.
    `,
  },

  // ==========================================
  // 🟤 5. [신경계 / Neuro] 데이터 10선
  // ==========================================
  {
    id: "neuro-1",
    category: "신경계",
    title: "다발성 경화증 우토프 현상 (MS - Uhthoff's Phenomenon)",
    summary: "체온 상승 시 탈수초성 전도 차단 악화 및 재활 온도 관리",
    tags: ["다발성경화증", "우토프", "열불내성"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
열 불내성(Heat intolerance). 체온이 0.5도만 올라도 신경전도가 차단되어 갑자기 마비 악화.

### 2. 평가 및 중재 프로토콜
- 실내 온도 낮추기, 얼음조끼 적용. 강도 높은 유산소 훈련 배제.

> **💡 20년 차 임상 팁**
> 춥다고 핫팩을 대주거나 온수 풀장에 넣으면 환자가 쓰러질 수 있습니다. 이 환자들에겐 '시원하고 짧게 휴식을 섞어서' 재활하는 것이 생명입니다.
    `,
  },
  {
    id: "neuro-2",
    category: "신경계",
    title: "길랭-바레 증후군 (GBS)",
    summary: "진행기 과로성 근위약(Overwork weakness) 방지 및 상행성 마비 관찰",
    tags: ["GBS", "상행성마비", "과로성위약"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
발끝부터 호흡근까지 위로 올라가는 상행성 마비. 급성기 무리한 운동은 회복 불능 신경 손상 유발.

### 2. 평가 및 중재 프로토콜
- 급성기 절대 안정 및 호흡기능 모니터링. 저항 훈련 철저히 금지.

> **💡 20년 차 임상 팁**
> 다리 힘 빠진다고 처음부터 스쿼트 시키면 다음 날 하반신 마비가 옵니다. 저림이 허벅지로 올라오는 양상이면 즉시 대학병원 신경과로 보내야 합니다.
    `,
  },
  {
    id: "neuro-3",
    category: "신경계",
    title: "당뇨병성 말초신경병증 (DPN) 감각 평가",
    summary: "보호 감각 소실 평가 및 모노필라멘트를 활용한 궤양 예방",
    tags: ["DPN", "당뇨발", "모노필라멘트"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
장갑-양말 분포 양상의 대칭성 감각 소실. 10g 모노필라멘트를 이용해 궤양 예방 감각 평가.

### 2. 평가 및 중재 프로토콜
- 발바닥 10개 부위에 필라멘트를 찔러 휘어질 때까지 압력을 가해 감각 여부 확인.

> **💡 20년 차 임상 팁**
> 당뇨 환자가 무릎 재활을 하러 와도 양말을 벗겨 발바닥을 보세요. 썩어가는데도 통증을 못 느끼는 경우가 많습니다. 핫팩 적용은 절대 금기입니다.
    `,
  },
  {
    id: "neuro-4",
    category: "신경계",
    title: "복합부위통증증후군 (CRPS) 진단 기준",
    summary: "Budapest 기준 감별 및 거울 신경 세포(Mirror therapy) 훈련",
    tags: ["CRPS", "이질통", "거울치료"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Budapest Criteria (감각, 혈관, 땀분비, 운동 4가지 영역 징후). 극심한 이질통 및 교감신경 폭풍.

### 2. 평가 및 중재 프로토콜
- 거울 뒤에 아픈 손을 숨기고 정상 손을 움직여 뇌를 속이는 거울 신경 치료 적용.

> **💡 20년 차 임상 팁**
> 굳은 손을 억지로 힘으로 꺾으려 하면 교감신경 폭풍이 옵니다. 시각적 환상을 통해 뇌 피질의 통증 지도를 재구조화하는 것이 첫걸음입니다.
    `,
  },
  {
    id: "neuro-5",
    category: "신경계",
    title: "근위축성 측삭경화증 (ALS, 루게릭병) 감별",
    summary: "상/하위 운동신경원 동시 손상 및 에너지 보존(Energy conservation) 전략",
    tags: ["ALS", "루게릭", "Fasciculation"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
UMN과 LMN 증상 동시 발현. 감각 신경 보존, 근육 씰룩거림(Fasciculations) 특징.

### 2. 평가 및 중재 프로토콜
- 근력 강화가 아닌 '에너지 보존' 전략 및 호흡 재활에 초점.

> **💡 20년 차 임상 팁**
> 감각은 정상인데 근육이 툭툭 튀고 마른다면 ALS를 의심하세요. 무리한 운동은 근육 파괴를 가속하므로 일상생활 동작 효율을 높여주는 게 핵심입니다.
    `,
  },
  {
    id: "neuro-6",
    category: "신경계",
    title: "척수손상 (SCI) 자율신경반사장애",
    summary: "T6 이상 척수 손상 환자의 응급 고혈압 감별 및 즉각 조치",
    tags: ["척수손상", "SCI", "자율신경반사장애"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
T6 이상 SCI 환자의 교감신경 과흥분 응급상황. 방광 팽창 등 유해 자극이 극심한 고혈압 유발.

### 2. 평가 및 중재 프로토콜
- 운동 중 두통, 안면 홍조, 서맥 관찰 시 즉시 환자를 앉히고 소변줄 막힘 등 원인 제거.

> **💡 20년 차 임상 팁**
> 혈압이 올랐다고 눕히면 뇌혈관이 터집니다. 직립 자세를 유지해 혈압을 낮추고, 10초 안에 바지가 끼거나 소변줄이 꼬이지 않았는지 찾아야 합니다.
    `,
  },
  {
    id: "neuro-7",
    category: "신경계",
    title: "편마비 푸셔 증후군 (Pusher Syndrome)",
    summary: "수직 감각(Postural vertical) 오류 극복을 위한 시각적 피드백 훈련",
    tags: ["편마비", "푸셔증후군", "시각피드백"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
신체 수직 감각이 마비측으로 18도 기울어졌다고 착각해 건측으로 바닥을 미는 현상.

### 2. 평가 및 중재 프로토콜
- 거울이나 수직 기둥을 활용한 시각적 수직(Visual vertical) 정보 제공 및 스스로 정렬 교정.

> **💡 20년 차 임상 팁**
> 환자를 힘으로 반대쪽으로 밀어붙이면 더 세게 저항합니다. "저 문틀 기둥에 어깨를 맞춰보세요"라고 시각적 환경을 주고 스스로 교정하게 유도하세요.
    `,
  },
  {
    id: "neuro-8",
    category: "신경계",
    title: "전정신경염 (Vestibular Neuritis) vs 이석증",
    summary: "지속성 현훈 감별 및 Head Impulse Test (HIT) 활용",
    tags: ["전정신경염", "어지럼증", "HIT검사"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
이석증과 달리 고개를 가만히 둬도 세상이 도는 지속성 현훈. Head Impulse Test (HIT).

### 2. 평가 및 중재 프로토콜
- 고개를 휙 돌릴 때 안구가 타겟을 놓치고 튀는 안구진탕(Saccade) 관찰. 약물 투여 후 시선 고정 훈련.

> **💡 20년 차 임상 팁**
> 눈을 감고 있어도 토할 것 같다면 이석증 검사하겠다고 눕히고 돌리지 마세요. 급성기엔 염증을 가라앉히는 게 먼저입니다.
    `,
  },
  {
    id: "neuro-9",
    category: "신경계",
    title: "소뇌성 실조증 (Cerebellar Ataxia)",
    summary: "협응 능력 저하 측정 및 관절 압박(Approximation)을 통한 제어 훈련",
    tags: ["실조증", "소뇌", "IntentionTremor"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
측정장애(Dysmetria)와 의도성 진전(Intention tremor). 타겟에 다가갈수록 심하게 떨림.

### 2. 평가 및 중재 프로토콜
- Finger-to-Nose 검사로 파킨슨 안정 시 진전과 감별. 관절 압박 수용기 자극(Weight cuff 등).

> **💡 20년 차 임상 팁**
> 떨리는 손을 잡아준다고 해결되지 않습니다. 팔목에 작은 모래주머니를 채워 관절을 압박해주면 거짓말처럼 헛스윙이 줄고 제어가 가능해집니다.
    `,
  },
  {
    id: "neuro-10",
    category: "신경계",
    title: "소아 테더드 코드 (Tethered Cord Syndrome)",
    summary: "급성장기 척수 결박으로 인한 소아 신경/배뇨 장애 응급 감별",
    tags: ["테더드코드", "급성장기", "소아신경외과"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
척수 끝부분(종사)이 비정상적으로 고정되어 척수가 당겨지는 질환. 척추측만증과 배뇨 장애 동반.

### 2. 평가 및 중재 프로토콜
- 까치발 보행, 요천추부 피부 함몰, 급작스러운 배뇨 실수 레드플래그 확인 시 즉시 의뢰.

> **💡 20년 차 임상 팁**
> 키가 훌쩍 크며 갑자기 허리 통증과 야뇨증을 호소한다면 스트레칭 시킬 때가 아닙니다. 척수가 찢어지고 있다는 증거이므로 소아신경외과로 보내야 합니다.
    `,
  },
];

const appendedClinicalLibraryDataVol2: ClinicalData[] = [
  // ==========================================
  // 🟢 1. [경추 / Cervical] 데이터 10선 (Vol.2)
  // ==========================================
  {
    id: "cervical-11",
    category: "경추",
    title: "경추 신경근병증의 수술적 적응증 (Progressive Deficit)",
    summary: "보존적 치료의 한계선과 진행성 신경 결손(Motor weakness) 감별",
    tags: ["신경근병증", "수술적응증", "레드플래그"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
단순한 통증이나 감각 저하는 보존적 치료 대상이나, '진행성 운동 신경 결손(Progressive motor deficit)'은 수술적 응급(Red Flag)에 해당.

### 2. 평가 및 중재 프로토콜
- 매 방문 시 C5(삼각근), C6(이두근), C7(삼두근), C8(수지굴근)의 도수근력검사(MMT) 수치 변화 기록.

> **💡 20년 차 임상 팁**
> 환자가 "통증은 줄었는데 팔이 안 올라가요"라고 하면 좋아할 일이 아닙니다. 통증 신경이 죽으면서 운동 신경까지 같이 죽고 있다는 최악의 사인입니다. 즉시 수술 의뢰하세요.
    `,
  },
  {
    id: "cervical-12",
    category: "경추",
    title: "소흉근 증후군 (Pectoralis Minor Syndrome)",
    summary: "TOS 감별 진단을 위한 Wright's test와 맥박 소실 확인",
    tags: ["TOS", "소흉근", "WrightTest"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
상완신경총이 오훼돌기(Coracoid) 아래 소흉근 하방에서 압박. 과도한 외전 시 맥박 소실.

### 2. 평가 및 중재 프로토콜
- Wright's test: 팔을 180도 외전 및 외회전 시키고 요골 동맥 맥박을 짚었을 때 맥박이 사라지거나 저림이 발생하면 양성.

> **💡 20년 차 임상 팁**
> 만세하고 자면 팔이 저리다는 환자는 목 디스크보다 소흉근 아래에서의 압박(TOS)일 확률이 높습니다. 침대 끝에 눕혀 팔을 떨어뜨리는 능동 스트레칭이 효과적입니다.
    `,
  },
  {
    id: "cervical-13",
    category: "경추",
    title: "목 디스크와 Modic Changes",
    summary: "MRI 소견 상 척추종판(Endplate)의 부종성 변화와 만성 통증",
    tags: ["MRI", "ModicChange", "만성통증"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
MRI T1/T2 강조 영상에서 확인되는 척추 종판의 염증성 부종(Modic Type 1)은 극심하고 잘 낫지 않는 기계적 통증과 높은 상관관계를 가짐.

### 2. 평가 및 중재 프로토콜
- MRI 판독지에 Modic Type 1이 있다면 단기적인 도수치료로 통증이 잡히지 않음을 고지. 보존적 재활 기간을 3배 이상 길게 잡아야 함.

> **💡 20년 차 임상 팁**
> 뼈 자체에 염증이 찬 상태입니다. 이 환자들에게 목을 꺾거나 강한 압박을 가하면 불난 집에 부채질하는 꼴입니다. 무조건 안정화와 견인으로 부하를 줄이세요.
    `,
  },
  {
    id: "cervical-14",
    category: "경추",
    title: "경추 후관절 주사 (Facet Block) 후 재활",
    summary: "차단술 직후 Pain-free window를 활용한 고유수용감각 재교육",
    tags: ["주사치료", "FacetBlock", "재활프로토콜"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
주사 치료(MBB 등)로 통증이 억제된 기간(Pain-free window) 동안 억제되었던 심부 근육을 재활성화해야 장기적 예후가 좋음.

### 2. 평가 및 중재 프로토콜
- 주사 후 3일 이내에 CCF(경장근 훈련) 및 레이저 포인터 트래킹 등 고유수용감각 훈련 시작.

> **💡 20년 차 임상 팁**
> 주사 맞고 안 아프다고 그냥 두면 한 달 뒤에 똑같이 아파서 옵니다. 주사는 염증을 껐을 뿐 굳어있는 관절과 죽어있는 근육을 살리진 못합니다. 안 아플 때가 진짜 재활의 골든타임입니다.
    `,
  },
  {
    id: "cervical-15",
    category: "경추",
    title: "사각근(Scalene) 단축과 호흡 패턴의 역학",
    summary: "흉식 호흡이 경추 근막에 미치는 만성적 부하와 횡격막 호흡 세팅",
    tags: ["사각근", "호흡패턴", "횡격막"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
사각근은 2차 호흡근(보조근)이나, 횡격막 기능 부전 시 1차 호흡근으로 과사용되며 경추에 하루 2만 번 이상의 압축 스트레스를 가함.

### 2. 평가 및 중재 프로토콜
- 편안하게 숨을 쉴 때 쇄골과 어깨가 위아래로 들썩이는지(Apical breathing) 확인. 

> **💡 20년 차 임상 팁**
> 목을 백날 주물러도 환자가 문 열고 나가면서 가슴으로 숨을 한 번 크게 쉬면 도로 뭉칩니다. 경추 환자 재활의 첫 번째는 코어 세팅을 동반한 360도 흉곽 확장 호흡 교육입니다.
    `,
  },
  {
    id: "cervical-16",
    category: "경추",
    title: "경장근 초음파 훈련 (Real-time US Feedback)",
    summary: "초음파를 활용한 경장근(Longus colli) 근비대 및 활성화 시각적 피드백",
    tags: ["초음파", "경장근", "바이오피드백"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
초음파(US) 시각 피드백을 동반한 DNF 훈련이 일반 압력 바이오피드백보다 근두께 증가와 통증 감소에 유의미하게 우수함.

### 2. 평가 및 중재 프로토콜
- 갑상선 옆 기관지 외측에 프로브를 대고 턱을 당길 때(Chin tuck) 경장근 밸리가 볼록해지는지 환자가 직접 화면으로 보게 함.

> **💡 20년 차 임상 팁**
> 환자들은 자신이 어느 근육에 힘을 주는지 모릅니다. 화면을 보여주며 "여기 목젖 옆에 숨어있는 이 까만 근육이 부풀어 오르는 느낌에 집중하세요"라고 하면 학습 속도가 10배 빨라집니다.
    `,
  },
  {
    id: "cervical-17",
    category: "경추",
    title: "편두통(Migraine)과 경추성 두통 감별",
    summary: "맥박성 통증, 전조증상(Aura) 및 빛/소리 공포증(Photophobia) 유무 확인",
    tags: ["편두통", "경추성두통", "감별진단"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
편두통은 혈관성 기전으로 약물 치료(Triptan 계열)가 우선이나, 경추성 두통은 물리적 인자에 의해 발생하여 도수치료가 효과적임.

### 2. 평가 및 중재 프로토콜
- 두통 전에 눈앞이 번쩍이거나(Aura), 심장 뛰듯이 욱신거리는지(Pulsating), 빛과 소리에 구역질이 나는지 문진.

> **💡 20년 차 임상 팁**
> 빛과 소리에 예민하고 구역질을 동반하는 편두통 환자에게 강한 상부 경추 마사지는 증상을 악화시킵니다. 물리치료의 대상이 아님을 인지하고 신경과로 보내는 것이 맞습니다.
    `,
  },
  {
    id: "cervical-18",
    category: "경추",
    title: "경추-흉추 이행부 (C-T Junction) 역학",
    summary: "Dowager's Hump(버팔로 험프)의 형성 원인 및 C7-T1 가동성 확보",
    tags: ["CTJunction", "버팔로험프", "가동성"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
가장 유동적인 경추와 가장 뻣뻣한 흉추가 만나는 C-T 접합부는 기계적 부하가 집중되는 곳. 지방 축적(Dowager's Hump)은 뼈를 보호하려는 인체의 보상 작용.

### 2. 평가 및 중재 프로토콜
- 엎드린 상태에서 C7과 T1 극돌기를 고정하고 경추 신전/회전 가동성(P-A glide) 평가.

> **💡 20년 차 임상 팁**
> 뒷목에 볼록 튀어나온 살을 빼겠다고 강하게 비비거나 지방분해 주사를 맞으면 안 됩니다. C7-T1의 뻣뻣함을 풀어 가동성을 만들어주면 몸이 더 이상 뼈를 보호할 필요가 없다고 느껴 살은 자연스럽게 빠집니다.
    `,
  },
  {
    id: "cervical-19",
    category: "경추",
    title: "경추 환자의 시각-운동 제어 (Visual-Motor Control)",
    summary: "안구 운동(Oculomotor)과 경추 굴곡근의 동시 활성화 훈련",
    tags: ["시각운동제어", "안구운동", "고유수용감각"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
경추 고유수용감각과 전정기관, 시각계는 신경학적으로 연결됨(COR/VOR). 안구 운동 결함 시 목 통증 만성화.

### 2. 평가 및 중재 프로토콜
- 머리를 고정한 채 눈동자만으로 좌우상하 타겟을 따라가는 추적(Smooth pursuit) 훈련 후 목 움직임 결합.

> **💡 20년 차 임상 팁**
> 목이 너무 아파서 1도도 못 움직이는 급성기 환자에게 억지로 목을 당기지 마세요. 가만히 누운 상태에서 눈동자만 좌우로 끝까지 굴리게 해도 후두하근이 릴리즈됩니다.
    `,
  },
  {
    id: "cervical-20",
    category: "경추",
    title: "수면 자세와 경추 베개(Pillow)의 인체공학",
    summary: "이상적인 경추 전만(Lordosis) 유지를 위한 수면 환경 세팅 지침",
    tags: ["경추베개", "수면자세", "전만유지"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
수면 시 목이 과굴곡(너무 높은 베개)되거나 측굴되면 디스크 내압 증가 및 후관절 압박 유발. 

### 2. 평가 및 중재 프로토콜
- 바로 누울 때는 경추 전만을 받쳐주는 7~10cm 높이, 옆으로 누울 때는 어깨 높이만큼 높은 10~15cm를 권장.

> **💡 20년 차 임상 팁**
> 비싼 기능성 베개가 무조건 좋은 게 아닙니다. 환자에게 "수건을 돌돌 말아 목덜미 빈 공간에만 쏙 채워 넣고 주무셔보세요"라고 권해보고, 통증이 줄면 그때 비슷한 높이의 베개를 사라고 교육하세요.
    `,
  },
  // ==========================================
  // 🔵 2. [요추 / Lumbar] 데이터 10선 (Vol.2)
  // ==========================================
  {
    id: "lumbar-11",
    category: "요추",
    title: "신경가동술: Flossing vs Tensioning",
    summary: "디스크 파열 시 신경의 유착 방지(Flossing)와 장력 부여(Tensioning)의 차이",
    tags: ["신경가동술", "Flossing", "Tensioning"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Tensioning(양끝에서 신경 당기기)은 급성 염증기 신경에 저산소증을 유발. 급성기엔 신경을 미끄러지게 하는 Flossing(Slider) 기법 필수.

### 2. 평가 및 중재 프로토콜
- 슬럼프 자세에서 고개를 들면서 무릎을 펴고(신경 당김 상쇄), 고개를 숙이면서 무릎을 굽힘(Flossing).

> **💡 20년 차 임상 팁**
> 다리 저린 환자에게 무작정 스트레칭하듯 신경을 팽팽하게 당기면 다음 날 걷지도 못합니다. 줄다리기가 아니라, 빨랫줄을 좌우로 스르륵 움직여 유착을 떼어내는 느낌으로 부드럽게 해야 합니다.
    `,
  },
  {
    id: "lumbar-12",
    category: "요추",
    title: "만성 요통과 뇌 가소성 (Cortical Smudging)",
    summary: "조직 손상이 없어도 뇌의 체성감각피질 지도가 번져서 느끼는 가짜 통증",
    tags: ["만성요통", "뇌가소성", "Smudging"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
6개월 이상 된 만성 요통은 허리의 문제가 아니라 뇌의 체성감각피질(S1)에서 허리를 인지하는 픽셀이 뭉개진(Smudging) 뇌의 병임.

### 2. 평가 및 중재 프로토콜
- 허리에 2개의 펜으로 찌를 때 1개로 느끼는지 2개로 느끼는지(Two-point discrimination) 평가.

> **💡 20년 차 임상 팁**
> 만성 요통 환자의 허리는 MRI상 깨끗한 경우가 많습니다. 이들에겐 허리 근력 강화보다, 뇌가 허리의 위치를 정확히 인지하도록 다양한 질감(수건, 브러시)으로 허리를 문질러주는 감각 피드백 훈련이 통증을 더 빨리 줄입니다.
    `,
  },
  {
    id: "lumbar-13",
    category: "요추",
    title: "임산부 골반통 (PGP) 및 ASLR 평가",
    summary: "릴렉신(Relaxin) 호르몬으로 인한 천장관절 불안정성과 코어 개입 확인",
    tags: ["임산부요통", "PGP", "ASLR"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
임신 중/산후 골반통(PGP)은 디스크와 다름. Active Straight Leg Raise (ASLR) 검사로 골반강(Pelvic ring)의 불안정성 평가.

### 2. 평가 및 중재 프로토콜
- 환자가 누워서 다리를 들기 힘들어할 때, 치료사가 골반 양옆을 꽉 조여주면(Force closure) 다리가 쉽게 들리는지 확인.

> **💡 20년 차 임상 팁**
> 산후 요통 환자에게 허리 마사지나 스트레칭은 불안정한 관절을 더 흔드는 꼴입니다. 골반 벨트로 꽉 묶어주거나 복횡근을 꽉 잡게 한 상태에서 움직이게 하면 통증이 사라집니다.
    `,
  },
  {
    id: "lumbar-14",
    category: "요추",
    title: "장골근(Iliacus) 단독 기능부전과 서혜부 통증",
    summary: "대요근(Psoas)과 장골근의 해부학적 차이 및 서혜부 깊은 찝힘 감별",
    tags: ["장골근", "서혜부통증", "고관절찝힘"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
대요근은 요추 추체에 붙어 허리 통증을 유발하지만, 골반 내측에 붙는 장골근은 단축 시 다리를 들어 올릴 때 서혜부(사타구니) 앞쪽의 찝힘(Pinching)을 유발함.

### 2. 평가 및 중재 프로토콜
- ASIS 내측으로 손가락을 깊게 밀어 넣어 장골와(Iliac fossa) 안쪽을 직접 촉진 및 릴리즈.

> **💡 20년 차 임상 팁**
> 스쿼트 할 때 사타구니가 찝힌다는 환자, 뼈(FAI) 문제로 단정 짓기 전에 장골근을 깊게 풀어보세요. 골반 내측 벽에 붙은 근막이 풀리면 가동범위가 마법처럼 열립니다.
    `,
  },
  {
    id: "lumbar-15",
    category: "요추",
    title: "다리길이 차이 (LLD) 해부학적 vs 기능적 감별",
    summary: "Tape measure와 Block test를 활용한 진짜 다리뼈 길이 차이 구별",
    tags: ["다리길이", "LLD", "기능적단족"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
대부분의 다리길이 차이는 골반 틀어짐에 의한 기능적 차이(Functional). 실제 뼈 길이 차이(True LLD)는 ASIS에서 내측 복사뼈까지 줄자로 측정.

### 2. 평가 및 중재 프로토콜
- 짧은 다리 쪽에 책이나 나무 블록(Block test)을 받치고 서게 하여 골반 수평과 척추 측만이 펴지는지 확인.

> **💡 20년 차 임상 팁**
> 누워서 다리 길이 재보고 "오른쪽 다리가 짧네요"라고 쉽게 말하지 마세요. 깔창(Shoe lift)은 진짜 뼈가 짧은 환자에게만 씁니다. 기능적 단족 환자에게 깔창을 주면 골반은 더 심하게 비틀어집니다.
    `,
  },
  {
    id: "lumbar-16",
    category: "요추",
    title: "척추측만증 (Schroth) 3차원 호흡 원리",
    summary: "오목한(Concave) 부위를 팽창시키는 RAB(Rotational Angular Breathing)",
    tags: ["척추측만증", "슈로스", "3차원호흡"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
측만증은 2차원적 좌우 휨이 아니라 회전을 동반한 3차원 변형. 찌그러진 오목면의 늑골을 호흡으로 밀어내는 RAB 기법이 필수적.

### 2. 평가 및 중재 프로토콜
- 오목한 흉곽 부위에 치료사의 손을 대고, 숨을 들이마실 때 손을 밀어내도록(팽창) 촉각 피드백 유도.

> **💡 20년 차 임상 팁**
> 측만증 아이들에게 철봉 매달리기나 허리 스트레칭만 시키면 일시적인 플라시보일 뿐입니다. 함몰된 갈비뼈 안쪽으로 공기를 불어 넣어 찌그러진 캔을 펴내는 호흡법을 가르쳐야 뼈가 펴집니다.
    `,
  },
  {
    id: "lumbar-17",
    category: "요추",
    title: "요추 수술 후 증후군 (FBSS) 유착 방지",
    summary: "디스크 절제술이나 유합술 후 발생하는 경막외 유착(Epidural fibrosis) 방지",
    tags: ["수술후재활", "FBSS", "유착방지"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
수술은 성공했으나 수술 부위의 흉터 조직(Scar tissue)이 신경을 다시 옥죄어 통증이 재발하는 현상. 조기 신경 가동술(Flossing)이 핵심.

### 2. 평가 및 중재 프로토콜
- 수술 후 상처가 아문 1~2주 차부터 눕거나 앉은 자세에서 부드러운 하지 신경 미끄러짐 훈련 실시.

> **💡 20년 차 임상 팁**
> 수술 후 환자가 몸을 아낀다고 한 달 동안 누워만 있으면 수술 칼자국 주변으로 신경이 떡이 되어 들러붙습니다. 아프지 않은 범위에서 부드럽게 다리를 폈다 굽혔다 하게 해서 신경길을 매끄럽게 닦아놔야 합니다.
    `,
  },
  {
    id: "lumbar-18",
    category: "요추",
    title: "대요근 역설 (Psoas Paradox)",
    summary: "대요근이 요추를 굽히는지 펴는지에 대한 논란과 척추 압박 부하",
    tags: ["대요근", "요추전만", "압박부하"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
대요근은 해부학적으로 요추 전만(Lordosis)을 증가시키기도 하지만, 강하게 수축할 경우 척추 분절을 짓누르는 거대한 '압박력(Compressive force)'으로 작용함.

### 2. 평가 및 중재 프로토콜
- 요통 환자에게 레그 레이즈(Leg raise)나 윗몸 일으키기 시 대요근의 강한 수축이 디스크 내압을 폭발적으로 증가시킴.

> **💡 20년 차 임상 팁**
> 누워서 양다리를 들어 올리는 복근 운동은 코어 운동이 아닙니다. 대요근이 허리뼈를 앞으로 강하게 잡아 뜯는 동작입니다. 허리 디스크 환자가 이 운동을 하면 디스크가 터질 수 있습니다.
    `,
  },
  {
    id: "lumbar-19",
    category: "요추",
    title: "천장관절 벨트의 올바른 착용 (Form & Force Closure)",
    summary: "골반의 역학적 안정성을 위한 천장관절 벨트의 정확한 위치 세팅",
    tags: ["천장관절", "SIJ벨트", "ForceClosure"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
SIJ 통증은 관절면의 아귀가 안 맞는 Form closure 결함. 벨트를 통해 외부에서 Force closure를 제공하면 통증 즉각 감소.

### 2. 평가 및 중재 프로토콜
- 벨트 착용 위치는 허리(요추)가 아니라, 대전자(Greater trochanter) 바로 위 골반뼈를 감싸도록 착용.

> **💡 20년 차 임상 팁**
> 많은 환자들이 골반 벨트를 허리 얇은 곳에 복대처럼 차고 옵니다. 그건 아무 소용이 없습니다. 엉덩이 양옆에 툭 튀어나온 뼈(대전자)를 기준으로 타이트하게 묶어줘야 걸을 때 골반이 안 흔들립니다.
    `,
  },
  {
    id: "lumbar-20",
    category: "요추",
    title: "골다공증성 압박 골절 (Compression Fx) 후 금기 운동",
    summary: "노인 환자의 척추체 붕괴를 막기 위한 철저한 굴곡(Flexion) 금지",
    tags: ["압박골절", "골다공증", "굴곡금지"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
골다공증 환자의 척추 압박 골절은 대부분 추체 '전방'이 찌그러짐. 허리를 굽히는(Flexion) 동작은 전방 부하를 극대화해 추가 골절을 유발.

### 2. 평가 및 중재 프로토콜
- 신전(Extension) 위주의 등척성 백 익스텐션(Back extension) 및 보행 훈련. 윗몸일으키기 절대 금기.

> **💡 20년 차 임상 팁**
> 시멘트 성형술(Vertebroplasty)을 하고 온 할머니들, 병원에서 운동하라고 했다며 누워서 고개 들고 윗몸 일으키기를 하십니다. 보는 즉시 말려야 합니다. 그 동작 한 번에 윗마디 뼈가 또 주저앉습니다.
    `,
  },
  // ==========================================
  // 🟠 3. [어깨 / Shoulder] 데이터 10선 (Vol.2)
  // ==========================================
  {
    id: "shoulder-11",
    category: "어깨",
    title: "석회성 건염 (Calcific Tendinitis) 흡수기 극심한 통증",
    summary: "형성기보다 석회가 녹아 흡수되는 시기(Resorptive phase)에 통증이 극심한 이유",
    tags: ["석회성건염", "흡수기", "응급실"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
석회가 생길 때는 안 아프다가, 대식세포가 석회를 치약처럼 녹여 흡수하는 시기에 극심한 화학적 염증 반응이 일어나 통증이 최고조에 달함.

### 2. 평가 및 중재 프로토콜
- 팔을 아예 들지도 못하고 밤에 응급실을 갈 정도의 극심한 통증. 가벼운 진자 운동 외 모든 스트레칭 금지.

> **💡 20년 차 임상 팁**
> 환자가 "자고 일어났는데 갑자기 어깨가 끊어질 듯 아파요"라고 하면 석회 흡수기일 확률이 높습니다. 이때 굳은 걸 푼다며 억지로 마사지하면 환자 기절합니다. 스테로이드 주사(염증 끄기)가 최우선입니다.
    `,
  },
  {
    id: "shoulder-12",
    category: "어깨",
    title: "광배근(Latissimus dorsi) 단축과 어깨 굴곡 제한",
    summary: "Lat test를 통한 요추 보상 작용과 어깨 가동성 제한 감별",
    tags: ["광배근", "LatTest", "굴곡제한"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
광배근은 골반에서 상완골까지 이어지는 거대한 근육. 단축 시 팔을 끝까지 위로 올릴 때 요추가 과신전(보상 작용)됨.

### 2. 평가 및 중재 프로토콜
- 등을 벽에 완벽히 붙이고(요추 보상 통제) 만세를 했을 때, 팔이 벽에 안 닿거나 허리가 붕 뜬다면 광배근 단축.

> **💡 20년 차 임상 팁**
> 어깨 가동범위가 안 나오는 오버헤드 선수들, 어깨 관절만 백날 꺾어도 안 늘어납니다. 광배근과 대원근 부착부를 릴리즈하고 허리를 고정한 채 만세 시키면 거짓말처럼 팔이 뒤로 넘어갑니다.
    `,
  },
  {
    id: "shoulder-13",
    category: "어깨",
    title: "소원근(Teres Minor) 단독 약화 감별 (Patte Test)",
    summary: "극하근과 소원근의 기능적 분리 평가 및 외회전 지연 징후",
    tags: ["소원근", "PatteTest", "외회전"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
어깨 90도 외전 상태에서의 외회전은 소원근이 주동근, 팔을 내린 상태(0도)에서의 외회전은 극하근이 주동근.

### 2. 평가 및 중재 프로토콜
- Patte Test: 어깨 90도 외전, 팔꿈치 90도 굴곡 상태에서 치료사가 외회전을 방해할 때 버티지 못하면 소원근 파열 의심.

> **💡 20년 차 임상 팁**
> 튜빙 밴드로 팔을 옆구리에 붙이고 하는 외회전 운동만 시키면 소원근은 발달하지 않습니다. 투수나 수영 선수는 반드시 팔을 90도 든 상태(90/90 position)에서 외회전 저항 운동을 해야 합니다.
    `,
  },
  {
    id: "shoulder-14",
    category: "어깨",
    title: "극상근 파열 수술(RCR) 후 지연성 재활의 장점",
    summary: "수술 후 조기 움직임(Early motion)보다 4~6주 고정(Delayed)이 재파열을 막는 근거",
    tags: ["수술후재활", "회전근개파열", "고정기간"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
수술로 꿰맨 힘줄이 뼈에 융합(Tendon-to-bone healing)되는 데는 최소 4~6주 소요. 조기 수동 운동 시 융합 부위 미세 손상 위험 큼.

### 2. 평가 및 중재 프로토콜
- 대형 파열(Massive tear)의 경우 6주간 철저한 보조기(Abduction brace) 착용. 진자 운동도 제한적으로 시행.

> **💡 20년 차 임상 팁**
> 환자가 "옆 병실 사람은 벌써 팔 꺾기 스트레칭하던데 나는 왜 꽁꽁 묶어두냐"며 불만을 표할 때 단호해야 합니다. 굳은 어깨는 나중에 찢어서라도 풀 수 있지만, 떨어져 나간 힘줄은 재수술뿐입니다.
    `,
  },
  {
    id: "shoulder-15",
    category: "어깨",
    title: "방카르트(Bankart) 수술 후 외회전 제한의 중요성",
    summary: "전방 관절순 봉합 부위 보호를 위한 외회전 각도 통제 프로토콜",
    tags: ["방카르트", "전방탈구", "수술후재활"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
전방 탈구 수술(Bankart) 후 팔을 바깥으로 돌리는 '외회전(ER)' 동작은 꿰매놓은 전방 관절순을 직접적으로 팽팽하게 찢는 방향임.

### 2. 평가 및 중재 프로토콜
- 수술 후 4주까지는 팔을 내린 상태에서 외회전 0도(중립) 이상 넘기지 말 것. 90도 외전 상태에서의 외회전은 철저히 금기.

> **💡 20년 차 임상 팁**
> 방카르트 수술 환자에게 가동범위 빨리 내겠다고 막대기로 밖으로 미는 T-bar 운동 시키면 꿰맨 곳 다 터집니다. 이 환자들은 수술 후 3개월간은 "머리 뒤로 손깍지 끼지 마세요"라고 신신당부해야 합니다.
    `,
  },
  {
    id: "shoulder-16",
    category: "어깨",
    title: "어깨 전방 탈구 정복 후 위치 감각 재교육",
    summary: "어깨가 빠진 후 근력보다 선행되어야 할 관절 위치 감각(JPS) 훈련",
    tags: ["탈구", "고유수용감각", "JPS"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
탈구 시 관절낭의 고유수용성 감각 수용기가 찢어짐. 근력이 정상이어도 뇌가 팔의 위치를 몰라 다시 탈구(Recurrent dislocation) 발생.

### 2. 평가 및 중재 프로토콜
- Joint Position Sense (JPS) 검사: 눈을 감고 치료사가 특정 각도(예: 굴곡 60도)에 팔을 둔 뒤, 다시 스스로 그 각도를 찾게 하는 오차 훈련.

> **💡 20년 차 임상 팁**
> 어깨 빠졌던 환자에게 덤벨 쥐여주기 전에 짐볼을 벽에 대고 원 그리기(Wall wash)나 눈 감고 목표물 터치하기 훈련부터 시키세요. 뇌가 어깨의 좌표를 다시 세팅해야 재탈구를 막습니다.
    `,
  },
  {
    id: "shoulder-17",
    category: "어깨",
    title: "극상근 건병증의 허혈성 영역 (Critical Zone)",
    summary: "대결절 부착부에서 1cm 근위부의 혈관 분포 저하와 퇴행성 파열",
    tags: ["극상근", "CriticalZone", "허혈성"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
극상근 힘줄이 상완골 대결절에 붙는 지점 약 1cm 위는 혈류 공급이 거의 없는 'Critical Zone'으로, 팔을 내리고 있을 때 팽팽하게 당겨져 쥐어짜임(Wringing out).

### 2. 평가 및 중재 프로토콜
- 팔을 30도 정도 벌려주는 외전 보조기나 팔걸이가 극상근 혈류를 개선해 퇴행성 파열과 야간통을 예방함.

> **💡 20년 차 임상 팁**
> 극상근 건염 환자가 밤에 잘 때 너무 아파하면, 겨드랑이 사이에 도톰한 수건을 끼우고 주무시라고 하세요. 팔이 살짝 벌어지면 쥐어짜이던 혈관이 열리면서 혈액순환이 되어 통증이 싹 가라앉습니다.
    `,
  },
  {
    id: "shoulder-18",
    category: "어깨",
    title: "흉추 후만(Kyphosis)과 견갑상완리듬 역학",
    summary: "등이 굽으면 견봉하 공간(Subacromial space)이 물리적으로 좁아지는 원리",
    tags: ["흉추후만", "견갑상완리듬", "충돌증후군"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
흉추가 굽으면 견갑골은 전방경사(Anterior tilt) 및 하방회전(Downward rotation)됨. 이 상태에서 팔을 들면 견봉이 극상근을 찌르게 되어 100% 충돌 유발.

### 2. 평가 및 중재 프로토콜
- 어깨 충돌증후군 환자는 팔을 올리기 전에 흉추 폼롤러 신전(Thoracic extension) 가동성부터 확보해야 함.

> **💡 20년 차 임상 팁**
> 팔 올릴 때 아프다는 환자, 억지로 등허리를 구부정하게 만들고 팔을 올려보라고 하세요. 90도도 못 가서 턱 걸립니다. 어깨 치료의 8할은 굽은 등을 펴는 데서 시작합니다.
    `,
  },
  {
    id: "shoulder-19",
    category: "어깨",
    title: "상완이두근 장두 파열 (Popeye Deformity)",
    summary: "힘줄이 완전히 끊어져 뽀빠이 알통처럼 뭉치는 현상과 보존적 예후",
    tags: ["이두근파열", "뽀빠이징후", "보존적치료"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
장두(Long head)가 툭 끊어지면 오히려 기존의 어깨 통증이 사라짐. 근력 손실은 10~20% 미만으로 일상생활에 큰 지장 없어 노인은 수술하지 않음.

### 2. 평가 및 중재 프로토콜
- 팔에 힘을 줄 때 알통이 어깨 쪽이 아닌 팔꿈치 쪽으로 볼록하게 밀려 내려오는 뽀빠이 변형 관찰. 

> **💡 20년 차 임상 팁**
> 환자가 "어깨에서 뚝 소리가 나더니 갑자기 덜 아프고 팔에 알통이 생겼어요"라고 오면 놀라지 마세요. 끊어진 겁니다. 미용상 문제일 뿐 기능엔 큰 지장 없으니 단두(Short head) 근력 운동으로 대체 보완하면 됩니다.
    `,
  },
  {
    id: "shoulder-20",
    category: "어깨",
    title: "전방 관절낭 이완증 (AMBRI) 재활 전략",
    summary: "외상 없이 선천적으로 어깨가 헐거운 다방향 불안정성 환자 접근법",
    tags: ["AMBRI", "불안정성", "동적안정화"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Atraumatic, Multidirectional, Bilateral, Rehabilitation, Inferior capsular shift. 선천적으로 관절막이 느슨해 스트레칭은 철저히 금기.

### 2. 평가 및 중재 프로토콜
- Sulcus sign(팔을 아래로 당겼을 때 견봉 아래 움푹 파이는 징후) 양성. 근육을 통한 동적 안정화(Dynamic stabilization) 필수.

> **💡 20년 차 임상 팁**
> 10대, 20대 유연한 여학생들이 어깨가 무겁고 뻐근하다고 하면 마사지하고 늘려주지 마세요. 헐거워서 아픈 겁니다. 플랭크나 네발 기기 자세에서 버티는 체중 부하(CKC) 압박 훈련으로 어깨를 꽉 조여줘야 합니다.
    `,
  },
  // ==========================================
  // 🟣 4. [무릎 / Knee] 데이터 10선 (Vol.2)
  // ==========================================
  {
    id: "knee-11",
    category: "무릎",
    title: "ACL 반대측(Contralateral) 무릎 파열 위험",
    summary: "수술한 무릎보다 멀쩡했던 반대쪽 무릎이 끊어질 확률이 더 높은 역학",
    tags: ["ACL", "재파열", "보상작용"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
ACL 재건술 후 스포츠 복귀 시, 이식 건이 끊어질 확률보다 보상 작용으로 과사용된 반대쪽 건강한 무릎이 파열될 확률이 2배 이상 높음.

### 2. 평가 및 중재 프로토콜
- 건측(멀쩡한 쪽) 다리의 피로도와 착지 시 동적 외반(Dynamic valgus) 발생 여부를 수술측과 동일하게 엄격히 평가.

> **💡 20년 차 임상 팁**
> 재활의 포커스를 수술한 다리에만 맞추면 안 됩니다. 환자들은 무의식적으로 멀쩡한 다리에 체중을 다 싣고 점프합니다. 양발 착지 대칭성(Symmetry)이 확보되지 않으면 절대 복귀시키지 마세요.
    `,
  },
  {
    id: "knee-12",
    category: "무릎",
    title: "반월상 연골 봉합술(Repair) 후 체중 부하 금기",
    summary: "절제술(Meniscectomy)과 봉합술의 명확한 프로토콜 차이",
    tags: ["연골판봉합", "수술후재활", "NWB"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
찢어진 부위를 잘라낸 절제술은 다음 날부터 걷지만, 실로 꿰맨 봉합술은 체중이 실리며 맷돌처럼 갈리면 실이 다 뜯어짐. 4~6주 부분 체중 부하 제한 필수.

### 2. 평가 및 중재 프로토콜
- 굴곡 90도 제한 및 비체중부하(NWB) 상태에서 대퇴사두근 등척성 운동(Quad set) 유지.

> **💡 20년 차 임상 팁**
> 환자가 "옆 사람은 연골 수술하고 벌써 걷는데 나는 왜 목발 짚게 하냐"고 묻습니다. "저분은 찢어진 걸 쓰레기통에 버린 거고, 원장님은 평생 쓰려고 비싸게 꿰매 살려놓은 거라 실밥 터지면 안 됩니다"라고 단단히 교육하세요.
    `,
  },
  {
    id: "knee-13",
    category: "무릎",
    title: "비골신경 포착으로 인한 가짜 무릎 통증",
    summary: "종아리 바깥쪽 저림과 발목 힘빠짐을 동반하는 비골두 마찰 증후군",
    tags: ["비골신경", "신경포착", "가짜무릎통증"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
총비골신경(Common fibular nerve)이 무릎 바깥쪽 비골두(Fibular head) 목 부위를 감아 돌 때 타이트한 구조물에 눌려 통증 및 족하수 유발.

### 2. 평가 및 중재 프로토콜
- 무릎 바깥쪽이 아프면서 엄지발가락을 위로 들어 올리는 힘(EHL)이 반대쪽보다 약한지 확인. 비골두 주변 마사지 시 저림 유발 확인.

> **💡 20년 차 임상 팁**
> 다리 꼬고 앉는 습관이 있는 사람이 무릎 바깥쪽이 아프다고 오면 비골신경 포착을 의심하세요. 장경인대(IT Band) 문제로 착각하고 폼롤러로 세게 문지르면 신경이 다 뭉개져 마비가 올 수 있습니다.
    `,
  },
  {
    id: "knee-14",
    category: "무릎",
    title: "추벽 증후군 (Plica Syndrome) 감별",
    summary: "태아 시절 퇴화하지 않고 남은 무릎 내 막(Membrane)의 비후 및 찝힘",
    tags: ["추벽증후군", "무릎딱소리", "Plica"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
무릎 내측 추벽이 두꺼워져 무릎을 굽히고 펼 때 대퇴골 내측과와 마찰을 일으키며 뚝뚝 소리와 통증 유발. Medial patellar plica test.

### 2. 평가 및 중재 프로토콜
- 슬개골을 내측으로 밀고 무릎을 90도 굴곡에서 신전시킬 때 30도 부근에서 두꺼운 띠가 '툭' 하고 넘어가는 느낌(Snapping) 촉진.

> **💡 20년 차 임상 팁**
> 무릎 안쪽에서 뚝뚝 소리가 나면서 아픈 환자. 연골 파열(Meniscus)과 헷갈리기 쉽습니다. 손가락으로 슬개골 안쪽 모서리를 꾹 누르고 굽혔다 폈다 할 때 피아노줄 같은 게 튕기면 100% 추벽입니다.
    `,
  },
  {
    id: "knee-15",
    category: "무릎",
    title: "슬개대퇴관절염 환자의 계단 생체역학",
    summary: "계단 오르내릴 때 슬개골에 가해지는 체중의 3~5배 하중 원리",
    tags: ["슬개대퇴관절", "계단보행", "생체역학"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
무릎 굴곡 각도가 커질수록 슬개골이 대퇴골에 눌리는 압박력(PFJ reaction force)은 급수적으로 증가. 계단 내려갈 때가 오를 때보다 하중이 큼.

### 2. 평가 및 중재 프로토콜
- 초기 재활 시 깊은 스쿼트나 계단 내려가기 훈련 금지. 0~30도 내의 미니 스쿼트나 벽 스쿼트로 대체.

> **💡 20년 차 임상 팁**
> 무릎 앞이 아픈 어르신들에게 "계단 많이 오르세요"라고 처방하면 큰일 납니다. 근육이 버티지 못하면 연골이 맷돌처럼 갈립니다. 평지 걷기와 실내 자전거(안장 높게 세팅)가 가장 안전합니다.
    `,
  },
  {
    id: "knee-16",
    category: "무릎",
    title: "혈류제한훈련 (BFRT - Blood Flow Restriction)",
    summary: "수술 후 무거운 무게를 못 드는 환자의 근위축 방지 치트키",
    tags: ["BFRT", "근위축방지", "수술후재활"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
토니켓으로 정맥 피를 묶어 저산소 환경을 만들면, 1RM의 20~30% 가벼운 무게만 들어도 뇌는 고강도 운동으로 착각해 젖산과 성장호르몬을 대량 분비.

### 2. 평가 및 중재 프로토콜
- 십자인대나 연골 수술 직후 관절에 무거운 부하를 줄 수 없을 때, 맨몸 운동에 BFRT 커프를 적용해 대퇴사두근 위축(Atrophy) 완벽 방어.

> **💡 20년 차 임상 팁**
> 수술 후 다리가 새 꼬챙이처럼 얇아진 환자들에게 무거운 모래주머니 채우면 무릎 다 망가집니다. BFRT 채우고 맨몸으로 다리 들기만 시켜도 허벅지 터질 듯 펌핑되며 근육이 보존됩니다.
    `,
  },
  {
    id: "knee-17",
    category: "무릎",
    title: "박리성 골연골염 (OCD) 청소년 환자의 무릎 잠김",
    summary: "무릎 관절 안을 돌아다니는 유리체(Loose body)로 인한 급성 잠김",
    tags: ["OCD", "유리체", "무릎잠김"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
청소년기 과도한 스포츠로 대퇴골 연골 일부가 괴사하여 떨어져 나와 관절 안에 굴러다니는 질환. 관절 사이에 끼면 갑자기 무릎이 펴지지 않음.

### 2. 평가 및 중재 프로토콜
- 환자가 "멀쩡하다가 갑자기 뼈 사이에 돌멩이가 낀 것처럼 무릎이 안 펴져요"라고 호소하며 무릎을 살살 흔들면 다시 펴짐.

> **💡 20년 차 임상 팁**
> 10대 운동선수가 이런 증상을 호소한다면 억지로 무릎을 꺾어 펴지 마세요. 떨어진 뼛조각이 연골을 다 긁어놓습니다. 즉시 정형외과에서 내시경으로 뼛조각(Joint mouse) 제거 수술을 받아야 합니다.
    `,
  },
  {
    id: "knee-18",
    category: "무릎",
    title: "대퇴골 전경 (Femoral Anteversion)과 W-sitting",
    summary: "안짱걸음(Pigeon toe)을 걷는 소아의 해부학적 뼈 비틀림 평가",
    tags: ["대퇴골전경", "W자앉기", "안짱걸음"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
대퇴골 경부가 정상(15도)보다 앞으로 과도하게 비틀어져 태어난 아이들. 다리를 안으로 모으는 W자로 앉는 것을 가장 편안해함. Craig's Test.

### 2. 평가 및 중재 프로토콜
- 엎드려 무릎을 90도 굽히고 대전자(Trochanter)가 가장 튀어나오는 내/외회전 각도를 측정해 대퇴골 뼈의 비틀림 정도 확인.

> **💡 20년 차 임상 팁**
> 안짱걸음 걷는 아이 부모님들이 발 교정기 사다 신기는데, 뼈 자체가 안으로 비틀어져서 보상으로 발이 안으로 도는 겁니다. 억지로 발만 밖으로 틀면 무릎(슬개골)이 탈구됩니다. W자 앉기부터 금지시키세요.
    `,
  },
  {
    id: "knee-19",
    category: "무릎",
    title: "인공관절 치환술 (TKA) 후 굴곡 각도 회복 골든타임",
    summary: "수술 후 6주 이내 120도 확보를 위한 관절낭 유착 방지 전략",
    tags: ["TKA", "인공관절", "각도회복"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
TKA 수술 후 염증성 삼출액이 굳어 관절낭이 섬유화(Arthrofibrosis) 되기 전인 4~6주 이내가 가동범위를 내는 골든타임.

### 2. 평가 및 중재 프로토콜
- 통증을 참더라도 슬개골 상하 가동술(Patellar mob)과 함께 벽 미끄러지기(Wall slide)로 중력을 이용한 굴곡 확보.

> **💡 20년 차 임상 팁**
> 어르신들이 아프다고 한 달 동안 무릎 펴고 누워만 있으면 시멘트처럼 굳어버립니다. "어머니, 지금 눈물 찔끔 나게 꺾어 놔야 나중에 변기에 앉을 수 있습니다"라고 팩트 폭격을 해서라도 골든타임에 꺾어 놔야 합니다.
    `,
  },
  {
    id: "knee-20",
    category: "무릎",
    title: "거위발 건염 (Pes Anserinus Tendinopathy) 감별",
    summary: "무릎 내측 하단 통증 시 반월상 연골 파열 및 퇴행성 관절염 감별",
    tags: ["거위발건염", "내측통증", "Sartorius"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
봉공근, 박근, 반건양근 세 힘줄이 정강이 내측에 모여 붙는 지점의 마찰 염증. 무릎을 과도하게 모으는(Valgus) 타이트한 햄스트링/내전근이 원인.

### 2. 평가 및 중재 프로토콜
- 관절선(Joint line)보다 2~3cm 아래쪽 뼈 부착 부위의 명확한 압통. 계단 오를 때 찌르는 듯한 통증 호소.

> **💡 20년 차 임상 팁**
> 무릎 안쪽 아프다고 다 연골 파열이 아닙니다. 손가락으로 뼈마디 선을 눌러 아프면 연골, 그보다 두 손가락 아래 정강이뼈 표면을 눌러 아프면 거위발 건염입니다. 여긴 마사지보다 내전근 스트레칭이 직빵입니다.
    `,
  },
  // ==========================================
  // 🟤 5. [신경계 / Neuro] 데이터 10선 (Vol.2)
  // ==========================================
  {
    id: "neuro-11",
    category: "신경계",
    title: "편마비 보행: 발목 내반(Inversion) 보상과 보톡스",
    summary: "경직(Spasticity)으로 인한 까치발/안짱발의 역학과 보톡스 시술 후 중재",
    tags: ["편마비보행", "발목내반", "보톡스재활"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
뇌졸중 후 하지 시너지 패턴(신전근 경직)으로 비복근과 후경골근이 과활성화되어 발이 안으로 꼬이는(Equinovarus) 현상 발생.

### 2. 평가 및 중재 프로토콜
- 보톡스(Botulinum toxin) 주사로 종아리 경직을 푼 직후(2주 이내)가 전경골근(배측굴곡) 근력 훈련과 발목 스트레칭의 골든타임.

> **💡 20년 차 임상 팁**
> 환자가 발이 꼬여서 자꾸 넘어지려 할 때 플라스틱 보조기(AFO)만 너무 의존하면 남은 근육마저 다 죽습니다. 보톡스를 맞고 발목이 부드러워진 몇 달 동안 미친 듯이 발목 드는 훈련을 시켜야 보행이 바뀝니다.
    `,
  },
  {
    id: "neuro-12",
    category: "신경계",
    title: "파킨슨 소서증 (Micrographia)과 LSVT BIG",
    summary: "기저핵 병변으로 동작이 작아지는 현상을 타파하는 진폭 키우기 훈련",
    tags: ["파킨슨병", "LSVTBIG", "동작진폭"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
파킨슨 환자는 뇌에서 움직임의 크기(Amplitude)를 너무 작게 세팅하는 오류 발생. LSVT BIG 프로토콜은 과장될 정도의 큰 동작을 반복해 뇌를 재세팅.

### 2. 평가 및 중재 프로토콜
- 글씨를 쓸 때 갈수록 콩알만 해지는 증상(소서증) 관찰. 걷거나 움직일 때 "정상보다 2배 더 크게, 소리치며 움직이세요" 요구.

> **💡 20년 차 임상 팁**
> 파킨슨 환자에게 "발 끄지 말고 크게 걸으세요"라고 백날 말해도 안 됩니다. 환자 스스로는 100% 크게 걷는다고 착각하거든요. 과장된 큰 동작(BIG)을 수천 번 반복시켜 뇌의 '정상 크기' 기준점을 아예 높여놔야 합니다.
    `,
  },
  {
    id: "neuro-13",
    category: "신경계",
    title: "시야 결손 (Hemianopia) vs 편측 무시 (Hemineglect) 감별",
    summary: "안구 시각 경로 손상과 두정엽 인지 기능 손상의 명확한 구별법",
    tags: ["편측무시", "시야결손", "LineBisection"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
시야 결손은 진짜 안 보여서 고개를 돌려 물건을 찾는 반면, 편측 무시(우뇌 손상)는 시각은 정상이나 뇌가 왼쪽 공간의 존재 자체를 무시(인지 못함)함.

### 2. 평가 및 중재 프로토콜
- 선 나누기 검사(Line Bisection Test): 종이에 가로선을 긋고 정중앙을 자르라고 했을 때, 우측으로 심하게 치우치면 좌측 무시 확진.

> **💡 20년 차 임상 팁**
> 편측 무시 환자에게 "왼쪽 좀 보세요!"라고 다그치면 안 됩니다. 환자 세상엔 왼쪽이 아예 존재하지 않습니다. 환자의 우측에서 접근하다가 점점 좌측으로 넘어가며 시선을 끌어오는 시각 탐색 훈련이 필수입니다.
    `,
  },
  {
    id: "neuro-14",
    category: "신경계",
    title: "수근관 증후군 (CTS) 정중신경 가동술",
    summary: "Phalen Test의 한계 및 신경 유착을 푸는 슬라이딩(Sliding) 기법",
    tags: ["손목터널증후군", "PhalenTest", "정중신경가동술"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
수근관 내 압력 증가로 정중신경 압박. 단순히 손목을 구부리는 Phalen Test보다 엄지/검지 저림의 신경 분포 확인이 더 정확함.

### 2. 평가 및 중재 프로토콜
- 손목 신전, 팔꿈치 신전, 어깨 외전을 결합하여 정중신경을 부드럽게 당겼다 푸는 신경 가동술 적용.

> **💡 20년 차 임상 팁**
> 밤에 손 저려서 깬다는 환자분들, 손목에 찜질하고 손목 돌리기 체조 시키면 신경이 더 퉁퉁 부어오릅니다. 목부터 손끝까지 이어지는 정중신경길을 부드럽게 늘려 빼주는 신경 가동술 3분이면 꿀잠 주무십니다.
    `,
  },
  {
    id: "neuro-15",
    category: "신경계",
    title: "척수공동증 (Syringomyelia) 망토 감각 소실",
    summary: "척수 중심관 내 물혹으로 인한 온도/통증 감각 특이적 소실 감별",
    tags: ["척수공동증", "망토감각소실", "온도감각"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
척수 중심부에 물혹이 생기며 교차하는 척수시상로(통증/온도)를 먼저 파괴. 촉각/진동 감각은 멀쩡한 해리성 감각 소실(Dissociated sensory loss).

### 2. 평가 및 중재 프로토콜
- 목과 어깨, 양팔에 망토를 두른 모양(Cape-like)으로 감각이 소실됨. 차가운 캔과 따뜻한 팩을 대고 온도 구별 가능한지 평가.

> **💡 20년 차 임상 팁**
> 환자가 "샤워할 때 양쪽 어깨랑 팔에만 뜨거운 물 느낌이 안 나고 남의 살 같아요"라고 하면 100% 척수공동증입니다. 목 디스크로 오인하고 핫팩 대주다가 심각한 화상을 입을 수 있으니 온도 감각 검사가 최우선입니다.
    `,
  },
  {
    id: "neuro-16",
    category: "신경계",
    title: "대상포진 후 신경통 (PHN) 탈감작 훈련",
    summary: "극심한 신경병증성 이질통(Allodynia) 극복을 위한 TENS 및 피부 자극 프로토콜",
    tags: ["대상포진", "이질통", "탈감작"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
수포가 다 나아도 신경이 파괴되어 스치는 옷깃에도 칼로 베는 듯한 통증 유발. 약물 치료와 함께 탈감작(Desensitization) 물리치료 병행 필수.

### 2. 평가 및 중재 프로토콜
- 통증 부위 주변(원위부)에 TENS를 교차로 부착하여 관문조절설 유도. 실크-면-수건 순으로 피부 마찰 적응 훈련.

> **💡 20년 차 임상 팁**
> 대상포진 후 신경통 환자에게 전기치료 패드를 아픈 부위에 직접 붙이면 환자 기절합니다. 무조건 아픈 부위 양옆 안 아픈 피부에 붙여 척수 신경망을 속여야(관문 조절) 고통 없이 통증을 줄일 수 있습니다.
    `,
  },
  {
    id: "neuro-17",
    category: "신경계",
    title: "안면신경마비 (Bell's Palsy) 연합운동 방지",
    summary: "과도한 전기 자극 및 억지 운동이 유발하는 입-눈 연합운동(Synkinesis) 부작용",
    tags: ["구안와사", "안면마비", "연합운동"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
7번 뇌신경(안면신경) 마비. 회복 과정에서 신경 가지가 잘못 연결되면 입을 벌릴 때 눈이 감기는 기괴한 연합운동 부작용 발생.

### 2. 평가 및 중재 프로토콜
- 마비된 쪽을 억지로 움직이려 인상 쓰지 말고, 거울을 보며 건측(정상)과 환측이 대칭이 되는 '아주 작은 범위'에서만 근막 마사지 및 미소 연습.

> **💡 20년 차 임상 팁**
> 구안와사 왔다고 얼굴에 강한 전기치료(EST) 때리고 억지로 윙크하는 연습하면 얼굴 100% 비뚤어지게 굳습니다. 초기엔 무조건 테이핑으로 얼굴 처지는 것만 막아주고 신경이 올바른 길을 찾도록 기다려주는 게 최고입니다.
    `,
  },
  {
    id: "neuro-18",
    category: "신경계",
    title: "요추 파열성 디스크와 족하수 (Foot Drop) 보행",
    summary: "L4-5 신경근 압박으로 인한 발목 마비 보행 훈련 및 AFO vs FES 선택",
    tags: ["족하수", "FootDrop", "FES"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
L5 신경근 마비로 전경골근(Tibialis anterior) 기능 상실. 걷다가 발가락이 걸려 넘어지기 쉬운 계단 보행(Steppage gait) 발생.

### 2. 평가 및 중재 프로토콜
- 뒤꿈치로 걷기 불가능. 발목 보조기(AFO) 착용으로 넘어짐을 방지하거나, 보행 주기에 맞춰 전경골근에 전기 자극을 쏘는 FES 훈련 병행.

> **💡 20년 차 임상 팁**
> 발목이 떨어져서 덜덜거리며 걷는 디스크 환자에게 무조건 수술을 권할 건 아닙니다. 발가락이 까딱거릴 정도의 힘(Grade 2)만 남아있다면 3개월 내에 돌아올 확률이 높습니다. 그때까진 발목 보조기 차고 걷게 해서 낙상 피하는 게 우선입니다.
    `,
  },
  {
    id: "neuro-19",
    category: "신경계",
    title: "근이영양증 (DMD) Gowers' Sign 감별",
    summary: "소아 유전성 근육 위축 질환의 초기 징후와 편심성 수축(Eccentric) 금기",
    tags: ["근이영양증", "GowersSign", "편심성금기"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
Duchenne 근이영양증 환아. 골반 및 대퇴부 근력 저하로 바닥에서 일어날 때 자신의 몸통을 짚고 올라오는 Gowers' sign 관찰.

### 2. 평가 및 중재 프로토콜
- 근섬유가 파괴되는 병이므로, 계단 내려가기 같은 편심성 수축(Eccentric) 근력 운동 철저히 금기. 가벼운 수중 치료 및 구축 방지.

> **💡 20년 차 임상 팁**
> 걸음마가 늦고 자꾸 넘어지는 남자아이, 바닥에서 일어날 때 엉덩이부터 들고 양손으로 자기 무릎을 짚으면서 등반하듯 일어난다면 다리가 약한 게 아니라 100% 유전자 질환입니다. 근육 키운답시고 험한 운동 시키면 휠체어 타는 시기만 앞당깁니다.
    `,
  },
  {
    id: "neuro-20",
    category: "신경계",
    title: "치매 환자의 이중 과제 (Dual-Task) 보행 훈련",
    summary: "작업기억(Working memory)과 보행 속도의 연관성 및 인지-운동 결합 재활",
    tags: ["치매", "이중과제", "낙상예방"],
    updatedAt: "2026-04-23",
    content_md: `
### 1. EBP 근거 (Evidence)
알츠하이머나 경도인지장애 환자는 걸으면서 말할 때(Dual-task) 뇌 용량이 초과되어 걸음이 멈추거나 낙상함. 인지+운동 결합 훈련 필수.

### 2. 평가 및 중재 프로토콜
- 보행 중 "끝말잇기 해보세요" 또는 "100에서 7씩 빼보세요"라고 요구할 때 보행 속도가 20% 이상 줄어들면 낙상 고위험군.

> **💡 20년 차 임상 팁**
> 치매 어르신들에게 헬스장 걷기 운동만 시키는 건 반쪽짜리입니다. 뇌에 렉(Lag)이 걸려 넘어지는 분들이니, 치료사가 걷는 내내 "오늘 아침 반찬 뭐 드셨어요?" 질문을 던지며 멀티태스킹 기능을 뚫어줘야 진짜 낙상 예방이 됩니다.
    `,
  },
];

const categoryPrefixMap: Record<string, string> = {
  경추: "cervical",
  요추: "lumbar",
  어깨: "shoulder",
  무릎: "knee",
  신경계: "neuro",
};

function withUniqueRenumberedIds(items: ClinicalData[]): ClinicalData[] {
  const categoryCounter = new Map<string, number>();

  return items.map((item) => {
    const prefix = categoryPrefixMap[item.category] ?? "clinical";
    const next = (categoryCounter.get(prefix) ?? 0) + 1;
    categoryCounter.set(prefix, next);
    return { ...item, id: `${prefix}-${next}` };
  });
}

const mergedClinicalLibraryData: ClinicalData[] = withUniqueRenumberedIds([
  ...baseClinicalLibraryData,
  ...appendedClinicalLibraryData,
  ...appendedClinicalLibraryDataVol2,
]);

const clinicalTipLabelRegex = /20년\s*차\s*임상\s*팁|20년차\s*임상\s*팁|20년\s*차\s*실무\s*팁|입상\s*탑/g;
export const clinicalLibraryData: ClinicalData[] = mergedClinicalLibraryData.map((item) => ({
  ...item,
  content_md: item.content_md.replace(clinicalTipLabelRegex, "임상 팁"),
}));

// Backward compatibility for existing imports
export type ClinicalLibraryMockItem = ClinicalData;
export const clinicalData = clinicalLibraryData;
