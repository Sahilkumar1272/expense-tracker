import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

const UnifiedChartComponent = ({ 
  chartType, 
  data, 
  expenseData, 
  incomeData, 
  type = 'expense',
  height = 400,
  showLegend = true 
}) => {
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Color mappings
  const CATEGORY_COLORS = {
    'Food': '#FF6347',
    'Groceries': '#228B22',
    'Transportation': '#4682B4',
    'Utilities': '#FFD700',
    'Housing': '#CD7F32',
    'Healthcare': '#98FB98',
    'Insurance': '#000080',
    'Debt Repayment': '#800020',
    'Savings': '#50C878',
    'Entertainment': '#FF00FF',
    'Personal Care': '#E6E6FA',
    'Education': '#4169E1',
    'Gifts & Donations': '#FF69B4',
    'Subscriptions': '#008B8B',
    'Miscellaneous': '#708090'
  };

  const FALLBACK_EXPENSE_COLORS = [
    '#EF4444', '#F97316', '#EAB308', '#84CC16', '#10B981',
    '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
    '#EC4899', '#F43F5E'
  ];

  const FALLBACK_INCOME_COLORS = [
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F472B6', '#10B981', '#06B6D4', '#14B8A6',
    '#84CC16', '#A3E635'
  ];

  // Common tooltip component
  const CustomTooltip = ({ active, payload, label, chartType }) => {
    if (active && payload && payload.length) {
      if (chartType === 'pie') {
        const data = payload[0].payload;
        const percentage = ((data.amount / data.total) * 100).toFixed(1);
        
        return (
          <div className="bg-slate-800 border border-white/20 rounded-lg p-3 shadow-lg">
            <p className="text-white font-medium">{data.category}</p>
            <p className={`${type === 'expense' ? 'text-red-400' : 'text-green-400'} font-semibold`}>
              ₹{data.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-gray-300 text-sm">{percentage}% of total</p>
          </div>
        );
      } else if (chartType === 'combined') {
        return (
          <div className="bg-slate-900/95 backdrop-blur-sm border border-white/30 rounded-lg p-3 shadow-xl">
            <p className="text-white font-medium">{label}</p>
            {payload.map((entry, index) => (
              <p key={index} className={`${entry.dataKey === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                {`${entry.dataKey === 'expense' ? 'Expenses' : 'Income'}: ₹${entry.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
              </p>
            ))}
          </div>
        );
      } else {
        return (
          <div className="bg-slate-900/95 backdrop-blur-sm border border-white/30 rounded-lg p-3 shadow-xl">
            <p className="text-white font-medium">{label}</p>
            <p className={`${type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
              Amount: ₹{payload[0].value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
        );
      }
    }
    return null;
  };

  // Custom axis tick component for bar charts
  const CustomAxisTick = ({ x, y, payload }) => {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={12}
          className="font-medium"
        >
          {payload.value.length > 8 ? payload.value.substring(0, 8) + '...' : payload.value}
        </text>
      </g>
    );
  };

  // Render single category bar chart
  const renderCategoryBarChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-xl border border-white/10">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-400">No data available for {type} categories</p>
          </div>
        </div>
      );
    }

    const colorsArray = type === 'expense' ? FALLBACK_EXPENSE_COLORS : FALLBACK_INCOME_COLORS;

    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="category" 
            tick={<CustomAxisTick />}
            axisLine={{ stroke: '#6b7280' }}
            tickLine={{ stroke: '#6b7280' }}
          />
          <YAxis 
            axisLine={{ stroke: '#6b7280' }}
            tickLine={{ stroke: '#6b7280' }}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={(props) => <CustomTooltip {...props} chartType="bar" />} />
          {/* Removed Legend for multi-colored bars to avoid confusion */}
          <Bar 
            dataKey="amount" 
            radius={[4, 4, 0, 0]}
            name={type === 'expense' ? 'Expenses' : 'Income'}
          >
            {data.map((entry, index) => {
              const fillColor = CATEGORY_COLORS[entry.category] || colorsArray[index % colorsArray.length];
              return <Cell key={`cell-${index}`} fill={fillColor} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Render combined category bar chart
  const renderCombinedBarChart = () => {
    const combinedData = React.useMemo(() => {
      const categoryMap = new Map();
      
      expenseData?.forEach(item => {
        if (!categoryMap.has(item.category)) {
          categoryMap.set(item.category, { category: item.category, expense: 0, income: 0 });
        }
        categoryMap.get(item.category).expense = item.amount;
      });
      
      incomeData?.forEach(item => {
        if (!categoryMap.has(item.category)) {
          categoryMap.set(item.category, { category: item.category, expense: 0, income: 0 });
        }
        categoryMap.get(item.category).income = item.amount;
      });
      
      return Array.from(categoryMap.values())
        .map(item => ({ ...item, total: item.expense + item.income }))
        .sort((a, b) => b.total - a.total);
    }, [expenseData, incomeData]);

    if (!combinedData || combinedData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-xl border border-white/10">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-400">No category data available</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={combinedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <defs>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="category" 
            tick={<CustomAxisTick />}
            axisLine={{ stroke: '#6b7280' }}
            tickLine={{ stroke: '#6b7280' }}
          />
          <YAxis 
            axisLine={{ stroke: '#6b7280' }}
            tickLine={{ stroke: '#6b7280' }}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={(props) => <CustomTooltip {...props} chartType="combined" />} />
          {showLegend && (
            <Legend 
              wrapperStyle={{ color: '#e2e8f0', fontSize: '14px' }}
              iconType="rect"
            />
          )}
          <Bar 
            dataKey="expense" 
            fill="url(#expenseGradient)"
            radius={[4, 4, 0, 0]}
            name="Expenses"
          />
          <Bar 
            dataKey="income" 
            fill="url(#incomeGradient)"
            radius={[4, 4, 0, 0]}
            name="Income"
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Render pie chart with hover functionality
  const renderPieChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">🥧</div>
            <p>No {type} data available</p>
          </div>
        </div>
      );
    }

    const total = data.reduce((sum, item) => sum + item.amount, 0);
    const processedData = data.map(item => ({ ...item, total }));
    const colors = type === 'expense' ? FALLBACK_EXPENSE_COLORS : FALLBACK_INCOME_COLORS;

    return (
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={processedData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={40}
                  paddingAngle={2}
                  dataKey="amount"
                  onMouseEnter={(data, index) => setHoveredCategory(data.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  {processedData.map((entry, index) => {
                    const color = CATEGORY_COLORS[entry.category] || colors[index % colors.length];
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={color}
                        stroke={hoveredCategory === entry.category ? '#ffffff' : 'transparent'}
                        strokeWidth={hoveredCategory === entry.category ? 3 : 0}
                        style={{
                          filter: hoveredCategory === null || hoveredCategory === entry.category 
                            ? 'brightness(1)' 
                            : 'brightness(0.6)',
                          transition: 'all 0.2s ease-in-out',
                          transform: hoveredCategory === entry.category ? 'scale(1.05)' : 'scale(1)',
                          transformOrigin: 'center'
                        }}
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={(props) => <CustomTooltip {...props} chartType="pie" />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category List */}
          <div className="flex flex-col">
            <h4 className="text-white font-semibold mb-4 flex items-center">
              <span className="mr-2">📋</span>
              Category Breakdown
            </h4>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {processedData.map((item, index) => {
                const percentage = ((item.amount / total) * 100).toFixed(1);
                const isHovered = hoveredCategory === item.category;
                const color = CATEGORY_COLORS[item.category] || colors[index % colors.length];
                
                return (
                  <div
                    key={item.category}
                    className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                      isHovered
                        ? 'bg-white/20 border-white/30 scale-[1.02] shadow-lg'
                        : hoveredCategory === null
                        ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                        : 'bg-white/5 border-white/10 opacity-60'
                    }`}
                    onMouseEnter={() => setHoveredCategory(item.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-4 h-4 rounded-full transition-all duration-200 ${
                            isHovered ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                        <span className={`font-medium transition-colors duration-200 ${
                          isHovered ? 'text-white' : 'text-gray-300'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${
                          type === 'expense' ? 'text-red-400' : 'text-green-400'
                        } ${isHovered ? 'text-lg' : ''} transition-all duration-200`}>
                          ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                        <div className={`text-sm transition-colors duration-200 ${
                          isHovered ? 'text-white' : 'text-gray-400'
                        }`}>
                          {percentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-white/5 to-white/10 rounded-lg border border-white/10">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">
              Total {type === 'expense' ? 'Expenses' : 'Income'}:
            </span>
            <span className={`font-bold text-xl ${type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
              ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="mt-2 flex justify-between items-center text-sm">
            <span className="text-gray-400">Categories: {data.length}</span>
            {hoveredCategory && (
              <span className="text-blue-400 animate-pulse">
                Hovering: {hoveredCategory}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render monthly chart
  const renderMonthlyChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-xl border border-white/10">
          <div className="text-center">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-gray-400">No monthly data available</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <defs>
            <linearGradient id="expenseMonthlyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="incomeMonthlyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="month" 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#6b7280' }}
            tickLine={{ stroke: '#6b7280' }}
          />
          <YAxis 
            axisLine={{ stroke: '#6b7280' }}
            tickLine={{ stroke: '#6b7280' }}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={(props) => <CustomTooltip {...props} chartType="monthly" />} />
          {showLegend && (
            <Legend 
              wrapperStyle={{ color: '#e2e8f0', fontSize: '14px' }}
              iconType="rect"
            />
          )}
          <Bar 
            dataKey="expense" 
            fill="url(#expenseMonthlyGradient)"
            radius={[4, 4, 0, 0]}
            name="Expenses"
          />
          <Bar 
            dataKey="income" 
            fill="url(#incomeMonthlyGradient)"
            radius={[4, 4, 0, 0]}
            name="Income"
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // Main render logic
  const renderChart = () => {
    switch (chartType) {
      case 'categoryBar':
        return renderCategoryBarChart();
      case 'combinedBar':
        return renderCombinedBarChart();
      case 'pie':
        return renderPieChart();
      case 'monthly':
        return renderMonthlyChart();
      default:
        return (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <p>Invalid chart type: {chartType}</p>
          </div>
        );
    }
  };

  return (
    <div className="w-full" style={{ height: chartType === 'pie' ? 'auto' : height }}>
      {chartType !== 'pie' && (
        <style jsx="true">{`
          .recharts-bar-rectangle:hover {
            fill-opacity: 0.8 !important;
          }
          .recharts-bar-rectangle {
            transition: fill-opacity 0.2s ease-in-out;
          }
        `}</style>
      )}
      {renderChart()}
    </div>
  );
};

export default UnifiedChartComponent;