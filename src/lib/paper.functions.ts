import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PATTERN_20, PATTERN_30, type PatternSlot } from "./paper-pattern";
import { generateContentWithRetry } from "./gemini.server";

const Input = z.object({
  syllabus: z.string(),
  questionBank: z.string(),
  marks: z.union([z.literal(20), z.literal(30)]),
  courseName: z.string(),
  courseCode: z.string(),
});

export type GeneratedQuestion = {
  key: string;
  text: string;
  marks: number;
  bloom: "Remember" | "Understand" | "Apply";
  co: string;
  module: string;
  needsDiagram: boolean;
};

export type GeneratedSet = {
  setName: string; // "Set A" | "Set B" | "Set C"
  difficulty?: "Easy" | "Medium" | "Hard" | "Set A" | "Set B" | "Set C" | string;
  questions: GeneratedQuestion[];
};

export type CourseOutcomes = Record<string, string>;

export type GenerateResponse = { sets: GeneratedSet[]; courseOutcomes?: CourseOutcomes };

export type BankQuestion = {
  text: string;
  marks?: number;
  bloom?: "Remember" | "Understand" | "Apply";
  co?: string;
  module?: string;
};

function cleanKey(k: string): string {
  return (k || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function parseQuestionBankQuestions(text: string): BankQuestion[] {
  if (!text || !text.trim()) return [];
  const lines = text.split(/\r?\n/);
  const questions: BankQuestion[] = [];
  let currentText = "";
  let currentMarks: number | undefined;
  let currentBloom: "Remember" | "Understand" | "Apply" | undefined;
  let currentCO: string | undefined;

  const pushCurrent = () => {
    const cleaned = currentText.trim();
    if (cleaned.length > 8) {
      // Check if text has marks or CO or bloom inside
      const marksMatch = cleaned.match(/\[?\b(\d{1,2})\s*(?:Marks?|M)\b\]?/i);
      const coMatch = cleaned.match(/\b(CO[1-6])\b/i);
      const bloomMatch = cleaned.match(
        /\b(Remember|Understand|Apply|Analyzing|Evaluating|Creating)\b/i,
      );

      let detectedBloom: "Remember" | "Understand" | "Apply" | undefined = currentBloom;
      if (!detectedBloom && bloomMatch) {
        const b = bloomMatch[1].toLowerCase();
        if (b.startsWith("rem")) detectedBloom = "Remember";
        else if (b.startsWith("und")) detectedBloom = "Understand";
        else detectedBloom = "Apply";
      }

      const strippedText = cleaned
        .replace(/^\s*(?:Q(?:uestion)?\.?\s*\d+|[0-9]{1,3}[.)\]])\s*/i, "")
        .replace(/\s*\[?\b\d{1,2}\s*(?:Marks?|M)\b\]?\s*$/i, "")
        .replace(/\s*\[?\bCO[1-6]\b\]?\s*$/i, "")
        .trim();

      if (strippedText.length > 5) {
        questions.push({
          text: strippedText,
          marks: currentMarks || (marksMatch ? parseInt(marksMatch[1], 10) : undefined),
          bloom: detectedBloom,
          co: currentCO || (coMatch ? coMatch[1].toUpperCase() : undefined),
        });
      }
    }
    currentText = "";
    currentMarks = undefined;
    currentBloom = undefined;
    currentCO = undefined;
  };

  const questionStartRegex = /^\s*(?:Q(?:uestion)?\.?\s*\d+|[0-9]{1,3}[.)\]])\s+/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (questionStartRegex.test(trimmed)) {
      pushCurrent();
      currentText = trimmed;
    } else if (
      /^(?:Explain|State|Define|Compare|Derive|Write|Calculate|Design|Describe|Differentiate|Discuss|Illustrate|List|Prove|Show|What|Why|How|Enlist|Elaborate|Give|Justify)\b/i.test(
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

      // Stop if reaching subsequent syllabus chapters or reference sections
      if (
        /^(?:Module\s*\d+|Syllabus|Reference\s*Books?|Text\s*Books?|Internal\s*Assessment|Question\s*Paper\s*Pattern|Prerequisites?)\b/i.test(
          line,
        ) &&
        currentCOIndex !== null
      ) {
        break;
      }

      // Check if line starts a new CO item: "1.", "1)", "1 -", "CO1:", "CO 1.", "CO-1", "Outcome 1."
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

      // Append multi-line continuation text to the current CO
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

  // 2. Match explicit CO occurrences anywhere: "CO1: ...", "CO 1 - ...", "CO-1. ..."
  const explicitCoRegex = /\bCO\s*[-.]?\s*([1-6])\s*[:.\-–—\s|]+\s*([^\n\r]+)/gi;
  let em;
  while ((em = explicitCoRegex.exec(text)) !== null) {
    const num = em[1];
    const desc = em[2].trim().replace(/^[-:.)|\s]+/, "");
    if (desc.length > 5 && !cos[`CO${num}`]) {
      cos[`CO${num}`] = desc;
    }
  }

  // 3. Match "Course Outcome 1: ...", "Outcome 1: ..."
  const outcomeRegex = /\b(?:Course\s+)?Outcome\s*[-:.]?\s*([1-6])\s*[:.\-–—\s|]+\s*([^\n\r]+)/gi;
  while ((em = outcomeRegex.exec(text)) !== null) {
    const num = em[1];
    const desc = em[2].trim().replace(/^[-:.)|\s]+/, "");
    if (desc.length > 5 && !cos[`CO${num}`]) {
      cos[`CO${num}`] = desc;
    }
  }

  return cos;
}

