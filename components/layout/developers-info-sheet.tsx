"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  BriefcaseIcon,
  ExternalLinkIcon,
  Loader2,
  MailIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

import {
  updateDeveloperProfile,
  type DeveloperProfileActionState,
} from "@/app/actions/developer-profile";
import { AppMetaFooter } from "@/components/layout/sidebar-app-footer";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  MAX_DEVELOPER_GMAILS,
  MAX_DEVELOPER_SOCIALS,
  type DeveloperProfile,
  type DeveloperSocial,
} from "@/lib/developer-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const initialState: DeveloperProfileActionState = {};

function socialPlatform(label: string, url: string) {
  const text = `${label} ${url}`.toLowerCase();
  if (text.includes("facebook") || text.includes("fb.com")) return "facebook";
  if (text.includes("instagram")) return "instagram";
  if (text.includes("tiktok")) return "tiktok";
  if (text.includes("youtube") || text.includes("youtu.be")) return "youtube";
  if (text.includes("linkedin")) return "linkedin";
  if (text.includes("github")) return "github";
  if (/\btwitter\b/.test(text) || text.includes("x.com")) return "x";
  return "other";
}

function SocialBrandIcon({
  label,
  url,
  className,
}: {
  label: string;
  url: string;
  className?: string;
}) {
  const platform = socialPlatform(label, url);
  const shared = {
    viewBox: "0 0 24 24",
    className,
    "aria-hidden": true as const,
  };

  if (platform === "facebook") {
    return (
      <svg {...shared} fill="currentColor">
        <path d="M14.5 8.5V6.2c0-.7.5-1.2 1.2-1.2H18V2h-2.6C12.6 2 11 3.7 11 6.4v2.1H8.5v3H11V22h3.2v-10.5h2.6l.4-3h-3z" />
      </svg>
    );
  }

  if (platform === "instagram") {
    return (
      <svg {...shared} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (platform === "youtube") {
    return (
      <svg {...shared} fill="currentColor">
        <path d="M22 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C18.2 5.4 12 5.4 12 5.4s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 9 2 12.2 2 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6zM10 15.5v-6.6l5.2 3.3-5.2 3.3z" />
      </svg>
    );
  }

  if (platform === "tiktok") {
    return (
      <svg {...shared} fill="currentColor">
        <path d="M14 3h2.2c.2 1.6 1.1 2.9 2.4 3.7 1 .6 2.1.8 3.2.8v2.3c-1.2 0-2.4-.3-3.5-.9v6.4c0 3.3-2.6 6.2-6.3 6.2S6 18.6 6 15.3c0-3.2 2.5-5.8 5.7-6.1v2.5c-1.6.3-2.8 1.7-2.8 3.4 0 1.9 1.5 3.4 3.4 3.4s3.3-1.5 3.3-3.4V3z" />
      </svg>
    );
  }

  if (platform === "linkedin") {
    return (
      <svg {...shared} fill="currentColor">
        <path d="M5.7 8.7H2.9V21h2.8V8.7zM4.3 3C3.3 3 2.5 3.8 2.5 4.8S3.3 6.6 4.3 6.6 6.1 5.8 6.1 4.8 5.3 3 4.3 3zM21 21h-2.8v-6.4c0-1.8-.7-2.4-1.7-2.4s-1.9.8-1.9 2.5V21H12V8.7h2.7v1.7c.5-.9 1.6-1.9 3.3-1.9 2.2 0 3 1.4 3 4.1V21z" />
      </svg>
    );
  }

  if (platform === "github") {
    return (
      <svg {...shared} fill="currentColor">
        <path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.9 9.6.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.4 9.4 0 0 1 5 0c2-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 4-1.3 6.9-5.1 6.9-9.6C22 6.6 17.5 2 12 2z" />
      </svg>
    );
  }

  if (platform === "x") {
    return (
      <svg {...shared} fill="currentColor">
        <path d="M17.6 3H20.4L14.2 10.1 21.5 21h-5.6l-4.4-6.5L6.4 21H3.6l6.7-7.7L2.7 3h5.7l4 6L17.6 3zm-1 16.2h1.6L7.5 4.7H5.8l10.8 14.5z" />
      </svg>
    );
  }

  return <ExternalLinkIcon className={className} />;
}

function developerInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function DeveloperEditor({
  profile,
  onSaved,
  onCancel,
}: {
  profile: DeveloperProfile;
  onSaved: (profile: DeveloperProfile) => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(
    updateDeveloperProfile,
    initialState
  );
  const [gmails, setGmails] = useState<string[]>(
    profile.gmails.length ? profile.gmails : [""]
  );
  const [socials, setSocials] = useState<DeveloperSocial[]>(profile.socials);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  useActionToast(state, pending);

  useEffect(() => {
    if (!state.profile) return;
    onSavedRef.current(state.profile);
  }, [state.profile]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar className="size-20 rounded-2xl text-lg">
          {photoPreview || profile.photo ? (
            <AvatarImage
              src={photoPreview || profile.photo}
              alt={profile.name}
            />
          ) : null}
          <AvatarFallback className="rounded-2xl bg-[color:var(--chum-green-soft)] text-lg font-semibold text-[color:var(--chum-green-deep)]">
            {developerInitials(profile.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="developer_photo">Picture</Label>
          <Input
            id="developer_photo"
            name="developer_photo"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPhotoPreview((current) => {
                if (current) URL.revokeObjectURL(current);
                return file ? URL.createObjectURL(file) : null;
              });
            }}
          />
          {profile.photo ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" name="remove_photo" value="1" />
              Remove current picture
            </label>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="developer_name">Name</Label>
        <Input
          id="developer_name"
          name="developer_name"
          defaultValue={profile.name}
          maxLength={120}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="developer_role">Work</Label>
        <Input
          id="developer_role"
          name="developer_role"
          defaultValue={profile.role}
          maxLength={120}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="developer_company">Organization</Label>
        <Input
          id="developer_company"
          name="developer_company"
          defaultValue={profile.company}
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Email accounts</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={gmails.length >= MAX_DEVELOPER_GMAILS}
            onClick={() => setGmails((current) => [...current, ""])}
          >
            <PlusIcon />
            Add email
          </Button>
        </div>
        <ul className="space-y-2">
          {gmails.map((gmail, index) => (
            <li key={index} className="flex gap-2">
              <Input
                name="developer_gmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={gmail}
                placeholder="name@ckcm.edu.ph"
                maxLength={120}
                aria-label={`Email ${index + 1}`}
                onChange={(event) => {
                  const value = event.target.value;
                  setGmails((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? value : item
                    )
                  );
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove email"
                disabled={gmails.length === 1 && !gmail}
                onClick={() =>
                  setGmails((current) =>
                    current.length === 1
                      ? [""]
                      : current.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Social accounts</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={socials.length >= MAX_DEVELOPER_SOCIALS}
            onClick={() =>
              setSocials((current) => [...current, { label: "", url: "" }])
            }
          >
            <PlusIcon />
            Add social
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Add Facebook or any other account. Links start with https://.
        </p>
        {socials.length ? (
          <ul className="space-y-2">
            {socials.map((social, index) => (
              <li key={index} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                <Input
                  name="social_label"
                  value={social.label}
                  placeholder="Facebook"
                  maxLength={40}
                  aria-label="Social name"
                  onChange={(event) => {
                    const value = event.target.value;
                    setSocials((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label: value } : item
                      )
                    );
                  }}
                />
                <Input
                  name="social_url"
                  value={social.url}
                  placeholder="https://"
                  maxLength={300}
                  aria-label="Social link"
                  onChange={(event) => {
                    const value = event.target.value;
                    setSocials((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, url: value } : item
                      )
                    );
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove social"
                  onClick={() =>
                    setSocials((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No social accounts yet.</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function DevelopersInfoSheet({
  open,
  onOpenChange,
  profile,
  canEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: DeveloperProfile;
  canEdit: boolean;
}) {
  const [saved, setSaved] = useState<DeveloperProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const info = saved ?? profile;

  useEffect(() => {
    setSaved(null);
  }, [profile]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setEditing(false);
        onOpenChange(next);
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Developers info</SheetTitle>
          <SheetDescription>
            Who built this system, and what it is for.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {editing && canEdit ? (
            <DeveloperEditor
              profile={info}
              onSaved={(next) => {
                setSaved(next);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar className="size-20 rounded-2xl text-lg">
                    {info.photo ? (
                      <AvatarImage src={info.photo} alt={info.name} />
                    ) : null}
                    <AvatarFallback className="rounded-2xl bg-[color:var(--chum-green-soft)] text-lg font-semibold text-[color:var(--chum-green-deep)]">
                      {developerInitials(info.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground">
                      {info.name}
                    </p>
                  </div>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <PencilIcon />
                    Edit
                  </Button>
                ) : null}
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <BriefcaseIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Work</dt>
                    <dd>{info.role}</dd>
                    <dd className="text-muted-foreground">{info.company}</dd>
                  </div>
                </div>
                {info.gmails.length ? (
                  <div className="flex gap-3">
                    <MailIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">Email</dt>
                      {info.gmails.map((gmail) => (
                        <dd key={gmail}>
                          <a
                            href={`mailto:${gmail}`}
                            className="break-all font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {gmail}
                          </a>
                        </dd>
                      ))}
                    </div>
                  </div>
                ) : null}
                {info.socials.length ? (
                  <div className="space-y-0">
                    {info.socials.map((social) => (
                      <div
                        key={`${social.label}-${social.url}`}
                        className="flex items-center gap-3 leading-none"
                      >
                        <SocialBrandIcon
                          label={social.label}
                          url={social.url}
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                        <dd className="min-w-0">
                          <a
                            href={social.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={social.label}
                            className="break-all font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {social.url.replace(/^https?:\/\/(www\.)?/, "")}
                          </a>
                        </dd>
                      </div>
                    ))}
                  </div>
                ) : null}
              </dl>
            </>
          )}

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-semibold">About the system</p>
            <p className="text-sm font-medium">Burnout Detection System</p>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              Detect Early. Act Wisely. Stay Strong.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A weekly academic burnout check for college students. Students
              report stress, academic workload, study time, and sleep hours.
              The system scores burnout risk, warns about the coming weeks, and
              gives recommendations. Instructors and the Guidance Office use
              the same results to follow up. It is a monitoring aid, not a
              medical diagnosis.
            </p>
            <AppMetaFooter
              developerName={info.name}
              className="pt-1 text-muted-foreground"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
