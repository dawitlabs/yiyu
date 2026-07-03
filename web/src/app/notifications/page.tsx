import { redirect } from "next/navigation";
import { NotificationsList } from "@/components/notifications-list";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Notification } from "@/lib/notifications";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const res = await serverFetch("/notifications");
  const notifications: Notification[] = res.ok ? await res.json() : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      <div className="mt-6">
        <NotificationsList initialNotifications={notifications} />
      </div>
    </div>
  );
}
