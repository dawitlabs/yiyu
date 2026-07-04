import { ShortsPlayer } from "@/components/shorts-player";
import { serverFetch } from "@/lib/api";
import type { Video } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function ShortsPage() {
  const res = await serverFetch("/shorts?limit=20");
  const shorts: Video[] = res.ok ? await res.json() : [];

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Shorts</h1>
      {shorts.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">No shorts yet.</p>
      ) : (
        <ShortsPlayer shorts={shorts} />
      )}
    </div>
  );
}
