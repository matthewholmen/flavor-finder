#!/usr/bin/env python3
"""Extract drink pairings from source document and create curated JSON."""

import json
import re
from collections import defaultdict

# Priority ingredients organized by tier
PRIORITY_INGREDIENTS = {
    "tier1_proteins": [
        "beef", "pork", "chicken", "turkey", "duck", "lamb", "venison",
        "salmon", "tuna", "halibut", "cod", "shrimp", "lobster", "scallops",
        "tofu", "tempeh"
    ],
    "tier2_vegetables": [
        "tomato", "mushroom", "asparagus", "broccoli", "cauliflower",
        "spinach", "kale", "arugula",
        "onion", "garlic", "leek",
        "carrot", "beet", "potato", "sweet potato"
    ],
    "tier3_fruits": [
        "lemon", "lime", "orange", "grapefruit",
        "apple", "pear", "peach", "strawberry", "blueberry", "raspberry"
    ],
    "tier4_seasonings": [
        "basil", "thyme", "rosemary", "parsley", "cilantro", "mint",
        "black pepper", "chili pepper", "cumin", "coriander", "cinnamon", "ginger"
    ],
    "tier5_dairy": [
        "parmesan", "mozzarella", "cheddar", "goat cheese", "feta", "blue cheese",
        "cream", "butter", "yogurt", "ricotta"
    ],
    "tier6_dishes": [
        "pasta", "pizza", "burger", "steak", "roast chicken",
        "sushi", "tacos", "curry", "stir-fry", "bbq", "ribs",
        "caesar salad", "caprese salad",
        "chocolate", "apple pie", "cheesecake"
    ],
    "tier7_pantry": [
        "olive oil", "soy sauce", "vinegar", "balsamic", "tomato sauce", "pesto", "mustard"
    ]
}

# Wine simplification mapping
WINE_SIMPLIFICATIONS = {
    "Bordeaux, red": "Cabernet Sauvignon",
    "Bordeaux, white": "Sauvignon Blanc",
    "Burgundy, red": "Pinot Noir",
    "Burgundy, white": "Chardonnay",
    "Rhône red wine": "Syrah",
    "Rhône white wine": "Viognier",
    "Châteauneuf-du-Pape": "Syrah",
    "Shiraz/Syrah": "Syrah",
    "Shiraz": "Syrah",
    "Champagne": "Champagne",
    "sparkling wine": "Sparkling Wine",
    "Prosecco": "Sparkling Wine",
    "Cava": "Sparkling Wine",
}

# Wine style detection patterns
WINE_STYLES = {
    "Cabernet Sauvignon": "bold red",
    "Pinot Noir": "light red",
    "Merlot": "medium red",
    "Syrah": "bold red",
    "Zinfandel": "bold red",
    "Malbec": "bold red",
    "Tempranillo": "medium red",
    "Sangiovese": "medium red",
    "Nebbiolo": "bold red",
    "Grenache": "medium red",
    "Barbera": "medium red",
    "Dolcetto": "light red",
    "Beaujolais": "light red",
    "Chianti": "medium red",
    "Rioja": "medium red",
    "Chardonnay": "full white",
    "Sauvignon Blanc": "crisp white",
    "Riesling": "aromatic white",
    "Pinot Grigio": "light white",
    "Pinot Gris": "light white",
    "Gewürztraminer": "aromatic white",
    "Viognier": "aromatic white",
    "Chenin Blanc": "aromatic white",
    "Albariño": "crisp white",
    "Vermentino": "light white",
    "Grüner Veltliner": "crisp white",
    "Champagne": "sparkling",
    "Sparkling Wine": "sparkling",
    "Prosecco": "sparkling",
    "Cava": "sparkling",
    "Rosé": "rosé",
    "Sauternes": "sweet white",
    "Port": "dessert wine",
    "Sherry": "fortified",
    "Madeira": "fortified"
}

# Beer style patterns
BEER_PATTERNS = {
    "IPA": "hoppy",
    "India Pale Ale": "hoppy",
    "Stout": "dark",
    "Porter": "dark",
    "Lager": "light",
    "Pilsner": "light",
    "Wheat beer": "wheat",
    "Weissbier": "wheat",
    "Hefeweizen": "wheat",
    "Belgian ale": "Belgian",
    "Amber ale": "amber",
    "Pale ale": "amber",
    "Brown ale": "dark"
}

# Spirit patterns
SPIRIT_PATTERNS = {
    "Bourbon": "whiskey",
    "Whiskey": "whiskey",
    "Scotch": "whiskey",
    "Gin": "gin",
    "Vodka": "vodka",
    "Rum": "rum",
    "Tequila": "tequila",
    "Mezcal": "tequila",
    "Brandy": "brandy",
    "Cognac": "brandy",
    "Calvados": "brandy"
}


def normalize_ingredient(text):
    """Normalize ingredient name for matching."""
    text = text.lower().strip()
    # Remove parenthetical notes
    text = re.sub(r'\s*\(.*?\)', '', text)
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    return text


def categorize_drink(drink_text):
    """Categorize drink into wine, beer, or spirit."""
    drink_lower = drink_text.lower()

    # Check for beer patterns
    for beer_type in BEER_PATTERNS:
        if beer_type.lower() in drink_lower:
            return "beer", beer_type, BEER_PATTERNS[beer_type]

    # Check for spirit patterns
    for spirit_type in SPIRIT_PATTERNS:
        if spirit_type.lower() in drink_lower:
            return "spirit", spirit_type, SPIRIT_PATTERNS[spirit_type]

    # Default to wine
    return "wine", None, None


