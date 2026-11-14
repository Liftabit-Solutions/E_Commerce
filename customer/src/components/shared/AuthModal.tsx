import React, { useState, useEffect } from 'react';
import { useApp } from '../../core/context/AppContext';
import { X, Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle, Shield, KeyRound } from 'lucide-react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
// @ts-ignore
import { auth, googleProvider } from "../../../firebase";
import axios from 'axios';
import { getStoreProfile } from '../../utils/storeSettings';
import type { StoreProfile } from '../../utils/storeSettings';

const API_BASE = (import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api').replace(/\/+$/, '');

const AuthModal: React.FC = () => {
  const { authModalOpen, authModalTab, closeAuthModal, fetchCurrentUser, updateProfile } = useApp();

  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
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
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(getStoreProfile());

  useEffect(() => {
    const handleProfileUpdate = () => {
      setStoreProfile(getStoreProfile());
    };
    window.addEventListener('store_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('store_profile_updated', handleProfileUpdate);
  }, []);

  // Sync tab state from context
  useEffect(() => {
    setIsRegister(authModalTab === 'signup');
    setIsForgotPassword(false);
    setOtpStep('send');
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [authModalTab, authModalOpen]);

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

  // Set default values for testing ease
  useEffect(() => {
    if (authModalOpen) {
      if (!isRegister && !isForgotPassword) {
        setEmail('customer@ecommerce.com');
        setPassword('customer123');
      } else {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setPhone('');
        setTermsAccepted(false);
      }
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isRegister, isForgotPassword, authModalOpen]);

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
      setSuccessMsg(response.data.message || '6-digit OTP code sent to your email!');
      setOtpStep('verify');
      setIsLoading(false);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || error.message || 'Failed to send OTP.';
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit OTP code.');
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
          newPassword,
        }
      );
      setSuccessMsg(response.data.message || 'Password reset successful!');
      setIsLoading(false);
      setTimeout(() => {
        setIsForgotPassword(false);
        setOtpStep('send');
        setOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setPassword(newPassword);
      }, 1500);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || error.message || 'Failed to reset password.';
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  if (!authModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
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
      let responseUser = null;
      try {
        const response = await axios.post(
          `${API_BASE}/auth/login`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
          }
        );
        responseUser = response.data?.user;
      } catch (loginErr: any) {
        // Fall back to register (upsert) which safely returns existing user
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
      setIsLoading(false);
      closeAuthModal();
    } catch (error: any) {
      console.error(error);
      let friendlyMessage = error.message;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        friendlyMessage = 'Invalid email or password. Please try again.';
      }
      setErrorMsg(friendlyMessage);
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please enter your phone number.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!termsAccepted) {
      setErrorMsg('You must agree to the Terms and Conditions.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const token = await user.getIdToken();
      console.log("Firebase Access Token:", token);

      // Create user entry in DB with form data in body
      await axios.post(
        `${API_BASE}/auth/register`,
        {
          name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      // Extract first/last name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // Sync name & phone directly to profile
      await updateProfile({
        firstName,
        lastName,
        phoneNumber: phone.trim(),
      });

      setIsLoading(false);
      alert("Registration Successful!");
      closeAuthModal();
    } catch (error: any) {
      console.error(error);
      let friendlyMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email address is already in use.';
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = 'The password must be at least 6 characters long.';
      } else if (error.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid email or password. Please verify your credentials.';
      }
      setErrorMsg(friendlyMessage);
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();
      console.log("Firebase Access Token:", token);
      
      let userData = null;
      try {
        // Register endpoint performs upsert: returns HTTP 200 for existing user or 201 for new user
        const regRes = await axios.post(
          `${API_BASE}/auth/register`,
          {
            name: user.displayName || fullName.trim() || "User",
            email: user.email || "",
            phone: user.phoneNumber || phone.trim() || "",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
        userData = regRes.data?.user;
      } catch (regErr: any) {
        try {
          const loginRes = await axios.post(
            `${API_BASE}/auth/login`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true,
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

      setIsLoading(false);
      closeAuthModal();
    } catch (error: any) {
      console.error("Google Auth error:", error);
      let friendlyMessage = error.message;
      if (error.code === 'auth/popup-closed-by-user') {
        friendlyMessage = 'Sign-in popup was closed before completing.';
      } else if (error.code === 'auth/popup-blocked') {
        friendlyMessage = 'Sign-in popup was blocked by your browser. Please enable popups or sign in with email.';
      }
      setErrorMsg(friendlyMessage);
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
      className="fixed inset-0 bg-[#262824]/60 backdrop-blur-xs z-[9990] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn select-none"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-[2px] w-full max-w-[840px] shadow-2xl relative border border-[#dfdfd8] overflow-hidden flex flex-col md:grid md:grid-cols-5 my-auto animate-scaleIn max-h-[90vh] md:max-h-none">
        
        {/* Left Column - FORMA Editorial Sidebar (Hidden on Mobile/Responsive) */}
        <div className="hidden md:flex bg-[#eeede7] text-[#262824] p-6 sm:p-8 md:col-span-2 flex-col justify-between relative overflow-hidden select-none shrink-0 border-b md:border-b-0 md:border-r border-[#dfdfd8]">
          {/* Header Brand */}
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 sm:mb-8">
              {storeProfile.logo ? (
                <img
                  src={storeProfile.logo}
                  alt={storeProfile.storeName || 'Store'}
                  className="w-7 h-7 object-contain rounded-[2px]"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-[2px] text-white flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: storeProfile.brandColor || '#262824' }}
                >
                  {(storeProfile.storeName || 'F').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-display text-xl font-bold tracking-tight text-[#262824]">
                {storeProfile.storeName || 'FORMA'}
              </span>
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-bold mb-2 sm:mb-3 leading-snug tracking-tight text-[#262824]">
              {isRegister ? "Join Our Community" : "Curated for Modern Living"}
            </h3>
            <p className="text-xs text-[#777971] leading-relaxed mb-4 sm:mb-6">
              Experience the standard in curated essentials. Premium quality products designed for intentional living and everyday reliability.
            </p>
          </div>

          {/* Graphic / Benefit List */}
          <div className="relative z-10 space-y-4 my-6 hidden md:block">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-[#777d62] mt-0.5 shrink-0" size={15} />
              <div className="text-[0.74rem]">
                <p className="font-bold text-[#262824]">100% Genuine Products</p>
                <p className="text-[#777971]">Quality tested inventory directly from verified suppliers.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="text-[#777d62] mt-0.5 shrink-0" size={15} />
              <div className="text-[0.74rem]">
                <p className="font-bold text-[#262824]">Secure Transactions</p>
                <p className="text-[#777971]">Safe and protected payment options on every order.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="text-[#777d62] mt-0.5 shrink-0" size={15} />
              <div className="text-[0.74rem]">
                <p className="font-bold text-[#262824]">Express Nationwide Delivery</p>
                <p className="text-[#777971]">Fast, tracked dispatch right to your doorstep.</p>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="relative z-10 text-[0.68rem] text-[#777971] flex items-center gap-1.5 pt-3 border-t border-[#dfdfd8] hidden sm:flex">
            <Shield size={12} className="text-[#777d62]" />
            Encrypted customer account access
          </div>
        </div>

        {/* Right Column - Authentication Forms */}
        <div className="p-6 sm:p-8 md:p-10 md:col-span-3 flex flex-col justify-center relative overflow-y-auto max-h-[75vh] md:max-h-none bg-white">
          {/* Close button */}
          <button
            className="absolute top-4 right-4 w-8 h-8 rounded-[2px] border border-[#dfdfd8] flex items-center justify-center text-[#777971] hover:bg-[#eeede7] hover:text-[#262824] transition-all bg-transparent cursor-pointer"
            onClick={closeAuthModal}
            aria-label="Close modal"
          >
            <X size={15} />
          </button>

          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-[#262824] tracking-tight">
              {isForgotPassword 
                ? "Reset Your Password" 
                : isRegister 
                  ? "Create Account" 
                  : "Welcome Back"}
            </h2>
            <p className="text-xs text-[#777971] mt-1">
              {isForgotPassword
                ? "Enter your registered email address below to receive a password reset link."
                : isRegister 
                  ? "Register below to purchase products and track your order history." 
                  : "Enter your customer credentials below to access your account."}
            </p>
          </div>

          {errorMsg && (
            <div className="bg-[#f9eded] border border-[#d9a5a5] rounded-[2px] p-3 text-[0.8rem] text-[#8e2a2a] mb-4 animate-fadeIn font-semibold">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-[#edf3ee] border border-[#a8c6b0] rounded-[2px] p-3 text-[0.8rem] text-[#3d6547] mb-4 animate-fadeIn font-semibold">
              {successMsg}
            </div>
          )}

          <form 
            className="flex flex-col gap-4" 
            onSubmit={
              isForgotPassword 
                ? (otpStep === 'send' ? handleSendOtp : handleVerifyOtpAndResetPassword)
                : isRegister 
                  ? handleEmailRegister 
                  : handleLoginSubmit
            }
          >
            {isForgotPassword ? (
              otpStep === 'send' ? (
                <>
                  {/* Email field */}
                  <div className="flex flex-col gap-1 select-none">
                    <label className="text-[0.66rem] font-bold uppercase tracking-wider text-[#777971] flex items-center gap-1">
                      <Mail size={11} className="text-[#262824]" />
                      Registered Email Address <span className="text-[#8e2a2a]">*</span>
                    </label>
                    <input
                      className="w-full border border-[#dfdfd8] bg-[#f7f6f2] rounded-[2px] px-3.5 py-2.5 text-xs text-[#262824] focus:outline-none focus:border-[#262824]"
                      type="email"
                      placeholder="email@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Form Submit Button */}
                  <button
                    className="btn-primary w-full min-h-[42px] text-xs font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending OTP...' : 'Send 6-Digit OTP'}
                  </button>

                  {/* Back to Sign In button */}
                  <div className="text-center mt-3 select-none">
                    <button
                      type="button"
                      className="text-xs text-[#777971] hover:text-[#262824] hover:underline cursor-pointer bg-transparent border-none outline-none font-bold"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setOtpStep('send');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* 6-Digit OTP field */}
                  <div className="flex flex-col gap-1 select-none">
                    <label className="text-[0.66rem] font-bold uppercase tracking-wider text-[#777971] flex items-center gap-1">
                      <KeyRound size={11} className="text-[#262824]" />
                      Enter 6-Digit OTP Code <span className="text-[#8e2a2a]">*</span>
                    </label>
                    <input
                      className="w-full border border-[#dfdfd8] bg-[#f7f6f2] rounded-[2px] px-3.5 py-2.5 tracking-widest font-mono text-center text-lg font-bold text-[#262824] focus:outline-none focus:border-[#262824]"
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                  </div>

                  {/* New Password field */}
                  <div className="flex flex-col gap-1 select-none">
                    <label className="text-[0.66rem] font-bold uppercase tracking-wider text-[#777971] flex items-center gap-1">
                      <Lock size={11} className="text-[#262824]" />
                      New Password <span className="text-[#8e2a2a]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        className="w-full border border-[#dfdfd8] bg-[#f7f6f2] rounded-[2px] px-3.5 py-2.5 pr-10 text-xs text-[#262824] focus:outline-none focus:border-[#262824]"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777971] hover:text-[#262824] cursor-pointer border-none bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password field */}
                  <div className="flex flex-col gap-1 select-none">
                    <label className="text-[0.66rem] font-bold uppercase tracking-wider text-[#777971] flex items-center gap-1">
                      <Lock size={11} className="text-[#262824]" />
                      Confirm New Password <span className="text-[#8e2a2a]">*</span>
                    </label>
                    <input
                      className="w-full border border-[#dfdfd8] bg-[#f7f6f2] rounded-[2px] px-3.5 py-2.5 text-xs text-[#262824] focus:outline-none focus:border-[#262824]"
                      type="password"
                      placeholder="Re-enter new password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    className="btn-primary w-full min-h-[42px] text-xs font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Verifying & Updating...' : 'Verify OTP & Change Password'}
                  </button>

                  <div className="flex items-center justify-between mt-3 text-xs">
                    <button
                      type="button"
                      className="text-[#777971] hover:text-[#262824] cursor-pointer bg-transparent border-none outline-none font-medium"
                      onClick={handleSendOtp}
                    >
                      Resend OTP Code
                    </button>

                    <button
                      type="button"
                      className="text-[#262824] hover:underline cursor-pointer bg-transparent border-none outline-none font-bold"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setOtpStep('send');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </>
              )
            ) : (
              <>
                {isRegister && (
                  <>
                    {/* Full Name field */}
                    <div className="flex flex-col gap-1 select-none">
                      <label className="text-[0.66rem] font-bold uppercase tracking-wider text-[#777971] flex items-center gap-1">
                        <User size={11} className="text-[#262824]" />
                        Full Name <span className="text-[#8e2a2a]">*</span>
                      </label>
                      <input
                        className="w-full border border-[#dfdfd8] bg-[#f7f6f2] rounded-[2px] px-3.5 py-2.5 text-xs text-[#262824] focus:outline-none focus:border-[#262824]"
                        type="text"
                        placeholder="Your Full Name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>

                    {/* Phone Number field */}
                    <div className="flex flex-col gap-1 select-none">
                      <label className="text-[0.66rem] font-bold uppercase tracking-wider text-[#777971] flex items-center gap-1">
                        <Phone size={11} className="text-[#262824]" />
                        Phone Number <span className="text-[#8e2a2a]">*</span>
                      </label>
                      <input
                        className="w-full border border-[#dfdfd8] bg-[#f7f6f2] rounded-[2px] px-3.5 py-2.5 text-xs text-[#262824] focus:outline-none focus:border-[#262824]"
                        type="tel"
                        placeholder="e.g. 9876543210"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Email field */}
                <div className="flex flex-col gap-1 select-none">
                  <label className="text-[0.66rem] font-bold uppercase tracking-wider text-[#777971] flex items-center gap-1">
                    <Mail size={11} className="text-[#262824]" />
                    Email Address <span className="text-[#8e2a2a]">*</span>
                  </label>
                  <input
                    className="w-full border border-[#dfdfd8] bg-[#f7f6f2] rounded-[2px] px-3.5 py-2.5 text-xs text-[#262824] focus:outline-none focus:border-[#262824]"
                    type="email"
                    placeholder="email@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Password field */}
                <div className="flex flex-col gap-1 select-none">
                  <label className="text-[0.66rem] font-bold uppercase tracking-wider text-[#777971] flex items-center gap-1">
                    <Lock size={11} className="text-[#262824]" />
                    Password <span className="text-[#8e2a2a]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      className="w-full border border-[#dfdfd8] bg-[#f7f6f2] rounded-[2px] px-3.5 py-2.5 pr-10 text-xs text-[#262824] focus:outline-none focus:border-[#262824]"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777971] hover:text-[#262824] cursor-pointer border-none bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {isRegister && (
                  /* Confirm Password field */
                  <div className="flex flex-col gap-1 select-none">
                    <label className="text-[0.66rem] font-bold uppercase tracking-wider text-[#777971] flex items-center gap-1">
                      <Lock size={11} className="text-[#262824]" />
                      Confirm Password <span className="text-[#8e2a2a]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        className="w-full border border-[#dfdfd8] bg-[#f7f6f2] rounded-[2px] px-3.5 py-2.5 pr-10 text-xs text-[#262824] focus:outline-none focus:border-[#262824]"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777971] hover:text-[#262824] cursor-pointer border-none bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Remember Me / Forgot Password */}
                {!isRegister ? (
                  <div className="flex items-center justify-between text-xs mt-1 select-none">
                    <label className="flex items-center gap-2 text-[#777971] font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded-[2px] border-[#dfdfd8] text-[#262824] focus:ring-0 w-4 h-4 cursor-pointer accent-[#262824]"
                      />
                      Remember Me
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[#262824] hover:underline font-semibold bg-transparent border-none outline-none cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                ) : (
                  /* Terms and Conditions Checkbox */
                  <div className="flex items-start gap-2.5 text-xs mt-1 select-none">
                    <input
                      type="checkbox"
                      id="termsCheck"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="rounded-[2px] border-[#dfdfd8] text-[#262824] focus:ring-0 w-4 h-4 cursor-pointer mt-0.5 shrink-0 accent-[#262824]"
                    />
                    <label htmlFor="termsCheck" className="text-[#777971] leading-normal cursor-pointer">
                      I accept the{" "}
                      <span className="text-[#262824] underline font-semibold">
                        Terms &amp; Conditions
                      </span>{" "}
                      and{" "}
                      <span className="text-[#262824] underline font-semibold">
                        Privacy Policy
                      </span>
                      .
                    </label>
                  </div>
                )}

                {/* Form Submit Button */}
                <button
                  className="btn-primary w-full min-h-[42px] text-xs font-bold uppercase tracking-wider transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    'Processing...'
                  ) : isRegister ? (
                    'Create Account'
                  ) : (
                    'Log In'
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-2 select-none">
                  <span className="h-px bg-[#dfdfd8] flex-1" />
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#777971] font-bold">Or</span>
                  <span className="h-px bg-[#dfdfd8] flex-1" />
                </div>

                {/* Google OAuth Login */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 min-h-[42px] py-2 px-4 rounded-[2px] border border-[#dfdfd8] bg-white text-[#262824] hover:bg-[#eeede7] transition-all cursor-pointer font-bold text-xs"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" width="16" height="16">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {isRegister ? "Sign up with Google" : "Continue with Google"}
                </button>

                {/* Toggle Signin/Signup link */}
                <div className="text-center mt-3 select-none">
                  <span className="text-xs text-[#777971] mr-1">
                    {isRegister ? "Already have a customer account?" : `New to ${storeProfile.storeName || 'FORMA'}?`}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-[#262824] hover:underline cursor-pointer bg-transparent border-none outline-none font-bold"
                    onClick={() => {
                      setIsRegister(!isRegister);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                  >
                    {isRegister ? "Sign In" : "Sign Up"}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

      </div>
    </div>
  );
};

export default AuthModal;
