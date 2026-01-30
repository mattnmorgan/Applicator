import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/app/guest")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("X-Guest-Route", "true");
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
