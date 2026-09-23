import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { LogIn, UserPlus, Sparkles, BookOpen, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      const res = await api.firebaseLogin(idToken);
      localStorage.setItem('aurastudy_token', res.access_token);
      localStorage.setItem('aurastudy_user', JSON.stringify(res.user));
      localStorage.removeItem('aurastudy_logged_out');
      setSuccessMsg('Đăng nhập Google thành công! Đang chuyển tiếp...');
      setTimeout(() => {
        onSuccess(res.user);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Không thể đăng nhập bằng tài khoản Google. Vui lòng thử lại.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSwitchMode = (registerMode: boolean) => {
    setIsRegister(registerMode);
    setError(null);
    setSuccessMsg(null);
    if (registerMode) {
      // Clear demo values so user can register normally with their own info
      if (email === 'student@aurastudy.edu.vn') setEmail('');
      if (password === 'Password123@') setPassword('');
      if (name === 'Nguyễn Văn Sinh Viên') setName('');
    } else {
      // In login mode, if empty, set demo credentials as convenience
      if (!email) setEmail('student@aurastudy.edu.vn');
      if (!password) setPassword('Password123@');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password;
    const trimmedName = name.trim();
    const trimmedSchool = school.trim();

    if (!trimmedEmail) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Địa chỉ email không đúng định dạng hợp lệ (vd: ten@email.com).');
      return;
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      setError('Mật khẩu phải có độ dài tối thiểu từ 6 ký tự trở lên.');
      return;
    }

    if (isRegister && !trimmedName) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register(trimmedName, trimmedEmail, trimmedPassword, trimmedSchool);
        localStorage.setItem('aurastudy_token', res.access_token);
        localStorage.setItem('aurastudy_user', JSON.stringify(res.user));
        localStorage.removeItem('aurastudy_logged_out');
        setSuccessMsg('Đăng ký tài khoản thành công! Đang chuyển tiếp...');
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 700);
      } else {
        const res = await api.login(trimmedEmail, trimmedPassword);
        localStorage.setItem('aurastudy_token', res.access_token);
        localStorage.setItem('aurastudy_user', JSON.stringify(res.user));
        localStorage.removeItem('aurastudy_logged_out');
        setSuccessMsg('Đăng nhập thành công! Đang chuyển tiếp...');
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra, vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setEmail('student@aurastudy.edu.vn');
    setPassword('Password123@');
    setError(null);
    setLoading(true);
    try {
      const res = await api.login('student@aurastudy.edu.vn', 'Password123@');
      localStorage.setItem('aurastudy_token', res.access_token);
      localStorage.setItem('aurastudy_user', JSON.stringify(res.user));
      localStorage.removeItem('aurastudy_logged_out');
      setSuccessMsg('Đã đăng nhập tài khoản sinh viên mẫu!');
      setTimeout(() => {
        onSuccess(res.user);
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Không thể đăng nhập tài khoản mẫu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div id="auth-modal-container" className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          id="close-auth-modal-btn"
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Đóng cửa sổ"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pr-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-200 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
              AuraStudy <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
            </h2>
            <p className="text-xs text-slate-500">
              {isRegister ? 'Đăng ký tài khoản học tập thông minh' : 'Hệ thống trợ lý học tập AI & Ôn thi trắc nghiệm'}
            </p>
          </div>
        </div>

        {/* Quick Demo Login Banner (shown in login mode) */}
        {!isRegister && (
          <div className="mb-4 p-3.5 bg-blue-50/80 border border-blue-100 rounded-xl flex items-center justify-between">
            <div className="text-xs text-blue-900">
              <p className="font-semibold text-blue-950">Tài khoản sinh viên mẫu:</p>
              <p className="text-blue-700">student@aurastudy.edu.vn</p>
            </div>
            <button
              id="quick-demo-login-btn"
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
            >
              Đăng nhập ngay
            </button>
          </div>
        )}

        {/* Google One-Click Login */}
        <div className="mb-4">
          <button
            id="auth-google-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium text-sm rounded-xl shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {googleLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <LogIn className="w-4 h-4 text-blue-600" />
            )}
            <span>Đăng nhập nhanh với Google</span>
          </button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs text-slate-400">
            <span className="bg-white px-2">hoặc bằng tài khoản email</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  id="auth-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trường đại học / Cao đẳng
                </label>
                <input
                  id="auth-school-input"
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Ví dụ: ĐH Bách Khoa, ĐH Quốc Gia..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email học tập <span className="text-rose-500">*</span>
            </label>
            <input
              id="auth-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenban@email.com"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu <span className="text-rose-500">*</span>
            </label>
            <input
              id="auth-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow-md shadow-orange-100 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" /> Đăng ký tài khoản
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Đăng nhập
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          {isRegister ? (
            <p>
              Đã có tài khoản?{' '}
              <button
                id="switch-to-login-btn"
                type="button"
                onClick={() => handleSwitchMode(false)}
                className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            </p>
          ) : (
            <p>
              Chưa có tài khoản?{' '}
              <button
                id="switch-to-register-btn"
                type="button"
                onClick={() => handleSwitchMode(true)}
                className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                Tạo tài khoản mới
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

