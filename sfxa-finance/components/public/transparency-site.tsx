import Link from "next/link";

import { formatDateTime } from "@/lib/auth/roles";
import { formatDate, formatMoney } from "@/lib/format";
import type {
  BudgetUtilizationRow,
  CollectionSummaryRow,
  MonthlyTotal,
  PublicAnnouncement,
  PublicProject,
} from "@/lib/public/transparency";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TransparencySiteProps = {
  dashboardHref: string | null;
  setupRequired: boolean;
  monthlyDonations: MonthlyTotal[];
  monthlyCollections: CollectionSummaryRow[];
  budgetUtilization: BudgetUtilizationRow[];
  projects: PublicProject[];
  announcements: PublicAnnouncement[];
};

const NAV = [
  { href: "#collections", label: "Collections" },
  { href: "#donations", label: "Donations" },
  { href: "#budget", label: "Budget" },
  { href: "#projects", label: "Projects" },
  { href: "#announcements", label: "Announcements" },
] as const;

export function TransparencySite({
  dashboardHref,
  setupRequired,
  monthlyDonations,
  monthlyCollections,
  budgetUtilization,
  projects,
  announcements,
}: TransparencySiteProps) {
  const collectionMonths = [
    ...new Set(monthlyCollections.map((row) => row.monthKey)),
  ].slice(0, 6);

  const latestCollections = monthlyCollections.filter((row) =>
    collectionMonths.includes(row.monthKey)
  );

  const budgetAllocated = budgetUtilization.reduce(
    (sum, row) => sum + row.allocated,
    0
  );
  const budgetUtilized = budgetUtilization.reduce(
    (sum, row) => sum + row.utilized,
    0
  );
  const budgetRemaining = budgetAllocated - budgetUtilized;
  const utilizationPct =
    budgetAllocated > 0
      ? Math.min(100, Math.round((budgetUtilized / budgetAllocated) * 100))
      : 0;

  const latestDonationTotal = monthlyDonations[0]?.total ?? 0;
  const latestDonationLabel = monthlyDonations[0]?.monthLabel ?? "This period";

  return (
    <div className="min-h-full bg-[#eef1ec] text-[#152018]">
      {/* Site nav */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[#152018]/10 bg-[#eef1ec]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <a
            href="#top"
            className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight md:text-xl"
          >
            SFXA Finance
          </a>
          <nav className="hidden items-center gap-6 text-sm text-[#152018]/70 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-[#152018]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          {dashboardHref ? (
            <Link
              href={dashboardHref}
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-[#152018] text-[#eef1ec] hover:bg-[#152018]/90"
              )}
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "border-[#152018]/25 bg-transparent"
              )}
            >
              Staff login
            </Link>
          )}
        </div>
      </header>

      {/* Full-bleed hero */}
      <section
        id="top"
        className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pt-16"
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(160deg,#1a2e22_0%,#2f4a38_42%,#5c6b3d_78%,#c4b48a_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(255,220,160,0.18),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(0,0,0,0.25),transparent_50%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12] [background-image:repeating-linear-gradient(90deg,transparent,transparent_48px,rgba(255,255,255,0.35)_48px,rgba(255,255,255,0.35)_49px)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#eef1ec] to-transparent"
        />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-24 md:px-6 md:pb-24 md:pt-32">
          <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-white md:text-6xl lg:text-7xl">
            SFXA Finance
          </p>
          <h1 className="mt-4 max-w-2xl animate-in fade-in slide-in-from-bottom-3 fill-mode-both text-xl font-medium text-white/90 duration-700 delay-150 md:text-2xl">
            Open books for the parish community
          </h1>
          <p className="mt-4 max-w-xl animate-in fade-in slide-in-from-bottom-3 fill-mode-both text-base leading-relaxed text-white/75 duration-700 delay-300">
            See how collections, donations, and budgets support Saint Francis
            Xavier Parish — without exposing private donor or staff records.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 delay-500">
            <a
              href="#collections"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-[#eef1ec] text-[#152018] hover:bg-white"
              )}
            >
              Explore reports
            </a>
            <a
              href="#announcements"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              )}
            >
              Latest announcements
            </a>
          </div>
        </div>
      </section>

      {setupRequired && (
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <p className="border border-[#8a6a2a]/30 bg-[#efe4c4] px-4 py-3 text-sm text-[#4a3a18]">
            Public summaries need setup. Run{" "}
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">
              sql/phase5-public.sql
            </code>{" "}
            in Supabase, then refresh.
          </p>
        </div>
      )}

      {/* Snapshot strip */}
      <section className="border-y border-[#152018]/10 bg-[#e4e9e3]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6 md:py-16">
          <div className="animate-in fade-in duration-700">
            <p className="text-sm tracking-wide text-[#152018]/55 uppercase">
              Latest donations
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums md:text-4xl">
              {formatMoney(latestDonationTotal)}
            </p>
            <p className="mt-1 text-sm text-[#152018]/55">{latestDonationLabel}</p>
          </div>
          <div className="animate-in fade-in duration-700 delay-100">
            <p className="text-sm tracking-wide text-[#152018]/55 uppercase">
              Budget remaining
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums md:text-4xl">
              {formatMoney(budgetRemaining)}
            </p>
            <p className="mt-1 text-sm text-[#152018]/55">
              {utilizationPct}% utilized overall
            </p>
          </div>
          <div className="animate-in fade-in duration-700 delay-200">
            <p className="text-sm tracking-wide text-[#152018]/55 uppercase">
              Active projects
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums md:text-4xl">
              {projects.length}
            </p>
            <p className="mt-1 text-sm text-[#152018]/55">
              Listed for the community
            </p>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section id="collections" className="scroll-mt-24 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
              Monthly collections
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#152018]/65">
              Category totals for parish collections. Individual donor names are
              never shown.
            </p>
          </div>

          {latestCollections.length === 0 ? (
            <p className="mt-10 text-[#152018]/55">No collection data yet.</p>
          ) : (
            <div className="mt-12 overflow-hidden border-t border-[#152018]/15">
              {latestCollections.map((row) => (
                <div
                  key={`${row.monthKey}-${row.categoryName}`}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-[#152018]/10 py-5 transition-colors hover:bg-[#152018]/[0.03] sm:grid-cols-[8rem_1fr_auto]"
                >
                  <p className="text-sm text-[#152018]/50">{row.monthLabel}</p>
                  <p className="col-span-2 font-medium sm:col-span-1">
                    {row.categoryName}
                  </p>
                  <p className="text-right font-[family-name:var(--font-display)] text-lg tabular-nums sm:text-xl">
                    {formatMoney(row.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Donations */}
      <section
        id="donations"
        className="scroll-mt-24 bg-[#152018] py-20 text-[#eef1ec] md:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
              Monthly donations
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#eef1ec]/65">
              Combined donation totals by month — totals only, no personal
              details.
            </p>
          </div>

          {monthlyDonations.length === 0 ? (
            <p className="mt-10 text-[#eef1ec]/55">No donation totals yet.</p>
          ) : (
            <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {monthlyDonations.slice(0, 6).map((row, index) => (
                <div
                  key={row.monthKey}
                  className="border-t border-[#eef1ec]/20 pt-5 transition-transform duration-500 hover:-translate-y-1"
                  style={{ transitionDelay: `${index * 30}ms` }}
                >
                  <p className="text-sm text-[#eef1ec]/55">{row.monthLabel}</p>
                  <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums md:text-4xl">
                    {formatMoney(row.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Budget */}
      <section id="budget" className="scroll-mt-24 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
              Budget utilization
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#152018]/65">
              How allocated funds are being used. Expense receipts and line
              items stay private.
            </p>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-[#152018]/55">Utilized</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums md:text-5xl">
                    {formatMoney(budgetUtilized)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#152018]/55">of allocated</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
                    {formatMoney(budgetAllocated)}
                  </p>
                </div>
              </div>
              <div className="mt-6 h-3 overflow-hidden bg-[#152018]/10">
                <div
                  className="h-full bg-[#3d5a45] transition-all duration-1000 ease-out"
                  style={{ width: `${utilizationPct}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-[#152018]/55">
                {utilizationPct}% used · {formatMoney(budgetRemaining)} remaining
              </p>
            </div>

            <div className="space-y-0 border-t border-[#152018]/15">
              {budgetUtilization.length === 0 ? (
                <p className="pt-6 text-[#152018]/55">No budget data yet.</p>
              ) : (
                budgetUtilization.slice(0, 6).map((row) => {
                  const pct =
                    row.allocated > 0
                      ? Math.min(
                          100,
                          Math.round((row.utilized / row.allocated) * 100)
                        )
                      : 0;
                  return (
                    <div
                      key={`${row.fiscalYear}-${row.categoryName}`}
                      className="border-b border-[#152018]/10 py-4"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-medium">
                          {row.categoryName}{" "}
                          <span className="text-sm font-normal text-[#152018]/45">
                            · {row.fiscalYear}
                          </span>
                        </p>
                        <p className="text-sm tabular-nums text-[#152018]/65">
                          {pct}%
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden bg-[#152018]/10">
                        <div
                          className="h-full bg-[#5c6b3d]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section
        id="projects"
        className="scroll-mt-24 border-y border-[#152018]/10 bg-[#e4e9e3] py-20 md:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
              Parish projects
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#152018]/65">
              Initiatives the parish is planning or building toward.
            </p>
          </div>

          {projects.length === 0 ? (
            <p className="mt-10 text-[#152018]/55">No projects listed yet.</p>
          ) : (
            <div className="mt-14 grid gap-8 md:grid-cols-2">
              {projects.map((project) => (
                <article
                  key={project.project_id}
                  className="group relative overflow-hidden bg-[#eef1ec] transition-transform duration-500 hover:-translate-y-1"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-[#3d5a45] transition-all duration-500 group-hover:w-1.5" />
                  <div className="p-6 pl-7 md:p-8 md:pl-9">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                        {project.project_name || "Untitled project"}
                      </h3>
                      {project.status && (
                        <span className="text-xs font-medium tracking-widest text-[#3d5a45] uppercase">
                          {project.status}
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <p className="mt-3 text-sm leading-relaxed text-[#152018]/65">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-6 flex flex-wrap gap-8 text-sm">
                      <div>
                        <p className="text-[#152018]/45">Budget</p>
                        <p className="mt-1 font-medium tabular-nums">
                          {formatMoney(project.budget)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[#152018]/45">Timeline</p>
                        <p className="mt-1 font-medium">
                          {formatDate(project.start_date)}
                          {project.end_date
                            ? ` – ${formatDate(project.end_date)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Announcements */}
      <section id="announcements" className="scroll-mt-24 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="max-w-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
              Church announcements
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#152018]/65">
              News and notices shared with the parish community.
            </p>
          </div>

          {announcements.length === 0 ? (
            <p className="mt-10 text-[#152018]/55">
              No published announcements yet.
            </p>
          ) : (
            <div className="mt-14 space-y-0 border-t border-[#152018]/15">
              {announcements.map((item) => (
                <article
                  key={item.announcement_id}
                  className="border-b border-[#152018]/10 py-8 md:grid md:grid-cols-[12rem_1fr] md:gap-10"
                >
                  <time className="text-sm text-[#152018]/45">
                    {formatDateTime(item.published_at || item.created_at)}
                  </time>
                  <div className="mt-2 md:mt-0">
                    <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold md:text-2xl">
                      {item.title}
                    </h3>
                    <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-[#152018]/65 md:text-base">
                      {item.content}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-[#152018]/10 bg-[#152018] text-[#eef1ec]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 md:flex-row md:items-end md:justify-between md:px-6 md:py-16">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              SFXA Finance
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#eef1ec]/60">
              Built for community trust. Donor identities, expense details, and
              staff records are not published here.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="#top" className="text-[#eef1ec]/70 hover:text-[#eef1ec]">
              Back to top
            </a>
            {dashboardHref ? (
              <Link
                href={dashboardHref}
                className="text-[#eef1ec]/70 hover:text-[#eef1ec]"
              >
                Staff dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-[#eef1ec]/70 hover:text-[#eef1ec]"
              >
                Staff login
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
