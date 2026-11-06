import { NextResponse } from "next/server";

import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import { getSessionUser } from "@/lib/auth/session";
import {
  RESEARCH_DATASETS,
  isResearchDatasetKey,
  parseResearchWeek,
  type ResearchDatasetKey,
} from "@/lib/guidance/research-downloads";
import {
  buildResearchExport,
  researchExportReadme,
} from "@/lib/guidance/research-export";
import { zipTextFiles } from "@/lib/zip-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function parseDatasets(value: string | null): ResearchDatasetKey[] | null {
  if (!value || value === "all") {
    return RESEARCH_DATASETS.map((item) => item.key);
  }
  const keys: ResearchDatasetKey[] = [];
  for (const key of new Set(value.split(",").map((part) => part.trim()).filter(Boolean))) {
    if (!isResearchDatasetKey(key)) return null;
    keys.push(key);
  }
  return keys.length ? keys : null;
}

export async function GET(request: Request) {
  const { user, profile } = await getSessionUser();
  if (!user || !profile?.is_active) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (profile.role !== "Guidance Counselor" || !isSuperadminEmail(user.email)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const url = new URL(request.url);
  const week = parseResearchWeek(url.searchParams.get("week"));
  const datasets = parseDatasets(url.searchParams.get("datasets"));
  if (!datasets) {
    return NextResponse.json({ error: "Unknown dataset." }, { status: 400 });
  }

  try {
    const files = await buildResearchExport({ datasets, week });
    const single =
      datasets.length === 1
        ? RESEARCH_DATASETS.find((item) => item.key === datasets[0])
        : undefined;

    if (single?.download === "csv") {
      const match = files[0];
      if (!match) {
        return NextResponse.json({ error: "File missing." }, { status: 404 });
      }
      const filename = match.name;
      return new NextResponse(match.text, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const zipName =
      single?.key === "models"
        ? "model_evaluation_files.zip"
        : week === "all"
          ? "research-data-export.zip"
          : `research-data-export-week-${week}.zip`;
    const zip = zipTextFiles([
      ...files,
      { name: "README.txt", text: researchExportReadme(week) },
    ]);
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
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
