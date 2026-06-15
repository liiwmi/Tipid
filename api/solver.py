from typing import List, Dict, Tuple

# ── Priority values as defined in the paper ────────────────────────────────────
# High = 3 (Essential), Medium = 2 (Adjustable), Low = 1 (Discretionary)
PRIORITY_HIGH   = 3
PRIORITY_MEDIUM = 2
PRIORITY_LOW    = 1


# ── Adaptive Priority Scaling ────────────────────────────────────────
#         "Medium Priority appliances are adaptively upgraded to High Priority
#         during user-defined Peak Hours"
def apply_priority_scaling(items: List[Dict], current_hour: int) -> List[Dict]:
    scaled_items = []
    for item in items:
        new_item = item.copy()
        new_item["scaled_up"] = False

        peak_start = item.get("peak_start")
        peak_end   = item.get("peak_end")

        if peak_start is not None and peak_end is not None:
            # Use strict less than for end (consistent with frontend)
            if peak_start <= current_hour < peak_end:
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

    mid   = len(items) // 2
    left  = merge_sort(items[:mid])
    right = merge_sort(items[mid:])
    return _merge(left, right)


def _merge(left: List[Dict], right: List[Dict]) -> List[Dict]:
    result = []
    i = j = 0

    while i < len(left) and j < len(right):
        # Sort descending by priority / cost (value density)
        left_density  = left[i]["priority"]  / left[i]["cost"]  if left[i]["cost"]  > 0 else 0
        right_density = right[j]["priority"] / right[j]["cost"] if right[j]["cost"] > 0 else 0

        if left_density >= right_density:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1

    result.extend(left[i:])
    result.extend(right[j:])
    return result


# ── DFS Branch and Bound Solver ──────────────────────────────────────
#         "Depth-First Search strategy — searches one branch fully before the next.
#         High Priority items are forced-included.
#         Budget constraint prunes the branch immediately when cost exceeds threshold."
def solve_knapsack(items: List[Dict], budget: float) -> Tuple[List[Dict], float, List[Dict]]:
    # Filter out zero-cost / zero-priority items
    valid_items = [item for item in items if item["cost"] > 0 and item["priority"] > 0]

    # Stage B: Sort by value density using Merge Sort
    valid_items = merge_sort(valid_items)

    n = len(valid_items)
    if n == 0:
        return [], 0.0, []

    best_profit   = [0.0]
    best_selected = [[]]
    pruning_log   = []

    # DFS using an explicit stack (not a heap — this is Depth-First, not Best-First)
    # Stack entries: (index, current_cost, current_profit, current_selection)
    stack = [(0, 0.0, 0.0, [])]

    nodes_explored      = 0
    MAX_NODES           = 100_000

    while stack:
        index, current_cost, current_profit, current_selection = stack.pop()
        nodes_explored += 1

        if nodes_explored > MAX_NODES:
            break

        # Base case: all items have been considered
        if index == n:
            if current_profit > best_profit[0]:
                best_profit[0]   = current_profit
                best_selected[0] = list(current_selection)
            continue

        item = valid_items[index]
        is_high_priority = item["priority"] == PRIORITY_HIGH

        # ── Branch 1: INCLUDE this item ───────────────────────────────────────
        new_cost   = current_cost   + item["cost"]
        new_profit = current_profit + item["priority"]

        if new_cost <= budget:
            pruning_log.append({
                "appliance": item["name"],
                "pruned":    False,
                "cum_cost":  round(new_cost, 6),
                "budget":    budget,
                "action":    "included",
            })
            # Push EXCLUDE branch first so DFS explores INCLUDE branch first (LIFO)
            # Only push exclude branch if item is NOT high priority
            if not is_high_priority:
                stack.append((index + 1, current_cost, current_profit, list(current_selection)))

            stack.append((index + 1, new_cost, new_profit, current_selection + [item["name"]]))
        else:
            pruning_log.append({
                "appliance": item["name"],
                "pruned":    True,
                "cum_cost":  round(new_cost, 6),
                "budget":    budget,
                "action":    "pruned — budget exceeded",
            })
            # High Priority items must be included.
            # If even the high priority item exceeds budget, we still can't include it —
            # but we do NOT explore the exclude branch for high priority (per paper logic).
            if not is_high_priority:
                # Explore exclude branch for non-high-priority items
                stack.append((index + 1, current_cost, current_profit, list(current_selection)))

    # ── Stage D: Decision Mapping ─────────────────────────────────────────────
    best_set = set(best_selected[0])
    result   = []

    for item in valid_items:
        is_on = item["name"] in best_set
        result.append({
            "name":         item["name"],
            "watts":        item["watts"],
            "hours_per_day":item["hours_per_day"],
            "cost_per_day": round(item["cost"], 4),
            "priority":     item["priority"],
            "scaled_up":    item.get("scaled_up", False),
            "is_on":        is_on,
        })

    return result, best_profit[0], pruning_log