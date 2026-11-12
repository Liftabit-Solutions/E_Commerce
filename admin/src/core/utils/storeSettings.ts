// Store Profile & Delivery / GST Configuration Utility
// @ts-ignore
import { auth } from '../../../firebase';

export interface StoreProfile {
  storeName: string;
  logo?: string;
  brandColor?: string; // Hex color code e.g. '#4f46e5'
  email: string;
  phone: string;
  addressLine: string;
  district: string;
  state: string;
  pincode: string;
  gstNumber: string;
  // Delivery Fee Rates
  standardLocalDelivery: number;     // Store's own district
  outsideDistrictDelivery: number;   // Within store's state, outside district
  outsideStateDelivery: number;      // Outside store's state (Interstate)
  freeDeliveryThreshold: number;     // Free delivery when order subtotal exceeds this
}

export interface CatalogItem {
  id: string;
  title: string;
  category: string;
  image: string;
  description?: string;
  badge?: string;
  isActive: boolean;
}

export interface StorefrontSectionsConfig {
  catalog: CatalogItem[];
  featuredProductIds: string[];      // Product IDs selected for Featured section
  recommendedProductIds: string[];   // Product IDs selected for Recommended section
  offerProductIds: string[];         // Product IDs on sale/offers
  offersBadgeText?: string;
}

export interface CategoryGSTConfig {
  name: string;
  gstRate: number; // 0, 5, 12, 18, 28
  hsnCode?: string;
  description?: string;
}

export const STORE_BRAND_COLORS = [
  { name: 'Indigo (Modern)', hex: '#4f46e5' },
  { name: 'Emerald (Clean)', hex: '#059669' },
  { name: 'Forest (Organic)', hex: '#166534' },
  { name: 'Blue (Trust)', hex: '#2563eb' },
  { name: 'Rose (Vibrant)', hex: '#e11d48' },
  { name: 'Amber (Warm)', hex: '#d97706' },
  { name: 'Violet (Luxury)', hex: '#7c3aed' },
  { name: 'Slate (Minimal)', hex: '#0f172a' },
];

export const DEFAULT_CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'cat-1',
    title: 'Floor Care',
    category: 'Floor Care',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
    description: 'Deep surface sanitizers & citrus floor cleaners',
    badge: 'Popular',
    isActive: true,
  },
  {
    id: 'cat-2',
    title: 'Dish Care',
    category: 'Dish Care',
    image: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=600&auto=format&fit=crop&q=80',
    description: 'Grease-cutting botanical concentrates',
    badge: 'Eco',
    isActive: true,
  },
  {
    id: 'cat-3',
    title: 'Laundry Care',
    category: 'Laundry Care',
    image: 'https://images.unsplash.com/photo-1545173168-9f1907e80789?w=600&auto=format&fit=crop&q=80',
    description: 'Fabric-preserving detergents & gentle softeners',
    badge: 'Gentle',
    isActive: true,
  },
  {
    id: 'cat-4',
    title: 'Kitchen Care',
    category: 'Kitchen Care',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80',
    description: 'Countertop sprays & heavy-duty degreasers',
    badge: 'Pro',
    isActive: true,
  },
  {
    id: 'cat-5',
    title: 'Personal Care',
    category: 'Personal Care',
    image: 'https://images.unsplash.com/photo-1608248597359-0098f99723ec?w=600&auto=format&fit=crop&q=80',
    description: 'Hydrating handwashes & nourishing liquid soaps',
    badge: 'Pure',
    isActive: true,
  },
  {
    id: 'cat-6',
    title: 'General Household',
    category: 'General Household',
    image: 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?w=600&auto=format&fit=crop&q=80',
    description: 'Microfiber tools, reusable scrubbers & utilities',
    badge: 'Essential',
    isActive: true,
  },
];

export const DEFAULT_STOREFRONT_CONFIG: StorefrontSectionsConfig = {
  catalog: DEFAULT_CATALOG_ITEMS,
  featuredProductIds: [],
  recommendedProductIds: [],
  offerProductIds: [],
  offersBadgeText: 'Limited Offer',
};

