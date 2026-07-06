import React from 'react';
import ManageAccess from './ManageAccess';
import { AdminSettings } from './AdminSettings';

interface AdminDashboardProps {
  onBack: () => void;
  showConfirm: (t: string, m: string, cb: () => void) => void;
  refreshSettings: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, showConfirm, refreshSettings }) => {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      <button 
        onClick={onBack}
        className="flex items-center text-teal-600 hover:text-teal-700 font-medium mb-6 transition"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Kembali
      </button>
      
      <div className="space-y-12">
        <section className="text-center md:text-left">
          <div className="border-b border-slate-200 pb-4 mb-6">
            <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-slate-600 mt-2">Kelola API key dan perizinan akses guru dalam satu halaman.</p>
          </div>
        </section>

        <section>
          <AdminSettings onSave={refreshSettings} />
        </section>

        <section>
          <ManageAccess showConfirm={showConfirm} />
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
