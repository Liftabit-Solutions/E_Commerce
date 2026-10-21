import React, { useState, useEffect } from 'react';
import axios from 'axios';
// @ts-ignore
import { auth } from '../../../../firebase';
import { useApp } from '../../../core/context/AppContext';
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
    { key: 'cart', label: 'Cart' },
    { key: 'address', label: 'Address' },
    { key: 'delivery', label: 'Delivery' },
    { key: 'review', label: 'Review' },
    { key: 'payment', label: 'Payment' }
  ] as const;

  const order = ['cart', 'address', 'delivery', 'review', 'payment', 'processing', 'success'];
  const currentIdx = order.indexOf(currentStep);

  if (currentStep === 'processing' || currentStep === 'success') return null;

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs mb-8 select-none">
      <div className="max-w-[720px] mx-auto relative flex justify-between items-center">
        
        {/* Background & Active connector line, aligned to the vertical center of the w-9 h-9 circles (top-4.5) */}
        <div className="absolute left-6 right-6 top-[18px] h-[2px] bg-slate-200 z-0">
          <div 
            className="h-full bg-slate-950 transition-all duration-500" 
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
                isAccessible ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-50'
              }`}
              aria-label={`Step ${idx + 1}: ${s.label}`}
            >
              {/* Step indicator circle */}
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                isActive
                  ? 'bg-slate-950 text-white shadow-md ring-2 sm:ring-4 ring-slate-200 scale-105 sm:scale-110 font-mono'
                  : isPassed
                  ? 'bg-slate-950 text-white shadow-xs'
                  : isAccessible
                  ? 'bg-white border-2 border-slate-900 text-slate-950 font-mono font-bold'
                  : 'bg-slate-100 border border-slate-200 text-slate-400 font-mono'
              }`}>
                {isPassed ? <Check size={13} strokeWidth={3} /> : idx + 1}
              </div>
              <span className={`text-[9px] sm:text-xs tracking-tight sm:tracking-wider uppercase transition-colors text-center leading-tight truncate max-w-[52px] sm:max-w-none ${
                isActive
                  ? 'text-slate-950 font-black'
                  : isPassed || isAccessible
                  ? 'text-slate-800 font-bold'
                  : 'text-slate-400 font-medium'
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
  const { cart, placeOrder, updateCartQty, removeFromCart, setCurPage, curUser, showToast, openAuthModal, deletingProductId, updatingProductId, setCurUser, fetchCurrentUser, setHideNavbar } = useApp();

  // Wizard Step State & Tracking
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address' | 'delivery' | 'review' | 'payment' | 'processing' | 'success'>('cart');
  const [maxStepReached, setMaxStepReached] = useState<number>(0);

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
      const nextDraft = Math.max(1, currentDraft + delta);
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
          `${import.meta.env.VITE_BACKEND_URI}/users/address/default/${addrId}`,
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
            `${import.meta.env.VITE_BACKEND_URI}/users/address-update/${editingAddressId}`,
            payload,
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            }
          );
        } else {
          apiRes = await axios.post(
            `${import.meta.env.VITE_BACKEND_URI}/users/address`,
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
          `${import.meta.env.VITE_BACKEND_URI}/users/address-delete/${addrId}`,
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
    // 1. Ensure address is selected
    const currentAddr = addresses.find(a => a.id === selectedAddressId) || addresses[0];
    if (!currentAddr || !selectedAddressId) {
      showToast('Please select or register a delivery address to proceed.');
      setCheckoutStep('address');
      return;
    }

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
    } else if (paymentOption === 'UPI') {
      if (!upiApp && !upiId.trim()) {
        showToast('Please select a UPI app or enter your UPI ID (VPA).');
        return;
      }
      if (upiId.trim() && !upiId.includes('@')) {
        showToast('Please enter a valid UPI ID (e.g. name@bank).');
        return;
      }
    }

    setCheckoutStep('processing');
    setProcessingIndex(0);

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
        showToast(err?.response?.data?.message || 'Failed to place order. Please try again.');
        setCheckoutStep('payment');
        return;
      }

      if (resData && resData.success === false) {
        showToast(resData.message || 'Order could not be processed. Please verify your details.');
        setCheckoutStep('payment');
        return;
      }

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
      <div className="w-full bg-[#FAFBFD] min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-[480px] w-full bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center shadow-sm select-none animate-fadeIn">
          <div className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-950 shadow-2xs">
            <ShoppingCart size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-950 mb-3 tracking-tight">Your Cart is Empty</h2>
          <p className="text-sm text-slate-600 mb-8 leading-relaxed">
            Your shopping basket is waiting for your selection. Explore our range of professional cleaning essentials.
          </p>
          <button
            type="button"
            className="btn-primary w-full min-h-[48px] text-sm font-bold shadow-md hover:shadow-lg inline-flex items-center justify-center gap-2 cursor-pointer"
            onClick={() => setCurPage('products')}
          >
            <Star size={16} />
            <span>Explore Catalog</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-7 py-10 pb-24 animate-fadeIn relative">

      {/* Address Processing Loading Overlay */}
      {isSavingAddress && (
        <div className="fixed inset-0 bg-blk/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fadeIn">
          <div className="bg-wht p-6 rounded-2xl shadow-premium flex flex-col items-center gap-3 border border-bdr max-w-xs w-full text-center">
            <Loader2 size={36} className="text-primary animate-spin" />
            <h4 className="text-sm font-bold text-blk">Registering Address</h4>
            <p className="text-xs text-mut font-medium">Please wait while your delivery coordinates are being registered to your profile...</p>
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
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200/90 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer group"
                >
                  <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform text-slate-900" />
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
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200/90 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer group"
                >
                  <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform text-slate-900" />
                  <span>
                    {checkoutStep === 'address' && 'Back to Cart'}
                    {checkoutStep === 'delivery' && 'Back to Delivery Address'}
                    {checkoutStep === 'review' && 'Back to Shipment Speed'}
                    {checkoutStep === 'payment' && 'Back to Order Review'}
                  </span>
                </button>
              )}

              <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                Step {checkoutStep === 'cart' ? '1' : checkoutStep === 'address' ? '2' : checkoutStep === 'delivery' ? '3' : checkoutStep === 'review' ? '4' : '5'} of 5
              </span>
            </div>

            {/* ══════════════════ STEP 1: SHOPPING CART ══════════════════ */}
            {checkoutStep === 'cart' && (
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
                {/* Cart Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 select-none flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-950 text-white rounded-xl flex items-center justify-center shadow-xs">
                      <ShoppingCart size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-950 tracking-tight">Review Cart Items</h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {totalItemQty} item{totalItemQty !== 1 ? 's' : ''} in your order
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-950 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full font-price">
                    Subtotal: ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Banner when a single item is selected to buy alone */}
                {aloneProductId !== null && aloneItem && (
                  <div className="bg-amber-50 border-b border-amber-200 px-6 py-3.5 flex items-center justify-between gap-3 text-xs select-none animate-fadeIn">
                    <div className="flex items-center gap-2 text-amber-950 font-semibold">
                      <Zap size={15} className="fill-amber-600 text-amber-600 shrink-0" />
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
                      className="text-xs font-bold text-slate-950 hover:bg-amber-100/80 bg-white px-3.5 py-1.5 rounded-xl border border-amber-300 shadow-2xs transition-colors shrink-0 cursor-pointer min-h-[36px]"
                    >
                      Buy All Items ({cart.length})
                    </button>
                  </div>
                )}

                {/* Cart Items List */}
                <div className="divide-y divide-slate-100">
                  {cart.map((item, idx) => {
                    const discountPct = item.product.discount > 0 ? item.product.discount : 15;
                    const mrp = item.product.originalPrice || Math.round(item.product.price / (1 - discountPct / 100));
                    const savings = mrp - item.product.price;
                    const isAloneSelected = aloneProductId === item.product.id;
                    return (
                      <div 
                        key={item.product.id} 
                        className={`p-5 sm:p-6 transition-colors duration-150 relative ${
                          isAloneSelected ? 'bg-amber-50/40 border-l-4 border-l-amber-600' : 'hover:bg-slate-50/60'
                        }`}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                      >
                        <div className="flex gap-4 sm:gap-5 items-start sm:items-center">
                          {/* Thumbnail */}
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-slate-200 overflow-hidden bg-white p-2 flex items-center justify-center shrink-0 shadow-2xs">
                            {item.product.imgs?.length > 0 ? (
                              <img src={item.product.imgs[0]} alt={item.product.name} className="w-full h-full object-contain mix-blend-multiply" />
                            ) : (
                              <Package size={24} className="text-slate-300" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex items-start gap-2 mb-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                {item.product.cat}
                              </span>
                              <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md">
                                {discountPct}% OFF
                              </span>
                            </div>
                            
                            {/* Product Title */}
                            <h4 className="text-base font-bold text-slate-950 leading-snug mb-1 line-clamp-1">
                              {item.product.name}
                            </h4>
                            <p className="text-xs text-slate-600">
                              Seller: <span className="font-semibold text-slate-900">Verified Direct Supplier</span>
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5">
                              Est. Delivery: <span className="font-semibold text-slate-950">In 2–4 business days</span>
                            </p>
                            
                            {/* Price Row */}
                            <div className="flex items-baseline gap-2.5 flex-wrap mt-2.5">
                              <span className="text-lg sm:text-xl font-black text-slate-950 font-price">
                                ₹{item.product.price.toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs text-slate-500 line-through font-price">
                                ₹{mrp.toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-price">
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
                                      <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-2xs overflow-hidden">
                                        <button 
                                          type="button" 
                                          className="w-10 h-10 min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer text-slate-950" 
                                          onClick={() => handleAdjustDraftQty(item.product.id, -1)}
                                          title="Decrease quantity"
                                          aria-label="Decrease quantity"
                                        >
                                          <Minus size={14} strokeWidth={2.5} />
                                        </button>
                                        <span className="text-sm font-bold text-slate-950 px-3 select-none min-w-[32px] text-center font-price">
                                          {draftQty}
                                        </span>
                                        <button 
                                          type="button" 
                                          className="w-10 h-10 min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer text-slate-950" 
                                          onClick={() => handleAdjustDraftQty(item.product.id, 1)}
                                          title="Increase quantity"
                                          aria-label="Increase quantity"
                                        >
                                          <Plus size={14} strokeWidth={2.5} />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        disabled={updatingProductId === item.product.id}
                                        onClick={() => handleSaveQty(item.product.id)}
                                        className="btn-primary min-h-[40px] px-3.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-70"
                                        title="Save quantity changes"
                                      >
                                        {updatingProductId === item.product.id ? (
                                          <>
                                            <Loader2 size={13} className="animate-spin text-white" />
                                            <span>Saving...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Check size={14} strokeWidth={3} />
                                            <span>Save</span>
                                          </>
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleCancelEditQty(item.product.id)}
                                        className="min-h-[40px] px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                                        title="Cancel editing"
                                      >
                                        <X size={13} strokeWidth={2.5} />
                                        <span>Cancel</span>
                                      </button>
                                    </div>
                                  ) : (
                                    /* Normal Mode: Display Quantity Badge + Edit Button */
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-950 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl select-none">
                                        Qty: {item.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditQty(item.product.id, item.quantity)}
                                        className="text-xs text-slate-900 hover:bg-slate-100 font-bold flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-300 transition-all select-none min-h-[38px]"
                                        title="Edit product quantity"
                                      >
                                        <Edit2 size={12} />
                                        <span>Edit Qty</span>
                                      </button>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-3 ml-auto">
                                    <span className="text-base font-black text-slate-950 font-price">
                                      ₹{(item.product.price * activeQty).toLocaleString('en-IN')}
                                    </span>
                                    <button 
                                      type="button" 
                                      disabled={deletingProductId === item.product.id}
                                      className="w-10 h-10 min-h-[40px] min-w-[40px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl flex items-center justify-center cursor-pointer transition-colors" 
                                      onClick={() => removeFromCart(item.product.id)} 
                                      title="Remove item from cart"
                                      aria-label="Remove item"
                                    >
                                      {deletingProductId === item.product.id ? (
                                        <Loader2 size={15} className="animate-spin text-rose-600" />
                                      ) : (
                                        <Trash2 size={16} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Option below the cart card to Buy This Alone */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 select-none">
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
                            className={`text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                              isAloneSelected
                                ? 'bg-slate-950 text-white shadow-xs'
                                : 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-800'
                            }`}
                          >
                            <Zap size={13} className={isAloneSelected ? 'fill-white text-white' : 'text-amber-500 fill-amber-400'} />
                            {isAloneSelected ? 'Buying This Alone (Selected)' : 'Buy this item alone'}
                          </button>

                          {isAloneSelected ? (
                            <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                              <Check size={13} strokeWidth={3} /> Total cost on right updated for this item only
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Order this item alone without deleting other products in cart
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Step 1 Footer Summary */}
                <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center flex-wrap gap-4 select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-medium">
                      Subtotal ({totalItemQty} item{totalItemQty !== 1 ? 's' : ''}):
                    </span>
                    <strong className="text-slate-950 font-black font-price text-xl tracking-tight ml-1">
                      ₹{subtotal.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-700" />
                    <span>Proceed using the Order Summary on the right &rarr;</span>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════ STEP 2: DELIVERY ADDRESS ══════════════════ */}
            {checkoutStep === 'address' && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 select-none">
                  <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100 flex-wrap gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-950 tracking-tight">Select Delivery Coordinates</h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">Pick a saved delivery address or register a new one</p>
                    </div>
                    {!addressFormOpen && (
                      <button
                        type="button"
                        onClick={() => setAddressFormOpen(true)}
                        className="btn-primary min-h-[40px] text-xs font-bold px-4 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Plus size={14} /> <span>Register Address</span>
                      </button>
                    )}
                  </div>

                  {/* If no addresses present */}
                  {!addressFormOpen && addresses.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center justify-center my-2">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3 text-slate-900 shadow-2xs">
                        <MapPin size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-950">No Address Registered</h4>
                      <p className="text-xs text-slate-600 max-w-sm mt-1 mb-5 leading-relaxed">
                        You have no saved delivery coordinates on your account. Register an address to proceed with order fulfillment.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAddressFormOpen(true)}
                        className="btn-primary min-h-[44px] text-xs font-bold px-5 flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Plus size={15} /> <span>Register New Address</span>
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
                            className={`rounded-2xl p-5 cursor-pointer relative transition-all flex flex-col justify-between ${
                              isSelected 
                                ? 'border-2 border-slate-950 bg-slate-50/50 shadow-xs ring-1 ring-slate-950' 
                                : 'border border-slate-200 bg-white hover:border-slate-400 hover:shadow-2xs'
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
                                    className="accent-slate-950 h-4 w-4 cursor-pointer"
                                  />
                                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 border border-slate-200 text-slate-800">
                                    {addr.type}
                                  </span>
                                  {addr.isDefault && (
                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold rounded-md">
                                      Default
                                    </span>
                                  )}
                                </div>
                              </div>

                              <h4 className="text-sm font-black text-slate-950 mt-1">{addr.name || curUser?.name || 'Valued Customer'}</h4>
                              <p className="text-xs font-semibold text-slate-600 font-mono mt-0.5">{addr.phone || curUser?.phoneNumber || 'No phone number'}</p>
                              {addr.addressLine1 ? (
                                <>
                                  <p className="text-xs sm:text-sm text-slate-700 mt-2 leading-relaxed">
                                    {addr.addressLine1}
                                    {addr.addressLine2 && `, ${addr.addressLine2}`}
                                  </p>
                                  <p className="text-xs sm:text-sm text-slate-700 font-medium">
                                    {addr.city}{addr.city && addr.state ? ', ' : ''}{addr.state} {addr.pincode ? `— ${addr.pincode}` : ''}
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-2 font-medium">
                                  No street address specified. Click "Edit" below to complete your coordinates.
                                </p>
                              )}
                              {addr.instructions && (
                                <p className="text-xs text-slate-500 italic mt-2.5 border-l-2 border-slate-300 pl-2">
                                  &ldquo;{addr.instructions}&rdquo;
                                </p>
                              )}
                            </div>

                            {/* Actions block */}
                            <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3.5" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleEditAddress(addr)}
                                className="text-xs font-bold text-slate-950 hover:underline flex items-center gap-1 cursor-pointer py-1"
                              >
                                <Edit2 size={12} /> <span>Edit</span>
                              </button>
                              
                              {!addr.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultAddress(addr.id)}
                                  className="text-xs font-semibold text-slate-600 hover:text-slate-950 cursor-pointer py-1"
                                >
                                  Make Default
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteAddress(addr.id)}
                                className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer py-1"
                              >
                                <Trash size={12} /> <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add / Edit address Form */}
                  {addressFormOpen && (
                    <form onSubmit={handleSaveAddress} className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 animate-fadeIn">
                      <div className="flex items-center justify-between mb-5 border-b border-slate-200 pb-3">
                        <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
                          {editingAddressId ? 'Edit Address Parameters' : 'Register New Shipping Coordinate'}
                        </h4>
                        <button type="button" onClick={resetAddressForm} className="text-slate-400 hover:text-slate-950 cursor-pointer p-1">
                          <X size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-900">Full Recipient Name <span className="text-rose-600">*</span></label>
                          <input type="text" placeholder="E.g., Amit Patel" value={formName} onChange={e => setFormName(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400" required />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-900">Mobile Number <span className="text-rose-600">*</span></label>
                          <input type="tel" placeholder="E.g., 9876543210" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400" required />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-900">Alternative Mobile <span className="text-slate-500 font-normal">(Optional)</span></label>
                          <input type="tel" placeholder="Alternative contact number" value={formAltPhone} onChange={e => setFormAltPhone(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-900">Address Type</label>
                          <select value={formType} onChange={e => setFormType(e.target.value as any)} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10">
                            <option value="Home">Home (All Day Delivery)</option>
                            <option value="Office">Office (9 AM - 6 PM)</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 mb-4">
                        <label className="text-xs font-bold text-slate-900">Address Line 1 <span className="text-rose-600">*</span></label>
                        <input type="text" placeholder="E.g., Flat 301, Silver Crest Apartments" value={formLine1} onChange={e => setFormLine1(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400" required />
                      </div>

                      <div className="flex flex-col gap-1.5 mb-4">
                        <label className="text-xs font-bold text-slate-900">Address Line 2 <span className="text-slate-500 font-normal">(Optional)</span></label>
                        <input type="text" placeholder="E.g., Landmark, Street, Sector" value={formLine2} onChange={e => setFormLine2(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400" />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-900">Landmark</label>
                          <input type="text" placeholder="Near Park" value={formLandmark} onChange={e => setFormLandmark(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-900">City <span className="text-rose-600">*</span></label>
                          <input type="text" placeholder="Bengaluru" value={formCity} onChange={e => setFormCity(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400" required />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-900">State <span className="text-rose-600">*</span></label>
                          <input type="text" placeholder="Karnataka" value={formState} onChange={e => setFormState(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400" required />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-900">PIN Code <span className="text-rose-600">*</span></label>
                          <input type="text" placeholder="560066" value={formPincode} onChange={e => setFormPincode(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400" required />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 mb-5">
                        <label className="text-xs font-bold text-slate-900">Instructions for Delivery Rider</label>
                        <textarea placeholder="E.g., Leave package with security guard, ring bell twice..." value={formInstructions} onChange={e => setFormInstructions(e.target.value)} rows={2} className="w-full border border-slate-300 rounded-xl p-3.5 text-sm text-slate-950 bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400" />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button type="button" onClick={resetAddressForm} className="btn-secondary min-h-[44px] px-5 text-xs font-bold">
                          Cancel
                        </button>
                        <button type="submit" disabled={isSavingAddress} className="btn-primary min-h-[44px] px-6 text-xs font-bold shadow-sm flex items-center gap-2 disabled:opacity-50">
                          {isSavingAddress ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-white" />
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
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2 select-none">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <MapPin size={15} className="text-slate-950 shrink-0" />
                      {selectedAddressId ? 'Address selected for delivery' : 'Please select or register a delivery address'}
                    </span>
                    <span className="text-slate-500 font-medium">
                      Proceed using the Order Summary on the right &rarr;
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════ STEP 3: DELIVERY METHOD ══════════════════ */}
            {checkoutStep === 'delivery' && (
              <div className="flex flex-col gap-6 animate-fadeIn select-none">
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
                  <h3 className="text-lg font-black text-slate-950 tracking-tight mb-1">Choose Shipment Speed</h3>
                  <p className="text-xs text-slate-500 mb-5 font-medium">Select your preferred delivery timeline and packaging speed</p>

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
                          className={`rounded-2xl p-5 cursor-pointer relative transition-all flex flex-col justify-between items-start gap-4 ${
                            isSelected 
                              ? 'border-2 border-slate-950 bg-slate-50/50 shadow-xs ring-1 ring-slate-950' 
                              : 'border border-slate-200 bg-white hover:border-slate-400 hover:shadow-2xs'
                          }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-slate-950 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                            }`}>
                              <Icon size={18} />
                            </div>
                            <span className="text-sm font-black text-slate-950 font-price">
                              {fee === 0 ? (
                                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                  FREE
                                </span>
                              ) : (
                                `₹${fee}`
                              )}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-slate-950 leading-tight">{m.label}</h4>
                            <p className="text-xs text-emerald-800 font-bold mt-1">{m.time}</p>
                            <p className="text-xs text-slate-600 mt-1 leading-normal">{m.desc}</p>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center self-end ${
                            isSelected ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 bg-white text-transparent'
                          }`}>
                            <Check size={11} strokeWidth={3} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3 Footer Summary */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2 select-none">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Truck size={15} className="text-slate-950 shrink-0" />
                    Selected: <strong className="text-slate-950 font-bold">{deliveryMethods[deliveryMethod].label} ({deliveryMethods[deliveryMethod].time})</strong>
                  </span>
                  <span className="text-slate-500 font-medium">
                    Proceed using the Order Summary on the right &rarr;
                  </span>
                </div>
              </div>
            )}

            {/* ══════════════════ STEP 4: ORDER REVIEW ══════════════════ */}
            {checkoutStep === 'review' && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                
                {/* Coordinates review */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Selected Address card */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between select-none">
                    <div>
                      <div className="flex items-center justify-between mb-3.5 border-b border-slate-100 pb-2.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-950" /> Delivery Destination
                        </span>
                        <button
                          type="button"
                          onClick={() => setCheckoutStep('address')}
                          className="text-xs font-bold text-slate-950 hover:underline underline-offset-2 cursor-pointer py-1"
                        >
                          Change
                        </button>
                      </div>
                      
                      {(() => {
                        const addr = addresses.find(a => a.id === selectedAddressId) || addresses[0];
                        if (!addr) return <p className="text-xs text-slate-500 font-semibold">No address registered</p>;
                        return (
                          <div>
                            <h4 className="text-sm font-black text-slate-950">{addr.name}</h4>
                            <p className="text-xs font-semibold text-slate-600 mt-0.5 font-mono">{addr.phone}</p>
                            <p className="text-xs sm:text-sm text-slate-700 mt-2 leading-relaxed">
                              {addr.addressLine1}
                              {addr.addressLine2 && `, ${addr.addressLine2}`}
                            </p>
                            <p className="text-xs sm:text-sm text-slate-700 font-medium">{addr.city}, {addr.state} — {addr.pincode}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Selected Delivery Method card */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between select-none">
                    <div>
                      <div className="flex items-center justify-between mb-3.5 border-b border-slate-100 pb-2.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Truck size={13} className="text-slate-950" /> Shipment Method
                        </span>
                        <button
                          type="button"
                          onClick={() => setCheckoutStep('delivery')}
                          className="text-xs font-bold text-slate-950 hover:underline underline-offset-2 cursor-pointer py-1"
                        >
                          Change
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-slate-950 text-white rounded-xl flex items-center justify-center shadow-2xs">
                          {React.createElement(deliveryMethods[deliveryMethod].icon, { size: 18 })}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-950">{deliveryMethods[deliveryMethod].label}</h4>
                          <p className="text-xs text-emerald-800 font-bold mt-0.5">{deliveryMethods[deliveryMethod].time}</p>
                          <p className="text-xs text-slate-600 mt-0.5 font-medium">Shipping Fee: {shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Products card list review */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 select-none">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingCart size={13} className="text-slate-950" /> Packaged Products ({totalItemQty})
                    </span>
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('cart')}
                      className="text-xs font-bold text-slate-950 hover:underline underline-offset-2 cursor-pointer py-1"
                    >
                      Modify Cart
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {checkoutItems.map((item) => (
                      <div key={item.product.id} className="flex gap-4 items-center py-3.5 first:pt-0 last:pb-0">
                        <div className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-white p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                          {item.product.imgs?.length > 0 ? (
                            <img src={item.product.imgs[0]} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                          ) : (
                            <Package size={16} className="text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-950 truncate">{item.product.name}</h4>
                          <p className="text-xs text-slate-600 mt-0.5">Qty: {item.quantity} × ₹{item.product.price.toLocaleString('en-IN')}</p>
                        </div>
                        <span className="text-sm font-black text-slate-950 font-price shrink-0">
                          ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional instructions note option */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6">
                  <label className="text-xs font-bold text-slate-900 block mb-2 select-none">
                    Add Checkout Remarks or Special Instructions
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Call before delivery, ring bell twice..."
                    value={customerNotes}
                    onChange={e => setCustomerNotes(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400"
                  />
                </div>

                {/* Step 4 Footer Summary */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2 select-none">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <CheckCircle size={15} className="text-emerald-700 shrink-0" />
                    All items &amp; dispatch coordinates verified
                  </span>
                  <span className="text-slate-500 font-medium">
                    Proceed using the Order Summary on the right &rarr;
                  </span>
                </div>
              </div>
            )}

            {/* ══════════════════ STEP 5: SECURE PAYMENT METHOD ══════════════════ */}
            {checkoutStep === 'payment' && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 select-none">
                  <h3 className="text-lg font-black text-slate-950 tracking-tight mb-1">Secure Payment Options</h3>
                  <p className="text-xs text-slate-500 mb-6 font-medium">All information remains protected via 256-bit PCI-DSS standards</p>

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
                          className={`rounded-2xl p-4 cursor-pointer text-center flex flex-col items-center justify-center gap-2.5 transition-all ${
                            isSelected 
                              ? 'border-2 border-slate-950 bg-slate-950 text-white shadow-md ring-1 ring-slate-950 font-bold' 
                              : 'border border-slate-200 bg-white hover:border-slate-400 text-slate-900 hover:shadow-2xs'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800'
                          }`}>
                            <Icon size={18} />
                          </div>
                          <span className="text-xs font-bold">{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected payment content panels */}
                  
                  {/* UPI */}
                  {paymentOption === 'UPI' && (
                    <div className="border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/50 animate-fadeIn">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-3">Preferred UPI Application</span>
                      <div className="flex gap-2.5 flex-wrap mb-4">
                        {(['GPay', 'PhonePe', 'Paytm', 'BHIM'] as const).map(app => (
                          <button
                            key={app}
                            type="button"
                            onClick={() => { setUpiApp(app); setUpiId(''); }}
                            className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all cursor-pointer min-h-[40px] ${
                              upiApp === app ? 'bg-slate-950 text-white border-slate-950 shadow-xs' : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400'
                            }`}
                          >
                            {app}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col gap-1.5 mb-4">
                        <label className="text-xs font-bold text-slate-900">Or Enter VPA (UPI ID)</label>
                        <input
                          type="text"
                          placeholder="yourname@okaxis"
                          value={upiId}
                          onChange={e => { setUpiId(e.target.value); setUpiApp(''); }}
                          className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400"
                        />
                      </div>

                      <div className="border-t border-slate-200 mt-4 pt-3.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Saved / Recent VPAs</span>
                        <div className="flex flex-col gap-2">
                          {mockRecentUpi.map(handle => (
                            <div
                              key={handle}
                              onClick={() => { setUpiId(handle); setUpiApp(''); }}
                              className="text-xs font-mono font-bold text-slate-800 hover:text-slate-950 cursor-pointer flex items-center gap-2 py-1"
                            >
                              <CheckCircle size={13} className="text-emerald-600" /> <span>{handle}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CARD */}
                  {paymentOption === 'Card' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border border-slate-200 rounded-2xl p-5 sm:p-6 bg-slate-50/50 animate-fadeIn">
                      
                      {/* Premium Card Preview */}
                      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[190px] border border-slate-800">
                        <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white/5 -translate-y-8 translate-x-8" />
                        <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white/5 translate-y-8 -translate-x-4" />
                        
                        <div className="flex justify-between items-start relative z-10">
                          <div className="w-10 h-7 bg-amber-300 rounded-md shadow-xs" />
                          <span className="text-[10px] font-extrabold tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                            DEBIT / CREDIT
                          </span>
                        </div>

                        <div className="relative z-10 my-auto py-2">
                          <p className="font-mono text-base tracking-[0.25em] text-center text-white font-bold">
                            {cardNumber || '•••• •••• •••• ••••'}
                          </p>
                        </div>
                        
                        <div className="flex justify-between items-end relative z-10">
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Cardholder</p>
                            <p className="text-xs font-bold font-mono tracking-wide">{cardHolder || 'AMIT PATEL'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Expiry</p>
                            <p className="text-xs font-bold font-mono">{cardExpiry || 'MM/YY'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Card Inputs block */}
                      <div className="flex flex-col gap-3.5">
                        <div>
                          <label className="text-xs font-bold text-slate-900 mb-1.5 block">Card Number</label>
                          <input
                            type="text"
                            placeholder="1234 5678 9101 1121"
                            value={cardNumber}
                            onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                            maxLength={19}
                            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 font-mono tracking-wider"
                          />
                        </div>
                        
                        <div>
                          <label className="text-xs font-bold text-slate-900 mb-1.5 block">Cardholder Name</label>
                          <input
                            type="text"
                            placeholder="As printed on card"
                            value={cardHolder}
                            onChange={e => setCardHolder(e.target.value.toUpperCase())}
                            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-900 mb-1.5 block">Expiry Date</label>
                            <input
                              type="text"
                              placeholder="MM/YY"
                              value={cardExpiry}
                              onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                              maxLength={5}
                              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-900 mb-1.5 block">CVV Secure</label>
                            <input
                              type="password"
                              placeholder="•••"
                              value={cardCvv}
                              onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                              maxLength={3}
                              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-950 min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 font-mono"
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={saveCard}
                            onChange={e => setSaveCard(e.target.checked)}
                            className="accent-slate-950 h-4 w-4 rounded cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-800">Securely save card for future checkouts</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* COD */}
                  {paymentOption === 'COD' && (
                    <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 animate-fadeIn">
                      <div className="flex gap-3.5 items-start">
                        <AlertCircle size={20} className="text-slate-950 mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-sm font-bold text-slate-950">Cash on Delivery details</h4>
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                            Our delivery executive will handover your package and accept cash payment on delivery. Please ensure the exact amount of <strong className="font-price text-slate-950 font-bold">₹{grandTotal.toLocaleString('en-IN')}</strong> is ready at the time of delivery.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Step 5 Footer Summary */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2 select-none">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                    256-Bit Encrypted Secure Checkout
                  </span>
                  <span className="text-slate-500 font-medium">
                    Click &ldquo;Pay &amp; Confirm Order&rdquo; on Order Summary to complete &rarr;
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Right Column Sticky Summary details panel */}
          <aside className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col gap-0 sticky top-[96px] self-start select-none">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Order Summary
              </h4>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Encrypted
              </span>
            </div>

            {/* Coupons section - Optional input */}
            <div className="pb-5">
              {activeCoupon ? (
                <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Gift size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-950 font-mono tracking-wider">{activeCoupon.code}</p>
                      <p className="text-[11px] text-emerald-800 font-bold">{activeCoupon.discount}% discount applied</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-slate-600 hover:text-rose-600 font-bold focus:outline-none cursor-pointer py-1 px-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-900">
                    Promo Coupon <span className="text-[11px] text-slate-500 font-normal">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. CLEAN10"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-950 uppercase font-mono tracking-wider min-h-[44px] bg-white outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 placeholder:text-slate-400 placeholder:normal-case"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="btn-primary min-h-[44px] px-4 text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-xs font-semibold text-rose-600 mt-0.5">{couponError}</p>}
                </div>
              )}
            </div>

            {/* Calculation breakdowns */}
            <div className="space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({totalItemQty} items)</span>
                <span className="font-price font-bold text-slate-950">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              
              {activeCoupon && (
                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span>Coupon Discount ({activeCoupon.discount}%)</span>
                  <span className="font-price font-bold">−₹{discountDeduction.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>GST Taxes (18%)</span>
                <span className="font-price font-bold text-slate-950">₹{taxesGst.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Shipment & Dispatch Fee</span>
                {shippingFee === 0 ? (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    FREE
                  </span>
                ) : (
                  <span className="font-price font-bold text-slate-950">₹{shippingFee.toLocaleString('en-IN')}</span>
                )}
              </div>

              {shippingFee > 0 && deliveryMethod === 'standard' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
                  🎁 Add ₹{499 - (subtotal - discountDeduction)} more for free express shipping
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-baseline border-t border-slate-200 mt-5 pt-4">
              <span className="text-sm font-bold text-slate-950">Grand Total</span>
              <span className="text-2xl sm:text-3xl font-black font-price text-slate-950 tracking-tight">
                ₹{grandTotal.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Dynamic Step Action Buttons placed in Sticky Sidebar for clean SaaS guidance */}
            {checkoutStep === 'cart' && (
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
                className="btn-primary min-h-[48px] mt-6 w-full flex items-center justify-center gap-2 group cursor-pointer shadow-md hover:shadow-lg text-sm font-bold"
              >
                <span>{aloneProductId !== null ? 'Proceed to Buy This Alone' : 'Proceed to Address Selection'}</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {checkoutStep === 'address' && !addressFormOpen && (
              <button
                type="button"
                disabled={!selectedAddressId}
                onClick={() => setCheckoutStep('delivery')}
                className={`btn-primary min-h-[48px] mt-6 w-full flex items-center justify-center gap-2 group cursor-pointer shadow-md hover:shadow-lg text-sm font-bold ${
                  !selectedAddressId ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span>Deliver to this Address</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {checkoutStep === 'delivery' && (
              <button
                type="button"
                onClick={() => setCheckoutStep('review')}
                className="btn-primary min-h-[48px] mt-6 w-full flex items-center justify-center gap-2 group cursor-pointer shadow-md hover:shadow-lg text-sm font-bold"
              >
                <span>Proceed to Order Review</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {checkoutStep === 'review' && (
              <button
                type="button"
                onClick={() => setCheckoutStep('payment')}
                className="btn-primary min-h-[48px] mt-6 w-full flex items-center justify-center gap-2 group cursor-pointer shadow-md hover:shadow-lg text-sm font-bold"
              >
                <span>Proceed to Secure Payment</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {checkoutStep === 'payment' && (
              <button
                type="button"
                onClick={triggerPaymentSimulation}
                className="btn-primary min-h-[48px] mt-6 w-full flex items-center justify-center gap-2 group cursor-pointer shadow-md hover:shadow-lg text-sm font-bold"
              >
                <Lock size={15} />
                <span>Pay & Confirm Order</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {/* Trust Badges */}
            <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
              {[
                { icon: Lock, text: 'PCI-DSS 256-bit encrypted transaction' },
                { icon: Zap, text: 'Same-day packaging & fast dispatch' },
                { icon: ShieldCheck, text: '7-day replacement warranty guarantee' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                  <Icon size={14} className="text-slate-950 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </aside>

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
        <div className="max-w-[760px] mx-auto py-10 px-4 sm:px-6 animate-fadeIn select-none">
          {/* Confetti particles */}
          {Array.from({ length: 24 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}

          {/* Clean Main Confirmation Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm text-center space-y-6">
            {/* Animated Celebration Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm animate-pulseRing">
              <CheckCircle size={42} strokeWidth={2.4} className="animate-scaleIn" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300">
                <Check size={13} strokeWidth={3} /> Order Placed
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Order Placed Successfully!
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you for your purchase. We’ve received your order and our fulfillment team has prepared it for fast delivery.
              </p>
            </div>

            {/* Fulfillment Status Stepper Preview */}
            <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-3 px-1">
                <span>Fulfillment Status</span>
                <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping inline-block" />
                  Dispatched &amp; In Transit
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] sm:text-xs">
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-slate-950 text-white flex items-center justify-center mx-auto text-xs font-bold shadow-xs">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span className="font-bold text-slate-950 block">Payment Verified</span>
                </div>
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-slate-950 text-white flex items-center justify-center mx-auto text-xs font-bold shadow-xs">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span className="font-bold text-slate-950 block">Packed &amp; Sealed</span>
                </div>
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-slate-950 text-white flex items-center justify-center mx-auto text-xs font-bold shadow-xs">
                    <Truck size={14} strokeWidth={2.2} />
                  </div>
                  <span className="font-bold text-slate-950 block">Dispatched</span>
                </div>
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-300 text-slate-600 flex items-center justify-center mx-auto text-xs font-bold shadow-xs">
                    4
                  </div>
                  <span className="font-semibold text-slate-600 block">Doorstep Delivery</span>
                </div>
              </div>
            </div>

            {/* Order Structured Summary Grid */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 text-left text-xs">
              <div className="bg-slate-50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-0.5">Order Reference</span>
                  <span className="font-mono font-black text-slate-950 text-sm tracking-tight">{placedOrderSummary.id}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-0.5">Order Date</span>
                  <span className="font-bold text-slate-900">{placedOrderSummary.date}</span>
                </div>
              </div>

              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1">Shipping Details</span>
                  <p className="font-bold text-slate-950 text-sm">{placedOrderSummary.address?.name || curUser?.name || 'Valued Customer'}</p>
                  <p className="text-slate-700 text-xs leading-relaxed mt-0.5">
                    {placedOrderSummary.address?.addressLine1}{placedOrderSummary.address?.city ? `, ${placedOrderSummary.address.city}` : ''}{placedOrderSummary.address?.pincode ? ` - ${placedOrderSummary.address.pincode}` : ''}
                  </p>
                  {placedOrderSummary.address?.phone && (
                    <p className="text-slate-700 text-xs mt-1 font-medium">Phone: {placedOrderSummary.address.phone}</p>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1">Payment &amp; Delivery</span>
                  <p className="text-slate-700">Method: <strong className="text-slate-950 font-bold">{placedOrderSummary.method}</strong></p>
                  <p className="text-slate-700">Status: <strong className="text-emerald-800 font-bold">{placedOrderSummary.paymentStatus || 'Confirmed'}</strong></p>
                  <p className="text-slate-700 mt-1">
                    Expected Arrival: <strong className="text-slate-950 font-bold">{placedOrderSummary.expectedArrival || '2-3 business days'}</strong>
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 px-5 py-3.5 flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Total Amount Paid</span>
                <span className="font-price font-black text-lg text-slate-950">₹{placedOrderSummary.total.toLocaleString('en-IN')}</span>
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
                className="btn-primary w-full sm:flex-1 min-h-[48px] text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer transition-all"
              >
                <CheckSquare size={16} />
                <span>Track in Returns &amp; Orders</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCheckoutStep('cart');
                  setCurPage('products');
                }}
                className="btn-secondary w-full sm:flex-1 min-h-[48px] text-sm font-bold flex items-center justify-center gap-2 shadow-xs hover:bg-slate-100 cursor-pointer transition-all"
              >
                <span>Continue Shopping</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Checkout;
