import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "designer" | "dqc" | "coord" | "hod";
export type DqcYear = "SY" | "TY" | "LY";
export type AccountStatus = "approved" | "pending" | "rejected";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: Role; // current active role
  roles: Role[]; // all approved roles (e.g. ['designer', 'dqc'])
  dqcYear?: DqcYear; // assigned year level if user is DQC (SY, TY, LY)
  requestedDqcYear?: DqcYear;
  status: AccountStatus;
  requestedRoles?: Role[];
  department?: string;
  createdAt?: string;
  lastLogin?: string;
};

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  password?: string;
  roles: Role[];
  requestedRoles: Role[];
  dqcYear?: DqcYear;
  requestedDqcYear?: DqcYear;
  status: AccountStatus;
  department: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  lastLogin?: string;
};

export const EMAIL_DOMAIN = "@somaiya.edu";

export const HOD_EMAIL = "hod@somaiya.edu";
export const HOD_DEFAULT_PASSWORD = "HodSomaiya@2026";

const USERS_STORAGE_KEY = "kjsit_portal_users_directory_v2";
const ACTIVE_SESSION_KEY = "kjsit_portal_active_session_v2";

export function roleHome(role: Role): string {
  switch (role) {
    case "hod":
      return "/hod";
    case "designer":
      return "/designer";
    case "dqc":
      return "/dqc";
    case "coord":
      return "/coord";
    default:
      return "/designer";
  }
}

export function roleDisplayName(role: Role, dqcYear?: DqcYear): string {
  switch (role) {
    case "hod":
      return "Head of Department (HOD)";
    case "designer":
      return "Faculty";
    case "dqc":
      return dqcYear ? `${dqcYear} DQC` : "DQC Member";
    case "coord":
      return "Exam Coordinator";
    default:
      return role;
  }
}

export function isAllowedEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(EMAIL_DOMAIN);
}

// Initial seed data so the portal has preloaded accounts and pending requests for the HOD
function getInitialSeedUsers(): UserRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: "user-hod-main",
      email: HOD_EMAIL,
      name: "Dr. Suresh K. (HOD IT & COMP)",
      password: HOD_DEFAULT_PASSWORD,
      roles: ["hod"],
      requestedRoles: ["hod"],
      status: "approved",
      department: "Information Technology",
      createdAt: "2026-01-10T08:00:00.000Z",
      approvedAt: "2026-01-10T08:00:00.000Z",
      lastLogin: now,
    },
    {
      id: "user-priya-t",
      email: "priya.t@somaiya.edu",
      name: "Prof. Priya Thombare",
      password: "Password@123",
      roles: ["designer", "dqc"], // Both Faculty and SY DQC Member
      requestedRoles: ["designer", "dqc"],
      dqcYear: "SY",
      requestedDqcYear: "SY",
      status: "approved",
      department: "Information Technology",
      createdAt: "2026-02-01T09:30:00.000Z",
      approvedAt: "2026-02-01T10:00:00.000Z",
      approvedBy: HOD_EMAIL,
      lastLogin: "2026-08-19T14:20:00.000Z",
    },
    {
      id: "user-vaishnavi-s",
      email: "vaishnavi.s@somaiya.edu",
      name: "Prof. Vaishnavi Shinde",
      password: "Password@123",
      roles: ["designer", "dqc"],
      requestedRoles: ["designer", "dqc"],
      dqcYear: "TY",
      requestedDqcYear: "TY",
      status: "approved",
      department: "Computer Engineering",
      createdAt: "2026-02-05T11:15:00.000Z",
      approvedAt: "2026-02-05T12:00:00.000Z",
      approvedBy: HOD_EMAIL,
      lastLogin: "2026-08-18T10:05:00.000Z",
    },
    {
      id: "user-rohit-m",
      email: "rohit.m@somaiya.edu",
      name: "Prof. Rohit Mane",
      password: "Password@123",
      roles: ["designer", "dqc"],
      requestedRoles: ["designer", "dqc"],
      dqcYear: "LY",
      requestedDqcYear: "LY",
      status: "approved",
      department: "Information Technology",
      createdAt: "2026-02-08T10:00:00.000Z",
      approvedAt: "2026-02-08T11:00:00.000Z",
      approvedBy: HOD_EMAIL,
      lastLogin: "2026-08-19T11:30:00.000Z",
    },
    {
      id: "user-samiksha-s",
      email: "samiksha.s@somaiya.edu",
      name: "Prof. Samiksha Sontakke",
      password: "Password@123",
      roles: ["coord"],
      requestedRoles: ["coord"],
      status: "approved",
      department: "Examination Cell",
      createdAt: "2026-02-10T08:45:00.000Z",
      approvedAt: "2026-02-10T09:00:00.000Z",
      approvedBy: HOD_EMAIL,
      lastLogin: "2026-08-19T16:40:00.000Z",
    },
    {
      id: "user-amit-j",
      email: "amit.joshi@somaiya.edu",
      name: "Prof. Amit Joshi",
      password: "Password@123",
      roles: [],
      requestedRoles: ["designer", "dqc"],
      requestedDqcYear: "TY",
      status: "pending",
      department: "Information Technology",
      createdAt: "2026-08-19T08:15:00.000Z",
    },
    {
      id: "user-sneha-p",
      email: "sneha.patil@somaiya.edu",
      name: "Prof. Sneha Patil",
      password: "Password@123",
      roles: [],
      requestedRoles: ["coord"],
      status: "pending",
      department: "Computer Engineering",
      createdAt: "2026-08-20T05:30:00.000Z",
    },
    {
      id: "user-rajesh-k",
      email: "rajesh.k@somaiya.edu",
      name: "Prof. Rajesh Kulkarni",
      password: "Password@123",
      roles: [],
      requestedRoles: ["designer"],
      status: "pending",
      department: "Electronics & Telecomm",
      createdAt: "2026-08-20T06:00:00.000Z",
    },
  ];
}

