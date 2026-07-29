import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, FileDown, Printer } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { PaperRenderer, type PaperMeta } from "@/components/PaperRenderer";
import { supabase } from "@/integrations/supabase/client";
import { exportPaperDocx, exportPaperPdf } from "@/lib/export";
import type { GeneratedSet } from "@/lib/paper.functions";

export const Route = createFileRoute("/coord/paper/$id")({
  head: () => ({
    meta: [
      { title: "Approved Paper — Somaiya Portal" },
      { name: "description", content: "View, print, and download the approved question paper." },
    ],
  }),
  component: () => (
    <RoleGuard role="coord">
      <CoordView />
    </RoleGuard>
  ),
});

function CoordView() {
  const { id } = Route.useParams();
  const [paper, setPaper] = useState<any>(null);
  const [diagrams, setDiagrams] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("papers").select("*").eq("id", id).maybeSingle().then(({ data }) => setPaper(data));
    supabase.from("diagrams").select("*").eq("paper_id", id).then(({ data }) => setDiagrams(data || []));
  }, [id]);

  const dmap = useMemo(() => {
    if (!paper) return {};
    const idx = paper.selected_set_index ?? 0;
    const m: Record<string, string> = {};
    for (const d of diagrams) if (d.set_index === idx) m[d.question_key] = d.image_url;
    return m;
  }, [paper, diagrams]);

  if (!paper) return <div className="min-h-screen"><AppHeader /><div className="p-6 text-muted-foreground">Loading…</div></div>;
  const meta: PaperMeta = paper.meta;
  const set: GeneratedSet = paper.sets[paper.selected_set_index ?? 0];

  const doExport = async (kind: "pdf" | "docx") => {
    const fname = `${meta.courseCode}_${meta.marks}marks.${kind}`;
    if (kind === "pdf") await exportPaperPdf(meta, set, dmap, paper.dqc_signature_url, fname);
    else await exportPaperDocx(meta, set, dmap, paper.dqc_signature_url, fname);
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4 no-print">
          <div>
            <h1 className="text-2xl font-semibold">{meta.courseName} ({meta.courseCode})</h1>
            <p className="text-sm text-muted-foreground">Approved · {meta.marks} marks · Sem {meta.semester}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm hover:bg-accent">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={() => doExport("pdf")} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm hover:bg-accent">
              <FileDown className="w-4 h-4" /> PDF
            </button>
            <button onClick={() => doExport("docx")} className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm hover:bg-accent">
              <Download className="w-4 h-4" /> Word
            </button>
          </div>
        </div>
        <PaperRenderer meta={meta} set={set} diagrams={dmap} signatureUrl={paper.dqc_signature_url} />
      </div>
    </div>
  );
}