def simplify_wine(wine_name):
    """Simplify wine name using mapping rules."""
    wine_name = wine_name.strip()

    # Check direct mappings
    for complex_name, simple_name in WINE_SIMPLIFICATIONS.items():
        if complex_name.lower() in wine_name.lower():
            return simple_name

    # Extract major varietals
    for varietal in WINE_STYLES.keys():
        if varietal.lower() in wine_name.lower():
            return varietal

    return wine_name


def parse_drink_entry(line):
    """Parse a drink pairing line and extract drink info."""
    line = line.strip()
    if not line:
        return None

    # Remove leading bullet points, tabs, spaces
    line = re.sub(r'^[\s\t•*-]+', '', line)

    # Skip non-drink lines
    if not line or len(line) < 3:
        return None

    # Skip lines that are clearly not drinks
    skip_keywords = ["tip:", "avoid", "note:", "chef", "sommelier", "—"]
    if any(kw in line.lower() for kw in skip_keywords):
        return None

    # Check if all caps (indicates best pairing)
    is_best = line.isupper() or line.startswith("*")

    # Remove asterisks
    line = line.replace("*", "").strip()

    # Normalize case
    drink_text = line.title() if is_best else line

    return {
        "text": drink_text,
        "is_best": is_best
    }


def extract_pairings_for_ingredient(lines, start_idx):
    """Extract all drink pairings for an ingredient starting at given line."""
    pairings = {
        "wines": [],
        "beers": [],
        "spirits": []
    }

    i = start_idx + 1
    while i < len(lines):
        line = lines[i].strip()

        # Stop when we hit a new main ingredient section
        # (all caps line that is a single word or matches another ingredient pattern)
        if line and line.isupper() and len(line) > 2:
            # Check if this looks like a new ingredient header (not a subsection)
            # Subsections typically have longer phrases or specific markers
            if not any(marker in line for marker in [
                "IN GENERAL", "WITH", "AND", "OR", ",", ":",
                "BARBECUED", "BOILED", "BRAISED", "BROILED", "GRILLED",
                "ROASTED", "SAUTÉED", "STEAMED", "FRIED", "BAKED",
                "SAUCE", "STYLE", "BASED", "COLD", "HOT", "FRESH"
            ]):
                # Single-word or short all-caps likely means new ingredient
                word_count = len(line.replace("-", " ").split())
                if word_count <= 2:
                    break

        # Parse drink entry
        drink_entry = parse_drink_entry(line)
        if drink_entry:
            category, drink_type, style = categorize_drink(drink_entry["text"])

            if category == "wine":
                wine_name = simplify_wine(drink_entry["text"])
                if wine_name in WINE_STYLES:
                    pairings["wines"].append({
                        "name": wine_name,
                        "style": WINE_STYLES[wine_name]
                    })
            elif category == "beer":
                pairings["beers"].append({
                    "name": drink_type,
                    "style": style
                })
            elif category == "spirit":
                pairings["spirits"].append({
                    "name": drink_type,
                    "style": style
                })

        i += 1

    # Deduplicate and limit to 8 total pairings
    for category in ["wines", "beers", "spirits"]:
        # Remove duplicates while preserving order
        seen = set()
        unique = []
        for item in pairings[category]:
            key = (item["name"], item["style"])
            if key not in seen:
                seen.add(key)
                unique.append(item)
        pairings[category] = unique[:8]

    return pairings


def main():
    source_file = "/Users/coolmatt/Claude Apps/flavor-finder/FlavorFinder-iOS-1/FlavorFinder/Resources/Data/392944594-Andrew-Dornenburg-WhatToDrinkwitht-What-You-Eat.txt"
    output_file = "/Users/coolmatt/Claude Apps/flavor-finder/FlavorFinder-iOS-1/FlavorFinder/Resources/Data/drinkPairings.json"

    # Read source file
    with open(source_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Build flat priority list
    all_ingredients = []
    for tier_name in ["tier1_proteins", "tier2_vegetables", "tier3_fruits", "tier4_seasonings", "tier5_dairy", "tier6_dishes", "tier7_pantry"]:
        all_ingredients.extend(PRIORITY_INGREDIENTS[tier_name])

    # Extract pairings
    pairings_data = {}

    for ingredient in all_ingredients:
        # Find ingredient in file
        found = False
        for i, line in enumerate(lines):
            # Look for ingredient as section header (all caps at start of line)
            if line.startswith(ingredient.upper()):
                # Verify it's a proper section header
                normalized = normalize_ingredient(line)
                if normalized.startswith(ingredient.lower()):
                    print(f"Found: {ingredient} at line {i}")
                    pairings = extract_pairings_for_ingredient(lines, i)
                    if any(pairings[cat] for cat in ["wines", "beers", "spirits"]):
                        pairings_data[ingredient] = pairings
                        found = True
                    break

        if not found:
            print(f"Not found: {ingredient}")

    # Create output JSON
    output = {
        "version": "1.0",
        "tier": 2,
        "updated": "2026-01-14",
        "pairings": pairings_data
    }

    # Write output
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nExtracted {len(pairings_data)} ingredients")
    print(f"Output written to: {output_file}")


if __name__ == "__main__":
    main()
