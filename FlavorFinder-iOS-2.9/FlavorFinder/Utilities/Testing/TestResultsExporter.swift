import Foundation

/// Export test results to various formats
class TestResultsExporter {

    // MARK: - JSON Export

    /// Export results as JSON
    static func exportJSON(_ results: TestRunResults) -> String? {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

        guard let data = try? encoder.encode(results),
              let json = String(data: data, encoding: .utf8) else {
            return nil
        }

        return json
    }

    // MARK: - CSV Export

    /// Export results as CSV (summary view)
    static func exportSummaryCSV(_ results: TestRunResults) -> String {
        var csv = "Featured Ingredient,Category,Subcategory,Dish Type,Mode,Success Rate %,Avg Ingredients,Avg Role Score %,Category Valid %,Avg Time (ms)\n"

        for testCaseResult in results.testCaseResults {
            let tc = testCaseResult.testCase
            let row = [
                tc.featuredIngredient,
                tc.ingredientCategory,
                tc.ingredientSubcategory,
                tc.dishType.rawValue,
                tc.compatibilityMode.rawValue,
                String(format: "%.1f", testCaseResult.successRate),
                String(format: "%.1f", testCaseResult.avgIngredientCount),
                String(format: "%.1f", testCaseResult.avgRoleScore),
                String(format: "%.1f", testCaseResult.categoryValidationRate),
                String(format: "%.1f", testCaseResult.avgGenerationTimeMs)
            ].joined(separator: ",")
            csv += row + "\n"
        }

        return csv
    }

    /// Export detailed dish-level results as CSV
    static func exportDetailedCSV(_ results: TestRunResults) -> String {
        var csv = "Featured Ingredient,Dish Type,Mode,Sample #,Success,Ingredients,Ingredient Count,Generation Time (ms)\n"

        for testCaseResult in results.testCaseResults {
            let tc = testCaseResult.testCase

            for result in testCaseResult.results {
                let ingredients = result.dish?.allIngredients.joined(separator: "; ") ?? "N/A"
                let row = [
                    tc.featuredIngredient,
                    tc.dishType.rawValue,
                    tc.compatibilityMode.rawValue,
                    "\(result.sampleNumber)",
                    result.success ? "YES" : "NO",
                    "\"\(ingredients)\"",  // Quote to handle commas in ingredient lists
                    "\(result.ingredientCount)",
                    String(format: "%.1f", result.generationTimeMs)
                ].joined(separator: ",")
                csv += row + "\n"
            }
        }

        return csv
    }

    // MARK: - Markdown Report

