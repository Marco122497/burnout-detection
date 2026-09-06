import { classifyMfbiScore, type BurnoutLevel } from "@/lib/student/mfbi";
import { classifyTrendDirection } from "@/lib/student/burnout-trends";

export type TipCategory = "Stress" | "Sleep" | "Study time" | "Schoolwork";

export type FactorKey = "stress" | "workload" | "studyTime" | "sleep";

export type Tip = {
  category: TipCategory;
  title: string;
  tips: string[];
};

export type OverallRecommendation = {
  title: string;
  description: string;
  recommended_action: string;
  burnout_level: BurnoutLevel;
};

export type FactorRecommendation = {
  key: FactorKey;
  category: TipCategory;
  title: string;
  description: string;
  recommended_action: string;
  level: BurnoutLevel;
  tips: string[];
  normalized: number;
  /** Week-over-week factor direction when previous week is available. */
  factorTrend?: "increasing" | "decreasing" | "stable" | null;
};

export type CounselingRecommendation = {
  title: string;
  description: string;
  recommended_action: string;
  burnout_level: BurnoutLevel;
  basis: "next_week" | "current" | null;
  trend: string | null;
  currentLevel: BurnoutLevel | null;
  nextWeekRisk: BurnoutLevel | null;
  currentMfbi: number | null;
  previousMfbi: number | null;
  factors: FactorRecommendation[];
};

type FactorScore = {
  raw: number;
  normalized: number;
};

export type StudentFactors = {
  stress: FactorScore;
  workload: FactorScore;
  studyTime: FactorScore;
  sleep: FactorScore;
};

export function buildStudentFactors(
  latest: {
    stress_score: number;
    academic_workload: number;
    study_time: number;
    sleep_hours: number;
  },
  mfbi: {
    normalized_stress?: number | null;
    normalized_workload?: number | null;
    normalized_academic_workload?: number | null;
    normalized_study_time?: number | null;
    normalized_sleep?: number | null;
    normalized_sleep_hours?: number | null;
  }
): StudentFactors {
  return {
    stress: {
      raw: latest.stress_score,
      normalized: Number(mfbi.normalized_stress ?? 0),
    },
    workload: {
      raw: latest.academic_workload,
      normalized: Number(
        mfbi.normalized_workload ?? mfbi.normalized_academic_workload ?? 0
      ),
    },
    studyTime: {
      raw: latest.study_time,
      normalized: Number(mfbi.normalized_study_time ?? 0),
    },
    sleep: {
      raw: latest.sleep_hours,
      normalized: Number(mfbi.normalized_sleep ?? mfbi.normalized_sleep_hours ?? 0),
    },
  };
}

const OVERALL: Record<BurnoutLevel, OverallRecommendation> = {
  Low: {
    burnout_level: "Low",
    title: "You are doing well. Keep it up.",
    description:
      "Your burnout score is low. Your stress, schoolwork, study time, and sleep look okay. Keep the habits that are helping you.",
    recommended_action:
      "Sleep 7–8 hours, take short breaks, and fill out next week’s form.",
  },
  Moderate: {
    burnout_level: "Moderate",
    title: "Make a small change this week.",
    description:
      "Your burnout score is medium. Stress, schoolwork, study time, or sleep still need attention. A small change now can stop it from getting worse.",
    recommended_action:
      "Pick one thing to ease this week: sleep earlier, do less extra work, or stop a long study night.",
  },
  High: {
    burnout_level: "High",
    title: "Please rest and ask for help.",
    description:
      "Your burnout score is high. Stress, schoolwork, study time, or sleep may be too much. This is a school warning, not a medical diagnosis.",
    recommended_action:
      "Talk to the Guidance Office this week. Sleep first. Drop extra tasks if you can.",
  },
  Severe: {
    burnout_level: "Severe",
    title: "Please get help now.",
    description:
      "Your risk is very high. Rest, less school load, and talking to a counselor are important. This app only gives school advice.",
    recommended_action:
      "Talk to the Guidance Counselor as soon as you can. Tell a teacher or family member you trust.",
  },
};

const RISK_RANK: Record<BurnoutLevel, number> = {
  Low: 0,
  Moderate: 1,
  High: 2,
  Severe: 2,
};

