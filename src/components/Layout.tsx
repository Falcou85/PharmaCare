import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  DollarSign,
  Truck,
  UserCog,
  Menu,
  X,
  LogOut,
  Pill,
  Sun,
  Moon,
  Monitor,
  Languages,
  Settings as SettingsIcon,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { preferences, effectiveTheme, updatePreferences, t } = usePreferences();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  useEffect(() => {
    const close = () => {
      setThemeMenuOpen(false);
      setLangMenuOpen(false);
    };
    if (themeMenuOpen || langMenuOpen) {
      window.addEventListener('click', close);
      return () => window.removeEventListener('click', close);
    }
  }, [themeMenuOpen, langMenuOpen]);

  const menuItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, roles: ['admin', 'pharmacist', 'technician', 'cashier'] },
    { id: 'pos', label: t('nav.pos'), icon: ShoppingCart, roles: ['admin', 'pharmacist', 'cashier'] },
    { id: 'medications', label: t('nav.medications'), icon: Pill, roles: ['admin', 'pharmacist', 'technician'] },
    { id: 'inventory', label: t('nav.inventory'), icon: Package, roles: ['admin', 'pharmacist', 'technician'] },
    { id: 'patients', label: t('nav.patients'), icon: Users, roles: ['admin', 'pharmacist', 'technician', 'cashier'] },
    { id: 'prescriptions', label: t('nav.prescriptions'), icon: FileText, roles: ['admin', 'pharmacist'] },
    { id: 'accounting', label: t('nav.accounting'), icon: DollarSign, roles: ['admin', 'pharmacist'] },
    { id: 'suppliers', label: t('nav.suppliers'), icon: Truck, roles: ['admin', 'pharmacist'] },
    { id: 'employees', label: t('nav.employees'), icon: UserCog, roles: ['admin'] },
  ];

  const role = profile?.role;
  const filteredMenuItems = role
    ? menuItems.filter((item) => item.roles.includes(role))
    : menuItems;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const ThemeIcon = preferences.theme === 'system' ? Monitor : effectiveTheme === 'dark' ? Moon : Sun;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
            <Pill className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-gray-800 dark:text-slate-100">{t('common.appName')}</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-700 dark:text-slate-300"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <aside
        className={`
          fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 w-64 z-40 transition-all duration-300
          flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg shadow-lg">
              <Pill className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                {t('common.appName')}
              </h1>
              <p className="text-xs text-gray-600 dark:text-slate-400">{t('common.tagline')}</p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 border border-blue-100 dark:border-blue-900/40 rounded-lg">
            <p className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">
              {profile?.full_name}
            </p>
            <p className="text-xs text-gray-600 dark:text-slate-400 capitalize">{profile?.role}</p>
          </div>

          <nav className="space-y-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition
                    ${isActive
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => {
                onNavigate('settings');
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition
                ${currentPage === 'settings'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                }
              `}
            >
              <SettingsIcon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">{t('nav.settings')}</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-around mb-2">
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 transition"
                title={t('settings.theme')}
              >
                <ThemeIcon className="w-5 h-5" />
              </button>
              {themeMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl py-1 min-w-[140px] animate-fade-in">
                  {(['light', 'dark', 'system'] as const).map((mode) => {
                    const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
                    return (
                      <button
                        key={mode}
                        onClick={() => {
                          updatePreferences({ theme: mode });
                          setThemeMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 ${
                          preferences.theme === mode
                            ? 'text-blue-600 dark:text-blue-400 font-medium'
                            : 'text-gray-700 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {t(`settings.${mode}`)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 transition flex items-center gap-1"
                title={t('settings.language')}
              >
                <Languages className="w-5 h-5" />
                <span className="text-xs font-bold uppercase">{preferences.language}</span>
              </button>
              {langMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl py-1 min-w-[140px] animate-fade-in">
                  {(['en', 'fr'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        updatePreferences({ language: lang });
                        setLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 ${
                        preferences.language === lang
                          ? 'text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="font-bold uppercase">{lang}</span>
                      <span>{lang === 'en' ? 'English' : 'Francais'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">{t('common.signOut')}</span>
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
