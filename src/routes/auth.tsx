import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Shield,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Info,
  Key,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  EMAIL_DOMAIN,
  isAllowedEmail,
  roleHome,
  useUser,
  loginUser,
  registerUserRequest,
  HOD_EMAIL,
  type Role,
  type DqcYear,
} from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In & Access Request — Somaiya Question Paper Portal" },
      {
        name: "description",
        content:
          "Sign in or submit a role registration request for HOD verification to access the KJSIT Question Paper Portal.",
      },
      { property: "og:title", content: "Sign In — Somaiya Question Paper Portal" },
      {
        property: "og:description",
        content: "Faculty, DQC, and Exam Coordinator access to the Somaiya question-paper portal.",
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
  const [name, setNewName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(["designer"]);
  const [selectedDqcYear, setSelectedDqcYear] = useState<DqcYear>("SY");
  const [department, setDepartment] = useState("Information Technology");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (user && user.status === "approved") {
      navigate({ to: roleHome(user.role) });
    }
  }, [user, navigate]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
    setRequestSuccess(false);
  };

  const handleRoleToggle = (role: Role) => {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((r) => r !== role));
      }
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setRequestSuccess(false);

    const emailNorm = email.trim().toLowerCase();
    if (!isAllowedEmail(emailNorm)) {
      setError(`Please enter a valid Somaiya institute email ending in ${EMAIL_DOMAIN}.`);
      return;
    }

    if (mode !== "forgot" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signin") {
        const loggedIn = await loginUser(emailNorm, password);
        navigate({ to: roleHome(loggedIn.role) });
      } else if (mode === "signup") {
        if (selectedRoles.length === 0) {
          setError("Please select at least one role (e.g. Faculty, DQC Member, Exam Coordinator).");
          setBusy(false);
          return;
        }

        const res = await registerUserRequest({
          email: emailNorm,
          name: name.trim(),
          password,
          requestedRoles: selectedRoles,
          requestedDqcYear: selectedRoles.includes("dqc") ? selectedDqcYear : undefined,
          department,
        });

        setRequestSuccess(true);
        setInfo(res.message);
      } else if (mode === "forgot") {
        setInfo(`If an account exists for ${emailNorm}, instructions have been prepared.`);
      }
    } catch (err: any) {
      setError(err?.message ?? "An unexpected error occurred.");
    } finally {
      setBusy(false);
    }
  };

  const heading =
    mode === "signin"
      ? "Portal Sign In"
      : mode === "signup"
        ? "Register & Request Role Access"
        : "Reset Password";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6">
      <main className="w-full max-w-lg">
        <div className="flex justify-center mb-6">
          <Logo size={64} />
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{heading}</h1>
            {mode === "signin" && (
              <span className="p-1.5 rounded-lg bg-red-100 text-red-800 text-xs font-semibold flex items-center gap-1 border border-red-200">
                <Shield className="w-3.5 h-3.5" /> HOD &amp; Staff
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            {mode === "forgot"
              ? "We'll help you reset your password."
              : mode === "signup"
                ? "Register your institute ID and submit your requested role(s) for HOD verification."
                : `Official portal for staff with an ${EMAIL_DOMAIN} address.`}
          </p>

          {/* Registration Success State */}
          {requestSuccess ? (
            <div className="mt-6 p-5 rounded-xl bg-green-50/80 border border-green-200 text-green-950 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-green-900 text-base">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Access Request Submitted!
              </div>
              <p className="text-xs text-green-900/90 leading-relaxed">
                Your request to join as{" "}
                <b>
                  {selectedRoles
                    .map((r) =>
                      r === "designer"
                        ? "Faculty"
                        : r === "dqc"
                          ? `${selectedDqcYear} DQC Member`
                          : "Exam Coordinator",
                    )
                    .join(" & ")}
                </b>{" "}
                has been routed to the <b>Head of Department ({HOD_EMAIL})</b> for approval.
              </p>
              <div className="p-3 bg-white/80 rounded-lg border border-green-200 text-xs space-y-1">
                <div>
                  <b>Email:</b> {email}
                </div>
                <div>
                  <b>Department:</b> {department}
                </div>
                {selectedRoles.includes("dqc") && (
                  <div>
                    <b>Assigned Level:</b> {selectedDqcYear} DQC
                  </div>
                )}
                <div>
                  <b>Status:</b>{" "}
                  <span className="text-amber-700 font-semibold">Pending HOD Approval</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Once the HOD approves your request, you can log in directly using your email and
                password.
              </p>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="w-full py-2 bg-brand text-brand-foreground rounded-lg text-xs font-semibold hover:bg-brand/90 transition mt-2"
              >
                Return to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <label
                      className="text-xs font-semibold block mb-1.5 text-foreground"
                      htmlFor="name"
                    >
                      Full Name (with title)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="e.g. Prof. Priya Thombare"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="text-xs font-semibold block mb-1.5 text-foreground"
                      htmlFor="department"
                    >
                      Department
                    </label>
                    <select
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="Information Technology">Information Technology</option>
                      <option value="Computer Engineering">Computer Engineering</option>
                      <option value="Electronics & Telecommunication">
                        Electronics &amp; Telecommunication
                      </option>
                      <option value="Artificial Intelligence & Data Science">
                        Artificial Intelligence &amp; Data Science
                      </option>
                      <option value="Basic Science & Humanities">
                        Basic Science &amp; Humanities
                      </option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label
                  className="text-xs font-semibold block mb-1.5 text-foreground"
                  htmlFor="email"
                >
                  Somaiya Institute Email ({EMAIL_DOMAIN})
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={`facultyname${EMAIL_DOMAIN}`}
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div>
                  <label
                    className="text-xs font-semibold block mb-1.5 text-foreground"
                    htmlFor="password"
                  >
                    {mode === "signup" ? "Set Your Password" : "Password"}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="password"
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      required
                      className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>
              )}

              {/* Role Selection when Registering */}
              {mode === "signup" && (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-semibold block text-foreground">
                    Select Requested Role(s){" "}
                    <span className="text-muted-foreground font-normal">
                      (You can hold multiple roles)
                    </span>
                    :
                  </label>
                  <div className="space-y-2 bg-muted/40 p-3 rounded-lg border border-border">
                    <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes("designer")}
                        onChange={() => handleRoleToggle("designer")}
                        className="rounded border-border text-brand focus:ring-brand w-4 h-4"
                      />
                      <div>
                        <span className="font-semibold text-foreground">Faculty</span>
                        <p className="text-[11px] text-muted-foreground">
                          Draft &amp; create question papers
                        </p>
                      </div>
                    </label>

                    <div className="border-t border-border/60 my-1" />

                    <div>
                      <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes("dqc")}
                          onChange={() => handleRoleToggle("dqc")}
                          className="rounded border-border text-purple-600 focus:ring-purple-600 w-4 h-4"
                        />
                        <div>
                          <span className="font-semibold text-purple-950">
                            DQC Member (Reviewer)
                          </span>
                          <p className="text-[11px] text-muted-foreground">
                            Perform Bloom &amp; CO verification for assigned year
                          </p>
                        </div>
                      </label>

                      {/* DQC Class / Year Selector */}
                      {selectedRoles.includes("dqc") && (
                        <div className="mt-2.5 ml-6.5 p-2.5 rounded-lg bg-purple-50/80 border border-purple-200 text-xs space-y-1.5">
                          <span className="font-semibold text-purple-950 block text-[11px]">
                            Choose DQC Year / Class:
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(["SY", "TY", "LY"] as DqcYear[]).map((yr) => (
                              <button
                                key={yr}
                                type="button"
                                onClick={() => setSelectedDqcYear(yr)}
                                className={`py-1.5 px-2 rounded-md text-xs font-semibold border text-center transition ${
                                  selectedDqcYear === yr
                                    ? "bg-purple-700 text-white border-purple-700 shadow-2xs"
                                    : "bg-white text-purple-900 border-purple-300 hover:bg-purple-100/50"
                                }`}
                              >
                                {yr} DQC
                                <div className="text-[9px] font-normal opacity-85">
                                  {yr === "SY"
                                    ? "2nd Year"
                                    : yr === "TY"
                                      ? "3rd Year"
                                      : "Final Year"}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border/60 my-1" />

                    <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes("coord")}
                        onChange={() => handleRoleToggle("coord")}
                        className="rounded border-border text-blue-600 focus:ring-blue-600 w-4 h-4"
                      />
                      <div>
                        <span className="font-semibold text-blue-950">Exam Coordinator</span>
                        <p className="text-[11px] text-muted-foreground">
                          Final paper review &amp; print queue
                        </p>
                      </div>
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    Note: All role requests require approval from the Head of Department (HOD).
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="leading-snug">{error}</div>
                </div>
              )}

              {info && !requestSuccess && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>{info}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 bg-brand text-brand-foreground rounded-lg font-semibold text-sm hover:bg-brand/90 transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy ? (
                  "Please wait…"
                ) : mode === "signin" ? (
                  <>
                    <LogIn className="w-4 h-4" /> Sign In
                  </>
                ) : mode === "signup" ? (
                  <>
                    <UserPlus className="w-4 h-4" /> Submit Access Request to HOD
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}

          {/* Mode Switchers */}
          <div className="mt-6 pt-4 border-t border-border space-y-2 text-center">
            {mode !== "signin" && (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="block w-full text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Already have an approved account?{" "}
                <span className="text-brand font-semibold underline">Sign in</span>
              </button>
            )}
            {mode !== "signup" && (
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="block w-full text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                New faculty or coordinator?{" "}
                <span className="text-brand font-semibold underline">
                  Register &amp; Request Role
                </span>
              </button>
            )}
            {mode !== "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="block w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Forgot your password?
              </button>
            )}
          </div>
        </div>

        {/* Footer credits */}
        <div className="mt-6 inline-flex w-full flex-col items-center rounded-[2rem] border border-red-100/50 bg-red-50/30 px-4 sm:px-6 py-3.5 shadow-[0_8px_30px_rgba(153,27,27,0.05)] backdrop-blur-xl">
          <span className="mb-2 text-[9px] font-bold uppercase tracking-[0.25em] text-red-900/50">
            Designed &amp; Developed By
          </span>
          <div className="flex flex-row items-center justify-center gap-2 sm:gap-3 text-center whitespace-nowrap overflow-x-auto max-w-full">
            <h4 className="font-serif text-[12px] sm:text-[14px] font-semibold text-red-950">
              Priya Thombare
            </h4>
            <span className="text-red-300 font-bold text-xs">·</span>
            <h4 className="font-serif text-[12px] sm:text-[14px] font-semibold text-red-950">
              Vaishnavi Shinde
            </h4>
            <span className="text-red-300 font-bold text-xs">·</span>
            <h4 className="font-serif text-[12px] sm:text-[14px] font-semibold text-red-950">
              Samiksha Sontakke
            </h4>
          </div>
        </div>
      </main>
    </div>
  );
}
