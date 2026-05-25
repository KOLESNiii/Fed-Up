import {
  canCook,
  canPrepareBase,
  formatDayLabel,
  getContextTags,
  getPlanningDayIds,
  matchesDietaryTags,
  sortByPreferredFallback,
} from "./constraints";
import type { MealOption, PlannedMeal, PlanningConstraints, PlanStrategy, WeeklyPlan } from "./types";

function cheapest(meals: MealOption[]): MealOption | undefined {
  return [...meals].sort((a, b) => a.pricePence - b.pricePence || a.prepMinutes - b.prepMinutes)[0];
}

function compatibleMeals(meals: MealOption[], constraints: PlanningConstraints, mealType?: MealOption["mealType"]) {
  return meals.filter(meal => {
    if (mealType !== undefined && meal.mealType !== mealType) return false;
    if (!matchesDietaryTags(meal, constraints.dietaryTags)) return false;
    if (meal.mealType !== "fallback" && meal.prepMinutes > constraints.maxPrepMinutes) return false;
    if (meal.mealType !== "fallback" && constraints.kitchenAccess === "none") return false;
    return true;
  });
}

function pickFallback(
  meals: MealOption[],
  constraints: PlanningConstraints,
  projectedTotalWithoutCandidate: number,
  usedIds: Set<string>,
): MealOption {
  const fallbacks = sortByPreferredFallback(
    compatibleMeals(meals, constraints, "fallback").filter(meal => !usedIds.has(meal.id)),
    constraints,
    projectedTotalWithoutCandidate,
  );

  return fallbacks[0] ?? cheapest(compatibleMeals(meals, constraints, "fallback")) ?? meals[0]!;
}

function pickRemix(meals: MealOption[], constraints: PlanningConstraints, base: MealOption | undefined, index: number) {
  const remixes = compatibleMeals(meals, constraints, "remix").filter(
    meal => base === undefined || meal.derivesFromPrepBaseId === base.id,
  );

  return remixes[index % Math.max(remixes.length, 1)] ?? cheapest(compatibleMeals(meals, constraints, "quick_cook"));
}

function pickQuickCook(meals: MealOption[], constraints: PlanningConstraints) {
  return cheapest(compatibleMeals(meals, constraints, "quick_cook"));
}

function buildPlanMeal(dayId: string, meal: MealOption, constraints: PlanningConstraints): PlannedMeal {
  return {
    dayId,
    dateLabel: formatDayLabel(dayId),
    contextTags: getContextTags(dayId, constraints),
    meal,
    wasRescued: false,
  };
}

function buildPrepOncePlan(constraints: PlanningConstraints, meals: MealOption[]): PlannedMeal[] {
  const days = getPlanningDayIds();
  const base = cheapest(compatibleMeals(meals, constraints, "prep_base").filter(meal => canPrepareBase(constraints, meal)));
  const usedFallbacks = new Set<string>();

  return days.map((dayId, index) => {
    const meal =
      index === 0 && base !== undefined
        ? base
        : pickRemix(meals, constraints, base, index - 1) ??
          pickQuickCook(meals, constraints) ??
          pickFallback(meals, constraints, 0, usedFallbacks);

    if (meal.mealType === "fallback") usedFallbacks.add(meal.id);
    return buildPlanMeal(dayId, meal, constraints);
  });
}

function buildMixedPlan(constraints: PlanningConstraints, meals: MealOption[]): PlannedMeal[] {
  const days = getPlanningDayIds();
  const base = cheapest(compatibleMeals(meals, constraints, "prep_base").filter(meal => canPrepareBase(constraints, meal)));
  const usedFallbacks = new Set<string>();
  let runningTotal = 0;
  let remixIndex = 0;

  return days.map((dayId, index) => {
    let meal: MealOption | undefined;

    if (index === 0 && base !== undefined && canCook(constraints)) {
      meal = base;
    } else if (constraints.lateCampusDays.includes(dayId)) {
      meal = pickFallback(meals, constraints, runningTotal, usedFallbacks);
    } else {
      meal = pickRemix(meals, constraints, base, remixIndex) ?? pickQuickCook(meals, constraints);
      remixIndex += 1;
    }

    meal ??= pickFallback(meals, constraints, runningTotal, usedFallbacks);

    if (meal.mealType === "fallback") usedFallbacks.add(meal.id);
    runningTotal += meal.pricePence;

    return buildPlanMeal(dayId, meal, constraints);
  });
}

function buildNoCookPlan(constraints: PlanningConstraints, meals: MealOption[]): PlannedMeal[] {
  const days = getPlanningDayIds();
  const usedFallbacks = new Set<string>();
  let runningTotal = 0;

  return days.map(dayId => {
    const meal = pickFallback(meals, constraints, runningTotal, usedFallbacks);

    usedFallbacks.add(meal.id);
    runningTotal += meal.pricePence;

    return buildPlanMeal(dayId, meal, constraints);
  });
}

function explainStrategy(strategy: PlanStrategy, days: PlannedMeal[], constraints: PlanningConstraints): string {
  const fallbackCount = days.filter(day => day.meal.mealType === "fallback").length;

  if (strategy === "no-cook-rescue") {
    return "This plan avoids cooking and uses compatible campus options for the full week.";
  }

  if (strategy === "prep-once") {
    return "This plan spends one short prep block up front so later meals stay cheap and low effort.";
  }

  if (constraints.lateCampusDays.length > 0) {
    return `This plan mixes prepared meals with ${fallbackCount} planned campus fallback${fallbackCount === 1 ? "" : "s"} for late study days.`;
  }

  return "This plan keeps some cooking flexibility while preserving a fallback route if the week gets tighter.";
}

export function generatePlan(
  constraints: PlanningConstraints,
  strategy: PlanStrategy,
  meals: MealOption[],
): WeeklyPlan {
  const days =
    strategy === "prep-once"
      ? buildPrepOncePlan(constraints, meals)
      : strategy === "mixed"
        ? buildMixedPlan(constraints, meals)
        : buildNoCookPlan(constraints, meals);
  const totalCostPence = days.reduce((sum, day) => sum + day.meal.pricePence, 0);
  const totalPrepMinutes = days.reduce((sum, day) => sum + day.meal.prepMinutes, 0);

  return {
    id: `${strategy}-${constraints.budgetPence}-${constraints.deadlineDays.join("-")}`,
    strategy,
    constraints,
    days,
    totalCostPence,
    budgetPence: constraints.budgetPence,
    totalPrepMinutes,
    explanation: explainStrategy(strategy, days, constraints),
  };
}
