import React, { useState, useEffect } from 'react';
import { useApp } from '../../core/context/AppContext';
import { X, Sparkles, Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle, Shield, KeyRound } from 'lucide-react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
// @ts-ignore
import { auth, googleProvider } from "../../../firebase";
import axios from 'axios';

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
        `${import.meta.env.VITE_BACKEND_URI}/auth/send-otp`,
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
        `${import.meta.env.VITE_BACKEND_URI}/auth/verify-otp-reset-password`,
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
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URI}/auth/login`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );
      
      if (!user.emailVerified) {
        try {
          await sendEmailVerification(user);
        } catch (verifErr) {
          console.warn("Verification email limit reached or skipped:", verifErr);
        }
      }

      await fetchCurrentUser(response.data.user);
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

      try {
        await sendEmailVerification(result.user);
      } catch (verifErr) {
        console.warn("Verification email could not be sent", verifErr);
      }

      // Create user entry in DB with form data in body
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URI}/auth/register`,
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
      
      if (isRegister) {
        // Registration Flow with Google
        const response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URI}/auth/register`,
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
        await fetchCurrentUser(response.data.user);
      } else {
        // Login Flow with Google — try login first, fallback to register if user not in DB
        try {
          const loginRes = await axios.post(
            `${import.meta.env.VITE_BACKEND_URI}/auth/login`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true,
            }
          );
          await fetchCurrentUser(loginRes.data.user);
        } catch (loginErr: any) {
          if (loginErr.response?.status === 404) {
            const regRes = await axios.post(
              `${import.meta.env.VITE_BACKEND_URI}/auth/register`,
              {
                name: user.displayName || "User",
                email: user.email || "",
                phone: user.phoneNumber || "",
              },
              {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
              }
            );
            await fetchCurrentUser(regRes.data.user);
          } else {
            throw loginErr;
          }
        }
      }

      setIsLoading(false);
      closeAuthModal();
    } catch (error: any) {
      console.error("Google Auth error:", error);
      let friendlyMessage = error.message;
      if (error.code === 'auth/popup-closed-by-user') {
        friendlyMessage = 'Sign-in popup was closed before completing.';
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
      className="fixed inset-0 bg-blk/60 backdrop-blur-md z-[9990] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-wht rounded-2xl w-full max-w-[860px] shadow-premium-xl relative border border-bdrl overflow-hidden flex flex-col md:grid md:grid-cols-5 my-auto animate-slideUp max-h-[90vh] md:max-h-none">
        
        {/* Left Column - Jade Eco Brand Sidebar */}
        <div className="bg-primary text-wht p-6 sm:p-8 md:col-span-2 flex flex-col justify-between relative overflow-hidden select-none shrink-0">
          {/* Eco Floating Leaf Background Gradients */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-primary-hover/40 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-52 h-52 bg-primary-deep/50 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none" />

          {/* Eco Header Brand */}
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 sm:mb-8">
              <div className="w-9 h-9 border border-wht/20 rounded-tr-[50%] rounded-tl-[50%] rounded-bl-[50%] rounded-br-[6px] flex items-center justify-center bg-wht/10">
                <Sparkles className="text-accent-light" size={18} />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-wht">
                Ecommerce
              </span>
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-bold mb-2 sm:mb-4 leading-snug tracking-tight">
              {isRegister ? "Join Our Community" : "Curated for Modern Living"}
            </h3>
            <p className="text-xs text-primary-light leading-relaxed mb-4 sm:mb-6">
              Experience the standard in curated essentials. Premium quality products designed for intentional living and everyday reliability.
            </p>
          </div>

          {/* Graphic / Benefit List */}
          <div className="relative z-10 space-y-4 my-6 hidden md:block">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-accent-light mt-0.5 shrink-0" size={15} />
              <div className="text-[0.74rem]">
                <p className="font-bold text-wht">100% Genuine Products</p>
                <p className="text-primary-light">Quality tested inventory directly from verified suppliers.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="text-accent-light mt-0.5 shrink-0" size={15} />
              <div className="text-[0.74rem]">
                <p className="font-bold text-wht">Secure Encrypted Transactions</p>
                <p className="text-primary-light">PCI-DSS compliant payment protection on every order.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="text-accent-light mt-0.5 shrink-0" size={15} />
              <div className="text-[0.74rem]">
                <p className="font-bold text-wht">Express Nationwide Delivery</p>
                <p className="text-primary-light">Fast, tracked dispatch right to your doorstep.</p>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="relative z-10 text-[0.68rem] text-primary-light/80 flex items-center gap-1.5 pt-3 border-t border-wht/10 hidden sm:flex">
            <Shield size={12} className="text-accent-light" />
            Secure customer account login verified by Firebase
          </div>
        </div>

        {/* Right Column - Authentication Forms */}
        <div className="p-5 sm:p-8 md:p-11 md:col-span-3 flex flex-col justify-center relative overflow-y-auto max-h-[75vh] md:max-h-none">
          {/* Close button */}
          <button
            className="absolute top-5 right-5 w-8 h-8 rounded-full border border-bdrl flex items-center justify-center text-mut hover:bg-sur hover:text-ink hover:border-mid transition-all duration-200 ease-out bg-transparent cursor-pointer"
            onClick={closeAuthModal}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>

          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-blk tracking-tight">
              {isForgotPassword 
                ? "Reset Your Password" 
                : isRegister 
                  ? "Create Account" 
                  : "Welcome Back"}
            </h2>
            <p className="text-xs text-mut mt-1">
              {isForgotPassword
                ? "Enter your registered email address below to receive a password reset link."
                : isRegister 
                  ? "Register below to purchase products and track your organic order history." 
                  : "Enter your customer credentials below to access your account."}
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-bg border border-red/10 rounded-lg p-3 text-[0.8rem] text-red mb-4 animate-fadeIn font-semibold">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[0.8rem] text-emerald-700 mb-4 animate-fadeIn font-semibold">
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
                    <label className="text-[0.66rem] font-bold uppercase tracking-wider text-mut flex items-center gap-1">
                      <Mail size={11} className="text-accent" />
                      Registered Email Address <span className="text-red font-mono">*</span>
                    </label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="email@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Form Submit Button */}
                  <button
                    className="w-full bg-primary text-wht rounded-lg py-3 text-sm font-semibold cursor-pointer transition-all duration-200 mt-2 text-center hover:bg-primary-hover active:scale-[0.98] shadow-premium-sm flex items-center justify-center gap-2"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending OTP...
                      </>
                    ) : (
                      'Send 6-Digit OTP'
                    )}
                  </button>

                  {/* Back to Sign In button */}
                  <div className="text-center mt-3 select-none">
                    <button
                      type="button"
                      className="text-xs text-primary hover:text-primary-hover hover:underline cursor-pointer bg-transparent border-none outline-none font-bold"
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
                    <label className="text-[0.66rem] font-bold uppercase tracking-wider text-mut flex items-center gap-1">
                      <KeyRound size={11} className="text-accent" />
                      Enter 6-Digit OTP Code <span className="text-red font-mono">*</span>
                    </label>
                    <input
                      className="input-field tracking-widest font-mono text-center text-lg font-bold"
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
                    <label className="text-[0.66rem] font-bold uppercase tracking-wider text-mut flex items-center gap-1">
                      <Lock size={11} className="text-accent" />
                      New Password <span className="text-red font-mono">*</span>
                    </label>
                    <div className="relative">
                      <input
                        className="input-field pr-10"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mut hover:text-ink cursor-pointer border-none bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password field */}
                  <div className="flex flex-col gap-1 select-none">
                    <label className="text-[0.66rem] font-bold uppercase tracking-wider text-mut flex items-center gap-1">
                      <Lock size={11} className="text-accent" />
                      Confirm New Password <span className="text-red font-mono">*</span>
                    </label>
                    <input
                      className="input-field"
                      type="password"
                      placeholder="Re-enter new password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    className="w-full bg-primary text-wht rounded-lg py-3 text-sm font-semibold cursor-pointer transition-all duration-200 mt-2 text-center hover:bg-primary-hover active:scale-[0.98] shadow-premium-sm flex items-center justify-center gap-2"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying & Updating...
                      </>
                    ) : (
                      'Verify OTP & Change Password'
                    )}
                  </button>

                  <div className="flex items-center justify-between mt-3 text-xs">
                    <button
                      type="button"
                      className="text-mut hover:text-primary cursor-pointer bg-transparent border-none outline-none font-medium"
                      onClick={handleSendOtp}
                    >
                      Resend OTP Code
                    </button>

                    <button
                      type="button"
                      className="text-primary hover:underline cursor-pointer bg-transparent border-none outline-none font-bold"
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
                      <label className="text-[0.66rem] font-bold uppercase tracking-wider text-mut flex items-center gap-1">
                        <User size={11} className="text-accent" />
                        Full Name <span className="text-red font-mono">*</span>
                      </label>
                      <input
                        className="input-field"
                        type="text"
                        placeholder="Your Full Name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>

                    {/* Phone Number field */}
                    <div className="flex flex-col gap-1 select-none">
                      <label className="text-[0.66rem] font-bold uppercase tracking-wider text-mut flex items-center gap-1">
                        <Phone size={11} className="text-accent" />
                        Phone Number <span className="text-red font-mono">*</span>
                      </label>
                      <input
                        className="input-field"
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
                  <label className="text-[0.66rem] font-bold uppercase tracking-wider text-mut flex items-center gap-1">
                    <Mail size={11} className="text-accent" />
                    Email Address <span className="text-red font-mono">*</span>
                  </label>
                  <input
                    className="input-field"
                    type="email"
                    placeholder="email@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {/* Password field */}
                <div className="flex flex-col gap-1 select-none">
                  <label className="text-[0.66rem] font-bold uppercase tracking-wider text-mut flex items-center gap-1">
                    <Lock size={11} className="text-accent" />
                    Password <span className="text-red font-mono">*</span>
                  </label>
                  <div className="relative">
                    <input
                      className="input-field pr-10"
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
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {isRegister && (
                  /* Confirm Password field */
                  <div className="flex flex-col gap-1 select-none">
                    <label className="text-[0.66rem] font-bold uppercase tracking-wider text-mut flex items-center gap-1">
                      <Lock size={11} className="text-accent" />
                      Confirm Password <span className="text-red font-mono">*</span>
                    </label>
                    <div className="relative">
                      <input
                        className="input-field pr-10"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mut hover:text-ink cursor-pointer border-none bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Remember Me / Forgot Password */}
                {!isRegister ? (
                  <div className="flex items-center justify-between text-xs mt-1 select-none">
                    <label className="flex items-center gap-2 text-ink font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-bdr text-primary focus:ring-primary w-4 h-4 cursor-pointer"
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
                      className="text-primary hover:text-primary-hover font-semibold bg-transparent border-none outline-none cursor-pointer"
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
                      className="rounded border-bdr text-primary focus:ring-primary w-4 h-4 cursor-pointer mt-0.5 shrink-0"
                    />
                    <label htmlFor="termsCheck" className="text-mut leading-normal cursor-pointer">
                      I accept the{" "}
                      <button type="button" className="text-primary hover:underline font-semibold bg-transparent" onClick={() => alert("Terms of Service details")}>
                        Terms & Conditions
                      </button>{" "}
                      and{" "}
                      <button type="button" className="text-primary hover:underline font-semibold bg-transparent" onClick={() => alert("Privacy Policy details")}>
                        Privacy Policy
                      </button>
                      .
                    </label>
                  </div>
                )}

                {/* Form Submit Button */}
                <button
                  className="w-full bg-primary text-wht rounded-lg py-3 text-sm font-semibold cursor-pointer transition-all duration-200 mt-2 text-center hover:bg-primary-hover active:scale-[0.98] shadow-premium-sm flex items-center justify-center gap-2"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : isRegister ? (
                    'Create Account'
                  ) : (
                    'Log In'
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-2 select-none">
                  <span className="h-px bg-bdrl flex-1" />
                  <span className="text-[10px] uppercase font-mono tracking-wider text-mut font-bold">Or</span>
                  <span className="h-px bg-bdrl flex-1" />
                </div>

                {/* Google OAuth Login */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border border-bdr bg-wht text-blk hover:bg-sur hover:border-mid transition-all duration-200 cursor-pointer font-semibold text-sm shadow-premium-sm"
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
                  <span className="text-xs text-mut mr-1">
                    {isRegister ? "Already have a customer account?" : "New to Ecommerce?"}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-primary hover:text-primary-hover hover:underline cursor-pointer bg-transparent border-none outline-none font-bold"
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
