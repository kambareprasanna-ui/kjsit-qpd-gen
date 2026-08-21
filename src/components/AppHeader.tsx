import { Link, useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  Bell,
  Shield,
  ArrowLeftRight,
  UserCheck,
  Users,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import {
  roleHome,
  roleDisplayName,
  signOut,
  useUser,
  switchActiveRole,
  getAllUsers,
  type Role,
} from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const user = useUser();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadCounts = async () => {
      // If designer, check unread notifications
      if (user.role === "designer") {
        try {
          const { count } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("recipient_email", user.email)
            .eq("read", false);
          setUnread(count ?? 0);
        } catch {
          // Ignore
        }
      }

      // If HOD, count pending approval requests
      if (user.role === "hod") {
        const users = getAllUsers();
        const pending = users.filter((u) => u.status === "pending").length;
        setPendingRequestsCount(pending);
      }
    };

    loadCounts();
    const interval = setInterval(loadCounts, 10000);

    const handleUsersUpdate = () => loadCounts();
    window.addEventListener("kjsit_users_updated", handleUsersUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("kjsit_users_updated", handleUsersUpdate);
    };
  }, [user]);

  if (!user) return null;

  const handleRoleSwitch = (newRole: Role) => {
    switchActiveRole(newRole);
    setRoleMenuOpen(false);
    navigate({ to: roleHome(newRole) });
  };

  const hasMultipleRoles = user.roles && user.roles.length > 1;

  return (
    <header className="border-b border-border bg-card sticky top-0 z-40 no-print shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={roleHome(user.role)} className="flex items-center">
            <Logo />
          </Link>

          {user.role === "hod" && (
            <Link
              to="/hod"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-900 border border-red-200 hover:bg-red-200 transition"
            >
              <Shield className="w-3.5 h-3.5" />
              HOD Portal
              {pendingRequestsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px] font-bold">
                  {pendingRequestsCount} pending
                </span>
              )}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Multi-role Switcher if user has more than 1 approved role */}
          {hasMultipleRoles && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-accent transition"
                title="Switch between your approved roles"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-brand" />
                <span className="text-muted-foreground hidden sm:inline">Role:</span>
                <span className="font-semibold text-foreground">
                  {roleDisplayName(user.role, user.dqcYear)}
                </span>
                <span className="text-xs text-muted-foreground">▾</span>
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-popover border border-border rounded-lg shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Switch Active Role
                  </div>
                  {user.roles.map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleSwitch(r)}
                      className={`w-full text-left px-2.5 py-2 rounded-md text-xs font-medium flex items-center justify-between transition ${
                        user.role === r
                          ? "bg-brand/10 text-brand font-semibold"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <span>{roleDisplayName(r, user.dqcYear)}</span>
                      {user.role === r && <CheckCircle className="w-3.5 h-3.5 text-brand" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HOD pending request icon indicator */}
          {user.role === "hod" && (
            <Link
              to="/hod"
              className="relative p-2 rounded-md hover:bg-accent transition text-muted-foreground hover:text-foreground"
              title="HOD Access Requests & Staff Management"
            >
              <Users className="w-5 h-5" />
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">
                  {pendingRequestsCount}
                </span>
              )}
            </Link>
          )}

          {/* Notifications for Faculty */}
          {user.role === "designer" && (
            <Link
              to="/designer"
              search={{ tab: "not_approved" } as any}
              aria-label="Notifications"
              className="relative p-2 rounded-md hover:bg-accent transition text-muted-foreground hover:text-foreground"
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
                  {unread}
                </span>
              )}
            </Link>
          )}

          {/* User info */}
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-foreground flex items-center justify-end gap-1.5">
              <span>{user.name || user.email}</span>
              {user.role === "hod" && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-200">
                  HOD
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {roleDisplayName(user.role, user.dqcYear)} · {user.email}
            </div>
          </div>

          {/* Account & Logout Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-md hover:bg-accent transition text-muted-foreground hover:text-foreground"
              aria-label="Account menu"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg p-2 z-50">
                <div className="px-3 py-2">
                  <div className="text-xs text-muted-foreground">Signed in as</div>
                  <div className="text-sm font-semibold text-foreground truncate">
                    {user.name || user.email}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-secondary-foreground">
                    <UserCheck className="w-3 h-3" />
                    {roleDisplayName(user.role, user.dqcYear)}
                  </div>
                </div>

                {user.role === "hod" && (
                  <>
                    <div className="border-t border-border my-1" />
                    <Link
                      to="/hod"
                      onClick={() => setMenuOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4 text-red-600" />
                      HOD Control Dashboard
                    </Link>
                  </>
                )}

                <div className="border-t border-border my-1" />
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                    navigate({ to: "/auth", replace: true });
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
