import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
  difficulty: "Easy" | "Medium" | "Hard";
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
      "Your objective is to generate 3 complete, distinct exam question paper sets: 'Easy', 'Medium', and 'Hard', fetching questions EXCLUSIVELY from the provided QUESTION BANK.\n\n" +
      "MANDATORY SOURCING RULES:\n" +
      "1. STRICT: You MUST fetch and select questions ONLY from the provided QUESTION BANK CONTENT. Do NOT invent, synthesize, or fabricate questions outside the question bank.\n" +
      "2. Every set MUST contain exactly one question for EVERY slot key specified in the pattern.\n" +
      "3. NEVER output empty strings, placeholder texts like '[Question missing]', or omitted questions.\n" +
      "4. Match Bloom's Taxonomy strictly: 'Remember', 'Understand', or 'Apply'.\n" +
      "5. Tag each question with its appropriate `co` (e.g., Q1 -> CO1, Q2 -> CO2, Q3 -> CO3, or as indicated in the question bank).\n" +
      "6. CRITICAL COURSE OUTCOMES (COs) EXTRACTION: In the syllabus, locate the 'Course Outcomes:' section (typically after 'After successful completion of the course students will be able to:') and extract all numbered statements (1. to 6.) verbatim as CO1, CO2, CO3, CO4, CO5, CO6.";

    const prompt = `Course Name: ${data.courseName}
Course Code: ${data.courseCode}
Total Marks: ${data.marks}

REQUIRED PATTERN SLOTS PER SET:
${slotSpec}

QUESTION BANK CONTENT (FETCH QUESTIONS EXCLUSIVELY FROM HERE):
${data.questionBank.slice(0, 50000)}

SYLLABUS CONTENT (EXTRACT ALL 6 COURSE OUTCOMES FROM HERE):
${data.syllabus.slice(0, 18000)}

TASK:
1. Extract all 6 Course Outcomes (CO1, CO2, CO3, CO4, CO5, CO6) directly and verbatim from the Course Outcomes table/section in the SYLLABUS text.
2. Fetch and assign actual questions ONLY from the QUESTION BANK CONTENT above to fill every pattern slot in the 3 sets: "Easy", "Medium", "Hard".
For EVERY set, assign a question from the question bank for each required slot using the EXACT slot key (e.g., "${pattern[0].key}").
Do not leave any slot blank.`;

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
        ["easy", "medium", "hard"].includes(k.toLowerCase()),
      );
      if (potential.length > 0) {
        rawSets = rawParsed;
      }
    }

    // Parse into raw set buckets
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
    } else if (rawSets && typeof rawSets === "object") {
      Object.entries(rawSets).forEach(([k, v]: [string, any]) => {
        const foundDiff = ["Easy", "Medium", "Hard"].find(
          (d) => d.toLowerCase() === k.toLowerCase(),
        );
        const diff = (foundDiff as "Easy" | "Medium" | "Hard") ?? "Easy";
        const qList = Array.isArray(v) ? v : Array.isArray(v?.questions) ? v.questions : [];
        rawSetBuckets.push({ difficulty: diff, questions: qList });
      });
    }

    // Track used question bank items to avoid duplicate questions across sets if possible
    const usedBankQuestionIndices = new Set<number>();

    // Ensure all 3 difficulties exist
    const diffList: Array<"Easy" | "Medium" | "Hard"> = ["Easy", "Medium", "Hard"];
    const finalSets: GeneratedSet[] = diffList.map((diff) => {
      const foundBucket = rawSetBuckets.find((b) => b.difficulty === diff);
      const incomingQuestions = foundBucket ? [...foundBucket.questions] : [];
      const usedIndices = new Set<number>();

      // Align incoming questions to the strict pattern slots
      const alignedQuestions: GeneratedQuestion[] = pattern.map((slot, sIdx) => {
        // Standard default CO based on question slot: Q1 -> CO1, Q2 -> CO2, Q3 -> CO3
        const defaultCo =
          slot.qNo === "Q1" ? "CO1" : slot.qNo === "Q2" ? "CO2" : slot.qNo === "Q3" ? "CO3" : "CO1";

        // 1. Exact clean key match (e.g. "q1a" === "q1a")
        let matchedIdx = incomingQuestions.findIndex(
          (q, i) =>
            !usedIndices.has(i) &&
            q &&
            cleanKey(q.key) === cleanKey(slot.key) &&
            q.text &&
            !q.text.startsWith("["),
        );

        // 2. Sub-question & Question number match (e.g. key ends with "a" and has "1")
        if (matchedIdx === -1) {
          matchedIdx = incomingQuestions.findIndex(
            (q, i) =>
              !usedIndices.has(i) &&
              q &&
              cleanKey(q.key).endsWith(cleanKey(slot.subQ)) &&
              cleanKey(q.key).includes(cleanKey(slot.qNo).replace(/q/, "")) &&
              q.text &&
              !q.text.startsWith("["),
          );
        }

        // 3. Fallback: match by index if valid
        if (
          matchedIdx === -1 &&
          incomingQuestions[sIdx] &&
          !usedIndices.has(sIdx) &&
          incomingQuestions[sIdx].text &&
          !incomingQuestions[sIdx].text.startsWith("[")
        ) {
          matchedIdx = sIdx;
        }

        // 4. Fallback: take next available unused question from incoming response
        if (matchedIdx === -1) {
          matchedIdx = incomingQuestions.findIndex(
            (q, i) => !usedIndices.has(i) && q && q.text && !q.text.startsWith("["),
          );
        }

        if (matchedIdx !== -1) {
          usedIndices.add(matchedIdx);
          const rawQ = incomingQuestions[matchedIdx];
          const bloomNorm =
            (["Remember", "Understand", "Apply"].find(
              (b) => b.toLowerCase() === String(rawQ.bloom || "").toLowerCase(),
            ) as "Remember" | "Understand" | "Apply") || slot.bloom;

          const rawCoStr = String(rawQ.co || "").toUpperCase();
          const validCo = rawCoStr.match(/^CO[1-6]$/) ? rawCoStr : defaultCo;

          return {
            key: slot.key,
            text: String(rawQ.text || rawQ.question || "").trim(),
            marks: slot.marks,
            bloom: bloomNorm,
            co: validCo,
            module: String(rawQ.module || `Module ${validCo.replace("CO", "")}`),
            needsDiagram: Boolean(rawQ.needsDiagram),
          };
        }

        // 5. If missing, draw directly from parsed question bank pool
        let bankMatchIdx = bankQuestions.findIndex(
          (bq, i) => !usedBankQuestionIndices.has(i) && bq.bloom === slot.bloom,
        );
        if (bankMatchIdx === -1) {
          bankMatchIdx = bankQuestions.findIndex((_, i) => !usedBankQuestionIndices.has(i));
        }
        if (bankMatchIdx === -1 && bankQuestions.length > 0) {
          // Wrap around if all used
          bankMatchIdx = sIdx % bankQuestions.length;
        }

        if (bankMatchIdx !== -1 && bankQuestions[bankMatchIdx]) {
          usedBankQuestionIndices.add(bankMatchIdx);
          const bq = bankQuestions[bankMatchIdx];
          const coVal = bq.co && bq.co.match(/^CO[1-6]$/) ? bq.co : defaultCo;
          return {
            key: slot.key,
            text: bq.text,
            marks: slot.marks,
            bloom: slot.bloom,
            co: coVal,
            module: bq.module || `Module ${coVal.replace("CO", "")}`,
            needsDiagram: false,
          };
        }

        // 6. Last resort if question bank text was empty
        const sampleText =
          slot.bloom === "Remember"
            ? `Define and state the key principles and concepts of ${data.courseName}.`
            : slot.bloom === "Understand"
              ? `Explain and differentiate the fundamental techniques used in ${data.courseName}.`
              : `Apply theoretical concepts of ${data.courseName} to solve the given engineering problem.`;

        return {
          key: slot.key,
          text: sampleText,
          marks: slot.marks,
          bloom: slot.bloom,
          co: defaultCo,
          module: `Module ${defaultCo.replace("CO", "")}`,
          needsDiagram: false,
        };
      });

      return {
        difficulty: diff,
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
