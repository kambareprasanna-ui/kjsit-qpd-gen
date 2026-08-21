export type Bloom = "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";

export const BT_LEVEL_MAP: Record<string, string> = {
  Remember: "R",
  Understand: "U",
  Apply: "A",
  Analyze: "An",
  Evaluate: "E",
  Create: "C",
};

export function formatBTLevel(bloom?: string | null): string {
  if (!bloom) return "";
  const b = bloom.trim();
  const lower = b.toLowerCase();
  if (lower === "r" || lower.startsWith("rememb")) return "R";
  if (lower === "u" || lower.startsWith("under")) return "U";
  if (lower === "a" || lower.startsWith("appl")) return "A";
  if (lower === "an" || lower.startsWith("analy") || lower.startsWith("anayl")) return "An";
  if (lower === "e" || lower.startsWith("eval")) return "E";
  if (lower === "c" || lower.startsWith("creat")) return "C";
  return b;
}

export type PatternSlot = {
  key: string; // e.g. Q1a)
  qNo: string;
  subQ: string;
  marks: number;
  bloom: Bloom;
  isOr?: boolean; // this slot is an OR alternative to the previous slot
};

export const PATTERN_20: PatternSlot[] = [
  { key: "Q1a)", qNo: "Q1", subQ: "a)", marks: 4, bloom: "Remember" },
  { key: "Q1b)", qNo: "Q1", subQ: "b)", marks: 4, bloom: "Remember" },
  { key: "Q1c)", qNo: "Q1", subQ: "c)", marks: 4, bloom: "Remember" },
  { key: "Q2a)", qNo: "Q2", subQ: "a)", marks: 4, bloom: "Understand" },
  { key: "Q2b)", qNo: "Q2", subQ: "b)", marks: 4, bloom: "Understand" },
  { key: "Q2c)", qNo: "Q2", subQ: "c)", marks: 4, bloom: "Understand" },
  { key: "Q3a)", qNo: "Q3", subQ: "a)", marks: 4, bloom: "Apply" },
  { key: "Q3b)", qNo: "Q3", subQ: "b)", marks: 4, bloom: "Apply" },
];

export const PATTERN_30: PatternSlot[] = [
  { key: "Q1a)", qNo: "Q1", subQ: "a)", marks: 5, bloom: "Remember" },
  { key: "Q1b)", qNo: "Q1", subQ: "b)", marks: 5, bloom: "Remember" },
  { key: "Q2a)", qNo: "Q2", subQ: "a)", marks: 10, bloom: "Understand" },
  { key: "Q2b)", qNo: "Q2", subQ: "b)", marks: 10, bloom: "Understand", isOr: true },
  { key: "Q3a)", qNo: "Q3", subQ: "a)", marks: 10, bloom: "Apply" },
  { key: "Q3b)", qNo: "Q3", subQ: "b)", marks: 10, bloom: "Apply", isOr: true },
];

export function getPattern(marks: 20 | 30): PatternSlot[] {
  return marks === 20 ? PATTERN_20 : PATTERN_30;
}

export function paperInstruction(marks: 20 | 30): string {
  return marks === 20
    ? "Solve ANY TWO from Q1, Q2 and ANY ONE from Q3."
    : "All Questions are compulsory.";
}

export function paperTime(marks: 20 | 30): string {
  return marks === 20 ? "1 hr" : "1 hr 30 min";
}
