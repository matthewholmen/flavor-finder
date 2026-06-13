#!/usr/bin/env python3
"""
Enhanced drink pairing extraction with fuzzy matching and comprehensive coverage.
Version 2.0 - Expands coverage from 61 to 300+ ingredients.
"""

import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent
SOURCE_FILE = BASE_DIR / 'FlavorFinder/Resources/Data/392944594-Andrew-Dornenburg-WhatToDrinkwitht-What-You-Eat.txt'
INGREDIENT_PROFILES = BASE_DIR / 'FlavorFinder/Resources/Data/ingredientProfiles.json'
OUTPUT_FILE = BASE_DIR / 'FlavorFinder/Resources/Data/drinkPairings.json'

# Manual mappings for dish → ingredient
MANUAL_MAPPINGS = {
    'barbecue': 'bbq',
    'bbq': 'bbq',
    'barbeque': 'bbq',
    'roast chicken': 'chicken',
    'roasted chicken': 'chicken',
    'grilled chicken': 'chicken',
    'fried chicken': 'chicken',
    'grilled salmon': 'salmon',
    'smoked salmon': 'salmon',
    'beef wellington': 'beef',
    'prime rib': 'beef',
    'pot roast': 'beef',
    'beef bourguignon': 'beef',
    'carpaccio': 'beef',
    'caesar salad': 'caesar salad',
    'caprese salad': 'tomato',
    'pasta carbonara': 'pasta',
    'pasta primavera': 'pasta',
    'spaghetti': 'pasta',
    'penne': 'pasta',
    'fettuccine': 'pasta',
    'balsamic vinegar': 'balsamic',
    'red wine vinegar': 'red wine vinegar',
    'olive oil': 'olive oil',
    'soy sauce': 'soy sauce',
    'tomato sauce': 'tomato sauce',
    'pesto': 'pesto',
    'steak': 'steak',
    'burger': 'burger',
    'roast beef': 'beef',
    'braised beef': 'beef',
    'beef stew': 'beef',
    'short ribs': 'beef',
    'brisket': 'brisket',
    'pork chops': 'pork',
    'pork tenderloin': 'pork',
    'pulled pork': 'pork',
    'bacon': 'bacon',
    'ham': 'ham',
    'prosciutto': 'prosciutto',
    'lamb chops': 'lamb',
    'leg of lamb': 'lamb',
    'roast lamb': 'lamb',
    'duck breast': 'duck',
    'duck confit': 'duck',
    'roast duck': 'duck',
    'turkey breast': 'turkey',
    'roast turkey': 'turkey',
    'grilled fish': 'fish',
    'fried fish': 'fish',
    'fish and chips': 'fish',
    'lobster roll': 'lobster',
    'crab cakes': 'crab',
    'shrimp scampi': 'shrimp',
    'grilled shrimp': 'shrimp',
    'oysters': 'oyster',
    'raw oysters': 'oyster',
    'grilled oysters': 'oyster',
    'mussels': 'mussel',
    'steamed mussels': 'mussel',
    'clams': 'clam',
    'steamed clams': 'clam',
    'scallops': 'scallop',
    'seared scallops': 'scallop',
    'grilled vegetables': 'vegetables',
    'roasted vegetables': 'vegetables',
    'stir-fry': 'stir-fry',
    'curry': 'curry',
    'thai curry': 'curry',
    'indian curry': 'curry',
    'risotto': 'risotto',
    'mushroom risotto': 'mushroom',
    'paella': 'paella',
    'sushi': 'sushi',
    'sashimi': 'sashimi',
    'tacos': 'tacos',
    'pizza': 'pizza',
    'margherita pizza': 'pizza',
    'cheese pizza': 'pizza',
}

