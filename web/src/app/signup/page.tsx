import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/signup-form";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <div className="flex animate-fade-up flex-col gap-6 rounded-md bg-black/60 p-8 shadow-modal sm:p-10">
        <h1 className="font-bold text-3xl tracking-tight">
          Create an account
        </h1>
        <SignupForm />
        <p className="text-muted-foreground text-sm">
          Already on yiyu?{" "}
          <Link href="/login" className="text-foreground hover:underline">
            Log in
          </Link>
          .
        </p>
        <p className="text-muted-foreground text-xs">
          By signing up, you agree to our{" "}
          <a href="/terms" className="underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
