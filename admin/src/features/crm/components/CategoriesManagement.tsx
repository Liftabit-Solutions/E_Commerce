import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../core/context/AppContext';
import {
  getCategoriesConfig,
  saveCategoriesConfig,
} from '../../../core/utils/storeSettings';
import type {
  CategoryGSTConfig
} from '../../../core/utils/storeSettings';
import {
  Tags,
  Plus,
  Search,
  Percent,
  Trash2,
  Edit2,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  X,
  Layers,
  ArrowUpDown
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

interface CategoriesManagementProps {
  onTabChange?: (tab: any) => void;
}

const CategoriesManagement: React.FC<CategoriesManagementProps> = ({ onTabChange }) => {
  const { products, showToast } = useApp();

  const [categories, setCategories] = useState<CategoryGSTConfig[]>(getCategoriesConfig());
  const [searchQuery, setSearchQuery] = useState('');
  const [gstFilter, setGstFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'gstRate' | 'productsCount'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formGstRate, setFormGstRate] = useState<number>(18);
  const [formHsn, setFormHsn] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const handleUpdate = () => {
      setCategories(getCategoriesConfig());
    };
    window.addEventListener('categories_gst_updated', handleUpdate);
    return () => window.removeEventListener('categories_gst_updated', handleUpdate);
  }, []);

  // Map product count per category
  const productCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    (products || []).forEach((p) => {
      const cat = (p.cat || 'Uncategorized').trim().toLowerCase();
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [products]);

  // Open Modal for Add
  const openAddModal = () => {
    setEditingIndex(null);
    setFormName('');
    setFormGstRate(18);
    setFormHsn('3402');
    setFormDescription('');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const openEditModal = (cat: CategoryGSTConfig, index: number) => {
    setEditingIndex(index);
    setFormName(cat.name);
    setFormGstRate(cat.gstRate);
    setFormHsn(cat.hsnCode || '3402');
    setFormDescription(cat.description || '');
    setIsModalOpen(true);
  };

  // Save Add/Edit
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Category name is required.');
      return;
    }

    let updated: CategoryGSTConfig[];
    if (editingIndex !== null && editingIndex >= 0) {
      updated = [...categories];
      updated[editingIndex] = {
        name: formName.trim(),
        gstRate: Number(formGstRate),
        hsnCode: formHsn.trim() || '3402',
        description: formDescription.trim(),
      };
      showToast(`Category "${formName.trim()}" updated.`);
    } else {
      // Check duplicate
      const exists = categories.some(
        (c) => c.name.toLowerCase() === formName.trim().toLowerCase()
      );
      if (exists) {
        showToast('A category with this name already exists.');
        return;
      }
      updated = [
        ...categories,
        {
          name: formName.trim(),
          gstRate: Number(formGstRate),
          hsnCode: formHsn.trim() || '3402',
          description: formDescription.trim(),
        },
      ];
      showToast(`Category "${formName.trim()}" created successfully.`);
    }

    setCategories(updated);
    saveCategoriesConfig(updated);
    setIsModalOpen(false);
  };

  // Delete category
  const handleDelete = (index: number) => {
    const cat = categories[index];
    if (categories.length <= 1) {
      showToast('You must keep at least one category.');
      return;
    }
    if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      const updated = categories.filter((_, i) => i !== index);
      setCategories(updated);
      saveCategoriesConfig(updated);
      showToast(`Category "${cat.name}" removed.`);
    }
  };

  // Filtered & Sorted
  const filteredCategories = useMemo(() => {
    let result = categories.map((cat, originalIndex) => {
      const pCount = productCountMap[cat.name.trim().toLowerCase()] || 0;
      return { ...cat, originalIndex, pCount };
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.hsnCode && c.hsnCode.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }

    if (gstFilter !== 'all') {
      const targetRate = Number(gstFilter);
      result = result.filter((c) => c.gstRate === targetRate);
    }

    result.sort((a, b) => {
      let comp = 0;
      if (sortField === 'name') comp = a.name.localeCompare(b.name);
      else if (sortField === 'gstRate') comp = a.gstRate - b.gstRate;
      else if (sortField === 'productsCount') comp = a.pCount - b.pCount;
      return sortAsc ? comp : -comp;
    });

    return result;
  }, [categories, searchQuery, gstFilter, sortField, sortAsc, productCountMap]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCategories = filteredCategories.slice(startIndex, startIndex + itemsPerPage);

  const handleSortToggle = (field: 'name' | 'gstRate' | 'productsCount') => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Top metrics
  const totalCategoriesCount = categories.length;
  const zeroTaxCount = categories.filter((c) => c.gstRate === 0).length;
  const standard18Count = categories.filter((c) => c.gstRate === 18).length;
  const totalProductsMapped = (products || []).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Categories
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Organize products into categories and assign default GST tax rates and HSN codes.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer min-h-[38px] shrink-0 self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Add New Category</span>
        </button>
      </div>

      {/* 4 Summary Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Categories */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Categories
            </span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {totalCategoriesCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active store departments</p>
        </div>

        {/* Card 2: 18% GST Categories */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Standard 18% GST
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <Percent size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {standard18Count}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Standard cleaning &amp; chemicals</p>
        </div>

        {/* Card 3: Tax-Exempt / 0% GST */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Zero Tax / Exempt
            </span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {zeroTaxCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">0% GST rate categories</p>
        </div>

        {/* Card 4: Catalog Products Mapped */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Products Mapped
            </span>
            <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {totalProductsMapped}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Items catalogued across categories</p>
        </div>
      </div>

      {/* Toolbar: Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories by name, HSN code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md bg-slate-50/50 hover:bg-white focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors min-h-[38px]"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* GST Filter */}
          <select
            value={gstFilter}
            onChange={(e) => {
              setGstFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 outline-none hover:border-slate-300 cursor-pointer shadow-xs min-h-[38px]"
          >
            <option value="all">All Tax Rates</option>
            <option value="0">0% GST (Exempted)</option>
            <option value="5">5% GST</option>
            <option value="12">12% GST</option>
            <option value="18">18% GST</option>
            <option value="28">28% GST</option>
          </select>

          {/* Sort dropdown */}
          <select
            value={sortField}
            onChange={(e) => {
              setSortField(e.target.value as any);
              setCurrentPage(1);
            }}
            className="text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-700 outline-none hover:border-slate-300 cursor-pointer shadow-xs min-h-[38px]"
          >
            <option value="name">Sort: Name (A-Z)</option>
            <option value="gstRate">Sort: GST Rate</option>
            <option value="productsCount">Sort: Product Count</option>
          </select>
        </div>
      </div>

      {/* Main Categories Table (Fits page 100% without horizontal scroll) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="w-full">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                <TableHead
                  className="cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSortToggle('name')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="w-[120px]">HSN Code</TableHead>
                <TableHead
                  className="w-[140px] text-center cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSortToggle('gstRate')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>GST Rate</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="w-[190px]">Tax Breakdown (intra-state)</TableHead>
                <TableHead
                  className="w-[120px] text-center cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSortToggle('productsCount')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Products</span>
                    <ArrowUpDown size={12} className="text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="w-[110px] text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCategories.length > 0 ? (
                currentCategories.map((cat) => (
                  <TableRow key={cat.name} className="h-[56px] hover:bg-slate-50/70 transition-colors">
                    {/* Category Name & Description */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                          <Tags size={15} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-xs text-slate-900 truncate">
                            {cat.name}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate leading-tight">
                            {cat.description || 'General product category'}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* HSN Code */}
                    <TableCell className="font-mono text-xs text-slate-600">
                      {cat.hsnCode || '3402'}
                    </TableCell>

                    {/* GST Rate Badge */}
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          cat.gstRate === 0
                            ? 'secondary'
                            : cat.gstRate <= 5
                            ? 'success'
                            : cat.gstRate <= 12
                            ? 'warning'
                            : 'default'
                        }
                        size="sm"
                      >
                        {cat.gstRate}% GST
                      </Badge>
                    </TableCell>

                    {/* Tax Breakdown */}
                    <TableCell className="text-xs text-slate-600 font-mono">
                      {cat.gstRate > 0 ? (
                        <span>CGST {cat.gstRate / 2}% + SGST {cat.gstRate / 2}%</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Exempt / Nil Tax</span>
                      )}
                    </TableCell>

                    {/* Products count */}
                    <TableCell className="text-center">
                      {onTabChange ? (
                        <button
                          type="button"
                          onClick={() => onTabChange('products')}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                          title="View Products in Catalog"
                        >
                          {cat.pCount} {cat.pCount === 1 ? 'item' : 'items'}
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700">
                          {cat.pCount} {cat.pCount === 1 ? 'item' : 'items'}
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right whitespace-nowrap pr-4">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat, cat.originalIndex)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                          title="Edit Category & Tax"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.originalIndex)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-slate-500 text-xs">
                    No categories found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Toolbar — Always visible when categories exist */}
        {filteredCategories.length > 0 && (
          <div className="bg-slate-50/60 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
            <span className="text-slate-500">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCategories.length)} of {filteredCategories.length} categories
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md border text-xs font-semibold cursor-pointer ${
                    currentPage === i + 1
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Category Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[300] flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="fixed inset-0" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg p-6 relative z-10 animate-scaleIn space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Tags size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingIndex !== null ? 'Edit Category' : 'Add New Category'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Category details and default GST tax rate
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Glass &amp; Window Cleaners"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Default GST Rate (%) *</label>
                  <select
                    value={formGstRate}
                    onChange={(e) => setFormGstRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white focus:border-indigo-600 focus:outline-none font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value={0}>0% (Tax Exempted / Nil)</option>
                    <option value={5}>5% GST (Essentials &amp; Grocery)</option>
                    <option value={12}>12% GST (Personal Hygiene)</option>
                    <option value={18}>18% GST (Standard Cleaning/Chemicals)</option>
                    <option value={28}>28% GST (Luxury / High Tax)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">HSN Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 3402"
                    value={formHsn}
                    onChange={(e) => setFormHsn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white font-mono focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Window, mirror, and glass surface cleansers"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-slate-600 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Intra-state Tax Breakdown:</span>
                  <span className="font-mono font-semibold">
                    {formGstRate > 0 ? `CGST ${formGstRate / 2}% + SGST ${formGstRate / 2}%` : 'Tax Exempt'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Inter-state Tax:</span>
                  <span className="font-mono font-semibold">
                    {formGstRate > 0 ? `IGST ${formGstRate}%` : 'Tax Exempt'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>{editingIndex !== null ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesManagement;
