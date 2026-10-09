"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDownIcon,
  InfoIcon,
  KeyRoundIcon,
  Loader2,
  LogOutIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react";

import { logout } from "@/app/actions/auth";
import type { Profile } from "@/lib/auth/roles";
import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import type { DeveloperProfile } from "@/lib/developer-profile";
import { getDashboardPath, isGuidanceRole } from "@/lib/auth/roles";
import type { GuidanceMenuSettings } from "@/components/guidance/guidance-settings-panel";
import { DevelopersInfoSheet } from "@/components/layout/developers-info-sheet";
import { GuidanceSettingsSheet } from "@/components/layout/guidance-settings-sheet";
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
  developerProfile,
  guidanceSettings = null,
}: {
  profile: Profile;
  email: string | null;
  developerProfile: DeveloperProfile;
  guidanceSettings?: GuidanceMenuSettings | null;
}) {
  const pathname = usePathname();
  const { navigate, isPending, isBusy, pendingHref } = useNavigationPending();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [developersOpen, setDevelopersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const name = displayName(profile);
  const settingsHref = `${getDashboardPath(profile.role)}/settings`;
  const showSettings = isGuidanceRole(profile.role);
  const profileLoading = isPending && pendingHref === "/profile";
  const passwordLoading = isPending && pendingHref === "/change-password";
  const settingsLoading = isPending && pendingHref === settingsHref;

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
        <DropdownMenuTrigger
          disabled={isBusy}
          className="flex items-center gap-2 rounded-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:opacity-90 disabled:pointer-events-none disabled:opacity-50"
        >
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
            {showSettings ? (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  if (guidanceSettings) {
                    setSettingsOpen(true);
                    return;
                  }
                  onNavigate(settingsHref);
                }}
              >
                {settingsLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <SettingsIcon />
                )}
                Settings
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setDevelopersOpen(true)}
            >
              <InfoIcon />
              Developers info
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

      {guidanceSettings ? (
        <GuidanceSettingsSheet
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={guidanceSettings}
        />
      ) : null}

      <DevelopersInfoSheet
        open={developersOpen}
        onOpenChange={setDevelopersOpen}
        profile={developerProfile}
        canEdit={isSuperadminEmail(email)}
      />

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-[color:var(--chum-green-soft,#e8f8ef)] text-[color:var(--chum-green-deep,#1f9a5c)]">
              <LogOutIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of Burnout Monitor and returned to the
              login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending} className="rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              className="rounded-full"
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