export function getAllUsers(): UserRecord[] {
  if (typeof window === "undefined") return getInitialSeedUsers();
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedUsers();
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const list: UserRecord[] = JSON.parse(raw);
    // Ensure HOD always exists with correct credentials
    const hasHod = list.some((u) => u.email.toLowerCase() === HOD_EMAIL.toLowerCase());
    if (!hasHod) {
      list.unshift(getInitialSeedUsers()[0]);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(list));
    }
    return list;
  } catch {
    return getInitialSeedUsers();
  }
}

export function saveUsers(users: UserRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  window.dispatchEvent(new CustomEvent("kjsit_users_updated"));
}

export function getActiveSession(): AppUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setActiveSession(user: AppUser | null): void {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } else {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(user));
  }
  window.dispatchEvent(new CustomEvent("kjsit_auth_changed"));
}

export async function loginUser(email: string, password?: string): Promise<AppUser> {
  const normEmail = email.trim().toLowerCase();

  if (!isAllowedEmail(normEmail)) {
    throw new Error(`Only official institute email addresses (${EMAIL_DOMAIN}) are allowed.`);
  }

  // Check HOD specific login
  if (normEmail === HOD_EMAIL.toLowerCase()) {
    if (password && password !== HOD_DEFAULT_PASSWORD) {
      throw new Error("Invalid password for Head of Department account.");
    }
    const hodUser: AppUser = {
      id: "user-hod-main",
      email: HOD_EMAIL,
      name: "Dr. Suresh K. (HOD)",
      role: "hod",
      roles: ["hod"],
      status: "approved",
      department: "Information Technology",
      lastLogin: new Date().toISOString(),
    };
    setActiveSession(hodUser);

    // Update in directory
    const users = getAllUsers();
    const idx = users.findIndex((u) => u.email.toLowerCase() === HOD_EMAIL.toLowerCase());
    if (idx >= 0) {
      users[idx].lastLogin = hodUser.lastLogin;
      saveUsers(users);
    }
    return hodUser;
  }

  const users = getAllUsers();
  const found = users.find((u) => u.email.toLowerCase() === normEmail);

  if (!found) {
    throw new Error(
      "No account found with this email. Please register and submit a role request for HOD approval.",
    );
  }

  if (password && found.password && found.password !== password) {
    throw new Error("Incorrect password. Please try again or reset your password.");
  }

  if (found.status === "pending") {
    throw new Error(
      "Your access request is currently PENDING APPROVAL by the HOD (hod@somaiya.edu). Once the HOD approves your account, you will be able to log in.",
    );
  }

  if (found.status === "rejected") {
    throw new Error(
      "Your access request was not approved by the HOD. Please contact the Head of Department for assistance.",
    );
  }

  if (found.roles.length === 0) {
    throw new Error(
      "No active roles are assigned to your account. Please ask the HOD to assign you a role.",
    );
  }

  const activeRole: Role = found.roles[0];
  const appUser: AppUser = {
    id: found.id,
    email: found.email,
    name: found.name,
    role: activeRole,
    roles: found.roles,
    dqcYear: found.dqcYear || (found.roles.includes("dqc") ? "SY" : undefined),
    requestedDqcYear: found.requestedDqcYear,
    status: found.status,
    requestedRoles: found.requestedRoles,
    department: found.department,
    createdAt: found.createdAt,
    lastLogin: new Date().toISOString(),
  };

  setActiveSession(appUser);

  // Update last login in directory
  found.lastLogin = appUser.lastLogin;
  saveUsers(users);

  return appUser;
}

