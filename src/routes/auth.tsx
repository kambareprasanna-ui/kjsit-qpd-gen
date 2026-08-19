import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { EMAIL_DOMAIN, isAllowedEmail, roleHome, useUser } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — KJSIT Question Paper Portal" },
      {
        name: "description",
        content:
          "Sign in or register with your @somaiya.edu address to use the question-paper portal.",
      },
      { property: "og:title", content: "Sign in — KJSIT Question Paper Portal" },
      {
        property: "og:description",
        content: "Faculty, DQC and Exam Coordinator access to the Somaiya question-paper portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const user = useUser();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: roleHome(user.role) });
  }, [user, navigate]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const emailNorm = email.trim().toLowerCase();
    if (!isAllowedEmail(emailNorm)) {
      setError(`Please use your institute email ending in ${EMAIL_DOMAIN}.`);
      return;
    }
    if (mode !== "forgot" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(emailNorm, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("If that account exists, a password reset link has been emailed to you.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: emailNorm,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { name: name.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo("Account created. Check your inbox to confirm your email, then sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailNorm,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const heading =
    mode === "signin"
      ? "Sign in"
      : mode === "signup"
        ? "Create your account"
        : "Reset your password";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <main className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size={64} />
        </div>
        <div className="bg-card border border-border rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-semibold text-foreground">{heading}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "forgot"
              ? "We'll email you a link to set a new password."
              : `Open to all staff with an ${EMAIL_DOMAIN} email address.`}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium block mb-2" htmlFor="name">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Prof. A. Sharma"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium block mb-2" htmlFor="email">
                Institute email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={`yourname${EMAIL_DOMAIN}`}
              />
            </div>
            {mode !== "forgot" && (
              <div>
                <label className="text-sm font-medium block mb-2" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="At least 8 characters"
                />
              </div>
            )}
            {error && <div className="text-sm text-destructive">{error}</div>}
            {info && <div className="text-sm text-muted-foreground">{info}</div>}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-brand text-brand-foreground rounded-md font-medium hover:bg-brand/90 transition disabled:opacity-60"
            >
              {busy
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
            </button>
          </form>

          <div className="mt-5 space-y-2 text-center">
            {mode !== "signin" && (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="block w-full text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Already registered? Sign in
              </button>
            )}
            {mode !== "signup" && (
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="block w-full text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              >
                New here? Register an account
              </button>
            )}
            {mode !== "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="block w-full text-sm text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Forgot your password?
              </button>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border text-[11px] text-muted-foreground text-center space-y-1">
            <p>
              <strong className="text-foreground">HOD Login:</strong> Use your designated{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">hod{EMAIL_DOMAIN}</code> account.
            </p>
            <p>
              Faculty members self-register as Paper Designers. DQC Reviewer and Exam Coordinator roles are activated after HOD approval.
            </p>
          </div>
        </div>
      </main>
      <div className="mt-6 inline-flex flex-col items-center rounded-[2rem] border border-red-100/50 bg-red-50/30 px-8 py-5 shadow-[0_8px_30px_rgba(153,27,27,0.05)] backdrop-blur-xl">
        <span className="mb-3 text-[9px] font-bold uppercase tracking-[0.25em] text-red-900/50">
          Designed &amp; Developed By
        </span>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
          <div className="flex flex-col items-center">
            <h4 className="font-serif text-[18px] sm:text-[19px] font-semibold leading-none text-red-950">
              Priya Thombare
            </h4>
          </div>
          <div className="hidden sm:block h-6 w-px bg-gradient-to-b from-transparent via-red-200/70 to-transparent" />
          <div className="flex flex-col items-center">
            <h4 className="font-serif text-[18px] sm:text-[19px] font-semibold leading-none text-red-950">
              Vaishnavi Shinde
            </h4>
          </div>
          <div className="hidden sm:block h-6 w-px bg-gradient-to-b from-transparent via-red-200/70 to-transparent" />
          <div className="flex flex-col items-center">
            <h4 className="font-serif text-[18px] sm:text-[19px] font-semibold leading-none text-red-950">
              Samiksha Sontakke
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}
