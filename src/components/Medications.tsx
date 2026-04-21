import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../contexts/PreferencesContext';
import { useToast } from '../contexts/ToastContext';
import { Plus, CreditCard as Edit2, Trash2, Search, X, DollarSign } from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  form: string;
  strength: string;
  requires_prescription: boolean;
  barcode: string;
  indications: string;
  contraindications: string;
  side_effects: string;
  dosage: string;
  storage_conditions: string;
}

interface Pricing {
  purchase_price: number;
  selling_price: number;
  margin_percentage: number;
}

export function Medications() {
  const { t } = usePreferences();
  const toast = useToast();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Medication>>({});
  const [pricing, setPricing] = useState<Pricing>({
    purchase_price: 0,
    selling_price: 0,
    margin_percentage: 0,
  });

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .order('name');

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('medications')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { data: newMed, error } = await supabase
          .from('medications')
          .insert([formData])
          .select()
          .single();

        if (error) throw error;

        if (newMed && (pricing.purchase_price > 0 || pricing.selling_price > 0)) {
          const { data: { user } } = await supabase.auth.getUser();

          await supabase.from('pricing').insert([{
            medication_id: newMed.id,
            purchase_price: pricing.purchase_price,
            selling_price: pricing.selling_price,
            margin_percentage: pricing.margin_percentage,
            is_active: true,
            created_by: user?.id,
          }]);
        }
      }

      await loadMedications();
      resetForm();
    } catch (error: any) {
      toast.error(t('toast.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (medication: Medication) => {
    setFormData(medication);
    setEditingId(medication.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('medications.confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadMedications();
    } catch (error: any) {
      toast.error(t('toast.error'), error.message);
    }
  };

  const resetForm = () => {
    setFormData({});
    setPricing({ purchase_price: 0, selling_price: 0, margin_percentage: 0 });
    setEditingId(null);
    setShowForm(false);
  };

  const calculateMargin = (purchase: number, selling: number) => {
    if (purchase > 0) {
      return ((selling - purchase) / purchase * 100).toFixed(2);
    }
    return '0';
  };

  const filteredMedications = medications.filter(med =>
    med.name.toLowerCase().includes(search.toLowerCase()) ||
    med.generic_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{t('medications.title')}</h1>
          <p className="text-gray-600 dark:text-slate-400">{t('medications.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Medication
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('medications.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('common.name')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('medications.genericName')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('medications.form')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('medications.category')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('medications.prescription')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedications.map((med) => (
                <tr key={med.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-800 dark:text-slate-100">{med.name}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">{med.strength}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">{med.generic_name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">{med.form}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">{med.category}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      med.requires_prescription
                        ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                        : 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'
                    }`}>
                      {med.requires_prescription ? t('medications.required') : t('medications.otc')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleEdit(med)}
                      className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg inline-flex mr-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(med.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg inline-flex"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMedications.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              {t('medications.noMedications')}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                {editingId ? t('medications.editMedication') : t('medications.addNewMedication')}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    {t('medications.brandName')} *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    {t('medications.genericName')}
                  </label>
                  <input
                    type="text"
                    value={formData.generic_name || ''}
                    onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Form
                  </label>
                  <input
                    type="text"
                    value={formData.form || ''}
                    onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                    
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Strength
                  </label>
                  <input
                    type="text"
                    value={formData.strength || ''}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="prescription"
                    checked={formData.requires_prescription || false}
                    onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="prescription" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Requires Prescription
                  </label>
                </div>
              </div>

              {!editingId && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                    <h3 className="font-medium text-gray-800 dark:text-slate-100">{t('medications.pricingInfo')}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        {t('medications.purchasePrice')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={pricing.purchase_price}
                        onChange={(e) => {
                          const purchase = Number(e.target.value);
                          setPricing({
                            ...pricing,
                            purchase_price: purchase,
                            margin_percentage: Number(calculateMargin(purchase, pricing.selling_price)),
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        {t('medications.sellingPrice')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={pricing.selling_price}
                        onChange={(e) => {
                          const selling = Number(e.target.value);
                          setPricing({
                            ...pricing,
                            selling_price: selling,
                            margin_percentage: Number(calculateMargin(pricing.purchase_price, selling)),
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Margin %
                      </label>
                      <input
                        type="text"
                        value={pricing.margin_percentage.toFixed(2)}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Indications
                </label>
                <textarea
                  value={formData.indications || ''}
                  onChange={(e) => setFormData({ ...formData, indications: e.target.value })}
                  rows={2}
                  placeholder="{t('medications.indicationsPlaceholder')}"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Contraindications
                </label>
                <textarea
                  value={formData.contraindications || ''}
                  onChange={(e) => setFormData({ ...formData, contraindications: e.target.value })}
                  rows={2}
                  placeholder="{t('medications.contraindicationsPlaceholder')}"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Side Effects
                </label>
                <textarea
                  value={formData.side_effects || ''}
                  onChange={(e) => setFormData({ ...formData, side_effects: e.target.value })}
                  rows={2}
                  placeholder="Possible side effects"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? t('common.saving') : editingId ? t('medications.update') : t('medications.addMedication')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
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
