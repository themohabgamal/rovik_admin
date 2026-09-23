import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidSessionValue } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isLogin = path === "/admin/login";
  const authed = isValidSessionValue(request.cookies.get(ADMIN_COOKIE)?.value);

  if (!isLogin && !authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (isLogin && authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
