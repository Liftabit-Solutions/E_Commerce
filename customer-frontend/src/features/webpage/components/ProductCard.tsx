import React from 'react';
import type { Product, CartItem, Review } from '../../../core/types';
import { useApp } from '../../../core/context/AppContext';
import { Star, Loader2, Plus, Minus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    setCurPage,
    setSelectedProductId,
    reviews,
    cart,
    addToCart,
    updateCartQty,
    removeFromCart,
    addingProductId
  } = useApp();

  const cartItem = cart.find(
    (item: CartItem) =>
      item.product.id === product.id ||
      item.product._id === product._id ||
      (product._id && String(item.product.id) === String(product._id)) ||
      (product.id && String(item.product._id) === String(product.id)) ||
      (product._id && String(item.product._id) === String(product._id))
  );
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  const prodReviews = reviews.filter((r: Review) => r.approved && (
    r.product === product.name ||
    (product._id && String(r.product) === String(product._id)) ||
    (product.id && String(r.product) === String(product.id))
  ));
  const count = prodReviews.length || product.reviewCount || product.totalReviews || 0;
  const rating = prodReviews.length
    ? (prodReviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / prodReviews.length).toFixed(1)
    : (count > 0 ? (product.rating || product.averageRating || 0).toFixed(1) : (0).toFixed(1));

  const handleClick = () => {
    setSelectedProductId(product.id);
    setCurPage('product-detail');
  };

  const discountPct = product.discount > 0 ? product.discount : 15;
  const mrp = product.originalPrice
    ? product.originalPrice
    : Math.round(product.price / (1 - discountPct / 100));

  const isAdding = addingProductId === product.id;

  return (
    <div
      className="group relative flex flex-col bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-3 transition-all duration-200 hover:border-slate-300 hover:shadow-md cursor-pointer select-none"
      onClick={handleClick}
    >
      {/* 1. Compact Product Image Frame */}
      <div className="relative aspect-square w-full bg-[#F8F9FA] rounded-xl overflow-hidden flex items-center justify-center p-3 transition-colors group-hover:bg-[#F2F4F7]">
        {product.imgs && product.imgs.length > 0 ? (
          <img
            src={product.imgs[0]}
            alt={product.name}
            className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <span className="text-[11px] text-slate-400 font-medium">No Image</span>
          </div>
        )}

        {/* Badges on Image */}
        <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
          {product.badge && (
            <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-slate-950 text-white shadow-2xs">
              {product.badge}
            </span>
          )}
        </div>

        {discountPct > 0 && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-700 text-white shadow-2xs">
            {discountPct}% OFF
          </span>
        )}
      </div>

      {/* 2. Compact & Essential Product Info */}
      <div className="pt-2.5 pb-0.5 flex flex-col justify-between flex-1 gap-2">
        <div className="space-y-1">
          {/* Row 1: Category & Star Rating */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-slate-600 uppercase tracking-wider truncate max-w-[68px] xs:max-w-[100px] sm:max-w-[120px]">
              {product.cat || 'Essential'}
            </span>
            <div className="flex items-center gap-1 text-slate-700 font-bold shrink-0">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <span>{rating}</span>
              <span className="text-slate-500 font-medium">({count})</span>
            </div>
          </div>

          {/* Row 2: Product Name (Crisp 1-2 lines) */}
          <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 line-clamp-1 leading-snug group-hover:text-black transition-colors" title={product.name}>
            {product.name}
          </h3>
        </div>

        {/* Row 3: Pricing & Action Stepper */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-auto gap-1 flex-wrap sm:flex-nowrap">
          {/* Price Stack */}
          <div className="flex items-baseline gap-1.5 leading-none shrink-0">
            <span className="text-sm sm:text-base font-extrabold text-slate-950 font-price">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {mrp > product.price && (
              <span className="text-[10px] text-slate-600 line-through font-price">
                ₹{mrp.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Action Button / Stepper (Compact & Ergonomic) */}
          <div onClick={(e) => e.stopPropagation()}>
            {quantityInCart > 0 ? (
              <div className="inline-flex items-center border border-slate-900 bg-white rounded-lg h-7 px-1 shadow-2xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetId = product._id || product.id;
                    if (quantityInCart === 1) {
                      removeFromCart(targetId);
                    } else {
                      updateCartQty(targetId, quantityInCart - 1);
                    }
                  }}
                  className="w-5 h-full flex items-center justify-center text-slate-900 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={11} strokeWidth={2.5} />
                </button>
                <span className="text-[11px] font-black text-slate-950 px-1.5 font-price min-w-[16px] text-center">
                  {quantityInCart}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetId = product._id || product.id;
                    updateCartQty(targetId, quantityInCart + 1);
                  }}
                  className="w-5 h-full flex items-center justify-center text-slate-900 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={11} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isAdding}
                onClick={async (e) => {
                  e.stopPropagation();
                  await addToCart(product, 1);
                }}
                className="h-7 px-2.5 rounded-lg bg-slate-950 hover:bg-black active:scale-[0.97] text-white text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                title="Add to Cart"
              >
                {isAdding ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={12} strokeWidth={2.5} />
                    <span>Add</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
