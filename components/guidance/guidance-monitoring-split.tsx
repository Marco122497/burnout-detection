"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GenerateMonitoringButton } from "@/components/guidance/generate-monitoring-button";
import type { Department } from "@/lib/auth/roles";
import type { GuidanceStudentRow } from "@/lib/guidance/monitoring";
import { useTablePagination } from "@/hooks/use-table-pagination";
import {
  isGuidanceMonitoringShellPath,
  normalizePath,
  useNavigationPending,
} from "@/components/layout/navigation-pending";
import { TablePagination } from "@/components/shared/table-pagination";
import { RiskLevelText } from "@/components/shared/risk-display";
import { resolveMfbiBurnoutLevel } from "@/lib/student/mfbi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

function selectedStudentId(pathname: string) {
  const match = pathname.match(/\/guidance\/monitoring\/([^/]+)/);
  return match?.[1] ?? null;
}

export function GuidanceMonitoringSplit({
  rows,
  departments,
  currentWeek,
  monitoringOpen,
  children,
}: {
  rows: GuidanceStudentRow[];
  departments: Department[];
  currentWeek: number;
  monitoringOpen: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate, isPending, pendingHref } = useNavigationPending();
  const activeId = selectedStudentId(pathname);

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [departmentId, setDepartmentId] = useState(
    searchParams.get("department_id") ?? ""
  );
  const [yearLevel, setYearLevel] = useState(
    searchParams.get("year_level") ?? ""
  );
  const [risk, setRisk] = useState(searchParams.get("risk") ?? "");
  const [submission, setSubmission] = useState(
    searchParams.get("submission") ?? ""
  );

  const filtered = useMemo(() => {
    const matched = rows.filter((row) => {
      const query = q.trim().toLowerCase();
      if (query) {
        const haystack = [
          row.full_name,
          row.student_number,
          row.email,
          row.department_code,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (departmentId && String(row.department_id) !== departmentId) {
        return false;
      }
      if (yearLevel && String(row.year_level) !== yearLevel) return false;
      if (risk) {
        const level = resolveMfbiBurnoutLevel(row.mfbi_score, row.burnout_level);
        if (risk === "High") {
          if (level !== "High" && level !== "Severe") return false;
        } else if (level !== risk) {
          return false;
        }
      }
      if (submission === "submitted" && !row.submittedThisWeek) return false;
      if (submission === "pending" && row.submittedThisWeek) return false;
      return true;
    });

    return [...matched].sort((a, b) => {
      if (a.submittedThisWeek !== b.submittedThisWeek) {
        return a.submittedThisWeek ? -1 : 1;
      }
      if (a.submittedThisWeek && b.submittedThisWeek) {
        const aTime = a.monitoring_date
          ? new Date(a.monitoring_date).getTime()
          : Number.POSITIVE_INFINITY;
        const bTime = b.monitoring_date
          ? new Date(b.monitoring_date).getTime()
          : Number.POSITIVE_INFINITY;
        if (aTime !== bTime) return aTime - bTime;
      }
      const byLast = (a.last_name || "").localeCompare(b.last_name || "", "en", {
        sensitivity: "base",
      });
      if (byLast !== 0) return byLast;
      const byFirst = (a.first_name || "").localeCompare(
        b.first_name || "",
        "en",
        { sensitivity: "base" }
      );
      if (byFirst !== 0) return byFirst;
      return a.full_name.localeCompare(b.full_name, "en");
    });
  }, [rows, q, departmentId, yearLevel, risk, submission]);

  const selectedDepartment = departments.find(
    (dept) => String(dept.department_id) === departmentId
  );
  const departmentStudents = useMemo(() => {
    if (!departmentId) return [];
    return rows
      .filter((row) => String(row.department_id) === departmentId)
      .slice()
      .sort((a, b) => {
        const byLast = (a.last_name || "").localeCompare(
          b.last_name || "",
          "en",
          { sensitivity: "base" }
        );
        if (byLast !== 0) return byLast;
        return (a.first_name || "").localeCompare(b.first_name || "", "en", {
          sensitivity: "base",
        });
      })
      .map((row) => ({
        id: row.id,
        full_name: row.full_name,
        student_number: row.student_number,
        week_number: row.week_number,
      }));
  }, [rows, departmentId]);

  const {
    page,
    pageSize,
    totalItems,
    pageItems,
    setPage,
    setPageSize,
  } = useTablePagination(filtered, 15);

  useEffect(() => {
    setPage(1);
  }, [q, departmentId, yearLevel, risk, submission, setPage]);

  function filterQuery() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (departmentId) params.set("department_id", departmentId);
    if (yearLevel) params.set("year_level", yearLevel);
    if (risk) params.set("risk", risk);
    if (submission) params.set("submission", submission);
    return params.toString();
  }

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    const query = filterQuery();
    const base = activeId
      ? `/guidance/monitoring/${activeId}`
      : "/guidance/monitoring";
    router.push(query ? `${base}?${query}` : base);
  }

  function openStudent(studentId: string) {
    const query = filterQuery();
    const href = query
      ? `/guidance/monitoring/${studentId}?${query}`
      : `/guidance/monitoring/${studentId}`;
    navigate(href);
  }

  const pendingPath = pendingHref ? normalizePath(pendingHref) : null;
  const pendingInShell =
    isPending &&
    pendingPath != null &&
    isGuidanceMonitoringShellPath(pendingPath);
  const detailOpen = pendingInShell
    ? pendingPath !== "/guidance/monitoring"
    : Boolean(activeId);
  const showListOnMobile = !detailOpen;
  const showDetailOnMobile = detailOpen;
  const showDetailLoading = pendingInShell;

  const detailPaneRef = useRef(children);
  if (!showDetailLoading) {
    detailPaneRef.current = children;
  }

  return (
    <Card className="flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-r-none py-0 ring-0 md:rounded-l-xl md:ring-1 md:ring-foreground/10">
      <CardHeader className="shrink-0 border-b pt-(--card-spacing) @max-3xl/card-header:flex @max-3xl/card-header:flex-col @max-3xl/card-header:gap-3">
        <CardTitle>Student list & weekly monitoring</CardTitle>
        <CardDescription>
          Showing {filtered.length} of {rows.length} students.
        </CardDescription>
        <CardAction className="@max-3xl/card-header:w-full @max-3xl/card-header:justify-self-stretch">
          <form
            onSubmit={applyFilters}
            className="flex flex-wrap items-center justify-end gap-2"
          >
            <Label htmlFor="q" className="sr-only">
              Student
            </Label>
            <Input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, student number, or email"
              className="h-8 w-full min-w-[12rem] sm:w-52"
            />
            <Label htmlFor="department_id" className="sr-only">
              Department
            </Label>
            <select
              id="department_id"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className={cn(selectClassName, "w-auto min-w-[9rem] max-w-[14rem]")}
              aria-label="Department"
            >
              <option value="">Department</option>
              {departments.map((dept) => (
                <option key={dept.department_id} value={dept.department_id}>
                  {dept.department_code}
                </option>
              ))}
            </select>
            <Label htmlFor="year_level" className="sr-only">
              Year Level
            </Label>
            <select
              id="year_level"
              value={yearLevel}
              onChange={(e) => setYearLevel(e.target.value)}
              className={cn(selectClassName, "w-auto min-w-[6.5rem]")}
              aria-label="Year level"
            >
              <option value="">Year</option>
              {[1, 2, 3, 4].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <Label htmlFor="risk" className="sr-only">
              Burnout risk
            </Label>
            <select
              id="risk"
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className={cn(selectClassName, "w-auto min-w-[7rem]")}
              aria-label="Burnout risk"
            >
              <option value="">Risk</option>
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
            </select>
            <Label htmlFor="submission" className="sr-only">
              This week
            </Label>
            <select
              id="submission"
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              className={cn(selectClassName, "w-auto min-w-[8rem]")}
              aria-label="Submission status"
            >
              <option value="">This week</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Not submitted</option>
            </select>
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
                students={departmentStudents}
              />
            ) : null}
            <Button type="submit" size="sm">
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setQ("");
                setDepartmentId("");
                setYearLevel("");
                setRisk("");
                setSubmission("");
                router.push(
                  activeId
                    ? `/guidance/monitoring/${activeId}`
                    : "/guidance/monitoring"
                );
              }}
            >
              Reset
            </Button>
          </form>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside
            className={cn(
              "flex min-h-0 w-full flex-col border-border md:w-80 md:shrink-0 md:border-r lg:w-96",
              showListOnMobile ? "flex" : "hidden md:flex"
            )}
          >
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No students found.
              </p>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <ul className="divide-y divide-border/70">
                    {pageItems.map((row) => {
                      const isActive = activeId === row.id;
                      return (
                        <li key={row.id}>
                          <button
                            type="button"
                            onClick={() => openStudent(row.id)}
                            className={cn(
                              "flex w-full items-start gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-muted/50",
                              isActive && "bg-muted/70"
                            )}
                          >
                            <Avatar className="size-9 shrink-0">
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
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 font-medium leading-snug">
                                  {row.full_name}
                                </p>
                                <p className="shrink-0 text-right text-[11px] leading-snug">
                                  <RiskLevelText
                                    level={row.burnout_level}
                                    score={row.mfbi_score}
                                  />
                                </p>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {row.email
                                  ? `${row.student_number || "—"} | ${row.email}`
                                  : row.student_number || "—"}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {row.submittedThisWeek
                                  ? "Submitted this week"
                                  : "Pending this week"}
                                {row.department_code
                                  ? ` · ${row.department_code}`
                                  : ""}
                                {row.year_level != null
                                  ? ` · Year ${row.year_level}`
                                  : ""}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="shrink-0 border-t px-3 py-2">
                  <TablePagination
                    id="guidance-monitoring-rows-per-page"
                    page={page}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[10, 15, 25, 50]}
                    className="border-0 pt-0 pb-0"
                  />
                </div>
              </>
            )}
          </aside>

          <section
            className={cn(
              "relative flex min-h-0 min-w-0 flex-1 flex-col bg-background",
              showDetailOnMobile ? "flex" : "hidden md:flex"
            )}
          >
            {showDetailLoading ? (
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary/10"
                aria-hidden
              >
                <div className="login-top-progress h-full w-1/4 bg-primary" />
              </div>
            ) : null}
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto p-4 md:p-5",
                showDetailLoading && "pointer-events-none opacity-60"
              )}
              aria-busy={showDetailLoading || undefined}
            >
              {showDetailLoading ? detailPaneRef.current : children}
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
