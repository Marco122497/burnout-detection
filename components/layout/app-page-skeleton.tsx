"use client";

import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

function HeadingSkeleton({
  titleWidth = "w-56",
  descriptionWidth = "w-80",
  withAction = false,
}: {
  titleWidth?: string;
  descriptionWidth?: string;
  withAction?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <Skeleton className={`h-8 ${titleWidth}`} />
        </div>
        <Skeleton className={`h-4 ${descriptionWidth} max-w-full`} />
      </div>
      {withAction ? <Skeleton className="h-9 w-full sm:w-[240px]" /> : null}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="gap-1 py-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-24" />
      </CardHeader>
    </Card>
  );
}

function ChartCardSkeleton({ height = "h-[260px]" }: { height?: string }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`${height} w-full rounded-lg`} />
      </CardContent>
    </Card>
  );
}

function TableRowsSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-3">
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton
              key={col}
              className={`h-8 flex-1 ${col === columns - 1 ? "w-16 max-w-16" : ""}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function FilterCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-9 lg:col-span-2" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TableCardSkeleton({
  rows = 8,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent>
        <TableRowsSkeleton rows={rows} columns={columns} />
      </CardContent>
    </Card>
  );
}

function InstructorDashboardSkeleton() {
  return (
    <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden">
      <HeadingSkeleton
        titleWidth="w-64"
        descriptionWidth="w-72"
        withAction
      />
      <section className="min-w-0 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      </section>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
      <TableCardSkeleton />
    </div>
  );
}

function GuidanceDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <HeadingSkeleton titleWidth="w-52" descriptionWidth="w-96" />
      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height="h-[220px]" />
        <ChartCardSkeleton />
      </div>
      <TableCardSkeleton />
    </div>
  );
}

function StudentDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 shrink-0 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
          <div className="w-full max-w-sm space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2.5 w-full rounded-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </CardContent>
      </Card>
      <div>
        <Skeleton className="h-5 w-64" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="gap-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-7 rounded-md" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-3 w-36" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-2 w-full rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ChartCardSkeleton />
        </div>
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden">
      <HeadingSkeleton
        titleWidth="w-52"
        descriptionWidth="w-80"
        withAction
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height="h-48" />
        <TableCardSkeleton rows={5} columns={4} />
      </div>
    </div>
  );
}

function TablePageSkeleton({
  withFilters = false,
  withWeekControls = false,
  withSearchAction = false,
}: {
  withFilters?: boolean;
  withWeekControls?: boolean;
  withSearchAction?: boolean;
}) {
  return (
    <div className="space-y-6">
      <HeadingSkeleton />
      {withWeekControls ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-32" />
          </CardContent>
        </Card>
      ) : null}
      {withFilters ? <FilterCardSkeleton /> : null}
      {withSearchAction ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="h-9 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <TableRowsSkeleton rows={8} columns={6} />
          </CardContent>
        </Card>
      ) : (
        <TableCardSkeleton />
      )}
    </div>
  );
}

function ReportsSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-40" descriptionWidth="w-96" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-44" descriptionWidth="w-96" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-start justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-3 w-20 shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AnnouncementsSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-48" descriptionWidth="w-96" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-28 w-full" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-28" descriptionWidth="w-72" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-9 w-28" />
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-48" descriptionWidth="w-80" />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <Skeleton className="h-9 w-36" />
        </CardContent>
      </Card>
    </div>
  );
}

function MonitoringFormSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-52" descriptionWidth="w-96" />
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, row) => (
              <div key={row} className="space-y-2">
                <Skeleton className="h-4 w-5/6" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 5 }).map((_, option) => (
                    <Skeleton key={option} className="h-8 w-16" />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-56" descriptionWidth="w-96" />
      <Card>
        <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 shrink-0 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <div className="w-full max-w-sm space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-2 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <ChartCardSkeleton />
      <TableCardSkeleton rows={5} columns={5} />
    </div>
  );
}

function RecommendationsSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-52" descriptionWidth="w-96" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QuestionnaireListSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-48" descriptionWidth="w-80" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionnaireDetailSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-64" descriptionWidth="w-72" />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-start justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DefaultPageSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton />
      <TableCardSkeleton rows={4} columns={4} />
    </div>
  );
}

function normalizePath(href: string) {
  const path = href.split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function isDetailPath(path: string, prefix: string) {
  return path.startsWith(`${prefix}/`) && path.length > prefix.length + 1;
}

export function pageSkeletonForPath(href: string) {
  const path = normalizePath(href);

  if (path === "/profile") return <ProfileSkeleton />;
  if (path === "/change-password") return <PasswordSkeleton />;

  if (isDetailPath(path, "/instructor/monitoring")) return <HistorySkeleton />;
  if (path.startsWith("/instructor/monitoring")) {
    return <TablePageSkeleton withFilters />;
  }
  if (path.startsWith("/instructor/analytics")) return <AnalyticsSkeleton />;
  if (path.startsWith("/instructor/reports")) {
    return <ReportsSkeleton cards={3} />;
  }
  if (path.startsWith("/instructor/notifications")) {
    return <NotificationsSkeleton />;
  }
  if (path.startsWith("/instructor/announcements")) {
    return <AnnouncementsSkeleton />;
  }
  if (path === "/instructor") return <InstructorDashboardSkeleton />;

  if (isDetailPath(path, "/guidance/monitoring")) return <HistorySkeleton />;
  if (path.startsWith("/guidance/monitoring")) {
    return <TablePageSkeleton withFilters withWeekControls />;
  }
  if (path.startsWith("/guidance/analytics")) return <AnalyticsSkeleton />;
  if (path.startsWith("/guidance/reports")) {
    return <ReportsSkeleton cards={5} />;
  }
  if (path.startsWith("/guidance/announcements")) {
    return <AnnouncementsSkeleton />;
  }
  if (isDetailPath(path, "/guidance/questionnaires")) {
    return <QuestionnaireDetailSkeleton />;
  }
  if (path.startsWith("/guidance/questionnaires")) {
    return <QuestionnaireListSkeleton />;
  }
  if (
    path.startsWith("/guidance/students") ||
    path.startsWith("/guidance/departments") ||
    path.startsWith("/guidance/instructors") ||
    path.startsWith("/guidance/admins")
  ) {
    return <TablePageSkeleton withSearchAction />;
  }
  if (path === "/guidance") return <GuidanceDashboardSkeleton />;

  if (
    path.startsWith("/student/monitoring") ||
    path.startsWith("/student/assessment")
  ) {
    return <MonitoringFormSkeleton />;
  }
  if (path.startsWith("/student/burnout")) return <HistorySkeleton />;
  if (path.startsWith("/student/notifications")) {
    return <NotificationsSkeleton />;
  }
  if (path.startsWith("/student/recommendations")) {
    return <RecommendationsSkeleton />;
  }
  if (path === "/student") return <StudentDashboardSkeleton />;

  return <DefaultPageSkeleton />;
}

export function AppPageSkeleton({ href }: { href?: string | null }) {
  const pathname = usePathname();
  return pageSkeletonForPath(href ?? pathname);
}
