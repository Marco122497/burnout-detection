import { requireParishOfficer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/auth/roles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ParishAnnouncementsPage() {
  await requireParishOfficer();
  const supabase = await createClient();

  const { data } = await supabase
    .from("announcements")
    .select(
      "announcement_id, title, content, published_at, created_at, updated_at"
    )
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const announcements = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Announcements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Published parish announcements (view only).
        </p>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No published announcements yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <Card key={item.announcement_id}>
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>
                  Published{" "}
                  {formatDateTime(item.published_at || item.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {item.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
