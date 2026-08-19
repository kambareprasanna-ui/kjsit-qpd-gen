import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  ShieldCheck,
  Award,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Eye,
  Sliders,
  ChevronRight,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import {
  getHodDashboardFn,
  assignFacultyRoleFn,
  dismissRoleRequestFn,
  type StaffMember,
  type RoleRequest,
  type HodDashboardData,
} from "@/lib/hod.functions";

export const Route = createFileRoute("/_authenticated/hod/")({
  head: () => ({
    meta: [
      { title: "HOD Portal — Somaiya Question Paper System" },
      {
        name: "description",
        content:
          "Head of Department administrative portal for managing faculty roles, approving DQC members and Exam Coordinators, and overseeing question papers.",
      },
    ],
  }),
  component: () => (
    <RoleGuard role="hod">
      <HodDashboard />
    </RoleGuard>
  ),
});

function HodDashboard() {
  const [data, setData] = useState<HodDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"roles" | "papers">("roles");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getHodDashboardFn();
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load HOD dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignRole = async (
    targetUserId: string,
    targetEmail: string,
    newRole: "designer" | "dqc" | "coord" | "hod",
    notificationIdToDelete?: string,
  ) => {
    setUpdatingUserId(targetUserId);
    setActionSuccess(null);
    try {
      const res = await assignFacultyRoleFn({
        data: {
          targetUserId,
          targetEmail,
          newRole,
          notificationIdToDelete,
        },
      });
      setActionSuccess(res.message);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.message || "Could not update role.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDismissRequest = async (notificationId: string, targetEmail: string) => {
    if (!confirm(`Dismiss role request from ${targetEmail}?`)) return;
    try {
      await dismissRoleRequestFn({
        data: {
          notificationId,
          targetEmail,
          reason: "Request not approved at this time.",
        },
      });
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Could not dismiss request.");
    }
  };

  const filteredStaff = (data?.staff || []).filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-background pb-12">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* HOD Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-900">
                Department Head Administration
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">
              Faculty &amp; Role Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Designate and approve which faculty members serve as DQC Reviewers or Exam
              Coordinators.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-border bg-card rounded-md text-sm font-medium hover:bg-accent transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {actionSuccess && (
          <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Users className="w-4 h-4 text-blue-600" /> Total Staff
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">
              {loading ? "…" : data?.stats.totalStaff || 0}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <UserCheck className="w-4 h-4 text-slate-600" /> Faculty
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">
              {loading ? "…" : data?.stats.facultyCount || 0}
            </div>
          </div>

          <div className="bg-card border border-emerald-200 bg-emerald-50/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> DQC Members
            </div>
            <div className="text-2xl font-bold text-emerald-950 mt-2">
              {loading ? "…" : data?.stats.dqcCount || 0}
            </div>
          </div>

          <div className="bg-card border border-amber-200 bg-amber-50/20 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
              <Award className="w-4 h-4 text-amber-600" /> Coordinators
            </div>
            <div className="text-2xl font-bold text-amber-950 mt-2">
              {loading ? "…" : data?.stats.coordCount || 0}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Clock className="w-4 h-4 text-indigo-600" /> In Review
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">
              {loading ? "…" : data?.stats.pendingDqcPapers || 0}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Approved
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">
              {loading ? "…" : data?.stats.approvedPapers || 0}
            </div>
          </div>
        </div>

        {/* Pending Role Approval Requests (If Any) */}
        {data && data.requests && data.requests.length > 0 && (
          <div className="mt-8 bg-amber-50/50 border border-amber-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 font-semibold text-base mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span>Pending Role Approval Requests ({data.requests.length})</span>
            </div>
            <p className="text-xs text-amber-800/80 mb-4">
              The following faculty members have requested appointment as DQC Member or Exam
              Coordinator.
            </p>

            <div className="grid gap-3">
              {data.requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-card border border-amber-200/80 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">
                        {req.facultyName}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({req.facultyEmail})
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                        Requested: {req.requestedRole === "dqc" ? "DQC Member" : "Exam Coordinator"}
                      </span>
                    </div>
                    {req.reason && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">
                        &ldquo;{req.reason}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        handleAssignRole(req.userId, req.facultyEmail, req.requestedRole, req.id)
                      }
                      disabled={updatingUserId === req.userId}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-medium hover:bg-emerald-700 transition cursor-pointer"
                    >
                      Approve as {req.requestedRole === "dqc" ? "DQC" : "Coordinator"}
                    </button>
                    <button
                      onClick={() => handleDismissRequest(req.id, req.facultyEmail)}
                      className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-accent rounded-md text-xs font-medium transition cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mt-8 flex gap-2 border-b border-border pb-3">
          <button
            onClick={() => setActiveTab("roles")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
              activeTab === "roles"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Users className="w-4 h-4" /> Faculty Role Management
          </button>
          <button
            onClick={() => setActiveTab("papers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
              activeTab === "papers"
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <FileText className="w-4 h-4" /> Department Papers ({data?.papers.length || 0})
          </button>
        </div>

        {/* Tab 1: Faculty Role Management */}
        {activeTab === "roles" && (
          <div className="mt-6 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search faculty by name or email…"
                  className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Sliders className="w-4 h-4 text-muted-foreground" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Roles ({data?.staff.length || 0})</option>
                  <option value="designer">Faculty Only ({data?.stats.facultyCount || 0})</option>
                  <option value="dqc">DQC Members ({data?.stats.dqcCount || 0})</option>
                  <option value="coord">Exam Coordinators ({data?.stats.coordCount || 0})</option>
                  <option value="hod">HOD</option>
                </select>
              </div>
            </div>

            {/* Staff Directory Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                      <th className="py-3.5 px-4 sm:px-6">Staff Member</th>
                      <th className="py-3.5 px-4">Current Role</th>
                      <th className="py-3.5 px-4 text-center">Authored Papers</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Appoint / Change Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-muted-foreground">
                          Loading faculty directory…
                        </td>
                      </tr>
                    ) : filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-muted-foreground">
                          No staff found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((member) => {
                        const isSelfHod = member.role === "hod" || member.email.startsWith("hod@");
                        const isUpdating = updatingUserId === member.id;

                        return (
                          <tr key={member.id} className="hover:bg-accent/40 transition">
                            <td className="py-4 px-4 sm:px-6">
                              <div className="font-semibold text-foreground">{member.name}</div>
                              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                {member.email}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              {member.role === "hod" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-900 border border-red-200">
                                  HOD (Admin)
                                </span>
                              ) : member.role === "dqc" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> DQC
                                  Member
                                </span>
                              ) : member.role === "coord" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                                  <Award className="w-3.5 h-3.5 text-amber-700" /> Exam Coordinator
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                  <UserCheck className="w-3.5 h-3.5 text-slate-600" /> Faculty
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-4 text-center font-medium">
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-muted text-xs">
                                {member.papersCount}
                              </span>
                            </td>

                            <td className="py-4 px-4 sm:px-6 text-right">
                              {isSelfHod ? (
                                <span className="text-xs text-muted-foreground italic">
                                  Primary Head of Dept
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <button
                                    onClick={() =>
                                      handleAssignRole(member.id, member.email, "designer")
                                    }
                                    disabled={member.role === "designer" || isUpdating}
                                    title="Set as standard Faculty / Paper Designer"
                                    className={`px-2.5 py-1 text-xs rounded border transition cursor-pointer ${
                                      member.role === "designer"
                                        ? "bg-slate-200 text-slate-500 border-slate-200 cursor-default opacity-50"
                                        : "border-border hover:bg-accent text-foreground"
                                    }`}
                                  >
                                    Faculty
                                  </button>

                                  <button
                                    onClick={() => handleAssignRole(member.id, member.email, "dqc")}
                                    disabled={member.role === "dqc" || isUpdating}
                                    title="Approve / Designate as DQC Member"
                                    className={`px-2.5 py-1 text-xs rounded border font-medium transition cursor-pointer ${
                                      member.role === "dqc"
                                        ? "bg-emerald-600 text-white border-emerald-600 cursor-default shadow-xs"
                                        : "border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                                    }`}
                                  >
                                    + Make DQC
                                  </button>

                                  <button
                                    onClick={() =>
                                      handleAssignRole(member.id, member.email, "coord")
                                    }
                                    disabled={member.role === "coord" || isUpdating}
                                    title="Approve / Designate as Exam Coordinator"
                                    className={`px-2.5 py-1 text-xs rounded border font-medium transition cursor-pointer ${
                                      member.role === "coord"
                                        ? "bg-amber-600 text-white border-amber-600 cursor-default shadow-xs"
                                        : "border-amber-200 text-amber-800 hover:bg-amber-50"
                                    }`}
                                  >
                                    + Make Coord
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Department Question Papers */}
        {activeTab === "papers" && (
          <div className="mt-6 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-foreground text-base">
                Departmental Question Papers
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Full department oversight of question paper drafts, DQC review cycles, and finalized
                approved papers.
              </p>
            </div>

            <div className="grid gap-3">
              {(data?.papers || []).length === 0 ? (
                <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                  No question papers found in the department yet.
                </div>
              ) : (
                (data?.papers || []).map((p) => {
                  const meta = p.meta || {};
                  return (
                    <div
                      key={p.id}
                      className="bg-card border border-border rounded-xl p-5 hover:border-brand/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-base">
                            {meta.courseName || "Untitled Course"}
                          </span>
                          <span className="text-xs text-muted-foreground font-normal">
                            ({meta.courseCode || "N/A"})
                          </span>
                          {p.status === "approved" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Approved
                            </span>
                          ) : p.status === "sent_to_dqc" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                              <Clock className="w-3 h-3 text-blue-700" /> In DQC Review
                            </span>
                          ) : p.status === "not_approved" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-900">
                              Changes Requested
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              Draft
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          <span>
                            <b>Faculty Author:</b> {p.created_by_email || "Unknown"}
                          </span>
                          <span>·</span>
                          <span>
                            <b>Marks:</b> {meta.marks || 20}
                          </span>
                          <span>·</span>
                          <span>
                            <b>Class:</b> {meta.className || "N/A"} (Sem {meta.semester || "N/A"})
                          </span>
                          {meta.examName && (
                            <>
                              <span>·</span>
                              <span>
                                <b>Exam:</b> {meta.examName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {p.status === "approved" && (
                          <Link
                            to="/coord/paper/$id"
                            params={{ id: p.id }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-brand-foreground rounded-md text-xs font-medium hover:bg-brand/90 transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Final Paper
                          </Link>
                        )}
                        {p.status === "sent_to_dqc" && (
                          <Link
                            to="/dqc/paper/$id"
                            params={{ id: p.id }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card rounded-md text-xs font-medium hover:bg-accent transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> Inspect Review
                          </Link>
                        )}
                        {p.status === "draft" && (
                          <Link
                            to="/designer/paper/$id"
                            params={{ id: p.id }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border bg-card rounded-md text-xs font-medium hover:bg-accent transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Draft
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
