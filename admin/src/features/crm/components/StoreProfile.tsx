import React, { useState, useEffect } from 'react';
import { useApp } from '../../../core/context/AppContext';
import {
  MapPin,
  Truck,
  Save,
  CheckCircle2,
  Building2,
  AlertCircle,
  HelpCircle,
  Palette,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import {
  getStoreProfile,
  saveStoreProfile,
  calculateDeliveryFee,
  STORE_BRAND_COLORS
} from '../../../core/utils/storeSettings';
import type {
  StoreProfile
} from '../../../core/utils/storeSettings';
import { Badge } from '@/components/reui/badge';

const StoreProfileComponent: React.FC = () => {
  const { showToast } = useApp();

  const [profile, setProfile] = useState<StoreProfile>(getStoreProfile());
  const [isSaved, setIsSaved] = useState(false);

  // Test Delivery Fee Calculator simulator
  const [testDistrict, setTestDistrict] = useState('Coimbatore');
  const [testState, setTestState] = useState('Tamil Nadu');
  const [testAmount, setTestAmount] = useState<number>(450);

  useEffect(() => {
    setProfile(getStoreProfile());
  }, []);

  const handleProfileChange = (field: keyof StoreProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoreProfile(profile);
    setIsSaved(true);
    showToast('Store location & dynamic delivery settings saved.');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo file size must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        handleProfileChange('logo', reader.result as string);
        showToast('Store logo updated (click Save Changes to confirm).');
      }
    };
    reader.readAsDataURL(file);
  };

  const simulatedDelivery = calculateDeliveryFee(testDistrict, testState, testAmount, profile);

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Store Profile &amp; Location Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Update your store brand color, logo, home district, address, and delivery fee rules.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer min-h-[38px] shrink-0"
        >
          {isSaved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          <span>{isSaved ? 'Settings Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Section 0: Store Visual Identity & Branding (Color & Logo) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Palette size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Store Visual Identity &amp; Branding</h2>
              <p className="text-xs text-slate-500">
                Customize your store logo and primary brand accent color across customer storefront and admin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Store Logo Column */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-slate-400" />
                Store Logo
              </label>

              <div className="flex items-start gap-4">
                {/* Logo Preview box */}
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative group">
                  {profile.logo ? (
                    <img
                      src={profile.logo}
                      alt="Store Logo"
                      className="w-full h-full object-contain p-1.5"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 text-center p-1">
                      <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs mb-1">
                        {(profile.storeName || 'S').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[9px] font-medium leading-none">No Logo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="store-logo-file-input"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-xs cursor-pointer min-h-[34px]"
                    >
                      <Upload size={13} /> Upload Logo
                    </label>
                    <input
                      id="store-logo-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />

                    {profile.logo && (
                      <button
                        type="button"
                        onClick={() => {
                          handleProfileChange('logo', '');
                          showToast('Logo cleared.');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 transition-colors cursor-pointer min-h-[34px]"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500 font-medium">Or enter Image URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={profile.logo || ''}
                      onChange={(e) => handleProfileChange('logo', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    PNG, SVG, or JPG recommended. Transparent background looks best.
                  </p>
                </div>
              </div>
            </div>

            {/* Store Brand Color Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Palette size={14} className="text-slate-400" />
                  Primary Brand Accent Color
                </label>
                <span className="text-[11px] font-mono font-semibold text-slate-600 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                  {profile.brandColor || '#4f46e5'}
                </span>
              </div>

              {/* Preset Palette Swatches */}
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                {STORE_BRAND_COLORS.map((col) => {
                  const isSelected = (profile.brandColor || '#4f46e5').toLowerCase() === col.hex.toLowerCase();
                  return (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => handleProfileChange('brandColor', col.hex)}
                      className={`flex items-center gap-2 p-1.5 rounded-md border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-slate-900 ring-2 ring-slate-900/20 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 shadow-2xs border border-black/10"
                        style={{ backgroundColor: col.hex }}
                      />
                      <span className="text-[10px] font-medium text-slate-700 truncate">
                        {col.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Picker input */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center gap-2 border border-slate-200 rounded-md px-2.5 py-1 bg-white">
                  <input
                    type="color"
                    value={profile.brandColor || '#4f46e5'}
                    onChange={(e) => handleProfileChange('brandColor', e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="text-xs font-medium text-slate-600">Custom Hex:</span>
                  <input
                    type="text"
                    value={profile.brandColor || '#4f46e5'}
                    onChange={(e) => handleProfileChange('brandColor', e.target.value)}
                    className="w-20 font-mono text-xs text-slate-900 border-none outline-none font-semibold"
                    placeholder="#4f46e5"
                  />
                </div>

                {/* Sample Live Component Preview */}
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded text-white text-[11px] font-semibold shadow-xs"
                    style={{ backgroundColor: profile.brandColor || '#4f46e5' }}
                  >
                    Sample Button
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Section 1: Store Location & Address */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Building2 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Store Identity &amp; Physical Location</h2>
              <p className="text-xs text-slate-500">
                Your store's district and state are used to automatically calculate standard delivery fees for customer orders.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="font-semibold text-slate-700">Store Name *</label>
              <input
                type="text"
                required
                value={profile.storeName}
                onChange={(e) => handleProfileChange('storeName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:border-indigo-600 focus:outline-none min-h-[38px]"
                placeholder="e.g. FORMA Studio"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">GSTIN / Tax ID</label>
              <input
                type="text"
                value={profile.gstNumber}
                onChange={(e) => handleProfileChange('gstNumber', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white font-mono text-slate-900 focus:border-indigo-600 focus:outline-none min-h-[38px]"
                placeholder="e.g. 33AAAAA0000A1Z5"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Store Contact Email *</label>
              <input
                type="email"
                required
                value={profile.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:border-indigo-600 focus:outline-none min-h-[38px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Store Contact Phone *</label>
              <input
                type="text"
                required
                value={profile.phone}
                onChange={(e) => handleProfileChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:border-indigo-600 focus:outline-none min-h-[38px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Street / Area Address</label>
              <input
                type="text"
                value={profile.addressLine}
                onChange={(e) => handleProfileChange('addressLine', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 focus:border-indigo-600 focus:outline-none min-h-[38px]"
                placeholder="e.g. 124 Commercial Avenue"
              />
            </div>

            {/* Crucial Location Mapping Fields */}
            <div className="space-y-1.5 bg-indigo-50/50 p-3 rounded-md border border-indigo-100">
              <label className="font-bold text-indigo-950 flex items-center gap-1.5">
                <MapPin size={13} className="text-indigo-600" />
                Store Home District *
              </label>
              <input
                type="text"
                required
                value={profile.district}
                onChange={(e) => handleProfileChange('district', e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-md bg-white font-medium text-slate-900 focus:border-indigo-600 focus:outline-none min-h-[38px]"
                placeholder="e.g. Coimbatore or Chennai"
              />
              <p className="text-[11px] text-indigo-600 leading-tight">
                Orders inside this district get the standard local delivery fee.
              </p>
            </div>

            <div className="space-y-1.5 bg-indigo-50/50 p-3 rounded-md border border-indigo-100">
              <label className="font-bold text-indigo-950 flex items-center gap-1.5">
                <MapPin size={13} className="text-indigo-600" />
                Store Home State *
              </label>
              <input
                type="text"
                required
                value={profile.state}
                onChange={(e) => handleProfileChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-md bg-white font-medium text-slate-900 focus:border-indigo-600 focus:outline-none min-h-[38px]"
                placeholder="e.g. Tamil Nadu"
              />
              <p className="text-[11px] text-indigo-600 leading-tight">
                Used to distinguish same-state vs. interstate customer deliveries.
              </p>
            </div>

            <div className="space-y-1.5 bg-indigo-50/50 p-3 rounded-md border border-indigo-100">
              <label className="font-bold text-indigo-950">Store Pincode *</label>
              <input
                type="text"
                required
                value={profile.pincode}
                onChange={(e) => handleProfileChange('pincode', e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-md bg-white font-mono text-slate-900 focus:border-indigo-600 focus:outline-none min-h-[38px]"
                placeholder="e.g. 641001"
              />
              <p className="text-[11px] text-indigo-600 leading-tight">
                Default origin postal code for courier dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Delivery Pricing Rules (Standard vs. Outer Region) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <Truck size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Delivery Amount &amp; Dynamic Regional Mapping</h2>
              <p className="text-xs text-slate-500">
                Standard delivery fee applies to your home district. If the destination is outside your district or state, the fee dynamically adjusts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Rule 1: Standard Local Delivery */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Standard Local Fee</span>
                <Badge variant="success" size="sm">Local</Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Applied for customers inside <strong className="text-slate-700">{profile.district || 'Store District'}</strong>.
              </p>
              <div className="relative pt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">₹</span>
                <input
                  type="number"
                  min={0}
                  required
                  value={profile.standardLocalDelivery}
                  onChange={(e) => handleProfileChange('standardLocalDelivery', Number(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-md bg-white font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Rule 2: Outside District (Same State) */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Outside District Fee</span>
                <Badge variant="warning" size="sm">Same State</Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Applied for customers in <strong className="text-slate-700">{profile.state || 'Store State'}</strong>, outside your district.
              </p>
              <div className="relative pt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">₹</span>
                <input
                  type="number"
                  min={0}
                  required
                  value={profile.outsideDistrictDelivery}
                  onChange={(e) => handleProfileChange('outsideDistrictDelivery', Number(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-md bg-white font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Rule 3: Outside State (Interstate) */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Outside State Fee</span>
                <Badge variant="secondary" size="sm">Interstate</Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Applied for customers ordered outside <strong className="text-slate-700">{profile.state || 'Store State'}</strong>.
              </p>
              <div className="relative pt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">₹</span>
                <input
                  type="number"
                  min={0}
                  required
                  value={profile.outsideStateDelivery}
                  onChange={(e) => handleProfileChange('outsideStateDelivery', Number(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-md bg-white font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Rule 4: Free Delivery Threshold */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Free Delivery Over</span>
                <Badge variant="outline" size="sm">Optional</Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Orders with cart subtotal higher than this amount get ₹0 free shipping.
              </p>
              <div className="relative pt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">₹</span>
                <input
                  type="number"
                  min={0}
                  value={profile.freeDeliveryThreshold}
                  onChange={(e) => handleProfileChange('freeDeliveryThreshold', Number(e.target.value) || 0)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-md bg-white font-mono font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Interactive Live Regional Delivery Tester */}
          <div className="mt-4 p-4 rounded-lg bg-indigo-50/40 border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <HelpCircle size={14} className="text-indigo-600" />
                Live Delivery Fee Simulator
              </span>
              <p className="text-slate-500 text-[11px]">
                Test how the delivery fee calculates based on your configured store location ({profile.district}, {profile.state}):
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Destination District"
                  value={testDistrict}
                  onChange={(e) => setTestDistrict(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-slate-200 bg-white font-medium text-slate-900 w-36"
                />
                <input
                  type="text"
                  placeholder="Destination State"
                  value={testState}
                  onChange={(e) => setTestState(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-slate-200 bg-white font-medium text-slate-900 w-36"
                />
                <input
                  type="number"
                  placeholder="Order Subtotal (₹)"
                  value={testAmount}
                  onChange={(e) => setTestAmount(Number(e.target.value) || 0)}
                  className="px-2.5 py-1.5 rounded border border-slate-200 bg-white font-mono font-medium text-slate-900 w-28"
                />
              </div>
            </div>

            <div className="bg-white p-3 rounded-md border border-indigo-200 text-right shrink-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Calculated Delivery Fee</span>
              <span className="text-xl font-bold font-mono text-indigo-700">
                {simulatedDelivery.fee === 0 ? 'FREE' : `₹${simulatedDelivery.fee}`}
              </span>
              <span className="text-[11px] text-slate-600 block mt-0.5 font-medium">
                {simulatedDelivery.label}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle size={14} className="text-indigo-600" />
            <span>Store location &amp; delivery changes immediately reflect across checkout and order logistics.</span>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer min-h-[38px]"
          >
            <Save size={15} />
            <span>Save Store Location &amp; Delivery Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default StoreProfileComponent;
