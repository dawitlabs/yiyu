import { notFound } from "next/navigation";
import { AddToPlaylist } from "@/components/add-to-playlist";
import { CaptionManager } from "@/components/caption-manager";
import { ChapterManager } from "@/components/chapter-manager";
import { CommentSection } from "@/components/comment-section";
import { ReactionButtons } from "@/components/reaction-buttons";
import { ReportButton } from "@/components/report-button";
import { VideoGrid } from "@/components/video-grid";
import { VideoPlayer } from "@/components/video-player";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Caption } from "@/lib/captions";
import type { Chapter } from "@/lib/chapters";
import type { Comment } from "@/lib/comments";
import { getMyChannel } from "@/lib/my-channel";
import type { Playlist } from "@/lib/playlists";
import type { Video } from "@/lib/videos";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    res,
    commentsRes,
    relatedRes,
    captionsRes,
    chaptersRes,
    user,
    myChannel,
  ] = await Promise.all([
    serverFetch(`/videos/${id}`),
    serverFetch(`/videos/${id}/comments`),
    serverFetch(`/videos/${id}/related`),
    serverFetch(`/videos/${id}/captions`),
    serverFetch(`/videos/${id}/chapters`),
    getCurrentUser(),
    getMyChannel(),
  ]);
  if (!res.ok) {
    notFound();
  }

  const video: Video = await res.json();
  const comments: Comment[] = commentsRes.ok ? await commentsRes.json() : [];
  const relatedVideos: Video[] = relatedRes.ok ? await relatedRes.json() : [];
  const captions: Caption[] = captionsRes.ok ? await captionsRes.json() : [];
  const chapters: Chapter[] = chaptersRes.ok ? await chaptersRes.json() : [];
  const isOwner = myChannel?.id === video.channel_id;

  let myPlaylists: Playlist[] = [];
  if (myChannel) {
    const playlistsRes = await serverFetch(
      `/channels/${myChannel.handle}/playlists`,
    );
    if (playlistsRes.ok) {
      myPlaylists = await playlistsRes.json();
    }
  }

  let initialReaction: "like" | "dislike" | null = null;
  if (user) {
    const reactionRes = await serverFetch(`/videos/${id}/reaction`);
    if (reactionRes.ok) {
      const reaction: { type: "like" | "dislike" | null } =
        await reactionRes.json();
      initialReaction = reaction.type;
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <VideoPlayer
        videoId={video.id}
        src={video.hls_playlist_url || video.original_url}
        canRecordHistory={user !== null}
        captions={captions}
        chapters={chapters}
      />

      {isOwner && (
        <>
          <CaptionManager videoId={video.id} initialCaptions={captions} />
          <ChapterManager videoId={video.id} initialChapters={chapters} />
        </>
      )}

      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        {video.title}
      </h1>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm text-black/60 dark:text-white/60">
          {video.views_count} views
        </p>
        <ReactionButtons
          videoId={video.id}
          initialLikes={video.likes_count}
          initialDislikes={video.dislikes_count}
          initialReaction={initialReaction}
          canReact={user !== null}
        />
      </div>
      {video.description && (
        <p className="mt-3 whitespace-pre-wrap text-black/80 dark:text-white/80">
          {video.description}
        </p>
      )}
      {user && (
        <div className="mt-3 flex items-center gap-4">
          <ReportButton targetType="videos" targetId={video.id} />
          {myChannel && (
            <AddToPlaylist videoId={video.id} playlists={myPlaylists} />
          )}
        </div>
      )}

      <CommentSection
        videoId={video.id}
        initialComments={comments}
        currentUserId={user?.id ?? null}
        currentUserRole={user?.role ?? null}
      />

      {relatedVideos.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">
            Related videos
          </h2>
          <div className="mt-4">
            <VideoGrid videos={relatedVideos} />
          </div>
        </div>
      )}
    </div>
  );
}
