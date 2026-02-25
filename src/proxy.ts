import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/roles";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Collab routes are public (handled by collab-server)
  if (pathname.startsWith("/collab")) {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;

  // Protect dashboard and draw routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/draw")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (user?.mustChangePassword) {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }
  }

  // Protect admin routes (admin role required)
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (!isAdminRole(user?.role ?? "")) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (user?.mustChangePassword && !pathname.startsWith("/api/admin")) {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }
  }

  // Protect drawing, project, tag, library, and collab API routes
  if (
    pathname.startsWith("/api/drawings") ||
    pathname.startsWith("/api/projects") ||
    pathname.startsWith("/api/tags") ||
    pathname.startsWith("/api/library") ||
    (pathname.startsWith("/api/collab") && pathname !== "/api/collab/config")
  ) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect authenticated API routes (PIN, change-password, account, QR create)
  if (
    pathname.startsWith("/api/auth/pin") ||
    pathname.startsWith("/api/auth/change-password") ||
    pathname.startsWith("/api/auth/account") ||
    pathname.startsWith("/api/auth/qr/create")
  ) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect account routes
  if (pathname.startsWith("/account")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Protect change-password
  if (pathname === "/change-password") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Redirect logged-in users away from auth pages and landing page
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (isLoggedIn) {
      if (user?.mustChangePassword) {
        return NextResponse.redirect(new URL("/change-password", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/draw/:path*",
    "/admin/:path*",
    "/api/drawings/:path*",
    "/api/projects/:path*",
    "/api/tags/:path*",
    "/api/library",
    "/api/collab/:path*",
    "/api/admin/:path*",
    "/api/auth/pin",
    "/api/auth/change-password",
    "/api/auth/account/:path*",
    "/api/auth/qr/create",
    "/account/:path*",
    "/change-password",
    "/login",
    "/register",
    "/collab/:path*",
  ],
};
