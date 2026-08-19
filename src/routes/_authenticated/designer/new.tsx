import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (prompt: string, options: { model: string }) => Promise<unknown>;
      };
    };
  }
}

function loadPuter(): Promise<NonNullable<Window["puter"]>> {
  if (window.puter) return Promise.resolve(window.puter);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://js.puter.com/v2/"]');
    const script = existing ?? document.createElement("script");
    const onLoad = () => (window.puter ? resolve(window.puter) : reject(new Error("Puter AI failed to initialize.")));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", () => reject(new Error("Could not load Puter AI.")), { once: true });
    if (!existing) {
      script.src = "https://js.puter.com/v2/";
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

function parsePuterResponse(response: unknown): Record<string, unknown> {
  const collectText = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(collectText).filter(Boolean).join("\n");
    if (value && typeof value === "object") {
      const item = value as Record<string, unknown>;
      const preferred = ["content", "text", "message", "response", "output"]
        .map((key) => collectText(item[key]))
        .filter(Boolean);
      if (preferred.length) return preferred.join("\n");
      return Object.values(item).map(collectText).filter(Boolean).join("\n");
    }
    return "";
  };

  const text = collectText(response).trim();
  const cleaned = text.replace(/```(?:json)?\\s*/gi, "").replace(/\\s*```/g, "").trim();
  const candidates = [cleaned];
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(cleaned.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
      // Try the next extracted candidate.
    }
  }

  throw new Error("Puter returned invalid question-paper JSON. Please try again.");
}
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Upload,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Sparkles,
  BookOpen,
  HelpCircle,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { extractText } from "@/lib/parse-file";
