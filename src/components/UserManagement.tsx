import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserRole, UserStatus } from '../types';
import { 
  ShieldAlert, 
  Users, 
  ShieldCheck, 
  UserCheck, 
  Search, 
  Lock, 
  UserX, 
  Globe, 
  Save, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';

export const UserManagement: React.FC<{ onBackToDashboard?: () => void }> = ({ onBackToDashboard }) => {
  const { userProfile, allowedDomains, updateAllowedDomains } = useAuth();
  const { t } = useLanguage();

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [domainInput, setDomainInput] = useState<string>('');
  const [savingDomains, setSavingDomains] = useState<boolean>(false);
  const [domainSuccess, setDomainSuccess] = useState<boolean>(false);

  // Initialize domain input from allowedDomains
  useEffect(() => {
    if (allowedDomains) {
      setDomainInput(allowedDomains.join(', '));
    }
  }, [allowedDomains]);

  // Security Lock / Guard: If user is not admin, render Access Restricted screen
  if (!userProfile || userProfile.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
            {t('access.restrictedTitle')}
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {t('access.restrictedDescription')}
          </p>
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-6 py-2.5 bg-[#FF0066] hover:bg-pink-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all"
            >
              {t('access.backToDashboard')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Fetch users list from Firestore
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const querySnap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      querySnap.forEach((docSnap) => {
        list.push(docSnap.data() as UserProfile);
      });
      setUsersList(list);
    } catch (e) {
      console.error('Error fetching users from Firestore:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleRole = async (targetUid: string, currentRole: UserRole) => {
    const newRole: UserRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', targetUid), { role: newRole });
      setUsersList(prev =>
        prev.map(u => u.uid === targetUid ? { ...u, role: newRole } : u)
      );
    } catch (e) {
      console.error('Failed to update user role:', e);
    }
  };

  const handleToggleStatus = async (targetUid: string, currentStatus: UserStatus) => {
    const newStatus: UserStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'users', targetUid), { status: newStatus });
      setUsersList(prev =>
        prev.map(u => u.uid === targetUid ? { ...u, status: newStatus } : u)
      );
    } catch (e) {
      console.error('Failed to update user status:', e);
    }
  };

  const handleSaveDomains = async () => {
    setSavingDomains(true);
    setDomainSuccess(false);
    const parsed = domainInput.split(',').map(d => d.trim()).filter(Boolean);
    await updateAllowedDomains(parsed);
    setSavingDomains(false);
    setDomainSuccess(true);
    setTimeout(() => setDomainSuccess(false), 3000);
  };

  const filteredUsers = usersList.filter(u => {
    const term = searchTerm.toLowerCase();
    return (u.displayName || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term);
  });

  const totalUsers = usersList.length;
  const activeCount = usersList.filter(u => u.status === 'active').length;
  const adminCount = usersList.filter(u => u.role === 'admin').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF0066]" />
            <span className="text-xs font-bold text-[#FF0066] uppercase tracking-wider">
              {t('common.adminBadge')} AREA
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {t('users.title')}
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            {t('users.subtitle')}
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:border-[#FF0066] transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
          Atualizar Lista
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('users.totalUsers')}</span>
            <Users className="w-4 h-4 text-[#FF0066]" />
          </div>
          <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{totalUsers}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('users.activeUsers')}</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{activeCount}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('users.adminUsers')}</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{adminCount}</span>
        </div>
      </div>

      {/* Domain Restrictions Settings Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#FF0066]/10 text-[#FF0066] rounded-xl">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('users.domainSettings')}
            </h3>
            <p className="text-xs text-slate-400">
              Restrinja os novos logins apenas aos domínios e e-mails autorizados
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="companyhero.com, finhero.com"
            className="flex-1 w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#FF0066]"
          />
          <button
            onClick={handleSaveDomains}
            disabled={savingDomains}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#FF0066] hover:bg-pink-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 shrink-0"
          >
            {domainSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {domainSuccess ? t('users.settingsUpdated') : t('users.saveDomainSettings')}
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('users.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#FF0066]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">{t('users.colName')}</th>
                <th className="py-3 px-4">{t('users.colEmail')}</th>
                <th className="py-3 px-4">{t('users.colRole')}</th>
                <th className="py-3 px-4">{t('users.colStatus')}</th>
                <th className="py-3 px-4 text-right">{t('users.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#FF0066]/10 text-[#FF0066] font-bold flex items-center justify-center text-xs">
                          {user.displayName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <span>{user.displayName || 'Usuário'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {user.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {user.role === 'admin' ? t('users.roleAdmin') : t('users.roleUser')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {user.status === 'active' ? t('users.statusActive') : t('users.statusInactive')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle Role Button */}
                        <button
                          onClick={() => handleToggleRole(user.uid, user.role)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#FF0066] text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-all"
                          title="Alterar Papel de Acesso"
                        >
                          {user.role === 'admin' ? t('users.makeUser') : t('users.makeAdmin')}
                        </button>

                        {/* Toggle Status Button */}
                        <button
                          onClick={() => handleToggleStatus(user.uid, user.status)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                            user.status === 'active'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                          }`}
                        >
                          {user.status === 'active' ? t('users.deactivateUser') : t('users.activateUser')}
                        </button>
                      </div>
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
};
