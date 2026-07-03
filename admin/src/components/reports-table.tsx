"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminReport } from "@/lib/reports";

const STATUSES: AdminReport["status"][] = ["pending", "reviewed", "dismissed"];

export function ReportsTable({ reports }: { reports: AdminReport[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(id: string, status: AdminReport["status"]) {
    setPendingId(id);
    setError(null);

    const res = await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setPendingId(null);
    if (!res.ok) {
      setError("Failed to update status.");
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
              <th className="px-4 py-3 font-medium">Reported by</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Reported</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr
                key={report.id}
                className="border-b border-black/5 last:border-0 dark:border-white/5"
              >
                <td className="px-4 py-3">{report.reporter_username}</td>
                <td className="px-4 py-3 max-w-xs">
                  {report.video_title !== null ? (
                    <span>
                      Video:{" "}
                      <span className="text-black/60 dark:text-white/60">
                        {report.video_title}
                      </span>
                    </span>
                  ) : (
                    <span>
                      Comment:{" "}
                      <span className="text-black/60 dark:text-white/60">
                        {report.comment_content}
                      </span>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-black/60 dark:text-white/60">
                  {report.reason}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={report.status}
                    disabled={pendingId === report.id}
                    onChange={(e) =>
                      handleStatusChange(
                        report.id,
                        e.target.value as AdminReport["status"],
                      )
                    }
                    className="rounded-md border border-black/15 bg-transparent px-2 py-1 disabled:opacity-50 dark:border-white/15"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-black/60 dark:text-white/60">
                  {new Date(report.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
