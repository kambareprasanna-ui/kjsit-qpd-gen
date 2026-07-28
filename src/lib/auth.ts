import { useEffect, useState } from "react";

export type Role = "designer" | "dqc" | "coord";

export type DemoUser = {
  email: string;
  role: Role;
  name: string;
};

export const DEMO_USERS: DemoUser[] = [
  { email: "designer@somaiya.edu", role: "designer", name: "Paper Designer" },
  { email: "dqc@somaiya.edu", role: "dqc", name: "DQC Member" },
  { email: "examcoord@somaiya.edu", role: "coord", name: "Exam Coordinator" },
];

const KEY = "svv_demo_user";

export function getUser(): DemoUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoUser;
  } catch {
    return null;
  }
}

export function setUser(user: DemoUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("svv_user_change"));
}

export function clearUser() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("svv_user_change"));
}

export function useUser(): DemoUser | null {
  const [user, setU] = useState<DemoUser | null>(null);
  useEffect(() => {
    setU(getUser());
    const h = () => setU(getUser());
    window.addEventListener("svv_user_change", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("svv_user_change", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return user;
}

export function roleHome(role: Role): string {
  return role === "designer" ? "/designer" : role === "dqc" ? "/dqc" : "/coord";
}
