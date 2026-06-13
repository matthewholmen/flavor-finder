import Foundation

/// Dietary restriction types
enum DietaryRestriction: String, CaseIterable, Identifiable, Codable {
    case vegetarian
    case pescatarian
    case vegan
    case glutenFree = "gluten-free"
    case dairyFree = "dairy-free"
    case nutFree = "nut-free"
    case alcoholFree = "alcohol-free"
    case nightshadeFree = "nightshade-free"
    case lowFodmap = "low-fodmap"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .vegetarian: return "Vegetarian"
        case .pescatarian: return "Pescatarian"
        case .vegan: return "Vegan"
        case .glutenFree: return "Gluten-Free"
        case .dairyFree: return "Dairy-Free"
        case .nutFree: return "Nut-Free"
        case .alcoholFree: return "Alcohol-Free"
        case .nightshadeFree: return "Nightshade-Free"
        case .lowFodmap: return "Low-FODMAP"
        }
    }

    var icon: String {
        switch self {
        case .vegetarian: return "leaf.fill"
        case .pescatarian: return "fish.fill"
        case .vegan: return "leaf.circle.fill"
        case .glutenFree: return "xmark.circle.fill"
        case .dairyFree: return "drop.fill"
        case .nutFree: return "exclamationmark.triangle.fill"
        case .alcoholFree: return "wineglass"
        case .nightshadeFree: return "moon.fill"
        case .lowFodmap: return "heart.fill"
        }
    }

    /// Category:Subcategory pairs to exclude for this restriction
    var excludedCategories: [(String, String)] {
        switch self {
        case .vegetarian:
            return [
                ("Proteins", "Meat"),
                ("Proteins", "Pork"),
                ("Proteins", "Poultry"),
                ("Proteins", "Game"),
                ("Proteins", "Offal"),
                ("Proteins", "Fish"),
                ("Proteins", "Crustacean"),
                ("Proteins", "Mollusk")
            ]
        case .pescatarian:
            return [
                ("Proteins", "Meat"),
                ("Proteins", "Pork"),
                ("Proteins", "Poultry"),
                ("Proteins", "Game"),
                ("Proteins", "Offal")
            ]
        case .vegan:
            return [
                ("Proteins", "Meat"),
                ("Proteins", "Pork"),
                ("Proteins", "Poultry"),
                ("Proteins", "Game"),
                ("Proteins", "Offal"),
                ("Proteins", "Fish"),
                ("Proteins", "Crustacean"),
                ("Proteins", "Mollusk"),
                ("Dairy", "Hard Cheese"),
                ("Dairy", "Soft Cheese"),
                ("Dairy", "Cultured Dairy"),
                ("Dairy", "Milk & Cream")
            ]
        case .glutenFree:
            return [
                ("Grains", "Bread"),
                ("Grains", "Pasta")
            ]
        case .dairyFree:
            return [
                ("Dairy", "Hard Cheese"),
                ("Dairy", "Soft Cheese"),
                ("Dairy", "Cultured Dairy"),
                ("Dairy", "Milk & Cream")
            ]
        case .alcoholFree:
            return [
                ("Alcohol", "Wine"),
                ("Alcohol", "Spirits"),
                ("Alcohol", "Liqueurs")
            ]
        case .nutFree, .nightshadeFree, .lowFodmap:
            return [] // These use ingredient lists instead
        }
    }
}

/// Ingredient lists for special dietary restrictions
struct DietaryIngredientLists {
    static let nutIngredients: Set<String> = [
        "almond", "almond liqueur", "almond oil", "amaretto",
        "cashew", "chestnut", "hazelnut", "macadamia nut",
        "peanut", "peanut oil", "pecan", "pecan oil",
        "pine nut", "pistachio", "walnut", "walnut oil", "nuts"
    ]

    static let nightshadeIngredients: Set<String> = [
        "tomato", "tomatoes", "cherry tomato", "sun-dried tomato", "tomato paste",
        "bell pepper", "red bell pepper", "green bell pepper", "yellow bell pepper",
        "pepper", "peppers", "sweet pepper",
        "eggplant", "aubergine",
        "potato", "potatoes",
        "cayenne", "cayenne pepper",
        "paprika", "smoked paprika",
        "chili", "chili pepper", "chili powder", "chipotle", "chipotle pepper",
        "jalapeño", "jalapeno", "serrano", "serrano pepper",
        "habanero", "ancho chili", "poblano", "guajillo",
        "red pepper flakes", "crushed red pepper",
        "pimento", "pimientos", "goji berry", "goji berries",
        "tomatillo", "hot sauce", "tabasco", "sriracha"
    ]

    static let highFodmapIngredients: Set<String> = [
        // Alliums
        "garlic", "onion", "onions", "red onion", "white onion", "yellow onion",
        "shallot", "shallots", "leek", "leeks", "scallion", "scallions",
        "green onion", "green onions", "spring onion", "chives",
        // Legumes
        "beans", "black beans", "kidney bean", "kidney beans", "chickpea", "chickpeas",
        "lentils", "baked beans", "cannellini beans", "fava beans", "lima beans",
        "navy beans", "pinto beans", "red beans", "white beans", "flageolet beans",
        "black-eyed peas", "legume", "legumes",
        // High-fructose fruits
        "apple", "apples", "pear", "pears", "mango", "watermelon",
        "cherry", "cherries", "apricot", "apricots", "peach", "peaches",
        "plum", "plums", "nectarine", "nectarines", "blackberry", "blackberries",
        // Dairy with lactose
        "milk", "cream", "ice cream", "soft cheese", "ricotta", "cottage cheese",
        "cream cheese", "mascarpone", "sour cream", "buttermilk",
        // Wheat products
        "bread", "pasta", "couscous", "wheat", "barley", "rye",
        // Sweeteners
        "honey", "agave", "high fructose corn syrup", "molasses",
        // Vegetables
        "artichoke", "artichokes", "asparagus", "cauliflower", "mushroom", "mushrooms",
        "snow peas", "sugar snap peas"
    ]
}
