import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ReframeInput = z.object({
  text: z.string().min(3),
  bloom: z.string(),
  marks: z.number(),
  courseName: z.string().optional(),
});

export const reframeQuestionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReframeInput.parse(d))
  .handler(async ({ data, context }): Promise<{ text: string }> => {
    const { data: isFaculty } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "designer",
    });
    if (!isFaculty) throw new Error("Only faculty can reframe questions.");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const VERBS: Record<string, string[]> = {
      Remember: ["Choose","Define","Find","How","Label","List","Match","Name","Omit","Recall","Relate","Select","Show","Spell","Tell","What","When","Where","Which","Who","Why"],
      Understand: ["Classify","Compare","Contrast","Demonstrate","Explain","Extend","Illustrate","Infer","Interpret","Outline","Relate","Rephrase","Show","Summarize","Translate"],
      Apply: ["Apply","Build","Choose","Construct","Develop","Experiment with","Identify","Interview","Make use of","Model","Organize","Plan","Select","Solve","Utilize"],
      Analyze: ["Analyze","Assume","Categorize","Classify","Compare","Conclusion","Contrast","Discover","Dissect","Distinguish","Divide","Examine","Function","Inference","Inspect","List","Motive","Relationships","Simplify","Survey","Take part in","Test for","Theme"],
      Evaluate: ["Agree","Appraise","Assess","Award","Choose","Compare","Conclude","Criteria","Criticize","Decide","Deduct","Defend","Determine","Disprove","Estimate","Evaluate","Explain","Importance","Influence","Interpret","Judge","Justify","Mark","Measure","Opinion","Perceive","Prioritize","Prove","Rate","Recommend","Rule on","Select","Support","Value"],
      Create: ["Adapt","Build","Change","Choose","Combine","Compile","Compose","Construct","Create","Delete","Design","Develop","Discuss","Elaborate","Estimate","Formulate","Happen","Imagine","Improve","Invent","Make up","Maximize","Minimize","Modify","Original","Originate","Plan","Predict","Propose","Solution","Solve","Suppose","Test","Theory"],
    };
    const levelKey =
      Object.keys(VERBS).find((k) => data.bloom.toLowerCase().startsWith(k.toLowerCase().slice(0, 5))) ?? "Understand";
    const allowed = VERBS[levelKey]!;

    const callAI = async (extra = "") => {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "openai/gpt-5.5",
          messages: [
            {
              role: "system",
              content:
                "You rephrase university exam questions. Keep the same topic, technical content, difficulty and marks weight. " +
                `The question MUST stay at Bloom's Taxonomy level "${levelKey}" (Revised Bloom's Taxonomy, Anderson & Krathwohl 2001). ` +
                `It MUST start with exactly one action verb from this EXCLUSIVE list for that level: ${allowed.join(", ")}. ` +
                "You may only use action verbs from that same list anywhere in the question. " +
                "Do not use any action verb belonging to any other Bloom level. " +
                "Do not add new sub-parts. Return ONLY the reframed question sentence, no quotes, no commentary." +
                extra,
            },
            {
              role: "user",
              content: `Course: ${data.courseName ?? "-"}\nBloom level: ${levelKey}\nMarks: ${data.marks}\n\nQuestion: ${data.text}\n\nReframe it using only ${levelKey}-level action verbs from the allowed list.`,
            },
          ],
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 429) throw new Error("AI rate limit reached. Please try again shortly.");
        if (res.status === 402) throw new Error("AI credits exhausted. Please top up your workspace.");
        throw new Error(`AI error ${res.status}: ${txt.slice(0, 300)}`);
      }
      const json: any = await res.json();
      return ((json.choices?.[0]?.message?.content ?? "") as string).trim().replace(/^["']|["']$/g, "");
    };

    const startsWithAllowed = (s: string) =>
      allowed.some((v) => s.toLowerCase().replace(/^[^a-z]+/, "").startsWith(v.toLowerCase()));

    const containsOtherLevelVerb = (s: string) => {
      const words = s.toLowerCase().split(/\s+/);
      for (const [level, verbs] of Object.entries(VERBS)) {
        if (level === levelKey) continue;
        for (const v of verbs) {
          const normalized = v.toLowerCase();
          if (normalized.length <= 2) continue;
          if (words.includes(normalized) || s.toLowerCase().includes(` ${normalized}`) || s.toLowerCase().startsWith(normalized)) {
            return true;
          }
        }
      }
      return false;
    };

    let out = await callAI();
    if (out && !startsWithAllowed(out)) {
      out = await callAI(
        ` Your previous attempt did not begin with an allowed ${levelKey} verb. Begin the sentence with exactly one of: ${allowed.join(", ")}.`,
      );
    }
    if (out && containsOtherLevelVerb(out)) {
      out = await callAI(
        ` Your previous attempt used an action verb from a different Bloom level. Rewrite the question using ONLY ${levelKey}-level verbs from this list: ${allowed.join(", ")}. Do not use any other action verb.`,
      );
    }
    if (!out) throw new Error("AI returned an empty reframed question.");
    return { text: out };
  });

