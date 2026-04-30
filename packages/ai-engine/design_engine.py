"""
design_engine.py
Apply design rules on Backend to narrow AI constraints
"""

import sys
from pathlib import Path

# Add style-system package directory to path (hyphen in dir name prevents
# direct module import, so we resolve to the package root)
_style_system_path = str(Path(__file__).parent.parent / "style-system")
if _style_system_path not in sys.path:
    sys.path.insert(0, _style_system_path)

from rules.generate_design_rule import generate_design_rule
from rules.theme_surface_affinity import validate_surface_affinity
from rules.design_rules import USAGE_LIMITS, DENSITY_RULES


def apply_design_rules(mood, domain, density="balanced"):
    """
    Apply design rules based on mood + domain + density
    Returns narrowed design spec for AI prompt

    Args:
        mood: str
        domain: str
        density: str - light|balanced|heavy

    Returns:
        dict - Design specification
    """
    design_spec = generate_design_rule(mood, domain)

    # Apply density correction
    if density in DENSITY_RULES:
        design_spec['spacing'] = DENSITY_RULES[density]['spacing_override']

    return design_spec


def validate_theme_surface(theme, surfaces):
    """
    Check and correct surface/theme incompatibilities

    Args:
        theme: str
        surfaces: list

    Returns:
        list - Corrected surface list
    """
    return validate_surface_affinity(theme, surfaces)


def apply_usage_limits(block_surfaces):
    """
    Enforce USAGE_LIMITS to prevent overuse of surfaces

    Args:
        block_surfaces: list - List of surface types for blocks

    Returns:
        list - Corrected surface list
    """
    if not block_surfaces:
        return []

    counts = {}
    corrected = []

    for surface in block_surfaces:
        limit = USAGE_LIMITS.get(surface, 1.0)
        count = counts.get(surface, 0)
        current_ratio = count / len(block_surfaces)

        if current_ratio < limit:
            corrected.append(surface)
            counts[surface] = count + 1
        else:
            # Use fallback surface
            corrected.append('flat')

    return corrected


def generate_ai_prompt_constraints(mood, domain, density="balanced"):
    """
    Generate AI prompt constraints based on design rules

    Args:
        mood: str
        domain: str
        density: str

    Returns:
        str - Formatted constraints for AI prompt
    """
    design_spec = apply_design_rules(mood, domain, density)

    constraints = f"""
Design Constraints:
- Theme: {design_spec.get('theme', 'default')}
- Recommended Surfaces: {', '.join(design_spec.get('recommended_surfaces', []))}
- Animations: {', '.join(design_spec.get('recommended_animations', []))}
- Section Balance: {design_spec.get('section_balance', 'structured-info')}
- Spacing: {design_spec.get('spacing', 'balanced')}
    """

    return constraints.strip()
