import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type Bloom,
  type SubjectType,
  type PatternSlot,
  getPatternForSet,
  normalizeBloom,
  BLOOM_DETAILS,
} from "./paper-pattern";
import { generateContentWithRetry } from "./gemini.server";

const Input = z.object({
  syllabus: z.string(),
  questionBank: z.string(),
  marks: z.union([z.literal(20), z.literal(30)]),
  courseName: z.string(),
  courseCode: z.string(),
  subjectType: z
    .enum(["theoretical", "analytical_numerical"])
    .default("analytical_numerical")
    .optional(),
  moduleHours: z.record(z.string(), z.number()).optional(),
  generatedResponse: z.record(z.string(), z.unknown()).optional(),
});

export type GeneratedQuestion = {
  key: string;
  text: string;
  marks: number;
  bloom: Bloom;
  co: string;
  module: string;
  needsDiagram: boolean;
};

export type GeneratedSet = {
  difficulty: "Easy" | "Medium" | "Hard";
  questions: GeneratedQuestion[];
};

export type CourseOutcomes = Record<string, string>;

export type ModuleHourInfo = {
  module: string;
  moduleNumber: number;
  title: string;
  hours: number;
  weightagePercent: number;
};

export type QBAnalysis = {
  totalQuestions: number;
  bloomDistribution: Record<Bloom, number>;
  lotsCount: number;
  hotsCount: number;
  moduleDistribution: Record<string, number>;
  coDistribution: Record<string, number>;
  modules: Array<{
    module: string;
    hours: number;
    weightagePercent: number;
    questionCount: number;
  }>;
  nbaCompliance: {
    subjectType: SubjectType;
    maxBloomAllowed: "BL4 (Analyze)" | "BL6 (Create)";
    actualMaxBloom: string;
    isCompliant: boolean;
    reason: string;
  };
  uniquenessGuarantee: {
    totalSlotsRequired: number;
    availableQuestions: number;
    guaranteed100Percent: boolean;
  };
};

export type GenerateResponse = {
  sets: GeneratedSet[];
  courseOutcomes?: CourseOutcomes;
  analysis?: QBAnalysis;
};

export type BankQuestion = {
  text: string;
  marks?: number;
  bloom: Bloom;
  co?: string;
  module?: string;
};

