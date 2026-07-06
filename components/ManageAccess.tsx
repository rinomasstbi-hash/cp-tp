import React, { useState, useEffect } from 'react';
import * as apiService from '../services/dbService';

const ManageAccess: React.FC = () => {
  const [users, setUsers] = useState<{email: string}[]>([]);
  const [requests, setRequests] = useState<{email: string, name: string, requestedAt: number}[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
         apiService.getApprovedUsers(),
         apiService.getAccessRequests()
      ]);
      setUsers(u);
      setRequests(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    try {
      await apiService.addApprovedUser(newEmail.trim());
      setNewEmail('');
      fetchData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRemove = async (email: string) => {
    if (email === 'rinomasstbi@gmail.com') {
      alert('Tidak dapat menghapus admin utama.');
      return;
    }
    try {
      await apiService.removeApprovedUser(email);
      fetchData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleApproveRequest = async (email: string) => {
    try {
      await apiService.approveAccessRequest(email);
      fetchData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRejectRequest = async (email: string) => {
    try {
      await apiService.rejectAccessRequest(email);
      fetchData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {error && (
        <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-md shadow-sm">
          {error}
        </div>
      )}

      {/* Permintaan Akses Section */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Permintaan Akses Baru</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y">
                <th className="py-3 px-4 font-semibold text-slate-700 text-sm">Nama Lengkap</th>
                <th className="py-3 px-4 font-semibold text-slate-700 text-sm">Email</th>
                <th className="py-3 px-4 font-semibold text-slate-700 text-sm">Waktu Permintaan</th>
                <th className="py-3 px-4 font-semibold text-slate-700 w-48 text-right text-sm">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-slate-500 text-sm">Memuat data...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-slate-500 text-sm bg-slate-50/50">Tidak ada permintaan akses baru.</td>
                </tr>
              ) : (
                requests.map(r => (
                  <tr key={r.email} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-800 font-medium">{r.name}</td>
                    <td className="py-3 px-4 text-slate-600">{r.email}</td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{new Date(r.requestedAt).toLocaleString('id-ID')}</td>
                    <td className="py-3 px-4 text-right flex justify-end gap-2">
                       <button 
                          onClick={() => handleApproveRequest(r.email)}
                          className="bg-teal-100 text-teal-700 hover:bg-teal-200 px-3 py-1.5 rounded text-sm font-semibold transition-colors"
                        >
                          Setujui
                        </button>
                        <button 
                          onClick={() => handleRejectRequest(r.email)}
                          className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded text-sm font-semibold transition-colors"
                        >
                          Tolak
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kelola Pengguna Section */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Pengguna Terdaftar</h2>
        
        <div className="flex gap-4 mb-8">
          <input 
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Tambah Email Pengguna Secara Manual..."
            className="flex-1 px-4 py-2 border rounded-md focus:ring-teal-500 focus:border-teal-500 text-sm"
          />
          <button 
            onClick={handleAdd}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md text-sm font-semibold transition shadow-sm"
          >
            Tambahkan Akses
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y">
                <th className="py-3 px-4 font-semibold text-slate-700 text-sm">Email</th>
                <th className="py-3 px-4 font-semibold text-slate-700 w-32 text-right text-sm">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={2} className="text-center py-6 text-slate-500 text-sm">Memuat data...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center py-6 text-slate-500 text-sm">Belum ada pengguna tambahan yang disetujui.</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.email} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-800">{u.email}</td>
                    <td className="py-3 px-4 text-right">
                      {u.email !== 'rinomasstbi@gmail.com' ? (
                        <button 
                          onClick={() => handleRemove(u.email)}
                          className="text-red-500 hover:text-red-700 font-medium text-sm"
                        >
                          Cabut Akses
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs font-semibold bg-slate-100 px-2 py-1 rounded">Admin Utama</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
               {/* Make sure the main admin is always displayed if they somehow aren't in the DB list */}
               {!users.find(u => u.email === 'rinomasstbi@gmail.com') && (
                 <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-800">rinomasstbi@gmail.com</td>
                    <td className="py-3 px-4 text-right">
                       <span className="text-slate-400 text-xs font-semibold bg-slate-100 px-2 py-1 rounded">Admin Utama</span>
                    </td>
                 </tr>
               )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default ManageAccess;
