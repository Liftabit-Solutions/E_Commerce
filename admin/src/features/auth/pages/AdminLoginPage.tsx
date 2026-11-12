import React, { useState } from 'react';
import { useApp } from '../../../core/context/AppContext';
import { 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Loader2, 
  ArrowLeft, 
  CheckCircle2,
  KeyRound,
  Store
} from 'lucide-react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
// @ts-ignore
import { auth } from '../../../../firebase';
import axios from 'axios';

const AdminLoginPage: React.FC = () => {
  const { fetchCurrentUser, showToast } = useApp();

  const [authMode, setAuthMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleAdminEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your work email and password.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = result.user;
      const token = await user.getIdToken();
      
      const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
      const response = await axios.post(
        `${backendUrl}/auth/admin/login`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      if (response.data && response.data.user) {
        await fetchCurrentUser(response.data.user);
        showToast('Successfully authenticated as Administrator.');
      } else {
        setErrorMsg('User account does not have administrative privileges.');
      }
      setIsLoading(false);
    } catch (error: any) {
      console.error('Admin login error:', error);
      let friendlyMessage = error.message;
      if (
        error.code === 'auth/invalid-credential' || 
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/user-not-found'
      ) {
        friendlyMessage = 'Invalid administrative email or password. Please verify and try again.';
      } else if (error.response?.data?.message) {
        friendlyMessage = error.response.data.message;
      }
      setErrorMsg(friendlyMessage);
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your registered admin email address.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      setIsLoading(false);
      showToast('Password reset link sent to your email.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      let friendlyMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        friendlyMessage = 'No registered administrator account found with this email.';
      }
      setErrorMsg(friendlyMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Background Decorative subtle grid */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03]" 
        style={{
          backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Bar Minimal Branding */}
      <header className="w-full px-6 py-5 flex items-center justify-between border-b border-slate-200/80 bg-white/70 backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Store size={16} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm text-slate-900 tracking-tight">Ecommerce</span>
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
              Admin Panel
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span className="hidden sm:inline">Secure Admin Authentication</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-[400px] animate-fadeIn">
          {/* Card Container */}
          <div className="bg-white border border-slate-200/90 rounded-[10px] shadow-sm p-6 sm:p-8">
            {authMode === 'login' ? (
              <div>
                {/* Header */}
                <div className="mb-6">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">
                    Admin Sign In
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Enter your credentials to access the store management dashboard.
                  </p>
                </div>

                {/* Error Alert Box */}
                {errorMsg && (
                  <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
                    <ShieldAlert size={15} className="text-rose-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{errorMsg}</span>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleAdminEmailLogin} className="space-y-4">
                  {/* Work Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="email"
                        required
                        placeholder="admin@ecommerce.com"
                        className="w-full bg-white border border-slate-200 rounded-md pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition-colors min-h-[40px]"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setAuthMode('forgot');
                          setResetSent(false);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        className="w-full bg-white border border-slate-200 rounded-md pl-10 pr-10 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition-colors min-h-[40px]"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                      />
                      <span>Keep me signed in</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold tracking-wide shadow-xs transition-colors cursor-pointer min-h-[40px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>
                </form>

                {/* Pre-filled Credentials Note */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-md border border-slate-200/60">
                  <span className="font-medium text-slate-600">Demo Access:</span>
                  <span className="font-mono text-slate-500">admin@ecommerce.com / admin123</span>
                </div>
              </div>
            ) : (
              /* Forgot Password Screen */
              <div className="animate-fadeIn">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setAuthMode('login');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer mb-5 transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>

                <div className="mb-6">
                  <div className="w-9 h-9 rounded-md bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-3">
                    <KeyRound size={18} />
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display">
                    Reset Password
                  </h1>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Enter your work email address to receive password reset instructions.
                  </p>
                </div>

                {resetSent ? (
                  <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-3 animate-fadeIn">
                    <div className="flex items-center gap-2 font-bold text-emerald-900">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Reset Link Dispatched</span>
                    </div>
                    <p className="text-emerald-700 leading-relaxed">
                      Instructions have been sent to <strong className="text-slate-900 font-mono">{email}</strong>. Please check your inbox and spam folder.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setResetSent(false);
                      }}
                      className="w-full mt-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold cursor-pointer transition-colors text-center"
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    {errorMsg && (
                      <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-fadeIn">
                        <ShieldAlert size={15} className="text-rose-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{errorMsg}</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="email"
                          required
                          placeholder="admin@ecommerce.com"
                          className="w-full bg-white border border-slate-200 rounded-md pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/20 transition-colors min-h-[40px]"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold tracking-wide shadow-xs transition-colors cursor-pointer min-h-[40px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Sending link...</span>
                        </>
                      ) : (
                        <span>Send Reset Link</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 px-6 border-t border-slate-200/80 bg-white/50 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 z-10">
        <span>© {new Date().getFullYear()} Ecommerce Platform. All rights reserved.</span>
        <span className="text-[11px] font-mono text-slate-400">256-Bit SSL Encrypted Admin Console</span>
      </footer>
    </div>
  );
};

export default AdminLoginPage;
