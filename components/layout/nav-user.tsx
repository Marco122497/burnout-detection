"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDownIcon,
  KeyRoundIcon,
  Loader2,
  LogOutIcon,
  UserRoundIcon,
} from "lucide-react";

import { logout } from "@/app/actions/auth";
import type { Profile } from "@/lib/auth/roles";
import { useNavigationPending } from "@/components/layout/navigation-pending";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(profile: Profile) {
  return `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
}

function displayName(profile: Profile) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ");
}

function profileSubtitle(profile: Profile) {
  return (
    profile.student_number ||
    profile.employee_no ||
    profile.role
  );
}

export function NavUser({
  profile,
  email,
}: {
  profile: Profile;
  email: string | null;
}) {
  const pathname = usePathname();
  const { navigate, isPending, pendingHref } = useNavigationPending();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const name = displayName(profile);
  const profileLoading = isPending && pendingHref === "/profile";
  const passwordLoading = isPending && pendingHref === "/change-password";

  function onNavigate(url: string) {
    if (pathname === url) return;
    navigate(url);
  }

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    try {
      await logout();
    } catch {
      // Session may already be cleared; still leave the app.
    }
    // Hard navigation avoids RSC "unexpected response" after auth cookies clear.
    window.location.assign("/login");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:opacity-90">
          <div className="hidden max-w-36 text-right sm:grid">
            <span className="truncate text-sm font-medium leading-none">
              {name}
            </span>
            <span className="mt-0.5 truncate text-xs text-muted-foreground">
              {profile.role}
            </span>
          </div>
          <Avatar className="size-8 rounded-lg">
            {profile.profile_picture ? (
              <AvatarImage src={profile.profile_picture} alt={name} />
            ) : null}
            <AvatarFallback className="rounded-lg text-xs">
              {initials(profile) || <UserRoundIcon className="size-4" />}
            </AvatarFallback>
          </Avatar>
          <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-56 w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2 py-1">
                <Avatar className="size-8 rounded-lg">
                  {profile.profile_picture ? (
                    <AvatarImage src={profile.profile_picture} alt={name} />
                  ) : null}
                  <AvatarFallback className="rounded-lg">
                    {initials(profile) || <UserRoundIcon className="size-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {profileSubtitle(profile)}
                  </span>
                  {email ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {email}
                    </span>
                  ) : null}
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onNavigate("/profile")}
            >
              {profileLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <UserRoundIcon />
              )}
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => onNavigate("/change-password")}
            >
              {passwordLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <KeyRoundIcon />
              )}
              Change password
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            className="cursor-pointer"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOutIcon />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <LogOutIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of Burnout Monitor and returned to the
              login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                void handleLogout();
              }}
            >
              {pending ? "Signing out…" : "Logout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
