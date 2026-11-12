import React, { useState, useMemo, useEffect } from 'react';
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
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Package,
  Tag
} from 'lucide-react';
import { getStorefrontConfig } from '../../../utils/storeSettings';
import type { StorefrontSectionsConfig } from '../../../utils/storeSettings';

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

  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cSubject, setCSubject] = useState('');
  const [cService, setCService] = useState('General Support');
  const [cMessage, setCMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  const [rStars, setRStars] = useState(0);
  const [rHoverStars, setRHoverStars] = useState(0);
  const [rBody, setRBody] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);



  const handleFilterGo = (cat: string) => {
    setCurFilter(cat);
    setCurPage('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim() || !cEmail.trim() || !cMessage.trim()) {
      showToast('Please fill out all required fields.');
      return;
    }
    setIsSubmittingContact(true);
    try {
      const res = await addLead(cName.trim(), cEmail.trim(), cSubject.trim() || 'General Inquiry', cService, cMessage.trim());
      if (res && res.success === false) { setIsSubmittingContact(false); return; }
      setContactSubmitted(true);
      setCName(''); setCEmail(''); setCSubject(''); setCMessage('');
      showToast('Inquiry sent successfully! Our care team will get in touch.');
    } catch (err: any) {
      showToast('Failed to submit message. Please try again.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const MAX_STORY_CHARS = 250;
  const currentCharCount = rBody.length;
  const isCharLimitExceeded = currentCharCount > MAX_STORY_CHARS;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curUser) { setCurPage('login'); return; }
    if (rStars === 0 || !rBody.trim()) { showToast('Please select a star rating and share your experience.'); return; }
    if (isCharLimitExceeded) { showToast(`Your review exceeds the ${MAX_STORY_CHARS}-character limit.`); return; }
    setIsSubmittingReview(true);
    try {
      await submitStory(rStars, rBody.trim(), curUser.name || 'Customer', curUser.address?.city ? `${curUser.address.city}, Verified Buyer` : 'Verified Buyer');
      showToast('Thank you! Your review has been submitted for verification.');
      setRStars(0); setRBody('');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Storefront Section Configuration (Catalog, Featured, Recommended, Offers)
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontSectionsConfig>(getStorefrontConfig());

  useEffect(() => {
    const handleConfigUpdate = () => {
      setStorefrontConfig(getStorefrontConfig());
    };
    window.addEventListener('storefront_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('storefront_config_updated', handleConfigUpdate);
  }, []);

  // 1. Featured Products (Curated by admin or fallback to top products)
  const featuredProducts = useMemo(() => {
    if (storefrontConfig.featuredProductIds && storefrontConfig.featuredProductIds.length > 0) {
      const selected = products.filter((p) =>
        storefrontConfig.featuredProductIds.includes(String(p._id || p.id))
      );
      if (selected.length > 0) return selected;
    }
    return products.slice(0, 8);
  }, [products, storefrontConfig.featuredProductIds]);

  // 2. Recommended Products (Curated by admin or fallback)
  const recommendedProducts = useMemo(() => {
    if (storefrontConfig.recommendedProductIds && storefrontConfig.recommendedProductIds.length > 0) {
      const selected = products.filter((p) =>
        storefrontConfig.recommendedProductIds.includes(String(p._id || p.id))
      );
      if (selected.length > 0) return selected;
    }
    return products.slice(4, 12);
  }, [products, storefrontConfig.recommendedProductIds]);

  // 3. Special Offers Products (Products marked on sale by admin or having discounts)
  const offerProducts = useMemo(() => {
    if (storefrontConfig.offerProductIds && storefrontConfig.offerProductIds.length > 0) {
      const selected = products.filter((p) =>
        storefrontConfig.offerProductIds.includes(String(p._id || p.id))
      );
      if (selected.length > 0) return selected;
    }
    return products.filter((p) => (p.discount && p.discount > 0) || p.badge === 'Sale' || p.badge === 'Offer');
  }, [products, storefrontConfig.offerProductIds]);

  // 4. Active Catalog Cards with Images
  const activeCatalog = useMemo(() => {
    return (storefrontConfig.catalog || []).filter((c) => c.isActive !== false);
  }, [storefrontConfig.catalog]);

  const userStories = (stories || []).filter((s) => s.approved === true || s.status === 'Approved');



  return (
    <div className="w-full bg-[#f7f6f2] text-[#262824] antialiased">

      {/* ─── 1. HERO BANNER CAROUSEL ─── */}
      <section className="w-full relative border-b border-[#dfdfd8]">
        <BannerCarousel />
      </section>

      {/* ─── 2. VALUE STRIP ─── */}
      <section className="bg-[#eeede7] border-b border-[#dfdfd8] select-none">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-[#dfdfd8]">
            {[
              { icon: Truck, title: 'Complimentary Shipping', sub: 'Orders above ₹499' },
              { icon: RotateCcw, title: '7-Day Return Privilege', sub: 'Seamless doorstep pickup' },
              { icon: ShieldCheck, title: 'Verified Formulation', sub: 'Batch tested standard' },
              { icon: Headphones, title: 'Concierge Care', sub: 'Assistance 7 days a week' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-3.5 sm:py-4 px-4 sm:px-6 lg:px-8">
                <div className="w-8 h-8 rounded-[2px] bg-white border border-[#dfdfd8] text-[#262824] flex items-center justify-center shrink-0">
                  <item.icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] font-semibold text-[#262824] leading-tight truncate">{item.title}</p>
                  <p className="text-[10px] sm:text-[11px] text-[#777971] mt-0.5 hidden sm:block">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* ─── 3. CATEGORY NAVIGATION (ADMIN CATALOG WITH IMAGES) ─── */}
        <section className="py-12 sm:py-16 border-b border-[#dfdfd8]">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777971] mb-1.5">Curated Edits</p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#262824] tracking-tight font-heading">Explore Catalog</h2>
              <p className="text-xs sm:text-sm text-[#777971] mt-1 font-normal">
                Discover specialized formulations organized across our flagship collections.
              </p>
            </div>
            <button
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-[#777971] hover:text-[#262824] transition-colors cursor-pointer"
              onClick={() => handleFilterGo('All')}
            >
              <span>View full range</span> <ArrowRight size={13} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {activeCatalog.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleFilterGo(item.category || item.title)}
                className="group relative flex flex-col rounded-[2px] border border-[#dfdfd8] bg-white overflow-hidden hover:border-[#262824] hover:shadow-sm transition-all duration-200 cursor-pointer text-left"
              >
                <div className="w-full aspect-[4/3] bg-[#eeede7] overflow-hidden relative">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.badge && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold bg-[#262824]/90 text-white tracking-wider uppercase shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#262824] uppercase tracking-wider truncate leading-tight group-hover:text-black">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-[10px] text-[#777971] line-clamp-1 mt-1 leading-snug">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-[#777971] group-hover:text-[#262824] font-medium inline-flex items-center gap-1 mt-2 transition-colors">
                    Explore <ChevronRight size={11} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ─── 4. FEATURED PRODUCTS (ADMIN SELECTED) ─── */}
        <section className="py-12 sm:py-16 border-b border-[#dfdfd8]">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777971] mb-1.5">Essential Selection</p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#262824] tracking-tight font-heading">Featured Essentials</h2>
              <p className="text-xs sm:text-sm text-[#777971] mt-1.5 font-normal max-w-md">
                Thoughtfully crafted formulations with lasting utility and verified performance.
              </p>
            </div>
            <button
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#262824] hover:text-black transition-colors border border-[#dfdfd8] px-4 py-2.5 rounded-[2px] bg-white hover:bg-[#eeede7] cursor-pointer"
              onClick={() => handleFilterGo('All')}
            >
              <span>View catalog</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {isProductsLoading && products.length === 0
              ? Array.from({ length: 8 }).map((_, idx) => <ProductSkeletonCard key={idx} />)
              : featuredProducts.map((product) => (
                  <ProductCard key={product.id || product._id} product={product} />
                ))}
          </div>

          <div className="mt-8 sm:hidden">
            <button
              type="button"
              className="w-full btn-primary text-xs font-medium uppercase tracking-wider min-h-[44px] flex items-center justify-center gap-2"
              onClick={() => handleFilterGo('All')}
            >
              <span>Explore all {products.length} products</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </section>

        {/* ─── 4B. SPECIAL OFFERS & SALE SECTION ─── */}
        {offerProducts.length > 0 && (
          <section className="py-12 sm:py-16 border-b border-[#dfdfd8] bg-[#fbfbf9] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1440px] mx-auto">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold tracking-wider uppercase mb-2">
                    <Tag size={11} /> {storefrontConfig.offersBadgeText || 'Limited Time Deals'}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-[#262824] tracking-tight font-heading">
                    Special Offers &amp; Sale
                  </h2>
                  <p className="text-xs sm:text-sm text-[#777971] mt-1 font-normal max-w-md">
                    Seasonal promotions, exclusive bundle reductions, and limited formulation specials.
                  </p>
                </div>
                <button
                  type="button"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#262824] hover:text-black transition-colors border border-[#dfdfd8] px-4 py-2.5 rounded-[2px] bg-white hover:bg-[#eeede7] cursor-pointer"
                  onClick={() => handleFilterGo('All')}
                >
                  <span>View all offers</span>
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {offerProducts.slice(0, 8).map((product) => (
                  <ProductCard key={product.id || product._id} product={product} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 4C. RECOMMENDED FOR YOU SECTION (ADMIN CURATED) ─── */}
        {recommendedProducts.length > 0 && (
          <section className="py-12 sm:py-16 border-b border-[#dfdfd8]">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777971] mb-1.5">Tailored Utility</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-[#262824] tracking-tight font-heading">
                  Recommended for You
                </h2>
                <p className="text-xs sm:text-sm text-[#777971] mt-1 font-normal max-w-md">
                  Formulations curated by our team based on high customer satisfaction and versatile household application.
                </p>
              </div>
              <button
                type="button"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#262824] hover:text-black transition-colors border border-[#dfdfd8] px-4 py-2.5 rounded-[2px] bg-white hover:bg-[#eeede7] cursor-pointer"
                onClick={() => handleFilterGo('All')}
              >
                <span>Browse all</span>
                <ChevronRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {recommendedProducts.slice(0, 8).map((product) => (
                <ProductCard key={product.id || product._id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* ─── 5. BRAND EDITORIAL SECTION ─── */}
        <section className="py-12 sm:py-16 border-b border-[#dfdfd8]" id="brand-story">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left: Text content */}
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-[2px] bg-[#eeede7] border border-[#dfdfd8] text-[#777971] text-[10px] font-semibold tracking-[0.16em] uppercase mb-4">
                The Standard
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#262824] tracking-tight leading-tight font-heading mb-4">
                Quiet Design,<br />Uncompromising Formulation.
              </h2>
              <p className="text-sm text-[#777971] leading-relaxed mb-8 max-w-[480px]">
                We establish a restrained, editorial standard for daily home care. Every formulation is crafted with precision, packaged with minimal restraint, and delivered with reliable transparency.
              </p>

              <div className="flex items-center gap-8 pb-7 mb-7 border-b border-[#dfdfd8]">
                {[
                  { stat: '100%', label: 'Batch Inspected' },
                  { stat: '50k+', label: 'Delivered Orders' },
                  { stat: '4.9 / 5', label: 'Average Score' }
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-2xl font-bold text-[#262824] leading-none font-price">{item.stat}</div>
                    <div className="text-[11px] font-medium text-[#777971] mt-1.5 uppercase tracking-wider">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { icon: CheckCircle2, label: 'Verified Quality' },
                  { icon: ShieldCheck, label: 'Encrypted Checkout' },
                  { icon: Package, label: 'Priority Dispatch' }
                ].map((item) => (
                  <span key={item.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-medium border border-[#dfdfd8] bg-white text-[#262824]">
                    <item.icon size={13} className="text-[#777d62]" />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Visual card grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[2px] bg-[#262824] text-[#f7f6f2] p-6 flex flex-col justify-between aspect-square">
                <Package size={26} className="text-[#c8c8bf]" />
                <div>
                  <p className="text-3xl font-bold font-price">50k+</p>
                  <p className="text-xs uppercase tracking-wider text-[#c8c8bf] mt-1">Orders Dispatched</p>
                </div>
              </div>
              <div className="rounded-[2px] bg-white border border-[#dfdfd8] text-[#262824] p-6 flex flex-col justify-between aspect-square">
                <ShieldCheck size={26} className="text-[#777d62]" />
                <div>
                  <p className="text-3xl font-bold font-price text-[#262824]">100%</p>
                  <p className="text-xs uppercase tracking-wider text-[#777971] mt-1">Genuine Formulas</p>
                </div>
              </div>
              <div className="rounded-[2px] bg-white border border-[#dfdfd8] text-[#262824] p-6 flex flex-col justify-between aspect-square">
                <Star size={26} className="text-[#b38234] fill-[#b38234]" />
                <div>
                  <p className="text-3xl font-bold font-price text-[#262824]">4.9</p>
                  <p className="text-xs uppercase tracking-wider text-[#777971] mt-1">Customer Rating</p>
                </div>
              </div>
              <div className="rounded-[2px] bg-[#eeede7] border border-[#dfdfd8] text-[#262824] p-6 flex flex-col justify-between aspect-square">
                <Truck size={26} className="text-[#777971]" />
                <div>
                  <p className="text-3xl font-bold font-price">Free</p>
                  <p className="text-xs uppercase tracking-wider text-[#777971] mt-1">Above ₹499</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 6. CUSTOMER TESTIMONIALS ─── */}
        <section className="py-12 sm:py-16 border-b border-[#dfdfd8]" id="reviews">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#777971] mb-1.5">Verified Journal</p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#262824] tracking-tight font-heading">
                Customer Stories
              </h2>
            </div>
          </div>

          <HorizontalStoryCarousel stories={userStories} />

          {/* Review submission form */}
          <div className="mt-8 bg-white border border-[#dfdfd8] rounded-[2px] p-6 sm:p-8">
            {curUser ? (
              <form className="flex flex-col gap-5" onSubmit={handleReviewSubmit}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#262824]">Share Your Experience</h3>
                    <p className="text-xs text-[#777971] mt-0.5">
                      Writing as <strong className="text-[#262824]">{curUser.name}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[#262824]">Rating:</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, i) => {
                      const value = i + 1;
                      const active = value <= (rHoverStars || rStars);
                      return (
                        <Star
                          key={i}
                          size={20}
                          className="cursor-pointer transition-transform duration-100 ease-out hover:scale-110"
                          fill={active ? '#b38234' : 'none'}
                          stroke={active ? '#b38234' : '#dfdfd8'}
                          onMouseEnter={() => setRHoverStars(value)}
                          onMouseLeave={() => setRHoverStars(0)}
                          onClick={() => setRStars(value)}
                        />
                      );
                    })}
                  </div>
                </div>

                <div>
                  <textarea
                    className={`w-full border rounded-[2px] p-4 text-sm text-[#262824] bg-white outline-none focus:border-[#262824] transition-colors placeholder:text-[#777971] resize-y ${
                      isCharLimitExceeded
                        ? 'border-[#a83d3b] focus:border-[#a83d3b]'
                        : 'border-[#dfdfd8]'
                    }`}
                    placeholder="Share your experience with our products, packaging, and delivery..."
                    rows={3}
                    value={rBody}
                    onChange={(e) => setRBody(e.target.value)}
                    required
                  />
                  <div className="flex justify-between text-xs px-1 mt-1">
                    <span className={isCharLimitExceeded ? 'text-[#a83d3b] font-medium' : 'text-[#777971]'}>
                      {currentCharCount} / {MAX_STORY_CHARS}
                    </span>
                    <span className="text-[#777971]">Verified by our editorial team</span>
                  </div>
                </div>

                <div>
                  <button
                    className="btn-primary text-xs uppercase tracking-wider font-medium min-h-[42px] px-6"
                    type="submit"
                    disabled={isSubmittingReview || isCharLimitExceeded}
                  >
                    {isSubmittingReview ? (
                      <><Loader2 size={14} className="animate-spin" /><span>Submitting...</span></>
                    ) : (
                      <><Send size={13} /><span>Submit Review</span></>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-sm font-semibold text-[#262824] mb-1">Share Your Experience</h3>
                  <p className="text-xs text-[#777971] max-w-sm">
                    Help other customers make confident choices. Sign in to write a verified review.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary text-xs uppercase tracking-wider font-medium min-h-[42px] px-6 shrink-0"
                  onClick={() => setCurPage('login')}
                >
                  Sign In to Post Review
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ─── 7. CONTACT CONCIERGE ─── */}
        <section className="py-12 sm:py-16" id="contact">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-[2px] border border-[#dfdfd8] overflow-hidden bg-white">
            {/* Info panel */}
            <div className="bg-[#262824] text-[#f7f6f2] p-8 sm:p-10 lg:p-12 flex flex-col justify-between select-none">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c8c8bf] mb-3">Concierge Desk</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight font-heading mb-4">
                  Have an Inquiry?<br />We Are Here to Assist.
                </h2>
                <p className="text-sm text-[#eeede7]/80 leading-relaxed max-w-[340px]">
                  Our customer service team is on hand for product guidance, orders, delivery queries, and corporate requirements.
                </p>
              </div>

              <div className="space-y-4 pt-8 border-t border-white/15 mt-8">
                {[
                  { icon: Mail, text: 'concierge@forma.com' },
                  { icon: Phone, text: '+91 (800) 123-4567 (Mon – Sat)' },
                  { icon: MapPin, text: 'Bengaluru, Karnataka, India' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3.5 text-sm text-[#eeede7]/90">
                    <item.icon size={15} className="text-[#c8c8bf] shrink-0" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Form panel */}
            <div className="p-8 sm:p-10 lg:p-12 bg-white">
              {!contactSubmitted ? (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="mb-2">
                    <h3 className="text-base font-semibold text-[#262824] mb-1 font-heading">Send a Message</h3>
                    <p className="text-xs text-[#777971]">Complete the form and our concierge team will respond promptly.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Full Name *</label>
                      <input
                        className="input-field"
                        type="text"
                        placeholder="Priya Sharma"
                        required
                        value={cName}
                        onChange={(e) => setCName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Email Address *</label>
                      <input
                        className="input-field"
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
                      <label className="form-label">Subject</label>
                      <input
                        className="input-field"
                        type="text"
                        placeholder="e.g. Order inquiry"
                        value={cSubject}
                        onChange={(e) => setCSubject(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Department</label>
                      <select
                        className="select-field"
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
                    <label className="form-label">Message *</label>
                    <textarea
                      className="textarea-field min-h-[100px]"
                      placeholder="Please provide details about your inquiry..."
                      rows={3}
                      required
                      value={cMessage}
                      onChange={(e) => setCMessage(e.target.value)}
                    />
                  </div>

                  <button
                    className="btn-primary text-xs uppercase tracking-wider font-medium min-h-[42px] px-6 disabled:opacity-50"
                    type="submit"
                    disabled={isSubmittingContact}
                  >
                    {isSubmittingContact ? (
                      <><Loader2 size={14} className="animate-spin" /><span>Sending...</span></>
                    ) : (
                      <><span>Send Message</span><Send size={13} /></>
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-[2px] bg-[#edf3ee] border border-[#c7dac9] flex items-center justify-center mx-auto mb-4 text-[#40684f]">
                    <CheckCircle2 size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-[#262824] mb-1 font-heading">Message Dispatched</h3>
                  <p className="text-xs text-[#777971] leading-relaxed max-w-[300px] mx-auto mb-6">
                    Our concierge team has received your message and will follow up shortly.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary text-xs uppercase tracking-wider font-medium min-h-[42px] px-5"
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
