// PDF & Word export for a generated question paper.
// Uses jsPDF (autoTable-free manual layout to keep bundle lean) and docx.

import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  AlignmentType,
  WidthType,
  ImageRun,
  HeightRule,
  BorderStyle,
} from "docx";
import type { GeneratedSet } from "@/lib/paper.functions";
import type { PaperMeta, DiagramMap } from "@/components/PaperRenderer";
import {
  getPattern,
  paperInstruction,
  paperTime,
  formatBTLevel,
  type PatternSlot,
} from "@/lib/paper-pattern";

function dataUrlToUint8(url: string): { data: Uint8Array; type: "png" | "jpg" } | null {
  const m = url.match(/^data:image\/(png|jpe?g);base64,(.+)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return { data: arr, type: m[1].startsWith("jp") ? "jpg" : "png" };
}

// ---------- PDF ----------
export async function exportPaperPdf(
  meta: PaperMeta,
  set: GeneratedSet,
  diagrams: DiagramMap,
  signatureUrl?: string | null,
  filename = "question-paper.pdf",
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  // Left-hand side brand: SOMAIYA VIDYAVIHAR UNIVERSITY
  doc.setTextColor(134, 31, 31); // #861F1F
  doc.setFont("times", "bold");
  doc.setFontSize(15);
  doc.text("SOMAIYA", margin, y + 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("VIDYAVIHAR UNIVERSITY", margin, y + 20);

  // Center: College Name and Exam Details
  doc.setTextColor(0, 0, 0);
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("K J Somaiya Institute of Technology", pageW / 2, y, { align: "center" });
  y += 16;
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.text(
    "An Autonomous Institute permanently affiliated to University of Mumbai.",
    pageW / 2,
    y,
    { align: "center" },
  );
  y += 14;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(`Academic Year ${meta.academicYear}`, pageW / 2, y, { align: "center" });
  y += 14;
  if (meta.examName) {
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(meta.examName.toUpperCase(), pageW / 2, y, { align: "center" });
    y += 14;
  }
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text(
    meta.department || "DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE",
    pageW / 2,
    y,
    { align: "center" },
  );
  y += 18;

  // Meta Table (bordered grid matching on-screen format)
  const metaTableW = pageW - margin * 2;
  const metaRowH = 18;
  const col1W = Math.round(metaTableW * 0.3);
  const col2W = Math.round(metaTableW * 0.35);
  const col3W = metaTableW - col1W - col2W;
  const colLeft2W = Math.round(metaTableW * 0.65);
  const colRight2W = metaTableW - colLeft2W;

  const drawMetaCell = (
    cellX: number,
    cellY: number,
    cellW: number,
    cellH: number,
    label: string,
    val: string,
  ) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.rect(cellX, cellY, cellW, cellH);

    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.text(label, cellX + 6, cellY + 12);
    const lw = doc.getTextWidth(label);
    doc.setFont("times", "normal");
    doc.text(val, cellX + 6 + lw + 4, cellY + 12);
  };

  // Row 1: Class | Semester | Date
  drawMetaCell(margin, y, col1W, metaRowH, "Class:", meta.className || "");
  drawMetaCell(margin + col1W, y, col2W, metaRowH, "Semester:", meta.semester || "");
  drawMetaCell(margin + col1W + col2W, y, col3W, metaRowH, "Date:", meta.date || "");
  y += metaRowH;

  // Row 2: Course Name | Marks
  drawMetaCell(margin, y, colLeft2W, metaRowH, "Course Name:", meta.courseName || "");
  drawMetaCell(margin + colLeft2W, y, colRight2W, metaRowH, "Marks:", String(meta.marks || ""));
  y += metaRowH;

  // Row 3: Course Code | Time
  drawMetaCell(margin, y, colLeft2W, metaRowH, "Course Code:", meta.courseCode || "");
  drawMetaCell(margin + colLeft2W, y, colRight2W, metaRowH, "Time:", paperTime(meta.marks));
  y += metaRowH;

  // Row 4: Note
  const noteInstruction = paperInstruction(meta.marks);
  const noteLabel = "Note: ";
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  const noteLabelW = doc.getTextWidth(noteLabel);

  doc.setFont("times", "normal");
  const noteLines = doc.splitTextToSize(noteInstruction, metaTableW - 12 - noteLabelW);
  const noteH = Math.max(18, noteLines.length * 12 + 6);

  doc.setDrawColor(0);
  doc.setLineWidth(0.8);
  doc.rect(margin, y, metaTableW, noteH);

  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text(noteLabel, margin + 6, y + 12);

  doc.setFont("times", "normal");
  if (noteLines.length <= 1) {
    doc.text(noteInstruction, margin + 6 + noteLabelW + 2, y + 12);
  } else {
    doc.text(noteLines, margin + 6 + noteLabelW + 2, y + 12);
  }
  y += noteH + 10;

  // Table header
  const cols = [
    { w: 45, label: "Q.No" },
    { w: 45, label: "Sub" },
    { w: pageW - margin * 2 - 45 - 45 - 45 - 40 - 55, label: "Statement of Question" },
    { w: 45, label: "Marks" },
    { w: 40, label: "CO" },
    { w: 55, label: "BT Level" },
  ];
  const startX = margin;
  const drawRow = (cells: string[], rowH: number, header = false) => {
    let x = startX;
    if (header) {
      doc.setFillColor(230, 230, 230);
      doc.rect(
        startX,
        y,
        cols.reduce((a, c) => a + c.w, 0),
        rowH,
        "F",
      );
    }
    doc.setFont("times", header ? "bold" : "normal");
    for (let i = 0; i < cols.length; i++) {
      doc.rect(x, y, cols[i].w, rowH);
      const txt = doc.splitTextToSize(cells[i] || "", cols[i].w - 6);
      doc.text(txt, x + 3, y + 12);
      x += cols[i].w;
    }
    y += rowH;
  };
  drawRow(
    cols.map((c) => c.label),
    20,
    true,
  );

  const pattern = getPattern(meta.marks);
  const grouped = groupByQ(pattern);

  const measureRow = (text: string, width: number): number => {
    const lines = doc.splitTextToSize(text || "", width - 6);
    return Math.max(24, lines.length * 12 + 10);
  };

  for (const g of grouped) {
    g.slots.forEach((slot, idx) => {
      if (slot.isOr) {
        drawRow([slot.qNo, "", "OR", "", "", ""], 18);
      }
      const q = set.questions.find((x) => x.key === slot.key);
      const diag = diagrams[slot.key];
      const rowH = measureRow(q?.text ?? "", cols[2].w) + (diag ? 90 : 0);
      if (y + rowH > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      const cells = [
        idx === 0 ? slot.qNo : "",
        slot.subQ,
        q?.text ?? "",
        String(slot.marks),
        q?.co ?? "",
        formatBTLevel(q?.bloom ?? slot.bloom),
      ];
      drawRow(cells, rowH);
      if (diag) {
        const parsed = dataUrlToUint8(diag);
        if (parsed) {
          try {
            const imgX = startX + cols[0].w + cols[1].w + 4;
            const imgY = y - 90 + 4;
            doc.addImage(diag, parsed.type.toUpperCase(), imgX, imgY, 200, 80);
          } catch {
            /* ignore image errors */
          }
        }
      }
    });
  }

  y += 20;
  doc.save(filename);
}

// ---------- Word ----------
const docxBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
};

function tc(
  text: string,
  opts: {
    bold?: boolean;
    width?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  } = {},
) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    borders: docxBorder,
    children: [
      new Paragraph({
        alignment: opts.align,
        children: [new TextRun({ text, bold: opts.bold, font: "Times New Roman", size: 22 })],
      }),
    ],
  });
}