function cleanKey(k: string): string {
  return (k || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeTextForComparison(t: string): string {
  return (t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 100);
}

// Extract modules and designated teaching hours from syllabus text
export function extractModulesWithHoursFromSyllabus(text: string): ModuleHourInfo[] {
  if (!text) return [];
  const modules: ModuleHourInfo[] = [];
  const lines = text.split(/\r?\n/);

  const moduleHeaderRegex =
    /(?:Module|Unit|Chapter)\s*[-:]?\s*([1-6]|\b(?:I|II|III|IV|V|VI)\b)\s*[:.\-–—\s|]+([^\n\r(]+)(?:\((?:approx\.?\s*)?(\d{1,2})\s*(?:Hours?|Hrs?|L)\))?/i;

  const romanMap: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
  };

  let totalHoursFound = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const match = moduleHeaderRegex.exec(line);
    if (match) {
      const rawNum = match[1].toUpperCase();
      const modNum = romanMap[rawNum] || parseInt(rawNum, 10);
      if (modNum >= 1 && modNum <= 6) {
        const title = match[2].trim();
        let hours = match[3] ? parseInt(match[3], 10) : 0;

        // Check if hours are on the next line or in subsequent parenthesis
        if (!hours) {
          const hoursMatch = line.match(/\b(\d{1,2})\s*(?:Hours?|Hrs?|Lectures?|L)\b/i);
          if (hoursMatch) {
            hours = parseInt(hoursMatch[1], 10);
          } else if (i + 1 < lines.length) {
            const nextLineMatch = lines[i + 1].match(
              /\b(\d{1,2})\s*(?:Hours?|Hrs?|Lectures?|L)\b/i,
            );
            if (nextLineMatch) {
              hours = parseInt(nextLineMatch[1], 10);
            }
          }
        }

        // Default standard engineering module hours if not explicitly specified
        if (!hours || hours <= 0) {
          hours = 6;
        }

        if (!modules.some((m) => m.moduleNumber === modNum)) {
          modules.push({
            module: `Module ${modNum}`,
            moduleNumber: modNum,
            title: title.slice(0, 50),
            hours,
            weightagePercent: 0,
          });
          totalHoursFound += hours;
        }
      }
    }
  }

  // Ensure default 6 modules if none detected
  if (modules.length === 0) {
    for (let i = 1; i <= 6; i++) {
      modules.push({
        module: `Module ${i}`,
        moduleNumber: i,
        title: `Module ${i}`,
        hours: 6,
        weightagePercent: Math.round((6 / 36) * 100),
      });
    }
    totalHoursFound = 36;
  }

  // Compute weightages
  modules.forEach((m) => {
    m.weightagePercent = Math.round((m.hours / (totalHoursFound || 1)) * 100);
  });

  return modules.sort((a, b) => a.moduleNumber - b.moduleNumber);
}

// Classify question statement to Revised Bloom's Taxonomy Level (1 to 6)
export function detectBloomLevel(text: string): Bloom {
  const t = text.trim();
  const lower = t.toLowerCase();

  // 1. Explicit tag check: [BL1], [BL2], [L1], [Bloom: Apply], etc.
  const explicitMatch = t.match(/\[?\b(?:BL|L|BT|Bloom'?s?\s*Level\s*[:=]?\s*)([1-6])\b\]?/i);
  if (explicitMatch) {
    const lvl = parseInt(explicitMatch[1], 10);
    switch (lvl) {
      case 1:
        return "Remember";
      case 2:
        return "Understand";
      case 3:
        return "Apply";
      case 4:
        return "Analyze";
      case 5:
        return "Evaluate";
      case 6:
        return "Create";
    }
  }

  // Explicit Bloom name tag
  if (/\b(?:remember(?:ing)?)\b/i.test(t)) return "Remember";
  if (/\b(?:understand(?:ing)?|comprehension)\b/i.test(t)) return "Understand";
  if (/\b(?:apply(?:ing)?|application)\b/i.test(t)) return "Apply";
  if (/\b(?:analyz(?:e|ing)|analysis)\b/i.test(t)) return "Analyze";
  if (/\b(?:evaluat(?:e|ing)|evaluation)\b/i.test(t)) return "Evaluate";
  if (/\b(?:creat(?:e|ing)|creation|design(?:ing)?)\b/i.test(t)) return "Create";

  // 2. Action verb detection at beginning of sentence or prominent clause
  if (
    /^\s*(?:design|formulate|construct|develop|synthesize|plan|generate|propose|invent|compose)\b/i.test(
      t,
    )
  ) {
    return "Create";
  }
  if (
    /^\s*(?:evaluate|assess|justify|critique|validate|appraise|recommend|prioritize|verify|judge)\b/i.test(
      t,
    )
  ) {
    return "Evaluate";
  }
  if (
    /^\s*(?:analyze|examine|categorize|contrast|investigate|distinguish|deconstruct|compare\s+and\s+contrast)\b/i.test(
      t,
    )
  ) {
    return "Analyze";
  }
  if (
    /^\s*(?:apply|calculate|solve|demonstrate|compute|implement|determine|derive|find|execute|employ)\b/i.test(
      t,
    )
  ) {
    return "Apply";
  }
  if (
    /^\s*(?:explain|describe|discuss|differentiate|compare|illustrate|classify|outline|summarize|interpret)\b/i.test(
      t,
    )
  ) {
    return "Understand";
  }
  if (
    /^\s*(?:define|state|list|name|recall|identify|enlist|mention|what\s+is|who|when)\b/i.test(t)
  ) {
    return "Remember";
  }

  // 3. Keyword scan anywhere
  if (/\b(?:design|develop\s+an\s+algorithm|formulate|architecture)\b/i.test(lower))
    return "Create";
  if (/\b(?:critique|justify|validate\s+whether|assess\s+the\s+impact)\b/i.test(lower))
    return "Evaluate";
  if (/\b(?:analyze|contrast|investigate|breakdown)\b/i.test(lower)) return "Analyze";
  if (/\b(?:calculate|numerical|solve|derive|compute|determine)\b/i.test(lower)) return "Apply";
  if (/\b(?:explain|describe|differentiate|distinguish|how\s+does)\b/i.test(lower))
    return "Understand";
  if (/\b(?:define|state|list|enlist)\b/i.test(lower)) return "Remember";

  return "Understand";
}

export function parseQuestionBankQuestions(text: string): BankQuestion[] {
  if (!text || !text.trim()) return [];
  const lines = text.split(/\r?\n/);
  const questions: BankQuestion[] = [];
  let currentText = "";
  let currentMarks: number | undefined;
  let currentBloom: Bloom | undefined;
  let currentCO: string | undefined;
  let currentModule: string | undefined;

  const pushCurrent = () => {
    const cleaned = currentText.trim();
    if (cleaned.length > 8) {
      const marksMatch = cleaned.match(/\[?\b(\d{1,2})\s*(?:Marks?|M)\b\]?/i);
      const coMatch = cleaned.match(/\b(CO[1-6])\b/i);
      const modMatch = cleaned.match(/\b(?:Module|Unit|Mod)\s*[-:]?\s*([1-6])\b/i);

      const detectedBloom = currentBloom || detectBloomLevel(cleaned);

      const strippedText = cleaned
        .replace(/^\s*(?:Q(?:uestion)?\.?\s*\d+|[0-9]{1,3}[.)\]])\s*/i, "")
        .replace(/\s*\[?\b\d{1,2}\s*(?:Marks?|M)\b\]?\s*$/i, "")
        .replace(/\s*\[?\bCO[1-6]\b\]?\s*$/i, "")
        .replace(/\s*\[?\b(?:BL|L|BT)[1-6]\b\]?\s*$/i, "")
        .trim();

      const modVal = currentModule || (modMatch ? `Module ${modMatch[1]}` : undefined);
      const coVal = currentCO || (coMatch ? coMatch[1].toUpperCase() : undefined);

      if (strippedText.length > 5) {
        questions.push({
          text: strippedText,
          marks: currentMarks || (marksMatch ? parseInt(marksMatch[1], 10) : undefined),
          bloom: detectedBloom,
          co: coVal,
          module: modVal,
        });
      }
    }
    currentText = "";
    currentMarks = undefined;
    currentBloom = undefined;
    currentCO = undefined;
    currentModule = undefined;
  };

  const questionStartRegex = /^\s*(?:Q(?:uestion)?\.?\s*\d+|[0-9]{1,3}[.)\]])\s+/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Track module header lines
    const modHeaderMatch = trimmed.match(/^(?:Module|Unit)\s*[-:]?\s*([1-6])/i);
    if (modHeaderMatch && trimmed.length < 50) {
      currentModule = `Module ${modHeaderMatch[1]}`;
    }

    if (questionStartRegex.test(trimmed)) {
      pushCurrent();
      currentText = trimmed;
    } else if (
      /^(?:Explain|State|Define|Compare|Derive|Write|Calculate|Design|Describe|Differentiate|Discuss|Illustrate|List|Prove|Show|What|Why|How|Enlist|Elaborate|Give|Justify|Evaluate|Analyze|Formulate)\b/i.test(
        trimmed,
      ) &&
      currentText.length > 25
    ) {
      pushCurrent();
      currentText = trimmed;
    } else {
      if (currentText) {
        currentText += " " + trimmed;
      } else if (trimmed.length > 8) {
        currentText = trimmed;
      }
    }
  }
  pushCurrent();
  return questions;
}

