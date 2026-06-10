from typing import List, Tuple, Dict
from queue import Queue

def apply_priority_scaling(items: List[Dict], current_hour: int) -> List[Dict]:
    """
    Dynamically scales the priority of an appliance based on the time of day.
    If the current hour matches the appliance's preferred peak hour, its priority increases.
    """
    scaled_items = []
    for item in items:
        new_item = item.copy()
        
        # If the user needs this appliance right now, boost its importance
        if item.get("peak_hour") == current_hour:
            new_item["priority"] += 5  # We add a +5 priority boost (can be adjusted later)
            
        scaled_items.append(new_item)
    return scaled_items


class Node:
    """Represents a state in our Branch and Bound decision tree."""
    def __init__(self, level: int, profit: float, weight: float, selected_items: List[str]):
        self.level = level                 
        self.profit = profit               
        self.weight = weight               
        self.selected_items = selected_items
        self.bound = 0.0                    

def calculate_bound(node: Node, n: int, budget: float, items: List[Dict]) -> float:
    """
    Calculates the upper bound of profit (priority) for a given node.
    If this bound is lower than our current best, we prune the branch.
    """
    # If we are already over budget, this path is dead
    if node.weight >= budget:
        return 0.0

    profit_bound = node.profit
    j = node.level + 1
    total_weight = node.weight

    # Greedily grab items as long as they fit in the remaining budget
    while j < n and total_weight + items[j]["cost"] <= budget:
        total_weight += items[j]["cost"]
        profit_bound += items[j]["priority"]
        j += 1

    # If there is still budget left, take a fraction of the next item 
    # (This establishes our mathematical upper bound)
    if j < n:
        remaining_budget = budget - total_weight
        profit_bound += remaining_budget * (items[j]["priority"] / items[j]["cost"])

    return profit_bound

def solve_knapsack(items: List[Dict], budget: float) -> Tuple[List[str], float]:
    """
    Branch and Bound implementation for the 0/1 Knapsack Problem.
    Maximizes priority while staying strictly under the electricity budget.
    """
    # 1. Filter out items with 0 cost to prevent division by zero errors
    valid_items = [item for item in items if item["cost"] > 0]
    
    # 2. Sort items by priority-to-cost ratio descending (Crucial for B&B efficiency)
    valid_items.sort(key=lambda x: x["priority"] / x["cost"], reverse=True)
    
    n = len(valid_items)
    if n == 0:
        return [], 0.0

    # 3. Setup the Queue for Breadth-First exploration
    q = Queue()
    
    # Create the root node (starting point before looking at any appliances)
    u = Node(-1, 0.0, 0.0, [])
    u.bound = calculate_bound(u, n, budget, valid_items)
    q.put(u)
    
    max_profit = 0.0
    best_selected = []
    
    # 4. Explore the decision tree
    while not q.empty():
        u = q.get()
        
        # If this node's potential is worse than what we already have, ignore it (Pruning!)
        if u.bound > max_profit and u.level < n - 1:
            
            # Look at the next appliance in the list
            next_level = u.level + 1
            next_item = valid_items[next_level]
            
            # BRANCH 1: We choose to TURN ON this appliance
            v_include = Node(
                level=next_level,
                profit=u.profit + next_item["priority"],
                weight=u.weight + next_item["cost"],
                selected_items=u.selected_items + [next_item["name"]]
            )
            
            # Check if this choice is valid and better than our current record
            if v_include.weight <= budget and v_include.profit > max_profit:
                max_profit = v_include.profit
                best_selected = v_include.selected_items
                
            # Calculate the bound for this branch. If it's promising, add it to the queue.
            v_include.bound = calculate_bound(v_include, n, budget, valid_items)
            if v_include.bound > max_profit:
                q.put(v_include)
                
            # BRANCH 2: We choose to KEEP OFF this appliance
            v_exclude = Node(
                level=next_level,
                profit=u.profit,
                weight=u.weight,
                selected_items=list(u.selected_items)
            )
            v_exclude.bound = calculate_bound(v_exclude, n, budget, valid_items)
            
            if v_exclude.bound > max_profit:
                q.put(v_exclude)
                
    return best_selected, max_profit