function higherRiskLevel(
  a: BurnoutLevel | null | undefined,
  b: BurnoutLevel | null | undefined
): BurnoutLevel | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return RISK_RANK[a] >= RISK_RANK[b] ? a : b;
}

const FACTOR_TIPS: Record<
  FactorKey,
  Record<BurnoutLevel, Omit<FactorRecommendation, "key" | "level" | "normalized">>
> = {
  stress: {
    Low: {
      category: "Stress",
      title: "Your stress looks okay",
      description: "You are not too stressed right now. Keep checking in with yourself.",
      recommended_action: "After class, ask: how do I feel today? Do one fun thing this week.",
      tips: [
        "Each day, notice if you feel calm or tense.",
        "Take 3 slow breaths between classes.",
        "Do one fun thing this week, like a walk or time with friends.",
        "Do not add extra tasks on already busy days.",
      ],
    },
    Moderate: {
      category: "Stress",
      title: "Your stress is moderate",
      description: "You are still under some pressure. Keep calming habits so it does not climb again.",
      recommended_action: "Breathe slowly for 5 minutes a day. Write down 2 things that worry you.",
      tips: [
        "Breathe slowly for 5–10 minutes each day.",
        "Talk to a friend, teacher, or counselor about what feels hard.",
        "Do one task at a time. Finish it before starting another.",
        "After a test or big paper, rest before starting the next one.",
      ],
    },
    High: {
      category: "Stress",
      title: "Your stress is high",
      description: "Stress is a big part of your burnout score. Rest and help come first.",
      recommended_action: "When you feel overwhelmed, pause and breathe. Talk to Guidance this week.",
      tips: [
        "When you feel panic, breathe out slowly and name 5 things you can see.",
        "Visit the Guidance Office this week.",
        "Say no to extra clubs or tasks for now.",
        "Tell one person you trust how you feel.",
      ],
    },
    Severe: {
      category: "Stress",
      title: "Please get help for stress",
      description: "Your stress is very high. Rest and talking to someone matter most.",
      recommended_action: "Talk to the Guidance Counselor as soon as you can.",
      tips: [
        "Talk to the Guidance Counselor as soon as you can.",
        "Tell a family member or teacher how you feel.",
        "If you feel very unsafe or very sad, ask for help right away.",
        "Pause extra work until you have support.",
      ],
    },
  },
  workload: {
    Low: {
      category: "Schoolwork",
      title: "Your schoolwork looks okay",
      description: "Your class load is manageable. Plan a little so due dates do not pile up.",
      recommended_action: "Write this week’s due dates. Start the biggest task one day early.",
      tips: [
        "Split big work into small steps.",
        "Do the homework that is due soonest first.",
        "Ask your teacher early if you do not understand the task.",
        "Check your due dates once a week.",
      ],
    },
    Moderate: {
      category: "Schoolwork",
      title: "Your schoolwork is still heavy",
      description: "Your class load is still medium-high. Keep tasks organized so burnout does not climb again.",
      recommended_action: "List every task and due date. Drop or delay one extra thing this week.",
      tips: [
        "Write all tasks and due dates in one list.",
        "Ask for more time early if you cannot finish on time.",
        "Pause extra work until required work is done.",
        "Do similar tasks together, like all readings in one sitting.",
      ],
    },
    High: {
      category: "Schoolwork",
      title: "Your schoolwork is too heavy",
      description: "Schoolwork is a big reason your burnout score is high.",
      recommended_action: "Talk to a teacher. Pick one task to delay, split, or make smaller.",
      tips: [
        "Talk to a teacher or adviser this week about your load.",
        "Pick one task to delay, split, or make smaller.",
        "Do not add new extra work.",
        "Ask classmates to share notes or split group work fairly.",
      ],
    },
    Severe: {
      category: "Schoolwork",
      title: "Please ask for help with schoolwork",
      description: "Your class load is very high. It is okay to ask for help.",
      recommended_action: "Talk to Guidance and your teachers about what to finish first.",
      tips: [
        "Ask Guidance about school support.",
        "Ask teachers which work must be done first.",
        "Follow the plan Guidance gives you.",
        "Do not start new projects until current work is under control.",
      ],
    },
  },
  studyTime: {
    Low: {
      category: "Study time",
      title: "Your study time looks okay",
      description: "You are not studying too long. Short, focused study is better than extra hours.",
      recommended_action: "Study for 25–50 minutes, then take a short break. Stop when the time is up.",
      tips: [
        "Study in 25–50 minute blocks.",
        "Take a short break after each block.",
        "Review a little each day instead of cramming at night.",
        "Study the hardest subject when you feel most awake.",
      ],
    },
    Moderate: {
      category: "Study time",
      title: "You may be studying too long",
      description: "Long study hours with little rest can make you tired and hurt your sleep.",
      recommended_action: "Stop when you are very tired. Do not study late if the work is not urgent.",
      tips: [
        "Stop studying when you feel very tired.",
        "Group similar work so you do not keep switching tasks.",
        "Do easy review in the day, not late at night.",
        "Test yourself instead of only rereading notes.",
      ],
    },
    High: {
      category: "Study time",
      title: "Cut back long study hours",
      description: "Long study time is raising your burnout score. More hours will not help if you are already tired.",
      recommended_action: "Do only the most important work today. Split one long night into two shorter times.",
      tips: [
        "Do only the most important work.",
        "Quiz yourself instead of reading for hours.",
        "Study with a friend to stay on task, not to stay longer.",
        "Set a stop time at night so you can sleep.",
      ],
    },
    Severe: {
      category: "Study time",
      title: "Pause extra studying",
      description: "You have been studying too much. Do only what is due soon, then rest.",
      recommended_action: "For the next 2 days, do only work that is due. Ask a classmate for notes.",
      tips: [
        "For 2 days, do only work that is due.",
        "Use short study times instead of all-night sessions.",
        "Ask a classmate for notes instead of doing everything alone.",
        "Go back to a normal study plan after you rest.",
      ],
    },
  },
  sleep: {
    Low: {
      category: "Sleep",
      title: "Your sleep looks okay",
      description: "You are sleeping well enough. Keep a regular bedtime so this stays good.",
      recommended_action: "Sleep 7–8 hours most nights. Go to bed at about the same time.",
      tips: [
        "Sleep 7–8 hours most nights.",
        "Go to bed at about the same time on school nights.",
        "Put your phone away 30 minutes before bed.",
        "Avoid coffee, tea, or energy drinks late in the day.",
      ],
    },
    Moderate: {
      category: "Sleep",
      title: "Try to sleep better",
      description: "Your sleep is not enough. Poor sleep can make stress and school feel harder.",
      recommended_action: "Sleep at least 7 hours tonight. Skip late caffeine. Quiet down before bed.",
      tips: [
        "Try to sleep at least 7 hours tonight.",
        "Do not drink caffeine after mid-afternoon.",
        "Dim the lights and do not study in bed.",
        "If you nap, keep it under 30 minutes.",
      ],
    },
    High: {
      category: "Sleep",
      title: "Sleep needs to come first",
      description: "Poor sleep is a big part of your burnout score. Rest helps you do schoolwork better.",
      recommended_action: "Sleep tonight. Do not plan to stay up all night.",
      tips: [
        "Treat sleep as required, like a class you must attend.",
        "Keep naps under 30 minutes.",
        "Do not stay up all night. Split the work across days.",
        "Make your room dark and quiet so you can fall asleep.",
      ],
    },
    Severe: {
      category: "Sleep",
      title: "Rest before more schoolwork",
      description: "Your sleep is very poor. Sleep tonight before adding more study.",
      recommended_action: "Sleep first tonight. Tell Guidance if this lasts several nights.",
      tips: [
        "Sleep tonight instead of doing extra work that is not due.",
        "Keep the room dark and quiet.",
        "Ask for help if you cannot sleep for several nights.",
        "Tell Guidance if you are too tired to go to class.",
      ],
    },
  },
};

