export interface OptimizableAppliance {
  name: string;
  watts: number;
  priority: 'low' | 'medium' | 'high';
  hours_per_day: number;
  peak_start: string | null;
  peak_end: string | null;
  is_active: boolean;
}

interface SolverItem {
  name: string;
  watts: number;
  priority: number;
  cost: number;
}

interface OptimizationResult {
  turn_on: string[];
  total_priority_value: number;
}

const PRIORITY_WEIGHT: Record<string, number> = {
  low: 1,
  medium: 3,
  high: 5,
};

function isInPeakWindow(
  peak_start: string | null,
  peak_end: string | null,
  currentHour: number
): boolean {
  if (!peak_start || !peak_end) return false;
  const start = parseInt(peak_start.split(':')[0], 10);
  const end = parseInt(peak_end.split(':')[0], 10);
  return currentHour >= start && currentHour < end;
}

function applyPriorityScaling(
  items: SolverItem[],
  appliances: OptimizableAppliance[],
  currentHour: number
): SolverItem[] {
  return items.map((item, i) => {
    const appliance = appliances[i];
    const inPeak = isInPeakWindow(
      appliance.peak_start,
      appliance.peak_end,
      currentHour
    );
    return {
      ...item,
      // ✅ Use multiplier (consistent with Python backend)
      priority: inPeak ? Math.round(item.priority * 1.5) : item.priority,
    };
  });
}

interface Node {
  level: number;
  profit: number;
  weight: number;
  selectedItems: string[];
  bound: number;
}

function calculateBound(
  node: Node,
  n: number,
  budget: number,
  items: SolverItem[]
): number {
  if (node.weight >= budget) return 0;

  let profitBound = node.profit;
  let j = node.level + 1;
  let totalWeight = node.weight;

  while (j < n && totalWeight + items[j].cost <= budget) {
    totalWeight += items[j].cost;
    profitBound += items[j].priority;
    j++;
  }

  if (j < n && items[j].cost > 0) {
    const remainingBudget = budget - totalWeight;
    profitBound += remainingBudget * (items[j].priority / items[j].cost);
  }

  return profitBound;
}

// ── MIN-HEAP (simulated via sorted insert for small n) ────────
// For React Native we don't have a built-in heap, so we use
// a simple array sorted by bound descending (best-first)
function solveKnapsack(
  items: SolverItem[],
  budget: number
): { selected: string[]; maxProfit: number } {
  const validItems = items.filter((item) => item.cost > 0 && item.priority > 0);
  validItems.sort((a, b) => b.priority / b.cost - a.priority / a.cost);

  const n = validItems.length;
  if (n === 0) return { selected: [], maxProfit: 0 };

  // Use array as priority queue sorted by bound (best-first search)
  const pq: Node[] = [];

  const root: Node = {
    level: -1,
    profit: 0,
    weight: 0,
    selectedItems: [],
    bound: 0,
  };
  root.bound = calculateBound(root, n, budget, validItems);
  pq.push(root);

  let maxProfit = 0;
  let bestSelected: string[] = [];
  let nodeCount = 0;
  const MAX_NODES = 100_000;

  while (pq.length > 0) {
    // Pop node with highest bound (best-first)
    pq.sort((a, b) => b.bound - a.bound);
    const u = pq.shift()!;
    nodeCount++;

    if (nodeCount > MAX_NODES) break;
    if (u.bound <= maxProfit || u.level >= n - 1) continue;

    const nextLevel = u.level + 1;
    const nextItem = validItems[nextLevel];

    // BRANCH 1: include
    const vInclude: Node = {
      level: nextLevel,
      profit: u.profit + nextItem.priority,
      weight: u.weight + nextItem.cost,
      selectedItems: [...u.selectedItems, nextItem.name],
      bound: 0,
    };

    if (vInclude.weight <= budget) {
      if (vInclude.profit > maxProfit) {
        maxProfit = vInclude.profit;
        bestSelected = vInclude.selectedItems;
      }
      vInclude.bound = calculateBound(vInclude, n, budget, validItems);
      if (vInclude.bound > maxProfit) pq.push(vInclude);
    }

    // BRANCH 2: exclude
    const vExclude: Node = {
      level: nextLevel,
      profit: u.profit,
      weight: u.weight,
      selectedItems: [...u.selectedItems],
      bound: 0,
    };
    vExclude.bound = calculateBound(vExclude, n, budget, validItems);
    if (vExclude.bound > maxProfit) pq.push(vExclude);
  }

  return { selected: bestSelected, maxProfit };
}

export function runOptimization(
  appliances: OptimizableAppliance[],
  budget: number,
  electricityRate: number,
  currentHour: number
): OptimizationResult {
  const active = appliances.filter((a) => a.is_active);

  const items: SolverItem[] = active.map((a) => ({
    name: a.name,
    watts: a.watts,
    priority: PRIORITY_WEIGHT[a.priority] ?? 1,
    // ✅ Cost now includes hours_per_day for accurate daily cost
    cost: ((a.watts / 1000) * a.hours_per_day) * electricityRate,
  }));

  const scaled = applyPriorityScaling(items, active, currentHour);
  const { selected, maxProfit } = solveKnapsack(scaled, budget);

  return {
    turn_on: selected,
    total_priority_value: maxProfit,
  };
}