export async function registerUserRequest(params: {
  email: string;
  name: string;
  password: string;
  requestedRoles: Role[];
  requestedDqcYear?: DqcYear;
  department?: string;
}): Promise<{ status: AccountStatus; message: string }> {
  const normEmail = params.email.trim().toLowerCase();

  if (!isAllowedEmail(normEmail)) {
    throw new Error(`Email must belong to Somaiya Vidyavihar (${EMAIL_DOMAIN}).`);
  }

  if (!params.name || params.name.trim().length < 2) {
    throw new Error("Please enter your full name.");
  }

  if (!params.password || params.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (!params.requestedRoles || params.requestedRoles.length === 0) {
    throw new Error(
      "Please select at least one role you are requesting (e.g. Faculty, DQC, Exam Coordinator).",
    );
  }

  // If HOD email self registers
  if (normEmail === HOD_EMAIL.toLowerCase()) {
    throw new Error("The HOD account is already pre-configured. Please use the Sign In tab.");
  }

  const users = getAllUsers();
  const existingIndex = users.findIndex((u) => u.email.toLowerCase() === normEmail);

  if (existingIndex >= 0) {
    const existing = users[existingIndex];
    if (existing.status === "approved") {
      throw new Error(
        "An approved account already exists with this email. Please sign in directly.",
      );
    }
    // Update existing pending request
    users[existingIndex] = {
      ...existing,
      name: params.name.trim(),
      password: params.password,
      requestedRoles: params.requestedRoles,
      requestedDqcYear: params.requestedDqcYear || existing.requestedDqcYear,
      department: params.department || existing.department || "Engineering",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    saveUsers(users);
    return {
      status: "pending",
      message:
        "Your role request has been updated and submitted to the HOD (hod@somaiya.edu) for approval.",
    };
  }

  const newUser: UserRecord = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email: normEmail,
    name: params.name.trim(),
    password: params.password,
    roles: [], // roles become active ONLY after HOD approves
    requestedRoles: params.requestedRoles,
    requestedDqcYear: params.requestedDqcYear,
    status: "pending",
    department: params.department || "Engineering",
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  return {
    status: "pending",
    message:
      "Registration submitted successfully! Your account is pending HOD approval. Once approved by the HOD, you will be able to log in.",
  };
}

export function approveUser(userId: string, rolesToAssign?: Role[], dqcYear?: DqcYear): void {
  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return;

  const finalRoles =
    rolesToAssign && rolesToAssign.length > 0
      ? rolesToAssign
      : user.requestedRoles.length > 0
        ? user.requestedRoles
        : ["designer"];
  user.status = "approved";
  user.roles = finalRoles;
  if (finalRoles.includes("dqc")) {
    user.dqcYear = dqcYear || user.requestedDqcYear || user.dqcYear || "SY";
  }
  user.approvedAt = new Date().toISOString();
  user.approvedBy = HOD_EMAIL;

  saveUsers(users);

  // If current session is this user, refresh it
  const session = getActiveSession();
  if (session && session.id === userId) {
    session.status = "approved";
    session.roles = finalRoles;
    session.role = finalRoles[0];
    if (finalRoles.includes("dqc")) {
      session.dqcYear = user.dqcYear;
    }
    setActiveSession(session);
  }
}

export function rejectUser(userId: string): void {
  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return;

  user.status = "rejected";
  user.roles = [];
  saveUsers(users);

  const session = getActiveSession();
  if (session && session.id === userId) {
    setActiveSession(null);
  }
}

export function updateUserRoles(userId: string, roles: Role[], dqcYear?: DqcYear): void {
  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return;

  user.roles = roles;
  if (roles.includes("dqc")) {
    user.dqcYear = dqcYear || user.dqcYear || user.requestedDqcYear || "SY";
  }
  if (roles.length > 0 && user.status !== "approved") {
    user.status = "approved";
    user.approvedAt = new Date().toISOString();
    user.approvedBy = HOD_EMAIL;
  }
  saveUsers(users);

  const session = getActiveSession();
  if (session && session.id === userId) {
    session.roles = roles;
    if (roles.includes("dqc")) {
      session.dqcYear = user.dqcYear;
    }
    if (!roles.includes(session.role)) {
      session.role = roles[0] || "designer";
    }
    setActiveSession(session);
  }
}

export function switchActiveRole(newRole: Role): void {
  const session = getActiveSession();
  if (!session) return;
  if (!session.roles.includes(newRole) && session.role !== "hod") return;

  session.role = newRole;
  setActiveSession(session);
}

export async function loadAppUser(): Promise<AppUser | null> {
  const local = getActiveSession();
  if (local) return local;

  // Fallback check with Supabase auth
  try {
    const { data: userData } = await supabase.auth.getUser();
    const u = userData.user;
    if (!u || !u.email) return null;

    const emailNorm = u.email.toLowerCase();
    const users = getAllUsers();
    const found = users.find((x) => x.email.toLowerCase() === emailNorm);

    if (found && found.status === "approved" && found.roles.length > 0) {
      const appUser: AppUser = {
        id: found.id,
        email: found.email,
        name: found.name,
        role: found.roles[0],
        roles: found.roles,
        dqcYear: found.dqcYear || (found.roles.includes("dqc") ? "SY" : undefined),
        requestedDqcYear: found.requestedDqcYear,
        status: found.status,
        department: found.department,
        lastLogin: new Date().toISOString(),
      };
      setActiveSession(appUser);
      return appUser;
    }
  } catch {
    // Ignore supabase error
  }
  return null;
}

export function useUser(): AppUser | null {
  const [user, setUser] = useState<AppUser | null>(() => getActiveSession());

  useEffect(() => {
    let mounted = true;
    loadAppUser().then((u) => {
      if (mounted) setUser(u);
    });

    const handleAuthChange = () => {
      if (mounted) {
        setUser(getActiveSession());
      }
    };

    window.addEventListener("kjsit_auth_changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadAppUser().then((u) => {
        if (mounted) setUser(u);
      });
    });

    return () => {
      mounted = false;
      window.removeEventListener("kjsit_auth_changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
      sub.subscription.unsubscribe();
    };
  }, []);

  return user;
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore
  }
  setActiveSession(null);
}
