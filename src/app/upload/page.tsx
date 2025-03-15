"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    // Here we would normally upload the file to the server
    // For now, we'll just simulate a successful upload
    setTimeout(() => {
      router.push("/editor");
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Upload Design File</h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        Upload your design file (.psd, .xd, .fig) to convert it to responsive HTML email
      </p>

      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-zinc-300 dark:border-zinc-700"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="space-y-4">
            <p className="text-lg font-medium">{file.name}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <button
              onClick={handleUpload}
              className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Convert to HTML
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-lg">Drag and drop your design file here</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Supported formats: .psd, .xd, .fig
            </p>
            <div>
              <label
                htmlFor="file-upload"
                className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 cursor-pointer"
              >
                Browse Files
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".psd,.xd,.fig"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 