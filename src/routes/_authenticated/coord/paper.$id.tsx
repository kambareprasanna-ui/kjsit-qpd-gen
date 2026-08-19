import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, FileDown, Printer } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { PaperRenderer, type PaperMeta } from "@/components/PaperRenderer";
import { supabase } from "@/integrations/supabase/client";
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
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    supabase
      .from("papers")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setPaper(data));
    supabase
      .from("diagrams")
      .select("*")
      .eq("paper_id", id)
      .then(({ data }) => setDiagrams(data || []));
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

  const doExport = async (kind: "pdf" | "docx") => {
    const fname = `${meta.courseCode}_${meta.marks}marks.${kind}`;
    if (kind === "pdf") await exportPaperPdf(meta, set, dmap, paper.dqc_signature_url, fname);
    else await exportPaperDocx(meta, set, dmap, paper.dqc_signature_url, fname);
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // Create a hidden iframe for clean printing without iframe sandbox modal blockage
      const paperElement = document.getElementById("printable-paper-view");
      if (paperElement) {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${meta.courseName} (${meta.courseCode}) - Question Paper</title>
                <style>
                  @page { size: A4; margin: 12mm; }
                  * { box-sizing: border-box; }
                  body { font-family: "Times New Roman", Georgia, serif; color: #111; background: white; margin: 0; padding: 15px; }
                  .paper-page { width: 100%; max-width: 820px; margin: 0 auto; box-shadow: none !important; border: none !important; }
                  table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
                  th, td { border: 1px solid #111; padding: 6px 8px; vertical-align: top; font-size: 11pt; }
                  th { background: #f2f2f2; font-weight: 600; text-align: left; }
                  img { max-width: 100%; }
                  .border-b { border-bottom: 1px solid #000; }
                  .flex { display: flex; }
                  .items-center { align-items: center; }
                  .gap-4 { gap: 1rem; }
                  .flex-1 { flex: 1 1 0%; }
                  .text-center { text-align: center; }
                  .font-bold { font-weight: 700; }
                  .italic { font-style: italic; }
                  .shrink-0 { flex-shrink: 0; }
                  .h-16 { height: 4rem; }
                  .w-auto { width: auto; }
                  .object-contain { object-fit: contain; }
                </style>
              </head>
              <body>
                ${paperElement.innerHTML}
              </body>
            </html>
          `);
          doc.close();

          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch {
              window.print();
            }
            setTimeout(() => {
              document.body.removeChild(iframe);
              setIsPrinting(false);
            }, 1000);
          }, 300);
          return;
        }
      }

      window.print();
    } catch {
      // If browser sandboxing strictly prevents popup/window.print, generate clean PDF
      await doExport("pdf");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4 no-print">
          <div>
            <h1 className="text-2xl font-semibold">
              {meta.courseName} ({meta.courseCode})
            </h1>
            <p className="text-sm text-muted-foreground">
              Approved · {meta.marks} marks · Sem {meta.semester}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm hover:bg-accent font-medium transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> {isPrinting ? "Preparing…" : "Print"}
            </button>
            <button
              onClick={() => doExport("pdf")}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm hover:bg-accent font-medium transition cursor-pointer"
            >
              <FileDown className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={() => doExport("docx")}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm hover:bg-accent font-medium transition cursor-pointer"
            >
              <Download className="w-4 h-4" /> Word
            </button>
          </div>
        </div>
        <div id="printable-paper-view">
          <PaperRenderer
            meta={meta}
            set={set}
            diagrams={dmap}
            signatureUrl={paper.dqc_signature_url}
          />
        </div>
      </div>
    </div>
  );
}