const FACTOR_ORDER: FactorKey[] = ["stress", "workload", "studyTime", "sleep"];

export function classifyFactorScore(normalized: number | null | undefined): BurnoutLevel {
  if (normalized == null || Number.isNaN(normalized)) return "Low";
  return classifyMfbiScore(normalized);
}

export function getOverallRecommendation(
  level: BurnoutLevel | null | undefined,
  options?: {
    trend?: string | null;
    currentMfbi?: number | null;
    previousMfbi?: number | null;
  }
): OverallRecommendation | null {
  if (!level) return null;
  const base = OVERALL[level] ?? OVERALL.Low;
  const trend = options?.trend ?? null;
  const currentMfbi = options?.currentMfbi ?? null;
  const previousMfbi = options?.previousMfbi ?? null;
  const mfbiLabel =
    currentMfbi != null && Number.isFinite(currentMfbi)
      ? ` Your current burnout index is about ${Number(currentMfbi).toFixed(2)}.`
      : "";
  const mfbiChangeLabel =
    currentMfbi != null &&
    previousMfbi != null &&
    Number.isFinite(currentMfbi) &&
    Number.isFinite(previousMfbi)
      ? ` Your burnout index has ${
          Number(currentMfbi) < Number(previousMfbi) ? "decreased" : "changed"
        } from ${Number(previousMfbi).toFixed(2)} to ${Number(currentMfbi).toFixed(2)}.`
      : mfbiLabel;

  // Current risk + historical trend = early-warning outlook
  if (trend === "decreasing") {
    if (level === "Low") {
      return {
        ...base,
        title: "Your risk is improving — keep it going.",
        description: `Your risk is improving and is now low.${mfbiChangeLabel} Keep doing what helped so it stays low.`,
        recommended_action:
          "Protect sleep, keep short breaks, and complete next week’s monitoring.",
      };
    }
    if (level === "Moderate") {
      return {
        ...base,
        title: "Your risk is improving — continue the changes that are helping.",
        description: `Your burnout outlook is improving and is now moderate.${mfbiChangeLabel} Keep the habits that helped so it does not climb again.`,
        recommended_action:
          "Keep the changes that lowered your score: steady sleep, lighter extra load, and shorter late-night study.",
      };
    }
    return {
      ...base,
      title: "Your risk is improving — continue monitoring and support strategies.",
      description: `Your score is moving down, which is progress, but burnout risk is still high.${mfbiChangeLabel} Keep resting and ask for help if you need it.`,
      recommended_action:
        "Continue lighter load and better sleep. Visit Guidance if things still feel heavy.",
    };
  }

  if (trend === "increasing") {
    if (level === "Low") {
      return {
        ...base,
        title: "Your risk is starting to rise — stay aware.",
        description: `Your burnout risk is still low, but the trend is increasing.${mfbiLabel} Small habits this week can keep it from climbing.`,
        recommended_action:
          "Keep sleep steady, avoid stacking extra work, and stop long study nights early.",
      };
    }
    if (level === "Moderate") {
      return {
        ...base,
        title: "Your risk is rising — act early.",
        description: `Your burnout outlook is increasing and is now moderate.${mfbiLabel} A small change this week can stop it from becoming high.`,
        recommended_action:
          "Ease one pressure this week: sleep earlier, cut extra work, or end long study nights sooner.",
      };
    }
    return {
      ...base,
      title: "Your risk is increasing — seek support early.",
      description: `Your burnout risk is high and the trend is going up.${mfbiLabel} Treat this as an early warning and get support soon.`,
      recommended_action:
        "Talk to the Guidance Office this week. Sleep first. Drop extra tasks if you can.",
    };
  }

  if (trend === "stable") {
    if (level === "Low") {
      return {
        ...base,
        title: "Your risk is currently low — maintain your routine.",
        description: `Your burnout risk is low and stable.${mfbiLabel} Keep the habits that are working.`,
        recommended_action:
          "Sleep 7–8 hours, take short breaks, and fill out next week’s form.",
      };
    }
    if (level === "Moderate") {
      return {
        ...base,
        title: "Your risk remains moderate — make small adjustments now.",
        description: `Your burnout risk remains moderate.${mfbiLabel} Small adjustments this week can keep it from rising.`,
        recommended_action:
          "Pick one thing to ease this week: sleep earlier, do less extra work, or stop a long study night.",
      };
    }
    return {
      ...base,
      title: "Your risk remains high — additional support is recommended.",
      description: `Your burnout risk remains high.${mfbiLabel} Extra support and rest are recommended this week.`,
      recommended_action:
        "Talk to the Guidance Office this week. Sleep first. Drop extra tasks if you can.",
    };
  }

  return {
    ...base,
    description: `${base.description}${mfbiLabel}`,
  };
}

