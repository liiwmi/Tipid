from typing import List, Tuple, Dict
import heapq

def apply_priority_scaling(items: List[Dict], current_hour: int) -> List[Dict]:
    scaled_items = []
    for item in items:
        new_item = item.copy()
        peak_start = item.get("peak_start")
        peak_end = item.get("peak_end")

        # Boost if current hour falls within peak range
        if peak_start is not None and peak_end is not None:
            if peak_start <= current_hour <= peak_end:
                new_item["priority"] = round(new_item["priority"] * 1.5)
        elif peak_start is not None:
            if peak_start == current_hour:
                new_item["priority"] = round(new_item["priority"] * 1.5)

        scaled_items.append(new_item)
    return scaled_items


class Node:
    def __init__(self, level: int, profit: float, weight: float, selected_items: List[str]):
        self.level = level
        self.profit = profit
        self.weight = weight
        self.selected_items = selected_items
        self.bound = 0.0

    def __lt__(self, other):
        return self.bound > other.bound  # Max-heap by bound


def calculate_bound(node: Node, n: int, budget: float, items: List[Dict]) -> float:
    if node.weight >= budget:
        return 0.0

    profit_bound = node.profit
    j = node.level + 1
    total_weight = node.weight

    while j < n and total_weight + items[j]["cost"] <= budget:
        total_weight += items[j]["cost"]
        profit_bound += items[j]["priority"]
        j += 1

    if j < n and items[j]["cost"] > 0:
        remaining_budget = budget - total_weight
        profit_bound += remaining_budget * (items[j]["priority"] / items[j]["cost"])

    return profit_bound


def solve_knapsack(items: List[Dict], budget: float) -> Tuple[List[Dict], float]:
    # Filter zero-cost and zero-priority items
    valid_items = [item for item in items if item["cost"] > 0 and item["priority"] > 0]

    # Sort by priority-to-cost ratio descending
    valid_items.sort(key=lambda x: x["priority"] / x["cost"], reverse=True)

    n = len(valid_items)
    if n == 0:
        return [], 0.0

    # Use a max-heap (priority queue) ordered by bound
    heap = []
    root = Node(-1, 0.0, 0.0, [])
    root.bound = calculate_bound(root, n, budget, valid_items)
    heapq.heappush(heap, root)

    max_profit = 0.0
    best_selected = []
    node_count = 0
    MAX_NODES = 100_000  # Safety limit

    while heap:
        u = heapq.heappop(heap)
        node_count += 1

        if node_count > MAX_NODES:
            break  # Return best found so far

        if u.bound <= max_profit or u.level >= n - 1:
            continue

        next_level = u.level + 1
        next_item = valid_items[next_level]

        # BRANCH 1: Include item
        v_include = Node(
            level=next_level,
            profit=u.profit + next_item["priority"],
            weight=u.weight + next_item["cost"],
            selected_items=u.selected_items + [next_item["name"]],
        )

        if v_include.weight <= budget:
            if v_include.profit > max_profit:
                max_profit = v_include.profit
                best_selected = v_include.selected_items

            v_include.bound = calculate_bound(v_include, n, budget, valid_items)
            if v_include.bound > max_profit:
                heapq.heappush(heap, v_include)

        # BRANCH 2: Exclude item
        v_exclude = Node(
            level=next_level,
            profit=u.profit,
            weight=u.weight,
            selected_items=list(u.selected_items),
        )
        v_exclude.bound = calculate_bound(v_exclude, n, budget, valid_items)
        if v_exclude.bound > max_profit:
            heapq.heappush(heap, v_exclude)

    # Return full details, not just names
    result = []
    for name in best_selected:
        match = next((i for i in valid_items if i["name"] == name), None)
        if match:
            result.append({
                "name": match["name"],
                "watts": match["watts"],
                "hours_per_day": match["hours_per_day"],
                "cost_per_day": round(match["cost"], 4),
                "priority": match["priority"],
            })

    return result, max_profit