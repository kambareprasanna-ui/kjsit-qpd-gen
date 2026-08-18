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
      Remember: [
        "choose","define","find","how","label","list","match","name","omit",
        "recall","relate","select","show","spell","tell","what","when","where",
        "which","who","why",
      ],
      Understand: [
        "classify","compare","contrast","demonstrate","explain","extend",
        "illustrate","infer","interpret","outline","relate","rephrase","show",
        "summarize","translate",
      ],
      Apply: [
        "apply","build","choose","construct","develop","experiment with",
        "identify","interview","make use of","model","organize","plan","select",
        "solve","utilize",
      ],
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

    const clean = (s: string) => s.toLowerCase().replace(/^[^a-z]+/, "");
    const matchedAllowed = (s: string) =>
      allowed.find((v) => clean(s).startsWith(v.toLowerCase()));

    // Verbs that belong to any OTHER Bloom level (and not to this one) are forbidden anywhere.
    const foreignVerbs = Object.entries(VERBS)
      .filter(([k]) => k !== levelKey)
      .flatMap(([, v]) => v)
      .filter((v) => !allowed.some((a) => a.toLowerCase() === v.toLowerCase()));

    const foreignVerbUsed = (s: string) =>
      foreignVerbs.find((v) =>
        new RegExp(`(^|[^a-z])${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(s|es|ed|ing)?([^a-z]|$)`, "i").test(s),
      );

    let out = await callAI();
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!out) break;
      const bad = !matchedAllowed(out) || foreignVerbUsed(out);
      if (!bad) break;
      const foreign = foreignVerbUsed(out);
      out = await callAI(
        ` Your previous attempt was rejected${foreign ? ` because it used the verb "${foreign}", which belongs to a different Bloom level` : " because it did not begin with an allowed verb"}.` +
          ` The sentence MUST begin with exactly one verb from this ${levelKey} list and MUST NOT contain any action verb from another Bloom level: ${allowed.join(", ")}.`,
      );
    }

    if (!out) throw new Error("AI returned an empty reframed question.");

    // Deterministic safety net: force an allowed leading verb if the model still drifted.
    if (!matchedAllowed(out)) {
      const firstWord = clean(out).split(/\s+/)[0] ?? "";
      const rest = clean(out).slice(firstWord.length).trim();
      const verb = allowed[0]!;
      out = `${verb.charAt(0).toUpperCase()}${verb.slice(1)} ${rest || clean(out)}`.trim();
    } else {
      out = out.charAt(0).toUpperCase() + out.slice(1);
    }

    return { text: out };
  });

