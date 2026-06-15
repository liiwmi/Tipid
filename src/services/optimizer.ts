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
  cost: number;           // watts (instantaneous load) — the knapsack weight
  scaledPriority: number;
  hoursEffective: number;
  dailyKwh: number;       // informational only, not used as knapsack weight
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

export interface OptimizationResult {
  turn_on: string[];
  turn_off: string[];
  total_priority_value: number;
  recommendations: ApplianceRecommendation[];
  schedule: ScheduleEntry[];
  totalActiveWatts: number;
  remainingKwh: number;
  projectedMinutesRemaining: number | null;
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
  capacityWatts: number,
  items: SolverItem[],
): number {
  if (node.weight >= capacityWatts) return 0;
  let profitBound = node.profit;
  let j = node.level + 1;
  let totalWeight = node.weight;

  while (j < n && totalWeight + items[j].cost <= capacityWatts) {
    totalWeight += items[j].cost;
    profitBound += items[j].scaledPriority;
    j++;
  }

  if (j < n && items[j].cost > 0) {
    const remaining = capacityWatts - totalWeight;
    profitBound += remaining * (items[j].scaledPriority / items[j].cost);
  }

  return profitBound;
}

function solveKnapsack(
  items: SolverItem[],
  capacityWatts: number,
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
  root.bound = calculateBound(root, n, capacityWatts, valid);
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

    const vIn: Node = {
      level: nextLevel,
      profit: u.profit + nextItem.scaledPriority,
      weight: u.weight + nextItem.cost,
      selectedIds: [...u.selectedIds, nextItem.id],
      bound: 0,
    };
    if (vIn.weight <= capacityWatts) {
      if (vIn.profit > maxProfit) {
        maxProfit = vIn.profit;
        bestIds = vIn.selectedIds;
      }
      vIn.bound = calculateBound(vIn, n, capacityWatts, valid);
      if (vIn.bound > maxProfit) pq.push(vIn);
    }

    const vOut: Node = {
      level: nextLevel,
      profit: u.profit,
      weight: u.weight,
      selectedIds: [...u.selectedIds],
      bound: 0,
    };
    vOut.bound = calculateBound(vOut, n, capacityWatts, valid);
    if (vOut.bound > maxProfit) pq.push(vOut);
  }

  return { selectedIds: bestIds, maxProfit };
}

