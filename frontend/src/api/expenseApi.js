// src/api/expenseApi.js (new file for dashboard-related calls)
import { request } from './apiUtils';

class ExpenseService {
  async addExpense(data) {
    return request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getExpenses() {
    return request('/expenses');
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