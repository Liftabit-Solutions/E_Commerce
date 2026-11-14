import React, { useState, useEffect } from 'react';
import { useApp } from '../../../core/context/AppContext';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Truck,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
// @ts-ignore
import { auth, googleProvider } from '../../../../firebase';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api').replace(/\/+$/, '');

interface LoginProps {
  initialTab?: 'signin' | 'signup';
}

const Login: React.FC<LoginProps> = ({ initialTab = 'signin' }) => {
  const { curUser, fetchCurrentUser, updateProfile, setCurPage, showToast } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(
    initialTab === 'signup' ? 'signup' : 'signin'
  );
  const [otpStep, setOtpStep] = useState<'send' | 'verify'>('send');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync mode when switching tabs
  useEffect(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setPhone('');
    setTermsAccepted(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [mode]);

  // If already authenticated, redirect to home
  useEffect(() => {
    if (curUser) {
      setCurPage('home');
    }
  }, [curUser, setCurPage]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await axios.post(
        `${API_BASE}/auth/send-otp`,
        { email: email.trim() }
      );
      setSuccessMsg(response.data?.message || '6-digit OTP verification code sent to your email.');
      setOtpStep('verify');
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await axios.post(
        `${API_BASE}/auth/verify-otp-reset-password`,
        {
          email: email.trim(),
          otp: otp.trim(),
          newPassword
        }
      );
      setSuccessMsg(response.data?.message || 'Password reset successfully! You can now sign in.');
      setTimeout(() => {
        setMode('signin');
        setOtpStep('send');
        setOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setErrorMsg(null);
        setSuccessMsg(null);
      }, 1800);
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (!email.trim()) {
        setErrorMsg('Please enter your email address.');
        return;
      }
      if (!phone.trim() || !/^\d{10}$/.test(phone.trim())) {
        setErrorMsg('Please enter a valid 10-digit mobile number.');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
      if (!termsAccepted) {
        setErrorMsg('Please accept the Terms of Service & Privacy Policy.');
        return;
      }
    } else {
      if (!email.trim()) {
        setErrorMsg('Please enter your email address.');
        return;
      }
      if (!password) {
        setErrorMsg('Please enter your password.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = result.user;
        const token = await user.getIdToken();

        const response = await axios.post(
          `${API_BASE}/auth/register`,
          {
            name: fullName.trim(),
            phone: phone.trim(),
            email: email.trim()
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            },
            withCredentials: true
          }
        );

        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        if (updateProfile) {
          try {
            await updateProfile({
              firstName,
              lastName,
              phoneNumber: phone.trim()
            });
          } catch (profErr) {
            console.warn('Profile update sync skipped:', profErr);
          }
        }

        await fetchCurrentUser(response.data.user);
        showToast('Account registered successfully!');
        setCurPage('home');
      } else {
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = result.user;
        const token = await user.getIdToken();

        let responseUser = null;
        try {
          const response = await axios.post(
            `${API_BASE}/auth/login`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`
              },
              withCredentials: true
            }
          );
          responseUser = response.data?.user;
        } catch (loginErr: any) {
          // Fall back to register (upsert) if login endpoint has a session cookie error or fails
          try {
            const fallbackRes = await axios.post(
              `${API_BASE}/auth/register`,
              { email: user.email },
              {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
              }
            );
            responseUser = fallbackRes.data?.user;
          } catch {
            throw loginErr;
          }
        }

        await fetchCurrentUser(responseUser);
        showToast('Signed in successfully.');
        setCurPage('home');
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.response?.data?.message || err.message || 'Authentication failed.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already in use. Please sign in.';
      } else if (
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential'
      ) {
        msg = 'Invalid email or password. Please verify your credentials or register a new account.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please try again in a few moments.';
      } else if (err.code === 'auth/popup-blocked') {
        msg = 'Sign-in popup was blocked by your browser. Please allow popups or sign in with email.';
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();

      let userData = null;
      try {
        // Use register (upsert) which safely handles both new and existing users
        const regRes = await axios.post(
          `${API_BASE}/auth/register`,
          {
            name: user.displayName || fullName.trim() || 'User',
            email: user.email || '',
            phone: user.phoneNumber || phone.trim() || ''
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }
        );
        userData = regRes.data?.user;
      } catch (regErr: any) {
        // Fallback to login endpoint if register endpoint fails
        try {
          const loginRes = await axios.post(
            `${API_BASE}/auth/login`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            }
          );
          userData = loginRes.data?.user;
        } catch {
          throw regErr;
        }
      }

      if (userData) {
        await fetchCurrentUser(userData);
      } else {
        await fetchCurrentUser();
      }

      showToast('Signed in with Google.');
      setCurPage('home');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        // user closed popup - do nothing
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('Sign-in popup was blocked by your browser. Please enable popups or sign in with email.');
      } else {
        setErrorMsg(err.response?.data?.message || err.message || 'Google sign-in was unsuccessful.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen lg:h-screen flex flex-col lg:flex-row bg-[#f7f6f2] text-[#262824] font-body selection:bg-[#262824] selection:text-white antialiased overflow-y-auto lg:overflow-hidden">
      {/* ─── LEFT COLUMN: Fused Static Hero Side (Hidden on Mobile/Responsive) ─── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] lg:h-full relative overflow-hidden flex-col justify-between lg:p-12 xl:p-14 select-none shrink-0 bg-[#eeede7]">
        
        {/* Full-Bleed Background Hero Image */}
        <img
          src="/customer_login_hero.jpg"
          alt="Curated Lifestyle & E-Commerce"
          className="absolute inset-0 w-full h-full object-cover object-center grayscale-[20%]"
        />

        {/* Fused Subtle Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#262824]/80 via-[#262824]/25 to-black/20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-transparent to-[#262824]/30 pointer-events-none" />

        {/* Top Minimal Brand Pill */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[2px] bg-[#f7f6f2]/90 backdrop-blur-xs border border-[#dfdfd8] text-[#262824] text-xs font-bold uppercase tracking-wider">
            <span className="font-display font-black tracking-widest text-[11px]">FORMA</span>
            <span className="text-[#777971] text-[10px]">•</span>
            <span className="text-[10px] text-[#777971]">Customer Portal</span>
          </div>
        </div>

        {/* Bottom Headline Content */}
        <div className="relative z-10 mt-auto pt-10 space-y-3 max-w-md">
          <h2 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-white tracking-tight leading-tight font-display drop-shadow-xs">
            Essentials designed with intention.
          </h2>
          <p className="text-xs sm:text-sm text-[#eeede7]/90 leading-relaxed font-normal">
            Sign in to track orders, manage saved delivery addresses, and experience effortless checkout.
          </p>

          {/* Minimal Assurance Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] bg-[#f7f6f2]/90 backdrop-blur-xs text-[#262824] text-[10px] font-bold uppercase tracking-wider">
              <Truck size={12} className="text-[#3d6547]" />
              <span>Complimentary Shipping</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] bg-[#f7f6f2]/90 backdrop-blur-xs text-[#262824] text-[10px] font-bold uppercase tracking-wider">
              <RotateCcw size={12} className="text-[#262824]" />
              <span>7-Day Return Window</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] bg-[#f7f6f2]/90 backdrop-blur-xs text-[#262824] text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck size={12} className="text-[#8c571e]" />
              <span>100% Authentic</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT COLUMN: Scrollable Form Console ─── */}
      <div className="w-full lg:w-[52%] xl:w-[50%] min-h-screen lg:h-full flex-1 flex flex-col justify-between px-4 sm:px-10 lg:px-14 xl:px-20 py-6 sm:py-10 lg:py-12 bg-[#f7f6f2] text-[#262824] overflow-y-auto">
        
        {/* Top Row: Back Navigation Button on the Right Side */}
        <div className="w-full max-w-[420px] mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurPage('home')}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#777971] hover:text-[#262824] transition-all cursor-pointer group py-1.5 px-3 rounded-[2px] bg-white border border-[#dfdfd8]"
            aria-label="Back to store"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform text-[#262824]" />
            <span>Back to Store</span>
          </button>

          <span className="text-[10px] font-bold tracking-wider uppercase text-[#3d6547] bg-[#edf3ee] px-2.5 py-0.5 rounded-[2px] border border-[#a8c6b0]">
            Encrypted
          </span>
        </div>

        {/* Center: Auth Form Container */}
        <div className="max-w-[420px] w-full mx-auto my-auto py-6">
          {/* Form Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#262824] font-display">
              {mode === 'signin' && 'Welcome back'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot' && 'Reset your password'}
            </h1>
            <p className="text-xs sm:text-sm text-[#777971] mt-1.5 leading-relaxed font-normal">
              {mode === 'signin' && 'Sign in to access your orders, track shipments, and manage account.'}
              {mode === 'signup' && 'Sign up in seconds for express one-click checkout and exclusive deals.'}
              {mode === 'forgot' && 'Enter your verified email to receive a 6-digit password recovery code.'}
            </p>
          </div>

          {/* Segmented Mode Tabs (Sign In vs Create Account) */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 p-1 bg-[#eeede7] rounded-[2px] mb-6 select-none border border-[#dfdfd8]">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`py-2 text-xs font-bold uppercase tracking-wider rounded-[2px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'signin'
                    ? 'bg-white text-[#262824] shadow-none'
                    : 'text-[#777971] hover:text-[#262824]'
                }`}
              >
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`py-2 text-xs font-bold uppercase tracking-wider rounded-[2px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'signup'
                    ? 'bg-white text-[#262824] shadow-none'
                    : 'text-[#777971] hover:text-[#262824]'
                }`}
              >
                <span>Create Account</span>
              </button>
            </div>
          )}

          {/* Error Alert Box */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-[2px] border border-[#d9a5a5] bg-[#f9eded] text-[#8e2a2a] text-xs flex items-start gap-3 animate-fadeIn">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8e2a2a] mt-1 shrink-0" />
              <span className="leading-snug font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Success Alert Box */}
          {successMsg && (
            <div className="mb-5 p-3.5 rounded-[2px] border border-[#a8c6b0] bg-[#edf3ee] text-[#3d6547] text-xs flex items-start gap-3 animate-fadeIn">
              <CheckCircle2 size={15} className="text-[#3d6547] shrink-0 mt-0.5" />
              <span className="leading-snug font-semibold">{successMsg}</span>
            </div>
          )}

          {/* ── Form: Forgot Password Flow ── */}
          {mode === 'forgot' ? (
            <div className="space-y-4 animate-fadeIn">
              {otpStep === 'send' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#777971] block">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777971] pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full border border-[#dfdfd8] bg-white rounded-[2px] px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-[#262824] min-h-[42px] outline-none focus:border-[#262824] transition-all placeholder:text-[#777971]/50 font-medium"
                      />
                    </div>
                    <span className="text-[11px] text-[#777971] mt-1 block">
                      We will dispatch a secure 6-digit OTP code to verify your account.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full min-h-[44px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {isLoading ? <Loader2 size={15} className="animate-spin" /> : 'Send Verification OTP'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="w-full text-center text-xs font-bold text-[#777971] hover:text-[#262824] transition-colors pt-2 cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft size={13} /> Back to Sign In
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpAndResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#777971] block">
                      6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="w-full border border-[#dfdfd8] bg-white rounded-[2px] px-3.5 py-2.5 text-sm text-[#262824] min-h-[42px] outline-none focus:border-[#262824] transition-all text-center font-mono text-xl tracking-[0.3em] font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#777971] block">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777971] pointer-events-none" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        className="w-full border border-[#dfdfd8] bg-white rounded-[2px] px-3.5 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-[#262824] min-h-[42px] outline-none focus:border-[#262824] transition-all placeholder:text-[#777971]/50 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777971] hover:text-[#262824] cursor-pointer p-1"
                      >
                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#777971] block">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      className="w-full border border-[#dfdfd8] bg-white rounded-[2px] px-3.5 py-2.5 text-xs sm:text-sm text-[#262824] min-h-[42px] outline-none focus:border-[#262824] transition-all placeholder:text-[#777971]/50 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full min-h-[44px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 size={15} className="animate-spin" /> : 'Confirm & Reset Password'}
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep('send');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="font-bold text-[#777971] hover:text-[#262824] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft size={13} /> Change Email
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleSendOtp}
                      className="font-bold text-[#262824] hover:underline cursor-pointer"
                    >
                      Resend OTP Code
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* ── Form: Sign In & Sign Up ── */
            <form onSubmit={handleEmailAuth} className="space-y-4 animate-fadeIn">
              {mode === 'signup' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#777971] block">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777971] pointer-events-none" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Priya Sharma"
                        required
                        className="w-full border border-[#dfdfd8] bg-white rounded-[2px] px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-[#262824] min-h-[42px] outline-none focus:border-[#262824] transition-all placeholder:text-[#777971]/50 font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#777971] block">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777971] pointer-events-none" />
                      <input
                        type="tel"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        required
                        className="w-full border border-[#dfdfd8] bg-white rounded-[2px] px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-[#262824] min-h-[42px] outline-none focus:border-[#262824] transition-all placeholder:text-[#777971]/50 font-medium font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[#777971] block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777971] pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full border border-[#dfdfd8] bg-white rounded-[2px] px-3.5 py-2.5 pl-10 text-xs sm:text-sm text-[#262824] min-h-[42px] outline-none focus:border-[#262824] transition-all placeholder:text-[#777971]/50 font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#777971] block">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setOtpStep('send');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs font-bold text-[#777971] hover:text-[#262824] transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777971] pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full border border-[#dfdfd8] bg-white rounded-[2px] px-3.5 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-[#262824] min-h-[42px] outline-none focus:border-[#262824] transition-all placeholder:text-[#777971]/50 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777971] hover:text-[#262824] cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password on Signup */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[#777971] block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777971] pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full border border-[#dfdfd8] bg-white rounded-[2px] px-3.5 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-[#262824] min-h-[42px] outline-none focus:border-[#262824] transition-all placeholder:text-[#777971]/50 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777971] hover:text-[#262824] cursor-pointer p-1"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Checkboxes */}
              {mode === 'signin' ? (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-[2px] border-[#dfdfd8] text-[#262824] focus:ring-0 cursor-pointer accent-[#262824]"
                    />
                    <span className="text-xs text-[#777971]">Remember this device</span>
                  </label>
                </div>
              ) : (
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded-[2px] border-[#dfdfd8] text-[#262824] focus:ring-0 cursor-pointer accent-[#262824]"
                    />
                    <span className="text-xs text-[#777971] leading-normal font-normal">
                      I agree to the{' '}
                      <span className="underline text-[#262824] font-bold hover:text-black">
                        Terms of Service
                      </span>{' '}
                      and{' '}
                      <span className="underline text-[#262824] font-bold hover:text-black">
                        Privacy Policy
                      </span>
                      .
                    </span>
                  </label>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full min-h-[44px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In' : 'Complete Registration'}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-5 select-none">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#dfdfd8]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-[#f7f6f2] px-3 text-[#777971] font-bold tracking-wider">Or continue with</span>
                </div>
              </div>

              {/* Google Auth Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full min-h-[42px] bg-white border border-[#dfdfd8] hover:bg-[#eeede7] text-[#262824] rounded-[2px] text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Demo Notice for Customer */}
              {mode === 'signin' && (
                <div className="pt-2 text-center">
                  <p className="text-[10px] text-[#777971] font-mono">
                    Demo credentials pre-filled for instant access
                  </p>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Bottom Sub-Footer */}
        <div className="w-full max-w-[420px] mx-auto text-center pt-4 border-t border-[#dfdfd8] text-[10px] text-[#777971] flex items-center justify-between uppercase tracking-wider">
          <span>FORMA Studio</span>
          <span>Verified Security</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
