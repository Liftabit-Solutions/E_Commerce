import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../../core/context/AppContext';
import type { Product, ProductVariant } from '../../../core/types';
import { parseProductVariants } from '../../../utils/productVariants';
import ReviewCard from '../components/ReviewCard';
import ProductCard from '../components/ProductCard';
import {
  Star,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  AlertTriangle,
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
  Camera,
  FileText,
  SlidersHorizontal
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
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Please enter a valid email.';
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
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-[#262824]/60 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-[#f7f6f2] rounded-[2px] border border-[#dfdfd8] shadow-2xl w-full max-w-[520px] overflow-hidden animate-fadeIn">
        <div className="flex items-start justify-between p-6 pb-4 border-b border-[#dfdfd8] bg-white">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#777971]">Customer Review</span>
            <h3 className="text-lg font-display font-semibold text-[#262824] mt-0.5">Share your experience</h3>
            <p className="text-xs text-[#777971] mt-0.5">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[2px] border border-[#dfdfd8] flex items-center justify-center text-[#777971] hover:bg-[#eeede7] hover:text-[#262824] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 max-h-[85vh] overflow-y-auto">
          {submitted ? (
            <div className="text-center py-8 animate-fadeIn">
              <div className="w-12 h-12 rounded-[2px] bg-[#edf3ee] border border-[#a8c6b0] flex items-center justify-center mx-auto mb-4 text-[#3d6547]">
                <CheckCircle size={24} />
              </div>
              <h4 className="text-lg font-display font-semibold text-[#262824] mb-1">Thank you, {name.split(' ')[0]}</h4>
              <p className="text-xs text-[#777971] max-w-[320px] mx-auto leading-relaxed">
                Your review has been recorded and will appear on the product page once verified.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 btn-primary text-xs font-semibold px-7 min-h-[42px] rounded-[2px] uppercase tracking-wider"
              >
                Done
              </button>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#262824] mb-1.5">
                    Your Name <span className="text-[#8e2a2a]">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrors((p) => ({ ...p, name: '' }));
                    }}
                    placeholder="Priya Sharma"
                    className={`input-field ${
                      errors.name ? 'border-[#8e2a2a] bg-[#f9eded]' : ''
                    }`}
                  />
                  {errors.name && <p className="text-[11px] text-[#8e2a2a] mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#262824] mb-1.5">
                    Email Address <span className="text-[#8e2a2a]">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((p) => ({ ...p, email: '' }));
                    }}
                    placeholder="priya@example.com"
                    className={`input-field ${
                      errors.email ? 'border-[#8e2a2a] bg-[#f9eded]' : ''
                    }`}
                  />
                  {errors.email && <p className="text-[11px] text-[#8e2a2a] mt-1">{errors.email}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#262824] mb-1.5">
                  Rating <span className="text-[#8e2a2a]">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }, (_, i) => {
                    const val = i + 1;
                    const active = val <= (hoverStars || stars);
                    return (
                      <Star
                        key={i}
                        size={22}
                        className="cursor-pointer transition-transform duration-100 hover:scale-110"
                        fill={active ? '#262824' : 'none'}
                        stroke={active ? '#262824' : '#dfdfd8'}
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
                    <span className="ml-2.5 text-xs font-semibold text-[#262824]">
                      {starLabels[hoverStars || stars]}
                    </span>
                  )}
                </div>
                {errors.stars && <p className="text-[11px] text-[#8e2a2a] mt-1">{errors.stars}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#262824] mb-1.5">
                  Your Review <span className="text-[#8e2a2a]">*</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    setErrors((p) => ({ ...p, body: '' }));
                  }}
                  placeholder={`Share your feedback on ${productName}...`}
                  rows={4}
                  className={`input-field resize-y ${
                    errors.body ? 'border-[#8e2a2a] bg-[#f9eded]' : ''
                  }`}
                />
                {errors.body && <p className="text-[11px] text-[#8e2a2a] mt-1">{errors.body}</p>}
              </div>

              {/* Photo Attachment Field */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#262824] mb-1.5">
                  Attach Product Photo <span className="text-[#777971] normal-case tracking-normal">(Optional)</span>
                </label>
                {image ? (
                  <div className="relative inline-block border border-[#dfdfd8] rounded-[2px] overflow-hidden group bg-white">
                    <img src={image} alt="Review attachment preview" className="w-24 h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-[2px] bg-[#262824] hover:bg-[#8e2a2a] text-white flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Remove photo"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-[#dfdfd8] hover:border-[#262824] rounded-[2px] bg-white cursor-pointer transition-all group">
                    <div className="w-8 h-8 rounded-[2px] bg-[#f7f6f2] border border-[#dfdfd8] flex items-center justify-center text-[#777971] group-hover:text-[#262824] transition-colors shrink-0">
                      <Camera size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[#262824]">
                        Add a photo of your product
                      </span>
                      <span className="text-[11px] text-[#777971]">
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
                {errors.image && <p className="text-[11px] text-[#8e2a2a] mt-1">{errors.image}</p>}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <span className="text-[11px] text-[#777971]">
                  Verified buyer reviews only.
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs font-semibold px-6 min-h-[42px] rounded-[2px] uppercase tracking-wider"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} /> <span>Submit Review</span>
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
  const [openAccordions, setOpenAccordions] = useState<{
    description: boolean;
    specs: boolean;
    shipping: boolean;
  }>({
    description: true,
    specs: false,
    shipping: false
  });

  const toggleAccordion = (key: 'description' | 'specs' | 'shipping') => {
    setOpenAccordions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Carousel navigation state
  const reviewsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const product = products.find((p) => p.id === selectedProductId);

  // Parse size/quantity variants
  const variants = useMemo<ProductVariant[]>(() => {
    if (!product) return [];
    if (product.variants && product.variants.length > 0) return product.variants;
    return parseProductVariants(product.specs?.Size, product.stock, product.price);
  }, [product?.id, product?.specs?.Size, product?.stock, product?.price, product?.variants]);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Auto-select first in-stock variant when variants load
  useEffect(() => {
    if (variants.length > 0) {
      const available = variants.find((v) => v.stock > 0) || variants[0];
      setSelectedVariant(available);
    } else {
      setSelectedVariant(null);
    }
  }, [variants]);

  const activePrice = selectedVariant && selectedVariant.price ? selectedVariant.price : (product ? product.price : 0);
  const activeStock = selectedVariant ? selectedVariant.stock : (product ? (product.stock ?? 0) : 0);

  const cartItem = product
    ? cart.find(
        (item) =>
          (item.product.id === product.id ||
          item.product._id === product._id ||
          (product._id && String(item.product.id) === String(product._id)) ||
          (product.id && String(item.product._id) === String(product.id)) ||
          (product._id && String(item.product._id) === String(product._id))) &&
          (!selectedVariant || !item.product.specs?.Size || item.product.specs.Size === selectedVariant.size)
      )
    : null;
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  useEffect(() => {
    if (product) {
      const targetId = product._id || product.sku || product.id;
      fetchProductReviews(targetId, product.name);
    }
  }, [product?.id, product?._id]);

  // Extract all available product images reliably
  const productImages = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    const legacyImg = (product as any).img;
    if (legacyImg && typeof legacyImg === 'string' && legacyImg.trim()) {
      list.push(legacyImg);
    }
    if (Array.isArray(product.imgs)) {
      product.imgs.forEach((img) => {
        if (img && typeof img === 'string' && img.trim() && !list.includes(img)) {
          list.push(img);
        }
      });
    }
    if (Array.isArray(product.images)) {
      product.images.forEach((imgObj) => {
        if (imgObj && typeof imgObj === 'object' && imgObj.url && !list.includes(imgObj.url)) {
          list.push(imgObj.url);
        }
      });
    }
    return list;
  }, [product]);

  // Handle active image index boundary check
  useEffect(() => {
    setActiveImgIdx(0);
  }, [selectedProductId]);

  if (!product) {
    return (
      <div className="w-full bg-[#f7f6f2] min-h-[70vh] flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-[440px] bg-white border border-[#dfdfd8] rounded-[2px] p-8">
          <div className="w-12 h-12 rounded-[2px] bg-[#f9eded] border border-[#d9a5a5] flex items-center justify-center mx-auto mb-4 text-[#8e2a2a]">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-display font-semibold text-[#262824] mb-2">Product Not Found</h2>
          <p className="text-sm text-[#777971] mb-6 leading-relaxed">
            This item may have been moved, renamed, or is currently out of catalog.
          </p>
          <button
            type="button"
            className="btn-primary w-full min-h-[44px] text-xs font-semibold uppercase tracking-wider rounded-[2px]"
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

  // Pricing mapped from active size/quantity variant
  const discountPct = product.discount > 0 ? product.discount : 15;
  const mrp = product.originalPrice
    ? (product.price > 0 ? Math.round(product.originalPrice * (activePrice / product.price)) : product.originalPrice)
    : Math.round(activePrice / (1 - discountPct / 100));
  const savings = mrp - activePrice;

  // Live stock status mapped from active size/quantity variant
  const isOutOfStock = activeStock <= 0;
  const isLowStock = activeStock > 0 && activeStock <= 5;

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

  const renderStars = (ratingVal: number, size = 13) => {
    const full = Math.floor(ratingVal);
    const hasHalf = ratingVal - full >= 0.4;
    return Array.from({ length: 5 }, (_, i) => {
      const isFull = i < full;
      const isHalf = !isFull && hasHalf && i === full;
      return (
        <Star
          key={i}
          size={size}
          className={isFull || isHalf ? 'text-[#262824] fill-[#262824]' : 'text-[#dfdfd8]'}
          strokeWidth={1.5}
        />
      );
    });
  };

  // Check scroll bounds for review carousel
  const checkReviewScrollBounds = () => {
    if (reviewsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = reviewsScrollRef.current;
      setCanScrollLeft(scrollLeft > 15);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 15);
    }
  };

  useEffect(() => {
    checkReviewScrollBounds();
    const handleResize = () => checkReviewScrollBounds();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [prodReviews.length]);

  const scrollReviews = (dir: 'left' | 'right') => {
    if (reviewsScrollRef.current) {
      const scrollAmt = dir === 'left' ? -380 : 380;
      reviewsScrollRef.current.scrollBy({ left: scrollAmt, behavior: 'smooth' });
      setTimeout(checkReviewScrollBounds, 350);
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
    <div className="w-full bg-[#f7f6f2] min-h-screen text-[#262824] pb-20 lg:pb-16 font-body">
      {/* Review Modal */}
      {reviewModalOpen && (
        <ReviewModal
          productName={product.name}
          onClose={() => setReviewModalOpen(false)}
          onSubmit={(name, _email, stars, body, image) => handleGuestReview(_email, name, stars, body, image)}
        />
      )}

      {/* ── Top Header / Breadcrumbs Bar ── */}
      <div className="border-b border-[#dfdfd8] bg-[#f7f6f2]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <nav
            className="flex items-center gap-2 text-xs text-[#777971] font-medium flex-wrap"
            aria-label="Breadcrumb"
          >
            <button
              type="button"
              onClick={() => setCurPage('home')}
              className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer py-1"
            >
              Home
            </button>
            <ChevronRight size={13} className="text-[#dfdfd8] shrink-0" />
            <button
              type="button"
              onClick={() => {
                setCurFilter('All');
                setCurPage('products');
              }}
              className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer py-1"
            >
              Catalog
            </button>
            <ChevronRight size={13} className="text-[#dfdfd8] shrink-0" />
            <button
              type="button"
              onClick={() => {
                setCurFilter(product.cat);
                setCurPage('products');
              }}
              className="text-[#777971] hover:text-[#262824] transition-colors cursor-pointer py-1 uppercase tracking-wider text-[11px]"
            >
              {product.cat}
            </button>
            <ChevronRight size={13} className="text-[#dfdfd8] shrink-0" />
            <span className="text-[#262824] font-semibold truncate max-w-[240px] sm:max-w-md">
              {product.name}
            </span>
          </nav>

          <button
            type="button"
            onClick={() => {
              setCurFilter('All');
              setCurPage('products');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#262824] hover:opacity-70 transition-opacity py-1 cursor-pointer uppercase tracking-wider"
          >
            <ArrowLeft size={14} />
            <span>Back to catalog</span>
          </button>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-12">
        {/* ── Main Product Display Grid: Sticky Image with Left Preview Column + Buy Box ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* Left Column: Image Stage with Small Previews on the Left (lg: 7 cols, self-start h-fit to prevent accordion height affecting image) */}
          <div className="lg:col-span-7 xl:col-span-7 lg:sticky lg:top-[88px] self-start h-fit space-y-4">
            <div className="bg-white rounded-[2px] border border-[#dfdfd8] p-4 sm:p-6 shadow-xs w-full">
              
              {/* Product Image Stage: Thumbnails Column Strictly on the Left */}
              <div className="flex flex-row gap-3 sm:gap-4 items-start w-full">
                
                {/* Small Preview Thumbnails Column on the LEFT */}
                {productImages.length > 1 && (
                  <div
                    className="flex flex-col gap-2.5 max-h-[480px] sm:max-h-[540px] overflow-y-auto shrink-0 select-none py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    aria-label="Product image thumbnails"
                  >
                    {productImages.map((src, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleThumbnailClick(idx)}
                        onMouseEnter={() => handleThumbnailClick(idx)}
                        aria-label={`View product image ${idx + 1}`}
                        className={`w-14 h-18 sm:w-16 sm:h-20 rounded-[2px] border p-1 bg-white overflow-hidden cursor-pointer transition-all duration-200 shrink-0 flex items-center justify-center relative ${
                          idx === activeImgIdx
                            ? 'border-[#262824] ring-1 ring-[#262824]'
                            : 'border-[#dfdfd8] hover:border-[#777971] opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={src}
                          alt={`${product.name} preview ${idx + 1}`}
                          className="w-full h-full object-contain mix-blend-multiply transition-transform"
                        />
                        {idx === activeImgIdx && (
                          <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-[#262824]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Primary Hero Stage on the Right of Thumbnails */}
                <div className="flex-1 min-w-0">
                  <div className="relative aspect-[4/5] sm:aspect-square w-full bg-[#eeede7] rounded-[2px] border border-[#dfdfd8] overflow-hidden flex items-center justify-center p-6 sm:p-8 group select-none">
                    {productImages.length > 0 ? (
                      <img
                        src={productImages[activeImgIdx] || productImages[0]}
                        alt={product.name}
                        className={`w-full h-full object-contain mix-blend-multiply transition-all duration-300 group-hover:scale-105 ${
                          imgFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                        }`}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[#777971]">
                        <Sparkles size={36} className="opacity-40 text-[#777971]" />
                        <span className="text-xs font-semibold text-[#262824]">Authentic Product</span>
                      </div>
                    )}

                    {/* Floating Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
                      {product.badge && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-widest bg-[#262824] text-[#f7f6f2]">
                          {product.badge}
                        </span>
                      )}
                      {discountPct > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-widest bg-[#777d62] text-white">
                          {discountPct}% OFF
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 right-3 text-[10px] font-medium text-[#777971] bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-[2px] border border-[#dfdfd8]">
                      {productImages.length > 1 ? `${activeImgIdx + 1} / ${productImages.length}` : 'Editorial standard'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean, Spacious Buy Box & Accordions (lg: 5 cols) */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-6 flex flex-col">
            {/* Primary Buy Box Card */}
            <div className="bg-white rounded-[2px] border border-[#dfdfd8] p-6 sm:p-7 space-y-5">
              
              {/* Header: Category & Live Stock Pill */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#777971] bg-[#f7f6f2] border border-[#dfdfd8] px-2.5 py-1 rounded-[2px]">
                  {product.cat}
                </span>
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8e2a2a] bg-[#f9eded] border border-[#d9a5a5] px-2.5 py-1 rounded-[2px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8e2a2a]" />
                    Out of Stock {selectedVariant ? `• ${selectedVariant.size}` : ''}
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8c571e] bg-[#fbf4ec] border border-[#e0c29f] px-2.5 py-1 rounded-[2px] animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8c571e]" />
                    Only {activeStock} left {selectedVariant ? `(${selectedVariant.size})` : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#3d6547] bg-[#edf3ee] border border-[#a8c6b0] px-2.5 py-1 rounded-[2px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3d6547]" />
                    In Stock {selectedVariant ? `• ${selectedVariant.size} (${activeStock} units)` : ''}
                  </span>
                )}
              </div>

              {/* Product Title & Brand */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#262824] tracking-tight leading-tight mb-2">
                  {product.name}
                </h1>
                {product.brand && (
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#777971] mb-2">
                    Studio: <span className="text-[#262824]">{product.brand}</span>
                  </p>
                )}

                {/* Rating & Review Anchor Link */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1 bg-[#f7f6f2] border border-[#dfdfd8] px-2 py-0.5 rounded-[2px]">
                    <div className="flex gap-0.5">{renderStars(parseFloat(rating), 12)}</div>
                    <span className="text-xs font-semibold text-[#262824] ml-1">{rating}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById('product-reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs text-[#777971] hover:text-[#262824] underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    ({count} verified buyer ratings)
                  </button>
                </div>
              </div>

              {/* Price Box */}
              <div className="p-4 sm:p-5 rounded-[2px] bg-[#f7f6f2] border border-[#dfdfd8]">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-display font-semibold text-[#262824] tracking-tight">
                    ₹{activePrice.toLocaleString('en-IN')}
                  </span>
                  {mrp > activePrice && (
                    <span className="text-sm text-[#777971] line-through font-medium">
                      ₹{mrp.toLocaleString('en-IN')}
                    </span>
                  )}
                  {savings > 0 && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#3d6547] bg-[#edf3ee] border border-[#a8c6b0] px-2 py-0.5 rounded-[2px]">
                      Save ₹{savings.toLocaleString('en-IN')} ({discountPct}%)
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#777971] mt-2 flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-[#3d6547] shrink-0" />
                  Inclusive of all taxes • Free express shipping on this item
                </p>
              </div>

              {/* Product Size / Quantity Available Selector */}
              {variants.length > 0 && (
                <div className="p-4 rounded-[2px] bg-white border border-[#dfdfd8] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#262824] flex items-center gap-1.5">
                      <span>Available Size / Quantity:</span>
                      {selectedVariant && (
                        <strong className="text-[#3d6547] lowercase font-mono">({selectedVariant.size})</strong>
                      )}
                    </span>
                    <span className="text-[11px] font-semibold text-[#777971]">
                      {activeStock > 0 ? (
                        activeStock <= 5 ? (
                          <span className="text-[#8c571e] font-bold">Only {activeStock} left</span>
                        ) : (
                          <span className="text-[#3d6547]">{activeStock} in stock</span>
                        )
                      ) : (
                        <span className="text-[#8e2a2a] font-bold">Out of stock</span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {variants.map((v) => {
                      const isSelected = selectedVariant?.size === v.size;
                      const isVariantOut = v.stock <= 0;
                      const variantPrice = v.price || activePrice;
                      return (
                        <button
                          key={v.size}
                          type="button"
                          onClick={() => setSelectedVariant(v)}
                          className={`p-3 rounded-[2px] text-xs transition-all cursor-pointer border text-left flex flex-col justify-between min-h-[58px] relative ${
                            isSelected
                              ? 'bg-[#262824] text-[#f7f6f2] border-[#262824] shadow-xs'
                              : isVariantOut
                              ? 'bg-[#f7f6f2] text-[#777971] border-[#dfdfd8] opacity-60 hover:border-slate-400'
                              : 'bg-[#faf9f5] text-[#262824] border-[#dfdfd8] hover:border-[#262824] hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-xs truncate">{v.size}</span>
                            {isSelected && <Check size={12} className="text-emerald-400 shrink-0" />}
                          </div>
                          <div className="flex items-center justify-between w-full mt-1.5 text-[10px]">
                            <span className={`font-mono ${isSelected ? 'text-emerald-300 font-bold' : 'text-[#262824] font-semibold'}`}>
                              ₹{variantPrice.toLocaleString('en-IN')}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              isVariantOut
                                ? 'bg-rose-100 text-rose-700'
                                : isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {isVariantOut ? 'Sold out' : `${v.stock} left`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Low Stock Warning */}
              {isLowStock && (
                <div className="p-3 rounded-[2px] bg-[#fbf4ec] border border-[#e0c29f] text-[#8c571e] text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="text-[#8c571e] shrink-0" />
                  <span className="font-semibold text-xs">
                    Hurry, only {activeStock} {activeStock === 1 ? 'unit' : 'units'} left for {selectedVariant?.size || 'this item'}! Order soon before it runs out.
                  </span>
                </div>
              )}

              {/* Main Purchase CTA Zone: Exactly ONE disabled button when out of stock */}
              <div className="space-y-3 pt-1">
                {isOutOfStock ? (
                  <button
                    type="button"
                    disabled
                    className="w-full min-h-[46px] rounded-[2px] bg-[#eeede7] text-[#777971] font-bold text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2 select-none border border-[#dfdfd8]"
                  >
                    <AlertCircle size={15} />
                    <span>Selected Size {selectedVariant ? `(${selectedVariant.size})` : ''} is Out of Stock</span>
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Buy Now Button */}
                    <button
                      type="button"
                      onClick={async () => {
                        const variantProduct: Product = {
                          ...product,
                          price: activePrice,
                          stock: activeStock,
                          specs: {
                            ...product.specs,
                            Size: selectedVariant?.size || product.specs?.Size || 'Standard'
                          }
                        };
                        await addToCart(variantProduct, 1);
                        setCurPage('checkout');
                      }}
                      className="btn-primary flex-1 min-h-[46px] rounded-[2px] uppercase tracking-wider text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Buy Now</span>
                    </button>

                    {/* Add to Cart / Quantity Stepper */}
                    {quantityInCart > 0 ? (
                      <div className="flex items-center justify-between border border-[#262824] rounded-[2px] min-h-[46px] bg-white flex-1 px-3 select-none">
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
                          className="w-8 h-8 flex items-center justify-center text-[#262824] hover:bg-[#eeede7] transition-colors cursor-pointer rounded-[2px]"
                          title="Decrease quantity"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} strokeWidth={2} />
                        </button>
                        <span className="text-xs font-semibold text-[#262824] flex items-center gap-1.5 uppercase tracking-wider">
                          <Check size={13} className="text-[#3d6547]" />
                          {quantityInCart} in Bag
                        </span>
                        <button
                          type="button"
                          disabled={quantityInCart >= activeStock}
                          onClick={() => {
                            if (quantityInCart >= activeStock) {
                              showToast(`Only ${activeStock} available in stock for ${selectedVariant?.size || 'this item'}.`);
                              return;
                            }
                            const targetId = product._id || product.id;
                            updateCartQty(targetId, quantityInCart + 1);
                          }}
                          className={`w-8 h-8 flex items-center justify-center text-[#262824] rounded-[2px] transition-colors ${
                            quantityInCart >= activeStock ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#eeede7] cursor-pointer'
                          }`}
                          title="Increase quantity"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          const variantProduct: Product = {
                            ...product,
                            price: activePrice,
                            stock: activeStock,
                            specs: {
                              ...product.specs,
                              Size: selectedVariant?.size || product.specs?.Size || 'Standard'
                            }
                          };
                          await addToCart(variantProduct, 1);
                        }}
                        className="btn-secondary flex-1 min-h-[46px] rounded-[2px] uppercase tracking-wider text-xs font-bold border-[#262824] text-[#262824] hover:bg-[#262824] hover:text-[#f7f6f2] transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <ShoppingCart size={15} />
                        <span>Add to Bag</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Service & Security Trust Micro-Cards */}
                <div className="grid grid-cols-3 gap-2.5 pt-2 select-none">
                  <div className="flex flex-col items-center text-center p-2.5 rounded-[2px] bg-[#f7f6f2] border border-[#dfdfd8]">
                    <ShieldCheck size={16} className="text-[#262824] mb-1" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">100% Genuine</span>
                    <span className="text-[10px] text-[#777971]">Verified standard</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-2.5 rounded-[2px] bg-[#f7f6f2] border border-[#dfdfd8]">
                    <Truck size={16} className="text-[#262824] mb-1" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">Express Delivery</span>
                    <span className="text-[10px] text-[#777971]">Free on ₹499+</span>
                  </div>
                  <div className="flex flex-col items-center text-center p-2.5 rounded-[2px] bg-[#f7f6f2] border border-[#dfdfd8]">
                    <RotateCcw size={16} className="text-[#262824] mb-1" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">7-Day Return</span>
                    <span className="text-[10px] text-[#777971]">Complimentary exchange</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Accordions: Clean, Uncomplicated, Spacious Design */}
            <div className="bg-white rounded-[2px] border border-[#dfdfd8] p-5 sm:p-6 divide-y divide-[#dfdfd8]">
              
              {/* Accordion 1: Description & Highlights */}
              <div className="py-2 first:pt-0">
                <button
                  type="button"
                  onClick={() => toggleAccordion('description')}
                  className="w-full flex items-center justify-between py-2 text-left transition-colors cursor-pointer select-none group"
                  aria-expanded={openAccordions.description}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-[#262824] group-hover:text-[#777d62] flex items-center gap-2">
                    <FileText size={14} className="text-[#262824]" />
                    <span>Description &amp; Highlights</span>
                  </span>
                  <span className="w-6 h-6 rounded-[2px] border border-[#dfdfd8] flex items-center justify-center text-[#262824] bg-[#f7f6f2] group-hover:bg-[#eeede7]">
                    {openAccordions.description ? <Minus size={13} strokeWidth={2} /> : <Plus size={13} strokeWidth={2} />}
                  </span>
                </button>

                {openAccordions.description && (
                  <div className="pb-3 pt-2 space-y-3 animate-fadeIn text-xs text-[#262824]">
                    <p className="leading-relaxed text-xs sm:text-sm text-[#777971]">
                      {product.desc}
                    </p>

                    {/* Tags */}
                    {product.tags && product.tags.length > 0 && (
                      <div className="pt-2 border-t border-[#dfdfd8] flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#777971]">Tags:</span>
                        {product.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[11px] font-medium bg-[#f7f6f2] text-[#262824] border border-[#dfdfd8]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 2: Technical Specifications */}
              <div className="py-2">
                <button
                  type="button"
                  onClick={() => toggleAccordion('specs')}
                  className="w-full flex items-center justify-between py-2 text-left transition-colors cursor-pointer select-none group"
                  aria-expanded={openAccordions.specs}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-[#262824] group-hover:text-[#777d62] flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-[#262824]" />
                    <span>Technical Specifications</span>
                  </span>
                  <span className="w-6 h-6 rounded-[2px] border border-[#dfdfd8] flex items-center justify-center text-[#262824] bg-[#f7f6f2] group-hover:bg-[#eeede7]">
                    {openAccordions.specs ? <Minus size={13} strokeWidth={2} /> : <Plus size={13} strokeWidth={2} />}
                  </span>
                </button>

                {openAccordions.specs && (
                  <div className="pb-3 pt-2 space-y-1.5 animate-fadeIn text-xs">
                    <div className="flex justify-between py-1.5 border-b border-[#dfdfd8]">
                      <span className="text-[#777971] font-medium">SKU Code</span>
                      <span className="font-mono text-[#262824] font-semibold">{product.sku || `SKU-${product.id}`}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#dfdfd8]">
                      <span className="text-[#777971] font-medium">Category</span>
                      <span className="text-[#262824] font-semibold">{product.cat}</span>
                    </div>

                    {product.specs && Object.keys(product.specs).length > 0 ? (
                      Object.entries(product.specs).map(([key, value]) => {
                        if (!value) return null;
                        const displayVal = key === 'Size' && typeof value === 'string' && value.startsWith('[')
                          ? (parseProductVariants(value).map((v) => v.size).join(', ') || value)
                          : value;
                        return (
                          <div className="flex justify-between py-1.5 border-b border-[#dfdfd8] gap-3" key={key}>
                            <span className="text-[#777971] font-medium">{key}</span>
                            <span className="text-[#262824] font-semibold text-right">{displayVal}</span>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="flex justify-between py-1.5 border-b border-[#dfdfd8]">
                          <span className="text-[#777971] font-medium">Standard Pack Size</span>
                          <span className="text-[#262824] font-semibold">1 Unit</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-[#dfdfd8]">
                          <span className="text-[#777971] font-medium">Country of Origin</span>
                          <span className="text-[#262824] font-semibold">India</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-[#dfdfd8]">
                          <span className="text-[#777971] font-medium">Authenticity</span>
                          <span className="text-[#262824] font-semibold">100% Certified Genuine</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 3: Shipping & Delivery */}
              <div className="py-2 last:pb-0">
                <button
                  type="button"
                  onClick={() => toggleAccordion('shipping')}
                  className="w-full flex items-center justify-between py-2 text-left transition-colors cursor-pointer select-none group"
                  aria-expanded={openAccordions.shipping}
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-[#262824] group-hover:text-[#777d62] flex items-center gap-2">
                    <Truck size={14} className="text-[#262824]" />
                    <span>Shipping &amp; Delivery</span>
                  </span>
                  <span className="w-6 h-6 rounded-[2px] border border-[#dfdfd8] flex items-center justify-center text-[#262824] bg-[#f7f6f2] group-hover:bg-[#eeede7]">
                    {openAccordions.shipping ? <Minus size={13} strokeWidth={2} /> : <Plus size={13} strokeWidth={2} />}
                  </span>
                </button>

                {openAccordions.shipping && (
                  <div className="pb-3 pt-2 space-y-3 animate-fadeIn text-xs text-[#262824] leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <Truck size={15} className="text-[#3d6547] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-xs text-[#262824] block">Express Delivery Windows</span>
                        <span className="text-[#777971] text-xs">Metro cities in 2–3 business days. Rest of India in 4–6 business days. Free shipping on orders above ₹499.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <RotateCcw size={15} className="text-[#262824] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-xs text-[#262824] block">7-Day Doorstep Replacement</span>
                        <span className="text-[#777971] text-xs">Complimentary doorstep pickup and exchange for eligible damaged or defective items.</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck size={15} className="text-[#8c571e] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-xs text-[#262824] block">Safe &amp; Secure Payment</span>
                        <span className="text-[#777971] text-xs">Cash on Delivery available. All major cards, UPI, and Netbanking accepted. Dispatched in tamper-proof protective packaging.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Review summary & quick write button */}
              <div className="pt-4 border-t border-[#dfdfd8] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[2px] bg-[#f7f6f2] border border-[#dfdfd8] flex items-center justify-center text-[#262824] font-semibold text-xs gap-0.5">
                    <span>{rating}</span>
                    <Star size={10} className="fill-[#262824] text-[#262824]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#262824]">Customer Rating</p>
                    <p className="text-[11px] text-[#777971]">{recommendPct}% recommend this product</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-[#dfdfd8] hover:border-[#262824] text-xs font-semibold text-[#262824] transition-colors cursor-pointer uppercase tracking-wider"
                >
                  <MessageSquarePlus size={13} />
                  <span>Rate Product</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ── 2. Suggested / Related Products ── */}
        {suggested.length > 0 && (
          <section className="pt-2">
            <div className="flex items-end justify-between mb-6 pb-3 border-b border-[#dfdfd8]">
              <div>
                <span className="text-[10px] font-bold text-[#777971] uppercase tracking-widest block mb-1">
                  Curated Catalog
                </span>
                <h3 className="text-xl sm:text-2xl font-display font-semibold text-[#262824] tracking-tight">
                  Related in {product.cat}
                </h3>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-[#262824] hover:opacity-70 transition-opacity cursor-pointer flex items-center gap-1 py-1 uppercase tracking-wider"
                onClick={() => {
                  setCurFilter(product.cat);
                  setCurPage('products');
                }}
              >
                View all in {product.cat} <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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

        {/* ── 3. Customer Reviews Section ── */}
        <section
          id="product-reviews-section"
          className="bg-white rounded-[2px] border border-[#dfdfd8] p-6 sm:p-8 space-y-6"
        >
          {/* Section Header with Navigation Arrows & Write Review Action */}
          <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-[#dfdfd8]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#777971]">
                  Verified Community
                </span>
                <span className="text-[11px] font-semibold bg-[#f7f6f2] text-[#262824] px-2 py-0.5 rounded-[2px] border border-[#dfdfd8]">
                  {prodReviews.length} {prodReviews.length === 1 ? 'Review' : 'Reviews'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-semibold text-[#262824] tracking-tight">
                What Our Verified Buyers Say
              </h2>
            </div>

            {/* Carousel Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollReviews('left')}
                disabled={!canScrollLeft}
                className={`w-9 h-9 rounded-[2px] border flex items-center justify-center transition-all cursor-pointer ${
                  canScrollLeft
                    ? 'border-[#dfdfd8] bg-white hover:bg-[#eeede7] text-[#262824]'
                    : 'border-[#dfdfd8] bg-[#f7f6f2] text-[#777971] cursor-not-allowed opacity-50'
                }`}
                title="Previous reviews"
                aria-label="Previous reviews"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => scrollReviews('right')}
                disabled={!canScrollRight && prodReviews.length <= 3}
                className={`w-9 h-9 rounded-[2px] border flex items-center justify-center transition-all cursor-pointer ${
                  canScrollRight || prodReviews.length > 3
                    ? 'border-[#dfdfd8] bg-white hover:bg-[#eeede7] text-[#262824]'
                    : 'border-[#dfdfd8] bg-[#f7f6f2] text-[#777971] cursor-not-allowed opacity-50'
                }`}
                title="Next reviews"
                aria-label="Next reviews"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="btn-primary min-h-[38px] text-xs font-semibold px-4 flex items-center gap-1.5 cursor-pointer ml-1 sm:ml-2 rounded-[2px] uppercase tracking-wider"
              >
                <MessageSquarePlus size={13} />
                <span>Write a Review</span>
              </button>
            </div>
          </div>

          {/* Review Cards Carousel */}
          {prodReviews.length > 0 ? (
            <div
              ref={reviewsScrollRef}
              onScroll={checkReviewScrollBounds}
              className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 pt-1 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {prodReviews.map((review) => (
                <div
                  key={review.id || review._id}
                  className="w-[290px] sm:w-[350px] md:w-[380px] shrink-0 snap-start flex"
                >
                  <ReviewCard review={review} />
                </div>
              ))}

              {/* Special "+N More Reviews" Card at the end */}
              {prodReviews.length > 2 && (
                <div className="w-[280px] sm:w-[320px] md:w-[350px] shrink-0 snap-start flex">
                  <div
                    onClick={() => scrollReviews('right')}
                    className="w-full bg-[#262824] hover:bg-black text-[#f7f6f2] rounded-[2px] p-6 sm:p-7 flex flex-col justify-between cursor-pointer transition-all border border-[#262824] select-none"
                    title="Click to view more reviews"
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-[2px] bg-white/10 flex items-center justify-center text-white">
                        <Star size={20} fill="#f7f6f2" />
                      </div>
                      <span className="text-3xl font-display font-semibold text-white block">
                        +{prodReviews.length} Reviews
                      </span>
                      <p className="text-xs text-[#eeede7]/80 leading-relaxed">
                        Read all verified customer feedback, rating breakdowns, and uploaded customer photos.
                      </p>
                    </div>

                    <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs font-semibold text-white uppercase tracking-wider">
                        Navigate with Next
                      </span>
                      <div className="w-8 h-8 rounded-[2px] bg-white text-[#262824] flex items-center justify-center">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 px-6 border border-dashed border-[#dfdfd8] rounded-[2px] bg-[#f7f6f2]">
              <div className="w-10 h-10 rounded-[2px] bg-white border border-[#dfdfd8] flex items-center justify-center mx-auto mb-3 text-[#777971]">
                <Star size={18} />
              </div>
              <h4 className="text-base font-display font-semibold text-[#262824] mb-1">No customer reviews yet</h4>
              <p className="text-xs sm:text-sm text-[#777971] mb-5 max-w-sm mx-auto">
                Be the first to share your honest review for {product.name}.
              </p>
              <button
                type="button"
                onClick={() => setReviewModalOpen(true)}
                className="btn-primary min-h-[40px] text-xs font-semibold px-5 cursor-pointer rounded-[2px] uppercase tracking-wider"
              >
                Write the First Review
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ── Mobile Sticky Bottom Buy Bar (visible on sm/xs screens) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#f7f6f2]/95 backdrop-blur-md border-t border-[#dfdfd8] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {productImages.length > 0 && (
            <img
              src={productImages[0]}
              alt={product.name}
              className="w-10 h-12 object-contain rounded-[2px] border border-[#dfdfd8] bg-white shrink-0 p-0.5"
            />
          )}
          <div className="truncate">
            <p className="text-xs font-semibold text-[#262824] truncate max-w-[130px]">
              {product.name}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-display font-semibold text-[#262824]">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              {mrp > product.price && (
                <span className="text-[11px] text-[#777971] line-through">
                  ₹{mrp.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isOutOfStock ? (
            <button
              type="button"
              disabled
              className="min-h-[42px] px-4 rounded-[2px] bg-[#eeede7] text-[#777971] font-semibold text-xs flex items-center gap-1.5 cursor-not-allowed select-none border border-[#dfdfd8] uppercase tracking-wider"
            >
              <AlertCircle size={14} />
              <span>Out of Stock</span>
            </button>
          ) : quantityInCart > 0 ? (
            <div className="flex items-center border border-[#262824] rounded-[2px] h-[42px] bg-white px-1">
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
                className="w-8 h-8 flex items-center justify-center text-[#262824] rounded-[2px]"
                aria-label="Decrease quantity"
              >
                <Minus size={13} strokeWidth={2} />
              </button>
              <span className="text-xs font-semibold px-2 text-[#262824]">
                {quantityInCart}
              </span>
              <button
                type="button"
                disabled={quantityInCart >= product.stock}
                onClick={() => {
                  if (quantityInCart >= product.stock) {
                    showToast(`Only ${product.stock} available in stock.`);
                    return;
                  }
                  const targetId = product._id || product.id;
                  updateCartQty(targetId, quantityInCart + 1);
                }}
                className={`w-8 h-8 flex items-center justify-center text-[#262824] rounded-[2px] ${
                  quantityInCart >= product.stock ? 'opacity-30 cursor-not-allowed' : ''
                }`}
                aria-label="Increase quantity"
              >
                <Plus size={13} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={addingProductId === product.id}
                onClick={async () => {
                  await addToCart(product, 1);
                }}
                className="min-h-[42px] px-3.5 rounded-[2px] border border-[#262824] bg-white text-[#262824] font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wider"
              >
                <ShoppingCart size={13} />
                <span>Add</span>
              </button>
              <button
                type="button"
                disabled={addingProductId === product.id}
                onClick={async () => {
                  await addToCart(product, 1);
                  setCurPage('checkout');
                }}
                className="min-h-[42px] px-4 rounded-[2px] bg-[#262824] text-[#f7f6f2] font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wider"
              >
                <span>Buy Now</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
