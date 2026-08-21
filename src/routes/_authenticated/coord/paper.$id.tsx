import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, FileDown, Printer } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { PaperRenderer, type PaperMeta } from "@/components/PaperRenderer";
import { fetchPaperById, fetchDiagrams } from "@/lib/papers-db";
import { exportPaperDocx, exportPaperPdf } from "@/lib/export";
import type { GeneratedSet } from "@/lib/paper.functions";

export const Route = createFileRoute("/_authenticated/coord/paper/$id")({
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
  const [activeSetIdx, setActiveSetIdx] = useState<number | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    fetchPaperById(id).then((data) => {
      setPaper(data);
      if (activeSetIdx === null && data?.selected_set_index != null) {
        setActiveSetIdx(data.selected_set_index);
      }
    });
    fetchDiagrams(id).then((data) => setDiagrams(data || []));
  }, [id]);

  const sets: GeneratedSet[] = paper?.sets || [];
  const currentSetIdx = activeSetIdx ?? paper?.selected_set_index ?? 0;
  const set: GeneratedSet = sets[currentSetIdx] || sets[0];

  const setLabels = ["Set A", "Set B", "Set C"];
  const getSetLabel = (s: any, i: number) =>
    s?.setName || setLabels[i] || `Set ${String.fromCharCode(65 + i)}`;

  const dmap = useMemo(() => {
    if (!paper) return {};
    const m: Record<string, string> = {};
    for (const d of diagrams) if (d.set_index === currentSetIdx) m[d.question_key] = d.image_url;
    return m;
  }, [paper, diagrams, currentSetIdx]);

  if (!paper || !set)
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="p-6 text-muted-foreground">Loading…</div>
      </div>
    );
  const meta: PaperMeta = paper.meta;

  const doExport = async (kind: "pdf" | "docx") => {
    const setNameStr = getSetLabel(set, currentSetIdx).replace(/\s+/g, "_");
    const fname = `${meta.courseCode}_${setNameStr}_${meta.marks}marks.${kind}`;
    if (kind === "pdf") await exportPaperPdf(meta, set, dmap, paper.dqc_signature_url, fname);
    else await exportPaperDocx(meta, set, dmap, paper.dqc_signature_url, fname);
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // Direct browser window print (styled by @media print CSS)
      window.print();
    } catch (err) {
      console.warn(
        "Direct print failed or restricted by environment sandbox. Exporting PDF as fallback:",
        err,
      );
      await doExport("pdf");
    } finally {
      setTimeout(() => setIsPrinting(false), 400);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 no-print">
          <div>
            <h1 className="text-2xl font-semibold">
              {meta.courseName} ({meta.courseCode})
            </h1>
            <p className="text-sm text-muted-foreground">
              Approved · {meta.marks} marks · Sem {meta.semester} ·{" "}
              {getSetLabel(set, currentSetIdx)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-2 px-3 py-2 bg-brand text-brand-foreground rounded-md text-sm font-medium hover:bg-brand/90 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" /> {isPrinting ? "Preparing…" : "Print Paper"}
            </button>
            <button
              onClick={() => doExport("pdf")}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border bg-card rounded-md text-sm hover:bg-accent font-medium transition cursor-pointer"
            >
              <FileDown className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => doExport("docx")}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border bg-card rounded-md text-sm hover:bg-accent font-medium transition cursor-pointer"
            >
              <Download className="w-4 h-4" /> Word
            </button>
          </div>
        </div>

        {/* Set Switcher Tabs */}
        {sets.length > 1 && (
          <div className="flex gap-2 mb-4 no-print">
            {sets.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveSetIdx(i)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  currentSetIdx === i
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "bg-card border border-border hover:bg-accent"
                }`}
              >
                {getSetLabel(s, i)}
                {paper.selected_set_index === i && (
                  <span className="ml-2 text-xs bg-white/20 px-1.5 py-0.5 rounded text-white font-normal">
                    Approved Choice
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div id="printable-paper-view">
          <PaperRenderer
            meta={meta}
            set={set}
            diagrams={dmap}
            signatureUrl={paper.dqc_signature_url}
            setLabel={`${getSetLabel(set, currentSetIdx)}${paper.selected_set_index === currentSetIdx ? " · Approved Set" : ""}`}
          />
        </div>
      </div>
    </div>
  );
}
