import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
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
    if (user?.role !== "admin") {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (user?.mustChangePassword && !pathname.startsWith("/api/admin")) {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }
  }

  // Protect drawing API routes
  if (pathname.startsWith("/api/drawings")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Protect change-password
  if (pathname === "/change-password") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
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
    "/dashboard/:path*",
    "/draw/:path*",
    "/admin/:path*",
    "/api/drawings/:path*",
    "/api/admin/:path*",
    "/change-password",
    "/login",
    "/register",
  ],
};
