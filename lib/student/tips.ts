import type { BurnoutLevel } from "@/lib/student/mfbi";

export type TipCategory =
  | "Stress Management"
  | "Sleep"
  | "Study Time"
  | "Academic Workload";

export type Tip = {
  category: TipCategory;
  title: string;
  tips: string[];
};

const TIPS_BY_LEVEL: Record<BurnoutLevel, Tip[]> = {
  Low: [
    {
      category: "Stress Management",
      title: "Maintain healthy stress habits",
      tips: [
        "Keep a short daily check-in on mood and energy.",
        "Use brief breathing breaks between classes.",
        "Protect one low-stress activity each week.",
      ],
    },
    {
      category: "Sleep",
      title: "Protect consistent sleep",
      tips: [
        "Aim for 7–8 hours most nights.",
        "Keep a regular bedtime on weekdays.",
        "Avoid screens 30 minutes before sleep.",
      ],
    },
    {
      category: "Study Time",
      title: "Study with balance",
      tips: [
        "Use focused 25–50 minute study blocks.",
        "Schedule short recovery breaks.",
        "Review lightly instead of cramming.",
      ],
    },
    {
      category: "Academic Workload",
      title: "Stay ahead of deadlines",
      tips: [
        "Break large tasks into weekly milestones.",
        "Prioritize courses with the nearest deadlines.",
        "Ask for clarification early when stuck.",
      ],
    },
  ],
  Moderate: [
    {
      category: "Stress Management",
      title: "Reduce rising stress",
      tips: [
        "Practice 5–10 minutes of mindfulness daily.",
        "Talk with a peer or adviser about pressure points.",
        "Limit multitasking during high-stress days.",
      ],
    },
    {
      category: "Sleep",
      title: "Improve sleep recovery",
      tips: [
        "Target at least 7 hours of sleep tonight.",
        "Avoid late caffeine after mid-afternoon.",
        "Use a wind-down routine before bed.",
      ],
    },
    {
      category: "Study Time",
      title: "Make study time sustainable",
      tips: [
        "Cap deep study sessions and stop when exhausted.",
        "Batch similar tasks to reduce switching cost.",
        "Move low-value study blocks off peak fatigue hours.",
      ],
    },
    {
      category: "Academic Workload",
      title: "Rebalance workload",
      tips: [
        "List all pending requirements and due dates.",
        "Negotiate extensions early when needed.",
        "Drop optional extras until core work is stable.",
      ],
    },
  ],
  High: [
    {
      category: "Stress Management",
      title: "Actively manage high stress",
      tips: [
        "Use grounding techniques when overwhelm spikes.",
        "Seek guidance office support this week.",
        "Reduce non-essential commitments immediately.",
      ],
    },
    {
      category: "Sleep",
      title: "Prioritize sleep restoration",
      tips: [
        "Treat sleep as a required recovery block.",
        "Keep naps under 30 minutes if needed.",
        "Avoid all-nighters; split work across days.",
      ],
    },
    {
      category: "Study Time",
      title: "Shorten intensive study load",
      tips: [
        "Focus only on highest-impact tasks.",
        "Use active recall instead of long rereading.",
        "Study with a partner for accountability, not longer hours.",
      ],
    },
    {
      category: "Academic Workload",
      title: "Lighten academic pressure",
      tips: [
        "Meet your instructor or adviser about load concerns.",
        "Identify one task to postpone or simplify.",
        "Track workload daily and stop when risk signs rise.",
      ],
    },
  ],
  Severe: [
    {
      category: "Stress Management",
      title: "Seek immediate support",
      tips: [
        "Contact the guidance counselor as soon as possible.",
        "Share how you are feeling with a trusted adult.",
        "Use campus crisis/support channels if distress is intense.",
      ],
    },
    {
      category: "Sleep",
      title: "Stabilize rest first",
      tips: [
        "Prioritize sleep over non-urgent academic tasks tonight.",
        "Create a quiet, dark sleep environment.",
        "Seek help if sleep problems persist for several nights.",
      ],
    },
    {
      category: "Study Time",
      title: "Pause overload studying",
      tips: [
        "Do only essential submissions for 48 hours.",
        "Replace long study marathons with short recovery-friendly blocks.",
        "Ask classmates for notes instead of redoing everything alone.",
      ],
    },
    {
      category: "Academic Workload",
      title: "Escalate workload concerns",
      tips: [
        "Request formal academic support or accommodation.",
        "Coordinate with instructors on priority deliverables.",
        "Follow through on guidance intervention plans.",
      ],
    },
  ],
};

export function getTipsForLevel(level: BurnoutLevel | null | undefined): Tip[] {
  if (!level) return TIPS_BY_LEVEL.Low;
  return TIPS_BY_LEVEL[level] ?? TIPS_BY_LEVEL.Low;
}
