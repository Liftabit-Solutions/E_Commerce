import React, { useState, useEffect } from 'react';
import { useApp } from '../../core/context/AppContext';
import { X, ShieldAlert, Eye, EyeOff, Mail, Lock, ShieldCheck } from 'lucide-react';
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
// @ts-ignore
import { auth, googleProvider } from "../../../firebase";
import axios from 'axios';

const BACKEND_URI = (import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api').replace(/\/+$/, '');

const AuthModal: React.FC = () => {
  const { authModalOpen, closeAuthModal, fetchCurrentUser } = useApp();

  const [email, setEmail] = useState('admin@ecommerce.com');
  const [password, setPassword] = useState('admin123');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Escape key down to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAuthModal();
      }
    };
    if (authModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [authModalOpen, closeAuthModal]);

  // Reset error when opened
  useEffect(() => {
    if (authModalOpen) {
      setErrorMsg(null);
      setEmail('admin@ecommerce.com');
      setPassword('admin123');
    }
  }, [authModalOpen]);

  if (!authModalOpen) return null;

  const handleAdminEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const token = await user.getIdToken();
      console.log("Firebase Access Token:", token);
      
      const response = await axios.post(
        `${BACKEND_URI}/auth/admin/login`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      await fetchCurrentUser(response.data.user);
      setIsLoading(false);
      closeAuthModal();
    } catch (error: any) {
      console.error(error);
      let friendlyMessage = error.message;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        friendlyMessage = 'Invalid administrative credentials. Please verify and try again.';
      }
      setErrorMsg(friendlyMessage);
      setIsLoading(false);
    }
  };

  const handleAdminGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();
      console.log("Firebase Access Token:", token);
      
      const response = await axios.post(
        `${BACKEND_URI}/auth/admin/login`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      await fetchCurrentUser(response.data.user);
      setIsLoading(false);
      closeAuthModal();
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message);
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeAuthModal();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-blk/75 backdrop-blur-md z-[9990] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-wht rounded-2xl w-full max-w-[800px] shadow-premium-xl relative border border-bdrl overflow-hidden flex flex-col md:grid md:grid-cols-5 my-auto animate-slideUp">
        
        {/* Left Column - Enterprise Admin Security Panel */}
        <div className="bg-blk text-wht p-8 md:col-span-2 flex flex-col justify-between relative select-none">
          {/* Futuristic security glow effects */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-primary-hover/20 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-44 h-44 bg-red/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          {/* Admin Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded border border-wht/10 flex items-center justify-center bg-wht/5">
                <ShieldCheck className="text-primary-light" size={16} />
              </div>
              <span className="font-display font-bold text-sm tracking-widest uppercase">
                Console <span className="text-primary-light font-light font-display">Control</span>
              </span>
            </div>

            <h3 className="font-display text-xl font-bold mb-4 leading-snug tracking-tight">
              Administrative Control Panel
            </h3>
            <p className="text-xs text-mut leading-relaxed mb-6">
              Access the system management suite to coordinate ecological formulation data, view lead metrics, audit database logs, and regulate banners.
            </p>
          </div>

          {/* Security Features */}
          <div className="relative z-10 space-y-4 my-6 hidden md:block border-t border-b border-wht/10 py-5">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-wht/5 flex items-center justify-center text-primary-light">
                <Lock size={12} />
              </div>
              <div className="text-[0.7rem] text-mut">
                <p className="font-bold text-wht">Token Encrypted Session</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-wht/5 flex items-center justify-center text-primary-light">
                <ShieldAlert size={12} />
              </div>
              <div className="text-[0.7rem] text-mut">
                <p className="font-bold text-wht">Audited Access Logging</p>
              </div>
            </div>
          </div>

          {/* Footer Security Disclaimer */}
          <div className="relative z-10 text-[0.65rem] text-mut leading-normal bg-wht/5 border border-wht/10 p-3 rounded-lg flex flex-col gap-1">
            <span className="font-bold text-red uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert size={10} /> Notice
            </span>
            Authorized administrative personnel only. All access attempts are recorded.
          </div>
        </div>

        {/* Right Column - Login credentials input */}
        <div className="p-8 sm:p-10 md:p-12 md:col-span-3 flex flex-col justify-center relative bg-wht">
          {/* Close button */}
          <button
            className="absolute top-5 right-5 w-8 h-8 rounded-full border border-bdrl flex items-center justify-center text-mut hover:bg-sur hover:text-ink transition-all duration-200 ease-out bg-transparent cursor-pointer"
            onClick={closeAuthModal}
            aria-label="Close modal"
          >
            <X size={15} />
          </button>

          <div className="mb-6 select-none">
            <h2 className="font-display text-xl font-bold text-blk tracking-tight uppercase">
              System Admin Sign In
            </h2>
            <p className="text-xs text-mut mt-1 leading-normal">
              Enter your secure administrative credentials to unlock console systems.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-bg border border-red/10 rounded-lg p-3 text-[0.78rem] text-red mb-4 animate-fadeIn font-semibold">
              {errorMsg}
            </div>
          )}

          <form className="flex flex-col gap-4" onSubmit={handleAdminEmailLogin}>
            {/* Email field */}
            <div className="flex flex-col gap-1 select-none">
              <label className="text-[0.64rem] font-bold uppercase tracking-wider text-mut flex items-center gap-1.5">
                <Mail size={10} className="text-primary" />
                Administrative Email
              </label>
              <input
                className="input-field mt-1 border-blk/10 focus:border-blk focus:ring-blk/5 font-mono text-xs"
                type="email"
                placeholder="admin@ecommerce.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1 select-none">
              <label className="text-[0.64rem] font-bold uppercase tracking-wider text-mut flex items-center gap-1.5">
                <Lock size={10} className="text-primary" />
                Security Password
              </label>
              <div className="relative mt-1">
                <input
                  className="input-field border-blk/10 focus:border-blk focus:ring-blk/5 font-mono text-xs pr-10"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mut hover:text-ink cursor-pointer border-none bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember Me / Forgot Password */}
            <div className="flex items-center justify-between text-xs mt-1 select-none">
              <label className="flex items-center gap-2 text-ink font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-bdr text-blk focus:ring-blk w-4 h-4 cursor-pointer"
                />
                Remember Session
              </label>
              <button
                type="button"
                onClick={() => alert("Please contact the Super Administrator to trigger a security password reset.")}
                className="text-mut hover:text-blk font-semibold bg-transparent border-none outline-none cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Secure Sign In Button */}
            <button
              className="w-full bg-indigo-600 text-white rounded-xl py-3 text-xs font-bold cursor-pointer transition-all duration-200 mt-2 text-center hover:bg-indigo-700 active:scale-[0.98] shadow-xs flex items-center justify-center gap-2 uppercase tracking-wider"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying Identity...
                </>
              ) : (
                'Secure Log In'
              )}
            </button>

            {/* Google OAuth Login */}
            <button
              type="button"
              onClick={handleAdminGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border border-bdr bg-wht text-blk hover:bg-sur hover:border-mid transition-all duration-200 cursor-pointer font-semibold text-xs shadow-premium-sm"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" width="16" height="16">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Enterprise Google SSO
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default AuthModal;
