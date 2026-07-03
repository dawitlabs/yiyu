import { redirect } from "next/navigation";
import type { ChannelAnalytics } from "@/lib/analytics";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getMyChannel } from "@/lib/my-channel";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-black/10 p-4 dark:border-white/10">
      <p className="text-xs text-black/60 dark:text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const channel = await getMyChannel();
  if (!channel) {
    redirect("/channel/new");
  }

  const res = await serverFetch("/channels/me/analytics");
  if (!res.ok) {
    redirect("/channel/new");
  }
  const analytics: ChannelAnalytics = await res.json();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
      <p className="mt-1 text-black/60 dark:text-white/60">{channel.name}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total views" value={analytics.total_views} />
        <StatCard label="Total likes" value={analytics.total_likes} />
        <StatCard label="Total dislikes" value={analytics.total_dislikes} />
        <StatCard label="Subscribers" value={analytics.subscriber_count} />
        <StatCard label="New subs (7d)" value={analytics.new_subscribers_7d} />
        <StatCard
          label="New subs (30d)"
          value={analytics.new_subscribers_30d}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold tracking-tight">
        Videos by views
      </h2>
      <div className="mt-4 overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-black/60 dark:border-white/10 dark:text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Views</th>
              <th className="px-4 py-3 font-medium">Likes</th>
              <th className="px-4 py-3 font-medium">Dislikes</th>
              <th className="px-4 py-3 font-medium">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {analytics.videos.map((v) => (
              <tr
                key={v.id}
                className="border-b border-black/5 last:border-0 dark:border-white/5"
              >
                <td className="px-4 py-3">{v.title}</td>
                <td className="px-4 py-3">{v.views_count.toLocaleString()}</td>
                <td className="px-4 py-3">{v.likes_count.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {v.dislikes_count.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-black/60 dark:text-white/60">
                  {new Date(v.uploaded_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
