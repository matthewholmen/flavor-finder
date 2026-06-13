# Dish Type Edge Cases & Fallback Strategies

## Overview
This document analyzes edge cases for each dish type and defines comprehensive fallback strategies to ensure robust dish generation even with limited pairing options.

## Data Summary
- **Proteins**: 134 ingredients
- **Leafy Greens**: 24 ingredients
- **Herbs**: 38 ingredients
- **Alliums**: 8 ingredients (garlic, leek, onion, ramp, scallion, shallot, red onion, sweet onion)
- **Alcohol**: 38 ingredients
- **Grains**: ~20 ingredients

---

## 1. ENTREE Edge Cases

### Current Formula
```swift
.entree: DishFormula(
    keyCategories: [.proteins],
    supportingCount: 2
)
```

### Proposed Enhanced Formula
```swift
.entree: DishFormula(
    keyCategories: [.proteins],
    supportingCount: 3,
    roleRequirements: [
        RoleRequirement(role: .main, priority: .required, count: 1),      // protein
        RoleRequirement(role: .aromatic, priority: .preferred, count: 1), // garlic/onion/herbs
        RoleRequirement(role: .fat, priority: .preferred, count: 1),      // oil/butter
        RoleRequirement(role: .supporting, priority: .optional, count: 1) // vegetables
    ]
)
```

### Edge Cases

#### Case 1: Menu Key = Obscure Protein with Few Pairings
**Example**: "Venison" (game meat) has limited pairings

**Problem**: May not pair with many aromatics or fats

**Fallback Strategy**:
1. **Direct pairing**: Try to find aromatic that pairs with venison
2. **Classic substitution**: Use garlic/onion as "universal" aromatics (most proteins pair with allium)
3. **Bridge ingredient**: Find herb that pairs with venison AND with a fat
4. **Taste-based**: Find high-aromatic ingredient (aromatic > 6) that pairs with venison
5. **Relax aromatic requirement**: Skip aromatic, add extra supporting vegetable
6. **Success minimum**: Protein + 2 supporting ingredients (no aromatics/fat)

#### Case 2: Menu Key = Non-Protein Ingredient
**Example**: Menu key = "Lemon" (featured ingredient is citrus, not protein)

**Problem**: Entree formula expects protein as featured ingredient

**Current Behavior**: Uses lemon as the menu key, finds a protein that pairs with lemon

**Edge Case**: What if protein doesn't pair with aromatic?
- Chicken (pairs with lemon) + ??? aromatic

**Fallback Strategy**:
1. **Try standard aromatics**: garlic, thyme, rosemary (most pair with chicken)
2. **Use menu key as aromatic**: If lemon can fill aromatic role, count it
3. **Bridge through protein**: Chicken → garlic → olive oil (build from protein outward)
4. **Accept minimal dish**: Protein + lemon + 1 other ingredient

#### Case 3: Strict Dietary Restrictions Limit Protein Options
**Example**: Vegan + Gluten-Free

**Problem**: Only plant proteins available, and some are limited in pairings

**Fallback Strategy**:
1. **Expand to grain-based mains**: Use grains (rice, quinoa) as entree base instead of protein
2. **Vegetable as main**: Promote substantial vegetables (mushrooms, eggplant) to main role
3. **Combination main**: Two plant proteins together (tofu + tempeh)
4. **Relax entree definition**: Generate a substantial "side" instead

#### Case 4: Freeform Mode - No Menu Key Constraint
**Example**: compatibilityMode = .freeform, no featured ingredient

**Problem**: How to pick a protein when there's no menu key to pair with?

**Current Behavior**: Picks any random protein

**Enhancement**:
1. **Taste targeting**: Pick protein based on menu balance needs
2. **Category diversity**: Avoid protein types already used in menu
3. **Seasonal preference**: Boost seasonal proteins
4. **User favorites**: Prefer proteins user frequently uses (future enhancement)

---

## 2. SIDE DISH Edge Cases

