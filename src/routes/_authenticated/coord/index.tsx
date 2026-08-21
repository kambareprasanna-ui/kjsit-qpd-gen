import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, FileDown, Download, Printer } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { fetchPapers, fetchDiagrams } from "@/lib/papers-db";
import { exportPaperDocx, exportPaperPdf, printPaperDocument } from "@/lib/export";
import type { GeneratedSet } from "@/lib/paper.functions";

export const Route = createFileRoute("/_authenticated/coord/")({
  head: () => ({
    meta: [
      { title: "Exam Coordinator — Somaiya Portal" },
      { name: "description", content: "View, print, and download approved question papers." },
    ],
  }),
  component: () => (
    <RoleGuard role="coord">
      <CoordInbox />
    </RoleGuard>
  ),
});

function CoordInbox() {
  const [papers, setPapers] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPapers({ status: "approved" }).then((data) => setPapers(data || []));
  }, []);

  const handleQuickPrint = async (paper: any) => {
    setDownloadingId(`${paper.id}-print`);
    try {
      const meta = paper.meta;
      const sets: GeneratedSet[] = paper.sets || [];
      const selectedIdx = paper.selected_set_index ?? 0;
      const set: GeneratedSet = sets[selectedIdx] || sets[0];
      const diagrams = await fetchDiagrams(paper.id);
      const dmap: Record<string, string> = {};
      for (const d of diagrams || []) {
        if (d.set_index === selectedIdx) dmap[d.question_key] = d.image_url;
      }
      const fname = `${meta.courseCode}_${meta.marks}marks.pdf`;

      await printPaperDocument({
        meta,
        set,
        diagrams: dmap,
        signatureUrl: paper.dqc_signature_url,
        filename: fname,
      });
    } catch (e) {
      console.error("Print failed:", e);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleQuickDownload = async (paper: any, kind: "pdf" | "docx") => {
    setDownloadingId(`${paper.id}-${kind}`);
    try {
      const meta = paper.meta;
      const sets: GeneratedSet[] = paper.sets || [];
      const selectedIdx = paper.selected_set_index ?? 0;
      const set: GeneratedSet = sets[selectedIdx] || sets[0];
      const diagrams = await fetchDiagrams(paper.id);
      const dmap: Record<string, string> = {};
      for (const d of diagrams || []) {
        if (d.set_index === selectedIdx) dmap[d.question_key] = d.image_url;
      }
      const fname = `${meta.courseCode}_${meta.marks}marks.${kind}`;

      if (kind === "pdf") {
        await exportPaperPdf(meta, set, dmap, paper.dqc_signature_url, fname);
      } else {
        await exportPaperDocx(meta, set, dmap, paper.dqc_signature_url, fname);
      }
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Approved Question Papers</h1>
            <p className="text-sm text-muted-foreground">
              Final DQC-verified question papers ready for examination printing and distribution.
            </p>
          </div>
        </div>

        {papers.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
            No approved papers yet. Papers approved by DQC will appear here.
          </div>
        ) : (
          <div className="grid gap-3">
            {papers.map((p) => {
              return (
                <div
                  key={p.id}
                  className="bg-card border border-border rounded-lg p-5 hover:border-brand/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-semibold text-base flex items-center gap-2 flex-wrap">
                      <span>{p.meta?.courseName}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        ({p.meta?.courseCode})
                      </span>
                      {p.meta?.examName && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {p.meta.examName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span>
                        <b>Marks:</b> {p.meta?.marks}
                      </span>
                      <span>·</span>
                      <span>
                        <b>Class:</b> {p.meta?.className} (Sem {p.meta?.semester})
                      </span>
                      <span>·</span>
                      <span>
                        <b>Academic Year:</b> {p.meta?.academicYear || "2024-25"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => handleQuickPrint(p)}
                      disabled={downloadingId === `${p.id}-print`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand text-brand-foreground rounded-md text-sm font-medium hover:bg-brand/90 transition shadow-xs cursor-pointer"
                      title="Print Question Paper"
                    >
                      <Printer className="w-4 h-4" />{" "}
                      {downloadingId === `${p.id}-print` ? "Printing…" : "Print"}
                    </button>
                    <button
                      onClick={() => handleQuickDownload(p, "pdf")}
                      disabled={downloadingId === `${p.id}-pdf`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-accent transition cursor-pointer"
                      title="Download PDF"
                    >
                      <FileDown className="w-4 h-4" /> PDF
                    </button>
                    <button
                      onClick={() => handleQuickDownload(p, "docx")}
                      disabled={downloadingId === `${p.id}-docx`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-accent transition cursor-pointer"
                      title="Download Word (DOCX)"
                    >
                      <Download className="w-4 h-4" /> Word
                    </button>
                    <Link
                      to="/coord/paper/$id"
                      params={{ id: p.id }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-border bg-card rounded-md text-sm font-medium hover:bg-accent transition"
                      title="View Question Paper"
                    >
                      <Eye className="w-4 h-4" /> View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
