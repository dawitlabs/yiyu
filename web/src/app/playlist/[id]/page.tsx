import { notFound } from "next/navigation";
import { DeletePlaylistButton } from "@/components/delete-playlist-button";
import { PlaylistVideos } from "@/components/playlist-videos";
import { serverFetch } from "@/lib/api";
import { getMyChannel } from "@/lib/my-channel";
import type { PlaylistWithVideos } from "@/lib/playlists";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [res, myChannel] = await Promise.all([
    serverFetch(`/playlists/${id}`),
    getMyChannel(),
  ]);
  if (!res.ok) {
    notFound();
  }

  const playlist: PlaylistWithVideos = await res.json();
  const isOwner = myChannel?.id === playlist.channel_id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className="mt-2 max-w-xl text-black/80 dark:text-white/80">
              {playlist.description}
            </p>
          )}
          {!playlist.is_public && (
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">
              Private
            </p>
          )}
        </div>
        {isOwner && <DeletePlaylistButton playlistId={playlist.id} />}
      </div>

      <div className="mt-8">
        <PlaylistVideos
          playlistId={playlist.id}
          initialVideos={playlist.videos}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}
