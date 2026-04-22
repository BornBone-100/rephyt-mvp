// src/constants/measures.ts

export const OUTCOME_MEASURES = {
  // ==========================================
  // 1. UPPER QUARTER (상지 및 척추 상부)
  // ==========================================

  neck: {
    id: "ndi",
    name: "NDI (Neck Disability Index)",
    description: "Choose the statement that best describes your condition.",
    scaleType: "0-5",
    scaleLabels: { min: "0 (No pain/limitation)", max: "5 (Severe pain/limitation)" },
    questions: [
      { id: "n1", section: "General", text: "Pain Intensity" },
      { id: "n2", section: "General", text: "Personal Care (Washing, Dressing, etc.)" },
      { id: "n3", section: "General", text: "Lifting" },
      { id: "n4", section: "General", text: "Reading" },
      { id: "n5", section: "General", text: "Headaches" },
      { id: "n6", section: "General", text: "Concentration" },
      { id: "n7", section: "General", text: "Work" },
      { id: "n8", section: "General", text: "Driving" },
      { id: "n9", section: "General", text: "Sleeping" },
      { id: "n10", section: "General", text: "Recreation" },
    ],
    calc: (scores: number[]) =>
      scores.length === 0 ? 0 : Math.round((scores.reduce((a, b) => a + b, 0) / 50) * 100),
  },

  shoulder: {
    id: "spadi",
    name: "SPADI (Shoulder Pain and Disability Index)",
    description: "Rate your pain and difficulty on a scale of 0 to 10.",
    scaleType: "0-10",
    scaleLabels: { min: "0 (None)", max: "10 (Worst/Unable)" },
    questions: [
      { id: "p1", section: "Pain", text: "Pain at its worst?" },
      { id: "p2", section: "Pain", text: "Pain when lying on the involved side?" },
      { id: "p3", section: "Pain", text: "Pain reaching for something on a high shelf?" },
      { id: "p4", section: "Pain", text: "Pain touching the back of your neck?" },
      { id: "p5", section: "Pain", text: "Pain pushing with the involved arm?" },
      { id: "d1", section: "Disability", text: "Difficulty washing your hair?" },
      { id: "d2", section: "Disability", text: "Difficulty washing your back?" },
      { id: "d3", section: "Disability", text: "Difficulty putting on an undershirt or jumper?" },
      { id: "d4", section: "Disability", text: "Difficulty putting on a shirt that buttons down the front?" },
      { id: "d5", section: "Disability", text: "Difficulty putting on your pants?" },
      { id: "d6", section: "Disability", text: "Difficulty placing an object on a high shelf?" },
      { id: "d7", section: "Disability", text: "Difficulty carrying a heavy object of 10 lbs?" },
      { id: "d8", section: "Disability", text: "Difficulty removing something from your back pocket?" },
    ],
    calc: (scores: number[]) =>
      scores.length === 0 ? 0 : Math.round((scores.reduce((a, b) => a + b, 0) / 130) * 100),
  },

  arm: {
    id: "quickdash",
    name: "QuickDASH",
    description: "Rate your ability to do the following activities in the last week.",
    scaleType: "1-5",
    scaleLabels: { min: "1 (No difficulty)", max: "5 (Unable)" },
    questions: [
      { id: "q1", section: "Function", text: "Open a tight or new jar." },
      { id: "q2", section: "Function", text: "Do heavy household chores." },
      { id: "q3", section: "Function", text: "Carry a shopping bag or briefcase." },
      { id: "q4", section: "Function", text: "Wash your back." },
      { id: "q5", section: "Function", text: "Use a knife to cut food." },
      { id: "q6", section: "Function", text: "Recreational activities which require little effort." },
      { id: "q7", section: "Social", text: "Interference with normal social activities." },
      { id: "q8", section: "Work", text: "Limitation in work or other regular daily activities." },
      { id: "q9", section: "Symptoms", text: "Arm, shoulder or hand pain." },
      { id: "q10", section: "Symptoms", text: "Tingling (pins and needles) in your arm, shoulder or hand." },
      { id: "q11", section: "Symptoms", text: "Difficulty sleeping because of the pain." },
    ],
    calc: (scores: number[]) => {
      const validScores = scores.filter((s) => s >= 1 && s <= 5);
      if (validScores.length === 0) return 0;
      return Math.round(((validScores.reduce((a, b) => a + b, 0) / validScores.length) - 1) * 25);
    },
  },

  // ==========================================
  // 2. LOWER QUARTER (하지 및 척추 하부)
  // ==========================================

  lowback: {
    id: "odi",
    name: "ODI (Oswestry Disability Index)",
    description: "Choose the statement that best describes your condition.",
    scaleType: "0-5",
    scaleLabels: { min: "0 (No pain/limitation)", max: "5 (Severe pain/limitation)" },
    questions: [
      { id: "l1", section: "General", text: "Pain Intensity" },
      { id: "l2", section: "General", text: "Personal Care" },
      { id: "l3", section: "General", text: "Lifting" },
      { id: "l4", section: "General", text: "Walking" },
      { id: "l5", section: "General", text: "Sitting" },
      { id: "l6", section: "General", text: "Standing" },
      { id: "l7", section: "General", text: "Sleeping" },
      { id: "l8", section: "General", text: "Sex Life" },
      { id: "l9", section: "General", text: "Social Life" },
      { id: "l10", section: "General", text: "Traveling" },
    ],
    calc: (scores: number[]) =>
      scores.length === 0 ? 0 : Math.round((scores.reduce((a, b) => a + b, 0) / 50) * 100),
  },

  hip: {
    id: "lefs",
    name: "LEFS (Lower Extremity Functional Scale)",
    description: "Rate your difficulty with the following activities.",
    scaleType: "0-4",
    scaleLabels: { min: "0 (Extreme Difficulty/Unable)", max: "4 (No Difficulty)" },
    questions: [
      { id: "h1", section: "Function", text: "Any of your usual work, housework, or school activities." },
      {
        id: "h2",
        section: "Function",
        text: "Your usual hobbies, recreational or sporting activities.",
      },
      { id: "h3", section: "Function", text: "Getting into or out of the bath." },
      { id: "h4", section: "Function", text: "Walking between rooms." },
      { id: "h5", section: "Function", text: "Putting on your shoes or socks." },
      { id: "h6", section: "Function", text: "Squatting." },
      {
        id: "h7",
        section: "Function",
        text: "Lifting an object, like a bag of groceries from the floor.",
      },
      { id: "h8", section: "Function", text: "Performing light activities around your home." },
      { id: "h9", section: "Function", text: "Performing heavy activities around your home." },
      { id: "h10", section: "Function", text: "Getting into or out of a car." },
      { id: "h11", section: "Function", text: "Walking 2 blocks." },
      { id: "h12", section: "Function", text: "Walking a mile." },
      { id: "h13", section: "Function", text: "Going up or down 10 stairs." },
      { id: "h14", section: "Function", text: "Standing for 1 hour." },
      { id: "h15", section: "Function", text: "Sitting for 1 hour." },
      { id: "h16", section: "Function", text: "Running on even ground." },
      { id: "h17", section: "Function", text: "Running on uneven ground." },
      { id: "h18", section: "Function", text: "Making sharp turns while running fast." },
      { id: "h19", section: "Function", text: "Hopping." },
      { id: "h20", section: "Function", text: "Rolling over in bed." },
    ],
    // LEFS는 점수가 높을수록 좋음 (기능이 좋음). 역산하여 장애율(%)로 통일하려면:
    // 장애율(%) = ((80 - 획득점수) / 80) * 100
    calc: (scores: number[]) => {
      if (scores.length === 0) return 0;
      const total = scores.reduce((a, b) => a + b, 0);
      return Math.round(((80 - total) / 80) * 100);
    },
  },

  knee: {
    id: "koos",
    name: "KOOS-12 (Knee Injury and Osteoarthritis Outcome Score)",
    description: "Rate your knee symptoms and function.",
    scaleType: "0-4",
    scaleLabels: { min: "0 (None)", max: "4 (Extreme)" },
    questions: [
      { id: "k1", section: "Pain", text: "How often do you experience knee pain?" },
      { id: "k2", section: "Pain", text: "Pain when twisting/pivoting on your knee?" },
      { id: "k3", section: "Pain", text: "Pain when going up or down stairs?" },
      { id: "k4", section: "Pain", text: "Pain when walking on flat surface?" },
      { id: "k5", section: "Function", text: "Difficulty descending stairs?" },
      { id: "k6", section: "Function", text: "Difficulty ascending stairs?" },
      { id: "k7", section: "Function", text: "Difficulty rising from sitting?" },
      { id: "k8", section: "Function", text: "Difficulty standing?" },
      { id: "k9", section: "Quality of Life", text: "Awareness of your knee problem?" },
      { id: "k10", section: "Quality of Life", text: "Modified life style to avoid activities?" },
      { id: "k11", section: "Quality of Life", text: "Lack of confidence in your knee?" },
      { id: "k12", section: "Quality of Life", text: "General difficulty with your knee?" },
    ],
    calc: (scores: number[]) =>
      scores.length === 0 ? 0 : Math.round((scores.reduce((a, b) => a + b, 0) / 48) * 100),
  },

  ankle: {
    id: "faam",
    name: "FAAM (Foot and Ankle Ability Measure - ADL)",
    description: "Rate your difficulty with the following activities.",
    scaleType: "0-4",
    scaleLabels: { min: "0 (Unable)", max: "4 (No difficulty)" },
    questions: [
      { id: "a1", section: "ADL", text: "Standing" },
      { id: "a2", section: "ADL", text: "Walking on even ground" },
      { id: "a3", section: "ADL", text: "Walking on even ground without shoes" },
      { id: "a4", section: "ADL", text: "Walking up hills" },
      { id: "a5", section: "ADL", text: "Walking down hills" },
      { id: "a6", section: "ADL", text: "Going up stairs" },
      { id: "a7", section: "ADL", text: "Going down stairs" },
      { id: "a8", section: "ADL", text: "Walking on uneven ground" },
      { id: "a9", section: "ADL", text: "Stepping up and down curbs" },
      { id: "a10", section: "ADL", text: "Squatting" },
      { id: "a11", section: "ADL", text: "Coming up on your toes" },
      { id: "a12", section: "ADL", text: "Walking initially" },
      { id: "a13", section: "ADL", text: "Walking 5 minutes or less" },
      { id: "a14", section: "ADL", text: "Walking approximately 10 minutes" },
      { id: "a15", section: "ADL", text: "Walking 15 minutes or greater" },
      { id: "a16", section: "ADL", text: "Home responsibilities" },
      { id: "a17", section: "ADL", text: "Activities of daily living" },
      { id: "a18", section: "ADL", text: "Personal care" },
      { id: "a19", section: "ADL", text: "Light to moderate work" },
      { id: "a20", section: "ADL", text: "Heavy work" },
      { id: "a21", section: "ADL", text: "Recreational activities" },
    ],
    // FAAM 역시 점수가 높을수록 기능이 좋음. 장애율(%)로 통일: ((84 - 획득점수) / 84) * 100
    calc: (scores: number[]) => {
      if (scores.length === 0) return 0;
      const total = scores.reduce((a, b) => a + b, 0);
      return Math.round(((84 - total) / 84) * 100);
    },
  },
};
