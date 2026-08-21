import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Signature,
  ArrowLeft,
  User,
  Calendar,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { PaperRenderer, type PaperMeta } from "@/components/PaperRenderer";
import { formatBTLevel } from "@/lib/paper-pattern";
import { fetchPaperById, fetchDiagrams, updatePaperRecord } from "@/lib/papers-db";
import { fileToDataUrl } from "@/lib/parse-file";
import { useUser, type DqcYear } from "@/lib/auth";
import type { GeneratedSet } from "@/lib/paper.functions";

export const Route = createFileRoute("/_authenticated/dqc/paper/$id")({
  head: () => ({
    meta: [
      { title: "DQC Review — Somaiya Portal" },
      {
        name: "description",
        content: "Review a submitted question paper with Bloom, CO, and unit analysis.",
      },
    ],
  }),
  component: () => (
    <RoleGuard role="dqc">
      <DqcReview />
    </RoleGuard>
  ),
});

function DqcReview() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const user = useUser();
  const [paper, setPaper] = useState<any>(null);
  const [diagrams, setDiagrams] = useState<any[]>([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const reviewerYear: DqcYear = user?.dqcYear || "SY";

  const load = async () => {
    const data = await fetchPaperById(id);
    setPaper(data);
    const d = await fetchDiagrams(id);
    setDiagrams(d || []);
  };

  useEffect(() => {
    load();
  }, [id]);

  const sets: GeneratedSet[] = paper?.sets || [];
  // Strictly display only the set chosen and finalized by the faculty
  const selectedSetIdx = paper?.selected_set_index ?? 0;
  const set: GeneratedSet | undefined = sets[selectedSetIdx] || sets[0];

  const setLabels = ["Set A", "Set B", "Set C"];
  const getSetLabel = (s: any, i: number) =>
    s?.setName || setLabels[i] || `Set ${String.fromCharCode(65 + i)}`;

  const dmap = useMemo(() => {
    if (!paper) return {};
    const m: Record<string, string> = {};
    for (const d of diagrams) {
      if (d.set_index === selectedSetIdx) {
        m[d.question_key] = d.image_url;
      }
    }
    return m;
  }, [paper, diagrams, selectedSetIdx]);

  if (!paper || !set) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="max-w-4xl mx-auto p-8 text-center text-muted-foreground">
          Loading question paper details…
        </div>
      </div>
    );
  }

  const meta: PaperMeta = paper.meta;
  const paperDqcYear = meta.targetDqcYear || meta.className || "SY";

  // Strict year authorization check: SY DQC can only view SY papers, TY only TY, LY only LY
  if (paperDqcYear !== reviewerYear) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="max-w-xl mx-auto mt-16 p-8 bg-card border border-destructive/30 rounded-2xl text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You are signed in as an <b>{reviewerYear} DQC Reviewer</b>. This question paper is
            designated for the <b>{paperDqcYear} DQC Committee</b> and cannot be accessed from your
            account.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/dqc"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to {reviewerYear} DQC Inbox
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const approve = async () => {
    setProcessing(true);
    await updatePaperRecord(id, {
      status: "approved",
      dqc_feedback: "Approved by DQC committee.",
    });
    setProcessing(false);
    navigate({ to: "/dqc" });
  };

  const reject = async () => {
    if (!note.trim()) {
      alert("Please add a note explaining the required revisions.");
      return;
    }
    setProcessing(true);
    await updatePaperRecord(id, { status: "not_approved", dqc_feedback: note.trim() });
    setProcessing(false);
    navigate({ to: "/dqc" });
  };

  const uploadSig = async (f: File) => {
    const url = await fileToDataUrl(f);
    await updatePaperRecord(id, { meta: { ...paper.meta, dqc_signature_url: url } });
    await load();
  };

  // Analysis for the single selected set
  const bloomCounts: Record<string, number> = {
    "Remember (R)": 0,
    "Understand (U)": 0,
    "Apply (A)": 0,
    "Analyze (An)": 0,
    "Evaluate (E)": 0,
    "Create (C)": 0,
  };
  const btNameMap: Record<string, string> = {
    R: "Remember (R)",
    U: "Understand (U)",
    A: "Apply (A)",
    An: "Analyze (An)",
    E: "Evaluate (E)",
    C: "Create (C)",
  };
  for (const q of set.questions || []) {
    if (q.bloom) {
      const code = formatBTLevel(q.bloom);
      const label = btNameMap[code] || q.bloom;
      bloomCounts[label] = (bloomCounts[label] || 0) + 1;
    }
  }

  const coMap = (set.questions || []).map((q) => ({ key: q.key, co: q.co }));

  const unitCoverage: Record<string, number> = {};
  for (const q of set.questions || []) {
    const mod = q.module || "General";
    unitCoverage[mod] = (unitCoverage[mod] || 0) + 1;
  }

  const selectedSetName = getSetLabel(set, selectedSetIdx);

  return (
    <div className="min-h-screen bg-background pb-16">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Navigation & Header */}
        <div className="mb-4">
          <Link
            to="/dqc"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to DQC Inbox
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border rounded-xl p-5 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {meta.courseName} ({meta.courseCode})
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  {meta.className || "SY"} DQC Review
                </span>
              </div>

              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-foreground/70" />
                  <b>Faculty:</b> {meta.designerName || paper.created_by_email}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-foreground/70" />
                  <b>Exam:</b> {meta.examName || "Internal Assessment"} ({meta.marks} marks)
                </span>
                <span>·</span>
                <span>
                  <b>Class:</b> {meta.className} · Sem {meta.semester}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-border bg-card rounded-lg text-xs font-medium hover:bg-accent cursor-pointer transition shadow-2xs">
                <Signature className="w-3.5 h-3.5" />
                {paper.meta?.dqc_signature_url ? "Update Signature" : "Add Signature"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadSig(e.target.files[0])}
                />
              </label>

              <button
                disabled={processing}
                onClick={approve}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-2xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve Paper
              </button>

              <button
                disabled={processing}
                onClick={() => setRejectOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg text-xs font-semibold transition shadow-2xs disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> Request Revision
              </button>
            </div>
          </div>
        </div>

        {/* Question Paper Document */}
        <div className="mb-8">
          <PaperRenderer
            meta={meta}
            set={set}
            diagrams={dmap}
            signatureUrl={paper.meta?.dqc_signature_url}
          />
        </div>

        {/* Analytics for the selected set */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnalysisCard title="Bloom's Taxonomy Distribution">
            {Object.entries(bloomCounts)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => (
                <BarRow key={k} label={k} value={v} max={set.questions?.length || 1} />
              ))}
          </AnalysisCard>

          <AnalysisCard title="Course Outcome (CO) Mapping">
            <div className="text-xs space-y-1 max-h-48 overflow-y-auto pr-1">
              {coMap.map((c) => (
                <div
                  key={c.key}
                  className="flex justify-between items-center border-b border-border/60 py-1"
                >
                  <span className="font-mono text-muted-foreground">{c.key}</span>
                  <span className="font-medium px-2 py-0.5 rounded bg-muted text-foreground">
                    {c.co}
                  </span>
                </div>
              ))}
            </div>
          </AnalysisCard>

          <AnalysisCard title="Unit / Module Coverage">
            {Object.entries(unitCoverage).map(([k, v]) => (
              <BarRow key={k} label={k} value={v} max={set.questions?.length || 1} />
            ))}
          </AnalysisCard>
        </div>
      </main>

      {/* Reject / Revision Modal */}
      {rejectOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-lg space-y-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Request Revision from Faculty
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Provide specific guidance on what needs to be changed before this paper can be
                approved.
              </p>
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-32 p-3 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 text-foreground"
              placeholder="E.g., Q2b should cover CO3 instead of CO2, or adjust Bloom level to 'Apply'..."
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                className="px-4 py-2 text-xs font-medium hover:bg-accent rounded-lg border border-border text-foreground transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={reject}
                className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                Send Revision Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
      <div className="font-semibold text-xs text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5 text-brand" />
        {title}
      </div>
      {children}
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">
          {value} <span className="text-[10px] text-muted-foreground">({Math.round(pct)}%)</span>
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-brand transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
