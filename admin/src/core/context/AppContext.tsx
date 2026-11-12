import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import type { Product, Review, User, Lead, Banner, CartItem, Order, Staff, LeadActivity } from '../types';
// @ts-ignore
import { auth } from '../../../firebase';
import { getSocket, updateSocketAuth } from '../socket/socket';
import { SOCKET_EVENTS } from '../socket/socketEvents';

const BACKEND_URI = (import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api').replace(/\/+$/, '');

interface AppContextType {
  products: Product[];
  reviews: Review[];
  users: User[];
  leads: Lead[];
  banners: Banner[];
  staff: Staff[];
  curUser: User | null;
  isAuthLoading: boolean;
  isLeadsLoading: boolean;
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
  deleteProduct: (id: number | string) => Promise<boolean>;
  bulkDeleteProducts: (ids: (number | string)[]) => Promise<boolean>;
  duplicateProduct: (id: number) => void;
  submitReview: (authorName: string, rating: number, body: string, productName: string) => void;
  approveReview: (id: number) => void;
  deleteReview: (id: number) => void;
  updateReviewStatus: (id: number, status: NonNullable<Review['status']>) => void;
  replyToReview: (id: number, replyText: string) => void;
  fetchOrders: () => Promise<void>;
  fetchReviews: () => Promise<void>;
  fetchLeads: () => Promise<void>;
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
  ) => Promise<boolean>;
  updateLeadStatus: (id: number | string, status: Lead['status']) => Promise<boolean>;
  updateLeadPriority: (id: number | string, priority: Lead['priority']) => Promise<boolean>;
  updateLeadNotes: (id: number | string, notes: string) => Promise<boolean>;
  addLeadComment: (id: number | string, commentOrAuthor: string, body?: string) => Promise<boolean>;
  addLeadTask: (id: number | string, title: string) => Promise<boolean>;
  toggleLeadTask: (id: number | string, taskId: string, completed?: boolean) => Promise<boolean>;
  addLeadReminder: (id: number | string, title: string, date: string) => Promise<boolean>;
  addLeadActivity: (id: number | string, type: LeadActivity['type'], title: string, content: string) => Promise<boolean>;
  updateBanners: (banners: Banner[], desktopFiles?: (File | null)[], mobileFiles?: (File | null)[]) => Promise<boolean>;
  fetchBanners: () => Promise<void>;
  showToast: (msg: string) => void;
  updateProduct: (product: Product, localDeletedImagePublicIds?: string[]) => Promise<boolean>;
  updateOrderStatus: (id: string, status: Order['status'], targetId?: string) => Promise<boolean>;
  updateOrderDetails: (id: string, details: Partial<Order>) => void;
  addOrderTimelineEvent: (id: string, status: string, notes?: string) => void;
  
  // Shopping Cart & Checkout States
  cart: CartItem[];
  orders: Order[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQty: (productId: number, qty: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  placeOrder: (address: Order['address'], paymentMethod: string, customerNotes?: string) => void;

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
    sku: 'CE-FL-01',
    brand: 'FORMA',
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
    sku: 'CE-DH-02',
    brand: 'FORMA',
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
    sku: 'CE-LD-03',
    brand: 'FORMA',
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
    sku: 'CE-DH-04',
    brand: 'FORMA',
    discount: 15,
    stock: 2,
    status: 'Active',
    createdDate: '2026-06-18',
    specs: {
      Size: '500 ml Spray',
      Usage: 'Spray and wipe with a clean cloth',
      Fragrance: 'Green Lime',
      Suitable: 'All kitchen countertops and tables',
      pH: '6.8',
      Dilution: 'Ready to use'
    },
    rating: 4.5,
    reviewCount: 43
  }
];

const DEF_REVS: Review[] = [
  {
    id: 1,
    author: 'Priya Mehta',
    ini: 'PM',
    role: 'Mumbai, Home User',
    img: null,
    rating: 5,
    body: 'I have tried many floor cleaners over the years. This floor concentrate is the first one that really works — my marble floors look clean and shiny, and there is no strong chemical smell.',
    product: 'Fresh Floor Cleaner',
    approved: true,
    status: 'Approved',
    date: 'Mar 2026'
  },
  {
    id: 2,
    author: 'Rajan Tiwari',
    ini: 'RT',
    role: 'Pune, Restaurant Owner',
    img: null,
    rating: 5,
    body: 'We transitioned our entire café to FORMA for all essential tableware and daily upkeep. The craftsmanship is extraordinary, and our kitchen staff have commented that quality has markedly improved since switching.',
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
    body: 'With two young children and a dog, the quality and purity of every design piece in our home is non-negotiable. FORMA is the first studio I have trusted without reservation. The materials are honest, the aesthetics are calm, and craftsmanship is top tier.',
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
  const [products, setProducts] = useState<Product[]>(DEF_PRODS);
  const [reviews, setReviews] = useState<Review[]>(DEF_REVS);
  const [users, setUsers] = useState<User[]>(DEF_USERS);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [banners, setBanners] = useState<Banner[]>(DEF_BANNERS);
  const [staff, setStaff] = useState<Staff[]>(DEF_STAFF);
  const [curUser, setCurUser] = useState<User | null>(null);

  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isLeadsLoading, setIsLeadsLoading] = useState<boolean>(false);

  const [curPage, setCurPage] = useState<string>('home');
  const [curFilter, setCurFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  
  // Global Invoice Modal overlay state
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Shopping Cart & Orders state init
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchCurrentUser = async (preFetchedUser?: User) => {
    setIsAuthLoading(true);
    if (preFetchedUser) {
      if (preFetchedUser.photoURL) {
        preFetchedUser.avatar = preFetchedUser.photoURL;
      }
      if (preFetchedUser.isAdmin) {
        setCurUser(preFetchedUser);
        try {
          localStorage.setItem('ce_cur_user', JSON.stringify(preFetchedUser));
        } catch (e) {}
        setIsAuthLoading(false);
        return;
      }
    }
    try {
      await auth.authStateReady();
      const backendUrl = BACKEND_URI;
      let response;
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
      if (backendUrl) {
        try {
          response = await axios.get(`${backendUrl}/auth/me`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            withCredentials: true
          });
        } catch {
          response = await axios.get(`${backendUrl}/users/current-user`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            withCredentials: true
          });
        }
      }
      if (response && response.data && response.data.success && response.data.user) {
        const dbUser = response.data.user;
        if (dbUser.photoURL) {
          dbUser.avatar = dbUser.photoURL;
        }
        setCurUser(dbUser);
        try {
          localStorage.setItem('ce_cur_user', JSON.stringify(dbUser));
        } catch (e) {}
      } else if (auth.currentUser) {
        const fbUser: User = {
          name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Admin',
          email: auth.currentUser.email || '',
          avatar: auth.currentUser.photoURL || undefined,
          isAdmin: true
        };
        setCurUser(fbUser);
        try {
          localStorage.setItem('ce_cur_user', JSON.stringify(fbUser));
        } catch (e) {}
      } else {
        const savedUserStr = localStorage.getItem('ce_cur_user');
        const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
        setCurUser(savedUser);
      }
    } catch (error: any) {
      if (auth.currentUser) {
        const fbUser: User = {
          name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Admin',
          email: auth.currentUser.email || '',
          avatar: auth.currentUser.photoURL || undefined,
          isAdmin: true
        };
        setCurUser(fbUser);
        try {
          localStorage.setItem('ce_cur_user', JSON.stringify(fbUser));
        } catch (e) {}
      } else {
        const savedUserStr = localStorage.getItem('ce_cur_user');
        const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
        if (error.response?.status === 401) {
          setCurUser(null);
          try {
            localStorage.removeItem('ce_cur_user');
          } catch (e) {}
        } else {
          console.error("Error fetching current user session:", error);
          setCurUser(savedUser);
        }
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${BACKEND_URI}/products`, {
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
      }
    } catch (error) {
      console.error('Error fetching products from API:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      } else {
        await auth.authStateReady();
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      }
      if (!token) return;

      const response = await axios.get(`${BACKEND_URI}/auth/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1000 },
        withCredentials: true,
        timeout: 10000
      });

      if (response.data && response.data.success && Array.isArray(response.data.orders)) {
        const fetchedOrders: Order[] = response.data.orders.map((o: any) => ({
          id: o.id || o.orderNumber || o._id,
          _id: o._id,
          createdAt: o.createdAt || o._id,
          date: o.date ? new Date(o.date).toLocaleDateString('en-IN') : (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')),
          total: o.total || o.grandTotal || 0,
          customerEmail: o.customerEmail || o.customer?.email || '',
          paymentStatus: o.paymentStatus || o.payment?.status || 'Pending',
          status: o.status || 'Pending',
          address: {
            name: o.address?.name || o.shippingAddress?.fullName || 'Customer',
            phone: o.address?.phone || o.shippingAddress?.phoneNumber || o.shippingAddress?.phone || o.customer?.phoneNumber || 'N/A',
            city: o.address?.city || o.shippingAddress?.city || 'N/A',
            street: o.address?.street || o.shippingAddress?.addressLine1 || 'N/A',
            state: o.address?.state || o.shippingAddress?.state || 'N/A',
            pincode: (o.address?.pincode && o.address.pincode !== 'N/A') ? o.address.pincode : (o.shippingAddress?.postalCode || o.shippingAddress?.pincode || o.billingAddress?.pincode || o.billingAddress?.postalCode || o.billingAddressRaw?.postalCode || o.customer?.address?.postalCode || o.customer?.addresses?.[0]?.postalCode || 'N/A')
          },
          billingAddress: (o.billingAddress || o.billingAddressRaw) ? {
            name: o.billingAddress?.name || o.billingAddress?.fullName || o.billingAddressRaw?.fullName || o.address?.name || o.shippingAddress?.fullName || 'Customer',
            street: o.billingAddress?.street || o.billingAddress?.addressLine1 || o.billingAddressRaw?.addressLine1 || o.address?.street || o.shippingAddress?.addressLine1 || 'N/A',
            city: o.billingAddress?.city || o.billingAddressRaw?.city || o.address?.city || o.shippingAddress?.city || 'N/A',
            state: o.billingAddress?.state || o.billingAddressRaw?.state || o.address?.state || o.shippingAddress?.state || 'N/A',
            pincode: (o.billingAddress?.pincode && o.billingAddress.pincode !== 'N/A') ? o.billingAddress.pincode : (o.billingAddress?.postalCode || o.billingAddressRaw?.postalCode || o.address?.pincode || o.shippingAddress?.postalCode || o.shippingAddress?.pincode || o.customer?.address?.postalCode || o.customer?.addresses?.[0]?.postalCode || 'N/A')
          } : undefined,
          paymentMethod: o.paymentMethod || o.payment?.method || 'COD',
          shippingMethod: o.shippingMethod || o.delivery?.title || 'Standard Delivery',
          subtotal: typeof o.subtotal === 'number' && o.subtotal > 0 ? o.subtotal : undefined,
          shippingCharge: typeof o.shippingCharge === 'number' ? o.shippingCharge : (o.delivery?.charge || o.shippingFee || 0),
          taxes: typeof o.taxes === 'number' ? o.taxes : (o.tax?.amount || o.taxes?.amount || 0),
          discount: o.discount || 0,
          courierCompany: o.courierCompany || o.shipping?.courier || '',
          trackingId: o.trackingId || o.shipping?.trackingId || '',
          trackingUrl: o.trackingUrl || o.shipping?.trackingUrl || '',
          estimatedDelivery: o.estimatedDelivery || o.shipping?.estimatedDelivery || '',
          adminNotes: o.adminNotes || '',
          items: (o.items || []).map((item: any, idx: number) => {
            const priceVal = item.product?.price || item.unitPrice || item.sellingPrice || item.retailPrice || (item.totalPrice && item.quantity ? Math.round(item.totalPrice / item.quantity) : 0);
            const imgs = item.product?.images ? item.product.images.map((im: any) => typeof im === 'string' ? im : im.url) : (item.product?.imgs || [item.image].filter(Boolean));
            return {
              product: {
                id: item.product?.id || item.product?._id || idx + 1,
                name: item.product?.name || item.title || 'Product',
                sku: item.product?.sku || item.sku || 'N/A',
                price: priceVal,
                imgs: imgs,
                img: imgs[0] || '',
                image: imgs[0] || ''
              },
              image: item.image || imgs[0] || '',
              unitPrice: priceVal,
              sellingPrice: item.sellingPrice || priceVal,
              retailPrice: item.retailPrice || priceVal,
              quantity: item.quantity || 1
            };
          })
        }));
        setOrders(fetchedOrders);
      }
    } catch (err) {
      console.warn('AppContext fetchOrders error:', err);
    }
  };

  const fetchReviews = async () => {
    try {
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      } else {
        await auth.authStateReady();
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      }
      if (!token) return;

      const response = await axios.get(`${BACKEND_URI}/auth/admin/admin-reviews`, {
        params: { limit: 1000 },
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });

      if (response.data && response.data.success && Array.isArray(response.data.reviews)) {
        const fetched: Review[] = response.data.reviews.map((r: any, idx: number) => {
          const authorName = r.customer?.name || r.authorName || 'Customer';
          const initials = authorName.split(' ').map((w: string) => w[0]).join('').toUpperCase().substring(0, 2) || 'C';
          return {
            id: idx + 1,
            _id: r._id,
            author: authorName,
            ini: initials,
            role: r.isVerifiedPurchase ? 'Verified Customer' : 'Customer',
            rating: r.rating || 5,
            body: r.review || r.comment || '',
            product: r.product?.name || r.product?.title || 'HomeCare Product',
            image: r.image || (Array.isArray(r.images) && r.images.length > 0 ? r.images[0] : ''),
            images: r.images || (r.image ? [r.image] : []),
            status: r.status || 'Pending',
            approved: r.status === 'Approved',
            date: r.date ? new Date(r.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
            reply: r.adminReply || r.reply || r.responseStatement || ''
          };
        });
        setReviews(fetched);
      }
    } catch (err) {
      console.warn('AppContext fetchReviews error:', err);
    }
  };

  const fetchLeads = async () => {
    setIsLeadsLoading(true);
    try {
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      } else {
        await auth.authStateReady();
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      }

      const backendUrl = BACKEND_URI;
      const response = await axios.get(`${backendUrl}/leads/admin/leads/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });

      if (response.data && response.data.success && Array.isArray(response.data.leads)) {
        const mappedLeads: Lead[] = response.data.leads.map((backendLead: any, idx: number) => {
          return {
            id: idx + 1,
            _id: backendLead._id,
            name: backendLead.clientName || backendLead.name || '',
            email: backendLead.email || '',
            phone: backendLead.phoneNumber || backendLead.phone || '',
            company: backendLead.companyName || backendLead.company || '',
            source: backendLead.source || 'Web Inquiry',
            subject: backendLead.subject || 'General Enquiry',
            service: backendLead.category || backendLead.service || 'General Support',
            message: backendLead.message || '',
            status: backendLead.status || 'New',
            priority: backendLead.priority || 'Medium',
            assignedTo: backendLead.assignedTo ? (typeof backendLead.assignedTo === 'object' ? (backendLead.assignedTo.name || backendLead.assignedTo.email) : backendLead.assignedTo) : undefined,
            followUpDate: backendLead.followUpDate ? backendLead.followUpDate.split('T')[0] : '',
            date: backendLead.createdAt
              ? new Date(backendLead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            internalNotes: backendLead.internalNotes || '',
            attachments: backendLead.attachments || [],
            activities: Array.isArray(backendLead.activities)
              ? backendLead.activities.map((a: any) => ({
                  type: a.type || 'Note',
                  title: a.title || '',
                  content: a.details || a.content || '',
                  date: a.createdAt
                    ? new Date(a.createdAt).toLocaleString('en-IN')
                    : (a.date || '')
                }))
              : [],
            tasks: Array.isArray(backendLead.tasks)
              ? backendLead.tasks.map((t: any, tIdx: number) => ({
                  id: t._id || t.id || `t-${tIdx}`,
                  title: t.title || '',
                  done: t.completed !== undefined ? t.completed : Boolean(t.done),
                  date: t.completedAt ? new Date(t.completedAt).toLocaleDateString('en-IN') : (t.date || '')
                }))
              : [],
            reminders: Array.isArray(backendLead.reminders)
              ? backendLead.reminders.map((r: any, rIdx: number) => ({
                  id: r._id || r.id || `r-${rIdx}`,
                  title: r.title || '',
                  date: r.scheduledFor ? new Date(r.scheduledFor).toLocaleDateString('en-IN') : (r.date || '')
                }))
              : [],
            comments: Array.isArray(backendLead.comments)
              ? backendLead.comments.map((c: any, cIdx: number) => ({
                  id: c._id || c.id || `c-${cIdx}`,
                  author: (c.createdBy && typeof c.createdBy === 'object') ? (c.createdBy.name || c.createdBy.email) : (c.author || 'Admin'),
                  body: c.comment || c.body || '',
                  date: c.createdAt ? new Date(c.createdAt).toLocaleString('en-IN') : (c.date || '')
                }))
              : []
          };
        });
        setLeads(mappedLeads);
      }
    } catch (error) {
      console.error('Error fetching leads from API:', error);
    } finally {
      setIsLeadsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchProducts();
    fetchLeads();
    fetchBanners();
    fetchOrders();
    fetchReviews();
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
    };

    const handleBannersUpdated = (data: { banners?: any[] }) => {
      if (Array.isArray(data?.banners) && data.banners.length > 0) {
        const mappedBanners: Banner[] = data.banners.map((b: any, idx: number) => ({
          _id: b._id,
          img: b.desktopImage || b.img || null,
          mobileImg: b.mobileImage || b.mobileImg || null,
          desktopImage: b.desktopImage || b.img || '',
          mobileImage: b.mobileImage || b.mobileImg || '',
          desktopImagePublicId: b.desktopImagePublicId || '',
          mobileImagePublicId: b.mobileImagePublicId || '',
          label: b.label || `Banner ${idx + 1}`,
          title: b.title || '',
          subtitle: b.subtitle || '',
          ctaText: b.ctaText || '',
          ctaLink: b.ctaLink || '',
          displayOrder: b.displayOrder || (idx + 1),
          scheduleStart: b.scheduleStart ? b.scheduleStart.split('T')[0] : '',
          scheduleEnd: b.scheduleEnd ? b.scheduleEnd.split('T')[0] : '',
          isActive: b.isActive !== undefined ? b.isActive : true
        }));
        setBanners(mappedBanners);
      }
    };

    const handleLeadEvent = () => {
      // Quiet background refresh for leads
      fetchLeads();
    };

    const handleOrderEvent = () => {
      fetchOrders();
    };

    const handleReviewEvent = () => {
      fetchReviews();
    };

    socket.on(SOCKET_EVENTS.PRODUCT_CREATED, handleProductCreated);
    socket.on(SOCKET_EVENTS.PRODUCT_UPDATED, handleProductUpdated);
    socket.on(SOCKET_EVENTS.PRODUCT_DELETED, handleProductDeleted);
    socket.on(SOCKET_EVENTS.INVENTORY_UPDATED, handleInventoryUpdated);
    socket.on(SOCKET_EVENTS.BANNERS_UPDATED, handleBannersUpdated);
    socket.on(SOCKET_EVENTS.LEAD_CREATED, handleLeadEvent);
    socket.on(SOCKET_EVENTS.LEAD_UPDATED, handleLeadEvent);
    socket.on(SOCKET_EVENTS.LEAD_ACTIVITY_ADDED, handleLeadEvent);
    socket.on(SOCKET_EVENTS.LEAD_TASK_UPDATED, handleLeadEvent);
    socket.on(SOCKET_EVENTS.LEAD_REMINDER_ADDED, handleLeadEvent);
    socket.on(SOCKET_EVENTS.ORDER_CREATED, handleOrderEvent);
    socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleOrderEvent);
    socket.on(SOCKET_EVENTS.ORDER_CANCELLED, handleOrderEvent);
    socket.on('order:returned', handleOrderEvent);
    socket.on(SOCKET_EVENTS.REVIEW_CREATED, handleReviewEvent);
    socket.on(SOCKET_EVENTS.REVIEW_UPDATED, handleReviewEvent);
    socket.on(SOCKET_EVENTS.REVIEW_STATUS_UPDATED, handleReviewEvent);
    socket.on(SOCKET_EVENTS.REVIEW_DELETED, handleReviewEvent);

    // Auth state token listener
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser: any) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          updateSocketAuth(token);
        } catch {
          updateSocketAuth(null);
        }
        await fetchCurrentUser();
        fetchProducts();
        fetchLeads();
        fetchBanners();
        fetchOrders();
        fetchReviews();
      } else {
        updateSocketAuth(null);
        await fetchCurrentUser();
      }
    });

    return () => {
      socket.off(SOCKET_EVENTS.PRODUCT_CREATED, handleProductCreated);
      socket.off(SOCKET_EVENTS.PRODUCT_UPDATED, handleProductUpdated);
      socket.off(SOCKET_EVENTS.PRODUCT_DELETED, handleProductDeleted);
      socket.off(SOCKET_EVENTS.INVENTORY_UPDATED, handleInventoryUpdated);
      socket.off(SOCKET_EVENTS.BANNERS_UPDATED, handleBannersUpdated);
      socket.off(SOCKET_EVENTS.LEAD_CREATED, handleLeadEvent);
      socket.off(SOCKET_EVENTS.LEAD_UPDATED, handleLeadEvent);
      socket.off(SOCKET_EVENTS.LEAD_ACTIVITY_ADDED, handleLeadEvent);
      socket.off(SOCKET_EVENTS.LEAD_TASK_UPDATED, handleLeadEvent);
      socket.off(SOCKET_EVENTS.LEAD_REMINDER_ADDED, handleLeadEvent);
      socket.off(SOCKET_EVENTS.ORDER_CREATED, handleOrderEvent);
      socket.off(SOCKET_EVENTS.ORDER_STATUS_UPDATED, handleOrderEvent);
      socket.off(SOCKET_EVENTS.ORDER_CANCELLED, handleOrderEvent);
      socket.off('order:returned', handleOrderEvent);
      socket.off(SOCKET_EVENTS.REVIEW_CREATED, handleReviewEvent);
      socket.off(SOCKET_EVENTS.REVIEW_UPDATED, handleReviewEvent);
      socket.off(SOCKET_EVENTS.REVIEW_STATUS_UPDATED, handleReviewEvent);
      socket.off(SOCKET_EVENTS.REVIEW_DELETED, handleReviewEvent);
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
    setAuthModalOpen(true);
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
    showToast(`Welcome to FORMA Studio, ${name}!`);
    return { success: true, message: 'Registered successfully' };
  };

  const logoutUser = async () => {
    // Clear user-specific storage BEFORE signOut to prevent auth listeners from restoring session
    try {
      localStorage.removeItem('ce_cur_user');
      localStorage.removeItem('ce_cart');
      localStorage.removeItem('ce_orders');
      localStorage.removeItem('ce_checkout_addresses');
      sessionStorage.removeItem('ce_access_token');
    } catch (e) {}

    // Expire any client-accessible cookies
    document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    try {
      const backendUrl = BACKEND_URI;
      if (backendUrl) {
        await axios.post(`${backendUrl}/auth/logout`, {}, { withCredentials: true });
      }
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

      const response = await axios.post(`${BACKEND_URI}/admin/add-product`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.data && response.data.success) {
        const backendProd = response.data.product;
        setProducts((prev) => {
          const existingItem = prev.find(
            (item) => item._id === backendProd._id || (item.sku && item.sku === backendProd.sku)
          );
          const mappedProduct: Product = {
            id: existingItem ? existingItem.id : (prev.length > 0 ? Math.max(...prev.map((pr) => pr.id)) + 1 : 1),
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

          if (existingItem) {
            return prev.map((item) =>
              item._id === backendProd._id || (item.sku && item.sku === backendProd.sku) ? mappedProduct : item
            );
          }
          return [mappedProduct, ...prev];
        });
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

  const deleteProduct = async (id: number | string): Promise<boolean> => {
    if (!checkAdminPermission()) return false;
    const prod = products.find((p) => p.id === id || p._id === id);
    if (!prod) return false;

    if (prod._id) {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        showToast('Error: System Admin Firebase session not active.');
        return false;
      }
      try {
        const token = await firebaseUser.getIdToken();
        const response = await axios.delete(`${BACKEND_URI}/admin/delete-product/${prod._id}`, {
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
      setProducts((prev) => prev.filter((p) => p.id !== id && p._id !== id));
      showToast('Product removed locally.');
      return true;
    }
  };

  const bulkDeleteProducts = async (ids: (number | string)[]): Promise<boolean> => {
    if (!checkAdminPermission()) return false;
    if (!ids || ids.length === 0) return false;

    const targetProducts = products.filter(
      (p) => ids.includes(p.id) || (p._id && ids.includes(p._id))
    );

    if (targetProducts.length === 0) return false;

    const mongoIds = targetProducts.map((p) => p._id).filter(Boolean) as string[];
    const localIds = targetProducts.filter((p) => !p._id).map((p) => p.id);

    let success = true;

    if (mongoIds.length > 0) {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        showToast('Error: System Admin Firebase session not active.');
        return false;
      }
      try {
        const token = await firebaseUser.getIdToken();
        const response = await axios.post(
          `${BACKEND_URI}/admin/bulk-delete-products`,
          { ids: mongoIds },
          {
            headers: {
              Authorization: `Bearer ${token}`
            },
            withCredentials: true
          }
        );
        if (response.data && response.data.success) {
          showToast(`${targetProducts.length} product(s) deleted successfully.`);
          await fetchProducts();
        } else {
          showToast(response.data.message || 'Failed to bulk delete products.');
          success = false;
        }
      } catch (error: any) {
        console.error('Error bulk deleting products:', error);
        const errMsg = error.response?.data?.message || 'Error occurred while deleting products.';
        showToast(errMsg);
        success = false;
      }
    }

    if (localIds.length > 0) {
      setProducts((prev) => prev.filter((p) => !localIds.includes(p.id) && (!p._id || !ids.includes(p._id))));
      if (mongoIds.length === 0) {
        showToast(`${localIds.length} product(s) removed locally.`);
      }
    }

    return success;
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

      const response = await axios.put(`${BACKEND_URI}/admin/update-product/${p._id}`, formData, {
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

  const submitReview = (authorName: string, rating: number, body: string, productName: string) => {
    if (!curUser) {
      showToast('Please log in to submit a review.');
      return;
    }
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
      rating,
      body,
      product: productName,
      approved: false,
      status: 'Pending',
      date: new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    };

    setReviews((prev) => [...prev, newReview]);
    showToast('Your review has been submitted for approval.');
  };

  const approveReview = (id: number) => {
    if (!checkAdminPermission()) return;
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, approved: true, status: 'Approved' as const } : r))
    );
    showToast('Review approved.');
  };

  const deleteReview = (id: number) => {
    if (!checkAdminPermission()) return;
    setReviews((prev) => prev.filter((r) => r.id !== id));
    showToast('Review deleted.');
  };

  const updateReviewStatus = (id: number, status: NonNullable<Review['status']>) => {
    if (!checkAdminPermission()) return;
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, approved: status === 'Approved' } : r))
    );
    showToast(`Review status updated to ${status}.`);
  };

  const replyToReview = (id: number, replyText: string) => {
    if (!checkAdminPermission()) return;
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, reply: replyText } : r))
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
  ): Promise<boolean> => {
    let finalPhone = '';
    let finalCompany = '';
    let finalSource = 'Web Inquiry';
    let finalSubject = '';
    let finalCategory = 'Floor Care';
    let finalMessage = '';
    let finalPriority: Lead['priority'] = priority || 'Medium';

    if (subject === undefined) {
      // 5 arguments call (from client Home.tsx page)
      finalPhone = '';
      finalCompany = '';
      finalSubject = phoneOrSubject;
      finalCategory = companyOrService || 'Floor Care';
      finalMessage = sourceOrMessage || '';
    } else {
      // 9 arguments call (from LeadsCRM.tsx wizard)
      finalPhone = phoneOrSubject || '';
      finalCompany = companyOrService || '';
      finalSource = sourceOrMessage || 'Web Inquiry';
      finalSubject = subject || '';
      finalCategory = service || 'Floor Care';
      finalMessage = message || '';
    }

    try {
      const backendUrl = BACKEND_URI;
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
        subject: finalSubject ? finalSubject.trim() : 'General Enquiry',
        clientName: name.trim(),
        email: email.toLowerCase().trim(),
        phoneNumber: finalPhone.trim(),
        companyName: finalCompany.trim(),
        category: finalCategory,
        source: finalSource,
        priority: finalPriority,
        message: finalMessage.trim()
      };

      const response = await axios.post(`${backendUrl}/leads/admin/create-lead`, payload, {
        headers,
        withCredentials: true
      });

      if (response.data && response.data.success) {
        showToast(response.data.message || 'Lead created successfully.');
        await fetchLeads();
        return true;
      } else {
        showToast(response.data.message || 'Failed to create lead.');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to create lead via Admin API:', error);
      const errMsg = error.response?.data?.message || 'Failed to create lead.';
      showToast(errMsg);
      return false;
    }
  };

  const updateLeadStatus = async (id: number | string, status: Lead['status']): Promise<boolean> => {
    if (!checkAdminPermission()) return false;

    const targetLead = leads.find((l) => l._id === String(id) || String(l.id) === String(id));
    if (!targetLead) {
      console.warn('Lead not found for status update:', id);
      return false;
    }

    if (targetLead.status === status) {
      return true;
    }

    const leadMongoId = targetLead._id || id;
    setIsLeadsLoading(true);

    try {
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
        headers['Authorization'] = `Bearer ${token}`;
      }

      const backendUrl = BACKEND_URI;
      const response = await axios.patch(
        `${backendUrl}/leads/admin/${leadMongoId}/status`,
        { status },
        {
          headers,
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        showToast(response.data.message || `Lead status updated to ${status}.`);
        await fetchLeads();
        return true;
      } else {
        showToast(response.data.message || 'Failed to update lead status.');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to update lead status via Admin API:', error);
      const errMsg = error.response?.data?.message || 'Failed to update lead status.';
      showToast(errMsg);
      return false;
    } finally {
      setIsLeadsLoading(false);
    }
  };

  const updateLeadPriority = async (id: number | string, priority: Lead['priority']): Promise<boolean> => {
    if (!checkAdminPermission()) return false;

    const targetLead = leads.find((l) => l._id === String(id) || String(l.id) === String(id));
    if (!targetLead) {
      console.warn('Lead not found for priority update:', id);
      return false;
    }

    if (targetLead.priority === priority) {
      return true;
    }

    const leadMongoId = targetLead._id || id;

    try {
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
        headers['Authorization'] = `Bearer ${token}`;
      }

      const backendUrl = BACKEND_URI;
      const response = await axios.patch(
        `${backendUrl}/leads/admin/${leadMongoId}/profile`,
        { priority },
        {
          headers,
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        showToast(response.data.message || `Lead priority updated to ${priority}.`);
        await fetchLeads();
        return true;
      } else {
        showToast(response.data?.message || 'Failed to update priority.');
        return false;
      }
    } catch (err: any) {
      console.error('Error updating lead priority:', err);
      showToast(err.response?.data?.message || 'Failed to update priority.');
      return false;
    }
  };

  const updateLeadNotes = async (id: number | string, notes: string): Promise<boolean> => {
    if (!checkAdminPermission()) return false;

    // Immediately update local state in leads array for snappy UI
    setLeads((prev) =>
      prev.map((l) => ((String(l.id) === String(id) || l._id === String(id)) ? { ...l, internalNotes: notes } : l))
    );

    const targetLead = leads.find((l) => l._id === String(id) || String(l.id) === String(id));
    const leadMongoId = targetLead?._id || id;

    try {
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
        headers['Authorization'] = `Bearer ${token}`;
      }

      const backendUrl = BACKEND_URI;
      const response = await axios.patch(
        `${backendUrl}/leads/admin/${leadMongoId}/profile`,
        { internalNotes: notes },
        {
          headers,
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      console.error('Failed to update lead notes via Admin API:', error);
      return false;
    }
  };

  const addLeadComment = async (
    id: number | string,
    commentOrAuthor: string,
    body?: string
  ): Promise<boolean> => {
    if (!checkAdminPermission()) return false;

    const commentText = (body !== undefined ? body : commentOrAuthor).trim();
    if (!commentText) {
      showToast('Comment cannot be empty.');
      return false;
    }

    const targetLead = leads.find((l) => l._id === String(id) || String(l.id) === String(id));
    const leadMongoId = targetLead?._id || id;

    try {
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
        headers['Authorization'] = `Bearer ${token}`;
      }

      const backendUrl = BACKEND_URI;
      const response = await axios.post(
        `${backendUrl}/leads/admin/${leadMongoId}/comments`,
        { comment: commentText },
        {
          headers,
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        showToast(response.data.message || 'Comment added successfully.');
        await fetchLeads();
        return true;
      } else {
        showToast(response.data?.message || 'Failed to add comment.');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to add lead comment via Admin API:', error);
      const errMsg = error.response?.data?.message || 'Failed to add comment.';
      showToast(errMsg);
      return false;
    }
  };

  const addLeadTask = async (id: number | string, title: string): Promise<boolean> => {
    if (!checkAdminPermission()) return false;

    const targetLead = leads.find((l) => l._id === String(id) || String(l.id) === String(id));
    const leadMongoId = targetLead?._id || id;

    try {
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
        headers['Authorization'] = `Bearer ${token}`;
      }

      const backendUrl = BACKEND_URI;
      const response = await axios.post(
        `${backendUrl}/leads/admin/${leadMongoId}/tasks`,
        { title: title.trim() },
        {
          headers,
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        showToast(response.data.message || 'Task added successfully.');
        await fetchLeads();
        return true;
      } else {
        showToast(response.data.message || 'Failed to add task.');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to add lead task via Admin API:', error);
      const errMsg = error.response?.data?.message || 'Failed to add task.';
      showToast(errMsg);
      return false;
    }
  };

  const toggleLeadTask = async (
    id: number | string,
    taskId: string,
    completed?: boolean
  ): Promise<boolean> => {
    if (!checkAdminPermission()) return false;

    const targetLead = leads.find((l) => l._id === String(id) || String(l.id) === String(id));
    const leadMongoId = targetLead?._id || id;

    // Determine target completion state if not explicitly provided
    const currentTask = targetLead?.tasks?.find((t) => t.id === taskId);
    const newCompleted = completed !== undefined ? completed : !(currentTask?.done);

    try {
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
        headers['Authorization'] = `Bearer ${token}`;
      }

      const backendUrl = BACKEND_URI;
      const response = await axios.patch(
        `${backendUrl}/leads/admin/${leadMongoId}/tasks/${taskId}`,
        { completed: newCompleted },
        {
          headers,
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        // Update local leads state
        setLeads((prev) =>
          prev.map((l) => {
            if ((String(l.id) === String(id) || l._id === String(id)) && l.tasks) {
              const updatedTasks = l.tasks.map((t) =>
                t.id === taskId ? { ...t, done: newCompleted } : t
              );
              return { ...l, tasks: updatedTasks };
            }
            return l;
          })
        );

        showToast(response.data.message || (newCompleted ? 'Task completed successfully.' : 'Task marked as incomplete.'));
        return true;
      } else {
        showToast(response.data.message || 'Failed to update task.');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to update lead task via Admin API:', error);
      const errMsg = error.response?.data?.message || 'Failed to update task.';
      showToast(errMsg);
      return false;
    }
  };

  const addLeadReminder = async (id: number | string, title: string, date: string): Promise<boolean> => {
    if (!checkAdminPermission()) return false;

    const targetLead = leads.find((l) => l._id === String(id) || String(l.id) === String(id));
    const leadMongoId = targetLead?._id || id;

    try {
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
        headers['Authorization'] = `Bearer ${token}`;
      }

      const backendUrl = BACKEND_URI;
      const response = await axios.post(
        `${backendUrl}/leads/admin/${leadMongoId}/reminders`,
        {
          title: title.trim(),
          scheduledFor: date
        },
        {
          headers,
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        showToast(response.data.message || 'Reminder scheduled successfully.');
        await fetchLeads();
        return true;
      } else {
        showToast(response.data?.message || 'Failed to schedule reminder.');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to schedule lead reminder via Admin API:', error);
      const errMsg = error.response?.data?.message || 'Failed to schedule reminder.';
      showToast(errMsg);
      return false;
    }
  };

  const addLeadActivity = async (
    id: number | string,
    type: LeadActivity['type'],
    title: string,
    content: string
  ): Promise<boolean> => {
    if (!checkAdminPermission()) return false;

    const targetLead = leads.find((l) => l._id === String(id) || String(l.id) === String(id));
    const leadMongoId = targetLead?._id || id;

    try {
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
        headers['Authorization'] = `Bearer ${token}`;
      }

      const backendUrl = BACKEND_URI;
      const response = await axios.post(
        `${backendUrl}/leads/admin/${leadMongoId}/activities`,
        {
          type,
          title: title.trim(),
          details: content.trim()
        },
        {
          headers,
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        const returnedAct = response.data.activity;
        const newActivityItem: LeadActivity = {
          type: (returnedAct?.type || type) as LeadActivity['type'],
          title: returnedAct?.title || title.trim(),
          content: returnedAct?.details || content.trim(),
          date: returnedAct?.createdAt
            ? new Date(returnedAct.createdAt).toLocaleString('en-IN')
            : new Date().toLocaleString('en-IN')
        };

        // Update local leads state
        setLeads((prev) =>
          prev.map((l) => {
            if (String(l.id) === String(id) || l._id === String(id)) {
              const nextActs = l.activities ? [...l.activities, newActivityItem] : [newActivityItem];
              return { ...l, activities: nextActs };
            }
            return l;
          })
        );

        showToast(response.data.message || 'Activity logged successfully.');
        return true;
      } else {
        showToast(response.data.message || 'Failed to add activity log.');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to add lead activity via Admin API:', error);
      const errMsg = error.response?.data?.message || 'Failed to add activity log.';
      showToast(errMsg);
      return false;
    }
  };

  const fetchBanners = async () => {
    try {
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      } else {
        await auth.authStateReady();
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const backendUrl = BACKEND_URI;
      const response = await axios.get(`${backendUrl}/auth/admin/banners-get`, {
        headers,
        withCredentials: true
      });

      if (response.data && response.data.success && Array.isArray(response.data.banners)) {
        if (response.data.banners.length > 0) {
          const mappedBanners: Banner[] = response.data.banners.map((b: any, idx: number) => ({
            _id: b._id,
            img: b.desktopImage || b.img || null,
            mobileImg: b.mobileImage || b.mobileImg || null,
            desktopImage: b.desktopImage || b.img || '',
            mobileImage: b.mobileImage || b.mobileImg || '',
            desktopImagePublicId: b.desktopImagePublicId || '',
            mobileImagePublicId: b.mobileImagePublicId || '',
            label: b.label || `Banner ${idx + 1}`,
            title: b.title || '',
            subtitle: b.subtitle || '',
            ctaText: b.ctaText || '',
            ctaLink: b.ctaLink || '',
            displayOrder: b.displayOrder || (idx + 1),
            scheduleStart: b.scheduleStart ? b.scheduleStart.split('T')[0] : '',
            scheduleEnd: b.scheduleEnd ? b.scheduleEnd.split('T')[0] : '',
            isActive: b.isActive !== undefined ? b.isActive : true
          }));
          setBanners(mappedBanners);
        }
      }
    } catch (error) {
      console.error('Error fetching banners from Admin API:', error);
    }
  };

  const updateBanners = async (
    updatedBanners: Banner[],
    desktopFiles?: (File | null)[],
    mobileFiles?: (File | null)[]
  ): Promise<boolean> => {
    if (!checkAdminPermission()) return false;

    try {
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      } else {
        await auth.authStateReady();
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const backendUrl = BACKEND_URI;

      const bannersToSave = updatedBanners.slice(0, 4).map((b, index) => {
        // Strip data: base64 preview URLs from text JSON payload so payload remains lightweight
        const dImg = (typeof b.desktopImage === 'string' && b.desktopImage.startsWith('http'))
          ? b.desktopImage
          : (typeof b.img === 'string' && b.img.startsWith('http') ? b.img : '');
        const mImg = (typeof b.mobileImage === 'string' && b.mobileImage.startsWith('http'))
          ? b.mobileImage
          : (typeof b.mobileImg === 'string' && b.mobileImg.startsWith('http') ? b.mobileImg : '');

        return {
          label: b.label || `Banner ${index + 1}`,
          title: b.title || 'Organic Clean Solutions',
          subtitle: b.subtitle || '',
          ctaText: b.ctaText || 'Explore Now',
          ctaLink: b.ctaLink || 'products',
          desktopImage: dImg,
          desktopImagePublicId: dImg ? (b.desktopImagePublicId || '') : '',
          mobileImage: mImg,
          mobileImagePublicId: mImg ? (b.mobileImagePublicId || '') : '',
          displayOrder: b.displayOrder || (index + 1),
          scheduleStart: b.scheduleStart || null,
          scheduleEnd: b.scheduleEnd || null,
          isActive: b.isActive !== undefined ? b.isActive : true
        };
      });

      const formData = new FormData();
      formData.append('banners', JSON.stringify(bannersToSave));

      // Append new files per slot
      for (let i = 0; i < bannersToSave.length; i++) {
        const dFile = desktopFiles?.[i];
        const currentBanner = updatedBanners[i];

        if (dFile && dFile instanceof Blob) {
          formData.append(`desktopImage_${i}`, dFile);
        } else if (currentBanner?.img && typeof currentBanner.img === 'string' && currentBanner.img.startsWith('data:')) {
          try {
            const blob = await (await fetch(currentBanner.img)).blob();
            formData.append(`desktopImage_${i}`, blob, `desktop_banner_${i + 1}.png`);
          } catch (err) {
            console.warn(`Could not convert desktop data URL for slot ${i}`, err);
          }
        }

        const mFile = mobileFiles?.[i];
        if (mFile && mFile instanceof Blob) {
          formData.append(`mobileImage_${i}`, mFile);
        } else if (currentBanner?.mobileImg && typeof currentBanner.mobileImg === 'string' && currentBanner.mobileImg.startsWith('data:')) {
          try {
            const blob = await (await fetch(currentBanner.mobileImg)).blob();
            formData.append(`mobileImage_${i}`, blob, `mobile_banner_${i + 1}.png`);
          } catch (err) {
            console.warn(`Could not convert mobile data URL for slot ${i}`, err);
          }
        }
      }

      const response = await axios.put(
        `${backendUrl}/auth/admin/banners-publish`,
        formData,
        {
          headers,
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        showToast(response.data.message || 'Homepage hero banners published.');
        await fetchBanners();
        return true;
      } else {
        showToast(response.data?.message || 'Failed to publish banners.');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to publish banners via Admin API:', error);
      const errMsg = error.response?.data?.message || 'Failed to publish banners.';
      showToast(errMsg);
      return false;
    }
  };

  // E-commerce Cart Operations
  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
        return next;
      }
      return [...prev, { product, quantity }];
    });
    showToast(`Added ${product.name} to cart.`);
  };

  const updateCartQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Removed item from cart.');
  };

  const clearCart = () => {
    setCart([]);
  };

  const mapBackendOrderToFrontend = (b: any): Order => {
    return {
      id: b.orderNumber,
      date: b.createdAt
        ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      items: b.items.map((item: any) => {
        const matchedProduct = products.find((p) => p._id === item.product || p.sku === item.sku);
        return {
          product: matchedProduct || {
            id: Math.floor(Math.random() * 100000),
            _id: item.product,
            name: item.title,
            cat: 'General',
            desc: '',
            tags: [],
            badge: null,
            imgs: item.image ? [item.image] : [],
            price: item.unitPrice,
            sku: item.sku,
            brand: 'FORMA',
            discount: 0,
            stock: 0,
            status: 'Active',
            createdDate: '',
            specs: {},
            rating: 0,
            reviewCount: 0
          },
          quantity: item.quantity
        };
      }),
      total: b.grandTotal,
      customerEmail: curUser?.email || 'customer@ecommerce.com',
      shippingMethod: 'Standard Delivery',
      taxes: b.tax || 0,
      discount: b.discount || 0,
      address: {
        name: b.shippingAddress?.fullName || '',
        phone: b.shippingAddress?.phoneNumber || b.shippingAddress?.phone || '',
        alternatePhone: b.shippingAddress?.alternatePhone || '',
        addressLine1: b.shippingAddress?.addressLine1 || '',
        addressLine2: b.shippingAddress?.addressLine2 || '',
        pincode: b.shippingAddress?.postalCode || b.shippingAddress?.pincode || '',
        city: b.shippingAddress?.city || '',
        state: b.shippingAddress?.state || ''
      },
      billingAddress: {
        name: b.billingAddress?.fullName || b.shippingAddress?.fullName || '',
        phone: b.billingAddress?.phoneNumber || b.billingAddress?.phone || b.shippingAddress?.phoneNumber || b.shippingAddress?.phone || '',
        alternatePhone: b.billingAddress?.alternatePhone || '',
        addressLine1: b.billingAddress?.addressLine1 || b.shippingAddress?.addressLine1 || '',
        addressLine2: b.billingAddress?.addressLine2 || b.shippingAddress?.addressLine2 || '',
        pincode: b.billingAddress?.postalCode || b.billingAddress?.pincode || b.shippingAddress?.postalCode || b.shippingAddress?.pincode || '',
        city: b.billingAddress?.city || b.shippingAddress?.city || '',
        state: b.billingAddress?.state || b.shippingAddress?.state || ''
      },
      paymentMethod: b.payment?.method || 'UPI',
      paymentStatus: b.payment?.status || 'Pending',
      status: b.status || 'Pending'
    };
  };

  const placeOrder = async (address: Order['address'], paymentMethod: string, customerNotes?: string) => {
    try {
      if (paymentMethod !== 'Cash on delivery') {
        // Fallback for non-COD payment modes (GPay/UPI/Card) - mock locally
        const mockOrder: Order = {
          id: `CE${Date.now()}`,
          date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          items: cart.map((item) => ({ ...item })),
          total: cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
          customerEmail: curUser?.email || 'customer@ecommerce.com',
          shippingMethod: 'Standard Delivery',
          taxes: 0,
          discount: 0,
          address,
          billingAddress: address,
          paymentMethod: paymentMethod === 'Credit or debit card' ? 'Card' : 'UPI',
          paymentStatus: 'Pending',
          status: 'Pending'
        };
        setOrders((prev) => [mockOrder, ...prev]);
        clearCart();
        setCurPage('orders');
        showToast(`Mock order placed successfully using ${paymentMethod}!`);
        return;
      }

      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
      }

      const response = await axios.post(
        `${BACKEND_URI}/orders/place-order`,
        {
          shippingAddress: {
            fullName: address.name,
            phone: address.phone,
            alternatePhone: address.alternatePhone || '',
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2 || '',
            city: address.city,
            state: address.state,
            country: 'India',
            pincode: address.pincode
          },
          items: cart.map((item) => ({
            product: item.product._id || item.product.id.toString(),
            quantity: item.quantity
          })),
          paymentMethod: 'COD',
          couponCode: '',
          customerNotes: customerNotes || ''
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        const backendOrder = response.data.order;
        const mappedOrder = mapBackendOrderToFrontend(backendOrder);
        setOrders((prev) => [mappedOrder, ...prev]);
        clearCart();
        setCurPage('orders');
        showToast(`Order ${mappedOrder.id} placed successfully!`);
      } else {
        showToast(response.data.message || 'Failed to place order.');
      }
    } catch (error: any) {
      console.error('Failed to place order:', error);
      const errorMsg = error.response?.data?.message || 'Failed to place order. Please try again.';
      showToast(errorMsg);
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status'], targetId?: string): Promise<boolean> => {
    const isAllowedSelfAction = status === 'Cancelled' || status === 'Returned';

    if (!isAllowedSelfAction && !checkAdminPermission()) return false;

    try {
      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
      }
      const backendUrl = BACKEND_URI;
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
        
        const response = await axios.put(`${BACKEND_URI}/users/update-profile`, formData, {
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
        reviews,
        users,
        leads,
        banners,
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
        bulkDeleteProducts,
        duplicateProduct,
        submitReview,
        approveReview,
        deleteReview,
        updateReviewStatus,
        replyToReview,
        fetchLeads,
        isLeadsLoading,
        addLead,
        updateLeadStatus,
        updateLeadPriority,
        updateLeadNotes,
        addLeadComment,
        addLeadTask,
        toggleLeadTask,
        addLeadReminder,
        addLeadActivity,
        updateBanners,
        fetchBanners,
        fetchOrders,
        fetchReviews,
        showToast,
        cart,
        orders,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        placeOrder,
        updateProduct,
        updateOrderStatus,
        updateOrderDetails,
        addOrderTimelineEvent,
        inviteStaff,
        updateStaffStatus,
        resetStaffPassword,
        deleteStaff,
        invoiceOrder,
        setInvoiceOrder,
        fetchCurrentUser,
        updateProfile
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
