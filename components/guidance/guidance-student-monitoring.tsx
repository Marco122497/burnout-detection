"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { Department } from "@/lib/auth/roles";
import type { GuidanceStudentRow } from "@/lib/guidance/monitoring";
import { buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function GuidanceStudentMonitoring({
  rows,
  departments,
}: {
  rows: GuidanceStudentRow[];
  departments: Department[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
        const haystack = [row.full_name, row.student_number]
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
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
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
            {/* <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Input
                id="course"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="Course name"
              />
            </div> */}
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
            {/* <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <select
                id="section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className={selectClassName}
              >
                <option value="">All</option>
                {sectionOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
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
            </div> */}
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="submit">Apply filters</Button>
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
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Student</th>
                    <th className="px-2 py-2 font-medium">Department</th>
                    <th className="px-2 py-2 font-medium">Year</th>
                    <th className="px-2 py-2 font-medium">Section</th>
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
                      <td className="px-2 py-2">
                        {row.department_name || "—"}
                      </td>
                      <td className="px-2 py-2">{row.year_level ?? "—"}</td>
                      <td className="px-2 py-2">{row.section || "—"}</td>
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
                        <Link
                          href={`/guidance/monitoring/${row.id}`}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" })
                          )}
                        >
                          View
                        </Link>
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
