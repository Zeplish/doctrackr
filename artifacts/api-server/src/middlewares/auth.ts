import { type Request, type Response, type NextFunction } from "express";

const AUTH_USERNAME = process.env["AUTH_USERNAME"] ?? "admin";
const AUTH_PASSWORD = process.env["AUTH_PASSWORD"] ?? "changeme";
const SESSION_SECRET = process.env["SESSION_SECRET"] ?? "dev-secret";
const COOKIE_NAME = "dt_session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

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

export function createSessionCookie(): string {
  const payload = `auth:${Date.now()}`;
  const sig = sign(payload, SESSION_SECRET);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifySessionCookie(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return false;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    return sig === sign(payload, SESSION_SECRET);
  } catch {
    return false;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const cookie = req.cookies?.[COOKIE_NAME];
  if (cookie && verifySessionCookie(cookie)) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

export function loginHandler(req: Request, res: Response): void {
  const { username, password } = req.body ?? {};
  if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
    const token = createSessionCookie();
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
  if (cookie && verifySessionCookie(cookie)) {
    res.json({ authenticated: true, username: AUTH_USERNAME });
  } else {
    res.json({ authenticated: false });
  }
}

export { COOKIE_MAX_AGE };
