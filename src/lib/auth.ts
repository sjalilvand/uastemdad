import crypto from "crypto";
import { cookies } from "next/headers";

const SECRET =
  process.env.AUTH_SECRET || "uastemdad-secret-please-change-in-production";
const COOKIE_NAME = "uast_session";
const MAX_AGE = 60 * 60 * 24 * 7; // یک هفته

export interface SessionPayload {
  uid: string;
  username: string;
  name: string;
  role: string;
  exp: number;
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 64);
  const hashBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== test.length) return false;
  return crypto.timingSafeEqual(hashBuf, test);
}

function sign(data: string): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
}

export function createToken(payload: Omit<SessionPayload, "exp">): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + MAX_AGE * 1000 })
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyToken(token?: string | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf-8")
    ) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  payload: Omit<SessionPayload, "exp">
): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, createToken(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifyToken(store.get(COOKIE_NAME)?.value);
}

/** بررسی دسترسی در APIهای مدیریتی؛ در صورت نبود دسترسی null برمی‌گرداند */
export async function requireSession(): Promise<SessionPayload | null> {
  return getSession();
}
