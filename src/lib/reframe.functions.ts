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
      Remember: ["choose","define","find","label","list","match","name","omit","recall","relate","select","show","spell","tell","state","identify"],
      Understand: ["classify","compare","contrast","demonstrate","explain","extend","illustrate","infer","interpret","outline","rephrase","show","summarize","translate","describe"],
      Apply: ["apply","build","choose","construct","develop","experiment with","identify","interview","make use of","model","organize","plan","select","solve","utilize","compute","calculate"],
      Analyze: ["analyze","categorize","classify","compare","contrast","discover","dissect","distinguish","divide","examine","inspect","simplify","survey","test for"],
      Evaluate: ["appraise","assess","conclude","criticize","decide","defend","determine","disprove","estimate","evaluate","judge","justify","measure","prioritize","prove","rate","recommend","support"],
      Create: ["adapt","build","change","combine","compile","compose","construct","create","design","develop","elaborate","formulate","improve","invent","modify","originate","plan","propose","predict"],
    };
    const bloomRaw = data.bloom.trim().toLowerCase();
    const levelKey =
      Object.keys(VERBS).find((k) => bloomRaw === k.toLowerCase()) ??
      Object.keys(VERBS).find((k) => bloomRaw.includes(k.toLowerCase())) ??
      Object.keys(VERBS).find((k) => k.toLowerCase().startsWith(bloomRaw.slice(0, 4))) ??
      "Understand";
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
                `It MUST start with exactly one action verb from this list for that level: ${allowed.join(", ")}. ` +
                "Never use a verb belonging to any other Bloom level. Do not add new sub-parts. " +
                "Return ONLY the reframed question sentence, no quotes, no commentary." +
                extra,
            },
            {
              role: "user",
              content: `Course: ${data.courseName ?? "-"}\nBloom level: ${levelKey}\nMarks: ${data.marks}\n\nQuestion: ${data.text}\n\nReframe it starting with a ${levelKey}-level action verb from the allowed list.`,
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

    let out = await callAI();
    if (out && !startsWithAllowed(out)) {
      out = await callAI(
        ` Your previous attempt did not begin with an allowed ${levelKey} verb. Begin the sentence with one of: ${allowed.join(", ")}.`,
      );
    }
    if (!out) throw new Error("AI returned an empty reframed question.");
    return { text: out };
  });

