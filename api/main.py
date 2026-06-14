from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
from solver import apply_priority_scaling, solve_knapsack

app = FastAPI()

PRIORITY_MAP = {"low": 1, "medium": 3, "high": 5}

class Appliance(BaseModel):
    name: str
    watts: float
    hours_per_day: float
    priority: str  # 'low' | 'medium' | 'high'
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

    for app in request.appliances:
        priority_int = PRIORITY_MAP.get(app.priority, 1)
        cost_per_day = (app.watts / 1000) * app.hours_per_day * request.electricity_rate

        # Parse peak_start and peak_end into hours
        peak_start_hour = None
        peak_end_hour = None
        if app.peak_start:
            peak_start_hour = int(app.peak_start.split(":")[0])
        if app.peak_end:
            peak_end_hour = int(app.peak_end.split(":")[0])

        items.append({
            "name": app.name,
            "watts": app.watts,
            "hours_per_day": app.hours_per_day,
            "priority": priority_int,
            "peak_start": peak_start_hour,
            "peak_end": peak_end_hour,
            "cost": cost_per_day,
        })

    items = apply_priority_scaling(items, request.current_hour)
    best_appliances, max_value = solve_knapsack(items, request.budget)

    return {
        "turn_on": best_appliances,
        "total_priority_value": max_value,
    }