function tcMeta(label: string, val: string, opts: { width?: number; colSpan?: number } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    columnSpan: opts.colSpan,
    borders: docxBorder,
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: label, bold: true, font: "Times New Roman", size: 22 }),
          new TextRun({ text: ` ${val}`, font: "Times New Roman", size: 22 }),
        ],
      }),
    ],
  });
}

function imageCell(dataUrl: string) {
  const parsed = dataUrlToUint8(dataUrl);
  if (!parsed) return null;
  return new Paragraph({
    children: [
      new ImageRun({
        data: parsed.data,
        transformation: { width: 260, height: 140 },
        type: parsed.type === "jpg" ? "jpg" : "png",
      } as any),
    ],
  });
}

export async function exportPaperDocx(
  meta: PaperMeta,
  set: GeneratedSet,
  diagrams: DiagramMap,
  signatureUrl?: string | null,
  filename = "question-paper.docx",
) {
  const pattern = getPattern(meta.marks);
  const grouped = groupByQ(pattern);

  const header = [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text: "SOMAIYA",
                      bold: true,
                      size: 26,
                      font: "Times New Roman",
                      color: "861F1F",
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text: "VIDYAVIHAR UNIVERSITY",
                      bold: true,
                      size: 13,
                      font: "Arial",
                      color: "861F1F",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 72, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "K J Somaiya Institute of Technology",
                      bold: true,
                      size: 28,
                      font: "Times New Roman",
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: "An Autonomous Institute permanently affiliated to University of Mumbai.",
                      italics: true,
                      size: 20,
                      font: "Times New Roman",
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `Academic Year ${meta.academicYear}`,
                      size: 22,
                      font: "Times New Roman",
                    }),
                  ],
                }),
                ...(meta.examName
                  ? [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: meta.examName.toUpperCase(),
                            bold: true,
                            size: 24,
                            font: "Times New Roman",
                          }),
                        ],
                      }),
                    ]
                  : []),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text:
                        meta.department || "DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE",
                      bold: true,
                      size: 22,
                      font: "Times New Roman",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: "" })] }),
  ];

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: docxBorder,
    rows: [
      new TableRow({
        children: [
          tcMeta("Class:", meta.className, { width: 30 }),
          tcMeta("Semester:", meta.semester, { width: 35 }),
          tcMeta("Date:", meta.date, { width: 35 }),
        ],
      }),
      new TableRow({
        children: [
          tcMeta("Course Name:", meta.courseName, { width: 65, colSpan: 2 }),
          tcMeta("Marks:", String(meta.marks), { width: 35 }),
        ],
      }),
      new TableRow({
        children: [
          tcMeta("Course Code:", meta.courseCode, { width: 65, colSpan: 2 }),
          tcMeta("Time:", paperTime(meta.marks), { width: 35 }),
        ],
      }),
      new TableRow({
        children: [tcMeta("Note:", paperInstruction(meta.marks), { width: 100, colSpan: 3 })],
      }),
    ],
  });

  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        tc("Q.No", { bold: true }),
        tc("Sub Q", { bold: true }),
        tc("Statement of Question", { bold: true }),
        tc("Marks", { bold: true }),
        tc("CO", { bold: true }),
        tc("BT Level", { bold: true }),
      ],
    }),
  ];

  for (const g of grouped) {
    g.slots.forEach((slot, idx) => {
      if (slot.isOr) {
        rows.push(
          new TableRow({
            children: [
              tc(slot.qNo),
              tc(""),
              tc("OR", { bold: true, align: AlignmentType.CENTER }),
              tc(""),
              tc(""),
              tc(""),
            ],
          }),
        );
      }
      const q = set.questions.find((x) => x.key === slot.key);
      const diag = diagrams[slot.key];
      const stmtChildren = [
        new Paragraph({
          children: [new TextRun({ text: q?.text ?? "", font: "Times New Roman", size: 22 })],
        }),
      ];
      if (diag) {
        const p = imageCell(diag);
        if (p) stmtChildren.push(p);
      }
      rows.push(
        new TableRow({
          children: [
            tc(idx === 0 ? slot.qNo : ""),
            tc(slot.subQ),
            new TableCell({ borders: docxBorder, children: stmtChildren }),
            tc(String(slot.marks), { align: AlignmentType.CENTER }),
            tc(q?.co ?? "", { align: AlignmentType.CENTER }),
            tc(formatBTLevel(q?.bloom ?? slot.bloom), { align: AlignmentType.CENTER }),
          ],
        }),
      );
    });
  }

  const questionsTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });

  const doc = new Document({
    sections: [
      {
        children: [
          ...header,
          metaTable,
          new Paragraph({ children: [new TextRun({ text: "" })] }),
          questionsTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function printPaperDocument({
  elementId = "printable-paper-view",
  meta,
  set,
  diagrams = {},
  signatureUrl,
  filename,
}: {
  elementId?: string;
  meta: PaperMeta;
  set: GeneratedSet;
  diagrams?: DiagramMap;
  signatureUrl?: string | null;
  filename?: string;
}) {
  let printedSuccessfully = false;

  // 1. Try iframe-based print if the rendered DOM element exists
  const targetEl = document.getElementById(elementId);
  if (targetEl) {
    try {
      const printIframe = document.createElement("iframe");
      printIframe.style.position = "fixed";
      printIframe.style.right = "0";
      printIframe.style.bottom = "0";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "0";
      printIframe.style.visibility = "hidden";
      document.body.appendChild(printIframe);

      const doc = printIframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${meta.courseName || "Question Paper"}</title>
              <style>
                @page { size: A4 portrait; margin: 8mm 10mm; }
                body {
                  font-family: "Times New Roman", Times, serif;
                  color: #000;
                  background: #fff;
                  margin: 0;
                  padding: 0;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .paper-page {
                  width: 100%;
                  max-width: 100%;
                  box-shadow: none !important;
                  border: none !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                table {
                  border-collapse: collapse;
                  width: 100%;
                }
                th, td {
                  border: 1px solid #000;
                  padding: 4px 6px;
                  vertical-align: top;
                  font-size: 11pt;
                }
                th {
                  background: #f2f2f2;
                  font-weight: bold;
                }
                .no-print {
                  display: none !important;
                }
                tr {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
              </style>
            </head>
            <body>
              ${targetEl.innerHTML}
            </body>
          </html>
        `);
        doc.close();

        await new Promise((r) => setTimeout(r, 250));
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          printedSuccessfully = true;
        } catch (printErr) {
          console.warn("Iframe print error:", printErr);
        }

        setTimeout(() => {
          try {
            document.body.removeChild(printIframe);
          } catch (e) {
            console.debug("Iframe cleanup error:", e);
          }
        }, 3000);
      }
    } catch (err) {
      console.warn("Iframe printing encountered an issue:", err);
    }
  }

  // 2. Direct browser print attempt if iframe wasn't used or had issues
  if (!printedSuccessfully) {
    try {
      window.print();
      printedSuccessfully = true;
    } catch (err) {
      console.warn("Direct window.print failed:", err);
    }
  }

  // 3. Always provide download fallback for iframe sandboxes
  if (!printedSuccessfully || window.self !== window.top) {
    await exportPaperPdf(
      meta,
      set,
      diagrams,
      signatureUrl,
      filename || `${meta.courseCode}_${meta.marks}marks.pdf`,
    );
  }
}

function groupByQ(pattern: PatternSlot[]) {
  const map = new Map<string, PatternSlot[]>();
  for (const p of pattern) {
    if (!map.has(p.qNo)) map.set(p.qNo, []);
    map.get(p.qNo)!.push(p);
  }
  return Array.from(map.entries()).map(([qNo, slots]) => ({ qNo, slots }));
}
