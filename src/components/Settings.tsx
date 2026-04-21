import { usePreferences, type Theme, type Currency, type Density } from '../contexts/PreferencesContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import type { Language } from '../i18n/translations';
import { Sun, Moon, Monitor, Palette, Globe, DollarSign, Calendar, LayoutGrid as LayoutIcon, Bell, User, Check } from 'lucide-react';

export function Settings() {
  const { preferences, updatePreferences, t } = usePreferences();
  const { profile } = useAuth();
  const toast = useToast();

  const handleUpdate = async (updates: Partial<typeof preferences>) => {
    await updatePreferences(updates);
    toast.success(t('settings.preferencesSaved'));
  };

  const themes: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: 'light', label: t('settings.light'), Icon: Sun },
    { value: 'dark', label: t('settings.dark'), Icon: Moon },
    { value: 'system', label: t('settings.system'), Icon: Monitor },
  ];

  const languages: { value: Language; label: string; flag: string }[] = [
    { value: 'en', label: 'English', flag: 'EN' },
    { value: 'fr', label: 'Francais', flag: 'FR' },
  ];

  const currencies: Currency[] = ['USD', 'EUR', 'MAD', 'CAD', 'GBP'];

  const dateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];

  const densities: { value: Density; label: string }[] = [
    { value: 'comfortable', label: t('settings.comfortable') },
    { value: 'compact', label: t('settings.compact') },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{t('settings.title')}</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="space-y-6">
        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-950/50 p-2 rounded-lg">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">{t('settings.profile')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('auth.fullName')}
              </label>
              <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-800 dark:text-slate-100">
                {profile?.full_name}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t('common.status')}
              </label>
              <div className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg capitalize text-gray-800 dark:text-slate-100">
                {profile?.role}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-950/50 p-2 rounded-lg">
              <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">{t('settings.appearance')}</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                {t('settings.theme')}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {themes.map(({ value, label, Icon }) => {
                  const active = preferences.theme === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleUpdate({ theme: value })}
                      className={`
                        relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition
                        ${active
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                        }
                      `}
                    >
                      {active && (
                        <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-0.5">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <Icon className={`w-6 h-6 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400'}`} />
                      <span className={`text-sm font-medium ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-slate-300'}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <LayoutIcon className="w-4 h-4" />
                {t('settings.density')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {densities.map(({ value, label }) => {
                  const active = preferences.density === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleUpdate({ density: value })}
                      className={`
                        p-3 rounded-lg border-2 transition text-sm font-medium
                        ${active
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
                        }
                      `}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-950/50 p-2 rounded-lg">
              <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">{t('settings.preferences')}</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                {t('settings.language')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {languages.map(({ value, label, flag }) => {
                  const active = preferences.language === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleUpdate({ language: value })}
                      className={`
                        flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition
                        ${active
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                        }
                      `}
                    >
                      <span className={`text-lg font-bold ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400'}`}>
                        {flag}
                      </span>
                      <span className={`text-sm font-medium ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-slate-300'}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {t('settings.currency')}
                </label>
                <select
                  value={preferences.currency}
                  onChange={(e) => handleUpdate({ currency: e.target.value as Currency })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('settings.dateFormat')}
                </label>
                <select
                  value={preferences.date_format}
                  onChange={(e) => handleUpdate({ date_format: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {dateFormats.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-950/50 p-2 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">{t('settings.notifications')}</h2>
          </div>

          <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {t('settings.enableNotifications')}
            </span>
            <button
              onClick={() => handleUpdate({ notifications_enabled: !preferences.notifications_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                preferences.notifications_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  preferences.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </section>
      </div>
    </div>
  );
}