/**
 * Align counseling tips with early-warning outlook and trend:
 * - Decreasing (e.g. 1.00 → 0.60): use current week level so tips match the
 *   improvement, not a stale High from prior week / pessimistic ML.
 * - Increasing: prefer next-week (or the higher of current vs next-week).
 * - Otherwise: prefer next-week when available.
 */
export function resolveRecommendationLevel(
  currentLevel: BurnoutLevel | null | undefined,
  nextWeekRisk: BurnoutLevel | null | undefined,
  options?: {
    trend?: string | null;
  }
): {
  level: BurnoutLevel | null;
  basis: "next_week" | "current" | null;
  trend: string | null;
} {
  const trend = options?.trend ?? null;

  if (trend === "decreasing" && currentLevel) {
    return {
      level: currentLevel,
      basis: "current",
      trend,
    };
  }

  if (trend === "increasing") {
    const level =
      higherRiskLevel(currentLevel, nextWeekRisk) ??
      nextWeekRisk ??
      currentLevel ??
      null;
    return {
      level,
      basis: nextWeekRisk ? "next_week" : currentLevel ? "current" : null,
      trend,
    };
  }

  if (nextWeekRisk) {
    return { level: nextWeekRisk, basis: "next_week", trend };
  }
  if (currentLevel) {
    return { level: currentLevel, basis: "current", trend };
  }
  return { level: null, basis: null, trend };
}

