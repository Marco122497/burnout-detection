"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import type { StudentMonitorRow } from "@/lib/instructor/queries";
import { useNavigationPending } from "@/components/layout/navigation-pending";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function StudentMonitoringTable({
  rows,
}: {
  rows: StudentMonitorRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { navigate, isPending, pendingHref } = useNavigationPending();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [yearLevel, setYearLevel] = useState(
    searchParams.get("year_level") ?? ""
  );
  const [risk, setRisk] = useState(searchParams.get("risk") ?? "");

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const query = q.trim().toLowerCase();
      if (query) {
        const haystack = [row.full_name, row.student_number]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (yearLevel && String(row.year_level) !== yearLevel) return false;
      if (risk) {
        const level = row.prediction || row.burnout_level;
        if (risk === "High") {
          if (level !== "High" && level !== "Severe") return false;
        } else if (level !== risk) {
          return false;
        }
      }
      return true;
    });
  }, [rows, q, yearLevel, risk]);

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (yearLevel) params.set("year_level", yearLevel);
    if (risk) params.set("risk", risk);
    const query = params.toString();
    router.push(
      query ? `/instructor/monitoring?${query}` : "/instructor/monitoring"
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search students</CardTitle>
          <CardDescription>
            Students are limited to your assigned department. Filter by year
            level or burnout risk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={applyFilters}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="q">Student</Label>
              <Input
                id="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name or student number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year_level">Year Level</Label>
              <select
                id="year_level"
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                {[1, 2, 3, 4, 5, 6].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk">Burnout risk</Label>
              <select
                id="risk"
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High / Severe</option>
              </select>
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit">Apply filters</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQ("");
                  setYearLevel("");
                  setRisk("");
                  router.push("/instructor/monitoring");
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student list & weekly monitoring</CardTitle>
          <CardDescription>
            Showing {filtered.length} of {rows.length} students. Open a student
            to view assessment history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Student</th>
                    <th className="px-2 py-2 font-medium">Year</th>
                    <th className="px-2 py-2 font-medium">Stress</th>
                    <th className="px-2 py-2 font-medium">Workload</th>
                    <th className="px-2 py-2 font-medium">Study</th>
                    <th className="px-2 py-2 font-medium">Sleep</th>
                    <th className="px-2 py-2 font-medium">MFBI</th>
                    <th className="px-2 py-2 font-medium">Risk</th>
                    <th className="px-2 py-2 font-medium">Week</th>
                    <th className="px-2 py-2 font-medium">History</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        <p className="font-medium">{row.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.student_number || "—"}
                        </p>
                      </td>
                      <td className="px-2 py-2">{row.year_level ?? "—"}</td>
                      <td className="px-2 py-2">
                        {row.stress_level
                          ? `${row.stress_level} (${row.stress_score})`
                          : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {row.academic_workload ?? "—"}
                      </td>
                      <td className="px-2 py-2">
                        {row.study_time != null ? `${row.study_time}h` : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {row.sleep_hours != null ? `${row.sleep_hours}h` : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {row.mfbi_score != null
                          ? row.mfbi_score.toFixed(2)
                          : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {row.prediction || row.burnout_level || "—"}
                      </td>
                      <td className="px-2 py-2">
                        {row.submittedThisWeek ? "Submitted" : "Pending"}
                      </td>
                      <td className="px-2 py-2">
                        {(() => {
                          const viewHref = `/instructor/monitoring/${row.id}`;
                          const viewLoading =
                            isPending && pendingHref === viewHref;
                          return (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={viewLoading}
                              onClick={() => navigate(viewHref)}
                            >
                              {viewLoading ? (
                                <>
                                  <Loader2 className="animate-spin" />
                                  Loading…
                                </>
                              ) : (
                                "View"
                              )}
                            </Button>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
