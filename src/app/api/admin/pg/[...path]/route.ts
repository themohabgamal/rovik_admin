import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { ADMIN_COOKIE, isValidSessionValue } from "@/lib/auth/session";

const DROP_REQUEST = new Set([
  "host",
  "cookie",
  "connection",
  "content-length",
  "transfer-encoding",
]);

const DROP_RESPONSE = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "set-cookie",
]);

async function proxy(request: NextRequest, path: string[]) {
  const cookieStore = await cookies();
  if (!isValidSessionValue(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !base) {
    return new Response("Server is missing Supabase credentials", { status: 500 });
  }

  const target = `${base}/${path.join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  request.headers.forEach((value, name) => {
    if (!DROP_REQUEST.has(name.toLowerCase())) headers.set(name, value);
  });
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  // Avoid compressed upstream responses — Node fetch may decompress while
  // still exposing content-encoding, which breaks the browser client.
  headers.set("Accept-Encoding", "identity");

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const res = await fetch(target, init);
  const body = await res.arrayBuffer();
  const out = new Headers();
  res.headers.forEach((value, name) => {
    if (DROP_RESPONSE.has(name.toLowerCase())) return;
    out.set(name, value);
  });
  return new Response(body, { status: res.status, headers: out });
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
export const HEAD = GET;
export const OPTIONS = GET;