/** Week-over-week MFBI change from submitted monitoring only. */
export function resolveMonitoringWeekTrend(
  currentMfbi: number | null | undefined,
  previousMfbi: number | null | undefined
): string | null {
  if (currentMfbi == null || previousMfbi == null) return null;
  const direction = classifyTrendDirection(
    Number(currentMfbi),
    Number(previousMfbi)
  );
  return direction === "insufficient_history" ? null : direction;
}

/**
 * Prefer early-warning trend; otherwise infer from consecutive MFBI scores
 * (e.g. 1.00 → 0.60 => decreasing).
 */
export function resolveRecommendationTrend(
  earlyWarningTrend: string | null | undefined,
  currentMfbi: number | null | undefined,
  previousMfbi: number | null | undefined
): string | null {
  if (earlyWarningTrend && earlyWarningTrend !== "insufficient_history") {
    return earlyWarningTrend;
  }
  if (currentMfbi == null || previousMfbi == null) return null;
  const direction = classifyTrendDirection(
    Number(currentMfbi),
    Number(previousMfbi)
  );
  return direction === "insufficient_history" ? null : direction;
}

const DECREASING_FACTOR_COPY: Record<
  FactorKey,
  Partial<Record<BurnoutLevel, Pick<FactorRecommendation, "title" | "description">>>
> = {
  stress: {
    Low: {
      title: "Your stress is improving",
      description:
        "Stress looks better than before. Keep the calming habits that helped.",
    },
    Moderate: {
      title: "Your stress is improving",
      description:
        "Stress is moving down, but it is still moderate. Keep breathing breaks so it does not climb again.",
    },
    High: {
      title: "Your stress is improving",
      description:
        "Stress is starting to go down, but it is still high. Keep resting and ask for help if you need it.",
    },
    Severe: {
      title: "Your stress is improving",
      description:
        "There is some improvement, but stress is still very high. Get support while you keep resting.",
    },
  },
  workload: {
    Low: {
      title: "Your workload has improved",
      description:
        "Your class load looks more manageable than before. Keep planning due dates.",
    },
    Moderate: {
      title: "Your workload has improved",
      description:
        "Your schoolwork load is improving, but it is still moderate. Keep one clear task list.",
    },
    High: {
      title: "Your workload has improved",
      description:
        "Your load is moving down, but schoolwork is still heavy. Keep cutting extras and asking for help.",
    },
    Severe: {
      title: "Your workload has improved",
      description:
        "There is progress, but your load is still very high. Keep talking with teachers and Guidance.",
    },
  },
  studyTime: {
    Low: {
      title: "Your study time has decreased",
      description:
        "Study hours look healthier than before. Keep short, focused blocks.",
    },
    Moderate: {
      title: "Your study time has decreased",
      description:
        "Long study nights are improving, but study time is still moderate. Keep stop times so sleep stays protected.",
    },
    High: {
      title: "Your study time has decreased",
      description:
        "You are cutting back, but study time is still high. Keep splitting long nights into shorter sessions.",
    },
    Severe: {
      title: "Your study time has decreased",
      description:
        "There is progress, but study time is still too high. Prioritize only due work and rest.",
    },
  },
  sleep: {
    Low: {
      title: "Your sleep has improved",
      description: "Sleep looks better than before. Keep a steady bedtime.",
    },
    Moderate: {
      title: "Your sleep has improved",
      description:
        "Sleep is getting better, but it still needs attention. Keep 7+ hours and quiet wind-down time.",
    },
    High: {
      title: "Your sleep has improved",
      description:
        "Sleep is moving in a better direction, but it is still poor. Keep treating rest as required.",
    },
    Severe: {
      title: "Your sleep has improved",
      description:
        "There is some progress, but sleep is still very poor. Rest first and tell Guidance if it continues.",
    },
  },
};

