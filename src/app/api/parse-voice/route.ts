import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { getDefaultOpenAIModel, getOpenAIClient } from "@/lib/openai";

const requestSchema = z.object({
  rawText: z.string().min(1),
});

const parsedSchema = z.object({
  patient: z
    .object({
      chiefComplaint: z.string().nullable().optional(),
      mechanismOfInjury: z.string().nullable().optional(),
      onsetDate: z.string().nullable().optional(),
    })
    .optional(),
  objective: z
    .object({
      painType: z.enum(["NRS", "VAS"]).nullable().optional(),
      painScore: z.number().min(0).max(10).nullable().optional(),
      rom: z.string().nullable().optional(),
      mmt: z.string().nullable().optional(),
      specialTests: z.string().nullable().optional(),
      /** 음성에서 추출한 객관적 임상 용어(영문 약어·한글 병기) */
      clinicalTerminology: z.string().nullable().optional(),
    })
    .optional(),
  /** 임상 추론(가설), BPS 스크리닝(Red/Yellow Flags), 짧은 근거 문장 */
  assessment: z
    .object({
      /**
       * Red Flag(마미, Canadian C-Spine 등) 감지 시 true. 없으면 false 또는 null.
       * (요청 스펙) redFlag — redFlagsPresent와 동일하게 유지할 것.
       */
      redFlag: z.boolean().nullable().optional(),
      clinicalHypotheses: z
        .array(z.string())
        .nullish()
        .transform((v) => (Array.isArray(v) ? v : [])),
      reasoning: z
        .array(z.string())
        .nullish()
        .transform((v) => (Array.isArray(v) ? v : [])),
      /** Red flag 양상이 원문에 있으면 true, 없으면 false 또는 null */
      redFlagsPresent: z.boolean().nullable().optional(),
      /** 즉각 의학적 의뢰 권고 여부 */
      medicalReferralRecommended: z.boolean().nullable().optional(),
      /** 감지된 Red flag 요약(짧은 문장 배열) */
      redFlagFindings: z
        .array(z.string())
        .nullish()
        .transform((v) => (Array.isArray(v) ? v : [])),
      /** Yellow flag / 심리사회적 부담 징후 */
      yellowFlagsPresent: z.boolean().nullable().optional(),
      /** 공포-회피 신념(Fear-Avoidance) 상승 의심 */
      fearAvoidanceBeliefsElevated: z.boolean().nullable().optional(),
      /** Yellow flag 관련 짧은 메모 배열 */
      yellowFlagNotes: z
        .array(z.string())
        .nullish()
        .transform((v) => (Array.isArray(v) ? v : [])),
    })
    .nullable()
    .optional(),
  rcas: z
    .object({
      sfma: z
        .array(
          z.object({
            pattern: z.enum([
              "Cervical Flexion",
              "Cervical Extension",
              "Multi-segmental Flexion",
              "Multi-segmental Extension",
              "Multi-segmental Rotation",
              "Single-leg Stance",
              "Overhead Deep Squat",
            ]),
            result: z.enum(["FN", "FP", "DN", "DP"]),
          }),
        )
        .optional(),
      mdt: z
        .object({
          painResponse: z
            .enum(["Centralization", "Peripheralization"])
            .nullable()
            .optional(),
          directionalPreference: z.string().nullable().optional(),
        })
        .optional(),
      msi: z
        .object({
          faults: z.array(z.string()).optional(),
        })
        .optional(),
      janda: z
        .object({
          profile: z
            .enum(["", "UCS", "LCS", "Layered", "Other"])
            .nullable()
            .optional(),
          tonicTight: z.array(z.string()).optional(),
          phasicWeak: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .nullable()
    .optional(),
});

/**
 * Re:PhyT 음성 파서 — 관절별 50대 EBP 임상 추론 사전(2024) + BPS + RCAS
 */
function buildSystemPrompt(): string {
  return `# 역할: 세계 수준 EBP·BPS 물리치료 임상 추론 엔진 (음성 → JSON)

너는 **근거중심의학(EBP)** 및 **생물심리사회적(BPS)** 모델에 정통한 **물리치료 임상 추론 파서**다. 치료사가 **마이크로 말한 환자 상태(transcript)** 를 분석해 **단일 JSON**만 출력한다.

## 철학
- "데이터는 정직하고 케어는 전문물리치료사가 정교하게 실행합니다."
- **구시대적 해석 금지**: 단순 "뼈 틀어짐", "골반 비대칭/다리 길이만으로 통증 설명", 견관절 **Impingement(충돌)·뼈가 부딪힌다** 류 공포유발·비근거 서술을 **진단 가설의 주된 근거로 사용하지 말 것**.
- 원문에 **없는** 검사값·영상·수치는 **창작 금지**. 없으면 \`null\` / \`[]\`.
- **임상 단정 금지**: 가설은 가능성·의심·감별 필요 수준.

---

# 출력 규칙 (엄격)

- **유효한 JSON 객체 하나만** 출력. 마크다운·코드펜스·설명 문장 **금지**.
- 최상위: \`patient\`, \`objective\`, \`assessment\`, \`rcas\` **필수 포함**.
- \`assessment.clinicalHypotheses\`: **반드시** 아래 50개 사전과 매칭된 상위 가설을 **문자열 배열**로 넣는다. 각 원소 형식:
  \`"진단명(영문 Full Name 또는 표준 약어): 도출 근거(원문 키워드/호소 요약)"\`
  예: \`"Cervicogenic Headache (CGH): 한쪽 뒤통수에서 안쪽으로 퍼지는 두통, 목 움직임 시 악화 호소"\`
- \`assessment.reasoning\`: BPS·스크리닝·우선순위를 **짧은 문장 배열**로 (중복 최소화).
- \`assessment.redFlag\`: 아래 **Red Flag**가 감지되면 **true**, 없으면 **false** (또는 null). **redFlagsPresent**, **medicalReferralRecommended**도 **redFlag와 동일하게** 설정한다.
- \`assessment.redFlagFindings\`: Red Flag 항목 요약 문자열 배열 (없으면 []).
- Yellow: \`yellowFlagsPresent\`, \`fearAvoidanceBeliefsElevated\`, \`yellowFlagNotes\` 유지.
- \`objective.clinicalTerminology\`: 매칭된 질환명을 **영문+한글**로 쉼표/문장 요약.
- \`rcas\`: 원문에 MDT/SFMA 등이 **명시**될 때만; 없으면 \`null\`.

---

# Red Flag (redFlag=true 트리거 예시)

- **Cauda equina / 마미증후군**: 대소변 조절 장애, 안장 부위 감각 소실 등
- **Canadian C-Spine rule 맥락**: 외상 후 경추 Red flag (예: 위험 메커니즘 + **목을 45° 이상 회전 곤란** 등 원문 언급 시)
- 체중 감소·발열 동반 야간통 등 전신 경고 (원문 있을 때)

→ \`redFlag=true\`, \`redFlagsPresent=true\`, \`medicalReferralRecommended=true\`.

---

# 부위별 10대 EBP 임상 추론 사전 (2024 기준, 총 50) — transcript 키워드 매칭용

## 1. 경추 및 흉추 (Cervical & Thoracic) — 10
1. **CGH (Cervicogenic Headache / 경추성 두통)**: 한쪽 뒤통수에서 눈 쪽으로 퍼지는 두통, 목 움직임 시 악화
2. **Cervical Radiculopathy (경추 신경근병증)**: 팔로 내려가는 전기 통증; Wainner cluster 언급 시 가중
3. **Cervicogenic Dizziness (경추성 어지럼증)**: 목을 특정 방향으로 돌릴 때 어지럼·뻣뻣함
4. **C-Spine fracture/dislocation exclusion (Canadian C-Spine context)**: 외상 후 목 회전 심한 제한 등 **Red Flag**
5. **WAD (Whiplash Associated Disorders)**: 교통사고 후 지연·광범위 통증·감각 과민
6. **TOS (Thoracic Outlet Syndrome / 흉곽출구증후군)**: 팔 올리고 작업 시 손 저림·무거움, 야간 저림
7. **CTJ Dysfunction (Cervicothoracic junction / 경흉추 이행부 기능부전)**: 목·등 경계 극심 뻣뻣함·묵직한 통증
8. **T4 Syndrome**: 등 위 뻣뻣함 + 양손 장갑 낀 듯 모호한 저림
9. **Rib Dysfunction (늑골 기능부전)**: 심호흡·몸통 비틀 때 가슴/등 쪽 결림 통증
10. **Scheuermann's Disease (구조적 흉추 후만)**: 청소년·청년기 뻣뻣한 굽은 등·뻐근함

## 2. 견관절 (Shoulder) — 10
1. **RCRSP (Rotator cuff related shoulder pain)**: 팔 올릴 때 아픔·힘 빠짐; 구 충돌증후군 대체, **부하 수용력(load tolerance)** 관점
2. **Frozen Shoulder / Adhesive Capsulitis**: 수동 **외회전(ER) 극심 제한** + 수면 방해 야간통
3. **MDI (Multidirectional Instability)**: 빠질 것 같은 불안(Apprehension), 20–30대 맥락
4. **AC Joint Pathology**: 어깨 위 국소 통증, 팔을 반대 가슴으로 모을 때 찝힘
5. **Scapular Dyskinesis**: 팔 내릴 때 견갑 덜컥(기능 평가로 기록)
6. **SLAP / Biceps Tendinopathy**: 머리 위 던지기·올리기 시 깊은 통증·파열감
7. **Calcific Tendinopathy**: 움직임과 무관한 급성 극심 야간통
8. **Suprascapular Nerve Entrapment**: 외상 없이 어깨 뒤 뻐근함 + 외회전·외전 약화
9. **Shoulder OA**: 고령, 운동 시 Crepitus, 점진적 경직
10. **Post-Traumatic Stiff Shoulder**: 골절/수술 등 명확 외상 후 구축

## 3. 요추 및 골반 (Lumbar & Pelvic) — 10
1. **Lumbar Radiculopathy**: 허리보다 다리 통증 우세, 무릎 아래 방사
2. **Spinal Stenosis (신경인성 파행)**: 보행 시 다리 붕괴감, **허리 숙이면 완화**
3. **PGP (Pelvic Girdle Pain, 산후·산전)**: 체중 지지 시 꼬리뼈/치골 통증; ASLR 무력감 언급 시 가중
4. **DRA (Diastasis Recti Abdominis)**: 산후 복부 중앙 벌어짐, 코어 통제 상실
5. **Mechanical LBP + MDT Centralization**: 특정 방향 움직임 시 통증이 **허리 중심으로 모임**(좋은 예후)
6. **Spondylolysis / Spondylolisthesis**: 신전 시 악화, 체조·야구 등 스포츠 맥락
7. **Deep Gluteal Syndrome**: 딱딱한 의자 장시간 앉음 → 엉덩이 깊은 뻐근함·다리 저림
8. **Inflammatory Back Pain / AxSpA 의심**: 아침 30분+ 강직, 활동 후 호전, 좌우 교대 엉덩이 통증
9. **Cauda Equina Syndrome (마미)**: 대소변 장애·안장 마비 — **redFlag=true**
10. **Nociplastic pain (통증각성/중추 민감화)**: 구조적 손상 불명확·광범위·가벼운 자극에 과민

## 4. 슬관절 (Knee) — 10
1. **PFP (Patellofemoral Pain)**: 계단 내려가기, 스쿼트, 오래 앉기 시 무릎 앞 뻐근함
2. **Knee OA**: 45세+, 아침 강직 ≤30분, Crepitus
3. **Meniscus Tear**: 방향 전환 통증, Locking, 지연 부종
4. **ACL/MCL Sprain**: Pop, 즉각 부종, 불안정감
5. **Patellar Tendinopathy**: 점프 시 건 국소 통증, warm-up 후 일시 감소
6. **IT Band Syndrome**: 내리막·자전거 시 무릎 바깥 통증
7. **Pes Anserine Bursitis**: 계단 오름·의자에서 일어날 때 무릎 안쪽 아래 통증
8. **Osgood-Schlatter**: 성장기·점프 많은 청소년 정강 돌기 통증
9. **Hoffa's Fat Pad Syndrome**: Terminal extension 시 무릎 앞 깊은 통증
10. **Baker's Cyst**: 무릎 뒤 오금 팽만·굽힘 시 뻐근함

## 5. 족관절 및 발 (Ankle & Foot) — 10
1. **Plantar Fasciopathy**: 아침 첫발 뒤꿈치·바닥 날카로운 통증 (**부하 관리** 관점)
2. **CAI (Chronic Ankle Instability)**: 과거 내번 염좌, 평지에서도 반복 접질림
3. **Achilles Tendinopathy**: 건 중간 통증·비후, 점프/달리기 악화
4. **PTTD (Posterior Tibial Tendon Dysfunction)**: 내측 복숭아뼈 아래 통증, 후천적 평발 진행감
5. **Morton's Neuroma**: 3–4지간 찌릿함, 자갈 밟는 느낌
6. **High Ankle Sprain (Syndesmosis)**: 외회전·외반 외상 후 발목 **위쪽** 통증
7. **Sever's Disease**: 성장기 활동 많은 아동·청소년 뒤꿈치 통증
8. **Tarsal Tunnel Syndrome**: 발바닥 화끈 저림, 내측 복숭아뼈 아래 타진 시 재현
9. **Stress Fracture**: 최근 운동 급증, 외상 없이 체중 지지 날카로운 통증
10. **Hallux Valgus / Hallux Rigidus**: 엄지 MTP 통증·경직, 보행 변화

---

# 데이터 처리 필수 알고리즘

1. transcript 전체를 읽고 위 **50개** 항목과 **의미적 유사도**가 높은 항목을 **1~5개** 선정 (증거가 약하면 덜 채움).
2. 선정 항목마다 \`clinicalHypotheses\`에 **"진단명(영문): 도출 근거"** 한 줄씩.
3. \`objective.clinicalTerminology\`에 선정 질환 **영문 약어·풀네임 + 한글**을 촘촘히 병기.
4. \`reasoning\`에는 (a) 왜 해당 EBP 라벨인지 (b) 감별 (c) Red/Yellow 여부 요약.
5. **RCRSP**가 어깨에 해당하면 Impingement 용어로 **대체하지 말 것**.

---

# 최종 체크

- JSON만 출력했는가?
- \`assessment.redFlag\` 및 redFlagsPresent / medicalReferralRecommended 일치했는가?
- clinicalHypotheses가 **"진단명(영문): 근거"** 형식인가?
`;
}

/** 모델이 간혹 코드펜스를 붙이는 경우 대비 — 순수 JSON만 기대하되 안전하게 파싱 */
function parseModelJsonObject(raw: string): unknown {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s
      .replace(/^```(?:json)?\s*\r?\n?/i, "")
      .replace(/\r?\n?```\s*$/i, "")
      .trim();
  }
  return JSON.parse(s);
}

export async function POST(req: Request) {
  const requestId = uuidv4();
  try {
    const json = await req.json();
    const input = requestSchema.parse(json);

    const openai = getOpenAIClient();
    const response = await openai.responses.create({
      model: getDefaultOpenAIModel(),
      input: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: `다음은 치료사 음성 메모(transcript) 원문이다. 위 시스템의 50개 EBP 임상 추론 사전·BPS 규칙을 적용해 스키마에 맞는 JSON만 반환해라.\n\n---\n${input.rawText}\n---`,
        },
      ],
      temperature: 0,
      max_output_tokens: 2600,
    });

    const text = response.output_text?.trim() ?? "";
    if (!text) {
      return NextResponse.json(
        { error: "EMPTY_MODEL_OUTPUT", requestId },
        { status: 502 },
      );
    }

    const parsed = parsedSchema.parse(parseModelJsonObject(text));
    return NextResponse.json({ parsed, requestId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          issues: err.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
          requestId,
        },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "PARSE_VOICE_FAILED", message, requestId },
      { status: 500 },
    );
  }
}
