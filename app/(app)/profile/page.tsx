import { UserRoundIcon } from "lucide-react";

import { ProfileForm } from "@/components/profile/profile-form";
import { PageHeading } from "@/components/layout/page-heading";
import { requireUser } from "@/lib/auth/session";
import { getDepartments } from "@/lib/guidance/queries";

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const { supabase, user, profile } = await requireUser();
  const departments = await getDepartments(supabase);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Profile"
        description="View and update your personal information."
        icon={UserRoundIcon}
      />
      <ProfileForm
        profile={profile}
        departments={departments}
        email={user.email ?? null}
      />
    </div>
  );
}