const INCREASING_FACTOR_COPY: Record<
  FactorKey,
  Partial<Record<BurnoutLevel, Pick<FactorRecommendation, "title" | "description">>>
> = {
  stress: {
    Moderate: {
      title: "Your stress is increasing",
      description:
        "Stress is rising. Small calming habits now can stop next week from feeling harder.",
    },
    High: {
      title: "Your stress is increasing",
      description:
        "Stress is high and the trend is going up. Rest and support come first.",
    },
    Severe: {
      title: "Your stress is increasing",
      description:
        "Stress is very high and rising. Seek Guidance support this week.",
    },
  },
  workload: {
    Moderate: {
      title: "Your schoolwork is becoming heavier",
      description:
        "Your class load is rising. Organize tasks now so burnout does not climb.",
    },
    High: {
      title: "Your schoolwork is becoming heavier",
      description:
        "Schoolwork is heavy and increasing. Cut extras and talk to a teacher soon.",
    },
    Severe: {
      title: "Your schoolwork is becoming heavier",
      description:
        "Your workload is very high and rising. Ask teachers and Guidance for support.",
    },
  },
  studyTime: {
    Moderate: {
      title: "Your study time has increased",
      description:
        "Study time is rising. Set stop times so sleep and rest do not suffer.",
    },
    High: {
      title: "Your study time has increased",
      description:
        "Study time is high and rising. Cut long nights before burnout gets worse.",
    },
    Severe: {
      title: "Your study time has increased",
      description:
        "Study hours are extreme and rising. Do only due work and rest.",
    },
  },
  sleep: {
    Moderate: {
      title: "Your sleep has declined",
      description:
        "Sleep quality is slipping. Protect bedtime before stress and school feel harder.",
    },
    High: {
      title: "Your sleep has declined",
      description:
        "Sleep is poor and getting worse. Make rest the first priority this week.",
    },
    Severe: {
      title: "Your sleep has declined",
      description:
        "Sleep is very poor and declining. Rest first and tell Guidance if it continues.",
    },
  },
};

const STABLE_HIGH_FACTOR_COPY: Record<
  FactorKey,
  Pick<FactorRecommendation, "title" | "description">
> = {
  stress: {
    title: "Your stress remains high",
    description:
      "Stress has stayed high. Keep resting and seek Guidance support this week.",
  },
  workload: {
    title: "Your workload has remained high for several weeks",
    description:
      "Schoolwork has stayed heavy. Talk with teachers and cut extras where you can.",
  },
  studyTime: {
    title: "Your study time has remained high",
    description:
      "Long study hours have continued. Set a stop time and protect sleep.",
  },
  sleep: {
    title: "Your sleep pattern has remained stable",
    description:
      "Sleep risk has stayed elevated. Make rest a required part of your week.",
  },
};

function factorLevelTrend(
  current: BurnoutLevel,
  previous: BurnoutLevel | null | undefined
): "increasing" | "decreasing" | "stable" | null {
  if (!previous) return null;
  const currentRank = RISK_RANK[current];
  const previousRank = RISK_RANK[previous];
  if (currentRank > previousRank) return "increasing";
  if (currentRank < previousRank) return "decreasing";
  return "stable";
}