### Current Formula
```swift
.side: DishFormula(
    keyCategories: [.proteins, .vegetables, .grains],
    keySubcategories: ["Plant Proteins", "Allium", "Leafy Greens", "Roots",
                       "Squash", "Brassicas", "Mushrooms", "Stalks",
                       "Fruit Vegetables", "Rice", "Pasta", "Bread", "Ancient Grains"],
    supportingCount: 2
)
```

### Proposed Enhanced Formula
```swift
.side: DishFormula(
    keyCategories: [.proteins, .vegetables, .grains],
    keySubcategories: ["Plant Proteins", "Allium", "Leafy Greens", "Roots",
                       "Squash", "Brassicas", "Mushrooms", "Stalks",
                       "Fruit Vegetables", "Rice", "Pasta", "Bread", "Ancient Grains"],
    supportingCount: 2,
    roleRequirements: [
        RoleRequirement(role: .main, priority: .required, count: 1),       // grain/veg
        RoleRequirement(role: .aromatic, priority: .preferred, count: 1),  // garlic/herbs
        RoleRequirement(role: .fat, priority: .optional, count: 1)         // oil/butter
    ]
)
```

### Edge Cases

#### Case 1: Menu Key = Ingredient with No Grain Pairings
**Example**: "Saffron" pairs with rice but maybe not other grains

**Problem**: Limited grain options for side dish base

**Fallback Strategy**:
1. **Try all grain types**: Rice, pasta, bread, ancient grains
2. **Use vegetable as main**: If no grains pair, use root vegetable (potato, carrot)
3. **Plant protein as main**: Use beans, lentils as base instead
4. **Bridge to grain**: Saffron → Chicken → Rice (use pairing of menu key to find grain)
5. **Success minimum**: Any vegetable + aromatic + fat (no grain required)

#### Case 2: Gluten-Free Restriction Eliminates Most Grains
**Example**: Gluten-free excludes bread, pasta (only rice/ancient grains left)

**Problem**: Very limited grain options

**Fallback Strategy**:
1. **Rice-based sides**: Focus on rice varieties (basmati, arborio, wild rice)
2. **Ancient grains**: Quinoa, buckwheat, amaranth
3. **Vegetable-based**: Use vegetables as main (roasted roots, sautéed greens)
4. **Plant protein-based**: Bean or lentil sides
5. **Success minimum**: Accept any valid subcategory as main

#### Case 3: Menu Already Has Multiple Grain Dishes
**Example**: Entree is pasta-based, already have rice side

**Problem**: Want variety, not another grain

**Current Behavior**: No tracking of ingredient repetition across dishes

**Enhancement**:
1. **Category diversity bonus**: Score candidates lower if category already used
2. **Subcategory tracking**: Avoid same subcategory (no pasta + pasta)
3. **Prefer vegetables**: Boost vegetable-based sides when grains already used
4. **Plant protein sides**: Boost beans/lentils for protein variety

#### Case 4: Very Simple Sides (2 ingredients only)
**Example**: "Rice + Butter"

**Problem**: Current formula requires 3 total ingredients (main + 2 supporting)

**Enhancement**:
1. **Allow minimal sides**: For simple grains, 2 ingredients is valid (rice + butter, pasta + oil)
2. **Role requirement flexibility**: If fat is included, aromatic can be optional
3. **Quality over quantity**: Better to have simple, perfect pairing than forced 3rd ingredient

---

## 3. SALAD Edge Cases

### Current Formula
```swift
.salad: DishFormula(
    keyCategories: [.vegetables],
    supportingCount: 1,
    requiresTwoKey: true  // 2 vegetables + 1 supporting
)
```

### Proposed Enhanced Formula
```swift
.salad: DishFormula(
    keyCategories: [.vegetables],
    supportingCount: 2,  // Total 4: 2 greens + 2 supporting
    requiresTwoKey: true,
    roleRequirements: [
        RoleRequirement(role: .supporting, priority: .required, count: 2),  // 2 leafy greens
        RoleRequirement(role: .fat, priority: .preferred, count: 1),        // oil/cheese
        RoleRequirement(role: .acid, priority: .preferred, count: 1)        // vinegar/citrus
    ]
)
```

### Edge Cases