# Wine style classifications (expanded)
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
    'amarone': 'bold red',
    'primitivo': 'bold red',
    'petite sirah': 'bold red',
    'tannat': 'bold red',

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
    'carménère': 'medium red',
    'nero d\'avola': 'medium red',
    'montepulciano': 'medium red',
    'barbera': 'medium red',
    'dolcetto': 'medium red',
    'mencia': 'medium red',

    # Light reds
    'beaujolais': 'light red',
    'gamay': 'light red',
    'valpolicella': 'light red',
    'lambrusco': 'light red',
    'pinot noir': 'light red',
    'cinsault': 'light red',

    # Rich whites
    'chardonnay': 'rich white',
    'viognier': 'rich white',
    'white burgundy': 'rich white',
    'semillon': 'rich white',
    'marsanne': 'rich white',
    'roussanne': 'rich white',

    # Crisp whites
    'sauvignon blanc': 'crisp white',
    'pinot grigio': 'crisp white',
    'pinot gris': 'crisp white',
    'chablis': 'crisp white',
    'sancerre': 'crisp white',
    'albariño': 'crisp white',
    'grüner veltliner': 'crisp white',
    'muscadet': 'crisp white',
    'vermentino': 'crisp white',
    'vinho verde': 'crisp white',
    'verdicchio': 'crisp white',
    'soave': 'crisp white',
    'gavi': 'crisp white',
    'orvieto': 'crisp white',

    # Aromatic whites
    'riesling': 'aromatic white',
    'gewürztraminer': 'aromatic white',
    'moscato': 'aromatic white',
    'torrontés': 'aromatic white',
    'chenin blanc': 'aromatic white',
    'müller-thurgau': 'aromatic white',

    # Rosé
    'rosé': 'rosé',
    'tavel': 'rosé',
    'bandol rosé': 'rosé',

    # Sparkling
    'champagne': 'sparkling',
    'prosecco': 'sparkling',
    'cava': 'sparkling',
    'sparkling wine': 'sparkling',
    'crémant': 'sparkling',
    'sekt': 'sparkling',
    'franciacorta': 'sparkling',
    'asti': 'sweet sparkling',
    'moscato d\'asti': 'sweet sparkling',

    # Fortified/Sweet
    'port': 'fortified sweet',
    'tawny port': 'fortified sweet',
    'ruby port': 'fortified sweet',
    'vintage port': 'fortified sweet',
    'sherry': 'fortified',
    'fino': 'fortified dry',
    'amontillado': 'fortified',
    'oloroso': 'fortified',
    'pedro ximénez': 'fortified sweet',
    'px': 'fortified sweet',
    'madeira': 'fortified',
    'marsala': 'fortified',
    'sauternes': 'sweet white',
    'ice wine': 'sweet white',
    'late harvest': 'sweet white',
    'tokaji': 'sweet white',
    'vin santo': 'sweet white',
    'muscat': 'sweet white',
    'muscat de beaumes-de-venise': 'sweet white',
    'banyuls': 'fortified sweet',
}

# Beer style classifications (expanded)
BEER_STYLES = {
    'pilsner': 'light lager',
    'lager': 'light lager',
    'pale lager': 'light lager',
    'pale ale': 'pale ale',
    'ipa': 'ipa',
    'india pale ale': 'ipa',
    'amber ale': 'amber',
    'red ale': 'amber',
    'brown ale': 'brown',
    'porter': 'dark',
    'stout': 'dark',
    'imperial stout': 'dark',
    'wheat beer': 'wheat',
    'hefeweizen': 'wheat',
    'witbier': 'wheat',
    'white beer': 'wheat',
    'saison': 'belgian',
    'tripel': 'belgian',
    'dubbel': 'belgian',
    'belgian ale': 'belgian',
    'sour beer': 'sour',
    'gose': 'sour',
    'berliner weisse': 'sour',
    'lambic': 'sour',
    'gueuze': 'sour',
    'kölsch': 'light lager',
    'bock': 'lager',
    'doppelbock': 'lager',
    'märzen': 'lager',
    'oktoberfest': 'lager',
    'farmhouse ale': 'belgian',
    'smoked beer': 'specialty',
}

# Spirit classifications (expanded)
SPIRIT_STYLES = {
    'bourbon': 'whiskey',
    'scotch': 'whiskey',
    'whiskey': 'whiskey',
    'whisky': 'whiskey',
    'rye': 'whiskey',
    'irish whiskey': 'whiskey',
    'vodka': 'vodka',
    'gin': 'gin',
    'rum': 'rum',
    'dark rum': 'rum',
    'white rum': 'rum',
    'aged rum': 'rum',
    'tequila': 'tequila',
    'mezcal': 'mezcal',
    'cognac': 'brandy',
    'brandy': 'brandy',
    'armagnac': 'brandy',
    'calvados': 'brandy',
    'grappa': 'brandy',
    'pisco': 'brandy',
    'sake': 'sake',
    'soju': 'soju',
    'amaretto': 'liqueur',
    'frangelico': 'liqueur',
    'sambuca': 'liqueur',
    'ouzo': 'liqueur',
    'vermouth': 'fortified wine',
    'bitters': 'bitters',
    'campari': 'bitter liqueur',
    'aperol': 'bitter liqueur',
}

