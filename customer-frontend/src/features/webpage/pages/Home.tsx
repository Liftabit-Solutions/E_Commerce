import React, { useState, useMemo } from 'react';
import { useApp } from '../../../core/context/AppContext';
import BannerCarousel from '../components/BannerCarousel';
import ProductCard from '../components/ProductCard';
import ProductSkeletonCard from '../components/ProductSkeletonCard';
import HorizontalStoryCarousel from '../components/HorizontalStoryCarousel';
import {
  ShieldCheck,
  Truck,
  Headphones,
  Mail,
  Phone,
  MapPin,
  Send,
  Star,
  ChevronRight,
  Loader2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Tag
} from 'lucide-react';

const Home: React.FC = () => {
  const {
    products,
    isProductsLoading,
    stories,
    curUser,
    submitStory,
    showToast,
    addLead,
    setCurPage,
    setCurFilter
  } = useApp();

  // Contact Form State
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cSubject, setCSubject] = useState('');
  const [cService, setCService] = useState('General Support');
  const [cMessage, setCMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Review Form State
  const [rStars, setRStars] = useState(0);
  const [rHoverStars, setRHoverStars] = useState(0);
  const [rBody, setRBody] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Dynamically extract categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.cat).filter(Boolean)));
  }, [products]);

  // Filter & Go to Products Page
  const handleFilterGo = (cat: string) => {
    setCurFilter(cat);
    setCurPage('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Contact Inquiry
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cEmail.trim() || !cMessage.trim()) {
      showToast('Please fill out all required fields.');
      return;
    }
    setIsSubmittingContact(true);
    try {
      const res = await addLead(
        cName.trim(),
        cEmail.trim(),
        cSubject.trim() || 'General Inquiry',
        cService,
        cMessage.trim()
      );
      if (res && res.success === false) {
        setIsSubmittingContact(false);
        return;
      }
      setContactSubmitted(true);
      setCName('');
      setCEmail('');
      setCSubject('');
      setCMessage('');
      showToast('Inquiry sent successfully! Our care team will get in touch.');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to submit message. Please try again.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const MAX_STORY_CHARS = 250;
  const currentCharCount = rBody.length;
  const isCharLimitExceeded = currentCharCount > MAX_STORY_CHARS;

  // Submit Testimonial Review / Story
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curUser) {
      setCurPage('login');
      return;
    }
    if (rStars === 0 || !rBody.trim()) {
      showToast('Please select a star rating and share your experience.');
      return;
    }
    if (isCharLimitExceeded) {
      showToast(`Your review exceeds the ${MAX_STORY_CHARS}-character limit.`);
      return;
    }
    setIsSubmittingReview(true);
    try {
      await submitStory(
        rStars,
        rBody.trim(),
        curUser.name || 'Customer',
        curUser.address?.city ? `${curUser.address.city}, Verified Buyer` : 'Verified Buyer'
      );
      showToast('Thank you! Your review has been submitted for verification.');
      setRStars(0);
      setRBody('');
    } catch (err: any) {
      console.error('Error submitting review:', err);
      showToast(err?.response?.data?.message || err?.message || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Get featured products & stories
  const featuredProducts = products.slice(0, 8);
  const userStories = (stories || []).filter((s) => s.approved === true || s.status === 'Approved');

  return (
    <div className="w-full bg-[#FAFAF9] text-slate-900 font-sans selection:bg-slate-900 selection:text-white antialiased">
      {/* ─── 1. HERO PROMOTIONAL BANNER & CAROUSEL ─── */}
      <section className="w-full relative bg-white border-b border-slate-200/80">
        <BannerCarousel />
      </section>

      {/* ─── 2. FAST VALUE & ASSURANCE STRIP ─── */}
      <section className="border-b border-slate-200/80 bg-white select-none">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Truck size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Free Express Shipping</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">On all orders above ₹499</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <RotateCcw size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">7-Day Easy Returns</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Hassle-free doorstep pickup</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">100% Quality Inspected</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Authentic &amp; genuine catalog</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Headphones size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-tight">Dedicated Care Support</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Assistance available 7 days a week</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-20">
        
        {/* ─── 3. CATEGORY PILL NAVIGATION ─── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 block mb-1">
                Explore Collections
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                Shop by Category
              </h2>
            </div>
            <button
              type="button"
              className="text-xs font-bold text-slate-900 hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
              onClick={() => handleFilterGo('All')}
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2.5 pb-2 overflow-x-auto scrollbar-none w-full max-w-full -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              type="button"
              className="shrink-0 text-xs font-bold px-5 py-2.5 rounded-xl bg-slate-950 text-white hover:bg-black active:scale-[0.98] cursor-pointer transition-all shadow-xs min-h-[42px] flex items-center gap-2"
              onClick={() => handleFilterGo('All')}
            >
              <Tag size={13} />
              <span>All Catalog</span>
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                className="shrink-0 text-xs font-bold px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:border-slate-900 hover:text-slate-950 active:scale-[0.98] cursor-pointer transition-all shadow-2xs min-h-[42px]"
                onClick={() => handleFilterGo(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* ─── 4. FEATURED PRODUCTS SHOWCASE ─── */}
        <section>
          <div className="flex items-end justify-between pb-4 mb-8 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold tracking-wider uppercase mb-2">
                <Sparkles size={11} className="text-emerald-600" />
                <span>Curated Catalog</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display leading-tight">
                Trending Essentials
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
                Discover our highest-rated customer favorites and newly added staples.
              </p>
            </div>
            <button
              type="button"
              className="group hidden sm:flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer py-1.5 px-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-400"
              onClick={() => handleFilterGo('All')}
            >
              <span>Explore full catalog</span>
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-7">
            {isProductsLoading
              ? Array.from({ length: 4 }).map((_, idx) => (
                  <ProductSkeletonCard key={idx} />
                ))
              : featuredProducts.map((product) => (
                  <ProductCard key={product.id || product._id} product={product} />
                ))}
          </div>

          {/* Mobile explore button */}
          <div className="mt-8 text-center sm:hidden">
            <button
              type="button"
              className="w-full py-3 px-4 rounded-xl bg-slate-950 text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
              onClick={() => handleFilterGo('All')}
            >
              <span>Explore all {products.length} products</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </section>

        {/* ─── 5. EDITORIAL BRAND SPREAD (ABOUT & QUALITY STANDARDS) ─── */}
        <section className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] shadow-sm" id="about">
          <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold tracking-wider uppercase mb-3 w-fit">
              <span>Why Choose Ecommerce</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight font-display mb-4">
              Standardized Quality,<br />Delivered to Your Doorstep.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-8 max-w-[480px]">
              We provide a seamless online shopping experience offering carefully vetted catalog items, reliable doorstep logistics, and transparent pricing without hidden fees.
            </p>

            <div className="grid grid-cols-3 gap-6 py-6 border-t border-b border-slate-200 mb-8 w-fit">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-950 leading-none font-stat">100%</div>
                <div className="text-[11px] font-bold text-slate-500 mt-1.5">Inspected</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-950 leading-none font-stat">50k+</div>
                <div className="text-[11px] font-bold text-slate-500 mt-1.5">Dispatches</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-950 leading-none font-stat">4.9★</div>
                <div className="text-[11px] font-bold text-slate-500 mt-1.5">Rating</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 size={13} /> Verified Quality
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                <ShieldCheck size={13} /> Secure SSL Checkout
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                <Truck size={13} /> Priority Dispatch
              </span>
            </div>
          </div>

          <div
            className="bg-slate-100 bg-cover bg-center min-h-[320px] lg:min-h-full"
            style={{ backgroundImage: `url('/customer_login_hero.jpg')` }}
          />
        </section>

        {/* ─── 6. CUSTOMER TESTIMONIALS & REVIEWS ─── */}
        <section className="space-y-8" id="reviews">
          <div className="flex items-end justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 block mb-1">
                Verified Community
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                Customer Experiences
              </h2>
            </div>
          </div>

          <HorizontalStoryCarousel stories={userStories} />

          {/* Testimonial Writer Form */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs">
            {curUser ? (
              <form className="flex flex-col gap-5" onSubmit={handleReviewSubmit}>
                <div className="text-xs text-slate-600">
                  Submitting verified review as <strong className="text-slate-950 font-bold">{curUser.name}</strong>
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                  <span>Your Rating:</span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: 5 }, (_, i) => {
                      const value = i + 1;
                      const active = value <= (rHoverStars || rStars);
                      return (
                        <Star
                          key={i}
                          size={22}
                          className="cursor-pointer transition-transform duration-100 ease-out hover:scale-115"
                          fill={active ? '#F59E0B' : 'none'}
                          stroke={active ? '#F59E0B' : '#CBD5E1'}
                          onMouseEnter={() => setRHoverStars(value)}
                          onMouseLeave={() => setRHoverStars(0)}
                          onClick={() => setRStars(value)}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <textarea
                    className={`w-full border rounded-2xl p-4 text-xs sm:text-sm text-slate-900 bg-slate-50/70 focus:bg-white outline-none focus:ring-2 transition-all placeholder:text-slate-400 resize-y ${
                      isCharLimitExceeded
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10'
                        : 'border-slate-300 focus:border-slate-950 focus:ring-slate-950/10'
                    }`}
                    placeholder="Share your experience with our products, packaging, and delivery..."
                    rows={3}
                    maxLength={MAX_STORY_CHARS}
                    value={rBody}
                    onChange={(e) => setRBody(e.target.value)}
                    required
                  />
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className={isCharLimitExceeded ? 'text-rose-600 font-bold' : 'text-slate-500 font-medium'}>
                      {currentCharCount} / {MAX_STORY_CHARS} characters
                    </span>
                    <span className="text-slate-400 text-[11px] font-medium">All reviews are verified by our team</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between pt-1">
                  <button
                    className="btn-primary text-xs font-bold min-h-[44px] px-6 rounded-xl cursor-pointer"
                    type="submit"
                    disabled={isSubmittingReview || isCharLimitExceeded}
                  >
                    {isSubmittingReview ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Submit Review</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-base font-bold text-slate-950 mb-1">Share Your Experience</h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-normal">
                    Help other shoppers make confident decisions. Sign in to post a verified review.
                  </p>
                </div>
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-slate-950 text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px]"
                  onClick={() => setCurPage('login')}
                >
                  Sign In to Post Review
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ─── 7. CUSTOMER CARE & INQUIRY FORM ─── */}
        <section className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm" id="contact">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr]">
            {/* Info panel */}
            <div className="bg-slate-950 text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between select-none">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 block mb-3">
                  Customer Care Desk
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight font-display mb-4">
                  Have a Question?<br />We're Here to Help.
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-8 max-w-[340px]">
                  Our customer service team is available to assist you with order inquiries, product recommendations, and bulk requests.
                </p>
              </div>

              <div className="space-y-4 pt-8 border-t border-slate-800">
                <div className="flex items-center gap-3.5 text-xs sm:text-sm text-slate-300">
                  <Mail size={16} className="text-emerald-400 shrink-0" />
                  <span>support@ecommerce.com</span>
                </div>
                <div className="flex items-center gap-3.5 text-xs sm:text-sm text-slate-300">
                  <Phone size={16} className="text-emerald-400 shrink-0" />
                  <span>+91 (800) 123-4567 (Mon – Sat)</span>
                </div>
                <div className="flex items-center gap-3.5 text-xs sm:text-sm text-slate-300">
                  <MapPin size={16} className="text-emerald-400 shrink-0" />
                  <span>Bengaluru, Karnataka, India</span>
                </div>
              </div>
            </div>

            {/* Form panel */}
            <div className="p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-white text-slate-900">
              {!contactSubmitted ? (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="mb-2">
                    <h3 className="text-lg font-bold text-slate-950 mb-1">Customer Inquiry Form</h3>
                    <p className="text-xs sm:text-sm text-slate-500">Fill out the details below and our team will respond promptly.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">Full Name *</label>
                      <input
                        className="w-full border border-slate-200 bg-slate-50/80 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 min-h-[44px] outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 transition-all placeholder:text-slate-400 font-medium"
                        type="text"
                        placeholder="Priya Sharma"
                        required
                        value={cName}
                        onChange={(e) => setCName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">Email Address *</label>
                      <input
                        className="w-full border border-slate-200 bg-slate-50/80 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 min-h-[44px] outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 transition-all placeholder:text-slate-400 font-medium"
                        type="email"
                        placeholder="you@example.com"
                        required
                        value={cEmail}
                        onChange={(e) => setCEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">Subject</label>
                      <input
                        className="w-full border border-slate-200 bg-slate-50/80 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 min-h-[44px] outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 transition-all placeholder:text-slate-400 font-medium"
                        type="text"
                        placeholder="e.g. Order status, bulk order"
                        value={cSubject}
                        onChange={(e) => setCSubject(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">Department</label>
                      <select
                        className="w-full border border-slate-200 bg-slate-50/80 focus:bg-white rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 min-h-[44px] outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 transition-all cursor-pointer font-medium"
                        value={cService}
                        onChange={(e) => setCService(e.target.value)}
                      >
                        <option>General Support</option>
                        <option>Order &amp; Delivery Inquiry</option>
                        <option>Returns &amp; Refunds</option>
                        <option>Bulk &amp; Corporate Orders</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">Message *</label>
                    <textarea
                      className="w-full border border-slate-200 bg-slate-50/80 focus:bg-white rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 transition-all placeholder:text-slate-400 resize-y font-medium"
                      placeholder="Please provide details about your inquiry..."
                      rows={3}
                      required
                      value={cMessage}
                      onChange={(e) => setCMessage(e.target.value)}
                    />
                  </div>

                  <button
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold tracking-wide shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50 mt-1"
                    type="submit"
                    disabled={isSubmittingContact}
                  >
                    {isSubmittingContact ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Sending Message...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Message</span>
                        <Send size={14} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-2xs">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-950 mb-1.5">Message Received</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-[340px] mx-auto mb-6">
                    Thank you for reaching out. Our support team will review your message and respond shortly.
                  </p>
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px]"
                    onClick={() => setContactSubmitted(false)}
                  >
                    Send Another Message
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Home;
