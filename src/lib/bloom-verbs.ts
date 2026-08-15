// Revised Bloom's Taxonomy action verbs (Anderson & Krathwohl, 2001)
export const BLOOM_VERBS: Record<string, string[]> = {
  remember: [
    "Choose", "Define", "Find", "How", "Label", "List", "Match", "Name", "Omit",
    "Recall", "Relate", "Select", "Show", "Spell", "Tell", "What", "When",
    "Where", "Which", "Who", "Why",
  ],
  understand: [
    "Classify", "Compare", "Contrast", "Demonstrate", "Explain", "Extend",
    "Illustrate", "Infer", "Interpret", "Outline", "Relate", "Rephrase",
    "Show", "Summarize", "Translate",
  ],
  apply: [
    "Apply", "Build", "Choose", "Construct", "Develop", "Experiment with",
    "Identify", "Interview", "Make use of", "Model", "Organize", "Plan",
    "Select", "Solve", "Utilize",
  ],
  analyze: [
    "Analyze", "Assume", "Categorize", "Classify", "Compare", "Conclusion",
    "Contrast", "Discover", "Dissect", "Distinguish", "Divide", "Examine",
    "Function", "Inference", "Inspect", "List", "Motive", "Relationships",
    "Simplify", "Survey", "Take part in", "Test for", "Theme",
  ],
  evaluate: [
    "Agree", "Appraise", "Assess", "Award", "Choose", "Compare", "Conclude",
    "Criteria", "Criticize", "Decide", "Deduct", "Defend", "Determine",
    "Disprove", "Estimate", "Evaluate", "Explain", "Importance", "Influence",
    "Interpret", "Judge", "Justify", "Mark", "Measure", "Opinion", "Perceive",
    "Prioritize", "Prove", "Rate", "Recommend", "Rule on", "Select", "Support",
    "Value",
  ],
  create: [
    "Adapt", "Build", "Change", "Choose", "Combine", "Compile", "Compose",
    "Construct", "Create", "Delete", "Design", "Develop", "Discuss",
    "Elaborate", "Estimate", "Formulate", "Happen", "Imagine", "Improve",
    "Invent", "Make up", "Maximize", "Minimize", "Modify", "Original",
    "Originate", "Plan", "Predict", "Propose", "Solution", "Solve", "Suppose",
    "Test", "Theory",
  ],
};

export function normalizeBloom(bloom: string): string {
  const b = (bloom || "").toLowerCase().trim();
  if (b.startsWith("remember")) return "remember";
  if (b.startsWith("understand") || b.startsWith("comprehen")) return "understand";
  if (b.startsWith("apply") || b.startsWith("applic")) return "apply";
  if (b.startsWith("analy")) return "analyze";
  if (b.startsWith("eval")) return "evaluate";
  if (b.startsWith("creat") || b.startsWith("synth")) return "create";
  return b;
}

export function verbsFor(bloom: string): string[] {
  return BLOOM_VERBS[normalizeBloom(bloom)] ?? [];
}

/** Verbs that belong to other levels only — must never appear in the reframed stem. */
export function forbiddenVerbsFor(bloom: string): string[] {
  const level = normalizeBloom(bloom);
  const allowed = new Set(verbsFor(level).map((v) => v.toLowerCase()));
  const out = new Set<string>();
  for (const [lvl, verbs] of Object.entries(BLOOM_VERBS)) {
    if (lvl === level) continue;
    for (const v of verbs) if (!allowed.has(v.toLowerCase())) out.add(v);
  }
  return [...out];
}

/** Returns the first forbidden verb found in the text, if any. */
export function findForbiddenVerb(text: string, bloom: string): string | null {
  const lower = ` ${text.toLowerCase()} `;
  for (const v of forbiddenVerbsFor(bloom)) {
    const re = new RegExp(`\\b${v.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) return v;
  }
  return null;
}
