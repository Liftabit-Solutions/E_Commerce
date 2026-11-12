import React from 'react';
import type { Product, CartItem, Review } from '../../../core/types';
import { useApp } from '../../../core/context/AppContext';
import { Star, Plus, Minus, ShoppingCart } from 'lucide-react';

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
    showToast
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
    : (count > 0 ? (product.rating || product.averageRating || 0).toFixed(1) : '0.0');

  const handleClick = () => {
    setSelectedProductId(product.id);
    setCurPage('product-detail');
  };

  const discountPct = product.discount > 0 ? product.discount : 0;
  const mrp = product.originalPrice
    ? product.originalPrice
    : discountPct > 0 ? Math.round(product.price / (1 - discountPct / 100)) : 0;

  const isOutOfStock = (product.stock ?? 0) <= 0;
  const isLowStock = (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5;

  return (
    <div
      className="group relative flex flex-col bg-white border border-[#dfdfd8] rounded-[2px] overflow-hidden transition-all duration-200 hover:border-[#262824]/40 hover:shadow-sm cursor-pointer select-none"
      onClick={handleClick}
    >
      {/* Product Image - FORMA 4:5 Crop */}
      <div className="relative aspect-[4/5] w-full bg-[#f7f6f2] overflow-hidden flex items-center justify-center p-3 sm:p-5">
        {product.imgs && product.imgs.length > 0 ? (
          <img
            src={product.imgs[0]}
            alt={product.name}
            className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#777971]">
            <ShoppingCart size={24} strokeWidth={1.5} />
            <span className="text-[10px] font-medium mt-2 text-[#777971]">No image</span>
          </div>
        )}

        {/* Overlaid Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1 z-10">
          {product.badge && (
            <span className="px-2 py-0.5 rounded-[2px] text-[9px] font-medium uppercase tracking-wider bg-[#262824] text-[#f7f6f2]">
              {product.badge}
            </span>
          )}
          {isOutOfStock && (
            <span className="px-2 py-0.5 rounded-[2px] text-[9px] font-medium uppercase tracking-wider bg-[#f9eded] text-[#a83d3b] border border-[#e8c6c5]">
              Out of Stock
            </span>
          )}
          {isLowStock && !isOutOfStock && (
            <span className="px-2 py-0.5 rounded-[2px] text-[9px] font-medium uppercase tracking-wider bg-[#fbf4ec] text-[#996222] border border-[#ebd3be]">
              Only {product.stock} left
            </span>
          )}
        </div>

        {discountPct > 0 && (
          <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-[2px] text-[9px] font-semibold tracking-wider uppercase bg-[#262824] text-[#f7f6f2] z-10">
            {discountPct}% OFF
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 gap-2 bg-white">
        <div className="space-y-1">
          {/* Category + Rating row */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-[#777971] uppercase tracking-[0.14em] truncate max-w-[80px] sm:max-w-none">
              {product.cat || 'Essential'}
            </span>
            {Number(rating) > 0 && (
              <div className="flex items-center gap-0.5 shrink-0">
                <Star size={10} className="fill-[#b38234] text-[#b38234]" />
                <span className="text-[10px] font-semibold text-[#262824] ml-0.5 font-price">{rating}</span>
                {count > 0 && <span className="text-[10px] text-[#777971] font-normal">({count})</span>}
              </div>
            )}
          </div>

          {/* Product name */}
          <h3
            className="font-heading text-[13px] sm:text-sm font-semibold text-[#262824] leading-snug line-clamp-2 transition-colors"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        {/* Price + Cart Action */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[#dfdfd8] mt-auto gap-2 flex-wrap sm:flex-nowrap">
          {/* Price */}
          <div className="flex flex-col leading-none shrink-0">
            <span className="text-sm sm:text-[15px] font-bold text-[#262824] font-price">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
            {mrp > product.price && (
              <span className="text-[10px] text-[#777971] line-through font-price mt-0.5">
                ₹{mrp.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Cart controls */}
          <div onClick={(e) => e.stopPropagation()}>
            {isOutOfStock ? (
              <span className="text-[10px] font-medium text-[#a83d3b] px-2 py-0.5 rounded-[2px] bg-[#f9eded] border border-[#e8c6c5]">
                Sold Out
              </span>
            ) : quantityInCart > 0 ? (
              <div className="inline-flex items-center border border-[#262824] bg-white rounded-[2px] h-7.5 px-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetId = product._id || product.id;
                    if (quantityInCart === 1) { removeFromCart(targetId); }
                    else { updateCartQty(targetId, quantityInCart - 1); }
                  }}
                  className="w-6 h-full flex items-center justify-center text-[#262824] hover:bg-[#eeede7] rounded-[1px] cursor-pointer transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={11} strokeWidth={2} />
                </button>
                <span className="text-[11px] font-bold text-[#262824] px-1 font-price min-w-[18px] text-center">
                  {quantityInCart}
                </span>
                <button
                  type="button"
                  disabled={quantityInCart >= product.stock}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (quantityInCart >= product.stock) {
                      showToast(`Only ${product.stock} available in stock.`);
                      return;
                    }
                    const targetId = product._id || product.id;
                    updateCartQty(targetId, quantityInCart + 1);
                  }}
                  className={`w-6 h-full flex items-center justify-center text-[#262824] rounded-[1px] transition-colors ${
                    quantityInCart >= product.stock ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#eeede7] cursor-pointer'
                  }`}
                  aria-label="Increase quantity"
                >
                  <Plus size={11} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={async (e) => {
                  e.stopPropagation();
                  await addToCart(product, 1);
                }}
                className="h-7.5 px-3 rounded-[2px] bg-[#262824] hover:bg-black active:scale-[0.98] text-[#f7f6f2] text-[11px] font-medium uppercase tracking-wider inline-flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                title="Add to Bag"
              >
                <Plus size={11} strokeWidth={2} /><span>Add</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