function normalizeQuestion(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 100);
}

export const generatePaperFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<GenerateResponse> => {
    const pattern: PatternSlot[] = data.marks === 20 ? PATTERN_20 : PATTERN_30;

    // Fast deterministic extraction of COs from syllabus text
    const regexCOs = extractCOsFromSyllabusText(data.syllabus);

    // Parse question bank locally to have direct access to actual questions
    const bankQuestions = parseQuestionBankQuestions(data.questionBank);

    const slotSpec = pattern
      .map(
        (p) =>
          `Slot Key: "${p.key}" | QNo: ${p.qNo} | SubQ: ${p.subQ} | Marks: ${p.marks} | Bloom: ${p.bloom}${
            p.isOr ? " (OR alternative)" : ""
          }`,
      )
      .join("\n");

    const sys =
      "You are an academic examination paper generator for engineering courses at K.J. Somaiya Institute of Technology. " +
      "Your objective is to generate 3 complete, 100% distinct and unique exam question paper sets named 'Set A', 'Set B', and 'Set C', fetching questions EXCLUSIVELY from the provided QUESTION BANK.\n\n" +
      "MANDATORY RULES:\n" +
      "1. STRICT UNIQUE QUESTIONS ACROSS ALL SETS: Every question selected across ALL 3 sets (Set A, Set B, Set C) MUST BE COMPLETELY UNIQUE. NO duplicate questions across sets are allowed. Distribute different, non-overlapping questions from the question bank to Set A, Set B, and Set C.\n" +
      "2. STRICT QUESTION BANK SOURCING: You MUST fetch and select questions ONLY from the provided QUESTION BANK CONTENT. Do NOT invent questions if they exist in the question bank.\n" +
      "3. Every set (Set A, Set B, Set C) MUST contain exactly one question for EVERY slot key specified in the pattern.\n" +
      "4. Match Bloom's Taxonomy strictly: 'Remember', 'Understand', or 'Apply'.\n" +
      "5. Tag each question with its appropriate `co` (e.g., Q1 -> CO1, Q2 -> CO2, Q3 -> CO3, or as indicated in the question bank).\n" +
      "6. CRITICAL COURSE OUTCOMES (COs) EXTRACTION: In the syllabus, locate the 'Course Outcomes:' section and extract all numbered statements (1. to 6.) verbatim as CO1, CO2, CO3, CO4, CO5, CO6.";

    const prompt = `Course Name: ${data.courseName}
Course Code: ${data.courseCode}
Total Marks: ${data.marks}

REQUIRED PATTERN SLOTS PER SET:
${slotSpec}

QUESTION BANK CONTENT (FETCH QUESTIONS EXCLUSIVELY FROM HERE, ENSURING NO OVERLAPPING QUESTIONS ACROSS SET A, SET B, SET C):
${data.questionBank.slice(0, 50000)}

SYLLABUS CONTENT (EXTRACT ALL 6 COURSE OUTCOMES FROM HERE):
${data.syllabus.slice(0, 18000)}

TASK:
1. Extract all 6 Course Outcomes (CO1, CO2, CO3, CO4, CO5, CO6) verbatim from the Course Outcomes section in the SYLLABUS.
2. Generate 3 COMPLETELY UNIQUE sets named "Set A", "Set B", and "Set C".
3. STRICT REQUIREMENT: Ensure Set A, Set B, and Set C have ZERO overlapping or repeated questions. Every single question in each set must be unique and different from questions in other sets.
4. Fill every pattern slot in all 3 sets using the EXACT slot keys (e.g., "${pattern[0].key}").`;

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
                  setName: { type: "STRING" },
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
                required: ["setName", "questions"],
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
    let rawParsed: any = {};
    try {
      rawParsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      rawParsed = match ? JSON.parse(match[0]) : {};
    }

    // Extract raw sets from various possible returned structures
    let rawSets = rawParsed.sets ?? rawParsed.Sets ?? (Array.isArray(rawParsed) ? rawParsed : null);
    if (!rawSets && typeof rawParsed === "object") {
      const potential = Object.keys(rawParsed).filter((k) =>
        ["set a", "set b", "set c", "easy", "medium", "hard"].includes(k.toLowerCase()),
      );
      if (potential.length > 0) {
        rawSets = rawParsed;
      }
    }

    // Parse into raw set buckets
    const rawSetBuckets: Array<{ setName: "Set A" | "Set B" | "Set C"; questions: any[] }> = [];

    if (Array.isArray(rawSets)) {
      rawSets.forEach((item: any, idx: number) => {
        const rawName = String(
          item.setName || item.difficulty || ["Set A", "Set B", "Set C"][idx] || "Set A",
        );
        const foundName =
          ["Set A", "Set B", "Set C"].find(
            (d) =>
              d.toLowerCase() === rawName.toLowerCase() ||
              (rawName.toLowerCase().includes("a") && d === "Set A") ||
              (rawName.toLowerCase().includes("b") && d === "Set B") ||
              (rawName.toLowerCase().includes("c") && d === "Set C"),
          ) ||
          (["Set A", "Set B", "Set C"][idx] as "Set A" | "Set B" | "Set C") ||
          "Set A";

        const qList = Array.isArray(item.questions)
          ? item.questions
          : Array.isArray(item)
            ? item
            : [];
        rawSetBuckets.push({ setName: foundName as "Set A" | "Set B" | "Set C", questions: qList });
      });
    } else if (rawSets && typeof rawSets === "object") {
      Object.entries(rawSets).forEach(([k, v]: [string, any], idx: number) => {
        const foundName =
          ["Set A", "Set B", "Set C"].find(
            (d) =>
              d.toLowerCase() === k.toLowerCase() ||
              (k.toLowerCase().includes("a") && d === "Set A") ||
              (k.toLowerCase().includes("b") && d === "Set B") ||
              (k.toLowerCase().includes("c") && d === "Set C"),
          ) ||
          (["Set A", "Set B", "Set C"][idx] as "Set A" | "Set B" | "Set C") ||
          "Set A";
        const qList = Array.isArray(v) ? v : Array.isArray(v?.questions) ? v.questions : [];
        rawSetBuckets.push({ setName: foundName as "Set A" | "Set B" | "Set C", questions: qList });
      });
    }

    // STRICT GLOBAL CROSS-SET DEDUPLICATION ENGINE
    // We track all questions used across ALL sets to guarantee 100% uniqueness
    const usedGlobalQuestionTexts = new Set<string>();
    const usedBankQuestionIndices = new Set<number>();

    const targetSetNames: Array<"Set A" | "Set B" | "Set C"> = ["Set A", "Set B", "Set C"];
    const finalSets: GeneratedSet[] = targetSetNames.map((targetName, setIndex) => {
      // Find matching bucket or fallback to index
      const foundBucket =
        rawSetBuckets.find((b) => b.setName === targetName) || rawSetBuckets[setIndex];
      const incomingQuestions = foundBucket ? [...foundBucket.questions] : [];
      const setUsedIndices = new Set<number>();

      // Align incoming questions to the strict pattern slots with uniqueness enforcement
      const alignedQuestions: GeneratedQuestion[] = pattern.map((slot, sIdx) => {
        const defaultCo =
          slot.qNo === "Q1" ? "CO1" : slot.qNo === "Q2" ? "CO2" : slot.qNo === "Q3" ? "CO3" : "CO1";

        let selectedText = "";
        let selectedBloom = slot.bloom;
        let selectedCo = defaultCo;
        let selectedModule = `Module ${defaultCo.replace("CO", "")}`;
        let selectedNeedsDiagram = false;

        // 1. Try to find a valid, UNUSED question from incoming AI responses
        for (let i = 0; i < incomingQuestions.length; i++) {
          if (setUsedIndices.has(i)) continue;
          const q = incomingQuestions[i];
          if (!q || !q.text || q.text.startsWith("[")) continue;

          const norm = normalizeQuestion(q.text);
          if (usedGlobalQuestionTexts.has(norm)) continue; // Must be globally unique across sets!

          const isSlotMatch =
            cleanKey(q.key) === cleanKey(slot.key) ||
            (cleanKey(q.key).endsWith(cleanKey(slot.subQ)) &&
              cleanKey(q.key).includes(cleanKey(slot.qNo).replace(/q/, ""))) ||
            i === sIdx;

          if (isSlotMatch || incomingQuestions.length <= pattern.length) {
            setUsedIndices.add(i);
            selectedText = String(q.text || "").trim();
            const bloomNorm =
              (["Remember", "Understand", "Apply"].find(
                (b) => b.toLowerCase() === String(q.bloom || "").toLowerCase(),
              ) as "Remember" | "Understand" | "Apply") || slot.bloom;
            selectedBloom = bloomNorm;
            const rawCoStr = String(q.co || "").toUpperCase();
            selectedCo = rawCoStr.match(/^CO[1-6]$/) ? rawCoStr : defaultCo;
            selectedModule = String(q.module || `Module ${selectedCo.replace("CO", "")}`);
            selectedNeedsDiagram = Boolean(q.needsDiagram);
            break;
          }
        }

        // 2. If no unique match found from AI response, draw an unused question from Question Bank
        if (!selectedText) {
          // Look for an unused bank question matching Bloom & not globally used
          let bankMatchIdx = bankQuestions.findIndex(
            (bq, i) =>
              !usedBankQuestionIndices.has(i) &&
              !usedGlobalQuestionTexts.has(normalizeQuestion(bq.text)) &&
              bq.bloom === slot.bloom,
          );
          if (bankMatchIdx === -1) {
            // Any unused bank question
            bankMatchIdx = bankQuestions.findIndex(
              (bq, i) =>
                !usedBankQuestionIndices.has(i) &&
                !usedGlobalQuestionTexts.has(normalizeQuestion(bq.text)),
            );
          }

          if (bankMatchIdx !== -1 && bankQuestions[bankMatchIdx]) {
            usedBankQuestionIndices.add(bankMatchIdx);
            const bq = bankQuestions[bankMatchIdx];
            selectedText = bq.text.trim();
            selectedCo = bq.co && bq.co.match(/^CO[1-6]$/) ? bq.co : defaultCo;
            selectedBloom = slot.bloom;
            selectedModule = bq.module || `Module ${selectedCo.replace("CO", "")}`;
          }
        }

        // 3. Fallback: If bank is exhausted, create a distinct academic question variation per set
        if (!selectedText) {
          const variations: Record<"Set A" | "Set B" | "Set C", Record<string, string>> = {
            "Set A": {
              Remember: `State the fundamental definitions and list the core architectural components of ${data.courseName}.`,
              Understand: `Explain the operational workflow and discuss the key principles involved in ${data.courseName}.`,
              Apply: `Demonstrate the application of core algorithms in ${data.courseName} to solve the specified scenario.`,
            },
            "Set B": {
              Remember: `Define the primary terminology and state the governing properties of ${data.courseName}.`,
              Understand: `Compare and contrast alternative methodological approaches used throughout ${data.courseName}.`,
              Apply: `Calculate and solve the implementation requirements for ${data.courseName} under given constraints.`,
            },
            "Set C": {
              Remember: `Identify the essential prerequisites and state the standard specifications in ${data.courseName}.`,
              Understand: `Illustrate with suitable diagrams the execution mechanism utilized in ${data.courseName}.`,
              Apply: `Formulate an optimized solution model using ${data.courseName} principles for real-world deployment.`,
            },
          };

          const setVar = variations[targetName] || variations["Set A"];
          selectedText =
            setVar[slot.bloom] ||
            `Explain key concepts of ${data.courseName} with relevant examples.`;
          selectedCo = defaultCo;
          selectedBloom = slot.bloom;
          selectedModule = `Module ${defaultCo.replace("CO", "")}`;
        }

        // Register in global tracker to guarantee 100% uniqueness across Set A, Set B, and Set C
        usedGlobalQuestionTexts.add(normalizeQuestion(selectedText));

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
        setName: targetName,
        difficulty: targetName,
        questions: alignedQuestions,
      };
    });

    const aiCOs: Record<string, string> =
      rawParsed.courseOutcomes || rawParsed.CourseOutcomes || {};
    // Priority: Regex extracted from syllabus text > AI extracted from syllabus > empty
    const mergedCOs: Record<string, string> = {
      ...aiCOs,
      ...regexCOs,
    };

    return {
      sets: finalSets,
      courseOutcomes: mergedCOs,
    };
  });
