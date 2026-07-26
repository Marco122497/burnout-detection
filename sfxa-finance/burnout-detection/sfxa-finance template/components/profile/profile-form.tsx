"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

import {
  updateProfile,
  uploadProfilePicture,
  type ProfileActionState,
} from "@/app/actions/profile";
import type { Profile } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/auth/roles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const initialState: ProfileActionState = {};

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function initials(profile: Profile) {
  return `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
}

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function profileToForm(profile: Profile) {
  return {
    employee_no: profile.employee_no ?? "",
    first_name: profile.first_name,
    middle_name: profile.middle_name ?? "",
    last_name: profile.last_name,
    suffix: profile.suffix ?? "",
    sex: profile.sex ?? "",
    birth_date: toDateInputValue(profile.birth_date),
    contact_number: profile.contact_number ?? "",
    address: profile.address ?? "",
  };
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(() => profileToForm(profile));
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfile,
    initialState
  );
  const [pictureState, pictureAction, picturePending] = useActionState(
    uploadProfilePicture,
    initialState
  );

  useEffect(() => {
    setForm(profileToForm(profile));
  }, [profile.updated_at, profile]);

  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile picture</CardTitle>
          <CardDescription>
            Upload a square photo up to 2MB (JPEG, PNG, WebP, or GIF).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="size-20">
            {profile.profile_picture ? (
              <AvatarImage
                src={profile.profile_picture}
                alt={profile.full_name}
              />
            ) : null}
            <AvatarFallback className="text-lg">
              {initials(profile)}
            </AvatarFallback>
          </Avatar>
          <form action={pictureAction} className="flex flex-1 flex-col gap-3">
            {pictureState.error && (
              <Alert variant="destructive">
                <AlertDescription>{pictureState.error}</AlertDescription>
              </Alert>
            )}
            {pictureState.success && (
              <Alert>
                <AlertDescription>{pictureState.success}</AlertDescription>
              </Alert>
            )}
            <input
              ref={fileInputRef}
              id="profile_picture"
              name="profile_picture"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                if (event.currentTarget.files?.length) {
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={picturePending}
                onClick={() => fileInputRef.current?.click()}
              >
                {picturePending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Camera />
                )}
                {picturePending ? "Uploading…" : "Change picture"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>
            Keep your staff profile up to date. Role and status are managed by
            administrators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={profileAction} className="space-y-6">
            {profileState.error && (
              <Alert variant="destructive">
                <AlertDescription>{profileState.error}</AlertDescription>
              </Alert>
            )}
            {profileState.success && (
              <Alert>
                <AlertDescription>{profileState.success}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="employee_no">Employee No.</Label>
                <Input
                  id="employee_no"
                  name="employee_no"
                  value={form.employee_no}
                  onChange={(event) =>
                    updateField("employee_no", event.target.value)
                  }
                  placeholder="EMP-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={form.first_name}
                  onChange={(event) =>
                    updateField("first_name", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middle_name">Middle Name</Label>
                <Input
                  id="middle_name"
                  name="middle_name"
                  value={form.middle_name}
                  onChange={(event) =>
                    updateField("middle_name", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={form.last_name}
                  onChange={(event) =>
                    updateField("last_name", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suffix">Suffix</Label>
                <Input
                  id="suffix"
                  name="suffix"
                  value={form.suffix}
                  onChange={(event) => updateField("suffix", event.target.value)}
                  placeholder="Jr., Sr., III"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sex">Sex</Label>
                <select
                  id="sex"
                  name="sex"
                  value={form.sex}
                  onChange={(event) => updateField("sex", event.target.value)}
                  className={selectClassName}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Birth Date</Label>
                <Input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={form.birth_date}
                  onChange={(event) =>
                    updateField("birth_date", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_number">Contact Number</Label>
                <Input
                  id="contact_number"
                  name="contact_number"
                  value={form.contact_number}
                  onChange={(event) =>
                    updateField("contact_number", event.target.value)
                  }
                  placeholder="09XXXXXXXXX"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Role</p>
                <p className="text-sm text-muted-foreground">{profile.role}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Status</p>
                <p className="text-sm text-muted-foreground">
                  {profile.status ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Last Login</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(profile.last_login)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Updated At</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(profile.updated_at)}
                </p>
              </div>
            </div>

            <Button type="submit" disabled={profilePending}>
              {profilePending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
