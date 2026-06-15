// src/services/optimizer.ts

export interface OptimizableAppliance {
  name: string;
  watts: number;
  priority: "low" | "medium" | "high";
  hours_per_day: number;
  peak_start: string | null;
  peak_end: string | null;
  is_active: boolean;
}

// High = 3 (Essential), Medium = 2 (Adjustable), Low = 1 (Discretionary)
const PRIORITY_MAP: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};
const PRIORITY_HIGH = 3;

// ── Types ─────────────────────────────────────────────────────────────────────
interface SolverItem {
  name: string;
  watts: number;
  hours_per_day: number;
  priority: number;
  cost: number; // ₱/day
  scaledUp: boolean; // true if medium→high during peak
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

export interface OptimizationResult {
  turn_on: string[];
  total_priority_value: number;
  report: AlgorithmReport;
}

// ── Adaptive Priority Scaling ───────────────────────────────────────
//         "Medium Priority appliances are adaptively UPGRADED TO HIGH PRIORITY
//         during user-defined Peak Hours" — hard upgrade, not a multiplier.
function applyPriorityScaling(
  items: SolverItem[],
  appliances: OptimizableAppliance[],
  currentHour: number,
): SolverItem[] {
  return items.map((item, i) => {
    const appliance = appliances[i];
    if (item.priority !== 2) return item; // only scale Medium

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

// ── Merge Sort by Value Density ─────────────────────────────────────
//         "sorted according to their Priority-to-Cost ratio from highest to lowest.
//         Time complexity: O(n log n)"
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

// ── DFS Branch and Bound ────────────────────────────────────────────
//         "Depth-First Search strategy — searches one branch fully before the next.
//         High Priority items are forced-included.
//         Budget constraint prunes the branch the moment cost exceeds threshold."
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

    // Base case: all items considered
    if (index === n) {
      if (cumProfit > maxProfit) {
        maxProfit = cumProfit;
        bestSelected = [...selected];
      }
      continue;
    }

    const item = sortedItems[index];
    const isHighPriority = item.priority === PRIORITY_HIGH;
    const newCost = cumCost + item.cost;
    const newProfit = cumProfit + item.priority;

    // ── INCLUDE ──────────────────────────────────────────────────
    if (newCost <= budget) {
      pruningLog.push({
        appliance: item.name,
        pruned: false,
        cum_cost: parseFloat(newCost.toFixed(6)),
        budget,
        action: "included",
      });

      // Push EXCLUDE branch first (so INCLUDE is processed first via LIFO)
      // High priority items have NO exclude branch — paper mandates inclusion
      if (!isHighPriority) {
        stack.push({
          index: index + 1,
          cumCost,
          cumProfit,
          selected: [...selected],
        });
      }
      stack.push({
        index: index + 1,
        cumCost: newCost,
        cumProfit: newProfit,
        selected: [...selected, item.name],
      });
    } else {
      // Budget exceeded — prune this branch
      pruningLog.push({
        appliance: item.name,
        pruned: true,
        cum_cost: parseFloat(newCost.toFixed(6)),
        budget,
        action: "pruned — budget exceeded",
      });

      // Even if high priority overflows, don't explore exclude branch for it
      if (!isHighPriority) {
        stack.push({
          index: index + 1,
          cumCost,
          cumProfit,
          selected: [...selected],
        });
      }
    }
  }

  return { bestSelected, maxProfit, pruningLog, nodesExplored };
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function runOptimization(
  appliances: OptimizableAppliance[],
  budget: number,
  electricityRate: number,
  currentHour: number,
): OptimizationResult {
  // Only consider active appliances
  const active = appliances.filter((a) => a.is_active);

  // Build solver items
  const rawItems: SolverItem[] = active.map((a) => ({
    name: a.name,
    watts: a.watts,
    hours_per_day: a.hours_per_day,
    priority: PRIORITY_MAP[a.priority] ?? 1,
    cost: (a.watts / 1000) * a.hours_per_day * electricityRate,
    scaledUp: false,
  }));

  // Adaptive Priority Scaling
  const scaledItems = applyPriorityScaling(rawItems, active, currentHour);
  const peakHourActive = scaledItems.some((i) => i.scaledUp);

  // SMerge Sort by value density
  const sortedItems = mergeSort(
    scaledItems.filter((i) => i.cost > 0 && i.priority > 0),
  );

  // DFS Branch and Bound
  const { bestSelected, maxProfit, pruningLog, nodesExplored } = solveKnapsack(
    sortedItems,
    budget,
  );

  // Decision Mapping
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

  const onAppliances = sortedAppliances.filter((a) => a.is_on);
  const totalPossible = Math.pow(2, sortedItems.length);

  return {
    turn_on: bestSelected,
    total_priority_value: maxProfit,
    report: {
      sortedAppliances,
      pruningLog,
      totalCostOnAppliances: parseFloat(
        onAppliances.reduce((s, a) => s + a.cost_per_day, 0).toFixed(6),
      ),
      budgetThreshold: budget,
      nodesExplored,
      totalPossibleNodes: totalPossible,
      totalWattageOn: onAppliances.reduce((s, a) => s + a.watts, 0),
      peakHourActive,
      currentHour,
    },
  };
}
