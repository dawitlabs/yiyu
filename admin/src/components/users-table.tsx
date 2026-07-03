"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminUser } from "@/lib/users";

const ROLES: AdminUser["role"][] = ["user", "moderator", "admin"];

export function UsersTable({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(id: string, role: AdminUser["role"]) {
    setPendingId(id);
    setError(null);

    const res = await fetch(`/api/admin/users/${id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    setPendingId(null);
    if (!res.ok) {
      setError("Failed to update role.");
      return;
    }
    router.refresh();
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`Delete ${username}? This cannot be undone from here.`)) {
      return;
    }

    setPendingId(id);
    setError(null);

    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });

    setPendingId(null);
    if (!res.ok) {
      setError("Failed to delete user.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-black/60 dark:border-white/10 dark:text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-black/5 last:border-0 dark:border-white/5"
              >
                <td className="px-4 py-3">{user.username}</td>
                <td className="px-4 py-3 text-black/60 dark:text-white/60">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    disabled={pendingId === user.id}
                    onChange={(e) =>
                      handleRoleChange(
                        user.id,
                        e.target.value as AdminUser["role"],
                      )
                    }
                    className="rounded-md border border-black/15 bg-transparent px-2 py-1 disabled:opacity-50 dark:border-white/15"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {user.is_active ? "Active" : "Inactive"}
                </td>
                <td className="px-4 py-3 text-black/60 dark:text-white/60">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={pendingId === user.id}
                    onClick={() => handleDelete(user.id, user.username)}
                    className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