import {
  generatePaperFn,
  extractCOsFromSyllabusText,
  extractModulesWithHoursFromSyllabus,
  parseQuestionBankQuestions,
  computeQBAnalysis,
  type QBAnalysis,
} from "@/lib/paper.functions";
import type { SubjectType, Bloom } from "@/lib/paper-pattern";
import { BLOOM_DETAILS } from "@/lib/paper-pattern";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/designer/new")({
  head: () => ({
    meta: [
      { title: "New Question Paper — Somaiya Portal" },
      {
        name: "description",
        content: "Generate three question paper sets from a syllabus and question bank.",
      },
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
    examName: "Internal Assessment - I",
    date: new Date().toISOString().slice(0, 10),
    courseName: "",
    courseCode: "",
    className: "SY",
    academicYear: "2025-26",
    semester: "III",
    marks: 20 as 20 | 30,
    testNumber: 1 as 1 | 2,
    subjectType: "analytical_numerical" as SubjectType,
  });
  const [syllabus, setSyllabus] = useState<File | null>(null);
  const [qb, setQb] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<QBAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const handleAnalyzeQB = async () => {
    if (!syllabus || !qb) {
      setError("Please select both Syllabus and Question Bank files first.");
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const syllText = await extractText(syllabus);
      const qbText = await extractText(qb);
      const parsedQB = parseQuestionBankQuestions(qbText);
      const result = computeQBAnalysis(parsedQB, syllText, form.subjectType, form.marks);
      setAnalysis(result);
    } catch (err: any) {
      setError("Analysis failed: " + (err?.message || String(err)));
    } finally {
      setAnalyzing(false);
    }
  };

  const runGenerate = async (syllText: string, qbText: string) => {
    setProgress("Connecting to Puter AI…");
    const puter = await loadPuter();
    const prompt = `Return ONLY valid JSON for an academic question paper generator. Create exactly three sets named Easy, Medium, and Hard with mutually unique questions selected exclusively from the question bank. Include courseOutcomes with CO1 through CO6 when available. Each question needs key, text, marks, bloom, co, module, and needsDiagram. Course: ${form.courseName} (${form.courseCode}), marks: ${form.marks}, subject type: ${form.subjectType}. Syllabus:\n${syllText.slice(0, 18000)}\nQuestion bank:\n${qbText.slice(0, 50000)}`;
    setProgress("Generating 3 mutually unique question paper sets with Puter AI…");
    const response = await puter.ai.chat(prompt, { model: "qwen/qwen3.8-max" });
    const generatedResponse = parsePuterResponse(response);
    setProgress("Validating and saving paper…");
    const result = await generate({
      data: {
        syllabus: syllText,
        questionBank: qbText,
        marks: form.marks,
        courseName: form.courseName,
        courseCode: form.courseCode,
        subjectType: form.subjectType,
        generatedResponse,
      },
    });
    setProgress("Saving paper…");
    const user = currentUser;

    const directRegexCOs = extractCOsFromSyllabusText(syllText);
    const returnedCOs = result.courseOutcomes ?? {};

    const fallbackCOs: Record<string, string> = {
      CO1: `Understand fundamental concepts, architectures, and principles of ${form.courseName || "the course"}.`,
      CO2: `Apply analytical methods and computational techniques in ${form.courseName || "the course"}.`,
      CO3: `Analyze core components, algorithms, and methodologies related to ${form.courseName || "the course"}.`,
      CO4: `Conduct technical investigations and evaluate outcomes in ${form.courseName || "the course"}.`,
      CO5: `Utilize modern tools and computational practices for ${form.courseName || "the course"}.`,
      CO6: `Evaluate performance metrics and formulate structured solutions in ${form.courseName || "the course"}.`,
    };

    const finalCOs: Record<string, string> = {
      ...fallbackCOs,
      ...returnedCOs,
      ...directRegexCOs,
    };

    const { data, error: dbErr } = await supabase
      .from("papers")
      .insert({
        status: "draft",
        meta: {
          ...form,
          courseOutcomes: finalCOs,
          subjectType: form.subjectType,
          analysis: result.analysis || analysis,
        },
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
      if (!qbText.trim())
        throw new Error(
          "Could not read the question bank file. Please upload a text-searchable PDF/DOCX/TXT.",
        );

      if (!syllText.trim()) {
        throw new Error(
          "Could not read any text from the syllabus file. It may be a scanned image PDF — please upload a text-searchable PDF/DOCX/TXT.",
        );
      }

      await runGenerate(syllText, qbText);
    } catch (err: any) {
      setError(err?.message || String(err));
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div className="min-h-screen pb-16">
      <AppHeader />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Generate New Question Paper</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generates 3 <strong>100% unique, non-repeating</strong> question paper sets (Easy,
            Medium, Hard) strictly mapped to NBA Revised Bloom&apos;s Taxonomy and Module Hourly
            Weightages.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-6 bg-card border border-border rounded-xl p-6 shadow-sm"
        >
          {/* Section 1: Subject Type & NBA Criteria */}
          <div>
            <label className="text-sm font-semibold block mb-2 text-foreground">
              Subject Type (NBA Criteria Mapping)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, subjectType: "theoretical" })}
                className={`p-4 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  form.subjectType === "theoretical"
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border hover:bg-accent/40 text-muted-foreground"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                    <BookOpen className="w-4 h-4 text-brand" /> Theoretical Subject
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Concepts, classifications &amp; theory. Bloom&apos;s level capped at{" "}
                    <strong>Level 4 (Analyze)</strong> as per NBA guidelines.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-brand font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Levels: BL1 (Remember) to BL4 (Analyze)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, subjectType: "analytical_numerical" })}
                className={`p-4 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  form.subjectType === "analytical_numerical"
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border hover:bg-accent/40 text-muted-foreground"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                    <Sparkles className="w-4 h-4 text-brand" /> Numerical + Theoretical / Analytical
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Problem-solving, algorithmic design &amp; synthesis. Full spectrum up to{" "}
                    <strong>Level 6 (Create / Design)</strong>.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-brand font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Levels: BL1 (Remember) to BL6 (Create)
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Examination Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-border">
            <Field label="Course Name">
              <input
                value={form.courseName}
                onChange={(e) => setForm({ ...form, courseName: e.target.value })}
                className={input}
                placeholder="e.g., Operating Systems"
                required
              />
            </Field>
            <Field label="Course Code">
              <input
                value={form.courseCode}
                onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
                className={input}
                placeholder="e.g., AI301"
                required
              />
            </Field>
            <Field label="Exam Name">
              <input
                value={form.examName}
                onChange={(e) => setForm({ ...form, examName: e.target.value })}
                className={input}
                placeholder="Internal Assessment - I"
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={input}
              />
            </Field>
            <Field label="Marks">
              <select
                value={form.marks}
                onChange={(e) => {
                  const m = Number(e.target.value) as 20 | 30;
                  setForm({ ...form, marks: m, testNumber: m === 20 ? 1 : 2 });
                }}
                className={input}
              >
                <option value={20}>20 Marks (1 Hour)</option>
                <option value={30}>30 Marks (1.5 Hours)</option>
              </select>
            </Field>
            <Field label="Test Number">
              <select
                value={form.testNumber}
                onChange={(e) => {
                  const num = Number(e.target.value) as 1 | 2;
                  setForm({
                    ...form,
                    testNumber: num,
                    examName: num === 1 ? "Internal Assessment - I" : "Internal Assessment - II",
                  });
                }}
                className={input}
              >
                <option value={1}>Test 1 (CO1–CO3)</option>
                <option value={2}>Test 2 (CO4–CO6)</option>
              </select>
            </Field>
            <Field label="Class / Year">
              <select
                value={form.className}
                onChange={(e) => setForm({ ...form, className: e.target.value })}
                className={input}
              >
                <option>FY</option>
                <option>SY</option>
                <option>TY</option>
                <option>LY</option>
              </select>
            </Field>
            <Field label="Semester">
              <select
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
                className={input}
              >
                {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Academic Year">
              <input
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                className={input}
                placeholder="2025-26"
              />
            </Field>
          </div>

          {/* Section 3: File Uploads */}
          <div className="pt-2 border-t border-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileField
                label="Syllabus PDF / DOCX (For Module Hours & COs)"
                file={syllabus}
                onChange={(f) => {
                  setSyllabus(f);
                  setAnalysis(null);
                }}
                accept=".pdf,.docx,.txt"
              />
              <FileField
                label="Question Bank (PDF/DOCX/TXT)"
                file={qb}
                onChange={(f) => {
                  setQb(f);
                  setAnalysis(null);
                }}
                accept=".pdf,.docx,.txt"
              />
            </div>

            {/* Pre-generation Analysis trigger */}
            {syllabus && qb && !analysis && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAnalyzeQB}
                  disabled={analyzing}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-brand/40 bg-brand/5 text-brand rounded-md text-xs font-medium hover:bg-brand/10 cursor-pointer transition"
                >
                  {analyzing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BarChart3 className="w-3.5 h-3.5" />
                  )}
                  {analyzing
                    ? "Analyzing Question Bank…"
                    : "Run Question Bank Analysis & Weightage Check"}
                </button>
              </div>
            )}
          </div>

          {/* Question Bank Analysis Panel */}
          {analysis && (
            <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                  <BarChart3 className="w-4 h-4 text-brand" />
                  <span>Question Bank &amp; Hourly Weightage Analysis</span>
                </div>
                <span className="text-xs bg-brand/10 text-brand px-2.5 py-0.5 rounded-full font-medium">
                  {analysis.totalQuestions} Questions Parsed
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-background rounded-lg border border-border">
                  <div className="text-muted-foreground text-[11px]">Uniqueness Guarantee</div>
                  <div className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    100% Unique Sets
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Needs {analysis.uniquenessGuarantee.totalSlotsRequired} qns across 3 sets
                  </div>
                </div>

                <div className="p-2.5 bg-background rounded-lg border border-border">
                  <div className="text-muted-foreground text-[11px]">NBA Bloom&apos;s Level</div>
                  <div
                    className={`font-semibold mt-0.5 ${analysis.nbaCompliance.isCompliant ? "text-emerald-700" : "text-amber-700"}`}
                  >
                    Max: {analysis.nbaCompliance.actualMaxBloom}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Allowed: {analysis.nbaCompliance.maxBloomAllowed}
                  </div>
                </div>

                <div className="p-2.5 bg-background rounded-lg border border-border">
                  <div className="text-muted-foreground text-[11px]">LOTS vs HOTS</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {analysis.lotsCount} LOTS / {analysis.hotsCount} HOTS
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    LOTS (BL1-2) | HOTS (BL3-6)
                  </div>
                </div>

                <div className="p-2.5 bg-background rounded-lg border border-border">
                  <div className="text-muted-foreground text-[11px]">Subject Type</div>
                  <div className="font-semibold text-brand mt-0.5 capitalize">
                    {form.subjectType.replace("_", " + ")}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    NBA syllabus profile
                  </div>
                </div>
              </div>

              {/* Bloom Level Distribution */}
              <div>
                <div className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
                  <span>Bloom&apos;s Taxonomy Distribution in Question Bank:</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Easy uses BL1-BL2; Medium uses BL2-BL4; Hard uses BL4-BL6
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(Object.keys(BLOOM_DETAILS) as Bloom[]).map((bloomKey) => {
                    const count = analysis.bloomDistribution[bloomKey] || 0;
                    const info = BLOOM_DETAILS[bloomKey];
                    const isAllowed = form.subjectType !== "theoretical" || info.level <= 4;
                    return (
                      <div
                        key={bloomKey}
                        className={`p-2 rounded border text-center ${
                          !isAllowed && count > 0
                            ? "bg-amber-50/60 border-amber-300 text-amber-900"
                            : "bg-background border-border text-foreground"
                        }`}
                      >
                        <div className="text-[10px] text-muted-foreground font-medium">
                          {info.code} ({bloomKey})
                        </div>
                        <div className="text-sm font-bold mt-0.5">{count}</div>
                        <div className="text-[9px] text-muted-foreground">{info.category}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Module Hourly Weightage Table */}
              <div>
                <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand" />
                  <span>Module Hourly Weightages vs. Question Bank Allocation:</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-border">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="p-2 border border-border">Module</th>
                        <th className="p-2 border border-border">Teaching Hours</th>
                        <th className="p-2 border border-border">Hourly Weightage %</th>
                        <th className="p-2 border border-border">Questions in Bank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.modules.map((m) => (
                        <tr key={m.module} className="border-b border-border bg-background">
                          <td className="p-2 border border-border font-medium">{m.module}</td>
                          <td className="p-2 border border-border">{m.hours} Hrs</td>
                          <td className="p-2 border border-border">{m.weightagePercent}%</td>
                          <td className="p-2 border border-border font-semibold">
                            {m.questionCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
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
            className="w-full py-3 bg-brand text-brand-foreground rounded-lg font-medium hover:bg-brand/90 transition disabled:opacity-60 cursor-pointer text-sm shadow flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating 3 Unique Sets…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate 3 Unique Sets (Easy, Medium, Hard)
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const input =
  "w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold block mb-1.5 text-foreground">{label}</label>
      {children}
    </div>
  );
}

function FileField({
  label,
  file,
  onChange,
  accept,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  accept: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold block mb-1.5 text-foreground">{label}</label>
      <label className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-border rounded-lg cursor-pointer hover:border-brand hover:bg-accent/30 transition text-sm bg-background">
        <Upload className="w-4 h-4 text-brand shrink-0" />
        <span className="truncate flex-1 text-xs text-foreground">
          {file ? file.name : "Choose file (PDF / DOCX / TXT)"}
        </span>
        <input
          type="file"
          accept={accept}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="hidden"
        />
      </label>
    </div>
  );
}
