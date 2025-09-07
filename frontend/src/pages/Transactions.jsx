import React, { useState, useEffect } from "react";
import ExpenseService from "../api/expenseApi";
import { useAuth } from "../context/AuthContext";

const Transactions = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    type: "expense", // Default to expense
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    category_id: "",
    payment_mode: "cash"
  });
  const [editFormData, setEditFormData] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", type: "expense" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showNotification, setShowNotification] = useState(false);
  const [filters, setFilters] = useState({
    type: [],
    paymentMode: [],
    category: [],
    dateRange: { start: "", end: "" }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const itemsPerPage = 15;
  const { user } = useAuth();

  // Update category icons to include income categories
  const categoryIcons = {
    "food": "🍕",
    "dining": "🍽️",
    "transport": "🚗",
    "shopping": "🛒",
    "entertainment": "🎬",
    "health": "🏥",
    "bills": "💸",
    "utilities": "⚡",
    "education": "🎓",
    "groceries": "🛍️",
    "travel": "✈️",
    "rent": "🏠",
    "mortgage": "🏠",
    "insurance": "🛡️",
    "personal": "💅",
    "gifts": "🎁",
    "donations": "❤️",
    "investments": "📈",
    "salary": "💰",
    "income": "💵",
    "freelance": "💼",
    "business": "📊",
    "taxes": "📝",
    "subscriptions": "📱",
    "miscellaneous": "🔮",
    "interest": "📈",
    "dividends": "💹",
    "bonus": "🎁",
    "default": "💰"
  };

  useEffect(() => {
    fetchCategories();
    fetchExpenses();
  }, [currentPage, filters]);

  // Filter categories by type
  const getCategoriesByType = (type) => {
    return categories.filter(category => category.type === type);
  };

  const fetchCategories = async () => {
    try {
      const response = await ExpenseService.getCategories();
      setCategories(response.categories || []);
    } catch (err) {
      showError("Failed to fetch categories");
    }
  };

const fetchExpenses = async () => {
  try {
    // Prepare filters for API
    const apiFilters = {};
    
    // Add filters only if they have values
    if (filters.type.length > 0) {
      apiFilters.type = filters.type;
    }
    
    if (filters.paymentMode.length > 0) {
      apiFilters.paymentMode = filters.paymentMode;
    }
    
    if (filters.category.length > 0) {
      apiFilters.category = filters.category;
    }
    
    // Add date range filter if provided
    if (filters.dateRange.start && filters.dateRange.end) {
      apiFilters.start_date = filters.dateRange.start;
      apiFilters.end_date = filters.dateRange.end;
    }
    
    const response = await ExpenseService.getExpenses(currentPage, itemsPerPage, apiFilters);
    setExpenses(response.expenses || []);
    setTotalPages(response.pages || 1);
    setTotalExpenses(response.total || 0);
  } catch (err) {
    showError("Failed to fetch expenses");
  }
};
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Reset category when type changes
    if (name === "type") {
      setFormData(prev => ({ ...prev, category_id: "", categorySearch: "" }));
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
    
    // Reset category when type changes
    if (name === "type") {
      setEditFormData(prev => ({ ...prev, category_id: "" }));
    }
  };

  const handleCategoryInputChange = (e) => {
    setCategoryForm({ ...categoryForm, [e.target.name]: e.target.value });
  };

  const handleCategorySearchChange = (e) => {
    setCategorySearch(e.target.value);
    setShowCategoryDropdown(e.target.value.length > 0);
  };

  const selectCategory = (category) => {
    setFormData({ ...formData, category_id: category.id });
    setCategorySearch(category.name);
    setShowCategoryDropdown(false);
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      setSuccess("");
    }, 3000);
  };

  const showError = (message) => {
    setError(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
      setError("");
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Convert amount to number and validate
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        showError("Please enter a valid amount");
        setLoading(false);
        return;
      }

      // Prepare data for API
      const expenseData = {
        type: formData.type,
        amount: amount,
        description: formData.description,
        date: formData.date,
        category_id: formData.category_id || null,
        payment_mode: formData.payment_mode
      };

      await ExpenseService.addExpense(expenseData);
      setFormData({
        type: "expense",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        category_id: "",
        payment_mode: "cash"
      });
      setCategorySearch("");
      showSuccess("Transaction added successfully!");
      fetchExpenses(); // Refresh the expenses list
    } catch (err) {
      showError(err.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ExpenseService.addCategory(categoryForm);
      setCategoryForm({ name: "", type: "expense" });
      showSuccess("Category added successfully!");
      fetchCategories(); // Refresh categories list
    } catch (err) {
      showError(err.message || "Failed to add category");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense) => {
    setEditFormData({ ...expense });
    const category = categories.find(cat => cat.id === expense.category_id);
    if (category) {
      setCategorySearch(category.name);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Convert amount to number and validate
      const amount = parseFloat(editFormData.amount);
      if (isNaN(amount) || amount <= 0) {
        showError("Please enter a valid amount");
        setLoading(false);
        return;
      }

      // Prepare data for API
      const expenseData = {
        type: editFormData.type,
        amount: amount,
        description: editFormData.description,
        date: editFormData.date,
        category_id: editFormData.category_id || null,
        payment_mode: editFormData.payment_mode
      };

      await ExpenseService.updateExpense(editFormData.id, expenseData);
      setEditFormData(null);
      setCategorySearch("");
      showSuccess("Transaction updated successfully!");
      fetchExpenses(); // Refresh the expenses list
    } catch (err) {
      showError(err.message || "Failed to update transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    
    try {
      await ExpenseService.deleteExpense(id);
      showSuccess("Transaction deleted successfully!");
      fetchExpenses(); // Refresh the expenses list
      setSelectedExpenses(selectedExpenses.filter(expId => expId !== id));
    } catch (err) {
      showError(err.message || "Failed to delete transaction");
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedExpenses.length} transactions?`)) return;
    
    try {
      // Delete all selected expenses
      await Promise.all(selectedExpenses.map(id => ExpenseService.deleteExpense(id)));
      showSuccess(`${selectedExpenses.length} transactions deleted successfully!`);
      fetchExpenses(); // Refresh the expenses list
      setSelectedExpenses([]);
    } catch (err) {
      showError(err.message || "Failed to delete transactions");
    }
  };

  const toggleExpenseSelection = (id) => {
    if (selectedExpenses.includes(id)) {
      setSelectedExpenses(selectedExpenses.filter(expId => expId !== id));
    } else {
      setSelectedExpenses([...selectedExpenses, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedExpenses.length === expenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(expenses.map(exp => exp.id));
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => {
      if (filterType === 'type') {
        const updatedTypes = prev.type.includes(value)
          ? prev.type.filter(type => type !== value)
          : [...prev.type, value];
        
        return { ...prev, type: updatedTypes };
      } else if (filterType === 'paymentMode') {
        const updatedModes = prev.paymentMode.includes(value)
          ? prev.paymentMode.filter(mode => mode !== value)
          : [...prev.paymentMode, value];
        
        return { ...prev, paymentMode: updatedModes };
      } else if (filterType === 'category') {
        const updatedCategories = prev.category.includes(value)
          ? prev.category.filter(cat => cat !== value)
          : [...prev.category, value];
        
        return { ...prev, category: updatedCategories };
      } else if (filterType === 'dateRange') {
        return { ...prev, dateRange: { ...prev.dateRange, ...value } };
      }
      return prev;
    });
    
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  // Add function to remove specific filters
  const removeFilter = (filterType, value = null) => {
    if (filterType === 'type') {
      setFilters(prev => ({
        ...prev,
        type: prev.type.filter(type => type !== value)
      }));
    } else if (filterType === 'paymentMode') {
      setFilters(prev => ({
        ...prev,
        paymentMode: prev.paymentMode.filter(mode => mode !== value)
      }));
    } else if (filterType === 'category') {
      setFilters(prev => ({
        ...prev,
        category: prev.category.filter(cat => cat !== value)
      }));
    } else if (filterType === 'dateRange') {
      setFilters(prev => ({
        ...prev,
        dateRange: { start: "", end: "" }
      }));
    }
    
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  const handleQuickDateFilter = (range) => {
    const today = new Date();
    let startDate, endDate;
    
    switch(range) {
      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last_month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last_3_months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last_6_months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 6, 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last_year':
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        break;
      default:
        return;
    }
    
    // Format dates to YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    handleFilterChange('dateRange', {
      start: formatDate(startDate),
      end: formatDate(endDate)
    });
  };

  const clearFilters = () => {
    setFilters({
      type: [],
      paymentMode: [],
      category: [],
      dateRange: { start: "", end: "" }
    });
    setCurrentPage(1);
  };

  // Filter categories based on search and type
  const filteredCategories = categories.filter(category =>
    category.type === formData.type &&
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Get category icon
  const getCategoryIcon = (categoryName) => {
    if (!categoryName) return categoryIcons.default;
    
    const lowerName = categoryName.toLowerCase();
    for (const [key, icon] of Object.entries(categoryIcons)) {
      if (lowerName.includes(key)) return icon;
    }
    return categoryIcons.default;
  };

  // Calculate pagination numbers
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always include first page
      pageNumbers.push(1);
      
      // Calculate start and end of visible page range
      let startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3);
      
      // Adjust if we're near the beginning
      if (currentPage <= Math.floor(maxVisiblePages / 2) + 1) {
        endPage = maxVisiblePages - 1;
      }
      
      // Adjust if we're near the end
      if (currentPage >= totalPages - Math.floor(maxVisiblePages / 2)) {
        startPage = totalPages - maxVisiblePages + 2;
      }
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }
      
      // Add page numbers in range
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Always include last page
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };

  // Get unique categories for filter (no duplicates)
  const uniqueCategories = [...new Map(categories.map(category => [category.id, category])).values()];

  return (
    <div className="max-w-7xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-white mb-6">Transactions</h1>
      
      {/* Notification Popup */}
      {showNotification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          error ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'
        }`}>
          <div className="flex items-center">
            <span className="mr-2 text-xl">
              {error ? '❌' : '✅'}
            </span>
            <span>{error || success}</span>
            <button 
              onClick={() => setShowNotification(false)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Add Category Form */}
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">🏷️</span> Add Category
        </h2>
        <form onSubmit={handleCategorySubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 mb-2">Category Name</label>
              <input
                type="text"
                name="name"
                value={categoryForm.name}
                onChange={handleCategoryInputChange}
                className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Food, Salary"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Category Type</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="type"
                    value="expense"
                    checked={categoryForm.type === "expense"}
                    onChange={handleCategoryInputChange}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="ml-2 text-white">Expense</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="type"
                    value="income"
                    checked={categoryForm.type === "income"}
                    onChange={handleCategoryInputChange}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="ml-2 text-white">Income</span>
                </label>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Category"}
          </button>
        </form>
      </div>

      {/* Add Transaction Form */}
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">💸</span> Add Transaction
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Transaction Type Radio Buttons */}
            <div className="md:col-span-2">
              <label className="block text-gray-300 mb-2">Transaction Type</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="type"
                    value="expense"
                    checked={formData.type === "expense"}
                    onChange={handleInputChange}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="ml-2 text-white">Expense</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="type"
                    value="income"
                    checked={formData.type === "income"}
                    onChange={handleInputChange}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="ml-2 text-white">Income</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Amount (₹)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
            
            <div className="relative">
              <label className="block text-gray-300 mb-2">Category</label>
              <input
                type="text"
                value={categorySearch}
                onChange={handleCategorySearchChange}
                className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Search or select category"
              />
              {showCategoryDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      onClick={() => selectCategory(category)}
                      className="p-3 hover:bg-purple-700/50 cursor-pointer flex items-center"
                    >
                      <span className="mr-2">{getCategoryIcon(category.name)}</span>
                      <span className="text-white">{category.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
     <div>
  <label className="block text-gray-300 mb-2">Payment Mode</label>
  <select
    name="payment_mode"
    value={formData.payment_mode}
    onChange={handleInputChange}
    className="w-full bg-slate-800 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
    required
  >
    <option value="">Select Payment Mode</option>
    <option value="cash" className="bg-slate-800 text-white">Cash</option>
    <option value="debit_card" className="bg-slate-800 text-white">Debit Card</option>
    <option value="credit_card" className="bg-slate-800 text-white">Credit Card</option>
    <option value="upi" className="bg-slate-800 text-white">UPI</option>
    <option value="net_banking" className="bg-slate-800 text-white">Net Banking</option>
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
            
            <div className="md:col-span-2">
              <label className="block text-gray-300 mb-2">Description (Optional)</label>
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
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Transaction"}
          </button>
        </form>
      </div>

      {/* Filters Section */}
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <span className="mr-2">🔍</span> Filters
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <>
            {/* Quick Date Filters */}
            <div className="mb-6">
              <label className="block text-gray-300 mb-2">Quick Date Filters</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleQuickDateFilter('this_month')}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-all"
                >
                  This Month
                </button>
                <button
                  onClick={() => handleQuickDateFilter('last_month')}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-all"
                >
                  Last Month
                </button>
                <button
                  onClick={() => handleQuickDateFilter('last_3_months')}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-all"
                >
                  Last 3 Months
                </button>
                <button
                  onClick={() => handleQuickDateFilter('last_6_months')}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-all"
                >
                  Last 6 Months
                </button>
                <button
                  onClick={() => handleQuickDateFilter('last_year')}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-all"
                >
                  Last Year
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              {/* Transaction Type Filter */}
              <div>
                <label className="block text-gray-300 mb-2">Transaction Type</label>
                <div className="space-y-2">
                  {['expense', 'income'].map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.type.includes(type)}
                        onChange={() => handleFilterChange('type', type)}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="ml-2 text-white capitalize">
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Mode Filter */}
              <div>
                <label className="block text-gray-300 mb-2">Payment Mode</label>
                <div className="space-y-2">
                  {['cash', 'debit_card', 'credit_card', 'upi', 'net_banking'].map(mode => (
                    <label key={mode} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.paymentMode.includes(mode)}
                        onChange={() => handleFilterChange('paymentMode', mode)}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="ml-2 text-white capitalize">
                        {mode.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category Filter - Fixed duplicates */}
      <div>
        <label className="block text-gray-300 mb-2">Category</label>
        <div className="max-h-40 overflow-y-auto space-y-2">
          {uniqueCategories.map(category => (
            <label key={category.id} className="flex items-center">
              <input
                type="checkbox"
                checked={filters.category.includes(category.id)}
                onChange={() => handleFilterChange('category', category.id)}
                className="w-4 h-4 accent-purple-500"
              />
              <span className="ml-2 text-white flex items-center">
                <span className="mr-1">{getCategoryIcon(category.name)}</span>
                {category.name}
              </span>
            </label>
          ))}
        </div>
      </div>


              {/* Date Range Filter */}
              <div>
                <label className="block text-gray-300 mb-2">Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => handleFilterChange('dateRange', { start: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
                    placeholder="Start Date"
                  />
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => handleFilterChange('dateRange', { end: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg p-2 text-white"
                    placeholder="End Date"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="md:col-span-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </>
        )}

        {/* Active Filters Display */}
        {(filters.type.length > 0 || filters.paymentMode.length > 0 || filters.category.length > 0 || filters.dateRange.start || filters.dateRange.end) && (
          <div className="mt-4">
            <h3 className="text-gray-300 mb-2">Active Filters:</h3>
            <div className="flex flex-wrap gap-2">
              {filters.type.map(type => (
                <button
                  key={type}
                  onClick={() => removeFilter('type', type)}
                  className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm flex items-center hover:bg-purple-700 transition-all"
                >
                  {type} <span className="ml-1">✕</span>
                </button>
              ))}
              {filters.paymentMode.map(mode => (
                <button
                  key={mode}
                  onClick={() => removeFilter('paymentMode', mode)}
                  className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center hover:bg-blue-700 transition-all"
                >
                  {mode.replace('_', ' ')} <span className="ml-1">✕</span>
                </button>
              ))}
              {filters.category.map(catId => {
                const category = categories.find(c => c.id === catId);
                return category ? (
                  <button
                    key={catId}
                    onClick={() => removeFilter('category', catId)}
                    className="bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center hover:bg-green-700 transition-all"
                  >
                    {category.name} <span className="ml-1">✕</span>
                  </button>
                ) : null;
              })}
              {filters.dateRange.start && filters.dateRange.end && (
                <button
                  onClick={() => removeFilter('dateRange')}
                  className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm flex items-center hover:bg-yellow-700 transition-all"
                >
                  {filters.dateRange.start} to {filters.dateRange.end} <span className="ml-1">✕</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Expense Modal */}
      {editFormData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Transaction</h2>
            <form onSubmit={handleUpdate}>
              <div className="space-y-4 mb-4">
                {/* Transaction Type */}
                <div>
                  <label className="block text-gray-300 mb-2">Transaction Type</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        value="expense"
                        checked={editFormData.type === "expense"}
                        onChange={handleEditInputChange}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="ml-2 text-white">Expense</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="type"
                        value="income"
                        checked={editFormData.type === "income"}
                        onChange={handleEditInputChange}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="ml-2 text-white">Income</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    name="amount"
                    value={editFormData.amount}
                    onChange={handleEditInputChange}
                    className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Category</label>
                  <select
                    name="category_id"
                    value={editFormData.category_id || ""}
                    onChange={handleEditInputChange}
                    className="w-full bg-slate-800 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Category</option>
                    {getCategoriesByType(editFormData.type || "expense").map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Payment Mode</label>
                  <select
                    name="payment_mode"
                    value={editFormData.payment_mode}
                    onChange={handleEditInputChange}
                    className="w-full bg-slate-800 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="upi">UPI</option>
                    <option value="net_banking">Net Banking</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={editFormData.date.split('T')[0]}
                    onChange={handleEditInputChange}
                    className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Description (Optional)</label>
                  <input
                    type="text"
                    name="description"
                    value={editFormData.description || ""}
                    onChange={handleEditInputChange}
                    className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Optional description"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 flex-1"
                >
                  {loading ? "Updating..." : "Update"}
                </button>
                
                <button
                  type="button"
                  onClick={() => setEditFormData(null)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center">
              <span className="mr-2">📋</span> Recent Transactions
            </h2>
            <p className="text-gray-400">
              Showing {expenses.length} of {totalExpenses} transactions (Page {currentPage} of {totalPages})
            </p>
          </div>
          
          {selectedExpenses.length > 0 && (
            <div className="flex space-x-3">
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-all flex items-center"
              >
                <span className="mr-2">🗑️</span> Delete Selected ({selectedExpenses.length})
              </button>
            </div>
          )}
        </div>
        
        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-white mb-2">
              No transactions found
            </h3>
            <p className="text-gray-400">Try adjusting your filters or add new transactions.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedExpenses.length === expenses.length && expenses.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-purple-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Payment Mode</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => {
                    const category = categories.find(cat => cat.id === expense.category_id);
                    const isIncome = expense.type === "income";
                    return (
                      <tr key={expense.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedExpenses.includes(expense.id)}
                            onChange={() => toggleExpenseSelection(expense.id)}
                            className="w-4 h-4 accent-purple-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isIncome ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {expense.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <span className="text-xl mr-2">
                              {getCategoryIcon(category?.name)}
                            </span>
                            <span>{category?.name || "Uncategorized"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {new Date(expense.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {expense.payment_mode?.replace('_', ' ') || 'cash'}
                        </td>
                        <td className="px-4 py-3">
                          {expense.description || "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          <span className={isIncome ? 'text-green-400' : 'text-red-400'}>
                            {isIncome ? '+' : '-'}₹{expense.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleEdit(expense)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  {getPageNumbers().map((number, index) => (
                    number === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-3 py-1 text-white">
                        ...
                      </span>
                    ) : (
                      <button
                        key={number}
                        onClick={() => setCurrentPage(number)}
                        className={`px-3 py-1 rounded-lg ${
                          currentPage === number 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-white/10 border border-white/20 text-white'
                        }`}
                      >
                        {number}
                      </button>
                    )
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-white disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Transactions;