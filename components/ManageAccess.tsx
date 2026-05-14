import React, { useState, useEffect } from 'react';
import * as apiService from '../services/dbService';

const ManageAccess: React.FC = () => {
  const [users, setUsers] = useState<{email: string}[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const u = await apiService.getApprovedUsers();
      setUsers(u);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    try {
      await apiService.addApprovedUser(newEmail.trim());
      setNewEmail('');
      fetchUsers();
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
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow mt-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Kelola Akses Pengguna</h2>
      
      {error && (
        <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-8">
        <input 
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="Email Pengguna Baru"
          className="flex-1 px-4 py-2 border rounded-md focus:ring-teal-500 focus:border-teal-500"
        />
        <button 
          onClick={handleAdd}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md font-medium transition"
        >
          Tambahkan Akses
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-y">
              <th className="py-3 px-4 font-semibold text-slate-700">Email</th>
              <th className="py-3 px-4 font-semibold text-slate-700 w-32 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={2} className="text-center py-8 text-slate-500">Memuat data...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-center py-8 text-slate-500">Belum ada pengguna yang disetujui.</td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.email} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-800">{u.email}</td>
                  <td className="py-3 px-4 text-right">
                    {u.email !== 'rinomasstbi@gmail.com' && (
                      <button 
                        onClick={() => handleRemove(u.email)}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
            <tr className="border-b hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-800">rinomasstbi@gmail.com</td>
                <td className="py-3 px-4 text-right">
                <span className="text-slate-400 text-sm">Admin Utama</span>
                </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageAccess;