export function extractCOsFromSyllabusText(text: string): Record<string, string> {
  const cos: Record<string, string> = {};
  if (!text) return cos;

  // 1. Multi-line parser for Course Outcomes section/table
  const sectionRegex =
    /(?:Course\s*Outcomes?[:\s]|Course\s*Objectives?\s*(?:&|and)\s*Outcomes?|After\s+successful\s+completion\s+of\s+the\s+course[^\n\r]*|Learners\s+will\s+be\s+able\s+to|Students\s+will\s+be\s+able\s+to|Expected\s+Course\s+Outcomes?)/i;

  const match = sectionRegex.exec(text);
  if (match) {
    const startPos = match.index;
    const sectionChunk = text.slice(startPos, startPos + 6000);
    const lines = sectionChunk.split(/\r?\n/);

    let currentCOIndex: number | null = null;
    let currentBuffer: string[] = [];

    const flush = () => {
      if (currentCOIndex && currentCOIndex >= 1 && currentCOIndex <= 6) {
        const fullDesc = currentBuffer
          .join(" ")
          .replace(/\s+/g, " ")
          .replace(/^[-:.)|\s]+/, "")
          .trim();
        if (fullDesc.length > 5) {
          cos[`CO${currentCOIndex}`] = fullDesc;
        }
      }
      currentBuffer = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (
        /^(?:Module\s*\d+|Syllabus|Reference\s*Books?|Text\s*Books?|Internal\s*Assessment|Question\s*Paper\s*Pattern|Prerequisites?)\b/i.test(
          line,
        ) &&
        currentCOIndex !== null
      ) {
        break;
      }

      const itemMatch = line.match(
        /^(?:CO\s*[-.]?\s*|Course\s+Outcome\s*|Outcome\s*)?([1-6])\s*[:.)\-–—\s|]+\s*(.*)$/i,
      );

      if (itemMatch && itemMatch[1]) {
        const num = parseInt(itemMatch[1], 10);
        if (num >= 1 && num <= 6) {
          flush();
          currentCOIndex = num;
          if (itemMatch[2] && itemMatch[2].trim()) {
            currentBuffer.push(itemMatch[2].trim());
          }
          continue;
        }
      }

      if (currentCOIndex !== null) {
        if (
          !/^(?:Course\s*Outcomes?|After\s+successful|Learners\s+will|Students\s+will|Objectives?:)/i.test(
            line,
          )
        ) {
          currentBuffer.push(line);
        }
      }
    }
    flush();
  }

  // 2. Match explicit CO occurrences anywhere: "CO1: ...", "CO 1 - ..."
  const explicitCoRegex = /\bCO\s*[-.]?\s*([1-6])\s*[:.\-–—\s|]+\s*([^\n\r]+)/gi;
  let em;
  while ((em = explicitCoRegex.exec(text)) !== null) {
    const num = em[1];
    const desc = em[2].trim().replace(/^[-:.)|\s]+/, "");
    if (desc.length > 5 && !cos[`CO${num}`]) {
      cos[`CO${num}`] = desc;
    }
  }

  return cos;
}

