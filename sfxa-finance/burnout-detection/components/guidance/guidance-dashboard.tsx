import Link from "next/link";
import {
  Building2Icon,
  ChartColumnIcon,
  ClipboardListIcon,
  FileTextIcon,
  MegaphoneIcon,
  UserRoundCogIcon,
  UsersIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function GuidanceDashboard({
  firstName,
  stats,
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Departments</CardDescription>
            <CardTitle className="text-2xl">{stats.departmentCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.activeDeptCount} active
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Instructors</CardDescription>
            <CardTitle className="text-2xl">{stats.instructorCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Students</CardDescription>
            <CardTitle className="text-2xl">{stats.studentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Questionnaires</CardDescription>
            <CardTitle className="text-2xl">
              {stats.questionnaireCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High / severe risk</CardDescription>
            <CardTitle className="text-2xl">{stats.highRiskCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Latest monitoring snapshot
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          {
            href: "/guidance/departments",
            title: "Departments",
            description: "Add, edit, activate, and view membership counts.",
            icon: Building2Icon,
          },
          {
            href: "/guidance/instructors",
            title: "Instructors",
            description: "Create accounts, assign departments, reset passwords.",
            icon: UserRoundCogIcon,
          },
          {
            href: "/guidance/questionnaires",
            title: "Questionnaires",
            description:
              "Manage PSS, workload, study, and sleep questions and schedules.",
            icon: ClipboardListIcon,
          },
          {
            href: "/guidance/monitoring",
            title: "Student Monitoring",
            description: "Search and review weekly results across departments.",
            icon: UsersIcon,
          },
          {
            href: "/guidance/analytics",
            title: "Analytics",
            description:
              "University burnout distribution, averages, and weekly trends.",
            icon: ChartColumnIcon,
          },
          {
            href: "/guidance/reports",
            title: "Reports",
            description: "Export university, department, and instructor reports.",
            icon: FileTextIcon,
          },
          {
            href: "/guidance/announcements",
            title: "Announcements",
            description:
              "Publish to the university or target by department and section.",
            icon: MegaphoneIcon,
          },
        ].map((item) => (
          <Card key={item.href}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <item.icon className="size-4" />
                {item.title}
              </CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={item.href} className={cn(buttonVariants())}>
                Open
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
