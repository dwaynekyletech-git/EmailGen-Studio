import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col">
        <h1 className="text-4xl font-bold mb-6">EmailGen Studio</h1>
        <p className="text-xl mb-8 text-center max-w-2xl">
          AI-powered email development platform for Salesforce Marketing Cloud
        </p>
        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="px-4 py-2 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 rounded-md bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 transition-colors"
          >
            Sign Up
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">AI-Powered Conversion</h2>
            <p>Convert design files (.psd, .xd, .fig) to responsive HTML emails for SFMC</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Live Code Editor</h2>
            <p>Edit your email HTML with syntax highlighting and real-time preview</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">One-Click Deployment</h2>
            <p>Deploy your emails directly to Salesforce Marketing Cloud with ease</p>
          </div>
        </div>
      </div>
    </main>
  );
}
