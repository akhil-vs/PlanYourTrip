export type SubscriptionPlan = "FREE" | "PRO" | "TEAM";

const planRank: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PRO: 1,
  TEAM: 2,
};

export function normalizePlan(plan?: string | null): SubscriptionPlan {
  if (plan === "PRO" || plan === "TEAM") return plan;
  return "FREE";
}

export function hasPlanAtLeast(
  currentPlan: string | null | undefined,
  requiredPlan: SubscriptionPlan
) {
  return planRank[normalizePlan(currentPlan)] >= planRank[requiredPlan];
}

export function canUseCollaboration(plan?: string | null) {
  return hasPlanAtLeast(plan, "PRO");
}

export function canUseActivityTimeline(plan?: string | null) {
  return hasPlanAtLeast(plan, "PRO");
}

export function canUsePremiumPdf(plan?: string | null) {
  return hasPlanAtLeast(plan, "PRO");
}

export function canUseAdvancedOptimization(plan?: string | null) {
  return hasPlanAtLeast(plan, "PRO");
}
