import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useUser, type Role, roleHome } from "@/lib/auth";

export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== role) {
      navigate({ to: roleHome(user.role) });
    }
  }, [user, role, navigate]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (user.role !== role) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Redirecting…
      </div>
    );
  }
  return <>{children}</>;
}
