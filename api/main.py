from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from solver import apply_priority_scaling, solve_knapsack

app = FastAPI()

class Appliance(BaseModel):
    name: str
    wattage: float
    priority: int
    peak_hour: int

class OptimizationRequest(BaseModel):
    appliances: List[Appliance]
    budget: float
    electricity_rate: float
    current_hour: int

@app.post("/optimize")
def optimize_energy(request: OptimizationRequest):
    items = []
    
    for app in request.appliances:
        cost_per_hour = (app.wattage / 1000) * request.electricity_rate
        items.append({
            "name": app.name,
            "wattage": app.wattage,
            "priority": app.priority,
            "peak_hour": app.peak_hour,
            "cost": cost_per_hour
        })

    items = apply_priority_scaling(items, request.current_hour)
    # oki so this is the exact moment the API bridge calls upon the algorithm.
    best_appliances, max_value = solve_knapsack(items, request.budget) 

    return {
        "turn_on": best_appliances,
        "total_priority_value": max_value
    }