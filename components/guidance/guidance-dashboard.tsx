import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GuidanceDashboardCharts,
  type GuidanceDashboardChartData,
} from "@/components/guidance/guidance-dashboard-charts";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="gap-0.5">
        <CardDescription className="text-xs">{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardHeader>
    </Card>
  );
}

export function GuidanceDashboard({
  firstName,
  stats,
  charts,
}: {
  firstName: string;
  stats: {
    instructorCount: number;
    studentCount: number;
    departmentCount: number;
    activeDeptCount: number;
    questionnaireCount: number;
    highRiskCount: number;
  };
  charts: GuidanceDashboardChartData;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Guidance portal</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Welcome, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage users, questionnaires, university-wide monitoring, analytics,
          and announcements.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Departments"
          value={stats.departmentCount}
          hint={`${stats.activeDeptCount} active`}
        />
        <StatCard label="Instructors" value={stats.instructorCount} />
        <StatCard label="Students" value={stats.studentCount} />
        <StatCard label="Questionnaires" value={stats.questionnaireCount} />
        <StatCard
          label="High / severe risk"
          value={stats.highRiskCount}
          hint="Latest snapshot"
        />
      </div>

      <GuidanceDashboardCharts data={charts} />
    </div>
  );
}
