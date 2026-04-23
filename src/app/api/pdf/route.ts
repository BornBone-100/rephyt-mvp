import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { z } from "zod";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { soapNoteSchema, patientSchema } from "@/features/soap/schema";

const requestSchema = z.object({
  patient: patientSchema.partial().optional(),
  soap: soapNoteSchema,
  title: z.string().optional(),
});

const LOCAL_FONT_CANDIDATES = [
  path.join(process.cwd(), "public", "fonts", "Pretendard-Regular.ttf"),
  path.join(process.cwd(), "public", "fonts", "NotoSansKR-Regular.ttf"),
];

let koreanFontBytesPromise: Promise<Uint8Array | null> | null = null;

async function getLocalKoreanFontBytes() {
  if (!koreanFontBytesPromise) {
    koreanFontBytesPromise = (async () => {
      for (const p of LOCAL_FONT_CANDIDATES) {
        try {
          await access(p);
          return await readFile(p);
        } catch {
          // 다음 후보 경로를 시도한다.
        }
      }
      return null;
    })();
  }
  return koreanFontBytesPromise;
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const input = requestSchema.parse(json);

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 (pt)
    let font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let hasUnicodeFont = false;
    try {
      const fontBytes = await getLocalKoreanFontBytes();
      if (fontBytes) {
        font = await pdfDoc.embedFont(fontBytes);
        hasUnicodeFont = true;
      } else {
        console.warn("[/api/pdf] local Korean font not found. Falling back to Helvetica.");
      }
    } catch (fontError) {
      console.warn("[/api/pdf] failed to load local Korean font, fallback to Helvetica:", fontError);
    }

    const margin = 48;
    let y = 841.89 - margin;
    const lineHeight = 14;

    const normalizeTextForFont = (text: string) => {
      if (hasUnicodeFont) return text;
      // 표준 폰트는 유니코드 한글 글리프를 지원하지 않으므로 최소한 PDF 생성은 유지한다.
      return text.replace(/[^\x20-\x7E]/g, "?");
    };

    const newPage = () => {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 841.89 - margin;
    };

    const drawLine = (text: string, size = 11) => {
      page.drawText(normalizeTextForFont(text), { x: margin, y, size, font });
      y -= lineHeight + Math.max(0, size - 11);
    };

    const wrap = (text: string, maxChars = 90) => {
      const lines: string[] = [];
      const chunks = text.split(/\n+/);
      for (const chunk of chunks) {
        const words = chunk.split(" ");
        let line = "";
        for (const w of words) {
          const next = line ? `${line} ${w}` : w;
          if (next.length > maxChars) {
            if (line) lines.push(line);
            line = w;
          } else {
            line = next;
          }
        }
        if (line) lines.push(line);
        lines.push("");
      }
      return lines;
    };

    const title = input.title ?? "SOAP Note";
    drawLine(title, 16);
    drawLine(`Generated: ${new Date().toISOString()}`);
    drawLine("");

    if (input.patient) {
      const p = input.patient;
      drawLine(
        `Patient: ${p.name ?? "-"} | ID: ${p.patientId ?? "-"} | Sex: ${p.sex ?? "-"} | Birth: ${p.birthDate ?? "-"}`,
      );
      drawLine(`Visit date: ${p.visitDate ?? "-"}`);
      drawLine("");
    }

    const sections: Array<[string, string]> = [
      ["S (Subjective)", input.soap.subjective],
      ["O (Objective)", input.soap.objective],
      ["A (Assessment)", input.soap.assessment],
      ["P (Plan)", input.soap.plan],
    ];

    for (const [header, body] of sections) {
      drawLine(header, 13);
      for (const line of wrap(body)) {
        if (y < margin + 60) {
          newPage();
        }
        drawLine(line);
      }
      drawLine("");
    }

    if (input.soap.warnings?.length) {
      drawLine("Warnings", 13);
      for (const w of input.soap.warnings) {
        for (const line of wrap(`- ${w}`)) drawLine(line);
      }
    }

    const bytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="soap-note.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF 생성 상세 에러:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "PDF_GENERATION_FAILED", message },
      { status: 400 },
    );
  }
}

