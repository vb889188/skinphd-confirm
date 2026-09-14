const FORBIDDEN = new Set(["", "confirm-dev-session", "changeme", "secret"]);

export function resolveSessionSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = (env.CONFIRM_SESSION_SECRET || env.SESSION_SECRET || "").trim();
  if (!secret || FORBIDDEN.has(secret.toLowerCase())) {
    throw new Error("Session secret is not configured. Set SESSION_SECRET or CONFIRM_SESSION_SECRET on the server.");
  }
  return secret;
}
