"use client";

interface Props {
  fileName: string;
  payload: {
    patient?: {
      patientId?: string;
      name: string;
      visitDate?: string;
    };
    soap: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    };
    title?: string;
  };
}

/** 서버 PDF API 호출 후 파일 다운로드 */
export default function SOAPExportButton({ fileName, payload }: Props) {
  const handleDownloadPDF = async () => {
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("PDF 생성 실패");
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
      className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
    >
      <span aria-hidden>📄</span>
      PDF 내보내기
    </button>
  );
}
