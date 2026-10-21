import React, { useState } from 'react';
import { useApp } from '../../../core/context/AppContext';
import { 
  ArrowUp, 
  ShieldCheck, 
  Truck, 
  Headphones, 
  Mail, 
  CheckCircle2, 
  Lock, 
  RotateCcw
} from 'lucide-react';

const Footer: React.FC = () => {
  const { setCurPage, setCurFilter, showToast } = useApp();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

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
    showToast('Thank you for subscribing to our newsletter!');
    setNewsletterEmail('');
  };

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 select-none">
      {/* Top Value Assurance Grid */}
      <div className="border-b border-slate-900 bg-slate-900/60">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                <Truck size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Express Doorstep Dispatch</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Free delivery on orders above ₹499</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                <RotateCcw size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Hassle-Free 7-Day Returns</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Instant refunds &amp; easy replacement</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">100% Verified Quality</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Authentic &amp; lab-tested catalog</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                <Headphones size={18} className="text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Dedicated Care Desk</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Mon–Sat priority customer support</p>
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
              <div className="w-8 h-8 rounded-xl bg-white text-slate-950 font-black flex items-center justify-center text-sm shadow-sm">
                E
              </div>
              <span className="font-display text-xl font-extrabold text-white tracking-tight">
                Ecommerce
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm font-normal">
              A curated marketplace for modern lifestyle, home, and daily essentials. Engineered for frictionless ordering, fast dispatch, and verified product authenticity.
            </p>

            {/* Newsletter Subscription Box */}
            <div className="pt-2">
              <p className="text-xs font-bold text-white mb-2">Subscribe for Special Member Offers</p>
              {!isSubscribed ? (
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md">
                  <div className="relative flex-1">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Enter your email address..."
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-slate-400 transition-colors min-h-[42px]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-white text-slate-950 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer min-h-[42px] shrink-0"
                  >
                    Subscribe
                  </button>
                </form>
              ) : (
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/80 px-3.5 py-2 rounded-xl">
                  <CheckCircle2 size={15} />
                  <span>You're on the priority member list!</span>
                </div>
              )}
            </div>
          </div>

          {/* Shop Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Curated Catalog</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                  onClick={() => handleCategoryClick('All')}
                >
                  All Products
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                  onClick={() => handleCategoryClick('Floor Care')}
                >
                  Floor &amp; Surface Care
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                  onClick={() => handleCategoryClick('Kitchen Care')}
                >
                  Kitchen Essentials
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                  onClick={() => handleCategoryClick('Laundry Care')}
                >
                  Laundry Care
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                  onClick={() => handleCategoryClick('Bathroom Care')}
                >
                  Bathroom &amp; Hygiene
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Customer Support</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                  onClick={() => { setCurPage('orders'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  Track My Orders
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                  onClick={() => { setCurPage('home'); setTimeout(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                >
                  Help Desk &amp; Inquiries
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer text-left"
                  onClick={() => { setCurPage('home'); setTimeout(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }), 50); }}
                >
                  Customer Reviews
                </button>
              </li>
              <li>
                <span className="text-slate-400">Shipping &amp; Delivery Terms</span>
              </li>
              <li>
                <span className="text-slate-400">7-Day Replacement Policy</span>
              </li>
            </ul>
          </div>

          {/* Trust & Security */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Secure Shopping</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-emerald-400" />
                <span>256-Bit SSL Encryption</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                All transactions are securely processed through PCI-DSS compliant banking channels.
              </p>
              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                  UPI / GPay
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                  Cards
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                  COD
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Legal Sub-Footer */}
      <div className="border-t border-slate-900 bg-slate-950 py-5">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} Ecommerce Platform. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <span>Back to Top</span>
              <ArrowUp size={13} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
