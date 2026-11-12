import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../core/context/AppContext';
import {
  Upload,
  ArrowLeft,
  Package,
  CheckCircle2,
  Trash2,
  Truck,
  Percent,
  MapPin,
  Building2
} from 'lucide-react';
import {
  getStoreProfile,
  getCategoriesConfig,
  calculateGST
} from '../../../core/utils/storeSettings';
import type {
  StoreProfile,
  CategoryGSTConfig
} from '../../../core/utils/storeSettings';
import { Badge } from '@/components/reui/badge';

interface AddProductFormProps {
  onTabChange: (tab: 'dashboard' | 'products' | 'orders' | 'reviews' | 'add' | 'banners' | 'leads' | 'customers' | 'store-profile' | 'categories') => void;
}

export interface SizeVariantInput {
  id: string;
  size: string;
  stock: number;
  price?: number;
}

const DEFAULT_VARIANTS: SizeVariantInput[] = [
  { id: '1', size: '500 ml', stock: 35, price: 299 },
  { id: '2', size: '1 L', stock: 15, price: 549 },
];

const VARIANT_PRESETS = [
  '250 ml',
  '500 ml',
  '1 L',
  '2 L',
  '5 L',
  'Pack of 1',
  'Pack of 2',
  'Small',
  'Medium',
  'Large',
];

