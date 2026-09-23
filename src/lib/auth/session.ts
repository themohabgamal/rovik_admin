import { createHmac, timingSafeEqual, randomBytes } from "crypto";

export const ADMIN_COOKIE = "rovik_admin";
const TTL_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const value =
    process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
  if (!value) {
    throw new Error("ADMIN_PASSWORD is not set");
  }
  return value;
}

function hmac(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createSessionValue() {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `${exp}.${nonce}`;
  return `${payload}.${hmac(payload)}`;
}

export function isValidSessionValue(value: string | undefined) {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [exp, nonce, sig] = parts;
  if (!exp || !nonce || !sig) return false;
  if (!safeEqual(sig, hmac(`${exp}.${nonce}`))) return false;
  return Number(exp) * 1000 > Date.now();
}

export function passwordMatches(input: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || !input) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TTL_SECONDS,
  };
}
