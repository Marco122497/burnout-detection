import Link from "next/link";
import {
  AlertTriangleIcon,
  BellIcon,
  ChartColumnIcon,
  ClipboardCheckIcon,
  ClockIcon,
  UsersIcon,
} from "lucide-react";

import type { InstructorDashboardData } from "@/lib/instructor/queries";
import { formatDateTime } from "@/lib/auth/roles";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="mt-1 font-[family-name:var(--font-display)] text-2xl">
            {value}
          </CardTitle>
        </div>
        <div className="rounded-md bg-muted p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      {hint ? (
        <CardContent>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function InstructorDashboard({
  firstName,
  data,
}: {
  firstName: string;
  data: InstructorDashboardData;
}) {
  const maxRisk = Math.max(
    ...data.burnoutDistribution.map((item) => item.count),
    1
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Instructor portal</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Department monitoring
            {data.departmentName ? ` · ${data.departmentName}` : ""}
            {data.currentWeek ? ` · Week ${data.currentWeek}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/instructor/monitoring"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Student monitoring
          </Link>
          <Link
            href="/instructor/analytics"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Analytics
          </Link>
          <Link
            href="/instructor/announcements"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Announcements
          </Link>
        </div>
      </div>

      {!data.departmentName ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="py-4 text-sm text-amber-950">
            Your instructor account has no assigned department yet. Ask the
            Guidance Counselor to assign you to a department.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total students (department)"
          value={String(data.totalStudents)}
          hint={data.departmentName ?? "Unassigned department"}
          icon={UsersIcon}
        />
        <StatCard
          label="Submitted this week"
          value={String(data.submittedCount)}
          hint={data.currentWeek ? `Week ${data.currentWeek}` : undefined}
          icon={ClipboardCheckIcon}
        />
        <StatCard
          label="Pending submission"
          value={String(data.pendingCount)}
          icon={ClockIcon}
        />
        <StatCard
          label="High-risk students"
          value={String(data.highRiskCount)}
          hint="High or Severe burnout risk"
          icon={AlertTriangleIcon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartColumnIcon className="size-4" />
              Burnout risk distribution
            </CardTitle>
            <CardDescription>
              Latest predicted / MFBI risk across your department.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.burnoutDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No assessment results yet.
              </p>
            ) : (
              data.burnoutDistribution.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary/80"
                      style={{
                        width: `${(item.count / maxRisk) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>High-risk students</CardTitle>
            <CardDescription>
              Students currently flagged High or Severe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.highRiskStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No high-risk students right now.
              </p>
            ) : (
              data.highRiskStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{student.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[student.student_number, student.course, student.section]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">
                      {student.prediction || student.burnout_level}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MFBI {student.mfbi_score?.toFixed(2) ?? "—"}
                    </p>
                  </div>
                </div>
              ))
            )}
            <Link
              href="/instructor/monitoring?risk=High"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              View monitoring list
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="size-4" />
            Recent notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            data.notifications.map((item) => (
              <div
                key={item.notification_id}
                className="border-b border-border/70 pb-2 last:border-0 last:pb-0"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {item.message}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(item.created_at)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
