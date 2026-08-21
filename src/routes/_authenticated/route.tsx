// Integration-managed protected layout: gates every child route by requiring
// an active session; unauthenticated visitors are redirected to /auth.
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getActiveSession, loadAppUser } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    let user = getActiveSession();
    if (!user) {
      user = await loadAppUser();
    }
    if (!user) {
      throw redirect({ to: "/auth" });
    }
    return { user };
  },
  component: () => <Outlet />,
});
