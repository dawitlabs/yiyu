import { redirect } from "next/navigation";
import { CreateChannelForm } from "@/components/create-channel-form";
import { getCurrentUser } from "@/lib/auth";
import { getMyChannel } from "@/lib/my-channel";

export default async function NewChannelPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const existing = await getMyChannel();
  if (existing) {
    redirect(`/channel/${existing.handle}`);
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Create your channel
      </h1>
      <CreateChannelForm />
    </div>
  );
}
