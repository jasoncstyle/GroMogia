export type GrowthStoryBeat = {
  title: string
  body: string
  href: string
};

export type GrowthStoryFacts = {
  businessName: string
  goalTitle: string
  goalCurrent: number | null
  goalTarget: number | null
  goalUnit: string
  goalProgressPercent: number | null
  hasApprovedPlan: boolean
  planVersion: number | null
  openWorkCount: number
  finishedWorkCount: number
  latestLearning: string
  nextStepTitle: string
  nextStepBody: string
  nextStepHref: string
};

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clip(value: string, max: number): string {
  const text = clean(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function withUnit(value: number, unit: string): string {
  const label = clean(unit);
  return label ? `${value} ${label}` : String(value);
}

function goalLine(facts: GrowthStoryFacts): string {
  const title = clean(facts.goalTitle);
  if (!title) {
    return "No active Goal yet. Open Next step or Goals and write the first measurable outcome. GroovGro will not start marketing.";
  }
  const parts = [`The current Goal is “${title}.”`];
  if (facts.goalCurrent != null) {
    const current = withUnit(facts.goalCurrent, facts.goalUnit);
    if (facts.goalTarget != null) {
      const target = withUnit(facts.goalTarget, facts.goalUnit);
      const percent =
        facts.goalProgressPercent != null ? ` That is ${facts.goalProgressPercent}% of the target.` : "";
      parts.push(`The number is ${current} of ${target}.${percent}`);
    } else {
      parts.push(`The current number is ${current}.`);
    }
  }
  parts.push("GroovGro will not change that Goal by itself.");
  return parts.join(" ");
}

function planLine(facts: GrowthStoryFacts): string {
  if (facts.hasApprovedPlan) {
    const version = facts.planVersion != null ? ` v${facts.planVersion}` : "";
    return `An approved Growth Plan${version} is the current write-up. Approving it did not run marketing.`;
  }
  if (clean(facts.goalTitle)) {
    return "There is a Goal, but no approved plan yet. Draft or approve a plan on Next step or Goals. GroovGro will not run it.";
  }
  return "A plan comes after a Goal. Open Next step or Goals first.";
}

function workLine(facts: GrowthStoryFacts): string {
  if (facts.openWorkCount > 0) {
    return `${facts.openWorkCount} approved action${facts.openWorkCount === 1 ? "" : "s"} ${facts.openWorkCount === 1 ? "is" : "are"} ready on Next step. You do ${facts.openWorkCount === 1 ? "it" : "them"}. GroovGro will not run ${facts.openWorkCount === 1 ? "it" : "them"}.`;
  }
  if (facts.finishedWorkCount > 0) {
    return `You already marked ${facts.finishedWorkCount} action${facts.finishedWorkCount === 1 ? "" : "s"}. Check what changed on Next step. GroovGro did not execute ${facts.finishedWorkCount === 1 ? "it" : "them"}.`;
  }
  return "No approved actions are waiting. Propose the first actions from an approved plan. GroovGro will not run them.";
}

function learningLine(facts: GrowthStoryFacts): string {
  const learned = clean(facts.latestLearning);
  if (learned) return learned;
  return "GroovGro has not compared the Goal number after work yet. After you mark work done, click Check what changed. GroovGro will not change the plan.";
}

function nextLine(facts: GrowthStoryFacts): string {
  const title = clean(facts.nextStepTitle);
  const body = clean(facts.nextStepBody);
  if (!title) {
    return "Nothing should change yet. Keep collecting evidence. Do not start ads, send email, or change the live website.";
  }
  return clip([title, body].filter(Boolean).join(" "), 500);
}

export function storyFactsFromWorkspace(input: {
  businessName: string
  goal?: {
    title: string
    liveCurrentValue: number
    targetValue: number | null
    unit: string | null
    progressPercent: number | null
  } | null
  plan?: { version: number } | null
  openWorkCount: number
  finishedWorkCount: number
  latestLearning: string
  nextStep?: { title: string; body: string; href: string } | null
}): GrowthStoryFacts {
  return {
    businessName: input.businessName,
    goalTitle: input.goal?.title ?? "",
    goalCurrent: input.goal?.liveCurrentValue ?? null,
    goalTarget: input.goal?.targetValue ?? null,
    goalUnit: input.goal?.unit ?? "",
    goalProgressPercent: input.goal?.progressPercent ?? null,
    hasApprovedPlan: Boolean(input.plan),
    planVersion: input.plan?.version ?? null,
    openWorkCount: input.openWorkCount,
    finishedWorkCount: input.finishedWorkCount,
    latestLearning: input.latestLearning,
    nextStepTitle: input.nextStep?.title ?? "",
    nextStepBody: input.nextStep?.body ?? "",
    nextStepHref: input.nextStep?.href ?? "",
  };
}

export function buildGrowthStory(facts: GrowthStoryFacts): GrowthStoryBeat[] {
  const name = clean(facts.businessName) || "This business";
  return [
    {
      title: "The Goal",
      body: clip(`${name}. ${goalLine(facts)}`, 500),
      href: clean(facts.goalTitle) ? "/app/goals" : "/app/next-step",
    },
    {
      title: "The plan",
      body: clip(planLine(facts), 500),
      href: facts.hasApprovedPlan ? "/app/goals" : "/app/next-step",
    },
    {
      title: "The work",
      body: clip(workLine(facts), 500),
      href: "/app/next-step",
    },
    {
      title: "What changed",
      body: clip(learningLine(facts), 500),
      href: "/app/next-step",
    },
    {
      title: "What should happen next",
      body: clip(
        `${nextLine(facts)} Ads, email, and social stay left alone.`,
        500,
      ),
      href: "/app/next-step",
    },
  ];
}