#### Case 1: Menu Key = No Direct Leafy Green Pairings
**Example**: "Saffron" doesn't pair with any leafy greens

**Problem**: Cannot build salad with required greens

**Fallback Strategy** (as discussed):
1. **Bridge ingredient**: Find ingredient that pairs with saffron AND with greens
   - Saffron → Lemon → Arugula
2. **Use bridge as featured**: Build salad with lemon as featured ingredient
3. **Two-hop bridge**: Saffron → Chicken → Lemon → Arugula
4. **Relax green requirement**: Use ANY vegetables (not just leafy greens)
5. **Mixed salad**: 1 leafy green + 1 other vegetable
6. **Success minimum**: 2 vegetables + acid + fat (classic "vegetable salad")

#### Case 2: Only One Leafy Green Pairs with Menu Key
**Example**: Menu key only pairs with "Spinach"

**Problem**: Need 2 greens but only 1 available

**Fallback Strategy**:
1. **Find second green via first**: Spinach → Arugula (greens that pair with each other)
2. **Repeat green with variety**: "Baby spinach & mature spinach" (stretch, not ideal)
3. **Use non-green vegetable**: Spinach + Tomato (tomato fills supporting role)
4. **Bridge to second green**: Menu key → bridge → Green 1 → Green 2
5. **Accept single green**: 1 green + 2 supporting vegetables + acid + fat
6. **Success minimum**: Valid salad with single green base

#### Case 3: Dairy-Free Eliminates Cheese as Fat Source
**Example**: Dairy-free restriction, limited fat options

**Problem**: Common salad fats are cheese-based

**Fallback Strategy**:
1. **Oil-based fat**: Olive oil, avocado oil, walnut oil
2. **Avocado**: Vegetable that fills fat role
3. **Nuts**: Almonds, walnuts, pecans (if not nut-free)
4. **Seeds**: Sunflower seeds, pumpkin seeds
5. **Oil-free salad**: Accept salad with just acid (vinegar/lemon) and no fat
6. **Success minimum**: Greens + acid (vinegar-dressed salad)

#### Case 4: No Acid Ingredients Pair with Greens
**Example**: Exotic greens with limited pairings

**Problem**: Cannot complete classic vinaigrette structure

**Fallback Strategy**:
1. **Try all acids**: Vinegars (balsamic, red wine, rice, apple cider), citrus (lemon, lime, orange)
2. **Acidic vegetables**: Tomato can fill acid role
3. **Acidic fruits**: Pomegranate, cranberry
4. **Bridge to acid**: Greens → bridge ingredient → acid
5. **Use high-sour ingredient**: Any ingredient with sour > 4 can substitute
6. **Success minimum**: Greens + fat (oil-based salad, no acid)

#### Case 5: Strict Mode + Limited Green Pairings
**Example**: Strict mode requires ALL ingredients pair with menu key AND each other

**Problem**: Very restrictive for salads (greens + vinegar + oil all must pair with menu key)

**Fallback Strategy**:
1. **Try universal pairings**: Garlic, lemon, olive oil (pair with many ingredients)
2. **Relax to flexible mode**: Only greens need to pair with menu key, supporting ingredients pair within dish
3. **Bridge strategy**: Use pairing of menu key as featured ingredient for salad
4. **Minimal strict salad**: Just 2 greens that both pair with menu key
5. **Skip strict requirement**: Generate salad in flexible mode
6. **Success minimum**: Return nil if no valid strict salad possible (user can retry in flexible)

---

## 4. DESSERT Edge Cases

### Current Formula
```swift
.dessert: DishFormula(
    keyCategories: [.fruits],
    supportingCount: 2,
    tasteFallback: .sweet,
    excludedSupportingCategories: [.proteins, .vegetables]
)
```

