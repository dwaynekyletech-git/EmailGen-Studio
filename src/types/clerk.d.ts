declare module '@clerk/nextjs' {
  export const SignIn: React.FC<{
    afterSignInUrl?: string;
    redirectUrl?: string;
    signUpUrl?: string;
  }>;
  
  export const SignUp: React.FC<{
    afterSignUpUrl?: string;
    redirectUrl?: string;
    signInUrl?: string;
  }>;
  
  export const UserButton: React.FC<{
    afterSignOutUrl?: string;
  }>;
  
  export const UserProfile: React.FC;
  
  export const ClerkProvider: React.FC<{
    children: React.ReactNode;
  }>;
  
  export function authMiddleware(options: {
    publicRoutes?: string[];
    afterSignInUrl?: string;
    signInUrl?: string;
  }): any;

  export interface User {
    id: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    username?: string;
    emailAddresses?: Array<{
      emailAddress: string;
      id: string;
      verification: {
        status: string;
        strategy: string;
      };
    }>;
    publicMetadata?: {
      role?: string;
      [key: string]: any;
    };
  }

  export function useUser(): {
    isLoaded: boolean;
    isSignedIn: boolean;
    user: User | null | undefined;
  };
} 