import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { useUser, roleHome } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Staff Sign-in — KJSIT Question Paper Portal" },
      {
        name: "description",
        content:
          "Entry point for KJSIT faculty, DQC members and exam coordinators to sign in and start the question-paper workflow.",
      },
      { property: "og:title", content: "Staff Sign-in — KJSIT Question Paper Portal" },
      {
        property: "og:description",
        content:
          "Entry point for KJSIT faculty, DQC members and exam coordinators to sign in and start the question-paper workflow.",
      },
      { property: "og:url", content: "https://kjsit-qpd-gen.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://kjsit-qpd-gen.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  const user = useUser();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) navigate({ to: roleHome(user.role) });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <Logo size={64} />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Question Paper Portal</h1>
        <p className="text-sm text-muted-foreground mt-2">
          For authorised Somaiya Vidyavihar staff only.
        </p>
        <div className="mt-6">
          <Link
            to="/auth"
            className="inline-block px-5 py-2.5 bg-brand text-brand-foreground rounded-md font-medium hover:bg-brand/90 transition"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
