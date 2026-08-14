import { classifyMfbiScore, type BurnoutLevel } from "@/lib/student/mfbi";

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
};

type FactorScore = {
  raw: number;
  normalized: number;
};

type StudentFactors = {
  stress: FactorScore;
  workload: FactorScore;
  studyTime: FactorScore;
  sleep: FactorScore;
};

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
      "Your burnout score is medium. Something is getting harder — stress, schoolwork, long study hours, or sleep. A small change now can stop it from getting worse.",
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

const FACTOR_TIPS: Record<
  FactorKey,
  Record<BurnoutLevel, Omit<FactorRecommendation, "key" | "level">>
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
      title: "Your stress is going up",
      description: "You are feeling more pressure. If you ignore it, next week may feel harder.",
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
      title: "You have a lot of schoolwork",
      description: "Too many tasks at once can make burnout worse next week.",
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
  level: BurnoutLevel | null | undefined
): OverallRecommendation | null {
  if (!level) return null;
  return OVERALL[level] ?? OVERALL.Low;
}

export function getFactorRecommendation(
  key: FactorKey,
  level: BurnoutLevel
): FactorRecommendation {
  const item = FACTOR_TIPS[key][level] ?? FACTOR_TIPS[key].Low;
  return { key, level, ...item };
}

export function getFactorRecommendations(
  factors: StudentFactors | null | undefined
): FactorRecommendation[] {
  if (!factors) return [];
  return FACTOR_ORDER.map((key) =>
    getFactorRecommendation(key, classifyFactorScore(factors[key]?.normalized))
  ).sort((a, b) => {
    const rank = { Severe: 3, High: 2, Moderate: 1, Low: 0 };
    return rank[b.level] - rank[a.level];
  });
}

/** All four factor tips at a single overall MFBI level (recommendations page fallback). */
export function getTipsForLevel(level: BurnoutLevel | null | undefined): Tip[] {
  const resolved = level ?? "Low";
  return FACTOR_ORDER.map((key) => {
    const item = getFactorRecommendation(key, resolved);
    return {
      category: item.category,
      title: item.title,
      tips: item.tips,
    };
  });
}

export function getPersonalizedTips(
  factors: StudentFactors | null | undefined,
  fallbackLevel?: BurnoutLevel | null
): Tip[] {
  const recs = getFactorRecommendations(factors);
  if (recs.length) {
    return recs.map((item) => ({
      category: item.category,
      title: item.title,
      tips: item.tips,
    }));
  }
  return getTipsForLevel(fallbackLevel);
}
