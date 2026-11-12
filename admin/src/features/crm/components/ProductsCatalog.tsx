import React, { useState } from 'react';
import { useApp } from '../../../core/context/AppContext';
import type { Product } from '../../../core/types';
import {
  Search,
  PlusCircle,
  FileDown,
  FileUp,
  Edit2,
  Copy,
  Trash2,
  Package,
  Layers,
  CheckSquare,
  Square,
  AlertTriangle,
  ArrowLeft,
  Upload,
  Star,
  ShieldCheck
} from 'lucide-react';
import { Badge } from '@/components/reui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProductsCatalogProps {
  onTabChange: (tab: 'dashboard' | 'orders' | 'products' | 'customers' | 'add' | 'banners' | 'leads' | 'reviews') => void;
}

const ProductsCatalog: React.FC<ProductsCatalogProps> = ({ onTabChange }) => {
  const {
    products,
    deleteProduct,
    bulkDeleteProducts,
    duplicateProduct,
    updateProduct,
    addProduct,
    showToast
  } = useApp();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Sorting
  const [sortField, setSortField] = useState<keyof Product>('id');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selection
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

  // Editing Product State (replaces modal, renders full editing page view when active)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletedImagePublicIds, setDeletedImagePublicIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Specifications panel toggle in Edit
  const [editSpecsTab, setEditSpecsTab] = useState<'basic' | 'specs' | 'gallery'>('basic');

  // Brand Options derived from active products
  const brands = Array.from(new Set(products.map((p) => p.brand || 'FORMA')));
  // Categories derived
  const categories = Array.from(new Set(products.map((p) => p.cat)));

  // Sorting helper
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter products list (Removing concept of Archived)
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.cat.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = catFilter === 'All' || p.cat === catFilter;
    const matchesBrand = brandFilter === 'All' || (p.brand || 'FORMA') === brandFilter;

    let matchesStock = true;
    if (stockFilter === 'In Stock') matchesStock = p.stock > 5;
    else if (stockFilter === 'Low Stock') matchesStock = p.stock > 0 && p.stock <= 5;
    else if (stockFilter === 'Out of Stock') matchesStock = p.stock === 0;

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

    return matchesSearch && matchesCat && matchesBrand && matchesStock && matchesStatus;
  });

  // Sorted list
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return 0;
  });

  // Paginated list
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

  // Selection helpers
  const currentItemKeys = currentItems.map((item) => item._id || item.id);
  const isAllSelected =
    currentItemKeys.length > 0 && currentItemKeys.every((key) => selectedIds.includes(key));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(selectedIds.filter((id) => !currentItemKeys.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...currentItemKeys])));
    }
  };

  const handleSelectOne = (id: number | string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected products?`)) {
      await bulkDeleteProducts(selectedIds);
      setSelectedIds([]);
    }
  };

  // CSV Import Parser
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
        if (lines.length <= 1) throw new Error('CSV is empty or lacks headers');

        // Extract headers
        const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());

        let importCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          if (cols.length < headers.length) continue;

          // Assemble a product
          const rowData: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowData[h] = cols[idx];
          });

          const price = parseFloat(rowData['price']) || 299;
          const stock = parseInt(rowData['stock']) || 20;
          const discount = parseFloat(rowData['discount']) || 0;

          addProduct({
            name: rowData['name'] || 'Unnamed Imported Product',
            cat: rowData['cat'] || 'Floor Care',
            desc: rowData['desc'] || 'No description provided.',
            tags: (rowData['tags'] || '').split(';').map((t) => t.trim()).filter(Boolean),
            badge: rowData['badge'] || null,
            imgs: [],
            price,
            sku: rowData['sku'] || `FM-IMP-${Math.floor(Math.random() * 90000)}`,
            brand: rowData['brand'] || 'FORMA',
            discount,
            stock,
            status: (rowData['status'] as any) || 'Active',
            createdDate: rowData['createdDate'] || new Date().toISOString().split('T')[0],
            specs: {
              Size: rowData['specSize'] || '500 ml',
              Usage: rowData['specUsage'] || 'Standard dilution',
              pH: rowData['specPH'] || '7.0',
              Suitable: rowData['specSuitable'] || 'All Surfaces'
            }
          });
          importCount++;
        }
        showToast(`Successfully imported ${importCount} products.`);
      } catch (err: any) {
        showToast(`Import error: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // clear input
  };

  // CSV Export
  const handleCSVExport = () => {
    const flatProducts = sortedProducts.map((p) => ({
      sku: p.sku,
      name: p.name,
      cat: p.cat,
      brand: p.brand || 'FORMA',
      price: p.price,
      discount: p.discount,
      stock: p.stock,
      status: p.status,
      createdDate: p.createdDate,
      badge: p.badge || '',
      tags: p.tags.join(';'),
      desc: p.desc,
      specSize: p.specs.Size || '',
      specUsage: p.specs.Usage || '',
      specPH: p.specs.pH || '',
      specSuitable: p.specs.Suitable || ''
    }));

    if (flatProducts.length === 0) {
      showToast('No products available to export.');
      return;
    }

    const headers = Object.keys(flatProducts[0]).join(',');
    const rows = flatProducts.map((item) =>
      Object.values(item)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CE_products_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Edit Form submit handler
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSaving(true);
    const success = await updateProduct(editingProduct, deletedImagePublicIds);
    setIsSaving(false);
    if (success) {
      setEditingProduct(null);
      setDeletedImagePublicIds([]);
    }
  };

  // File to base64 gallery helper
  const handleAddEditGalleryImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && editingProduct.imgs.length < 5) {
        const nextImgs = [...editingProduct.imgs, reader.result as string];
        setEditingProduct({ ...editingProduct, imgs: nextImgs });
      }
    };
    reader.readAsDataURL(file);
  };

  // IF EDITING MODE IS ACTIVE: RENDER REFINED PRODUCT EDITOR
  if (editingProduct) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 sm:p-8 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer min-h-[38px]"
              onClick={() => {
                setEditingProduct(null);
                setDeletedImagePublicIds([]);
              }}
              disabled={isSaving}
            >
              <ArrowLeft size={14} /> Back to Products
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>/</span>
              <span className="font-semibold text-slate-900 truncate max-w-[280px]">Edit: {editingProduct.name}</span>
            </div>
          </div>
        </div>

        {/* Tabs selector */}
        <div className="flex gap-2 border-b border-slate-200 pb-3 mb-6 select-none">
          <button
            type="button"
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[38px] ${
              editSpecsTab === 'basic' 
                ? 'bg-slate-950 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
            onClick={() => setEditSpecsTab('basic')}
          >
            1. Basic Information
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[38px] ${
              editSpecsTab === 'specs' 
                ? 'bg-slate-950 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
            onClick={() => setEditSpecsTab('specs')}
          >
            2. Technical Specifications
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[38px] ${
              editSpecsTab === 'gallery' 
                ? 'bg-slate-950 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
            }`}
            onClick={() => setEditSpecsTab('gallery')}
          >
            3. Media Assets ({editingProduct.imgs.length}/5)
          </button>
        </div>

        {/* 2-Column Layout: Left Form + Right Live Preview */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <form onSubmit={handleEditSubmit} className="xl:col-span-7 space-y-6">
          {editSpecsTab === 'basic' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Product Title *</label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all min-h-[44px]"
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">SKU Code *</label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm font-mono text-slate-900 placeholder:text-slate-400 bg-white transition-all min-h-[44px]"
                  type="text"
                  required
                  value={editingProduct.sku}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Brand Name *</label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all min-h-[44px]"
                  type="text"
                  required
                  value={editingProduct.brand || 'FORMA'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Category *</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 bg-white transition-all min-h-[44px] cursor-pointer"
                  value={editingProduct.cat}
                  onChange={(e) => setEditingProduct({ ...editingProduct, cat: e.target.value })}
                >
                  <option>Floor Care</option>
                  <option>Dish Care</option>
                  <option>Laundry Care</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Badge Callout</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 bg-white transition-all min-h-[44px] cursor-pointer"
                  value={editingProduct.badge || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value || null })}
                >
                  <option value="">None (Standard)</option>
                  <option value="New">New Arrival</option>
                  <option value="Bestseller">Bestseller</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Retail Price (₹ INR) *</label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm font-mono text-slate-900 bg-white transition-all min-h-[44px]"
                  type="number"
                  required
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Discount Rate (%)</label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm font-mono text-slate-900 bg-white transition-all min-h-[44px]"
                  type="number"
                  min={0}
                  max={100}
                  value={editingProduct.discount}
                  onChange={(e) => setEditingProduct({ ...editingProduct, discount: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Inventory Stock Level *</label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm font-mono text-slate-900 bg-white transition-all min-h-[44px]"
                  type="number"
                  required
                  value={editingProduct.stock}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Visibility Status *</label>
                <select
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 bg-white transition-all min-h-[44px] cursor-pointer"
                  value={editingProduct.status}
                  onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as any })}
                >
                  <option value="Active">Active (Visible)</option>
                  <option value="Draft">Draft (Hidden)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Search Keywords / Tags (Comma separated)</label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all min-h-[44px]"
                  type="text"
                  placeholder="e.g. eco-friendly, hypoallergenic, refill"
                  value={editingProduct.tags.join(', ')}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                    })
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Product Description</label>
                <textarea
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all resize-none"
                  rows={4}
                  value={editingProduct.desc}
                  onChange={(e) => setEditingProduct({ ...editingProduct, desc: e.target.value })}
                />
              </div>
            </div>
          )}

          {editSpecsTab === 'specs' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Pack Volume / Unit Size</label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all min-h-[44px]"
                  type="text"
                  placeholder="e.g. 500 ml / 5 Litres"
                  value={editingProduct.specs.Size || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      specs: { ...editingProduct.specs, Size: e.target.value }
                    })
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">pH Formulation</label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all min-h-[44px]"
                  type="text"
                  placeholder="e.g. 7.0 - Neutral"
                  value={editingProduct.specs.pH || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      specs: { ...editingProduct.specs, pH: e.target.value }
                    })
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700">Compatible Surfaces</label>
                <input
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all min-h-[44px]"
                  type="text"
                  placeholder="e.g. Marble, Granite, Hardwood, Ceramic"
                  value={editingProduct.specs.Suitable || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      specs: { ...editingProduct.specs, Suitable: e.target.value }
                    })
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Dilution & Application Instructions</label>
                <textarea
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-white transition-all resize-none"
                  rows={3}
                  placeholder="e.g. Dilute 20ml in 5 Litres of lukewarm water..."
                  value={editingProduct.specs.Usage || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      specs: { ...editingProduct.specs, Usage: e.target.value }
                    })
                  }
                />
              </div>
            </div>
          )}

          {editSpecsTab === 'gallery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Media Assets</h3>
                  <p className="text-xs text-slate-500">Upload up to 5 high-resolution photography assets</p>
                </div>
                <span className="text-xs font-mono text-slate-500">{editingProduct.imgs.length} / 5 loaded</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {editingProduct.imgs.map((img, idx) => (
                  <div key={idx} className="relative aspect-square border border-slate-200 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center group shadow-xs">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const imgUrl = img;
                        const matchingBackendImage = editingProduct.images?.find((item) => item.url === imgUrl);
                        if (matchingBackendImage && matchingBackendImage.public_id) {
                          setDeletedImagePublicIds((prev) => [...prev, matchingBackendImage.public_id]);
                        }
                        
                        const nextImgs = editingProduct.imgs.filter((_, i) => i !== idx);
                        const nextImages = editingProduct.images?.filter((item) => item.url !== imgUrl) || [];
                        setEditingProduct({
                          ...editingProduct,
                          imgs: nextImgs,
                          images: nextImages
                        });
                      }}
                      className="absolute inset-0 bg-slate-950/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium cursor-pointer"
                      disabled={isSaving}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {editingProduct.imgs.length < 5 && (
                  <label className="aspect-square border-2 border-dashed border-slate-300 hover:border-slate-900 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer transition-all bg-white hover:bg-slate-50">
                    <Upload size={20} />
                    <span className="text-xs font-medium mt-1.5">Add photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAddEditGalleryImage} />
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-6 border-t border-slate-200">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg bg-slate-950 text-white hover:bg-slate-800 text-xs font-medium tracking-wide shadow-xs transition-colors min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving Modifications...' : 'Save Product'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setDeletedImagePublicIds([]);
              }}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-950 bg-white text-xs font-medium transition-colors min-h-[44px] cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Right Column: Live Customer Storefront Preview */}
        <div className="xl:col-span-5 xl:sticky xl:top-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Customer Preview</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Preview
            </span>
          </div>

          {/* Product Card Preview Box */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
            {/* Image Area */}
            <div className="relative aspect-[4/3] bg-slate-100 flex items-center justify-center overflow-hidden">
              {(editingProduct.imgs?.[0] || (editingProduct as any).img) ? (
                <img src={editingProduct.imgs?.[0] || (editingProduct as any).img} alt={editingProduct.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-4">
                  <Package size={40} className="stroke-1 text-slate-300 mb-1" />
                  <span className="text-xs font-medium">No Image Uploaded</span>
                </div>
              )}
              {editingProduct.badge && (
                <span className="absolute top-3 left-3 bg-slate-950 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs">
                  {editingProduct.badge}
                </span>
              )}
              {editingProduct.discount > 0 && (
                <span className="absolute top-3 right-3 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                  {editingProduct.discount}% OFF
                </span>
              )}
              {editingProduct.imgs?.length > 1 && (
                <span className="absolute bottom-3 right-3 bg-slate-950/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded">
                  1 of {editingProduct.imgs.length} photos
                </span>
              )}
            </div>

            {/* Card Body */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{editingProduct.cat}</span>
                <span className="font-mono text-[11px] text-slate-400">{editingProduct.sku || 'SKU-PENDING'}</span>
              </div>

              <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                {editingProduct.name || 'Untitled Product'}
              </h3>

              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {editingProduct.desc || 'Clean, plant-based formulation designed for conscious homes.'}
              </p>

              {/* Rating mockup */}
              <div className="flex items-center gap-1 text-xs">
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="font-bold text-slate-800 ml-1">{editingProduct.rating || 5.0}</span>
                <span className="text-slate-400 text-[11px]">(Store verified)</span>
              </div>

              {/* Specs Highlights */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Volume</span>
                  <span className="font-semibold text-slate-700 truncate block">{editingProduct.specs?.size || '500 ml'}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Surfaces</span>
                  <span className="font-semibold text-slate-700 truncate block">{editingProduct.specs?.suitable || 'All Floors'}</span>
                </div>
              </div>

              {/* Pricing & Stock Status */}
              <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-price text-slate-950">
                    ₹{editingProduct.discount > 0 ? Math.round(editingProduct.price * (1 - editingProduct.discount / 100)) : editingProduct.price}
                  </span>
                  {editingProduct.discount > 0 && (
                    <span className="text-xs line-through text-slate-400 font-price">₹{editingProduct.price}</span>
                  )}
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  editingProduct.stock <= 0
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : editingProduct.stock < 10
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {editingProduct.stock <= 0 ? 'Out of Stock' : `${editingProduct.stock} in stock`}
                </span>
              </div>

              {/* Mock Customer CTA */}
              <button
                type="button"
                disabled
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold text-center cursor-default opacity-90 shadow-xs flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Customer View • Add to Cart (₹{editingProduct.discount > 0 ? Math.round(editingProduct.price * (1 - editingProduct.discount / 100)) : editingProduct.price})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  // STANDARD PRODUCT LISTINGS CATALOG TAB VIEW
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500 font-medium">Store Products</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-display">
            Products
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCSVExport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors min-h-[38px] cursor-pointer"
          >
            <FileDown size={14} />
            <span>Export CSV</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors min-h-[38px] cursor-pointer">
            <FileUp size={14} />
            <span>Import CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </label>

          <button
            onClick={() => onTabChange('add')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold shadow-xs transition-colors min-h-[38px] cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Package size={16} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block leading-tight">Total Products</span>
            <span className="text-xl font-black text-slate-950 leading-none mt-1 block font-mono">{products.length}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <Layers size={16} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block leading-tight">Categories</span>
            <span className="text-xl font-black text-slate-950 leading-none mt-1 block font-mono">{categories.length}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block leading-tight">Low Stock</span>
            <span className="text-xl font-black text-slate-950 leading-none mt-1 block font-mono">
              {products.filter((p) => p.stock > 0 && p.stock <= 5).length}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-md bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
            <Package size={16} />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block leading-tight">Out of Stock</span>
            <span className="text-xl font-black text-slate-950 leading-none mt-1 block font-mono">
              {products.filter((p) => p.stock === 0).length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by name, SKU, category..."
            className="w-full border border-slate-200 rounded-md bg-slate-50/50 hover:bg-white pl-10 pr-4 py-2 text-xs outline-none focus:border-indigo-600 focus:bg-white placeholder:text-slate-400 min-h-[38px] text-slate-900 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="border border-slate-200 rounded-md bg-white px-3 py-2 text-xs outline-none cursor-pointer focus:border-indigo-600 text-slate-700 font-medium min-h-[38px] shadow-xs"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="border border-slate-200 rounded-md bg-white px-3 py-2 text-xs outline-none cursor-pointer focus:border-indigo-600 text-slate-700 font-medium min-h-[38px] shadow-xs"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
          >
            <option value="All">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            className="border border-slate-200 rounded-md bg-white px-3 py-2 text-xs outline-none cursor-pointer focus:border-indigo-600 text-slate-700 font-medium min-h-[38px] shadow-xs"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="All">All stock</option>
            <option value="In Stock">In stock</option>
            <option value="Low Stock">Low stock (≤5)</option>
            <option value="Out of Stock">Out of stock</option>
          </select>

          <select
            className="border border-slate-200 rounded-md bg-white px-3 py-2 text-xs outline-none cursor-pointer focus:border-indigo-600 text-slate-700 font-medium min-h-[38px] shadow-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Controls */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-2.5 rounded-md shadow-xs">
          <span className="text-xs font-medium">
            <strong>{selectedIds.length}</strong> product(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-md text-white cursor-pointer transition-colors"
            >
              <Trash2 size={12} /> Bulk Delete
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs font-medium px-3 py-1.5 text-slate-300 hover:text-white cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Products Table Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead className="w-[36px] text-center">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer inline-flex items-center justify-center p-1">
                    {isAllSelected ? (
                      <CheckSquare size={16} className="text-slate-900" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-[48px] whitespace-nowrap">Image</TableHead>
                <TableHead className="whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('name')}>
                  Product {sortField === 'name' ? (sortAsc ? '▲' : '▼') : ''}
                </TableHead>
                <TableHead className="w-[120px] whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('cat')}>
                  Category {sortField === 'cat' ? (sortAsc ? '▲' : '▼') : ''}
                </TableHead>
                <TableHead className="w-[95px] whitespace-nowrap cursor-pointer hover:text-slate-950 text-right" onClick={() => handleSort('price')}>
                  Price {sortField === 'price' ? (sortAsc ? '▲' : '▼') : ''}
                </TableHead>
                <TableHead className="w-[85px] text-center whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('stock')}>
                  Stock {sortField === 'stock' ? (sortAsc ? '▲' : '▼') : ''}
                </TableHead>
                <TableHead className="w-[85px] text-center whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('status')}>
                  Status {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}
                </TableHead>
                <TableHead className="w-[100px] text-right whitespace-nowrap pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length > 0 ? (
                currentItems.map((p) => {
                  const itemKey = p._id || p.id;
                  const isSelected = selectedIds.includes(itemKey);
                  const isLowStock = p.stock > 0 && p.stock <= 5;
                  const isOutOfStock = p.stock === 0;

                  return (
                    <TableRow
                      key={itemKey}
                      className={`h-[56px] hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-slate-50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="text-center">
                        <button onClick={() => handleSelectOne(itemKey)} className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer inline-flex items-center justify-center p-1">
                          {isSelected ? (
                            <CheckSquare size={16} className="text-slate-900" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </TableCell>

                      {/* Image Thumbnail */}
                      <TableCell>
                        <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          {p.imgs && p.imgs.length > 0 ? (
                            <img src={p.imgs[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-[10px] font-bold text-slate-400 font-mono">
                              {p.cat.substring(0, 3).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Name & SKU Details */}
                      <TableCell>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-slate-900 truncate">{p.name}</span>
                            {p.badge && (
                              <Badge variant="outline" size="sm">
                                {p.badge}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                            <span>SKU: {p.sku}</span>
                            {p.brand && p.brand !== 'FORMA' && (
                              <span className="text-slate-500">• {p.brand}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap">
                          {p.cat}
                        </span>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-xs font-mono">₹{p.price.toLocaleString('en-IN')}</div>
                        {p.discount > 0 && (
                          <span className="text-[10px] text-rose-600 font-semibold font-mono">-{p.discount}%</span>
                        )}
                      </TableCell>

                      {/* Stock */}
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge
                          variant={
                            isOutOfStock
                              ? 'destructive-light'
                              : isLowStock
                              ? 'warning'
                              : 'secondary'
                          }
                          size="sm"
                        >
                          {p.stock}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge
                          variant={p.status === 'Active' ? 'success' : 'secondary'}
                          size="sm"
                        >
                          {p.status}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right whitespace-nowrap pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Edit Product"
                            className="p-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-md text-slate-600 hover:text-slate-900 bg-white transition-colors cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center shadow-xs"
                            onClick={() => setEditingProduct({ ...p })}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            title="Duplicate Product"
                            className="p-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-md text-slate-600 hover:text-slate-900 bg-white transition-colors cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center shadow-xs"
                            onClick={() => duplicateProduct(p.id)}
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            title="Delete Product"
                            className="p-1.5 border border-slate-200 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50 rounded-md text-slate-600 bg-white transition-colors cursor-pointer min-h-[30px] min-w-[30px] flex items-center justify-center shadow-xs"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to permanently delete ${p.name}?`)) {
                                await deleteProduct(p._id || p.id);
                              }
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-slate-500 text-xs">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={28} className="text-slate-300" />
                      <span className="font-medium text-slate-700">No products found</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Row */}
        {sortedProducts.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 select-none bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Showing page <strong>{currentPage}</strong> of <strong>{totalPages || 1}</strong> ({sortedProducts.length} total products)
            </span>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <button
                onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: totalPages || 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1.5 border rounded-md cursor-pointer transition-all shadow-xs ${
                    currentPage === i + 1
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsCatalog;
