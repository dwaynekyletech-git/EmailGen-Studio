"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function DeployPage() {
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [emailName, setEmailName] = useState("");
  const [folder, setFolder] = useState("Marketing");
  const [isReviewed, setIsReviewed] = useState(false);

  const handleDeploy = () => {
    if (!isReviewed || !emailName) return;
    
    setIsDeploying(true);
    // Simulate API call to SFMC
    setTimeout(() => {
      setIsDeploying(false);
      setIsDeployed(true);
    }, 2000);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Deploy to SFMC</h1>
      
      {isDeployed ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">
            Deployment Successful!
          </h2>
          <p className="text-green-700 dark:text-green-300 mb-4">
            Your email has been successfully deployed to Salesforce Marketing Cloud.
          </p>
          <div className="flex space-x-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => setIsDeployed(false)}
              className="px-4 py-2 border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Deploy Another
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Deployment Settings</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email-name" className="block text-sm font-medium mb-1">
                    Email Name
                  </label>
                  <input
                    id="email-name"
                    type="text"
                    value={emailName}
                    onChange={(e) => setEmailName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-800 dark:border-zinc-700"
                    placeholder="Enter email name"
                  />
                </div>
                <div>
                  <label htmlFor="folder" className="block text-sm font-medium mb-1">
                    SFMC Folder
                  </label>
                  <select
                    id="folder"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-800 dark:border-zinc-700"
                  >
                    <option value="Marketing">Marketing</option>
                    <option value="Transactional">Transactional</option>
                    <option value="Newsletters">Newsletters</option>
                    <option value="Promotions">Promotions</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    id="review-checkbox"
                    type="checkbox"
                    checked={isReviewed}
                    onChange={(e) => setIsReviewed(e.target.checked)}
                    className="h-4 w-4 text-zinc-900 focus:ring-zinc-400 border-zinc-300 rounded"
                  />
                  <label htmlFor="review-checkbox" className="ml-2 block text-sm">
                    I have reviewed this email across different devices and resolutions
                  </label>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">SFMC Connection</h2>
              <div className="flex items-center mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Not connected to SFMC
                </p>
              </div>
              <button className="px-4 py-2 border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 mb-4">
                Connect to SFMC
              </button>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Note: You need to connect to SFMC before deploying emails.
                For this demo, you can proceed without connecting.
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-4">
            <Link
              href="/qa"
              className="px-4 py-2 border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Back to QA
            </Link>
            <button
              onClick={handleDeploy}
              disabled={isDeploying || !isReviewed || !emailName}
              className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeploying ? "Deploying..." : "Deploy to SFMC"}
            </button>
          </div>
        </>
      )}
    </div>
  );
} 