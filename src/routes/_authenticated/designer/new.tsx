import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { extractText } from "@/lib/parse-file";
import { generatePaperFn } from "@/lib/paper.functions";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/designer/new")({
  head: () => ({
    meta: [
      { title: "New Question Paper — Somaiya Portal" },
      { name: "description", content: "Generate three question paper sets from a syllabus and question bank." },
    ],
  }),
  component: () => (
    <RoleGuard role="designer">
      <NewPaper />
    </RoleGuard>
  ),
});

function NewPaper() {
  const navigate = useNavigate();
  const generate = useServerFn(generatePaperFn);
  const currentUser = useUser();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    courseName: "",
    courseCode: "",
    className: "SY",
    academicYear: "2025-26",
    semester: "III",
    marks: 20 as 20 | 30,
    testNumber: 1 as 1 | 2,
  });
  const [syllabus, setSyllabus] = useState<File | null>(null);
  const [qb, setQb] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const detectCOs = (text: string): string[] => {
    const found = new Set<string>();
    const add = (n: string) => found.add(`CO${n}`);
    // "CO1", "CO 1", "C.O.1", "CO-1" anywhere
    for (const m of text.matchAll(/\bC\.?\s?O\.?\s?-?\s?([1-6])\b/gi)) add(m[1]);
    // "Course Outcome 1" / "Outcome 1"
    for (const m of text.matchAll(/\b(?:course\s+)?outcome\s*[-:.]?\s*([1-6])\b/gi)) add(m[1]);
    // Numbered list inside a "Course Outcomes" section
    const secIdx = text.search(/course\s+outcome/i);
    if (secIdx >= 0 && found.size < 3) {
      const section = text.slice(secIdx, secIdx + 2500);
      for (const m of section.matchAll(/(?:^|\n|\s)([1-6])\s*[).:]\s*[A-Za-z]/g)) add(m[1]);
    }
    return Array.from(found).sort();
  };

  const runGenerate = async (syllText: string, qbText: string) => {
    setProgress("Generating 3 question paper sets with AI…");
    const result = await generate({
      data: {
        syllabus: syllText,
        questionBank: qbText,
        marks: form.marks,
        courseName: form.courseName,
        courseCode: form.courseCode,
      },
    });
    setProgress("Saving paper…");
    const user = currentUser;
    const returnedCOs = result.courseOutcomes ?? {};
    const requiredCOs = form.testNumber === 1 ? ["CO1", "CO2", "CO3"] : ["CO4", "CO5", "CO6"];
    const missingAfter = requiredCOs.filter((c) => !returnedCOs[c]?.trim());
    if (missingAfter.length > 0) {
      const proceed = confirm(
        `The AI extracted only ${Object.keys(returnedCOs).length} COs from the syllabus, missing ${missingAfter.join(", ")} needed for Test ${form.testNumber}. Save the paper anyway? (You can edit the syllabus and regenerate later.)`,
      );
      if (!proceed) throw new Error("Generation cancelled — please upload a syllabus that lists all COs.");
    }
    const { data, error: dbErr } = await supabase
      .from("papers")
      .insert({
        status: "draft",
        meta: { ...form, courseOutcomes: returnedCOs },
        sets: result.sets,
        created_by_role: "designer",
        created_by_email: user?.email ?? null,
      })
      .select()
      .single();
    if (dbErr) throw dbErr;
    navigate({ to: "/designer/paper/$id", params: { id: data.id } });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!syllabus || !qb) {
      setError("Please upload both syllabus and question bank files.");
      return;
    }
    if (!form.courseName || !form.courseCode) {
      setError("Course name and code are required.");
      return;
    }
    setLoading(true);
    try {
      setProgress("Extracting syllabus text…");
      const syllText = await extractText(syllabus);
      setProgress("Extracting question bank text…");
      const qbText = await extractText(qb);
      if (!qbText.trim()) throw new Error("Could not read the question bank file. Please upload a text-searchable PDF/DOCX/TXT.");

      // Pre-flight CO validation
      const detected = detectCOs(syllText);
      const required = form.testNumber === 1 ? ["CO1", "CO2", "CO3"] : ["CO4", "CO5", "CO6"];
      const missing = required.filter((c) => !detected.includes(c));
      if (detected.length < 3) {
        throw new Error(
          `Syllabus validation failed: only ${detected.length} Course Outcome${detected.length === 1 ? "" : "s"} detected (${detected.join(", ") || "none"}). A valid syllabus must list at least CO1–CO3 (Test 1) or CO4–CO6 (Test 2) with statements. Please re-upload a syllabus containing the CO section, then try again.`,
        );
      }
      if (missing.length > 0) {
        const proceed = confirm(
          `Only detected ${detected.join(", ")} in the syllabus.\nTest ${form.testNumber} needs ${required.join(", ")} — missing: ${missing.join(", ")}.\n\nContinue generating anyway? The AI may still recover them, but the CO footer will be incomplete if it can't.`,
        );
        if (!proceed) {
          setLoading(false);
          setProgress("");
          return;
        }
      }

      await runGenerate(syllText, qbText);
    } catch (err: any) {
      setError(err?.message || String(err));
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-1">Generate New Question Paper</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Upload syllabus + question bank. AI will draft 3 sets (Easy / Medium / Hard) using only bank questions.
        </p>
        <form onSubmit={submit} className="space-y-5 bg-card border border-border rounded-lg p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={input} />
            </Field>
            <Field label="Marks">
              <select value={form.marks} onChange={(e) => {
                const m = Number(e.target.value) as 20 | 30;
                setForm({ ...form, marks: m, testNumber: m === 20 ? 1 : 2 });
              }} className={input}>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
            </Field>
            <Field label="Test">
              <select value={form.testNumber} onChange={(e) => setForm({ ...form, testNumber: Number(e.target.value) as 1 | 2 })} className={input}>
                <option value={1}>Test 1 (CO1–CO3)</option>
                <option value={2}>Test 2 (CO4–CO6)</option>
              </select>
            </Field>
            <Field label="Course Name">
              <input value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} className={input} placeholder="Operating Systems" />
            </Field>
            <Field label="Course Code">
              <input value={form.courseCode} onChange={(e) => setForm({ ...form, courseCode: e.target.value })} className={input} placeholder="AI301" />
            </Field>
            <Field label="Class / Year">
              <select value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} className={input}>
                <option>FY</option><option>SY</option><option>TY</option><option>LY</option>
              </select>
            </Field>
            <Field label="Semester">
              <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className={input}>
                {["I","II","III","IV","V","VI","VII","VIII"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Academic Year">
              <input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} className={input} placeholder="2025-26" />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileField label="Syllabus PDF" file={syllabus} onChange={setSyllabus} accept=".pdf,.docx,.txt" />
            <FileField label="Question Bank (PDF/DOCX/TXT)" file={qb} onChange={setQb} accept=".pdf,.docx,.txt" />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}
          {loading && (
            <div className="p-3 rounded-md bg-brand-muted text-brand text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {progress}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand text-brand-foreground rounded-md font-medium hover:bg-brand/90 transition disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate 3 Sets"}
          </button>
        </form>
      </div>
    </div>
  );
}

const input = "w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function FileField({ label, file, onChange, accept }: { label: string; file: File | null; onChange: (f: File | null) => void; accept: string }) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer hover:border-brand transition text-sm">
        <Upload className="w-4 h-4" />
        <span className="truncate">{file ? file.name : "Choose file"}</span>
        <input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] || null)} className="hidden" />
      </label>
    </div>
  );
}
