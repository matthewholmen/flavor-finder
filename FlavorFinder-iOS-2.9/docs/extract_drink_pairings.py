#!/usr/bin/env python3
"""
Extract drink pairings from the source text file for priority ingredients.
"""

import json
import re
from collections import defaultdict
from datetime import datetime

# Priority ingredients to extract (normalized to lowercase singular)
PRIORITY_INGREDIENTS = {
    # Tier 1: Core Proteins
    'beef', 'pork', 'chicken', 'turkey', 'duck', 'lamb', 'venison',
    'salmon', 'tuna', 'halibut', 'cod', 'shrimp', 'lobster', 'scallops',
    'tofu', 'tempeh',

    # Tier 2: Popular Vegetables
    'tomato', 'mushroom', 'asparagus', 'broccoli', 'cauliflower',
    'spinach', 'kale', 'arugula',
    'onion', 'garlic', 'leek',
    'carrot', 'beet', 'potato', 'sweet potato',

    # Tier 3: Common Fruits
    'lemon', 'lime', 'orange', 'grapefruit',
    'apple', 'pear', 'peach', 'strawberry', 'blueberry', 'raspberry',

    # Tier 4: Key Seasonings
    'basil', 'thyme', 'rosemary', 'parsley', 'cilantro', 'mint',
    'black pepper', 'chili pepper', 'cumin', 'coriander', 'cinnamon', 'ginger',
    'shallot',

    # Tier 5: Dairy & Cheese
    'parmesan', 'mozzarella', 'cheddar', 'goat cheese', 'feta', 'blue cheese',
    'cream', 'butter', 'yogurt', 'ricotta',

    # Tier 6: Popular Dishes
    'pasta', 'pizza', 'burger', 'steak', 'roast chicken',
    'sushi', 'tacos', 'curry', 'stir-fry', 'bbq ribs',
    'caesar salad', 'caprese salad',
    'chocolate dessert', 'apple pie', 'cheesecake',

    # Tier 7: Pantry Essentials
    'olive oil', 'soy sauce', 'vinegar', 'balsamic vinegar', 'red wine vinegar',
    'tomato sauce', 'pesto', 'mustard',

    # Additional priority items found in text
    'eggplant', 'squash', 'zucchini', 'avocado',
}

# Wine style classifications
WINE_STYLES = {
    # Bold reds
    'cabernet sauvignon': 'bold red',
    'malbec': 'bold red',
    'syrah': 'bold red',
    'shiraz': 'bold red',
    'cabernet franc': 'bold red',
    'bordeaux': 'bold red',
    'nebbiolo': 'bold red',
    'barolo': 'bold red',
    'barbaresco': 'bold red',
    'brunello': 'bold red',

    # Medium reds
    'merlot': 'medium red',
    'pinot noir': 'medium red',
    'chianti': 'medium red',
    'sangiovese': 'medium red',
    'tempranillo': 'medium red',
    'rioja': 'medium red',
    'burgundy': 'medium red',
    'grenache': 'medium red',
    'côtes du rhône': 'medium red',
    'zinfandel': 'medium red',

    # Light reds
    'beaujolais': 'light red',
    'gamay': 'light red',
    'pinot noir': 'light red',
    'lambrusco': 'light red',

    # Rich whites
    'chardonnay': 'rich white',
    'viognier': 'rich white',
    'white burgundy': 'rich white',

    # Crisp whites
    'sauvignon blanc': 'crisp white',
    'pinot grigio': 'crisp white',
    'pinot gris': 'crisp white',
    'chablis': 'crisp white',
    'sancerre': 'crisp white',
    'albariño': 'crisp white',
    'grüner veltliner': 'crisp white',
    'muscadet': 'crisp white',
    'verdicchio': 'crisp white',

    # Aromatic whites
    'riesling': 'aromatic white',
    'gewürztraminer': 'aromatic white',
    'moscato': 'aromatic white',
    'torrontés': 'aromatic white',

    # Rosé
    'rosé': 'rosé',

    # Sparkling
    'champagne': 'sparkling',
    'prosecco': 'sparkling',
    'cava': 'sparkling',
    'sparkling wine': 'sparkling',

    # Fortified/Sweet
    'port': 'fortified sweet',
    'sherry': 'fortified',
    'madeira': 'fortified',
    'marsala': 'fortified',
    'sauternes': 'sweet white',
    'ice wine': 'sweet white',
    'moscato d\'asti': 'sweet sparkling',
}

# Beer style classifications
BEER_STYLES = {
    'pilsner': 'light lager',
    'lager': 'light lager',
    'pale ale': 'pale ale',
    'ipa': 'ipa',
    'amber ale': 'amber',
    'brown ale': 'brown',
    'porter': 'dark',
    'stout': 'dark',
    'wheat beer': 'wheat',
    'hefeweizen': 'wheat',
    'witbier': 'wheat',
    'saison': 'belgian',
    'tripel': 'belgian',
}

