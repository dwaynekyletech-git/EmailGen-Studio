"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center">Sign Up for EmailGen Studio</h1>
        <p className="text-center mt-2 text-zinc-600 dark:text-zinc-400">
          Create an account to get started with EmailGen Studio
        </p>
      </div>
      <SignUp />
    </div>
  );
} 