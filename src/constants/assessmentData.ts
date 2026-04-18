/** Elbow & Wrist EBP 마스터 (ROM + 특수검사 메타) */
export const elbowWristMasterCode = [
  {
    id: "elbow",
    label: "Elbow (팔꿈치)",
    rom: [
      { id: "elb_flex", name: "Flexion" },
      { id: "elb_ext", name: "Extension" },
      { id: "elb_sup", name: "Supination" },
      { id: "elb_pro", name: "Pronation" },
    ],
    specialTests: [
      // 1. 외측상과염 건병증 회복의 절대적/정량적 지표 (단순 통증 유발 검사 대체)
      {
        id: "st_pain_free_grip",
        name: "Pain-Free Grip Strength (PFGS)",
        purpose: "외측상과 건병증 정량적 회복 평가",
        isLatestEBP: true,
      },
      // 2. 던지기 손상 및 내측 인대 미세 파열 진단의 EBP (기존 Valgus 대체)
      {
        id: "st_mvst",
        name: "Moving Valgus Stress Test (MVST)",
        purpose: "척골측부인대(UCL) 불안정성",
        isLatestEBP: true,
      },
      // 3. 원위 상완이두근 파열 감별 (민감도/특이도 100%에 가까운 최신 EBP)
      {
        id: "st_hook",
        name: "Hook Test",
        purpose: "원위 이두근 건 완전 파열 감별",
        isLatestEBP: true,
      },
      // 4. 주관증후군 포착 부위의 정확한 국소화 (기존 Tinel보다 우수한 신뢰도)
      {
        id: "st_scratch_collapse",
        name: "Scratch Collapse Test",
        purpose: "척골신경 포착(Cubital Tunnel Syndrome)",
        isLatestEBP: true,
      },
      // 5. 만성 팔꿈치 불안정성의 핵심 지표
      {
        id: "st_plri",
        name: "Posterolateral Rotary Instability (PLRI) Test",
        purpose: "외측척골측부인대(LUCL) 결손",
        isLatestEBP: true,
      },
    ],
  },
  {
    id: "wrist_hand",
    label: "Wrist & Hand (손목/손)",
    rom: [
      { id: "wrt_flex", name: "Flexion" },
      { id: "wrt_ext", name: "Extension" },
      { id: "wrt_rad_dev", name: "Radial Deviation" },
      { id: "wrt_uln_dev", name: "Ulnar Deviation" },
    ],
    specialTests: [
      // 1. 수근관 증후군 진단 최고 민감도 (기존 Phalen/Tinel 테스트 완벽 대체)
      {
        id: "st_durkan",
        name: "Durkan's Carpal Compression Test",
        purpose: "수근관 증후군(CTS) 압도적 특이도",
        isLatestEBP: true,
      },
      // 2. 드퀘르벵 진단 시 기존 Finkelstein의 위양성(False Positive) 한계 극복
      {
        id: "st_what",
        name: "WHAT Test (Wrist Hyperflexion and Abduction of the Thumb)",
        purpose: "드퀘르벵 건초염 감별",
        isLatestEBP: true,
      },
      // 3. 새끼손가락 쪽 손목 통증(Ulnar sided wrist pain)의 핵심
      {
        id: "st_fovea",
        name: "Fovea Sign",
        purpose: "삼각섬유연골복합체(TFCC) Foveal tear",
        isLatestEBP: true,
      },
      // 4. 손목을 짚고 넘어졌을 때 인대 손상 감별
      {
        id: "st_scaphoid_shift",
        name: "Scaphoid Shift Test (Watson Test)",
        purpose: "주상월상(Scapholunate) 인대 불안정성",
        isLatestEBP: true,
      },
      // 5. 현대인의 잦은 스마트폰 사용으로 인한 엄지손가락 기저부 관절염
      {
        id: "st_cmc_grind",
        name: "Thumb CMC Grind Test",
        purpose: "무지수근중수관절(CMC) 골관절염",
        isLatestEBP: true,
      },
    ],
  },
] as const;

export type EbpSpecialTest = {
  id: string;
  name: string;
  paper: string;
  purpose: string;
};

function specialTestsToEbp(tests: readonly { id: string; name: string; purpose: string; isLatestEBP?: boolean }[]): EbpSpecialTest[] {
  return tests.map((t) => ({
    id: t.id,
    name: t.name,
    paper: t.isLatestEBP ? "Latest EBP" : "—",
    purpose: t.purpose,
  }));
}

const elbowRegion = elbowWristMasterCode.find((r) => r.id === "elbow")!;
const wristHandRegion = elbowWristMasterCode.find((r) => r.id === "wrist_hand")!;

