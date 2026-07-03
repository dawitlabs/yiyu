import { redirect } from "next/navigation";
import { CreateVideoForm } from "@/components/create-video-form";
import { getCurrentUser } from "@/lib/auth";
import { getMyChannel } from "@/lib/my-channel";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const channel = await getMyChannel();
  if (!channel) {
    redirect("/channel/new");
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Publish a video</h1>
      <CreateVideoForm />
    </div>
  );
}
