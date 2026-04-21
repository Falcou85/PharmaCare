import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../contexts/PreferencesContext';
import { useToast } from '../contexts/ToastContext';
import {
  Truck,
  Plus,
  Search,
  CreditCard as Edit2,
  Trash2,
  X,
  Mail,
  Phone,
  MapPin,
  User,
  Package,
  DollarSign,
  Calendar,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  order_date: string;
  expected_delivery: string | null;
  status: string;
  total_amount: number;
}

const emptyForm = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
};

export function Suppliers() {
  const { t, formatCurrency, formatDate } = usePreferences();
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [viewOrdersFor, setViewOrdersFor] = useState<Supplier | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [suppRes, ordersRes] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('purchase_orders').select('*').order('order_date', { ascending: false }),
    ]);
    if (suppRes.error) toast.error(t('toast.error'), suppRes.error.message);
    setSuppliers(suppRes.data || []);
    setOrders(ordersRes.data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return suppliers;
    const s = search.toLowerCase();
    return suppliers.filter(
      (x) =>
        x.name.toLowerCase().includes(s) ||
        (x.contact_person || '').toLowerCase().includes(s) ||
        (x.email || '').toLowerCase().includes(s)
    );
  }, [suppliers, search]);

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status === 'pending').length;
    const spend = orders
      .filter((o) => o.status === 'received')
      .reduce((s, o) => s + Number(o.total_amount || 0), 0);
    return { count: suppliers.length, active, spend };
  }, [suppliers, orders]);

  const ordersBySupplier = useMemo(() => {
    const map = new Map<string, PurchaseOrder[]>();
    orders.forEach((o) => {
      const list = map.get(o.supplier_id) || [];
      list.push(o);
      map.set(o.supplier_id, list);
    });
    return map;
  }, [orders]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s.id);
    setForm({
      name: s.name,
      contact_person: s.contact_person || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
    });
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t('toast.error'), t('common.required'));
      return;
    }
    const payload = {
      name: form.name.trim(),
      contact_person: form.contact_person.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    };

    const res = editing
      ? await supabase.from('suppliers').update(payload).eq('id', editing)
      : await supabase.from('suppliers').insert([payload]);

    if (res.error) {
      toast.error(t('toast.error'), res.error.message);
      return;
    }
    toast.success(editing ? t('toast.updated') : t('toast.created'));
    setShowModal(false);
    load();
  };

  const doDelete = async () => {
    if (!confirmId) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', confirmId);
    if (error) {
      toast.error(t('toast.error'), error.message);
    } else {
      toast.success(t('toast.deleted'));
      load();
    }
    setConfirmId(null);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">
            {t('suppliers.title')}
          </h1>
          <p className="text-gray-600 dark:text-slate-400">{t('suppliers.subtitle')}</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transition"
        >
          <Plus className="w-5 h-5" />
          {t('suppliers.addSupplier')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Truck}
          color="bg-blue-500"
          label={t('suppliers.totalSuppliers')}
          value={stats.count.toString()}
        />
        <StatCard
          icon={ShoppingBag}
          color="bg-orange-500"
          label={t('suppliers.activeOrders')}
          value={stats.active.toString()}
        />
        <StatCard
          icon={DollarSign}
          color="bg-green-500"
          label={t('suppliers.totalSpend')}
          value={formatCurrency(stats.spend)}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('suppliers.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-12 text-center">
          <Truck className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400">{t('suppliers.noSuppliers')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const sOrders = ordersBySupplier.get(s.id) || [];
            const last = sOrders[0];
            return (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5 rounded-lg">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-slate-100 leading-tight">
                        {s.name}
                      </h3>
                      {s.contact_person && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3" />
                          {s.contact_person}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmId(s.id)}
                      className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {s.email && (
                    <p className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{s.email}</span>
                    </p>
                  )}
                  {s.phone && (
                    <p className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {s.phone}
                    </p>
                  )}
                  {s.address && (
                    <p className="flex items-start gap-2 text-gray-600 dark:text-slate-300">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{s.address}</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {t('suppliers.orders')}
                    </p>
                    <p className="font-bold text-gray-800 dark:text-slate-100">{sOrders.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {t('suppliers.lastOrder')}
                    </p>
                    <p className="font-bold text-gray-800 dark:text-slate-100">
                      {last ? formatDate(last.order_date) : t('suppliers.never')}
                    </p>
                  </div>
                </div>

                {sOrders.length > 0 && (
                  <button
                    onClick={() => setViewOrdersFor(s)}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-lg transition"
                  >
                    <Package className="w-4 h-4" />
                    {t('suppliers.viewOrders')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <form onSubmit={save} className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                {editing ? t('suppliers.editSupplier') : t('suppliers.newSupplier')}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>

            <Field label={t('suppliers.supplierName') + ' *'}>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </Field>
            <Field label={t('suppliers.contactPerson')}>
              <input
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                className="input"
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('common.email')}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label={t('common.phone')}>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                />
              </Field>
            </div>
            <Field label={t('common.address')}>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input resize-none"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transition"
              >
                {t('common.save')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewOrdersFor && (
        <Modal onClose={() => setViewOrdersFor(null)}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                  {t('suppliers.purchaseOrders')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400">{viewOrdersFor.name}</p>
              </div>
              <button
                onClick={() => setViewOrdersFor(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(ordersBySupplier.get(viewOrdersFor.id) || []).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-slate-100">{o.order_number}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {formatDate(o.order_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800 dark:text-slate-100">
                      {formatCurrency(Number(o.total_amount))}
                    </p>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {confirmId && (
        <Modal onClose={() => setConfirmId(null)}>
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-950/50 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-slate-100">
                  {t('common.confirm')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  {t('suppliers.confirmDelete')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={doDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: typeof Truck;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-5">
      <div className="flex items-center gap-3">
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-slate-400">{label}</p>
          <p className="text-xl font-bold text-gray-800 dark:text-slate-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = usePreferences();
  const map: Record<string, { label: string; cls: string }> = {
    pending: {
      label: t('suppliers.pending'),
      cls: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    },
    received: {
      label: t('suppliers.received'),
      cls: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
    },
    cancelled: {
      label: t('suppliers.cancelled'),
      cls: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
    },
  };
  const item = map[status] || { label: status, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${item.cls}`}>
      {item.label}
    </span>
  );
}