export function runOptimization(
  appliances: OptimizableAppliance[],
  budget: number,            // daily budget in ₱
  electricityRate: number,   // ₱ per kWh
  currentHour: number,
  maxWattsCapacity?: number, // optional circuit breaker limit in watts
): OptimizationResult {
  const active = appliances.filter((a) => a.is_active);

  // Convert budget to remaining kWh capacity
  const budgetKwh = budget / electricityRate;

  // Knapsack weight = instantaneous watts (not projected kWh)
  // Knapsack capacity = max watts we can run simultaneously
  // If no circuit limit is given, use a very large number so only
  // priority and budget drive the selection
  const capacityWatts = maxWattsCapacity ?? 999_999;

  const items: SolverItem[] = active.map((a) => {
    const effectiveHours = getEffectiveHours(a, currentHour);
    const basePriority = PRIORITY_WEIGHT[a.priority] ?? 1;
    const inPeak = isInPeakWindow(a.peak_start, a.peak_end, currentHour);
    const scaledPriority = inPeak
      ? Math.round(basePriority * 1.5)
      : basePriority;

    // dailyKwh is informational — used for cost/savings estimates
    const dailyKwh = (a.watts / 1000) * effectiveHours;

    return {
      id: a.id,
      name: a.name,
      watts: a.watts,
      priority: basePriority,
      scaledPriority,
      cost: a.watts, 
      hoursEffective: effectiveHours,
      dailyKwh,
    };
  });

  const { selectedIds, maxProfit } = solveKnapsack(items, capacityWatts);
  const selectedSet = new Set(selectedIds);

  const turn_on = selectedIds;
  const turn_off = active
    .filter((a) => !selectedSet.has(a.id))
    .map((a) => a.id);

  // Remaining energy budget
  const totalDailyKwh = appliances.reduce(
    (sum, a) => sum + (a.watts * a.hours_per_day) / 1000,
    0,
  );
  const remainingKwh = Math.max(budgetKwh - totalDailyKwh, 0);

  // Projected time: remaining kWh / current active kW draw
  const totalActiveWatts = active.reduce((sum, a) => sum + a.watts, 0);
  const totalActiveKw = totalActiveWatts / 1000;
  const projectedMinutesRemaining =
    totalActiveKw > 0 ? (remainingKwh / totalActiveKw) * 60 : null;

  // Build recommendations
  const recommendations: ApplianceRecommendation[] = [];

  for (const a of active) {
    const item = items.find((i) => i.id === a.id);
    if (!item) continue;

    if (!selectedSet.has(a.id)) {
      // Turning this off removes its watts from the load
      const newTotalKw = Math.max(totalActiveKw - a.watts / 1000, 0.001);
      const newProjectedMinutes =
        totalActiveKw > 0 ? (remainingKwh / newTotalKw) * 60 : null;
      const minutesGained =
        newProjectedMinutes !== null && projectedMinutesRemaining !== null
          ? Math.max(newProjectedMinutes - projectedMinutesRemaining, 0)
          : 0;

      // kWh saved = watts * hours that would have been gained
      const hoursGained = minutesGained / 60;
      const kwhSaved = (a.watts / 1000) * hoursGained;
      const costSaved = kwhSaved * electricityRate;

      const inPeak = isInPeakWindow(a.peak_start, a.peak_end, currentHour);
      recommendations.push({
        applianceId: a.id,
        applianceName: a.name,
        action: 'turn_off',
        reason: buildTurnOffReason(a, item, inPeak),
        estimatedKwhSaved: kwhSaved,
        estimatedCostSaved: costSaved,
        estimatedMinutesGained: minutesGained,
        priority: a.priority,
        watts: a.watts,
      });
    }
  }

  // Recommend turning ON inactive appliances that fit in remaining capacity
  const inactive = appliances.filter((a) => !a.is_active);
  const currentSelectedWatts = selectedIds.reduce((sum, id) => {
    const item = items.find((i) => i.id === id);
    return sum + (item?.watts ?? 0);
  }, 0);

  for (const a of inactive) {
    const effectiveHours = getEffectiveHours(a, currentHour);
    const projectedKwh = (a.watts / 1000) * effectiveHours;
    const fitsInCapacity = currentSelectedWatts + a.watts <= capacityWatts;
    const fitsInBudget = projectedKwh <= remainingKwh;

    if (fitsInCapacity && fitsInBudget) {
      recommendations.push({
        applianceId: a.id,
        applianceName: a.name,
        action: 'turn_on',
        reason: `${a.name} fits within remaining capacity and budget. ${a.priority} priority.`,
        estimatedKwhSaved: 0,
        estimatedCostSaved: 0,
        estimatedMinutesGained: 0,
        priority: a.priority,
        watts: a.watts,
      });
    }
  }

  // Sort: turn_off first (high energy savers first), then turn_on
  recommendations.sort((a, b) => {
    if (a.action !== b.action) return a.action === 'turn_off' ? -1 : 1;
    return b.estimatedKwhSaved - a.estimatedKwhSaved;
  });

  // Build schedule
  const schedule: ScheduleEntry[] = appliances.map((a) => {
    const effectiveHours = getEffectiveHours(a, currentHour);
    const willExceed =
      projectedMinutesRemaining !== null
        ? effectiveHours * 60 > projectedMinutesRemaining
        : false;

    let shutoffTime: string | null = null;
    if (willExceed && projectedMinutesRemaining !== null) {
      const shutoffMs = Date.now() + projectedMinutesRemaining * 60_000;
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
    totalActiveWatts,
    remainingKwh,
    projectedMinutesRemaining,
  };
}

function buildTurnOffReason(
  a: OptimizableAppliance,
  item: SolverItem,
  inPeak: boolean,
): string {
  if (a.priority === 'low') {
    return `${a.name} is low priority (${a.watts}W). Turning it off frees capacity for higher priority appliances.`;
  }
  if (a.watts > 500) {
    return `${a.name} draws ${a.watts}W which strains your available capacity. Consider turning it off.`;
  }
  return `${a.name} is not in the optimal set for your current budget and capacity.`;
}