    /// Generate markdown report with analysis
    static func exportMarkdownReport(_ results: TestRunResults) -> String {
        var md = "# Menu Generator Test Results\n\n"

        // Overview
        md += "## Overview\n\n"
        md += "- **Test Run Date**: \(formatDate(results.timestamp))\n"
        md += "- **Total Test Cases**: \(results.totalTestCases)\n"
        md += "- **Total Dishes Generated**: \(results.totalSamples)\n"
        md += "- **Overall Success Rate**: \(String(format: "%.1f", results.overallSuccessRate))%\n"
        md += "- **Average Role Score**: \(String(format: "%.1f", results.avgRoleScore))%\n"
        md += "- **Average Category Validation**: \(String(format: "%.1f", results.avgCategoryValidation))%\n\n"

        // Results by Dish Type
        md += "## Results by Dish Type\n\n"
        md += "| Dish Type | Test Cases | Success Rate | Avg Role Score | Category Valid |\n"
        md += "|-----------|-----------|--------------|----------------|----------------|\n"

        for (dishType, cases) in results.resultsByDishType().sorted(by: { $0.key.rawValue < $1.key.rawValue }) {
            let avgSuccess = cases.map { $0.successRate }.reduce(0, +) / Double(cases.count)
            let avgRole = cases.map { $0.avgRoleScore }.reduce(0, +) / Double(cases.count)
            let avgCategory = cases.map { $0.categoryValidationRate }.reduce(0, +) / Double(cases.count)

            md += "| \(dishType.displayName) | \(cases.count) | \(String(format: "%.1f", avgSuccess))% | \(String(format: "%.1f", avgRole))% | \(String(format: "%.1f", avgCategory))% |\n"
        }
        md += "\n"

        // Results by Category
        md += "## Results by Featured Ingredient Category\n\n"
        md += "| Category | Test Cases | Success Rate | Avg Role Score | Category Valid |\n"
        md += "|----------|-----------|--------------|----------------|----------------|\n"

        for (category, cases) in results.resultsByCategory().sorted(by: { $0.key < $1.key }) {
            let avgSuccess = cases.map { $0.successRate }.reduce(0, +) / Double(cases.count)
            let avgRole = cases.map { $0.avgRoleScore }.reduce(0, +) / Double(cases.count)
            let avgCategory = cases.map { $0.categoryValidationRate }.reduce(0, +) / Double(cases.count)

            md += "| \(category) | \(cases.count) | \(String(format: "%.1f", avgSuccess))% | \(String(format: "%.1f", avgRole))% | \(String(format: "%.1f", avgCategory))% |\n"
        }
        md += "\n"

        // Results by Compatibility Mode
        md += "## Results by Compatibility Mode\n\n"
        md += "| Mode | Test Cases | Success Rate | Avg Role Score | Category Valid |\n"
        md += "|------|-----------|--------------|----------------|----------------|\n"

        for (mode, cases) in results.resultsByMode().sorted(by: { $0.key.rawValue < $1.key.rawValue }) {
            let avgSuccess = cases.map { $0.successRate }.reduce(0, +) / Double(cases.count)
            let avgRole = cases.map { $0.avgRoleScore }.reduce(0, +) / Double(cases.count)
            let avgCategory = cases.map { $0.categoryValidationRate }.reduce(0, +) / Double(cases.count)

            md += "| \(mode.rawValue.capitalized) | \(cases.count) | \(String(format: "%.1f", avgSuccess))% | \(String(format: "%.1f", avgRole))% | \(String(format: "%.1f", avgCategory))% |\n"
        }
        md += "\n"

        // Problem Cases
        md += "## Problem Cases (Success Rate < 70%)\n\n"
        let problemCases = results.testCaseResults.filter { $0.successRate < 70 }
            .sorted { $0.successRate < $1.successRate }

        if problemCases.isEmpty {
            md += "*No problem cases found!*\n\n"
        } else {
            md += "| Featured Ingredient | Dish Type | Mode | Success Rate | Role Score |\n"
            md += "|-------------------|-----------|------|--------------|------------|\n"

            for testCase in problemCases.prefix(20) {
                md += "| \(testCase.testCase.featuredIngredient) | \(testCase.testCase.dishType.rawValue) | \(testCase.testCase.compatibilityMode.rawValue) | \(String(format: "%.1f", testCase.successRate))% | \(String(format: "%.1f", testCase.avgRoleScore))% |\n"
            }
            md += "\n"
        }

        // Category Validation Failures
        md += "## Category Validation Failures\n\n"
        let categoryFailures = results.testCaseResults.filter { $0.categoryValidationRate < 100 }

        if categoryFailures.isEmpty {
            md += "*No category validation failures!*\n\n"
        } else {
            md += "Found \(categoryFailures.count) test cases with category validation issues:\n\n"

            for testCase in categoryFailures.prefix(10) {
                md += "### \(testCase.testCase.description)\n\n"

                for validation in testCase.categoryValidation where validation.hasInvalidCategories {
                    for (ingredient, reason) in validation.invalidIngredients {
                        md += "- **\(ingredient)**: \(reason)\n"
                    }
                }
                md += "\n"
            }
        }

        // Sample Dishes
        md += "## Sample Successful Dishes\n\n"
        let successfulCases = results.testCaseResults.filter { $0.successRate == 100 }

        if !successfulCases.isEmpty {
            let samples = successfulCases.prefix(5)
            for testCase in samples {
                if let dish = testCase.results.first?.dish {
                    md += "### \(testCase.testCase.featuredIngredient.capitalized) \(testCase.testCase.dishType.displayName)\n"
                    md += "**Ingredients**: \(dish.allIngredients.joined(separator: ", "))\n\n"
                }
            }
        }

        return md
    }

    // MARK: - Helper

    private static func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    // MARK: - File Saving

    /// Save results to file
    static func saveToFile(_ content: String, filename: String, documentsSubfolder: String = "TestResults") -> URL? {
        guard let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            return nil
        }

        let folderURL = documentsURL.appendingPathComponent(documentsSubfolder)

        // Create folder if needed
        try? FileManager.default.createDirectory(at: folderURL, withIntermediateDirectories: true)

        let fileURL = folderURL.appendingPathComponent(filename)

        do {
            try content.write(to: fileURL, atomically: true, encoding: .utf8)
            return fileURL
        } catch {
            print("Failed to save file: \(error)")
            return nil
        }
    }
}
