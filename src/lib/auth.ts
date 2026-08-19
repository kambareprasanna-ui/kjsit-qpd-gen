import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "designer" | "dqc" | "coord" | "hod";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export function roleHome(role: Role): string {
  if (role === "hod") return "/hod";
  if (role === "dqc") return "/dqc";
  if (role === "coord") return "/coord";
  return "/designer";
}

// Any @somaiya.edu address may self-register. Faculty accounts start as designer (Paper Designer).
// HOD can assign or approve faculty to act as DQC Member or Exam Coordinator.
export const EMAIL_DOMAIN = "@somaiya.edu";

export function isAllowedEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(EMAIL_DOMAIN);
}

async function loadAppUser(): Promise<AppUser | null> {
  const { data: userData } = await supabase.auth.getUser();
  const u = userData.user;
  if (!u) return null;
  const [{ data: role }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", u.id).maybeSingle(),
    supabase.from("profiles").select("name, email").eq("id", u.id).maybeSingle(),
  ]);

  const email = (profile?.email ?? u.email ?? "").toLowerCase();
  let userRole: Role = (role?.role as Role) || "designer";

  // Check if HOD by email or assigned role
  if (email.startsWith("hod@") || email.startsWith("hod.") || role?.role === "hod") {
    userRole = "hod";
  }

  return {
    id: u.id,
    email: profile?.email ?? u.email ?? "",
    name: profile?.name ?? (userRole === "hod" ? "Head of Department (HOD)" : "Faculty Member"),
    role: userRole,
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
