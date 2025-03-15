"use client";

import React, { useState, useEffect } from "react";
import { SignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center">Sign Up for EmailGen Studio</h1>
          <p className="text-center mt-2 text-zinc-600 dark:text-zinc-400">
            Create an account to get started with EmailGen Studio
          </p>
        </div>
        <div className="w-96 h-96 bg-gray-100 rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center">Sign Up for EmailGen Studio</h1>
        <p className="text-center mt-2 text-zinc-600 dark:text-zinc-400">
          Create an account to get started with EmailGen Studio
        </p>
      </div>
      <SignUp 
        afterSignUpUrl="/dashboard"
        redirectUrl="/dashboard"
        signInUrl="/auth/login"
      />
    </div>
  );
} 