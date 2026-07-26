import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime, type Profile } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

export function RoleDashboard({
  title,
  description,
  profile,
}: {
  title: string;
  description: string;
  profile: Profile;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back, {profile.first_name}. {description}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              View or update your personal information and photo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profile" className={cn(buttonVariants())}>
              Open profile
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Change your account password anytime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/change-password"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Change password
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Last successful sign-in on this account.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(profile.last_login)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
