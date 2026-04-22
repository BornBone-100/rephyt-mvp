/** English JOSPT-linked databases for `/en/dashboard/soap/new` */
type TbcRow = { label: string; description: string };

export const JOSPT_TBC_DB_EN: Record<string, TbcRow[]> = {
  neck: [
    {
      label: "Mobility deficits",
      description:
        "Cervical segmental hypomobility is primary; symptom and ROM change with directionally biased repeated motion.",
    },
    {
      label: "Movement coordination impairment (WAD)",
      description:
        "Whiplash-associated disorder with impaired head/neck control; headache/neck pain linked to active movement.",
    },
    {
      label: "Cervicogenic headache",
      description:
        "Headache time-coupled to cervical posture/movement; reproduced on exam; upper cervical origin predominates.",
    },
    {
      label: "Radiating pain",
      description:
        "Upper-extremity radicular symptoms in a dermatomal pattern; positive neuro tension tests (e.g., Spurling).",
    },
  ],
  shoulder: [
    {
      label: "Subacromial pain syndrome",
      description:
        "Painful arc with elevation; positive Neer/Hawkins; findings consistent with rotator cuff / subacromial involvement.",
    },
    {
      label: "Adhesive capsulitis",
      description:
        "Progressive capsular restriction (esp. ER/abduction); classic painful-then-frozen pattern.",
    },
    {
      label: "Shoulder instability",
      description:
        "History of dislocation/subluxation, apprehension, positive instability testing (anterior/inferior).",
    },
    {
      label: "Scapular dyskinesis",
      description:
        "Scapular asymmetry or dysrhythmia with elevation/overhead tasks linked to symptoms.",
    },
  ],
  elbow: [
    {
      label: "Lateral epicondylalgia",
      description: "Lateral epicondyle tenderness; pain with resisted wrist extension; positive Cozen-type tests.",
    },
    {
      label: "Medial epicondylalgia",
      description: "Medial epicondyle pain with resisted flexion/valgus loading.",
    },
    {
      label: "Ligament instability",
      description: "Varus/valgus stress pain with laxity after trauma.",
    },
  ],
  wrist: [
    {
      label: "Carpal tunnel syndrome",
      description: "Median nerve distribution symptoms; nocturnal pain; positive Phalen/Tinel.",
    },
    {
      label: "Tendinopathy / De Quervain",
      description: "Radial wrist/extensor compartment pain; Finkelstein positive.",
    },
    {
      label: "TFCC lesion",
      description: "Ulnar-sided wrist pain/click; positive TFCC stress tests.",
    },
  ],
  hand: [
    {
      label: "Hand osteoarthritis",
      description: "Joint deformity/tenderness at CMC/DIP; functional pain with radiographic OA.",
    },
    {
      label: "Trigger finger",
      description: "Palpable nodule; catching/triggering with flexion.",
    },
    {
      label: "Digit sprain",
      description: "Post-traumatic swelling; collateral instability testing positive.",
    },
  ],
  lumbar: [
    {
      label: "Manipulation category",
      description: "Segmental hypomobility; immediate response to thrust or non-thrust mobilization.",
    },
    {
      label: "Stabilization category",
      description: "Motor control deficit / prolonged postural loading as primary driver.",
    },
    {
      label: "Directional preference",
      description: "Centralization / directional preference with repeated end-range loading.",
    },
    {
      label: "Traction / radicular category",
      description: "Lower-extremity radicular symptoms; traction or nerve gliding may reduce symptoms.",
    },
  ],
  hip: [
    {
      label: "Hip osteoarthritis",
      description: "Groin/thigh pain, ROM loss, radiographic OA.",
    },
    {
      label: "Nonarthritic hip pain / FAI",
      description: "Hip impingement signs (e.g., FADIR); anterior pain with activity.",
    },
    {
      label: "Greater trochanteric pain syndrome",
      description: "Lateral hip tenderness; side-lying aggravation; abductor involvement.",
    },
  ],
  knee: [
    {
      label: "Meniscal / chondral lesion",
      description: "Mechanical locking/catching; positive McMurray-type tests.",
    },
    {
      label: "Ligament sprain (ACL/PCL/MCL)",
      description: "Trauma history; positive Lachman/drawer/valgus stress testing.",
    },
    {
      label: "Patellofemoral pain",
      description: "Anterior knee pain with stairs/squat; patellar maltracking features.",
    },
    {
      label: "Knee osteoarthritis",
      description: "Chronic effusion, ROM loss, varus/valgus with radiographic OA.",
    },
  ],
  ankle: [
    {
      label: "Acute lateral ankle sprain",
      description: "Post-inversion trauma; lateral tenderness; positive anterior drawer.",
    },
    {
      label: "Chronic ankle instability",
      description: "Recurrent sprains; perceived giving-way; dynamic balance deficits.",
    },
    {
      label: "Achilles tendinopathy",
      description: "Mid-portion insertional pain; morning stiffness; load-responsive.",
    },
  ],
  foot: [
    {
      label: "Plantar fasciitis / heel pain",
      description: "First-step pain; medial calcaneal tenderness; positive Windlass.",
    },
    {
      label: "Posterior tibial tendon dysfunction",
      description: "Medial ankle pain; flexible flatfoot; single-limb heel-rise weakness.",
    },
    {
      label: "Morton neuroma",
      description: "Forefoot burning; Mulder-type symptoms; tight footwear aggravation.",
    },
  ],
};

