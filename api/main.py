from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from solver import apply_priority_scaling, solve_knapsack

app = FastAPI()

# ── Priority values as defined in the paper ────────────────────────────────────
# High = 3 (Essential), Medium = 2 (Adjustable), Low = 1 (Discretionary)
PRIORITY_MAP = {"low": 1, "medium": 2, "high": 3}


class Appliance(BaseModel):
    name: str
    watts: float
    hours_per_day: float
    priority: str          # 'low' | 'medium' | 'high'
    peak_start: Optional[str] = None
    peak_end: Optional[str] = None
    is_active: bool = True


class OptimizationRequest(BaseModel):
    appliances: List[Appliance]
    budget: float
    electricity_rate: float
    current_hour: int


@app.post("/optimize")
def optimize_energy(request: OptimizationRequest):
    items = []

    for appliance in request.appliances:
        priority_int = PRIORITY_MAP.get(appliance.priority, 1)
        cost_per_day = (appliance.watts / 1000) * appliance.hours_per_day * request.electricity_rate

        # Parse peak_start and peak_end strings into hour integers
        peak_start_hour = None
        peak_end_hour   = None
        if appliance.peak_start:
            peak_start_hour = int(appliance.peak_start.split(":")[0])
        if appliance.peak_end:
            peak_end_hour = int(appliance.peak_end.split(":")[0])

        items.append({
            "name":         appliance.name,
            "watts":        appliance.watts,
            "hours_per_day":appliance.hours_per_day,
            "priority":     priority_int,
            "peak_start":   peak_start_hour,
            "peak_end":     peak_end_hour,
            "cost":         cost_per_day,
            "scaled_up":    False,
        })

    # Stage A: Adaptive Priority Scaling
    items = apply_priority_scaling(items, request.current_hour)

    # Stage B+C+D: Merge Sort → DFS Branch & Bound → Decision Mapping
    all_appliances, max_value, pruning_log = solve_knapsack(items, request.budget)

    # Split into ON and OFF lists for the frontend
    turn_on  = [a for a in all_appliances if a["is_on"]]
    turn_off = [a for a in all_appliances if not a["is_on"]]

    # Build algorithm report payload for the Report tab
    total_nodes = 2 ** len(all_appliances)
    nodes_explored = len(pruning_log)

    return {
        # ── Main result (existing frontend uses this) ──────────────────
        "turn_on":               turn_on,
        "turn_off":              turn_off,
        "total_priority_value":  max_value,

        # ── Algorithm Report tab payload ───────────────────────────────
        "report": {
            "sortedAppliances":      all_appliances,
            "pruningLog":            pruning_log,
            "totalCostOnAppliances": round(sum(a["cost_per_day"] for a in turn_on), 6),
            "budgetThreshold":       request.budget,
            "nodesExplored":         nodes_explored,
            "totalPossibleNodes":    total_nodes,
            "totalWattageOn":        sum(a["watts"] for a in turn_on),
            "peakHourActive":        any(a.get("scaled_up") for a in all_appliances),
            "currentHour":           request.current_hour,
        }
    }