const AddProductForm: React.FC<AddProductFormProps> = ({ onTabChange }) => {
  const { addProduct, showToast } = useApp();

  const [storeProfile, setStoreProfile] = useState<StoreProfile>(getStoreProfile());
  const [categoriesList, setCategoriesList] = useState<CategoryGSTConfig[]>(getCategoriesConfig());

  // Form states in plain, simple words
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Floor Care');
  const [brand, setBrand] = useState('FORMA');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [tags, setTags] = useState('');

  // Pricing & GST
  const [price, setPrice] = useState<number>(299);
  const [discount, setDiscount] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);

  // Delivery configuration
  const [deliveryType, setDeliveryType] = useState<'standard' | 'free'>('standard');

  // Stock & Specific Size/Quantity Variants
  const [hasVariants, setHasVariants] = useState<boolean>(true);
  const [variants, setVariants] = useState<SizeVariantInput[]>(DEFAULT_VARIANTS);
  const [stock, setStock] = useState<number>(50);
  const [lowStockWarning, setLowStockWarning] = useState<number>(5);

  // Images
  const [images, setImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Product Details (Simple specifications)
  const [packSize, setPackSize] = useState('500 ml');
  const [howToUse, setHowToUse] = useState('Dilute 1 cap in half a bucket of water');
  const [suitableFor, setSuitableFor] = useState('Tiles, marble, granite, and hardwood floors');

  const [isPublishing, setIsPublishing] = useState(false);

  // Reload store profile and categories when mounted or updated
  useEffect(() => {
    const refreshData = () => {
      setStoreProfile(getStoreProfile());
      setCategoriesList(getCategoriesConfig());
    };
    refreshData();
    window.addEventListener('store_profile_updated', refreshData);
    window.addEventListener('categories_gst_updated', refreshData);
    return () => {
      window.removeEventListener('store_profile_updated', refreshData);
      window.removeEventListener('categories_gst_updated', refreshData);
    };
  }, []);

  // When category changes, auto-set GST rate matching that category
  const handleCategoryChange = (selectedCatName: string) => {
    setCategory(selectedCatName);
    const matched = categoriesList.find((c) => c.name.toLowerCase() === selectedCatName.toLowerCase());
    if (matched && typeof matched.gstRate === 'number') {
      setGstRate(matched.gstRate);
    }
  };

  // Load draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ce_prod_draft_simple');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.name) setName(d.name);
        if (d.sku) setSku(d.sku);
        if (d.category) setCategory(d.category);
        if (d.brand) setBrand(d.brand);
        if (d.description) setDescription(d.description);
        if (d.badge) setBadge(d.badge);
        if (d.tags) setTags(d.tags);
        if (d.price) setPrice(d.price);
        if (d.discount) setDiscount(d.discount);
        if (typeof d.gstRate === 'number') setGstRate(d.gstRate);
        if (d.stock) setStock(d.stock);
        if (d.packSize) setPackSize(d.packSize);
        if (d.howToUse) setHowToUse(d.howToUse);
        if (d.suitableFor) setSuitableFor(d.suitableFor);
        if (Array.isArray(d.images)) setImages(d.images);
        if (d.hasVariants !== undefined) setHasVariants(Boolean(d.hasVariants));
        if (Array.isArray(d.variants) && d.variants.length > 0) setVariants(d.variants);
      } catch (e) {
        console.warn('Draft load note:', e);
      }
    }
  }, []);

  // Autosave draft
  useEffect(() => {
    const draft = {
      name,
      sku,
      category,
      brand,
      description,
      badge,
      tags,
      price,
      discount,
      gstRate,
      stock,
      hasVariants,
      variants,
      packSize,
      howToUse,
      suitableFor,
      images,
    };
    localStorage.setItem('ce_prod_draft_simple', JSON.stringify(draft));
  }, [
    name, sku, category, brand, description, badge, tags,
    price, discount, gstRate, stock, hasVariants, variants, packSize, howToUse, suitableFor, images
  ]);

  // Variant operations
  const handleAddVariant = (presetSize?: string) => {
    const newId = String(Date.now() + Math.random());
    setVariants((prev) => [
      ...prev,
      {
        id: newId,
        size: presetSize || `Option ${prev.length + 1}`,
        stock: 20,
        price: finalSellingPrice,
      },
    ]);
  };

  const handleUpdateVariant = (id: string, field: keyof SizeVariantInput, val: any) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
    );
  };

  const handleRemoveVariant = (id: string) => {
    if (variants.length <= 1) {
      showToast('At least one size / quantity option must be maintained.');
      return;
    }
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  // Pricing calculations
  const finalSellingPrice = useMemo(() => {
    if (discount <= 0) return price;
    return Math.max(1, Math.round(price - price * (discount / 100)));
  }, [price, discount]);

  // Total stock calculated from variants if enabled
  const totalStock = useMemo(() => {
    if (!hasVariants || variants.length === 0) return stock;
    return variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  }, [hasVariants, variants, stock]);

  // GST Breakdown calculations
  const gstDetails = useMemo(() => {
    return calculateGST(finalSellingPrice, gstRate, false);
  }, [finalSellingPrice, gstRate]);

  // Image upload handling
  const handleProcessImage = (file: File) => {
    if (images.length >= 6) {
      showToast('Maximum 6 images allowed.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setImages((prev) => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((f) => {
      if (f.type.startsWith('image/')) handleProcessImage(f);
    });
  };

  const handleClearDraft = () => {
    if (confirm('Clear this product form and start fresh?')) {
      localStorage.removeItem('ce_prod_draft_simple');
      setName('');
      setSku('');
      setCategory('Floor Care');
      setBrand('FORMA');
      setDescription('');
      setBadge('');
      setTags('');
      setPrice(299);
      setDiscount(0);
      setGstRate(18);
      setStock(50);
      setHasVariants(true);
      setVariants(DEFAULT_VARIANTS);
      setImages([]);
      setPackSize('500 ml');
      setHowToUse('Dilute 1 cap in half a bucket of water');
      setSuitableFor('Tiles, marble, granite, and hardwood floors');
      showToast('Form cleared.');
    }
  };

  // Submit product
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter the Product Name.');
      return;
    }

    // Auto-generate SKU if left blank
    const cleanSku = sku.trim()
      ? sku.trim().toUpperCase()
      : `FM-${category.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const tagsArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const activeVariants = hasVariants && variants.length > 0
      ? variants.map((v) => ({
          size: v.size.trim() || 'Standard',
          stock: Math.max(0, Number(v.stock) || 0),
          price: v.price && v.price > 0 ? Number(v.price) : finalSellingPrice,
        }))
      : [{ size: packSize.trim() || 'Standard', stock: Math.max(0, stock), price: finalSellingPrice }];

    const calculatedTotalStock = activeVariants.reduce((sum, v) => sum + v.stock, 0);
    const serializedSize = JSON.stringify(activeVariants);

    setIsPublishing(true);
    const success = await addProduct({
      name: name.trim(),
      sku: cleanSku,
      cat: category,
      brand: brand.trim() || 'FORMA',
      desc: description.trim() || `${name.trim()} - Premium quality designer essential.`,
      tags: tagsArray,
      badge: badge || null,
      imgs: images,
      price: finalSellingPrice,
      discount,
      stock: calculatedTotalStock,
      variants: activeVariants,
      status: 'Active',
      createdDate: new Date().toISOString().split('T')[0],
      specs: {
        Size: serializedSize,
        Usage: howToUse.trim() || 'As directed',
        pH: '7.0',
        Suitable: suitableFor.trim() || 'All surfaces',
      },
      seo: {
        metaTitle: `${name.trim()} | FORMA`,
        metaDescription: description.trim().slice(0, 160) || name.trim(),
        metaKeywords: tagsArray,
      },
    });
    setIsPublishing(false);

    if (success) {
      localStorage.removeItem('ce_prod_draft_simple');
      showToast('Product successfully published to store catalog!');
      onTabChange('products');
    }
  };

  return (
    <div className="w-full pb-12 animate-fadeIn">
      {/* Top Header Bar (Sticky - 100% full width, flush with top nav, solid bg so nothing shows behind) */}
      <div className="sticky top-0 z-20 w-full bg-slate-50 border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onTabChange('products')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-xs cursor-pointer min-h-[38px]"
            >
              <ArrowLeft size={14} /> Back to Products
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Add New Product
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Fill in product details, category GST, delivery charges, and stock.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearDraft}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              Clear Form
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPublishing}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer min-h-[38px] disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>{isPublishing ? 'Publishing...' : 'Save & Publish Product'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Form & Live Preview Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN (8 cols): Simple Form Sections ── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Basic Information */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Basic Information</h2>
              <p className="text-xs text-slate-500 mt-0.5">The main name, category, and description for your product</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-700">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lavender Floor Cleaner &amp; Disinfectant"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 focus:border-indigo-600 focus:outline-none text-sm text-slate-900 bg-white"
                />
              </div>

              {/* Category (Auto-sets GST rate) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Category *</label>
                  <button
                    type="button"
                    onClick={() => onTabChange('categories')}
                    className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                  >
                    Manage Categories
                  </button>
                </div>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 focus:border-indigo-600 focus:outline-none text-xs text-slate-900 bg-white cursor-pointer font-medium"
                >
                  {categoriesList.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.gstRate}% GST)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Selecting a category automatically applies its tax rate ({gstRate}% GST).
                </p>
              </div>

              {/* Brand Name */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. FORMA"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 focus:border-indigo-600 focus:outline-none text-xs text-slate-900 bg-white"
                />
              </div>

              {/* SKU / Product Code */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Product Code / SKU</label>
                <input
                  type="text"
                  placeholder="e.g. CE-FL-500 (Leave blank to auto-create)"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 focus:border-indigo-600 focus:outline-none text-xs font-mono uppercase text-slate-900 bg-white"
                />
              </div>

              {/* Featured Badge */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Highlight Badge</label>
                <select
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 focus:border-indigo-600 focus:outline-none text-xs text-slate-900 bg-white cursor-pointer"
                >
                  <option value="">No Badge</option>
                  <option value="Bestseller">Bestseller</option>
                  <option value="New">New Arrival</option>
                  <option value="Popular">Popular Choice</option>
                  <option value="Featured">Featured</option>
                </select>
              </div>

              {/* Simple Description */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-700">Product Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe your product simply: what it does, fragrance, and key benefits..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 focus:border-indigo-600 focus:outline-none text-xs text-slate-900 bg-white resize-none"
                />
              </div>

              {/* Search Tags */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-700">Search Keywords (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. floor cleaner, antibacterial, lavender, disinfectant"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 focus:border-indigo-600 focus:outline-none text-xs text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Pricing & Detailed GST Calculation */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Pricing &amp; GST Tax Calculation</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set customer prices and view clear GST breakdowns (Base amount + CGST + SGST)
                </p>
              </div>
              <Badge variant="outline" size="sm">GST Compliant</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Regular Price */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Original MRP (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">₹</span>
                  <input
                    type="number"
                    min={1}
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value) || 0)}
                    className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-md font-mono text-sm font-bold text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Regular printed price on packaging</p>
              </div>

              {/* Discount */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Discount (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-md font-mono text-sm text-slate-900 focus:border-indigo-600 focus:outline-none bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[11px] text-slate-400">Leave 0 if no discount</p>
              </div>

              {/* GST Rate Dropdown */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>GST Tax Rate</span>
                  <span className="text-[10px] text-indigo-600 font-mono font-bold">Applied: {gstRate}%</span>
                </label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-md text-xs font-semibold text-slate-900 bg-white cursor-pointer focus:border-indigo-600 focus:outline-none"
                >
                  <option value={0}>0% GST (Tax Exempted)</option>
                  <option value={5}>5% GST (Essentials/Food)</option>
                  <option value={12}>12% GST (Personal Hygiene)</option>
                  <option value={18}>18% GST (Cleaning &amp; Chemicals)</option>
                  <option value={28}>28% GST (Luxury / High Tax)</option>
                </select>
                <p className="text-[11px] text-slate-400">Auto-filled from "{category}"</p>
              </div>
            </div>

            {/* Proper View of GST Breakdown Box */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Percent size={14} className="text-indigo-600" />
                  Detailed GST Tax Breakdown
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Inclusive of all taxes
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Customer Selling Price</span>
                  <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                    ₹{finalSellingPrice}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Price Before GST</span>
                  <span className="text-sm font-bold font-mono text-slate-700 mt-0.5 block">
                    ₹{gstDetails.basePrice}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    CGST ({gstDetails.cgstRate}%)
                  </span>
                  <span className="text-sm font-bold font-mono text-indigo-600 mt-0.5 block">
                    ₹{gstDetails.cgst}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    SGST ({gstDetails.sgstRate}%)
                  </span>
                  <span className="text-sm font-bold font-mono text-indigo-600 mt-0.5 block">
                    ₹{gstDetails.sgst}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Total GST collected: <strong className="font-mono text-slate-900">₹{gstDetails.gstAmount}</strong> ({gstRate}%)</span>
                <span>Inter-state IGST equivalent: <strong className="font-mono text-slate-900">₹{gstDetails.gstAmount}</strong></span>
              </div>
            </div>
          </div>

          {/* Card 3: Delivery Amount & Regional Settings */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Truck size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Delivery Amount &amp; Store Location</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Delivery prices map dynamically according to your store profile location.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onTabChange('store-profile')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer inline-flex items-center gap-1"
              >
                <MapPin size={12} />
                <span>Store Settings</span>
              </button>
            </div>

            {/* Store Location Mapping Notice */}
            <div className="p-3 bg-indigo-50/50 rounded-md border border-indigo-100 flex items-center justify-between text-xs text-indigo-950">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-indigo-600 shrink-0" />
                <div>
                  <span className="font-bold">Store Location: </span>
                  <span>{storeProfile.district}, {storeProfile.state} ({storeProfile.pincode})</span>
                </div>
              </div>
              <Badge variant="outline" size="sm">Origin Anchor</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Local district tier */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Local District Delivery</span>
                <span className="text-base font-bold font-mono text-slate-900 mt-1 block">
                  ₹{storeProfile.standardLocalDelivery}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                  Inside {storeProfile.district}
                </span>
              </div>

              {/* Outside district tier */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Outside District Delivery</span>
                <span className="text-base font-bold font-mono text-slate-900 mt-1 block">
                  ₹{storeProfile.outsideDistrictDelivery}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                  Across {storeProfile.state}
                </span>
              </div>

              {/* Outside state tier */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Outside State Delivery</span>
                <span className="text-base font-bold font-mono text-slate-900 mt-1 block">
                  ₹{storeProfile.outsideStateDelivery}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                  Interstate Deliveries
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs pt-1">
              <label className="font-semibold text-slate-700">Delivery Rule for This Product:</label>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryMode"
                    checked={deliveryType === 'standard'}
                    onChange={() => setDeliveryType('standard')}
                    className="accent-indigo-600"
                  />
                  <span>Standard Store Rates</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryMode"
                    checked={deliveryType === 'free'}
                    onChange={() => setDeliveryType('free')}
                    className="accent-indigo-600"
                  />
                  <span>Free Shipping (₹0)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Card 4: Inventory & Stock (Specific Size/Quantity Stock) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Inventory &amp; Stock Levels</span>
                  <Badge variant="outline" size="sm" className="font-mono text-indigo-700 bg-indigo-50/50">
                    {totalStock} total units
                  </Badge>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set specific available stock per each size or quantity option for customer selection
                </p>
              </div>

              {/* Mode Toggle: Specific Size Stock vs Uniform Stock */}
              <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setHasVariants(true)}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    hasVariants
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Size / Quantity Wise
                </button>
                <button
                  type="button"
                  onClick={() => setHasVariants(false)}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    !hasVariants
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Single Stock
                </button>
              </div>
            </div>

            {hasVariants ? (
              <div className="space-y-4">
                {/* Quick Add Presets Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Quick Add Common Sizes / Quantities:</span>
                    <span className="text-[11px] text-slate-400">Click to add row</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIANT_PRESETS.map((preset) => {
                      const alreadyExists = variants.some(
                        (v) => v.size.toLowerCase() === preset.toLowerCase()
                      );
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleAddVariant(preset)}
                          disabled={alreadyExists}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                            alreadyExists
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50/30'
                          }`}
                        >
                          + {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Variants List / Table */}
                <div className="space-y-2.5">
                  <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <div className="col-span-5">Size / Quantity Option *</div>
                    <div className="col-span-3">Available Stock *</div>
                    <div className="col-span-3">Selling Price (₹)</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  <div className="space-y-2">
                    {variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 p-3 sm:p-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-md items-center text-xs shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="sm:col-span-5 space-y-1 sm:space-y-0">
                          <label className="sm:hidden text-[10px] font-bold uppercase text-slate-500">
                            Size / Quantity Option:
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 500 ml or 1 L or Pack of 2"
                            value={variant.size}
                            onChange={(e) => handleUpdateVariant(variant.id, 'size', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-3 space-y-1 sm:space-y-0">
                          <label className="sm:hidden text-[10px] font-bold uppercase text-slate-500">
                            Stock Available:
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              required
                              placeholder="0"
                              value={variant.stock}
                              onChange={(e) =>
                                handleUpdateVariant(
                                  variant.id,
                                  'stock',
                                  Math.max(0, Number(e.target.value) || 0)
                                )
                              }
                              className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white font-mono text-slate-900 font-bold focus:border-indigo-600 focus:outline-none"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                              units
                            </span>
                          </div>
                        </div>

                        <div className="sm:col-span-3 space-y-1 sm:space-y-0">
                          <label className="sm:hidden text-[10px] font-bold uppercase text-slate-500">
                            Price for this size (₹):
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">
                              ₹
                            </span>
                            <input
                              type="number"
                              min={1}
                              placeholder={String(finalSellingPrice)}
                              value={variant.price || ''}
                              onChange={(e) =>
                                handleUpdateVariant(
                                  variant.id,
                                  'price',
                                  e.target.value ? Number(e.target.value) : undefined
                                )
                              }
                              className="w-full pl-6 pr-2.5 py-2 border border-slate-200 rounded-md bg-white font-mono text-slate-900 focus:border-indigo-600 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-1 flex items-center justify-end sm:justify-center pt-1 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(variant.id)}
                            disabled={variants.length <= 1}
                            title={variants.length <= 1 ? 'Minimum 1 size option required' : 'Remove size'}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleAddVariant()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50/60 hover:bg-indigo-100/70 border border-indigo-200 rounded-md transition-colors cursor-pointer self-start"
                    >
                      <span>+ Add Another Size / Quantity</span>
                    </button>

                    <div className="text-xs text-slate-600 bg-slate-50 px-3.5 py-2 rounded-md border border-slate-200 flex items-center gap-3">
                      <span>Total Stock Across All Sizes:</span>
                      <strong className="font-mono text-sm text-indigo-700 font-bold">
                        {totalStock} units
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Available Stock Quantity *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 focus:border-indigo-600 focus:outline-none font-mono text-sm text-slate-900 bg-white"
                  />
                  <p className="text-[11px] text-slate-400">Total units available for ordering</p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Pack Size Label</label>
                  <input
                    type="text"
                    placeholder="e.g. 500 ml"
                    value={packSize}
                    onChange={(e) => setPackSize(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 focus:border-indigo-600 focus:outline-none text-xs text-slate-900 bg-white"
                  />
                  <p className="text-[11px] text-slate-400">Standard pack volume/size</p>
                </div>
              </div>
            )}

            {/* Low Stock Warning Alert */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <label className="font-semibold text-slate-700">Low Stock Warning Alert Level</label>
                <p className="text-[11px] text-slate-400">
                  Flags an alert when stock for any size option drops to or below this count
                </p>
              </div>
              <div className="relative w-full sm:w-36">
                <input
                  type="number"
                  min={1}
                  value={lowStockWarning}
                  onChange={(e) => setLowStockWarning(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:border-indigo-600 focus:outline-none font-mono text-sm font-semibold text-slate-900 bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                  units
                </span>
              </div>
            </div>
          </div>

          {/* Card 5: Product Images */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Product Images ({images.length}/6)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Upload clean photos of your product</p>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-center transition-colors cursor-pointer ${
                isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-500">
                <Upload size={18} />
              </div>
              <div className="text-xs">
                <span className="font-bold text-indigo-600 hover:underline">Click to upload photos</span>
                <span className="text-slate-500"> or drag and drop files here</span>
              </div>
              <p className="text-[11px] text-slate-400">PNG, JPG, or WEBP up to 5MB each</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach((f) => handleProcessImage(f));
                }}
                className="hidden"
                id="simple-photo-upload"
              />
              <label
                htmlFor="simple-photo-upload"
                className="mt-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-xs cursor-pointer"
              >
                Browse Files
              </label>
            </div>

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-md border border-slate-200 overflow-hidden aspect-square bg-slate-100">
                    <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                      title="Remove image"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 6: Specifications (Simple Details) */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Product Specifications (Optional)</h2>
              <p className="text-xs text-slate-500 mt-0.5">Simple details customers often check before ordering</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Pack Size / Volume</label>
                <input
                  type="text"
                  placeholder="e.g. 500 ml or 1 Litre"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 focus:border-indigo-600 focus:outline-none text-xs text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-700">How to Use</label>
                <input
                  type="text"
                  placeholder="e.g. 1 cap in half a bucket of water"
                  value={howToUse}
                  onChange={(e) => setHowToUse(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 focus:border-indigo-600 focus:outline-none text-xs text-slate-900 bg-white"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <label className="font-semibold text-slate-700">Suitable Surfaces / Materials</label>
                <input
                  type="text"
                  placeholder="e.g. Tiles, marble, granite, wood, and ceramic"
                  value={suitableFor}
                  onChange={(e) => setSuitableFor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-md border border-slate-200 focus:border-indigo-600 focus:outline-none text-xs text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (4 cols): Sticky Preview ── */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[76px] self-start">
          {/* Customer Storefront Live Card Preview */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Customer Card Preview</span>
              <Badge variant="secondary" size="sm">Live</Badge>
            </div>

            <div className="p-4 space-y-3">
              {/* Product Image preview */}
              <div className="w-full aspect-square rounded-md bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative">
                {images.length > 0 ? (
                  <img src={images[0]} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                    <Package size={32} />
                    <span className="text-[11px]">No Photo Added</span>
                  </div>
                )}
                {badge && (
                  <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                    {badge}
                  </span>
                )}
              </div>

              {/* Title & Brand */}
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block">{category}</span>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mt-0.5">
                  {name || 'Your Product Title'}
                </h3>
              </div>

              {/* Price Row */}
              <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100">
                <span className="text-base font-bold font-mono text-slate-900">
                  ₹{finalSellingPrice}
                </span>
                {discount > 0 && (
                  <>
                    <span className="text-xs font-mono text-slate-400 line-through">
                      ₹{price}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600">
                      {discount}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Live Size & Stock Selector Preview */}
              {hasVariants && variants.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                      Customer Size &amp; Stock View:
                    </span>
                    <span className="font-mono text-indigo-700 font-bold">{totalStock} total units</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {variants.map((v, i) => (
                      <div
                        key={v.id || i}
                        className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 text-[10px] flex flex-col items-start min-w-[70px]"
                      >
                        <span className="font-bold text-slate-900">{v.size || 'Size'}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`font-semibold ${v.stock <= 5 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {v.stock} in stock
                          </span>
                          {v.price && v.price !== finalSellingPrice && (
                            <span className="font-mono text-slate-500 font-bold">₹{v.price}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tax & Delivery labels */}
              <div className="flex flex-col gap-1 text-[11px] text-slate-500 pt-1">
                <span>Inclusive of {gstRate}% GST</span>
                <span>
                  Delivery: {deliveryType === 'free' ? (
                    <strong className="text-emerald-600">FREE</strong>
                  ) : (
                    <span>From ₹{storeProfile.standardLocalDelivery} (Local)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Price & GST Summary Summary Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">
              Financial Summary
            </h4>
            <div className="space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Selling Price:</span>
                <span className="font-mono font-bold text-slate-900">₹{finalSellingPrice}</span>
              </div>
              <div className="flex justify-between">
                <span>Base (excl. GST):</span>
                <span className="font-mono">₹{gstDetails.basePrice}</span>
              </div>
              <div className="flex justify-between text-indigo-700">
                <span>GST ({gstRate}%):</span>
                <span className="font-mono font-semibold">+₹{gstDetails.gstAmount}</span>
              </div>
              <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100">
                <span>Total Inventory:</span>
                <span className="font-mono font-bold text-slate-900">{totalStock} units</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPublishing}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md shadow-xs transition-colors cursor-pointer text-xs mt-2 disabled:opacity-50"
            >
              {isPublishing ? 'Publishing Product...' : 'Publish Product to Store'}
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
};

export default AddProductForm;
