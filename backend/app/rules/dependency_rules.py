from typing import List, Tuple, Optional, Set
from collections import defaultdict

def has_cycle(graph: dict[str, list[str]], start_node: str) -> bool:
    """Uses DFS with recursion stack to detect cycles in a directed graph."""
    visited: Set[str] = set()
    rec_stack: Set[str] = set()

    def dfs(node: str) -> bool:
        visited.add(node)
        rec_stack.add(node)
        
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                if dfs(neighbor):
                    return True
            elif neighbor in rec_stack:
                return True
                
        rec_stack.remove(node)
        return False

    for node in graph:
        if node not in visited:
            if dfs(node):
                return True
    return False

def check_circular_dependency(
    new_task_id: str, 
    depends_on_task_id: str, 
    existing_edges: List[Tuple[str, str]]
) -> bool:
    """
    Returns True if adding dependency (new_task_id -> depends_on_task_id) would introduce a cycle.
    Note: In our model, task_id depends on depends_on_task_id (depends_on_task_id must finish first).
    Graph edge: depends_on_task_id -> new_task_id.
    """
    if new_task_id == depends_on_task_id:
        return True # Self-dependency is an immediate cycle
        
    graph = defaultdict(list)
    for t_id, dep_id in existing_edges:
        graph[dep_id].append(t_id)
        
    # Add candidate edge
    graph[depends_on_task_id].append(new_task_id)
    
    return has_cycle(graph, depends_on_task_id)

def evaluate_task_blocked_state(
    task_id: str, 
    prerequisites: List[dict]
) -> Tuple[bool, Optional[str]]:
    """
    Determines if a task should be marked 'blocked'.
    Returns (is_blocked, blocked_reason).
    """
    unsatisfied = []
    for dep in prerequisites:
        # Prerequisite must be 'verified_complete'
        if dep.get("status") != "verified_complete":
            unsatisfied.append(dep.get("title", f"Task {dep.get('id')}"))
            
    if unsatisfied:
        reason = f"Blocked by incomplete prerequisite(s): {', '.join(unsatisfied)}"
        return True, reason
        
    return False, None