# Non-alcoholic beverage classifications
NON_ALCOHOLIC_STYLES = {
    'tea': 'tea',
    'black tea': 'tea',
    'green tea': 'tea',
    'oolong': 'tea',
    'white tea': 'tea',
    'herbal tea': 'herbal tea',
    'chai': 'spiced tea',
    'matcha': 'tea',
    'coffee': 'coffee',
    'espresso': 'coffee',
    'latte': 'coffee',
    'cappuccino': 'coffee',
    'iced tea': 'cold tea',
    'iced coffee': 'cold coffee',
    'lemonade': 'citrus drink',
    'orange juice': 'citrus juice',
    'grapefruit juice': 'citrus juice',
    'apple juice': 'fruit juice',
    'cranberry juice': 'fruit juice',
    'pomegranate juice': 'fruit juice',
    'sparkling water': 'carbonated',
    'tonic water': 'carbonated',
    'ginger ale': 'carbonated',
    'ginger beer': 'carbonated',
    'kombucha': 'fermented',
}

def normalize_ingredient(name):
    """Normalize ingredient name to lowercase singular form."""
    name = name.lower().strip()

    # Remove common prefixes/suffixes
    name = re.sub(r'\s*\(.*?\)', '', name)  # Remove parenthetical notes
    name = re.sub(r',.*$', '', name)  # Remove everything after comma
    name = name.strip()

    # Handle plural → singular (simple heuristic)
    if name.endswith('oes'):
        name = name[:-2]  # tomatoes → tomato
    elif name.endswith('ies'):
        name = name[:-3] + 'y'  # berries → berry
    elif name.endswith('sses'):
        name = name[:-2]  # grasses → grass
    elif name.endswith('s') and not name.endswith('ss') and not name.endswith('us'):
        # Check if removing 's' creates a valid word
        singular = name[:-1]
        # Don't singularize certain words
        if name not in ['asparagus', 'brussels sprouts', 'swiss', 'grass']:
            name = singular

    return name