export const JOSPT_OUTCOME_DB_EN: Record<string, { id: string; name: string; max: number; unit: string }[]> = {
  neck: [{ id: "ndi", name: "NDI (Neck Disability Index)", max: 100, unit: "%" }],
  shoulder: [
    { id: "spadi", name: "SPADI (Shoulder Pain and Disability Index)", max: 100, unit: "pts" },
    { id: "quickdash", name: "QuickDASH (Upper Extremity Function)", max: 100, unit: "pts" },
  ],
  elbow: [{ id: "prtee", name: "PRTEE (Patient-Rated Tennis Elbow Evaluation)", max: 100, unit: "pts" }],
  wrist: [{ id: "prwe", name: "PRWE (Patient-Rated Wrist Evaluation)", max: 100, unit: "pts" }],
  hand: [{ id: "mhq", name: "MHQ (Michigan Hand Questionnaire)", max: 100, unit: "pts" }],
  lumbar: [{ id: "odi", name: "ODI (Oswestry Disability Index)", max: 100, unit: "%" }],
  hip: [
    { id: "hoos", name: "HOOS (Hip disability and Osteoarthritis Outcome Score)", max: 100, unit: "pts" },
    { id: "lefs", name: "LEFS (Lower Extremity Functional Scale)", max: 80, unit: "pts" },
  ],
  knee: [
    { id: "koos", name: "KOOS (Knee Injury and Osteoarthritis Outcome Score)", max: 100, unit: "pts" },
    { id: "lysholm", name: "Lysholm Knee Score", max: 100, unit: "pts" },
  ],
  ankle: [{ id: "faam", name: "FAAM (Foot and Ankle Ability Measure)", max: 100, unit: "%" }],
  foot: [{ id: "ffi", name: "FFI (Foot Function Index)", max: 100, unit: "pts" }],
};

export const JOSPT_ICF_DB_EN: Record<string, { impairment: string[]; activity: string[]; participation: string[] }> = {
  neck: {
    impairment: ["Cervical ROM limitation", "Deep neck flexor insufficiency", "CT junction movement impairment", "Upper-extremity radicular symptoms"],
    activity: ["Limited neck rotation (e.g., driving)", "Sustained computer use difficulty", "Overhead gaze pain"],
    participation: ["Sleep disturbance (night pain)", "Office work productivity loss", "Reading/recreation limits"],
  },
  shoulder: {
    impairment: ["Capsular pattern restriction", "Rotator cuff weakness", "Scapular dyskinesis", "Subacromial impingement signs"],
    activity: ["Overhead reach limitation", "Behind-back reach limitation", "Heavy lifting difficulty"],
    participation: ["Overhead sport restriction", "ADL dependence for dressing", "Childcare/lifting difficulty"],
  },
  elbow: {
    impairment: ["Elbow flexion/extension limitation", "Grip weakness", "Tendon tenderness"],
    activity: ["Twisting tasks (wringing)", "Door handle use", "Keyboard/mouse tolerance"],
    participation: ["Racquet sports restriction", "Manual trade limits", "Household task limits"],
  },
  wrist: {
    impairment: ["Wrist ROM limitation", "Median nerve glide limitation", "Ulnar-sided wrist pain"],
    activity: ["Weight-bearing on hand", "Heavy pan lift", "Prolonged mouse/keyboard use"],
    participation: ["Computer work interruption", "Gym training limits", "Childcare difficulty"],
  },
  hand: {
    impairment: ["Digit ROM limitation", "Pinch weakness", "Flexor tendon glide restriction"],
    activity: ["Buttoning", "Phone use", "Handwriting"],
    participation: ["Precision occupation limits", "Instrument playing limits", "Independent meal limits"],
  },
  lumbar: {
    impairment: ["Lumbar flexion/extension ROM loss", "Core motor control delay", "Lower-extremity radicular signs", "Pelvic/SI dysfunction"],
    activity: ["Heavy lifting from floor", "Prolonged sitting tolerance", "Morning stiffness"],
    participation: ["Long driving limits", "Rotational sport limits", "Heavy equipment work limits"],
  },
  hip: {
    impairment: ["Hip IR/extension ROM loss", "Gluteal weakness", "Hip flexor tightness"],
    activity: ["Sit-to-stand difficulty", "Socks/shoes difficulty", "Stair climbing pain"],
    participation: ["Hiking limits", "Squatting occupation limits", "Assistive device use"],
  },
  knee: {
    impairment: ["Knee flexion/extension limitation", "Quadriceps inhibition/atrophy", "Patellar tracking deficit", "Joint effusion"],
    activity: ["Descending stairs pain", "Squat difficulty", "Pivoting instability"],
    participation: ["Running sport return delay", "Contact sport limits", "Manual labor limits"],
  },
  ankle: {
    impairment: ["Dorsiflexion limitation", "Peroneal reaction delay", "Impaired proprioception"],
    activity: ["Uneven terrain gait", "Heel rise", "Single-leg balance"],
    participation: ["Jump sport limits", "Prolonged standing jobs", "Hiking limits"],
  },
  foot: {
    impairment: ["Intrinsic foot weakness", "Excessive pronation", "Plantar fascia stiffness"],
    activity: ["First-step pain", "Prolonged walking fatigue", "Barefoot tolerance"],
    participation: ["Running limits", "Marching occupation limits", "Footwear tolerance"],
  },
};
