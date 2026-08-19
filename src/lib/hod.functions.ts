import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type StaffMember = {
  id: string;
  email: string;
  name: string;
  role: "designer" | "dqc" | "coord" | "hod";
  created_at: string;
  papersCount: number;
};

export type RoleRequest = {
  id: string;
  userId: string;
  facultyEmail: string;
  facultyName: string;
  requestedRole: "dqc" | "coord";
  reason: string;
  createdAt: string;
};

export type HodDashboardData = {
  staff: StaffMember[];
  papers: any[];
  requests: RoleRequest[];
  stats: {
    totalStaff: number;
    facultyCount: number;
    dqcCount: number;
    coordCount: number;
    totalPapers: number;
    approvedPapers: number;
    pendingDqcPapers: number;
  };
};

export const getHodDashboardFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HodDashboardData> => {
    const callerId = context.userId;

    // Verify caller is HOD
    const [{ data: callerProfile }, { data: callerRole }] = await Promise.all([
      supabaseAdmin.from("profiles").select("email, name").eq("id", callerId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", callerId).maybeSingle(),
    ]);

    const callerEmail = (callerProfile?.email || "").toLowerCase();
    const isHod =
      callerEmail.startsWith("hod@") ||
      callerEmail.startsWith("hod.") ||
      callerRole?.role === "hod";

    if (!isHod) {
      throw new Error("Access Denied: Only Head of Department (HOD) can view this dashboard.");
    }

    // 1. Fetch all profiles, user_roles, papers, and notifications
    const [{ data: allProfiles }, { data: allRoles }, { data: allPapers }, { data: allNotifs }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, email, name, created_at")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin
          .from("papers")
          .select("id, status, meta, created_by_email, created_at, dqc_note")
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("notifications")
          .select("id, message, read, recipient_email, created_at")
          .order("created_at", { ascending: false }),
      ]);

    const roleMap = new Map<string, string>();
    (allRoles || []).forEach((r) => {
      roleMap.set(r.user_id, r.role);
    });

    const papersCountMap = new Map<string, number>();
    (allPapers || []).forEach((p) => {
      if (p.created_by_email) {
        const key = p.created_by_email.toLowerCase();
        papersCountMap.set(key, (papersCountMap.get(key) || 0) + 1);
      }
    });

    const staff: StaffMember[] = (allProfiles || []).map((p) => {
      const email = p.email.toLowerCase();
      let role = (roleMap.get(p.id) as any) || "designer";
      if (email.startsWith("hod@") || email.startsWith("hod.")) {
        role = "hod";
      }
      return {
        id: p.id,
        email: p.email,
        name: p.name || email.split("@")[0],
        role,
        created_at: p.created_at,
        papersCount: papersCountMap.get(email) || 0,
      };
    });

    // 2. Parse role requests from notifications
    const requests: RoleRequest[] = [];
    (allNotifs || []).forEach((n) => {
      if (n.message && n.message.startsWith("[ROLE_REQUEST]")) {
        // format: [ROLE_REQUEST] <userId>|<email>|<name>|<requestedRole>|<reason>
        const payload = n.message.replace("[ROLE_REQUEST]", "").trim();
        const parts = payload.split("|");
        if (parts.length >= 4) {
          requests.push({
            id: n.id,
            userId: parts[0]?.trim() || "",
            facultyEmail: parts[1]?.trim() || "",
            facultyName: parts[2]?.trim() || "",
            requestedRole: (parts[3]?.trim() as any) === "coord" ? "coord" : "dqc",
            reason: parts.slice(4).join("|").trim() || "No reason provided",
            createdAt: n.created_at,
          });
        }
      }
    });

    let facultyCount = 0;
    let dqcCount = 0;
    let coordCount = 0;

    staff.forEach((s) => {
      if (s.role === "designer") facultyCount++;
      else if (s.role === "dqc") dqcCount++;
      else if (s.role === "coord") coordCount++;
    });

    const papersList = allPapers || [];
    const approvedPapers = papersList.filter((p) => p.status === "approved").length;
    const pendingDqcPapers = papersList.filter((p) => p.status === "sent_to_dqc").length;

    return {
      staff,
      papers: papersList,
      requests,
      stats: {
        totalStaff: staff.length,
        facultyCount,
        dqcCount,
        coordCount,
        totalPapers: papersList.length,
        approvedPapers,
        pendingDqcPapers,
      },
    };
  });

const AssignRoleInput = z.object({
  targetUserId: z.string().min(1),
  targetEmail: z.string().email(),
  newRole: z.enum(["designer", "dqc", "coord", "hod"]),
  notificationIdToDelete: z.string().optional(),
});

