"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { GenerateMonitoringButton } from "@/components/guidance/generate-monitoring-button";
import type { Department } from "@/lib/auth/roles";
import type { GuidanceStudentRow } from "@/lib/guidance/monitoring";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { useNavigationPending } from "@/components/layout/navigation-pending";
import {
  formatNormalizedFactor,
  normalizeFactorScore,
} from "@/components/shared/risk-display";
import { STUDY_TIME_SCORE_MAX } from "@/lib/student/scale-options";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function GuidanceStudentMonitoring({
  rows,
  departments,
  currentWeek,
  monitoringOpen,
}: {
  rows: GuidanceStudentRow[];
  departments: Department[];
  currentWeek: number;
  monitoringOpen: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { navigate, isPending, pendingHref } = useNavigationPending();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [departmentId, setDepartmentId] = useState(
    searchParams.get("department_id") ?? ""
  );
  const [course, setCourse] = useState(searchParams.get("course") ?? "");
  const [yearLevel, setYearLevel] = useState(
    searchParams.get("year_level") ?? ""
  );
  const [section, setSection] = useState(searchParams.get("section") ?? "");
  const [risk, setRisk] = useState(searchParams.get("risk") ?? "");

  const sectionOptions = useMemo(() => {
    return [
      ...new Set(
        rows
          .map((r) => r.section)
          .filter((value): value is string => Boolean(value))
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [rows]);

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
      if (departmentId && String(row.department_id) !== departmentId) {
        return false;
      }
      if (course.trim()) {
        const needle = course.trim().toLowerCase();
        const haystack = [row.course, row.department_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (yearLevel && String(row.year_level) !== yearLevel) return false;
      if (
        section &&
        (row.section || "").toLowerCase() !== section.toLowerCase()
      ) {
        return false;
      }
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
  }, [rows, q, departmentId, course, yearLevel, section, risk]);

  const selectedDepartment = departments.find(
    (dept) => String(dept.department_id) === departmentId
  );
  const departmentStudentCount = useMemo(() => {
    if (!departmentId) return 0;
    return rows.filter(
      (row) => String(row.department_id) === departmentId
    ).length;
  }, [rows, departmentId]);

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
  }, [q, departmentId, course, yearLevel, section, risk, setPage]);

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (departmentId) params.set("department_id", departmentId);
    if (course.trim()) params.set("course", course.trim());
    if (yearLevel) params.set("year_level", yearLevel);
    if (section) params.set("section", section);
    if (risk) params.set("risk", risk);
    const query = params.toString();
    router.push(
      query ? `/guidance/monitoring?${query}` : "/guidance/monitoring"
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search students</CardTitle>
          <CardDescription>
            Monitor students across all departments. Filter by department,
            course, year level, section, or burnout risk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={applyFilters}
            className="flex flex-col gap-3 lg:flex-row lg:items-end"
          >
            <div className="w-full space-y-2 lg:w-64 lg:shrink-0">
              <Label htmlFor="q">Student</Label>
              <Input
                id="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, student number, or email"
              />
            </div>
            <div className="w-full space-y-2 lg:w-56 lg:shrink-0">
              <Label htmlFor="department_id">Department</Label>
              <select
                id="department_id"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.department_code} — {dept.department_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full space-y-2 lg:w-32 lg:shrink-0">
              <Label htmlFor="year_level">Year Level</Label>
              <select
                id="year_level"
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                {[1, 2, 3, 4].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="submit">Apply filters</Button>
              {departmentId ? (
                <GenerateMonitoringButton
                  departmentId={departmentId}
                  departmentLabel={
                    selectedDepartment
                      ? `${selectedDepartment.department_code} — ${selectedDepartment.department_name}`
                      : "Selected department"
                  }
                  currentWeek={currentWeek}
                  monitoringOpen={monitoringOpen}
                  studentCount={departmentStudentCount}
                />
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQ("");
                  setDepartmentId("");
                  setCourse("");
                  setYearLevel("");
                  setSection("");
                  setRisk("");
                  router.push("/guidance/monitoring");
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
            Showing {filtered.length} of {rows.length} students across all
            departments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Student</th>
                      <th className="px-2 py-1.5 font-medium">Department</th>
                      <th className="px-2 py-1.5 font-medium">Year</th>
                      <th className="px-2 py-1.5 font-medium">Stress</th>
                      <th className="px-2 py-1.5 font-medium">Workload</th>
                      <th className="px-2 py-1.5 font-medium">Study</th>
                      <th className="px-2 py-1.5 font-medium">Sleep</th>
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
                          <p className="font-medium">{row.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.email
                              ? `${row.student_number || "—"} | ${row.email}`
                              : row.student_number || "—"}
                          </p>
                        </td>
                        <td className="px-2 py-1.5">
                          {row.department_name || "—"}
                        </td>
                        <td className="px-2 py-1.5">{row.year_level ?? "—"}</td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {formatNormalizedFactor(
                            normalizeFactorScore(row.stress_score, 40)
                          )}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {formatNormalizedFactor(
                            normalizeFactorScore(row.academic_workload, 10)
                          )}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {formatNormalizedFactor(
                            normalizeFactorScore(row.study_time, STUDY_TIME_SCORE_MAX)
                          )}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {formatNormalizedFactor(
                            normalizeFactorScore(row.sleep_hours, 100)
                          )}
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
                            const viewHref = `/guidance/monitoring/${row.id}`;
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
                id="monitoring-rows-per-page"
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
