import type React from "react";
import type { GeneratedSet } from "@/lib/paper.functions";
import {
  getPattern,
  paperInstruction,
  paperTime,
  formatBTLevel,
  type PatternSlot,
} from "@/lib/paper-pattern";
import { SvvLogoSvg } from "@/components/Logo";

export type PaperMeta = {
  examName?: string;
  courseName: string;
  courseCode: string;
  className: string;
  semester: string;
  academicYear: string;
  date: string;
  marks: 20 | 30;
  department?: string;
  testNumber?: 1 | 2;
  courseOutcomes?: Record<string, string>;
};

export type DiagramMap = Record<string, string>; // question key -> image data url

export function PaperRenderer({
  meta,
  set,
  diagrams = {},
  signatureUrl,
  showAttachHint = false,
  onAttachClick,
  editable = false,
  onEditQuestion,
  onEditQuestionField,
  onEditCO,
}: {
  meta: PaperMeta;
  set: GeneratedSet;
  diagrams?: DiagramMap;
  signatureUrl?: string | null;
  showAttachHint?: boolean;
  onAttachClick?: (key: string) => void;
  editable?: boolean;
  onEditQuestion?: (key: string, text: string) => void;
  onEditQuestionField?: (key: string, field: "text" | "co" | "bloom", value: string) => void;
  onEditCO?: (coKey: string, text: string) => void;
}) {
  const pattern = getPattern(meta.marks);
  const dept = meta.department || "DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE";

  // Group by qNo for OR rendering
  const grouped = groupByQ(pattern);

  return (
    <div className="paper-page p-10 max-w-[820px] mx-auto shadow border border-border">
      {/* Header block */}
      <div className="border-b border-black pb-4 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="shrink-0 pt-1 text-left">
            <SvvLogoSvg height={48} align="left" />
          </div>
          <div className="flex-1 text-center pr-2">
            <div className="text-[14pt] font-bold">K J Somaiya Institute of Technology</div>
            <div className="text-[10pt] italic">
              An Autonomous Institute permanently affiliated to University of Mumbai.
            </div>
            <div className="text-[11pt] mt-1">Academic Year {meta.academicYear}</div>
            {meta.examName && (
              <div className="text-[12pt] font-bold mt-1 tracking-wide uppercase">
                {meta.examName}
              </div>
            )}
            <div className="text-[12pt] font-bold mt-1">{dept}</div>
          </div>
        </div>
      </div>

      {/* Meta table */}
      <table className="mb-3">
        <tbody>
          <tr>
            <td>
              <b>Class:</b> {meta.className}
            </td>
            <td>
              <b>Semester:</b> {meta.semester}
            </td>
            <td colSpan={2}>
              <b>Date:</b> {meta.date}
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              <b>Course Name:</b> {meta.courseName}
            </td>
            <td colSpan={2}>
              <b>Marks:</b> {meta.marks}
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              <b>Course Code:</b> {meta.courseCode}
            </td>
            <td colSpan={2}>
              <b>Time:</b> {paperTime(meta.marks)}
            </td>
          </tr>
          <tr>
            <td colSpan={4}>
              <b>Note:</b> {paperInstruction(meta.marks)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Questions table */}
      <table>
        <thead>
          <tr>
            <th style={{ width: "8%" }}>Q. No.</th>
            <th style={{ width: "8%" }}>Sub Q.</th>
            <th>Statement of Question</th>
            <th style={{ width: "8%" }}>Marks</th>
            <th style={{ width: "8%" }}>CO</th>
            <th style={{ width: "10%" }}>BT Level</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map((group) => (
            <RenderGroup
              key={group.qNo}
              group={group}
              questions={set.questions}
              diagrams={diagrams}
              showAttachHint={showAttachHint}
              onAttachClick={onAttachClick}
              editable={editable}
              onEditQuestion={onEditQuestion}
              onEditQuestionField={onEditQuestionField}
            />
          ))}
        </tbody>
      </table>

      {/* Course outcomes */}
      <CourseOutcomesFooter meta={meta} editable={editable} onEditCO={onEditCO} />
    </div>
  );
}

type QGroup = { qNo: string; slots: PatternSlot[] };

function groupByQ(pattern: PatternSlot[]): QGroup[] {
  const map = new Map<string, PatternSlot[]>();
  for (const p of pattern) {
    if (!map.has(p.qNo)) map.set(p.qNo, []);
    map.get(p.qNo)!.push(p);
  }
  return Array.from(map.entries()).map(([qNo, slots]) => ({ qNo, slots }));
}

