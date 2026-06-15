export interface OptimizableAppliance {
  id: string;
  name: string;
  watts: number;
  priority: "low" | "medium" | "high";
  hours_per_day: number;
  peak_start: string | null;
  peak_end: string | null;
  is_active: boolean;
  max_runtime_hours: number | null;
  runtime_used_today: number;
  auto_shutoff: boolean;
}

const PRIORITY_MAP: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};
const PRIORITY_HIGH = 3;

export interface SolverItem {
  name: string;
  watts: number;
  hours_per_day: number;
  priority: number;
  cost: number;
  scaledUp: boolean;
}

export interface PruneStep {
  appliance: string;
  pruned: boolean;
  cum_cost: number;
  budget: number;
  action: string;
}

export interface SortedAppliance {
  name: string;
  watts: number;
  hours_per_day: number;
  cost_per_day: number;
  priority: number;
  scaled_up: boolean;
  is_on: boolean;
}

export interface AlgorithmReport {
  sortedAppliances: SortedAppliance[];
  pruningLog: PruneStep[];
  totalCostOnAppliances: number;
  budgetThreshold: number;
  nodesExplored: number;
  totalPossibleNodes: number;
  totalWattageOn: number;
  peakHourActive: boolean;
  currentHour: number;
}

export interface ApplianceRecommendation {
  applianceId: string;
  applianceName: string;
  action: "turn_on" | "turn_off";
  reason: string;
  estimatedKwhSaved: number;
  estimatedCostSaved: number;
  estimatedMinutesGained: number;
  priority: "low" | "medium" | "high";
  watts: number;
}

export interface ScheduleEntry {
  applianceId: string;
  applianceName: string;
  watts: number;
  allowedHours: number;
  remainingHours: number;
  willExceedQuota: boolean;
  recommendedShutoffTime: string | null;
}

export interface OptimizationResult {
  turn_on: string[];
  turn_off: string[];
  total_priority_value: number;
  recommendations: ApplianceRecommendation[];
  schedule: ScheduleEntry[];
  totalActiveWatts: number;
  remainingKwh: number;
  projectedMinutesRemaining: number | null;
  report: AlgorithmReport;
}

// ── Adaptive Priority Scaling ─────────────────────────────────────────────────
function applyPriorityScaling(
  items: SolverItem[],
  appliances: OptimizableAppliance[],
  currentHour: number,
): SolverItem[] {
  return items.map((item, i) => {
    const appliance = appliances[i];
    if (item.priority !== 2) return item;

    const start = appliance.peak_start
      ? parseInt(appliance.peak_start.split(":")[0], 10)
      : null;
    const end = appliance.peak_end
      ? parseInt(appliance.peak_end.split(":")[0], 10)
      : null;

    const inPeak =
      start !== null && end !== null
        ? currentHour >= start && currentHour < end
        : false;

    if (inPeak) {
      return { ...item, priority: PRIORITY_HIGH, scaledUp: true };
    }
    return item;
  });
}

// ── Merge Sort by Value Density ───────────────────────────────────────────────
function mergeSort(items: SolverItem[]): SolverItem[] {
  if (items.length <= 1) return items;
  const mid = Math.floor(items.length / 2);
  const left = mergeSort(items.slice(0, mid));
  const right = mergeSort(items.slice(mid));
  return merge(left, right);
}

function merge(left: SolverItem[], right: SolverItem[]): SolverItem[] {
  const result: SolverItem[] = [];
  let i = 0,
    j = 0;

  while (i < left.length && j < right.length) {
    const leftDensity = left[i].cost > 0 ? left[i].priority / left[i].cost : 0;
    const rightDensity =
      right[j].cost > 0 ? right[j].priority / right[j].cost : 0;

    if (leftDensity >= rightDensity) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }

  return [...result, ...left.slice(i), ...right.slice(j)];
}

// ── DFS Branch and Bound ──────────────────────────────────────────────────────
// NOTE: By the time items reach this solver, all PRIORITY_HIGH items have
// already been pre-included by runOptimization (see "Stage C" below) and
// removed from `sortedItems`. This solver therefore only ever sees
// medium/low priority candidates competing for the *remaining* budget —
// high-priority items can no longer be pruned, by construction, not just
// by the (insufficient) include/exclude skip below.
interface StackFrame {
  index: number;
  cumCost: number;
  cumProfit: number;
  selected: string[];
}

