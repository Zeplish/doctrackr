import { type Request, type Response, type NextFunction } from "express";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { db, organizationTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ENV_USERNAME = process.env["AUTH_USERNAME"] ?? "admin";
const ENV_PASSWORD = process.env["AUTH_PASSWORD"] ?? "changeme";
const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "dev-secret";
const COOKIE_NAME = "dt_session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const hashBuf = Buffer.from(hash, "hex");
    const derived = scryptSync(password, salt, 64);
    return timingSafeEqual(hashBuf, derived);
  } catch {
    return false;
  }
}

function sign(value: string, secret: string): string {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(value);
  let hash = 0;
  for (let i = 0; i < keyData.length; i++) {
    hash = (hash * 31 + keyData[i]!) >>> 0;
  }
  for (let i = 0; i < msgData.length; i++) {
    hash = (hash * 31 + msgData[i]!) >>> 0;
  }
  return hash.toString(36);
}

export function createSessionCookie(username: string): string {
  const payload = `auth:${username}:${Date.now()}`;
  const sig = sign(payload, SESSION_SECRET);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifySessionCookie(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return null;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    if (sig !== sign(payload, SESSION_SECRET)) return null;
    const parts = payload.split(":");
    const username = parts[1] ?? null;
    if (!username || /^\d+$/.test(username)) return null;
    return username;
  } catch {
    return null;
  }
}

async function getCredentials(): Promise<{ username: string; passwordHash: string | null }> {
  const [org] = await db.select({
    authUsername: organizationTable.authUsername,
    authPasswordHash: organizationTable.authPasswordHash,
  }).from(organizationTable).limit(1);
  if (org?.authUsername && org?.authPasswordHash) {
    return { username: org.authUsername, passwordHash: org.authPasswordHash };
  }
  return { username: ENV_USERNAME, passwordHash: null };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const cookie = req.cookies?.[COOKIE_NAME];
  if (cookie && verifySessionCookie(cookie) !== null) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body ?? {};
  const creds = await getCredentials();
  let valid = false;
  if (creds.passwordHash) {
    valid = username === creds.username && verifyPassword(password, creds.passwordHash);
  } else {
    valid = username === ENV_USERNAME && password === ENV_PASSWORD;
  }
  if (valid) {
    const token = createSessionCookie(username);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      secure: process.env["NODE_ENV"] === "production",
    });
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
}

export function logoutHandler(_req: Request, res: Response): void {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
}

export function meHandler(req: Request, res: Response): void {
  const cookie = req.cookies?.[COOKIE_NAME];
  const username = cookie ? verifySessionCookie(cookie) : null;
  if (username !== null) {
    res.json({ authenticated: true, username });
  } else {
    res.json({ authenticated: false });
  }
}

export async function changeCredentialsHandler(req: Request, res: Response): Promise<void> {
  const { currentPassword, newUsername, newPassword } = req.body ?? {};
  if (!currentPassword) {
    res.status(400).json({ error: "Current password is required" });
    return;
  }
  const creds = await getCredentials();
  let valid = false;
  if (creds.passwordHash) {
    valid = verifyPassword(currentPassword, creds.passwordHash);
  } else {
    valid = currentPassword === ENV_PASSWORD;
  }
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const [org] = await db.select({ id: organizationTable.id }).from(organizationTable).limit(1);
  if (!org) {
    res.status(500).json({ error: "Organization not found" });
    return;
  }
  const updates: Record<string, string> = {};
  if (newUsername && newUsername !== creds.username) {
    updates["authUsername"] = newUsername;
  }
  if (newPassword) {
    updates["authPasswordHash"] = hashPassword(newPassword);
    if (!updates["authUsername"]) {
      updates["authUsername"] = newUsername || creds.username;
    }
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No changes provided" });
    return;
  }
  await db.update(organizationTable)
    .set(updates as any)
    .where(eq(organizationTable.id, org.id));
  res.json({ ok: true });
}

export { COOKIE_MAX_AGE };
