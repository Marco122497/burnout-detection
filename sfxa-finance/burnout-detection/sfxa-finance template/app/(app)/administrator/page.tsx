import Link from "next/link";

import { requireUser } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdministratorDashboardPage() {
  const { profile } = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Administrator Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back, {profile.first_name}. Full system access modules arrive
          in Phase 2.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
    </div>
  );
}
