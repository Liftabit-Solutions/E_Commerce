import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../core/context/AppContext';
import type { Banner } from '../../../core/types';
import {
  Save,
  AlertCircle,
  Eye,
  X,
  Loader2,
  Image as ImageIcon,
  UploadCloud,
  Smartphone,
  Laptop,
  RotateCcw,
  Sparkles,
  Layers,
  Star,
  Tag,
  Plus,
  Trash2,
  Search,
  Upload,
  Package
} from 'lucide-react';
import {
  getStorefrontConfig,
  saveStorefrontConfig,
  getCategoriesConfig
} from '../../../core/utils/storeSettings';
import type {
  CatalogItem,
  StorefrontSectionsConfig
} from '../../../core/utils/storeSettings';
import { Badge } from '@/components/reui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type StorefrontTab = 'banners' | 'catalog' | 'featured' | 'recommended' | 'offers';

const BannersManagement: React.FC = () => {
  const { banners, updateBanners, products, showToast } = useApp();

  const [activeMainTab, setActiveMainTab] = useState<StorefrontTab>('banners');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [desktopFiles, setDesktopFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [mobileFiles, setMobileFiles] = useState<(File | null)[]>([null, null, null, null]);

  // Storefront Section Configs (Catalog, Featured, Recommended, Offers)
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontSectionsConfig>(getStorefrontConfig());
  const [categoriesList] = useState(getCategoriesConfig());

  // Search & Filter for Product Pickers
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Staged state for editing banners
  const [stagedBanners, setStagedBanners] = useState<Banner[]>(() =>
    banners.map((b) => ({
      _id: b._id,
      img: b.desktopImage || b.img || null,
      mobileImg: b.mobileImage || b.mobileImg || null,
      desktopImage: b.desktopImage || b.img || '',
      mobileImage: b.mobileImage || b.mobileImg || '',
      desktopImagePublicId: b.desktopImagePublicId || '',
      mobileImagePublicId: b.mobileImagePublicId || '',
      label: b.label || '',
      title: b.title || 'Organic Clean Solutions',
      subtitle: b.subtitle || 'Clean living, organic ingredients, safe spaces',
      ctaText: b.ctaText || 'Explore Now',
      ctaLink: b.ctaLink || 'products',
      displayOrder: b.displayOrder || 1,
      scheduleStart: b.scheduleStart || '',
      scheduleEnd: b.scheduleEnd || '',
      isActive: b.isActive !== undefined ? b.isActive : true
    }))
  );

  // Sync stagedBanners when server banners load or update
  useEffect(() => {
    if (banners && banners.length > 0) {
      setStagedBanners(
        banners.map((b) => ({
          _id: b._id,
          img: b.desktopImage || b.img || null,
          mobileImg: b.mobileImage || b.mobileImg || null,
          desktopImage: b.desktopImage || b.img || '',
          mobileImage: b.mobileImage || b.mobileImg || '',
          desktopImagePublicId: b.desktopImagePublicId || '',
          mobileImagePublicId: b.mobileImagePublicId || '',
          label: b.label || '',
          title: b.title || 'Organic Clean Solutions',
          subtitle: b.subtitle || 'Clean living, organic ingredients, safe spaces',
          ctaText: b.ctaText || 'Explore Now',
          ctaLink: b.ctaLink || 'products',
          displayOrder: b.displayOrder || 1,
          scheduleStart: b.scheduleStart || '',
          scheduleEnd: b.scheduleEnd || '',
          isActive: b.isActive !== undefined ? b.isActive : true
        }))
      );
    }
  }, [banners]);

  // Active banner slot being customized
  const [activeSlot, setActiveSlot] = useState<number>(0);
  
  // Show Desktop vs Mobile preview modal
  const [previewBanner, setPreviewBanner] = useState<Banner | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  const [isDesktopDragging, setIsDesktopDragging] = useState<boolean>(false);
  const [isMobileDragging, setIsMobileDragging] = useState<boolean>(false);

  // Escape key down to close preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewBanner(null);
      }
    };
    if (previewBanner) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewBanner]);

  const processFile = (file: File | undefined, slotIndex: number, type: 'desktop' | 'mobile') => {
    if (!file) return;

    if (type === 'desktop') {
      setDesktopFiles((prev) => {
        const next = [...prev];
        next[slotIndex] = file;
        return next;
      });
    } else {
      setMobileFiles((prev) => {
        const next = [...prev];
        next[slotIndex] = file;
        return next;
      });
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setStagedBanners((prev) =>
          prev.map((b, idx) => {
            if (idx === slotIndex) {
              return type === 'desktop'
                ? { ...b, img: reader.result as string, desktopImage: reader.result as string }
                : { ...b, mobileImg: reader.result as string, mobileImage: reader.result as string };
            }
            return b;
          })
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number, type: 'desktop' | 'mobile') => {
    const file = e.target.files?.[0];
    processFile(file, slotIndex, type);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, type: 'desktop' | 'mobile') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'desktop') setIsDesktopDragging(true);
    else setIsMobileDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, type: 'desktop' | 'mobile') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'desktop') setIsDesktopDragging(false);
    else setIsMobileDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, slotIndex: number, type: 'desktop' | 'mobile') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'desktop') setIsDesktopDragging(false);
    else setIsMobileDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file, slotIndex, type);
    }
  };

  const handleClearImage = (slotIndex: number, type: 'desktop' | 'mobile') => {
    if (type === 'desktop') {
      setDesktopFiles((prev) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
    } else {
      setMobileFiles((prev) => {
        const next = [...prev];
        next[slotIndex] = null;
        return next;
      });
    }

    setStagedBanners((prev) =>
      prev.map((b, idx) => {
        if (idx === slotIndex) {
          return type === 'desktop'
            ? { ...b, img: null, desktopImage: '' }
            : { ...b, mobileImg: null, mobileImage: '' };
        }
        return b;
      })
    );
  };

  const handleFieldChange = (slotIndex: number, field: keyof Banner, value: any) => {
    setStagedBanners((prev) =>
      prev.map((b, idx) => (idx === slotIndex ? { ...b, [field]: value } : b))
    );
  };

  // ─── CATALOG MANAGEMENT HANDLERS ───
  const handleAddCatalogItem = () => {
    const newItem: CatalogItem = {
      id: `cat-${Date.now()}`,
      title: 'New Collection',
      category: categoriesList[0]?.name || 'General Household',
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
      description: 'Handcrafted essential collection',
      badge: 'New',
      isActive: true,
    };
    setStorefrontConfig((prev) => ({
      ...prev,
      catalog: [...prev.catalog, newItem],
    }));
    showToast('New catalog collection card added.');
  };

  const handleUpdateCatalogItem = (id: string, field: keyof CatalogItem, val: any) => {
    setStorefrontConfig((prev) => ({
      ...prev,
      catalog: prev.catalog.map((c) => (c.id === id ? { ...c, [field]: val } : c)),
    }));
  };

  const handleCatalogImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        handleUpdateCatalogItem(id, 'image', reader.result as string);
        showToast('Catalog cover image updated.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCatalogItem = (id: string) => {
    if (storefrontConfig.catalog.length <= 1) {
      showToast('At least one catalog item must be maintained.');
      return;
    }
    setStorefrontConfig((prev) => ({
      ...prev,
      catalog: prev.catalog.filter((c) => c.id !== id),
    }));
  };

  // ─── FEATURED / RECOMMENDED / OFFERS TOGGLES ───
  const handleToggleFeatured = (productId: string) => {
    setStorefrontConfig((prev) => {
      const exists = prev.featuredProductIds.includes(productId);
      const updated = exists
        ? prev.featuredProductIds.filter((id) => id !== productId)
        : [...prev.featuredProductIds, productId];
      return { ...prev, featuredProductIds: updated };
    });
  };

  const handleToggleRecommended = (productId: string) => {
    setStorefrontConfig((prev) => {
      const exists = prev.recommendedProductIds.includes(productId);
      const updated = exists
        ? prev.recommendedProductIds.filter((id) => id !== productId)
        : [...prev.recommendedProductIds, productId];
      return { ...prev, recommendedProductIds: updated };
    });
  };

  const handleToggleOffer = (productId: string) => {
    setStorefrontConfig((prev) => {
      const exists = prev.offerProductIds.includes(productId);
      const updated = exists
        ? prev.offerProductIds.filter((id) => id !== productId)
        : [...prev.offerProductIds, productId];
      return { ...prev, offerProductIds: updated };
    });
  };

  // Filtered products list for pickers
  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.cat.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || p.cat === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  // Bulk selectors
  const handleSelectAllFeatured = () => {
    const visibleIds = filteredProducts.map((p) => String(p._id || p.id));
    setStorefrontConfig((prev) => ({
      ...prev,
      featuredProductIds: Array.from(new Set([...prev.featuredProductIds, ...visibleIds])),
    }));
  };

  const handleClearFeatured = () => {
    setStorefrontConfig((prev) => ({ ...prev, featuredProductIds: [] }));
  };

  const handleSelectAllRecommended = () => {
    const visibleIds = filteredProducts.map((p) => String(p._id || p.id));
    setStorefrontConfig((prev) => ({
      ...prev,
      recommendedProductIds: Array.from(new Set([...prev.recommendedProductIds, ...visibleIds])),
    }));
  };

  const handleClearRecommended = () => {
    setStorefrontConfig((prev) => ({ ...prev, recommendedProductIds: [] }));
  };

  const handleSelectAllOffers = () => {
    const visibleIds = filteredProducts.map((p) => String(p._id || p.id));
    setStorefrontConfig((prev) => ({
      ...prev,
      offerProductIds: Array.from(new Set([...prev.offerProductIds, ...visibleIds])),
    }));
  };

  const handleClearOffers = () => {
    setStorefrontConfig((prev) => ({ ...prev, offerProductIds: [] }));
  };

  // ─── MASTER SAVE FUNCTION ───
  const handleSaveAll = async () => {
    setIsPublishing(true);
    try {
      // 1. Save storefront configuration (Catalog, Featured, Recommended, Offers)
      saveStorefrontConfig(storefrontConfig);

      // 2. Save hero banners if active
      const sorted = [...stagedBanners].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      await updateBanners(sorted, desktopFiles, mobileFiles);
      setDesktopFiles([null, null, null, null]);
      setMobileFiles([null, null, null, null]);

      showToast('Storefront presentation & sections published successfully!');
    } catch (err) {
      console.error('Failed to publish storefront:', err);
      showToast('Storefront settings saved.');
    } finally {
      setIsPublishing(false);
    }
  };

  const availableCategories = useMemo(() => {
    const fromProds = (products || []).map((p) => p.cat).filter(Boolean);
    const fromConfig = categoriesList.map((c) => c.name);
    return ['All', ...Array.from(new Set([...fromProds, ...fromConfig]))];
  }, [products, categoriesList]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Storefront Design</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
              Homepage Presentation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Storefront &amp; Presentation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage promotional banners, category catalog, featured essentials, recommended items, and special offers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDesktopFiles([null, null, null, null]);
              setMobileFiles([null, null, null, null]);
              setStagedBanners(banners.map((b) => ({ ...b })));
              setStorefrontConfig(getStorefrontConfig());
              showToast('Reset to saved configuration.');
            }}
            disabled={isPublishing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs cursor-pointer min-h-[38px] disabled:opacity-50"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isPublishing}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer min-h-[38px] disabled:opacity-50"
          >
            {isPublishing ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Storefront Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
        {[
          { id: 'banners', label: 'Hero Banners', icon: ImageIcon, badge: '4 Slides' },
          { id: 'catalog', label: 'Explore Catalog', icon: Layers, badge: `${storefrontConfig.catalog.filter(c => c.isActive).length} Active` },
          { id: 'featured', label: 'Featured Products', icon: Sparkles, badge: `${storefrontConfig.featuredProductIds.length} Selected` },
          { id: 'recommended', label: 'Recommended Products', icon: Star, badge: `${storefrontConfig.recommendedProductIds.length} Curated` },
          { id: 'offers', label: 'Special Offers & Sale', icon: Tag, badge: `${storefrontConfig.offerProductIds.length} On Sale` },
        ].map((tab) => {
          const isActive = activeMainTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveMainTab(tab.id as StorefrontTab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ═════════ TAB 1: HERO BANNERS ═════════ */}
      {activeMainTab === 'banners' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Info notice banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-start gap-3 text-xs text-slate-600">
            <AlertCircle size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Hero carousel slides support responsive assets. Upload a <strong>16:5 ratio</strong> graphic for desktop displays and a <strong>4:3 ratio</strong> graphic for mobile devices.
            </div>
          </div>

          {/* Main layout: Left Slot Switcher, Right Editor Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Slot Selector List */}
            <div className="lg:col-span-4 space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Banner Slides
              </div>
              <div className="space-y-2">
                {stagedBanners.map((banner, index) => {
                  const isActive = activeSlot === index;
                  const hasImage = Boolean(banner.img || banner.desktopImage);
                  const isEnabled = banner.isActive;

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveSlot(index)}
                      className={`w-full p-3.5 rounded-lg border text-left cursor-pointer transition-all duration-150 relative overflow-hidden flex items-center gap-3.5 ${
                        isActive
                          ? 'border-indigo-600 bg-white shadow-xs ring-1 ring-indigo-600/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Thumbnail / Slot indicator */}
                      <div className="w-12 h-10 rounded-md bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {hasImage ? (
                          <img
                            src={(banner.img || banner.desktopImage) as string}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon size={16} className="text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-900">Slot {index + 1}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            isEnabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isEnabled ? 'Live' : 'Hidden'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                          {banner.label || banner.title || 'Untitled Banner'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Active Slot Form */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Slot {activeSlot + 1}
                  </h2>
                  <p className="text-xs text-slate-500">Customize titles, action buttons, and responsive assets.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewBanner(stagedBanners[activeSlot])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  <Eye size={13} />
                  Preview
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Tagline label */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Tagline</label>
                  <input
                    type="text"
                    placeholder="e.g. Eco Formula 2026"
                    className="w-full border border-slate-200 focus:border-indigo-600 rounded-md px-3 py-2 text-xs outline-none bg-white text-slate-800 transition-all min-h-[38px]"
                    value={stagedBanners[activeSlot].label || ''}
                    onChange={(e) => handleFieldChange(activeSlot, 'label', e.target.value)}
                  />
                </div>

                {/* Display Order */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full border border-slate-200 focus:border-indigo-600 rounded-md px-3 py-2 text-xs outline-none bg-white text-slate-800 transition-all min-h-[38px]"
                    value={stagedBanners[activeSlot].displayOrder || 1}
                    onChange={(e) => handleFieldChange(activeSlot, 'displayOrder', parseInt(e.target.value, 10) || 1)}
                  />
                </div>

                {/* Headline Title */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-slate-700">Headline Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Organic Clean Solutions"
                    className="w-full border border-slate-200 focus:border-indigo-600 rounded-md px-3 py-2 text-xs outline-none bg-white text-slate-800 transition-all min-h-[38px]"
                    value={stagedBanners[activeSlot].title || ''}
                    onChange={(e) => handleFieldChange(activeSlot, 'title', e.target.value)}
                  />
                </div>

                {/* Subtitle */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-slate-700">Subheading Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short description highlighting the collection..."
                    className="w-full border border-slate-200 focus:border-indigo-600 rounded-md px-3 py-2 text-xs outline-none bg-white text-slate-800 transition-all"
                    value={stagedBanners[activeSlot].subtitle || ''}
                    onChange={(e) => handleFieldChange(activeSlot, 'subtitle', e.target.value)}
                  />
                </div>

                {/* Button Text */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Call-to-Action Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Explore Now"
                    className="w-full border border-slate-200 focus:border-indigo-600 rounded-md px-3 py-2 text-xs outline-none bg-white text-slate-800 transition-all min-h-[38px]"
                    value={stagedBanners[activeSlot].ctaText || ''}
                    onChange={(e) => handleFieldChange(activeSlot, 'ctaText', e.target.value)}
                  />
                </div>

                {/* Button Target */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Target Page / Category</label>
                  <select
                    className="w-full border border-slate-200 focus:border-indigo-600 rounded-md px-3 py-2 text-xs outline-none bg-white text-slate-800 transition-all min-h-[38px]"
                    value={stagedBanners[activeSlot].ctaLink || 'products'}
                    onChange={(e) => handleFieldChange(activeSlot, 'ctaLink', e.target.value)}
                  >
                    <option value="products">All Products</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active switch */}
                <div className="sm:col-span-2 flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                  <div>
                    <span className="font-bold text-slate-900 block">Show Banner on Storefront</span>
                    <span className="text-[11px] text-slate-500">Enable or hide this slide from customer view</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={stagedBanners[activeSlot].isActive}
                    onChange={(e) => handleFieldChange(activeSlot, 'isActive', e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Responsive Image Upload Zones */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Banner Artwork
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Desktop graphic */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Laptop size={14} className="text-slate-400" /> Desktop Display (16:6)
                      </span>
                      {stagedBanners[activeSlot].img && (
                        <button
                          type="button"
                          onClick={() => handleClearImage(activeSlot, 'desktop')}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div
                      onDragOver={(e) => handleDragOver(e, 'desktop')}
                      onDragLeave={(e) => handleDragLeave(e, 'desktop')}
                      onDrop={(e) => handleDrop(e, activeSlot, 'desktop')}
                      className={`relative border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center transition-all min-h-[140px] overflow-hidden ${
                        isDesktopDragging
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      {stagedBanners[activeSlot].img ? (
                        <div className="relative w-full aspect-[16/6] rounded overflow-hidden">
                          <img
                            src={stagedBanners[activeSlot].img as string}
                            alt="Desktop preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <UploadCloud size={24} />
                          <div className="text-[11px]">
                            <label
                              htmlFor={`desktop-upload-${activeSlot}`}
                              className="font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                            >
                              Choose file
                            </label>{' '}
                            or drop here
                          </div>
                        </div>
                      )}
                      <input
                        id={`desktop-upload-${activeSlot}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, activeSlot, 'desktop')}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Mobile graphic */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Smartphone size={14} className="text-slate-400" /> Mobile Display (4:3)
                      </span>
                      {stagedBanners[activeSlot].mobileImg && (
                        <button
                          type="button"
                          onClick={() => handleClearImage(activeSlot, 'mobile')}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div
                      onDragOver={(e) => handleDragOver(e, 'mobile')}
                      onDragLeave={(e) => handleDragLeave(e, 'mobile')}
                      onDrop={(e) => handleDrop(e, activeSlot, 'mobile')}
                      className={`relative border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center transition-all min-h-[140px] overflow-hidden ${
                        isMobileDragging
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      {stagedBanners[activeSlot].mobileImg ? (
                        <div className="relative w-full aspect-[4/3] max-w-[140px] rounded overflow-hidden">
                          <img
                            src={stagedBanners[activeSlot].mobileImg as string}
                            alt="Mobile preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <UploadCloud size={24} />
                          <div className="text-[11px]">
                            <label
                              htmlFor={`mobile-upload-${activeSlot}`}
                              className="font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                            >
                              Choose file
                            </label>{' '}
                            or drop here
                          </div>
                        </div>
                      )}
                      <input
                        id={`mobile-upload-${activeSlot}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, activeSlot, 'mobile')}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════ TAB 2: EXPLORE CATALOG COLLECTIONS ═════════ */}
      {activeMainTab === 'catalog' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900">Explore Catalog Cards &amp; Images</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Add, customize, and upload high-resolution images for each category card displayed in the homepage Explore Catalog section.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddCatalogItem}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <Plus size={14} /> Add Catalog Card
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {storefrontConfig.catalog.map((item, idx) => (
              <div
                key={item.id}
                className={`bg-white border rounded-lg overflow-hidden shadow-xs transition-all ${
                  item.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'
                }`}
              >
                {/* Image Preview & Upload Header */}
                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden group">
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  
                  {item.badge && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 text-white font-bold text-[10px] rounded shadow-xs">
                      {item.badge}
                    </span>
                  )}

                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
                    <label
                      htmlFor={`cat-img-${item.id}`}
                      className="px-3 py-1.5 bg-white text-slate-900 text-xs font-semibold rounded-md shadow-xs cursor-pointer hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Upload size={13} /> Change Image
                    </label>
                    <input
                      id={`cat-img-${item.id}`}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCatalogImageUpload(item.id, e)}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Form Fields */}
                <div className="p-4 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">Card #{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-medium">Active:</span>
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={(e) => handleUpdateCatalogItem(item.id, 'isActive', e.target.checked)}
                        className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Title</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleUpdateCatalogItem(item.id, 'title', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Linked Category</label>
                      <select
                        value={item.category}
                        onChange={(e) => handleUpdateCatalogItem(item.id, 'category', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-900 focus:border-indigo-600 focus:outline-none text-xs"
                      >
                        {categoriesList.map((cat) => (
                          <option key={cat.name} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Badge (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Popular, Eco"
                        value={item.badge || ''}
                        onChange={(e) => handleUpdateCatalogItem(item.id, 'badge', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-900 focus:border-indigo-600 focus:outline-none text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Short Description</label>
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => handleUpdateCatalogItem(item.id, 'description', e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-md bg-white text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700">Image URL</label>
                    <input
                      type="url"
                      value={item.image}
                      onChange={(e) => handleUpdateCatalogItem(item.id, 'image', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-900 focus:border-indigo-600 focus:outline-none text-[11px] font-mono text-slate-500"
                    />
                  </div>

                  <div className="pt-2 flex justify-end border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleRemoveCatalogItem(item.id)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={13} /> Remove Card
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═════════ TAB 3: FEATURED PRODUCTS ═════════ */}
      {activeMainTab === 'featured' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Featured Essentials Selection</h2>
                <Badge variant="default" size="sm">
                  {storefrontConfig.featuredProductIds.length} Selected
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Products picked here will be displayed in the primary "Featured Essentials" grid on the homepage.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllFeatured}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer shadow-xs"
              >
                Select All Filtered
              </button>
              <button
                type="button"
                onClick={handleClearFeatured}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by title, SKU, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:border-indigo-600 focus:outline-none"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">Featured</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => {
                  const pId = String(p._id || p.id);
                  const isFeatured = storefrontConfig.featuredProductIds.includes(pId);
                  const primaryImg = p.imgs?.[0] || '';

                  return (
                    <TableRow
                      key={pId}
                      className={`h-[56px] transition-colors cursor-pointer ${
                        isFeatured ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'
                      }`}
                      onClick={() => handleToggleFeatured(pId)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isFeatured}
                          onChange={() => handleToggleFeatured(pId)}
                          className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {primaryImg ? (
                              <img src={primaryImg} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={15} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block line-clamp-1">{p.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">SKU: {p.sku}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{p.cat}</TableCell>
                      <TableCell className="font-mono font-semibold text-xs text-slate-900">
                        ₹{p.price}
                      </TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-semibold ${
                          p.stock > 10 ? 'text-emerald-700' : p.stock > 0 ? 'text-amber-700' : 'text-rose-700'
                        }`}>
                          {p.stock} in stock
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFeatured(pId);
                          }}
                          className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                            isFeatured
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isFeatured ? 'Featured' : 'Select'}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ═════════ TAB 4: RECOMMENDED PRODUCTS ═════════ */}
      {activeMainTab === 'recommended' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Curated Recommendations</h2>
                <Badge variant="default" size="sm">
                  {storefrontConfig.recommendedProductIds.length} Curated
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Selected products will be displayed in the customer storefront "Recommended for You" section.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllRecommended}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer shadow-xs"
              >
                Select All Filtered
              </button>
              <button
                type="button"
                onClick={handleClearRecommended}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by title, SKU, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:border-indigo-600 focus:outline-none"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">Recommend</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => {
                  const pId = String(p._id || p.id);
                  const isRec = storefrontConfig.recommendedProductIds.includes(pId);
                  const primaryImg = p.imgs?.[0] || '';

                  return (
                    <TableRow
                      key={pId}
                      className={`h-[56px] transition-colors cursor-pointer ${
                        isRec ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'
                      }`}
                      onClick={() => handleToggleRecommended(pId)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isRec}
                          onChange={() => handleToggleRecommended(pId)}
                          className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {primaryImg ? (
                              <img src={primaryImg} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={15} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block line-clamp-1">{p.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">SKU: {p.sku}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{p.cat}</TableCell>
                      <TableCell className="font-mono font-semibold text-xs text-slate-900">
                        ₹{p.price}
                      </TableCell>
                      <TableCell>
                        <span className={`text-[11px] font-semibold ${
                          p.stock > 10 ? 'text-emerald-700' : p.stock > 0 ? 'text-amber-700' : 'text-rose-700'
                        }`}>
                          {p.stock} in stock
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRecommended(pId);
                          }}
                          className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                            isRec
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isRec ? 'Recommended' : 'Select'}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ═════════ TAB 5: SPECIAL OFFERS & SALE ═════════ */}
      {activeMainTab === 'offers' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Special Offers &amp; Sale Showcase</h2>
                <Badge variant="default" size="sm">
                  {storefrontConfig.offerProductIds.length} On Sale
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Products marked here will appear in the dedicated "Special Offers &amp; Limited Deals" storefront section.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span>Badge Label:</span>
                <input
                  type="text"
                  value={storefrontConfig.offersBadgeText || 'Limited Offer'}
                  onChange={(e) => setStorefrontConfig(prev => ({ ...prev, offersBadgeText: e.target.value }))}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white w-32 focus:border-indigo-600 focus:outline-none"
                  placeholder="e.g. Special Deal"
                />
              </div>

              <button
                type="button"
                onClick={handleSelectAllOffers}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer shadow-xs"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearOffers}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by title, SKU, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:border-indigo-600 focus:outline-none"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] text-center">In Offer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Regular Price</TableHead>
                  <TableHead>Discount / Badge</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => {
                  const pId = String(p._id || p.id);
                  const isOffer = storefrontConfig.offerProductIds.includes(pId);
                  const primaryImg = p.imgs?.[0] || '';
                  const discountPct = p.discount || 0;
                  const finalPrice = discountPct > 0 ? Math.round(p.price - (p.price * discountPct / 100)) : p.price;

                  return (
                    <TableRow
                      key={pId}
                      className={`h-[56px] transition-colors cursor-pointer ${
                        isOffer ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'
                      }`}
                      onClick={() => handleToggleOffer(pId)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isOffer}
                          onChange={() => handleToggleOffer(pId)}
                          className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {primaryImg ? (
                              <img src={primaryImg} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={15} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block line-clamp-1">{p.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">SKU: {p.sku}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{p.cat}</TableCell>
                      <TableCell className="font-mono font-semibold text-xs text-slate-900">
                        {discountPct > 0 ? (
                          <div className="flex flex-col">
                            <span className="text-indigo-600 font-bold">₹{finalPrice}</span>
                            <span className="line-through text-slate-400 text-[10px]">₹{p.price}</span>
                          </div>
                        ) : (
                          `₹${p.price}`
                        )}
                      </TableCell>
                      <TableCell>
                        {p.badge ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {p.badge}
                          </span>
                        ) : discountPct > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {discountPct}% OFF
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Standard</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleOffer(pId);
                          }}
                          className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                            isOffer
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isOffer ? 'On Offer' : 'Add to Offer'}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Global Preview Modal */}
      {previewBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-900">
                  {previewBanner.label || 'Banner Preview'}
                </span>
                <span className="text-[11px] text-slate-500">• Slot #{activeSlot + 1}</span>
              </div>

              {/* Device Selector */}
              <div className="flex items-center gap-2 bg-slate-200/60 p-1 rounded-lg">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    previewDevice === 'desktop'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Laptop size={14} /> Desktop
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    previewDevice === 'mobile'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Smartphone size={14} /> Mobile
                </button>
              </div>

              <button
                onClick={() => setPreviewBanner(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Preview Frame */}
            <div className="bg-slate-100 border border-slate-200 p-6 rounded-b-xl flex items-center justify-center overflow-hidden">
              {previewDevice === 'desktop' ? (
                /* Desktop layout preview */
                <div
                  className="w-full bg-slate-950 text-white relative overflow-hidden rounded-lg shadow-lg flex items-center"
                  style={{ aspectRatio: '16/6' }}
                >
                  {previewBanner.img ? (
                    <img src={previewBanner.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 opacity-80" />
                  )}
                  <div className="relative z-10 px-10 max-w-[520px] flex flex-col items-start select-none">
                    {previewBanner.label && (
                      <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30 mb-2.5 uppercase tracking-wider">
                        {previewBanner.label}
                      </span>
                    )}
                    <h1 className="text-2xl font-bold leading-tight mb-2 text-white">
                      {previewBanner.title || 'Organic Clean Solutions'}
                    </h1>
                    <p className="text-xs text-slate-300 mb-5 line-clamp-2 leading-relaxed">
                      {previewBanner.subtitle || 'Pure botanical formulas designed for conscious living.'}
                    </p>
                    <button className="bg-indigo-600 text-white px-5 py-2 rounded-md text-xs font-semibold cursor-default shadow-xs">
                      {previewBanner.ctaText || 'Shop Collection'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Mobile layout preview */
                <div
                  className="w-[300px] bg-slate-950 text-white relative overflow-hidden rounded-2xl shadow-xl flex flex-col justify-end p-6 border-4 border-slate-800"
                  style={{ aspectRatio: '3/4' }}
                >
                  {previewBanner.mobileImg ? (
                    <img src={previewBanner.mobileImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-65" />
                  ) : previewBanner.img ? (
                    <img src={previewBanner.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-65" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950 opacity-80" />
                  )}
                  <div className="relative z-10 flex flex-col items-start select-none">
                    {previewBanner.label && (
                      <span className="text-[10px] text-emerald-400 font-bold mb-1.5 uppercase tracking-wider">
                        {previewBanner.label}
                      </span>
                    )}
                    <h1 className="text-lg font-bold leading-tight mb-1 text-white">
                      {previewBanner.title || 'Headline title'}
                    </h1>
                    <p className="text-[11px] text-slate-300 mb-4 line-clamp-2">
                      {previewBanner.subtitle || 'Subheading description text.'}
                    </p>
                    <button className="w-full bg-emerald-600 text-white py-2 rounded-lg text-xs font-semibold cursor-default text-center">
                      {previewBanner.ctaText || 'Shop Now'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannersManagement;
