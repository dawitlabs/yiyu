import { redirect } from "next/navigation";
import { SignupForm } from "@/components/signup-form";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Create an account
      </h1>
      <SignupForm />
    </div>
  );
}
