import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, ChevronDown, Globe2, LogIn, LogOut, LoaderCircle, Settings, X } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';
import { Language, translate } from '../i18n';

interface NavbarProps {
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenAuth, onLogout, onUserUpdated }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [language, setLanguage] = useState<Language>(user?.language === 'en' ? 'en' : 'vi');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  useEffect(() => {
    setName(user?.name || '');
    setLanguage(user?.language === 'en' ? 'en' : 'vi');
  }, [user?.id, user?.name, user?.language]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('');
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const openSettings = () => {
    setMenuOpen(false);
    setName(user?.name || '');
    setLanguage(user?.language === 'en' ? 'en' : 'vi');
    setAvatarFile(null);
    setError('');
    setSettingsOpen(true);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError(language === 'en' ? 'Enter your name.' : 'Vui lòng nhập họ tên.');
    setSaving(true);
    setError('');
    try {
      const updatedUser = await api.updateProfile({ full_name: name.trim(), language, avatar: avatarFile });
      onUserUpdated(updatedUser);
      localStorage.setItem('aurastudy_user', JSON.stringify(updatedUser));
      setSettingsOpen(false);
      setAvatarFile(null);
    } catch (err: any) {
      setError(err?.message || (language === 'en' ? 'Could not update your profile.' : 'Không thể cập nhật hồ sơ.'));
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = avatarPreview || user?.avatar_url;

  return (
    <>
      <header id="app-navbar" className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex items-center space-x-3">
          <img src="/assets/aurastudy-logo.png" alt="AuraStudy" className="h-10 w-10 shrink-0 object-contain" />
          <div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">AuraStudy</span>
            <p className="hidden text-[11px] text-slate-500 sm:block">{t('subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                id="account-menu-trigger"
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/60 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                {currentAvatar ? (
                  <img src={currentAvatar} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{(user.name || 'U').charAt(0).toUpperCase()}</span>
                )}
                <span className="hidden max-w-36 sm:block">
                  <span className="block truncate text-xs font-semibold leading-tight text-slate-800">{user.name}</span>
                  <span className="block truncate text-[10px] leading-tight text-slate-500">{user.email}</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div role="menu" className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
                  <div className="flex items-center gap-3 px-3 py-3">
                    {currentAvatar ? <img src={currentAvatar} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{(user.name || 'U').charAt(0).toUpperCase()}</span>}
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{user.name}</span><span className="block truncate text-xs text-slate-500">{user.email}</span></span>
                  </div>
                  <div className="my-1 border-t border-slate-100" />
                  <button role="menuitem" onClick={openSettings} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Settings className="h-4 w-4 text-slate-500" /> {t('profile')}
                  </button>
                  <button role="menuitem" onClick={() => { setMenuOpen(false); onLogout(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> {t('logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button id="open-login-btn" onClick={onOpenAuth} className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700">
              <LogIn className="h-3.5 w-3.5" /><span>{t('login')}</span>
            </button>
          )}
        </div>
      </header>

      {settingsOpen && user && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSettingsOpen(false); }}>
          <form onSubmit={saveProfile} role="dialog" aria-modal="true" aria-labelledby="profile-settings-title" className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><div className="mb-1 flex items-center gap-2 text-sm font-semibold text-blue-700"><Settings className="h-4 w-4" /> {t('account')}</div><h2 id="profile-settings-title" className="text-xl font-bold text-slate-900">{t('profileTitle')}</h2><p className="mt-1 text-sm text-slate-500">{t('profileSubtitle')}</p></div>
              <button type="button" onClick={() => setSettingsOpen(false)} disabled={saving} aria-label={t('cancel')} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">{error}</div>}

            <div className="mb-6 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
              {currentAvatar ? <img src={currentAvatar} alt="" className="h-16 w-16 rounded-full object-cover ring-4 ring-white shadow-sm" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700 ring-4 ring-white">{(user.name || 'U').charAt(0).toUpperCase()}</span>}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{t('avatar')}</p>
                <label className="mt-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:text-blue-700">
                  <Camera className="h-4 w-4" /> {t('changeAvatar')}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 3 * 1024 * 1024) { setError(language === 'en' ? 'Image must be 3 MB or smaller.' : 'Ảnh phải có dung lượng tối đa 3 MB.'); return; }
                    setError(''); setAvatarFile(file);
                  }} />
                </label>
                <p className="mt-1.5 text-[11px] text-slate-400">{t('avatarHint')}</p>
              </div>
            </div>

            <label className="mb-4 block text-sm font-semibold text-slate-700">{t('fullName')}<input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></label>
            <label className="mb-4 block text-sm font-semibold text-slate-700">{t('email')}<input value={user.email} disabled className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 font-normal text-slate-500" /></label>
            <label className="block text-sm font-semibold text-slate-700"><span className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-slate-400" />{t('language')}</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"><option value="vi">{t('viName')}</option><option value="en">{t('enName')}</option></select>
            </label>

            <div className="mt-7 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setSettingsOpen(false)} disabled={saving} className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">{t('cancel')}</button>
              <button type="submit" disabled={saving || !name.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{saving ? t('saving') : t('save')}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
