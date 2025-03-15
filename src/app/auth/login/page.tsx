"use client";

import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center">Login to EmailGen Studio</h1>
        <p className="text-center mt-2 text-zinc-600 dark:text-zinc-400">
          Sign in to your account to access the platform
        </p>
      </div>
      <SignIn />
    </div>
  );
} 