export const DEFAULT_CATEGORIES: CategoryGSTConfig[] = [
  { name: 'Floor Care', gstRate: 18, hsnCode: '3402', description: 'Floor cleaners, disinfectants, and surface liquids' },
  { name: 'Dish Care', gstRate: 18, hsnCode: '3402', description: 'Dishwash bars, gels, liquids, and tablets' },
  { name: 'Laundry Care', gstRate: 18, hsnCode: '3402', description: 'Detergents, fabric softeners, and stain removers' },
  { name: 'Kitchen Care', gstRate: 18, hsnCode: '3402', description: 'Degreasers, chimney cleaners, and kitchen sprays' },
  { name: 'Personal Care', gstRate: 12, hsnCode: '3307', description: 'Handwashes, body cleansers, and soaps' },
  { name: 'Essentials & Grocery', gstRate: 5, hsnCode: '2106', description: 'Daily staple items and basic household provisions' },
  { name: 'General Household', gstRate: 18, hsnCode: '3924', description: 'Mops, brushes, scrubbers, and accessories' },
  { name: 'Exempted / Zero Tax', gstRate: 0, hsnCode: '0000', description: 'Tax-exempted goods and items' },
];

export const DEFAULT_STORE_PROFILE: StoreProfile = {
  storeName: 'FORMA Studio',
  logo: '',
  brandColor: '#4f46e5',
  email: 'concierge@forma.com',
  phone: '+91 98765 43210',
  addressLine: '124 Commercial Avenue, Gandhi Nagar',
  district: 'Coimbatore',
  state: 'Tamil Nadu',
  pincode: '641001',
  gstNumber: '33AAAAA0000A1Z5',
  standardLocalDelivery: 40,
  outsideDistrictDelivery: 70,
  outsideStateDelivery: 120,
  freeDeliveryThreshold: 799,
};

const STORAGE_STORE_KEY = 'ce_admin_store_profile';
const STORAGE_CATS_KEY = 'ce_admin_categories_gst';
const STORAGE_STOREFRONT_KEY = 'ce_admin_storefront_sections';