function resolveDynamicFactorHeading(
  key: FactorKey,
  level: BurnoutLevel,
  previousLevel: BurnoutLevel | null | undefined
): Pick<FactorRecommendation, "title" | "description"> | null {
  const trend = factorLevelTrend(level, previousLevel);

  if (trend === "increasing") {
    return INCREASING_FACTOR_COPY[key][level] ?? null;
  }
  if (trend === "decreasing") {
    return DECREASING_FACTOR_COPY[key][level] ?? null;
  }
  if (
    trend === "stable" &&
    previousLevel &&
    (level === "High" || level === "Severe") &&
    (previousLevel === "High" || previousLevel === "Severe")
  ) {
    return STABLE_HIGH_FACTOR_COPY[key];
  }

  // Current-level defaults (more counseling-style than the static tip titles)
  if (key === "stress") {
    if (level === "Low") {
      return {
        title: "Your stress looks manageable",
        description: "You are not too stressed right now. Keep checking in with yourself.",
      };
    }
    if (level === "Moderate") {
      return {
        title: "Your stress is moderate",
        description:
          "You are still under some pressure. Keep calming habits so it does not climb again.",
      };
    }
    return {
      title: "Your stress is high",
      description: "Stress is a big part of your burnout score. Rest and help come first.",
    };
  }

  if (key === "workload") {
    if (level === "Low") {
      return {
        title: "Your schoolwork is manageable",
        description: "Your class load is manageable. Plan a little so due dates do not pile up.",
      };
    }
    if (level === "Moderate") {
      return {
        title: "Your schoolwork is still heavy",
        description:
          "Your class load is still medium-high. Keep tasks organized so burnout does not climb again.",
      };
    }
    return {
      title: "Your schoolwork is still heavy",
      description: "Schoolwork is a big reason your burnout score is high.",
    };
  }

  if (key === "studyTime") {
    if (level === "Low") {
      return {
        title: "Your study time looks balanced",
        description:
          "You are not studying too long. Short, focused study is better than extra hours.",
      };
    }
    if (level === "Moderate") {
      return {
        title: "You may be studying too long",
        description:
          "Long study hours with little rest can make you tired and hurt your sleep.",
      };
    }
    return {
      title: "You may be studying too long",
      description:
        "Long study time is raising your burnout score. More hours will not help if you are already tired.",
    };
  }

  // sleep
  if (level === "Low") {
    return {
      title: "Your sleep looks okay",
      description: "You are sleeping well enough. Keep a regular bedtime so this stays good.",
    };
  }
  if (level === "Moderate") {
    return {
      title: "Your sleep may need attention",
      description:
        "Your sleep is not enough. Poor sleep can make stress and school feel harder.",
    };
  }
  return {
    title: "Your sleep is currently low",
    description:
      "Poor sleep is a big part of your burnout score. Rest helps you do schoolwork better.",
  };
}

function withFactorTrendCopy(
  key: FactorKey,
  level: BurnoutLevel,
  item: Omit<FactorRecommendation, "key" | "level" | "normalized" | "factorTrend">,
  trend: string | null | undefined,
  previousLevel?: BurnoutLevel | null
): Omit<FactorRecommendation, "key" | "level" | "normalized" | "factorTrend"> {
  const dynamic = resolveDynamicFactorHeading(key, level, previousLevel);
  if (dynamic) return { ...item, ...dynamic };

  if (trend === "decreasing") {
    const overlay = DECREASING_FACTOR_COPY[key][level];
    if (overlay) return { ...item, ...overlay };
  }
  if (trend === "increasing") {
    const overlay = INCREASING_FACTOR_COPY[key][level];
    if (overlay) return { ...item, ...overlay };
  }
  return item;
}

const GUIDANCE_REFERRAL_TIP =
  "Seek the Guidance Office for counseling support and a guidance referral.";

function withGuidanceReferral(
  item: Omit<
    FactorRecommendation,
    "key" | "level" | "normalized" | "factorTrend"
  >,
  level: BurnoutLevel
): Omit<FactorRecommendation, "key" | "level" | "normalized" | "factorTrend"> {
  if (level !== "High" && level !== "Severe") return item;

  const tips = [
    GUIDANCE_REFERRAL_TIP,
    ...item.tips.filter(
      (tip) => !/guidance office|guidance counselor|talk to guidance/i.test(tip)
    ),
  ];

  const recommended_action = /guidance/i.test(item.recommended_action)
    ? item.recommended_action
    : `${item.recommended_action} Also seek the Guidance Office for counseling support and a guidance referral.`;

  return {
    ...item,
    recommended_action,
    tips,
  };
}