### Proposed Enhanced Formula
```swift
.dessert: DishFormula(
    keyCategories: [.fruits],
    supportingCount: 3,
    tasteFallback: .sweet,
    excludedSupportingCategories: [.proteins, .vegetables],
    roleRequirements: [
        RoleRequirement(role: .main, priority: .preferred, count: 1),      // Fruit (preferred, not required!)
        RoleRequirement(role: .sweetener, priority: .required, count: 1),  // Sugar/honey (required)
        RoleRequirement(role: .fat, priority: .preferred, count: 1),       // Cream/butter
        RoleRequirement(role: .aromatic, priority: .optional, count: 1)    // Vanilla/spices
    ]
)
```

### Edge Cases

#### Case 1: Menu Key = No Fruit Pairings
**Example**: "Saffron" doesn't pair with common fruits

**Problem**: Cannot build traditional fruit dessert

**Fallback Strategy** (as discussed):
1. **Taste fallback**: Find high-sweet ingredients (honey, chocolate, caramel)
2. **Bridge to fruit**: Saffron → Vanilla → Mango
3. **Use bridge as main**: Vanilla dessert with honey + cream + cinnamon
4. **Sweetener as main**: Honey-based dessert, chocolate-based dessert
5. **Spice dessert**: Cinnamon + sugar + butter (spice-forward dessert)
6. **Success minimum**: Any high-sweet ingredient + fat + aromatic

#### Case 2: Vegan + Nut-Free + Dairy-Free Eliminates Most Fats
**Example**: Can't use cream, butter, nuts

**Problem**: Very limited fat options for desserts

**Fallback Strategy**:
1. **Coconut-based fats**: Coconut cream, coconut oil
2. **Oil-based**: Vegetable oil, olive oil (less common but valid)
3. **Avocado**: Can work in chocolate desserts
4. **Fruit-based fats**: Banana, avocado
5. **Skip fat requirement**: Fruit + sweetener + spice (sorbet-style)
6. **Success minimum**: Fruit + sweetener only (fruit compote, poached fruit)

#### Case 3: Menu Key = Savory Herb
**Example**: Menu key = "Rosemary" (savory, not typically dessert ingredient)

**Problem**: Herbs don't naturally fit dessert profile

**Fallback Strategy**:
1. **Herb + citrus pairing**: Rosemary → Lemon → Lemon dessert with honey
2. **Herb + stone fruit**: Rosemary → Peach (savory-sweet dessert)
3. **Herb as aromatic**: Rosemary fills aromatic role, not main
4. **Bridge completely away**: Rosemary → X → Fruit (two hops to dessert ingredient)
5. **Savory dessert**: Rosemary + honey + olive oil (herb-forward dessert)
6. **Success minimum**: Skip rosemary in dessert, generate with flexible mode

#### Case 4: Only One Fruit Pairs with Menu Key
**Example**: Menu key only pairs with "Apple"

**Problem**: Limited variety, may create repetitive desserts

**Fallback Strategy**:
1. **Variety through supporting ingredients**: Apple + different sweeteners/spices each time
   - Apple + cinnamon + brown sugar
   - Apple + vanilla + maple syrup
   - Apple + cardamom + honey
2. **Multiple apple types**: Green apple vs. red apple (stretch)
3. **Bridge to other fruits**: Apple → Cinnamon → Pear
4. **Accept repetition**: If only apple works, use apple (better than no dessert)
5. **Sweetener as main**: Use honey/chocolate instead of fruit
6. **Success minimum**: Same fruit, different supporting ingredients each time

#### Case 5: Fruit Doesn't Pair with Sweetener
**Example**: Exotic fruit with limited pairings

**Problem**: Fruit doesn't pair with sugar, honey, etc.

**Fallback Strategy**:
1. **Natural sweetness**: If fruit has high sweet value, skip added sweetener
2. **Try all sweeteners**: Sugar, honey, maple syrup, agave, brown sugar, molasses
3. **Bridge to sweetener**: Fruit → Spice → Sweetener
4. **Use fruit's natural pairing**: If fruit pairs with vanilla, use vanilla extract
5. **Savory-sweet approach**: Fruit + fat + aromatic (no sweetener)
6. **Success minimum**: Fruit + fat only (fruit & cream)

---

## 5. BEVERAGE Edge Cases

