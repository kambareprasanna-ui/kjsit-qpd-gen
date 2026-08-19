export type BloomLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type Bloom = "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";

export type SubjectType = "theoretical" | "analytical_numerical";

export type BloomInfo = {
  level: BloomLevel;
  code: string;
  label: string;
  verbs: string[];
  category: "LOTS" | "HOTS"; // Lower Order vs Higher Order Thinking Skills
};

export const BLOOM_DETAILS: Record<Bloom, BloomInfo> = {
  Remember: {
    level: 1,
    code: "BL1",
    label: "Remember (L1)",
    verbs: ["Define", "State", "List", "Name", "Recall", "Identify", "Enlist", "Mention"],
    category: "LOTS",
  },
  Understand: {
    level: 2,
    code: "BL2",
    label: "Understand (L2)",
    verbs: [
      "Explain",
      "Describe",
      "Discuss",
      "Differentiate",
      "Compare",
      "Illustrate",
      "Distinguish",
      "Classify",
    ],
    category: "LOTS",
  },
  Apply: {
    level: 3,
    code: "BL3",
    label: "Apply (L3)",
    verbs: [
      "Apply",
      "Calculate",
      "Solve",
      "Demonstrate",
      "Compute",
      "Implement",
      "Determine",
      "Derive",
    ],
    category: "HOTS",
  },
  Analyze: {
    level: 4,
    code: "BL4",
    label: "Analyze (L4)",
    verbs: ["Analyze", "Examine", "Categorize", "Contrast", "Investigate", "Relate", "Deconstruct"],
    category: "HOTS",
  },
  Evaluate: {
    level: 5,
    code: "BL5",
    label: "Evaluate (L5)",
    verbs: [
      "Evaluate",
      "Assess",
      "Justify",
      "Critique",
      "Validate",
      "Appraise",
      "Select",
      "Optimize",
    ],
    category: "HOTS",
  },
  Create: {
    level: 6,
    code: "BL6",
    label: "Create (L6)",
    verbs: [
      "Design",
      "Formulate",
      "Construct",
      "Develop",
      "Synthesize",
      "Plan",
      "Generate",
      "Propose",
    ],
    category: "HOTS",
  },
};

export function normalizeBloom(b?: string): Bloom {
  if (!b) return "Understand";
  const str = b.toLowerCase().trim();
  if (str.includes("rem") || str === "bl1" || str === "l1") return "Remember";
  if (str.includes("und") || str === "bl2" || str === "l2") return "Understand";
  if (str.includes("app") || str === "bl3" || str === "l3") return "Apply";
  if (str.includes("ana") || str === "bl4" || str === "l4") return "Analyze";
  if (str.includes("eva") || str === "bl5" || str === "l5") return "Evaluate";
  if (str.includes("cre") || str.includes("des") || str === "bl6" || str === "l6") return "Create";
  return "Understand";
}

export type PatternSlot = {
  key: string; // e.g. Q1a)
  qNo: string;
  subQ: string;
  marks: number;
  bloom: Bloom;
  isOr?: boolean; // this slot is an OR alternative to the previous slot
  module?: string;
};

