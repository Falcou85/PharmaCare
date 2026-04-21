import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { ToastProvider } from './contexts/ToastContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { PointOfSale } from './components/PointOfSale';
import { Medications } from './components/Medications';
import { Inventory } from './components/Inventory';
import { Patients } from './components/Patients';
import { Accounting } from './components/Accounting';
import { Settings } from './components/Settings';
import { Suppliers } from './components/Suppliers';
import { Prescriptions } from './components/Prescriptions';
import { Employees } from './components/Employees';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'pos':
        return <PointOfSale />;
      case 'medications':
        return <Medications />;
      case 'inventory':
        return <Inventory />;
      case 'patients':
        return <Patients />;
      case 'accounting':
        return <Accounting />;
      case 'suppliers':
        return <Suppliers />;
      case 'prescriptions':
        return <Prescriptions />;
      case 'employees':
        return <Employees />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="p-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-12 text-center">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-2">Coming Soon</h2>
              <p className="text-gray-600 dark:text-slate-400">This module is under development</p>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </PreferencesProvider>
    </AuthProvider>
  );
}

export default App;
