import React, { useState, useEffect } from 'react';
import axios from 'axios';
// @ts-ignore
import { auth } from '../../../../firebase';
import { useApp } from '../../../core/context/AppContext';
import { loadRazorpayScript } from '../../../utils/razorpay';

const API_BASE = (import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api').replace(/\/+$/, '');
import {
  CreditCard,
  Truck,
  ShieldCheck,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  Check,
  Lock,
  Zap,
  Package,
  MapPin,
  Smartphone,
  Banknote,
  ArrowRight,
  Star,
  Gift,
  X,
  Edit2,
  Trash,
  CheckCircle,
  AlertCircle,
  CheckSquare,
  Loader2
} from 'lucide-react';

/* ─── Confetti Particle (Success Page) ─── */
const ConfettiParticle: React.FC<{ index: number }> = ({ index }) => {
  const colors = ['#287850', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f97316', '#06b6d4'];
  const color = colors[index % colors.length];
  const left = `${(index * 11 + 5) % 95}%`;
  const delay = `${(index * 0.12) % 1.2}s`;
  const duration = `${1.2 + (index * 0.1) % 0.6}s`;
  return (
    <div style={{ position: 'fixed', left, top: '-10px', width: '8px', height: '8px', borderRadius: index % 2 === 0 ? '50%' : '1px', background: color, animation: `confettiFall ${duration} ${delay} ease-in forwards`, zIndex: 9999, pointerEvents: 'none' }} />
  );
};

/* ─── Checkout Progress Wizard Header ─── */
const WizardHeader: React.FC<{
  currentStep: 'cart' | 'address' | 'delivery' | 'review' | 'payment' | 'processing' | 'success';
  maxStepReached: number;
  onNavigateToStep: (step: 'cart' | 'address' | 'delivery' | 'review' | 'payment') => void;
}> = ({ currentStep, maxStepReached, onNavigateToStep }) => {
  const steps = [
    { key: 'cart', label: 'Bag' },
    { key: 'address', label: 'Address' },
    { key: 'delivery', label: 'Delivery' },
    { key: 'review', label: 'Review' },
    { key: 'payment', label: 'Payment' }
  ] as const;

  const order = ['cart', 'address', 'delivery', 'review', 'payment', 'processing', 'success'];
  const currentIdx = order.indexOf(currentStep);

  if (currentStep === 'processing' || currentStep === 'success') return null;

  return (
    <div className="w-full bg-white border border-[#dfdfd8] rounded-[2px] p-5 sm:p-6 mb-8 select-none">
      <div className="max-w-[720px] mx-auto relative flex justify-between items-center">
        
        {/* Background & Active connector line */}
        <div className="absolute left-6 right-6 top-[16px] h-[1px] bg-[#dfdfd8] z-0">
          <div 
            className="h-full bg-[#262824] transition-all duration-500" 
            style={{ width: `${(Math.min(currentIdx, 4) / 4) * 100}%` }}
          />
        </div>

        {steps.map((s, idx) => {
          const isPassed = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isAccessible = idx <= maxStepReached;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => { if (isAccessible) onNavigateToStep(s.key); }}
              disabled={!isAccessible}
              className={`flex flex-col items-center gap-2 relative z-10 focus:outline-none transition-all min-h-[44px] ${
                isAccessible ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-40'
              }`}
              aria-label={`Step ${idx + 1}: ${s.label}`}
            >
              {/* Step indicator circle */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-[#262824] text-[#f7f6f2] ring-2 ring-[#dfdfd8]'
                  : isPassed
                  ? 'bg-[#262824] text-[#f7f6f2]'
                  : isAccessible
                  ? 'bg-white border border-[#262824] text-[#262824]'
                  : 'bg-[#f7f6f2] border border-[#dfdfd8] text-[#777971]'
              }`}>
                {isPassed ? <Check size={13} strokeWidth={2.5} /> : idx + 1}
              </div>
              <span className={`text-[10px] sm:text-[11px] uppercase tracking-wider transition-colors text-center truncate max-w-[52px] sm:max-w-none ${
                isActive
                  ? 'text-[#262824] font-bold'
                  : isPassed || isAccessible
                  ? 'text-[#262824] font-medium'
                  : 'text-[#777971]'
              }`}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Redesigned Checkout Component ─── */
const Checkout: React.FC = () => {
  const { cart, placeOrder, updateCartQty, removeFromCart, setCurPage, curUser, showToast, openAuthModal, deletingProductId, updatingProductId, setCurUser, fetchCurrentUser, setHideNavbar, clearCart, fetchUserCart, fetchMyOrders } = useApp();

  // Wizard Step State & Tracking
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address' | 'delivery' | 'review' | 'payment' | 'processing' | 'success'>('cart');
  const [maxStepReached, setMaxStepReached] = useState<number>(0);
  const [isProcessingUpi, setIsProcessingUpi] = useState<boolean>(false);
  const [upiCollectModalOpen, setUpiCollectModalOpen] = useState<boolean>(false);
  const [upiCollectDetails, setUpiCollectDetails] = useState<{
    vpa: string;
    app: string;
    amount: number;
    razorpayOrderId: string;
  } | null>(null);
  const [upiTimerSeconds, setUpiTimerSeconds] = useState<number>(300);

  // Timer for UPI collect request countdown
  useEffect(() => {
    let interval: any = null;
    if (upiCollectModalOpen && upiTimerSeconds > 0) {
      interval = setInterval(() => {
        setUpiTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setUpiCollectModalOpen(false);
            setIsProcessingUpi(false);
            showToast('UPI collect request timed out. Please try again.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [upiCollectModalOpen, upiTimerSeconds]);

  const formatUpiTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const stepOrder = ['cart', 'address', 'delivery', 'review', 'payment', 'processing', 'success'] as const;

  useEffect(() => {
    const idx = stepOrder.indexOf(checkoutStep);
    if (idx >= 0 && idx < 5) {
      setMaxStepReached(prev => Math.max(prev, idx));
    }
  }, [checkoutStep]);
  
  // Hide global navbar during the completion of the order process ('processing' & 'success' steps alone)
  useEffect(() => {
    const isOrderCompletionStep = checkoutStep === 'processing' || checkoutStep === 'success';
    setHideNavbar(isOrderCompletionStep);

    return () => {
      setHideNavbar(false);
    };
  }, [checkoutStep, setHideNavbar]);

  // Reset step if user logs out
  useEffect(() => {
    if (!curUser && checkoutStep !== 'cart') {
      setCheckoutStep('cart');
      setMaxStepReached(0);
    }
  }, [curUser, checkoutStep]);

  
  // Construct address list using actual logged-in user details from curUser
  const buildUserAddressList = (user: any) => {
    if (!user) return [];
    
    // Check if user has an addresses array from backend
    if (user.addresses && Array.isArray(user.addresses) && user.addresses.length > 0) {
      return user.addresses.map((item: any, idx: number) => ({
        id: item._id || `addr-user-${idx}`,
        name: item.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer',
        phone: item.phoneNumber || user.phoneNumber || '',
        alternatePhone: item.alternatePhone || '',
        addressLine1: item.addressLine1 || '',
        addressLine2: item.addressLine2 || '',
        landmark: item.landmark || '',
        city: item.city || '',
        state: item.state || '',
        pincode: item.postalCode || '',
        country: item.country || 'India',
        type: item.tag || 'Home',
        isDefault: item.isDefault ?? idx === 0,
        instructions: ''
      }));
    }

    const dbAddr = user.address;
    const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer';
    const userPhone = user.phoneNumber || '';

    if (dbAddr && (dbAddr.addressLine1 || dbAddr.city || dbAddr.postalCode)) {
      return [{
        id: 'addr-user-primary',
        name: userName,
        phone: userPhone,
        alternatePhone: '',
        addressLine1: dbAddr.addressLine1 || '',
        addressLine2: dbAddr.addressLine2 || '',
        landmark: dbAddr.landmark || '',
        city: dbAddr.city || '',
        state: dbAddr.state || '',
        pincode: dbAddr.postalCode || '',
        country: dbAddr.country || 'India',
        type: 'Home',
        isDefault: true,
        instructions: ''
      }];
    }

    return [];
  };

  const [addresses, setAddresses] = useState<any[]>(() => buildUserAddressList(curUser));

  const [selectedAddressId, setSelectedAddressId] = useState<string>(() => {
    const list = buildUserAddressList(curUser);
    const def = list.find((a: any) => a.isDefault);
    return def ? def.id : (list[0]?.id || '');
  });

  useEffect(() => {
    const list = buildUserAddressList(curUser);
    if (list.length > 0) {
      setAddresses(list);
      const def = list.find((a: any) => a.isDefault);
      setSelectedAddressId(prev => (prev && list.some((a: any) => a.id === prev)) ? prev : (def ? def.id : list[0].id));
    }
  }, [curUser]);

  // Address Form States (for Add & Edit address modes)
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAltPhone, setFormAltPhone] = useState('');
  const [formLine1, setFormLine1] = useState('');
  const [formLine2, setFormLine2] = useState('');
  const [formLandmark, setFormLandmark] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPincode, setFormPincode] = useState('');
  const [formCountry, setFormCountry] = useState('India');
  const [formType, setFormType] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [formInstructions, setFormInstructions] = useState('');

  // Delivery Method Selection (mapped to backend enum: FREE [₹0, 7 days], STANDARD [₹99, 4 days], EXPRESS [₹199, 2 days])
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express' | 'priority'>('standard');

  const deliveryMethods = {
    standard: { label: 'Free Delivery', time: '5-7 business days', price: 0, desc: 'Free standard surface transport (₹0)', icon: Truck },
    express: { label: 'Standard Delivery', time: '3-4 business days', price: 99, desc: 'Standard accelerated shipment (₹99)', icon: Zap },
    priority: { label: 'Express Delivery', time: '1-2 business days', price: 199, desc: 'Priority express dispatch (₹199)', icon: Package }
  };

  // Promo Code coupon system
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Payments selection
  const [paymentOption, setPaymentOption] = useState<'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'COD'>('UPI');
  
  // UPI payment options
  const [upiApp, setUpiApp] = useState<'GPay' | 'PhonePe' | 'Paytm' | 'BHIM' | ''>('');
  const [upiId, setUpiId] = useState('');
  const mockRecentUpi = ['amit.patel@okaxis', 'sharma.rohan@paytm'];

  // Card payment options
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [saveCard, setSaveCard] = useState(false);

  // Customer additional checkout comments notes
  const [customerNotes, setCustomerNotes] = useState('');

  // Payment simulated processing states
  const [processingIndex, setProcessingIndex] = useState(0);
  const [placedOrderSummary, setPlacedOrderSummary] = useState<{ id: string; total: number; method: string; date: string; transactionId?: string; paymentStatus?: string; expectedArrival?: string; address?: any } | null>(null);

  // Single Product Checkout ("Buy This Alone") State
  const [aloneProductId, setAloneProductId] = useState<number | null>(null);

  // Edit Quantity State for Cart items
  const [editingQtyMap, setEditingQtyMap] = useState<Record<number, number>>({});

  const handleStartEditQty = (productId: number, currentQty: number) => {
    setEditingQtyMap((prev) => ({ ...prev, [productId]: currentQty }));
  };

  const handleAdjustDraftQty = (productId: number, delta: number) => {
    setEditingQtyMap((prev) => {
      const currentDraft = prev[productId] ?? 1;
      const targetItem = cart.find(i => i.product.id === productId);
      const maxStock = targetItem?.product?.stock ?? 999;
      const nextDraft = Math.max(1, Math.min(maxStock, currentDraft + delta));
      return { ...prev, [productId]: nextDraft };
    });
  };

  const handleSaveQty = async (productId: number) => {
    const draftQty = editingQtyMap[productId];
    if (draftQty !== undefined) {
      await updateCartQty(productId, draftQty);
    }
    setEditingQtyMap((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleCancelEditQty = (productId: number) => {
    setEditingQtyMap((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  // Auto-reset aloneProductId if the item is removed from cart
  useEffect(() => {
    if (aloneProductId !== null && !cart.some(item => item.product.id === aloneProductId)) {
      setAloneProductId(null);
    }
  }, [cart, aloneProductId]);

  // Target checkout items (all cart items or single product selected to buy alone)
  const checkoutItems = aloneProductId !== null 
    ? cart.filter(item => item.product.id === aloneProductId) 
    : cart;
  
  const aloneItem = aloneProductId !== null ? cart.find(item => item.product.id === aloneProductId) : null;

  // Real-time stock status verification across cart and checkout items
  const cartHasOutOfStock = cart.some(
    item => (item.product.stock ?? 0) <= 0 || item.quantity > (item.product.stock ?? 0)
  );

  const checkoutHasOutOfStock = checkoutItems.some(
    item => (item.product.stock ?? 0) <= 0 || item.quantity > (item.product.stock ?? 0)
  );

  // Error state for payment failure or out-of-stock notification during payment
  const [paymentError, setPaymentError] = useState<{
    message: string;
    isOutOfStock?: boolean;
    productName?: string;
  } | null>(null);

  // Computations based on checkoutItems
  const subtotal = checkoutItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItemQty = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Promo Coupon deduction
  const discountDeduction = activeCoupon 
    ? Math.round(subtotal * (activeCoupon.discount / 100)) 
    : 0;

  // Taxes
  const taxesGst = Math.round((subtotal - discountDeduction) * 0.18);
  
  // Shipping
  const rawShippingFee = deliveryMethods[deliveryMethod].price;
  const shippingFee = (subtotal - discountDeduction) >= 499 && deliveryMethod === 'standard' ? 0 : rawShippingFee;
  
  // Grand total
  const grandTotal = subtotal - discountDeduction + taxesGst + shippingFee;

  // Formatting helpers
  const formatCardNumber = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  
  const formatExpiry = (v: string) => {
    const raw = v.replace(/\D/g, '').slice(0, 4);
    return raw.length > 2 ? raw.slice(0, 2) + '/' + raw.slice(2) : raw;
  };

  // Set default address helper
  const handleSetDefaultAddress = async (addrId: string) => {
    try {
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
      }

      if (token) {
        const response = await axios.put(
          `${API_BASE}/users/address/default/${addrId}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }
        );

        if (response.data && response.data.success && Array.isArray(response.data.addresses)) {
          const updatedList = response.data.addresses.map((item: any, idx: number) => ({
            id: item._id || `addr-user-${idx}`,
            name: item.fullName || curUser?.name || 'Valued Customer',
            phone: item.phoneNumber || curUser?.phoneNumber || '',
            alternatePhone: item.alternatePhone || '',
            addressLine1: item.addressLine1 || '',
            addressLine2: item.addressLine2 || '',
            landmark: item.landmark || '',
            city: item.city || '',
            state: item.state || '',
            pincode: item.postalCode || '',
            country: item.country || 'India',
            type: item.tag || 'Home',
            isDefault: item.isDefault ?? idx === 0,
            instructions: ''
          }));
          setAddresses(updatedList);
          setSelectedAddressId(addrId);
          if (setCurUser) {
            setCurUser((prev: any) => prev ? { ...prev, addresses: response.data.addresses } : prev);
          }
          if (fetchCurrentUser) {
            await fetchCurrentUser();
          }
          showToast('Default address updated.');
          return;
        }
      }
    } catch (error: any) {
      console.error('Error setting default address:', error);
      showToast(error.response?.data?.message || 'Failed to update default address.');
    }

    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === addrId })));
    setSelectedAddressId(addrId);
    showToast('Default address updated.');
  };

  // Add / Edit address save trigger
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim() || !formLine1.trim() || !formCity.trim() || !formState.trim() || !formPincode.trim()) {
      showToast('Please fill out all mandatory address fields.');
      return;
    }

    setIsSavingAddress(true);

    const payload = {
      tag: formType || "Home",
      fullName: formName.trim(),
      phoneNumber: formPhone.trim(),
      alternatePhone: formAltPhone.trim(),
      addressLine1: formLine1.trim(),
      addressLine2: formLine2.trim(),
      landmark: formLandmark.trim(),
      city: formCity.trim(),
      state: formState.trim(),
      postalCode: formPincode.trim(),
      country: formCountry || "India",
      isDefault: addresses.length === 0
    };

    try {
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
      }

      if (token) {
        let apiRes;
        if (editingAddressId) {
          apiRes = await axios.put(
            `${API_BASE}/users/address-update/${editingAddressId}`,
            payload,
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            }
          );
        } else {
          apiRes = await axios.post(
            `${API_BASE}/users/address`,
            payload,
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            }
          );
        }

        if (apiRes.data && apiRes.data.success && Array.isArray(apiRes.data.addresses)) {
          const updatedList = apiRes.data.addresses.map((item: any, idx: number) => ({
            id: item._id || `addr-user-${idx}`,
            name: item.fullName || curUser?.name || 'Valued Customer',
            phone: item.phoneNumber || curUser?.phoneNumber || '',
            alternatePhone: item.alternatePhone || '',
            addressLine1: item.addressLine1 || '',
            addressLine2: item.addressLine2 || '',
            landmark: item.landmark || '',
            city: item.city || '',
            state: item.state || '',
            pincode: item.postalCode || '',
            country: item.country || 'India',
            type: item.tag || 'Home',
            isDefault: item.isDefault ?? idx === 0,
            instructions: formInstructions.trim()
          }));
          setAddresses(updatedList);

          const targetId = editingAddressId || updatedList[updatedList.length - 1]?.id;
          if (targetId) {
            setSelectedAddressId(targetId);
          }

          if (setCurUser) {
            setCurUser((prev: any) => prev ? { ...prev, addresses: apiRes.data.addresses } : prev);
          }
          if (fetchCurrentUser) {
            await fetchCurrentUser();
          }

          showToast(editingAddressId ? 'Delivery address updated.' : 'New address registered.');
          resetAddressForm();
          setIsSavingAddress(false);
          return;
        }
      }
    } catch (error: any) {
      console.warn("Could not sync address to server:", error);
      showToast(error.response?.data?.message || 'Failed to save address to server.');
    }

    // Fallback local update
    if (editingAddressId) {
      setAddresses(prev => prev.map(a => a.id === editingAddressId ? {
        ...a,
        name: formName.trim(),
        phone: formPhone.trim(),
        alternatePhone: formAltPhone.trim(),
        addressLine1: formLine1.trim(),
        addressLine2: formLine2.trim(),
        landmark: formLandmark.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        pincode: formPincode.trim(),
        country: formCountry,
        type: formType,
        instructions: formInstructions.trim()
      } : a));
      showToast('Delivery address updated.');
    } else {
      const newAddr = {
        id: `addr-${Date.now()}`,
        name: formName.trim(),
        phone: formPhone.trim(),
        alternatePhone: formAltPhone.trim(),
        addressLine1: formLine1.trim(),
        addressLine2: formLine2.trim(),
        landmark: formLandmark.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        pincode: formPincode.trim(),
        country: formCountry,
        type: formType,
        isDefault: addresses.length === 0,
        instructions: formInstructions.trim()
      };
      setAddresses(prev => [...prev, newAddr]);
      setSelectedAddressId(newAddr.id);
      showToast('New address registered.');
    }

    setIsSavingAddress(false);
    resetAddressForm();
  };

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddressFormOpen(false);
    setFormName('');
    setFormPhone('');
    setFormAltPhone('');
    setFormLine1('');
    setFormLine2('');
    setFormLandmark('');
    setFormCity('');
    setFormState('');
    setFormPincode('');
    setFormCountry('India');
    setFormType('Home');
    setFormInstructions('');
  };

  const handleEditAddress = (addr: any) => {
    setEditingAddressId(addr.id);
    setFormName(addr.name || '');
    setFormPhone(addr.phone || '');
    setFormAltPhone(addr.alternatePhone || '');
    setFormLine1(addr.addressLine1 || '');
    setFormLine2(addr.addressLine2 || '');
    setFormLandmark(addr.landmark || '');
    setFormCity(addr.city || '');
    setFormState(addr.state || '');
    setFormPincode(addr.pincode || '');
    setFormCountry(addr.country || 'India');
    setFormType(addr.type || 'Home');
    setFormInstructions(addr.instructions || '');
    setAddressFormOpen(true);
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (!confirm('Delete this delivery coordinate?')) return;

    try {
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
      }

      if (token) {
        const response = await axios.delete(
          `${API_BASE}/users/address-delete/${addrId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }
        );

        if (response.data && response.data.success && Array.isArray(response.data.addresses)) {
          const updatedList = response.data.addresses.map((item: any, idx: number) => ({
            id: item._id || `addr-user-${idx}`,
            name: item.fullName || curUser?.name || 'Valued Customer',
            phone: item.phoneNumber || curUser?.phoneNumber || '',
            alternatePhone: item.alternatePhone || '',
            addressLine1: item.addressLine1 || '',
            addressLine2: item.addressLine2 || '',
            landmark: item.landmark || '',
            city: item.city || '',
            state: item.state || '',
            pincode: item.postalCode || '',
            country: item.country || 'India',
            type: item.tag || 'Home',
            isDefault: item.isDefault ?? idx === 0,
            instructions: ''
          }));
          setAddresses(updatedList);

          if (selectedAddressId === addrId) {
            const def = updatedList.find((a: any) => a.isDefault);
            setSelectedAddressId(def ? def.id : (updatedList[0]?.id || ''));
          }

          if (setCurUser) {
            setCurUser((prev: any) => prev ? { ...prev, addresses: response.data.addresses } : prev);
          }
          if (fetchCurrentUser) {
            await fetchCurrentUser();
          }

          showToast('Address removed.');
          return;
        }
      }
    } catch (error: any) {
      console.error('Error deleting address:', error);
      showToast(error.response?.data?.message || 'Failed to delete address.');
    }

    setAddresses(prev => prev.filter(a => a.id !== addrId));
    showToast('Address removed.');
    if (selectedAddressId === addrId) {
      setSelectedAddressId('');
    }
  };

  // Coupon promo evaluation
  const handleApplyCoupon = () => {
    setCouponError('');
    const c = couponCode.trim().toUpperCase();
    if (c === 'CLEAN10') {
      setActiveCoupon({ code: 'CLEAN10', discount: 10 });
      showToast('10% promo coupon successfully applied!');
    } else if (c === 'ECO15') {
      setActiveCoupon({ code: 'ECO15', discount: 15 });
      showToast('15% promotional discount applied!');
    } else {
      setCouponError('Invalid coupon code. Try CLEAN10 or ECO15.');
    }
    setCouponCode('');
  };

  const handleRemoveCoupon = () => {
    setActiveCoupon(null);
    showToast('Promo coupon removed.');
  };

  // Payment Simulated processing workflow with 3-stage animated loader
  const triggerPaymentSimulation = () => {
    // 0. Ensure no items are out of stock before initiating payment
    if (checkoutHasOutOfStock) {
      showToast('Cannot process payment: One or more items in your order are out of stock.');
      setPaymentError({
        message: 'One or more items in your order have gone out of stock. Please return to your cart to update your order.',
        isOutOfStock: true
      });
      return;
    }

    // 1. Ensure address is selected
    const currentAddr = addresses.find(a => a.id === selectedAddressId) || addresses[0];
    if (!currentAddr || !selectedAddressId) {
      showToast('Please select or register a delivery address to proceed.');
      setCheckoutStep('address');
      return;
    }

    // Final address preparation
    const finalAddress = {
      _id: currentAddr?.id || currentAddr?._id,
      id: currentAddr?.id || currentAddr?._id,
      name: currentAddr?.name || curUser?.name || 'Valued Customer',
      phone: currentAddr?.phone || curUser?.phoneNumber || '',
      alternatePhone: currentAddr?.alternatePhone || '',
      addressLine1: currentAddr?.addressLine1 || '',
      addressLine2: currentAddr?.addressLine2 || '',
      pincode: currentAddr?.pincode || '',
      city: currentAddr?.city || '',
      state: currentAddr?.state || ''
    };

    // Determine deliveryOption enum ("FREE" | "STANDARD" | "EXPRESS")
    let backendDeliveryOption: 'FREE' | 'STANDARD' | 'EXPRESS' = 'FREE';
    if (deliveryMethod === 'standard') {
      backendDeliveryOption = 'FREE';
    } else if (deliveryMethod === 'express') {
      backendDeliveryOption = 'STANDARD';
    } else if (deliveryMethod === 'priority') {
      backendDeliveryOption = 'EXPRESS';
    }

    // Determine orderType enum ("BUY_NOW" | "CART")
    const orderTypeEnum: 'BUY_NOW' | 'CART' = aloneProductId !== null ? 'BUY_NOW' : 'CART';

    // 2. Validate Payment inputs based on selected payment method
    if (paymentOption === 'Card') {
      const cleanNum = cardNumber.replace(/\s+/g, '');
      if (cleanNum.length < 15) {
        showToast('Please enter a valid 16-digit card number.');
        return;
      }
      if (!cardHolder.trim()) {
        showToast('Please enter the cardholder name.');
        return;
      }
      if (!cardExpiry.includes('/') || cardExpiry.length < 5) {
        showToast('Please enter a valid expiry date (MM/YY).');
        return;
      }
      if (cardCvv.length < 3) {
        showToast('Please enter a valid 3-digit CVV.');
        return;
      }

      // Execute secure Razorpay Card Payment workflow
      setIsProcessingUpi(true);

      (async () => {
        try {
          if (!auth.currentUser) {
            await auth.authStateReady();
          }
          const token = await auth.currentUser?.getIdToken();
          if (!token) {
            showToast('Authentication required. Please sign in to complete payment.');
            openAuthModal('login');
            setIsProcessingUpi(false);
            return;
          }

          const mappedItems = checkoutItems.map(item => ({
            product: item.product._id || item.product.id,
            quantity: item.quantity
          }));

          // 1. Create secure Card order on backend with tamper-proof pricing
          const createRes = await axios.post(`${API_BASE}/orders/create-payment-order`, {
            items: mappedItems,
            shippingAddressId: finalAddress._id,
            deliveryOption: backendDeliveryOption,
            couponCode: activeCoupon?.code || couponCode || '',
            customerNotes: customerNotes + ' | ' + (currentAddr?.instructions || ''),
            phoneNumber: finalAddress.phone,
            paymentMethod: 'Card'
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const orderData = createRes.data;

          // 2. Ensure Razorpay SDK is loaded
          const scriptReady = await loadRazorpayScript();
          if (!scriptReady || !(window as any).Razorpay) {
            showToast('Could not load card payment gateway. Please check your internet connection.');
            setIsProcessingUpi(false);
            return;
          }

          // 3. Launch Razorpay Card checkout modal
          const rzp = new (window as any).Razorpay({
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency || 'INR',
            name: 'Clean Everyday',
            description: 'Credit / Debit Card Checkout',
            order_id: orderData.razorpayOrderId,
            prefill: {
              name: cardHolder.trim() || finalAddress.name,
              email: curUser?.email || '',
              contact: finalAddress.phone || ''
            },
            config: {
              display: {
                blocks: {
                  card: {
                    name: 'Debit / Credit Card',
                    instruments: [
                      {
                        method: 'card'
                      }
                    ]
                  }
                },
                sequence: ['block.card'],
                preferences: {
                  show_default_blocks: false
                }
              }
            },
            theme: {
              color: '#262824'
            },
            modal: {
              ondismiss: () => {
                setIsProcessingUpi(false);
                showToast('Card payment was cancelled. Your order has not been placed.');
              }
            },
            handler: async (response: any) => {
              setIsProcessingUpi(false);
              setCheckoutStep('processing');
              setProcessingIndex(0);

              setTimeout(() => setProcessingIndex(1), 1100);
              setTimeout(() => setProcessingIndex(2), 2200);

              try {
                // 4. Verify payment cryptographically on backend and finalize order
                const verifyRes = await axios.post(`${API_BASE}/orders/verify-payment`, {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  items: mappedItems,
                  shippingAddressId: finalAddress._id,
                  deliveryOption: backendDeliveryOption,
                  couponCode: activeCoupon?.code || couponCode || '',
                  customerNotes: customerNotes + ' | ' + (currentAddr?.instructions || ''),
                  phoneNumber: finalAddress.phone,
                  paymentMethod: 'Card'
                }, {
                  headers: { Authorization: `Bearer ${token}` }
                });

                setTimeout(() => {
                  const backendOrderData = verifyRes.data?.order;
                  const innerOrder = backendOrderData?.order;

                  const orderId = backendOrderData?.orderIdReference || innerOrder?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;
                  const totalPaid = backendOrderData?.grandTotalPaid ?? innerOrder?.grandTotal ?? grandTotal;
                  const mode = 'Card';
                  const arrival = backendOrderData?.expectedArrival || (innerOrder?.delivery?.estimatedDays ? `${innerOrder.delivery.estimatedDays} business days` : deliveryMethods[deliveryMethod].time);
                  const payStatus = 'Paid';
                  const txnId = response.razorpay_payment_id || innerOrder?.payment?.transactionId;

                  if (aloneProductId === null) {
                    clearCart();
                  }
                  fetchUserCart();
                  fetchMyOrders();

                  setPlacedOrderSummary({
                    id: orderId,
                    total: totalPaid,
                    method: mode,
                    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    transactionId: txnId,
                    paymentStatus: payStatus,
                    expectedArrival: arrival,
                    address: finalAddress
                  });

                  setCheckoutStep('success');
                }, 3300);
              } catch (verifyErr: any) {
                console.error('Verify Card payment error:', verifyErr);
                const errorMsg = verifyErr?.response?.data?.message || 'Card payment verification failed.';
                showToast(errorMsg);
                setPaymentError({
                  message: errorMsg,
                  isOutOfStock: Boolean(verifyErr?.response?.data?.isOutOfStock)
                });
                setCheckoutStep('payment');
              }
            }
          });

          rzp.on('payment.failed', (resp: any) => {
            setIsProcessingUpi(false);
            console.error('Razorpay card payment failed:', resp.error);
            showToast(`Card Payment Failed: ${resp.error?.description || 'Transaction declined'}`);
          });

          rzp.open();
        } catch (err: any) {
          setIsProcessingUpi(false);
          console.error('Initiate Card order error:', err);
          const errorMsg = err?.response?.data?.message || err?.message || 'Failed to initiate card payment.';
          showToast(errorMsg);
          setPaymentError({
            message: errorMsg,
            isOutOfStock: Boolean(err?.response?.data?.isOutOfStock)
          });
        }
      })();

      return;
    } else if (paymentOption === 'UPI') {
      let resolvedVpa = upiId.trim();
      let resolvedApp = upiApp || 'UPI App';

      if (!resolvedVpa && !upiApp) {
        showToast('Please select a UPI app or enter your UPI ID (VPA).');
        return;
      }

      if (resolvedVpa) {
        if (!resolvedVpa.includes('@')) {
          if (resolvedApp === 'GPay') resolvedVpa += '@okaxis';
          else if (resolvedApp === 'PhonePe') resolvedVpa += '@ybl';
          else if (resolvedApp === 'Paytm') resolvedVpa += '@paytm';
          else if (resolvedApp === 'BHIM') resolvedVpa += '@upi';
          else resolvedVpa += '@okaxis';
        } else {
          const suffix = resolvedVpa.split('@')[1]?.toLowerCase();
          if (!upiApp) {
            if (suffix?.includes('ok') || suffix?.includes('okhdfc') || suffix?.includes('okaxis')) resolvedApp = 'GPay';
            else if (suffix?.includes('ybl') || suffix?.includes('ibl') || suffix?.includes('axl')) resolvedApp = 'PhonePe';
            else if (suffix?.includes('paytm')) resolvedApp = 'Paytm';
            else if (suffix?.includes('upi')) resolvedApp = 'BHIM';
          }
        }
      } else if (resolvedApp) {
        const cleanPhone = (finalAddress.phone || curUser?.phoneNumber || '9876543210').replace(/\D/g, '').slice(-10);
        if (resolvedApp === 'GPay') resolvedVpa = `${cleanPhone}@okaxis`;
        else if (resolvedApp === 'PhonePe') resolvedVpa = `${cleanPhone}@ybl`;
        else if (resolvedApp === 'Paytm') resolvedVpa = `${cleanPhone}@paytm`;
        else if (resolvedApp === 'BHIM') resolvedVpa = `${cleanPhone}@upi`;
      }

      // Execute secure Razorpay UPI Payment workflow
      setIsProcessingUpi(true);

      (async () => {
        try {
          if (!auth.currentUser) {
            await auth.authStateReady();
          }
          const token = await auth.currentUser?.getIdToken();
          if (!token) {
            showToast('Authentication required. Please sign in to complete UPI payment.');
            openAuthModal('login');
            setIsProcessingUpi(false);
            return;
          }

          const mappedItems = checkoutItems.map(item => ({
            product: item.product._id || item.product.id,
            quantity: item.quantity
          }));

          // 1. Create secure UPI order on backend with tamper-proof pricing
          const createRes = await axios.post(`${API_BASE}/orders/create-upi-order`, {
            items: mappedItems,
            shippingAddressId: finalAddress._id,
            deliveryOption: backendDeliveryOption,
            couponCode: activeCoupon?.code || couponCode || '',
            customerNotes: customerNotes + ' | ' + (currentAddr?.instructions || ''),
            phoneNumber: finalAddress.phone,
            upiId: resolvedVpa
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const upiOrderData = createRes.data;

          // 2. Open UPI Collect Request Waiting Dialog with timer and selected app details
          setUpiCollectDetails({
            vpa: resolvedVpa,
            app: resolvedApp,
            amount: grandTotal,
            razorpayOrderId: upiOrderData.razorpayOrderId
          });
          setUpiTimerSeconds(300);
          setUpiCollectModalOpen(true);

          // 3. Ensure Razorpay SDK is loaded
          const scriptReady = await loadRazorpayScript();
          if (!scriptReady || !(window as any).Razorpay) {
            showToast('Could not load UPI payment gateway. Please check your internet connection.');
            setIsProcessingUpi(false);
            setUpiCollectModalOpen(false);
            return;
          }

          // 4. Launch Razorpay UPI checkout modal configured specifically for UPI
          const rzp = new (window as any).Razorpay({
            key: upiOrderData.keyId,
            amount: upiOrderData.amount,
            currency: upiOrderData.currency || 'INR',
            name: 'Clean Everyday',
            description: `UPI Collect Request: ${resolvedApp} (${resolvedVpa})`,
            order_id: upiOrderData.razorpayOrderId,
            prefill: {
              name: upiOrderData.customer?.name || finalAddress.name,
              email: upiOrderData.customer?.email || curUser?.email || '',
              contact: upiOrderData.customer?.contact || finalAddress.phone || '',
              vpa: resolvedVpa
            },
            notes: {
              upiId: resolvedVpa,
              upiApp: resolvedApp
            },
            config: {
              display: {
                blocks: {
                  upi: {
                    name: 'UPI / QR APPS',
                    instruments: [
                      {
                        method: 'upi'
                      }
                    ]
                  }
                },
                sequence: ['block.upi'],
                preferences: {
                  show_default_blocks: false
                }
              }
            },
            theme: {
              color: '#262824'
            },
            modal: {
              ondismiss: () => {
                setIsProcessingUpi(false);
                setUpiCollectModalOpen(false);
                showToast('UPI payment collect request was cancelled.');
              }
            },
            handler: async (response: any) => {
              setUpiCollectModalOpen(false);
              setIsProcessingUpi(false);
              setCheckoutStep('processing');
              setProcessingIndex(0);

              setTimeout(() => setProcessingIndex(1), 1100);
              setTimeout(() => setProcessingIndex(2), 2200);

              try {
                // Verify payment cryptographically on backend and finalize order
                const verifyRes = await axios.post(`${API_BASE}/orders/verify-upi-payment`, {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  items: mappedItems,
                  shippingAddressId: finalAddress._id,
                  deliveryOption: backendDeliveryOption,
                  couponCode: activeCoupon?.code || couponCode || '',
                  customerNotes: customerNotes + ' | ' + (currentAddr?.instructions || ''),
                  phoneNumber: finalAddress.phone,
                  upiId: resolvedVpa
                }, {
                  headers: { Authorization: `Bearer ${token}` }
                });

                setTimeout(() => {
                  const backendOrderData = verifyRes.data?.order;
                  const innerOrder = backendOrderData?.order;

                  const orderId = backendOrderData?.orderIdReference || innerOrder?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;
                  const totalPaid = backendOrderData?.grandTotalPaid ?? innerOrder?.grandTotal ?? grandTotal;
                  const mode = 'UPI';
                  const arrival = backendOrderData?.expectedArrival || (innerOrder?.delivery?.estimatedDays ? `${innerOrder.delivery.estimatedDays} business days` : deliveryMethods[deliveryMethod].time);
                  const payStatus = 'Paid';
                  const txnId = response.razorpay_payment_id || innerOrder?.payment?.transactionId;

                  if (aloneProductId === null) {
                    clearCart();
                  }
                  fetchUserCart();
                  fetchMyOrders();

                  setPlacedOrderSummary({
                    id: orderId,
                    total: totalPaid,
                    method: mode,
                    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    transactionId: txnId,
                    paymentStatus: payStatus,
                    expectedArrival: arrival,
                    address: finalAddress
                  });

                  setCheckoutStep('success');
                }, 3300);
              } catch (verifyErr: any) {
                console.error('Verify UPI payment error:', verifyErr);
                const errorMsg = verifyErr?.response?.data?.message || 'Payment verification failed.';
                showToast(errorMsg);
                setPaymentError({
                  message: errorMsg,
                  isOutOfStock: Boolean(verifyErr?.response?.data?.isOutOfStock)
                });
                setCheckoutStep('payment');
              }
            }
          });

          rzp.on('payment.failed', (resp: any) => {
            setIsProcessingUpi(false);
            console.error('Razorpay payment failed:', resp.error);
            showToast(`UPI Payment Failed: ${resp.error?.description || 'Transaction declined'}`);
          });

          rzp.open();
        } catch (err: any) {
          setIsProcessingUpi(false);
          console.error('Initiate UPI order error:', err);
          const errorMsg = err?.response?.data?.message || err?.message || 'Failed to initiate UPI payment.';
          showToast(errorMsg);
          setPaymentError({
            message: errorMsg,
            isOutOfStock: Boolean(err?.response?.data?.isOutOfStock)
          });
        }
      })();

      return;
    }

    setCheckoutStep('processing');
    setProcessingIndex(0);

    // Execute placeOrder asynchronously in background during animation
    const orderPromise = placeOrder(
      finalAddress,
      paymentOption,
      customerNotes + ' | ' + (currentAddr?.instructions || ''),
      checkoutItems,
      backendDeliveryOption,
      orderTypeEnum
    );

    // Stage 0: Payment Confirmed (0 to 1100ms)
    // Stage 1: Order Packed & Sealed (at 1100ms)
    setTimeout(() => {
      setProcessingIndex(1);
    }, 1100);

    // Stage 2: Handed Over to Delivery Express Truck (at 2200ms)
    setTimeout(() => {
      setProcessingIndex(2);
    }, 2200);

    // Complete animated loader & transition directly to final order confirmation screen (at 3300ms)
    setTimeout(async () => {
      let resData: any = null;
      try {
        resData = await orderPromise;
      } catch (err: any) {
        console.error("Order placement error:", err);
        const errorMsg = err?.response?.data?.message || err?.message || 'Failed to place order. Please try again.';
        const isOutOfStock = Boolean(err?.response?.data?.isOutOfStock || errorMsg.toLowerCase().includes('stock') || errorMsg.toLowerCase().includes('out of stock'));
        setPaymentError({
          message: errorMsg,
          isOutOfStock
        });
        showToast(errorMsg);
        setCheckoutStep('payment');
        return;
      }

      if (resData && resData.success === false) {
        const isOutOfStock = Boolean(resData.isOutOfStock || resData.message?.toLowerCase().includes('stock') || resData.message?.toLowerCase().includes('out of stock'));
        setPaymentError({
          message: resData.message || 'Order could not be processed. Please verify your details.',
          isOutOfStock
        });
        showToast(resData.message || 'Order could not be processed. Please verify your details.');
        setCheckoutStep('payment');
        return;
      }

      setPaymentError(null);

      const backendOrderData = resData?.order;
      const innerOrder = backendOrderData?.order;

      const orderId = backendOrderData?.orderIdReference || innerOrder?.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;
      const totalPaid = backendOrderData?.grandTotalPaid ?? innerOrder?.grandTotal ?? grandTotal;
      const mode = backendOrderData?.paymentMode || innerOrder?.payment?.method || paymentOption;
      const arrival = backendOrderData?.expectedArrival || (innerOrder?.delivery?.estimatedDays ? `${innerOrder.delivery.estimatedDays} business days` : deliveryMethods[deliveryMethod].time);
      const payStatus = innerOrder?.payment?.status || (paymentOption === 'COD' ? 'Pending' : 'Confirmed');
      const txnId = innerOrder?.payment?.transactionId || backendOrderData?.transactionId || `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      setPlacedOrderSummary({
        id: orderId,
        total: totalPaid,
        method: mode,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        transactionId: txnId,
        paymentStatus: payStatus,
        expectedArrival: arrival,
        address: finalAddress
      });

      setCheckoutStep('success');
    }, 3300);
  };

  // Step navigation helper
  const handleWizardNavigate = (target: typeof checkoutStep) => {
    if (target === 'processing' || target === 'success') return;
    setCheckoutStep(target as any);
  };

  /* ─── Empty Cart State fallback ─── */
  if (cart.length === 0 && checkoutStep === 'cart') {
    return (
      <div className="w-full bg-[#f7f6f2] min-h-[70vh] flex items-center justify-center px-4 py-16 font-body">
        <div className="max-w-[480px] w-full bg-white border border-[#dfdfd8] rounded-[2px] p-8 sm:p-12 text-center select-none animate-fadeIn">
          <div className="w-16 h-16 bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px] flex items-center justify-center mx-auto mb-6 text-[#262824]">
            <ShoppingCart size={28} />
          </div>
          <h2 className="text-2xl font-display font-semibold text-[#262824] mb-2 tracking-tight">Your Bag is Empty</h2>
          <p className="text-sm text-[#777971] mb-8 leading-relaxed">
            Your shopping bag is waiting for your selection. Explore our editorial collection of curated essentials.
          </p>
          <button
            type="button"
            className="btn-primary w-full min-h-[44px] text-xs font-semibold uppercase tracking-wider rounded-[2px] inline-flex items-center justify-center gap-2 cursor-pointer"
            onClick={() => setCurPage('products')}
          >
            <Star size={14} />
            <span>Explore Catalog</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-8 pb-24 animate-fadeIn relative font-body text-[#262824]">

      {/* Address Processing Loading Overlay */}
      {isSavingAddress && (
        <div className="fixed inset-0 bg-[#262824]/60 backdrop-blur-xs z-50 flex flex-col items-center justify-center animate-fadeIn">
          <div className="bg-white p-6 rounded-[2px] border border-[#dfdfd8] max-w-xs w-full text-center flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-[#262824] animate-spin" />
            <h4 className="text-sm font-semibold text-[#262824]">Saving Address</h4>
            <p className="text-xs text-[#777971]">Please wait while your delivery coordinates are updated...</p>
          </div>
        </div>
      )}
      
      {/* Wizard Header Progress (Hidden during processing & final confirmation) */}
      {checkoutStep !== 'processing' && checkoutStep !== 'success' && (
        <WizardHeader currentStep={checkoutStep} maxStepReached={maxStepReached} onNavigateToStep={handleWizardNavigate} />
      )}

      {/* Main double column container layout */}
      {checkoutStep !== 'processing' && checkoutStep !== 'success' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.65fr_1fr] gap-8 items-start">
          
          {/* Left Column Content panels */}
          <div className="flex flex-col gap-5">
            
            {/* Top Navigation Bar: High-Visibility Back Navigation & Step Counter */}
            <div className="flex items-center justify-between gap-3 select-none">
              {checkoutStep === 'cart' ? (
                <button
                  type="button"
                  onClick={() => setCurPage('products')}
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#262824] bg-white hover:bg-[#eeede7] border border-[#dfdfd8] px-3.5 py-2 rounded-[2px] transition-all cursor-pointer group"
                >
                  <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                  <span>Continue Shopping</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (checkoutStep === 'address') setCheckoutStep('cart');
                    else if (checkoutStep === 'delivery') setCheckoutStep('address');
                    else if (checkoutStep === 'review') setCheckoutStep('delivery');
                    else if (checkoutStep === 'payment') setCheckoutStep('review');
                  }}
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#262824] bg-white hover:bg-[#eeede7] border border-[#dfdfd8] px-3.5 py-2 rounded-[2px] transition-all cursor-pointer group"
                >
                  <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
                  <span>
                    {checkoutStep === 'address' && 'Back to Bag'}
                    {checkoutStep === 'delivery' && 'Back to Delivery Address'}
                    {checkoutStep === 'review' && 'Back to Delivery Speed'}
                    {checkoutStep === 'payment' && 'Back to Order Review'}
                  </span>
                </button>
              )}

              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777971] bg-white border border-[#dfdfd8] px-3 py-1.5 rounded-[2px]">
                Step {checkoutStep === 'cart' ? '1' : checkoutStep === 'address' ? '2' : checkoutStep === 'delivery' ? '3' : checkoutStep === 'review' ? '4' : '5'} of 5
              </span>
            </div>

            {/* ══════════════════ STEP 1: SHOPPING CART ══════════════════ */}
            {checkoutStep === 'cart' && (
              <div className="bg-white border border-[#dfdfd8] rounded-[2px] overflow-hidden animate-fadeIn">
                {/* Cart Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-[#dfdfd8] select-none flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#262824] text-[#f7f6f2] rounded-[2px] flex items-center justify-center">
                      <ShoppingCart size={16} />
                    </div>
                    <div>
                      <h2 className="text-base font-display font-semibold text-[#262824] tracking-tight">Review Bag Items</h2>
                      <p className="text-xs text-[#777971] font-medium mt-0.5">
                        {totalItemQty} item{totalItemQty !== 1 ? 's' : ''} in your order
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#262824] bg-[#f7f6f2] border border-[#dfdfd8] px-3 py-1.5 rounded-[2px]">
                    Subtotal: ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Out of Stock Alert Banner across Cart */}
                {cartHasOutOfStock && (
                  <div className="bg-[#f9eded] border-b border-[#d9a5a5] px-6 py-3.5 flex items-center justify-between gap-3 text-xs select-none animate-fadeIn">
                    <div className="flex items-center gap-2 text-[#8e2a2a] font-medium">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>
                        One or more items in your bag are currently <strong className="font-bold">out of stock</strong> or exceed available quantity. Please adjust quantities or remove them to proceed.
                      </span>
                    </div>
                  </div>
                )}

                {/* Banner when a single item is selected to buy alone */}
                {aloneProductId !== null && aloneItem && (
                  <div className="bg-[#fbf4ec] border-b border-[#e0c29f] px-6 py-3.5 flex items-center justify-between gap-3 text-xs select-none animate-fadeIn">
                    <div className="flex items-center gap-2 text-[#8c571e] font-medium">
                      <Zap size={14} className="shrink-0" />
                      <span>
                        Buying <strong className="font-bold">"{aloneItem.product.name}"</strong> alone. Checkout ledger on the right is updated for this item only.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAloneProductId(null);
                        showToast('Switched to checkout all items in cart.');
                      }}
                      className="text-[11px] font-semibold uppercase tracking-wider text-[#262824] hover:bg-[#eeede7] bg-white px-3 py-1.5 rounded-[2px] border border-[#dfdfd8] transition-colors shrink-0 cursor-pointer min-h-[32px]"
                    >
                      Buy All Items ({cart.length})
                    </button>
                  </div>
                )}

                {/* Cart Items List */}
                <div className="divide-y divide-[#dfdfd8]">
                  {cart.map((item, idx) => {
                    const discountPct = item.product.discount > 0 ? item.product.discount : 15;
                    const mrp = item.product.originalPrice || Math.round(item.product.price / (1 - discountPct / 100));
                    const savings = mrp - item.product.price;
                    const isAloneSelected = aloneProductId === item.product.id;
                    const itemOutOfStock = (item.product.stock ?? 0) <= 0;
                    const itemLowStock = (item.product.stock ?? 0) > 0 && (item.product.stock ?? 0) <= 5;
                    const itemExceedsStock = !itemOutOfStock && item.quantity > (item.product.stock ?? 0);
                    return (
                      <div 
                        key={item.product.id} 
                        className={`p-5 sm:p-6 transition-colors duration-150 relative ${
                          itemOutOfStock ? 'bg-[#f9eded]/40 border-l-2 border-l-[#8e2a2a]' : isAloneSelected ? 'bg-[#fbf4ec]/40 border-l-2 border-l-[#8c571e]' : 'hover:bg-[#f7f6f2]'
                        }`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <div className="flex gap-4 sm:gap-5 items-start sm:items-center">
                          {/* Thumbnail */}
                          <div className="w-20 h-20 sm:w-22 sm:h-24 rounded-[2px] border border-[#dfdfd8] overflow-hidden bg-white p-2 flex items-center justify-center shrink-0">
                            {item.product.imgs?.length > 0 ? (
                              <img src={item.product.imgs[0]} alt={item.product.name} className="w-full h-full object-contain mix-blend-multiply" />
                            ) : (
                              <Package size={22} className="text-[#777971]" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex items-start gap-2 mb-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-[#777971] uppercase tracking-widest bg-[#f7f6f2] border border-[#dfdfd8] px-2 py-0.5 rounded-[2px]">
                                {item.product.cat}
                              </span>
                              <span className="text-[10px] font-bold text-[#3d6547] uppercase tracking-wider bg-[#edf3ee] border border-[#a8c6b0] px-2 py-0.5 rounded-[2px]">
                                {discountPct}% OFF
                              </span>
                              {itemOutOfStock ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e2a2a] bg-[#f9eded] border border-[#d9a5a5] px-2 py-0.5 rounded-[2px] flex items-center gap-1">
                                  <AlertCircle size={11} />
                                  Out of Stock
                                </span>
                              ) : itemLowStock ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c571e] bg-[#fbf4ec] border border-[#e0c29f] px-2 py-0.5 rounded-[2px]">
                                  Only {item.product.stock} left in stock
                                </span>
                              ) : null}
                              {itemExceedsStock && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e2a2a] bg-[#f9eded] border border-[#d9a5a5] px-2 py-0.5 rounded-[2px]">
                                  Only {item.product.stock} in stock
                                </span>
                              )}
                            </div>
                            
                            {/* Product Title */}
                            <h4 className="text-sm font-semibold text-[#262824] leading-snug mb-1 line-clamp-1">
                              {item.product.name}
                            </h4>
                            <p className="text-xs text-[#777971]">
                              Studio: <span className="text-[#262824] font-medium">Direct Supplier</span>
                            </p>
                            <p className="text-xs text-[#777971] mt-0.5">
                              Est. Delivery: <span className="text-[#262824] font-medium">2–4 business days</span>
                            </p>
                            
                            {/* Price Row */}
                            <div className="flex items-baseline gap-2.5 flex-wrap mt-2.5">
                              <span className="text-base sm:text-lg font-display font-semibold text-[#262824]">
                                ₹{item.product.price.toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs text-[#777971] line-through font-medium">
                                ₹{mrp.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3d6547] bg-[#edf3ee] border border-[#a8c6b0] px-2 py-0.5 rounded-[2px]">
                                Save ₹{savings.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* Quantity Management & Stepper Controls */}
                            {(() => {
                              const draftQty = editingQtyMap[item.product.id];
                              const isEditingQty = draftQty !== undefined;
                              const activeQty = isEditingQty ? draftQty : item.quantity;

                              return (
                                <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                                  {isEditingQty ? (
                                    /* Editing Mode: + / - controls with OK and Cancel buttons */
                                    <div className="flex items-center gap-2 flex-wrap animate-fadeIn">
                                      <div className="flex items-center border border-[#dfdfd8] rounded-[2px] bg-white overflow-hidden">
                                        <button 
                                          type="button" 
                                          className="w-9 h-9 min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-[#eeede7] transition-colors cursor-pointer text-[#262824]" 
                                          onClick={() => handleAdjustDraftQty(item.product.id, -1)}
                                          title="Decrease quantity"
                                          aria-label="Decrease quantity"
                                        >
                                          <Minus size={13} strokeWidth={2} />
                                        </button>
                                        <span className="text-xs font-semibold text-[#262824] px-3 select-none min-w-[28px] text-center">
                                          {draftQty}
                                        </span>
                                        <button 
                                          type="button" 
                                          className="w-9 h-9 min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-[#eeede7] transition-colors cursor-pointer text-[#262824]" 
                                          onClick={() => handleAdjustDraftQty(item.product.id, 1)}
                                          title="Increase quantity"
                                          aria-label="Increase quantity"
                                        >
                                          <Plus size={13} strokeWidth={2} />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        disabled={updatingProductId === item.product.id}
                                        onClick={() => handleSaveQty(item.product.id)}
                                        className="btn-primary min-h-[36px] px-3 text-xs font-semibold uppercase tracking-wider rounded-[2px] flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                                        title="Save quantity changes"
                                      >
                                        {updatingProductId === item.product.id ? (
                                          <>
                                            <Loader2 size={12} className="animate-spin text-white" />
                                            <span>Saving...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Check size={13} strokeWidth={2.5} />
                                            <span>Save</span>
                                          </>
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleCancelEditQty(item.product.id)}
                                        className="min-h-[36px] px-3 bg-[#f7f6f2] hover:bg-[#eeede7] border border-[#dfdfd8] text-[#262824] text-xs font-semibold uppercase tracking-wider rounded-[2px] flex items-center gap-1 transition-all cursor-pointer"
                                        title="Cancel editing"
                                      >
                                        <X size={12} strokeWidth={2} />
                                        <span>Cancel</span>
                                      </button>
                                    </div>
                                  ) : (
                                    /* Normal Mode: Display Quantity Badge + Edit Button */
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-[#262824] bg-[#f7f6f2] border border-[#dfdfd8] px-2.5 py-1 rounded-[2px] select-none">
                                        Qty: {item.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditQty(item.product.id, item.quantity)}
                                        className="text-xs text-[#262824] hover:bg-[#eeede7] font-semibold flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-[2px] border border-[#dfdfd8] transition-all select-none min-h-[34px] uppercase tracking-wider text-[11px]"
                                        title="Edit product quantity"
                                      >
                                        <Edit2 size={11} />
                                        <span>Edit Qty</span>
                                      </button>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-3 ml-auto">
                                    <span className="text-base font-display font-semibold text-[#262824]">
                                      ₹{(item.product.price * activeQty).toLocaleString('en-IN')}
                                    </span>
                                    <button 
                                      type="button" 
                                      disabled={deletingProductId === item.product.id}
                                      className="w-8 h-8 text-[#777971] hover:text-[#8e2a2a] hover:bg-[#f9eded] rounded-[2px] flex items-center justify-center cursor-pointer transition-colors" 
                                      onClick={() => removeFromCart(item.product.id)} 
                                      title="Remove item from bag"
                                      aria-label="Remove item"
                                    >
                                      {deletingProductId === item.product.id ? (
                                        <Loader2 size={13} className="animate-spin text-[#8e2a2a]" />
                                      ) : (
                                        <Trash2 size={15} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Option below the cart card to Buy This Alone */}
                        <div className="mt-4 pt-3 border-t border-[#dfdfd8] flex items-center justify-between flex-wrap gap-2 select-none">
                          <button
                            type="button"
                            onClick={() => {
                              if (isAloneSelected) {
                                setAloneProductId(null);
                                showToast('Switched to checkout all items in cart.');
                              } else {
                                setAloneProductId(item.product.id);
                                showToast(`Selected "${item.product.name}" to buy alone.`);
                              }
                            }}
                            className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-[2px] flex items-center gap-1.5 transition-all cursor-pointer ${
                              isAloneSelected
                                ? 'bg-[#262824] text-[#f7f6f2]'
                                : 'bg-white hover:bg-[#eeede7] border border-[#dfdfd8] text-[#262824]'
                            }`}
                          >
                            <Zap size={12} className={isAloneSelected ? 'fill-[#f7f6f2] text-[#f7f6f2]' : 'text-[#262824]'} />
                            {isAloneSelected ? 'Buying This Alone (Selected)' : 'Buy this item alone'}
                          </button>

                          {isAloneSelected ? (
                            <span className="text-xs text-[#3d6547] flex items-center gap-1 font-medium">
                              <Check size={12} strokeWidth={2.5} /> Total on right updated for this item only
                            </span>
                          ) : (
                            <span className="text-xs text-[#777971]">
                              Order this item alone without removing other items
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Step 1 Footer Summary */}
                <div className="p-5 sm:p-6 bg-[#f7f6f2] border-t border-[#dfdfd8] flex justify-between items-center flex-wrap gap-4 select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#777971] uppercase tracking-wider">
                      Subtotal ({totalItemQty} item{totalItemQty !== 1 ? 's' : ''}):
                    </span>
                    <strong className="text-[#262824] font-display font-semibold text-lg tracking-tight ml-1">
                      ₹{subtotal.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="text-xs text-[#777971] flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-[#3d6547]" />
                    <span>Proceed using the Order Summary on the right &rarr;</span>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════ STEP 2: DELIVERY ADDRESS ══════════════════ */}
            {checkoutStep === 'address' && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 select-none">
                  <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#dfdfd8] flex-wrap gap-3">
                    <div>
                      <h3 className="text-base font-display font-semibold text-[#262824] tracking-tight">Select Delivery Coordinates</h3>
                      <p className="text-xs text-[#777971] mt-0.5 font-medium">Pick a saved delivery address or register a new one</p>
                    </div>
                    {!addressFormOpen && (
                      <button
                        type="button"
                        onClick={() => setAddressFormOpen(true)}
                        className="btn-primary min-h-[38px] text-xs font-semibold uppercase tracking-wider px-4 flex items-center gap-1.5 rounded-[2px] cursor-pointer"
                      >
                        <Plus size={13} /> <span>Register Address</span>
                      </button>
                    )}
                  </div>

                  {/* If no addresses present */}
                  {!addressFormOpen && addresses.length === 0 && (
                    <div className="border border-dashed border-[#dfdfd8] rounded-[2px] p-8 sm:p-10 text-center flex flex-col items-center justify-center my-2 bg-[#f7f6f2]">
                      <div className="w-12 h-12 rounded-[2px] bg-white border border-[#dfdfd8] flex items-center justify-center mb-3 text-[#262824]">
                        <MapPin size={22} />
                      </div>
                      <h4 className="text-sm font-semibold text-[#262824]">No Address Registered</h4>
                      <p className="text-xs text-[#777971] max-w-sm mt-1 mb-5 leading-relaxed">
                        You have no saved delivery coordinates on your account. Register an address to proceed with order fulfillment.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAddressFormOpen(true)}
                        className="btn-primary min-h-[42px] text-xs font-semibold uppercase tracking-wider px-5 flex items-center gap-2 rounded-[2px] cursor-pointer"
                      >
                        <Plus size={14} /> <span>Register New Address</span>
                      </button>
                    </div>
                  )}

                  {/* Saved Addresses list */}
                  {!addressFormOpen && addresses.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {addresses.map(addr => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => setSelectedAddressId(addr.id)}
                            className={`rounded-[2px] p-5 cursor-pointer relative transition-all flex flex-col justify-between ${
                              isSelected 
                                ? 'border border-[#262824] bg-[#eeede7]/30 ring-1 ring-[#262824]' 
                                : 'border border-[#dfdfd8] bg-white hover:border-[#777971]'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="selectedAddress"
                                    checked={isSelected}
                                    onChange={() => setSelectedAddressId(addr.id)}
                                    className="accent-[#262824] h-4 w-4 cursor-pointer"
                                  />
                                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-[2px] bg-[#f7f6f2] border border-[#dfdfd8] text-[#777971]">
                                    {addr.type}
                                  </span>
                                  {addr.isDefault && (
                                    <span className="bg-[#edf3ee] text-[#3d6547] border border-[#a8c6b0] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-[2px]">
                                      Default
                                    </span>
                                  )}
                                </div>
                              </div>

                              <h4 className="text-sm font-semibold text-[#262824] mt-1">{addr.name || curUser?.name || 'Valued Customer'}</h4>
                              <p className="text-xs text-[#777971] mt-0.5">{addr.phone || curUser?.phoneNumber || 'No phone number'}</p>
                              {addr.addressLine1 ? (
                                <>
                                  <p className="text-xs sm:text-sm text-[#262824] mt-2 leading-relaxed">
                                    {addr.addressLine1}
                                    {addr.addressLine2 && `, ${addr.addressLine2}`}
                                  </p>
                                  <p className="text-xs sm:text-sm text-[#777971] font-medium">
                                    {addr.city}{addr.city && addr.state ? ', ' : ''}{addr.state} {addr.pincode ? `— ${addr.pincode}` : ''}
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs text-[#8c571e] bg-[#fbf4ec] border border-[#e0c29f] rounded-[2px] p-2.5 mt-2 font-medium">
                                  No street address specified. Click "Edit" below to complete your coordinates.
                                </p>
                              )}
                              {addr.instructions && (
                                <p className="text-xs text-[#777971] italic mt-2.5 border-l-2 border-[#dfdfd8] pl-2">
                                  &ldquo;{addr.instructions}&rdquo;
                                </p>
                              )}
                            </div>

                            {/* Actions block */}
                            <div className="flex items-center justify-between border-t border-[#dfdfd8] mt-4 pt-3.5" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleEditAddress(addr)}
                                className="text-xs font-semibold text-[#262824] hover:underline flex items-center gap-1 cursor-pointer py-1 uppercase tracking-wider text-[11px]"
                              >
                                <Edit2 size={11} /> <span>Edit</span>
                              </button>
                              
                              {!addr.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(addr.id)}
                                  className="text-xs text-[#777971] hover:text-[#262824] cursor-pointer py-1 uppercase tracking-wider text-[11px]"
                                >
                                  Make Default
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteAddress(addr.id)}
                                className="text-xs font-semibold text-[#8e2a2a] hover:underline flex items-center gap-1 cursor-pointer py-1 uppercase tracking-wider text-[11px]"
                              >
                                <Trash size={11} /> <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add / Edit address Form */}
                  {addressFormOpen && (
                    <form onSubmit={handleSaveAddress} className="border border-[#dfdfd8] rounded-[2px] p-6 bg-[#f7f6f2] animate-fadeIn">
                      <div className="flex items-center justify-between mb-5 border-b border-[#dfdfd8] pb-3">
                        <h4 className="text-xs font-bold text-[#262824] uppercase tracking-wider">
                          {editingAddressId ? 'Edit Address Parameters' : 'Register New Shipping Coordinate'}
                        </h4>
                        <button type="button" onClick={resetAddressForm} className="text-[#777971] hover:text-[#262824] cursor-pointer p-1">
                          <X size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">Full Recipient Name <span className="text-[#8e2a2a]">*</span></label>
                          <input type="text" placeholder="E.g., Amit Patel" value={formName} onChange={e => setFormName(e.target.value)} className="input-field" required />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">Mobile Number <span className="text-[#8e2a2a]">*</span></label>
                          <input type="tel" placeholder="E.g., 9876543210" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="input-field" required />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">Alternative Mobile <span className="text-[#777971] normal-case tracking-normal">(Optional)</span></label>
                          <input type="tel" placeholder="Alternative contact number" value={formAltPhone} onChange={e => setFormAltPhone(e.target.value)} className="input-field" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">Address Type</label>
                          <select value={formType} onChange={e => setFormType(e.target.value as any)} className="input-field">
                            <option value="Home">Home (All Day Delivery)</option>
                            <option value="Office">Office (9 AM - 6 PM)</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 mb-4">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">Address Line 1 <span className="text-[#8e2a2a]">*</span></label>
                        <input type="text" placeholder="E.g., Flat 301, Silver Crest Apartments" value={formLine1} onChange={e => setFormLine1(e.target.value)} className="input-field" required />
                      </div>

                      <div className="flex flex-col gap-1.5 mb-4">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">Address Line 2 <span className="text-[#777971] normal-case tracking-normal">(Optional)</span></label>
                        <input type="text" placeholder="E.g., Landmark, Street, Sector" value={formLine2} onChange={e => setFormLine2(e.target.value)} className="input-field" />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">Landmark</label>
                          <input type="text" placeholder="Near Park" value={formLandmark} onChange={e => setFormLandmark(e.target.value)} className="input-field" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">City <span className="text-[#8e2a2a]">*</span></label>
                          <input type="text" placeholder="Bengaluru" value={formCity} onChange={e => setFormCity(e.target.value)} className="input-field" required />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">State <span className="text-[#8e2a2a]">*</span></label>
                          <input type="text" placeholder="Karnataka" value={formState} onChange={e => setFormState(e.target.value)} className="input-field" required />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">PIN Code <span className="text-[#8e2a2a]">*</span></label>
                          <input type="text" placeholder="560066" value={formPincode} onChange={e => setFormPincode(e.target.value)} className="input-field" required />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 mb-5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">Instructions for Delivery Carrier</label>
                        <textarea placeholder="E.g., Leave package with security guard, ring bell twice..." value={formInstructions} onChange={e => setFormInstructions(e.target.value)} rows={2} className="input-field resize-y" />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button type="button" onClick={resetAddressForm} className="btn-secondary min-h-[40px] px-5 text-xs font-semibold uppercase tracking-wider rounded-[2px]">
                          Cancel
                        </button>
                        <button type="submit" disabled={isSavingAddress} className="btn-primary min-h-[40px] px-6 text-xs font-semibold uppercase tracking-wider rounded-[2px] flex items-center gap-2 disabled:opacity-50">
                          {isSavingAddress ? (
                            <>
                              <Loader2 size={13} className="animate-spin text-white" />
                              <span>Registering Address...</span>
                            </>
                          ) : (
                            <span>Save Coordinates</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Step 2 Footer Summary */}
                {!addressFormOpen && (
                  <div className="p-4 bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px] flex items-center justify-between text-xs text-[#777971] flex-wrap gap-2 select-none">
                    <span className="flex items-center gap-1.5 font-medium text-[#262824]">
                      <MapPin size={14} className="text-[#262824] shrink-0" />
                      {selectedAddressId ? 'Address selected for delivery' : 'Please select or register a delivery address'}
                    </span>
                    <span className="text-[#777971]">
                      Proceed using the Order Summary on the right &rarr;
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════ STEP 3: DELIVERY METHOD ══════════════════ */}
            {checkoutStep === 'delivery' && (
              <div className="flex flex-col gap-6 animate-fadeIn select-none">
                <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6">
                  <h3 className="text-base font-display font-semibold text-[#262824] tracking-tight mb-1">Choose Shipment Speed</h3>
                  <p className="text-xs text-[#777971] mb-5 font-medium">Select your preferred delivery timeline and packaging speed</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(Object.keys(deliveryMethods) as Array<keyof typeof deliveryMethods>).map(key => {
                      const m = deliveryMethods[key];
                      const isSelected = deliveryMethod === key;
                      const Icon = m.icon;
                      
                      // Calculate method fee
                      const fee = key === 'standard' && (subtotal - discountDeduction) >= 499 ? 0 : m.price;

                      return (
                        <div
                          key={key}
                          onClick={() => setDeliveryMethod(key)}
                          className={`rounded-[2px] p-5 cursor-pointer relative transition-all flex flex-col justify-between items-start gap-4 ${
                            isSelected 
                              ? 'border border-[#262824] bg-[#eeede7]/30 ring-1 ring-[#262824]' 
                              : 'border border-[#dfdfd8] bg-white hover:border-[#777971]'
                          }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <div className={`w-9 h-9 rounded-[2px] flex items-center justify-center ${
                              isSelected ? 'bg-[#262824] text-[#f7f6f2]' : 'bg-[#f7f6f2] text-[#262824]'
                            }`}>
                              <Icon size={16} />
                            </div>
                            <span className="text-xs font-semibold text-[#262824]">
                              {fee === 0 ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3d6547] bg-[#edf3ee] border border-[#a8c6b0] px-2 py-0.5 rounded-[2px]">
                                  FREE
                                </span>
                              ) : (
                                `₹${fee}`
                              )}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold text-[#262824] leading-tight">{m.label}</h4>
                            <p className="text-xs text-[#3d6547] font-medium mt-1">{m.time}</p>
                            <p className="text-xs text-[#777971] mt-1 leading-normal">{m.desc}</p>
                          </div>

                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center self-end ${
                            isSelected ? 'border-[#262824] bg-[#262824] text-[#f7f6f2]' : 'border-[#dfdfd8] bg-white text-transparent'
                          }`}>
                            <Check size={10} strokeWidth={2.5} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3 Footer Summary */}
                <div className="p-4 bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px] flex items-center justify-between text-xs text-[#777971] flex-wrap gap-2 select-none">
                  <span className="flex items-center gap-1.5 font-medium text-[#262824]">
                    <Truck size={14} className="text-[#262824] shrink-0" />
                    Selected: <strong className="text-[#262824] font-semibold">{deliveryMethods[deliveryMethod].label} ({deliveryMethods[deliveryMethod].time})</strong>
                  </span>
                  <span className="text-[#777971]">
                    Proceed using the Order Summary on the right &rarr;
                  </span>
                </div>
              </div>
            )}

            {/* ══════════════════ STEP 4: ORDER REVIEW ══════════════════ */}
            {checkoutStep === 'review' && (
              <div className="flex flex-col gap-6 animate-fadeIn">

                {/* Out of Stock Warning Banner in Review */}
                {checkoutHasOutOfStock && (
                  <div className="bg-[#f9eded] border border-[#d9a5a5] rounded-[2px] p-5 text-[#8e2a2a] animate-fadeIn">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-[2px] bg-white border border-[#d9a5a5] flex items-center justify-center shrink-0 text-[#8e2a2a]">
                        <AlertCircle size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-[#8e2a2a]">Out of Stock Alert</h4>
                        <p className="text-xs text-[#8e2a2a] mt-1 leading-relaxed">
                          One or more items in your order are currently out of stock or have insufficient available quantity. Payment cannot proceed until resolved.
                        </p>
                        <button
                          type="button"
                          onClick={() => setCheckoutStep('cart')}
                          className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#8e2a2a] hover:bg-black px-4 py-2 rounded-[2px] transition-colors cursor-pointer"
                        >
                          <ArrowLeft size={13} />
                          <span>Return to Bag to Update</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Coordinates review */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Selected Address card */}
                  <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 flex flex-col justify-between select-none">
                    <div>
                      <div className="flex items-center justify-between mb-3.5 border-b border-[#dfdfd8] pb-2.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#777971] flex items-center gap-1.5">
                          <MapPin size={13} className="text-[#262824]" /> Delivery Destination
                        </span>
                        <button
                          type="button"
                          onClick={() => setCheckoutStep('address')}
                          className="text-xs font-semibold uppercase tracking-wider text-[#262824] hover:underline cursor-pointer py-1"
                        >
                          Change
                        </button>
                      </div>
                      
                      {(() => {
                        const addr = addresses.find(a => a.id === selectedAddressId) || addresses[0];
                        if (!addr) return <p className="text-xs text-[#777971] font-semibold">No address registered</p>;
                        return (
                          <div>
                            <h4 className="text-sm font-semibold text-[#262824]">{addr.name}</h4>
                            <p className="text-xs text-[#777971] mt-0.5">{addr.phone}</p>
                            <p className="text-xs sm:text-sm text-[#262824] mt-2 leading-relaxed">
                              {addr.addressLine1}
                              {addr.addressLine2 && `, ${addr.addressLine2}`}
                            </p>
                            <p className="text-xs sm:text-sm text-[#777971] font-medium">{addr.city}, {addr.state} — {addr.pincode}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Selected Delivery Method card */}
                  <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 flex flex-col justify-between select-none">
                    <div>
                      <div className="flex items-center justify-between mb-3.5 border-b border-[#dfdfd8] pb-2.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#777971] flex items-center gap-1.5">
                          <Truck size={13} className="text-[#262824]" /> Shipment Method
                        </span>
                        <button
                          type="button"
                          onClick={() => setCheckoutStep('delivery')}
                          className="text-xs font-semibold uppercase tracking-wider text-[#262824] hover:underline cursor-pointer py-1"
                        >
                          Change
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 bg-[#262824] text-[#f7f6f2] rounded-[2px] flex items-center justify-center">
                          {React.createElement(deliveryMethods[deliveryMethod].icon, { size: 16 })}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-[#262824]">{deliveryMethods[deliveryMethod].label}</h4>
                          <p className="text-xs text-[#3d6547] font-medium mt-0.5">{deliveryMethods[deliveryMethod].time}</p>
                          <p className="text-xs text-[#777971] mt-0.5 font-medium">Shipping Fee: {shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Products card list review */}
                <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6">
                  <div className="flex justify-between items-center mb-4 border-b border-[#dfdfd8] pb-3 select-none">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#777971] flex items-center gap-1.5">
                      <ShoppingCart size={13} className="text-[#262824]" /> Packaged Products ({totalItemQty})
                    </span>
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('cart')}
                      className="text-xs font-semibold uppercase tracking-wider text-[#262824] hover:underline cursor-pointer py-1"
                    >
                      Modify Bag
                    </button>
                  </div>

                  <div className="divide-y divide-[#dfdfd8]">
                    {checkoutItems.map((item) => {
                      const isItemOutOfStock = (item.product.stock ?? 0) <= 0;
                      return (
                        <div key={item.product.id} className="flex gap-4 items-center py-3.5 first:pt-0 last:pb-0">
                          <div className="w-14 h-16 rounded-[2px] border border-[#dfdfd8] overflow-hidden bg-white p-1.5 flex items-center justify-center shrink-0">
                            {item.product.imgs?.length > 0 ? (
                              <img src={item.product.imgs[0]} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                            ) : (
                              <Package size={16} className="text-[#777971]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-[#262824] truncate">{item.product.name}</h4>
                              {isItemOutOfStock && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8e2a2a] bg-[#f9eded] border border-[#d9a5a5] px-1.5 py-0.5 rounded-[2px] shrink-0">
                                  Out of Stock
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#777971] mt-0.5">Qty: {item.quantity} × ₹{item.product.price.toLocaleString('en-IN')}</p>
                          </div>
                          <span className="text-sm font-display font-semibold text-[#262824] shrink-0">
                            ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Additional instructions note option */}
                <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824] block mb-2 select-none">
                    Add Checkout Remarks or Special Instructions
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Call before delivery, ring bell twice..."
                    value={customerNotes}
                    onChange={e => setCustomerNotes(e.target.value)}
                    className="input-field"
                  />
                </div>

                {/* Step 4 Footer Summary */}
                <div className="p-4 bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px] flex items-center justify-between text-xs text-[#777971] flex-wrap gap-2 select-none">
                  <span className="flex items-center gap-1.5 font-medium text-[#262824]">
                    <CheckCircle size={14} className="text-[#3d6547] shrink-0" />
                    All items &amp; dispatch coordinates verified
                  </span>
                  <span className="text-[#777971]">
                    Proceed using the Order Summary on the right &rarr;
                  </span>
                </div>
              </div>
            )}

            {/* ══════════════════ STEP 5: SECURE PAYMENT METHOD ══════════════════ */}
            {checkoutStep === 'payment' && (
              <div className="flex flex-col gap-6 animate-fadeIn">

                {/* Payment Error / Out of Stock Intimation Alert */}
                {paymentError && (
                  <div className="bg-[#f9eded] border border-[#d9a5a5] rounded-[2px] p-5 sm:p-6 text-[#8e2a2a] animate-fadeIn">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-[2px] bg-white border border-[#d9a5a5] flex items-center justify-center shrink-0 text-[#8e2a2a]">
                        <AlertCircle size={22} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="text-base font-semibold text-[#8e2a2a]">
                            {paymentError.isOutOfStock ? 'Payment Stopped: Product Out of Stock' : 'Payment Processing Failed'}
                          </h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#d9a5a5]/30 text-[#8e2a2a] px-2 py-0.5 rounded-[2px]">
                            Action Required
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[#8e2a2a] mt-1.5 leading-relaxed font-medium">
                          {paymentError.message}
                        </p>
                        <p className="text-xs text-[#8e2a2a]/80 mt-2 leading-relaxed">
                          {paymentError.isOutOfStock
                            ? 'Another customer completed their checkout just before yours for the last available stock. No funds have been deducted from your account or method.'
                            : 'Please check your payment information or select another payment method to try again.'}
                        </p>
                        <div className="flex items-center gap-3 mt-4 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentError(null);
                              setCheckoutStep('cart');
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#8e2a2a] hover:bg-black px-4 py-2.5 rounded-[2px] transition-colors cursor-pointer"
                          >
                            <ArrowLeft size={13} />
                            <span>Return to Bag to Review Items</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentError(null)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8e2a2a] hover:underline px-3.5 py-2.5 rounded-[2px] transition-colors cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pre-payment Out of Stock Alert */}
                {!paymentError && checkoutHasOutOfStock && (
                  <div className="bg-[#f9eded] border border-[#d9a5a5] rounded-[2px] p-5 text-[#8e2a2a] animate-fadeIn">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-[2px] bg-white border border-[#d9a5a5] flex items-center justify-center shrink-0 text-[#8e2a2a]">
                        <AlertCircle size={22} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-[#8e2a2a]">Item Out of Stock</h4>
                        <p className="text-xs text-[#8e2a2a] mt-1 leading-relaxed">
                          One or more items in your order are currently out of stock. Payment cannot be initiated until out-of-stock items are removed.
                        </p>
                        <button
                          type="button"
                          onClick={() => setCheckoutStep('cart')}
                          className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-[#8e2a2a] hover:bg-black px-4 py-2 rounded-[2px] transition-colors cursor-pointer"
                        >
                          <ArrowLeft size={13} />
                          <span>Return to Bag to Update</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 select-none">
                  <h3 className="text-base font-display font-semibold text-[#262824] tracking-tight mb-1">Payment Method</h3>
                  <p className="text-xs text-[#777971] mb-6 font-medium">Safe and encrypted checkout options</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
                    {[
                      { key: 'UPI', label: 'UPI / QR Apps', icon: Smartphone },
                      { key: 'Card', label: 'Credit / Debit Card', icon: CreditCard },
                      { key: 'COD', label: 'Cash on Delivery', icon: Banknote }
                    ].map(opt => {
                      const isSelected = paymentOption === opt.key;
                      const Icon = opt.icon;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => setPaymentOption(opt.key as any)}
                          className={`rounded-[2px] p-4 cursor-pointer text-center flex flex-col items-center justify-center gap-2.5 transition-all ${
                            isSelected 
                              ? 'border border-[#262824] bg-[#262824] text-[#f7f6f2] font-semibold' 
                              : 'border border-[#dfdfd8] bg-white hover:border-[#777971] text-[#262824]'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center ${
                            isSelected ? 'bg-white/10 text-white' : 'bg-[#f7f6f2] text-[#262824]'
                          }`}>
                            <Icon size={16} />
                          </div>
                          <span className="text-xs uppercase tracking-wider">{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected payment content panels */}
                  
                  {/* UPI */}
                  {paymentOption === 'UPI' && (
                    <div className="border border-[#dfdfd8] rounded-[2px] p-5 sm:p-6 bg-[#f7f6f2] animate-fadeIn">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#262824] block mb-3">Preferred UPI Application</span>
                      <div className="flex gap-2.5 flex-wrap mb-4">
                        {(['GPay', 'PhonePe', 'Paytm', 'BHIM'] as const).map(app => (
                          <button
                            key={app}
                            type="button"
                            onClick={() => {
                              setUpiApp(app);
                              const base = upiId.includes('@') ? upiId.split('@')[0] : upiId;
                              const suffix = app === 'GPay' ? '@okaxis' : app === 'PhonePe' ? '@ybl' : app === 'Paytm' ? '@paytm' : '@upi';
                              if (base) {
                                setUpiId(`${base}${suffix}`);
                              }
                            }}
                            className={`text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-[2px] border transition-all cursor-pointer min-h-[38px] ${
                              upiApp === app ? 'bg-[#262824] text-[#f7f6f2] border-[#262824]' : 'bg-white border-[#dfdfd8] text-[#262824] hover:border-[#777971]'
                            }`}
                          >
                            {app}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col gap-1.5 mb-4">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824] flex items-center justify-between">
                          <span>Enter VPA (UPI ID)</span>
                          {upiApp && <span className="text-[10px] text-[#777971] normal-case">Target App: <strong>{upiApp}</strong></span>}
                        </label>
                        <input
                          type="text"
                          placeholder={upiApp === 'PhonePe' ? 'yourmobile@ybl' : upiApp === 'Paytm' ? 'yourmobile@paytm' : upiApp === 'BHIM' ? 'yourmobile@upi' : 'yourname@okaxis'}
                          value={upiId}
                          onChange={e => {
                            const val = e.target.value;
                            setUpiId(val);
                            if (val.includes('@okaxis') || val.includes('@okhdfc') || val.includes('@oksbi')) setUpiApp('GPay');
                            else if (val.includes('@ybl') || val.includes('@ibl') || val.includes('@axl')) setUpiApp('PhonePe');
                            else if (val.includes('@paytm')) setUpiApp('Paytm');
                            else if (val.includes('@upi')) setUpiApp('BHIM');
                          }}
                          className="input-field"
                        />
                        <p className="text-[11px] text-[#777971] mt-1 leading-relaxed">
                          A direct payment collect request will be sent to this UPI ID. You will approve the payment inside your UPI app to place the order.
                        </p>
                      </div>

                      <div className="border-t border-[#dfdfd8] mt-4 pt-3.5">
                        <span className="text-[10px] font-bold text-[#777971] uppercase tracking-wider block mb-2">Saved / Recent VPAs</span>
                        <div className="flex flex-col gap-2">
                          {mockRecentUpi.map(handle => (
                            <div
                              key={handle}
                              onClick={() => {
                                setUpiId(handle);
                                if (handle.includes('@okaxis')) setUpiApp('GPay');
                                else if (handle.includes('@paytm')) setUpiApp('Paytm');
                                else if (handle.includes('@ybl')) setUpiApp('PhonePe');
                                else if (handle.includes('@upi')) setUpiApp('BHIM');
                              }}
                              className="text-xs font-mono text-[#262824] hover:underline cursor-pointer flex items-center gap-2 py-1"
                            >
                              <CheckCircle size={12} className="text-[#3d6547]" /> <span>{handle}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CARD */}
                  {paymentOption === 'Card' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border border-[#dfdfd8] rounded-[2px] p-5 sm:p-6 bg-[#f7f6f2] animate-fadeIn">
                      
                      {/* Premium Card Preview */}
                      <div className="bg-[#262824] rounded-[2px] p-6 text-white relative overflow-hidden flex flex-col justify-between min-h-[190px] border border-[#262824]">
                        <div className="flex justify-between items-start relative z-10">
                          <div className="w-8 h-6 bg-[#dfdfd8] rounded-[2px]" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#dfdfd8]">
                            DEBIT / CREDIT
                          </span>
                        </div>

                        <div className="relative z-10 my-auto py-2">
                          <p className="font-mono text-base tracking-[0.2em] text-center text-white font-medium">
                            {cardNumber || '•••• •••• •••• ••••'}
                          </p>
                        </div>
                        
                        <div className="flex justify-between items-end relative z-10">
                          <div>
                            <p className="text-[9px] text-[#777971] uppercase tracking-wider font-semibold">Cardholder</p>
                            <p className="text-xs font-mono uppercase tracking-wider">{cardHolder || 'AMIT PATEL'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-[#777971] uppercase tracking-wider font-semibold">Expiry</p>
                            <p className="text-xs font-mono">{cardExpiry || 'MM/YY'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Card Inputs block */}
                      <div className="flex flex-col gap-3.5">
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824] mb-1.5 block">Card Number</label>
                          <input
                            type="text"
                            placeholder="1234 5678 9101 1121"
                            value={cardNumber}
                            onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                            maxLength={19}
                            className="input-field font-mono"
                          />
                        </div>
                        
                        <div>
                          <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824] mb-1.5 block">Cardholder Name</label>
                          <input
                            type="text"
                            placeholder="As printed on card"
                            value={cardHolder}
                            onChange={e => setCardHolder(e.target.value.toUpperCase())}
                            className="input-field uppercase"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824] mb-1.5 block">Expiry Date</label>
                            <input
                              type="text"
                              placeholder="MM/YY"
                              value={cardExpiry}
                              onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                              maxLength={5}
                              className="input-field font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824] mb-1.5 block">CVV Secure</label>
                            <input
                              type="password"
                              placeholder="•••"
                              value={cardCvv}
                              onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                              maxLength={3}
                              className="input-field font-mono"
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={saveCard}
                            onChange={e => setSaveCard(e.target.checked)}
                            className="accent-[#262824] h-4 w-4 rounded-[2px] cursor-pointer"
                          />
                          <span className="text-xs text-[#262824]">Save card for future checkout</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* COD */}
                  {paymentOption === 'COD' && (
                    <div className="border border-[#dfdfd8] rounded-[2px] p-6 bg-[#f7f6f2] animate-fadeIn">
                      <div className="flex gap-3.5 items-start">
                        <AlertCircle size={18} className="text-[#262824] mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-sm font-semibold text-[#262824]">Cash on Delivery details</h4>
                          <p className="text-xs text-[#777971] mt-1.5 leading-relaxed">
                            Our carrier executive will handover your parcel and accept cash payment on delivery. Please have the exact sum of <strong className="text-[#262824] font-semibold">₹{grandTotal.toLocaleString('en-IN')}</strong> available.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Step 5 Footer Summary */}
                <div className="p-4 bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px] flex items-center justify-between text-xs text-[#777971] flex-wrap gap-2 select-none">
                  <span className="flex items-center gap-1.5 font-medium text-[#262824]">
                    <ShieldCheck size={14} className="text-[#3d6547] shrink-0" />
                    Safe &amp; Secure Checkout
                  </span>
                  <span className="text-[#777971]">
                    Click &ldquo;Pay &amp; Confirm Order&rdquo; on Order Summary to complete &rarr;
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Right Column Sticky Summary details panel */}
          <aside className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 flex flex-col gap-0 sticky top-[96px] self-start select-none">
            <div className="flex items-center justify-between border-b border-[#dfdfd8] pb-3 mb-5">
              <h4 className="text-[11px] font-bold text-[#777971] uppercase tracking-wider">
                Order Summary
              </h4>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3d6547] bg-[#edf3ee] border border-[#a8c6b0] px-2 py-0.5 rounded-[2px]">
                Encrypted
              </span>
            </div>

            {/* Coupons section - Optional input */}
            <div className="pb-5">
              {activeCoupon ? (
                <div className="flex justify-between items-center bg-[#edf3ee] border border-[#a8c6b0] rounded-[2px] px-3.5 py-2.5 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-[2px] bg-white text-[#3d6547] flex items-center justify-center border border-[#a8c6b0]">
                      <Gift size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#262824] font-mono tracking-wider">{activeCoupon.code}</p>
                      <p className="text-[11px] text-[#3d6547] font-medium">{activeCoupon.discount}% discount applied</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-[#777971] hover:text-[#8e2a2a] uppercase font-semibold tracking-wider cursor-pointer py-1 px-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#262824]">
                    Promo Coupon <span className="text-[10px] text-[#777971] normal-case tracking-normal">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. CLEAN10"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      className="input-field uppercase font-mono tracking-wider text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="btn-primary min-h-[42px] px-4 text-xs font-semibold uppercase tracking-wider shrink-0 cursor-pointer rounded-[2px]"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-[#8e2a2a] mt-0.5">{couponError}</p>}
                </div>
              )}
            </div>

            {/* Calculation breakdowns */}
            <div className="space-y-3 border-t border-[#dfdfd8] pt-4 text-xs">
              <div className="flex justify-between text-[#777971]">
                <span>Subtotal ({totalItemQty} items)</span>
                <span className="font-semibold text-[#262824]">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              
              {activeCoupon && (
                <div className="flex justify-between text-[#3d6547] font-medium">
                  <span>Coupon Discount ({activeCoupon.discount}%)</span>
                  <span className="font-semibold">−₹{discountDeduction.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-[#777971]">
                <span>GST Taxes (18%)</span>
                <span className="font-semibold text-[#262824]">₹{taxesGst.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-[#777971]">
                <span>Shipment &amp; Dispatch</span>
                {shippingFee === 0 ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#3d6547] bg-[#edf3ee] border border-[#a8c6b0] px-2 py-0.5 rounded-[2px]">
                    FREE
                  </span>
                ) : (
                  <span className="font-semibold text-[#262824]">₹{shippingFee.toLocaleString('en-IN')}</span>
                )}
              </div>

              {shippingFee > 0 && deliveryMethod === 'standard' && (
                <div className="p-3 bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px] text-xs text-[#777971] flex items-center gap-2">
                  <Gift size={13} className="text-[#8c571e] shrink-0" />
                  <span>Add ₹{499 - (subtotal - discountDeduction)} more for free delivery</span>
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-baseline border-t border-[#dfdfd8] mt-5 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#262824]">Grand Total</span>
              <span className="text-2xl font-display font-semibold text-[#262824] tracking-tight">
                ₹{grandTotal.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Dynamic Step Action Buttons */}
            {checkoutStep === 'cart' && (
              cartHasOutOfStock ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[44px] mt-6 w-full flex items-center justify-center gap-2 rounded-[2px] text-xs font-semibold uppercase tracking-wider bg-[#eeede7] text-[#777971] border border-[#dfdfd8] cursor-not-allowed select-none"
                >
                  <AlertCircle size={14} />
                  <span>Items Out of Stock</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!curUser) {
                      showToast('Authentication required. Please sign in to proceed to address selection.');
                      openAuthModal('login');
                    } else {
                      setCheckoutStep('address');
                    }
                  }}
                  className="btn-primary min-h-[44px] mt-6 w-full flex items-center justify-center gap-2 group cursor-pointer text-xs font-semibold uppercase tracking-wider rounded-[2px]"
                >
                  <span>{aloneProductId !== null ? 'Proceed to Buy This Alone' : 'Proceed to Address'}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              )
            )}

            {checkoutStep === 'address' && !addressFormOpen && (
              <button
                type="button"
                disabled={!selectedAddressId}
                onClick={() => setCheckoutStep('delivery')}
                className={`btn-primary min-h-[44px] mt-6 w-full flex items-center justify-center gap-2 group cursor-pointer text-xs font-semibold uppercase tracking-wider rounded-[2px] ${
                  !selectedAddressId ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span>Deliver to this Address</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {checkoutStep === 'delivery' && (
              <button
                type="button"
                onClick={() => setCheckoutStep('review')}
                className="btn-primary min-h-[44px] mt-6 w-full flex items-center justify-center gap-2 group cursor-pointer text-xs font-semibold uppercase tracking-wider rounded-[2px]"
              >
                <span>Proceed to Order Review</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {checkoutStep === 'review' && (
              checkoutHasOutOfStock ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[44px] mt-6 w-full flex items-center justify-center gap-2 rounded-[2px] text-xs font-semibold uppercase tracking-wider bg-[#eeede7] text-[#777971] border border-[#dfdfd8] cursor-not-allowed select-none"
                >
                  <AlertCircle size={14} />
                  <span>Item Out of Stock</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCheckoutStep('payment')}
                  className="btn-primary min-h-[44px] mt-6 w-full flex items-center justify-center gap-2 group cursor-pointer text-xs font-semibold uppercase tracking-wider rounded-[2px]"
                >
                  <span>Proceed to Payment</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              )
            )}

            {checkoutStep === 'payment' && (
              checkoutHasOutOfStock ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[44px] mt-6 w-full flex items-center justify-center gap-2 rounded-[2px] text-xs font-semibold uppercase tracking-wider bg-[#eeede7] text-[#777971] border border-[#dfdfd8] cursor-not-allowed select-none"
                >
                  <AlertCircle size={14} />
                  <span>Item Out of Stock — Cannot Pay</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessingUpi}
                  onClick={triggerPaymentSimulation}
                  className={`btn-primary min-h-[44px] mt-6 w-full flex items-center justify-center gap-2 group text-xs font-semibold uppercase tracking-wider rounded-[2px] ${
                    isProcessingUpi ? 'opacity-80 cursor-wait' : 'cursor-pointer'
                  }`}
                >
                  {isProcessingUpi ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{paymentOption === 'Card' ? 'Connecting to Card Gateway...' : 'Connecting to UPI Gateway...'}</span>
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      <span>Pay &amp; Confirm Order</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              )
            )}

            {/* Trust Badges */}
            <div className="mt-6 space-y-2 border-t border-[#dfdfd8] pt-5">
              {[
                { icon: Lock, text: 'Safe & secure encrypted checkout' },
                { icon: Zap, text: 'Same-day packaging & fast dispatch' },
                { icon: ShieldCheck, text: '7-day replacement warranty guarantee' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-xs text-[#777971] font-medium">
                  <Icon size={13} className="text-[#262824] shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </aside>

        </div>
      )}

      {/* ══════════════════ UPI PAYMENT COLLECT MODAL ══════════════════ */}
      {upiCollectModalOpen && upiCollectDetails && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 sm:p-8 max-w-[460px] w-full shadow-2xl relative select-none animate-fadeIn">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-[#edf3ee] border border-[#a8c6b0] text-[#3d6547] flex items-center justify-center mx-auto mb-3 animate-pulse">
                <Smartphone size={26} />
              </div>
              <h3 className="text-lg font-display font-semibold text-[#262824]">UPI Payment Request Sent</h3>
              <p className="text-xs text-[#777971] mt-1 font-medium">
                A collect request has been dispatched to your {upiCollectDetails.app} account
              </p>
            </div>

            {/* Target App & VPA Box */}
            <div className="bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px] p-4 mb-5 flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#777971] font-medium">Selected UPI App:</span>
                <span className="font-semibold text-[#262824] bg-white border border-[#dfdfd8] px-2.5 py-0.5 rounded-[2px]">
                  {upiCollectDetails.app}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#777971] font-medium">Target UPI ID (VPA):</span>
                <span className="font-mono font-semibold text-[#262824] bg-white border border-[#dfdfd8] px-2.5 py-0.5 rounded-[2px]">
                  {upiCollectDetails.vpa}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2.5 border-t border-[#dfdfd8]">
                <span className="text-[#777971] font-medium">Total Amount to Pay:</span>
                <span className="font-display font-bold text-base text-[#262824]">
                  ₹{upiCollectDetails.amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Interactive Steps */}
            <div className="space-y-2.5 mb-6 text-xs text-[#262824]">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#262824] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <span>Open <strong>{upiCollectDetails.app}</strong> on your phone.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#262824] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <span>Check incoming collect request from <strong>Clean Everyday</strong> for ₹{upiCollectDetails.amount.toLocaleString('en-IN')}.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#262824] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <span>Enter your 4 or 6-digit UPI PIN to approve the transaction.</span>
              </div>
            </div>

            {/* Live Timer & Polling Indicator */}
            <div className="bg-[#edf3ee] border border-[#a8c6b0] rounded-[2px] p-3 mb-6 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#3d6547] font-medium">
                <Loader2 size={14} className="animate-spin text-[#3d6547]" />
                <span>Awaiting your bank PIN approval...</span>
              </div>
              <span className="font-mono font-bold text-[#3d6547] text-sm">
                {formatUpiTime(upiTimerSeconds)}
              </span>
            </div>

            {/* Mobile / Fallback Action Buttons */}
            <div className="flex flex-col gap-2">
              <a
                href={`upi://pay?pa=success@razorpay&pn=CleanEveryday&am=${upiCollectDetails.amount}&cu=INR&tn=${upiCollectDetails.razorpayOrderId}`}
                className="btn-primary min-h-[42px] w-full flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider rounded-[2px] cursor-pointer"
              >
                <Smartphone size={14} />
                <span>Open {upiCollectDetails.app} App Directly</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setUpiCollectModalOpen(false);
                  setIsProcessingUpi(false);
                  showToast('UPI collect request was cancelled.');
                }}
                className="min-h-[38px] w-full flex items-center justify-center text-xs font-semibold uppercase tracking-wider text-[#777971] hover:text-[#8e2a2a] cursor-pointer"
              >
                Cancel &amp; Modify UPI ID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ FULL-PAGE ANIMATED PROCESS LOADER ══════════════════ */}
      {checkoutStep === 'processing' && (
        <div className="fixed inset-0 z-[99999] w-screen h-screen bg-[#070B14] text-white flex flex-col items-center justify-center p-6 select-none overflow-hidden">
          {/* Ambient Lighting */}
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-md w-full flex flex-col items-center text-center relative z-10 animate-fadeIn">
            {/* 3-Step Pill Tracker */}
            <div className="flex items-center gap-1.5 sm:gap-2 mb-10 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              {[
                { label: 'Payment', idx: 0 },
                { label: 'Packed', idx: 1 },
                { label: 'Dispatched', idx: 2 },
              ].map((st, i) => {
                const isPassed = processingIndex > st.idx;
                const isCurrent = processingIndex === st.idx;
                return (
                  <React.Fragment key={st.label}>
                    {i > 0 && (
                      <div className={`w-3 sm:w-5 h-[2px] transition-colors duration-500 ${isPassed ? 'bg-emerald-400' : 'bg-white/15'}`} />
                    )}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                          isPassed
                            ? 'bg-emerald-400 text-slate-950'
                            : isCurrent
                            ? 'bg-white text-slate-950 ring-4 ring-white/20 scale-110'
                            : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {isPassed ? <Check size={11} strokeWidth={3} /> : st.idx + 1}
                      </div>
                      <span className={`text-[11px] font-semibold transition-colors duration-500 ${isCurrent ? 'text-white font-bold' : isPassed ? 'text-emerald-400' : 'text-white/40'}`}>
                        {st.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Stage Animation Display Centerpiece */}
            <div className="relative w-44 h-44 mb-8 flex items-center justify-center">
              {/* Spinning Ambient Halo */}
              <div className="absolute inset-0 rounded-full border border-dashed border-white/15 animate-haloSpin" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-emerald-500/15 via-blue-500/10 to-indigo-500/15 blur-xl animate-pulseRing" />

              {/* Stage 0: Payment Confirmed */}
              {processingIndex === 0 && (
                <div className="relative flex flex-col items-center justify-center animate-scaleIn">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 shadow-2xl shadow-emerald-500/30">
                    <ShieldCheck size={48} strokeWidth={2.2} />
                  </div>
                  <span className="absolute -bottom-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-400 text-slate-950 shadow-sm flex items-center gap-1">
                    <Check size={10} strokeWidth={3} /> Verified
                  </span>
                </div>
              )}

              {/* Stage 1: Order Packed */}
              {processingIndex === 1 && (
                <div className="relative flex flex-col items-center justify-center animate-boxSeal">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-2xl shadow-amber-500/30">
                    <Package size={48} strokeWidth={2} />
                  </div>
                  <span className="absolute -bottom-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1">
                    <Check size={10} strokeWidth={3} /> Sealed
                  </span>
                </div>
              )}

              {/* Stage 2: Loaded into Delivery Truck */}
              {processingIndex === 2 && (
                <div className="relative flex flex-col items-center justify-center w-full animate-fadeIn">
                  <div className="animate-truckDrive flex flex-col items-center">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30">
                      <Truck size={46} strokeWidth={2} />
                    </div>
                  </div>
                  {/* Moving Road Dashes */}
                  <div className="w-32 h-1 overflow-hidden relative mt-2 rounded-full bg-white/10">
                    <div className="absolute inset-0 w-[200%] flex items-center justify-around animate-roadDash">
                      <span className="w-3 h-0.5 bg-blue-400 rounded-full inline-block" />
                      <span className="w-3 h-0.5 bg-blue-400 rounded-full inline-block" />
                      <span className="w-3 h-0.5 bg-blue-400 rounded-full inline-block" />
                      <span className="w-3 h-0.5 bg-blue-400 rounded-full inline-block" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Stage Typography */}
            <div className="space-y-2 mb-8 min-h-[70px]">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {processingIndex === 0 && 'Payment Confirmed'}
                {processingIndex === 1 && 'Order Packed & Sealed'}
                {processingIndex === 2 && 'Handed Over to Delivery Carrier'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed font-normal">
                {processingIndex === 0 && 'Transaction securely authorized. Order registered with fulfillment ledger.'}
                {processingIndex === 1 && 'Items inspected, verified, and secured in protective casing.'}
                {processingIndex === 2 && 'Loaded onto carrier vehicle. In transit for doorstep delivery.'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-blue-400 to-indigo-400 transition-all duration-700 ease-out"
                style={{ width: processingIndex === 0 ? '35%' : processingIndex === 1 ? '70%' : '100%' }}
              />
            </div>
            <p className="text-xs text-slate-400 font-medium">Securing your order... Please do not refresh.</p>
          </div>
        </div>
      )}

      {/* ══════════════════ STEP 7: DEDICATED ORDER CONFIRMATION SCREEN ══════════════════ */}
      {checkoutStep === 'success' && placedOrderSummary && (
        <div className="max-w-[760px] mx-auto py-10 px-4 sm:px-6 animate-fadeIn select-none font-body">
          {/* Confetti particles */}
          {Array.from({ length: 24 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}

          {/* Clean Main Confirmation Card */}
          <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-6 sm:p-10 text-center space-y-6">
            {/* Celebration Icon */}
            <div className="w-16 h-16 rounded-[2px] bg-[#edf3ee] border border-[#a8c6b0] flex items-center justify-center mx-auto text-[#3d6547]">
              <CheckCircle size={32} strokeWidth={2} />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] text-[10px] font-bold uppercase tracking-widest bg-[#edf3ee] text-[#3d6547] border border-[#a8c6b0]">
                <Check size={12} strokeWidth={2.5} /> Order Confirmed
              </span>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[#262824] tracking-tight">
                Order Placed Successfully
              </h1>
              <p className="text-xs sm:text-sm text-[#777971] max-w-md mx-auto leading-relaxed">
                Thank you for your purchase. We’ve received your order and our fulfillment team has prepared it for fast delivery.
              </p>
            </div>

            {/* Fulfillment Status Stepper Preview */}
            <div className="p-4 sm:p-5 bg-[#f7f6f2] border border-[#dfdfd8] rounded-[2px]">
              <div className="flex items-center justify-between text-xs font-semibold text-[#262824] mb-3 px-1">
                <span className="uppercase tracking-wider text-[11px] text-[#777971]">Fulfillment Status</span>
                <span className="text-[#3d6547] font-semibold flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3d6547] animate-ping inline-block" />
                  Dispatched &amp; In Transit
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] sm:text-xs">
                <div className="space-y-1.5">
                  <div className="w-7 h-7 rounded-full bg-[#262824] text-[#f7f6f2] flex items-center justify-center mx-auto text-xs font-bold">
                    <Check size={12} strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold text-[#262824] block">Payment Verified</span>
                </div>
                <div className="space-y-1.5">
                  <div className="w-7 h-7 rounded-full bg-[#262824] text-[#f7f6f2] flex items-center justify-center mx-auto text-xs font-bold">
                    <Check size={12} strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold text-[#262824] block">Packed &amp; Sealed</span>
                </div>
                <div className="space-y-1.5">
                  <div className="w-7 h-7 rounded-full bg-[#262824] text-[#f7f6f2] flex items-center justify-center mx-auto text-xs font-bold">
                    <Truck size={12} strokeWidth={2} />
                  </div>
                  <span className="font-semibold text-[#262824] block">Dispatched</span>
                </div>
                <div className="space-y-1.5">
                  <div className="w-7 h-7 rounded-full bg-white border border-[#dfdfd8] text-[#777971] flex items-center justify-center mx-auto text-xs font-medium">
                    4
                  </div>
                  <span className="text-[#777971] block">Doorstep Delivery</span>
                </div>
              </div>
            </div>

            {/* Order Structured Summary Grid */}
            <div className="border border-[#dfdfd8] rounded-[2px] overflow-hidden divide-y divide-[#dfdfd8] text-left text-xs">
              <div className="bg-[#f7f6f2] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#777971] block mb-0.5">Order Reference</span>
                  <span className="font-mono font-semibold text-[#262824] text-xs">{placedOrderSummary.id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#777971] block mb-0.5">Order Date</span>
                  <span className="font-semibold text-[#262824]">{placedOrderSummary.date}</span>
                </div>
              </div>

              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#777971] block mb-1">Shipping Details</span>
                  <p className="font-semibold text-[#262824] text-sm">{placedOrderSummary.address?.name || curUser?.name || 'Valued Customer'}</p>
                  <p className="text-[#777971] text-xs leading-relaxed mt-0.5">
                    {placedOrderSummary.address?.addressLine1}{placedOrderSummary.address?.city ? `, ${placedOrderSummary.address.city}` : ''}{placedOrderSummary.address?.pincode ? ` - ${placedOrderSummary.address.pincode}` : ''}
                  </p>
                  {placedOrderSummary.address?.phone && (
                    <p className="text-[#777971] text-xs mt-1">Phone: {placedOrderSummary.address.phone}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#777971] block mb-1">Payment &amp; Delivery</span>
                  <p className="text-[#777971]">Method: <strong className="text-[#262824] font-semibold">{placedOrderSummary.method}</strong></p>
                  <p className="text-[#777971]">Status: <strong className="text-[#3d6547] font-semibold">{placedOrderSummary.paymentStatus || 'Confirmed'}</strong></p>
                  <p className="text-[#777971] mt-1">
                    Expected Arrival: <strong className="text-[#262824] font-semibold">{placedOrderSummary.expectedArrival || '2-3 business days'}</strong>
                  </p>
                </div>
              </div>

              <div className="bg-[#f7f6f2] px-5 py-3.5 flex items-center justify-between">
                <span className="font-semibold text-[#262824] text-xs uppercase tracking-wider">Total Amount Paid</span>
                <span className="font-display font-semibold text-lg text-[#262824]">₹{placedOrderSummary.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Direct Action Navigation */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCheckoutStep('cart');
                  setCurPage('orders');
                }}
                className="btn-primary w-full sm:flex-1 min-h-[44px] text-xs font-semibold uppercase tracking-wider rounded-[2px] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <CheckSquare size={14} />
                <span>Track in Orders</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckoutStep('cart');
                  setCurPage('products');
                }}
                className="btn-secondary w-full sm:flex-1 min-h-[44px] text-xs font-semibold uppercase tracking-wider rounded-[2px] flex items-center justify-center gap-2 border-[#262824] text-[#262824] hover:bg-[#262824] hover:text-[#f7f6f2] cursor-pointer transition-all"
              >
                <span>Continue Shopping</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Checkout;
