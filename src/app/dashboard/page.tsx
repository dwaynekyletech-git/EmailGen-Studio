"use client";

import React, { useState, useEffect } from "react";
import { UserProfile, useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { user, isLoaded } = useUser();
  
  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isLoaded) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 border rounded-lg h-40 animate-pulse bg-gray-100"></div>
          <div className="p-6 border rounded-lg h-40 animate-pulse bg-gray-100"></div>
          <div className="p-6 border rounded-lg h-40 animate-pulse bg-gray-100"></div>
        </div>
      </div>
    );
  }

  // Determine user role (in a real app, this would come from Clerk metadata or your database)
  const userRole = user?.publicMetadata?.role || "Developer";

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Welcome, {user?.firstName || "User"}</h1>
      
      <div className="mb-6">
        <p className="text-zinc-600 dark:text-zinc-400">
          You are logged in as a <span className="font-semibold">{userRole}</span>
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Recent Projects</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            You have no recent projects. Start by uploading a design file.
          </p>
          <Link 
            href="/upload" 
            className="text-sm px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 inline-block"
          >
            Upload Design
          </Link>
        </div>
        
        {userRole === "Administrator" && (
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">User Management</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Manage users and their roles in the system.
            </p>
            <button className="text-sm px-4 py-2 border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-block">
              Manage Users
            </button>
          </div>
        )}
        
        {userRole === "Developer" && (
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Code Editor</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Edit your email HTML with syntax highlighting and real-time preview.
            </p>
            <Link 
              href="/editor" 
              className="text-sm px-4 py-2 border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-block"
            >
              Open Editor
            </Link>
          </div>
        )}
        
        {userRole === "Marketer" && (
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Email Previews</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              View and approve email templates before deployment.
            </p>
            <button className="text-sm px-4 py-2 border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-block">
              View Previews
            </button>
          </div>
        )}
        
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">SFMC Status</h2>
          <div className="flex items-center mb-4">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <p className="text-zinc-600 dark:text-zinc-400">
              Not connected to SFMC
            </p>
          </div>
          <button className="text-sm px-4 py-2 border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-block">
            Connect to SFMC
          </button>
        </div>
      </div>
      
      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            href="/upload" 
            className="p-4 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-center"
          >
            <div className="font-medium mb-1">Upload Design</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Convert design files to HTML</div>
          </Link>
          
          <Link 
            href="/editor" 
            className="p-4 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-center"
          >
            <div className="font-medium mb-1">Code Editor</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Edit email HTML code</div>
          </Link>
          
          <Link 
            href="/qa" 
            className="p-4 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-center"
          >
            <div className="font-medium mb-1">QA Validation</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Validate email against rules</div>
          </Link>
          
          <Link 
            href="/deploy" 
            className="p-4 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-center"
          >
            <div className="font-medium mb-1">Deploy</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Deploy email to SFMC</div>
          </Link>
        </div>
      </div>
    </div>
  );
} 