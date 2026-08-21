import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useUser, type Role, roleHome } from "@/lib/auth";

export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const user = useUser();
  const navigate = useNavigate();

  const hasAccess =
    user && (user.role === role || user.roles?.includes(role) || user.role === "hod");

  useEffect(() => {
    if (user && !hasAccess) {
      navigate({ to: roleHome(user.role) });
    }
  }, [user, hasAccess, navigate]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