def normalize_drink(name):
    """Normalize drink name."""
    name = name.lower().strip()

    # Remove common qualifiers
    name = re.sub(r'\s*\(.*?\)', '', name)
    name = re.sub(r',.*$', '', name)
    name = re.sub(r'\s+esp\..*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s+especially.*$', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s+and/or.*$', '', name)
    name = re.sub(r'\s+or\s+.*$', '', name)
    name = name.strip()

    # Consolidate similar wines
    if 'shiraz' in name:
        name = 'syrah'
    if 'cabernet' in name and 'sauvignon' in name:
        name = 'cabernet sauvignon'
    if 'sauvignon' in name and 'blanc' in name:
        name = 'sauvignon blanc'
    if 'pinot' in name and 'noir' in name:
        name = 'pinot noir'
    if 'pinot' in name and 'gris' in name:
        name = 'pinot gris'
    if 'pinot' in name and 'grigio' in name:
        name = 'pinot grigio'

    return name

def load_app_ingredients():
    """Load all ingredient names from the app's ingredientProfiles.json."""
    with open(INGREDIENT_PROFILES, 'r', encoding='utf-8') as f:
        profiles = json.load(f)

    # Create mapping: normalized name → original name
    ingredient_map = {}
    for profile in profiles:
        original = profile['name']
        normalized = normalize_ingredient(original)
        ingredient_map[normalized] = original

    return ingredient_map

def match_ingredient(ingredient_text, app_ingredients):
    """
    Fuzzy match ingredient name to app ingredient.
    Returns original app ingredient name or None.
    """
    normalized = normalize_ingredient(ingredient_text)

    # 1. Check manual mappings first
    if normalized in MANUAL_MAPPINGS:
        mapped = MANUAL_MAPPINGS[normalized]
        if mapped in app_ingredients:
            return app_ingredients[mapped]

    # 2. Exact match
    if normalized in app_ingredients:
        return app_ingredients[normalized]

    # 3. Word overlap match (e.g., "roast chicken" → "chicken")
    words = set(normalized.split())
    for app_ing_normalized, app_ing_original in app_ingredients.items():
        app_words = set(app_ing_normalized.split())
        overlap = words & app_words

        # If 80%+ of app ingredient words are in the text, it's a match
        if len(app_words) > 0 and len(overlap) / len(app_words) >= 0.8:
            return app_ing_original

    # 4. Substring match (e.g., "beef wellington" → "beef")
    for app_ing_normalized, app_ing_original in app_ingredients.items():
        # Only match if app ingredient is a whole word in the text
        if re.search(rf'\b{re.escape(app_ing_normalized)}\b', normalized):
            return app_ing_original

    return None

def extract_pairings_from_text(file_path, app_ingredients):
    """Extract drink pairings from the text file using fuzzy matching."""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    pairings = defaultdict(lambda: {
        'wines': [],
        'beers': [],
        'spirits': [],
        'nonAlcoholic': []
    })

    current_ingredient = None
    in_pairing_section = False
    matches_found = set()

    for i, line in enumerate(lines):
        raw_line = line
        line = line.strip()

        # Check if this is an ingredient header (all caps, could be indented or not)
        text_only = re.sub(r'[^A-Za-z]', '', line)
        is_potential_header = (line and len(text_only) > 2 and text_only.isupper())

        if is_potential_header:
            # Skip common section headers that are not ingredients
            first_part = line.split('\t')[0].strip()
            section_patterns = [
                'IN GENERAL', 'IN', 'WITH', 'AND', 'OR', 'ESP', 'ESPECIALLY',
                'SEE ALSO', 'SEE', 'ALSO', 'AVOID', 'TIPS', 'NOTE', 'NOTES',
                'THE', 'A', 'AN', 'AT', 'AS', 'FOR', 'DESSERTS', 'APPETIZERS',
                'ENTREES', 'SALADS', 'SOUPS', 'SAUCES', 'BEVERAGES', 'DISHES',
                'PREPARATIONS', 'METHODS', 'TECHNIQUES', 'STYLES', 'TYPES'
            ]
            if first_part in section_patterns or first_part.startswith(('WITH ', 'AND ', 'OR ')):
                continue

            # Extract ingredient name
            ingredient_raw = line.split('\t')[0].split('(')[0].strip()

            # Try to match to app ingredient
            matched = match_ingredient(ingredient_raw, app_ingredients)

            if matched:
                current_ingredient = matched
                in_pairing_section = True
                if matched not in matches_found:
                    matches_found.add(matched)
                    print(f"Found: {matched} <- {ingredient_raw}")
            else:
                in_pairing_section = False
                current_ingredient = None

        # Extract drink pairings (indented lines)
        elif in_pairing_section and current_ingredient and line and raw_line.startswith(' '):
            # Check if this line is also all uppercase (would be a sub-section header)
            text_only = re.sub(r'[^A-Za-z]', '', line)
            if text_only.isupper() and len(text_only) > 2:
                # Keep in pairing section but don't extract this line
                continue

            drink = line.strip()
            drink_normalized = normalize_drink(drink)

            # Categorize drink
            is_non_alcoholic = any(x in drink.lower() for x in [
                'coffee', 'tea', 'juice', 'water', 'lemonade', 'cola',
                'soda', 'iced tea', 'iced coffee', 'kombucha'
            ])

            if is_non_alcoholic:
                # Non-alcoholic
                for na_type, style in NON_ALCOHOLIC_STYLES.items():
                    if na_type in drink_normalized:
                        if not any(d['name'].lower() == na_type for d in pairings[current_ingredient]['nonAlcoholic']):
                            pairings[current_ingredient]['nonAlcoholic'].append({
                                'name': na_type.title(),
                                'style': style
                            })
                        break

            elif any(x in drink_normalized for x in ['beer', 'ale', 'lager', 'pilsner', 'stout', 'porter', 'ipa']):
                # Beer
                added = False
                for beer_type, style in BEER_STYLES.items():
                    if beer_type in drink_normalized:
                        if not any(b['name'].lower() == beer_type for b in pairings[current_ingredient]['beers']):
                            pairings[current_ingredient]['beers'].append({
                                'name': beer_type.title(),
                                'style': style
                            })
                            added = True

                # Generic beer fallback
                if not added and 'beer' in drink_normalized:
                    if not any(b['name'] == 'Beer' for b in pairings[current_ingredient]['beers']):
                        pairings[current_ingredient]['beers'].append({
                            'name': 'Beer',
                            'style': 'various'
                        })

            elif any(spirit in drink_normalized for spirit in SPIRIT_STYLES.keys()) or 'cocktail' in drink_normalized:
                # Spirit
                added = False
                for spirit_type, style in SPIRIT_STYLES.items():
                    if spirit_type in drink_normalized:
                        if not any(s['name'].lower() == spirit_type for s in pairings[current_ingredient]['spirits']):
                            pairings[current_ingredient]['spirits'].append({
                                'name': spirit_type.title(),
                                'style': style
                            })
                            added = True

                # Generic cocktail fallback
                if not added and 'cocktail' in drink_normalized:
                    if not any(s['name'] == 'Cocktail' for s in pairings[current_ingredient]['spirits']):
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

    # Limit to top 8 per category (Tier 2 constraint)
    for ingredient in pairings:
        pairings[ingredient]['wines'] = pairings[ingredient]['wines'][:8]
        pairings[ingredient]['beers'] = pairings[ingredient]['beers'][:8]
        pairings[ingredient]['spirits'] = pairings[ingredient]['spirits'][:8]
        pairings[ingredient]['nonAlcoholic'] = pairings[ingredient]['nonAlcoholic'][:8]

    return dict(pairings)

def main():
    print("=" * 60)
    print("DRINK PAIRING EXTRACTION - Version 2.0")
    print("=" * 60)
    print()

    # Load app ingredients
    print("Loading app ingredients from ingredientProfiles.json...")
    app_ingredients = load_app_ingredients()
    print(f"✓ Loaded {len(app_ingredients)} ingredients from app")
    print()

    # Extract pairings
    print("Extracting drink pairings from source book...")
    print(f"Source: {SOURCE_FILE}")
    print()

    pairings = extract_pairings_from_text(SOURCE_FILE, app_ingredients)

    print()
    print("=" * 60)
    print(f"✓ Extracted pairings for {len(pairings)} ingredients")
    print("=" * 60)
    print()

    # Create output structure
    output = {
        'version': '2.0',
        'tier': 2,
        'updated': datetime.now().strftime('%Y-%m-%d'),
        'pairings': pairings
    }

    # Write to JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"✓ Wrote pairings to {OUTPUT_FILE}")
    print()

    # Print summary statistics
    print("=" * 60)
    print("SUMMARY STATISTICS")
    print("=" * 60)

    total_wines = sum(len(p['wines']) for p in pairings.values())
    total_beers = sum(len(p['beers']) for p in pairings.values())
    total_spirits = sum(len(p['spirits']) for p in pairings.values())
    total_non_alc = sum(len(p['nonAlcoholic']) for p in pairings.values())
    total_all = total_wines + total_beers + total_spirits + total_non_alc

    print(f"Ingredients with pairings: {len(pairings)}")
    print(f"Total pairings: {total_all}")
    print(f"  - Wines: {total_wines}")
    print(f"  - Beers: {total_beers}")
    print(f"  - Spirits: {total_spirits}")
    print(f"  - Non-alcoholic: {total_non_alc}")
    print()

    # Coverage analysis
    coverage = len(pairings) / len(app_ingredients) * 100
    print(f"Coverage: {coverage:.1f}% of app ingredients")
    print()

    # Top 20 ingredients by total pairings
    print("Top 20 ingredients by pairing count:")
    top_ingredients = sorted(
        pairings.items(),
        key=lambda x: sum(len(v) for v in x[1].values()),
        reverse=True
    )[:20]

    for ingredient, pairs in top_ingredients:
        total = sum(len(v) for v in pairs.values())
        w = len(pairs['wines'])
        b = len(pairs['beers'])
        s = len(pairs['spirits'])
        n = len(pairs['nonAlcoholic'])
        print(f"  {ingredient}: {total} ({w}w, {b}b, {s}s, {n}n)")

    print()
    print("=" * 60)
    print("✓ EXTRACTION COMPLETE")
    print("=" * 60)

if __name__ == '__main__':
    main()
