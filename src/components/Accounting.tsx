import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  Download,
  X
} from 'lucide-react';

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  salesCount: number;
}

interface Transaction {
  id: string;
  transaction_number: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

export function Accounting() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    salesCount: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseData, setExpenseData] = useState({
    category: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadFinancialData();
  }, [dateRange]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const { data: salesData } = await supabase
        .from('sales')
        .select('net_amount')
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59');

      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: false })
        .limit(50);

      const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.net_amount), 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

      setSummary({
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        salesCount: salesData?.length || 0,
      });

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert([{
          ...expenseData,
          created_by: profile?.id,
        }]);

      if (expenseError) throw expenseError;

      const transactionNumber = `TXN-${Date.now()}`;
      await supabase.from('transactions').insert([{
        transaction_number: transactionNumber,
        type: 'expense',
        category: expenseData.category,
        amount: expenseData.amount,
        description: expenseData.description,
        reference_type: 'expense',
        date: expenseData.date,
        created_by: profile?.id,
      }]);

      await loadFinancialData();
      setShowExpenseForm(false);
      setExpenseData({
        category: '',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Date', 'Type', 'Category', 'Amount', 'Description'],
      ...transactions.map(t => [
        t.date,
        t.type,
        t.category,
        t.amount.toString(),
        t.description || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">Accounting</h1>
          <p className="text-gray-600 dark:text-slate-400">Financial reports and transactions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExpenseForm(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
          <button
            onClick={exportToCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Calendar className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          <span className="font-medium text-gray-700 dark:text-slate-300">Date Range:</span>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-600 dark:text-slate-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">${summary.totalRevenue.toFixed(2)}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">{summary.salesCount} sales</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-500 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">${summary.totalExpenses.toFixed(2)}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`${summary.netProfit >= 0 ? 'bg-blue-500' : 'bg-orange-500'} p-3 rounded-lg`}>
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Net Profit</p>
          <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${summary.netProfit.toFixed(2)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-cyan-500 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Profit Margin</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">
            {summary.totalRevenue > 0
              ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1)
              : '0'}%
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">Recent Transactions</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">Transaction #</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">Description</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">
                    {new Date(txn.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-800 dark:text-slate-100">
                    {txn.transaction_number}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      txn.type === 'income'
                        ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                    }`}>
                      {txn.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">{txn.category}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">{txn.description}</td>
                  <td className={`py-3 px-4 text-sm font-medium text-right ${
                    txn.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {txn.type === 'income' ? '+' : '-'}${Number(txn.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {transactions.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              No transactions found for the selected period
            </div>
          )}
        </div>
      </div>

      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Add Expense</h2>
              <button onClick={() => setShowExpenseForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Category *
                </label>
                <select
                  value={expenseData.category}
                  onChange={(e) => setExpenseData({ ...expenseData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select category...</option>
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities</option>
                  <option value="salaries">Salaries</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="supplies">Supplies</option>
                  <option value="marketing">Marketing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseData.amount}
                  onChange={(e) => setExpenseData({ ...expenseData, amount: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={expenseData.date}
                  onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={expenseData.description}
                  onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Expense'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowExpenseForm(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
