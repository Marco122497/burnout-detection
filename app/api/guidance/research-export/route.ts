import { NextResponse } from "next/server";

import { RESEARCH_DOWNLOADS } from "@/lib/guidance/research-downloads";
import { buildResearchFiles } from "@/lib/guidance/research-export";
import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import { getSessionUser } from "@/lib/auth/session";
import { zipTextFiles } from "@/lib/zip-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const FILE_BY_KEY = new Map<string, string>(
  RESEARCH_DOWNLOADS.filter((item) => item.file !== "all").map((item) => [
    item.file,
    item.filename,
  ])
);

export async function GET(request: Request) {
  const { user, profile } = await getSessionUser();
  if (!user || !profile?.is_active) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (
    profile.role !== "Guidance Counselor" ||
    !isSuperadminEmail(user.email)
  ) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const file = new URL(request.url).searchParams.get("file") ?? "all";
  if (file !== "all" && !FILE_BY_KEY.has(file)) {
    return NextResponse.json({ error: "Unknown file." }, { status: 400 });
  }

  try {
    const files = await buildResearchFiles();
    if (file === "all") {
      const zip = zipTextFiles(files);
      return new NextResponse(new Uint8Array(zip), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition":
            'attachment; filename="chapter4-research-data.zip"',
          "Cache-Control": "no-store",
        },
      });
    }

    const filename = FILE_BY_KEY.get(file);
    if (!filename) {
      return NextResponse.json({ error: "Unknown file." }, { status: 400 });
    }
    const match = files.find((item) => item.name === filename);
    if (!match) {
      return NextResponse.json({ error: "File missing." }, { status: 404 });
    }
    const type = filename.endsWith(".txt")
      ? "text/plain; charset=utf-8"
      : "text/csv; charset=utf-8";
    return new NextResponse(match.text, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("research export:", error);
    return NextResponse.json(
      { error: "Could not export research data." },
      { status: 500 }
    );
  }
}
