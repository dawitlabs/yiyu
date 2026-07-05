import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <div className="flex animate-fade-up flex-col gap-6 rounded-md bg-black/60 p-8 shadow-modal sm:p-10">
        <h1 className="font-bold text-3xl tracking-tight">Log in</h1>
        <LoginForm />
        <p className="text-muted-foreground text-sm">
          New to yiyu?{" "}
          <Link href="/signup" className="text-foreground hover:underline">
            Sign up now
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
