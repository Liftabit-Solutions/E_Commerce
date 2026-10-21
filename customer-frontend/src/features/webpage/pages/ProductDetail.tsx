import React, { useState, useEffect } from 'react';
import { useApp } from '../../../core/context/AppContext';
import ReviewCard from '../components/ReviewCard';
import ProductCard from '../components/ProductCard';
import {
  Star,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  Truck,
  X,
  MessageSquarePlus,
  Send,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  ArrowLeft,
  ShoppingCart,
  Check,
  Camera
} from 'lucide-react';

/* ─── Guest Review Modal ─────────────────────────────────────────── */
interface ReviewModalProps {
  productName: string;
  onClose: () => void;
  onSubmit: (name: string, email: string, stars: number, body: string, image?: string | null) => Promise<boolean | void> | void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ productName, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [body, setBody] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Please enter your name.';
    if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) e.email = 'Please enter a valid email.';
    if (stars === 0) e.stars = 'Please select a star rating.';
    if (!body.trim() || body.trim().length < 10) e.body = 'Review must be at least 10 characters.';
    return e;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((p) => ({ ...p, image: 'File size must be under 5MB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setErrors((p) => {
        const copy = { ...p };
        delete copy.image;
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(name.trim(), email.trim(), stars, body.trim(), image);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs animate-fadeIn" />

      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-[520px] overflow-hidden animate-fadeIn">
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Share your experience</h3>
            <p className="text-xs text-slate-600 mt-1 font-medium">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 max-h-[85vh] overflow-y-auto">
          {submitted ? (
            <div className="text-center py-8 animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-2xs">
                <CheckCircle size={28} />
              </div>
              <h4 className="text-lg font-bold text-slate-950 mb-2">Thank you, {name.split(' ')[0]}!</h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-[320px] mx-auto leading-relaxed">
                Your review has been recorded and will appear on the product page once verified.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 btn-primary text-xs font-semibold px-7 min-h-[44px]"
              >
                Done
              </button>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                    Your Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrors((p) => ({ ...p, name: '' }));
                    }}
                    placeholder="Priya Sharma"
                    className={`w-full border rounded-lg px-3.5 py-2.5 text-sm text-slate-900 min-h-[44px] bg-white outline-none focus:ring-2 transition-all placeholder:text-slate-400 ${
                      errors.name ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500/10' : 'border-slate-300 focus:border-slate-950 focus:ring-slate-950/10'
                    }`}
                  />
                  {errors.name && <p className="text-[11px] font-semibold text-rose-600 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((p) => ({ ...p, email: '' }));
                    }}
                    placeholder="you@example.com"
                    className={`w-full border rounded-lg px-3.5 py-2.5 text-sm text-slate-900 min-h-[44px] bg-white outline-none focus:ring-2 transition-all placeholder:text-slate-400 ${
                      errors.email ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500/10' : 'border-slate-300 focus:border-slate-950 focus:ring-slate-950/10'
                    }`}
                  />
                  {errors.email && <p className="text-[11px] font-semibold text-rose-600 mt-1">{errors.email}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Your Rating <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }, (_, i) => {
                    const val = i + 1;
                    const active = val <= (hoverStars || stars);
                    return (
                      <Star
                        key={i}
                        size={26}
                        className="cursor-pointer transition-transform duration-100 hover:scale-115"
                        fill={active ? '#F59E0B' : 'none'}
                        stroke={active ? '#F59E0B' : '#CBD5E1'}
                        strokeWidth={1.5}
                        onMouseEnter={() => setHoverStars(val)}
                        onMouseLeave={() => setHoverStars(0)}
                        onClick={() => {
                          setStars(val);
                          setErrors((p) => ({ ...p, stars: '' }));
                        }}
                      />
                    );
                  })}
                  {(hoverStars || stars) > 0 && (
                    <span className="ml-2.5 text-xs font-bold text-slate-900">
                      {starLabels[hoverStars || stars]}
                    </span>
                  )}
                </div>
                {errors.stars && <p className="text-[11px] font-semibold text-rose-600 mt-1">{errors.stars}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Your Review <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    setErrors((p) => ({ ...p, body: '' }));
                  }}
                  placeholder={`Share your authentic feedback on ${productName}...`}
                  rows={4}
                  className={`w-full border rounded-lg p-3.5 text-sm text-slate-900 bg-white outline-none focus:ring-2 transition-all placeholder:text-slate-400 resize-y ${
                    errors.body ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500/10' : 'border-slate-300 focus:border-slate-950 focus:ring-slate-950/10'
                  }`}
                />
                {errors.body && <p className="text-[11px] font-semibold text-rose-600 mt-1">{errors.body}</p>}
              </div>

              {/* Photo Attachment Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Attach Product Photo <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                {image ? (
                  <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden group bg-slate-50 shadow-xs">
                    <img src={image} alt="Review attachment preview" className="w-24 h-24 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-950/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                      aria-label="Remove photo"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-slate-300 hover:border-slate-950 rounded-xl bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-all group">
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-slate-950 group-hover:border-slate-400 transition-colors shrink-0">
                      <Camera size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-950">
                        Add a photo of your product
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        PNG, JPG, WebP up to 5MB
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
                {errors.image && <p className="text-[11px] font-semibold text-rose-600 mt-1">{errors.image}</p>}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-slate-500 italic">
                  Verified customer reviews only.
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs font-semibold px-6 min-h-[44px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-white" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} /> <span>Submit Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── ProductDetail Page ─────────────────────────────────────────── */
const ProductDetail: React.FC = () => {
  const {
    products,
    selectedProductId,
    reviews,
    curUser,
    submitReview,
    fetchProductReviews,
    setCurPage,
    setCurFilter,
    setSelectedProductId,
    addToCart,
    showToast,
    cart,
    updateCartQty,
    removeFromCart,
    addingProductId
  } = useApp();

  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [imgFading, setImgFading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'shipping'>('overview');

  // For inline review form
  const [rStars, setRStars] = useState(0);
  const [rHoverStars, setRHoverStars] = useState(0);
  const [rBody, setRBody] = useState('');
  const [rImage, setRImage] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [ratingError, setRatingError] = useState(false);
  const [isSubmittingInlineReview, setIsSubmittingInlineReview] = useState(false);

  const product = products.find((p) => p.id === selectedProductId);
  const cartItem = product
    ? cart.find(
        (item) =>
          item.product.id === product.id ||
          item.product._id === product._id ||
          (product._id && String(item.product.id) === String(product._id)) ||
          (product.id && String(item.product._id) === String(product.id)) ||
          (product._id && String(item.product._id) === String(product._id))
      )
    : null;
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  useEffect(() => {
    if (product) {
      const targetId = product._id || product.sku || product.id;
      fetchProductReviews(targetId, product.name);
    }
  }, [product?.id, product?._id]);

  if (!product) {
    return (
      <div className="w-full bg-[#FAFBFD] min-h-[70vh] flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-[440px] bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-950 mb-2">Product Not Found</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            This item may have been moved, renamed, or is currently out of catalog.
          </p>
          <button
            type="button"
            className="btn-primary w-full min-h-[44px] text-sm font-semibold"
            onClick={() => setCurPage('products')}
          >
            Return to Catalog
          </button>
        </div>
      </div>
    );
  }

  // Reviews & rating
  const prodReviews = reviews.filter((r) => {
    if (!r.approved) return false;

    const matchesName =
      r.product &&
      product.name &&
      r.product.toLowerCase().trim() === product.name.toLowerCase().trim();

    const matchesProductId =
      r.productId !== undefined &&
      ((product._id && String(r.productId) === String(product._id)) ||
        (product.id && String(r.productId) === String(product.id)) ||
        (product.sku && String(r.productId) === String(product.sku)));

    const matchesDirectRef =
      r.product &&
      ((product._id && String(r.product) === String(product._id)) ||
        (product.id && String(r.product) === String(product.id)) ||
        (product.sku && String(r.product) === String(product.sku)));

    return Boolean(matchesName || matchesProductId || matchesDirectRef);
  });

  const count = prodReviews.length || product.reviewCount || product.totalReviews || 0;
  const rating = prodReviews.length
    ? (prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length).toFixed(1)
    : (count > 0 ? (product.rating || product.averageRating || 0).toFixed(1) : (0).toFixed(1));

  const recommendCount = prodReviews.filter((r) => r.rating >= 4).length;
  const recommendPct = prodReviews.length > 0 ? Math.round((recommendCount / prodReviews.length) * 100) : 0;

  // Star breakdown calculation
  const starBreakdown = [5, 4, 3, 2, 1].map((s) => {
    const matching = prodReviews.filter((r) => Math.round(r.rating) === s).length;
    const pct = prodReviews.length > 0 ? Math.round((matching / prodReviews.length) * 100) : 0;
    return { star: s, count: matching, pct };
  });

  // Pricing
  const discountPct = product.discount > 0 ? product.discount : 15;
  const mrp = product.originalPrice
    ? product.originalPrice
    : Math.round(product.price / (1 - discountPct / 100));
  const savings = mrp - product.price;

  // Suggested products
  const suggested = products
    .filter((p) => p.cat === product.cat && p.id !== product.id)
    .slice(0, 4);

  // Image switch with subtle fade
  const handleThumbnailClick = (idx: number) => {
    if (idx === activeImgIdx) return;
    setImgFading(true);
    setTimeout(() => {
      setActiveImgIdx(idx);
      setImgFading(false);
    }, 120);
  };

  const renderStars = (ratingVal: number, size = 15) => {
    const full = Math.floor(ratingVal);
    const hasHalf = ratingVal - full >= 0.4;
    return Array.from({ length: 5 }, (_, i) => {
      const isFull = i < full;
      const isHalf = !isFull && hasHalf && i === full;
      return (
        <Star
          key={i}
          size={size}
          className={isFull || isHalf ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}
          strokeWidth={1.5}
        />
      );
    });
  };

  const reviewsScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollReviews = (dir: 'left' | 'right') => {
    if (reviewsScrollRef.current) {
      const scrollAmt = dir === 'left' ? -380 : 380;
      reviewsScrollRef.current.scrollBy({ left: scrollAmt, behavior: 'smooth' });
    }
  };

  const handleInlineImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setRImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Inline review submit
  const handleInlineReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rStars === 0) {
      setRatingError(true);
      return;
    }
    if (!rBody.trim()) return;

    setIsSubmittingInlineReview(true);
    try {
      const targetId = product._id || product.sku || product.id;
      const authorName = curUser ? curUser.name : guestName.trim() || 'Customer';
      const res = await submitReview(
        authorName,
        rStars,
        rBody.trim(),
        product.name,
        product._id || String(product.id),
        rImage
      );
      if (res && res.success) {
        setRStars(0);
        setRBody('');
        setRImage(null);
        setGuestName('');
        setRatingError(false);
        showToast('Review submitted successfully!');
        setTimeout(() => {
          fetchProductReviews(targetId, product.name);
        }, 500);
      }
    } finally {
      setIsSubmittingInlineReview(false);
    }
  };

  // Guest review modal submit
  const handleGuestReview = async (
    _email: string,
    name: string,
    stars: number,
    body: string,
    image?: string | null
  ) => {
    const targetId = product._id || product.sku || product.id;
    const res = await submitReview(
      name,
      stars,
      body,
      product.name,
      product._id || String(product.id),
      image
    );
    if (res && res.success) {
      showToast('Review submitted successfully!');
      setTimeout(() => {
        fetchProductReviews(targetId, product.name);
      }, 500);
      return true;
    }
    return false;
  };

  return (
    <div className="w-full bg-[#FAFBFD] min-h-screen text-slate-900 pb-20 lg:pb-16">
      {/* Review Modal */}
      {reviewModalOpen && (
        <ReviewModal
          productName={product.name}
          onClose={() => setReviewModalOpen(false)}
          onSubmit={(name, _email, stars, body, image) => handleGuestReview(_email, name, stars, body, image)}
        />
      )}

      {/* ── Top Header / Breadcrumbs Bar ── */}
      <div className="border-b border-slate-200/80 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <nav
            className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap"
            aria-label="Breadcrumb"
          >
            <button
              type="button"
              onClick={() => setCurPage('home')}
              className="text-slate-600 hover:text-slate-950 transition-colors cursor-pointer py-1"
            >
              Home
            </button>
            <ChevronRight size={13} className="text-slate-400 shrink-0" />
            <button
              type="button"
              onClick={() => {
                setCurFilter('All');
                setCurPage('products');
              }}
              className="text-slate-600 hover:text-slate-950 transition-colors cursor-pointer py-1"
            >
              Catalog
            </button>
            <ChevronRight size={13} className="text-slate-400 shrink-0" />
            <button
              type="button"
              onClick={() => {
                setCurFilter(product.cat);
                setCurPage('products');
              }}
              className="text-slate-600 hover:text-slate-950 transition-colors cursor-pointer py-1"
            >
              {product.cat}
            </button>
            <ChevronRight size={13} className="text-slate-400 shrink-0" />
            <span className="text-slate-950 font-bold truncate max-w-[240px] sm:max-w-md">
              {product.name}
            </span>
          </nav>

          <button
            type="button"
            onClick={() => {
              setCurFilter('All');
              setCurPage('products');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 transition-colors py-1 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to catalog</span>
          </button>
        </div>
      </div>

      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* ── Main Product Display Grid: Sticky Image (left) + Full Scrolling Details (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start mb-16">
          
          {/* Left Column: Sticky Image Gallery (6 cols on lg, 50% width) */}
          <div className="lg:col-span-6 xl:col-span-6 lg:sticky lg:top-[88px] self-start space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
              {/* Gallery Stage: Vertical/Horizontal Thumbnails + Hero Image */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 items-start w-full">
                {/* Thumbnail Rail (Horizontal on mobile, vertical on sm+) */}
                {product.imgs && product.imgs.length > 1 && (
                  <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto max-w-full sm:max-h-[460px] scrollbar-thin pb-1 sm:pb-0 pr-0 sm:pr-1.5 shrink-0 w-full sm:w-auto">
                    {product.imgs.map((src, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleThumbnailClick(idx)}
                        aria-label={`View product image ${idx + 1}`}
                        className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl border p-1 bg-slate-50 overflow-hidden cursor-pointer transition-all shrink-0 flex items-center justify-center ${
                          idx === activeImgIdx
                            ? 'border-slate-950 ring-2 ring-slate-950/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={src}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-contain mix-blend-multiply transition-transform hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Primary Hero Stage */}
                <div className="flex-1 min-w-0">
                  <div className="relative aspect-square w-full bg-slate-50/80 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex items-center justify-center p-6 sm:p-8 group select-none">
                    {product.imgs && product.imgs.length > 0 ? (
                      <img
                        src={product.imgs[activeImgIdx]}
                        alt={product.name}
                        className={`w-full h-full object-contain mix-blend-multiply transition-all duration-300 group-hover:scale-105 ${
                          imgFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                        }`}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Sparkles size={36} className="opacity-40 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-600">Authentic Product</span>
                      </div>
                    )}

                    {/* Floating Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                      {product.badge && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-950 text-white shadow-2xs">
                          {product.badge}
                        </span>
                      )}
                      {discountPct > 0 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-700 text-white shadow-2xs">
                          {discountPct}% OFF
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 right-3 text-[10px] font-semibold text-slate-500 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                      Hover to preview
                    </div>
                  </div>
                </div>
              </div>

              {/* Security & Service Micro-Cards */}
              <div className="grid grid-cols-3 gap-2.5 pt-4 mt-4 border-t border-slate-100">
                <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <ShieldCheck size={16} className="text-slate-950 mb-1" />
                  <span className="text-[11px] font-bold text-slate-950">100% Genuine</span>
                  <span className="text-[10px] text-slate-500">Quality tested</span>
                </div>
                <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Truck size={16} className="text-slate-950 mb-1" />
                  <span className="text-[11px] font-bold text-slate-950">Express Delivery</span>
                  <span className="text-[10px] text-slate-500">Free on ₹499+</span>
                </div>
                <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <RotateCcw size={16} className="text-slate-950 mb-1" />
                  <span className="text-[11px] font-bold text-slate-950">7-Day Return</span>
                  <span className="text-[10px] text-slate-500">Replacement</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Complete Scrolling Product Details (6 cols on lg, 50% width) */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-8 flex flex-col">
            
            {/* 1. Main Buy Box & Pricing Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
              {/* Header: Category & Live Stock Pill */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-3 py-1 rounded-md">
                  {product.cat}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  In Stock • Dispatches in 24h
                </span>
              </div>

              {/* Product Title */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight leading-tight mb-2.5">
                  {product.name}
                </h1>

                {/* Rating & Review Anchor Link */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    <div className="flex gap-0.5">{renderStars(parseFloat(rating), 14)}</div>
                    <span className="text-xs font-bold text-slate-950 ml-1">{rating}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('product-reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-950 underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    ({count} verified customer reviews)
                  </button>
                </div>
              </div>

              {/* Price Box */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-price">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  {mrp > product.price && (
                    <span className="text-base text-slate-500 line-through font-price font-medium">
                      ₹{mrp.toLocaleString('en-IN')}
                    </span>
                  )}
                  {savings > 0 && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                      Save ₹{savings.toLocaleString('en-IN')} ({discountPct}%)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-medium mt-2 flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-700 shrink-0" />
                  Inclusive of all taxes • Free doorstep delivery on this order
                </p>
              </div>

              {/* Product Summary */}
              <p className="text-sm text-slate-700 leading-relaxed">
                {product.desc}
              </p>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Main Purchase CTA Zone */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Buy Now Button (Clean concise name) */}
                  <button
                    type="button"
                    disabled={addingProductId === product.id}
                    onClick={async () => {
                      await addToCart(product, 1);
                      setCurPage('checkout');
                    }}
                    className="flex-1 min-h-[48px] rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {addingProductId === product.id ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Buy Now</span>
                    )}
                  </button>

                  {/* Add to Cart / Quantity Stepper */}
                  {quantityInCart > 0 ? (
                    <div className="flex items-center justify-between border-2 border-slate-950 rounded-xl min-h-[48px] bg-white flex-1 px-3 shadow-xs select-none">
                      <button
                        type="button"
                        onClick={() => {
                          const targetId = product._id || product.id;
                          if (quantityInCart === 1) {
                            removeFromCart(targetId);
                            showToast(`${product.name} removed from cart.`);
                          } else {
                            updateCartQty(targetId, quantityInCart - 1);
                          }
                        }}
                        className="w-10 h-10 flex items-center justify-center text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer rounded-lg min-h-[44px] min-w-[44px]"
                        title="Decrease quantity"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} strokeWidth={2.5} />
                      </button>
                      <span className="text-xs font-bold text-slate-950 font-price flex items-center gap-1.5">
                        <Check size={14} className="text-emerald-700 stroke-[3]" />
                        {quantityInCart} in Cart
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const targetId = product._id || product.id;
                          updateCartQty(targetId, quantityInCart + 1);
                        }}
                        className="w-10 h-10 flex items-center justify-center text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer rounded-lg min-h-[44px] min-w-[44px]"
                        title="Increase quantity"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={addingProductId === product.id}
                      onClick={async () => {
                        await addToCart(product, 1);
                      }}
                      className="flex-1 min-h-[48px] rounded-xl border-2 border-slate-950 bg-white text-slate-950 font-bold text-sm hover:bg-slate-50 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
                    >
                      {addingProductId === product.id ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-slate-950" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={16} />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-center gap-4 text-center text-xs text-slate-600 pt-1">
                  <span>⚡ Pan-India Priority Dispatch</span>
                  <span>•</span>
                  <span>🔒 256-Bit SSL Encrypted</span>
                </div>
              </div>
            </div>

            {/* 2. Tabbed Section: Details, Specs, Shipping */}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 sm:gap-4 border-b border-slate-200 pb-4 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all min-h-[44px] cursor-pointer shrink-0 ${
                    activeTab === 'overview'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  Description &amp; Highlights
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('specs')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all min-h-[44px] cursor-pointer shrink-0 ${
                    activeTab === 'specs'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  Technical Specifications
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('shipping')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all min-h-[44px] cursor-pointer shrink-0 ${
                    activeTab === 'shipping'
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                >
                  Shipping &amp; Returns
                </button>
              </div>

              {/* Tab Contents */}
              <div className="pt-6">
                {activeTab === 'overview' && (
                  <div className="space-y-4 max-w-3xl">
                    <h3 className="text-base font-bold text-slate-950">About this product</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{product.desc}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider mb-1">
                          Target Cleaning Application
                        </h4>
                        <p className="text-xs text-slate-600">
                          Formulated for deep residential &amp; commercial cleanliness with non-abrasive residues.
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider mb-1">
                          Safety &amp; Storage
                        </h4>
                        <p className="text-xs text-slate-600">
                          Store in a cool dry space away from direct sunlight. Non-hazardous when used as instructed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'specs' && (
                  <div className="max-w-3xl">
                    <h3 className="text-base font-bold text-slate-950 mb-4">Detailed Specifications</h3>
                    {product.specs && Object.keys(product.specs).length > 0 ? (
                      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden text-sm">
                        {Object.entries(product.specs).map(([key, value]) => {
                          if (!value) return null;
                          return (
                            <div
                              className="flex justify-between px-4 py-3 bg-white even:bg-slate-50/70"
                              key={key}
                            >
                              <span className="text-slate-600 font-medium">{key}</span>
                              <span className="text-slate-950 font-semibold text-right max-w-[60%]">
                                {value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden text-sm">
                        <div className="flex justify-between px-4 py-3 bg-white">
                          <span className="text-slate-600 font-medium">Category</span>
                          <span className="text-slate-950 font-semibold">{product.cat}</span>
                        </div>
                        <div className="flex justify-between px-4 py-3 bg-slate-50/70">
                          <span className="text-slate-600 font-medium">Product Code / SKU</span>
                          <span className="text-slate-950 font-mono font-semibold">
                            {product.sku || `HC-${product.id}`}
                          </span>
                        </div>
                        <div className="flex justify-between px-4 py-3 bg-white">
                          <span className="text-slate-600 font-medium">Standard Pack</span>
                          <span className="text-slate-950 font-semibold">1 Unit</span>
                        </div>
                        <div className="flex justify-between px-4 py-3 bg-slate-50/70">
                          <span className="text-slate-600 font-medium">Country of Origin</span>
                          <span className="text-slate-950 font-semibold">India</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'shipping' && (
                  <div className="space-y-4 max-w-3xl text-sm text-slate-700">
                    <h3 className="text-base font-bold text-slate-950">Fast Shipping &amp; Seamless Returns</h3>
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                        <Truck size={20} className="text-slate-950 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-slate-950">Estimated Delivery Time</h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Metro cities: 2–3 business days. Rest of India: 4–6 business days. Tracking details sent via SMS &amp; Email immediately upon dispatch.
                          </p>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                        <RotateCcw size={20} className="text-slate-950 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-slate-950">7-Day Replacement Policy</h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            If the product arrives damaged or defective, we provide an instant free replacement without hassle.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 3. Overall Ratings & Write a Review Card (in Right Column) */}
            <section id="pd-ratings-summary-card" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                    Customer Satisfaction
                  </span>
                  <h3 className="text-lg font-bold text-slate-950 font-manrope">
                    Ratings &amp; Review Summary
                  </h3>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 font-stat">
                  {count} Ratings
                </span>
              </div>

              {/* Overall Score Pillar & Star Distribution */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <div className="sm:col-span-5 text-center sm:text-left sm:border-r border-slate-200 sm:pr-4">
                  <div className="text-4xl sm:text-5xl font-black text-slate-950 tracking-tight font-stat mb-1">
                    {rating}
                  </div>
                  <div className="flex justify-center sm:justify-start gap-0.5 mb-1.5">
                    {renderStars(parseFloat(rating), 16)}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-600">
                    Based on {count} verified ratings
                  </p>
                  <p className="text-[10px] text-emerald-800 font-bold mt-1">
                    ✓ {recommendPct}% recommend this product
                  </p>
                </div>

                {/* Star Distribution Bars */}
                <div className="sm:col-span-7 space-y-2">
                  {starBreakdown.map(({ star, pct }) => (
                    <div key={star} className="flex items-center gap-2 text-[11px]">
                      <div className="flex items-center gap-1 w-10 shrink-0 font-bold text-slate-950">
                        <span>{star}</span>
                        <Star size={10} className="text-amber-500 fill-amber-400" />
                      </div>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-950 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-stat text-slate-600 font-semibold shrink-0">
                        {pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Write a Review Section */}
              <div id="pd-inline-review-form" className="pt-2 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-950 mb-1 font-manrope">
                  {curUser ? 'Leave Your Verified Review' : 'Write a Customer Review'}
                </h4>
                <p className="text-xs text-slate-600 mb-4">
                  Share your authentic feedback with photo attachments to help other shoppers.
                </p>

                {curUser ? (
                  <form className="flex flex-col gap-4" onSubmit={handleInlineReview}>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                      Posting as <strong className="text-slate-950 font-bold">{curUser.name}</strong> ({curUser.email})
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-950 mb-1.5">
                        Your Rating <span className="text-rose-600">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: 5 }, (_, i) => {
                          const val = i + 1;
                          const active = val <= (rHoverStars || rStars);
                          return (
                            <button
                              type="button"
                              key={i}
                              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-transform cursor-pointer"
                              onMouseEnter={() => setRHoverStars(val)}
                              onMouseLeave={() => setRHoverStars(0)}
                              onClick={() => {
                                setRStars(val);
                                setRatingError(false);
                              }}
                              aria-label={`Rate ${val} stars`}
                            >
                              <Star
                                size={22}
                                className={active ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}
                                strokeWidth={1.5}
                              />
                            </button>
                          );
                        })}
                      </div>
                      {ratingError && (
                        <p className="text-xs font-semibold text-rose-600 mt-1">
                          Please select a star rating.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-950 mb-1.5">
                        Review Description <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        className="w-full border border-slate-300 rounded-xl p-3 text-xs sm:text-sm text-slate-950 bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400 min-h-[90px] resize-y"
                        placeholder={`Tell other buyers about your experience with ${product.name}...`}
                        rows={3}
                        value={rBody}
                        onChange={(e) => setRBody(e.target.value)}
                        required
                      />
                    </div>

                    {/* Image Attachment */}
                    <div>
                      <label className="block text-xs font-bold text-slate-950 mb-1.5">
                        Attach Product Photo <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      {rImage ? (
                        <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden group bg-slate-50 shadow-xs">
                          <img
                            src={rImage}
                            alt="Attached preview"
                            className="w-20 h-20 object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => setRImage(null)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-950/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                            aria-label="Remove photo"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-3 px-3.5 py-2.5 border border-dashed border-slate-300 hover:border-slate-950 rounded-xl bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-all group">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-slate-950 group-hover:border-slate-400 transition-colors shrink-0">
                            <Camera size={16} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-950 truncate">
                              Add a photo of product
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              PNG, JPG, WebP up to 5MB
                            </span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleInlineImageSelect}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingInlineReview}
                      className="btn-primary min-h-[44px] text-xs font-semibold px-6 cursor-pointer w-full flex items-center justify-center gap-2"
                    >
                      {isSubmittingInlineReview ? (
                        <>
                          <Loader2 size={15} className="animate-spin text-white" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>Publish Review</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div
                    onClick={() => setReviewModalOpen(true)}
                    className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-slate-400 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shrink-0">
                        <MessageSquarePlus size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-950 font-manrope">
                          Write a verified review
                        </h4>
                        <p className="text-[11px] text-slate-600">
                          No account needed. Share feedback &amp; photos in seconds.
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* ── Customer Written Reviews Horizontal Scroll Track (Below Overall Product Details) ── */}
        <section
          id="product-reviews-section"
          className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 mb-14 overflow-hidden"
        >
          {/* Section Header with Navigation Arrows & Action */}
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Customer Reviews &amp; Photos
                </span>
                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 font-stat">
                  {prodReviews.length} {prodReviews.length === 1 ? 'Review' : 'Reviews'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight font-manrope">
                What Our Verified Buyers Say
              </h2>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollReviews('left')}
                className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                aria-label="Scroll previous reviews"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => scrollReviews('right')}
                className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                aria-label="Scroll next reviews"
              >
                <ChevronRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (curUser) {
                    document.getElementById('pd-inline-review-form')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    setReviewModalOpen(true);
                  }
                }}
                className="btn-primary min-h-[40px] text-xs font-semibold px-4 flex items-center gap-1.5 cursor-pointer ml-2"
              >
                <MessageSquarePlus size={14} />
                <span>Write a Review</span>
              </button>
            </div>
          </div>

          {/* Horizontal Scroll Track */}
          {prodReviews.length > 0 ? (
            <div
              ref={reviewsScrollRef}
              className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth"
              style={{ scrollbarWidth: 'thin' }}
            >
              {prodReviews.map((review) => (
                <div
                  key={review.id}
                  className="w-[300px] sm:w-[360px] md:w-[390px] shrink-0 snap-start flex"
                >
                  <ReviewCard review={review} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-14 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400 shadow-2xs">
                <Star size={22} />
              </div>
              <h4 className="text-base font-bold text-slate-950 mb-1 font-manrope">No customer reviews yet</h4>
              <p className="text-xs sm:text-sm text-slate-600 mb-5 max-w-sm mx-auto">
                Be the first to share your honest review for {product.name}.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (curUser) {
                    document.getElementById('pd-inline-review-form')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    setReviewModalOpen(true);
                  }
                }}
                className="btn-primary min-h-[40px] text-xs font-semibold px-5 cursor-pointer"
              >
                Write the First Review
              </button>
            </div>
          )}
        </section>

        {/* ── Suggested / Related Products ── */}
        {suggested.length > 0 && (
          <section className="mb-10">
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Discover More
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                  Related in {product.cat}
                </h3>
              </div>
              <button
                type="button"
                className="text-xs font-bold text-slate-900 hover:text-black transition-colors cursor-pointer flex items-center gap-1 py-1"
                onClick={() => {
                  setCurFilter(product.cat);
                  setCurPage('products');
                }}
              >
                View all in {product.cat} <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {suggested.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedProductId(p.id);
                    setCurPage('product-detail');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="cursor-pointer"
                >
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ── Mobile Sticky Bottom Buy Bar (visible on sm/xs screens) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {product.imgs && product.imgs[0] && (
            <img
              src={product.imgs[0]}
              alt={product.name}
              className="w-10 h-10 object-contain rounded-md border border-slate-200 bg-slate-50 shrink-0 p-0.5"
            />
          )}
          <div className="truncate">
            <p className="text-xs font-bold text-slate-950 truncate max-w-[130px]">
              {product.name}
            </p>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-sm font-black text-slate-950">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {mrp > product.price && (
                <span className="text-[11px] text-slate-500 line-through">
                  ₹{mrp.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {quantityInCart > 0 ? (
            <div className="flex items-center border border-slate-950 rounded-xl h-[44px] bg-white px-1">
              <button
                type="button"
                onClick={() => {
                  const targetId = product._id || product.id;
                  if (quantityInCart === 1) {
                    removeFromCart(targetId);
                  } else {
                    updateCartQty(targetId, quantityInCart - 1);
                  }
                }}
                className="w-8 h-8 flex items-center justify-center text-slate-950 rounded"
                aria-label="Decrease quantity"
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="text-xs font-bold font-mono px-2 text-slate-950">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={() => {
                  const targetId = product._id || product.id;
                  updateCartQty(targetId, quantityInCart + 1);
                }}
                className="w-8 h-8 flex items-center justify-center text-slate-950 rounded"
                aria-label="Increase quantity"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={addingProductId === product.id}
              onClick={async () => {
                await addToCart(product, 1);
              }}
              className="min-h-[44px] px-3.5 rounded-xl border border-slate-950 bg-white text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <ShoppingCart size={14} />
              <span>Add</span>
            </button>
          )}

          <button
            type="button"
            disabled={addingProductId === product.id}
            onClick={async () => {
              await addToCart(product, 1);
              setCurPage('checkout');
            }}
            className="min-h-[44px] px-4 rounded-xl bg-slate-950 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
          >
            <span>Buy Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
