import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../../core/context/AppContext';
import type { Lead, LeadActivity } from '../../../core/types';
import {
  Search,
  FileDown,
  Layers,
  List,
  Clock,
  PlusCircle,
  CheckSquare,
  Square,
  User,
  X,
  FileText,
  Loader2,
  Pencil
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

const LeadsCRM: React.FC = () => {
  const {
    leads,
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
    showToast
  } = useApp();

  useEffect(() => {
    fetchLeads();
  }, []);

  // Local optimistic state for live drag and drop
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  // Search & Status filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');

  // Toggle layout: 'table' | 'kanban'
  const [layoutMode, setLayoutMode] = useState<'table' | 'kanban'>('kanban');

  // Lead Details drawer
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Drag and Drop state
  const [draggedLeadId, setDraggedLeadId] = useState<number | string | null>(null);

  // Sorting for Table
  const [sortField, setSortField] = useState<keyof Lead>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination for Table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form states for creating a new lead
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [nlName, setNlName] = useState('');
  const [nlEmail, setNlEmail] = useState('');
  const [nlPhone, setNlPhone] = useState('');
  const [nlCompany, setNlCompany] = useState('');
  const [nlSource, setNlSource] = useState('Web Inquiry');
  const [nlSubject, setNlSubject] = useState('');
  const [nlService, setNlService] = useState('Floor Care');
  const [nlMessage, setNlMessage] = useState('');
  const [nlPriority, setNlPriority] = useState<Lead['priority']>('Medium');

  // Priority Edit Modal States
  const [priorityEditLead, setPriorityEditLead] = useState<Lead | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<Lead['priority']>('Medium');
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState<boolean>(false);
  const [isConfirmPriorityModalOpen, setIsConfirmPriorityModalOpen] = useState<boolean>(false);
  const [updatingPriorityLeadId, setUpdatingPriorityLeadId] = useState<string | null>(null);

  const openPriorityModal = (lead: Lead) => {
    setPriorityEditLead(lead);
    setSelectedPriority(lead.priority || 'Medium');
    setIsPriorityModalOpen(true);
  };

  // Auto-save Notes State
  const [isNotesSaving, setIsNotesSaving] = useState(false);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear notes debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (notesDebounceRef.current) {
        clearTimeout(notesDebounceRef.current);
      }
    };
  }, []);

  const handleNotesChange = (newNotes: string) => {
    if (!selectedLead) return;
    const leadId = selectedLead._id || selectedLead.id;

    // Update local state immediately for uninterrupted smooth typing
    setSelectedLead((prev) => (prev ? { ...prev, internalNotes: newNotes } : null));
    setIsNotesSaving(true);

    if (notesDebounceRef.current) {
      clearTimeout(notesDebounceRef.current);
    }

    notesDebounceRef.current = setTimeout(async () => {
      await updateLeadNotes(leadId, newNotes);
      setIsNotesSaving(false);
    }, 1200);
  };

  const openDetailsDrawer = (lead: Lead) => {
    setSelectedLead(lead);
    setActiveWorkspaceTab('notes');
  };

  // Keep selectedLead in sync with server refetched leads state
  useEffect(() => {
    if (selectedLead) {
      const updated = leads.find(
        (l) => (l._id && l._id === selectedLead._id) || String(l.id) === String(selectedLead.id)
      );
      if (updated) {
        setSelectedLead((prev) =>
          prev
            ? {
                ...prev,
                tasks: updated.tasks,
                activities: updated.activities,
                comments: updated.comments,
                reminders: updated.reminders,
                status: updated.status,
                priority: updated.priority
              }
            : null
        );
      }
    }
  }, [leads]);

  // Escape key down to close workspace details drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedLead(null);
      }
    };
    if (selectedLead) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedLead]);

  // Escape key down to close create lead modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNewLeadModalOpen(false);
      }
    };
    if (newLeadModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [newLeadModalOpen]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, priorityFilter, serviceFilter]);

  // Filter Leads
  const filteredLeads = localLeads.filter((l) => {
    const name = l.name || '';
    const email = l.email || '';
    const subj = l.subject || '';
    const comp = l.company || '';

    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subj.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority = priorityFilter === 'All' || l.priority === priorityFilter;
    const matchesService = serviceFilter === 'All' || l.service === serviceFilter;

    return matchesSearch && matchesPriority && matchesService;
  });

  // Sort Leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === undefined) return 1;
    if (valB === undefined) return -1;

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return 0;
  });

  // Paginated leads
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeads = sortedLeads.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);

  // Sorting header click handler
  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Unique Services for Filter dropdown
  const services = Array.from(new Set(localLeads.map((l) => l.service || 'General')));

  // Kanban Columns statuses
  const KANBAN_STATUSES: Lead['status'][] = [
    'New',
    'Contacted',
    'Interested',
    'Negotiation',
    'Won',
    'Lost',
    'Archived'
  ];

  // Drag and Drop implementation - Live & Optimistic
  const handleDragStart = (e: React.DragEvent, leadId: number | string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', String(leadId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Lead['status']) => {
    e.preventDefault();
    const leadId = draggedLeadId || e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    // Check if targetStatus is already the current status
    const targetLead = localLeads.find((l) => String(l.id) === String(leadId) || l._id === String(leadId));
    if (targetLead && targetLead.status === targetStatus) {
      setDraggedLeadId(null);
      return;
    }

    const previousStatus = targetLead?.status;
    setDraggedLeadId(null);

    // 1. Instant optimistic local update - moves card immediately on drop with zero delay!
    setLocalLeads((prev) =>
      prev.map((l) =>
        String(l.id) === String(leadId) || l._id === String(leadId)
          ? { ...l, status: targetStatus }
          : l
      )
    );

    // If the expanded lead in details drawer is the dragged one, update drawer status immediately
    if (selectedLead && (String(selectedLead.id) === String(leadId) || selectedLead._id === String(leadId))) {
      setSelectedLead((prev) => (prev ? { ...prev, status: targetStatus } : null));
    }

    // 2. Perform backend API sync silently in the background
    const success = await updateLeadStatus(leadId, targetStatus);
    
    // 3. If update failed, revert the card back to previous status
    if (!success && previousStatus) {
      setLocalLeads((prev) =>
        prev.map((l) =>
          String(l.id) === String(leadId) || l._id === String(leadId)
            ? { ...l, status: previousStatus }
            : l
        )
      );
      if (selectedLead && (String(selectedLead.id) === String(leadId) || selectedLead._id === String(leadId))) {
        setSelectedLead((prev) => (prev ? { ...prev, status: previousStatus } : null));
      }
    }
  };

  // CSV Export
  const handleCSVExport = () => {
    const flatLeads = filteredLeads.map((l) => ({
      leadId: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone || 'N/A',
      company: l.company || '',
      source: l.source,
      subject: l.subject,
      service: l.service,
      priority: l.priority,
      status: l.status,
      assignedTo: l.assignedTo || '',
      createdDate: l.date
    }));

    if (flatLeads.length === 0) {
      showToast('No leads available to export.');
      return;
    }

    const headers = Object.keys(flatLeads[0]).join(',');
    const rows = flatLeads.map((item) =>
      Object.values(item)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CE_leads_crm_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlName.trim() || !nlEmail.trim() || !nlSubject.trim()) {
      showToast('Please check required fields.');
      return;
    }

    addLead(
      nlName.trim(),
      nlEmail.trim(),
      nlPhone.trim(),
      nlCompany.trim(),
      nlSource,
      nlSubject.trim(),
      nlService,
      nlMessage.trim(),
      nlPriority
    );

    // Reset Form
    setNlName('');
    setNlEmail('');
    setNlPhone('');
    setNlCompany('');
    setNlSubject('');
    setNlMessage('');
    setNlPriority('Medium');
    setNewLeadModalOpen(false);
  };

  // Drawer Action inputs staging
  const [commentInput, setCommentInput] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [actTitle, setActTitle] = useState('');
  const [actType, setActType] = useState<LeadActivity['type']>('Call');
  const [actContent, setActContent] = useState('');

  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'notes' | 'activities' | 'tasks' | 'reminders' | 'comments'>('notes');

  const triggerAddComment = async () => {
    if (!selectedLead || !commentInput.trim()) {
      if (!commentInput.trim()) showToast('Please enter a comment.');
      return;
    }

    const leadId = selectedLead._id || selectedLead.id;
    setIsAddingComment(true);

    try {
      const success = await addLeadComment(leadId, commentInput.trim());
      if (success) {
        setCommentInput('');
      }
    } finally {
      setIsAddingComment(false);
    }
  };

  const [isAddingTask, setIsAddingTask] = useState(false);

  const triggerAddTask = async () => {
    if (!selectedLead || !taskInput.trim()) {
      if (!taskInput.trim()) showToast('Please enter a task title.');
      return;
    }

    const leadId = selectedLead._id || selectedLead.id;
    setIsAddingTask(true);

    try {
      const success = await addLeadTask(leadId, taskInput.trim());
      if (success) {
        setTaskInput('');
      }
    } finally {
      setIsAddingTask(false);
    }
  };

  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  const handleToggleTask = async (taskId: string, currentDone: boolean) => {
    if (!selectedLead || togglingTaskId) return;
    const leadId = selectedLead._id || selectedLead.id;
    setTogglingTaskId(taskId);

    try {
      const nextDone = !currentDone;
      const success = await toggleLeadTask(leadId, taskId, nextDone);
      if (success) {
        const updatedTasks = selectedLead.tasks?.map((tsk) =>
          tsk.id === taskId ? { ...tsk, done: nextDone } : tsk
        );
        setSelectedLead({ ...selectedLead, tasks: updatedTasks });
      }
    } finally {
      setTogglingTaskId(null);
    }
  };

  const [isAddingReminder, setIsAddingReminder] = useState(false);

  const triggerAddReminder = async () => {
    if (!selectedLead) return;
    if (!reminderTitle.trim()) {
      showToast('Please enter a reminder title.');
      return;
    }
    if (!reminderDate) {
      showToast('Please select a scheduled date.');
      return;
    }

    const leadId = selectedLead._id || selectedLead.id;
    setIsAddingReminder(true);

    try {
      const success = await addLeadReminder(leadId, reminderTitle.trim(), reminderDate);
      if (success) {
        setReminderTitle('');
        setReminderDate('');
      }
    } finally {
      setIsAddingReminder(false);
    }
  };

  const [isAddingActivity, setIsAddingActivity] = useState(false);

  const triggerAddActivity = async () => {
    if (!selectedLead) return;
    if (!actTitle.trim()) {
      showToast('Please enter an activity title.');
      return;
    }
    if (!actContent.trim()) {
      showToast('Please enter interaction details / notes.');
      return;
    }

    const leadId = selectedLead._id || selectedLead.id;
    setIsAddingActivity(true);

    try {
      const success = await addLeadActivity(leadId, actType, actTitle.trim(), actContent.trim());
      if (success) {
        // Refresh local drawer activities state
        const actList = selectedLead.activities ? [...selectedLead.activities] : [];
        actList.push({
          type: actType,
          title: actTitle.trim(),
          content: actContent.trim(),
          date: new Date().toLocaleString('en-IN')
        });
        setSelectedLead({ ...selectedLead, activities: actList });
        setActTitle('');
        setActContent('');
      }
    } finally {
      setIsAddingActivity(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Inquiries</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <span className="text-xs text-slate-400">{leads.length} Total</span>
            {isLeadsLoading && <Loader2 size={13} className="text-indigo-600 animate-spin ml-1" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display">
            Inquiries
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* CSV Export */}
          <button
            onClick={handleCSVExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-xs transition-colors min-h-[38px] cursor-pointer"
          >
            <FileDown size={14} />
            <span>Export CSV</span>
          </button>

          {/* Toggle View Layout */}
          <div className="inline-flex border border-slate-200 rounded-md p-0.5 bg-slate-100 shadow-xs">
            <button
              onClick={() => setLayoutMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                layoutMode === 'kanban' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Kanban Board view"
            >
              <Layers size={15} />
            </button>
            <button
              onClick={() => setLayoutMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                layoutMode === 'table' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tabular Data Grid view"
            >
              <List size={15} />
            </button>
          </div>

          <button
            onClick={() => setNewLeadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold tracking-wide shadow-xs transition-colors min-h-[38px] cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>New Inquiry</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search inquiries by client name, email, company or subject..."
            className="w-full border border-slate-200 rounded-md bg-slate-50/50 pl-10 pr-4 py-2 text-xs outline-none focus:bg-white focus:border-indigo-600 placeholder:text-slate-400 min-h-[38px] text-slate-900 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Priority Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            className="border border-slate-200 rounded-md bg-white px-3 py-2 text-xs outline-none cursor-pointer focus:border-indigo-600 text-slate-700 font-medium min-h-[38px] shadow-xs"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="All">All priorities</option>
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
          </select>

          {/* Service filter */}
          <select
            className="border border-slate-200 rounded-md bg-white px-3 py-2 text-xs outline-none cursor-pointer focus:border-indigo-600 text-slate-700 font-medium min-h-[38px] shadow-xs"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
          >
            <option value="All">All categories</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEWPORT LAYOUT SWITCH */}
      {layoutMode === 'table' ? (
        /* TABLE LAYOUT VIEW */
        <div className="relative">
          {isLeadsLoading && leads.length > 0 && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center rounded-lg pointer-events-auto">
              <div className="bg-white border border-slate-200 shadow-sm rounded-full px-4 py-2 flex items-center gap-2.5 text-xs font-semibold text-slate-900 animate-fadeIn">
                <Loader2 size={16} className="text-indigo-600 animate-spin" />
                <span>Updating inquiries...</span>
              </div>
            </div>
          )}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="w-full overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                    <TableHead className="whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('id')}>
                      ID {sortField === 'id' ? (sortAsc ? '▲' : '▼') : ''}
                    </TableHead>
                    <TableHead className="whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('name')}>
                      Client {sortField === 'name' ? (sortAsc ? '▲' : '▼') : ''}
                    </TableHead>
                    <TableHead className="whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('company')}>
                      Company {sortField === 'company' ? (sortAsc ? '▲' : '▼') : ''}
                    </TableHead>
                    <TableHead className="whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('subject')}>
                      Subject {sortField === 'subject' ? (sortAsc ? '▲' : '▼') : ''}
                    </TableHead>
                    <TableHead className="whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('service')}>
                      Category {sortField === 'service' ? (sortAsc ? '▲' : '▼') : ''}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Source</TableHead>
                    <TableHead className="text-center whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('priority')}>
                      Priority {sortField === 'priority' ? (sortAsc ? '▲' : '▼') : ''}
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('status')}>
                      Stage {sortField === 'status' ? (sortAsc ? '▲' : '▼') : ''}
                    </TableHead>
                    <TableHead className="whitespace-nowrap cursor-pointer hover:text-slate-950" onClick={() => handleSort('followUpDate')}>
                      Follow-up {sortField === 'followUpDate' ? (sortAsc ? '▲' : '▼') : ''}
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap pr-6">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLeadsLoading && leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 size={24} className="text-indigo-600 animate-spin" />
                          <span className="text-xs text-slate-500 font-medium">Loading inquiries...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : currentLeads.length > 0 ? (
                    currentLeads.map((l) => (
                      <TableRow key={l.id} className="h-[56px] hover:bg-slate-50/75 transition-colors">
                        <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap">LD-{String(l.id).substring(5, 10) || l.id}</TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900">{l.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-normal">{l.email}</div>
                        </TableCell>
                        <TableCell className="text-slate-600 whitespace-nowrap">{l.company || 'Individual'}</TableCell>
                        <TableCell className="text-slate-900 font-medium truncate max-w-[200px]" title={l.subject}>{l.subject}</TableCell>
                        <TableCell>
                          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap">
                            {l.service}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500 font-medium whitespace-nowrap">{l.source}</TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <Badge
                              variant={
                                l.priority === 'High'
                                  ? 'destructive-light'
                                  : l.priority === 'Medium'
                                  ? 'warning'
                                  : 'secondary'
                              }
                              size="sm"
                            >
                              {l.priority}
                            </Badge>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openPriorityModal(l);
                              }}
                              disabled={updatingPriorityLeadId === String(l._id || l.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-60"
                              title="Edit Priority"
                            >
                              {updatingPriorityLeadId === String(l._id || l.id) ? (
                                <Loader2 size={13} className="animate-spin text-slate-950" />
                              ) : (
                                <Pencil size={13} />
                              )}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <select
                            className="border border-slate-200 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 focus:border-indigo-600 outline-none cursor-pointer shadow-xs disabled:opacity-50"
                            value={l.status}
                            disabled={isLeadsLoading}
                            onChange={(e) => updateLeadStatus(l._id || l.id, e.target.value as any)}
                          >
                            {KANBAN_STATUSES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">{l.followUpDate || 'Not set'}</TableCell>
                        <TableCell className="text-right whitespace-nowrap pr-6">
                          <button
                            onClick={() => openDetailsDrawer(l)}
                            className="text-xs font-semibold px-3 py-1.5 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 rounded-md shadow-xs transition-colors cursor-pointer min-h-[30px]"
                          >
                            Details
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="py-16 text-center text-slate-500 text-xs">
                        <span>No inquiries found matching the filters.</span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-slate-50/50 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
                <span className="text-slate-500">
                  Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({sortedLeads.length} total)
                </span>
                <div className="flex items-center gap-1.5 font-mono">
                  <button
                    onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1.5 border rounded-md cursor-pointer shadow-xs transition-colors ${
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
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* KANBAN BOARD LAYOUT VIEW */
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none">
            {isLeadsLoading && localLeads.length === 0 ? (
              <div className="w-full py-16 flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-lg">
                <Loader2 size={28} className="text-indigo-600 animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Loading inquiries...</span>
              </div>
            ) : (
              KANBAN_STATUSES.map((status) => {
                const columnLeads = filteredLeads.filter((l) => l.status === status);

                return (
                  <div
                    key={status}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status)}
                    className="w-[280px] bg-slate-50 border border-slate-200 rounded-lg p-3.5 shrink-0 flex flex-col min-h-[260px]"
                  >
                    {/* Column header */}
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-200 mb-3">
                      <span className="text-xs font-semibold text-slate-900 capitalize">
                        {status}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-xs">
                        {columnLeads.length}
                      </span>
                    </div>

                    {/* Cards grid */}
                    <div className="space-y-2.5 flex-1" onDragOver={handleDragOver}>
                      {columnLeads.length > 0 ? (
                        columnLeads.map((lead) => (
                          <div
                            key={lead.id}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, lead._id || lead.id)}
                            onClick={() => openDetailsDrawer(lead)}
                            className="bg-white border border-slate-200 rounded-lg p-3.5 hover:border-slate-300 shadow-xs hover:shadow-sm cursor-grab active:cursor-grabbing transition-all select-none animate-fadeIn"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                lead.priority === 'High'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : lead.priority === 'Medium'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {lead.priority}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPriorityModal(lead);
                                }}
                                disabled={updatingPriorityLeadId === String(lead._id || lead.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-60"
                                title="Edit Priority"
                              >
                                {updatingPriorityLeadId === String(lead._id || lead.id) ? (
                                  <Loader2 size={13} className="animate-spin text-slate-950" />
                                ) : (
                                  <Pencil size={13} />
                                )}
                              </button>
                            </div>
                            
                            <h4 className="text-xs font-semibold text-slate-900 truncate mb-1" title={lead.subject}>
                              {lead.subject}
                            </h4>
                            <span className="text-xs text-slate-600 font-medium block truncate">{lead.name}</span>
                            {lead.company && <span className="text-[11px] text-slate-400 block mt-0.5">{lead.company}</span>}
     
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-3 text-[11px] text-slate-500">
                              <span>{lead.date}</span>
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium border border-slate-200">{lead.service}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center p-6 text-center text-xs text-slate-400 font-medium">
                          Drop to {status}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Workspace Leads details drawer */}
      {selectedLead && createPortal(
        <div 
          className="fixed inset-0 z-[9998] flex justify-end bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedLead(null);
            }
          }}
        >
          <div
            className="bg-white border-l border-slate-200 shadow-2xl w-full max-w-[660px] h-full overflow-y-auto p-6 sm:p-8 flex flex-col justify-between"
          >
            {/* Header */}
            <div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6 select-none">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CRM Prospect Workspace</span>
                  <h3 className="text-xl font-bold text-slate-950 font-display mt-0.5">{selectedLead.subject}</h3>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-950 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Lead Information block */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs leading-relaxed">
                <div>
                  <span className="text-slate-500 font-medium block">Client Contact</span>
                  <span className="font-bold text-slate-950 block mt-0.5">{selectedLead.name}</span>
                  <span className="text-slate-500 block mt-0.5">{selectedLead.email} • {selectedLead.phone || 'No phone'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Organization & Channel</span>
                  <span className="font-bold text-slate-950 block mt-0.5">{selectedLead.company || 'Individual Client'}</span>
                  <span className="text-slate-500 block mt-0.5">Source: {selectedLead.source}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Service Category</span>
                  <span className="font-bold text-slate-900 block mt-0.5">{selectedLead.service}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Priority & Stage</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-slate-950">{selectedLead.priority} • {selectedLead.status}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPriorityModal(selectedLead);
                      }}
                      disabled={updatingPriorityLeadId === String(selectedLead._id || selectedLead.id)}
                      className="p-1 rounded text-slate-400 hover:text-slate-900 transition-all cursor-pointer"
                      title="Edit Lead Priority"
                    >
                      {updatingPriorityLeadId === String(selectedLead._id || selectedLead.id) ? (
                        <Loader2 size={13} className="animate-spin text-slate-950" />
                      ) : (
                        <Pencil size={13} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Workspace Navigation Tabs */}
              <div className="flex gap-2 border-b border-slate-200 pb-3 mb-6 select-none text-xs font-semibold">
                <button
                  onClick={() => setActiveWorkspaceTab('notes')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    activeWorkspaceTab === 'notes' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Notes & Details
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab('activities')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    activeWorkspaceTab === 'activities' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Touchpoints ({selectedLead.activities?.length || 0})
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab('tasks')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    activeWorkspaceTab === 'tasks' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tasks ({selectedLead.tasks?.filter((t) => !t.done).length || 0})
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab('reminders')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    activeWorkspaceTab === 'reminders' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Reminders
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab('comments')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    activeWorkspaceTab === 'comments' ? 'bg-slate-950 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Comments ({selectedLead.comments?.length || 0})
                </button>
              </div>

              {/* Tabs contents */}
              <div className="text-xs">
                {/* Notes TAB */}
                {activeWorkspaceTab === 'notes' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block mb-1.5 flex items-center gap-1.5">
                        <FileText size={14} className="text-slate-500" /> Original Inquiry Message
                      </span>
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {selectedLead.message}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-900">Internal Sales Notes (Auto-saved)</span>
                        {isNotesSaving && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium animate-fadeIn">
                            <Loader2 size={11} className="animate-spin text-slate-950" /> Syncing changes...
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={4}
                        placeholder="Log customer phone calls, quote discounts discussed, timeline requirements..."
                        className="w-full border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-xl px-3.5 py-2.5 outline-none resize-none placeholder:text-slate-400 bg-white text-slate-900 text-xs leading-relaxed"
                        value={selectedLead.internalNotes || ''}
                        onChange={(e) => handleNotesChange(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Activities TAB */}
                {activeWorkspaceTab === 'activities' && (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Add Activity log */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                      <span className="text-xs font-bold text-slate-900 leading-none block">Log Customer Interaction</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-600 font-semibold">Touchpoint Type</label>
                          <select
                            className="border border-slate-200 rounded-lg bg-white px-2.5 py-1.5 text-xs outline-none cursor-pointer text-slate-900 min-h-[36px]"
                            value={actType}
                            onChange={(e) => setActType(e.target.value as any)}
                          >
                            <option value="Call">Phone Call</option>
                            <option value="Email">Email Sent</option>
                            <option value="Note">General Note</option>
                            <option value="Task">Task Action</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-600 font-semibold">Activity Subject</label>
                          <input
                            type="text"
                            placeholder="e.g. Sent pricing catalog"
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-slate-900 bg-white text-slate-900 min-h-[36px]"
                            value={actTitle}
                            onChange={(e) => setActTitle(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1 col-span-2">
                          <label className="text-xs text-slate-600 font-semibold">Touchpoint Details</label>
                          <input
                            type="text"
                            placeholder="Discussed pricing options for 5L Floor Cleaner concentrate..."
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-slate-900 bg-white text-slate-900 min-h-[36px]"
                            value={actContent}
                            onChange={(e) => setActContent(e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        onClick={triggerAddActivity}
                        disabled={isAddingActivity}
                        className="bg-slate-950 text-white rounded-lg px-4 py-2 text-xs font-medium hover:bg-slate-800 self-start cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-xs min-h-[36px]"
                      >
                        {isAddingActivity && <Loader2 size={12} className="animate-spin text-white" />}
                        {isAddingActivity ? 'Adding...' : 'Record Interaction'}
                      </button>
                    </div>

                    {/* Activities List */}
                    <div className="space-y-3 relative pl-4 border-l-2 border-slate-200 ml-2 mt-2">
                      {(selectedLead.activities || []).map((act, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-950 ring-4 ring-white" />
                          <span className="text-[11px] text-slate-400 font-mono block">{act.date}</span>
                          <span className="font-bold text-slate-900 text-xs inline-block mt-0.5">{act.title}</span>
                          {act.content && <p className="text-xs text-slate-600 mt-0.5 italic">{act.content}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks TAB */}
                {activeWorkspaceTab === 'tasks' && (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Add Task input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add checklist task (e.g. Schedule call with manager)..."
                        className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 flex-1 placeholder:text-slate-400 bg-white text-slate-900 min-h-[40px]"
                        value={taskInput}
                        onChange={(e) => setTaskInput(e.target.value)}
                      />
                      <button
                        onClick={triggerAddTask}
                        disabled={isAddingTask}
                        className="bg-slate-950 text-white rounded-lg px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-xs min-h-[40px]"
                      >
                        {isAddingTask && <Loader2 size={13} className="animate-spin text-white" />}
                        {isAddingTask ? 'Adding...' : 'Add Task'}
                      </button>
                    </div>

                    {/* Tasks Checklist */}
                    <div className="space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                      {(selectedLead.tasks || []).length > 0 ? (
                        (selectedLead.tasks || []).map((t) => {
                          const isToggling = togglingTaskId === t.id;
                          return (
                            <div
                              key={t.id}
                              onClick={() => !isToggling && handleToggleTask(t.id, t.done)}
                              className={`flex items-center gap-3 p-2.5 bg-white border border-slate-100 rounded-lg hover:border-slate-300 cursor-pointer select-none transition-all shadow-xs ${
                                isToggling ? 'opacity-70 cursor-wait' : ''
                              }`}
                            >
                              {isToggling ? (
                                <Loader2 size={16} className="text-slate-950 animate-spin shrink-0" />
                              ) : t.done ? (
                                <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                              ) : (
                                <Square size={16} className="text-slate-400 shrink-0" />
                              )}
                              <span className={`text-xs ${t.done ? 'line-through text-slate-400' : 'text-slate-900 font-semibold'}`}>
                                {t.title}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 text-slate-400 text-xs">No pending tasks created.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reminders TAB */}
                {activeWorkspaceTab === 'reminders' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                      <span className="text-xs font-bold text-slate-900 leading-none block">Schedule Follow-up Reminder</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 col-span-2">
                          <label className="text-xs font-semibold text-slate-600">Reminder Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Follow up on commercial bulk discount quote"
                            className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 bg-white text-slate-900 min-h-[38px]"
                            value={reminderTitle}
                            onChange={(e) => setReminderTitle(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-slate-600">Target Date</label>
                          <input
                            type="date"
                            className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 bg-white text-slate-900 min-h-[38px]"
                            value={reminderDate}
                            onChange={(e) => setReminderDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        onClick={triggerAddReminder}
                        disabled={isAddingReminder}
                        className="bg-slate-950 text-white rounded-lg px-4 py-2 text-xs font-medium hover:bg-slate-800 self-start cursor-pointer flex items-center gap-1.5 disabled:opacity-60 shadow-xs min-h-[38px]"
                      >
                        {isAddingReminder ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Scheduling...</span>
                          </>
                        ) : (
                          <span>Set Reminder</span>
                        )}
                      </button>
                    </div>

                    {/* Reminders list */}
                    <div className="space-y-2">
                      {(selectedLead.reminders || []).length > 0 ? (
                        (selectedLead.reminders || []).map((rem) => (
                          <div className="p-3 border border-slate-200 rounded-xl bg-white shadow-xs flex justify-between items-center" key={rem.id}>
                            <span className="text-xs font-bold text-slate-900">{rem.title}</span>
                            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <Clock size={11} /> {rem.date}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-400 text-xs">No active reminders scheduled.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Comments TAB */}
                {activeWorkspaceTab === 'comments' && (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Add comment input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type internal collaboration note..."
                        className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-900 flex-1 placeholder:text-slate-400 bg-white text-slate-900 min-h-[40px] disabled:opacity-60"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        disabled={isAddingComment}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isAddingComment) {
                            e.preventDefault();
                            triggerAddComment();
                          }
                        }}
                      />
                      <button
                        onClick={triggerAddComment}
                        disabled={isAddingComment || !commentInput.trim()}
                        className="bg-slate-950 text-white rounded-lg px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-xs min-h-[40px]"
                      >
                        {isAddingComment && <Loader2 size={13} className="animate-spin text-white" />}
                        <span>{isAddingComment ? 'Saving...' : 'Post'}</span>
                      </button>
                    </div>

                    {/* Internal Comments List */}
                    <div className="space-y-2.5">
                      {(selectedLead.comments || []).length > 0 ? (
                        (selectedLead.comments || []).map((c) => (
                          <div className="p-3 border border-slate-200 rounded-xl bg-white shadow-xs" key={c.id}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <User size={12} className="text-slate-500" /> {c.author}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">{c.date}</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">"{c.body}"</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-400 text-xs">No team comments recorded.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Lead Modal Dialog */}


      {/* New Lead Modal */}
      {newLeadModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setNewLeadModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-[10px] border border-slate-200 shadow-2xl w-full max-w-[600px] p-6 sm:p-8 relative my-auto animate-slideUp">
            <button
              onClick={() => setNewLeadModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-950 transition-colors cursor-pointer border-none bg-transparent"
            >
              <X size={18} />
            </button>

            <div className="border-b border-slate-100 pb-3 mb-5">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">New Inquiry</h2>
              <p className="text-xs text-slate-500 mt-0.5">Register an incoming inquiry or customer query</p>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-700">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bulk discount quote for 5L Laundry Concentrate"
                  className="border border-slate-200 focus:border-indigo-600 rounded-md px-3.5 py-2 outline-none w-full text-xs text-slate-900 min-h-[38px]"
                  value={nlSubject}
                  onChange={(e) => setNlSubject(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amit Patil"
                  className="border border-slate-200 focus:border-indigo-600 rounded-md px-3.5 py-2 outline-none w-full text-xs text-slate-900 min-h-[38px]"
                  value={nlName}
                  onChange={(e) => setNlName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. amit@techsolutions.com"
                  className="border border-slate-200 focus:border-indigo-600 rounded-md px-3.5 py-2 outline-none w-full font-mono text-xs text-slate-900 min-h-[38px]"
                  value={nlEmail}
                  onChange={(e) => setNlEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 98112 34567"
                  className="border border-slate-200 focus:border-indigo-600 rounded-md px-3.5 py-2 outline-none w-full font-mono text-xs text-slate-900 min-h-[38px]"
                  value={nlPhone}
                  onChange={(e) => setNlPhone(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tech Solutions Pvt Ltd"
                  className="border border-slate-200 focus:border-indigo-600 rounded-md px-3.5 py-2 outline-none w-full text-xs text-slate-900 min-h-[38px]"
                  value={nlCompany}
                  onChange={(e) => setNlCompany(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Category *</label>
                <select
                  className="border border-slate-200 focus:border-indigo-600 rounded-md px-3.5 py-2 outline-none bg-white cursor-pointer text-xs text-slate-900 min-h-[38px]"
                  value={nlService}
                  onChange={(e) => setNlService(e.target.value)}
                >
                  <option>Floor Care</option>
                  <option>Dish Care</option>
                  <option>Laundry Care</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Channel</label>
                <select
                  className="border border-slate-200 focus:border-indigo-600 rounded-md px-3.5 py-2 outline-none bg-white cursor-pointer text-xs text-slate-900 min-h-[38px]"
                  value={nlSource}
                  onChange={(e) => setNlSource(e.target.value)}
                >
                  <option>Web Inquiry</option>
                  <option>Google Search</option>
                  <option>Reference</option>
                  <option>Direct Call</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Priority Level *</label>
                <select
                  className="border border-slate-200 focus:border-indigo-600 rounded-md px-3.5 py-2 outline-none bg-white cursor-pointer text-xs text-slate-900 min-h-[38px]"
                  value={nlPriority}
                  onChange={(e) => setNlPriority(e.target.value as any)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-700">Inquiry Details</label>
                <textarea
                  rows={3}
                  placeholder="Details of client requirements..."
                  className="border border-slate-200 focus:border-indigo-600 rounded-md px-3.5 py-2 outline-none w-full resize-none placeholder:text-slate-400 text-xs text-slate-900"
                  value={nlMessage}
                  onChange={(e) => setNlMessage(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 pt-4 border-t border-slate-200 mt-2 flex gap-3">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white rounded-md py-2 px-6 text-xs font-semibold hover:bg-indigo-700 cursor-pointer shadow-xs min-h-[38px] transition-colors"
                >
                  Create Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Step 1: Change Priority Selection Modal */}
      {isPriorityModalOpen && priorityEditLead && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsPriorityModalOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-[10px] border border-slate-200 shadow-2xl w-full max-w-[420px] p-6 relative animate-slideUp my-auto">
            <button
              onClick={() => setIsPriorityModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-950 transition-colors cursor-pointer border-none bg-transparent"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold shrink-0">
                <Pencil size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Change Priority</h3>
                <p className="text-xs text-slate-500 truncate max-w-[260px]">{priorityEditLead.subject}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs mb-6">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-700">Select Priority Level</label>
                <select
                  className="border border-slate-200 focus:border-indigo-600 rounded-md px-3 py-2 text-xs text-slate-900 font-medium bg-white outline-none cursor-pointer min-h-[38px]"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as Lead['priority'])}
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsPriorityModalOpen(false)}
                className="px-4 py-2 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer min-h-[38px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsPriorityModalOpen(false);
                  setIsConfirmPriorityModalOpen(true);
                }}
                className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[38px]"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Step 2: Confirm Priority Change Modal */}
      {isConfirmPriorityModalOpen && priorityEditLead && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsConfirmPriorityModalOpen(false);
              setIsPriorityModalOpen(true);
            }
          }}
        >
          <div className="bg-white rounded-[10px] border border-slate-200 shadow-2xl w-full max-w-[400px] p-6 text-center relative animate-slideUp my-auto">
            <button
              onClick={() => {
                setIsConfirmPriorityModalOpen(false);
                setIsPriorityModalOpen(true);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-950 transition-colors cursor-pointer border-none bg-transparent"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 bg-slate-100 border border-slate-200 text-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pencil size={20} />
            </div>

            <h3 className="text-base font-bold text-slate-950 mb-2">
              Confirm Priority Update
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Update priority for <strong className="text-slate-900">"{priorityEditLead.subject}"</strong> to <span className="font-bold text-slate-950">{selectedPriority} Priority</span>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsConfirmPriorityModalOpen(false);
                  setIsPriorityModalOpen(true);
                }}
                className="flex-1 py-2 px-4 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer min-h-[38px]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsConfirmPriorityModalOpen(false);
                  const targetId = priorityEditLead._id || priorityEditLead.id;
                  if (targetId) {
                    setUpdatingPriorityLeadId(String(targetId));
                    await updateLeadPriority(targetId, selectedPriority);
                    setUpdatingPriorityLeadId(null);
                  }
                  setPriorityEditLead(null);
                }}
                className="flex-1 py-2 px-4 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[38px]"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LeadsCRM;