### Current Formula
```swift
.beverage: DishFormula(
    keyCategories: [.alcohol],
    supportingCount: 2,
    excludedSupportingCategories: [.proteins, .vegetables]
)
```

### Proposed Enhanced Formula
```swift
.beverage: DishFormula(
    keyCategories: [.alcohol],
    supportingCount: 2,
    excludedSupportingCategories: [.proteins, .vegetables],
    roleRequirements: [
        RoleRequirement(role: .main, priority: .required, count: 1),       // alcohol base
        RoleRequirement(role: .aromatic, priority: .optional, count: 1),   // herbs/spices
        RoleRequirement(role: .acid, priority: .optional, count: 1),       // citrus
        RoleRequirement(role: .sweetener, priority: .optional, count: 1)   // simple syrup
    ]
)
```

### Edge Cases

#### Case 1: Alcohol-Free Dietary Restriction
**Example**: User has alcohol-free restriction

**Problem**: Beverage formula requires alcohol category

**Fallback Strategy**:
1. **Skip beverage generation**: Return nil (no beverage in menu)
2. **Generate mocktail**: Use fruits, herbs, sweeteners instead
   - Formula: Fruit + citrus + sweetener + herb
3. **Fruit juice base**: Use fruit as main ingredient
4. **Tea/coffee base**: Expand categories to include hot beverages (future)
5. **Success minimum**: Return nil, allow menu without beverage

#### Case 2: Menu Key = Doesn't Pair with Any Alcohol
**Example**: "Oyster" (seafood) may not pair with many spirits

**Problem**: Cannot find alcohol that pairs with menu key

**Fallback Strategy**:
1. **Try all alcohol types**: Wine, spirits, liqueurs
2. **Wine focus**: Most foods pair with wine (white wine with seafood)
3. **Bridge to alcohol**: Oyster → Lemon → White Wine
4. **Complementary pairing**: Use alcohol that contrasts rather than pairs
5. **Classic pairings**: Override with known classic pairings (oyster + champagne)
6. **Success minimum**: Skip beverage if no pairing found

#### Case 3: Limited Alcohol Pairings
**Example**: Menu key pairs with only "Red Wine"

**Problem**: No variety in beverage generation

**Fallback Strategy**:
1. **Red wine variations**: Cabernet, Merlot, Pinot Noir
2. **Variety through modifiers**: Red wine + different aromatics
   - Red wine + orange + cinnamon (mulled wine)
   - Red wine + blackberry + rosemary (cocktail)
3. **Bridge to other alcohol**: Red wine → Beef → Bourbon
4. **Accept repetition**: Red wine is a valid pairing, use it
5. **Success minimum**: Same base alcohol, different supporting ingredients

#### Case 4: Beverage Must Pair with ALL Menu Dishes (Strict Mode)
**Example**: Strict mode requires beverage pairs with entree + sides + dessert

**Problem**: Very few alcohols pair with everything (especially desserts)

**Fallback Strategy**:
1. **Dessert wine exception**: Use sweet wine/port for dessert courses
2. **Flexible mode**: Only require beverage to pair with entree
3. **Multiple beverages**: Generate wine pairing + dessert wine (future)
4. **Universal alcohol**: Try champagne (pairs with many foods)
5. **Bridge strategy**: Use most-connected alcohol in the menu
6. **Success minimum**: Skip beverage in strict mode if no universal pairing

---

## 6. SAUCE Edge Cases

### Current Formula
```swift
.sauce: DishFormula(
    keyCategories: [.pantry, .dairy, .seasonings],
    supportingCount: 2
)
```

### Proposed Enhanced Formula
```swift
.sauce: DishFormula(
    keyCategories: [.pantry, .dairy, .seasonings],
    supportingCount: 3,
    roleRequirements: [
        RoleRequirement(role: .fat, priority: .preferred, count: 1),       // oil/butter
        RoleRequirement(role: .aromatic, priority: .preferred, count: 1),  // garlic/herbs
        RoleRequirement(role: .acid, priority: .optional, count: 1),       // vinegar/citrus
        RoleRequirement(role: .liquid, priority: .optional, count: 1)      // stock/wine
    ]
)
```

