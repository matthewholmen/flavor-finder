import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Alert } from './Alert.tsx';

const TasteProfileDisplay = ({ selectedIngredients, ingredientProfiles }) => {
  const FLAVOR_THRESHOLD = 2; // Only show flavors with values above this
  const MAX_FLAVORS = 4; // Maximum number of flavors to display

  const profiles = selectedIngredients
    .map(ingredient => ingredientProfiles.find(p => p.name.toLowerCase() === ingredient.toLowerCase()))
    .filter(Boolean);

  const emptyScores = {
    sweet: 0,
    salty: 0,
    sour: 0,
    bitter: 0,
    umami: 0,
    fat: 0,
    spicy: 0
  };

  const averageScores = profiles.length > 0 
    ? Object.keys(emptyScores).reduce((acc, taste) => {
        acc[taste] = profiles.reduce((sum, profile) => sum + profile.flavorProfile[taste], 0) / profiles.length;
        return acc;
      }, {...emptyScores})
    : emptyScores;

  const COLORS = {
    sweet: '#f97316',  // orange
    salty: '#3b82f6',  // blue
    sour: '#22c55e',   // green
    bitter: '#a855f7',  // purple
    umami: '#ef4444',  // red
    fat: '#facc15',    // yellow
    spicy: '#ec4899'   // pink
  };

  // Filter and sort flavors by strength, keeping only top flavors above threshold
  const pieData = Object.entries(averageScores)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: value,
      color: COLORS[name.toLowerCase()]
    }))
    .filter(item => item.value >= FLAVOR_THRESHOLD)
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_FLAVORS);

  // Normalize the values for better visualization
  const totalValue = pieData.reduce((sum, item) => sum + item.value, 0);
  const normalizedPieData = pieData.map(item => ({
    ...item,
    value: (item.value / totalValue) * 100
  }));

  const getMessage = () => {
    if (selectedIngredients.length === 0) {
      return "Select ingredients to see their taste profile";
    }
    if (profiles.length === 0) {
      return "Selected ingredients don't have taste profiles yet";
    }
    if (profiles.length < selectedIngredients.length) {
      return "Some ingredients are missing taste profiles";
    }

    // Find the highest and lowest scoring tastes (from all scores, not just filtered)
    const highestTaste = Object.entries(averageScores)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const lowestTaste = Object.entries(averageScores)
      .filter(([taste]) => ['sweet', 'salty', 'sour', 'umami', 'spicy'].includes(taste)) // Only consider main tastes
      .reduce((a, b) => a[1] < b[1] ? a : b)[0];

    if (pieData.length === 0) {
      return "This combination has very subtle flavors. Consider adding ingredients with stronger taste profiles.";
    }

    // Check for high intensity in any flavor
    if (averageScores[highestTaste] > 6) {
      return `This combination is high in ${highestTaste} flavors. Consider adding ${lowestTaste} notes for better balance.`;
    }

    // Check for overall weak flavors
    if (Object.values(averageScores).every(score => score < 3)) {
      return "This combination has subtle flavors. Consider adding ingredients with stronger taste profiles.";
    }

    // Check flavor balance
    const maxValue = Math.max(...Object.values(averageScores));
    const minValue = Math.min(...Object.values(averageScores));
    const isBalanced = maxValue - minValue < 2;

    if (isBalanced) {
      return "This combination has well-balanced flavors!";
    }

    // If we have strong flavors but they're not balanced
    const strongFlavors = pieData.map(item => item.name.toLowerCase()).join(' and ');
    return `Consider adding ${lowestTaste} flavors to balance this combination.`;
  };

  return (
    <div className="mt-6 p-4 bg-white">      
      {pieData.length > 0 && (
        <div className="h-72 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={normalizedPieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                startAngle={90}
                endAngle={450}
                label={({
                  cx,
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  name,
                  value
                }) => {
                  const radius = outerRadius + 15;
                  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                  return (
                    <text
                      x={x}
                      y={y}
                      fill="#666"
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      className="text-sm font-medium"
                    >
                      {`${name} (${averageScores[name.toLowerCase()].toFixed(1)})`}
                    </text>
                  );
                }}
              >
                {normalizedPieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name) => [
                  `${averageScores[name.toLowerCase()].toFixed(1)}`,
                  name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div>
        <p className="text-sm text-gray-600">{getMessage()}</p>
      </div>
    </div>
  );
};

export default TasteProfileDisplay;