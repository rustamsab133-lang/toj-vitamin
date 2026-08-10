"use client";
import React, { useState, useEffect } from 'react';
import { adminDbQuery } from '@/lib/admin-api';
import { OfflineCustomer, OfflineOrder } from '@/lib/types';
import { 
  ChevronLeft, Users, Sparkles, TrendingUp, BarChart3, Search, 
  UserPlus, Download, Phone, Calendar, CheckSquare, Square, 
  Trash2, X, Plus, Edit, Copy, Check, ShoppingCart, Clock
} from 'lucide-react';

interface CrmTask {
  id: string;
  text: string;
  dueDate: string;
  completed: boolean;
}

type FilterType = 'all' | 'vip' | 'active' | 'new' | 'nophone';
type SortType = 'spent' | 'name' | 'created';

interface CrmDashboardProps {
  onBack: () => void;
  onNavigateToPos?: (customerId: string) => void;
}

export const CrmDashboard: React.FC<CrmDashboardProps> = ({ onBack, onNavigateToPos }) => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<OfflineCustomer[]>([]);
  const [analytics, setAnalytics] = useState({
    totalClients: 0,
    vipClients: 0,
    totalRevenue: 0,
    avgSpent: 0
  });

  // Filters & Pagination
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('spent');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 12;

  // Selected Customer details
  const [selectedCustomer, setSelectedCustomer] = useState<OfflineCustomer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<OfflineOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Notes & Tasks inside notes
  const [clientNotes, setClientNotes] = useState('');
  const [clientTasks, setClientTasks] = useState<CrmTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');

  // Modals for Create/Edit
  const [customerModal, setCustomerModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    id?: string;
    name: string;
    phone: string;
    notesText: string;
  }>({
    isOpen: false,
    mode: 'create',
    name: '',
    phone: '',
    notesText: ''
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Lock body scroll when CRM drawer or modal is open
  useEffect(() => {
    if (isDrawerOpen || customerModal.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isDrawerOpen, customerModal.isOpen]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchVal);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchVal]);

  // Load KPI analytics initially
  useEffect(() => {
    loadAnalytics();
  }, []);

  // Load customers on filters change
  useEffect(() => {
    loadCustomers();
  }, [page, search, activeFilter, sortBy]);

  // Load client orders and tasks when selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerOrders(selectedCustomer.id);
      const { notes, tasks } = parseNotesAndTasks(selectedCustomer.notes || '');
      setClientNotes(notes);
      setClientTasks(tasks);
    } else {
      setCustomerOrders([]);
      setClientNotes('');
      setClientTasks([]);
    }
  }, [selectedCustomer]);

  const loadAnalytics = async () => {
    try {
      const res = await adminDbQuery({
        action: 'select',
        table: 'offline_customers',
        data: { columns: 'id,total_spent' }
      });

      if (res.data) {
        const data = res.data as OfflineCustomer[];
        const totalClients = data.length;
        const totalRevenue = data.reduce((acc, c) => acc + Number(c.total_spent || 0), 0);
        // VIP = Gold & Platinum (Spent >= 2000 смн)
        const vipClients = data.filter(c => Number(c.total_spent || 0) >= 2000).length;
        const avgSpent = totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;

        setAnalytics({
          totalClients,
          vipClients,
          totalRevenue,
          avgSpent
        });
      }
    } catch (e) {
      console.error("Ошибка при загрузке аналитики CRM:", e);
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = page * pageSize - 1;

      // Base query setup
      const queryParams: any = {
        range: { from, to }
      };

      // Sorting
      if (sortBy === 'spent') {
        queryParams.order = { column: 'total_spent', ascending: false };
      } else if (sortBy === 'name') {
        queryParams.order = { column: 'name', ascending: true };
      } else if (sortBy === 'created') {
        queryParams.order = { column: 'created_at', ascending: false };
      }

      // Quick segments / filters via standard filters
      const dbFilters: Record<string, any> = {};

      // In Supabase client, we can filter using `or` for search, but range filters like VIP/Active are done via SQL conditions.
      // Since adminDbQuery uses postgrest API, we can pass standard or filters or specify ranges.
      // However, since `adminDbQuery` in API route currently supports simple `eq` filters or standard `or` search,
      // we can filter client-side if the database isn't massive, or build a clean filter structure.
      // Wait, our API route says:
      // if (data?.search) {
      //   if (data.search.or) { selectQuery = selectQuery.or(data.search.or); }
      // }
      // If we need range queries like VIP (total_spent >= 2000), since our API route only handles `eq` in filters,
      // we can fetch matching records by customizing `search` or fetching and filtering. But wait!
      // Can we pass a custom `or` or search query?
      // Let's look at `route.ts`:
      // data.search: { column, query } OR { or }
      // We can leverage postgrest features through `or` or standard query!
      // In postgrest, we can query like `total_spent=gte.2000`. But the API route only supports `eq` for `filters` loop:
      // Object.entries(filters).forEach(([col, val]) => { selectQuery = selectQuery.eq(col, val); })
      // For `data.search`, it supports `or` filter directly: `selectQuery = selectQuery.or(data.search.or)`.
      // We can pass Postgrest filters inside `data.search.or`! For example:
      // `total_spent.gte.2000` inside `or` argument works in postgrest, e.g. `.or("total_spent.gte.2000")` is parsed by Postgrest.
      // Let's see: `total_spent.gte.2000` is a valid syntax for `.or()`.
      // Let's compose the search/filter parameters:
      let orFilterParts: string[] = [];

      // Add search text filter (name or phone)
      if (search) {
        orFilterParts.push(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      // Add segment filtering
      if (activeFilter === 'vip') {
        // VIP: Spent >= 2000
        queryParams.search = { or: `total_spent.gte.2000` };
      } else if (activeFilter === 'active') {
        // Active (Silver): Spent >= 500 AND Spent < 2000
        queryParams.search = { or: `and(total_spent.gte.500,total_spent.lt.2000)` };
      } else if (activeFilter === 'nophone') {
        // No phone
        queryParams.search = { or: `phone.is.null,phone.eq.` };
      } else if (activeFilter === 'new') {
        // Created in last 7 days.
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        queryParams.search = { or: `created_at.gte.${sevenDaysAgo.toISOString()}` };
      }

      // If we have search text AND segment, we can combine them or combine in query.
      // Postgrest supports complex expressions. Let's merge search text with segment if both are active:
      if (search) {
        if (activeFilter === 'vip') {
          queryParams.search = { or: `and(total_spent.gte.2000,or(name.ilike.%${search}%,phone.ilike.%${search}%))` };
        } else if (activeFilter === 'active') {
          queryParams.search = { or: `and(total_spent.gte.500,total_spent.lt.2000,or(name.ilike.%${search}%,phone.ilike.%${search}%))` };
        } else if (activeFilter === 'nophone') {
          queryParams.search = { or: `and(or(phone.is.null,phone.eq.),or(name.ilike.%${search}%,phone.ilike.%${search}%))` };
        } else if (activeFilter === 'new') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          queryParams.search = { or: `and(created_at.gte.${sevenDaysAgo.toISOString()},or(name.ilike.%${search}%,phone.ilike.%${search}%))` };
        } else {
          queryParams.search = { or: `name.ilike.%${search}%,phone.ilike.%${search}%` };
        }
      }

      const res = await adminDbQuery({
        action: 'select',
        table: 'offline_customers',
        data: queryParams
      });

      if (res.data) setCustomers(res.data);
      if (res.count !== undefined) setTotalCount(res.count);
    } catch (e) {
      console.error("Ошибка при получении клиентов CRM:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerOrders = async (customerId: string) => {
    setLoadingOrders(true);
    try {
      const res = await adminDbQuery({
        action: 'select',
        table: 'offline_orders',
        filters: { customer_id: customerId },
        data: {
          order: { column: 'created_at', ascending: false }
        }
      });
      if (res.data) {
        setCustomerOrders(res.data);
      }
    } catch (e) {
      console.error("Ошибка при загрузке заказов клиента:", e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Helper: parse tasks from notes
  const parseNotesAndTasks = (notesString: string): { notes: string; tasks: CrmTask[] } => {
    if (!notesString) return { notes: '', tasks: [] };
    const marker = '--- CRM_TASKS_JSON ---';
    const parts = notesString.split(marker);
    const notes = parts[0].trim();
    let tasks: CrmTask[] = [];

    if (parts.length > 1) {
      try {
        tasks = JSON.parse(parts[1].trim());
      } catch (err) {
        console.error("Ошибка парсинга задач CRM из заметок:", err);
      }
    }
    return { notes, tasks };
  };

  // Helper: serialize tasks into notes
  const serializeNotesAndTasks = (notes: string, tasks: CrmTask[]): string => {
    const cleanNotes = notes.trim();
    if (tasks.length === 0) return cleanNotes;
    return `${cleanNotes}\n\n--- CRM_TASKS_JSON ---\n${JSON.stringify(tasks)}`;
  };

  // Save changes to client profile (notes and tasks)
  const saveClientDetails = async (updatedNotes: string, updatedTasks: CrmTask[]) => {
    if (!selectedCustomer) return;
    const serializedNotes = serializeNotesAndTasks(updatedNotes, updatedTasks);

    try {
      await adminDbQuery({
        action: 'update',
        table: 'offline_customers',
        id: selectedCustomer.id,
        data: { notes: serializedNotes }
      });
      // Update local state
      const updatedCust = { ...selectedCustomer, notes: serializedNotes };
      setSelectedCustomer(updatedCust);
      setCustomers(customers.map(c => c.id === selectedCustomer.id ? updatedCust : c));
    } catch (err) {
      alert("Ошибка при сохранении заметок: " + err);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setClientNotes(val);
    saveClientDetails(val, clientTasks);
  };

  // Tasks Management
  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: CrmTask = {
      id: Date.now().toString(),
      text: newTaskText.trim(),
      dueDate: newTaskDate || new Date().toISOString().slice(0, 10),
      completed: false
    };
    const updatedTasks = [...clientTasks, newTask];
    setClientTasks(updatedTasks);
    saveClientDetails(clientNotes, updatedTasks);
    setNewTaskText('');
    setNewTaskDate('');
  };

  const toggleTask = (taskId: string) => {
    const updatedTasks = clientTasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    setClientTasks(updatedTasks);
    saveClientDetails(clientNotes, updatedTasks);
  };

  const deleteTask = (taskId: string) => {
    const updatedTasks = clientTasks.filter(t => t.id !== taskId);
    setClientTasks(updatedTasks);
    saveClientDetails(clientNotes, updatedTasks);
  };

  // Get Loyalty Tier info
  const getLoyaltyInfo = (spent: number) => {
    // 🥉 Bronze (до 500)
    // 🥈 Silver (500 – 2000)
    // 🥇 Gold (2000 – 5000)
    // 👑 Platinum (5000+)
    if (spent < 500) {
      return {
        icon: '🥉',
        name: 'Bronze',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        glowClass: 'hover:border-amber-300',
        cardClass: 'border-amber-100 bg-amber-50/10',
        nextTier: 'Silver',
        nextLimit: 500,
        progress: Math.round((spent / 500) * 100)
      };
    } else if (spent < 2000) {
      return {
        icon: '🥈',
        name: 'Silver',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        glowClass: 'hover:border-slate-400 hover:shadow-slate-100',
        cardClass: 'border-slate-200 bg-slate-50/20',
        nextTier: 'Gold',
        nextLimit: 2000,
        progress: Math.round(((spent - 500) / 1500) * 100)
      };
    } else if (spent < 5000) {
      return {
        icon: '🥇',
        name: 'Gold',
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 font-bold',
        glowClass: 'border-yellow-300 shadow-md shadow-yellow-50 hover:border-yellow-400',
        cardClass: 'border-yellow-200 bg-yellow-50/10',
        nextTier: 'Platinum',
        nextLimit: 5000,
        progress: Math.round(((spent - 2000) / 3000) * 100)
      };
    } else {
      return {
        icon: '👑',
        name: 'Platinum',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-200 font-bold animate-pulse',
        glowClass: 'border-purple-300 shadow-lg shadow-purple-50 hover:border-purple-400',
        cardClass: 'border-purple-200 bg-purple-50/10',
        nextTier: 'Max',
        nextLimit: 5000,
        progress: 100
      };
    }
  };

  // Add/Edit Customer handler
  const openCustomerModal = (mode: 'create' | 'edit', customer?: OfflineCustomer) => {
    if (mode === 'edit' && customer) {
      const { notes } = parseNotesAndTasks(customer.notes || '');
      setCustomerModal({
        isOpen: true,
        mode: 'edit',
        id: customer.id,
        name: customer.name,
        phone: customer.phone || '',
        notesText: notes
      });
    } else {
      setCustomerModal({
        isOpen: true,
        mode: 'create',
        name: '',
        phone: '',
        notesText: ''
      });
    }
  };

  const handleSaveCustomer = async () => {
    if (!customerModal.name.trim()) return alert("Имя обязательно для заполнения");
    setIsSaving(true);
    try {
      if (customerModal.mode === 'create') {
        const payload = {
          name: customerModal.name.trim(),
          phone: customerModal.phone.trim(),
          notes: customerModal.notesText.trim(),
          total_spent: 0
        };
        await adminDbQuery({
          action: 'insert',
          table: 'offline_customers',
          data: payload
        });
      } else if (customerModal.mode === 'edit' && customerModal.id) {
        // Merge notes back with tasks
        const originalCustomer = customers.find(c => c.id === customerModal.id);
        const { tasks } = parseNotesAndTasks(originalCustomer?.notes || '');
        const serializedNotes = serializeNotesAndTasks(customerModal.notesText, tasks);

        const payload = {
          name: customerModal.name.trim(),
          phone: customerModal.phone.trim(),
          notes: serializedNotes
        };
        await adminDbQuery({
          action: 'update',
          table: 'offline_customers',
          id: customerModal.id,
          data: payload
        });
      }

      setCustomerModal({ isOpen: false, mode: 'create', name: '', phone: '', notesText: '' });
      loadCustomers();
      loadAnalytics();
      
      // Update selectedCustomer if we were editing it
      if (customerModal.mode === 'edit' && selectedCustomer?.id === customerModal.id) {
        // Refresh selected customer state
        const res = await adminDbQuery({
          action: 'select',
          table: 'offline_customers',
          filters: { id: customerModal.id }
        });
        if (res.data && res.data.length > 0) {
          setSelectedCustomer(res.data[0]);
        }
      }
    } catch (e) {
      alert("Ошибка при сохранении: " + e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("Вы действительно хотите удалить этого клиента из базы CRM?")) return;
    if (!confirm("ВНИМАНИЕ! Это действие сотрет всю информацию о покупках клиента и его статусе лояльности. Продолжить?")) return;

    try {
      await adminDbQuery({
        action: 'delete',
        table: 'offline_customers',
        id
      });
      setIsDrawerOpen(false);
      setSelectedCustomer(null);
      loadCustomers();
      loadAnalytics();
    } catch (e) {
      alert("Ошибка при удалении клиента: " + e);
    }
  };

  // Copy telephone to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Export database to CSV
  const exportCrmToCSV = async () => {
    try {
      const res = await adminDbQuery({
        action: 'select',
        table: 'offline_customers',
        data: { order: { column: 'total_spent', ascending: false } }
      });
      if (!res.data || res.data.length === 0) return alert('Нет данных для экспорта');

      let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Cyrillic rendering
      csvContent += "ФИО,Телефон,Всего потрачено (смн),Уровень лояльности,Дата регистрации,Заметки\n";
      
      res.data.forEach((c: OfflineCustomer) => {
        const { notes } = parseNotesAndTasks(c.notes || '');
        const tier = getLoyaltyInfo(c.total_spent).name;
        const date = c.created_at ? new Date(c.created_at).toLocaleDateString('ru-RU') : '';
        const row = [
          `"${c.name.replace(/"/g, '""')}"`,
          `"${(c.phone || '').replace(/"/g, '""')}"`,
          c.total_spent,
          `"${tier}"`,
          `"${date}"`,
          `"${notes.replace(/\n/g, ' ').replace(/"/g, '""')}"`
        ].join(",");
        csvContent += row + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `crm_customers_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('Ошибка при экспорте базы CRM: ' + e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={20} className="text-slate-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Users size={24} className="text-emerald-600" /> CRM Система
            </h2>
            <p className="text-xs text-slate-400">Управление клиентами, лояльностью и задачами</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={exportCrmToCSV} 
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={16} /> Экспорт CSV
          </button>
          <button 
            onClick={() => openCustomerModal('create')} 
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-100"
          >
            <UserPlus size={16} /> Новый клиент
          </button>
        </div>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-emerald-500 bg-emerald-50 rounded-bl-2xl">
            <Users size={18} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Всего клиентов</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-2">{analytics.totalClients}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-purple-500 bg-purple-50 rounded-bl-2xl">
            <Sparkles size={18} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">VIP Клиенты</p>
          <p className="text-3xl font-extrabold text-purple-600 mt-2 flex items-baseline gap-1">
            {analytics.vipClients}
            <span className="text-[10px] text-slate-400 font-normal">Gold/Plat</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-blue-500 bg-blue-50 rounded-bl-2xl">
            <TrendingUp size={18} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Общая выручка LTV</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-2 flex items-baseline gap-1">
            {analytics.totalRevenue.toLocaleString()}
            <span className="text-xs text-slate-400 font-bold">смн</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-indigo-500 bg-indigo-50 rounded-bl-2xl">
            <BarChart3 size={18} />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Средний чек (AOV)</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-2 flex items-baseline gap-1">
            {analytics.avgSpent.toLocaleString()}
            <span className="text-xs text-slate-400 font-bold">смн</span>
          </p>
        </div>
      </div>

      {/* Main CRM Workspace (Split Screen) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Directory Side */}
        <div className="lg:col-span-12 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Поиск по ФИО, телефону..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'vip', 'active', 'new', 'nophone'] as FilterType[]).map(filter => {
                const labelMap: Record<FilterType, string> = {
                  all: 'Все',
                  vip: '👑 VIP (Gold+)',
                  active: '🥈 Активные (Silver)',
                  new: '🆕 Новые (7д)',
                  nophone: '🚫 Без телефона'
                };
                return (
                  <button
                    key={filter}
                    onClick={() => { setActiveFilter(filter); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      activeFilter === filter 
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {labelMap[filter]}
                  </button>
                );
              })}
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Сортировка:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortType)}
                className="bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-700 py-1.5 px-3 outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="spent">Сумма покупок</option>
                <option value="name">По алфавиту</option>
                <option value="created">По дате добавления</option>
              </select>
            </div>
          </div>

          {/* Customer Cards Grid */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-20 text-center text-slate-400">
              Загрузка базы CRM...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {customers.map(c => {
                  const loyalty = getLoyaltyInfo(c.total_spent);
                  const isVip = loyalty.name === 'Gold' || loyalty.name === 'Platinum';
                  return (
                    <div 
                      key={c.id}
                      onClick={() => { setSelectedCustomer(c); setIsDrawerOpen(true); }}
                      className={`group bg-white border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md ${loyalty.glowClass} flex flex-col justify-between h-48`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-slate-50 border border-slate-100 text-slate-700 shadow-sm shrink-0`}>
                              {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-emerald-700 transition-colors truncate">{c.name}</h4>
                              <p className="text-xs text-slate-400 truncate mt-0.5">{c.phone || 'Без телефона'}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${loyalty.badgeClass}`}>
                            {loyalty.icon} {loyalty.name}
                          </span>
                        </div>

                        {/* Progress bar to next level */}
                        {loyalty.nextTier !== 'Max' ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                              <span>До уровня {loyalty.nextTier}</span>
                              <span className="font-bold text-slate-500">{loyalty.nextLimit - c.total_spent} смн</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  loyalty.name === 'Bronze' ? 'bg-amber-400' : loyalty.name === 'Silver' ? 'bg-slate-400' : 'bg-yellow-400'
                                }`}
                                style={{ width: `${loyalty.progress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-purple-500 font-bold">
                              <span>Максимальный статус</span>
                              <span>Королевский уровень</span>
                            </div>
                            <div className="w-full bg-purple-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 w-full animate-pulse" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs mt-3">
                        <span className="text-slate-400">Потрачено всего:</span>
                        <span className="font-bold text-slate-800 text-sm">{c.total_spent.toLocaleString()} смн</span>
                      </div>
                    </div>
                  );
                })}
                {customers.length === 0 && (
                  <div className="col-span-full bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400">
                    Клиенты по заданным фильтрам не найдены.
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-sm bg-white p-4 rounded-2xl border border-slate-50 shadow-sm">
                <span className="text-slate-500 text-xs font-semibold">
                  Показано {Math.min((page - 1) * pageSize + 1, totalCount)}-{Math.min(page * pageSize, totalCount)} из {totalCount}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPage(page - 1)} 
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    Назад
                  </button>
                  <span className="text-slate-700 font-semibold text-xs px-2">
                    {page} / {Math.ceil(totalCount / pageSize) || 1}
                  </span>
                  <button 
                    onClick={() => setPage(page + 1)} 
                    disabled={page >= Math.ceil(totalCount / pageSize)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CRM Profile Side-Drawer */}
      {isDrawerOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-100 animate-slide-in overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-100">
                  {selectedCustomer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base leading-snug">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${getLoyaltyInfo(selectedCustomer.total_spent).badgeClass}`}>
                      {getLoyaltyInfo(selectedCustomer.total_spent).icon} {getLoyaltyInfo(selectedCustomer.total_spent).name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      В базе с {selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString('ru-RU') : 'неизвестно'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Contact Info & Main Metrics */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100/50 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2.5">
                    <Phone size={15} className="text-slate-400" />
                    <span className="font-mono text-sm font-semibold text-slate-700">{selectedCustomer.phone || 'Номер не указан'}</span>
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => copyToClipboard(selectedCustomer.phone!, 'phone')} 
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded transition-all"
                          title="Скопировать"
                        >
                          {copiedId === 'phone' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                        <a 
                          href={`tel:${selectedCustomer.phone}`} 
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded transition-all"
                          title="Позвонить"
                        >
                          <Phone size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                  
                  {/* Create Sale Shortcut */}
                  {onNavigateToPos && (
                    <button 
                      onClick={() => {
                        setIsDrawerOpen(false);
                        onNavigateToPos(selectedCustomer.id);
                      }}
                      className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-900 transition-colors shadow-sm"
                    >
                      <ShoppingCart size={12} /> Оформить продажу
                    </button>
                  )}
                </div>

                {/* Micro Stats inside Card */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/50 text-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Всего трат</p>
                    <p className="font-extrabold text-slate-800 mt-1">{selectedCustomer.total_spent.toLocaleString()} смн</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Покупок</p>
                    <p className="font-extrabold text-slate-800 mt-1">{customerOrders.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Средний чек</p>
                    <p className="font-extrabold text-slate-800 mt-1">
                      {customerOrders.length > 0 
                        ? Math.round(selectedCustomer.total_spent / customerOrders.length).toLocaleString() 
                        : selectedCustomer.total_spent.toLocaleString()
                      } смн
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress visual in Drawer */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Уровень лояльности</h4>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">
                      Текущий уровень: {getLoyaltyInfo(selectedCustomer.total_spent).name}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Потрачено: {selectedCustomer.total_spent} смн
                    </span>
                  </div>
                  {getLoyaltyInfo(selectedCustomer.total_spent).nextTier !== 'Max' ? (
                    <div className="space-y-1">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all bg-gradient-to-r from-emerald-500 to-teal-500`}
                          style={{ width: `${getLoyaltyInfo(selectedCustomer.total_spent).progress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium text-right">
                        До уровня **{getLoyaltyInfo(selectedCustomer.total_spent).nextTier}** осталось потратить еще **{getLoyaltyInfo(selectedCustomer.total_spent).nextLimit - selectedCustomer.total_spent} смн**
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-100/50 text-purple-700 text-xs font-medium">
                      👑 Поздравляем! Клиент обладает максимальным статусом **Platinum**. Предоставьте ему премиальный уровень сервиса и персональные скидки.
                    </div>
                  )}
                </div>
              </div>

              {/* Notes & Tasks Planner Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Notes Textarea */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Заметки</span>
                    <span className="text-[10px] text-slate-400 font-normal">Автосохранение</span>
                  </h4>
                  <textarea 
                    value={clientNotes}
                    onChange={handleNotesChange}
                    placeholder="Укажите размер, любимые витамины или примечания по доставке..."
                    className="w-full h-44 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Follow-up Tasks */}
                <div className="space-y-2 flex flex-col">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Задачи и звонки (Follow-ups)</h4>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col flex-1 h-44">
                    
                    {/* Tasks List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                      {clientTasks.length === 0 ? (
                        <p className="text-slate-400 text-center py-6">Нет запланированных задач</p>
                      ) : (
                        clientTasks.map(t => (
                          <div key={t.id} className="flex items-start justify-between bg-white p-2 rounded-xl shadow-xs border border-slate-100/50 group/task">
                            <div className="flex items-start gap-2 min-w-0">
                              <button 
                                onClick={() => toggleTask(t.id)} 
                                className="text-slate-400 hover:text-emerald-500 transition-colors shrink-0 mt-0.5"
                              >
                                {t.completed ? <CheckSquare size={14} className="text-emerald-600" /> : <Square size={14} />}
                              </button>
                              <div className="min-w-0">
                                <p className={`font-semibold text-slate-700 leading-tight truncate ${t.completed ? 'line-through text-slate-400' : ''}`}>
                                  {t.text}
                                </p>
                                <span className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Calendar size={10} /> {new Date(t.dueDate).toLocaleDateString('ru-RU')}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => deleteTask(t.id)}
                              className="text-slate-300 hover:text-red-500 p-0.5 rounded opacity-0 group-hover/task:opacity-100 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Task Add Form */}
                    <div className="pt-2 mt-2 border-t border-slate-200/50 space-y-1.5 shrink-0">
                      <input 
                        type="text" 
                        placeholder="Напомнить позвонить..." 
                        value={newTaskText}
                        onChange={e => setNewTaskText(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-[11px] outline-none focus:ring-1 focus:ring-emerald-500"
                        onKeyDown={e => e.key === 'Enter' && addTask()}
                      />
                      <div className="flex gap-1">
                        <input 
                          type="date" 
                          value={newTaskDate}
                          onChange={e => setNewTaskDate(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-[10px] text-slate-500 outline-none flex-1"
                        />
                        <button 
                          onClick={addTask}
                          className="bg-slate-800 text-white text-[11px] font-bold px-2 rounded-lg hover:bg-slate-900 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Order Timeline History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} /> История покупок
                </h4>
                {loadingOrders ? (
                  <p className="text-slate-400 text-xs py-4 text-center">Загрузка покупок...</p>
                ) : customerOrders.length === 0 ? (
                  <p className="text-slate-400 text-xs py-6 text-center bg-slate-50 rounded-2xl border border-slate-100/50">Заказов пока нет</p>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map(order => (
                      <div key={order.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between gap-3 text-xs">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800">Заказ #{order.id.slice(0, 8)}</span>
                            <span className="text-[10px] text-slate-400 ml-2 font-medium">
                              {order.created_at ? new Date(order.created_at).toLocaleString('ru-RU') : ''}
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-800 text-sm">{order.total_amount} смн</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {order.items.map((it, idx) => (
                            <span key={idx} className="bg-white border border-slate-150 px-2 py-0.5 rounded text-[10px] font-medium text-slate-600">
                              {it.name} ×{it.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Footer controls in Drawer */}
            <div className="p-6 border-t border-slate-150 bg-slate-50/50 flex justify-between gap-3">
              <button 
                onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                className="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100/70 border border-red-150 rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Trash2 size={14} /> Удалить профиль
              </button>
              <button 
                onClick={() => openCustomerModal('edit', selectedCustomer)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Edit size={14} /> Редактировать ФИО/телефон
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit/Create Customer Modal Popup */}
      {customerModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">
                {customerModal.mode === 'create' ? 'Новый клиент CRM' : 'Редактировать контакты'}
              </h3>
              <button 
                onClick={() => setCustomerModal({ isOpen: false, mode: 'create', name: '', phone: '', notesText: '' })}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600 uppercase tracking-wide">ФИО клиента</label>
                <input 
                  type="text" 
                  placeholder="Иван Иванов" 
                  value={customerModal.name} 
                  onChange={e => setCustomerModal({ ...customerModal, name: e.target.value })}
                  className="w-full border p-3 rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-600 uppercase tracking-wide">Телефон</label>
                <input 
                  type="text" 
                  placeholder="992XXXXXXXXX" 
                  value={customerModal.phone} 
                  onChange={e => setCustomerModal({ ...customerModal, phone: e.target.value })}
                  className="w-full border p-3 rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold font-mono"
                />
              </div>

              {customerModal.mode === 'create' && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 uppercase tracking-wide">Первичные заметки</label>
                  <textarea 
                    placeholder="Например: Любит витамин C..." 
                    value={customerModal.notesText} 
                    onChange={e => setCustomerModal({ ...customerModal, notesText: e.target.value })}
                    className="w-full h-24 border p-3 rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleSaveCustomer} 
                disabled={isSaving} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl font-bold text-xs disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button 
                onClick={() => setCustomerModal({ isOpen: false, mode: 'create', name: '', phone: '', notesText: '' })} 
                disabled={isSaving} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-xl font-bold text-xs transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
