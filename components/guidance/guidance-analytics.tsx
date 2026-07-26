import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { getGuidanceAnalytics } from "@/lib/guidance/monitoring";

type Analytics = ReturnType<typeof getGuidanceAnalytics>;

function DistributionBars({
  items,
}: {
  items: { label: string; count: number }[];
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">No data available yet.</p>
    );
  }

  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>{item.label}</span>
            <span className="font-medium">{item.count}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary/80"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GuidanceAnalyticsView({ data }: { data: Analytics }) {
  const maxDeptAvg = Math.max(
    ...data.departmentComparison.map((d) => d.average),
    0.01
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>University students</CardDescription>
            <CardTitle className="text-2xl">{data.totalStudents}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {data.submittedCount} submitted this week
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average MFBI</CardDescription>
            <CardTitle className="text-2xl">
              {data.averageMfbi != null ? data.averageMfbi.toFixed(2) : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average stress</CardDescription>
            <CardTitle className="text-2xl">
              {data.averageStress != null
                ? data.averageStress.toFixed(1)
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average workload</CardDescription>
            <CardTitle className="text-2xl">
              {data.averageWorkload != null
                ? data.averageWorkload.toFixed(1)
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average study time</CardDescription>
            <CardTitle className="text-2xl">
              {data.averageStudy != null
                ? `${data.averageStudy.toFixed(1)}h`
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average sleep hours</CardDescription>
            <CardTitle className="text-2xl">
              {data.averageSleep != null
                ? `${data.averageSleep.toFixed(1)}h`
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overall burnout risk distribution</CardTitle>
            <CardDescription>
              Count of students by latest burnout risk
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionBars items={data.burnoutDistribution} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Department burnout comparison</CardTitle>
            <CardDescription>Average MFBI by department</CardDescription>
          </CardHeader>
          <CardContent>
            {data.departmentComparison.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No department averages yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.departmentComparison.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="line-clamp-1 pr-2">{item.label}</span>
                      <span className="shrink-0 font-medium">
                        {item.average.toFixed(2)} ({item.count})
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary/80"
                        style={{
                          width: `${(item.average / maxDeptAvg) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly burnout trend</CardTitle>
          <CardDescription>Average MFBI by week number</CardDescription>
        </CardHeader>
        <CardContent>
          {data.weeklyTrends.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No weekly trend yet.
            </p>
          ) : (
            <div className="flex h-44 items-end gap-2">
              {data.weeklyTrends.map((point) => (
                <div
                  key={point.week}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div
                    className="w-full rounded-t-md bg-primary/80"
                    style={{
                      height: `${Math.max(point.average * 100, 8)}%`,
                    }}
                    title={`Week ${point.week}: ${point.average.toFixed(2)} (${point.count})`}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    W{point.week}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
