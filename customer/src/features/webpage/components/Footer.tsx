import React, { useState, useEffect } from 'react';
import { useApp } from '../../../core/context/AppContext';
import { 
  ArrowUp, 
  ShieldCheck, 
  Truck, 
  Headphones, 
  Mail, 
  CheckCircle2, 
  RotateCcw,
  CreditCard
} from 'lucide-react';
import { getStoreProfile } from '../../../utils/storeSettings';
import type { StoreProfile } from '../../../utils/storeSettings';

const Footer: React.FC = () => {
  const { setCurPage, setCurFilter, showToast } = useApp();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(getStoreProfile());

  useEffect(() => {
    const handleProfileUpdate = () => {
      setStoreProfile(getStoreProfile());
    };
    window.addEventListener('store_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('store_profile_updated', handleProfileUpdate);
  }, []);

  const handleCategoryClick = (cat: string) => {
    setCurFilter(cat);
    setCurPage('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
      showToast('Please enter a valid email address.');
      return;
    }
    setIsSubscribed(true);
    showToast('Thank you for subscribing to our updates!');
    setNewsletterEmail('');
  };

  return (
    <footer className="bg-[#eeede7] text-[#777971] border-t border-[#dfdfd8] select-none">
      {/* Top Value Assurance Grid */}
      <div className="border-b border-[#dfdfd8] bg-[#f7f6f2]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="flex items-center gap-3.5 p-3 rounded-[2px] bg-white border border-[#dfdfd8]">
              <div className="w-10 h-10 rounded-[2px] bg-[#eeede7] text-[#262824] flex items-center justify-center shrink-0">
                <Truck size={17} className="text-[#262824]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#262824] leading-tight">Express Doorstep Delivery</p>
                <p className="text-[11px] text-[#777971] mt-0.5">Complimentary shipping on orders above ₹499</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-[2px] bg-white border border-[#dfdfd8]">
              <div className="w-10 h-10 rounded-[2px] bg-[#eeede7] text-[#262824] flex items-center justify-center shrink-0">
                <RotateCcw size={17} className="text-[#262824]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#262824] leading-tight">7-Day Return Privilege</p>
                <p className="text-[11px] text-[#777971] mt-0.5">Seamless replacement &amp; return process</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-[2px] bg-white border border-[#dfdfd8]">
              <div className="w-10 h-10 rounded-[2px] bg-[#eeede7] text-[#262824] flex items-center justify-center shrink-0">
                <ShieldCheck size={17} className="text-[#777d62]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#262824] leading-tight">Verified Formulation</p>
                <p className="text-[11px] text-[#777971] mt-0.5">100% genuine &amp; batch tested</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-[2px] bg-white border border-[#dfdfd8]">
              <div className="w-10 h-10 rounded-[2px] bg-[#eeede7] text-[#262824] flex items-center justify-center shrink-0">
                <Headphones size={17} className="text-[#262824]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#262824] leading-tight">Concierge Support</p>
                <p className="text-[11px] text-[#777971] mt-0.5">Dedicated assistance 7 days a week</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Navigation & Brand Column Grid */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          
          {/* Brand Col (2 spans on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={() => { setCurPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              {storeProfile.logo ? (
                <img
                  src={storeProfile.logo}
                  alt={storeProfile.storeName || 'Store'}
                  className="w-8 h-8 object-contain rounded-[2px]"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-[2px] text-[#f7f6f2] font-bold flex items-center justify-center text-sm shadow-xs"
                  style={{ backgroundColor: storeProfile.brandColor || '#262824' }}
                >
                  {(storeProfile.storeName || 'F').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-heading text-xl font-bold text-[#262824] tracking-tight">
                {storeProfile.storeName || 'FORMA'}
              </span>
            </div>

            <p className="text-xs text-[#777971] leading-relaxed max-w-sm font-normal">
              A quiet, editorial commerce standard for daily living. Thoughtfully curated essentials crafted for quality, aesthetics, and lasting utility.
            </p>

            {/* Newsletter Subscription Box */}
            <div className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#262824] mb-2">Editorial Gazette</p>
              <p className="text-[11px] text-[#777971] mb-2.5">Subscribe to receive new arrivals, seasonal edits, and exclusive member privileges.</p>
              {!isSubscribed ? (
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md">
                  <div className="relative flex-1">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777971] pointer-events-none" />
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Enter your email address..."
                      required
                      className="w-full bg-white border border-[#dfdfd8] rounded-[2px] pl-9 pr-3 py-2.5 text-xs text-[#262824] placeholder:text-[#777971] outline-none focus:border-[#262824] transition-colors min-h-[42px]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-[2px] bg-[#262824] text-[#f7f6f2] hover:bg-black text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer min-h-[42px] shrink-0"
                  >
                    Subscribe
                  </button>
                </form>
              ) : (
                <div className="inline-flex items-center gap-2 text-xs font-medium text-[#40684f] bg-[#edf3ee] border border-[#c7dac9] px-3.5 py-2 rounded-[2px]">
                  <CheckCircle2 size={14} />
                  <span>You are subscribed to the editorial newsletter.</span>
                </div>
              )}
            </div>
          </div>

          {/* Shop Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#262824]">Catalog</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer text-left"
                  onClick={() => handleCategoryClick('All')}
                >
                  All Products
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer text-left"
                  onClick={() => handleCategoryClick('Floor Care')}
                >
                  Surface &amp; Floor Care
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer text-left"
                  onClick={() => handleCategoryClick('Kitchen Care')}
                >
                  Kitchen Essentials
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer text-left"
                  onClick={() => handleCategoryClick('Laundry Care')}
                >
                  Laundry &amp; Fabric Care
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer text-left"
                  onClick={() => handleCategoryClick('Bathroom Care')}
                >
                  Bathroom &amp; Hygiene
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#262824]">Customer Care</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer text-left"
                  onClick={() => { setCurPage('orders'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  Track Orders &amp; Returns
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer text-left"
                  onClick={() => { setCurPage('home'); setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                >
                  Contact Concierge
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer text-left"
                  onClick={() => { setCurPage('home'); setTimeout(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                >
                  Customer Stories
                </button>
              </li>
              <li>
                <span className="text-[#777971]">Shipping &amp; Delivery Threshold</span>
              </li>
              <li>
                <span className="text-[#777971]">7-Day Return Policy</span>
              </li>
            </ul>
          </div>

          {/* Trust & Safe Payments */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#262824]">Payment Methods</h4>
            <div className="space-y-2 text-xs text-[#777971]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-[#777d62]" />
                <span className="text-[#262824] font-medium">100% Encrypted Checkout</span>
              </div>
              <p className="text-[11px] text-[#777971] leading-relaxed">
                UPI, Debit &amp; Credit Cards, Net Banking, and Cash on Delivery supported.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="px-2 py-1 rounded-[2px] bg-white border border-[#dfdfd8] text-[10px] font-medium text-[#262824] inline-flex items-center gap-1">
                  <CreditCard size={11} /> Cards
                </span>
                <span className="px-2 py-1 rounded-[2px] bg-white border border-[#dfdfd8] text-[10px] font-medium text-[#262824]">
                  UPI / GPay
                </span>
                <span className="px-2 py-1 rounded-[2px] bg-white border border-[#dfdfd8] text-[10px] font-medium text-[#262824]">
                  Net Banking
                </span>
                <span className="px-2 py-1 rounded-[2px] bg-white border border-[#dfdfd8] text-[10px] font-medium text-[#262824]">
                  Cash on Delivery
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Legal Sub-Footer */}
      <div className="border-t border-[#dfdfd8] bg-[#eeede7] py-5">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#777971]">
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} {storeProfile.storeName || 'FORMA'}. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="hover:text-[#262824] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#262824] cursor-pointer">Terms of Service</span>
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 text-[#262824] hover:text-black transition-colors cursor-pointer"
            >
              <span>Back to Top</span>
              <ArrowUp size={12} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
