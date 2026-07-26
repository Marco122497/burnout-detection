"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ChevronsUpDownIcon,
  KeyRoundIcon,
  Loader2,
  LogOutIcon,
  UserRoundIcon,
} from "lucide-react";

import { logout } from "@/app/actions/auth";
import type { Profile } from "@/lib/auth/roles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export function NavUser({ profile }: { profile: Profile }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(() => {
      void logout();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:opacity-90">
          <div className="hidden max-w-36 text-right sm:grid">
            <span className="truncate text-sm font-medium leading-none">
              {profile.full_name}
            </span>
            <span className="mt-0.5 truncate text-xs text-muted-foreground">
              {profile.role}
            </span>
          </div>
          <Avatar className="size-8 rounded-lg">
            {profile.profile_picture ? (
              <AvatarImage
                src={profile.profile_picture}
                alt={profile.full_name}
              />
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
                    <AvatarImage
                      src={profile.profile_picture}
                      alt={profile.full_name}
                    />
                  ) : null}
                  <AvatarFallback className="rounded-lg">
                    {initials(profile) || <UserRoundIcon className="size-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{profile.full_name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {profile.employee_no || profile.role}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href="/profile" />}>
              <UserRoundIcon />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/change-password" />}>
              <KeyRoundIcon />
              Change password
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <LogOutIcon />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (pending) return;
          setConfirmOpen(open);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <LogOutIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of SFXA Finance and returned to the login
              page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={handleLogout}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Signing out…
                </>
              ) : (
                <>
                  <LogOutIcon />
                  Logout
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