// Perform rigorous Question Bank Analysis
export function computeQBAnalysis(
  qbQuestions: BankQuestion[],
  syllabusText: string,
  subjectType: SubjectType,
  marks: 20 | 30,
): QBAnalysis {
  const bloomDist: Record<Bloom, number> = {
    Remember: 0,
    Understand: 0,
    Apply: 0,
    Analyze: 0,
    Evaluate: 0,
    Create: 0,
  };

  const moduleDist: Record<string, number> = {};
  const coDist: Record<string, number> = {};

  qbQuestions.forEach((q) => {
    const b = q.bloom || "Understand";
    bloomDist[b] = (bloomDist[b] || 0) + 1;

    const m = q.module || "Module 1";
    moduleDist[m] = (moduleDist[m] || 0) + 1;

    const c = q.co || "CO1";
    coDist[c] = (coDist[c] || 0) + 1;
  });

  const lotsCount = (bloomDist.Remember || 0) + (bloomDist.Understand || 0);
  const hotsCount =
    (bloomDist.Apply || 0) +
    (bloomDist.Analyze || 0) +
    (bloomDist.Evaluate || 0) +
    (bloomDist.Create || 0);

  const modulesInfo = extractModulesWithHoursFromSyllabus(syllabusText);
  const modulesWithQB = modulesInfo.map((m) => ({
    module: m.module,
    hours: m.hours,
    weightagePercent: m.weightagePercent,
    questionCount: moduleDist[m.module] || 0,
  }));

  // NBA Compliance evaluation
  const isTheory = subjectType === "theoretical";
  const maxBloomAllowed = isTheory ? "BL4 (Analyze)" : "BL6 (Create)";
  let actualMaxLvl: BloomLevel = 1;
  let actualMaxBloom = "Remember (L1)";

  (Object.keys(bloomDist) as Bloom[]).forEach((b) => {
    if (bloomDist[b] > 0) {
      const lvl = BLOOM_DETAILS[b].level;
      if (lvl > actualMaxLvl) {
        actualMaxLvl = lvl;
        actualMaxBloom = `${b} (L${lvl})`;
      }
    }
  });

  let isCompliant = true;
  let reason = "Question bank aligns with NBA Revised Bloom's Taxonomy standards.";

  if (isTheory && actualMaxLvl > 4) {
    isCompliant = false;
    reason = `As a theoretical subject under NBA criteria, questions should be framed up to Level 4 (Analyze). Question bank contains Level ${actualMaxLvl} (${actualMaxBloom}) questions which will be calibrated during generation.`;
  } else if (!isTheory && hotsCount < 3) {
    reason =
      "For numerical + theoretical subjects, question bank should contain a robust spread from BL1 to BL6 (Design & Evaluation).";
  }

  const slotsPerSet = marks === 20 ? 8 : 6;
  const totalSlotsRequired = slotsPerSet * 3; // 3 sets: Easy, Medium, Hard
  const availableQuestions = qbQuestions.length;
  const guaranteed100Percent = availableQuestions >= totalSlotsRequired;

  return {
    totalQuestions: qbQuestions.length,
    bloomDistribution: bloomDist,
    lotsCount,
    hotsCount,
    moduleDistribution: moduleDist,
    coDistribution: coDist,
    modules: modulesWithQB,
    nbaCompliance: {
      subjectType,
      maxBloomAllowed,
      actualMaxBloom,
      isCompliant,
      reason,
    },
    uniquenessGuarantee: {
      totalSlotsRequired,
      availableQuestions,
      guaranteed100Percent,
    },
  };
}

