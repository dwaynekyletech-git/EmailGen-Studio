"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { validateEmail, getQARules } from "@/lib/api-service";

type ValidationRule = {
  id: string;
  name: string;
  description: string;
  status: "passed" | "failed" | "pending";
  details?: string;
};

type QARule = {
  id: string;
  name: string;
  description: string;
  rule_type: string;
  rule_pattern: string;
  severity: 'error' | 'warning' | 'info';
  is_active: boolean;
};

type ValidationResult = {
  ruleId: string;
  ruleName: string;
  description: string;
  severity: string;
  isPassing: boolean;
  message: string;
};

export default function QAPage() {
  const [validationRules, setValidationRules] = useState<ValidationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  useEffect(() => {
    // Load the HTML from localStorage
    const emailHtml = localStorage.getItem('qaHtml') || localStorage.getItem('emailHtml');
    if (emailHtml) {
      setHtml(emailHtml);
    }
    
    // Load QA rules
    loadQARules();
  }, []);

  const loadQARules = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch QA rules from the API
      const response = await getQARules(true);
      
      if (response.rules && response.rules.length > 0) {
        // Convert API rules to the format used by the component
        const initialRules: ValidationRule[] = response.rules.map((rule: QARule) => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          status: "pending"
        }));
        
        setValidationRules(initialRules);
        
        // If we have HTML, validate it immediately
        if (html) {
          validateHtml(html, response.rules);
        }
      } else {
        // If no rules are returned, show some default rules
        setValidationRules([
          {
            id: "1",
            name: "Responsive Design",
            description: "Email renders correctly on mobile, tablet, and desktop",
            status: "pending",
          },
          {
            id: "2",
            name: "Image Alt Tags",
            description: "All images have appropriate alt tags for accessibility",
            status: "pending",
          },
          {
            id: "3",
            name: "CAN-SPAM Compliance",
            description: "Email includes required unsubscribe link and physical address",
            status: "pending",
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
            status: "pending",
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading QA rules:', error);
      setError('Failed to load QA rules. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateHtml = async (htmlContent: string, rules?: QARule[]) => {
    if (!htmlContent) return;
    
    try {
      setIsValidating(true);
      setError(null);
      
      // Get rule IDs if rules are provided
      const ruleIds = rules ? rules.map(rule => rule.id) : undefined;
      
      // Call the validation API
      const result = await validateEmail(htmlContent, ruleIds);
      
      if (result.results && result.results.length > 0) {
        // Update the validation rules with the results
        const updatedRules = validationRules.map(rule => {
          const matchingResult = result.results.find((r: ValidationResult) => r.ruleId === rule.id);
          
          if (matchingResult) {
            return {
              ...rule,
              status: matchingResult.isPassing ? "passed" as const : "failed" as const,
              details: matchingResult.isPassing ? undefined : matchingResult.message
            };
          }
          
          return rule;
        });
        
        setValidationRules(updatedRules);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setError('Failed to validate HTML. Please try again later.');
    } finally {
      setIsValidating(false);
    }
  };

  const runEmailTest = () => {
    setIsTestingEmail(true);
    // Simulate API call to email testing service
    setTimeout(() => {
      setIsTestingEmail(false);
    }, 2000);
  };

  const hasFailedRules = validationRules.some(rule => rule.status === "failed");

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">QA Validation</h1>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">QA Validation</h1>
      
      {error && (
        <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}
      
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Validation Rules</h2>
            {html && (
              <button
                onClick={() => validateHtml(html)}
                disabled={isValidating}
                className="px-3 py-1 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? "Validating..." : "Revalidate"}
              </button>
            )}
          </div>
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
            hasFailedRules
              ? "opacity-50 cursor-not-allowed pointer-events-none"
              : ""
          }`}
        >
          Proceed to Deployment
        </Link>
      </div>
    </div>
  );
} 