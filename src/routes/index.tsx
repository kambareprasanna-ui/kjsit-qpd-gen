import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DEMO_USERS, getUser, roleHome, setUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Somaiya Vidyavihar — Question Paper Portal" },
      { name: "description", content: "Somaiya Vidyavihar University question-paper workflow: design, review, and coordinate exam papers." },
      { property: "og:title", content: "Somaiya Vidyavihar — Question Paper Portal" },
      { property: "og:description", content: "Design, review, and coordinate exam papers for Somaiya Vidyavihar University." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>(DEMO_USERS[0].email);

  useEffect(() => {
    const u = getUser();
    if (u) navigate({ to: roleHome(u.role) });
  }, [navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = DEMO_USERS.find((u) => u.email === selected)!;
    setUser(user);
    navigate({ to: roleHome(user.role) });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size={64} />
        </div>
        <div className="bg-card border border-border rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-semibold text-foreground">Question Paper Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in with a demo account to continue.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Demo account</label>
              <div className="space-y-2">
                {DEMO_USERS.map((u) => (
                  <label
                    key={u.email}
                    className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition ${
                      selected === u.email ? "border-brand bg-brand-muted" : "border-border hover:bg-accent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="user"
                      value={u.email}
                      checked={selected === u.email}
                      onChange={() => setSelected(u.email)}
                      className="accent-brand"
                    />
                    <div>
                      <div className="text-sm font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Password</label>
              <input
                type="password"
                defaultValue="demo"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Anything works"
              />
              <p className="text-xs text-muted-foreground mt-1">Demo mode — password is not checked.</p>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-brand text-brand-foreground rounded-md font-medium hover:bg-brand/90 transition"
            >
              Enter portal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
