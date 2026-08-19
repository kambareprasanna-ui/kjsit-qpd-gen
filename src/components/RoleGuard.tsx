import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useUser, type Role, roleHome } from "@/lib/auth";

export function RoleGuard({
  role,
  children,
}: {
  role: Role | Role[];
  children: ReactNode;
}) {
  const user = useUser();
  const navigate = useNavigate();

  const allowedRoles = Array.isArray(role) ? role : [role];
  const isAllowed = user ? allowedRoles.includes(user.role) : false;

  useEffect(() => {
    if (user && !isAllowed) {
      navigate({ to: roleHome(user.role) });
    }
  }, [user, isAllowed, navigate]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Redirecting…
      </div>
    );
  }
  return <>{children}</>;
}
