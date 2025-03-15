import { authMiddleware } from "@clerk/nextjs";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: [
    "/",
    "/auth/login",
    "/auth/signup",
    "/api/public(.*)"
  ],
  
  // Routes that can be accessed after signing in
  afterSignInUrl: "/dashboard",
  
  // Routes to redirect to if user is not authenticated
  signInUrl: "/auth/login",
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 