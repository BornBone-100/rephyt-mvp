const patients = [
  {
    id: "p1",
    name: "김도윤",
    birth: "1989-05-14",
    area: "Lumbar",
    soap: { subjective: "", objective: "", assessment: "", plan: "" },
  },
  {
    id: "p2",
    name: "이서연",
    birth: "1994-11-02",
    area: "Shoulder",
    soap: { subjective: "", objective: "", assessment: "", plan: "" },
  },
];

const patientView = document.getElementById("patientView");
const soapView = document.getElementById("soapView");
const patientRows = document.getElementById("patientRows");
const soapTitle = document.getElementById("soapTitle");
const backBtn = document.getElementById("backToPatients");
const generateBtn = document.getElementById("generateReport");

const subjectiveEl = document.getElementById("subjective");
const objectiveEl = document.getElementById("objective");
const assessmentEl = document.getElementById("assessment");
const planEl = document.getElementById("plan");

const scoreDonut = document.getElementById("scoreDonut");
const overallScore = document.getElementById("overallScore");
const cpgBadges = document.getElementById("cpgBadges");
const defenseBar = document.getElementById("defenseBar");
const defenseText = document.getElementById("defenseText");
const statusBadge = document.getElementById("statusBadge");

let activePatient = null;

function mountPatientRows() {
  patientRows.innerHTML = "";
  patients.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.birth}</td>
      <td>${p.area}</td>
      <td><button class="btn primary chart-btn" data-id="${p.id}">차트 보기</button></td>
    `;
    patientRows.appendChild(tr);
  });
}

function showPatientList() {
  soapView.classList.add("hidden");
  patientView.classList.remove("hidden");
}

function showSoap(patient) {
  activePatient = patient;
  soapTitle.textContent = `${patient.name} 환자 SOAP 차트`;
  subjectiveEl.value = patient.soap.subjective;
  objectiveEl.value = patient.soap.objective;
  assessmentEl.value = patient.soap.assessment;
  planEl.value = patient.soap.plan;
  patientView.classList.add("hidden");
  soapView.classList.remove("hidden");
}

function setStatus(status) {
  statusBadge.className = "status-badge";
  statusBadge.classList.add(status);
  statusBadge.textContent = status.toUpperCase();
}

function renderCpgBadges(levels) {
  cpgBadges.innerHTML = "";
  levels.forEach((level) => {
    const span = document.createElement("span");
    span.className = `badge ${level}`;
    span.textContent = level.toUpperCase();
    cpgBadges.appendChild(span);
  });
}

function createReportFromPlan(planText) {
  const text = planText.toLowerCase();
  let score = 40;
  if (text.includes("운동")) score += 20;
  if (text.includes("재평가")) score += 15;
  if (text.includes("교육")) score += 10;
  if (text.includes("빈도") || text.includes("주")) score += 10;
  if (text.length > 80) score += 5;
  score = Math.min(100, score);

  const defense = Math.min(100, score - 5);
  const levels = score >= 80 ? ["green", "green", "yellow"] : score >= 60 ? ["yellow", "yellow", "green"] : ["red", "yellow", "red"];
  const status = score >= 80 ? "pass" : score >= 60 ? "warning" : "fail";
  return { score, defense, levels, status };
}

function updateReport() {
  const report = createReportFromPlan(planEl.value.trim());
  overallScore.textContent = String(report.score);
  scoreDonut.style.background = `conic-gradient(#2563eb ${report.score * 3.6}deg, #e2e8f0 0deg)`;
  defenseBar.style.width = `${report.defense}%`;
  defenseText.textContent = `${report.defense} / 100`;
  renderCpgBadges(report.levels);
  setStatus(report.status);
}

patientRows.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const btn = target.closest(".chart-btn");
  if (!btn) return;
  const id = btn.getAttribute("data-id");
  const selected = patients.find((p) => p.id === id);
  if (selected) showSoap(selected);
});

backBtn.addEventListener("click", showPatientList);
generateBtn.addEventListener("click", () => {
  if (!activePatient) return;
  activePatient.soap = {
    subjective: subjectiveEl.value.trim(),
    objective: objectiveEl.value.trim(),
    assessment: assessmentEl.value.trim(),
    plan: planEl.value.trim(),
  };
  updateReport();
});

mountPatientRows();
showPatientList();
