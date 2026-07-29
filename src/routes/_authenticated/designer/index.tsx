import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, FileText, Send, CheckCircle2, XCircle, FileClock } from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";

type Tab = "draft" | "sent_to_dqc" | "approved" | "not_approved";

export const Route = createFileRoute("/_authenticated/designer/")({
  head: () => ({
    meta: [
      { title: "Faculty Dashboard — Somaiya Question Paper Portal" },
      { name: "description", content: "Generate, edit, and send question papers for DQC review." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ tab: (s.tab as Tab) || "draft" }),
  component: () => (
    <RoleGuard role="designer">
      <DesignerHome />
    </RoleGuard>
  ),
});

function DesignerHome() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(search.tab);
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => setTab(search.tab), [search.tab]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from("papers")
      .select("*")
      .eq("status", tab)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (mounted) {
          setPapers(data || []);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [tab]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "draft", label: "Draft", icon: FileText },
    { id: "sent_to_dqc", label: "Sent to DQC", icon: FileClock },
    { id: "approved", label: "Approved", icon: CheckCircle2 },
    { id: "not_approved", label: "Not Approved", icon: XCircle },
  ];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <aside>
          <div className="space-y-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate({ to: "/designer", search: { tab: t.id } })}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${
                    tab === t.id ? "bg-brand text-brand-foreground" : "hover:bg-accent"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>
        </aside>

        <main>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">Papers · {tabs.find((t) => t.id === tab)?.label}</h1>
            <Link
              to="/designer/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-md text-sm font-medium hover:bg-brand/90 transition"
            >
              <Plus className="w-4 h-4" /> Generate New Question Paper
            </Link>
          </div>

          {loading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : papers.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
              No papers yet in this list.
            </div>
          ) : (
            <div className="grid gap-3">
              {papers.map((p) => (
                <Link
                  key={p.id}
                  to="/designer/paper/$id"
                  params={{ id: p.id }}
                  className="block bg-card border border-border rounded-lg p-4 hover:border-brand transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {p.meta?.courseName || "Untitled"}{" "}
                        <span className="text-xs text-muted-foreground">({p.meta?.courseCode || "—"})</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {p.meta?.marks} marks · {p.meta?.className || "—"} · Sem {p.meta?.semester || "—"} ·{" "}
                        {new Date(p.created_at).toLocaleDateString()}
                      </div>
                      {tab === "not_approved" && p.dqc_note && (
                        <div className="mt-2 text-xs text-destructive">DQC note: {p.dqc_note}</div>
                      )}
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    sent_to_dqc: { label: "Sent to DQC", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" },
    not_approved: { label: "Not Approved", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200" },
  };
  const s = map[status] || map.draft;
  return <span className={`text-xs px-2 py-1 rounded ${s.cls}`}>{s.label}</span>;
}
