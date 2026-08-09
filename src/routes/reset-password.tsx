import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — KJSIT Question Paper Portal" },
      { name: "description", content: "Choose a new password for your question-paper portal account." },
      { property: "og:title", content: "Set a new password — KJSIT Question Paper Portal" },
      { property: "og:description", content: "Choose a new password for your portal account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setReady(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/auth" }), 1500);
    } catch (err: any) {
      setError(err?.message ?? "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <main className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size={64} />
        </div>
        <div className="bg-card border border-border rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-semibold text-foreground">Set a new password</h1>
          {!ready && (
            <p className="text-sm text-muted-foreground mt-2">
              Open this page from the reset link in your email. If you arrived here directly, request a
              new link from the sign-in page.
            </p>
          )}
          {done ? (
            <p className="text-sm text-muted-foreground mt-4">
              Password updated. Taking you to sign in…
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2" htmlFor="new-password">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2" htmlFor="confirm-password">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {error && <div className="text-sm text-destructive">{error}</div>}
              <button
                type="submit"
                disabled={busy || !ready}
                className="w-full py-2.5 bg-brand text-brand-foreground rounded-md font-medium hover:bg-brand/90 transition disabled:opacity-60"
              >
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
