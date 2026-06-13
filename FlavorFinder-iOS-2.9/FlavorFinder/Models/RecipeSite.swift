import Foundation

/// Represents a recipe website for filtering search results
struct RecipeSite: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let domain: String
    let isPaid: Bool

    /// All available recipe sites
    static let allSites: [RecipeSite] = [
        // Free sites
        RecipeSite(id: "seriouseats", name: "Serious Eats", domain: "seriouseats.com", isPaid: false),
        RecipeSite(id: "allrecipes", name: "AllRecipes", domain: "allrecipes.com", isPaid: false),
        RecipeSite(id: "bbcgoodfood", name: "BBC Good Food", domain: "bbcgoodfood.com", isPaid: false),
        RecipeSite(id: "foodnetwork", name: "Food Network", domain: "foodnetwork.com", isPaid: false),
        RecipeSite(id: "simplyrecipes", name: "Simply Recipes", domain: "simplyrecipes.com", isPaid: false),
        RecipeSite(id: "epicurious", name: "Epicurious", domain: "epicurious.com", isPaid: false),
        RecipeSite(id: "thekitchn", name: "The Kitchn", domain: "thekitchn.com", isPaid: false),
        RecipeSite(id: "budgetbytes", name: "Budget Bytes", domain: "budgetbytes.com", isPaid: false),
        RecipeSite(id: "minimalistbaker", name: "Minimalist Baker", domain: "minimalistbaker.com", isPaid: false),
        RecipeSite(id: "loveandlemons", name: "Love and Lemons", domain: "loveandlemons.com", isPaid: false),
        RecipeSite(id: "damndelicious", name: "Damn Delicious", domain: "damndelicious.net", isPaid: false),
        RecipeSite(id: "pinchofyum", name: "Pinch of Yum", domain: "pinchofyum.com", isPaid: false),
        RecipeSite(id: "recipetineats", name: "RecipeTin Eats", domain: "recipetineats.com", isPaid: false),

        // Paid/subscription sites
        RecipeSite(id: "nytcooking", name: "NYT Cooking", domain: "cooking.nytimes.com", isPaid: true),
        RecipeSite(id: "bonappetit", name: "Bon Appétit", domain: "bonappetit.com", isPaid: true),
        RecipeSite(id: "atk", name: "America's Test Kitchen", domain: "americastestkitchen.com", isPaid: true),
        RecipeSite(id: "cooksillustrated", name: "Cook's Illustrated", domain: "cooksillustrated.com", isPaid: true),
    ]

    /// Default enabled sites (all free sites + NYT Cooking and Bon Appétit)
    static let defaultEnabledSiteIds: Set<String> = Set([
        "seriouseats", "allrecipes", "bbcgoodfood", "foodnetwork",
        "simplyrecipes", "epicurious", "thekitchn", "budgetbytes",
        "minimalistbaker", "loveandlemons", "damndelicious", "pinchofyum",
        "recipetineats", "nytcooking", "bonappetit"
    ])

    /// Free sites only
    static var freeSites: [RecipeSite] {
        allSites.filter { !$0.isPaid }
    }

    /// Paid sites only
    static var paidSites: [RecipeSite] {
        allSites.filter { $0.isPaid }
    }
}
