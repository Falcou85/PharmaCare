import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../contexts/PreferencesContext';
import { useToast } from '../contexts/ToastContext';
import { Plus, CreditCard as Edit2, Trash2, Search, X, AlertTriangle, Package, Calendar, TrendingDown, ArrowUpDown, Filter, Minus, PackageCheck } from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  generic_name: string;
  form: string;
  strength: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  medication_id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  location: string;
  supplier_id: string;
  created_at: string;
  medications?: Medication;
  suppliers?: Supplier;
}

type FilterType = 'all' | 'low_stock' | 'expiring' | 'expired';
type SortField = 'name' | 'quantity' | 'expiry_date';

const LOW_STOCK_THRESHOLD = 20;
const EXPIRY_WARNING_DAYS = 90;

export function Inventory() {
  const { t, formatDate } = usePreferences();
  const toast = useToast();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventoryRes, medicationsRes, suppliersRes] = await Promise.all([
        supabase.from('inventory').select(`*, medications (id, name, generic_name, form, strength), suppliers (id, name)`).order('created_at', { ascending: false }),
        supabase.from('medications').select('id, name, generic_name, form, strength').order('name'),
        supabase.from('suppliers').select('id, name').order('name'),
      ]);

      if (inventoryRes.error) throw inventoryRes.error;
      if (medicationsRes.error) throw medicationsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;

      setInventory(inventoryRes.data || []);
      setMedications(medicationsRes.data || []);
      setSuppliers(suppliersRes.data || []);
    } catch (error: any) {
      toast.error(t('toast.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        medication_id: formData.medication_id,
        batch_number: formData.batch_number,
        quantity: formData.quantity || 0,
        expiry_date: formData.expiry_date,
        location: formData.location,
        supplier_id: formData.supplier_id || null,
      };

      if (editingId) {
        const { error } = await supabase.from('inventory').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success(t('toast.success'));
      } else {
        const { error } = await supabase.from('inventory').insert([payload]);
        if (error) throw error;
        toast.success(t('toast.success'));
      }

      await loadData();
      resetForm();
    } catch (error: any) {
      toast.error(t('toast.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData({
      medication_id: item.medication_id,
      batch_number: item.batch_number,
      quantity: item.quantity,
      expiry_date: item.expiry_date,
      location: item.location,
      supplier_id: item.supplier_id,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw error;
      await loadData();
      toast.success(t('toast.success'));
      setConfirmDelete(null);
    } catch (error: any) {
      toast.error(t('toast.error'), error.message);
    }
  };

  const handleAdjustStock = (item: InventoryItem) => {
    setAdjustingItem(item);
    setAdjustmentAmount(0);
    setAdjustmentReason('');
    setShowAdjustModal(true);
  };

  const submitAdjustment = async () => {
    if (!adjustingItem || adjustmentAmount === 0) return;

    const newQuantity = adjustingItem.quantity + adjustmentAmount;
    if (newQuantity < 0) {
      toast.warning(t('inventory.cannotReduceBelowZero'));
      return;
    }

    try {
      const { error } = await supabase.from('inventory').update({ quantity: newQuantity }).eq('id', adjustingItem.id);
      if (error) throw error;

      await loadData();
      setShowAdjustModal(false);
      setAdjustingItem(null);
      toast.success(t('toast.success'));
    } catch (error: any) {
      toast.error(t('toast.error'), error.message);
    }
  };

  const resetForm = () => {
    setFormData({});
    setEditingId(null);
    setShowForm(false);
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (expiryDate: string) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) return 'expired';
    if (days <= EXPIRY_WARNING_DAYS) return 'expiring';
    return 'ok';
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return 'out';
    if (quantity <= LOW_STOCK_THRESHOLD) return 'low';
    return 'ok';
  };

  const filteredInventory = inventory
    .filter((item) => {
      const medName = item.medications?.name?.toLowerCase() || '';
      const genericName = item.medications?.generic_name?.toLowerCase() || '';
      const batch = item.batch_number?.toLowerCase() || '';
      const searchLower = search.toLowerCase();

      const matchesSearch = medName.includes(searchLower) || genericName.includes(searchLower) || batch.includes(searchLower);
      if (!matchesSearch) return false;

      switch (filter) {
        case 'low_stock':
          return item.quantity <= LOW_STOCK_THRESHOLD;
        case 'expiring':
          return getExpiryStatus(item.expiry_date) === 'expiring';
        case 'expired':
          return getExpiryStatus(item.expiry_date) === 'expired';
        default:
          return true;
      }
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = (a.medications?.name || '').localeCompare(b.medications?.name || '');
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'expiry_date':
          comparison = new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

  const stats = {
    total: inventory.length,
    lowStock: inventory.filter((i) => i.quantity <= LOW_STOCK_THRESHOLD).length,
    expiring: inventory.filter((i) => getExpiryStatus(i.expiry_date) === 'expiring').length,
    expired: inventory.filter((i) => getExpiryStatus(i.expiry_date) === 'expired').length,
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const statusLabel = (status: 'out' | 'low' | 'ok') =>
    status === 'out' ? t('inventory.outOfStock') : status === 'low' ? t('inventory.low') : '';

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{t('inventory.title')}</h1>
          <p className="text-gray-600 dark:text-slate-400">{t('inventory.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:from-blue-700 hover:to-cyan-700 transition shadow-md"
        >
          <Plus className="w-5 h-5" />
          {t('inventory.addBatch')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-950/50 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">{t('inventory.totalBatches')}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">{stats.total}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setFilter(filter === 'low_stock' ? 'all' : 'low_stock')}
          className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border p-4 text-left transition ${
            filter === 'low_stock'
              ? 'border-orange-500 ring-2 ring-orange-200 dark:ring-orange-800'
              : 'border-gray-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 dark:bg-orange-950/50 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">{t('inventory.lowStock')}</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.lowStock}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilter(filter === 'expiring' ? 'all' : 'expiring')}
          className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border p-4 text-left transition ${
            filter === 'expiring'
              ? 'border-yellow-500 ring-2 ring-yellow-200 dark:ring-yellow-800'
              : 'border-gray-200 dark:border-slate-800 hover:border-yellow-300 dark:hover:border-yellow-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-950/50 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">{t('inventory.expiringSoon')}</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.expiring}</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilter(filter === 'expired' ? 'all' : 'expired')}
          className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border p-4 text-left transition ${
            filter === 'expired'
              ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-800'
              : 'border-gray-200 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-950/50 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">{t('inventory.expired')}</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.expired}</p>
            </div>
          </div>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('inventory.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
          </div>

          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition"
            >
              <Filter className="w-4 h-4" />
              {t('inventory.clearFilter')}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400 cursor-pointer hover:text-gray-800 dark:hover:text-slate-200" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-2">
                    {t('inventory.medication')}
                    {sortField === 'name' && <ArrowUpDown className="w-4 h-4" />}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('inventory.batchNumber')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400 cursor-pointer hover:text-gray-800 dark:hover:text-slate-200" onClick={() => toggleSort('quantity')}>
                  <div className="flex items-center gap-2">
                    {t('common.quantity')}
                    {sortField === 'quantity' && <ArrowUpDown className="w-4 h-4" />}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400 cursor-pointer hover:text-gray-800 dark:hover:text-slate-200" onClick={() => toggleSort('expiry_date')}>
                  <div className="flex items-center gap-2">
                    {t('inventory.expiryDate')}
                    {sortField === 'expiry_date' && <ArrowUpDown className="w-4 h-4" />}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('inventory.location')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('inventory.supplier')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => {
                const expiryStatus = getExpiryStatus(item.expiry_date);
                const stockStatus = getStockStatus(item.quantity);
                const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);

                return (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800 dark:text-slate-100">{item.medications?.name}</p>
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        {item.medications?.generic_name} - {item.medications?.form} {item.medications?.strength}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-2 py-1 rounded">
                        {item.batch_number}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            stockStatus === 'out'
                              ? 'text-red-600 dark:text-red-400'
                              : stockStatus === 'low'
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-gray-800 dark:text-slate-100'
                          }`}
                        >
                          {item.quantity}
                        </span>
                        {stockStatus !== 'ok' && (
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              stockStatus === 'out'
                                ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                                : 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                            }`}
                          >
                            {statusLabel(stockStatus)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`${
                            expiryStatus === 'expired'
                              ? 'text-red-600 dark:text-red-400'
                              : expiryStatus === 'expiring'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-gray-800 dark:text-slate-100'
                          }`}
                        >
                          {formatDate(item.expiry_date)}
                        </span>
                        {expiryStatus !== 'ok' && (
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              expiryStatus === 'expired'
                                ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                                : 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300'
                            }`}
                          >
                            {expiryStatus === 'expired' ? t('inventory.expired') : t('inventory.daysLeft', { days: daysUntilExpiry })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">{item.location || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">{item.suppliers?.name || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleAdjustStock(item)}
                        className="p-2 hover:bg-green-50 dark:hover:bg-green-950/30 text-green-600 dark:text-green-400 rounded-lg inline-flex mr-1 transition"
                        title={t('inventory.adjustStock')}
                      >
                        <PackageCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg inline-flex mr-1 transition"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(item.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg inline-flex transition"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredInventory.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              {loading ? t('common.loading') : t('inventory.noItems')}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                {editingId ? t('inventory.editBatch') : t('inventory.addNewBatch')}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-700 dark:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('inventory.medication')} *
                </label>
                <select
                  value={formData.medication_id || ''}
                  onChange={(e) => setFormData({ ...formData, medication_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t('inventory.selectMedication')}</option>
                  {medications.map((med) => (
                    <option key={med.id} value={med.id}>
                      {med.name} - {med.form} {med.strength}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    {t('inventory.batchNumber')} *
                  </label>
                  <input
                    type="text"
                    value={formData.batch_number || ''}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    {t('common.quantity')} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity ?? ''}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    {t('inventory.expiryDate')} *
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date || ''}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    {t('inventory.location')}
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder={t('inventory.locationPlaceholder')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('inventory.supplier')}
                </label>
                <select
                  value={formData.supplier_id || ''}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('inventory.selectSupplier')}</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50 shadow-md"
                >
                  {loading ? t('common.saving') : editingId ? t('inventory.update') : t('inventory.addBatch')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdjustModal && adjustingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{t('inventory.adjustStock')}</h2>
              <button onClick={() => setShowAdjustModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-700 dark:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <p className="font-medium text-gray-800 dark:text-slate-100">{adjustingItem.medications?.name}</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {t('inventory.batchNumber')}: {adjustingItem.batch_number}
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {t('inventory.currentStock')}: <span className="font-medium">{adjustingItem.quantity}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('inventory.adjustmentAmount')}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentAmount(adjustmentAmount - 1)}
                    className="px-4 py-2 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg text-center focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustmentAmount(adjustmentAmount + 1)}
                    className="px-4 py-2 bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                  {t('inventory.newStock')}:{' '}
                  <span
                    className={`font-medium ${
                      adjustingItem.quantity + adjustmentAmount < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-slate-100'
                    }`}
                  >
                    {adjustingItem.quantity + adjustmentAmount}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t('inventory.reason')}
                </label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder={t('inventory.reasonPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={submitAdjustment}
                  disabled={adjustmentAmount === 0 || adjustingItem.quantity + adjustmentAmount < 0}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {t('inventory.applyAdjustment')}
                </button>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 dark:bg-red-950/40 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">{t('common.delete')}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">{t('inventory.confirmDelete')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition"
              >
                {t('common.delete')}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
