import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        {user ? `Welcome back, ${user.username}.` : "Welcome to yiyu."}
      </h1>
      <p className="mt-2 text-black/60 dark:text-white/60">
        {user
          ? "The feed isn't built yet — this is just proof the session is real."
          : "Sign up or log in to get started."}
      </p>
    </div>
  );
}
