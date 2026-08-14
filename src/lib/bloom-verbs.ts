// REVISED Bloom's Taxonomy Action Verbs (Anderson & Krathwohl, 2001)
// Verbatim verb lists from the official chart. Only levels I-III are used by
// the paper pattern, but the higher levels are kept so we can explicitly
// forbid verbs that belong to another level (e.g. "distinguish" = Analyzing).

export type BloomLevel = "Remember" | "Understand" | "Apply";

export const BLOOM_VERBS: Record<string, string[]> = {
  Remember: [
    "choose", "define", "find", "how", "label", "list", "match", "name", "omit",
    "recall", "relate", "select", "show", "spell", "tell", "what", "when",
    "where", "which", "who", "why",
  ],
  Understand: [
    "classify", "compare", "contrast", "demonstrate", "explain", "extend",
    "illustrate", "infer", "interpret", "outline", "relate", "rephrase",
    "show", "summarize", "translate",
  ],
  Apply: [
    "apply", "build", "choose", "construct", "develop", "experiment with",
    "identify", "interview", "make use of", "model", "organize", "plan",
    "select", "solve", "utilize",
  ],
  Analyze: [
    "analyze", "assume", "categorize", "classify", "compare", "conclusion",
    "contrast", "discover", "dissect", "distinguish", "divide", "examine",
    "function", "inference", "inspect", "list", "motive", "relationships",
    "simplify", "survey", "take part in", "test for", "theme",
  ],
  Evaluate: [
    "agree", "appraise", "assess", "award", "choose", "compare", "conclude",
    "criteria", "criticize", "decide", "deduct", "defend", "determine",
    "disprove", "estimate", "evaluate", "explain", "importance", "influence",
    "interpret", "judge", "justify", "mark", "measure", "opinion", "perceive",
    "prioritize", "prove", "rate", "recommend", "rule on", "select", "support",
    "value",
  ],
  Create: [
    "adapt", "build", "change", "choose", "combine", "compile", "compose",
    "construct", "create", "delete", "design", "develop", "discuss",
    "elaborate", "estimate", "formulate", "happen", "imagine", "improve",
    "invent", "make up", "maximize", "minimize", "modify", "original",
    "originate", "plan", "predict", "propose", "solution", "solve", "suppose",
    "test", "theory",
  ],
};

export function allowedVerbs(level: BloomLevel): string[] {
  return BLOOM_VERBS[level] ?? [];
}

/** Verbs that belong to OTHER Bloom levels and are NOT valid for `level`. */
export function forbiddenVerbs(level: BloomLevel): string[] {
  const allowed = new Set(allowedVerbs(level));
  const out = new Set<string>();
  for (const [lvl, verbs] of Object.entries(BLOOM_VERBS)) {
    if (lvl === level) continue;
    for (const v of verbs) if (!allowed.has(v)) out.add(v);
  }
  return Array.from(out).sort();
}

/** True when the text opens with / clearly uses a verb from the given level. */
export function usesAllowedVerb(text: string, level: BloomLevel): boolean {
  const t = text.toLowerCase();
  return allowedVerbs(level).some((v) =>
    new RegExp(`(^|[^a-z])${v.replace(/ /g, "\\s+")}(s|es|ed|ing)?([^a-z]|$)`, "i").test(t),
  );
}
