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
import { getPattern, paperInstruction, paperTime, type PatternSlot } from "@/lib/paper-pattern";

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
  y += 14;

  const setNameHeader = set.setName || set.difficulty;
  if (setNameHeader) {
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text(setNameHeader.toUpperCase(), pageW / 2, y, { align: "center" });
    y += 14;
  }
  y += 6;
  doc.setDrawColor(0);
  doc.line(margin, y, pageW - margin, y);
  y += 12;

  doc.setFontSize(10);
  doc.setFont("times", "normal");
  const metaLines = [
    `Class: ${meta.className}     Semester: ${meta.semester}     Date: ${meta.date}`,
    `Course Name: ${meta.courseName}     Marks: ${meta.marks}`,
    `Course Code: ${meta.courseCode}     Time: ${paperTime(meta.marks)}`,
    `Note: ${paperInstruction(meta.marks)}`,
  ];
  for (const line of metaLines) {
    doc.text(line, margin, y);
    y += 14;
  }
  y += 4;

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
        q?.bloom ?? slot.bloom,
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
  if (y > pageH - margin - 80) {
    doc.addPage();
    y = margin;
  }
  doc.setFont("times", "normal");
  doc.text("Verified By: Dr. Milind Nemade", pageW - margin - 200, y);
  y += 30;
  doc.text("DQC Member", margin, y);
  doc.text("Head of the Department", pageW - margin - 150, y);
  if (signatureUrl) {
    const parsed = dataUrlToUint8(signatureUrl);
    if (parsed) {
      try {
        doc.addImage(signatureUrl, parsed.type.toUpperCase(), margin, y + 6, 100, 40);
      } catch {
        /* ignore */
      }
    }
  }

  doc.save(filename);
}

// ---------- Word ----------
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
    children: [
      new Paragraph({
        alignment: opts.align,
        children: [new TextRun({ text, bold: opts.bold, font: "Times New Roman", size: 22 })],
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
          text: meta.department || "DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE",
          bold: true,
          size: 22,
          font: "Times New Roman",
        }),
      ],
    }),
    ...(set.setName || set.difficulty
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: (set.setName || set.difficulty || "").toUpperCase(),
                bold: true,
                size: 22,
                font: "Times New Roman",
              }),
            ],
          }),
        ]
      : []),
    new Paragraph({ children: [new TextRun({ text: "" })] }),
  ];

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          tc(`Class: ${meta.className}`),
          tc(`Semester: ${meta.semester}`),
          tc(`Date: ${meta.date}`, { width: 50 }),
        ],
      }),
      new TableRow({
        children: [tc(`Course Name: ${meta.courseName}`), tc(""), tc(`Marks: ${meta.marks}`)],
      }),
      new TableRow({
        children: [
          tc(`Course Code: ${meta.courseCode}`),
          tc(""),
          tc(`Time: ${paperTime(meta.marks)}`),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Note: ${paperInstruction(meta.marks)}`,
                    bold: true,
                    font: "Times New Roman",
                    size: 22,
                  }),
                ],
              }),
            ],
          }),
        ],
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
            new TableCell({ children: stmtChildren }),
            tc(String(slot.marks), { align: AlignmentType.CENTER }),
            tc(q?.co ?? "", { align: AlignmentType.CENTER }),
            tc(q?.bloom ?? slot.bloom, { align: AlignmentType.CENTER }),
          ],
        }),
      );
    });
  }

  const questionsTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });

  const footer: Paragraph[] = [
    new Paragraph({ children: [new TextRun({ text: "" })] }),
    new Paragraph({
      children: [
        new TextRun({ text: "Verified By: Dr. Milind Nemade", font: "Times New Roman", size: 22 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "DQC Member                                          Head of the Department",
          font: "Times New Roman",
          size: 22,
        }),
      ],
    }),
  ];
  if (signatureUrl) {
    const p = imageCell(signatureUrl);
    if (p) footer.push(p);
  }

  const doc = new Document({
    sections: [
      {
        children: [
          ...header,
          metaTable,
          new Paragraph({ children: [new TextRun({ text: "" })] }),
          questionsTable,
          ...footer,
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

function groupByQ(pattern: PatternSlot[]) {
  const map = new Map<string, PatternSlot[]>();
  for (const p of pattern) {
    if (!map.has(p.qNo)) map.set(p.qNo, []);
    map.get(p.qNo)!.push(p);
  }
  return Array.from(map.entries()).map(([qNo, slots]) => ({ qNo, slots }));
}
