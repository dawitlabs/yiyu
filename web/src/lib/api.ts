import { cookies } from "next/headers";

const apiUrl = process.env.API_URL ?? "http://localhost:8082";

export async function serverFetch(path: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");

  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      ...(session ? { Cookie: `session=${session.value}` } : {}),
    },
    cache: "no-store",
  });
}
