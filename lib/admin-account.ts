export const INACTIVE_DAYS = 90;
export function isInactiveAccount(
  lastSignIn: string | null | undefined,
  createdAt: string,
  now = Date.now(),
) {
  const last = Date.parse(lastSignIn || createdAt);
  return Number.isFinite(last) && last <= now - INACTIVE_DAYS * 86400000;
}
export function validateAccountAction(
  body: unknown,
  actorId: string,
  targetId: string,
  targetRole: string,
  email: string,
) {
  if (!body || typeof body !== "object")
    throw new Error("Choose an account action.");
  const input = body as Record<string, unknown>;
  if (
    !["reset_email", "recovery_link", "delete", "reactivate"].includes(
      String(input.action),
    )
  )
    throw new Error("Choose a valid account action.");
  if (targetId === actorId)
    throw new Error("Use Account settings to manage your own account.");
  if (targetRole === "admin")
    throw new Error(
      "Administrator accounts are protected. Change their role before managing this account.",
    );
  if (input.action === "delete" && input.confirmEmail !== email)
    throw new Error("Type the user's exact email address to confirm deletion.");
  return input.action as
    "reset_email" | "recovery_link" | "delete" | "reactivate";
}
