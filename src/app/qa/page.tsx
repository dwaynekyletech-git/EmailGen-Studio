"use client";

import React, { useState } from "react";
import Link from "next/link";

type ValidationRule = {
  id: string;
  name: string;
  description: string;
  status: "passed" | "failed" | "pending";
  details?: string;
};

export default function QAPage() {
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([
    {
      id: "1",
      name: "Responsive Design",
      description: "Email renders correctly on mobile, tablet, and desktop",
      status: "passed",
    },
    {
      id: "2",
      name: "Image Alt Tags",
      description: "All images have appropriate alt tags for accessibility",
      status: "failed",
      details: "Missing alt tags on 2 images in the header section",
    },
    {
      id: "3",
      name: "CAN-SPAM Compliance",
      description: "Email includes required unsubscribe link and physical address",
      status: "passed",
    },
    {
      id: "4",
      name: "Link Validation",
      description: "All links are valid and properly formatted",
      status: "pending",
    },
    {
      id: "5",
      name: "Brand Guidelines",
      description: "Email follows client brand guidelines for colors and fonts",
      status: "passed",
    },
  ]);

  const [isTestingEmail, setIsTestingEmail] = useState(false);

  const runEmailTest = () => {
    setIsTestingEmail(true);
    // Simulate API call to email testing service
    setTimeout(() => {
      setIsTestingEmail(false);
    }, 2000);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">QA Validation</h1>
      
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Validation Rules</h2>
          <div className="space-y-4">
            {validationRules.map((rule) => (
              <div key={rule.id} className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{rule.name}</h3>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      rule.status === "passed"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : rule.status === "failed"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }`}
                  >
                    {rule.status}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {rule.description}
                </p>
                {rule.details && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    {rule.details}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Email Render Testing</h2>
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            Test how your email renders across different email clients and devices.
          </p>
          <button
            onClick={runEmailTest}
            disabled={isTestingEmail}
            className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestingEmail ? "Testing..." : "Run Email Test"}
          </button>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end space-x-4">
        <Link
          href="/editor"
          className="px-4 py-2 border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Back to Editor
        </Link>
        <Link
          href="/deploy"
          className={`px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 ${
            validationRules.some((rule) => rule.status === "failed")
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >
          Proceed to Deployment
        </Link>
      </div>
    </div>
  );
} 