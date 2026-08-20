import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  FileClock,
  Shield,
  Award,
  SendHorizontal,
  Check,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { requestRoleElevationFn } from "@/lib/hod.functions";

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

  // Role application modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [targetRole, setTargetRole] = useState<"dqc" | "coord">("dqc");
  const [reason, setReason] = useState("");
  const [submittingRole, setSubmittingRole] = useState(false);
  const [roleSubmitSuccess, setRoleSubmitSuccess] = useState(false);

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

  const handleRequestRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRole(true);
    try {
      await requestRoleElevationFn({
        data: {
          requestedRole: targetRole,
          reason,
        },
      });
      setRoleSubmitSuccess(true);
      setTimeout(() => {
        setRoleSubmitSuccess(false);
        setShowRoleModal(false);
        setReason("");
      }, 2500);
    } catch (err: any) {
      alert(err?.message || "Failed to submit request to HOD.");
    } finally {
      setSubmittingRole(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "draft", label: "Draft", icon: FileText },
    { id: "sent_to_dqc", label: "Sent to DQC", icon: FileClock },
    { id: "approved", label: "Approved", icon: CheckCircle2 },
    { id: "not_approved", label: "Not Approved", icon: XCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        <aside className="space-y-6">
          <div className="space-y-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate({ to: "/designer", search: { tab: t.id } })}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition cursor-pointer ${
                    tab === t.id ? "bg-brand text-brand-foreground shadow-xs" : "hover:bg-accent"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>

          {/* HOD Role Status Card */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs text-xs space-y-3">
            <div className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
              <Shield className="w-4 h-4 text-brand" /> Portal Privileges
            </div>
            <p className="text-muted-foreground leading-relaxed">
              You are signed in as <b>Faculty / Paper Designer</b>.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Appointment as <b>DQC Member</b> or <b>Exam Coordinator</b> is granted upon HOD
              approval.
            </p>
            <button
              onClick={() => setShowRoleModal(true)}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-border bg-accent/50 hover:bg-accent rounded-md text-xs font-medium text-foreground transition cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" /> Request DQC / Coordinator Role
            </button>
          </div>
        </aside>

        <main>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">
              Papers · {tabs.find((t) => t.id === tab)?.label}
            </h1>
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
                        <span className="text-xs text-muted-foreground">
                          ({p.meta?.courseCode || "—"})
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {p.meta?.marks} marks · {p.meta?.className || "—"} · Sem{" "}
                        {p.meta?.semester || "—"} · {new Date(p.created_at).toLocaleDateString()}
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

      {/* Role Request Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-foreground">Apply for Role Elevation</h3>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Submit an official request to the Head of Department (HOD) to be assigned as a
              Department Quality Circle (DQC) Member or Exam Coordinator.
            </p>

            {roleSubmitSuccess ? (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Application submitted to HOD successfully.</span>
              </div>
            ) : (
              <form onSubmit={handleRequestRole} className="space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1.5">Select Desired Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTargetRole("dqc")}
                      className={`p-3 rounded-lg border text-left text-xs transition cursor-pointer ${
                        targetRole === "dqc"
                          ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold"
                          : "border-border hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      <div className="font-medium text-sm">DQC Member</div>
                      <div className="text-[11px] mt-0.5 opacity-80">
                        Review &amp; approve departmental papers
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetRole("coord")}
                      className={`p-3 rounded-lg border text-left text-xs transition cursor-pointer ${
                        targetRole === "coord"
                          ? "border-amber-600 bg-amber-50 text-amber-900 font-semibold"
                          : "border-border hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      <div className="font-medium text-sm">Exam Coordinator</div>
                      <div className="text-[11px] mt-0.5 opacity-80">
                        Print &amp; schedule approved exams
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5">
                    Note for HOD (Optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Appointed by department for Semester V exams…"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRoleModal(false)}
                    className="px-4 py-2 border border-border rounded-md text-xs font-medium hover:bg-accent transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRole}
                    className="px-4 py-2 bg-brand text-brand-foreground rounded-md text-xs font-medium hover:bg-brand/90 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    {submittingRole ? "Submitting…" : "Send Request to HOD"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    sent_to_dqc: {
      label: "Sent to DQC",
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    },
    approved: {
      label: "Approved",
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    },
    not_approved: {
      label: "Not Approved",
      cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    },
  };
  const s = map[status] || map.draft;
  return <span className={`text-xs px-2 py-1 rounded ${s.cls}`}>{s.label}</span>;
}
