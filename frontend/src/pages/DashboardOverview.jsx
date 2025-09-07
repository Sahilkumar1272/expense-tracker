// src/pages/DashboardOverview.jsx
import React, { useState, useEffect } from 'react';
import ExpenseService from '../api/expenseApi';

const DashboardOverview = () => {
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const response = await ExpenseService.getExpenses();
        const expensesData = response.expenses || [];
        setExpenses(expensesData);
        const total = expensesData.reduce((sum, exp) => sum + exp.amount, 0);
        setTotalExpenses(total);
      } catch (err) {
        setError(err.message || 'Failed to load overview');
      } finally {
        setLoading(false);
      }
    };
    fetchExpenses();
  }, []);

  if (loading) return <div className="text-white">Loading overview...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard Overview</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Total Expenses</h2>
          <p className="text-3xl font-bold text-white">
            ₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Number of Expenses</h2>
          <p className="text-3xl font-bold text-white">{expenses.length}</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Average Expense</h2>
          <p className="text-3xl font-bold text-white">
            {expenses.length > 0 
              ? `₹${(totalExpenses / expenses.length).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
              : '₹0.00'
            }
          </p>
        </div>
      </div>
      
      {/* Recent Expenses Preview */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Expenses</h2>
        {expenses.length === 0 ? (
          <p className="text-gray-400">No expenses yet. Add your first expense to get started.</p>
        ) : (
          <div className="space-y-3">
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">{expense.description || 'No description'}</p>
                  <p className="text-gray-400 text-sm">
                    {new Date(expense.date).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-white font-semibold">
                  ₹{expense.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;