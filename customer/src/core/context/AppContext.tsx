import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { Product, Review, Story, User, Lead, Banner, CartItem, Order, Staff, LeadActivity } from '../types';
// @ts-ignore
import { auth } from '../../../firebase';
import { getSocket, updateSocketAuth } from '../socket/socket';
import { SOCKET_EVENTS } from '../socket/socketEvents';
import { applyStoreTheme } from '../../utils/storeSettings';

interface AppContextType {
  products: Product[];
  isProductsLoading: boolean;
  reviews: Review[];
  stories: Story[];
  fetchStories: () => Promise<void>;
  submitStory: (rating: number, body: string, authorName?: string, role?: string) => Promise<any>;
  users: User[];
  leads: Lead[];
  banners: Banner[];
  staff: Staff[];
  curUser: User | null;
  isAuthLoading: boolean;
  curPage: string;
  curFilter: string;
  searchQuery: string;
  toastMessage: string | null;
  selectedProductId: number | null;
  authModalOpen: boolean;
  authModalTab: 'login' | 'signup';
  setCurPage: (page: string) => void;
  setCurFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedProductId: (id: number | null) => void;
  openAuthModal: (tab?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  loginUser: (email: string, pass: string) => { success: boolean; message: string };
  registerUser: (name: string, email: string, pass: string) => { success: boolean; message: string };
  logoutUser: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'rating' | 'reviewCount'>) => Promise<boolean>;
  updateProductImages: (id: number, updatedImgs: string[]) => void;
  deleteProduct: (id: number) => Promise<boolean>;
  duplicateProduct: (id: number) => void;
  submitReview: (authorName: string, rating: number, body: string, productName: string, productId?: string, image?: string | null) => Promise<{ success: boolean; message?: string }> | void;
  fetchProductReviews: (productId: string | number, productName?: string) => Promise<void>;
  approveReview: (id: number | string) => void;
  deleteReview: (id: number | string) => void;
  updateReviewStatus: (id: number | string, status: NonNullable<Review['status']>) => void;
  replyToReview: (id: number | string, replyText: string) => void;
  addLead: (
    name: string,
    email: string,
    phoneOrSubject: string,
    companyOrService?: string,
    sourceOrMessage?: string,
    subject?: string,
    service?: string,
    message?: string,
    priority?: Lead['priority']
  ) => Promise<{ success: boolean; message?: string }> | void;
  updateLeadStatus: (id: number, status: Lead['status']) => void;
  updateLeadNotes: (id: number, notes: string) => void;
  addLeadComment: (id: number, author: string, body: string) => void;
  addLeadTask: (id: number, title: string) => void;
  toggleLeadTask: (id: number, taskId: string) => void;
  addLeadReminder: (id: number, title: string, date: string) => void;
  addLeadActivity: (id: number, type: LeadActivity['type'], title: string, content: string) => void;
  updateBanners: (banners: Banner[]) => void;
  fetchBanners: () => Promise<void>;
  showToast: (msg: string) => void;
  updateProduct: (product: Product, localDeletedImagePublicIds?: string[]) => Promise<boolean>;
  updateOrderStatus: (id: string, status: Order['status'], targetId?: string) => Promise<boolean>;
  cancelOrder: (orderId: string, reason?: string) => Promise<{ success: boolean; message?: string }>;
  returnOrder: (orderId: string, reason?: string) => Promise<{ success: boolean; message?: string }>;
  updateOrderDetails: (id: string, details: Partial<Order>) => void;
  addOrderTimelineEvent: (id: string, status: string, notes?: string) => void;
  
  // Shopping Cart & Checkout States
  cart: CartItem[];
  orders: Order[];
  addingProductId: number | string | null;
  deletingProductId: number | string | null;
  updatingProductId: number | string | null;
  isCartLoading: boolean;
  fetchUserCart: () => Promise<void>;
  fetchMyOrders: () => Promise<void>;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  updateCartQty: (productId: number | string, qty: number) => Promise<void>;
  removeFromCart: (productId: number | string) => Promise<void>;
  clearCart: () => void;
  placeOrder: (
    address: Order['address'] & { _id?: string; id?: string },
    paymentMethod: string,
    customerNotes?: string,
    itemsToOrder?: CartItem[],
    deliveryOption?: 'FREE' | 'STANDARD' | 'EXPRESS',
    orderType?: 'BUY_NOW' | 'CART'
  ) => Promise<any>;

  // Staff Account Settings
  inviteStaff: (name: string, email: string, role: Staff['role']) => void;
  updateStaffStatus: (id: string, status: Staff['status']) => void;
  resetStaffPassword: (id: string) => void;
  deleteStaff: (id: string) => void;

  // Global Invoice Overlay State
  invoiceOrder: Order | null;
  setInvoiceOrder: (order: Order | null) => void;
  fetchCurrentUser: (preFetchedUser?: User) => Promise<void>;
  updateProfile: (updatedUser: Partial<User>) => void;
  setCurUser: React.Dispatch<React.SetStateAction<User | null>>;

