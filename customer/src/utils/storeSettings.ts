// Customer-side Store Settings & Storefront Configuration Utilities

export interface StoreProfile {
  storeName: string;
  logo?: string;
  brandColor?: string;
  email: string;
  phone: string;
  addressLine: string;
  district: string;
  state: string;
  pincode: string;
  gstNumber: string;
  standardLocalDelivery: number;
  outsideDistrictDelivery: number;
  outsideStateDelivery: number;
  freeDeliveryThreshold: number;
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
  featuredProductIds: string[];
  recommendedProductIds: string[];
  offerProductIds: string[];
  offersBadgeText?: string;
}

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

export const DEFAULT_STORE_PROFILE: StoreProfile = {
  storeName: 'FORMA',
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

export const DEFAULT_STOREFRONT_CONFIG: StorefrontSectionsConfig = {
  catalog: DEFAULT_CATALOG_ITEMS,
  featuredProductIds: [],
  recommendedProductIds: [],
  offerProductIds: [],
  offersBadgeText: 'Limited Offer',
};

const STORAGE_STORE_KEY = 'ce_admin_store_profile';
const STORAGE_STOREFRONT_KEY = 'ce_admin_storefront_sections';

export const applyStoreTheme = (profile: StoreProfile): void => {
  if (typeof document !== 'undefined' && profile.brandColor) {
    document.documentElement.style.setProperty('--color-primary', profile.brandColor);
    document.documentElement.style.setProperty('--store-brand-color', profile.brandColor);
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
        applyStoreTheme(data.storeProfile);
        window.dispatchEvent(new Event('store_profile_updated'));
        return data.storeProfile;
      }
    }
  } catch (e) {
    // Offline fallback
  }
  return null;
};

// Initialize real-time cross-tab & server synchronization
export const initStoreProfileSync = (): void => {
  if (typeof window === 'undefined') return;

  // Apply initial theme from cache
  applyStoreTheme(getStoreProfile());

  // 1. Cross-tab BroadcastChannel listener (Instant 0ms update across tabs/windows)
  try {
    const bc = new BroadcastChannel('store_updates_channel');
    bc.onmessage = (event) => {
      if (event.data && event.data.type === 'STORE_PROFILE_UPDATED' && event.data.profile) {
        localStorage.setItem(STORAGE_STORE_KEY, JSON.stringify(event.data.profile));
        applyStoreTheme(event.data.profile);
        window.dispatchEvent(new Event('store_profile_updated'));
      }
    };
  } catch (e) {
    // BroadcastChannel unsupported fallback
  }

  // 2. Storage event listener (Standard cross-tab fallback)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_STORE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        applyStoreTheme(parsed);
        window.dispatchEvent(new Event('store_profile_updated'));
      } catch (err) {}
    }
  });

  // 3. Fetch latest from backend server
  syncStoreProfileFromServer();
};

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

