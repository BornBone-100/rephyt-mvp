"use client";

interface Props {
  fileName: string;
  label?: string;
  className?: string;
  payload: {
    patient?: {
      patientId?: string;
      name?: string;
      visitDate?: string;
    };
    soap: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
    };
    title?: string;
  };
}

/** 서버 PDF API 호출 후 파일 다운로드 */
export default function SOAPExportButton({ fileName, payload, label = "PDF 내보내기", className }: Props) {
  const handleDownloadPDF = async () => {
    try {
      const requestPayload = {
        patient: payload.patient
          ? {
              patientId: payload.patient.patientId,
              name: payload.patient.name ?? "-",
              visitDate: payload.patient.visitDate ?? new Date().toISOString(),
            }
          : undefined,
        soap: {
          subjective: payload.soap.subjective ?? "",
          objective: payload.soap.objective ?? "",
          assessment: payload.soap.assessment ?? "",
          plan: payload.soap.plan ?? "",
        },
        title: payload.title ?? "Re:PhyT Pro Global Chart",
      };

      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      if (!response.ok) {
        let details = "";
        try {
          const errorData = (await response.json()) as { message?: string };
          details = errorData.message ?? "";
        } catch {
          details = await response.text();
        }
        throw new Error(details ? `PDF 생성 실패: ${details}` : "PDF 생성 실패");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF 다운로드 중 오류 발생:", error);
      alert("PDF 다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleDownloadPDF()}
      className={
        className ??
        "flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
      }
    >
      {label}
    </button>
  );
}
