import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import { fetchPapers, type PaperRecord } from "@/lib/papers-db";
import { useUser, type DqcYear } from "@/lib/auth";
import { CheckCircle2, ChevronRight, User, Filter, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dqc/")({
  head: () => ({
    meta: [
      { title: "DQC Dashboard — Somaiya Portal" },
      {
        name: "description",
        content:
          "Review papers submitted by faculty, run Bloom & CO analysis, and approve or reject.",
      },
    ],
  }),
  component: () => (
    <RoleGuard role="dqc">
      <DqcInbox />
    </RoleGuard>
  ),
});

type DqcStatusFilter = "pending" | "approved" | "all";

function DqcInbox() {
  const user = useUser();
  const [papers, setPapers] = useState<PaperRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DqcStatusFilter>("pending");

  const reviewerYear: DqcYear = user?.dqcYear || "SY";

  useEffect(() => {
    fetchPapers().then((data) => {
      setPapers(data || []);
      setLoading(false);
    });
  }, []);

  const getPaperYear = (p: PaperRecord): string => {
    return p.meta?.targetDqcYear || p.meta?.className || "SY";
  };

  // Strictly enforce year isolation: SY DQC only sees SY papers, TY only TY, LY only LY
  const yearPapers = papers.filter((p) => getPaperYear(p) === reviewerYear);
  const pendingPapers = yearPapers.filter((p) => p.status === "sent_to_dqc");
  const approvedPapers = yearPapers.filter((p) => p.status === "approved");

  const displayedPapers =
    statusFilter === "pending"
      ? pendingPapers
      : statusFilter === "approved"
        ? approvedPapers
        : yearPapers.filter(
            (p) =>
              p.status === "sent_to_dqc" || p.status === "approved" || p.status === "not_approved",
          );

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Header with Assigned Reviewer Tier */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {reviewerYear} DQC Review Inbox
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                {reviewerYear} DQC Member
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Strictly viewing and evaluating <b>Class {reviewerYear}</b> question papers submitted
              by faculty.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
              {pendingPapers.length}{" "}
              {pendingPapers.length === 1
                ? `${reviewerYear} paper pending`
                : `${reviewerYear} papers pending`}
            </span>
          </div>
        </div>

        {/* Mapped Year Guidance Banner */}
        <div className="mb-6 p-4 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-950">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Assigned Committee: {reviewerYear} DQC</span>
              <p className="text-purple-800 text-[11px] mt-0.5">
                Only question papers mapped to <b>Class / Year: {reviewerYear}</b> are visible to
                your account.
              </p>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-purple-800 shrink-0 bg-white/80 px-2.5 py-1 rounded border border-purple-200">
            Reviewer: {user?.name || user?.email}
          </div>
        </div>

        {/* Filter Controls for Assigned Year */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 border-b border-border text-xs">
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 shrink-0 ${
              statusFilter === "pending"
                ? "bg-purple-700 text-white shadow-2xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Pending Review</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === "pending"
                  ? "bg-white/20 text-white"
                  : "bg-background text-foreground"
              }`}
            >
              {pendingPapers.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("approved")}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shrink-0 ${
              statusFilter === "approved"
                ? "bg-purple-700 text-white shadow-2xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Approved by {reviewerYear} DQC</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === "approved"
                  ? "bg-white/20 text-white"
                  : "bg-background text-foreground"
              }`}
            >
              {approvedPapers.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shrink-0 ${
              statusFilter === "all"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>All {reviewerYear} Submissions</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === "all"
                  ? "bg-background/20 text-background"
                  : "bg-card text-foreground"
              }`}
            >
              {yearPapers.length}
            </span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Loading {reviewerYear} question papers awaiting review…
          </div>
        ) : displayedPapers.length === 0 ? (
          <div className="border border-dashed border-border bg-card rounded-xl p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-semibold text-foreground">
              {statusFilter === "pending"
                ? `No Pending Papers for ${reviewerYear} DQC`
                : `No ${reviewerYear} Papers Found`}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {statusFilter === "pending"
                ? `All question papers submitted for Class ${reviewerYear} have been reviewed. When faculty create ${reviewerYear} papers and send to DQC, they will appear here.`
                : `No submissions currently match this filter in the ${reviewerYear} DQC queue.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {displayedPapers.map((p) => {
              const paperYear = getPaperYear(p);

              return (
                <Link
                  key={p.id}
                  to="/dqc/paper/$id"
                  params={{ id: p.id }}
                  className="block bg-card border border-purple-200/80 rounded-xl p-5 hover:border-purple-600/70 hover:shadow-sm transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base text-foreground">
                          {p.meta?.courseName || "Untitled Course"}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {p.meta?.courseCode || "N/A"}
                        </span>

                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                          {paperYear} DQC Queue
                        </span>

                        {p.status === "approved" ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            ✓ Approved
                          </span>
                        ) : p.status === "not_approved" ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-900 border border-red-200">
                            Revisions Requested
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                            Pending Review
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-foreground/70" />
                          <b>Faculty:</b> {p.meta?.designerName || p.created_by_email}
                        </span>
                        <span>·</span>
                        <span>
                          <b>Class / Year:</b> {p.meta?.className || "SY"} (Sem{" "}
                          {p.meta?.semester || "III"})
                        </span>
                        <span>·</span>
                        <span>
                          <b>Exam:</b> {p.meta?.examName || "Internal Assessment"} (
                          {p.meta?.marks || 20} marks)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-purple-700 font-semibold text-xs shrink-0 self-end sm:self-center">
                      <span>{p.status === "sent_to_dqc" ? "Review Paper" : "View Paper"}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
