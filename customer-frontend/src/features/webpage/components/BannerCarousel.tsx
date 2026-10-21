import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../../core/context/AppContext';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const BannerCarousel: React.FC = () => {
  const { banners, setCurPage } = useApp();
  const [curIndex, setCurIndex] = useState(0);
  const timerRef = useRef<any | null>(null);

  // Filter only active banners
  const activeBanners = (banners || []).filter((b) => b.isActive !== false);

  const startSlider = () => {
    stopSlider();
    if (activeBanners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5500);
  };

  const stopSlider = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    if (curIndex >= activeBanners.length) {
      setCurIndex(0);
    }
    startSlider();
    return () => stopSlider();
  }, [activeBanners.length, curIndex]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeBanners.length <= 1) return;
    setCurIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
    startSlider();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeBanners.length <= 1) return;
    setCurIndex((prev) => (prev + 1) % activeBanners.length);
    startSlider();
  };

  const handleDotClick = (index: number) => {
    setCurIndex(index);
    startSlider();
  };

  if (!activeBanners || activeBanners.length === 0) return null;

  return (
    <div
      className="relative w-full aspect-[16/6] max-h-[520px] min-h-[300px] overflow-hidden bg-blk"
      onMouseEnter={stopSlider}
      onMouseLeave={startSlider}
    >
      {/* Background slide track */}
      <div
        className="flex h-full w-full transition-transform duration-[800ms] ease-in-out"
        style={{ transform: `translateX(-${curIndex * 100}%)` }}
      >
        {activeBanners.map((banner, index) => {
          const isActive = index === curIndex;
          const desktopSrc = banner.desktopImage || banner.img || '';
          const mobileSrc = banner.mobileImage || banner.mobileImg || '';

          return (
            <div className="min-w-full h-full relative overflow-hidden" key={banner._id || index}>
              {/* Background representation */}
              {/* Desktop image (rendered only on screen >= 768px) */}
              {desktopSrc && (
                <div className="absolute inset-0 w-full h-full hidden md:block">
                  <img
                    src={desktopSrc}
                    alt={banner.label || `Slide ${index + 1}`}
                    className={`w-full h-full object-cover block transition-transform duration-[6000ms] ease-out ${
                      isActive ? 'scale-105' : 'scale-100'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-blk/80 via-blk/40 to-transparent" />
                </div>
              )}

              {/* Mobile image (rendered only on screen < 768px) */}
              {mobileSrc && (
                <div className="absolute inset-0 w-full h-full block md:hidden">
                  <img
                    src={mobileSrc}
                    alt={banner.label || `Slide ${index + 1}`}
                    className={`w-full h-full object-cover block transition-transform duration-[6000ms] ease-out ${
                      isActive ? 'scale-105' : 'scale-100'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-blk/80 via-blk/40 to-transparent" />
                </div>
              )}

              {/* Fallback gradient if the respective screen image was removed */}
              <div
                className={`absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 ${
                  desktopSrc && mobileSrc
                    ? 'hidden'
                    : desktopSrc && !mobileSrc
                    ? 'block md:hidden'
                    : !desktopSrc && mobileSrc
                    ? 'hidden md:block'
                    : 'block'
                }`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.06),transparent_50%)] pointer-events-none" />
              </div>

              {/* Text overlays (Renders over both image and gradient background) */}
              <div className="absolute inset-0 flex items-center justify-start text-left px-11 xs:px-14 sm:px-20 py-6 sm:py-20 z-10">
                <div className={`max-w-[640px] transition-all duration-700 ease-out transform ${
                  isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}>
                  {banner.label && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/25 bg-black/40 text-slate-100 text-xs font-semibold backdrop-blur-md mb-3 sm:mb-4 shadow-sm">
                      <Sparkles size={13} className="text-amber-400" />
                      <span className="tracking-wide">{banner.label}</span>
                    </div>
                  )}
                  <h2 className="text-xl xs:text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15] mb-2 sm:mb-4 drop-shadow-md">
                    {banner.title || 'Premium Online Catalog'}
                  </h2>
                  <p className="text-xs xs:text-sm sm:text-base text-slate-200 max-w-[500px] leading-relaxed mb-4 sm:mb-6 font-normal drop-shadow-sm line-clamp-3 sm:line-clamp-none">
                    {banner.subtitle || 'Discover premium essentials curated for daily life'}
                  </p>
                  {banner.ctaText && (
                    <button
                      type="button"
                      onClick={() => setCurPage(banner.ctaLink || 'products')}
                      className="inline-flex items-center justify-center px-5 sm:px-6 py-2.5 sm:py-3.5 rounded-xl bg-white text-slate-950 font-bold text-xs sm:text-sm hover:bg-slate-100 active:scale-[0.98] transition-all cursor-pointer shadow-lg hover:shadow-xl min-h-[38px] sm:min-h-[44px]"
                    >
                      {banner.ctaText}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nav Arrows - Only show if more than 1 active banner */}
      {activeBanners.length > 1 && (
        <>
          <button
            type="button"
            className="absolute top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full border border-white/30 bg-black/60 text-white flex items-center justify-center transition-all duration-200 hover:bg-white hover:text-slate-950 active:scale-[0.95] cursor-pointer left-1.5 sm:left-4 shadow-md backdrop-blur-sm"
            onClick={handlePrev}
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="absolute top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full border border-white/30 bg-black/60 text-white flex items-center justify-center transition-all duration-200 hover:bg-white hover:text-slate-950 active:scale-[0.95] cursor-pointer right-1.5 sm:right-4 shadow-md backdrop-blur-sm"
            onClick={handleNext}
            aria-label="Next slide"
          >
            <ChevronRight size={18} strokeWidth={2.2} />
          </button>
        </>
      )}

      {/* Line Indicators - Only show if more than 1 active banner */}
      {activeBanners.length > 1 && (
        <div className="absolute bottom-5 left-8 flex gap-2 z-10">
          {activeBanners.map((_, index) => (
            <button
              type="button"
              key={index}
              className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                index === curIndex ? 'bg-white w-9 shadow-sm' : 'bg-white/40 w-4 hover:bg-white/70'
              }`}
              onClick={() => handleDotClick(index)}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;
