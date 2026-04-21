"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface Props {
  targetId: string; // PDF로 만들 영역의 ID (예: "soap-paper")
  fileName: string;
}

/** html2canvas → A4 PDF (여러 페이지 자동 분할, 고해상도) */
export default function SOAPExportButton({ targetId, fileName }: Props) {
  const exportPDF = async () => {
    const element = document.getElementById(targetId);
    if (!element) {
      alert("내보낼 영역을 찾을 수 없습니다.");
      return;
    }

    try {
      // 웹폰트 로드 완료 후 캡처 (한글 등 깨짐 완화)
      await document.fonts.ready.catch(() => undefined);

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight,
        onclone: (clonedDoc) => {
          const node = clonedDoc.getElementById(targetId);
          if (!node) return;
          const el = node as HTMLElement;
          el.style.boxShadow = "none";
          el.style.borderRadius = "0";
          el.style.backgroundColor = "#ffffff";
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 0;
        while (heightLeft > 0) {
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          if (heightLeft > 0) {
            pdf.addPage();
            position -= pageHeight;
          }
        }
      }

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error("PDF 생성 중 오류 발생:", error);
      alert("PDF 생성에 실패했습니다.");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void exportPDF()}
      className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
    >
      <span aria-hidden>📄</span>
      PDF 내보내기
    </button>
  );
}
