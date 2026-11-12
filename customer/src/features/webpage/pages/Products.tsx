import React, { useState, useMemo } from 'react';
import { useApp } from '../../../core/context/AppContext';
import ProductCard from '../components/ProductCard';
import ProductSkeletonCard from '../components/ProductSkeletonCard';
import { ChevronRight, SlidersHorizontal, X, Check, RotateCcw } from 'lucide-react';

type SortOption = 'default' | 'price-low' | 'price-high' | 'rating' | 'name';

const Products: React.FC = () => {
  const {
    products,
    isProductsLoading,
    curFilter,
    setCurFilter,
    searchQuery,
    setSearchQuery,
    setCurPage
  } = useApp();

  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');

  // Dynamically extract available categories from existing product list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.cat).filter(Boolean)));
    return ['All', ...cats];
  }, [products]);

  const handleFilterClick = (cat: string) => {
    setSearchQuery('');
    setCurFilter(cat);
    setIsMobileFiltersOpen(false);
  };

  const handleResetFilters = () => {
    setCurFilter('All');
    setSearchQuery('');
    setSelectedPriceRange('all');
    setSortBy('default');
    setIsMobileFiltersOpen(false);
  };

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const matchesCategory = curFilter === 'All' || product.cat === curFilter;
        const matchesSearch =
          !searchQuery ||
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.cat && product.cat.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (product.desc && product.desc.toLowerCase().includes(searchQuery.toLowerCase()));

        let matchesPrice = true;
        if (selectedPriceRange === 'under-250') matchesPrice = product.price < 250;
        else if (selectedPriceRange === '250-500')
          matchesPrice = product.price >= 250 && product.price <= 500;
        else if (selectedPriceRange === 'above-500') matchesPrice = product.price > 500;

        return matchesCategory && matchesSearch && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [products, curFilter, searchQuery, selectedPriceRange, sortBy]);

  const hasActiveFilters =
    curFilter !== 'All' || selectedPriceRange !== 'all' || Boolean(searchQuery);

  return (
    <div className="w-full min-h-[80vh] bg-[#f7f6f2]">
      {/* Top Header / Breadcrumb Strip */}
      <div className="bg-white border-b border-[#dfdfd8] py-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-[#777971] mb-3" aria-label="Breadcrumb">
            <button
              type="button"
              className="text-[#777971] hover:text-[#262824] font-medium uppercase tracking-wider transition-colors cursor-pointer"
              onClick={() => {
                setSearchQuery('');
                setCurFilter('All');
                setCurPage('home');
              }}
            >
              Home
            </button>
            <ChevronRight size={12} className="text-[#dfdfd8]" />
            <span className="text-[#262824] font-medium uppercase tracking-wider">Catalog</span>
            {curFilter !== 'All' && (
              <>
                <ChevronRight size={12} className="text-[#dfdfd8]" />
                <span className="text-[#777971] font-medium uppercase tracking-wider">{curFilter}</span>
              </>
            )}
            {searchQuery && (
              <>
                <ChevronRight size={12} className="text-[#dfdfd8]" />
                <span className="text-[#262824] font-medium italic">"{searchQuery}"</span>
              </>
            )}
          </nav>

          {/* Heading + Count + Sort Control */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#262824] tracking-tight font-heading">
                  {searchQuery
                    ? `Results for "${searchQuery}"`
                    : curFilter === 'All'
                    ? 'All Products'
                    : curFilter}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-[2px] text-[11px] font-medium bg-[#eeede7] text-[#262824] border border-[#dfdfd8] font-price">
                  {filteredProducts.length} items
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#777971] mt-1 font-normal">
                Curated home care essentials designed for performance, quality, and lasting utility.
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Mobile Filter Toggle Button */}
              <button
                type="button"
                className="lg:hidden inline-flex items-center gap-2 border border-[#dfdfd8] bg-white text-[#262824] text-xs font-medium uppercase tracking-wider px-4 py-2.5 rounded-[2px] hover:bg-[#eeede7] transition-colors cursor-pointer min-h-[42px]"
                onClick={() => setIsMobileFiltersOpen(true)}
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#262824]" />
                )}
              </button>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#777971] font-medium uppercase tracking-wider hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="border border-[#dfdfd8] rounded-[2px] bg-white text-xs font-medium text-[#262824] py-2.5 px-3 outline-none focus:border-[#262824] cursor-pointer min-w-[155px] min-h-[42px]"
                  aria-label="Sort catalog"
                >
                  <option value="default">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block bg-white border border-[#dfdfd8] rounded-[2px] p-6 space-y-6 sticky top-[90px]">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#dfdfd8]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#262824]">
                Filters
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-medium text-[#777971] hover:text-[#262824] underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-[11px] font-semibold text-[#777971] uppercase tracking-[0.14em] mb-3">
                Categories
              </h3>
              <div className="space-y-1">
                {categories.map((cat) => {
                  const count =
                    cat === 'All'
                      ? products.length
                      : products.filter((p) => p.cat === cat).length;
                  const isSelected = curFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleFilterClick(cat)}
                      className={`w-full text-left text-xs py-2 px-3 rounded-[2px] transition-colors flex items-center justify-between cursor-pointer min-h-[36px] ${
                        isSelected
                          ? 'bg-[#262824] text-[#f7f6f2] font-medium'
                          : 'text-[#262824] hover:bg-[#eeede7] font-normal'
                      }`}
                    >
                      <span>{cat}</span>
                      <span
                        className={`text-[10px] font-price px-1.5 py-0.5 rounded-[1px] ${
                          isSelected ? 'bg-white/20 text-[#f7f6f2]' : 'text-[#777971] bg-[#eeede7]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Range */}
            <div className="pt-5 border-t border-[#dfdfd8]">
              <h3 className="text-[11px] font-semibold text-[#777971] uppercase tracking-[0.14em] mb-3">
                Price Range
              </h3>
              <div className="space-y-2">
                {[
                  { id: 'all', label: 'All Prices' },
                  { id: 'under-250', label: 'Under ₹250' },
                  { id: '250-500', label: '₹250 to ₹500' },
                  { id: 'above-500', label: 'Above ₹500' }
                ].map((range) => (
                  <label
                    key={range.id}
                    className="flex items-center gap-2.5 text-xs text-[#262824] cursor-pointer hover:text-black select-none py-1"
                  >
                    <input
                      type="radio"
                      name="priceRangeDesktop"
                      value={range.id}
                      checked={selectedPriceRange === range.id}
                      onChange={(e) => setSelectedPriceRange(e.target.value)}
                      className="w-3.5 h-3.5 border-[#dfdfd8] text-[#262824] accent-[#262824] cursor-pointer"
                    />
                    <span>{range.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <main>
            {/* Active Filters Pill Strip */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap mb-6">
                <span className="text-[11px] text-[#777971] uppercase tracking-wider font-medium">Applied:</span>
                {curFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-white border border-[#dfdfd8] text-xs font-medium text-[#262824]">
                    <span>Category: {curFilter}</span>
                    <button
                      type="button"
                      onClick={() => setCurFilter('All')}
                      className="text-[#777971] hover:text-[#262824] cursor-pointer p-0.5"
                      aria-label="Remove category filter"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {selectedPriceRange !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-white border border-[#dfdfd8] text-xs font-medium text-[#262824]">
                    <span>Price: {selectedPriceRange}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPriceRange('all')}
                      className="text-[#777971] hover:text-[#262824] cursor-pointer p-0.5"
                      aria-label="Remove price filter"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-white border border-[#dfdfd8] text-xs font-medium text-[#262824]">
                    <span>Keyword: "{searchQuery}"</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-[#777971] hover:text-[#262824] cursor-pointer p-0.5"
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-medium text-[#777971] hover:text-[#262824] underline ml-2 cursor-pointer flex items-center gap-1 py-1"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              </div>
            )}

            {/* Product Cards Grid */}
            {isProductsLoading && products.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <ProductSkeletonCard key={idx} />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id || product._id} product={product} />
                ))}
              </div>
            ) : (
              /* Minimalist Empty State */
              <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-12 text-center max-w-[480px] mx-auto">
                <div className="w-12 h-12 rounded-[2px] bg-[#eeede7] border border-[#dfdfd8] flex items-center justify-center mx-auto mb-4 text-[#777971]">
                  <SlidersHorizontal size={20} />
                </div>
                <h3 className="text-base font-semibold text-[#262824] mb-1 font-heading">No products found</h3>
                <p className="text-xs text-[#777971] leading-relaxed mb-6 max-w-sm mx-auto font-normal">
                  No catalog items matched your current combination of category and price filters.
                </p>
                <button
                  type="button"
                  className="btn-primary text-xs uppercase tracking-wider font-medium min-h-[42px] px-6"
                  onClick={handleResetFilters}
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Slide-over Drawer */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-[300] flex">
          <div
            className="fixed inset-0 bg-[#262824]/40 backdrop-blur-xs animate-fadeIn"
            onClick={() => setIsMobileFiltersOpen(false)}
          />

          <div className="relative ml-auto w-full max-w-[320px] bg-[#f7f6f2] h-full shadow-xl flex flex-col z-10 animate-slideLeft border-l border-[#dfdfd8]">
            <div className="flex items-center justify-between p-5 border-b border-[#dfdfd8] bg-white">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#262824]">
                Filter Catalog
              </span>
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="w-8 h-8 rounded-[2px] flex items-center justify-center text-[#777971] hover:text-[#262824] hover:bg-[#eeede7] transition-colors cursor-pointer"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Category */}
              <div>
                <span className="text-[11px] font-semibold text-[#777971] uppercase tracking-[0.14em] block mb-3">
                  Category
                </span>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleFilterClick(cat)}
                      className={`w-full text-left text-xs py-2.5 px-3.5 rounded-[2px] flex items-center justify-between cursor-pointer min-h-[42px] transition-colors ${
                        curFilter === cat
                          ? 'bg-[#262824] text-[#f7f6f2] font-medium'
                          : 'text-[#262824] hover:bg-[#eeede7] font-normal'
                      }`}
                    >
                      <span>{cat}</span>
                      {curFilter === cat && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="pt-5 border-t border-[#dfdfd8]">
                <span className="text-[11px] font-semibold text-[#777971] uppercase tracking-[0.14em] block mb-3">
                  Price
                </span>
                <div className="space-y-2">
                  {[
                    { id: 'all', label: 'All Prices' },
                    { id: 'under-250', label: 'Under ₹250' },
                    { id: '250-500', label: '₹250 to ₹500' },
                    { id: 'above-500', label: 'Above ₹500' }
                  ].map((range) => (
                    <label
                      key={range.id}
                      className="flex items-center gap-3 text-xs font-medium text-slate-800 cursor-pointer py-1.5 select-none"
                    >
                      <input
                        type="radio"
                        name="priceRangeMobile"
                        value={range.id}
                        checked={selectedPriceRange === range.id}
                        onChange={(e) => setSelectedPriceRange(e.target.value)}
                        className="w-4 h-4 border-slate-300 text-slate-950 focus:ring-slate-950/20 accent-slate-950 cursor-pointer"
                      />
                      <span>{range.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-200 flex gap-3 bg-slate-50/50">
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-secondary flex-1 text-xs font-semibold min-h-[44px]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="btn-primary flex-1 text-xs font-semibold min-h-[44px]"
              >
                Show {filteredProducts.length} items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
