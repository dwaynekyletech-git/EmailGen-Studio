'use client';

import React from 'react';
import { ClerkProvider as ClerkProviderOriginal } from '@clerk/nextjs';

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProviderOriginal>
      {children}
    </ClerkProviderOriginal>
  );
} 