# Spirit classifications
SPIRIT_STYLES = {
    'bourbon': 'whiskey',
    'scotch': 'whiskey',
    'whiskey': 'whiskey',
    'rye': 'whiskey',
    'vodka': 'vodka',
    'gin': 'gin',
    'rum': 'rum',
    'tequila': 'tequila',
    'mezcal': 'mezcal',
    'cognac': 'brandy',
    'brandy': 'brandy',
    'grappa': 'brandy',
}

def normalize_ingredient(name):
    """Normalize ingredient name to lowercase singular form."""
    name = name.lower().strip()

    # Remove common prefixes/suffixes
    name = re.sub(r'\s*\(.*?\)', '', name)  # Remove parenthetical notes
    name = re.sub(r',.*$', '', name)  # Remove everything after comma
    name = name.strip()

    # Handle plural -> singular (simple heuristic)
    if name.endswith('oes'):
        name = name[:-2]  # tomatoes -> tomato
    elif name.endswith('ies'):
        name = name[:-3] + 'y'  # berries -> berry
    elif name.endswith('s') and not name.endswith('ss'):
        name = name[:-1]  # carrots -> carrot

    return name

def normalize_drink(name):
    """Normalize drink name."""
    name = name.lower().strip()

    # Remove common qualifiers
    name = re.sub(r'\s*\(.*?\)', '', name)
    name = re.sub(r',.*$', '', name)
    name = re.sub(r'\s+esp\..*$', '', name)
    name = re.sub(r'\s+and/or.*$', '', name)
    name = name.strip()

    # Consolidate similar wines
    if 'shiraz' in name:
        name = 'syrah'
    if 'cabernet' in name and 'sauvignon' in name:
        name = 'cabernet sauvignon'
    if 'pinot' in name and 'noir' in name:
        name = 'pinot noir'
    if 'sauvignon' in name and 'blanc' in name:
        name = 'sauvignon blanc'

    return name

