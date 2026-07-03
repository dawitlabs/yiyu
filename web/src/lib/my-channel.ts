import { serverFetch } from "@/lib/api";
import type { Channel } from "@/lib/channels";

export async function getMyChannel(): Promise<Channel | null> {
  const res = await serverFetch("/channels/me");
  if (!res.ok) {
    return null;
  }
  return res.json();
}
