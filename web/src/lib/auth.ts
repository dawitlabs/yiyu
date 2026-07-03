import { cookies } from "next/headers";

const apiUrl = process.env.API_URL ?? "http://localhost:8081";

export type User = {
  id: string;
  username: string;
  email: string;
};

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) {
    return null;
  }

  const res = await fetch(`${apiUrl}/me`, {
    headers: { Cookie: `session=${session.value}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}
