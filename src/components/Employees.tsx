import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../contexts/PreferencesContext';
import { useToast } from '../contexts/ToastContext';
import {
  UserCog,
  Search,
  CreditCard as Edit2,
  X,
  Users,
  UserCheck,
  UserMinus,
  Phone,
  Mail,
  Shield,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
} from 'lucide-react';

type Role = 'admin' | 'pharmacist' | 'technician' | 'cashier';
type Status = 'active' | 'on_leave' | 'inactive';

interface Employee {
  id: string;
  full_name: string;
  role: Role;
  phone: string | null;
  employee_code: string | null;
  hire_date: string | null;
  status: string | null;
  salary: number | null;
  emergency_contact: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

const ROLES: Role[] = ['admin', 'pharmacist', 'technician', 'cashier'];
const STATUSES: Status[] = ['active', 'on_leave', 'inactive'];

export function Employees() {
  const { t, formatCurrency, formatDate } = usePreferences();
  const toast = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salesMap, setSalesMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    role: 'cashier' as Role,
    phone: '',
    employee_code: '',
    hire_date: '',
    status: 'active' as Status,
    salary: '' as string | number,
    emergency_contact: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [profRes, salesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('sales').select('served_by, net_amount'),
    ]);
    if (profRes.error) {
      toast.error(t('toast.error'), profRes.error.message);
    }
    setEmployees(profRes.data || []);

    const map = new Map<string, number>();
    (salesRes.data || []).forEach((s: any) => {
      if (!s.served_by) return;
      map.set(s.served_by, (map.get(s.served_by) || 0) + 1);
    });
    setSalesMap(map);

    setLoading(false);
  };

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (roleFilter !== 'all' && e.role !== roleFilter) return false;
      if (statusFilter !== 'all' && (e.status || 'active') !== statusFilter) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        e.full_name.toLowerCase().includes(s) ||
        (e.employee_code || '').toLowerCase().includes(s) ||
        (e.phone || '').toLowerCase().includes(s)
      );
    });
  }, [employees, search, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = employees.filter((e) => (e.status || 'active') === 'active').length;
    const onLeave = employees.filter((e) => e.status === 'on_leave').length;
    return { total: employees.length, active, onLeave };
  }, [employees]);

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      full_name: emp.full_name || '',
      role: emp.role,
      phone: emp.phone || '',
      employee_code: emp.employee_code || '',
      hire_date: emp.hire_date || '',
      status: (emp.status as Status) || 'active',
      salary: emp.salary ?? '',
      emergency_contact: emp.emergency_contact || '',
      address: emp.address || '',
      notes: emp.notes || '',
    });
    setShowModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!form.full_name.trim()) {
      toast.error(t('toast.error'), t('common.required'));
      return;
    }
    const payload = {
      full_name: form.full_name.trim(),
      role: form.role,
      phone: form.phone.trim() || null,
      employee_code: form.employee_code.trim() || null,
      hire_date: form.hire_date || null,
      status: form.status,
      salary: form.salary === '' ? 0 : Number(form.salary),
      emergency_contact: form.emergency_contact.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', editing.id);
    if (error) {
      toast.error(t('toast.error'), error.message);
      return;
    }
    toast.success(t('toast.updated'));
    setShowModal(false);
    load();
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">
            {t('employees.title')}
          </h1>
          <p className="text-gray-600 dark:text-slate-400">{t('employees.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          color="bg-blue-500"
          label={t('employees.totalEmployees')}
          value={stats.total.toString()}
        />
        <StatCard
          icon={UserCheck}
          color="bg-green-500"
          label={t('employees.activeNow')}
          value={stats.active.toString()}
        />
        <StatCard
          icon={UserMinus}
          color="bg-orange-500"
          label={t('employees.onLeaveCount')}
          value={stats.onLeave.toString()}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('employees.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">{t('common.all')}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {t(`employees.${r}`)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">{t('common.all')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`employees.${s === 'on_leave' ? 'onLeave' : s}`)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-12 text-center">
          <UserCog className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400">{t('employees.noEmployees')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-5 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar name={emp.full_name} />
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-slate-100 leading-tight">
                      {emp.full_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <RoleBadge role={emp.role} />
                      <StatusBadge status={(emp.status as Status) || 'active'} />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openEdit(emp)}
                  className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-sm">
                {emp.employee_code && (
                  <p className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="font-mono text-xs">{emp.employee_code}</span>
                  </p>
                )}
                {emp.phone && (
                  <p className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {emp.phone}
                  </p>
                )}
                {emp.hire_date && (
                  <p className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDate(emp.hire_date)}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {t('employees.salesHandled')}
                  </p>
                  <p className="font-bold text-gray-800 dark:text-slate-100">
                    {salesMap.get(emp.id) || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {t('employees.salary')}
                  </p>
                  <p className="font-bold text-gray-800 dark:text-slate-100">
                    {emp.salary ? formatCurrency(Number(emp.salary)) : '-'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && editing && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={save} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                  {t('employees.editEmployee')}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t('auth.fullName') + ' *'}>
                  <input
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label={t('employees.employeeCode')}>
                  <input
                    value={form.employee_code}
                    onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
                    placeholder="EMP-001"
                    className="input"
                  />
                </Field>
                <Field label={t('employees.role')}>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    className="input"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {t(`employees.${r}`)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('employees.status')}>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                    className="input"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`employees.${s === 'on_leave' ? 'onLeave' : s}`)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('common.phone')}>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label={t('employees.hireDate')}>
                  <input
                    type="date"
                    value={form.hire_date}
                    onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label={t('employees.salary')}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label={t('employees.emergencyContact')}>
                  <input
                    value={form.emergency_contact}
                    onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
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
              <Field label={t('common.notes')}>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
          </div>
        </div>
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
  icon: typeof Users;
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

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase() || '?';
  return (
    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow">
      {initials}
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const { t } = usePreferences();
  const map: Record<Role, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    pharmacist: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    technician: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
    cashier: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${map[role]}`}>
      {t(`employees.${role}`)}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const { t } = usePreferences();
  const map: Record<Status, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
    on_leave: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    inactive: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${map[status]}`}>
      {t(`employees.${status === 'on_leave' ? 'onLeave' : status}`)}
    </span>
  );
}
