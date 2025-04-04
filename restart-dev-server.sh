#!/bin/bash

echo "Stopping current Next.js development server..."
# Find and kill the Next.js development server process
pkill -f "node.*next"

echo "Clearing Next.js cache..."
# Remove Next.js cache directories
rm -rf .next/cache

echo "Restarting development server..."
# Start the development server
npm run dev
