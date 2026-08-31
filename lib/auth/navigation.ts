import type { ComponentType } from "react";
import type { UserRole } from "@/lib/auth/roles";
import {
  BellIcon,
  Building2Icon,
  GraduationCapIcon,
  ChartColumnIcon,
  ClipboardListIcon,
  FileTextIcon,
  HeartPulseIcon,
  HistoryIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  ShieldIcon,
  LightbulbIcon,
  MegaphoneIcon,
  UserRoundCogIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
};

export function getNavItems(role: UserRole, home: string): NavItem[] {
  if (role === "Student") {
    return [
      { title: "Dashboard", url: home, icon: LayoutDashboardIcon },
      {
        title: "Weekly Monitoring",
        url: `${home}/monitoring`,
        icon: HeartPulseIcon,
      },
      {
        title: "Assessment History",
        url: `${home}/burnout`,
        icon: HistoryIcon,
      },
      {
        title: "Notifications",
        url: `${home}/notifications`,
        icon: BellIcon,
      },
      {
        title: "Recommendations",
        url: `${home}/recommendations`,
        icon: LightbulbIcon,
      },
      { title: "Profile", url: "/profile", icon: UserRoundIcon },
      {
        title: "Change password",
        url: "/change-password",
        icon: KeyRoundIcon,
      },
    ];
  }

  if (role === "Instructor") {
    return [
      { title: "Dashboard", url: home, icon: LayoutDashboardIcon },
      {
        title: "Student Monitoring",
        url: `${home}/monitoring`,
        icon: UsersIcon,
      },
      {
        title: "Burnout Analytics",
        url: `${home}/analytics`,
        icon: ChartColumnIcon,
      },
      {
        title: "Reports",
        url: `${home}/reports`,
        icon: FileTextIcon,
      },
      {
        title: "Notifications",
        url: `${home}/notifications`,
        icon: BellIcon,
      },
      {
        title: "Announcements",
        url: `${home}/announcements`,
        icon: MegaphoneIcon,
      },
      { title: "Profile", url: "/profile", icon: UserRoundIcon },
      {
        title: "Change password",
        url: "/change-password",
        icon: KeyRoundIcon,
      },
    ];
  }

  return [
    { title: "Dashboard", url: home, icon: LayoutDashboardIcon },
    {
      title: "Students",
      url: `${home}/students`,
      icon: GraduationCapIcon,
    },
    {
      title: "Departments",
      url: `${home}/departments`,
      icon: Building2Icon,
    },
    {
      title: "Instructors",
      url: `${home}/instructors`,
      icon: UserRoundCogIcon,
    },
    {
      title: "Admins",
      url: `${home}/admins`,
      icon: ShieldIcon,
    },
    {
      title: "Questionnaires",
      url: `${home}/questionnaires`,
      icon: ClipboardListIcon,
    },
    {
      title: "Student Monitoring",
      url: `${home}/monitoring`,
      icon: UsersIcon,
    },
    {
      title: "Burnout Analytics",
      url: `${home}/analytics`,
      icon: ChartColumnIcon,
    },
    {
      title: "Reports",
      url: `${home}/reports`,
      icon: FileTextIcon,
    },
    {
      title: "Notifications",
      url: `${home}/notifications`,
      icon: BellIcon,
    },
    {
      title: "Announcements",
      url: `${home}/announcements`,
      icon: MegaphoneIcon,
    },
    { title: "Profile", url: "/profile", icon: UserRoundIcon },
    {
      title: "Change password",
      url: "/change-password",
      icon: KeyRoundIcon,
    },
  ];
}
