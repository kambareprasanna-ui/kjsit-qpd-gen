import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, FileDown, Printer } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";

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
  useEffect(() => {
    supabase
      .from("papers")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPapers(data || []));
  }, []);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Approved Question Papers</h1>
            <p className="text-sm text-muted-foreground">
              Final DQC-verified question papers ready for examination and printing.
            </p>
          </div>
        </div>

        {papers.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
            No approved papers yet. Papers approved by DQC will appear here.
          </div>
        ) : (
          <div className="grid gap-3">
            {papers.map((p) => (
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

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/coord/paper/$id"
                    params={{ id: p.id }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand text-brand-foreground rounded-md text-sm font-medium hover:bg-brand/90 transition"
                  >
                    <Eye className="w-4 h-4" /> View & Print
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