  // Navigation Visibility Controls
  hideNavbar: boolean;
  setHideNavbar: (hide: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEF_PRODS: Product[] = [
  {
    id: 1,
    name: 'Fresh Floor Cleaner',
    cat: 'Floor Care',
    desc: 'A natural, plant-based floor cleaner suitable for marble, tiles, and wood. Just one cap in half a bucket of water leaves your floors shiny, streak-free, and clean with a mild eucalyptus fragrance.',
    tags: ['Safe for kids & pets', 'Streak-free shine', 'Natural fragrance', 'All Hard Floors'],
    badge: 'Bestseller',
    imgs: [],
    price: 299,
    sku: 'EC-FL-01',
    brand: 'Ecommerce',
    discount: 10,
    stock: 45,
    status: 'Active',
    createdDate: '2026-05-12',
    specs: {
      Size: '500 ml / 1 L / 5 L',
      Usage: '1 cap in half a bucket of water',
      Fragrance: 'Eucalyptus & Tea Tree',
      Suitable: 'All hard floors (marble, wood, tiles)',
      pH: '7.0',
      Dilution: '1:50'
    },
    rating: 4.8,
    reviewCount: 124
  },
  {
    id: 2,
    name: 'Gentle Dishwashing Liquid',
    cat: 'Dish Care',
    desc: 'A powerful dishwashing liquid that cuts grease and food residues from all pots and pans. Infused with natural aloe vera, it is very gentle on hands and keeps them soft even after long washes.',
    tags: ['Aloe Vera Infused', 'Cuts grease easily', 'Soft on hands', 'Concentrated formula'],
    badge: null,
    imgs: [],
    price: 199,
    sku: 'EC-DH-02',
    brand: 'Ecommerce',
    discount: 0,
    stock: 5,
    status: 'Active',
    createdDate: '2026-05-20',
    specs: {
      Size: '500 ml / 1 L',
      Usage: 'A few drops on a wet sponge',
      Fragrance: 'Natural Citrus',
      Suitable: 'All cooking utensils and plates',
      pH: '6.5',
      Dilution: 'Ready to use'
    },
    rating: 4.6,
    reviewCount: 87
  },
  {
    id: 3,
    name: 'Safe Laundry Wash',
    cat: 'Laundry Care',
    desc: 'A gentle laundry wash that removes dirt and stains while protecting fabric colors and fibers. Safe for both top-load and front-load washing machines, and suitable for all types of clothing.',
    tags: ['Protects colors', 'Removes tough stains', 'Machine & hand wash', 'Clean scent'],
    badge: 'New',
    imgs: [],
    price: 349,
    sku: 'EC-LD-03',
    brand: 'Ecommerce',
    discount: 5,
    stock: 120,
    status: 'Active',
    createdDate: '2026-06-01',
    specs: {
      Size: '1 L / 3 L Refill',
      Usage: '1 cap for a normal load',
      Fragrance: 'Fresh Linen',
      Suitable: 'All washing machines and hand wash',
      pH: '7.5',
      Dilution: 'Ready to use'
    },
    rating: 4.7,
    reviewCount: 62
  },
  {
    id: 4,
    name: 'Kitchen Surface Sanitizer',
    cat: 'Dish Care',
    desc: 'A food-safe kitchen surface spray for cleaning countertops, dining tables, cutting boards, and kitchen tiles. Cleans effectively without leaving chemical residues or toxic fumes, making it safe for food preparation areas.',
    tags: ['Food-contact safe', 'No rinsing needed', 'Clean kitchen surfaces', 'Ready to use'],
    badge: null,
    imgs: [],
    price: 249,
    sku: 'EC-DH-04',
    brand: 'Ecommerce',
    discount: 15,
    stock: 2,
    status: 'Active',
    createdDate: '2026-06-18',
    specs: {
      Size: '500 ml Spray',
      Usage: 'Spray and wipe with a clean cloth',
      Fragrance: 'Unscented',
      Suitable: 'Countertops, cutting boards, dining tables',
      pH: '7.0',
      Dilution: 'Ready to use'
    },
    rating: 4.9,
    reviewCount: 45
  }
];

const DEF_REVS: Review[] = [
  {
    id: 1,
    author: 'Ananya Sharma',
    ini: 'AS',
    role: 'Mumbai, Verified Buyer',
    img: null,
    rating: 5,
    body: 'The floor cleaner has completely transformed the cleanliness of our home. It lifts dirt easily, leaves a subtle natural freshness, and I feel confident knowing our children and pets are safe.',
    product: 'Fresh Floor Cleaner',
    approved: true,
    status: 'Approved',
    date: 'Mar 2026'
  },
  {
    id: 2,
    author: 'Rajesh Nair',
    ini: 'RN',
    role: 'Kochi, Verified Buyer',
    img: null,
    rating: 5,
    body: 'We transitioned our entire café to these products for all dish washing and surface cleaning. The grease-cutting on our cookware is extraordinary, and our kitchen staff have commented that their hands are in markedly better condition since switching.',
    product: 'Gentle Dishwashing Liquid',
    approved: true,
    status: 'Approved',
    date: 'Apr 2026'
  },
  {
    id: 3,
    author: 'Sneha Krishnan',
    ini: 'SK',
    role: 'Bangalore, Parent',
    img: null,
    rating: 5,
    body: 'With two young children and a dog, the safety of every cleaning product in our home is non-negotiable. This is the first store I have trusted without reservation. The ingredients are simple, the performance is real, and there are no unpleasant chemical odours.',
    product: 'Fresh Floor Cleaner',
    approved: true,
    status: 'Approved',
    date: 'May 2026'
  }
];

const DEF_USERS: User[] = [
  {
    name: 'Admin User',
    email: 'admin@ecommerce.com',
    password: 'admin123',
    isAdmin: true
  },
  {
    name: 'Global Customer',
    email: 'customer@ecommerce.com',
    password: 'customer123',
    isAdmin: false
  }
];

const DEF_BANNERS: Banner[] = Array.from({ length: 4 }, (_, i) => ({
  img: null,
  mobileImg: null,
  label: `Banner ${i + 1}`,
  title: 'Organic Cleaning Solutions',
  subtitle: 'Clean living, organic ingredients, safe spaces',
  ctaText: 'Explore Now',
  ctaLink: 'products',
  displayOrder: i + 1,
  isActive: true
}));

const DEF_STAFF: Staff[] = [
  { id: 'ST-001', name: 'Alok Sharma', email: 'alok@ecommerce.com', role: 'Super Admin', status: 'Active', lastLogin: '2026-07-06 18:30' },
  { id: 'ST-002', name: 'Nisha Patil', email: 'nisha@ecommerce.com', role: 'Manager', status: 'Active', lastLogin: '2026-07-07 08:15' },
  { id: 'ST-003', name: 'Rahul Sen', email: 'rahul@ecommerce.com', role: 'Sales', status: 'Active', lastLogin: '2026-07-05 14:22' },
  { id: 'ST-004', name: 'Pooja Iyer', email: 'pooja@ecommerce.com', role: 'Support', status: 'Inactive', lastLogin: '2026-06-30 11:05' }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const savedProds = localStorage.getItem('ce_products');
      if (savedProds) {
        const parsed = JSON.parse(savedProds);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEF_PRODS;
  });
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(() => {
    try {
      const savedProds = localStorage.getItem('ce_products');
      return !savedProds;
    } catch {
      return false;
    }
  });
  const [reviews, setReviews] = useState<Review[]>(DEF_REVS);
  const [stories, setStories] = useState<Story[]>([]);
  const [users, setUsers] = useState<User[]>(DEF_USERS);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [banners, setBanners] = useState<Banner[]>(DEF_BANNERS);
  const [staff, setStaff] = useState<Staff[]>(DEF_STAFF);

  // Initialize curUser immediately from localStorage for instant, zero-delay rendering
  const [curUser, setCurUser] = useState<User | null>(() => {
    try {
      const savedUserStr = localStorage.getItem('ce_cur_user');
      return savedUserStr ? JSON.parse(savedUserStr) : null;
    } catch {
      return null;
    }
  });

  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('ce_cur_user');
    } catch {
      return false;
    }
  });

  const [curPage, setCurPage] = useState<string>('home');
  const [curFilter, setCurFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  
  // Global Invoice Modal overlay state
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Global Navigation visibility state
  const [hideNavbar, setHideNavbar] = useState<boolean>(false);

  // Shopping Cart & Orders state init - Initialize from localStorage immediately
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('ce_cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [addingProductId] = useState<number | string | null>(null);
  const [deletingProductId] = useState<number | string | null>(null);
  const [updatingProductId] = useState<number | string | null>(null);
  const [isCartLoading] = useState<boolean>(false);

  // Auto-persist curUser and cart to localStorage for instant loads across reloads
  useEffect(() => {
    try {
      if (curUser) {
        localStorage.setItem('ce_cur_user', JSON.stringify(curUser));
      } else {
        localStorage.removeItem('ce_cur_user');
      }
    } catch {}
  }, [curUser]);

  useEffect(() => {
    try {
      localStorage.setItem('ce_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const fetchCurrentUser = async (preFetchedUser?: User) => {
    if (preFetchedUser) {
      if (preFetchedUser.photoURL) {
        preFetchedUser.avatar = preFetchedUser.photoURL;
      }
      setCurUser(preFetchedUser);
      if (preFetchedUser.isAdmin) {
        setIsAuthLoading(false);
        return;
      }
    }
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URI;
      let response;
      if (backendUrl) {
        const firebaseUser = auth.currentUser;
        let headers: any = {};
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken().catch(() => null);
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
        }

        try {
          response = await axios.get(`${backendUrl}/auth/me`, { headers, withCredentials: true, timeout: 3500 });
        } catch {
          response = await axios.get(`${backendUrl}/users/current-user`, { headers, withCredentials: true, timeout: 3500 });
        }
      }
      if (response && response.data && response.data.success && response.data.user) {
        const dbUser = response.data.user;
        if (dbUser.photoURL) {
          dbUser.avatar = dbUser.photoURL;
        }
        setCurUser(dbUser);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        setCurUser(null);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const fetchProducts = async () => {
    setIsProductsLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URI}/products`, {
        params: { limit: 1000 }
      });
      if (response.data && response.data.success && Array.isArray(response.data.products)) {
        const mappedProducts: Product[] = response.data.products.map((backendProd: any, idx: number) => {
          const nextId = idx + 1;
          return {
            id: nextId,
            _id: backendProd._id,
            name: backendProd.title,
            cat: backendProd.category,
            desc: backendProd.description,
            tags: backendProd.tags || [],
            badge: backendProd.badge === 'None' ? null : backendProd.badge,
            imgs: backendProd.images ? backendProd.images.map((im: any) => im.url) : [],
            images: backendProd.images || [],
            price: backendProd.sellingPrice || backendProd.retailPrice,
            originalPrice: backendProd.retailPrice,
            sku: backendProd.sku,
            brand: backendProd.brand,
            discount: backendProd.discountPercentage,
            stock: backendProd.stock,
            status: backendProd.isActive ? 'Active' : 'Draft',
            createdDate: backendProd.createdAt ? backendProd.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
            specs: {
              Size: backendProd.specifications?.containerSize || '',
              Usage: backendProd.specifications?.usageInstructions || '',
              pH: backendProd.specifications?.phLevel || '',
              Suitable: backendProd.specifications?.suitableSurfaces || ''
            },
            rating: backendProd.averageRating || 0,
            reviewCount: backendProd.totalReviews || 0
          };
        });
        setProducts(mappedProducts);
        try {
          localStorage.setItem('ce_products', JSON.stringify(mappedProducts));
        } catch {}
      }
    } catch (error) {
      console.error('Error fetching products from API:', error);
    } finally {
      setIsProductsLoading(false);
    }
  };

  const fetchBanners = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
      const response = await axios.get(`${backendUrl}/users/banners-default`);
      if (response.data && response.data.success && Array.isArray(response.data.banners)) {
        if (response.data.banners.length > 0) {
          const mappedBanners: Banner[] = response.data.banners.map((b: any, idx: number) => ({
            _id: b._id,
            img: b.desktopImage || b.img || null,
            mobileImg: b.mobileImage || b.mobileImg || null,
            desktopImage: b.desktopImage || b.img || '',
            mobileImage: b.mobileImage || b.mobileImg || '',
            label: b.label || `Banner ${idx + 1}`,
            title: b.title || '',
            subtitle: b.subtitle || '',
            ctaText: b.ctaText || '',
            ctaLink: b.ctaLink || '',
            displayOrder: b.displayOrder || (idx + 1),
            isActive: b.isActive !== undefined ? b.isActive : true
          }));
          setBanners(mappedBanners);
        }
      }
    } catch (error) {
      console.error('Error fetching homepage banners from API:', error);
    }
  };

  const fetchStories = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
      const response = await axios.get(`${backendUrl}/stories`);
      if (response.data && response.data.success && Array.isArray(response.data.stories)) {
        setStories(response.data.stories);
      }
    } catch (error) {
      console.warn('Error fetching stories from API, fallback to default:', error);
    }
  };

  const submitStory = async (rating: number, body: string, authorName?: string, role?: string) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
      let headers: any = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
        } catch (e) {
          // Token fetch error
        }
      }
      const payload = {
        rating,
        body,
        authorName: authorName || curUser?.name || 'Customer One',
        role: role || (curUser?.address?.city ? `${curUser.address.city}, Home User` : 'Home User')
      };

      const response = await axios.post(`${backendUrl}/stories`, payload, { headers });
      if (response.data && response.data.success && response.data.story) {
        const newStory = response.data.story;
        setStories((prev) => {
          const sId = String(newStory._id || newStory.id);
          const exists = prev.some((s) => String(s._id || s.id) === sId);
          if (exists) return prev;
          return [newStory, ...prev];
        });
        return response.data;
      }
    } catch (error: any) {
      console.error('Error submitting story to API:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchProducts();
    fetchBanners();
    fetchStories();
  }, []);

  // Real-time synchronization with Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const formatBackendProduct = (backendProd: any, existingId?: number): Product => {
      return {
        id: existingId || Math.floor(Math.random() * 100000),
        _id: backendProd._id,
        name: backendProd.title || backendProd.name,
        cat: backendProd.category,
        desc: backendProd.description,
        tags: backendProd.tags || [],
        badge: backendProd.badge === 'None' ? null : backendProd.badge,
        imgs: backendProd.images ? backendProd.images.map((im: any) => (typeof im === 'string' ? im : im.url || '')) : (backendProd.imgs || []),
        images: backendProd.images || [],
        price: backendProd.sellingPrice || backendProd.retailPrice || backendProd.price || 0,
        originalPrice: backendProd.retailPrice || backendProd.originalPrice,
        sku: backendProd.sku,
        brand: backendProd.brand,
        discount: backendProd.discountPercentage || 0,
        stock: backendProd.stock !== undefined ? backendProd.stock : 0,
        status: backendProd.isActive !== false ? 'Active' : 'Draft',
        createdDate: backendProd.createdAt ? backendProd.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        specs: {
          Size: backendProd.specifications?.containerSize || '',
          Usage: backendProd.specifications?.usageInstructions || '',
          pH: backendProd.specifications?.phLevel || '',
          Suitable: backendProd.specifications?.suitableSurfaces || ''
        },
        rating: backendProd.averageRating || 0,
        reviewCount: backendProd.totalReviews || 0
      };
    };

    const handleProductCreated = (data: { product: any }) => {
      if (!data?.product) return;
      setProducts((prev) => {
        const exists = prev.some((p) => p._id === data.product._id || (p.sku && p.sku === data.product.sku));
        if (exists) {
          return prev.map((p) => (p._id === data.product._id || p.sku === data.product.sku ? formatBackendProduct(data.product, p.id) : p));
        }
        return [formatBackendProduct(data.product), ...prev];
      });
    };

    const handleProductUpdated = (data: { product?: any; productId?: string; averageRating?: number; totalReviews?: number }) => {
      setProducts((prev) => {
        if (data.product) {
          const pData = data.product;
          return prev.map((p) => {
            if (p._id === pData._id || p.sku === pData.sku || p.name === pData.title) {
              return formatBackendProduct(pData, p.id);
            }
            return p;
          });
        }
        if (data.productId) {
          return prev.map((p) => {
            if (p._id === data.productId || String(p.id) === data.productId) {
              return {
                ...p,
                ...(data.averageRating !== undefined ? { rating: data.averageRating } : {}),
                ...(data.totalReviews !== undefined ? { reviewCount: data.totalReviews } : {})
              };
            }
            return p;
          });
        }
        return prev;
      });
    };

    const handleProductDeleted = (data: { id?: string; _id?: string; sku?: string }) => {
      const deleteId = data.id || data._id;
      const deleteSku = data.sku;
      setProducts((prev) => prev.filter((p) => p._id !== deleteId && String(p.id) !== deleteId && (!deleteSku || p.sku !== deleteSku)));
      setCart((prev) => prev.filter((item) => item.product._id !== deleteId && String(item.product.id) !== deleteId && (!deleteSku || item.product.sku !== deleteSku)));
    };

    const handleInventoryUpdated = (data: { productId: string; stock: number }) => {
      if (!data?.productId) return;
      setProducts((prev) =>
        prev.map((p) => {
          if (p._id === data.productId || String(p.id) === data.productId) {
            return { ...p, stock: data.stock };
          }
          return p;
        })
      );
      setCart((prev) =>
        prev.map((item) => {
          if (item.product && (item.product._id === data.productId || String(item.product.id) === data.productId)) {
            return {
              ...item,
              product: { ...item.product, stock: data.stock }
            };
          }
          return item;
        })
      );
    };

    const handleBannersUpdated = (data: { banners?: any[] }) => {
      if (Array.isArray(data?.banners) && data.banners.length > 0) {
        const mappedBanners: Banner[] = data.banners.map((b: any, idx: number) => ({
          _id: b._id,
          img: b.desktopImage || b.img || null,
          mobileImg: b.mobileImage || b.mobileImg || null,
          desktopImage: b.desktopImage || b.img || '',
          mobileImage: b.mobileImage || b.mobileImg || '',
          label: b.label || `Banner ${idx + 1}`,
          title: b.title || '',
          subtitle: b.subtitle || '',
          ctaText: b.ctaText || '',
          ctaLink: b.ctaLink || '',
          displayOrder: b.displayOrder || (idx + 1),
          isActive: b.isActive !== undefined ? b.isActive : true
        }));
        setBanners(mappedBanners);
      } else {
        fetchBanners();
      }
    };

    const handleReviewStatusUpdated = (data: { review: any; status: string }) => {
      if (!data?.review) return;
      const rData = data.review;
      const targetStatus = data.status || rData.status;
      const revId = String(rData._id || rData.id);

      if (targetStatus === 'Approved') {
        const authorName = rData.authorName || rData.author || 'Customer';
        const initials = authorName
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()
          .substring(0, 2) || 'C';

        let prodName = 'General';
        const targetProdId = typeof rData.product === 'object' ? (rData.product._id || rData.product.id || rData.product.sku) : rData.product;
        const matchedProd = products.find(
          (p) => String(p._id) === String(targetProdId) || String(p.id) === String(targetProdId) || String(p.sku) === String(targetProdId)
        );
        if (matchedProd) {
          prodName = matchedProd.name;
        } else if (rData.product?.title || rData.product?.name) {
          prodName = rData.product.title || rData.product.name;
        }

        const approvedReview: Review = {
          id: rData._id || rData.id || Date.now(),
          _id: rData._id || rData.id,
          author: authorName,
          ini: initials,
          role: rData.isVerifiedPurchase || rData.verifiedPurchase ? 'Verified Purchaser' : 'Customer',
          img: rData.profileImage || rData.img || null,
          rating: Number(rData.rating) || 5,
          body: rData.comment || rData.review || rData.body || '',
          product: prodName,
          productId: targetProdId || (matchedProd ? (matchedProd._id || matchedProd.id) : undefined),
          approved: true,
          status: 'Approved',
          date: rData.createdAt
            ? new Date(rData.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : (rData.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }))
        };

        setReviews((prev) => {
          const exists = prev.some((item) => String(item._id || item.id) === revId);
          if (exists) {
            return prev.map((item) => (String(item._id || item.id) === revId ? approvedReview : item));
          }
          return [approvedReview, ...prev];
        });

        const prodQueryId = typeof rData.product === 'object' ? rData.product?._id : rData.product;
        if (prodQueryId) {
          fetchProductReviews(prodQueryId, prodName);
        }
      } else {
        setReviews((prev) => prev.filter((r) => String(r._id || r.id) !== revId));
      }
    };

    const handleReviewDeleted = (data: { id?: string; _id?: string; productId?: string }) => {
      const revId = data.id || data._id;
      if (revId) {
        setReviews((prev) => prev.filter((r) => r._id !== revId && String(r.id) !== String(revId)));
      }
    };

    const handleOrderCreated = (data: { order: any }) => {
      if (!data?.order) return;
      const newOrder = mapBackendOrderToFrontend(data.order);
      setOrders((prev) => {
        const exists = prev.some(
          (o) =>
            (newOrder.orderNumber && o.orderNumber === newOrder.orderNumber) ||
            (newOrder._id && o._id === newOrder._id) ||
            o.id === newOrder.id
        );
        if (exists) {
          return prev.map((o) =>
            (newOrder.orderNumber && o.orderNumber === newOrder.orderNumber) ||
            (newOrder._id && o._id === newOrder._id) ||
            o.id === newOrder.id
              ? newOrder
              : o
          );
        }
        return [newOrder, ...prev];
      });
    };

    const handleOrderStatusUpdated = (data: { order?: any; status?: string }) => {
      if (!data?.order) return;
      const updated = mapBackendOrderToFrontend(data.order);
      setOrders((prev) =>
        prev.map((o) => {
          const match =
            (data.order._id && (o._id === data.order._id || o.id === data.order._id)) ||
            (data.order.orderNumber && (o.orderNumber === data.order.orderNumber || o.id === data.order.orderNumber)) ||
            (data.order.id && (o.id === data.order.id || o._id === data.order.id));
          if (match) {
            return {
              ...o,
              ...updated,
              status: (data.status || data.order.status || updated.status) as any
            };
          }
          return o;
        })
      );
    };

    const handleCartUpdated = (data: { cart?: any }) => {
      if (data?.cart) {
        const fetchedItems = data.cart.items || [];
        const mappedCart: CartItem[] = fetchedItems
          .map((item: any) => {
            const p = item.product;
            if (!p) return null;
            return {
              _id: item._id,
              product: formatBackendProduct(p),
              quantity: item.quantity
            };
          })
          .filter(Boolean) as CartItem[];
        setCart(mappedCart);
      }
    };

    const handleStoryCreated = (data: { story: any }) => {
      if (!data?.story) return;
      setStories((prev) => {
        const sId = String(data.story._id || data.story.id);
        const exists = prev.some((s) => String(s._id || s.id) === sId);
        if (exists) {
          return prev.map((s) => (String(s._id || s.id) === sId ? data.story : s));
        }
        return [data.story, ...prev];
      });
    };

    const handleStoryUpdated = (data: { story?: any; id?: string; status?: string }) => {
      if (data?.story) {
        setStories((prev) => {
          const sId = String(data.story._id || data.story.id);
          const exists = prev.some((s) => String(s._id || s.id) === sId);
          if (exists) {
            return prev.map((s) => (String(s._id || s.id) === sId ? data.story : s));
          }
          return [data.story, ...prev];
        });
      } else {
        fetchStories();
      }
    };

    const handleStoryDeleted = (data: { id?: string }) => {
      if (!data?.id) return;
      setStories((prev) => prev.filter((s) => String(s._id || s.id) !== String(data.id)));
    };

    const handleUserUpdated = (data: { user: any }) => {
      if (data?.user) {
        setCurUser((prev) => {
          if (!prev) return data.user;
          return { ...prev, ...data.user, addresses: data.user.addresses || prev.addresses };
        });
      }
    };

    const handleConnect = () => {
      fetchBanners();
      fetchProducts();
      fetchStories();
    };

    const handleStoreUpdated = (updatedProfile: any) => {
      if (updatedProfile) {
        try {
          localStorage.setItem('ce_admin_store_profile', JSON.stringify(updatedProfile));
          applyStoreTheme(updatedProfile);
          window.dispatchEvent(new Event('store_profile_updated'));
        } catch (e) {}
      }
    };

    socket.on("connect", handleConnect);
    socket.on("store:updated", handleStoreUpdated);
    socket.on(SOCKET_EVENTS.PRODUCT_CREATED, handleProductCreated);
    socket.on(SOCKET_EVENTS.PRODUCT_UPDATED, handleProductUpdated);
    socket.on(SOCKET_EVENTS.PRODUCT_DELETED, handleProductDeleted);
    socket.on(SOCKET_EVENTS.INVENTORY_UPDATED, handleInventoryUpdated);
    socket.on(SOCKET_EVENTS.BANNERS_UPDATED, handleBannersUpdated);
    socket.on(SOCKET_EVENTS.REVIEW_CREATED, handleReviewStatusUpdated);
    socket.on(SOCKET_EVENTS.REVIEW_UPDATED, handleReviewStatusUpdated);
    socket.on(SOCKET_EVENTS.REVIEW_STATUS_UPDATED, handleReviewStatusUpdated);
    socket.on(SOCKET_EVENTS.REVIEW_DELETED, handleReviewDeleted);
    socket.on(SOCKET_EVENTS.STORY_CREATED, handleStoryCreated);
    socket.on(SOCKET_EVENTS.STORY_UPDATED, handleStoryUpdated);
    socket.on(SOCKET_EVENTS.STORY_DELETED, handleStoryDeleted);
    socket.on(SOCKET_EVENTS.ORDER_CREATED, handleOrderCreated);
    socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleOrderStatusUpdated);
    socket.on(SOCKET_EVENTS.ORDER_CANCELLED, handleOrderStatusUpdated);
    socket.on(SOCKET_EVENTS.CART_UPDATED, handleCartUpdated);
    socket.on(SOCKET_EVENTS.USER_UPDATED, handleUserUpdated);

    // Auth state token listener
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser: any) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          updateSocketAuth(token);
        } catch {
          updateSocketAuth(null);
        }
      } else {
        updateSocketAuth(null);
      }
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("store:updated", handleStoreUpdated);
      socket.off(SOCKET_EVENTS.PRODUCT_CREATED, handleProductCreated);
      socket.off(SOCKET_EVENTS.PRODUCT_UPDATED, handleProductUpdated);
      socket.off(SOCKET_EVENTS.PRODUCT_DELETED, handleProductDeleted);
      socket.off(SOCKET_EVENTS.INVENTORY_UPDATED, handleInventoryUpdated);
      socket.off(SOCKET_EVENTS.BANNERS_UPDATED, handleBannersUpdated);
      socket.off(SOCKET_EVENTS.REVIEW_CREATED, handleReviewStatusUpdated);
      socket.off(SOCKET_EVENTS.REVIEW_UPDATED, handleReviewStatusUpdated);
      socket.off(SOCKET_EVENTS.REVIEW_STATUS_UPDATED, handleReviewStatusUpdated);
      socket.off(SOCKET_EVENTS.REVIEW_DELETED, handleReviewDeleted);
      socket.off(SOCKET_EVENTS.ORDER_CREATED, handleOrderCreated);
      socket.off(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleOrderStatusUpdated);
      socket.off(SOCKET_EVENTS.ORDER_CANCELLED, handleOrderStatusUpdated);
      socket.off(SOCKET_EVENTS.CART_UPDATED, handleCartUpdated);
      socket.off(SOCKET_EVENTS.USER_UPDATED, handleUserUpdated);
      unsubscribeAuth();
    };
  }, []);


  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const openAuthModal = (tab: 'login' | 'signup' = 'login') => {
    setAuthModalTab(tab);
    setCurPage(tab === 'signup' ? 'register' : 'login');
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  // Helper check for admin procedures
  const checkAdminPermission = (): boolean => {
    if (!curUser || !curUser.isAdmin) {
      showToast('Access Denied: Administrative privileges required.');
      return false;
    }
    if (auth.currentUser) {
      return true;
    }
    const token = sessionStorage.getItem('ce_access_token');
    if (!token || !token.startsWith('mock-jwt-')) {
      showToast('Session Expired: Please log in again.');
      return false;
    }
    return true;
  };

  // Helper helper to convert base64 image data to Blob
  const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Validate email address format
  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const loginUser = (email: string, pass: string) => {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (user) {
      const mockToken = `mock-jwt-${btoa(user.email)}-${Date.now()}`;
      sessionStorage.setItem('ce_access_token', mockToken);
      
      setCurUser({ name: user.name, email: user.email, isAdmin: user.isAdmin });
      showToast(`Welcome back, ${user.name}!`);
      return { success: true, message: 'Logged in successfully' };
    }
    return { success: false, message: 'Invalid email or password' };
  };

  const registerUser = (name: string, email: string, pass: string) => {
    if (!validateEmail(email)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'An account with this email already exists' };
    }
    const newUser: User = { name, email, password: pass, isAdmin: false };
    setUsers((prev) => [...prev, newUser]);
    
    const mockToken = `mock-jwt-${btoa(email)}-${Date.now()}`;
    sessionStorage.setItem('ce_access_token', mockToken);
    
    setCurUser({ name, email, isAdmin: false });
    showToast(`Welcome to Ecommerce, ${name}!`);
    return { success: true, message: 'Registered successfully' };
  };

  const logoutUser = async () => {
    try {
      localStorage.removeItem('ce_cur_user');
      localStorage.removeItem('ce_cart');
      localStorage.removeItem('ce_orders');
      localStorage.removeItem('ce_checkout_addresses');
      sessionStorage.removeItem('ce_access_token');
    } catch (e) {}

    document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
      await axios.post(`${backendUrl}/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.warn('Backend logout API call failed:', err);
    }
    try {
      if (auth.currentUser) {
        await auth.signOut();
      }
    } catch (err) {
      console.warn('Firebase signOut failed:', err);
    }
    setCart([]);
    setOrders([]);
    setCurUser(null);
    setCurPage('home');
    showToast('Signed out successfully.');
  };

  const addProduct = async (p: Omit<Product, 'id' | 'rating' | 'reviewCount'>): Promise<boolean> => {
    if (!checkAdminPermission()) return false;
    
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      showToast('Error: System Admin Firebase session not active.');
      return false;
    }

    try {
      const token = await firebaseUser.getIdToken();
      const formData = new FormData();
      
      formData.append('title', p.name);
      formData.append('sku', p.sku.toUpperCase());
      formData.append('brand', p.brand);
      formData.append('category', p.cat);
      formData.append('badge', p.badge || 'None');
      formData.append('tags', p.tags.join(','));
      formData.append('description', p.desc);
      formData.append('retailPrice', String(p.price));
      formData.append('discountPercentage', String(p.discount));
      formData.append('stock', String(p.stock));
      formData.append('minStockAlert', String(p.specs.minStockAlert || 5));
      formData.append('status', p.status === 'Active' ? 'Active' : 'Draft');
      formData.append('isActive', String(p.status === 'Active'));
      formData.append('containerSize', p.specs.Size || '');
      formData.append('usageInstructions', p.specs.Usage || '');
      formData.append('phLevel', p.specs.pH || '');
      formData.append('suitableSurfaces', p.specs.Suitable || '');

      if (p.seo) {
        formData.append('metaTitle', p.seo.metaTitle || '');
        formData.append('metaDescription', p.seo.metaDescription || '');
        if (p.seo.metaKeywords) {
          formData.append('metaKeywords', p.seo.metaKeywords.join(','));
        }
      }

      if (p.imgs && p.imgs.length > 0) {
        p.imgs.forEach((img, idx) => {
          if (img.startsWith('data:')) {
            try {
              const blob = dataURLtoBlob(img);
              const mime = img.split(',')[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
              const ext = mime.split('/')[1] || 'jpg';
              formData.append('images', blob, `image-${idx}.${ext}`);
            } catch (err) {
              console.warn('Failed to parse base64 image data', err);
            }
          }
        });
      }

      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URI}/admin/add-product`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.data && response.data.success) {
        const backendProd = response.data.product;
        const nextId = products.length > 0 ? Math.max(...products.map((pr) => pr.id)) + 1 : 1;
        const newProduct: Product = {
          id: nextId,
          _id: backendProd._id,
          name: backendProd.title,
          cat: backendProd.category,
          desc: backendProd.description,
          tags: backendProd.tags || [],
          badge: backendProd.badge === 'None' ? null : backendProd.badge,
          imgs: backendProd.images ? backendProd.images.map((im: any) => im.url) : [],
          images: backendProd.images || [],
          price: backendProd.sellingPrice || backendProd.retailPrice,
          originalPrice: backendProd.retailPrice,
          sku: backendProd.sku,
          brand: backendProd.brand,
          discount: backendProd.discountPercentage,
          stock: backendProd.stock,
          status: backendProd.isActive ? 'Active' : 'Draft',
          createdDate: backendProd.createdAt ? backendProd.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
          specs: {
            Size: backendProd.specifications?.containerSize || '',
            Usage: backendProd.specifications?.usageInstructions || '',
            pH: backendProd.specifications?.phLevel || '',
            Suitable: backendProd.specifications?.suitableSurfaces || ''
          },
          rating: backendProd.averageRating || 0,
          reviewCount: backendProd.totalReviews || 0
        };

        setProducts((prev) => [...prev, newProduct]);
        showToast(`Product "${p.name}" has been added.`);
        return true;
      } else {
        showToast(response.data.message || 'Failed to add product.');
        return false;
      }
    } catch (error: any) {
      console.error('Error adding product:', error);
      const errMsg = error.response?.data?.message || 'Error occurred while adding product.';
      showToast(errMsg);
      return false;
    }
  };

  const updateProductImages = (id: number, updatedImgs: string[]) => {
    if (!checkAdminPermission()) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, imgs: updatedImgs } : p))
    );
    showToast('Product images updated.');
  };

  const deleteProduct = async (id: number): Promise<boolean> => {
    if (!checkAdminPermission()) return false;
    const prod = products.find((p) => p.id === id);
    if (!prod) return false;

    if (prod._id) {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        showToast('Error: System Admin Firebase session not active.');
        return false;
      }
      try {
        const token = await firebaseUser.getIdToken();
        const response = await axios.delete(`${import.meta.env.VITE_BACKEND_URI}/admin/delete-product/${prod._id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        });
        if (response.data && response.data.success) {
          showToast(`Product "${prod.name}" deleted successfully.`);
          await fetchProducts();
          return true;
        } else {
          showToast(response.data.message || 'Failed to delete product.');
          return false;
        }
      } catch (error: any) {
        console.error('Error deleting product:', error);
        const errMsg = error.response?.data?.message || 'Error occurred while deleting product.';
        showToast(errMsg);
        return false;
      }
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('Product removed locally.');
      return true;
    }
  };

  const duplicateProduct = (id: number) => {
    if (!checkAdminPermission()) return;
    const prod = products.find((p) => p.id === id);
    if (!prod) return;
    const nextId = products.length > 0 ? Math.max(...products.map((pr) => pr.id)) + 1 : 1;
    const duplicated: Product = {
      ...prod,
      id: nextId,
      name: `${prod.name} (Copy)`,
      sku: `${prod.sku}-COPY`,
      createdDate: new Date().toISOString().split('T')[0]
    };
    setProducts((prev) => [...prev, duplicated]);
    showToast(`Duplicated "${prod.name}" successfully.`);
  };



  const updateProduct = async (p: Product, localDeletedImagePublicIds: string[] = []): Promise<boolean> => {
    if (!checkAdminPermission()) return false;
    
    if (!p._id) {
      showToast('Error: Product database reference id not found.');
      return false;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      showToast('Error: System Admin Firebase session not active.');
      return false;
    }

    try {
      const token = await firebaseUser.getIdToken();
      const formData = new FormData();
      
      formData.append('title', p.name);
      formData.append('sku', p.sku.toUpperCase());
      formData.append('brand', p.brand);
      formData.append('category', p.cat);
      formData.append('badge', p.badge || 'None');
      formData.append('tags', p.tags.join(','));
      formData.append('description', p.desc);
      formData.append('retailPrice', String(p.price));
      formData.append('discountPercentage', String(p.discount));
      formData.append('stock', String(p.stock));
      formData.append('minStockAlert', String(p.specs.minStockAlert || 5));
      formData.append('status', p.status === 'Active' ? 'Active' : 'Draft');
      formData.append('isActive', String(p.status === 'Active'));
      formData.append('containerSize', p.specs.Size || '');
      formData.append('usageInstructions', p.specs.Usage || '');
      formData.append('phLevel', p.specs.pH || '');
      formData.append('suitableSurfaces', p.specs.Suitable || '');

      if (p.seo) {
        formData.append('metaTitle', p.seo.metaTitle || '');
        formData.append('metaDescription', p.seo.metaDescription || '');
        if (p.seo.metaKeywords) {
          formData.append('metaKeywords', p.seo.metaKeywords.join(','));
        }
      }

      if (localDeletedImagePublicIds.length > 0) {
        formData.append('deletedImages', JSON.stringify(localDeletedImagePublicIds));
      }

      if (p.imgs && p.imgs.length > 0) {
        p.imgs.forEach((img, idx) => {
          if (img.startsWith('data:')) {
            try {
              const blob = dataURLtoBlob(img);
              const mime = img.split(',')[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
              const ext = mime.split('/')[1] || 'jpg';
              formData.append('images', blob, `image-${idx}.${ext}`);
            } catch (err) {
              console.warn('Failed to parse base64 image data', err);
            }
          }
        });
      }

      const response = await axios.put(`${import.meta.env.VITE_BACKEND_URI}/admin/update-product/${p._id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.data && response.data.success) {
        const backendProd = response.data.product;
        setProducts((prev) =>
          prev.map((item) => {
            if (item.id === p.id) {
              return {
                id: p.id,
                _id: backendProd._id,
                name: backendProd.title,
                cat: backendProd.category,
                desc: backendProd.description,
                tags: backendProd.tags || [],
                badge: backendProd.badge === 'None' ? null : backendProd.badge,
                imgs: backendProd.images ? backendProd.images.map((im: any) => im.url) : [],
                images: backendProd.images || [],
                price: backendProd.sellingPrice || backendProd.retailPrice,
                originalPrice: backendProd.retailPrice,
                sku: backendProd.sku,
                brand: backendProd.brand,
                discount: backendProd.discountPercentage,
                stock: backendProd.stock,
                status: backendProd.isActive ? 'Active' : 'Draft',
                createdDate: backendProd.createdAt ? backendProd.createdAt.split('T')[0] : p.createdDate,
                specs: {
                  Size: backendProd.specifications?.containerSize || '',
                  Usage: backendProd.specifications?.usageInstructions || '',
                  pH: backendProd.specifications?.phLevel || '',
                  Suitable: backendProd.specifications?.suitableSurfaces || ''
                },
                rating: backendProd.averageRating || 0,
                reviewCount: backendProd.totalReviews || 0
              };
            }
            return item;
          })
        );
        showToast(`Product "${p.name}" updated successfully.`);
        return true;
      } else {
        showToast(response.data.message || 'Failed to update product.');
        return false;
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      const errMsg = error.response?.data?.message || 'Error occurred while updating product.';
      showToast(errMsg);
      return false;
    }
  };

  const submitReview = async (
    authorName: string,
    rating: number,
    body: string,
    productName: string,
    productId?: string,
    image?: string | null
  ): Promise<{ success: boolean; message?: string }> => {
    if (!curUser) {
      showToast('Please log in to submit a review.');
      return { success: false, message: 'Please log in to submit a review.' };
    }

    try {
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        const matchedProduct = productId 
          ? products.find((p) => p._id === productId || String(p.id) === productId)
          : products.find((p) => p.name.toLowerCase() === productName.toLowerCase());
        
        const resolvedProductId = productId || matchedProduct?._id || matchedProduct?.sku || matchedProduct?.name || productName;

        const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
        const response = await axios.post(
          `${backendUrl}/reviews/submit`,
          {
            productId: resolvedProductId,
            rating: Number(rating),
            comment: body,
            image: image || null
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }
        );

        if (response.data && response.data.success) {
          const initials = authorName
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);

          const newReview: Review = {
            id: response.data.review?._id || Date.now(),
            _id: response.data.review?._id,
            author: authorName,
            ini: initials || 'C',
            role: 'Verified Customer',
            img: null,
            image: response.data.review?.image || image || null,
            rating,
            body,
            product: productName,
            approved: true,
            status: 'Approved',
            date: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
          };

          setReviews((prev) => [newReview, ...prev]);
          showToast(response.data.message || 'Review submitted successfully!');
          return { success: true, message: response.data.message };
        } else {
          showToast(response.data?.message || 'Failed to submit review.');
          return { success: false, message: response.data?.message };
        }
      } else {
        const initials = authorName
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);

        const newReview: Review = {
          id: Date.now(),
          author: authorName,
          ini: initials || 'C',
          role: 'Verified Customer',
          img: null,
          image: image || null,
          rating,
          body,
          product: productName,
          approved: true,
          status: 'Approved',
          date: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        };

        setReviews((prev) => [newReview, ...prev]);
        showToast('Your review has been submitted.');
        return { success: true };
      }
      return { success: false, message: 'Could not authenticate user for review submission.' };
    } catch (error: any) {
      console.error('Submit review API error:', error);
      const errMsg = error.response?.data?.message || error.message || 'Failed to submit review.';
      showToast(errMsg);
      return { success: false, message: errMsg };
    }
  };

  const fetchProductReviews = async (productId: string | number, productName?: string) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
      const response = await axios.get(`${backendUrl}/reviews/product/${productId}`);

      if (response.data && response.data.success && Array.isArray(response.data.reviews)) {
        const fetched: Review[] = response.data.reviews.map((r: any, idx: number) => {
          const authorName = r.authorName || 'Customer';
          const initials = authorName
            .split(' ')
            .map((w: string) => w[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);

          return {
            id: r._id || Date.now() + idx,
            _id: r._id,
            author: authorName,
            ini: initials || 'C',
            role: r.verifiedPurchase ? 'Verified Purchaser' : 'Customer',
            img: null,
            image: r.image || (Array.isArray(r.images) && r.images.length > 0 ? r.images[0] : null),
            images: Array.isArray(r.images) ? r.images : (r.image ? [r.image] : []),
            rating: Number(r.rating) || 5,
            body: r.review || r.comment || '',
            product: productName || 'General',
            productId: productId,
            approved: true,
            status: 'Approved' as const,
            date: r.date
              ? new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          };
        });

        setReviews((prev) => {
          const fetchedMap = new Map(fetched.map((item) => [String(item._id || item.id), item]));
          const updatedPrev = prev.map((existing) => {
            const id = String(existing._id || existing.id);
            if (fetchedMap.has(id)) {
              const updated = fetchedMap.get(id)!;
              fetchedMap.delete(id);
              return updated;
            }
            return existing;
          });
          return [...Array.from(fetchedMap.values()), ...updatedPrev];
        });

        if (fetched.length > 0) {
          const totalRating = fetched.reduce((sum, item) => sum + item.rating, 0);
          const avgRating = Number((totalRating / fetched.length).toFixed(1));
          const totalCount = fetched.length;

          setProducts((prevProducts) =>
            prevProducts.map((p) => {
              const isMatch =
                (productName && String(p.name).toLowerCase().trim() === String(productName).toLowerCase().trim()) ||
                (p._id && String(p._id) === String(productId)) ||
                (p.id && String(p.id) === String(productId)) ||
                (p.sku && String(p.sku) === String(productId));

              if (isMatch) {
                return { ...p, rating: avgRating, reviewCount: totalCount };
              }
              return p;
            })
          );
        }
      }
    } catch (err) {
      console.warn('Could not fetch product reviews from backend:', err);
    }
  };

  const approveReview = (id: number | string) => {
    if (!checkAdminPermission()) return;
    setReviews((prev) =>
      prev.map((r) => (String(r.id) === String(id) || r._id === id ? { ...r, approved: true, status: 'Approved' as const } : r))
    );
    showToast('Review approved.');
  };

  const deleteReview = (id: number | string) => {
    if (!checkAdminPermission()) return;
    setReviews((prev) => prev.filter((r) => String(r.id) !== String(id) && r._id !== id));
    showToast('Review deleted.');
  };

  const updateReviewStatus = (id: number | string, status: NonNullable<Review['status']>) => {
    if (!checkAdminPermission()) return;
    setReviews((prev) =>
      prev.map((r) => (String(r.id) === String(id) || r._id === id ? { ...r, status, approved: status === 'Approved' } : r))
    );
    showToast(`Review status updated to ${status}.`);
  };

  const replyToReview = (id: number | string, replyText: string) => {
    if (!checkAdminPermission()) return;
    setReviews((prev) =>
      prev.map((r) => (String(r.id) === String(id) || r._id === id ? { ...r, reply: replyText } : r))
    );
    showToast('Reply saved.');
  };

  const addLead = async (
    name: string,
    email: string,
    phoneOrSubject: string,
    companyOrService?: string,
    sourceOrMessage?: string,
    subject?: string,
    service?: string,
    message?: string,
    priority: Lead['priority'] = 'Medium'
  ): Promise<{ success: boolean; message?: string }> => {
    let finalPhone = '';
    let finalCompany = '';
    let finalSource = 'Web Inquiry';
    let finalSubject = '';
    let finalService = '';
    let finalMessage = '';
    let finalPriority = priority;

    if (subject === undefined) {
      // 5 arguments call (from client Home.tsx page)
      finalPhone = '';
      finalCompany = '';
      finalSource = 'Web Inquiry';
      finalSubject = phoneOrSubject;
      finalService = companyOrService || 'General Support';
      finalMessage = sourceOrMessage || '';
      finalPriority = 'Medium';
    } else {
      // 9 arguments call (from LeadsCRM.tsx wizard)
      finalPhone = phoneOrSubject || '';
      finalCompany = companyOrService || '';
      finalSource = sourceOrMessage || 'Web Inquiry';
      finalSubject = subject || '';
      finalService = service || 'General Support';
      finalMessage = message || '';
      finalPriority = priority;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';

      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      } else {
        await auth.authStateReady();
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const payload = {
        fullName: name.trim(),
        email: email.toLowerCase().trim(),
        phoneNumber: finalPhone.trim(),
        companyName: finalCompany.trim(),
        subject: finalSubject ? finalSubject.trim() : 'General Enquiry',
        category: finalService || 'General Support',
        message: finalMessage.trim()
      };

      const response = await axios.post(`${backendUrl}/leads/create`, payload, {
        headers,
        withCredentials: true
      });

      const newLead: Lead = {
        id: response.data?.lead?._id || Date.now(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: finalPhone,
        company: finalCompany,
        source: finalSource,
        subject: finalSubject || 'General Enquiry',
        service: finalService || 'General Support',
        message: finalMessage,
        status: 'New',
        priority: finalPriority,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        internalNotes: '',
        attachments: [],
        activities: [
          { type: 'Note', title: 'Inquiry received', content: 'Inquiry received via web form.', date: new Date().toLocaleString('en-IN') }
        ],
        tasks: [],
        reminders: [],
        comments: []
      };
      setLeads((prev) => [newLead, ...prev]);
      showToast(response.data?.message || 'Your enquiry has been submitted successfully.');
      return { success: true, message: response.data?.message };
    } catch (error: any) {
      console.error('Failed to submit enquiry to API:', error);
      const errMsg = error.response?.data?.message || 'Failed to submit enquiry.';
      showToast(errMsg);
      return { success: false, message: errMsg };
    }
  };

  const updateLeadStatus = (id: number, status: Lead['status']) => {
    if (!checkAdminPermission()) return;
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const nextActs = l.activities ? [...l.activities] : [];
          nextActs.push({
            type: 'Note',
            title: `Status changed to ${status}`,
            content: `Internal lead status updated by admin.`,
            date: new Date().toLocaleString('en-IN')
          });
          return { ...l, status, activities: nextActs };
        }
        return l;
      })
    );
    showToast(`Lead status updated to ${status}.`);
  };

  const updateLeadNotes = (id: number, notes: string) => {
    if (!checkAdminPermission()) return;
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, internalNotes: notes } : l))
    );
  };

  const addLeadComment = (id: number, author: string, body: string) => {
    if (!checkAdminPermission()) return;
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const nextComments = l.comments ? [...l.comments] : [];
          nextComments.push({
            id: `c-${Date.now()}`,
            author,
            body,
            date: new Date().toLocaleString('en-IN')
          });
          const nextActs = l.activities ? [...l.activities] : [];
          nextActs.push({
            type: 'Comment',
            title: `New internal comment`,
            content: `${author} commented: "${body.substring(0, 40)}${body.length > 40 ? '...' : ''}"`,
            date: new Date().toLocaleString('en-IN')
          });
          return { ...l, comments: nextComments, activities: nextActs };
        }
        return l;
      })
    );
    showToast('Comment added.');
  };

  const addLeadTask = (id: number, title: string) => {
    if (!checkAdminPermission()) return;
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const nextTasks = l.tasks ? [...l.tasks] : [];
          nextTasks.push({
            id: `t-${Date.now()}`,
            title,
            done: false
          });
          const nextActs = l.activities ? [...l.activities] : [];
          nextActs.push({
            type: 'Task',
            title: `Task created`,
            content: `New task added: "${title}"`,
            date: new Date().toLocaleString('en-IN')
          });
          return { ...l, tasks: nextTasks, activities: nextActs };
        }
        return l;
      })
    );
    showToast('Task added.');
  };

  const toggleLeadTask = (id: number, taskId: string) => {
    if (!checkAdminPermission()) return;
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === id && l.tasks) {
          const updatedTasks = l.tasks.map((t) =>
            t.id === taskId ? { ...t, done: !t.done } : t
          );
          const toggledTask = l.tasks.find((t) => t.id === taskId);
          const nextActs = l.activities ? [...l.activities] : [];
          if (toggledTask) {
            nextActs.push({
              type: 'Task',
              title: `Task marked ${!toggledTask.done ? 'done' : 'undone'}`,
              content: `Task: "${toggledTask.title}" status changed.`,
              date: new Date().toLocaleString('en-IN')
            });
          }
          return { ...l, tasks: updatedTasks, activities: nextActs };
        }
        return l;
      })
    );
  };

  const addLeadReminder = (id: number, title: string, date: string) => {
    if (!checkAdminPermission()) return;
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const nextReminders = l.reminders ? [...l.reminders] : [];
          nextReminders.push({
            id: `rem-${Date.now()}`,
            title,
            date
          });
          return { ...l, reminders: nextReminders };
        }
        return l;
      })
    );
    showToast('Reminder scheduled.');
  };

  const addLeadActivity = (id: number, type: LeadActivity['type'], title: string, content: string) => {
    if (!checkAdminPermission()) return;
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const nextActs = l.activities ? [...l.activities] : [];
          nextActs.push({
            type,
            title,
            content,
            date: new Date().toLocaleString('en-IN')
          });
          return { ...l, activities: nextActs };
        }
        return l;
      })
    );
  };

  const updateBanners = (updatedBanners: Banner[]) => {
    if (!checkAdminPermission()) return;
    setBanners(updatedBanners);
    showToast('Homepage hero banners published.');
  };

  // E-commerce Cart Operations (http://localhost:5002/api/carts/get-cart)
  const fetchUserCart = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken().catch(() => null);
        if (token) {
          const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
          const response = await axios.get(`${backendUrl}/carts/get-cart`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
            timeout: 3500
          });
          if (response.data && response.data.success && response.data.cart) {
            const fetchedCartItems = response.data.cart.items || [];
            const mappedCart: CartItem[] = fetchedCartItems.map((item: any) => {
              const p = item.product;
              if (!p || typeof p !== 'object') return null;
              const matchedProd = products.find(prod => (p._id && prod._id === p._id) || (p.sku && prod.sku === p.sku) || (prod.id && (String(prod.id) === String(p._id) || String(prod.id) === String(p.id))));
              
              const prodObj = matchedProd || {
                id: p.id || p._id || Math.floor(Math.random() * 100000),
                _id: p._id || String(p.id || ''),
                name: p.title || p.name || 'Formulated Cleaner',
                cat: p.category || 'Floor Care',
                desc: p.description || '',
                tags: p.tags || [],
                badge: p.badge === 'None' ? null : (p.badge || null),
                imgs: p.images?.length > 0 ? p.images.map((im: any) => im.url || im) : (p.imgs || []),
                price: p.sellingPrice || p.retailPrice || p.price || 299,
                sku: p.sku || 'EC-PROD',
                brand: p.brand || 'Ecommerce',
                discount: p.discountPercentage || 0,
                stock: typeof p.stock === 'number' ? p.stock : 50,
                status: 'Active',
                createdDate: p.createdAt || '',
                specs: {},
                rating: p.averageRating || 0,
                reviewCount: p.totalReviews || 0
              };

              // Extra safety guard: ensure product price and name are valid
              if (!prodObj.name || prodObj.price <= 0) return null;

              return {
                _id: item._id,
                product: prodObj,
                quantity: item.quantity || 1
              };
            }).filter(Boolean) as CartItem[];

            if (mappedCart.length > 0 || cart.length === 0) {
              setCart(mappedCart);
              try {
                localStorage.setItem('ce_cart', JSON.stringify(mappedCart));
              } catch {}
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch cart from backend:', err);
    }
  };

  const curUserId = curUser?._id || curUser?.uid || curUser?.email;
  useEffect(() => {
    if (curUserId) {
      fetchUserCart();
      fetchMyOrders();
    }
  }, [curUserId]);

  // Instant optimistic Add to Cart - updates UI and top cart counter immediately (0ms)
  const addToCart = async (product: Product, quantity = 1) => {
    if ((product.stock ?? 0) <= 0) {
      showToast(`"${product.name}" is currently out of stock.`);
      return;
    }

    const existingItem = cart.find(
      (item) => item.product.id === product.id || item.product._id === product._id
    );
    const existingQty = existingItem ? existingItem.quantity : 0;
    if (existingQty + quantity > (product.stock ?? 0)) {
      showToast(`Only ${product.stock} unit(s) available in stock for "${product.name}".`);
      return;
    }

    // 1. INSTANT OPTIMISTIC UPDATE: Update local state and localStorage immediately
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id || item.product._id === product._id);
      let next: CartItem[];
      if (idx > -1) {
        next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
      } else {
        next = [...prev, { product, quantity }];
      }
      try {
        localStorage.setItem('ce_cart', JSON.stringify(next));
      } catch {}
      return next;
    });
    showToast(`Added ${product.name} to bag.`);

    // 2. ASYNC BACKGROUND SYNC: Persist to server in background without blocking UI
    (async () => {
      try {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken().catch(() => null);
          if (token) {
            const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
            const targetProductId = (product._id && String(product._id).length >= 10) ? product._id : (product.sku ? product.sku : product.id.toString());
            await axios.post(
              `${backendUrl}/carts/add`,
              {
                productId: targetProductId,
                quantity
              },
              {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
                timeout: 5000
              }
            );
          }
        }
      } catch (err) {
        console.warn('Could not sync added item to backend cart:', err);
      }
    })();
  };

  const updateCartQty = async (productId: number | string, qty: number) => {
    if (qty <= 0) {
      await removeFromCart(productId);
      return;
    }

    const targetItem = cart.find(
      (item) =>
        item.product.id === productId ||
        item.product._id === productId ||
        item._id === productId ||
        String(item.product.id) === String(productId) ||
        String(item.product._id) === String(productId) ||
        String(item._id) === String(productId)
    );

    if (targetItem && targetItem.product && qty > (targetItem.product.stock ?? 0)) {
      showToast(`Only ${targetItem.product.stock} unit(s) available in stock.`);
      return;
    }

    // Optimistically update local cart state immediately for fast, smooth UI response
    setCart((prev) => {
      const updated = prev.map((item) =>
        item.product.id === productId ||
        item.product._id === productId ||
        item._id === productId ||
        String(item.product.id) === String(productId) ||
        String(item.product._id) === String(productId) ||
        String(item._id) === String(productId)
          ? { ...item, quantity: qty }
          : item
      );
      try {
        localStorage.setItem('ce_cart', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Background sync to server
    (async () => {
      try {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken().catch(() => null);
          if (token) {
            const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
            const itemId = targetItem?._id || targetItem?.product._id || productId.toString();
            await axios.patch(
              `${backendUrl}/carts/item-update/${itemId}`,
              { quantity: qty },
              {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
                timeout: 5000
              }
            );
          }
        }
      } catch (err) {
        console.warn('Could not update cart item quantity on backend:', err);
      }
    })();
  };

  const removeFromCart = async (productId: number | string) => {
    const targetItem = cart.find(
      (item) =>
        item.product.id === productId ||
        item.product._id === productId ||
        item._id === productId ||
        String(item.product.id) === String(productId) ||
        String(item.product._id) === String(productId) ||
        String(item._id) === String(productId)
    );

    // Optimistically update local cart state immediately
    setCart((prev) => {
      const updated = prev.filter(
        (item) =>
          item.product.id !== productId &&
          item.product._id !== productId &&
          item._id !== productId &&
          String(item.product.id) !== String(productId) &&
          String(item.product._id) !== String(productId) &&
          String(item._id) !== String(productId)
      );
      try {
        localStorage.setItem('ce_cart', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Removed item from bag.');

    // Background sync to server
    (async () => {
      try {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken().catch(() => null);
          if (token) {
            const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
            const pId = targetItem?.product._id || targetItem?.product.id || productId.toString();
            await axios.delete(`${backendUrl}/carts/item-remove/${pId}`, {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true,
              timeout: 5000
            });
          }
        }
      } catch (err) {
        console.warn('Could not remove item from backend cart:', err);
      }
    })();
  };

  const clearCart = () => {
    setCart([]);
  };

  const isFetchingOrdersRef = useRef<boolean>(false);

  const fetchMyOrders = useCallback(async () => {
    if (isFetchingOrdersRef.current) return;
    isFetchingOrdersRef.current = true;
    try {
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        if (token) {
          const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
          const response = await axios.get(`${backendUrl}/orders/my-orders`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
            timeout: 10000
          });
          if (response.data && response.data.success && Array.isArray(response.data.orders)) {
            const mappedOrders = response.data.orders.map((b: any) => mapBackendOrderToFrontend(b));
            setOrders(mappedOrders);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch orders from backend:', err);
    } finally {
      isFetchingOrdersRef.current = false;
    }
  }, [products]);

  const mapBackendOrderToFrontend = (b: any): Order => {
    const rawItems = Array.isArray(b.items) && b.items.length > 0 ? b.items : [];
    
    const formattedItems = rawItems.length > 0
      ? rawItems.map((item: any) => {
          const itemProdId = typeof item.product === 'object' ? item.product?._id : item.product;
          const matchedProduct = products.find((p) => p._id === itemProdId || p.sku === item.sku);
          return {
            product: matchedProduct || {
              id: Math.floor(Math.random() * 100000),
              _id: itemProdId || '',
              name: item.title || item.name || (typeof item.product === 'object' ? item.product?.title || item.product?.name : '') || b.firstProductName || 'Formulated Cleaner',
              cat: 'General',
              desc: '',
              tags: [],
              badge: null,
              imgs: item.image ? [item.image] : (typeof item.product === 'object' && item.product?.images?.length > 0 ? item.product.images.map((im: any) => im.url || im) : (b.firstProductImage ? [b.firstProductImage] : [])),
              price: item.unitPrice || item.sellingPrice || item.price || b.grandTotal,
              sku: item.sku || 'EC-PROD',
              brand: 'Ecommerce',
              discount: 0,
              stock: 0,
              status: 'Active',
              createdDate: '',
              specs: {},
              rating: 0,
              reviewCount: 0
            },
            quantity: item.quantity || 1
          };
        })
      : [
          {
            product: {
              id: Math.floor(Math.random() * 100000),
              _id: b._id || '',
              name: b.firstProductName || 'Order Item',
              cat: 'General',
              desc: '',
              tags: [],
              badge: null,
              imgs: b.firstProductImage ? [b.firstProductImage] : [],
              price: b.grandTotal || 0,
              sku: 'EC-PROD',
              brand: 'Ecommerce',
              discount: 0,
              stock: 0,
              status: 'Active',
              createdDate: '',
              specs: {},
              rating: 0,
              reviewCount: 0
            },
            quantity: b.totalItems || 1
          }
        ];

    return {
      _id: b._id,
      id: b.orderNumber || b.id || b._id,
      orderNumber: b.orderNumber || b.id || b._id,
      date: b.createdAt
        ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      createdAt: b.createdAt,
      items: formattedItems,
      total: b.grandTotal !== undefined ? b.grandTotal : (b.total || 0),
      customerEmail: curUser?.email || 'customer@ecommerce.com',
      shippingMethod: b.shipping?.courier || b.courier || 'Standard Delivery',
      trackingId: b.trackingId || b.shipping?.trackingId || '',
      courierCompany: b.courier || b.shipping?.courier || '',
      estimatedDelivery: b.estimatedDelivery || b.shipping?.estimatedDelivery || '',
      taxes: b.tax || 0,
      discount: b.discount || 0,
      address: {
        name: b.shippingAddress?.fullName || b.shippingAddress?.name || '',
        phone: b.shippingAddress?.phoneNumber || b.shippingAddress?.phone || '',
        alternatePhone: b.shippingAddress?.alternatePhone || '',
        addressLine1: b.shippingAddress?.addressLine1 || '',
        addressLine2: b.shippingAddress?.addressLine2 || '',
        pincode: b.shippingAddress?.postalCode || b.shippingAddress?.pincode || '',
        city: b.shippingAddress?.city || '',
        state: b.shippingAddress?.state || ''
      },
      billingAddress: {
        name: b.billingAddress?.fullName || b.billingAddress?.name || '',
        phone: b.billingAddress?.phoneNumber || b.billingAddress?.phone || '',
        alternatePhone: b.billingAddress?.alternatePhone || '',
        addressLine1: b.billingAddress?.addressLine1 || '',
        addressLine2: b.billingAddress?.addressLine2 || '',
        pincode: b.billingAddress?.postalCode || b.billingAddress?.pincode || '',
        city: b.billingAddress?.city || '',
        state: b.billingAddress?.state || ''
      },
      paymentMethod: b.paymentMethod || b.payment?.method || 'COD',
      paymentStatus: b.paymentStatus || b.payment?.status || 'Pending',
      status: b.status || 'Pending'
    };
  };

  const placeOrder = async (
    address: Order['address'] & { _id?: string; id?: string },
    paymentMethod: string,
    customerNotes?: string,
    itemsToOrder?: CartItem[],
    deliveryOption: 'FREE' | 'STANDARD' | 'EXPRESS' = 'FREE',
    orderType: 'BUY_NOW' | 'CART' = 'BUY_NOW'
  ) => {
    const targetItems = itemsToOrder && itemsToOrder.length > 0 ? itemsToOrder : cart;
    const targetProductIds = new Set(targetItems.map(i => i.product.id));

    const removeOrderedItems = () => {
      setCart((prev) => prev.filter((item) => !targetProductIds.has(item.product.id)));
    };

    try {
      if (paymentMethod !== 'Cash on delivery' && paymentMethod !== 'COD') {
        // Fallback for non-COD payment modes (GPay/UPI/Card) - mock locally
        const mockOrder: Order = {
          id: `CE${Date.now()}`,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          items: targetItems.map((item) => ({ ...item })),
          total: targetItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
          customerEmail: curUser?.email || 'customer@ecommerce.com',
          shippingMethod: deliveryOption === 'FREE' ? 'Free Delivery' : deliveryOption === 'EXPRESS' ? 'Express Delivery' : 'Standard Delivery',
          taxes: 0,
          discount: 0,
          address,
          billingAddress: address,
          paymentMethod: paymentMethod === 'Credit or debit card' ? 'Card' : 'UPI',
          paymentStatus: 'Pending',
          status: 'Pending'
        };
        setOrders((prev) => [mockOrder, ...prev]);
        removeOrderedItems();
        showToast(`Mock order placed successfully using ${paymentMethod}!`);
        return {
          success: true,
          order: {
            orderIdReference: mockOrder.id,
            grandTotalPaid: mockOrder.total,
            paymentMode: mockOrder.paymentMethod,
            expectedArrival: deliveryOption === 'FREE' ? '5-7 business days' : '2-3 business days',
            order: mockOrder
          }
        };
      }

      // COD (Cash on delivery) -> Call backend API http://localhost:5002/api/orders/place-order
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
      
      const mappedItems = targetItems.map((item) => {
        const matchedProd = products.find(p => p.id === item.product.id || p._id === item.product._id);
        return {
          product: matchedProd?._id || item.product._id || item.product.id.toString(),
          quantity: item.quantity
        };
      });

      // Find user address ID from curUser.addresses or address._id or address.id
      let selectedAddrId = (address as any)?._id || (address as any)?.id;
      if (curUser && (curUser as any).addresses && Array.isArray((curUser as any).addresses)) {
        const found = (curUser as any).addresses.find((a: any) => 
          a._id === selectedAddrId || a.id === selectedAddrId || a.addressLine1 === address.addressLine1
        );
        if (found) {
          selectedAddrId = found._id || found.id;
        } else if ((curUser as any).addresses.length > 0) {
          selectedAddrId = (curUser as any).addresses[0]._id || (curUser as any).addresses[0].id;
        }
      }

      const userPhone = curUser?.phone || (curUser as any)?.phoneNumber || (address as any)?.phone || (address as any)?.phoneNumber || '';

      const payload = {
        orderType,
        items: mappedItems,
        shippingAddressId: selectedAddrId,
        deliveryOption,
        couponCode: '',
        customerNotes: customerNotes || '',
        phone: userPhone,
        phoneNumber: userPhone
      };

      const response = await axios.post(
        `${backendUrl}/orders/place-order`,
        payload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        const backendOrderWrapper = response.data.order;
        const actualOrderDoc = backendOrderWrapper?.order || backendOrderWrapper;
        const mappedOrder = mapBackendOrderToFrontend(actualOrderDoc);
        setOrders((prev) => [mappedOrder, ...prev]);
        removeOrderedItems();
        fetchUserCart();
        showToast(`Order ${mappedOrder.id} placed successfully!`);
        return response.data;
      } else {
        const isOutOfStock = Boolean(
          response.data.isOutOfStock ||
          (response.data.message && (
            response.data.message.toLowerCase().includes('stock') ||
            response.data.message.toLowerCase().includes('out of stock')
          ))
        );
        showToast(response.data.message || 'Failed to place order.');
        return { ...response.data, isOutOfStock };
      }
    } catch (error: any) {
      console.error('Failed to place order:', error);
      const errorMsg = error.response?.data?.message || 'Failed to place order. Please try again.';
      const isOutOfStock = Boolean(
        error.response?.data?.isOutOfStock ||
        error.response?.status === 409 ||
        errorMsg.toLowerCase().includes('stock') ||
        errorMsg.toLowerCase().includes('out of stock')
      );
      showToast(errorMsg);
      return { success: false, message: errorMsg, isOutOfStock };
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status'], targetId?: string): Promise<boolean> => {
    const isAllowedSelfAction = status === 'Cancelled' || status === 'Returned';

    if (!isAllowedSelfAction && !curUser?.isAdmin) return false;

    try {
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
      const orderIdToUse = targetId || id;

      const response = await axios.put(
        `${backendUrl}/orders/${orderIdToUse}/status`,
        { status },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id === id || o.id === targetId || o._id === id || o._id === targetId || (o.orderNumber && (o.orderNumber === id || o.orderNumber === targetId))) {
              const nextTimeline = o.timeline ? [...o.timeline] : [];
              nextTimeline.push({
                status,
                date: new Date().toLocaleString('en-IN'),
                notes: isAllowedSelfAction ? `Status updated to ${status} by customer.` : `Status updated to ${status} by admin.`
              });
              return { ...o, status, timeline: nextTimeline };
            }
            return o;
          })
        );
        showToast(`Order status updated to ${status}.`);
        return true;
      } else {
        showToast(response.data?.message || 'Failed to update order status.');
        return false;
      }
    } catch (err: any) {
      console.warn('API updateOrderStatus note:', err);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === id || o.id === targetId || o._id === id || o._id === targetId) {
            const nextTimeline = o.timeline ? [...o.timeline] : [];
            nextTimeline.push({
              status,
              date: new Date().toLocaleString('en-IN'),
              notes: isAllowedSelfAction ? `Status updated to ${status} by customer.` : `Status updated to ${status} by admin.`
            });
            return { ...o, status, timeline: nextTimeline };
          }
          return o;
        })
      );
      showToast(`Order status updated to ${status}.`);
      return true;
    }
  };

  const cancelOrder = async (orderId: string, reason?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
        const response = await axios.delete(`${backendUrl}/orders/cancel/${orderId}`, {
          data: { cancelReason: reason, reason },
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });

        if (response.data && response.data.success) {
          setOrders((prev) =>
            prev.map((o) => {
              if (o.id === orderId || o._id === orderId) {
                const nextTimeline = o.timeline ? [...o.timeline] : [];
                nextTimeline.push({
                  status: 'Cancelled',
                  date: new Date().toLocaleString('en-IN'),
                  notes: `Cancelled by customer. Reason: ${reason || 'Customer request'}`
                });
                return { ...o, status: 'Cancelled', timeline: nextTimeline };
              }
              return o;
            })
          );
          showToast('Order cancelled successfully.');
          return { success: true, message: response.data.message || 'Order cancelled successfully.' };
        } else {
          return { success: false, message: response.data?.message || 'Failed to cancel order.' };
        }
      } else {
        updateOrderStatus(orderId, 'Cancelled');
        return { success: true, message: 'Order cancelled.' };
      }
    } catch (err: any) {
      console.error('Cancel order API error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to cancel order.';
      return { success: false, message: errMsg };
    }
  };

  const returnOrder = async (orderId: string, reason?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        const backendUrl = import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api';
        const response = await axios.post(`${backendUrl}/orders/return/${orderId}`, {
          returnReason: reason,
          reason
        }, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        });

        if (response.data && response.data.success) {
          setOrders((prev) =>
            prev.map((o) => {
              if (o.id === orderId || o._id === orderId) {
                const nextTimeline = o.timeline ? [...o.timeline] : [];
                nextTimeline.push({
                  status: 'Returned',
                  date: new Date().toLocaleString('en-IN'),
                  notes: `Return requested by customer. Reason: ${reason || 'Customer request'}`
                });
                return { ...o, status: 'Returned', timeline: nextTimeline };
              }
              return o;
            })
          );
          showToast('Order return request submitted successfully.');
          return { success: true, message: response.data.message || 'Order return request submitted successfully.' };
        } else {
          return { success: false, message: response.data?.message || 'Failed to return order.' };
        }
      } else {
        await updateOrderStatus(orderId, 'Returned');
        return { success: true, message: 'Order returned.' };
      }
    } catch (err: any) {
      console.error('Return order API error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to return order.';
      return { success: false, message: errMsg };
    }
  };

  const updateOrderDetails = (id: string, details: Partial<Order>) => {
    if (!checkAdminPermission()) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...details } : o))
    );
    showToast('Order details updated.');
  };

  const addOrderTimelineEvent = (id: string, status: string, notes?: string) => {
    const isAllowedSelfAction = status === 'Cancelled' || status === 'Returned';

    if (!isAllowedSelfAction && !checkAdminPermission()) return;

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === id) {
          const nextTimeline = o.timeline ? [...o.timeline] : [];
          nextTimeline.push({
            status,
            date: new Date().toLocaleString('en-IN'),
            notes
          });
          return { ...o, timeline: nextTimeline };
        }
        return o;
      })
    );
  };

  // Staff Account Management Operations
  const inviteStaff = (name: string, email: string, role: Staff['role']) => {
    if (!checkAdminPermission()) return;
    const nextId = `ST-00${staff.length + 1}`;
    const newStaff: Staff = {
      id: nextId,
      name,
      email,
      role,
      status: 'Active',
      lastLogin: 'Never logged in'
    };
    setStaff((prev) => [...prev, newStaff]);
    showToast(`Staff invitation sent to ${email}.`);
  };

  const updateStaffStatus = (id: string, status: Staff['status']) => {
    if (!checkAdminPermission()) return;
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
    showToast(`Staff account ${status === 'Active' ? 'activated' : 'deactivated'}.`);
  };

  const resetStaffPassword = (_id: string) => {
    if (!checkAdminPermission()) return;
    showToast('Password reset link has been generated and emailed.');
  };

  const deleteStaff = (id: string) => {
    if (!checkAdminPermission()) return;
    setStaff((prev) => prev.filter((s) => s.id !== id));
    showToast('Staff profile deleted.');
  };

  const updateProfile = async (updated: Partial<User>) => {
    if (!curUser) return;
    
    // Optimistically update local state first
    const localUpdated = { ...updated };
    if (updated.avatar) {
      localUpdated.photoURL = updated.avatar;
    }
    const updatedUser = { ...curUser, ...localUpdated };
    setCurUser(updatedUser);

    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      try {
        const token = await firebaseUser.getIdToken();
        const formData = new FormData();
        
        if (updated.firstName !== undefined) formData.append('firstName', updated.firstName);
        if (updated.lastName !== undefined) formData.append('lastName', updated.lastName);
        if (updated.gender !== undefined) formData.append('gender', updated.gender);
        if (updated.dateOfBirth !== undefined) formData.append('dateOfBirth', updated.dateOfBirth);
        if (updated.phoneNumber !== undefined) formData.append('phoneNumber', updated.phoneNumber);
        
        if (updated.address) {
          if (updated.address.addressLine1 !== undefined) formData.append('addressLine1', updated.address.addressLine1);
          if (updated.address.addressLine2 !== undefined) formData.append('addressLine2', updated.address.addressLine2);
          if (updated.address.city !== undefined) formData.append('city', updated.address.city);
          if (updated.address.state !== undefined) formData.append('state', updated.address.state);
          if (updated.address.postalCode !== undefined) formData.append('postalCode', updated.address.postalCode);
          if (updated.address.country !== undefined) formData.append('country', updated.address.country);
        }
        
        // If there's a new base64 image uploaded, append as a Blob under the field "photo"
        if (updated.avatar && updated.avatar.startsWith('data:')) {
          try {
            const blob = dataURLtoBlob(updated.avatar);
            const mime = updated.avatar.split(',')[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
            const ext = mime.split('/')[1] || 'jpg';
            formData.append('photo', blob, `photo-${Date.now()}.${ext}`);
          } catch (err) {
            console.warn('Failed to parse base64 avatar data', err);
          }
        }
        
        const response = await axios.put(`${import.meta.env.VITE_BACKEND_URI}/users/update-profile`, formData, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        });
        
        if (response.data && response.data.success) {
          await fetchCurrentUser();
        }
      } catch (error) {
        console.error('Failed to sync profile update with backend api:', error);
      }
    }
    showToast('Profile updated successfully.');
  };

  return (
    <AppContext.Provider
      value={{
        products,
        isProductsLoading,
        reviews,
        stories,
        fetchStories,
        submitStory,
        users,
        leads,
        banners,
        fetchBanners,
        staff,
        curUser,
        isAuthLoading,
        curPage,
        curFilter,
        searchQuery,
        toastMessage,
        selectedProductId,
        authModalOpen,
        authModalTab,
        setCurPage,
        setCurFilter,
        setSearchQuery,
        setSelectedProductId,
        openAuthModal,
        closeAuthModal,
        loginUser,
        registerUser,
        logoutUser,
        addProduct,
        updateProductImages,
        deleteProduct,
        duplicateProduct,
        submitReview,
        fetchProductReviews,
        approveReview,
        deleteReview,
        updateReviewStatus,
        replyToReview,
        addLead,
        updateLeadStatus,
        updateLeadNotes,
        addLeadComment,
        addLeadTask,
        toggleLeadTask,
        addLeadReminder,
        addLeadActivity,
        updateBanners,
        showToast,
        cart,
        orders,
        addingProductId,
        deletingProductId,
        updatingProductId,
        isCartLoading,
        fetchUserCart,
        fetchMyOrders,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        placeOrder,
        updateProduct,
        updateOrderStatus,
        cancelOrder,
        returnOrder,
        updateOrderDetails,
        addOrderTimelineEvent,
        inviteStaff,
        updateStaffStatus,
        resetStaffPassword,
        deleteStaff,
        invoiceOrder,
        setInvoiceOrder,
        fetchCurrentUser,
        updateProfile,
        setCurUser,
        hideNavbar,
        setHideNavbar
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
