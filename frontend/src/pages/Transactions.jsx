// src/pages/Transactions.jsx
import React, { useState, useEffect } from "react";
import ApiService from "../api/authApi";

const Transactions = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    category_id: "",
  });
  const [categoryForm, setCategoryForm] = useState({ name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCategories();
    fetchExpenses();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await ApiService.getCategories();
      setCategories(response.categories || []);
    } catch (err) {
      setError("Failed to fetch categories");
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await ApiService.getExpenses();
      setExpenses(response.expenses || []);
    } catch (err) {
      setError("Failed to fetch expenses");
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCategoryInputChange = (e) => {
    setCategoryForm({ name: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await ApiService.addExpense(formData);
      setFormData({
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        category_id: "",
      });
      fetchExpenses();
    } catch (err) {
      setError(err.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await ApiService.addCategory(categoryForm);
      setCategoryForm({ name: "" });
      fetchCategories();
    } catch (err) {
      setError(err.message || "Failed to add category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-4">Transactions</h1>
      {error && <p className="text-red-400 mb-4">{error}</p>}

      {/* Add Category Form */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Add Category</h2>
        <form onSubmit={handleCategorySubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Category Name</label>
            <input
              type="text"
              name="name"
              value={categoryForm.name}
              onChange={handleCategoryInputChange}
              className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Food, Travel"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Category"}
          </button>
        </form>
      </div>

      {/* Add Expense Form */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Add Expense</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 mb-2">Amount</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Category</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Description</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Optional description"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Expense"}
          </button>
        </form>
      </div>

      {/* Expense List */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">
          Recent Expenses
        </h2>
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">
              No expenses yet
            </h3>
            <p className="text-gray-400">Add an expense to see it here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex justify-between items-center p-4 bg-white/5 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">
                    {expense.description || "No description"}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {new Date(expense.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">
                    ${expense.amount.toFixed(2)}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {categories.find((cat) => cat.id === expense.category_id)
                      ?.name || "Unknown"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