export const assignFacultyRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => AssignRoleInput.parse(d))
  .handler(async ({ data, context }) => {
    const callerId = context.userId;

    // Verify caller is HOD
    const [{ data: callerProfile }, { data: callerRole }] = await Promise.all([
      supabaseAdmin.from("profiles").select("email").eq("id", callerId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", callerId).maybeSingle(),
    ]);

    const callerEmail = (callerProfile?.email || "").toLowerCase();
    const isHod =
      callerEmail.startsWith("hod@") ||
      callerEmail.startsWith("hod.") ||
      callerRole?.role === "hod";

    if (!isHod) {
      throw new Error("Unauthorized: Only HOD can assign or approve roles.");
    }

    // 1. Remove any existing role rows for this user
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.targetUserId);

    // 2. Insert new assigned role
    const { error: insertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: data.targetUserId,
      role: data.newRole as any,
    });

    if (insertError) {
      throw new Error(`Failed to assign role: ${insertError.message}`);
    }

    // 3. Clear role request notification if one was associated
    if (data.notificationIdToDelete) {
      await supabaseAdmin.from("notifications").delete().eq("id", data.notificationIdToDelete);
    }

    const roleName =
      data.newRole === "dqc"
        ? "DQC Reviewer"
        : data.newRole === "coord"
          ? "Exam Coordinator"
          : data.newRole === "hod"
            ? "HOD"
            : "Faculty Paper Designer";

    // 4. Send notification to user
    await supabaseAdmin.from("notifications").insert({
      recipient_email: data.targetEmail,
      message: `HOD Update: You have been appointed as ${roleName}. You can now access portal features with this role.`,
    });

    return {
      success: true,
      message: `Successfully appointed ${data.targetEmail} as ${roleName}.`,
    };
  });

const RequestRoleInput = z.object({
  requestedRole: z.enum(["dqc", "coord"]),
  reason: z.string().optional(),
});

export const requestRoleElevationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => RequestRoleInput.parse(d))
  .handler(async ({ data, context }) => {
    const callerId = context.userId;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, name")
      .eq("id", callerId)
      .maybeSingle();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const roleLabel = data.requestedRole === "dqc" ? "DQC Member" : "Exam Coordinator";
    const facultyName = profile.name || profile.email;
    const reasonText = (data.reason || "Faculty submitted application for role.").replace(
      /[|\n]/g,
      " ",
    );

    // Send formatted role request to HOD
    await supabaseAdmin.from("notifications").insert({
      recipient_email: "hod@somaiya.edu",
      message: `[ROLE_REQUEST] ${callerId}|${profile.email}|${facultyName}|${data.requestedRole}|${reasonText}`,
    });

    return {
      success: true,
      message: `Request submitted to HOD to act as ${roleLabel}.`,
    };
  });

const RegisterRoleRequestInput = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  requestedRole: z.enum(["dqc", "coord"]),
  reason: z.string().optional(),
});

export const registerRoleRequestFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => RegisterRoleRequestInput.parse(d))
  .handler(async ({ data }) => {
    const reasonText = (data.reason || "Requested during account registration.").replace(
      /[|\n]/g,
      " ",
    );
    const facultyName = data.name || data.email;

    // Send formatted role request to HOD
    await supabaseAdmin.from("notifications").insert({
      recipient_email: "hod@somaiya.edu",
      message: `[ROLE_REQUEST] ${data.userId}|${data.email}|${facultyName}|${data.requestedRole}|${reasonText}`,
    });

    return { success: true };
  });

const DismissRoleRequestInput = z.object({
  notificationId: z.string().min(1),
  targetEmail: z.string().email(),
  reason: z.string().optional(),
});

export const dismissRoleRequestFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => DismissRoleRequestInput.parse(d))
  .handler(async ({ data, context }) => {
    const callerId = context.userId;

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", callerId)
      .maybeSingle();

    const isHod = (callerProfile?.email || "").toLowerCase().startsWith("hod@");
    if (!isHod) {
      throw new Error("Unauthorized: Only HOD can dismiss role requests.");
    }

    // Delete request notification
    await supabaseAdmin.from("notifications").delete().eq("id", data.notificationId);

    // Notify applicant
    await supabaseAdmin.from("notifications").insert({
      recipient_email: data.targetEmail,
      message: `HOD Notice: Your role application was reviewed. ${data.reason ? `Feedback: ${data.reason}` : "Please contact HOD for details."}`,
    });

    return { success: true };
  });
