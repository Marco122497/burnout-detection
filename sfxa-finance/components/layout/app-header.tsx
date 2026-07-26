import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

import { logout } from "@/app/actions/auth";
import type { Profile } from "@/lib/auth/roles";
import { getDashboardPath } from "@/lib/auth/roles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppHeader({ profile }: { profile: Profile }) {
  const home = getDashboardPath(profile.role);
  const initials =
    `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href={home} className="font-semibold tracking-tight">
            SFXA Finance
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            <Link href={home} className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/profile" className="hover:text-foreground">
              Profile
            </Link>
            <Link href="/change-password" className="hover:text-foreground">
              Password
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-none">{profile.full_name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{profile.role}</p>
          </div>
          <Link href="/profile" aria-label="View profile">
            <Avatar className="size-8">
              {profile.profile_picture ? (
                <AvatarImage
                  src={profile.profile_picture}
                  alt={profile.full_name}
                />
              ) : null}
              <AvatarFallback>
                {initials || <UserRound className="size-4" />}
              </AvatarFallback>
            </Avatar>
          </Link>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut />
              Logout
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
