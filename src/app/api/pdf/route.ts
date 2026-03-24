import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { z } from "zod";
import { soapNoteSchema, patientSchema } from "@/features/soap/schema";

const requestSchema = z.object({
  patient: patientSchema.partial().optional(),
  soap: soapNoteSchema,
  title: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const input = requestSchema.parse(json);

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 (pt)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const margin = 48;
    let y = 841.89 - margin;
    const lineHeight = 14;

    const newPage = () => {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 841.89 - margin;
    };

    const drawLine = (text: string, size = 11) => {
      page.drawText(text, { x: margin, y, size, font });
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "PDF_GENERATION_FAILED", message },
      { status: 400 },
    );
  }
}

