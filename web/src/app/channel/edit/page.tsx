import { redirect } from "next/navigation";
import { EditChannelForm } from "@/components/edit-channel-form";
import { getCurrentUser } from "@/lib/auth";
import { getMyChannel } from "@/lib/my-channel";

export default async function EditChannelPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const channel = await getMyChannel();
  if (!channel) {
    redirect("/channel/new");
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Edit channel</h1>
      <EditChannelForm channel={channel} />
    </div>
  );
}
