import {
  BellIcon,
  ClipboardListIcon,
  FlameIcon,
  HeartHandshakeIcon,
  LightbulbIcon,
} from "lucide-react";

import { AuthBackground } from "@/components/auth/auth-background";
import {
  LandingForeground,
  LoginNowLink,
} from "@/components/landing/login-now-link";
import { AppMetaFooter } from "@/components/layout/sidebar-app-footer";
import { ModeToggle } from "@/components/mode-toggle";

const purposes = [
  {
    icon: ClipboardListIcon,
    title: "Weekly monitoring",
    text: "Students submit one form each week on stress, academic workload, study time, and sleep hours.",
  },
  {
    icon: FlameIcon,
    title: "Burnout risk",
    text: "Those answers become a burnout score and a Low, Moderate, or High risk level.",
  },
  {
    icon: BellIcon,
    title: "Early warning",
    text: "The system projects next week and week 2, so a rising risk can show up before the next check-in.",
  },
  {
    icon: LightbulbIcon,
    title: "Recommendations",
    text: "Students get practical next steps for sleep, workload, and study habits, written in plain language.",
  },
  {
    icon: HeartHandshakeIcon,
    title: "People who can help",
    text: "Instructors see risk in their classes. The Guidance Office sees who may need a follow-up, not a diagnosis.",
  },
];

export function LandingPage() {
  return (
    <div className="relative min-h-svh lg:h-svh lg:overflow-hidden">
      <AuthBackground />
      <LandingForeground>
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

        <main className="flex min-h-0 flex-1 flex-col py-2">
          <div className="mt-8 flex flex-col gap-3 lg:mt-16">
            <p className="w-fit rounded-full bg-[color:var(--chum-green-soft)] px-3 py-1 text-xs font-bold tracking-[0.14em] text-[color:var(--chum-green-deep)] uppercase">
              Burnout Detection System
            </p>
            <h1 className="w-full text-left bg-[linear-gradient(90deg,#1f9a5c_0%,#2dbe78_40%,#f5c542_72%,#f97316_100%)] bg-clip-text text-3xl font-bold tracking-tight text-transparent lg:text-4xl xl:text-5xl">
              Notice academic burnout while there is still time to follow up.
            </h1>
            <p className="w-full text-left text-sm leading-snug text-muted-foreground sm:text-base xl:text-lg">
              This is a weekly academic burnout check for college students.
              Students report stress, academic workload, study time, and sleep
              hours. The system scores burnout risk, warns about next week and
              week 2, and gives recommendations. Instructors and the Guidance
              Office use the same results to follow up.
            </p>
          </div>
          <div className="mt-10 flex w-full flex-col items-center gap-2 text-center lg:mt-14">
            <LoginNowLink />
            <p className="mt-3 text-sm text-muted-foreground">
              Use the account your school already created.
            </p>
          </div>

          <section className="relative mt-auto mb-6 min-h-0 overflow-hidden rounded-[2rem] pt-6 lg:mb-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-background/25 backdrop-blur-2xl"
            />
            <p
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-4xl leading-tight font-bold text-[color:var(--chum-green)]/30 blur-2xl select-none sm:text-6xl"
            >
              Weekly monitoring. Burnout risk. Early warning. Recommendations.
              People who can help.
            </p>
            <div className="relative grid w-full grid-cols-1 gap-x-6 gap-y-3 py-4 text-left sm:grid-cols-2 lg:grid-cols-5 xl:gap-x-8">
              {purposes.map((item) => (
                <article key={item.title} className="flex h-full flex-col">
                  <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-pretty xl:text-base">
                    <item.icon className="size-4 shrink-0 text-[color:var(--chum-green-deep)]" />
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs leading-snug text-pretty text-muted-foreground xl:text-sm">
                    {item.text}
                  </p>
                </article>
              ))}
              <div className="mt-3 sm:col-span-2 lg:col-span-5 lg:mt-5">
                <h2 className="text-sm font-bold tracking-tight xl:text-base">
                  What this system is for
                </h2>
                <p className="mt-1 text-xs leading-snug text-pretty text-muted-foreground xl:text-sm">
                  It helps the school see academic burnout early: heavy
                  workload, short sleep, long study hours, and rising stress.
                  It supports weekly monitoring and guidance follow-up. It does
                  not diagnose depression, anxiety, or any medical or
                  psychological condition, and it does not replace a counselor
                  or a doctor.
                </p>
              </div>
            </div>
          </section>
        </main>

        <footer className="pb-2 text-center">
          <AppMetaFooter className="text-[11px] leading-tight text-muted-foreground/80" />
        </footer>
      </LandingForeground>
    </div>
  );
}
