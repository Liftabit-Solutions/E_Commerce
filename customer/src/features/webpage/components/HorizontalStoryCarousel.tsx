import React, { useState, useEffect, useRef } from 'react';
import type { Story } from '../../../core/types';
import ReviewCard from './ReviewCard';
import { ChevronLeft, ChevronRight, MessageSquareHeart } from 'lucide-react';

interface HorizontalStoryCarouselProps {
  stories: Story[];
}

const HorizontalStoryCarousel: React.FC<HorizontalStoryCarouselProps> = ({ stories }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(3);
  const touchStartX = useRef<number | null>(null);

  const totalStories = stories.length;

  // Responsive itemsPerView listener
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerView(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, totalStories - itemsPerView);

  // Auto-slide liquid flow timer when totalStories > itemsPerView
  useEffect(() => {
    if (totalStories <= itemsPerView || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 3800);

    return () => clearInterval(timer);
  }, [totalStories, itemsPerView, isPaused, maxIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  // Touch Swipe Handlers for mobile & touch screen smooth flow
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  // Empty State
  if (totalStories === 0) {
    return (
      <div className="card p-8 text-center flex flex-col items-center justify-center my-6 min-h-[160px]">
        <div className="empty-state-icon mb-3">
          <MessageSquareHeart size={20} />
        </div>
        <h4 className="font-display text-sm font-semibold text-blk mb-1">
          No customer reviews yet
        </h4>
        <p className="text-xs text-mut max-w-[380px]">
          Be the first to share your experience with our products! Write your review below.
        </p>
      </div>
    );
  }

  // If 3 or fewer stories, render clean grid
  if (totalStories <= itemsPerView) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
        {stories.map((story, idx) => (
          <ReviewCard key={story._id || story.id || idx} review={story as any} showQuoteIcon={true} />
        ))}
      </div>
    );
  }

  const gapRem = 1.5; // 1.5rem = 24px (gap-6)
  const slideTransform = `calc(-${currentIndex} * (100% + ${gapRem}rem) / ${itemsPerView})`;

  return (
    <div
      className="mb-8 relative group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Controls Header Bar */}
      <div className="flex items-center justify-between border-b border-[#dfdfd8] pb-3 text-xs text-[#777971] mb-4">
        <div className="flex items-center gap-2 font-medium text-[#262824]">
          <span className="uppercase tracking-wider text-[11px]">Customer Stories ({currentIndex + 1} of {totalStories})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            className="w-7 h-7 rounded-[2px] border border-[#dfdfd8] bg-white flex items-center justify-center text-[#262824] hover:bg-[#eeede7] transition-colors cursor-pointer"
            title="Previous"
            type="button"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={handleNext}
            className="w-7 h-7 rounded-[2px] border border-[#dfdfd8] bg-white flex items-center justify-center text-[#262824] hover:bg-[#eeede7] transition-colors cursor-pointer"
            title="Next"
            type="button"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Track Viewport */}
      <div className="overflow-hidden p-0.5">
        <div
          className="flex gap-6 transition-transform duration-500 ease-out"
          style={{ transform: `translateX(${slideTransform})` }}
        >
          {stories.map((story, idx) => (
            <div
              key={story._id || story.id || idx}
              className="shrink-0 w-full sm:w-[calc((100%-1.5rem)/2)] md:w-[calc((100%-3rem)/3)] flex flex-col h-full"
            >
              <ReviewCard review={story as any} showQuoteIcon={true} />
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center items-center gap-1.5 mt-4">
        {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1 rounded-[1px] transition-all duration-300 cursor-pointer ${
              currentIndex === idx
                ? 'w-5 bg-[#262824]'
                : 'w-2 bg-[#dfdfd8] hover:bg-[#777971]'
            }`}
            title={`Slide ${idx + 1}`}
            type="button"
          />
        ))}
      </div>
    </div>
  );
};

export default HorizontalStoryCarousel;