export const analyzeQuestionBankFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<QBAnalysis> => {
    const qbQuestions = parseQuestionBankQuestions(data.questionBank);
    const subjectType = data.subjectType || "analytical_numerical";
    return computeQBAnalysis(qbQuestions, data.syllabus, subjectType, data.marks);
  });

export const generatePaperFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<GenerateResponse> => {
    // Only signed-in designers may generate papers.
    const { data: allowed } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "designer",
    });
    if (!allowed) throw new Error("Only designers can generate question papers.");

    const subjectType: SubjectType = data.subjectType || "analytical_numerical";
    const isTheory = subjectType === "theoretical";

    // Fast deterministic extraction of COs and Module Hours from syllabus text
    const regexCOs = extractCOsFromSyllabusText(data.syllabus);
    const moduleHours = extractModulesWithHoursFromSyllabus(data.syllabus);

    // Parse question bank questions locally
    const bankQuestions = parseQuestionBankQuestions(data.questionBank);

    // Calculate Question Bank Analysis
    const qbAnalysis = computeQBAnalysis(bankQuestions, data.syllabus, subjectType, data.marks);

    // Patterns for each difficulty
    const patternEasy = getPatternForSet(data.marks, "Easy", subjectType);
    const patternMedium = getPatternForSet(data.marks, "Medium", subjectType);
    const patternHard = getPatternForSet(data.marks, "Hard", subjectType);

    const promptSlotSpec = [
      "SET 1 (EASY / LOWER ORDER THINKING): " +
        patternEasy.map((s) => `[${s.key}: ${s.marks}M, Bloom=${s.bloom}]`).join(", "),
      "SET 2 (MEDIUM / BALANCED): " +
        patternMedium.map((s) => `[${s.key}: ${s.marks}M, Bloom=${s.bloom}]`).join(", "),
      "SET 3 (HARD / HIGHER ORDER THINKING): " +
        patternHard.map((s) => `[${s.key}: ${s.marks}M, Bloom=${s.bloom}]`).join(", "),
    ].join("\n");

    const sys =
      "You are an academic examination paper generator for engineering courses at K.J. Somaiya Institute of Technology.\n" +
      "Your objective is to generate 3 complete, 100% MUTUALLY UNIQUE exam question paper sets: 'Easy', 'Medium', and 'Hard'.\n\n" +
      "MANDATORY RULES AS PER NBA CRITERIA:\n" +
      "1. STRICT UNIQUE QUESTIONS ACROSS ALL 3 SETS: Every question selected must be 100% UNIQUE across Set A (Easy), Set B (Medium), and Set C (Hard). No question statement may be repeated in more than one set.\n" +
      "2. FETCH EXCLUSIVELY FROM QUESTION BANK: Select actual questions ONLY from the provided QUESTION BANK CONTENT. Do not invent or synthesize.\n" +
      "3. DIFFICULTY & BLOOM'S TAXONOMY PROFILING:\n" +
      "   - Easy Set: Select lower cognitive questions (Level 1 Remember, Level 2 Understand).\n" +
      "   - Medium Set: Select balanced questions (Level 2 Understand, Level 3 Apply, Level 4 Analyze).\n" +
      `   - Hard Set: ${
        isTheory
          ? "Subject is THEORETICAL. Under NBA criteria, Bloom's level is strictly set up to Level 4 (Analyze). Select challenging analytical/comparative questions up to Level 4."
          : "Subject is NUMERICAL + THEORETICAL. Under NBA criteria, questions are set up to Level 6 (Create/Design/Evaluate). Select advanced problem-solving, design, and evaluation questions (Levels 3 to 6)."
      }\n` +
      "4. MODULE HOURLY WEIGHTAGE: Distribute questions across modules in proportion to their teaching hours.\n" +
      "5. CO EXTRACTION: Extract Course Outcomes (CO1 to CO6) verbatim from the syllabus.";

    const prompt = `Course Name: ${data.courseName}
Course Code: ${data.courseCode}
Total Marks: ${data.marks}
Subject Type: ${isTheory ? "Theoretical (Max Bloom Level 4 - Analyze)" : "Numerical + Theoretical (Bloom Level 1 to Level 6)"}

MODULE HOURLY BREAKDOWN:
${moduleHours.map((m) => `${m.module} (${m.title}): ${m.hours} Hours (${m.weightagePercent}% weightage)`).join("\n")}

REQUIRED PATTERN SLOTS FOR THE 3 SETS:
${promptSlotSpec}

QUESTION BANK CONTENT (SELECT 100% UNIQUE QUESTIONS EXCLUSIVELY FROM HERE):
${data.questionBank.slice(0, 50000)}

SYLLABUS CONTENT (EXTRACT COURSE OUTCOMES):
${data.syllabus.slice(0, 18000)}

TASK:
1. Extract CO1 to CO6 verbatim from syllabus.
2. Select distinct questions for Easy, Medium, and Hard sets.
Ensure zero duplication between Easy, Medium, and Hard sets.`;

    let rawParsed: any = data.generatedResponse ?? {};
    if (!data.generatedResponse) {
      try {
      const response = await generateContentWithRetry({
        preferredModel: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction: sys,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              sets: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    difficulty: { type: "STRING" },
                    questions: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          key: { type: "STRING" },
                          text: { type: "STRING" },
                          marks: { type: "INTEGER" },
                          bloom: { type: "STRING" },
                          co: { type: "STRING" },
                          module: { type: "STRING" },
                          needsDiagram: { type: "BOOLEAN" },
                        },
                        required: ["key", "text", "marks", "bloom", "co", "module"],
                      },
                    },
                  },
                  required: ["difficulty", "questions"],
                },
              },
              courseOutcomes: {
                type: "OBJECT",
                properties: {
                  CO1: { type: "STRING" },
                  CO2: { type: "STRING" },
                  CO3: { type: "STRING" },
                  CO4: { type: "STRING" },
                  CO5: { type: "STRING" },
                  CO6: { type: "STRING" },
                },
              },
            },
            required: ["sets"],
          },
        },
      });

      const content = response.text?.trim() ?? "{}";
      try {
        rawParsed = JSON.parse(content);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        rawParsed = match ? JSON.parse(match[0]) : {};
      }
      } catch (e) {
        console.warn("AI generation fallback to deterministic QB allocation:", e);
      }
    }

    // Extract raw sets from AI response
    const rawSets =
      rawParsed.sets ?? rawParsed.Sets ?? (Array.isArray(rawParsed) ? rawParsed : null);
    const rawSetBuckets: Array<{ difficulty: "Easy" | "Medium" | "Hard"; questions: any[] }> = [];

    if (Array.isArray(rawSets)) {
      rawSets.forEach((item: any, idx: number) => {
        const diffRaw = String(item.difficulty || ["Easy", "Medium", "Hard"][idx] || "Medium");
        const foundDiff = ["Easy", "Medium", "Hard"].find(
          (d) => d.toLowerCase() === diffRaw.toLowerCase(),
        );
        const diff = (foundDiff as "Easy" | "Medium" | "Hard") ?? "Medium";
        const qList = Array.isArray(item.questions)
          ? item.questions
          : Array.isArray(item)
            ? item
            : [];
        rawSetBuckets.push({ difficulty: diff, questions: qList });
      });
    }

    // GLOBAL UNIQUENESS ENFORCEMENT ACROSS ALL THREE SETS
    // We maintain a global set of used normalized text hashes and bank indices
    const globallyUsedTexts = new Set<string>();
    const globallyUsedBankIndices = new Set<number>();

    const diffConfigs: Array<{
      difficulty: "Easy" | "Medium" | "Hard";
      pattern: PatternSlot[];
    }> = [
      { difficulty: "Easy", pattern: patternEasy },
      { difficulty: "Medium", pattern: patternMedium },
      { difficulty: "Hard", pattern: patternHard },
    ];

    const finalSets: GeneratedSet[] = diffConfigs.map(({ difficulty, pattern }) => {
      const foundBucket = rawSetBuckets.find((b) => b.difficulty === difficulty);
      const incomingQuestions = foundBucket ? [...foundBucket.questions] : [];

      const alignedQuestions: GeneratedQuestion[] = pattern.map((slot, sIdx) => {
        const defaultCo =
          slot.qNo === "Q1" ? "CO1" : slot.qNo === "Q2" ? "CO2" : slot.qNo === "Q3" ? "CO3" : "CO1";

        let selectedText = "";
        let selectedBloom: Bloom = slot.bloom;
        let selectedCo: string = defaultCo;
        let selectedModule: string = `Module ${defaultCo.replace("CO", "")}`;
        let selectedNeedsDiagram = false;

        // 1. Try to match from AI incoming questions ensuring GLOBAL uniqueness
        for (let i = 0; i < incomingQuestions.length; i++) {
          const q = incomingQuestions[i];
          if (!q || !q.text || q.text.startsWith("[")) continue;

          const norm = normalizeTextForComparison(q.text);
          if (globallyUsedTexts.has(norm)) continue; // Skip if used in ANY set

          const keyMatches =
            cleanKey(q.key) === cleanKey(slot.key) ||
            (cleanKey(q.key).endsWith(cleanKey(slot.subQ)) &&
              cleanKey(q.key).includes(cleanKey(slot.qNo).replace(/q/, "")));

          if (keyMatches || i === sIdx) {
            selectedText = String(q.text).trim();
            globallyUsedTexts.add(norm);
            selectedBloom = normalizeBloom(q.bloom || slot.bloom);

            // Cap bloom level at Analyze (BL4) if theoretical subject
            if (isTheory && BLOOM_DETAILS[selectedBloom].level > 4) {
              selectedBloom = "Analyze";
            }

            const rawCo = String(q.co || "").toUpperCase();
            selectedCo = rawCo.match(/^CO[1-6]$/) ? rawCo : defaultCo;
            selectedModule = String(q.module || `Module ${selectedCo.replace("CO", "")}`);
            selectedNeedsDiagram = Boolean(q.needsDiagram);

            // Remove from candidates
            incomingQuestions.splice(i, 1);
            break;
          }
        }

        // 2. If not matched, pick directly from parsed question bank pool ensuring GLOBAL uniqueness
        if (!selectedText) {
          // Priority 1: Match slot bloom level + unused globally
          let bankMatchIdx = bankQuestions.findIndex((bq, idx) => {
            if (globallyUsedBankIndices.has(idx)) return false;
            const norm = normalizeTextForComparison(bq.text);
            if (globallyUsedTexts.has(norm)) return false;
            return bq.bloom === slot.bloom;
          });

          // Priority 2: Any unused question from bank
          if (bankMatchIdx === -1) {
            bankMatchIdx = bankQuestions.findIndex((bq, idx) => {
              if (globallyUsedBankIndices.has(idx)) return false;
              const norm = normalizeTextForComparison(bq.text);
              return !globallyUsedTexts.has(norm);
            });
          }

          if (bankMatchIdx !== -1 && bankQuestions[bankMatchIdx]) {
            globallyUsedBankIndices.add(bankMatchIdx);
            const bq = bankQuestions[bankMatchIdx];
            const norm = normalizeTextForComparison(bq.text);
            globallyUsedTexts.add(norm);

            selectedText = bq.text;
            selectedBloom = bq.bloom || slot.bloom;
            if (isTheory && BLOOM_DETAILS[selectedBloom].level > 4) {
              selectedBloom = "Analyze";
            }
            selectedCo = bq.co && bq.co.match(/^CO[1-6]$/) ? bq.co : defaultCo;
            selectedModule = bq.module || `Module ${selectedCo.replace("CO", "")}`;
          }
        }

        // 3. Last fallback: deterministic question framed according to difficulty & course
        if (!selectedText) {
          const course = data.courseName || "the course";
          if (difficulty === "Easy") {
            selectedText =
              slot.bloom === "Remember"
                ? `Define the fundamental principles, terminology, and key concepts of ${course}.`
                : `Explain the basic architecture, working mechanism, and characteristics of ${course}.`;
          } else if (difficulty === "Medium") {
            selectedText =
              slot.bloom === "Apply"
                ? `Apply relevant analytical algorithms and formulas of ${course} to compute the solution for the given system.`
                : `Differentiate and analyze the performance trade-offs of key techniques in ${course}.`;
          } else {
            selectedText = isTheory
              ? `Critically analyze and compare the theoretical frameworks and methodologies used in ${course}.`
              : `Design and formulate an optimal computational model / architecture for ${course} to meet the specified constraints.`;
          }
          selectedBloom = slot.bloom;
        }

        return {
          key: slot.key,
          text: selectedText,
          marks: slot.marks,
          bloom: selectedBloom,
          co: selectedCo,
          module: selectedModule,
          needsDiagram: selectedNeedsDiagram,
        };
      });

      return {
        difficulty,
        questions: alignedQuestions,
      };
    });

    const aiCOs: Record<string, string> =
      rawParsed.courseOutcomes || rawParsed.CourseOutcomes || {};
    const mergedCOs: Record<string, string> = {
      ...aiCOs,
      ...regexCOs,
    };

    return {
      sets: finalSets,
      courseOutcomes: mergedCOs,
      analysis: qbAnalysis,
    };
  });
