"use client";

import { usePathname } from "next/navigation";

import { useNavigationPending } from "@/components/layout/navigation-pending";
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
        <Skeleton className={`h-8 ${titleWidth} max-w-full`} />
        <Skeleton className={`h-4 ${descriptionWidth} max-w-full`} />
      </div>
      {withAction ? <Skeleton className="h-8 w-52 shrink-0 rounded-lg" /> : null}
    </div>
  );
}

function DashboardHeaderSkeleton({
  titleWidth = "w-64",
  descriptionWidth = "w-96",
}: {
  titleWidth?: string;
  descriptionWidth?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-7 w-40 rounded-full" />
        <Skeleton className={`h-8 ${titleWidth} max-w-full`} />
        <Skeleton className={`h-4 ${descriptionWidth} max-w-full`} />
      </div>
      <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:min-w-[220px]">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-full rounded-lg sm:w-[240px]" />
      </div>
    </div>
  );
}

function StatCardSkeleton({
  compact = false,
  emphasize = false,
}: {
  compact?: boolean;
  emphasize?: boolean;
}) {
  return (
    <Card
      className={
        compact
          ? "border-border/70 bg-muted/20 shadow-none"
          : emphasize
            ? "border-orange-300/80 bg-orange-50/70 shadow-sm dark:border-orange-900 dark:bg-orange-950/30"
            : undefined
      }
    >
      <CardHeader
        className={
          compact
            ? "items-center gap-1 py-2 text-center"
            : "items-center gap-1 py-3 text-center"
        }
      >
        {emphasize ? <Skeleton className="h-2.5 w-14" /> : null}
        <Skeleton className={compact ? "h-2.5 w-16" : "h-3 w-24"} />
        <Skeleton className={compact ? "h-7 w-12" : "h-12 w-20"} />
        <Skeleton className={compact ? "h-2.5 w-20" : "h-3 w-32"} />
      </CardHeader>
    </Card>
  );
}

function ChartCardSkeleton({ height = "h-[260px]" }: { height?: string }) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="gap-1.5">
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

function PaginationBarSkeleton() {
  return (
    <div className="flex items-center justify-end gap-3 border-t pt-3">
      <Skeleton className="h-8 w-28 rounded-lg" />
      <Skeleton className="h-8 w-32 rounded-lg" />
    </div>
  );
}

function TableCardSkeleton({
  rows = 10,
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
      <CardContent className="space-y-4">
        <TableRowsSkeleton rows={rows} columns={columns} />
        <PaginationBarSkeleton />
      </CardContent>
    </Card>
  );
}

function SummaryCardsSkeleton() {
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={row} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InstructorDashboardSkeleton() {
  return (
    <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden">
      <DashboardHeaderSkeleton titleWidth="w-72" descriptionWidth="w-80" />
      <section className="min-w-0 space-y-2">
        <Skeleton className="h-3 w-40" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCardSkeleton emphasize />
          <Card className="border-amber-300/80 bg-amber-50/70 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
            <CardHeader className="items-center gap-1 py-3 text-center">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-12 w-16" />
              <Skeleton className="h-3 w-36" />
            </CardHeader>
          </Card>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <StatCardSkeleton key={index} compact />
          ))}
        </div>
      </section>
      <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height="h-[280px]" />
        <ChartCardSkeleton height="h-[280px]" />
      </div>
      <TableCardSkeleton rows={10} columns={6} />
      <TableCardSkeleton rows={10} columns={7} />
      <SummaryCardsSkeleton />
    </div>
  );
}

function GuidanceDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <DashboardHeaderSkeleton titleWidth="w-56" descriptionWidth="w-96" />
      <section className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCardSkeleton emphasize />
          <Card className="border-amber-300/80 bg-amber-50/70 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
            <CardHeader className="items-center gap-1 py-3 text-center">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-12 w-16" />
              <Skeleton className="h-3 w-40" />
            </CardHeader>
          </Card>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, index) => (
            <StatCardSkeleton key={index} compact />
          ))}
        </div>
      </section>
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height="h-[220px]" />
        <ChartCardSkeleton height="h-[260px]" />
      </div>
      <TableCardSkeleton rows={10} columns={7} />
      <TableCardSkeleton rows={10} columns={6} />
      <SummaryCardsSkeleton />
    </div>
  );
}

function StudentDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56 sm:h-10 sm:w-72" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 shrink-0 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
          <div className="w-full max-w-sm space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2.5 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-2.5 w-8" />
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-2.5 w-8" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2 rounded-xl bg-muted/40 p-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
      <div>
        <Skeleton className="h-5 w-64" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} size="sm">
              <CardHeader className="gap-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-8 rounded-full" />
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
      <ChartCardSkeleton height="h-[260px]" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-9 w-56 rounded-lg" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="space-y-2 border-b border-border/70 pb-3 last:border-0 last:pb-0">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function GuidanceAnalyticsSkeleton() {
  return (
    <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden">
      <HeadingSkeleton titleWidth="w-72" descriptionWidth="w-96" />
      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <StatCardSkeleton key={index} emphasize={index === 3} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      </section>
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height="h-[320px]" />
        <ChartCardSkeleton height="h-[320px]" />
      </div>
      <ChartCardSkeleton height="h-[220px]" />
      <ChartCardSkeleton height="h-[250px]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height="h-[200px]" />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      </div>
      <TableCardSkeleton rows={10} columns={6} />
      <TableCardSkeleton rows={10} columns={7} />
    </div>
  );
}

