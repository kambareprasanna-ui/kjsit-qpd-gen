import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Shield,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  UserPlus,
  Search,
  Filter,
  FileText,
  AlertTriangle,
  Award,
  Settings,
  Trash2,
  KeyRound,
  Eye,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { RoleGuard } from "@/components/RoleGuard";
import { AppHeader } from "@/components/AppHeader";
import {
  getAllUsers,
  saveUsers,
  approveUser,
  rejectUser,
  updateUserRoles,
  type Role,
  type DqcYear,
  type UserRecord,
  roleDisplayName,
  EMAIL_DOMAIN,
} from "@/lib/auth";
import { fetchPapers } from "@/lib/papers-db";

export const Route = createFileRoute("/_authenticated/hod/")({
  head: () => ({
    meta: [
      { title: "HOD Dashboard — Somaiya Question Paper Portal" },
      {
        name: "description",
        content:
          "Head of Department control panel for faculty approval, DQC & coordinator role assignment, and paper oversight.",
      },
    ],
  }),
  component: () => (
    <RoleGuard role="hod">
      <HodDashboard />
    </RoleGuard>
  ),
});

type HodTab = "pending" | "directory" | "papers";
type RoleFilter = "all" | "designer" | "dqc" | "coord" | "multi";

function HodDashboard() {
  const [activeTab, setActiveTab] = useState<HodTab>("pending");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [paperFilter, setPaperFilter] = useState<string>("all");

  // Direct Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("Password@123");
  const [newDepartment, setNewDepartment] = useState("Information Technology");
  const [newRoles, setNewRoles] = useState<Role[]>(["designer"]);
  const [newDqcYear, setNewDqcYear] = useState<DqcYear>("SY");
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Roles Modal State
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editRoles, setEditRoles] = useState<Role[]>([]);
  const [editDqcYear, setEditDqcYear] = useState<DqcYear>("SY");

  // Toast / feedback message
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = () => {
    const list = getAllUsers();
    setUsers(list);

    // Fetch department papers
    fetchPapers().then((data) => {
      setPapers(data || []);
    });
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("kjsit_users_updated", handleUpdate);
    return () => window.removeEventListener("kjsit_users_updated", handleUpdate);
  }, []);

  // Approvals & Role Actions
  const handleApprove = (userId: string, customRoles?: Role[], dqcYear?: DqcYear) => {
    approveUser(userId, customRoles, dqcYear);
    loadData();
    showToast("Faculty request approved successfully! User can now sign in.");
  };

  const handleReject = (userId: string) => {
    rejectUser(userId);
    loadData();
    showToast("Faculty access request rejected.", "error");
  };

  const handleToggleRoleInline = (user: UserRecord, role: Role) => {
    if (user.role === "hod" || user.roles.includes("hod")) {
      showToast("Cannot modify the Head of Department role directly.", "error");
      return;
    }
    const current = new Set(user.roles);
    if (current.has(role)) {
      current.delete(role);
    } else {
      current.add(role);
    }
    const updatedRoles = Array.from(current) as Role[];
    updateUserRoles(user.id, updatedRoles, user.dqcYear || "SY");
    loadData();
    showToast(
      `Updated roles for ${user.name || user.email}. (${updatedRoles.map((r) => roleDisplayName(r, user.dqcYear)).join(", ") || "No roles assigned"})`,
    );
  };

  const handleSetUserDqcYear = (user: UserRecord, yr: DqcYear) => {
    updateUserRoles(user.id, user.roles, yr);
    loadData();
    showToast(`Updated DQC assignment for ${user.name || user.email} to ${yr} DQC.`);
  };

  const handleSaveEditRoles = () => {
    if (!editingUser) return;
    if (editRoles.length === 0) {
      showToast("Please select at least one role for this faculty member.", "error");
      return;
    }
    updateUserRoles(editingUser.id, editRoles, editRoles.includes("dqc") ? editDqcYear : undefined);
    setEditingUser(null);
    loadData();
    showToast(`Updated role assignment for ${editingUser.name || editingUser.email}.`);
  };

  const handleAddDirectUser = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const normEmail = newEmail.trim().toLowerCase();
    if (!normEmail.endsWith(EMAIL_DOMAIN)) {
      setAddError(`Email must end with ${EMAIL_DOMAIN}`);
      return;
    }
    if (!newName.trim()) {
      setAddError("Please enter full name.");
      return;
    }
    if (newRoles.length === 0) {
      setAddError("Please select at least one role.");
      return;
    }

    const currentUsers = getAllUsers();
    if (currentUsers.some((u) => u.email.toLowerCase() === normEmail)) {
      setAddError("An account with this email already exists.");
      return;
    }

    const newUser: UserRecord = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: normEmail,
      name: newName.trim(),
      password: newPassword,
      roles: newRoles,
      requestedRoles: newRoles,
      dqcYear: newRoles.includes("dqc") ? newDqcYear : undefined,
      status: "approved",
      department: newDepartment,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: "hod@somaiya.edu",
    };

    currentUsers.push(newUser);
    saveUsers(currentUsers);
    loadData();

    setAddModalOpen(false);
    setNewEmail("");
    setNewName("");
    setNewRoles(["designer"]);
    setNewDqcYear("SY");
    showToast(`Faculty ${newUser.name} added and approved successfully!`);
  };

  const handleDeleteUser = (userId: string, email: string) => {
    if (email === "hod@somaiya.edu") {
      showToast("Cannot delete the HOD master account.", "error");
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${email} from the portal?`)) return;
    const currentUsers = getAllUsers().filter((u) => u.id !== userId);
    saveUsers(currentUsers);
    loadData();
    showToast(`User ${email} removed from system.`);
  };

  // Stats calculation
  const pendingRequests = users.filter((u) => u.status === "pending");
  const approvedUsers = users.filter((u) => u.status === "approved");
  const facultyCount = approvedUsers.filter((u) => u.roles.includes("designer")).length;
  const dqcCount = approvedUsers.filter((u) => u.roles.includes("dqc")).length;
  const coordCount = approvedUsers.filter((u) => u.roles.includes("coord")).length;
  const multiRoleCount = approvedUsers.filter(
    (u) => u.roles.includes("designer") && u.roles.includes("dqc"),
  ).length;

  // Filtered directory list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (roleFilter === "all") return true;
    if (roleFilter === "designer") return u.roles.includes("designer");
    if (roleFilter === "dqc") return u.roles.includes("dqc");
    if (roleFilter === "coord") return u.roles.includes("coord");
    if (roleFilter === "multi") return u.roles.includes("designer") && u.roles.includes("dqc");
    return true;
  });

  // Filtered papers list
  const filteredPapers = papers.filter((p) => {
    if (paperFilter === "all") return true;
    return p.status === paperFilter;
  });

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* Toast feedback */}
        {feedback && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 animate-in slide-in-from-bottom-5 ${
              feedback.type === "success"
                ? "bg-green-50 text-green-900 border-green-200"
                : "bg-red-50 text-red-900 border-red-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-100 text-red-800 border border-red-200">
                <Shield className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">HOD Control Dashboard</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-red-100 text-red-900 border border-red-200">
                Somaiya Department Administration
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1.5">
              Approve faculty registrations, assign DQC &amp; Exam Coordinator roles, and supervise
              question paper quality.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-brand-foreground rounded-lg font-medium text-sm hover:bg-brand/90 transition shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              Add &amp; Approve Faculty
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 my-6">
          <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-medium text-muted-foreground">Pending Approvals</div>
            <div className="text-2xl font-bold text-foreground mt-1 flex items-center gap-2">
              {pendingRequests.length}
              {pendingRequests.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">
              {pendingRequests.length > 0 ? "Requires review" : "All cleared"}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-medium text-muted-foreground">Active Faculty</div>
            <div className="text-2xl font-bold text-foreground mt-1">{facultyCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Teaching faculty</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-medium text-muted-foreground">DQC Members</div>
            <div className="text-2xl font-bold text-foreground mt-1">{dqcCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Reviewers</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-medium text-muted-foreground">Exam Coordinators</div>
            <div className="text-2xl font-bold text-foreground mt-1">{coordCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Printing &amp; final</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-medium text-muted-foreground">Faculty + DQC</div>
            <div className="text-2xl font-bold text-foreground mt-1">{multiRoleCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Dual-role staff</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-medium text-muted-foreground">Total Papers</div>
            <div className="text-2xl font-bold text-foreground mt-1">{papers.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">In department</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border mb-6">
          <button
            onClick={() => setActiveTab("pending")}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === "pending"
                ? "border-brand text-brand font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Approval Requests
            {pendingRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("directory")}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === "directory"
                ? "border-brand text-brand font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            Faculty &amp; Staff Directory ({users.length})
          </button>

          <button
            onClick={() => setActiveTab("papers")}
            className={`pb-3 px-3 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
              activeTab === "papers"
                ? "border-brand text-brand font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            Department Question Papers ({papers.length})
          </button>
        </div>

        {/* TAB 1: PENDING APPROVAL REQUESTS */}
        {activeTab === "pending" && (
          <section className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground">
                  No Pending Access Requests
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                  All faculty registrations have been processed. When staff register with their
                  @somaiya.edu email, their requests will appear here for your review and role
                  assignment.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">HOD Approval Required:</span> The following
                    staff members have registered with their Somaiya institute credentials and set
                    their passwords. They will only be able to log in after you approve and assign
                    their role(s).
                  </div>
                </div>

                <div className="grid gap-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-card border border-border rounded-xl p-5 shadow-2xs hover:border-brand/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base text-foreground">
                            {req.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            Pending Approval
                          </span>
                          <span className="text-xs text-muted-foreground">· {req.department}</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground">
                            {req.email}
                          </span>
                          <span>· Requested on {new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-1 text-xs">
                          <span className="text-muted-foreground font-medium">
                            Requested Role(s):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {req.requestedRoles.map((r) => (
                              <span
                                key={r}
                                className={`px-2 py-0.5 rounded font-medium text-xs ${
                                  r === "dqc"
                                    ? "bg-purple-100 text-purple-900 border border-purple-200"
                                    : "bg-secondary text-secondary-foreground"
                                }`}
                              >
                                {roleDisplayName(r, req.requestedDqcYear || req.dqcYear)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Approval Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() =>
                            handleApprove(
                              req.id,
                              req.requestedRoles,
                              req.requestedDqcYear || req.dqcYear || "SY",
                            )
                          }
                          className="px-3.5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve as Requested
                        </button>

                        <button
                          onClick={() => {
                            setEditingUser(req);
                            setEditRoles(
                              req.requestedRoles.length > 0 ? req.requestedRoles : ["designer"],
                            );
                            setEditDqcYear(req.requestedDqcYear || req.dqcYear || "SY");
                          }}
                          className="px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Assign Custom Roles
                        </button>

                        <button
                          onClick={() => handleReject(req.id)}
                          className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: FACULTY & STAFF DIRECTORY (ROLE DECISION MATRIX) */}
        {activeTab === "directory" && (
          <section className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, @somaiya.edu email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setRoleFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    roleFilter === "all"
                      ? "bg-brand text-brand-foreground font-semibold"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  All ({users.length})
                </button>
                <button
                  onClick={() => setRoleFilter("designer")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    roleFilter === "designer"
                      ? "bg-brand text-brand-foreground font-semibold"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  Faculty ({facultyCount})
                </button>
                <button
                  onClick={() => setRoleFilter("dqc")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    roleFilter === "dqc"
                      ? "bg-brand text-brand-foreground font-semibold"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  DQC Members ({dqcCount})
                </button>
                <button
                  onClick={() => setRoleFilter("coord")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    roleFilter === "coord"
                      ? "bg-brand text-brand-foreground font-semibold"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  Exam Coord ({coordCount})
                </button>
                <button
                  onClick={() => setRoleFilter("multi")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    roleFilter === "multi"
                      ? "bg-brand text-brand-foreground font-semibold"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  Faculty + DQC ({multiRoleCount})
                </button>
              </div>
            </div>

            {/* User Directory Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3.5">Faculty / Staff Member</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Assigned Roles</th>
                      <th className="px-4 py-3.5">Quick Role Assignment (HOD Control)</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((u) => {
                      const isHod = u.email === "hod@somaiya.edu";
                      const isFaculty = u.roles.includes("designer");
                      const isDqc = u.roles.includes("dqc");
                      const isCoord = u.roles.includes("coord");

                      return (
                        <tr key={u.id} className="hover:bg-accent/40 transition">
                          {/* Name & Email */}
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {u.name}
                              {isHod && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-900 border border-red-200">
                                  HOD
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">{u.email}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {u.department}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            {u.status === "approved" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                Approved
                              </span>
                            ) : u.status === "pending" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Pending HOD
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                                <XCircle className="w-3 h-3 text-red-600" />
                                Rejected
                              </span>
                            )}
                          </td>

                          {/* Assigned Roles Badges */}
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1.5">
                              {u.roles.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">None</span>
                              ) : (
                                u.roles.map((r) => (
                                  <span
                                    key={r}
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      r === "hod"
                                        ? "bg-red-100 text-red-800 border border-red-200 font-semibold"
                                        : r === "dqc"
                                          ? "bg-purple-100 text-purple-900 border border-purple-200 font-semibold"
                                          : r === "coord"
                                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                    }`}
                                  >
                                    {roleDisplayName(r, u.dqcYear)}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>

                          {/* Quick Role Toggles for HOD */}
                          <td className="px-4 py-3.5">
                            {!isHod ? (
                              <div className="flex items-center gap-3 text-xs flex-wrap">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isFaculty}
                                    onChange={() => handleToggleRoleInline(u, "designer")}
                                    className="rounded border-border text-brand focus:ring-brand"
                                  />
                                  <span>Faculty</span>
                                </label>

                                <div className="inline-flex items-center gap-1.5">
                                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isDqc}
                                      onChange={() => handleToggleRoleInline(u, "dqc")}
                                      className="rounded border-border text-purple-600 focus:ring-purple-600"
                                    />
                                    <span className="text-purple-900 font-medium">DQC</span>
                                  </label>
                                  {isDqc && (
                                    <div className="inline-flex items-center rounded bg-purple-100 border border-purple-200 p-0.5 text-[10px]">
                                      {(["SY", "TY", "LY"] as DqcYear[]).map((yr) => (
                                        <button
                                          key={yr}
                                          type="button"
                                          onClick={() => handleSetUserDqcYear(u, yr)}
                                          className={`px-1.5 py-0.5 rounded font-bold transition ${
                                            (u.dqcYear || "SY") === yr
                                              ? "bg-purple-700 text-white shadow-2xs"
                                              : "text-purple-900 hover:bg-purple-200/60"
                                          }`}
                                          title={`Assign ${yr} DQC`}
                                        >
                                          {yr}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isCoord}
                                    onChange={() => handleToggleRoleInline(u, "coord")}
                                    className="rounded border-border text-blue-600 focus:ring-blue-600"
                                  />
                                  <span className="text-blue-900 font-medium">Exam Coord</span>
                                </label>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Department Lead</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {u.status === "pending" ? (
                                <button
                                  onClick={() =>
                                    handleApprove(
                                      u.id,
                                      u.requestedRoles,
                                      u.requestedDqcYear || u.dqcYear || "SY",
                                    )
                                  }
                                  className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 transition"
                                  title="Approve User"
                                >
                                  Approve
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingUser(u);
                                    setEditRoles(u.roles);
                                    setEditDqcYear(u.dqcYear || u.requestedDqcYear || "SY");
                                  }}
                                  className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition"
                                  title="Edit Roles"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                              )}

                              {!isHod && (
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  className="p-1.5 hover:bg-red-50 rounded text-red-600 transition"
                                  title="Remove User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: DEPARTMENT QUESTION PAPERS OVERSIGHT */}
        {activeTab === "papers" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
              <div className="text-sm font-semibold text-foreground">
                All Department Question Papers ({filteredPapers.length})
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Status Filter:</span>
                <select
                  value={paperFilter}
                  onChange={(e) => setPaperFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none"
                >
                  <option value="all">All Papers</option>
                  <option value="draft">Drafts</option>
                  <option value="sent_to_dqc">Sent to DQC (Under Review)</option>
                  <option value="approved">Approved (Exam Ready)</option>
                  <option value="not_approved">Revision Requested</option>
                </select>
              </div>
            </div>

            {filteredPapers.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
                No question papers found matching this criteria.
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredPapers.map((p) => (
                  <div
                    key={p.id}
                    className="bg-card border border-border rounded-xl p-5 shadow-2xs hover:border-brand/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base text-foreground">
                          {p.meta?.courseName || "Untitled Subject"}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {p.meta?.courseCode || "N/A"}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            p.status === "approved"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : p.status === "sent_to_dqc"
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : p.status === "not_approved"
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {p.status === "approved"
                            ? "DQC Approved"
                            : p.status === "sent_to_dqc"
                              ? "Under DQC Review"
                              : p.status === "not_approved"
                                ? "Revision Requested"
                                : "Draft"}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-1">
                        <span>
                          <b>Faculty:</b> {p.created_by_email || "N/A"}
                        </span>
                        <span>·</span>
                        <span>
                          <b>Class:</b> {p.meta?.className} (Sem {p.meta?.semester})
                        </span>
                        <span>·</span>
                        <span>
                          <b>Marks:</b> {p.meta?.marks} marks
                        </span>
                        <span>·</span>
                        <span>
                          <b>Created:</b> {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to="/coord/paper/$id"
                        params={{ id: p.id }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:bg-accent transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Paper
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* MODAL: DIRECT ADD & APPROVE FACULTY */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand" />
                <h3 className="text-lg font-semibold text-foreground">
                  Add &amp; Pre-Approve Faculty
                </h3>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDirectUser} className="space-y-4 mt-4">
              {addError && <div className="text-sm text-destructive">{addError}</div>}

              <div>
                <label className="text-xs font-medium block mb-1 text-foreground">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Rajesh Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1 text-foreground">
                  Somaiya Institute Email ({EMAIL_DOMAIN})
                </label>
                <input
                  type="email"
                  required
                  placeholder={`facultyname${EMAIL_DOMAIN}`}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1 text-foreground">Department</label>
                <select
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Information Technology">Information Technology</option>
                  <option value="Computer Engineering">Computer Engineering</option>
                  <option value="Electronics & Telecommunication">
                    Electronics &amp; Telecommunication
                  </option>
                  <option value="Artificial Intelligence & Data Science">
                    Artificial Intelligence &amp; Data Science
                  </option>
                  <option value="Basic Science & Humanities">Basic Science &amp; Humanities</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1 text-foreground">
                  Initial Password
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-2 text-foreground">
                  Select Role(s) to Assign (Can select multiple):
                </label>
                <div className="space-y-2 bg-muted/40 p-3 rounded-lg border border-border">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRoles.includes("designer")}
                      onChange={(e) => {
                        if (e.target.checked) setNewRoles([...newRoles, "designer"]);
                        else setNewRoles(newRoles.filter((r) => r !== "designer"));
                      }}
                      className="rounded border-border text-brand focus:ring-brand"
                    />
                    <span>Faculty</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRoles.includes("dqc")}
                      onChange={(e) => {
                        if (e.target.checked) setNewRoles([...newRoles, "dqc"]);
                        else setNewRoles(newRoles.filter((r) => r !== "dqc"));
                      }}
                      className="rounded border-border text-purple-600 focus:ring-purple-600"
                    />
                    <span className="font-medium text-purple-900">DQC Member (Reviewer)</span>
                  </label>

                  {newRoles.includes("dqc") && (
                    <div className="ml-6 p-2.5 rounded-lg bg-purple-50 border border-purple-200 space-y-1.5 animate-in fade-in">
                      <span className="text-[11px] font-semibold text-purple-950 block">
                        Select DQC Year / Class:
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {(["SY", "TY", "LY"] as DqcYear[]).map((yr) => (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => setNewDqcYear(yr)}
                            className={`py-1.5 px-2 rounded-md text-xs font-semibold border text-center transition ${
                              newDqcYear === yr
                                ? "bg-purple-700 text-white border-purple-700 shadow-2xs"
                                : "bg-white text-purple-900 border-purple-300 hover:bg-purple-100"
                            }`}
                          >
                            {yr} DQC
                            <div className="text-[9px] font-normal opacity-85">
                              {yr === "SY" ? "2nd Year" : yr === "TY" ? "3rd Year" : "Final Year"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRoles.includes("coord")}
                      onChange={(e) => {
                        if (e.target.checked) setNewRoles([...newRoles, "coord"]);
                        else setNewRoles(newRoles.filter((r) => r !== "coord"));
                      }}
                      className="rounded border-border text-blue-600 focus:ring-blue-600"
                    />
                    <span className="font-medium text-blue-900">
                      Exam Coordinator (Printing &amp; Final)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand text-brand-foreground rounded-lg text-sm font-semibold hover:bg-brand/90 transition"
                >
                  Add &amp; Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ROLES FOR EXISTING USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Assign Roles</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingUser.name} ({editingUser.email})
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <p className="text-xs text-muted-foreground">
                Select which duties this faculty member is authorized to perform in the Question
                Paper Portal. Users can hold multiple roles simultaneously (e.g. Faculty + DQC
                member).
              </p>

              <div className="space-y-2 bg-muted/40 p-4 rounded-lg border border-border">
                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRoles.includes("designer")}
                    onChange={(e) => {
                      if (e.target.checked) setEditRoles([...editRoles, "designer"]);
                      else setEditRoles(editRoles.filter((r) => r !== "designer"));
                    }}
                    className="rounded border-border text-brand focus:ring-brand w-4 h-4"
                  />
                  <div>
                    <div className="font-semibold text-foreground">Faculty</div>
                    <div className="text-xs text-muted-foreground">
                      Create, draft, and submit question papers
                    </div>
                  </div>
                </label>

                <div className="border-t border-border my-2" />

                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRoles.includes("dqc")}
                    onChange={(e) => {
                      if (e.target.checked) setEditRoles([...editRoles, "dqc"]);
                      else setEditRoles(editRoles.filter((r) => r !== "dqc"));
                    }}
                    className="rounded border-border text-purple-600 focus:ring-purple-600 w-4 h-4"
                  />
                  <div>
                    <div className="font-semibold text-purple-950">DQC Member (Reviewer)</div>
                    <div className="text-xs text-muted-foreground">
                      Review submissions, check Bloom levels, approve/reject
                    </div>
                  </div>
                </label>

                {editRoles.includes("dqc") && (
                  <div className="ml-6 p-2.5 rounded-lg bg-purple-50 border border-purple-200 space-y-1.5 animate-in fade-in">
                    <span className="text-xs font-semibold text-purple-950 block">
                      Select Assigned DQC Year:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(["SY", "TY", "LY"] as DqcYear[]).map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setEditDqcYear(yr)}
                          className={`py-1.5 px-2 rounded-md text-xs font-semibold border text-center transition ${
                            editDqcYear === yr
                              ? "bg-purple-700 text-white border-purple-700 shadow-2xs"
                              : "bg-white text-purple-900 border-purple-300 hover:bg-purple-100"
                          }`}
                        >
                          {yr} DQC
                          <div className="text-[9px] font-normal opacity-85">
                            {yr === "SY" ? "2nd Year" : yr === "TY" ? "3rd Year" : "Final Year"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-border my-2" />

                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRoles.includes("coord")}
                    onChange={(e) => {
                      if (e.target.checked) setEditRoles([...editRoles, "coord"]);
                      else setEditRoles(editRoles.filter((r) => r !== "coord"));
                    }}
                    className="rounded border-border text-blue-600 focus:ring-blue-600 w-4 h-4"
                  />
                  <div>
                    <div className="font-semibold text-blue-950">Exam Coordinator</div>
                    <div className="text-xs text-muted-foreground">
                      Access final approved papers for exam printing
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditRoles}
                  className="px-4 py-2 bg-brand text-brand-foreground rounded-lg text-sm font-semibold hover:bg-brand/90 transition"
                >
                  Save Roles &amp; Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
