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
        const data = await ExpenseService.getExpenses();
        setExpenses(data);
        const total = data.reduce((sum, exp) => sum + exp.amount, 0);
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
      <h1 className="text-3xl font-bold text-white mb-4">Dashboard Overview</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Summary</h2>
        <p className="text-2xl text-white">Total Expenses: ${totalExpenses.toFixed(2)}</p>
        <p className="text-gray-300">Number of Expenses: {expenses.length}</p>
      </div>
      {/* Add more overview components like charts here */}
    </div>
  );
};

export default DashboardOverview;