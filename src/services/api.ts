// src/services/api.ts
import { runOptimization } from './optimizer';
import type { OptimizableAppliance } from './optimizer';

export const fetchOptimization = (
  appliances: OptimizableAppliance[],
  budget: number,
  electricityRate: number,
  currentHour: number
) => {
  return runOptimization(appliances, budget, electricityRate, currentHour);
};