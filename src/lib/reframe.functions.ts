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
    const { data: allowed } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "designer",
    });
    if (!allowed) throw new Error("Only faculty can reframe questions.");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages: [
          {
            role: "system",
            content:
              "You rephrase university exam questions. Keep the same topic, technical content, difficulty, marks weight and Bloom level. " +
              "The reframed question MUST begin with (or clearly use) an action verb that belongs to the SAME Bloom's Taxonomy level as given. " +
              "Allowed verbs per level:\n" +
              "Remember: define, list, state, name, recall, identify, label, recognize, write, mention.\n" +
              "Understand: explain, describe, compare, differentiate, discuss, summarize, interpret, illustrate, classify, distinguish.\n" +
              "Apply: apply, solve, compute, calculate, demonstrate, show, implement, construct, use, design.\n" +
              "Never borrow a verb from another level. Do not add new sub-parts. " +
              "Return ONLY the reframed question sentence, no quotes, no commentary.",
          },
          {
            role: "user",
            content: `Course: ${data.courseName ?? "-"}\nBloom level: ${data.bloom}\nMarks: ${data.marks}\n\nQuestion: ${data.text}\n\nReframe it using a ${data.bloom}-level action verb only.`,
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
    const out: string = (json.choices?.[0]?.message?.content ?? "").trim();
    if (!out) throw new Error("AI returned an empty reframed question.");
    return { text: out.replace(/^["']|["']$/g, "") };
  });
