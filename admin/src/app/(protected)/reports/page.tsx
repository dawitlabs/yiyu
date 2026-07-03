import { ReportsTable } from "@/components/reports-table";
import { serverFetch } from "@/lib/api";
import type { AdminReport } from "@/lib/reports";

export default async function ReportsPage() {
  const res = await serverFetch("/admin/reports");
  const reports: AdminReport[] = res.ok ? await res.json() : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
      <p className="mt-1 text-black/60 dark:text-white/60">
        {reports.length} report{reports.length === 1 ? "" : "s"}
      </p>
      <div className="mt-6">
        <ReportsTable reports={reports} />
      </div>
    </div>
  );
}