// Standard slot matrices tailored for difficulty and subject type
export function getPatternForSet(
  marks: 20 | 30,
  difficulty: "Easy" | "Medium" | "Hard" = "Medium",
  subjectType: SubjectType = "analytical_numerical",
): PatternSlot[] {
  const isTheory = subjectType === "theoretical";

  if (marks === 20) {
    if (difficulty === "Easy") {
      // Easy: lower cognitive levels (Remember L1 & Understand L2)
      return [
        { key: "Q1a)", qNo: "Q1", subQ: "a)", marks: 4, bloom: "Remember" },
        { key: "Q1b)", qNo: "Q1", subQ: "b)", marks: 4, bloom: "Remember" },
        { key: "Q1c)", qNo: "Q1", subQ: "c)", marks: 4, bloom: "Understand" },
        { key: "Q2a)", qNo: "Q2", subQ: "a)", marks: 4, bloom: "Remember" },
        { key: "Q2b)", qNo: "Q2", subQ: "b)", marks: 4, bloom: "Understand" },
        { key: "Q2c)", qNo: "Q2", subQ: "c)", marks: 4, bloom: "Understand" },
        { key: "Q3a)", qNo: "Q3", subQ: "a)", marks: 4, bloom: "Understand" },
        { key: "Q3b)", qNo: "Q3", subQ: "b)", marks: 4, bloom: isTheory ? "Understand" : "Apply" },
      ];
    } else if (difficulty === "Medium") {
      // Medium: balanced spread (Understand L2, Apply L3, Analyze L4)
      return [
        { key: "Q1a)", qNo: "Q1", subQ: "a)", marks: 4, bloom: "Remember" },
        { key: "Q1b)", qNo: "Q1", subQ: "b)", marks: 4, bloom: "Understand" },
        { key: "Q1c)", qNo: "Q1", subQ: "c)", marks: 4, bloom: "Understand" },
        { key: "Q2a)", qNo: "Q2", subQ: "a)", marks: 4, bloom: "Understand" },
        { key: "Q2b)", qNo: "Q2", subQ: "b)", marks: 4, bloom: "Apply" },
        { key: "Q2c)", qNo: "Q2", subQ: "c)", marks: 4, bloom: "Apply" },
        { key: "Q3a)", qNo: "Q3", subQ: "a)", marks: 4, bloom: "Apply" },
        { key: "Q3b)", qNo: "Q3", subQ: "b)", marks: 4, bloom: isTheory ? "Analyze" : "Analyze" },
      ];
    } else {
      // Hard: HOTS questions. For theory max BL4; for numerical/analytical spans up to BL5-BL6
      return [
        { key: "Q1a)", qNo: "Q1", subQ: "a)", marks: 4, bloom: "Understand" },
        { key: "Q1b)", qNo: "Q1", subQ: "b)", marks: 4, bloom: "Apply" },
        { key: "Q1c)", qNo: "Q1", subQ: "c)", marks: 4, bloom: "Apply" },
        { key: "Q2a)", qNo: "Q2", subQ: "a)", marks: 4, bloom: "Apply" },
        { key: "Q2b)", qNo: "Q2", subQ: "b)", marks: 4, bloom: isTheory ? "Analyze" : "Analyze" },
        { key: "Q2c)", qNo: "Q2", subQ: "c)", marks: 4, bloom: isTheory ? "Analyze" : "Evaluate" },
        { key: "Q3a)", qNo: "Q3", subQ: "a)", marks: 4, bloom: isTheory ? "Analyze" : "Evaluate" },
        { key: "Q3b)", qNo: "Q3", subQ: "b)", marks: 4, bloom: isTheory ? "Analyze" : "Create" },
      ];
    }
  } else {
    // 30 Marks Pattern
    if (difficulty === "Easy") {
      return [
        { key: "Q1a)", qNo: "Q1", subQ: "a)", marks: 5, bloom: "Remember" },
        { key: "Q1b)", qNo: "Q1", subQ: "b)", marks: 5, bloom: "Understand" },
        { key: "Q2a)", qNo: "Q2", subQ: "a)", marks: 10, bloom: "Understand" },
        { key: "Q2b)", qNo: "Q2", subQ: "b)", marks: 10, bloom: "Understand", isOr: true },
        { key: "Q3a)", qNo: "Q3", subQ: "a)", marks: 10, bloom: "Understand" },
        {
          key: "Q3b)",
          qNo: "Q3",
          subQ: "b)",
          marks: 10,
          bloom: isTheory ? "Understand" : "Apply",
          isOr: true,
        },
      ];
    } else if (difficulty === "Medium") {
      return [
        { key: "Q1a)", qNo: "Q1", subQ: "a)", marks: 5, bloom: "Remember" },
        { key: "Q1b)", qNo: "Q1", subQ: "b)", marks: 5, bloom: "Understand" },
        { key: "Q2a)", qNo: "Q2", subQ: "a)", marks: 10, bloom: "Apply" },
        { key: "Q2b)", qNo: "Q2", subQ: "b)", marks: 10, bloom: "Apply", isOr: true },
        { key: "Q3a)", qNo: "Q3", subQ: "a)", marks: 10, bloom: "Apply" },
        {
          key: "Q3b)",
          qNo: "Q3",
          subQ: "b)",
          marks: 10,
          bloom: isTheory ? "Analyze" : "Analyze",
          isOr: true,
        },
      ];
    } else {
      return [
        { key: "Q1a)", qNo: "Q1", subQ: "a)", marks: 5, bloom: "Understand" },
        { key: "Q1b)", qNo: "Q1", subQ: "b)", marks: 5, bloom: "Apply" },
        { key: "Q2a)", qNo: "Q2", subQ: "a)", marks: 10, bloom: isTheory ? "Analyze" : "Analyze" },
        {
          key: "Q2b)",
          qNo: "Q2",
          subQ: "b)",
          marks: 10,
          bloom: isTheory ? "Analyze" : "Evaluate",
          isOr: true,
        },
        { key: "Q3a)", qNo: "Q3", subQ: "a)", marks: 10, bloom: isTheory ? "Analyze" : "Evaluate" },
        {
          key: "Q3b)",
          qNo: "Q3",
          subQ: "b)",
          marks: 10,
          bloom: isTheory ? "Analyze" : "Create",
          isOr: true,
        },
      ];
    }
  }
}

export const PATTERN_20: PatternSlot[] = getPatternForSet(20, "Medium");
export const PATTERN_30: PatternSlot[] = getPatternForSet(30, "Medium");

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