### Edge Cases

#### Case 1: Menu Key = No Pantry/Dairy/Seasoning Pairings
**Example**: "Watermelon" (fruit) - may not pair with traditional sauce bases

**Problem**: Cannot find appropriate sauce base

**Fallback Strategy**:
1. **Fruit-based sauce**: Use fruit itself as sauce base (watermelon reduction)
2. **Bridge to sauce base**: Watermelon → Mint → Butter → Sauce
3. **Sweetener-based**: Honey or sugar as sauce base (sweet sauce)
4. **Vinegar-based**: Balsamic reduction (if pairs with menu key)
5. **Skip sauce**: Return nil (not all menus need sauce)
6. **Success minimum**: Simple pairing with any pantry item (fruit + vinegar)

#### Case 2: Dairy-Free Eliminates Cream-Based Sauces
**Example**: Dairy-free restriction, no butter/cream

**Problem**: Many classic sauces are dairy-based

**Fallback Strategy**:
1. **Oil-based sauces**: Olive oil, vinaigrettes, aioli (egg-based)
2. **Stock-based**: Chicken/vegetable stock reductions
3. **Nut-based**: Cashew cream, almond cream (if not nut-free)
4. **Coconut-based**: Coconut cream/milk
5. **Vegetable purées**: Tomato sauce, roasted red pepper sauce
6. **Success minimum**: Oil + aromatics (simple sauce)

#### Case 3: Sauce Doesn't Pair with Entree
**Example**: Generated sauce ingredients don't match entree flavors

**Problem**: Sauce feels disconnected from menu

**Enhancement**:
1. **Entree-aware generation**: Pick sauce base that pairs with entree's protein
2. **Shared ingredients**: Use aromatic from entree in sauce
3. **Complementary flavors**: If entree is rich, generate acidic sauce
4. **Classic pairings**: Override with known combinations (beef + red wine sauce)
5. **Success minimum**: Generate valid sauce, even if not perfect pairing

#### Case 4: Minimal Sauce (2 ingredients)
**Example**: "Butter + Garlic"

**Problem**: Very simple, but is it still a sauce?

**Enhancement**:
1. **Allow minimal sauces**: 2-3 ingredients is valid (butter sauce, oil & herb)
2. **Emulsion consideration**: Butter + acid can be a valid sauce (beurre blanc)
3. **Quality over quantity**: Simple sauces are often best
4. **Success minimum**: Fat + aromatic = valid sauce

---

## General Fallback Principles (All Dish Types)

### 1. Fallback Tier System

**Tier 1: Direct Pairing**
- Use ingredients that directly pair with menu key ingredient
- Respect all role requirements
- Maintain compatibility mode (strict/flexible/freeform)

**Tier 2: Bridge Ingredients**
- Find intermediate ingredients that connect menu key to required roles
- Menu Key → Bridge → Required Role Ingredient
- Still respect compatibility mode

**Tier 3: Taste-Based Substitution**
- Use taste profiles to find functional equivalents
- Need acid? Find ingredient with sour > 4
- Need fat? Find ingredient with fat > 6

**Tier 4: Relax Role Requirements**
- Change "required" to "preferred"
- Change "preferred" to "optional"
- Allow fewer ingredients than formula specifies

**Tier 5: Relax Compatibility Mode**
- Strict → Flexible → Freeform
- Only for that specific dish, not entire menu

**Tier 6: Minimal Valid Dish**
- Generate with absolute minimum ingredients
- May not have ideal role distribution
- Better than returning nil

**Tier 7: Return Nil**
- Only when all fallbacks exhausted
- Menu can still be valid without this dish type
- User can manually add dish later

### 2. Bridge Ingredient Strategy Details

**Single-Hop Bridge**:
```
Menu Key → Bridge → Target Ingredient
Example: Saffron → Lemon → Arugula
```

**Two-Hop Bridge**:
```
Menu Key → Bridge 1 → Bridge 2 → Target Ingredient
Example: Saffron → Chicken → Lemon → Arugula
```