function RenderGroup({
  group,
  questions,
  diagrams,
  showAttachHint,
  onAttachClick,
  editable,
  onEditQuestion,
  onEditQuestionField,
}: {
  group: QGroup;
  questions: GeneratedSet["questions"];
  diagrams: DiagramMap;
  showAttachHint?: boolean;
  onAttachClick?: (key: string) => void;
  editable?: boolean;
  onEditQuestion?: (key: string, text: string) => void;
  onEditQuestionField?: (key: string, field: "text" | "co" | "bloom", value: string) => void;
}) {
  const rows: React.ReactElement[] = [];
  group.slots.forEach((slot, idx) => {
    if (slot.isOr && idx > 0) {
      rows.push(
        <tr key={`${slot.key}-or`}>
          <td>{slot.qNo}</td>
          <td></td>
          <td className="text-center italic">
            <b>OR</b>
          </td>
          <td></td>
          <td></td>
          <td></td>
        </tr>,
      );
    }
    const q = questions.find((x) => x.key === slot.key);
    const diag = diagrams[slot.key];
    rows.push(
      <tr key={slot.key}>
        <td>{idx === 0 ? slot.qNo : ""}</td>
        <td>{slot.subQ}</td>
        <td>
          {editable ? (
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const val = e.currentTarget.textContent ?? "";
                if (onEditQuestionField) {
                  onEditQuestionField(slot.key, "text", val);
                } else {
                  onEditQuestion?.(slot.key, val);
                }
              }}
              className="outline-none focus:ring-2 focus:ring-brand/40 rounded px-1 py-0.5 min-h-[1.5em] bg-yellow-50 dark:bg-yellow-900/10"
              title="Click and type to edit question statement"
            >
              {q?.text ?? ""}
            </div>
          ) : (
            <div>{q?.text ?? ""}</div>
          )}
          {diag ? (
            <img src={diag} alt="diagram" className="mt-2 max-h-56 object-contain" />
          ) : showAttachHint ? (
            <button
              type="button"
              onClick={() => onAttachClick?.(slot.key)}
              className="mt-2 text-[10pt] italic text-brand underline decoration-dotted no-print hover:text-brand/80"
            >
              Attach diagram here if needed
            </button>
          ) : null}
        </td>
        <td className="text-center">{slot.marks}</td>
        <td className="text-center">
          {editable ? (
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const val = e.currentTarget.textContent?.trim() ?? "";
                onEditQuestionField?.(slot.key, "co", val);
              }}
              className="outline-none focus:ring-2 focus:ring-brand/40 rounded px-1 py-0.5 min-h-[1.5em] bg-yellow-50 dark:bg-yellow-900/10 font-medium"
              title="Click and type to edit CO (e.g. CO1, CO2, CO3)"
            >
              {q?.co ?? ""}
            </div>
          ) : (
            <div>{q?.co ?? ""}</div>
          )}
        </td>
        <td className="text-center">
          {editable ? (
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const val = e.currentTarget.textContent?.trim() ?? "";
                onEditQuestionField?.(slot.key, "bloom", formatBTLevel(val) || val);
              }}
              className="outline-none focus:ring-2 focus:ring-brand/40 rounded px-1 py-0.5 min-h-[1.5em] bg-yellow-50 dark:bg-yellow-900/10 font-medium"
              title="Click and type to edit BT Level (R: Remember, U: Understand, A: Apply, An: Analyze, E: Evaluate, C: Create)"
            >
              {formatBTLevel(q?.bloom ?? slot.bloom)}
            </div>
          ) : (
            <div>{formatBTLevel(q?.bloom ?? slot.bloom)}</div>
          )}
        </td>
      </tr>,
    );
  });
  return <>{rows}</>;
}

function uniqCOs(set: GeneratedSet): string[] {
  return Array.from(new Set(set.questions.map((q) => q.co))).sort();
}

function CourseOutcomesFooter({
  meta,
  editable,
  onEditCO,
}: {
  meta: PaperMeta;
  editable?: boolean;
  onEditCO?: (coKey: string, text: string) => void;
}) {
  const testNumber: 1 | 2 = meta.testNumber ?? (meta.marks === 20 ? 1 : 2);
  const targetCOs = testNumber === 1 ? ["CO1", "CO2", "CO3"] : ["CO4", "CO5", "CO6"];
  const all = meta.courseOutcomes ?? {};
  return (
    <div className="mt-6 text-[11pt] border-t border-black pt-3">
      <div className="font-bold mb-1">Course Outcomes (Test {testNumber}):</div>
      <table>
        <tbody>
          {targetCOs.map((co) => (
            <tr key={co}>
              <td style={{ width: "10%" }} className="align-top font-bold">
                {co}
              </td>
              <td>
                {editable ? (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => onEditCO?.(co, e.currentTarget.textContent ?? "")}
                    className="outline-none focus:ring-2 focus:ring-brand/40 rounded px-1 py-0.5 min-h-[1.5em] bg-yellow-50 dark:bg-yellow-900/10"
                  >
                    {all[co] ?? ""}
                  </div>
                ) : (
                  (all[co] ?? <span className="italic text-gray-500">Not found in syllabus</span>)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
