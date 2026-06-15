export interface OptimizableAppliance {
  id: string;
  name: string;
  watts: number;
  priority: 'low' | 'medium' | 'high';
  hours_per_day: number;
  peak_start: string | null;
  peak_end: string | null;
  is_active: boolean;
  max_runtime_hours: number | null;
  runtime_used_today: number;
  auto_shutoff: boolean;
}

export interface SolverItem {
  id: string;
  name: string;
  watts: number;
  priority: number;
  cost: number;             // kWh cost per day
  hoursEffective: number;   // actual runnable hours after constraints
  scaledPriority: number;   // after peak scaling
}


export interface OptimizationResult {
  turn_on: string[];
  turn_off: string[];
  total_priority_value: number;
  recommendations: ApplianceRecommendation[];
  schedule: ScheduleEntry[];
}


export interface ApplianceRecommendation {
  applianceId: string;
  applianceName: string;
  action: 'turn_on' | 'turn_off';
  reason: string;
  estimatedKwhSaved: number;
  estimatedCostSaved: number;
  estimatedMinutesGained: number;
  priority: 'low' | 'medium' | 'high';
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
const PRIORITY_WEIGHT: Record<string, number> = {
  low: 1,
  medium: 3,
  high: 5,
};


function isInPeakWindow(
  peak_start: string | null,
  peak_end: string | null,
  currentHour: number,
): boolean {
  if (!peak_start || !peak_end) return false;
  const start = parseInt(peak_start.split(':')[0], 10);
  const end = parseInt(peak_end.split(':')[0], 10);
  return currentHour >= start && currentHour < end;
}

function getEffectiveHours(
  appliance: OptimizableAppliance,
  currentHour: number,
): number {
  const hoursLeftInDay = 24 - currentHour;
  const base = appliance.hours_per_day;
  const runtimeRemaining =
    appliance.max_runtime_hours !== null
      ? Math.max(appliance.max_runtime_hours - appliance.runtime_used_today, 0)
      : base;
  return Math.min(base, runtimeRemaining, hoursLeftInDay);
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
  selectedIds: string[];
  bound: number;
}

function calculateBound(
  node: Node,
  n: number,
  budget: number,
  items: SolverItem[],
): number {
  if (node.weight >= budget) return 0;
  let profitBound = node.profit;
  let j = node.level + 1;
  let totalWeight = node.weight;

  while (j < n && totalWeight + items[j].cost <= budget) {
    totalWeight += items[j].cost;
    profitBound += items[j].scaledPriority;
    j++;
  }

  if (j < n && items[j].cost > 0) {
    const remaining = budget - totalWeight;
    profitBound += remaining * (items[j].scaledPriority / items[j].cost);
  }

  return profitBound;
}
// ── MIN-HEAP (simulated via sorted insert for small n) ────────
// For React Native we don't have a built-in heap, so we use
// a simple array sorted by bound descending (best-first)
function solveKnapsack(
  items: SolverItem[],
  budget: number,
): { selectedIds: string[]; maxProfit: number } {
  const valid = items.filter((i) => i.cost > 0 && i.scaledPriority > 0);
  valid.sort((a, b) => b.scaledPriority / b.cost - a.scaledPriority / a.cost);

  const n = valid.length;
  if (n === 0) return { selectedIds: [], maxProfit: 0 };

  const pq: Node[] = [];
  const root: Node = {
    level: -1,
    profit: 0,
    weight: 0,
    selectedIds: [],
    bound: 0,
  };
  root.bound = calculateBound(root, n, budget, valid);
  pq.push(root);

  let maxProfit = 0;
  let bestIds: string[] = [];
  let nodeCount = 0;
  const MAX_NODES = 100_000;

  while (pq.length > 0) {
    pq.sort((a, b) => b.bound - a.bound);
    const u = pq.shift()!;
    nodeCount++;
    if (nodeCount > MAX_NODES) break;
    if (u.bound <= maxProfit || u.level >= n - 1) continue;

    const nextLevel = u.level + 1;
    const nextItem = valid[nextLevel];

    // Include branch
    const vIn: Node = {
      level: nextLevel,
      profit: u.profit + nextItem.scaledPriority,
      weight: u.weight + nextItem.cost,
      selectedIds: [...u.selectedIds, nextItem.id],
      bound: 0,
    };
    if (vIn.weight <= budget) {
      if (vIn.profit > maxProfit) {
        maxProfit = vIn.profit;
        bestIds = vIn.selectedIds;
      }
      vIn.bound = calculateBound(vIn, n, budget, valid);
      if (vIn.bound > maxProfit) pq.push(vIn);
    }

    // Exclude branch
    const vOut: Node = {
      level: nextLevel,
      profit: u.profit,
      weight: u.weight,
      selectedIds: [...u.selectedIds],
      bound: 0,
    };
    vOut.bound = calculateBound(vOut, n, budget, valid);
    if (vOut.bound > maxProfit) pq.push(vOut);
  }

  return { selectedIds: bestIds, maxProfit };
}

export function runOptimization(
  appliances: OptimizableAppliance[],
  budget: number,
  electricityRate: number,
  currentHour: number,
): OptimizationResult {
  const active = appliances.filter((a) => a.is_active);

  // Build solver items with effective hours and peak scaling
  const items: SolverItem[] = active.map((a) => {
    const effectiveHours = getEffectiveHours(a, currentHour);
    const basePriority = PRIORITY_WEIGHT[a.priority] ?? 1;
    const inPeak = isInPeakWindow(a.peak_start, a.peak_end, currentHour);
    const scaledPriority = inPeak ? Math.round(basePriority * 1.5) : basePriority;
    const cost = ((a.watts / 1000) * effectiveHours);

    return {
      id: a.id,
      name: a.name,
      watts: a.watts,
      priority: basePriority,
      scaledPriority,
      cost,
      hoursEffective: effectiveHours,
    };
  });

   const { selectedIds, maxProfit } = solveKnapsack(items, budget);

  const selectedSet = new Set(selectedIds);
  const turn_on = selectedIds;
  const turn_off = active
    .filter((a) => !selectedSet.has(a.id))
    .map((a) => a.id);

  // Total active kW for time projection
  const totalActiveKw =
    active.reduce((sum, a) => sum + a.watts, 0) / 1000;

  const remainingBudgetKwh = budget - active.reduce(
    (sum, a) => sum + (a.watts / 1000) * getEffectiveHours(a, currentHour),
    0,
  );

  const hoursUntilQuota =
    totalActiveKw > 0 ? Math.max(remainingBudgetKwh, 0) / totalActiveKw : null;

  // Build recommendations
  const recommendations: ApplianceRecommendation[] = [];

  for (const a of active) {
    const item = items.find((i) => i.id === a.id)!;
    if (!item) continue;

    if (!selectedSet.has(a.id)) {
      // Recommend turning OFF
      const kwhSaved = item.cost;
      const costSaved = kwhSaved * electricityRate;

      // How much extra time if we remove this appliance's load
      const newTotalKw = Math.max(totalActiveKw - a.watts / 1000, 0.001);
      const remainingKwh = Math.max(budget - (totalActiveKw * (hoursUntilQuota ?? 0)), 0);
      const newHoursUntilQuota = remainingKwh / newTotalKw;
      const minutesGained = hoursUntilQuota !== null
        ? Math.max((newHoursUntilQuota - (hoursUntilQuota ?? 0)) * 60, 0)
        : 0;

      recommendations.push({
        applianceId: a.id,
        applianceName: a.name,
        action: 'turn_off',
        reason: buildTurnOffReason(a, item, inPeakCheck(a, currentHour)),
        estimatedKwhSaved: kwhSaved,
        estimatedCostSaved: costSaved,
        estimatedMinutesGained: minutesGained,
        priority: a.priority,
        watts: a.watts,
      });
    }
  }

  // Recommend turning ON inactive appliances that fit in budget
  const inactive = appliances.filter((a) => !a.is_active);
  for (const a of inactive) {
    const effectiveHours = getEffectiveHours(a, currentHour);
    const cost = (a.watts / 1000) * effectiveHours;
    if (cost <= Math.max(budget - items.reduce((s, i) => selectedSet.has(i.id) ? s + i.cost : s, 0), 0)) {
      recommendations.push({
        applianceId: a.id,
        applianceName: a.name,
        action: 'turn_on',
        reason: `${a.name} fits within your remaining budget and has ${a.priority} priority.`,
        estimatedKwhSaved: 0,
        estimatedCostSaved: 0,
        estimatedMinutesGained: 0,
        priority: a.priority,
        watts: a.watts,
      });
    }
  }

  // Build schedule
  const schedule: ScheduleEntry[] = appliances.map((a) => {
    const effectiveHours = getEffectiveHours(a, currentHour);
    const applianceKw = a.watts / 1000;
    const willExceed = hoursUntilQuota !== null
      ? effectiveHours > (hoursUntilQuota ?? Infinity)
      : false;

    let shutoffTime: string | null = null;
    if (willExceed && hoursUntilQuota !== null) {
      const shutoffMs = Date.now() + hoursUntilQuota * 3_600_000;
      const d = new Date(shutoffMs);
      shutoffTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }

    return {
      applianceId: a.id,
      applianceName: a.name,
      watts: a.watts,
      allowedHours: effectiveHours,
      remainingHours: Math.max(
        (a.max_runtime_hours ?? a.hours_per_day) - a.runtime_used_today,
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
  };
}

function inPeakCheck(a: OptimizableAppliance, currentHour: number): boolean {
  return isInPeakWindow(a.peak_start, a.peak_end, currentHour);
}

function buildTurnOffReason(
  a: OptimizableAppliance,
  item: SolverItem,
  inPeak: boolean,
): string {
  if (a.priority === 'low') {
    return `${a.name} is low priority and consumes ${item.cost.toFixed(2)} kWh. Turning it off saves budget for higher priority appliances.`;
  }
  if (item.cost > 1) {
    return `${a.name} uses ${item.cost.toFixed(2)} kWh which exceeds available budget. Consider turning it off to stay within quota.`;
  }
  return `${a.name} is not included in the optimal set for your current budget.`;
}