**Bridge Selection Criteria**:
1. Prefer ingredients already in menu (reuse for cohesion)
2. Prefer ingredients with many pairings (versatile connectors)
3. Prefer ingredients with high aromatic/flavor prominence
4. Avoid bridges from excluded categories

### 3. Compatibility Mode Relaxation

**When to Relax**:
- Required roles cannot be filled in current mode
- After trying bridge strategies
- Before returning nil

**How to Relax**:
```swift
if compatibilityMode == .strict {
    // Retry in flexible mode
    return generateDish(..., compatibilityMode: .flexible)
}
if compatibilityMode == .flexible {
    // Retry in freeform mode
    return generateDish(..., compatibilityMode: .freeform)
}
```

**Logging**:
```
"[FALLBACK] Relaxed compatibility mode from strict to flexible for dessert generation"
```

### 4. Category Exclusion Relaxation

**When to Relax**:
- Cannot fill required roles with allowed categories
- After trying taste-based substitution

**How to Relax**:
```swift
// Dessert normally excludes proteins/vegetables
// But if no fruit pairs, allow high-sweet vegetables
if candidates.isEmpty && requirement.priority == .required {
    candidatesWithRelaxedExclusions = getCandidates(excludedCategories: [])
}
```

### 5. Ingredient Count Flexibility

**When to Use**:
- Cannot find enough ingredients to meet supportingCount
- Some roles filled but not all

**How to Use**:
```swift
// Formula specifies 3 supporting, but only found 2 valid ingredients
if selection.count >= minimumCount && selection.count < targetCount {
    return selection  // Accept partial success
}
```

**Minimum Counts by Dish Type**:
- Entree: 2 (protein + 1 supporting)
- Side: 2 (main + 1 supporting)
- Salad: 3 (2 greens + 1 supporting)
- Dessert: 2 (main + 1 supporting)
- Beverage: 2 (alcohol + 1 modifier)
- Sauce: 2 (base + 1 aromatic or acid)

---

## Success Metrics

### Generation Success Rate
- **Target**: ≥95% of dish generation attempts succeed
- **Measure**: (successful generations) / (total attempts)
- **By Dish Type**: Track success rate for each type

### Fallback Usage
- **Track**: Which fallback tier was needed for each generation
- **Goal**: Most generations succeed in Tier 1-2 (direct pairing or bridge)
- **Alert**: If >20% of generations need Tier 4+ (role relaxation)

### Role Fulfillment
- **Track**: % of role requirements fulfilled by priority
  - Required roles: Should be 100% filled (or generation fails)
  - Preferred roles: Target >80% filled
  - Optional roles: Target >50% filled

### User Satisfaction Indicators
- **Regeneration rate**: If users regenerate dishes frequently, formulas may be too loose
- **Manual editing**: Track which dishes users manually edit most
- **Dish deletion**: Track which dish types users delete from menus

---

## Testing Checklist

### Per Dish Type
- [ ] Test with menu key that has NO pairings in expected category
- [ ] Test with menu key that has only 1 pairing in expected category
- [ ] Test with strict dietary restrictions (vegan, gluten-free, nut-free, dairy-free)
- [ ] Test with multiple restrictions combined
- [ ] Test in strict compatibility mode
- [ ] Test in flexible compatibility mode
- [ ] Test in freeform compatibility mode
- [ ] Test with obscure/limited-pairing ingredients
- [ ] Verify fallback strategies are triggered
- [ ] Verify logging shows which fallback tier was used

### Integration Tests
- [ ] Generate 100 menus with random key ingredients
- [ ] Generate 50 menus in strict mode
- [ ] Generate 50 menus with each dietary restriction
- [ ] Verify no crashes or infinite loops
- [ ] Verify generation completes in <500ms per dish
- [ ] Verify role distribution matches expectations
- [ ] Verify category diversity across menus

### Edge Case Combinations
- [ ] Strict mode + vegan + nut-free + dairy-free
- [ ] Menu key with <5 total pairings
- [ ] Menu with 6 dishes (all types)
- [ ] Menu key from each category
- [ ] Menu key from "excluded featured subcategories" (herbs, spices, oils, vinegars)
