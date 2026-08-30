"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import type { StudentMonitorRow } from "@/lib/instructor/queries";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { useNavigationPending } from "@/components/layout/navigation-pending";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  scoreOverMax,
} from "@/components/shared/risk-display";
import { STUDY_TIME_SCORE_MAX } from "@/lib/student/scale-options";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

function nameInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

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
        const haystack = [row.full_name, row.student_number, row.email]
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

  const {
    page,
    pageSize,
    totalItems,
    pageItems,
    setPage,
    setPageSize,
  } = useTablePagination(filtered);

  useEffect(() => {
    setPage(1);
  }, [q, yearLevel, risk, setPage]);

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
                placeholder="Name, student number, or email"
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
        <CardContent className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Student</th>
                      <th className="px-2 py-1.5 font-medium">Year</th>
                      <th className="px-2 py-1.5 font-medium">Stress</th>
                      <th className="px-2 py-1.5 font-medium">Workload</th>
                      <th className="px-2 py-1.5 font-medium">Study</th>
                      <th className="px-2 py-1.5 font-medium">Sleep Risk</th>
                      <th className="px-2 py-1.5 font-medium">MFBI</th>
                      <th className="px-2 py-1.5 font-medium">Risk</th>
                      <th className="px-2 py-1.5 font-medium">Week</th>
                      <th className="px-2 py-1.5 font-medium">History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-2 py-1.5">
                          <div className="flex items-start gap-2.5">
                            <Avatar className="size-8 shrink-0">
                              {row.profile_picture ? (
                                <AvatarImage
                                  src={row.profile_picture}
                                  alt={row.full_name}
                                />
                              ) : null}
                              <AvatarFallback className="text-xs">
                                {nameInitials(row.full_name) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium">{row.full_name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {row.email
                                  ? `${row.student_number || "—"} | ${row.email}`
                                  : row.student_number || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5">{row.year_level ?? "—"}</td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {scoreOverMax(row.stress_score, 40)}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {scoreOverMax(row.academic_workload, 10)}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {scoreOverMax(row.study_time, STUDY_TIME_SCORE_MAX)}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {scoreOverMax(row.sleep_hours, 100)}
                        </td>
                        <td className="px-2 py-1.5">
                          {row.mfbi_score != null
                            ? row.mfbi_score.toFixed(2)
                            : "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          {row.prediction || row.burnout_level || "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          {row.submittedThisWeek ? "Submitted" : "Pending"}
                        </td>
                        <td className="px-2 py-1.5">
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
              <TablePagination
                id="instructor-monitoring-rows-per-page"
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                className="justify-end gap-4 sm:justify-end"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
