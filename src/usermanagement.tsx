import React, { useState, useEffect } from 'react';
import { getUsers, saveUsers, User } from './db';
import { triggerHaptic } from './utils/haptics';
import { 
  Users, 
  UserCheck, 
  ShieldAlert, 
  UserPlus, 
  Trash2, 
  Mail, 
  Briefcase 
} from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // New Profile Form inputs
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'staff' | 'manager'>('staff');

  useEffect(() => {
    const list = getUsers();
    setUsers(list);
    
    // Default current user to first user (Admin)
    if (list.length > 0 && !currentUser) {
      const savedUser = localStorage.getItem('sms_current_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      } else {
        setCurrentUser(list[0]);
        localStorage.setItem('sms_current_user', JSON.stringify(list[0]));
      }
    }
  }, [currentUser]);

  const changeCurrentUser = (user: User) => {
    triggerHaptic('success');
    setCurrentUser(user);
    localStorage.setItem('sms_current_user', JSON.stringify(user));
    alert(`Switched active profile context to ${user.username} (${user.role.toUpperCase()})`);
  };

  const handleRegisterUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newEmail.trim()) {
      alert("Please fill out complete fields!");
      return;
    }

    const newUser: User = {
      id: `U-${Math.floor(10 + Math.random() * 90)}`,
      username: newUsername.trim().toLowerCase(),
      email: newEmail.trim(),
      role: newRole
    };

    const updated = [...users, newUser];
    setUsers(updated);
    saveUsers(updated);
    triggerHaptic('success');

    // Reset inputs
    setNewUsername('');
    setNewEmail('');
    setNewRole('staff');
    alert(`Profile initialized for @${newUser.username}`);
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser?.id) {
       alert("Error: Cannot delete the profile currently selected as active session!");
       triggerHaptic('warning');
       return;
    }

    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    saveUsers(updated);
    triggerHaptic('warning');
    alert("Profile deleted successfully.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="user-mgt-panel">
      {/* Session/Profile Settings */}
      <div className="lg:col-span-5 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/60 p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-1.5">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              Active Session Profile
            </h2>
            <p className="text-xs text-slate-400">Select or simulate a profile context inside the workspace</p>
          </div>

          {/* Current Profile Card */}
          {currentUser && (
            <div className="bg-gradient-to-br from-indigo-555/40 from-indigo-950 to-slate-900 border border-indigo-500/50 rounded-2xl p-5 shadow-inner text-center items-center flex flex-col justify-center space-y-3">
              <div className="h-16 w-16 bg-gradient-to-r from-emerald-400 to-indigo-500 rounded-full flex items-center justify-center font-black text-2xl text-slate-950 shadow-md">
                {currentUser.username[0].toUpperCase()}
              </div>
              
              <div>
                <h3 className="font-extrabold text-slate-100 text-lg">@{currentUser.username}</h3>
                <span className="inline-block mt-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentUser.role}
                </span>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <p className="flex items-center justify-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {currentUser.email}
                </p>
                <p className="flex items-center justify-center gap-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  ID Reference: {currentUser.id}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info label */}
        <div className="mt-6 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Simulation Mode: Staff roles permit creating pending carts or reviewing items, while Admin handles database registrations and permanent deletions.</span>
        </div>
      </div>

      {/* Directory & Create user Column */}
      <div className="lg:col-span-7 bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700/60 p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-1.5">
                <Users className="w-5 h-5 text-indigo-400" />
                Staff Directory
              </h2>
              <p className="text-xs text-slate-400">Double click or click to select as current session supervisor</p>
            </div>
          </div>

          {/* Directory Box */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1" id="staff-tiles-box">
            {users.map(u => {
              const active = u.id === currentUser?.id;
              return (
                <div 
                  key={u.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    active 
                      ? 'border-indigo-500 bg-indigo-500/10' 
                      : 'border-slate-700/80 bg-slate-900/40 hover:bg-slate-900'
                  }`}
                  onClick={() => changeCurrentUser(u)}
                  id={`user-tile-${u.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg flex items-center justify-center font-bold">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">@{u.username}</h4>
                      <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-bold tracking-widest bg-slate-800 text-slate-300 px-2 py-1 rounded">
                      {u.role}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUser(u.id);
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"
                      title="Remove profile"
                      id={`delete-user-${u.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create Profile */}
        <div className="mt-6 border-t border-slate-700/50 pt-5">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            Provision New Staff Profile
          </h3>

          <form onSubmit={handleRegisterUser} className="grid grid-cols-1 md:grid-cols-3 gap-3" id="add-user-form">
            <input
              type="text"
              required
              placeholder="Username..."
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              id="user-name-input"
            />
            <input
              type="email"
              required
              placeholder="Work Email..."
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              id="user-email-input"
            />
            
            <div className="flex gap-2">
              <select
                className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 flex-1"
                value={newRole}
                onChange={e => setNewRole(e.target.value as any)}
                id="user-role-input"
              >
                <option value="admin">Administrator</option>
                <option value="manager">Manager</option>
                <option value="staff">Associate Staff</option>
              </select>
              
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs px-4 py-2 flex items-center justify-center cursor-pointer"
                id="add-user-btn"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
