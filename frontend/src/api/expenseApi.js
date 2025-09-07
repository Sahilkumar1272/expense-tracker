// src/api/expenseApi.js (new file for dashboard-related calls)
import { request } from './apiUtils';

class ExpenseService {
  async addExpense(data) {
    return request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

 async getExpenses(page = 1, perPage = 15, filters = {}) {
  // Build query string from filters
  const queryParams = new URLSearchParams({
    page: page,
    per_page: perPage
  });
  
  // Handle array filters properly
  if (filters.type && filters.type.length > 0) {
    filters.type.forEach(type => queryParams.append('type', type));
  }
  
  if (filters.paymentMode && filters.paymentMode.length > 0) {
    filters.paymentMode.forEach(mode => queryParams.append('payment_mode', mode));
  }
  
  if (filters.category && filters.category.length > 0) {
    filters.category.forEach(catId => queryParams.append('category_id', catId));
  }
  
  // Handle single value filters
  if (filters.start_date) {
    queryParams.append('start_date', filters.start_date);
  }
  
  if (filters.end_date) {
    queryParams.append('end_date', filters.end_date);
  }
  
  return request(`/expenses?${queryParams}`);
}

  async updateExpense(id, data) {
    return request(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id) {
    return request(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategories() {
    return request('/expenses/categories');
  }

  async addCategory(data) {
    return request('/expenses/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export default new ExpenseService();