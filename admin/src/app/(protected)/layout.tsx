import { Nav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAdmin();

  return (
    <>
      <Nav user={user} />
      <main className="flex-1">{children}</main>
    </>
  );
}