export const getStoreProfile = (): StoreProfile => {
  try {
    const saved = localStorage.getItem(STORAGE_STORE_KEY);
    if (saved) {
      return { ...DEFAULT_STORE_PROFILE, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load store profile:', e);
  }
  return DEFAULT_STORE_PROFILE;
};

export const saveStoreProfile = (profile: StoreProfile): void => {
  try {
    localStorage.setItem(STORAGE_STORE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event('store_profile_updated'));

    // 1. Immediate Cross-Tab / Cross-Origin Broadcast
    try {
      const bc = new BroadcastChannel('store_updates_channel');
      bc.postMessage({ type: 'STORE_PROFILE_UPDATED', profile });
      bc.close();
    } catch (e) {
      // BroadcastChannel unsupported fallback
    }

    // 2. Sync to Backend Server immediately for emails and server-generated invoice PDFs
    (async () => {
      try {
        const backendUri = (import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api').replace(/\/+$/, '');
        let token = '';
        if (auth && auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
        await fetch(`${backendUri}/store-profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          credentials: 'include',
          body: JSON.stringify(profile),
        });
      } catch (err: any) {
        console.warn('Could not sync store profile to backend:', err?.message || err);
      }
    })();
  } catch (e) {
    console.error('Failed to save store profile:', e);
  }
};

export const syncStoreProfileFromServer = async (): Promise<StoreProfile | null> => {
  try {
    const backendUri = (import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api').replace(/\/+$/, '');
    const res = await fetch(`${backendUri}/store-profile`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.storeProfile) {
        localStorage.setItem(STORAGE_STORE_KEY, JSON.stringify(data.storeProfile));
        window.dispatchEvent(new Event('store_profile_updated'));
        return data.storeProfile;
      }
    }
  } catch (e) {
    // Offline fallback to local state
  }
  return null;
};

export const getStorefrontConfig = (): StorefrontSectionsConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_STOREFRONT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        catalog: Array.isArray(parsed.catalog) && parsed.catalog.length > 0 ? parsed.catalog : DEFAULT_CATALOG_ITEMS,
        featuredProductIds: Array.isArray(parsed.featuredProductIds) ? parsed.featuredProductIds : [],
        recommendedProductIds: Array.isArray(parsed.recommendedProductIds) ? parsed.recommendedProductIds : [],
        offerProductIds: Array.isArray(parsed.offerProductIds) ? parsed.offerProductIds : [],
        offersBadgeText: parsed.offersBadgeText || 'Limited Offer',
      };
    }
  } catch (e) {
    console.warn('Failed to load storefront config:', e);
  }
  return DEFAULT_STOREFRONT_CONFIG;
};

export const saveStorefrontConfig = (config: StorefrontSectionsConfig): void => {
  try {
    localStorage.setItem(STORAGE_STOREFRONT_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('storefront_config_updated'));
  } catch (e) {
    console.error('Failed to save storefront config:', e);
  }
};

export const getCategoriesConfig = (): CategoryGSTConfig[] => {
  try {
    const saved = localStorage.getItem(STORAGE_CATS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load categories config:', e);
  }
  return DEFAULT_CATEGORIES;
};

export const saveCategoriesConfig = (cats: CategoryGSTConfig[]): void => {
  try {
    localStorage.setItem(STORAGE_CATS_KEY, JSON.stringify(cats));
    window.dispatchEvent(new Event('categories_gst_updated'));
  } catch (e) {
    console.error('Failed to save categories config:', e);
  }
};

/**
 * Calculates delivery fee based on store location vs customer destination.
 */
export const calculateDeliveryFee = (
  destDistrict?: string,
  destState?: string,
  subtotal: number = 0,
  customStore?: StoreProfile
): {
  fee: number;
  tier: 'local' | 'state' | 'national' | 'free';
  label: string;
  isLocal: boolean;
} => {
  const store = customStore || getStoreProfile();

  if (store.freeDeliveryThreshold > 0 && subtotal >= store.freeDeliveryThreshold) {
    return {
      fee: 0,
      tier: 'free',
      label: `Free Delivery (Orders above ₹${store.freeDeliveryThreshold})`,
      isLocal: true,
    };
  }

  const cleanStoreDistrict = (store.district || '').trim().toLowerCase();
  const cleanStoreState = (store.state || '').trim().toLowerCase();

  const cleanDestDistrict = (destDistrict || '').trim().toLowerCase();
  const cleanDestState = (destState || '').trim().toLowerCase();

  // If destination district matches store district
  if (cleanDestDistrict && cleanStoreDistrict && cleanDestDistrict === cleanStoreDistrict) {
    return {
      fee: store.standardLocalDelivery,
      tier: 'local',
      label: `Standard Local Delivery (${store.district})`,
      isLocal: true,
    };
  }

  // If destination state matches store state
  if (cleanDestState && cleanStoreState && cleanDestState === cleanStoreState) {
    return {
      fee: store.outsideDistrictDelivery,
      tier: 'state',
      label: `Outside District Delivery (${store.state})`,
      isLocal: false,
    };
  }

  // Outside store state
  return {
    fee: store.outsideStateDelivery,
    tier: 'national',
    label: `Interstate Delivery (Outside ${store.state || 'Store State'})`,
    isLocal: false,
  };
};

/**
 * Calculates GST components from price and tax rate.
 * Assumes the selling price is inclusive of GST.
 */
export const calculateGST = (
  sellingPrice: number,
  gstPercentage: number = 18,
  isInterstate: boolean = false
) => {
  if (sellingPrice <= 0 || gstPercentage <= 0) {
    return {
      sellingPrice,
      basePrice: sellingPrice,
      gstRate: 0,
      gstAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
    };
  }

  const basePrice = Math.round((sellingPrice / (1 + gstPercentage / 100)) * 100) / 100;
  const gstAmount = Math.round((sellingPrice - basePrice) * 100) / 100;

  if (isInterstate) {
    return {
      sellingPrice,
      basePrice,
      gstRate: gstPercentage,
      gstAmount,
      cgst: 0,
      sgst: 0,
      igst: gstAmount,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: gstPercentage,
    };
  }

  const halfRate = gstPercentage / 2;
  const halfGst = Math.round((gstAmount / 2) * 100) / 100;

  return {
    sellingPrice,
    basePrice,
    gstRate: gstPercentage,
    gstAmount,
    cgst: halfGst,
    sgst: halfGst,
    igst: 0,
    cgstRate: halfRate,
    sgstRate: halfRate,
    igstRate: 0,
  };
};

