import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  FileClock,
  Lock,
  UserCheck,
  BookOpen,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { fetchPapers, type PaperRecord } from "@/lib/papers-db";
import { useUser, roleDisplayName } from "@/lib/auth";

type Tab = "draft" | "sent_to_dqc" | "approved" | "not_approved";

export const Route = createFileRoute("/_authenticated/designer/")({
  head: () => ({
    meta: [
      { title: "Faculty Dashboard — Somaiya Question Paper Portal" },
      {
        name: "description",
        content: "Generate, edit, and manage your private faculty question papers.",
      },
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
  const user = useUser();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(search.tab);
  const [papers, setPapers] = useState<PaperRecord[]>([]);
  const [counts, setCounts] = useState<Record<Tab, number>>({
    draft: 0,
    sent_to_dqc: 0,
    approved: 0,
    not_approved: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => setTab(search.tab), [search.tab]);

  const loadFacultyPapers = async () => {
    if (!user?.email) return;
    setLoading(true);

    // Fetch all papers authored by this faculty member to calculate tab counts
    const allFacultyPapers = await fetchPapers({ email: user.email });

    const newCounts: Record<Tab, number> = {
      draft: 0,
      sent_to_dqc: 0,
      approved: 0,
      not_approved: 0,
    };

    allFacultyPapers.forEach((p) => {
      if (p.status in newCounts) {
        newCounts[p.status as Tab]++;
      }
    });
    setCounts(newCounts);

    // Set current active tab filtered list
    const tabFiltered = allFacultyPapers.filter((p) => p.status === tab);
    setPapers(tabFiltered);
    setLoading(false);
  };

  useEffect(() => {
    loadFacultyPapers();

    const handleUpdate = () => loadFacultyPapers();
    window.addEventListener("kjsit_papers_updated", handleUpdate);
    return () => window.removeEventListener("kjsit_papers_updated", handleUpdate);
  }, [tab, user?.email]);

  const tabs: { id: Tab; label: string; icon: any; count: number }[] = [
    { id: "draft", label: "My Drafts", icon: FileText, count: counts.draft },
    { id: "sent_to_dqc", label: "Sent to DQC", icon: FileClock, count: counts.sent_to_dqc },
    { id: "approved", label: "Approved Papers", icon: CheckCircle2, count: counts.approved },
    { id: "not_approved", label: "Revision Required", icon: XCircle, count: counts.not_approved },
  ];

  const totalMyPapers = counts.draft + counts.sent_to_dqc + counts.approved + counts.not_approved;

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Faculty Personal Profile & Isolation Banner */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {user?.name ? `${user.name}'s Dashboard` : "Faculty Dashboard"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20">
                  {roleDisplayName("designer")}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {user?.department || "Information Technology"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Signed in as <span className="font-mono text-foreground">{user?.email}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/designer/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-brand-foreground rounded-lg text-sm font-semibold hover:bg-brand/90 transition shadow-xs"
              >
                <Plus className="w-4 h-4" /> Generate New Question Paper
              </Link>
            </div>
          </div>

          {/* Privacy & Role Isolation Notice */}
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground/80">
              <Lock className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>
                <b>Private Faculty Workspace:</b> Question papers generated by you are confidential
                and cannot be viewed or modified by other faculty members.
              </span>
            </div>
            <div className="font-medium text-foreground">
              Total papers created: <span className="font-bold text-brand">{totalMyPapers}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar Tabs */}
          <aside className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase px-3 py-1 tracking-wider">
              Paper Status
            </div>
            <div className="space-y-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate({ to: "/designer", search: { tab: t.id } })}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition font-medium ${
                      active
                        ? "bg-brand text-brand-foreground shadow-2xs font-semibold"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{t.label}</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        active
                          ? "bg-white/20 text-white"
                          : t.count > 0
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main List */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span>{tabs.find((t) => t.id === tab)?.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                  {papers.length} {papers.length === 1 ? "paper" : "papers"}
                </span>
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Loading your papers…
              </div>
            ) : papers.length === 0 ? (
              <div className="border border-dashed border-border bg-card rounded-xl p-12 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                <h3 className="text-base font-semibold text-foreground">
                  No {tabs.find((t) => t.id === tab)?.label} Found
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                  {tab === "draft"
                    ? `You have no draft papers in progress. Click below to generate 3 AI sets for your course.`
                    : tab === "sent_to_dqc"
                      ? `You haven't submitted any papers for DQC review yet. Finalize a draft and click "Send to DQC".`
                      : tab === "approved"
                        ? `No approved papers yet. Once DQC approves your paper, it will appear here and in the coordinator's printing queue.`
                        : `No revision requests from DQC for your papers.`}
                </p>
                {tab === "draft" && (
                  <Link
                    to="/designer/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg text-xs font-semibold hover:bg-brand/90 transition shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Generate Question Paper
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {papers.map((p) => (
                  <Link
                    key={p.id}
                    to="/designer/paper/$id"
                    params={{ id: p.id }}
                    className="block bg-card border border-border rounded-xl p-5 hover:border-brand/70 hover:shadow-sm transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-semibold text-base text-foreground flex items-center gap-2 flex-wrap">
                          <span>{p.meta?.courseName || "Untitled Course"}</span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {p.meta?.courseCode || "N/A"}
                          </span>
                          {p.meta?.examName && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                              {p.meta.examName}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                          <span>
                            <b>Marks:</b> {p.meta?.marks || 20} marks
                          </span>
                          <span>·</span>
                          <span>
                            <b>Class:</b> {p.meta?.className || "SY"} (Sem{" "}
                            {p.meta?.semester || "III"})
                          </span>
                          <span>·</span>
                          <span>
                            <b>Academic Year:</b> {p.meta?.academicYear || "2025-26"}
                          </span>
                          <span>·</span>
                          <span>
                            <b>Created:</b> {new Date(p.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {p.status === "not_approved" && p.dqc_feedback && (
                          <div className="mt-2 text-xs text-destructive p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                            <b>DQC Feedback:</b> {p.dqc_feedback}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge
                          status={p.status}
                          dqcYear={p.meta?.targetDqcYear || p.meta?.className || "SY"}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status, dqcYear }: { status: string; dqcYear?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: {
      label: "Draft",
      cls: "bg-muted text-muted-foreground border-border",
    },
    sent_to_dqc: {
      label: `Sent to ${dqcYear || "SY"} DQC`,
      cls: "bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950 dark:text-purple-200 font-bold",
    },
    approved: {
      label: "DQC Approved",
      cls: "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200",
    },
    not_approved: {
      label: "Revision Requested",
      cls: "bg-red-100 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-200",
    },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${s.cls}`}>
      {s.label}
    </span>
  );
}
