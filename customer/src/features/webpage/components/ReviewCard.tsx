import React, { useState } from 'react';
import type { Review } from '../../../core/types';
import { Star, X, ZoomIn, ShieldCheck, CornerDownRight } from 'lucide-react';

interface ReviewCardProps {
  review: Review;
  showQuoteIcon?: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const attachedImg = review.image || (Array.isArray(review.images) && review.images.length > 0 ? review.images[0] : null) || review.img;

  const renderStars = (ratingVal: number) => {
    return Array.from({ length: 5 }, (_, i) => {
      const active = i < ratingVal;
      return (
        <Star
          key={i}
          size={13}
          fill={active ? '#F59E0B' : 'none'}
          stroke={active ? '#F59E0B' : '#CBD5E1'}
          strokeWidth={1.5}
        />
      );
    });
  };

  const isVerified =
    review.verifiedPurchase ||
    review.isVerifiedPurchase ||
    (review.role && review.role.toLowerCase().includes('verified'));

  return (
    <>
      <div className="bg-white rounded-[2px] border border-[#dfdfd8] p-5 sm:p-6 transition-all duration-200 hover:border-[#262824]/30 w-full">
        {/* Top Header: Author + Verified + Rating */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[2px] bg-[#eeede7] text-[#262824] border border-[#dfdfd8] flex items-center justify-center text-xs font-semibold shrink-0">
              {review.ini || (review.author ? review.author[0].toUpperCase() : 'C')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[#262824] font-heading">{review.author}</span>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#40684f] bg-[#edf3ee] px-2 py-0.5 rounded-[2px] border border-[#c7dac9]">
                    <ShieldCheck size={11} className="text-[#40684f]" />
                    <span>Verified Purchase</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#777971]">
                {review.date ? review.date : 'Verified Buyer'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 bg-[#f7f6f2] border border-[#dfdfd8] px-2.5 py-1 rounded-[2px]">
            <div className="flex gap-0.5">
              {renderStars(review.rating)}
            </div>
            <span className="text-xs font-semibold text-[#262824] ml-1 font-price">{review.rating}.0</span>
          </div>
        </div>

        {/* Review Body */}
        <p className="text-xs sm:text-sm text-[#262824] leading-relaxed pt-1">
          {review.body}
        </p>

        {/* Attached Customer Product Photo */}
        {attachedImg && (
          <div className="mt-4 pt-3.5 border-t border-[#dfdfd8]">
            <span className="text-[10px] font-semibold text-[#777971] uppercase tracking-wider block mb-2">
              Attached Product Photo
            </span>
            <div
              className="relative inline-block w-24 h-24 sm:w-28 sm:h-28 rounded-[2px] border border-[#dfdfd8] overflow-hidden bg-[#f7f6f2] cursor-pointer group/img"
              onClick={() => setLightboxOpen(true)}
              title="Click to view full photo"
            >
              <img
                src={attachedImg}
                alt={`Customer review attachment for ${review.product || 'product'}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[#262824]/0 group-hover/img:bg-[#262824]/30 transition-colors flex items-center justify-center">
                <ZoomIn size={16} className="text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        )}

        {/* Staff / Admin Reply */}
        {review.reply && (
          <div className="mt-4 pt-3 border-t border-[#dfdfd8] bg-[#f7f6f2] rounded-[2px] p-3.5 border border-[#dfdfd8] text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-[#262824] mb-1">
              <CornerDownRight size={13} className="text-[#777d62]" />
              <span>Response from Concierge Team</span>
            </div>
            <p className="text-[#777971] leading-relaxed pl-4">{review.reply}</p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && attachedImg && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-[#262824]/80 backdrop-blur-xs animate-fadeIn"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-[2px] overflow-hidden shadow-2xl p-4 sm:p-6 animate-scaleIn border border-[#dfdfd8]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#dfdfd8]">
              <div>
                <h4 className="text-sm font-semibold text-[#262824] font-heading">Photo by {review.author}</h4>
                <p className="text-xs text-[#777971]">{review.product}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="w-8 h-8 rounded-[2px] flex items-center justify-center text-[#777971] hover:bg-[#eeede7] hover:text-[#262824] transition-colors cursor-pointer"
                aria-label="Close photo preview"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center bg-[#f7f6f2] rounded-[2px] overflow-hidden p-2">
              <img
                src={attachedImg}
                alt={`Full view by ${review.author}`}
                className="max-h-[65vh] max-w-full object-contain rounded-[2px]"
              />
            </div>
            <p className="text-xs text-[#777971] mt-3 italic leading-relaxed">"{review.body}"</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewCard;

