import { UsersTable } from "@/components/users-table";
import { serverFetch } from "@/lib/api";
import type { AdminUser } from "@/lib/users";

export default async function UsersPage() {
  const res = await serverFetch("/admin/users");
  const users: AdminUser[] = res.ok ? await res.json() : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mt-1 text-black/60 dark:text-white/60">
        {users.length} user{users.length === 1 ? "" : "s"}
      </p>
      <div className="mt-6">
        <UsersTable users={users} />
      </div>
    </div>
  );
}
