import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listFleetUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !allowed) throw new Error("Acesso permitido somente ao administrador.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error: roleError } = await context.supabase.from("user_roles").select("user_id, role");
    if (roleError) throw new Error(roleError.message);
    return Promise.all((roles ?? []).map(async (r) => {
      const { data, error: userError } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      if (userError) throw new Error(userError.message);
      return { id: r.user_id, email: data.user.email ?? "", role: r.role, confirmed: !!data.user.email_confirmed_at };
    }));
  });

export const inviteFleetUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ email: z.string().email().max(254), role: z.enum(["admin", "consultor"]) }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: allowed, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !allowed) throw new Error("Acesso permitido somente ao administrador.");
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: `${origin}/reset-password` });
    if (inviteError) throw new Error(inviteError.message);
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: invited.user.id, role: data.role });
    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(invited.user.id);
      throw new Error(roleError.message);
    }
    return { success: true };
  });