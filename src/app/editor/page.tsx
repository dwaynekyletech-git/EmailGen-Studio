"use client";

import React, { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";

const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Email Template</title>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Our Newsletter</h1>
    </div>
    <div class="content">
      <p>Hello there,</p>
      <p>Thank you for subscribing to our newsletter. We're excited to share the latest updates with you.</p>
      <p>Best regards,<br>The Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 Company Name. All rights reserved.</p>
      <p><a href="#">Unsubscribe</a> | <a href="#">View in browser</a></p>
    </div>
  </div>
</body>
</html>`;

export default function EditorPage() {
  const [code, setCode] = useState(sampleHtml);
  const [previewHeight, setPreviewHeight] = useState("500px");

  const handleCodeChange = (value: string) => {
    setCode(value);
  };

  return (
    <div className="h-full">
      <h1 className="text-3xl font-bold mb-6">Email Editor</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b">
            <h2 className="font-medium">HTML Editor</h2>
          </div>
          <CodeMirror
            value={code}
            height="500px"
            extensions={[html()]}
            onChange={handleCodeChange}
            theme={oneDark}
            className="text-sm"
          />
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b flex justify-between items-center">
            <h2 className="font-medium">Preview</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewHeight("500px")}
                className="px-2 py-1 text-xs rounded bg-zinc-200 dark:bg-zinc-700"
              >
                Desktop
              </button>
              <button
                onClick={() => setPreviewHeight("800px")}
                className="px-2 py-1 text-xs rounded bg-zinc-200 dark:bg-zinc-700"
              >
                Mobile
              </button>
            </div>
          </div>
          <div className="bg-white" style={{ height: previewHeight, overflow: "auto" }}>
            <iframe
              srcDoc={code}
              title="Email Preview"
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end space-x-4">
        <button className="px-4 py-2 border rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800">
          Save Draft
        </button>
        <button className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
          Proceed to QA
        </button>
      </div>
    </div>
  );
} 