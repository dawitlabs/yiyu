import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToPlaylist } from "@/components/add-to-playlist";
import { Avatar } from "@/components/avatar";
import { CaptionManager } from "@/components/caption-manager";
import { ChapterManager } from "@/components/chapter-manager";
import { CommentSection } from "@/components/comment-section";
import { BookmarkIcon, MoreIcon } from "@/components/icons";
import { PopoverButton } from "@/components/popover-button";
import { ReactionButtons } from "@/components/reaction-buttons";
import { ReportButton } from "@/components/report-button";
import { ShareButton } from "@/components/share-button";
import { SubscribeButton } from "@/components/subscribe-button";
import { VideoDescription } from "@/components/video-description";
import { VideoListItem } from "@/components/video-list-item";
import { VideoPlayer } from "@/components/video-player";
import { WatchLaterButton } from "@/components/watch-later-button";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Caption } from "@/lib/captions";
import type { Channel } from "@/lib/channels";
import type { Chapter } from "@/lib/chapters";
import type { Comment } from "@/lib/comments";
import { getMyChannel } from "@/lib/my-channel";
import type { Playlist } from "@/lib/playlists";
import type { EndScreen, Video } from "@/lib/videos";

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
    endScreensRes,
    user,
    myChannel,
  ] = await Promise.all([
    serverFetch(`/videos/${id}`),
    serverFetch(`/videos/${id}/comments`),
    serverFetch(`/videos/${id}/related`),
    serverFetch(`/videos/${id}/captions`),
    serverFetch(`/videos/${id}/chapters`),
    serverFetch(`/videos/${id}/end-screens`),
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
  const endScreens: EndScreen[] = endScreensRes.ok ? await endScreensRes.json() : [];
  const isOwner = myChannel?.id === video.channel_id;

  const channelRes = await serverFetch(`/channels/${video.channel_handle}`);
  const channel: Channel | null = channelRes.ok
    ? await channelRes.json()
    : null;

  let isSubscribed = false;
  if (user && channel && !isOwner) {
    const subRes = await serverFetch(`/channels/${channel.id}/subscription`);
    if (subRes.ok) {
      const sub: { subscribed: boolean } = await subRes.json();
      isSubscribed = sub.subscribed;
    }
  }

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

  let isInWatchLater = false;
  if (user) {
    const watchLaterRes = await serverFetch(`/videos/${id}/watch-later`);
    if (watchLaterRes.ok) {
      const status: { in_watch_later: boolean } = await watchLaterRes.json();
      isInWatchLater = status.in_watch_later;
    }
  }

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0">
        <VideoPlayer
          videoId={video.id}
          src={video.hls_playlist_url || video.original_url}
          canRecordHistory={user !== null}
          captions={captions}
          chapters={chapters}
          endScreens={endScreens}
          nextVideo={
            relatedVideos[0]
              ? {
                  id: relatedVideos[0].id,
                  title: relatedVideos[0].title,
                  thumbnailUrl: relatedVideos[0].thumbnail_url,
                }
              : undefined
          }
        />

        {isOwner && (
          <div className="mt-2 flex gap-2">
            <Link
              href={`/watch/${video.id}/edit`}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              Edit video
            </Link>
          </div>
        )}
        {isOwner && (
          <>
            <CaptionManager videoId={video.id} initialCaptions={captions} />
            <ChapterManager videoId={video.id} initialChapters={chapters} />
          </>
        )}

        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          {video.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/channel/${video.channel_handle}`}
            className="flex items-center gap-3"
          >
            <Avatar src={channel?.avatar_url ?? ""} name={video.channel_name} />
            <span>
              <span className="block font-medium">{video.channel_name}</span>
              {channel && (
                <span className="block text-black/60 text-xs dark:text-white/60">
                  {channel.subscriber_count} subscribers
                </span>
              )}
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {channel && !isOwner && user && (
              <SubscribeButton
                channelId={channel.id}
                initialSubscribed={isSubscribed}
              />
            )}
            <ReactionButtons
              videoId={video.id}
              initialLikes={video.likes_count}
              initialDislikes={video.dislikes_count}
              initialReaction={initialReaction}
              canReact={user !== null}
            />
            <ShareButton title={video.title} />
            {user && (
              <WatchLaterButton
                videoId={video.id}
                initialInWatchLater={isInWatchLater}
              />
            )}
            {myChannel && myPlaylists.length > 0 && (
              <PopoverButton
                ariaLabel="Save to playlist"
                buttonClassName="flex items-center gap-2 rounded-full border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
                buttonContent={
                  <>
                    <BookmarkIcon className="h-4 w-4" />
                    Save
                  </>
                }
              >
                <div className="rounded-lg border border-black/10 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-neutral-900">
                  <AddToPlaylist videoId={video.id} playlists={myPlaylists} />
                </div>
              </PopoverButton>
            )}
            {user && (
              <PopoverButton
                align="right"
                ariaLabel="More actions"
                buttonClassName="rounded-full border border-black/15 p-2 dark:border-white/15"
                buttonContent={<MoreIcon className="h-4 w-4" />}
              >
                <div className="rounded-lg border border-black/10 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-neutral-900">
                  <ReportButton
                    targetType="videos"
                    targetId={video.id}
                    className="block rounded px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
                  />
                </div>
              </PopoverButton>
            )}
          </div>
        </div>

        <VideoDescription
          viewsCount={video.views_count}
          uploadedAt={video.uploaded_at}
          description={video.description}
        />

        <CommentSection
          videoId={video.id}
          initialComments={comments}
          currentUserId={user?.id ?? null}
          currentUserRole={user?.role ?? null}
        />
      </div>

      {relatedVideos.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-lg tracking-tight">Up next</h2>
          {relatedVideos.map((relatedVideo) => (
            <VideoListItem key={relatedVideo.id} video={relatedVideo} />
          ))}
        </div>
      )}
    </div>
  );
}
