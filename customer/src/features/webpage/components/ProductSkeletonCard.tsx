import React from 'react';

const ProductSkeletonCard: React.FC = () => {
  return (
    <div className="flex flex-col bg-white border border-[#dfdfd8] rounded-[2px] overflow-hidden animate-pulse">
      {/* Image placeholder */}
      <div className="aspect-[4/5] w-full bg-[#eeede7]" />

      {/* Info placeholder */}
      <div className="p-3 sm:p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="h-2.5 w-16 bg-[#eeede7] rounded-[1px]" />
          <div className="h-2.5 w-10 bg-[#eeede7] rounded-[1px]" />
        </div>
        <div className="h-3.5 w-full bg-[#eeede7] rounded-[1px]" />
        <div className="h-3 w-3/4 bg-[#eeede7] rounded-[1px]" />
        <div className="flex items-center justify-between pt-2.5 border-t border-[#dfdfd8] mt-1">
          <div className="h-4 w-16 bg-[#eeede7] rounded-[1px]" />
          <div className="h-7.5 w-16 bg-[#eeede7] rounded-[2px]" />
        </div>
      </div>
    </div>
  );
};

export default ProductSkeletonCard;
