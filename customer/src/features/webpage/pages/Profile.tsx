import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../core/context/AppContext';
import {
  User as UserIcon,
  Camera,
  MapPin,
  Star,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Phone,
  Mail,
  Building,
  Home as HomeIcon,
  HelpCircle,
  X,
  Loader2,
  MessageSquare
} from 'lucide-react';
import axios from 'axios';
// @ts-ignore
import { auth } from '../../../../firebase';
import type { User as UserType } from '../../../core/types';
import { getSocket } from '../../../core/socket/socket';
import { SOCKET_EVENTS } from '../../../core/socket/socketEvents';

const API_BASE = (import.meta.env.VITE_BACKEND_URI || 'http://localhost:5002/api').replace(/\/+$/, '');

interface SavedAddress {
  id: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressType: 'Home' | 'Work' | 'Other';
  isDefault: boolean;
}

type TabType = 'profile' | 'address' | 'reviews' | 'stories';

const Profile: React.FC = () => {
  const { curUser, updateProfile, reviews, stories, products, logoutUser, setCurPage, showToast, fetchCurrentUser, setSelectedProductId } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  
  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [defaultConfirmAddressId, setDefaultConfirmAddressId] = useState<string | null>(null);
  const [isUpdatingDefault, setIsUpdatingDefault] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [deleteConfirmAddressId, setDeleteConfirmAddressId] = useState<string | null>(null);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);
  const [deleteConfirmReviewId, setDeleteConfirmReviewId] = useState<string | null>(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [deleteConfirmStoryId, setDeleteConfirmStoryId] = useState<string | null>(null);
  const [isDeletingStory, setIsDeletingStory] = useState(false);
  
  // Edit Profile Form state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState<UserType['gender']>('Prefer not to say');
  
  // Address Form state
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrName, setAddrName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrAltPhone, setAddrAltPhone] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPin, setAddrPin] = useState('');
  const [addrType, setAddrType] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [addrIsDefault, setAddrIsDefault] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize profile edit state
  useEffect(() => {
    if (curUser) {
      setEditFirstName(curUser.firstName || '');
      setEditLastName(curUser.lastName || '');
      setEditPhone(curUser.phoneNumber || '');
      setEditDob(curUser.dateOfBirth ? curUser.dateOfBirth.substring(0, 10) : '');
      setEditGender(curUser.gender || 'Prefer not to say');
    }
  }, [curUser, isEditProfileOpen]);

  // Load and manage addresses from DB or LocalStorage
  useEffect(() => {
    if (curUser) {
      if ((curUser as any).addresses && Array.isArray((curUser as any).addresses) && (curUser as any).addresses.length > 0) {
        const mapped: SavedAddress[] = (curUser as any).addresses.map((item: any) => ({
          id: item._id || `addr_${Date.now()}`,
          name: item.fullName || curUser.name,
          phone: item.phoneNumber || curUser.phoneNumber,
          alternatePhone: item.alternatePhone || '',
          addressLine1: item.addressLine1 || '',
          addressLine2: item.addressLine2 || '',
          landmark: item.landmark || '',
          city: item.city || '',
          state: item.state || '',
          postalCode: item.postalCode || '',
          country: item.country || 'India',
          addressType: item.tag || 'Home',
          isDefault: item.isDefault || false
        }));
        setAddresses(mapped);
      } else {
        const dbAddr = curUser.address;
        if (dbAddr && (dbAddr.addressLine1 || dbAddr.city)) {
          const initialAddress: SavedAddress = {
            id: 'addr_default',
            name: curUser.name || 'Primary Recipient',
            phone: curUser.phoneNumber || '',
            addressLine1: dbAddr.addressLine1 || '',
            addressLine2: dbAddr.addressLine2 || '',
            city: dbAddr.city || '',
            state: dbAddr.state || '',
            postalCode: dbAddr.postalCode || '',
            country: dbAddr.country || 'India',
            addressType: 'Home',
            isDefault: true
          };
          setAddresses([initialAddress]);
        } else {
          setAddresses([]);
        }
      }
    }
  }, [curUser]);

  if (!curUser) {
    return (
      <div className="max-w-[480px] mx-auto text-center py-20 px-6 animate-fadeIn select-none">
        <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-10">
          <div className="w-14 h-14 rounded-[2px] bg-[#eeede7] border border-[#dfdfd8] flex items-center justify-center mx-auto mb-5 text-[#777971]">
            <UserIcon size={24} />
          </div>
          <h2 className="font-display text-2xl font-bold text-[#262824] tracking-tight mb-2">Please Sign In</h2>
          <p className="text-xs sm:text-sm text-[#777971] mb-6 leading-relaxed">
            Authenticate with your customer account to view and manage your profile dashboard.
          </p>
          <button
            className="btn-primary min-h-[44px] px-8 text-xs font-bold cursor-pointer"
            onClick={() => setCurPage('home')}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const [myFetchedReviews, setMyFetchedReviews] = useState<any[]>([]);
  const [myFetchedStories, setMyFetchedStories] = useState<any[]>([]);
  const [isReviewsFetched, setIsReviewsFetched] = useState<boolean>(false);

  // Fetch logged in user's reviews & stories
  useEffect(() => {
    const fetchUserReviewsAndStories = async () => {
      if (!curUser) return;
      try {
        if (!auth.currentUser) {
          await auth.authStateReady();
        }
        const firebaseUser = auth.currentUser;
        let token = '';
        if (firebaseUser) {
          token = await firebaseUser.getIdToken();
        }

        const backendUrl = API_BASE;
        const response = await axios.get(`${backendUrl}/reviews/my-reviews`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true
        });

        if (response.data && response.data.success) {
          if (Array.isArray(response.data.reviews)) {
            setMyFetchedReviews(response.data.reviews);
            setIsReviewsFetched(true);
          }
          if (Array.isArray(response.data.stories)) {
            setMyFetchedStories(response.data.stories);
          }
        }
      } catch (err) {
        console.error("Error fetching my-reviews:", err);
      }
    };

    fetchUserReviewsAndStories();
  }, [curUser, activeTab]);

  // Real-time synchronization for review and story updates
  useEffect(() => {
    const socket = getSocket();
    const handleStatusUpdate = (data: { review?: any; story?: any; status: string }) => {
      const updatedItem = data.story || data.review;
      if (!updatedItem) return;

      const itemKey = String(updatedItem._id || updatedItem.id);

      setMyFetchedReviews((prev) =>
        prev.map((r) => {
          if (String(r._id || r.id) === itemKey) {
            return { ...r, ...updatedItem, status: data.status || updatedItem.status };
          }
          return r;
        })
      );

      setMyFetchedStories((prev) => {
        const exists = prev.some((s) => String(s._id || s.id) === itemKey);
        if (exists) {
          return prev.map((s) => (String(s._id || s.id) === itemKey ? { ...s, ...updatedItem, status: data.status || updatedItem.status } : s));
        }
        return [updatedItem, ...prev];
      });
    };

    socket.on(SOCKET_EVENTS.REVIEW_STATUS_UPDATED, handleStatusUpdate);
    socket.on(SOCKET_EVENTS.STORY_UPDATED, handleStatusUpdate);
    socket.on(SOCKET_EVENTS.STORY_REPLIED, handleStatusUpdate);
    socket.on(SOCKET_EVENTS.REVIEW_REPLIED, handleStatusUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.REVIEW_STATUS_UPDATED, handleStatusUpdate);
      socket.off(SOCKET_EVENTS.STORY_UPDATED, handleStatusUpdate);
      socket.off(SOCKET_EVENTS.STORY_REPLIED, handleStatusUpdate);
      socket.off(SOCKET_EVENTS.REVIEW_REPLIED, handleStatusUpdate);
    };
  }, []);

  // Combined user reviews list
  const displayReviews = isReviewsFetched 
    ? myFetchedReviews 
    : (myFetchedReviews.length > 0 
        ? myFetchedReviews 
        : reviews.filter(
            (r) => r.author?.toLowerCase() === curUser?.name?.toLowerCase() || 
                   r.author?.toLowerCase() === `${curUser?.firstName} ${curUser?.lastName}`.trim().toLowerCase()
          )
      );

  // Combined user stories list
  const displayStories = myFetchedStories.length > 0
    ? myFetchedStories
    : (stories || []).filter(
        (s: any) =>
          (s.user && curUser && String(s.user._id || s.user) === String((curUser as any)._id || curUser.uid)) ||
          (s.author && curUser && s.author.toLowerCase() === curUser.name?.toLowerCase()) ||
          (s.author && curUser && s.author.toLowerCase() === `${curUser?.firstName} ${curUser?.lastName}`.trim().toLowerCase())
      );

  // Navigate to product detail when clicking a review
  const handleNavigateToProduct = (rev: any) => {
    let targetId = typeof rev.product === 'object' ? (rev.product._id || rev.product.id) : null;
    let targetTitle = typeof rev.product === 'object' && rev.product?.title 
      ? rev.product.title 
      : (typeof rev.product === 'string' ? rev.product : (rev.productName || ''));

    let foundProd = null;
    if (targetId) {
      foundProd = products.find(p => String(p._id) === String(targetId) || String(p.id) === String(targetId));
    }
    if (!foundProd && targetTitle) {
      foundProd = products.find(p => p.name.toLowerCase() === targetTitle.toLowerCase() || (p as any).title?.toLowerCase() === targetTitle.toLowerCase());
    }

    if (foundProd) {
      setSelectedProductId(foundProd.id || (foundProd as any)._id);
      setCurPage('product-detail');
    } else if (targetId) {
      setSelectedProductId(targetId);
      setCurPage('product-detail');
    } else {
      setCurPage('products');
    }
  };

  // Confirm and execute review deletion via API
  const confirmDeleteReview = async () => {
    if (!deleteConfirmReviewId) return;
    const revId = deleteConfirmReviewId;
    setIsDeletingReview(true);

    try {
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
      }

      const backendUrl = API_BASE;
      await axios.delete(`${backendUrl}/reviews/review-delete/${revId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });

      // Update local reviews state
      setMyFetchedReviews(prev => prev.filter(r => String(r._id || r.id) !== String(revId)));
      showToast("Review deleted successfully.");
    } catch (err: any) {
      console.error("Error deleting review:", err);
      showToast(err.response?.data?.message || err.message || "Failed to delete review.");
    } finally {
      setIsDeletingReview(false);
      setDeleteConfirmReviewId(null);
    }
  };

  // Confirm and execute story deletion via API
  const confirmDeleteStory = async () => {
    if (!deleteConfirmStoryId) return;
    const storyId = deleteConfirmStoryId;
    setIsDeletingStory(true);

    try {
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
      }

      const backendUrl = API_BASE;
      await axios.delete(`${backendUrl}/reviews/review-delete/${storyId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true
      });

      // Update local stories state
      setMyFetchedStories(prev => prev.filter(s => String(s._id || s.id) !== String(storyId)));
      showToast("Story deleted successfully.");
    } catch (err: any) {
      console.error("Error deleting story:", err);
      showToast(err.response?.data?.message || err.message || "Failed to delete story.");
    } finally {
      setIsDeletingStory(false);
      setDeleteConfirmStoryId(null);
    }
  };

  // Helper to extract all matching identifiers for a story/review
  const getItemKeys = (item: any): string[] => {
    const keys: string[] = [];
    if (item._id) keys.push(String(item._id));
    if (item.id) keys.push(String(item.id));
    const text = (item.body || item.comment || item.review || '').trim();
    if (text) keys.push(text);
    if (item.author && text) keys.push(`${item.author}_${text}`);
    return keys;
  };

  // Unread/new review & story tracking for badge
  const userKey = curUser ? (curUser.email || (curUser as any)._id || (curUser as any).uid || 'user') : 'guest';
  const seenIdsStorageKey = `seen_review_ids_${userKey}`;
  const seenStoriesStorageKey = `seen_story_ids_${userKey}`;
  const hasVisitedStoriesKey = `has_visited_stories_${userKey}`;
  const hasVisitedReviewsKey = `has_visited_reviews_${userKey}`;

  const [seenReviewIds, setSeenReviewIds] = useState<string[]>([]);
  const [seenStoryIds, setSeenStoryIds] = useState<string[]>([]);

  // Load seen IDs from localStorage when userKey changes
  useEffect(() => {
    try {
      const savedRev = localStorage.getItem(seenIdsStorageKey);
      setSeenReviewIds(savedRev ? JSON.parse(savedRev) : []);
    } catch {
      setSeenReviewIds([]);
    }

    try {
      const savedStory = localStorage.getItem(seenStoriesStorageKey);
      setSeenStoryIds(savedStory ? JSON.parse(savedStory) : []);
    } catch {
      setSeenStoryIds([]);
    }
  }, [seenIdsStorageKey, seenStoriesStorageKey]);

  // Handle marking reviews as seen
  useEffect(() => {
    if (!curUser || displayReviews.length === 0) return;

    const hasVisited = localStorage.getItem(hasVisitedReviewsKey) === 'true';

    if (activeTab === 'reviews' || hasVisited || localStorage.getItem(seenIdsStorageKey) === null) {
      if (activeTab === 'reviews') {
        localStorage.setItem(hasVisitedReviewsKey, 'true');
      }
      const currentKeys = displayReviews.flatMap(getItemKeys);
      setSeenReviewIds((prev) => {
        const merged = Array.from(new Set([...prev, ...currentKeys]));
        localStorage.setItem(seenIdsStorageKey, JSON.stringify(merged));
        return merged;
      });
    }
  }, [activeTab, displayReviews, curUser, seenIdsStorageKey, hasVisitedReviewsKey]);

  // Calculate unread review count
  const unreadReviewsCount = activeTab === 'reviews' 
    ? 0 
    : displayReviews.filter((r: any) => {
        const keys = getItemKeys(r);
        return keys.length > 0 && !keys.some((k) => seenReviewIds.includes(k));
      }).length;

  // Handle marking stories as seen
  useEffect(() => {
    if (!curUser || displayStories.length === 0) return;

    const hasVisited = localStorage.getItem(hasVisitedStoriesKey) === 'true';

    if (activeTab === 'stories' || hasVisited || localStorage.getItem(seenStoriesStorageKey) === null) {
      if (activeTab === 'stories') {
        localStorage.setItem(hasVisitedStoriesKey, 'true');
      }
      const currentKeys = displayStories.flatMap(getItemKeys);
      setSeenStoryIds((prev) => {
        const merged = Array.from(new Set([...prev, ...currentKeys]));
        localStorage.setItem(seenStoriesStorageKey, JSON.stringify(merged));
        return merged;
      });
    }
  }, [activeTab, displayStories, curUser, seenStoriesStorageKey, hasVisitedStoriesKey]);

  // Calculate unread story count
  const unreadStoriesCount = activeTab === 'stories'
    ? 0
    : displayStories.filter((s: any) => {
        const keys = getItemKeys(s);
        return keys.length > 0 && !keys.some((k) => seenStoryIds.includes(k));
      }).length;




  // Sync addresses list state and update backend if default changes
  const saveAddresses = (newList: SavedAddress[]) => {
    setAddresses(newList);
    
    // Sync default address to backend
    const defAddr = newList.find(a => a.isDefault);
    if (defAddr) {
      updateProfile({
        address: {
          addressLine1: defAddr.addressLine1,
          addressLine2: defAddr.addressLine2,
          city: defAddr.city,
          state: defAddr.state,
          postalCode: defAddr.postalCode,
          country: defAddr.country
        }
      });
    }
  };

  const handleEditProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: `${editFirstName} ${editLastName}`.trim() || curUser.name,
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      phoneNumber: editPhone.trim(),
      dateOfBirth: editDob,
      gender: editGender
    });
    setIsEditProfileOpen(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        updateProfile({
          avatar: reader.result as string
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Address logic handlers
  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddrName(curUser.name || '');
    setAddrPhone(curUser.phoneNumber || '');
    setAddrAltPhone('');
    setAddrLine1('');
    setAddrLine2('');
    setAddrLandmark('');
    setAddrCity('');
    setAddrState('');
    setAddrPin('');
    setAddrType('Home');
    setAddrIsDefault(addresses.length === 0);
    setIsAddressModalOpen(true);
  };

  const openEditAddress = (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setAddrName(addr.name);
    setAddrPhone(addr.phone);
    setAddrAltPhone(addr.alternatePhone || '');
    setAddrLine1(addr.addressLine1);
    setAddrLine2(addr.addressLine2 || '');
    setAddrLandmark(addr.landmark || '');
    setAddrCity(addr.city);
    setAddrState(addr.state);
    setAddrPin(addr.postalCode);
    setAddrType(addr.addressType);
    setAddrIsDefault(addr.isDefault);
    setIsAddressModalOpen(true);
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrName.trim() || !addrPhone.trim() || !addrLine1.trim() || !addrCity.trim() || !addrState.trim() || !addrPin.trim()) {
      alert("Please fill all mandatory fields.");
      return;
    }

    setIsSavingAddress(true);

    const payload = {
      tag: addrType || "Home",
      fullName: addrName.trim(),
      phoneNumber: addrPhone.trim(),
      alternatePhone: addrAltPhone.trim(),
      addressLine1: addrLine1.trim(),
      addressLine2: addrLine2.trim(),
      landmark: addrLandmark.trim(),
      city: addrCity.trim(),
      state: addrState.trim(),
      postalCode: addrPin.trim(),
      country: "India",
      isDefault: addrIsDefault || addresses.length === 0
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

      if (!token) {
        alert("Session expired or user not logged in. Please sign in again.");
        setIsSavingAddress(false);
        return;
      }

      let response;
      if (editingAddressId) {
        response = await axios.put(
          `${API_BASE}/users/address-update/${editingAddressId}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }
        );
      } else {
        response = await axios.post(
          `${API_BASE}/users/address`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          }
        );
      }

      if (response.data && response.data.success) {
        if (fetchCurrentUser) {
          await fetchCurrentUser();
        } else {
          const dbAddresses = response.data.addresses || [];
          if (Array.isArray(dbAddresses) && dbAddresses.length > 0) {
            const mappedList: SavedAddress[] = dbAddresses.map((item: any) => ({
              id: item._id || `addr_${Date.now()}`,
              name: item.fullName || addrName.trim(),
              phone: item.phoneNumber || addrPhone.trim(),
              alternatePhone: item.alternatePhone || '',
              addressLine1: item.addressLine1,
              addressLine2: item.addressLine2 || '',
              landmark: item.landmark || '',
              city: item.city,
              state: item.state,
              postalCode: item.postalCode,
              country: item.country || 'India',
              addressType: item.tag || 'Home',
              isDefault: item.isDefault || false
            }));
            saveAddresses(mappedList);
          }
        }
        setIsAddressModalOpen(false);
      } else {
        alert(response.data?.message || "Failed to save address.");
      }
    } catch (error: any) {
      console.error("Error saving address to backend:", error);
      alert(error.response?.data?.message || "Failed to save address to server.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = (id: string) => {
    setDefaultConfirmAddressId(id);
  };

  const confirmSetDefaultAddress = async () => {
    if (!defaultConfirmAddressId) return;
    const addressId = defaultConfirmAddressId;
    setIsUpdatingDefault(true);

    try {
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
      }

      if (!token) {
        alert("Session expired or user not logged in.");
        setDefaultConfirmAddressId(null);
        return;
      }

      const response = await axios.put(
        `${API_BASE}/users/address/default/${addressId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        const dbAddresses = response.data.addresses || [];
        const mappedList: SavedAddress[] = dbAddresses.map((item: any) => ({
          id: item._id || `addr_${Date.now()}`,
          name: item.fullName || curUser.name,
          phone: item.phoneNumber || curUser.phoneNumber,
          alternatePhone: item.alternatePhone || '',
          addressLine1: item.addressLine1,
          addressLine2: item.addressLine2 || '',
          landmark: item.landmark || '',
          city: item.city,
          state: item.state,
          postalCode: item.postalCode,
          country: item.country || 'India',
          addressType: item.tag || 'Home',
          isDefault: item.isDefault || false
        }));
        saveAddresses(mappedList);
        if (fetchCurrentUser) {
          await fetchCurrentUser();
        }
        setDefaultConfirmAddressId(null);
      } else {
        alert(response.data?.message || "Failed to update default address.");
        setDefaultConfirmAddressId(null);
      }
    } catch (error: any) {
      console.error("Error setting default address:", error);
      alert(error.response?.data?.message || "Failed to update default address.");
      setDefaultConfirmAddressId(null);
    } finally {
      setIsUpdatingDefault(false);
    }
  };

  const handleDeleteAddress = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const addrToDelete = addresses.find(a => a.id === id);
    if (!addrToDelete) return;
    
    if (addrToDelete.isDefault && addresses.length > 1) {
      alert("Please mark another address as default before deleting this one.");
      return;
    }

    setDeleteConfirmAddressId(id);
  };

  const confirmDeleteAddress = async () => {
    if (!deleteConfirmAddressId) return;
    const addressId = deleteConfirmAddressId;
    setIsDeletingAddress(true);

    try {
      if (!auth.currentUser) {
        await auth.authStateReady();
      }
      const firebaseUser = auth.currentUser;
      let token = '';
      if (firebaseUser) {
        token = await firebaseUser.getIdToken();
      }

      if (!token) {
        alert("Session expired or user not logged in.");
        setDeleteConfirmAddressId(null);
        return;
      }

      const response = await axios.delete(
        `${API_BASE}/users/address-delete/${addressId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        if (fetchCurrentUser) {
          await fetchCurrentUser();
        } else {
          const dbAddresses = response.data.addresses || [];
          const mappedList: SavedAddress[] = dbAddresses.map((item: any) => ({
            id: item._id || `addr_${Date.now()}`,
            name: item.fullName || curUser.name,
            phone: item.phoneNumber || curUser.phoneNumber,
            alternatePhone: item.alternatePhone || '',
            addressLine1: item.addressLine1,
            addressLine2: item.addressLine2 || '',
            landmark: item.landmark || '',
            city: item.city,
            state: item.state,
            postalCode: item.postalCode,
            country: item.country || 'India',
            addressType: item.tag || 'Home',
            isDefault: item.isDefault || false
          }));
          saveAddresses(mappedList);
        }
        setDeleteConfirmAddressId(null);
      } else {
        alert(response.data?.message || "Failed to delete address.");
        setDeleteConfirmAddressId(null);
      }
    } catch (error: any) {
      console.error("Error deleting address:", error);
      alert(error.response?.data?.message || "Failed to delete address.");
      setDeleteConfirmAddressId(null);
    } finally {
      setIsDeletingAddress(false);
    }
  };

  const handleLogoutConfirm = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
      setIsLogoutModalOpen(false);
      setCurPage('home');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Find product thumbnail matching review
  const getProductImage = (prodName: string) => {
    const prod = products.find(p => p.name.toLowerCase() === prodName.toLowerCase());
    return prod?.imgs && prod.imgs.length > 0 ? prod.imgs[0] : null;
  };

  const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];

  return (
    <div className="w-full min-h-screen bg-[#f7f6f2] text-[#262824]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 select-none">
        
        {/* 2-Column layout wrapper */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-7 items-start">
          
          {/* LEFT COLUMN - Sidebar Profile Navigation */}
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-[90px] w-full">
            
            {/* User Meta Card */}
            <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-5 flex items-center gap-4">
              <div className="relative w-12 h-12 group cursor-pointer shrink-0" onClick={handleAvatarClick}>
                <div className="w-full h-full rounded-full border border-[#dfdfd8] bg-[#eeede7] text-[#262824] font-bold text-sm flex items-center justify-center overflow-hidden">
                  {curUser.avatar ? (
                    <img src={curUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (curUser.firstName || curUser.name || "U").split(' ').map((w) => w[0]).join('').toUpperCase().substring(0, 2)
                  )}
                </div>
                <div className="absolute inset-0 bg-[#262824]/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera size={14} className="text-white" />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              
              <div className="min-w-0">
                <span className="text-[10px] text-[#777971] font-bold uppercase tracking-wider block">Customer</span>
                <h2 className="font-display font-bold text-[#262824] truncate leading-tight text-sm">
                  {curUser.firstName ? `${curUser.firstName} ${curUser.lastName || ''}`.trim() : curUser.name}
                </h2>
                <span className="text-xs text-[#777971] font-mono block mt-0.5 truncate">{curUser.email}</span>
              </div>
            </div>

            {/* Nav Items Panel */}
            <aside className="bg-white border border-[#dfdfd8] rounded-[2px] overflow-hidden flex flex-row lg:flex-col overflow-x-auto divide-x lg:divide-x-0 lg:divide-y divide-[#dfdfd8] scrollbar-none">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-3 px-4 py-3.5 text-xs uppercase font-bold tracking-wider transition-all cursor-pointer text-left border-none w-full outline-none min-h-[44px] ${
                  activeTab === 'profile'
                    ? 'bg-[#262824] text-white'
                    : 'text-[#777971] hover:bg-[#eeede7] hover:text-[#262824] bg-transparent'
                }`}
              >
                <UserIcon size={14} />
                <span>Profile Details</span>
              </button>
              
              <button
                onClick={() => setActiveTab('address')}
                className={`flex items-center gap-3 px-4 py-3.5 text-xs uppercase font-bold tracking-wider transition-all cursor-pointer text-left border-none w-full outline-none min-h-[44px] ${
                  activeTab === 'address'
                    ? 'bg-[#262824] text-white'
                    : 'text-[#777971] hover:bg-[#eeede7] hover:text-[#262824] bg-transparent'
                }`}
              >
                <MapPin size={14} />
                <span>Manage Address</span>
              </button>

              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex items-center justify-between px-4 py-3.5 text-xs uppercase font-bold tracking-wider transition-all cursor-pointer text-left border-none w-full outline-none min-h-[44px] ${
                  activeTab === 'reviews'
                    ? 'bg-[#262824] text-white'
                    : 'text-[#777971] hover:bg-[#eeede7] hover:text-[#262824] bg-transparent'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Star size={14} />
                  <span>Reviews</span>
                </span>
                {unreadReviewsCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] font-mono ${
                    activeTab === 'reviews' ? 'bg-[#3b3d39] text-white' : 'bg-[#eeede7] text-[#262824]'
                  }`}>
                    {unreadReviewsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('stories')}
                className={`flex items-center justify-between px-4 py-3.5 text-xs uppercase font-bold tracking-wider transition-all cursor-pointer text-left border-none w-full outline-none min-h-[44px] ${
                  activeTab === 'stories'
                    ? 'bg-[#262824] text-white'
                    : 'text-[#777971] hover:bg-[#eeede7] hover:text-[#262824] bg-transparent'
                }`}
              >
                <span className="flex items-center gap-3">
                  <MessageSquare size={14} />
                  <span>Stories</span>
                </span>
                {unreadStoriesCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] font-mono ${
                    activeTab === 'stories' ? 'bg-[#3b3d39] text-white' : 'bg-[#eeede7] text-[#262824]'
                  }`}>
                    {unreadStoriesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="flex items-center gap-3 px-4 py-3.5 text-xs uppercase font-bold tracking-wider text-[#8e2a2a] hover:bg-[#f9eded] hover:text-[#722020] transition-all cursor-pointer text-left border-none w-full outline-none bg-transparent min-h-[44px]"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </aside>
          </div>

          {/* RIGHT COLUMN - Tab Views */}
          <main className="lg:col-span-3 bg-white border border-[#dfdfd8] rounded-[2px] p-6 sm:p-8 min-h-[440px] animate-fadeIn">
            
            {/* TAB 1: Profile Information */}
            {activeTab === 'profile' && (
              <div className="animate-fadeIn space-y-8">
                <div className="flex justify-between items-center pb-4 border-b border-[#dfdfd8]">
                  <div>
                    <h2 className="font-display text-xl font-bold text-[#262824] tracking-tight">Profile Information</h2>
                    <p className="text-xs text-[#777971] mt-0.5">Manage your personal and contact details.</p>
                  </div>
                  <button
                    onClick={() => setIsEditProfileOpen(true)}
                    className="btn-secondary flex items-center gap-1.5 min-h-[40px] px-3.5 text-xs font-bold cursor-pointer"
                  >
                    <Edit2 size={13} /> <span>Edit Details</span>
                  </button>
                </div>

                {/* Information Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Personal Information card */}
                  <div className="border border-[#dfdfd8] rounded-[2px] p-5 bg-[#eeede7]/40 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-[#262824] font-bold text-xs uppercase tracking-wider pb-2 border-b border-[#dfdfd8]">
                      <UserIcon size={14} className="text-[#262824]" />
                      <span>Personal Details</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] text-[#777971] block mb-0.5 uppercase tracking-wider font-bold">First Name</span>
                        <span className="font-bold text-[#262824] text-sm">{curUser.firstName || <span className="text-[#777971] font-normal italic">Not set</span>}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#777971] block mb-0.5 uppercase tracking-wider font-bold">Last Name</span>
                        <span className="font-bold text-[#262824] text-sm">{curUser.lastName || <span className="text-[#777971] font-normal italic">Not set</span>}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#777971] block mb-0.5 uppercase tracking-wider font-bold">Gender</span>
                        <span className="font-bold text-[#262824] text-sm">{curUser.gender || 'Prefer not to say'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#777971] block mb-0.5 uppercase tracking-wider font-bold">Date of Birth</span>
                        <span className="font-bold text-[#262824] text-sm">
                          {curUser.dateOfBirth ? new Date(curUser.dateOfBirth).toLocaleDateString(undefined, { dateStyle: 'medium' }) : <span className="text-[#777971] font-normal italic">Not set</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information card */}
                  <div className="border border-[#dfdfd8] rounded-[2px] p-5 bg-[#eeede7]/40 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-[#262824] font-bold text-xs uppercase tracking-wider pb-2 border-b border-[#dfdfd8]">
                      <Mail size={14} className="text-[#262824]" />
                      <span>Contact Info</span>
                    </div>
                    <div className="flex flex-col gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-[#777971] block mb-0.5 uppercase tracking-wider font-bold">Email Address</span>
                        <span className="font-bold text-[#262824] text-sm font-mono">{curUser.email}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#777971] block mb-0.5 uppercase tracking-wider font-bold">Phone Number</span>
                        <span className="font-bold text-[#262824] text-sm flex items-center gap-1.5">
                          <Phone size={13} className="text-[#777971]" />
                          {curUser.phoneNumber || <span className="text-[#777971] font-normal italic">Not set</span>}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#777971] block mb-0.5 uppercase tracking-wider font-bold">Member Since</span>
                        <span className="font-semibold text-[#777971] text-xs flex items-center gap-1.5">
                          <Calendar size={13} className="text-[#777971]" />
                          {/* @ts-ignore */}
                        {curUser.createdAt ? new Date(curUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : "July 2026"}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Primary / default address card */}
              <div className="border border-[#dfdfd8] rounded-[2px] p-5 bg-[#eeede7]/40">
                <div className="flex justify-between items-center text-[#262824] font-bold text-xs uppercase tracking-wider pb-2 border-b border-[#dfdfd8] mb-4">
                  <span className="flex items-center gap-2">
                    <MapPin size={14} className="text-[#262824]" />
                    <span>Primary Address</span>
                  </span>
                  {(defaultAddress || curUser.address?.addressLine1) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-[#eeede7] text-[#262824] font-mono uppercase">
                      {defaultAddress ? (defaultAddress.addressType || 'Default') : 'Primary'}
                    </span>
                  )}
                </div>
                {defaultAddress ? (
                  <div className="text-xs text-[#777971] leading-relaxed space-y-1">
                    <p className="font-bold text-[#262824] text-sm">{defaultAddress.name}</p>
                    <p className="text-[#777971] font-semibold flex items-center gap-1">
                      <Phone size={12} className="text-[#777971]" /> {defaultAddress.phone}
                    </p>
                    <p className="mt-1 text-[#262824]">{defaultAddress.addressLine1}</p>
                    {defaultAddress.addressLine2 && <p className="text-[#262824]">{defaultAddress.addressLine2}</p>}
                    {defaultAddress.landmark && <p className="text-[#777971]">Landmark: {defaultAddress.landmark}</p>}
                    <p className="font-semibold text-[#262824]">
                      {defaultAddress.city}, {defaultAddress.state} - <span className="font-mono font-bold text-[#262824]">{defaultAddress.postalCode}</span>
                    </p>
                    <p className="text-[#777971] mt-1 font-medium">{defaultAddress.country}</p>
                  </div>
                ) : curUser.address?.addressLine1 ? (
                  <div className="text-xs text-[#777971] leading-relaxed space-y-1">
                    <p className="font-bold text-[#262824] text-sm">{curUser.name}</p>
                    <p className="mt-1 text-[#262824]">{curUser.address.addressLine1}</p>
                    {curUser.address.addressLine2 && <p className="text-[#262824]">{curUser.address.addressLine2}</p>}
                    <p className="font-semibold text-[#262824]">{curUser.address.city}, {curUser.address.state} - <span className="font-mono font-bold">{curUser.address.postalCode}</span></p>
                    <p className="text-[#777971] mt-1 font-medium">{curUser.address.country}</p>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[#777971] italic">
                    No primary address configured. Go to "Manage Address" to save addresses.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: Manage Address */}
          {activeTab === 'address' && (
            <div className="animate-fadeIn space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-[#dfdfd8]">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#262824] tracking-tight">Manage Address</h2>
                  <p className="text-xs text-[#777971] mt-0.5">Add or update your delivery destinations.</p>
                </div>
                <button
                  onClick={openAddAddress}
                  className="btn-primary flex items-center gap-2 min-h-[40px] px-3.5 text-xs font-bold cursor-pointer"
                >
                  <Plus size={14} /> <span>Add Address</span>
                </button>
              </div>

              {addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => !addr.isDefault && handleSetDefaultAddress(addr.id)}
                      className={`border rounded-[2px] p-5 relative transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        addr.isDefault
                          ? 'border-[#262824] ring-1 ring-[#262824] bg-[#eeede7]/40'
                          : 'border-[#dfdfd8] hover:border-[#777971] bg-white'
                      }`}
                    >
                      <div>
                        {/* Header badge */}
                        <div className="flex items-center justify-between mb-3.5">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-[#eeede7] text-[#262824] border border-[#dfdfd8]">
                            {addr.addressType === 'Home' && <HomeIcon size={11} />}
                            {addr.addressType === 'Work' && <Building size={11} />}
                            {addr.addressType === 'Other' && <HelpCircle size={11} />}
                            <span>{addr.addressType}</span>
                          </span>
                          
                          {addr.isDefault && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-[#edf3ee] text-[#3d6547] border border-[#a8c6b0] font-mono">
                              Default
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-[#262824] text-sm">{addr.name}</p>
                          <p className="text-[#777971] font-semibold flex items-center gap-1">
                            <Phone size={11} className="text-[#777971]" /> {addr.phone}
                          </p>
                          <p className="text-[#262824] leading-relaxed pt-1.5">{addr.addressLine1}</p>
                          {addr.addressLine2 && <p className="text-[#262824] leading-relaxed">{addr.addressLine2}</p>}
                          <p className="text-[#262824] font-semibold">
                            {addr.city}, {addr.state} - <span className="font-mono font-bold text-[#262824]">{addr.postalCode}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 mt-5 pt-3 border-t border-[#dfdfd8]">
                        {!addr.isDefault && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSetDefaultAddress(addr.id); }}
                            className="text-xs font-bold text-[#262824] hover:underline bg-transparent border-none cursor-pointer outline-none uppercase tracking-wider min-h-[40px] inline-flex items-center"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditAddress(addr); }}
                          className="text-[#777971] hover:text-[#262824] w-8 h-8 rounded-[2px] hover:bg-[#eeede7] flex items-center justify-center cursor-pointer border-none bg-transparent transition-colors"
                          title="Edit Address"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteAddress(addr.id, e)}
                          className="text-[#777971] hover:text-[#8e2a2a] w-8 h-8 rounded-[2px] hover:bg-[#f9eded] flex items-center justify-center cursor-pointer border-none bg-transparent transition-colors"
                          title="Delete Address"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Address Empty State */
                <div className="text-center py-16 px-6">
                  <div className="w-14 h-14 rounded-[2px] bg-[#eeede7] border border-[#dfdfd8] flex items-center justify-center mx-auto mb-4 text-[#777971]">
                    <MapPin size={22} />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#262824] mb-1.5">No addresses saved</h3>
                  <p className="text-xs text-[#777971] max-w-sm mx-auto mb-6 leading-relaxed">Create saved addresses to fast-track checkout transactions next time.</p>
                  <button onClick={openAddAddress} className="btn-primary min-h-[40px] py-2 px-5 text-xs font-bold uppercase tracking-wider cursor-pointer">
                    Add Address Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Reviews & Ratings */}
          {activeTab === 'reviews' && (
            <div className="animate-fadeIn space-y-6">
              <div className="pb-4 border-b border-[#dfdfd8]">
                <h2 className="font-display text-xl font-bold text-[#262824] tracking-tight">My Reviews &amp; Ratings</h2>
                <p className="text-xs text-[#777971] mt-0.5">Feedback and ratings you've shared on purchased products.</p>
              </div>

              {displayReviews.length > 0 ? (
                <div className="space-y-4">
                  {displayReviews.map((rev: any) => {
                    const prodTitle = typeof rev.product === 'object' && rev.product?.title ? rev.product.title : (typeof rev.product === 'string' ? rev.product : (rev.productName || 'Product'));
                    const img = (typeof rev.product === 'object' && rev.product?.images?.length > 0) ? rev.product.images[0].url : getProductImage(prodTitle);
                    const revDate = rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (rev.date || 'Jul 19, 2026');
                    const revRating = Number(rev.rating) || 5;
                    const revBody = rev.review || rev.comment || rev.body || '';
                    const revReply = rev.reply || rev.adminReply || '';
                    const revId = rev._id || rev.id;

                    return (
                      <div
                        key={revId}
                        onClick={() => handleNavigateToProduct(rev)}
                        className="border border-[#dfdfd8] rounded-[2px] p-5 hover:border-[#777971] transition-all flex flex-col sm:flex-row gap-5 items-start bg-[#eeede7]/30 cursor-pointer"
                      >
                        {/* Product Thumbnail */}
                        <div className="w-16 h-20 rounded-[2px] border border-[#dfdfd8] bg-white flex items-center justify-center shrink-0 overflow-hidden select-none">
                          {img ? (
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-[2px] bg-[#eeede7] flex items-center justify-center text-[#262824] font-bold text-xs select-none">FORMA</div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <h4 className="font-display font-bold text-[#262824] text-sm leading-tight truncate hover:underline">{prodTitle}</h4>
                            <span className="text-xs text-[#777971] font-mono shrink-0">{revDate}</span>
                          </div>

                          {/* Star rating block */}
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={i < revRating ? "fill-[#777d62] text-[#777d62]" : "text-[#dfdfd8]"}
                              />
                            ))}
                          </div>

                          {/* Review Body */}
                          <p className="text-xs text-[#262824] leading-relaxed break-words font-normal">{revBody}</p>

                          {/* Admin Reply */}
                          {revReply && (
                            <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-4 mt-3 text-xs leading-relaxed relative">
                              <p className="font-bold text-[#262824]">Replied by Customer Concierge:</p>
                              <p className="text-[#777971] mt-1 italic">"{revReply}"</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="self-end sm:self-start shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmReviewId(String(revId));
                            }}
                            className="text-[#777971] hover:text-[#8e2a2a] hover:bg-[#f9eded] w-8 h-8 rounded-[2px] cursor-pointer transition-colors border-none bg-transparent flex items-center justify-center"
                            title="Delete Review"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Reviews Empty State */
                <div className="text-center py-16 px-6">
                  <div className="w-14 h-14 rounded-[2px] bg-[#eeede7] border border-[#dfdfd8] flex items-center justify-center mx-auto mb-4 text-[#777971]">
                    <Star size={22} />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#262824] mb-1.5">No reviews written</h3>
                  <p className="text-xs text-[#777971] max-w-sm mx-auto mb-6 leading-relaxed">Let other customers know about your experience. Share your thoughts on our products.</p>
                  <button onClick={() => setCurPage('products')} className="btn-primary min-h-[40px] py-2 px-5 text-xs font-bold uppercase tracking-wider cursor-pointer">
                    Browse Products
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Stories & Messages */}
          {activeTab === 'stories' && (
            <div className="animate-fadeIn space-y-6">
              <div className="pb-4 border-b border-[#dfdfd8]">
                <h2 className="font-display text-xl font-bold text-[#262824] tracking-tight">My Stories &amp; Messages</h2>
                <p className="text-xs text-[#777971] mt-0.5">Testimonials, stories, and concierge responses regarding your experience.</p>
              </div>

              {displayStories.length > 0 ? (
                <div className="space-y-4">
                  {displayStories.map((story: any) => {
                    const storyDate = story.createdAt ? new Date(story.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (story.date || 'Recent');
                    const storyRating = Number(story.rating) || 5;
                    const storyBody = story.body || story.comment || '';
                    const storyReply = story.adminReply || story.reply || '';
                    const storyId = story._id || story.id;
                    const status = story.status || (story.approved ? 'Approved' : 'Pending');

                    return (
                      <div
                        key={storyId}
                        className="border border-[#dfdfd8] rounded-[2px] p-5 hover:border-[#777971] transition-all flex flex-col sm:flex-row gap-5 items-start bg-[#eeede7]/30"
                      >
                        {/* User Avatar Initial */}
                        <div className="w-10 h-10 rounded-[2px] border border-[#dfdfd8] bg-[#eeede7] flex items-center justify-center shrink-0 overflow-hidden select-none text-[#262824] font-bold text-xs">
                          {story.ini || (story.author ? story.author.substring(0, 2).toUpperCase() : 'ME')}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                              <h4 className="font-display font-bold text-[#262824] text-sm leading-tight truncate">{story.author || curUser.name}</h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[2px] uppercase tracking-wider font-mono border ${
                                status === 'Approved' ? 'bg-[#edf3ee] text-[#3d6547] border-[#a8c6b0]' : 'bg-[#eeede7] text-[#777971] border-[#dfdfd8]'
                              }`}>
                                {status}
                              </span>
                            </div>
                            <span className="text-xs text-[#777971] font-mono shrink-0">{storyDate}</span>
                          </div>

                          {/* Star rating block */}
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={i < storyRating ? "fill-[#777d62] text-[#777d62]" : "text-[#dfdfd8]"}
                              />
                            ))}
                            {story.role && <span className="text-xs text-[#777971] ml-2">({story.role})</span>}
                          </div>

                          {/* Story Body */}
                          <p className="text-xs text-[#262824] leading-relaxed break-words font-normal">{storyBody}</p>

                          {/* Admin Reply */}
                          {storyReply ? (
                            <div className="bg-white border border-[#dfdfd8] rounded-[2px] p-4 mt-3 text-xs leading-relaxed relative">
                              <p className="font-bold text-[#262824]">Replied by Customer Concierge:</p>
                              <p className="text-[#777971] mt-1 italic">"{storyReply}"</p>
                            </div>
                          ) : (
                            <p className="text-xs text-[#777971] italic mt-1.5">No reply from support yet.</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="self-end sm:self-start shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmStoryId(String(storyId));
                            }}
                            className="text-[#777971] hover:text-[#8e2a2a] hover:bg-[#f9eded] w-8 h-8 rounded-[2px] cursor-pointer transition-colors border-none bg-transparent flex items-center justify-center"
                            title="Delete Story"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Stories Empty State */
                <div className="text-center py-16 px-6">
                  <div className="w-14 h-14 rounded-[2px] bg-[#eeede7] border border-[#dfdfd8] flex items-center justify-center mx-auto mb-4 text-[#777971]">
                    <MessageSquare size={22} />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#262824] mb-1.5">No stories or messages yet</h3>
                  <p className="text-xs text-[#777971] max-w-sm mx-auto mb-6 leading-relaxed">When you share customer stories or testimonials and support responds, concierge replies will appear here.</p>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* MODAL 1: Edit Profile Modal Overlay */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-[#262824]/60 backdrop-blur-xs z-[9990] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn select-none">
          <div className="bg-white rounded-[2px] w-full max-w-[500px] shadow-2xl relative border border-[#dfdfd8] overflow-hidden my-auto animate-scaleIn">
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-[2px] border border-[#dfdfd8] flex items-center justify-center text-[#777971] hover:text-[#262824] hover:bg-[#eeede7] transition-colors cursor-pointer bg-white"
              onClick={() => setIsEditProfileOpen(false)}
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>
            <div className="p-6 sm:p-8">
              <h3 className="font-display text-lg font-bold text-[#262824] uppercase tracking-wider mb-1">Edit Profile Info</h3>
              <p className="text-xs text-[#777971] mb-6">Update your basic details for shipping and personalization.</p>
              
              <form onSubmit={handleEditProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col text-xs font-semibold text-[#777971]">
                    <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">First Name</label>
                    <input
                      type="text"
                      className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs focus:outline-none focus:border-[#262824] transition-all"
                      required
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col text-xs font-semibold text-[#777971]">
                    <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">Last Name</label>
                    <input
                      type="text"
                      className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs focus:outline-none focus:border-[#262824] transition-all"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col text-xs font-semibold text-[#777971]">
                  <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs focus:outline-none focus:border-[#262824] transition-all"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>

                <div className="flex flex-col text-xs font-semibold text-[#777971]">
                  <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs focus:outline-none focus:border-[#262824] transition-all"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                  />
                </div>

                <div className="flex flex-col text-xs font-semibold text-[#777971]">
                  <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">Gender</label>
                  <select
                    className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs focus:outline-none focus:border-[#262824] transition-all cursor-pointer"
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-[#dfdfd8] mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="btn-secondary min-h-[40px] px-5 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary min-h-[40px] px-6 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add/Edit Address Modal Overlay */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-[#262824]/60 backdrop-blur-xs z-[9990] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn select-none">
          <div className="bg-white rounded-[2px] w-full max-w-[540px] shadow-2xl relative border border-[#dfdfd8] overflow-hidden my-auto animate-scaleIn">
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-[2px] border border-[#dfdfd8] flex items-center justify-center text-[#777971] hover:text-[#262824] hover:bg-[#eeede7] transition-colors cursor-pointer bg-white"
              onClick={() => setIsAddressModalOpen(false)}
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>
            
            <div className="p-6 sm:p-8">
              <h3 className="font-display text-lg font-bold text-[#262824] uppercase tracking-wider mb-1">
                {editingAddressId ? "Edit Address" : "Add Address"}
              </h3>
              <p className="text-xs text-[#777971] mb-6">Enter details for parcel deliveries and tracking updates.</p>

              <form onSubmit={handleAddressSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col text-xs font-semibold text-[#777971]">
                    <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">Recipient Name <span className="text-[#8e2a2a]">*</span></label>
                    <input
                      type="text"
                      className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs placeholder:text-[#777971]/50 focus:outline-none focus:border-[#262824] transition-all"
                      required
                      placeholder="e.g. John Doe"
                      value={addrName}
                      onChange={(e) => setAddrName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col text-xs font-semibold text-[#777971]">
                    <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">Phone Number <span className="text-[#8e2a2a]">*</span></label>
                    <input
                      type="tel"
                      className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs placeholder:text-[#777971]/50 focus:outline-none focus:border-[#262824] transition-all"
                      required
                      placeholder="10-digit number"
                      value={addrPhone}
                      onChange={(e) => setAddrPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col text-xs font-semibold text-[#777971]">
                  <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">Address Line 1 <span className="text-[#8e2a2a]">*</span></label>
                  <input
                    type="text"
                    className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs placeholder:text-[#777971]/50 focus:outline-none focus:border-[#262824] transition-all"
                    required
                    placeholder="House/Apt No., Building Name, Street"
                    value={addrLine1}
                    onChange={(e) => setAddrLine1(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col text-xs font-semibold text-[#777971]">
                    <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs placeholder:text-[#777971]/50 focus:outline-none focus:border-[#262824] transition-all"
                      placeholder="Area, Colony"
                      value={addrLine2}
                      onChange={(e) => setAddrLine2(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col text-xs font-semibold text-[#777971]">
                    <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">Landmark (Optional)</label>
                    <input
                      type="text"
                      className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs placeholder:text-[#777971]/50 focus:outline-none focus:border-[#262824] transition-all"
                      placeholder="Near Bus Stand backside"
                      value={addrLandmark}
                      onChange={(e) => setAddrLandmark(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col text-xs font-semibold text-[#777971]">
                  <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">Alternate Phone (Optional)</label>
                  <input
                    type="tel"
                    className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs placeholder:text-[#777971]/50 focus:outline-none focus:border-[#262824] transition-all"
                    placeholder="Alternate phone number"
                    value={addrAltPhone}
                    onChange={(e) => setAddrAltPhone(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col text-xs font-semibold text-[#777971]">
                    <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">City <span className="text-[#8e2a2a]">*</span></label>
                    <input
                      type="text"
                      className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs placeholder:text-[#777971]/50 focus:outline-none focus:border-[#262824] transition-all"
                      required
                      value={addrCity}
                      onChange={(e) => setAddrCity(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col text-xs font-semibold text-[#777971]">
                    <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">State <span className="text-[#8e2a2a]">*</span></label>
                    <input
                      type="text"
                      className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs placeholder:text-[#777971]/50 focus:outline-none focus:border-[#262824] transition-all"
                      required
                      value={addrState}
                      onChange={(e) => setAddrState(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col text-xs font-semibold text-[#777971]">
                    <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">PIN Code <span className="text-[#8e2a2a]">*</span></label>
                    <input
                      type="text"
                      className="h-10 w-full px-3 py-2 rounded-[2px] border border-[#dfdfd8] bg-[#f7f6f2] text-[#262824] text-xs placeholder:text-[#777971]/50 focus:outline-none focus:border-[#262824] transition-all"
                      required
                      placeholder="6 digits"
                      value={addrPin}
                      onChange={(e) => setAddrPin(e.target.value)}
                    />
                  </div>
                </div>

                {/* Type & Default controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-3 border-t border-[#dfdfd8] mt-6">
                  <div className="flex flex-col text-xs font-semibold text-[#777971]">
                    <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5">Address Type</label>
                    <div className="flex gap-2 mt-1">
                      {(['Home', 'Work', 'Other'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAddrType(type)}
                          className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-[2px] border cursor-pointer transition-all ${
                            addrType === type
                              ? 'bg-[#262824] text-white border-[#262824]'
                              : 'bg-white border-[#dfdfd8] text-[#777971] hover:border-[#262824] hover:text-[#262824]'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {addresses.length > 0 && (
                    <label className="flex items-center gap-2.5 text-xs font-semibold text-[#262824] cursor-pointer self-end select-none py-2">
                      <input
                        type="checkbox"
                        checked={addrIsDefault}
                        disabled={addresses.length === 1 && editingAddressId === addresses[0].id}
                        onChange={(e) => setAddrIsDefault(e.target.checked)}
                        className="rounded-[2px] border-[#dfdfd8] text-[#262824] focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      Set as Default Address
                    </label>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-[#dfdfd8] mt-6">
                  <button
                    type="button"
                    disabled={isSavingAddress}
                    onClick={() => setIsAddressModalOpen(false)}
                    className="btn-secondary min-h-[40px] px-5 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAddress}
                    className="btn-primary min-h-[40px] px-6 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSavingAddress ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-white" />
                        <span>Saving...</span>
                      </>
                    ) : editingAddressId ? (
                      "Save Changes"
                    ) : (
                      "Save Address"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Logout Confirmation Modal Overlay */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-[#262824]/60 backdrop-blur-xs z-[9990] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn select-none">
          <div className="bg-white rounded-[2px] w-full max-w-[420px] shadow-2xl relative border border-[#dfdfd8] overflow-hidden my-auto animate-scaleIn">
            <div className="p-6 sm:p-8 text-center select-none">
              <div className="w-12 h-12 bg-[#f9eded] border border-[#d9a5a5] text-[#8e2a2a] rounded-[2px] flex items-center justify-center mx-auto mb-4">
                <LogOut size={20} />
              </div>
              <h3 className="font-display text-base font-bold text-[#262824] uppercase tracking-wider mb-2">Confirm Logout</h3>
              <p className="text-xs text-[#777971] leading-relaxed mb-6">Are you sure you want to log out from your account?</p>
              
              <div className="flex gap-3 justify-center">
                <button
                  disabled={isLoggingOut}
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="btn-secondary min-h-[40px] px-5 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={isLoggingOut}
                  onClick={handleLogoutConfirm}
                  className="min-h-[40px] px-6 py-2 rounded-[2px] bg-[#8e2a2a] hover:bg-[#722020] text-white font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Logging Out...</span>
                    </>
                  ) : (
                    <span>Logout</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Set Default Address Confirmation Modal Overlay */}
      {defaultConfirmAddressId && (
        <div className="fixed inset-0 bg-[#262824]/60 backdrop-blur-xs z-[9990] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn select-none">
          <div className="bg-white rounded-[2px] w-full max-w-[420px] shadow-2xl relative border border-[#dfdfd8] overflow-hidden my-auto animate-scaleIn">
            <div className="p-6 sm:p-8 text-center select-none">
              {isUpdatingDefault ? (
                <div className="py-6 flex flex-col items-center justify-center">
                  <Loader2 size={32} className="text-[#262824] animate-spin mb-3" />
                  <h4 className="font-display text-sm font-bold text-[#262824]">Updating Default Address...</h4>
                  <p className="text-xs text-[#777971] mt-1">Please wait while your address preference is saved.</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 bg-[#eeede7] border border-[#dfdfd8] text-[#262824] rounded-[2px] flex items-center justify-center mx-auto mb-4">
                    <MapPin size={20} />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#262824] uppercase tracking-wider mb-2">Set Default Address</h3>
                  <p className="text-xs text-[#777971] leading-relaxed mb-6">
                    Are you sure you want to select this as your default delivery address?
                  </p>
                  
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setDefaultConfirmAddressId(null)}
                      className="btn-secondary min-h-[40px] px-5 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      No
                    </button>
                    <button
                      onClick={confirmSetDefaultAddress}
                      className="btn-primary min-h-[40px] px-6 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Yes, Set Default
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Delete Address Confirmation Modal Overlay */}
      {deleteConfirmAddressId && (
        <div className="fixed inset-0 bg-[#262824]/60 backdrop-blur-xs z-[9990] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn select-none">
          <div className="bg-white rounded-[2px] w-full max-w-[420px] shadow-2xl relative border border-[#dfdfd8] overflow-hidden my-auto animate-scaleIn">
            <div className="p-6 sm:p-8 text-center select-none">
              {isDeletingAddress ? (
                <div className="py-6 flex flex-col items-center justify-center">
                  <Loader2 size={32} className="text-[#8e2a2a] animate-spin mb-3" />
                  <h4 className="font-display text-sm font-bold text-[#262824]">Deleting Address...</h4>
                  <p className="text-xs text-[#777971] mt-1">Please wait while your address is being removed.</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 bg-[#f9eded] border border-[#d9a5a5] text-[#8e2a2a] rounded-[2px] flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={20} />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#262824] uppercase tracking-wider mb-2">Delete Address</h3>
                  <p className="text-xs text-[#777971] leading-relaxed mb-6">
                    Are you sure you want to delete this address? This action cannot be undone.
                  </p>
                  
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setDeleteConfirmAddressId(null)}
                      className="btn-secondary min-h-[40px] px-5 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      No
                    </button>
                    <button
                      onClick={confirmDeleteAddress}
                      className="min-h-[40px] px-6 py-2 rounded-[2px] bg-[#8e2a2a] hover:bg-[#722020] text-white font-bold text-xs tracking-wider uppercase transition-all cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Delete Review Confirmation Modal Overlay */}
      {deleteConfirmReviewId && (
        <div className="fixed inset-0 bg-[#262824]/60 backdrop-blur-xs z-[9990] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn select-none">
          <div className="bg-white rounded-[2px] w-full max-w-[420px] shadow-2xl relative border border-[#dfdfd8] overflow-hidden my-auto animate-scaleIn">
            <div className="p-6 sm:p-8 text-center select-none">
              {isDeletingReview ? (
                <div className="py-6 flex flex-col items-center justify-center">
                  <Loader2 size={32} className="text-[#8e2a2a] animate-spin mb-3" />
                  <h4 className="font-display text-sm font-bold text-[#262824]">Deleting Review...</h4>
                  <p className="text-xs text-[#777971] mt-1">Please wait while your review is being removed.</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 bg-[#f9eded] border border-[#d9a5a5] text-[#8e2a2a] rounded-[2px] flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={20} />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#262824] uppercase tracking-wider mb-2">Delete Review</h3>
                  <p className="text-xs text-[#777971] leading-relaxed mb-6">
                    Are you sure you want to delete this product review?
                  </p>
                  
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setDeleteConfirmReviewId(null)}
                      className="btn-secondary min-h-[40px] px-5 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteReview}
                      className="min-h-[40px] px-6 py-2 rounded-[2px] bg-[#8e2a2a] hover:bg-[#722020] text-white font-bold text-xs tracking-wider uppercase transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: Delete Story Confirmation Modal Overlay */}
      {deleteConfirmStoryId && (
        <div className="fixed inset-0 bg-[#262824]/60 backdrop-blur-xs z-[9990] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn select-none">
          <div className="bg-white rounded-[2px] w-full max-w-[420px] shadow-2xl relative border border-[#dfdfd8] overflow-hidden my-auto animate-scaleIn">
            <div className="p-6 sm:p-8 text-center select-none">
              {isDeletingStory ? (
                <div className="py-6 flex flex-col items-center justify-center">
                  <Loader2 size={32} className="text-[#8e2a2a] animate-spin mb-3" />
                  <h4 className="font-display text-sm font-bold text-[#262824]">Deleting Story...</h4>
                  <p className="text-xs text-[#777971] mt-1">Please wait while your story is being removed.</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 bg-[#f9eded] border border-[#d9a5a5] text-[#8e2a2a] rounded-[2px] flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={20} />
                  </div>
                  <h3 className="font-display text-base font-bold text-[#262824] uppercase tracking-wider mb-2">Delete Story</h3>
                  <p className="text-xs text-[#777971] leading-relaxed mb-6">
                    Are you sure you want to delete this community story?
                  </p>
                  
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setDeleteConfirmStoryId(null)}
                      className="btn-secondary min-h-[40px] px-5 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteStory}
                      className="min-h-[40px] px-6 py-2 rounded-[2px] bg-[#8e2a2a] hover:bg-[#722020] text-white font-bold text-xs tracking-wider uppercase transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default Profile;
