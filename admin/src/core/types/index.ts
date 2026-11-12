export interface ProductVariant {
  size: string;
  stock: number;
  price?: number;
  discount?: number;
}

export interface Product {
  id: number;
  _id?: string;
  name: string;
  cat: string;
  desc: string;
  tags: string[];
  badge: string | null;
  imgs: string[]; // Up to 5 base64 image data strings
  images?: { url: string; public_id: string }[];
  price: number; // Price in INR
  sku: string;
  brand: string;
  discount: number; // Discount percentage (e.g. 10 for 10%)
  stock: number;
  variants?: ProductVariant[];
  status: 'Active' | 'Draft' | 'Archived';
  createdDate: string;
  specs: {
    Size?: string;
    Dilution?: string;
    Usage?: string;
    Fragrance?: string;
    pH?: string;
    Surfaces?: string;
    Suitable?: string;
    Temperature?: string;
    Yield?: string;
    [key: string]: string | undefined;
  };
  rating: number;
  reviewCount: number;
  originalPrice?: number;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
  };
}

export interface Review {
  id: number | string;
  _id?: string;
  author: string;
  ini: string;
  role: string;
  img: string | null;
  image?: string | null;
  images?: string[];
  rating: number;
  body: string;
  product: string; // Product name or "General"
  productId?: string | number;
  approved: boolean;
  date: string;
  reply?: string; // Admin reply text
  status?: 'Approved' | 'Pending' | 'Rejected' | 'Hidden';
  verifiedPurchase?: boolean;
  isVerifiedPurchase?: boolean;
}

export interface User {
  name: string;
  email: string;
  password?: string;
  isAdmin: boolean;
  avatar?: string;
  photoURL?: string;
  firstName?: string;
  lastName?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  addresses?: any[];
}

export interface LeadActivity {
  type: 'Email' | 'Call' | 'Note' | 'Task' | 'Comment';
  title: string;
  content: string;
  date: string;
}

export interface LeadTask {
  id: string;
  title: string;
  done: boolean;
  date?: string;
}

export interface LeadReminder {
  id: string;
  title: string;
  date: string;
}

export interface LeadComment {
  id: string;
  author: string;
  body: string;
  date: string;
}

export interface Lead {
  _id?: string;
  id: number | string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  source: string;
  subject: string;
  service: string; // The service or category they are enquirying about
  message: string;
  status: 'New' | 'Contacted' | 'Interested' | 'Negotiation' | 'Won' | 'Lost' | 'Archived';
  priority: 'Low' | 'Medium' | 'High';
  assignedTo?: string;
  followUpDate?: string;
  date: string; // Created Date
  internalNotes: string;
  attachments?: { name: string; url: string }[];
  activities?: LeadActivity[];
  tasks?: LeadTask[];
  reminders?: LeadReminder[];
  comments?: LeadComment[];
}

export interface Banner {
  _id?: string;
  img: string | null;
  mobileImg?: string | null;
  desktopImage?: string;
  mobileImage?: string;
  desktopImagePublicId?: string;
  mobileImagePublicId?: string;
  label: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  displayOrder?: number;
  scheduleStart?: string;
  scheduleEnd?: string;
  isActive?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderTimelineEvent {
  status: string;
  date: string;
  notes?: string;
}

export interface Order {
  _id?: string;
  id: string; // e.g., CE-23945
  orderNumber?: string;
  date: string;
  items: CartItem[];
  subtotal?: number;
  shippingCharge?: number;
  total: number;
  customerEmail: string;
  shippingMethod: string;
  trackingId?: string;
  courierCompany?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  transactionId?: string;
  coupon?: {
    code: string;
    discountAmount: number;
  };
  notes?: string;
  adminNotes?: string;
  taxes: number;
  discount: number;
  billingAddress?: {
    name: string;
    phone: string;
    alternatePhone?: string;
    addressLine1: string;
    addressLine2?: string;
    street?: string;
    pincode: string;
    city: string;
    state: string;
  };
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  address: {
    name: string;
    phone: string;
    alternatePhone?: string;
    addressLine1: string;
    addressLine2?: string;
    street?: string;
    pincode: string;
    city: string;
    state: string;
  };
  paymentMethod: string;
  status: 'Pending' | 'Confirmed' | 'Packed' | 'Ready for Dispatch' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Returned' | 'Refunded';
  timeline?: OrderTimelineEvent[];
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Manager' | 'Sales' | 'Support';
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