function InstructorAnalyticsSkeleton() {
  return (
    <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden">
      <DashboardHeaderSkeleton titleWidth="w-52" descriptionWidth="w-80" />
      <section className="min-w-0 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <StatCardSkeleton key={index} emphasize={index === 4} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      </section>
      <ChartCardSkeleton height="h-[220px]" />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height="h-[280px]" />
        <ChartCardSkeleton height="h-[280px]" />
      </div>
      <ChartCardSkeleton height="h-[250px]" />
      <TableCardSkeleton rows={10} columns={6} />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
          </div>
          <TableRowsSkeleton rows={10} columns={7} />
          <PaginationBarSkeleton />
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height="h-[220px]" />
        <ChartCardSkeleton height="h-[220px]" />
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
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
            <TableRowsSkeleton rows={10} columns={6} />
            <div className="flex items-center justify-between border-t pt-3">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-32" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <TableCardSkeleton />
      )}
    </div>
  );
}

function MonitoringSplitSkeleton({
  withWeekAction = false,
}: {
  withWeekAction?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <HeadingSkeleton
        titleWidth="w-52"
        descriptionWidth="w-96"
        withAction={withWeekAction}
      />
      <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-r-none py-0 ring-0 md:rounded-l-xl md:ring-1 md:ring-foreground/10">
        <CardHeader className="shrink-0 space-y-3 border-b pt-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="flex min-h-[28rem] flex-1 flex-col md:flex-row">
            <aside className="flex w-full flex-col border-border md:w-80 md:shrink-0 md:border-r lg:w-96">
              <div className="min-h-0 flex-1 space-y-0 overflow-hidden">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2.5 border-b border-border/70 px-3 py-1.5"
                  >
                    <Skeleton className="size-9 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-3 w-44 max-w-full" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 border-t px-3 py-2">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-32" />
              </div>
            </aside>
            <section className="hidden min-h-0 min-w-0 flex-1 flex-col p-4 md:flex md:p-5">
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionnaireTabsSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-48" descriptionWidth="w-96" />
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1 border-b pb-0">
          {["w-24", "w-36", "w-24", "w-28"].map((width, index) => (
            <Skeleton key={index} className={`mb-2 h-7 ${width}`} />
          ))}
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
              <Skeleton className="h-9 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-full max-w-md" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="size-8" />
                    <Skeleton className="size-8" />
                    <Skeleton className="size-8" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-44" descriptionWidth="w-96" />
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-8 w-[150px]" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-8 w-[150px]" />
        </div>
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-72 max-w-full" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <TableRowsSkeleton rows={10} columns={7} />
          <PaginationBarSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-44" descriptionWidth="w-96" />
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-7 rounded-md" />
            <Skeleton className="h-3 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border p-3">
            <TableRowsSkeleton rows={10} columns={7} />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-32" />
          </div>
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

function MonitoringQuestionSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/35 p-3.5">
      <Skeleton className="h-4 w-11/12 max-w-xl" />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {Array.from({ length: 5 }).map((_, option) => (
          <div
            key={option}
            className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-border bg-card px-3.5 py-3"
          >
            <Skeleton className="size-4 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-24 max-w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MonitoringFormSkeleton() {
  const sectionQuestions = [10, 5, 4, 4];

  return (
    <div className="space-y-6">
      <HeadingSkeleton titleWidth="w-52" descriptionWidth="w-full max-w-xl" />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="h-7 w-32 rounded-full" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border bg-muted/60 px-4 py-3">
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </CardContent>
      </Card>
      {sectionQuestions.map((count, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="mb-1 h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-64 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-5">
            {Array.from({ length: count }).map((_, row) => (
              <MonitoringQuestionSkeleton key={row} />
            ))}
          </CardContent>
        </Card>
      ))}
      <div className="border-t border-border pt-4">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Skeleton className="h-11 w-full rounded-lg sm:w-40" />
          <Skeleton className="h-11 w-full rounded-lg sm:w-64" />
        </div>
      </div>
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
            <Skeleton className="size-12 shrink-0 rounded-2xl" />
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
      <div>
        <Skeleton className="h-5 w-64" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} size="sm">
              <CardHeader className="gap-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
      <TableCardSkeleton rows={10} columns={5} />
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
          <Skeleton className="h-4 w-80 max-w-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-36" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
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

export function pageSkeletonForPath(href: string) {
  const path = normalizePath(href);

  if (path === "/profile") return <ProfileSkeleton />;
  if (path === "/change-password") return <PasswordSkeleton />;

  if (path.startsWith("/instructor/monitoring")) {
    return <MonitoringSplitSkeleton />;
  }
  if (path.startsWith("/instructor/analytics")) {
    return <InstructorAnalyticsSkeleton />;
  }
  if (path.startsWith("/instructor/reports")) {
    return <ReportsSkeleton />;
  }
  if (path.startsWith("/instructor/notifications")) {
    return <NotificationsSkeleton />;
  }
  if (path.startsWith("/instructor/announcements")) {
    return <AnnouncementsSkeleton />;
  }
  if (path === "/instructor") return <InstructorDashboardSkeleton />;

  if (path.startsWith("/guidance/monitoring")) {
    return <MonitoringSplitSkeleton withWeekAction />;
  }
  if (path.startsWith("/guidance/analytics")) {
    return <GuidanceAnalyticsSkeleton />;
  }
  if (path.startsWith("/guidance/reports")) {
    return <ReportsSkeleton />;
  }
  if (path.startsWith("/guidance/announcements")) {
    return <AnnouncementsSkeleton />;
  }
  if (path.startsWith("/guidance/questionnaires")) {
    return <QuestionnaireTabsSkeleton />;
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
  const { pendingHref } = useNavigationPending();
  return pageSkeletonForPath(pendingHref || href || pathname || "/");
}