/**
 * SOAP AI·특수검사 UI용 평면 DB (관절 키 → 특수검사 배열)
 * elbow / wrist_hand 는 `elbowWristMasterCode`에서 파생
 */
export const ebpDatabase = {
  cervical: [
    { id: "spurling", name: "Spurling's Test", paper: "Spurling (1944)", purpose: "경추 신경근병증" },
    { id: "distraction", name: "Cervical Distraction", paper: "Viikari-Juntura (1989)", purpose: "신경근 압박 완화" },
    { id: "bakody", name: "Shoulder Abduction (Bakody)", paper: "Bakody (1953)", purpose: "C4-C5 신경근병증" },
    { id: "jackson", name: "Jackson's Compression", paper: "Jackson (1954)", purpose: "신경공 압박 유무" },
    { id: "sharp_purser", name: "Sharp-Purser Test", paper: "Sharp & Purser (1967)", purpose: "환축관절 불안정성" },
  ],
  shoulder: [
    { id: "neer", name: "Neer Test", paper: "Neer (1983)", purpose: "견봉하 충돌증후군" },
    { id: "hawkins", name: "Hawkins-Kennedy", paper: "Hawkins (1980)", purpose: "극상근 충돌" },
    { id: "emptycan", name: "Empty Can (Jobe)", paper: "Jobe (1982)", purpose: "극상근 건병증/파열" },
    { id: "obrien", name: "O'Brien Test", paper: "O'Brien (1998)", purpose: "SLAP 병변" },
    { id: "speed", name: "Speed's Test", paper: "Speed (1966)", purpose: "이두근 장두 건염" },
    { id: "yergason", name: "Yergason's Test", paper: "Yergason (1931)", purpose: "이두근 건 탈구/건염" },
  ],
  lumbar: [
    { id: "slr", name: "Straight Leg Raise (SLR)", paper: "Lasegue (1864)", purpose: "요추 디스크(L4-S1)" },
    { id: "kemp", name: "Kemp's Test", paper: "Kemp (1950)", purpose: "후관절 증후군/협착증" },
    { id: "slump", name: "Slump Test", paper: "Maitland (1985)", purpose: "신경계 긴장도" },
    { id: "prone_instability", name: "Prone Instability Test", paper: "Hicks (2005)", purpose: "요추 분절 불안정성" },
    { id: "well_leg_slr", name: "Well-Leg SLR", paper: "Woodhall (1950)", purpose: "대형 디스크 탈출증" },
  ],
  hip: [
    { id: "thomas", name: "Thomas Test", paper: "Thomas (1876)", purpose: "고관절 굴곡근 단축" },
    { id: "faber", name: "FABER (Patrick) Test", paper: "Patrick (1917)", purpose: "천장관절/고관절 병변" },
    { id: "fadir", name: "FADIR Test", paper: "Leunig (1997)", purpose: "고관절 비구순 충돌" },
    { id: "trendelenburg", name: "Trendelenburg Sign", paper: "Trendelenburg (1895)", purpose: "중둔근 약화" },
    { id: "scour", name: "Scour Test", paper: "Magee (2014)", purpose: "고관절 골관절염/비구순 파열" },
  ],
  knee: [
    { id: "lachman", name: "Lachman Test", paper: "Torg (1976)", purpose: "전방십자인대(ACL)" },
    { id: "mcmurray", name: "McMurray Test", paper: "McMurray (1937)", purpose: "반월상 연골판" },
    { id: "valgus", name: "Valgus Stress Test", paper: "Hughston (1976)", purpose: "내측측부인대(MCL)" },
    { id: "varus", name: "Varus Stress Test", paper: "Hughston (1976)", purpose: "외측측부인대(LCL)" },
    { id: "apley", name: "Apley's Compression", paper: "Apley (1947)", purpose: "반월상 연골판 파열 확인" },
  ],
  ankle: [
    { id: "ant_drawer_ankle", name: "Anterior Drawer", paper: "Torg (1976)", purpose: "전거비인대(ATFL) 손상" },
    { id: "talar_tilt", name: "Talar Tilt Test", paper: "Laurin (1975)", purpose: "종비인대(CFL) 손상" },
    { id: "thompson", name: "Thompson Test", paper: "Thompson (1962)", purpose: "아킬레스건 파열" },
    { id: "squeeze", name: "Squeeze Test", paper: "Hopkinson (1990)", purpose: "경비인대 결합 손상" },
    { id: "kleiger", name: "Kleiger's Test", paper: "Kleiger (1980)", purpose: "삼각인대/원위경비인대 손상" },
  ],
  elbow: specialTestsToEbp(elbowRegion.specialTests),
  wrist_hand: specialTestsToEbp(wristHandRegion.specialTests),
} as const;
