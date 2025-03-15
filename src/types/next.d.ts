declare module 'next/link';
declare module 'next/navigation' {
  export function useRouter(): {
    push: (url: string) => void;
    replace: (url: string) => void;
    refresh: () => void;
    back: () => void;
    forward: () => void;
  };
  
  export function usePathname(): string;
}

declare module 'next' {
  export type Metadata = {
    title?: string;
    description?: string;
    [key: string]: any;
  };
}

declare module 'next/font/google' {
  export function Inter(options: { subsets: string[] }): {
    className: string;
    style: any;
  };
} 