export function getFactorRecommendation(
  key: FactorKey,
  level: BurnoutLevel,
  options?: {
    trend?: string | null;
    thisWeek?: boolean;
    previousLevel?: BurnoutLevel | null;
  }
): Omit<FactorRecommendation, "normalized"> {
  const item = FACTOR_TIPS[key][level] ?? FACTOR_TIPS[key].Low;
  const previousLevel = options?.previousLevel ?? null;
  const useHistoryHeadings =
    previousLevel != null || options?.thisWeek === false;
  const factorTrend = factorLevelTrend(level, previousLevel);
  return {
    key,
    level,
    factorTrend,
    ...withGuidanceReferral(
      withFactorTrendCopy(
        key,
        level,
        item,
        useHistoryHeadings ? options?.trend ?? factorTrend : null,
        previousLevel
      ),
      level
    ),
  };
}

export function getFactorRecommendations(
  factors: StudentFactors | null | undefined,
  options?: {
    trend?: string | null;
    thisWeek?: boolean;
    previousFactors?: StudentFactors | null;
  }
): FactorRecommendation[] {
  if (!factors) return [];
  const previousFactors = options?.previousFactors ?? null;
  return FACTOR_ORDER.map((key) => {
    const normalized = factors[key]?.normalized ?? 0;
    const level = classifyFactorScore(normalized);
    const previousLevel = previousFactors
      ? classifyFactorScore(previousFactors[key]?.normalized ?? 0)
      : null;
    return {
      ...getFactorRecommendation(key, level, {
        trend: options?.trend,
        thisWeek: previousFactors ? false : options?.thisWeek,
        previousLevel,
      }),
      normalized,
    };
  }).sort((a, b) => b.normalized - a.normalized);
}

/**
 * Historical-based personalized counseling recommendation:
 * previous week + latest week → trend → outlook → per-factor actions.
 */
export function buildPersonalizedCounselingRecommendation(input: {
  currentLevel: BurnoutLevel | null | undefined;
  nextWeekRisk?: BurnoutLevel | null;
  earlyWarningTrend?: string | null;
  currentMfbi?: number | null;
  previousMfbi?: number | null;
  factors?: StudentFactors | null;
  previousFactors?: StudentFactors | null;
}): CounselingRecommendation | null {
  const recommendationTrend = resolveRecommendationTrend(
    input.earlyWarningTrend,
    input.currentMfbi,
    input.previousMfbi
  );
  const { level, basis, trend } = resolveRecommendationLevel(
    input.currentLevel,
    input.nextWeekRisk ?? null,
    { trend: recommendationTrend }
  );
  if (!level) return null;

  const overall = getOverallRecommendation(level, {
    trend,
    currentMfbi: input.currentMfbi ?? null,
    previousMfbi: input.previousMfbi ?? null,
  });
  if (!overall) return null;

  const factors = getFactorRecommendations(input.factors, {
    trend,
    thisWeek: false,
    previousFactors: input.previousFactors ?? null,
  });

  return {
    title: overall.title,
    description: overall.description,
    recommended_action: overall.recommended_action,
    burnout_level: overall.burnout_level,
    basis,
    trend,
    currentLevel: input.currentLevel ?? null,
    nextWeekRisk: input.nextWeekRisk ?? null,
    currentMfbi: input.currentMfbi ?? null,
    previousMfbi: input.previousMfbi ?? null,
    factors,
  };
}

/** All four factor tips at a single overall MFBI level (recommendations page fallback). */
export function getTipsForLevel(
  level: BurnoutLevel | null | undefined,
  options?: { trend?: string | null; thisWeek?: boolean }
): Tip[] {
  const resolved = level ?? "Low";
  const resolvedOptions = { thisWeek: true, ...options };
  return FACTOR_ORDER.map((key) => {
    const item = getFactorRecommendation(key, resolved, resolvedOptions);
    return {
      category: item.category,
      title: item.title,
      tips: item.tips,
    };
  });
}

export function getPersonalizedTips(
  factors: StudentFactors | null | undefined,
  fallbackLevel?: BurnoutLevel | null,
  options?: { trend?: string | null; previousFactors?: StudentFactors | null }
): Tip[] {
  const recs = getFactorRecommendations(factors, options);
  if (recs.length) {
    return recs.map((item) => ({
      category: item.category,
      title: item.title,
      tips: item.tips,
    }));
  }
  return getTipsForLevel(fallbackLevel, options);
}
