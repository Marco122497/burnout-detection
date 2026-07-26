import { ProfileForm } from "@/components/profile/profile-form";
import { requireUser } from "@/lib/auth/session";

export default async function ProfilePage() {
  const { profile } = await requireUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and update your personal information.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  );
}
