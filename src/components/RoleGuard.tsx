import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useUser, type Role, roleHome } from "@/lib/auth";

export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const user = useUser();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // wait a tick for user to hydrate from localStorage
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate({ to: "/" });
      return;
    }
    if (user.role !== role) {
      navigate({ to: roleHome(user.role) });
    }
  }, [ready, user, role, navigate]);
  if (!ready || !user || user.role !== role) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