function solveKnapsack(
  sortedItems: SolverItem[],
  budget: number,
): {
  bestSelected: string[];
  maxProfit: number;
  pruningLog: PruneStep[];
  nodesExplored: number;
} {
  const n = sortedItems.length;
  const pruningLog: PruneStep[] = [];
  let maxProfit = 0;
  let bestSelected: string[] = [];
  let nodesExplored = 0;
  const MAX_NODES = 100_000;

  const stack: StackFrame[] = [
    { index: 0, cumCost: 0, cumProfit: 0, selected: [] },
  ];

  while (stack.length > 0) {
    const { index, cumCost, cumProfit, selected } = stack.pop()!;
    nodesExplored++;

    if (nodesExplored > MAX_NODES) break;

    if (index === n) {
      if (cumProfit > maxProfit) {
        maxProfit = cumProfit;
        bestSelected = [...selected];
      }
      continue;
    }

    const item = sortedItems[index];
    const newCost = cumCost + item.cost;
    const newProfit = cumProfit + item.priority;

    if (newCost <= budget) {
      pruningLog.push({
        appliance: item.name,
        pruned: false,
        cum_cost: parseFloat(newCost.toFixed(6)),
        budget,
        action: "included",
      });

      // Explore both including and excluding this item — medium/low
      // priority items remain optimizable (subject to true knapsack
      // tradeoffs).
      stack.push({
        index: index + 1,
        cumCost,
        cumProfit,
        selected: [...selected],
      });
      stack.push({
        index: index + 1,
        cumCost: newCost,
        cumProfit: newProfit,
        selected: [...selected, item.name],
      });
    } else {
      pruningLog.push({
        appliance: item.name,
        pruned: true,
        cum_cost: parseFloat(newCost.toFixed(6)),
        budget,
        action: "pruned — budget exceeded",
      });

      // Item can't fit — only the exclude branch survives.
      stack.push({
        index: index + 1,
        cumCost,
        cumProfit,
        selected: [...selected],
      });
    }

    // Track the best "exclude everything from here" baseline too, since
    // index === n is the only place we currently record maxProfit. This
    // is already covered by pushing the exclude branch above, which will
    // eventually reach index === n and get compared.
    if (cumProfit > maxProfit) {
      maxProfit = cumProfit;
      bestSelected = [...selected];
    }
  }

  return { bestSelected, maxProfit, pruningLog, nodesExplored };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// How many hours this appliance still needs to run today
function getRemainingHours(
  appliance: OptimizableAppliance,
  currentHour: number,
): number {
  const hoursLeftInDay = 24 - currentHour;
  const hoursStillNeeded = Math.max(
    appliance.hours_per_day - (appliance.runtime_used_today ?? 0),
    0,
  );
  const maxAllowed =
    appliance.max_runtime_hours !== null
      ? Math.max(
          appliance.max_runtime_hours - (appliance.runtime_used_today ?? 0),
          0,
        )
      : hoursStillNeeded;

  return Math.min(hoursStillNeeded, maxAllowed, hoursLeftInDay);
}

function buildTurnOffReason(a: OptimizableAppliance, inPeak: boolean): string {
  if (a.priority === "low") {
    return `${a.name} is low priority (${a.watts}W). Turning it off frees budget for higher priority appliances.`;
  }
  if (a.watts > 500) {
    return `${a.name} draws ${a.watts}W and strains your daily budget. Consider turning it off.`;
  }
  return `${a.name} is not in the optimal set for your current budget.`;
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function runOptimization(
  appliances: OptimizableAppliance[],
  budget: number, // daily budget in ₱ (dailyQuota × electricityRate)
  electricityRate: number,
  currentHour: number,
  currentKwh: number = 0, // actual kWh consumed today from the energy ledger
): OptimizationResult {
  // How much budget is already spent by actual consumption today
  const spentBudget = currentKwh * electricityRate;
  // Remaining budget the algorithm has to work with
  const remainingBudget = Math.max(budget - spentBudget, 0);

  const active = appliances.filter((a) => a.is_active);

  // Build solver items using REMAINING hours needed today, not full hours_per_day
  // This means an AC that has already run 4 of its 8 hours only costs 4h worth
  const rawItems: SolverItem[] = active.map((a) => {
    const hoursRemaining = getRemainingHours(a, currentHour);
    return {
      name: a.name,
      watts: a.watts,
      hours_per_day: hoursRemaining,
      priority: PRIORITY_MAP[a.priority] ?? 1,
      // Cost = how much it will cost to finish running today
      cost: (a.watts / 1000) * hoursRemaining * electricityRate,
      scaledUp: false,
    };
  });

  // Stage A: Adaptive Priority Scaling
  const scaledItems = applyPriorityScaling(rawItems, active, currentHour);
  const peakHourActive = scaledItems.some((i) => i.scaledUp);

  // Stage B: Merge Sort — filter zero-cost/zero-priority items first
  const sortedAll = mergeSort(
    scaledItems.filter((i) => i.cost > 0 && i.priority > 0),
  );

  // ── Stage B.5: HARD HIGH-PRIORITY SAFEGUARD ───────────────────────────────
  // High-priority appliances (priority === PRIORITY_HIGH, including items
  // scaled up to High during peak hours) are pre-included before the
  // knapsack runs at all. Their cost is subtracted from the budget up
  // front, and they are removed from the candidate pool so the DFS
  // branch-and-bound can never explore a branch that excludes them —
  // even if the budget is fully consumed by high-priority items alone.
  const highPriorityItems = sortedAll.filter(
    (i) => i.priority === PRIORITY_HIGH,
  );
  const remainingItems = sortedAll.filter((i) => i.priority !== PRIORITY_HIGH);

  const highPriorityCost = highPriorityItems.reduce(
    (sum, i) => sum + i.cost,
    0,
  );
  const highPriorityProfit = highPriorityItems.reduce(
    (sum, i) => sum + i.priority,
    0,
  );

  // Budget left for medium/low priority items after high-priority items
  // are guaranteed their share. Clamped to >= 0 — if high-priority items
  // alone exceed the budget, no further items can be added, but the
  // high-priority items themselves are still always "on".
  const knapsackBudget = Math.max(remainingBudget - highPriorityCost, 0);

  // Stage C: DFS Branch and Bound — runs ONLY on medium/low priority items
  const {
    bestSelected: bestFromKnapsack,
    maxProfit: profitFromKnapsack,
    pruningLog,
    nodesExplored,
  } = solveKnapsack(remainingItems, knapsackBudget);

  // Merge: high-priority items are unconditionally selected, plus whatever
  // the knapsack chose from the remaining medium/low priority pool.
  const bestSelected = [
    ...highPriorityItems.map((i) => i.name),
    ...bestFromKnapsack,
  ];
  const maxProfit = highPriorityProfit + profitFromKnapsack;

  // Combine for reporting purposes (sortedAppliances should reflect the
  // full sorted order, with is_on reflecting the merged selection)
  const sortedItems = sortedAll;

  // Stage D: Decision Mapping
  const selectedSet = new Set(bestSelected);
  const sortedAppliances: SortedAppliance[] = sortedItems.map((item) => ({
    name: item.name,
    watts: item.watts,
    hours_per_day: item.hours_per_day,
    cost_per_day: parseFloat(item.cost.toFixed(4)),
    priority: item.priority,
    scaled_up: item.scaledUp,
    is_on: selectedSet.has(item.name),
  }));

  const turn_on = bestSelected;
  const turn_off = active
    .filter((a) => !selectedSet.has(a.name))
    .map((a) => a.id);
  const onAppliances = sortedAppliances.filter((a) => a.is_on);
  const totalPossible = Math.pow(2, remainingItems.length);

  // ── Derived metrics ───────────────────────────────────────────────────────
  // remainingKwh = how much kWh is left before quota is hit
  const budgetKwh = budget / electricityRate;
  const remainingKwh = Math.max(budgetKwh - currentKwh, 0);

  // Only count active watts for projection
  const totalActiveWatts = active.reduce((sum, a) => sum + a.watts, 0);
  const totalActiveKw = totalActiveWatts / 1000;
  const projectedMinutesRemaining =
    totalActiveKw > 0 ? (remainingKwh / totalActiveKw) * 60 : null;

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations: ApplianceRecommendation[] = [];

  for (const a of active) {
    if (!selectedSet.has(a.name)) {
      // High-priority appliances are never recommended for shutoff —
      // they are always in selectedSet by construction, so this branch
      // is unreachable for them, but the guard documents the invariant.
      if ((PRIORITY_MAP[a.priority] ?? 1) === PRIORITY_HIGH) continue;

      // How much quota time would be gained by turning this off
      const newTotalKw = Math.max(totalActiveKw - a.watts / 1000, 0.001);
      const newProjected =
        totalActiveKw > 0 ? (remainingKwh / newTotalKw) * 60 : null;
      const minutesGained =
        newProjected !== null && projectedMinutesRemaining !== null
          ? Math.max(newProjected - projectedMinutesRemaining, 0)
          : 0;
      const hoursGained = minutesGained / 60;
      const kwhSaved = (a.watts / 1000) * hoursGained;
      const costSaved = kwhSaved * electricityRate;
      const inPeak = !!(
        a.peak_start &&
        a.peak_end &&
        currentHour >= parseInt(a.peak_start.split(":")[0], 10) &&
        currentHour < parseInt(a.peak_end.split(":")[0], 10)
      );

      recommendations.push({
        applianceId: a.id,
        applianceName: a.name,
        action: "turn_off",
        reason: buildTurnOffReason(a, inPeak),
        estimatedKwhSaved: kwhSaved,
        estimatedCostSaved: costSaved,
        estimatedMinutesGained: minutesGained,
        priority: a.priority,
        watts: a.watts,
      });
    }
  }

  // Recommend turning ON inactive appliances that still fit in remaining budget
  const inactive = appliances.filter((a) => !a.is_active);
  for (const a of inactive) {
    const hoursRemaining = getRemainingHours(a, currentHour);
    const projectedKwh = (a.watts / 1000) * hoursRemaining;
    if (projectedKwh <= remainingKwh) {
      recommendations.push({
        applianceId: a.id,
        applianceName: a.name,
        action: "turn_on",
        reason: `${a.name} fits within remaining budget (needs ${projectedKwh.toFixed(2)} kWh, ${remainingKwh.toFixed(2)} kWh left). ${a.priority} priority.`,
        estimatedKwhSaved: 0,
        estimatedCostSaved: 0,
        estimatedMinutesGained: 0,
        priority: a.priority,
        watts: a.watts,
      });
    }
  }

  recommendations.sort((a, b) => {
    if (a.action !== b.action) return a.action === "turn_off" ? -1 : 1;
    return b.estimatedKwhSaved - a.estimatedKwhSaved;
  });

  // ── Schedule ──────────────────────────────────────────────────────────────
  const schedule: ScheduleEntry[] = appliances.map((a) => {
    const hoursRemaining = getRemainingHours(a, currentHour);
    const willExceed =
      projectedMinutesRemaining !== null
        ? hoursRemaining * 60 > projectedMinutesRemaining
        : false;

    let shutoffTime: string | null = null;
    if (willExceed && projectedMinutesRemaining !== null) {
      const d = new Date(Date.now() + projectedMinutesRemaining * 60_000);
      shutoffTime = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    }

    return {
      applianceId: a.id,
      applianceName: a.name,
      watts: a.watts,
      allowedHours: hoursRemaining,
      remainingHours: Math.max(
        (a.max_runtime_hours ?? a.hours_per_day) - (a.runtime_used_today ?? 0),
        0,
      ),
      willExceedQuota: willExceed,
      recommendedShutoffTime: shutoffTime,
    };
  });

  return {
    turn_on,
    turn_off,
    total_priority_value: maxProfit,
    recommendations,
    schedule,
    totalActiveWatts,
    remainingKwh,
    projectedMinutesRemaining,
    report: {
      sortedAppliances,
      pruningLog,
      totalCostOnAppliances: parseFloat(
        onAppliances.reduce((s, a) => s + a.cost_per_day, 0).toFixed(6),
      ),
      budgetThreshold: knapsackBudget,
      nodesExplored,
      totalPossibleNodes: totalPossible,
      totalWattageOn: onAppliances.reduce((s, a) => s + a.watts, 0),
      peakHourActive,
      currentHour,
    },
  };
}
