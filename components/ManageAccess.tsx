import React, { useState, useEffect } from 'react';
import * as apiService from '../services/dbService';

interface ManageAccessProps {
  showConfirm: (t: string, m: string, cb: () => void) => void;
}

const ManageAccess: React.FC<ManageAccessProps> = ({ showConfirm }) => {
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

  const handleRemove = (email: string) => {
    if (email === 'rinomasstbi@gmail.com') {
      showConfirm(
        'Aksi Tidak Diizinkan', 
        'Tidak dapat menghapus admin utama.',
        () => {
            // Close handled by App.tsx automatically? No, wait. showConfirm passes a callback. But close is handled inside App.tsx? 
            // Wait, in App.tsx showConfirm just sets the state. 
            // Let's look at showConfirm in App.tsx again.
        }
      );
      return;
    }
    showConfirm(
      'Cabut Akses',
      `Apakah Anda yakin ingin mencabut akses untuk ${email}?`,
      async () => {
        try {
          await apiService.removeApprovedUser(email);
          fetchData();
        } catch (e: any) {
          setError(e.message);
        }
      }
    );
  };

  const handleApproveRequest = (email: string) => {
    showConfirm(
      'Setujui Permintaan',
      `Apakah Anda yakin ingin menyetujui akses untuk ${email}?`,
      async () => {
        try {
          await apiService.approveAccessRequest(email);
          fetchData();
        } catch (e: any) {
          setError(e.message);
        }
      }
    );
  };

  const handleRejectRequest = (email: string) => {
    showConfirm(
      'Tolak Permintaan',
      `Apakah Anda yakin ingin menolak akses untuk ${email}?`,
      async () => {
        try {
          await apiService.rejectAccessRequest(email);
          fetchData();
        } catch (e: any) {
          setError(e.message);
        }
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {error && (
        <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-md shadow-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Manajemen Akses Pengguna</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
                <th className="py-3 px-4 font-semibold text-slate-700 text-sm">Email / Pengguna</th>
                <th className="py-3 px-4 font-semibold text-slate-700 text-sm">Status</th>
                <th className="py-3 px-4 font-semibold text-slate-700 w-48 text-right text-sm">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-slate-500 text-sm">Memuat data...</td>
                </tr>
              ) : (users.length === 0 && requests.length === 0) ? (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-slate-500 text-sm">Tidak ada pengguna atau permintaan.</td>
                </tr>
              ) : (
                <>
                  {requests.map(r => (
                    <tr key={r.email} className="hover:bg-slate-50 transition-colors bg-amber-50/30">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{r.name}</div>
                        <div className="text-slate-500 text-sm">{r.email}</div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="text-amber-600 font-semibold bg-amber-100 px-2 py-1 rounded text-xs">Menunggu Persetujuan</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                         <div className="flex justify-end gap-2">
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
                         </div>
                      </td>
                    </tr>
                  ))}
                  
                  {users.map(u => (
                    <tr key={u.email} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {u.email === 'rinomasstbi@gmail.com' ? (
                            <span className="text-indigo-600 font-semibold bg-indigo-100 px-2 py-1 rounded text-xs">Admin Utama</span>
                        ) : (
                            <span className="text-emerald-600 font-semibold bg-emerald-100 px-2 py-1 rounded text-xs">Disetujui</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {u.email !== 'rinomasstbi@gmail.com' && (
                          <button 
                            onClick={() => handleRemove(u.email)}
                            className="text-red-500 hover:text-red-700 font-medium text-sm"
                          >
                            Cabut Akses
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Fallback for main admin if not in users list */}
                  {!users.find(u => u.email === 'rinomasstbi@gmail.com') && (
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">rinomasstbi@gmail.com</div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className="text-indigo-600 font-semibold bg-indigo-100 px-2 py-1 rounded text-xs">Admin Utama</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageAccess;
