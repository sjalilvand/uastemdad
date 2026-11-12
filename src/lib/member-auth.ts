import crypto from "crypto";
import { cookies } from "next/headers";

const SECRET =
  process.env.AUTH_SECRET || "uastemdad-secret-please-change-in-production";
const MEMBER_COOKIE = "uast_member";
const MAX_AGE = 60 * 60 * 24 * 7; // یک هفته

export interface MemberSession {
  mid: string;
  name: string;
  email: string;
  status: string;
  exp: number;
}

function sign(data: string): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
}

function createToken(payload: Omit<MemberSession, "exp">): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + MAX_AGE * 1000 })
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

function verifyToken(token?: string | null): MemberSession | null {
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
    ) as MemberSession;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setMemberSession(payload: Omit<MemberSession, "exp">) {
  const store = await cookies();
  store.set(MEMBER_COOKIE, createToken(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearMemberSession() {
  const store = await cookies();
  store.set(MEMBER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function getMemberSession(): Promise<MemberSession | null> {
  const store = await cookies();
  return verifyToken(store.get(MEMBER_COOKIE)?.value);
}

export { MAX_AGE as MEMBER_SESSION_MAX_AGE };
