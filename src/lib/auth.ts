import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "designer" | "dqc" | "coord";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export function roleHome(role: Role): string {
  return role === "designer" ? "/designer" : role === "dqc" ? "/dqc" : "/coord";
}

// Restrict signups to the three demo staff accounts.
export const ALLOWED_EMAILS = [
  "designer@somaiya.edu",
  "dqc@somaiya.edu",
  "examcoord@somaiya.edu",
];

async function loadAppUser(): Promise<AppUser | null> {
  const { data: userData } = await supabase.auth.getUser();
  const u = userData.user;
  if (!u) return null;
  const [{ data: role }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", u.id).maybeSingle(),
    supabase.from("profiles").select("name, email").eq("id", u.id).maybeSingle(),
  ]);
  if (!role?.role) return null;
  return {
    id: u.id,
    email: profile?.email ?? u.email ?? "",
    name: profile?.name ?? "",
    role: role.role as Role,
  };
}

export function useUser(): AppUser | null {
  const [user, setUser] = useState<AppUser | null>(null);
  useEffect(() => {
    let mounted = true;
    loadAppUser().then((u) => mounted && setUser(u));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        loadAppUser().then((u) => mounted && setUser(u));
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return user;
}

export async function signOut() {
  await supabase.auth.signOut();
}
