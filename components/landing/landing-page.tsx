import Link from "next/link";
import {
  BellIcon,
  ClipboardListIcon,
  FlameIcon,
  HeartHandshakeIcon,
  LightbulbIcon,
} from "lucide-react";

import { AuthBackground } from "@/components/auth/auth-background";
import { AppMetaFooter } from "@/components/layout/sidebar-app-footer";
import { ModeToggle } from "@/components/mode-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const purposes = [
  {
    icon: ClipboardListIcon,
    title: "Weekly check-in",
    text: "Students answer a short form on stress, schoolwork, study time, and sleep. One submission covers the week.",
  },
  {
    icon: FlameIcon,
    title: "Burnout risk",
    text: "The system turns those answers into a burnout score and a Low, Moderate, or High risk level.",
  },
  {
    icon: BellIcon,
    title: "Early warning",
    text: "It looks ahead to next week so a rising load can be seen before it becomes a crisis.",
  },
  {
    icon: LightbulbIcon,
    title: "Plain advice",
    text: "Students get simple next steps for rest, workload, and study habits. The wording stays easy to follow.",
  },
  {
    icon: HeartHandshakeIcon,
    title: "People who can help",
    text: "Instructors see their classes. The Guidance Office sees who may need a conversation, not a diagnosis.",
  },
];

export function LandingPage() {
  return (
    <div className="relative min-h-svh">
      <AuthBackground />
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 py-4 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              width={48}
              height={48}
              className="size-11 shrink-0 object-contain sm:size-12"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-foreground sm:text-base">
                Burnout Detection System
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Detect Early. Act Wisely. Stay Strong.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <ModeToggle />
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center py-10 sm:py-14">
          {/* <p className="text-xs font-bold tracking-[0.16em] text-[color:var(--chum-green-deep)] uppercase">
            For college students and the Guidance Office
          </p> */}
          <h1 className="mt-3 max-w-3xl bg-[linear-gradient(90deg,#1f9a5c_0%,#2dbe78_40%,#f5c542_72%,#f97316_100%)] bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-5xl">
            Notice academic burnout while there is still time to help.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            This system is a weekly well-being check for school. Students
            report how the week felt. The app estimates burnout-related risk,
            warns about the week ahead, and gives practical advice. Instructors
            and guidance counselors use the same results to follow up.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 text-center">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-14 rounded-full px-10 text-lg font-bold"
              )}
            >
              Login Now
            </Link>
            <p className="text-sm text-muted-foreground">
              Use the account your school already created.
            </p>
          </div>

          <section className="relative mt-12 overflow-hidden rounded-[2rem] px-1 py-2 sm:px-2">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-background/25 backdrop-blur-2xl"
            />
            <p
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-4xl leading-tight font-bold text-[color:var(--chum-green)]/30 blur-2xl select-none sm:text-6xl"
            >
              Weekly check-in. Burnout risk. Early warning. Plain advice.
              People who can help.
            </p>
            <div className="relative grid grid-cols-1 items-stretch gap-x-8 gap-y-8 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-6">
              {purposes.map((item, index) => (
                <article
                  key={item.title}
                  className={cn(
                    "flex h-full flex-col",
                    "lg:col-span-2",
                    index === 3 && "lg:col-start-2",
                    index === 4 &&
                      "sm:col-span-2 sm:w-[calc(50%-1rem)] sm:justify-self-center lg:w-auto lg:justify-self-stretch"
                  )}
                >
                  <h2 className="flex items-center gap-2.5 text-base font-bold tracking-tight text-pretty">
                    <item.icon className="size-5 shrink-0 text-[color:var(--chum-green-deep)]" />
                    {item.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-foreground">
                    {item.text}
                  </p>
                </article>
              ))}
              <div className="sm:col-span-2 lg:col-span-6">
                <h2 className="text-base font-bold tracking-tight">
                  What this system is for
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
                  It helps a school see academic burnout early: heavy weeks,
                  short sleep, long study hours, and rising stress. It is a
                  support tool for monitoring and guidance. It does not
                  diagnose depression, anxiety, or any medical condition, and
                  it does not replace a counselor or a doctor.
                </p>
              </div>
            </div>
          </section>
        </main>

        <footer className="pb-2 text-center">
          <AppMetaFooter className="text-[11px] leading-tight text-muted-foreground/80" />
        </footer>
      </div>
    </div>
  );
}
