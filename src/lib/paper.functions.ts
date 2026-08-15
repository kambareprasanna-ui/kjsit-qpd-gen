import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PATTERN_20, PATTERN_30, type PatternSlot } from "./paper-pattern";
import { allowedVerbs, forbiddenVerbs, usesAllowedVerb } from "./bloom-verbs";

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

export type CourseOutcomes = Record<string, string>; // { CO1: "desc", ... }

export type GenerateResponse = { sets: GeneratedSet[]; courseOutcomes?: CourseOutcomes };

export const generatePaperFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<GenerateResponse> => {
    // Only signed-in designers may spend AI credits generating papers.
    const { data: allowed } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "designer",
    });
    if (!allowed) throw new Error("Only designers can generate question papers.");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const pattern: PatternSlot[] = data.marks === 20 ? PATTERN_20 : PATTERN_30;

    const slotSpec = pattern
      .map(
        (p) =>
          `${p.key} — ${p.marks} marks, Bloom: ${p.bloom}${p.isOr ? " (OR alternative to previous)" : ""}`,
      )
      .join("\n");

    const sys =
      "You are an academic question paper generator for K.J. Somaiya Institute of Technology. " +
      "CRITICAL RULE: Every question you output MUST come from the provided QUESTION BANK (verbatim or with only minor rephrasing). " +
      "Do NOT invent new questions. If a bank question doesn't exist for a required Bloom level, pick the closest one and lightly adjust the verb (e.g. 'Define' -> 'Explain'). " +
      "Distribute questions across syllabus modules according to the module weightage inferred from hours in the syllabus. " +
      "Use Bloom's Taxonomy strictly limited to Remember, Understand, Apply. " +
      "Mark needsDiagram=true only if the question explicitly requires drawing a diagram, circuit, graph, flowchart, or figure.";

    const user = `Course: ${data.courseName} (${data.courseCode})
Total marks: ${data.marks}

PATTERN SLOTS to fill (every set must fill every slot):
${slotSpec}

SYLLABUS (infer modules and per-module weightage from hours/lectures):
${data.syllabus.slice(0, 14000)}

QUESTION BANK (use ONLY these questions — this is the ONLY source):
${data.questionBank.slice(0, 22000)}

Produce THREE distinct sets: "Easy", "Medium", "Hard". Each set fills every pattern slot with a question sourced from the QUESTION BANK. Tag each question with a CO code (CO1..CO6) inferred from the module.

Also extract the Course Outcomes (COs) verbatim from the syllabus text. Return them as a map from CO code to its full statement. Include ALL COs found in the syllabus (typically CO1..CO6).

Return ONLY a JSON object of this exact shape (no markdown, no commentary):
{
  "sets": [
    {
      "difficulty": "Easy",
      "questions": [
        {"key":"Q1a)","text":"...","marks":4,"bloom":"Remember","co":"CO1","module":"Module 1","needsDiagram":false}
      ]
    },
    { "difficulty": "Medium", "questions": [ ... ] },
    { "difficulty": "Hard",   "questions": [ ... ] }
  ],
  "courseOutcomes": {
    "CO1": "Statement of course outcome 1 from the syllabus…",
    "CO2": "…",
    "CO3": "…",
    "CO4": "…",
    "CO5": "…",
    "CO6": "…"
  }
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("AI rate limit reached. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please top up your workspace.");
      throw new Error(`AI error ${res.status}: ${txt.slice(0, 400)}`);
    }

    const json: any = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: GenerateResponse;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { sets: [] };
    }

    // Guardrails: ensure 3 sets, each has all pattern keys
    if (!parsed.sets || parsed.sets.length === 0) {
      throw new Error("AI returned no sets. Try uploading a richer question bank.");
    }
    for (const set of parsed.sets) {
      for (const slot of pattern) {
        if (!set.questions.find((q) => q.key === slot.key)) {
          set.questions.push({
            key: slot.key,
            text: "[Question missing from AI output — please regenerate]",
            marks: slot.marks,
            bloom: slot.bloom,
            co: "CO1",
            module: "Module 1",
            needsDiagram: false,
          });
        }
      }
      // sort in pattern order
      const order = new Map(pattern.map((p, i) => [p.key, i]));
      set.questions.sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99));
    }
    return parsed;
  });

const ReframeInput = z.object({
  text: z.string().min(3),
  bloom: z.enum(["Remember", "Understand", "Apply"]),
  marks: z.number(),
  courseName: z.string().optional(),
});

export const reframeQuestionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReframeInput.parse(d))
  .handler(async ({ data, context }): Promise<{ text: string }> => {
    const { data: allowed } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "designer",
    });
    if (!allowed) throw new Error("Only faculty can reframe questions.");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const allowedList = allowedVerbs(data.bloom);
    const forbidden = forbiddenVerbs(data.bloom);

    const sys =
      "You rephrase university exam questions. Keep the SAME underlying concept, topic and scope as the original question. " +
      "Only twist the wording/framing. " +
      "HARD RULE: the reframed question MUST begin with an action verb taken VERBATIM from the ALLOWED verb list for the given Bloom level. " +
      "NEVER use a verb from any other Bloom level (e.g. do not turn 'compare' (Understanding) into 'distinguish' (Analyzing)). " +
      "Do not change the marks weight or add new topics. Return ONLY JSON.";

    const buildUser = (note?: string) => `Original question: ${data.text}
Bloom level: ${data.bloom}
ALLOWED verbs (use exactly one of these, as the leading verb): ${allowed.join(", ")}
FORBIDDEN verbs (belong to other Bloom levels — never use): ${forbidden.join(", ")}
Marks: ${data.marks}${data.courseName ? `\nCourse: ${data.courseName}` : ""}${note ? `\n\n${note}` : ""}

Return exactly: {"text":"<reframed question>"}`;

    const callAi = async (note?: string): Promise<string> => {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "openai/gpt-5.5",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: buildUser(note) },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 429) throw new Error("AI rate limit reached. Please try again shortly.");
        if (res.status === 402) throw new Error("AI credits exhausted. Please top up your workspace.");
        throw new Error(`AI error ${res.status}: ${txt.slice(0, 300)}`);
      }

      const json: any = await res.json();
      const content: string = json.choices?.[0]?.message?.content ?? "{}";
      let out: { text?: string };
      try {
        out = JSON.parse(content);
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        out = m ? JSON.parse(m[0]) : {};
      }
      if (!out.text) throw new Error("AI did not return a reframed question.");
      return out.text;
    };

    let text = await callAi();
    if (!usesAllowedVerb(text, data.bloom)) {
      // One strict retry before giving up.
      text = await callAi(
        `Your previous attempt "${text}" used a verb outside the ${data.bloom} level. Rewrite it so it STARTS with one of the ALLOWED verbs listed above.`,
      );
      if (!usesAllowedVerb(text, data.bloom)) {
        throw new Error(
          `Could not reframe within the "${data.bloom}" Bloom level verbs. Please try again.`,
        );
      }
    }
    return { text };
  });

