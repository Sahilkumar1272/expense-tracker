import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import ExpenseService from '../api/expenseApi';
import { useLoading } from '../context/LoadingContext';
import UnifiedChartComponent from '../components/UnifiedChartComponent';
import DateRangePicker from '../components/DateRangePicker';

const AnalyticsDashboard = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const { showLoading, hideLoading } = useLoading();
  
  // Set default to last year
  const getLastYearRange = () => {
    const today = new Date();
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    return {
      start: lastYear,
      end: today
    };
  };

  // Date range state
  const [dateRange, setDateRange] = useState(getLastYearRange());
  // Add state to control calendar visibility
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Chart data states
  const [categoryExpenseData, setCategoryExpenseData] = useState([]);
  const [categoryIncomeData, setCategoryIncomeData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  
  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalExpenses: 0,
    totalIncome: 0,
    netAmount: 0,
    transactionCount: 0
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    showLoading("Loading Analysis...");
    try {
      // Fetch expenses with date filter
      const filters = {
        start_date: format(dateRange.start, 'yyyy-MM-dd'),
        end_date: format(dateRange.end, 'yyyy-MM-dd')
      };
      
      const [expensesResponse, categoriesResponse] = await Promise.all([
        ExpenseService.getExpenses(1, 1000, filters), // Get all expenses in range
        ExpenseService.getCategories()
      ]);

      const expensesData = expensesResponse.expenses || [];
      const categoriesData = categoriesResponse.categories || [];

      setExpenses(expensesData);
      setCategories(categoriesData);
      
      // Process data for charts
      processChartData(expensesData, categoriesData);
      processSummaryStats(expensesData);
      
    } catch (err) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      hideLoading();
    }
  };

  const processChartData = (expensesData, categoriesData) => {
    // Process category data
    const categoryExpenseMap = new Map();
    const categoryIncomeMap = new Map();

    expensesData.forEach(expense => {
      const category = categoriesData.find(cat => cat.id === expense.category_id);
      const categoryName = category ? category.name : 'Uncategorized';
      
      if (expense.type === 'expense') {
        categoryExpenseMap.set(categoryName, (categoryExpenseMap.get(categoryName) || 0) + expense.amount);
      } else {
        categoryIncomeMap.set(categoryName, (categoryIncomeMap.get(categoryName) || 0) + expense.amount);
      }
    });

    // Convert to chart data format
    const expenseData = Array.from(categoryExpenseMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const incomeData = Array.from(categoryIncomeMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    setCategoryExpenseData(expenseData);
    setCategoryIncomeData(incomeData);

    // Process monthly data
    const monthlyMap = new Map();
    
    // Get all unique months from the data
    const monthsInData = new Set();
    expensesData.forEach(expense => {
      const monthKey = format(new Date(expense.date), 'MMM yyyy');
      monthsInData.add(monthKey);
    });

    // Initialize months with 0 values
    monthsInData.forEach(monthKey => {
      monthlyMap.set(monthKey, { month: monthKey, expense: 0, income: 0 });
    });

    // Aggregate data by month
    expensesData.forEach(expense => {
      const monthKey = format(new Date(expense.date), 'MMM yyyy');
      if (monthlyMap.has(monthKey)) {
        const monthData = monthlyMap.get(monthKey);
        if (expense.type === 'expense') {
          monthData.expense += expense.amount;
        } else {
          monthData.income += expense.amount;
        }
      }
    });

    // Sort by date and convert to array
    const monthlyChartData = Array.from(monthlyMap.values())
      .sort((a, b) => {
        const dateA = new Date(a.month + ' 01');
        const dateB = new Date(b.month + ' 01');
        return dateA - dateB;
      });
    
    setMonthlyData(monthlyChartData);
  };

  const processSummaryStats = (expensesData) => {
    const totalExpenses = expensesData
      .filter(exp => exp.type === 'expense')
      .reduce((sum, exp) => sum + exp.amount, 0);
    
    const totalIncome = expensesData
      .filter(exp => exp.type === 'income')
      .reduce((sum, exp) => sum + exp.amount, 0);

    setSummaryStats({
      totalExpenses,
      totalIncome,
      netAmount: totalIncome - totalExpenses,
      transactionCount: expensesData.length
    });
  };

  const handleDateRangeChange = (start, end) => {
    setDateRange({ start, end });
  };

  const handleApplyDateFilter = (start, end) => {
    setDateRange({ start, end });
    setShowDatePicker(false); // Hide the calendar after applying filter
    // The useEffect will automatically trigger fetchData when dateRange changes
  };

  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Summary Stats - Moved to top, reduced size */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-sm rounded-xl p-4 border border-red-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-200 text-sm font-medium mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-white flex items-baseline">
                <span className="text-lg mr-1">₹</span>
                <span>{summaryStats.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </p>
            </div>
            <div className="w-10 h-10 bg-red-500/30 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💸</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm font-medium mb-1">Total Income</p>
              <p className="text-2xl font-bold text-white flex items-baseline">
                <span className="text-lg mr-1">₹</span>
                <span>{summaryStats.totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </p>
            </div>
            <div className="w-10 h-10 bg-green-500/30 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${summaryStats.netAmount >= 0 ? 'from-green-500/20 to-green-600/20 border-green-500/30' : 'from-red-500/20 to-red-600/20 border-red-500/30'} backdrop-blur-sm rounded-xl p-4 border`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`${summaryStats.netAmount >= 0 ? 'text-green-200' : 'text-red-200'} text-sm font-medium mb-1`}>
                Net Amount
              </p>
              <p className="text-2xl font-bold text-white flex items-baseline">
                <span className="text-lg mr-1">{summaryStats.netAmount >= 0 ? '+' : ''}₹</span>
                <span>{summaryStats.netAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </p>
            </div>
            <div className={`w-10 h-10 ${summaryStats.netAmount >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'} rounded-lg flex items-center justify-center`}>
              <span className="text-2xl">{summaryStats.netAmount >= 0 ? '📈' : '📉'}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">Transactions</p>
              <p className="text-2xl font-bold text-white">{summaryStats.transactionCount}</p>
            </div>
            <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Filter - Below summary stats */}
      <div className="bg-slate-800 rounded-xl p-4 border border-white/20 mb-6 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <span className="mr-2">📅</span> Date Range Filter
          </h2>
          <button
            onClick={toggleDatePicker}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <span>📅</span>
            <span>Select Date Range</span>
          </button>
        </div>
        
        {/* Current date range display */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="text-gray-300">
            <span className="font-medium">Current Range: </span>
            <span className="text-blue-400">
              {format(dateRange.start, 'MMM dd, yyyy')} - {format(dateRange.end, 'MMM dd, yyyy')}
            </span>
          </div>
        </div>

        {/* Conditional date picker */}
        {showDatePicker && (
          <div className="max-w-md">
            <DateRangePicker
              startDate={dateRange.start}
              endDate={dateRange.end}
              onDateChange={handleDateRangeChange}
              onApply={handleApplyDateFilter}
            />
          </div>
        )}
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
        <p className="text-gray-300">Comprehensive insights into your financial data</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Monthly Trends Chart */}
        <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <span className="mr-2">📈</span> Monthly Trends
            </h3>
            <div className="flex space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-gray-300">Expenses</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-300">Income</span>
              </div>
            </div>
          </div>
          <UnifiedChartComponent 
            chartType="monthly" 
            data={monthlyData}
            height={400}
            showLegend={true}
          />
        </div>

        {/* Combined Categories Chart */}
        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <span className="mr-2">📊</span> Top Categories (Expenses & Income)
            </h3>
            <div className="flex space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <span className="text-gray-300">Expenses</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-300">Income</span>
              </div>
            </div>
          </div>
          <UnifiedChartComponent 
            chartType="combinedBar" 
            expenseData={categoryExpenseData}
            incomeData={categoryIncomeData}
            height={400}
            showLegend={true}
          />
        </div>
      </div>

      {/* Pie Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* Expense Categories Pie Chart */}
        <div className="bg-gradient-to-br from-red-900/30 to-pink-900/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <span className="mr-2">🥧</span> Expense Categories Distribution
            </h3>
          </div>
          <UnifiedChartComponent 
            chartType="pie" 
            data={categoryExpenseData}
            type="expense"
            showLegend={false}
          />
        </div>

        {/* Income Categories Pie Chart */}
        {categoryIncomeData.length > 0 && (
          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <span className="mr-2">🥧</span> Income Categories Distribution
              </h3>
            </div>
            <UnifiedChartComponent 
              chartType="pie" 
              data={categoryIncomeData}
              type="income"
              showLegend={false}
            />
          </div>
        )}
      </div>

      {/* Category Bar Charts Section - Additional charts for detailed view */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* Expense Categories Bar Chart */}
        <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center">
              <span className="mr-2">📊</span> Expense Categories (Bar)
            </h3>
          </div>
          <UnifiedChartComponent 
            chartType="categoryBar" 
            data={categoryExpenseData}
            type="expense"
            height={400}
            showLegend={true}
          />
        </div>

        {/* Income Categories Bar Chart */}
        {categoryIncomeData.length > 0 && (
          <div className="bg-gradient-to-br from-green-900/30 to-teal-900/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <span className="mr-2">📊</span> Income Categories (Bar)
              </h3>
            </div>
            <UnifiedChartComponent 
              chartType="categoryBar" 
              data={categoryIncomeData}
              type="income"
              height={400}
              showLegend={true}
            />
          </div>
        )}
      </div>

      {/* Recent Transactions Preview */}
      <div className="bg-gradient-to-br from-slate-900/30 to-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <span className="mr-2">📋</span> Recent Transactions
        </h3>
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <h4 className="text-lg font-medium text-white mb-2">No transactions found</h4>
            <p className="text-gray-400">Try adjusting your date range or add some transactions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.slice(0, 5).map((expense) => {
              const category = categories.find(cat => cat.id === expense.category_id);
              const isIncome = expense.type === 'income';
              
              return (
                <div key={expense.id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isIncome ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <span className="text-lg">
                        {isIncome ? '💰' : '💸'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{expense.description || 'No description'}</p>
                      <p className="text-gray-400 text-sm">
                        {category?.name || 'Uncategorized'} • {format(new Date(expense.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                      {isIncome ? '+' : '-'}₹{expense.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-gray-400 text-xs capitalize">
                      {expense.payment_mode?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;