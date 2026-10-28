from typing import List, Tuple, Optional

def can_mark_verified_complete(
    evidence_requirements: List[dict],
    dependencies: List[dict]
) -> Tuple[bool, Optional[str]]:
    """
    Validates §8 Rules 1 & 2:
    1. A task cannot be Verified Complete if mandatory evidence is missing or unverified.
    2. A task cannot be Verified Complete if it has unsatisfied dependencies.
    """
    # Check dependencies
    unsatisfied_deps = [
        d.get("title", d.get("id")) 
        for d in dependencies 
        if d.get("status") != "verified_complete"
    ]
    if unsatisfied_deps:
        return False, f"Unsatisfied dependencies: {', '.join(unsatisfied_deps)}"

    # Check mandatory evidence requirements
    unverified_evidence = [
        e.get("name", e.get("id"))
        for e in evidence_requirements
        if e.get("mandatory", True) and e.get("verification_status") != "verified"
    ]
    if unverified_evidence:
        return False, f"Mandatory evidence not verified: {', '.join(unverified_evidence)}"

    return True, None

