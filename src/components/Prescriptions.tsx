import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../contexts/PreferencesContext';
import { useToast } from '../contexts/ToastContext';
import {
  FileText,
  Plus,
  Search,
  CreditCard as Edit2,
  Trash2,
  X,
  User,
  Stethoscope,
  Calendar,
  Pill,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}
interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  specialty: string | null;
}
interface Medication {
  id: string;
  name: string;
  strength: string | null;
}
interface PrescriptionItem {
  id?: string;
  medication_id: string;
  quantity: number;
  dosage_instructions: string;
  fulfilled: boolean;
  medication?: Medication;
}
interface Prescription {
  id: string;
  prescription_number: string;
  patient_id: string;
  doctor_id: string;
  date_issued: string;
  status: string;
  notes: string | null;
  created_at: string;
  patient?: Patient;
  doctor?: Doctor;
  prescription_items?: PrescriptionItem[];
}

const STATUSES = ['pending', 'partial', 'dispensed', 'cancelled', 'expired'] as const;

export function Prescriptions() {
  const { t, formatDate } = usePreferences();
  const toast = useToast();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Prescription | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [form, setForm] = useState({
    patient_id: '',
    doctor_id: '',
    date_issued: new Date().toISOString().slice(0, 10),
    status: 'pending',
    notes: '',
    items: [] as PrescriptionItem[],
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [pres, pats, docs, meds] = await Promise.all([
      supabase
        .from('prescriptions')
        .select(
          `*, patient:patients(id,first_name,last_name), doctor:doctors(id,first_name,last_name,specialty), prescription_items(id, medication_id, quantity, dosage_instructions, fulfilled, medication:medications(id,name,strength))`
        )
        .order('date_issued', { ascending: false }),
      supabase.from('patients').select('id,first_name,last_name').order('last_name'),
      supabase.from('doctors').select('id,first_name,last_name,specialty').order('last_name'),
      supabase.from('medications').select('id,name,strength').order('name'),
    ]);
    if (pres.error) toast.error(t('toast.error'), pres.error.message);
    setPrescriptions(pres.data || []);
    setPatients(pats.data || []);
    setDoctors(docs.data || []);
    setMedications(meds.data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return prescriptions.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      const patientName = `${p.patient?.first_name || ''} ${p.patient?.last_name || ''}`.toLowerCase();
      const doctorName = `${p.doctor?.first_name || ''} ${p.doctor?.last_name || ''}`.toLowerCase();
      return (
        p.prescription_number.toLowerCase().includes(s) ||
        patientName.includes(s) ||
        doctorName.includes(s)
      );
    });
  }, [prescriptions, search, statusFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: prescriptions.length,
      pending: prescriptions.filter((p) => p.status === 'pending' || p.status === 'partial').length,
      dispensedToday: prescriptions.filter(
        (p) => p.status === 'dispensed' && p.date_issued === today
      ).length,
    };
  }, [prescriptions]);

  const generateNumber = () =>
    `RX-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const openAdd = () => {
    setEditing(null);
    setForm({
      patient_id: '',
      doctor_id: '',
      date_issued: new Date().toISOString().slice(0, 10),
      status: 'pending',
      notes: '',
      items: [],
    });
    setShowModal(true);
  };

  const openEdit = (p: Prescription) => {
    setEditing(p);
    setForm({
      patient_id: p.patient_id,
      doctor_id: p.doctor_id,
      date_issued: p.date_issued,
      status: p.status,
      notes: p.notes || '',
      items: (p.prescription_items || []).map((i) => ({
        id: i.id,
        medication_id: i.medication_id,
        quantity: i.quantity,
        dosage_instructions: i.dosage_instructions || '',
        fulfilled: i.fulfilled || false,
      })),
    });
    setShowModal(true);
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        { medication_id: '', quantity: 1, dosage_instructions: '', fulfilled: false },
      ],
    });
  };

  const updateItem = (index: number, patch: Partial<PrescriptionItem>) => {
    const next = [...form.items];
    next[index] = { ...next[index], ...patch };
    setForm({ ...form, items: next });
  };

  const removeItem = (index: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id || !form.doctor_id) {
      toast.error(t('toast.error'), t('common.required'));
      return;
    }
    if (form.items.length === 0) {
      toast.warning(t('toast.warning'), t('prescriptions.noItems'));
      return;
    }

    const payload = {
      patient_id: form.patient_id,
      doctor_id: form.doctor_id,
      date_issued: form.date_issued,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    let prescriptionId = editing?.id;

    if (editing) {
      const { error } = await supabase.from('prescriptions').update(payload).eq('id', editing.id);
      if (error) {
        toast.error(t('toast.error'), error.message);
        return;
      }
      await supabase.from('prescription_items').delete().eq('prescription_id', editing.id);
    } else {
      const { data, error } = await supabase
        .from('prescriptions')
        .insert([{ ...payload, prescription_number: generateNumber() }])
        .select('id')
        .maybeSingle();
      if (error || !data) {
        toast.error(t('toast.error'), error?.message || 'Insert failed');
        return;
      }
      prescriptionId = data.id;
    }

    const itemsPayload = form.items
      .filter((i) => i.medication_id && i.quantity > 0)
      .map((i) => ({
        prescription_id: prescriptionId,
        medication_id: i.medication_id,
        quantity: i.quantity,
        dosage_instructions: i.dosage_instructions || null,
        fulfilled: i.fulfilled,
      }));

    if (itemsPayload.length > 0) {
      const { error } = await supabase.from('prescription_items').insert(itemsPayload);
      if (error) {
        toast.error(t('toast.error'), error.message);
        return;
      }
    }

    toast.success(editing ? t('toast.updated') : t('toast.created'));
    setShowModal(false);
    load();
  };

  const markDispensed = async (p: Prescription) => {
    const { error } = await supabase
      .from('prescriptions')
      .update({ status: 'dispensed' })
      .eq('id', p.id);
    if (error) {
      toast.error(t('toast.error'), error.message);
      return;
    }
    await supabase
      .from('prescription_items')
      .update({ fulfilled: true })
      .eq('prescription_id', p.id);
    toast.success(t('toast.updated'));
    load();
  };

  const doDelete = async () => {
    if (!confirmId) return;
    await supabase.from('prescription_items').delete().eq('prescription_id', confirmId);
    const { error } = await supabase.from('prescriptions').delete().eq('id', confirmId);
    if (error) toast.error(t('toast.error'), error.message);
    else {
      toast.success(t('toast.deleted'));
      load();
    }
    setConfirmId(null);
  };

  const viewing = prescriptions.find((p) => p.id === viewId) || null;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">
            {t('prescriptions.title')}
          </h1>
          <p className="text-gray-600 dark:text-slate-400">{t('prescriptions.subtitle')}</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg transition"
        >
          <Plus className="w-5 h-5" />
          {t('prescriptions.newPrescription')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={FileText}
          color="bg-blue-500"
          label={t('prescriptions.total')}
          value={stats.total.toString()}
        />
        <StatCard
          icon={Clock}
          color="bg-orange-500"
          label={t('prescriptions.pendingCount')}
          value={stats.pending.toString()}
        />
        <StatCard
          icon={CheckCircle2}
          color="bg-green-500"
          label={t('prescriptions.dispensedCount')}
          value={stats.dispensedToday.toString()}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('prescriptions.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">{t('common.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`prescriptions.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400">{t('prescriptions.noPrescriptions')}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <Th>{t('prescriptions.prescriptionNumber')}</Th>
                  <Th>{t('prescriptions.patient')}</Th>
                  <Th>{t('prescriptions.doctor')}</Th>
                  <Th>{t('prescriptions.dateIssued')}</Th>
                  <Th>{t('prescriptions.items')}</Th>
                  <Th>{t('common.status')}</Th>
                  <Th className="text-right">{t('common.actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100">
                      <button
                        onClick={() => setViewId(p.id)}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {p.prescription_number}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                      {p.patient ? `${p.patient.first_name} ${p.patient.last_name}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                      {p.doctor ? `Dr. ${p.doctor.first_name} ${p.doctor.last_name}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                      {formatDate(p.date_issued)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                      {p.prescription_items?.length || 0}
                    </td>
                    <td className="px-4 py-3">
                      <PrescriptionStatus status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {p.status !== 'dispensed' && p.status !== 'cancelled' && (
                          <button
                            onClick={() => markDispensed(p)}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-md"
                            title={t('prescriptions.markDispensed')}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmId(p.id)}
                          className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)} size="lg">
          <form onSubmit={save} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                {editing ? t('prescriptions.editPrescription') : t('prescriptions.newPrescription')}
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
              <Field label={t('prescriptions.patient') + ' *'}>
                <select
                  required
                  value={form.patient_id}
                  onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                  className="input"
                >
                  <option value="">{t('prescriptions.selectPatient')}</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('prescriptions.doctor') + ' *'}>
                <select
                  required
                  value={form.doctor_id}
                  onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                  className="input"
                >
                  <option value="">{t('prescriptions.selectDoctor')}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.first_name} {d.last_name}
                      {d.specialty ? ` (${d.specialty})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('prescriptions.dateIssued') + ' *'}>
                <input
                  required
                  type="date"
                  value={form.date_issued}
                  onChange={(e) => setForm({ ...form, date_issued: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label={t('common.status')}>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="input"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`prescriptions.${s}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  {t('prescriptions.items')}
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  {t('prescriptions.addItem')}
                </button>
              </div>

              <div className="space-y-3">
                {form.items.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-slate-400 py-4 text-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg">
                    {t('prescriptions.noItems')}
                  </p>
                )}
                {form.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-2 bg-gray-50 dark:bg-slate-800/40"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                      <div className="md:col-span-6">
                        <select
                          required
                          value={item.medication_id}
                          onChange={(e) => updateItem(idx, { medication_id: e.target.value })}
                          className="input"
                        >
                          <option value="">{t('prescriptions.selectMedication')}</option>
                          {medications.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                              {m.strength ? ` - ${m.strength}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(idx, { quantity: Number(e.target.value) || 1 })
                          }
                          placeholder={t('common.quantity')}
                          className="input"
                        />
                      </div>
                      <div className="md:col-span-3 flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 flex-1">
                          <input
                            type="checkbox"
                            checked={item.fulfilled}
                            onChange={(e) => updateItem(idx, { fulfilled: e.target.checked })}
                            className="rounded"
                          />
                          {t('prescriptions.dispensed')}
                        </label>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <input
                      value={item.dosage_instructions}
                      onChange={(e) => updateItem(idx, { dosage_instructions: e.target.value })}
                      placeholder={t('prescriptions.dosagePlaceholder')}
                      className="input"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Field label={t('common.notes')}>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('prescriptions.notesPlaceholder')}
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

      {viewing && (
        <Modal onClose={() => setViewId(null)} size="lg">
          <div className="p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {t('prescriptions.prescriptionNumber')}
                </p>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">
                  {viewing.prescription_number}
                </h2>
              </div>
              <button
                onClick={() => setViewId(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <InfoCard icon={User} label={t('prescriptions.patient')}>
                {viewing.patient?.first_name} {viewing.patient?.last_name}
              </InfoCard>
              <InfoCard icon={Stethoscope} label={t('prescriptions.doctor')}>
                Dr. {viewing.doctor?.first_name} {viewing.doctor?.last_name}
                {viewing.doctor?.specialty ? ` - ${viewing.doctor.specialty}` : ''}
              </InfoCard>
              <InfoCard icon={Calendar} label={t('prescriptions.dateIssued')}>
                {formatDate(viewing.date_issued)}
              </InfoCard>
              <InfoCard icon={FileText} label={t('common.status')}>
                <PrescriptionStatus status={viewing.status} />
              </InfoCard>
            </div>

            <h3 className="font-bold text-gray-800 dark:text-slate-100 mb-2">
              {t('prescriptions.items')}
            </h3>
            <div className="space-y-2">
              {(viewing.prescription_items || []).map((i) => (
                <div
                  key={i.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg"
                >
                  <div className="bg-blue-100 dark:bg-blue-950/40 p-2 rounded-lg">
                    <Pill className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-slate-100">
                      {i.medication?.name}
                      {i.medication?.strength ? ` - ${i.medication.strength}` : ''}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {t('common.quantity')}: {i.quantity}
                    </p>
                    {i.dosage_instructions && (
                      <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                        {i.dosage_instructions}
                      </p>
                    )}
                  </div>
                  {i.fulfilled && (
                    <span className="text-xs font-medium bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                      {t('prescriptions.dispensed')}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {viewing.notes && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/40 rounded-lg">
                <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                  {t('common.notes')}
                </p>
                <p className="text-sm text-yellow-900 dark:text-yellow-200">{viewing.notes}</p>
              </div>
            )}
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
                  {t('prescriptions.confirmDelete')}
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
  icon: typeof FileText;
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

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400 ${className}`}
    >
      {children}
    </th>
  );
}

function Modal({
  children,
  onClose,
  size = 'md',
}: {
  children: React.ReactNode;
  onClose: () => void;
  size?: 'md' | 'lg';
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full animate-slide-up ${
          size === 'lg' ? 'max-w-3xl' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof FileText;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-slate-800/40 rounded-lg border border-gray-100 dark:border-slate-800">
      <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </p>
      <div className="text-sm font-medium text-gray-800 dark:text-slate-100">{children}</div>
    </div>
  );
}

function PrescriptionStatus({ status }: { status: string }) {
  const { t } = usePreferences();
  const map: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
    dispensed: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300',
    expired: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  };
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
        map[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {t(`prescriptions.${status}`)}
    </span>
  );
}
