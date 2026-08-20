import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Signature } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { PaperRenderer, type PaperMeta } from "@/components/PaperRenderer";
import { supabase } from "@/integrations/supabase/client";
import { fileToDataUrl } from "@/lib/parse-file";
import { getPattern } from "@/lib/paper-pattern";
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
    <RoleGuard role={["dqc", "hod"]}>
      <DqcReview />
    </RoleGuard>
  ),
});

function DqcReview() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<any>(null);
  const [diagrams, setDiagrams] = useState<any[]>([]);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");

  const load = async () => {
    const { data } = await supabase.from("papers").select("*").eq("id", id).maybeSingle();
    setPaper(data);
    const { data: d } = await supabase.from("diagrams").select("*").eq("paper_id", id);
    setDiagrams(d || []);
  };
  useEffect(() => {
    load();
  }, [id]);

  const dmap = useMemo(() => {
    if (!paper) return {};
    const idx = paper.selected_set_index ?? 0;
    const m: Record<string, string> = {};
    for (const d of diagrams) if (d.set_index === idx) m[d.question_key] = d.image_url;
    return m;
  }, [paper, diagrams]);

  if (!paper)
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="p-6 text-muted-foreground">Loading…</div>
      </div>
    );
  const meta: PaperMeta = paper.meta;
  const set: GeneratedSet = paper.sets[paper.selected_set_index ?? 0];
  const pattern = getPattern(meta.marks);

  const approve = async () => {
    await supabase.from("papers").update({ status: "approved" }).eq("id", id);
    await supabase.from("notifications").insert({
      recipient_email: "examcoord@somaiya.edu",
      paper_id: id,
      message: `Paper approved and ready for print: ${meta.courseName} (${meta.courseCode})`,
    });
    navigate({ to: "/dqc" });
  };

  const reject = async () => {
    if (!note.trim()) return alert("Please add a note explaining the issue.");
    await supabase.from("papers").update({ status: "not_approved", dqc_note: note }).eq("id", id);
    await supabase.from("notifications").insert({
      recipient_email: paper.created_by_email || "faculty@somaiya.edu",
      paper_id: id,
      message: `Paper not approved — see DQC note: ${meta.courseName}`,
    });
    navigate({ to: "/dqc" });
  };

  const uploadSig = async (f: File) => {
    const url = await fileToDataUrl(f);
    await supabase.from("papers").update({ dqc_signature_url: url }).eq("id", id);
    await load();
  };

  // Analysis
  const bloomCounts: Record<string, number> = { Remember: 0, Understand: 0, Apply: 0 };
  for (const q of set.questions) bloomCounts[q.bloom] = (bloomCounts[q.bloom] || 0) + 1;
  const coMap = set.questions.map((q) => ({ key: q.key, co: q.co }));
  const unitCoverage: Record<string, number> = {};
  for (const q of set.questions) unitCoverage[q.module] = (unitCoverage[q.module] || 0) + 1;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {meta.courseName} ({meta.courseCode})
            </h1>
            <p className="text-sm text-muted-foreground">
              DQC Review · {meta.marks} marks · Sem {meta.semester}
            </p>
          </div>
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm hover:bg-accent cursor-pointer">
              <Signature className="w-4 h-4" /> Add Signature
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadSig(e.target.files[0])}
              />
            </label>
            <button
              onClick={approve}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve
            </button>
            <button
              onClick={() => setRejectOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm hover:bg-destructive/90"
            >
              <XCircle className="w-4 h-4" /> Not Approve
            </button>
          </div>
        </div>

        <PaperRenderer
          meta={meta}
          set={set}
          diagrams={dmap}
          signatureUrl={paper.dqc_signature_url}
          setLabel="Selected Set"
        />

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <AnalysisCard title="Bloom Analysis">
            {Object.entries(bloomCounts).map(([k, v]) => (
              <BarRow key={k} label={k} value={v} max={set.questions.length} />
            ))}
          </AnalysisCard>
          <AnalysisCard title="CO Mapping">
            <div className="text-xs space-y-1">
              {coMap.map((c) => (
                <div key={c.key} className="flex justify-between border-b border-border py-1">
                  <span>{c.key}</span>
                  <span className="font-medium">{c.co}</span>
                </div>
              ))}
            </div>
          </AnalysisCard>
          <AnalysisCard title="Unit Coverage">
            {Object.entries(unitCoverage).map(([k, v]) => (
              <BarRow key={k} label={k} value={v} max={set.questions.length} />
            ))}
          </AnalysisCard>
        </div>
      </div>

      {rejectOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3">Reject with note</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-32 p-3 border border-border rounded-md bg-background text-sm"
              placeholder="Explain what needs to change…"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRejectOpen(false)}
                className="px-4 py-2 text-sm hover:bg-accent rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={reject}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm"
              >
                Send back
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
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="font-semibold text-sm mb-3">{title}</div>
      {children}
    </div>
  );
}
function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