def extract_pairings_from_text(file_path):
    """Extract drink pairings from the text file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    pairings = defaultdict(lambda: {'wines': [], 'beers': [], 'spirits': []})
    current_ingredient = None
    in_pairing_section = False
    current_indent = 0  # Track indentation level of current ingredient

    for i, line in enumerate(lines):
        raw_line = line
        line = line.strip()

        # Check if this is an ingredient header (all caps, could be indented or not)
        # Remove punctuation and check if remaining text is all uppercase
        text_only = re.sub(r'[^A-Za-z]', '', line)
        is_potential_header = (line and len(text_only) > 2 and text_only.isupper())

        if is_potential_header:
            # Skip common section headers that are not ingredients
            # Extract just the first word/phrase before any tab or special char
            first_part = line.split('\t')[0].strip()
            section_patterns = ['IN GENERAL', 'IN', 'WITH', 'AND', 'OR', 'ESP', 'ESPECIALLY',
                               'SEE ALSO', 'SEE', 'ALSO', 'AVOID', 'TIPS', 'NOTE', 'NOTES',
                               'THE', 'A', 'AN', 'AT', 'AS', 'FOR', 'DESSERTS', 'APPETIZERS',
                               'ENTREES', 'SALADS', 'SOUPS', 'SAUCES', 'BEVERAGES', 'DISHES',
                               'PREPARATIONS', 'METHODS', 'TECHNIQUES']
            if first_part in section_patterns or first_part.startswith('WITH ') or first_part.startswith('AND '):
                continue

            # Calculate indentation
            indent = len(raw_line) - len(raw_line.lstrip())
            current_indent = indent
            # Extract ingredient name
            ingredient_raw = line.split('\t')[0].split('(')[0].strip()
            ingredient_normalized = normalize_ingredient(ingredient_raw)

            # Check if this is a priority ingredient (exact match)
            if ingredient_normalized in PRIORITY_INGREDIENTS:
                current_ingredient = ingredient_normalized
                in_pairing_section = True
                print(f"Found ingredient: {ingredient_normalized}")
            else:
                # Check for compound matches (e.g., "sweet potato")
                # Only match if priority ingredient is a substring AND length > 4 to avoid false matches
                for priority in PRIORITY_INGREDIENTS:
                    # Multi-word priority ingredients (e.g., "sweet potato")
                    if ' ' in priority and priority in ingredient_normalized:
                        current_ingredient = priority
                        in_pairing_section = True
                        print(f"Found ingredient (compound): {priority} <- {ingredient_normalized}")
                        break
                    # Single-word matches must be whole words
                    elif ' ' not in priority and len(priority) > 4:
                        # Check if priority is a whole word in the ingredient
                        if re.search(rf'\b{re.escape(priority)}\b', ingredient_normalized):
                            current_ingredient = priority
                            in_pairing_section = True
                            print(f"Found ingredient (word match): {priority} <- {ingredient_normalized}")
                            break
                else:
                    in_pairing_section = False
                    current_ingredient = None

        # Extract drink pairings (indented lines that are NOT all uppercase)
        elif in_pairing_section and current_ingredient and line and raw_line.startswith(' '):
            # Check if this line is also all uppercase (would be a sub-ingredient, not a drink)
            text_only = re.sub(r'[^A-Za-z]', '', line)
            if text_only.isupper() and len(text_only) > 2:
                # This is another ingredient header, stop extracting
                in_pairing_section = False
                current_ingredient = None
                continue

            drink = line.strip()

            # Skip non-alcoholic drinks
            if any(x in drink.lower() for x in ['coffee', 'tea', 'juice', 'water', 'soda', 'lemonade', 'cola']):
                continue

            drink_normalized = normalize_drink(drink)

            # Categorize as wine, beer, or spirit
            if 'beer' in drink_normalized or 'ale' in drink_normalized or 'lager' in drink_normalized or 'pilsner' in drink_normalized or 'stout' in drink_normalized or 'porter' in drink_normalized or 'ipa' in drink_normalized:
                # Beer - extract specific styles mentioned
                added_beer = False
                for beer_type, style in BEER_STYLES.items():
                    if beer_type in drink_normalized:
                        if not any(b['name'] == beer_type for b in pairings[current_ingredient]['beers']):
                            pairings[current_ingredient]['beers'].append({
                                'name': beer_type.title(),
                                'style': style
                            })
                            added_beer = True

                # If no specific style found but "beer" is mentioned, add generic beer
                if not added_beer and 'beer' in drink_normalized:
                    if not any(b['name'] == 'beer' for b in pairings[current_ingredient]['beers']):
                        pairings[current_ingredient]['beers'].append({
                            'name': 'Beer',
                            'style': 'various'
                        })

            elif any(spirit in drink_normalized for spirit in SPIRIT_STYLES.keys()) or 'cocktail' in drink_normalized:
                # Spirit - extract specific types mentioned
                added_spirit = False
                for spirit_type, style in SPIRIT_STYLES.items():
                    if spirit_type in drink_normalized:
                        if not any(s['name'].lower() == spirit_type for s in pairings[current_ingredient]['spirits']):
                            pairings[current_ingredient]['spirits'].append({
                                'name': spirit_type.title(),
                                'style': style
                            })
                            added_spirit = True

                # If "cocktail" is mentioned but no specific spirit, add generic cocktail
                if not added_spirit and 'cocktail' in drink_normalized:
                    if not any(s['name'] == 'cocktail' for s in pairings[current_ingredient]['spirits']):
                        pairings[current_ingredient]['spirits'].append({
                            'name': 'Cocktail',
                            'style': 'mixed'
                        })

            else:
                # Assume wine
                for wine_type, style in WINE_STYLES.items():
                    if wine_type in drink_normalized:
                        if not any(w['name'].lower() == wine_type for w in pairings[current_ingredient]['wines']):
                            pairings[current_ingredient]['wines'].append({
                                'name': wine_type.title(),
                                'style': style
                            })
                        break

        # Stop pairing section when we hit a blank line
        elif in_pairing_section and not line:
            # Keep going - might be more pairings
            pass

    # Limit to top 8 per category
    for ingredient in pairings:
        pairings[ingredient]['wines'] = pairings[ingredient]['wines'][:8]
        pairings[ingredient]['beers'] = pairings[ingredient]['beers'][:8]
        pairings[ingredient]['spirits'] = pairings[ingredient]['spirits'][:8]

    return dict(pairings)

def main():
    source_file = '/Users/coolmatt/Claude Apps/flavor-finder/FlavorFinder-iOS-1/FlavorFinder/Resources/Data/392944594-Andrew-Dornenburg-WhatToDrinkwitht-What-You-Eat.txt'
    output_file = '/Users/coolmatt/Claude Apps/flavor-finder/FlavorFinder-iOS-1/FlavorFinder/Resources/Data/drinkPairings.json'

    print("Extracting drink pairings...")
    pairings = extract_pairings_from_text(source_file)

    print(f"\nExtracted pairings for {len(pairings)} ingredients")

    # Create output structure
    output = {
        'version': '1.0',
        'tier': 2,
        'updated': datetime.now().strftime('%Y-%m-%d'),
        'pairings': pairings
    }

    # Write to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nWrote pairings to {output_file}")

    # Print summary
    print("\n=== Summary ===")
    for ingredient in sorted(pairings.keys()):
        wines = len(pairings[ingredient]['wines'])
        beers = len(pairings[ingredient]['beers'])
        spirits = len(pairings[ingredient]['spirits'])
        print(f"{ingredient}: {wines} wines, {beers} beers, {spirits} spirits")

if __name__ == '__main__':
    main()
