import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { getInstructorAnalytics } from "@/lib/instructor/queries";

type Analytics = ReturnType<typeof getInstructorAnalytics>;

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

export function InstructorAnalyticsView({
  data,
  departmentName,
}: {
  data: Analytics;
  departmentName: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Department students</CardDescription>
            <CardTitle className="text-2xl">{data.totalStudents}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {departmentName || "Assigned department"}
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
            <CardDescription>Average stress (PSS)</CardDescription>
            <CardTitle className="text-2xl">
              {data.averageStress != null
                ? data.averageStress.toFixed(1)
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Submitted this week</CardDescription>
            <CardTitle className="text-2xl">{data.submittedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Burnout risk distribution</CardTitle>
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
            <CardTitle>Stress level distribution</CardTitle>
            <CardDescription>Count of students by PSS level</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionBars items={data.stressDistribution} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly monitoring trends</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Monthly trends</CardTitle>
            <CardDescription>Average MFBI by month</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionBars
              items={data.monthlyTrends.map((item) => ({
                label: `${item.month} (${item.average.toFixed(2)})`,
                count: item.count,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
