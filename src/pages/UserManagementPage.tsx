import { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Trash2, Mail, Lock, User as UserIcon } from 'lucide-react';
import { UserRole } from '../types';
import { LocalUser, createUser, deleteUser, getUsers } from '../services/userService';

export function UserManagementPage() {
  
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'staff' as UserRole });

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((error) => alert(error.message || 'Failed to load users.'));
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newUser = await createUser(formData);
      setUsers([...users, newUser]);
      setShowModal(false);
      setFormData({ name: '', email: '', password: '', role: 'staff' });
      alert('Staff account created successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to create staff account.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
        setUsers(users.filter(u => u.id !== id));
      } catch (error: any) {
        alert(error.message || 'Failed to delete user.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Staff Accounts</h1>
          <p className="text-sm text-gray-500">Manage system access for your clinic staff.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-dark-900 hover:bg-black text-gold-400 px-6 py-2.5 rounded-xl shadow-lg transition-all font-bold"
        >
          <UserPlus className="w-5 h-5" />
          <span>Create Account</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                <td className="px-6 py-4 text-gray-600">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    u.role === 'admin' ? 'bg-gold-100 text-gold-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : 'Staff'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {u.role !== 'admin' && (
                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 transition">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create Staff Account</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900">✕</button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-gold-500 outline-none" placeholder="e.g. Jane Doe" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-gold-500 outline-none" placeholder="staff@clinic.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-gold-500 outline-none" placeholder="Temporary password" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-gold-500 outline-none bg-white">
                  <option value="staff">Staff Member</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-dark-900 text-gold-400 font-bold rounded-xl hover:bg-black">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
