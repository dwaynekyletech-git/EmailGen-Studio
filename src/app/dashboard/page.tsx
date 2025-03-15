import { UserProfile } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Recent Projects</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            You have no recent projects. Start by uploading a design file.
          </p>
        </div>
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Templates</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Browse and use pre-built email templates for your campaigns.
          </p>
        </div>
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">SFMC Status</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Not connected. Connect your SFMC account to deploy emails.
          </p>
        </div>
      </div>
      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
        <UserProfile />
      </div>
    </div>
  );
} 