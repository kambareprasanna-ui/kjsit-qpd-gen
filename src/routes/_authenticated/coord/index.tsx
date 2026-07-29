import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
    supabase.from("papers").select("*").eq("status", "approved").order("created_at", { ascending: false }).then(({ data }) => setPapers(data || []));
  }, []);
  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-6">Approved Papers</h1>
        {papers.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
            No approved papers yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {papers.map((p) => (
              <Link
                key={p.id}
                to="/coord/paper/$id"
                params={{ id: p.id }}
                className="block bg-card border border-border rounded-lg p-4 hover:border-brand transition"
              >
                <div className="font-medium">{p.meta?.courseName} <span className="text-xs text-muted-foreground">({p.meta?.courseCode})</span></div>
                <div className="text-xs text-muted-foreground mt-1">{p.meta?.marks} marks · {p.meta?.className} Sem {p.meta?.semester}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
