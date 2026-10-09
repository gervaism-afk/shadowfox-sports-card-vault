import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateAccountAction } from "@/lib/admin-account";
export const maxDuration = 60;
function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return reply({ error: auth.error }, auth.status);
  const { id } = await params;
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id))
    return reply({ error: "Invalid user ID." }, 400);
  const db = createAdminClient(auth.user.id);
  const [profile, account] = await Promise.all([
    db.from("profiles").select("id,role,username").eq("id", id).maybeSingle(),
    db.auth.admin.getUserById(id),
  ]);
  if (profile.error || account.error || !profile.data || !account.data.user)
    return reply(
      { error: "Could not find this account. Refresh the user list." },
      404,
    );
  const user = account.data.user;
  if (!user.email)
    return reply({ error: "This account has no email address." }, 400);
  let action;
  try {
    action = validateAccountAction(
      await req.json(),
      auth.user.id,
      id,
      profile.data.role,
      user.email,
    );
  } catch (error) {
    return reply({ error: (error as Error).message }, 400);
  }
  // Never accept a redirect supplied by a caller: recovery links belong to the vault.
  const redirectTo =
    "https://shadowfox-sports-card-vault.vercel.app/reset-password";
  let link: string | undefined;
  let deletionStarted = false;
  try {
    if (action === "reset_email") {
      const { error } = await db.auth.resetPasswordForEmail(user.email, {
        redirectTo,
      });
      if (error)
        throw new Error(
          "Password reset email could not be sent. Please try again later.",
        );
    } else if (action === "recovery_link") {
      const { data, error } = await db.auth.admin.generateLink({
        type: "recovery",
        email: user.email,
        options: { redirectTo },
      });
      if (error || !data.properties?.action_link)
        throw new Error("Could not generate a recovery link.");
      link = data.properties.action_link;
    } else if (action === "reactivate") {
      const { error } = await db.auth.admin.updateUserById(id, {
        ban_duration: "none",
      });
      if (error) throw new Error("Could not reactivate this account.");
    } else {
      // Rotating the credential revokes Auth sessions; the ban pauses sign-in before cleanup.
      // This random credential is never returned, persisted by this app, or logged.
      const { error: banError } = await db.auth.admin.updateUserById(id, {
        ban_duration: "876000h",
        password: randomBytes(32).toString("base64url"),
      });
      if (banError)
        throw new Error("Could not pause the account for deletion.");
      deletionStarted = true;
      const bucket = db.storage.from("card-images");
      const paths: string[] = [];
      async function collect(prefix: string, depth = 0) {
        if (depth > 8)
          throw new Error("Image folders require additional cleanup.");
        for (let offset = 0; ; offset += 100) {
          const { data, error } = await bucket.list(prefix, {
            limit: 100,
            offset,
            sortBy: { column: "name", order: "asc" },
          });
          if (error) throw new Error("Could not list account images.");
          for (const object of data || []) {
            if (
              object.name.includes("/") ||
              object.name === "." ||
              object.name === ".."
            )
              throw new Error("Invalid image path.");
            const path = `${prefix}/${object.name}`;
            if (object.id) paths.push(path);
            else await collect(path, depth + 1);
            if (paths.length > 10000)
              throw new Error("Account images need additional cleanup.");
          }
          if (!data || data.length < 100) break;
        }
      }
      await collect(id);
      for (let offset = 0; offset < paths.length; offset += 100) {
        const { error } = await bucket.remove(
          paths.slice(offset, offset + 100),
        );
        if (error) throw new Error("Could not remove account images.");
      }
      const { error } = await db.auth.admin.deleteUser(id);
      if (error) throw new Error("Could not finish deleting the account.");
      await db.from("card_image_cleanup").delete().eq("user_id", id);
    }
    const actor = await db
      .from("profiles")
      .select("username,email")
      .eq("id", auth.user.id)
      .single();
    const { error: auditError } = await db.from("admin_activity").insert({
      actor_id: auth.user.id,
      actor_label: actor.data?.username || actor.data?.email || auth.user.id,
      action: `user.${action}`,
      subject_type: "user",
      subject_id: id,
      summary: profile.data.username || user.email,
      details: {},
    });
    return reply({
      success: true,
      ...(link ? { recoveryLink: link } : {}),
      ...(auditError
        ? {
            warning:
              "Account action completed, but activity history could not be recorded.",
          }
        : {}),
    });
  } catch (error) {
    return reply(
      {
        error: `${(error as Error).message}${deletionStarted ? " The account is paused. Retry deletion or choose Reactivate account and send a password reset; some images may already have been removed." : ""}`,
      },
      500,
    );
  }
}
