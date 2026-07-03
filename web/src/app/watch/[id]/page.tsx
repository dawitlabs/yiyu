import { notFound } from "next/navigation";
import { CommentSection } from "@/components/comment-section";
import { ReactionButtons } from "@/components/reaction-buttons";
import { ReportButton } from "@/components/report-button";
import { VideoPlayer } from "@/components/video-player";
import { serverFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Comment } from "@/lib/comments";
import type { Video } from "@/lib/videos";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [res, commentsRes, user] = await Promise.all([
    serverFetch(`/videos/${id}`),
    serverFetch(`/videos/${id}/comments`),
    getCurrentUser(),
  ]);
  if (!res.ok) {
    notFound();
  }

  const video: Video = await res.json();
  const comments: Comment[] = commentsRes.ok ? await commentsRes.json() : [];

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
      <div className="aspect-video overflow-hidden rounded-lg bg-black">
        <VideoPlayer
          videoId={video.id}
          src={video.original_url}
          canRecordHistory={user !== null}
        />
      </div>

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
        <div className="mt-3">
          <ReportButton targetType="videos" targetId={video.id} />
        </div>
      )}

      <CommentSection
        videoId={video.id}
        initialComments={comments}
        currentUserId={user?.id ?? null}
        currentUserRole={user?.role ?? null}
      />
    </div>
  );
}
