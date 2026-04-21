import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../contexts/PreferencesContext';
import {
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface Stats {
  todaySales: number;
  totalMedications: number;
  lowStockItems: number;
  totalPatients: number;
  monthlyRevenue: number;
  monthlySales: number;
}

export function Dashboard() {
  const { t, formatCurrency, formatDate, formatDateTime } = usePreferences();
  const [stats, setStats] = useState<Stats>({
    todaySales: 0,
    totalMedications: 0,
    lowStockItems: 0,
    totalPatients: 0,
    monthlyRevenue: 0,
    monthlySales: 0,
  });
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [
        todaySalesResult,
        medicationsResult,
        lowStockResult,
        patientsResult,
        monthlySalesResult,
        expiringResult,
        recentSalesResult
      ] = await Promise.all([
        supabase.from('sales').select('net_amount').gte('created_at', today),
        supabase.from('medications').select('id', { count: 'exact' }),
        supabase.from('inventory').select('id', { count: 'exact' }).lt('quantity', 10),
        supabase.from('patients').select('id', { count: 'exact' }),
        supabase.from('sales').select('net_amount').gte('created_at', firstDayOfMonth),
        supabase.from('inventory').select(`id, batch_number, quantity, expiry_date, medication:medications(name)`).lte('expiry_date', thirtyDaysFromNow).order('expiry_date', { ascending: true }).limit(5),
        supabase.from('sales').select(`id, sale_number, net_amount, created_at, patient:patients(first_name, last_name)`).order('created_at', { ascending: false }).limit(5)
      ]);

      const todaySales = todaySalesResult.data?.reduce((sum, sale) => sum + Number(sale.net_amount), 0) || 0;
      const monthlySales = monthlySalesResult.data?.length || 0;
      const monthlyRevenue = monthlySalesResult.data?.reduce((sum, sale) => sum + Number(sale.net_amount), 0) || 0;

      setStats({
        todaySales,
        totalMedications: medicationsResult.count || 0,
        lowStockItems: lowStockResult.count || 0,
        totalPatients: patientsResult.count || 0,
        monthlyRevenue,
        monthlySales,
      });

      setExpiringItems(expiringResult.data || []);
      setRecentSales(recentSalesResult.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    { label: t('dashboard.todaySales'), value: formatCurrency(stats.todaySales), icon: DollarSign, color: 'bg-green-500', change: '+12%' },
    { label: t('dashboard.totalMedications'), value: stats.totalMedications.toString(), icon: Package, color: 'bg-blue-500' },
    { label: t('dashboard.lowStockItems'), value: stats.lowStockItems.toString(), icon: AlertTriangle, color: 'bg-orange-500' },
    { label: t('dashboard.totalPatients'), value: stats.totalPatients.toString(), icon: Users, color: 'bg-cyan-500' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{t('dashboard.title')}</h1>
        <p className="text-gray-600 dark:text-slate-400">{t('dashboard.welcome')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {card.change && (
                  <span className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {card.change}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">{t('dashboard.monthlyOverview')}</h2>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-slate-400">{t('dashboard.totalSales')}</span>
              <span className="font-bold text-gray-800 dark:text-slate-100">{stats.monthlySales}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-slate-400">{t('dashboard.revenue')}</span>
              <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.monthlyRevenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-slate-400">{t('dashboard.averageSale')}</span>
              <span className="font-bold text-gray-800 dark:text-slate-100">
                {formatCurrency(stats.monthlySales > 0 ? stats.monthlyRevenue / stats.monthlySales : 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">{t('dashboard.expiringSoon')}</h2>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="space-y-3">
            {expiringItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-slate-400">{t('dashboard.noExpiring')}</p>
            ) : (
              expiringItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-slate-100">{item.medication?.name}</p>
                    <p className="text-sm text-gray-600 dark:text-slate-400">{t('dashboard.batch')}: {item.batch_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                      {formatDate(item.expiry_date)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-slate-400">{t('common.quantity')}: {item.quantity}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">{t('dashboard.recentSales')}</h2>
          <ShoppingCart className="w-5 h-5 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('dashboard.saleNumber')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('dashboard.patient')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('dashboard.amount')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-slate-400">{t('common.date')}</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500 dark:text-slate-400">
                    {t('dashboard.noRecentSales')}
                  </td>
                </tr>
              ) : (
                recentSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-800 dark:text-slate-100">{sale.sale_number}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">
                      {sale.patient ? `${sale.patient.first_name} ${sale.patient.last_name}` : t('dashboard.walkIn')}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(Number(sale.net_amount))}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-slate-400">
                      {formatDateTime(sale.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
