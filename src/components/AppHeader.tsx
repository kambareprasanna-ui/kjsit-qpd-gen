import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { roleHome, signOut, useUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const user = useUser();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_email", user.email)
        .eq("read", false);
      if (mounted) setUnread(count ?? 0);
    };
    load();
    const interval = setInterval(load, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user]);

  if (!user) return null;

  const roleLabel =
    user.role === "designer"
      ? "Paper Designer"
      : user.role === "dqc"
        ? "DQC Member"
        : "Exam Coordinator";

  return (
    <header className="border-b border-border bg-card sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to={roleHome(user.role)} className="flex items-center">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          {user.role === "designer" && (
            <Link
              to="/designer"
              search={{ tab: "not_approved" } as any}
              className="relative p-2 rounded-md hover:bg-accent transition"
            >
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
                  {unread}
                </span>
              )}
            </Link>
          )}
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium">{roleLabel}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-md hover:bg-accent transition"
              aria-label="Account menu"
            >
              <LogOut className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-md shadow-lg p-2 z-50">
                <div className="px-2 py-2 text-xs text-muted-foreground">
                  Signed in as
                  <div className="text-sm font-medium text-foreground">{user.email}</div>
                </div>
                <div className="border-t border-border my-1" />
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
                    navigate({ to: "/auth", replace: true });
                  }}
                  className="w-full text-left px-2 py-2 rounded-md text-sm text-destructive hover:bg-accent flex items-center gap-2"
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
