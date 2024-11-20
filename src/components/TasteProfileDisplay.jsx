import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { Alert } from './Alert.tsx';

const TasteProfileDisplay = ({ selectedIngredients, ingredientProfiles }) => {
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

  const pieData = Object.entries(averageScores)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: value,
      color: COLORS[name]
    }))
    .filter(item => item.value > 0); // Only show tastes that have values

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

    const highestTaste = Object.entries(averageScores)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const lowestTaste = Object.entries(averageScores)
      .reduce((a, b) => a[1] < b[1] ? a : b)[0];

    if (averageScores[highestTaste] > 6) {
      return `This combination is high in ${highestTaste} flavors. Consider adding ingredients with ${lowestTaste} notes for better balance.`;
    }
    if (Object.values(averageScores).every(score => score < 3)) {
      return "This combination has subtle flavors. Consider adding ingredients with stronger taste profiles.";
    }
    if (Math.max(...Object.values(averageScores)) - Math.min(...Object.values(averageScores)) < 2) {
      return "This combination has well-balanced flavors!";
    }
    return `Consider adding ${lowestTaste} flavors to balance this combination.`;
  };

  // Custom legend renderer to show values alongside names
  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <ul className="list-none p-0 flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry, index) => (
          <li 
            key={`legend-${index}`}
            className="flex items-center gap-2"
          >
            <span 
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              {entry.value}: {pieData[index].value.toFixed(1)}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="mt-6 p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">Taste Profile Analysis</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">{getMessage()}</p>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
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
                name
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
                    className="text-xs"
                  >
                    {name}
                  </text>
                );
              }}
            >
              {pieData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => value.toFixed(1)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TasteProfileDisplay;