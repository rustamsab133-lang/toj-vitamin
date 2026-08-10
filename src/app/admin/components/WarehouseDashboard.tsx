"use client";
import React, { useState, useEffect, useRef } from 'react';
import { adminDbQuery } from '@/lib/admin-api';
import { Product, OfflineCustomer, OfflineOrder } from '@/lib/types';
import { getMarkupSettings, applyMarkupToProduct, MarkupSettings } from '@/lib/markup';
import { 
  ChevronLeft, Package, Users, ShoppingCart, Clock, Plus, Trash2, 
  Save, X, Search, UserPlus, Edit, RefreshCw, Barcode, 
  ArrowDownRight, ArrowUpLeft, AlertCircle, Layers, ClipboardList, TrendingUp
} from 'lucide-react';

type Tab = 'dashboard' | 'pos' | 'products' | 'history';

interface WarehouseTransaction {
  id: string;
  product_id: string;
  type: 'arrival' | 'sale_offline' | 'sale_online' | 'write_off' | 'correction';
  quantity_change: number;
  prev_quantity: number;
  new_quantity: number;
  reference_id?: string;
  notes?: string;
  created_at: string;
  product?: {
    name: string;
  };
}

export const WarehouseDashboard: React.FC<{ 
  onBack: () => void;
  initialTab?: Tab;
  initialCustomerId?: string;
  onClearInitialParams?: () => void;
}> = ({ onBack, initialTab, initialCustomerId, onClearInitialParams }) => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [markupSettings, setMarkupSettings] = useState<MarkupSettings>({ percent: 0, flat: 0 });

  useEffect(() => {
    getMarkupSettings().then(setMarkupSettings);
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    totalItems: 0,
    lowStock: 0,
    wholesaleValue: 0,
    retailValue: 0
  });

  const loadDashboardStats = async () => {
    setLoading(true);
    try {
      const [prodRes, ordRes, markup] = await Promise.all([
        adminDbQuery({ action: 'select', table: 'products', data: { columns: 'price,stock_quantity' } }),
        adminDbQuery({ action: 'select', table: 'offline_orders', data: { columns: 'total_amount' } }),
        getMarkupSettings()
      ]);
      
      const totalRevenue = ordRes.data ? ordRes.data.reduce((acc: number, o: any) => acc + Number(o.total_amount), 0) : 0;
      
      let totalItems = 0;
      let wholesaleValue = 0;
      let retailValue = 0;
      let lowStock = 0;

      if (prodRes.data) {
        prodRes.data.forEach((p: any) => {
          const qty = Number(p.stock_quantity) || 0;
          const wholesalePrice = Number(p.price) || 0;
          
          // Calculate retail price using markup helper formula: price * (1 + pct/100) + flat
          const retailPrice = Math.round(wholesalePrice * (1 + (markup.percent || 0) / 100) + (markup.flat || 0));

          totalItems += qty;
          wholesaleValue += wholesalePrice * qty;
          retailValue += retailPrice * qty;
          
          if (qty < 5) {
            lowStock++;
          }
        });
      }
      
      setDashboardStats({ 
        totalRevenue, 
        totalItems, 
        lowStock, 
        wholesaleValue, 
        retailValue 
      });
    } catch (err) {
      console.error("Ошибка при получении сводки склада:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardStats();
    }
  }, [activeTab]);

  const navItems = [
    { id: 'dashboard', label: 'Сводка', icon: <Layers size={16} /> },
    { id: 'pos', label: 'Касса (POS)', icon: <ShoppingCart size={16} /> },
    { id: 'products', label: 'Управление запасами', icon: <Package size={16} /> },
    { id: 'history', label: 'История и лог', icon: <ClipboardList size={16} /> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Складской учет</h2>
            <p className="text-slate-400 text-xs mt-0.5">Управление запасами, инвентаризация и касса</p>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-slate-100 self-start lg:self-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {item.icon} <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 min-h-[500px]">
        {activeTab === 'dashboard' && (
          loading ? (
            <div className="text-center py-20 text-slate-400">Загрузка сводки...</div>
          ) : (
            <DashboardTab stats={dashboardStats} />
          )
        )}
        {activeTab === 'products' && (
          <ProductsTab 
            onRefreshDashboard={loadDashboardStats} 
            markupSettings={markupSettings} 
          />
        )}
        {activeTab === 'pos' && (
          <PosTab 
            onRefreshDashboard={loadDashboardStats} 
            markupSettings={markupSettings}
            initialCustomerId={initialCustomerId}
            onClearInitialCustomerId={onClearInitialParams}
          />
        )}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  );
};

// ======================== TABS ======================== //

const DashboardTab = ({ stats }: { stats: any }) => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Общая сводка склада</h3>
        <p className="text-slate-400 text-xs mt-1">Оценка остатков и статистика продаж</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Выручка кассы (POS)</p>
          <p className="text-3xl font-extrabold text-emerald-800 mt-2">{stats.totalRevenue.toLocaleString('ru-RU')} смн</p>
          <p className="text-[10px] text-emerald-600/70 mt-1">за все время работы</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Товаров в наличии</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats.totalItems} шт</p>
          <p className="text-[10px] text-slate-400 mt-1">физический остаток на полках</p>
        </div>
        <div className="bg-red-50/50 rounded-2xl p-5 border border-red-100">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">Дефицитные товары</p>
          <p className="text-3xl font-extrabold text-red-600 mt-2">{stats.lowStock} поз.</p>
          <p className="text-[10px] text-red-500/70 mt-1">остаток менее 5 единиц</p>
        </div>
        <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Оценка запасов (опт)</p>
          <p className="text-3xl font-extrabold text-blue-800 mt-2">{stats.wholesaleValue.toLocaleString('ru-RU')} смн</p>
          <p className="text-[10px] text-blue-600/70 mt-1">в розничных ценах: {stats.retailValue.toLocaleString('ru-RU')} смн</p>
        </div>
      </div>

      {/* Quick advice */}
      <div className="rounded-2xl border border-slate-100 p-5 flex items-start gap-4 bg-slate-50/30">
        <AlertCircle size={20} className="text-slate-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-700">Концепция сквозного складского учета</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Каталог объединен с основным списком товаров сайта. Изменение количества товара во вкладке «Управление запасами» 
            или кассовая продажа POS сразу меняют остаток на сайте. При переходе онлайн-заказов в статус «Оплата получена» 
            товары автоматически списываются со склада, а при отмене — возвращаются обратно. Каждое изменение логируется в Журнале операций.
          </p>
        </div>
      </div>
    </div>
  );
};

// Stock management tab
const ProductsTab = ({ 
  onRefreshDashboard,
  markupSettings 
}: { 
  onRefreshDashboard: () => void;
  markupSettings: MarkupSettings;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  // Stock adjust modal state
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'arrival' | 'write_off' | 'correction'>('arrival');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Barcode edit modal state
  const [barcodingProduct, setBarcodingProduct] = useState<Product | null>(null);
  const [newBarcode, setNewBarcode] = useState('');
  const [isSavingBarcode, setIsSavingBarcode] = useState(false);

  // Barcode quick scan focus
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scanVal, setScanVal] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchVal);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchVal]);

  useEffect(() => {
    loadProducts();
  }, [page, search]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = page * pageSize - 1;
      const res = await adminDbQuery({
        action: 'select',
        table: 'products',
        data: {
          range: { from, to },
          search: search ? { column: 'name', query: search } : undefined,
          order: { column: 'name', ascending: true }
        }
      });
      if (res.data) setProducts(res.data);
      if (res.count !== undefined) setTotalCount(res.count);
    } catch (e) {
      console.error("Ошибка при получении товаров склада:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = scanVal.trim();
    if (!query) return;
    
    setLoading(true);
    try {
      const res = await adminDbQuery({
        action: 'select',
        table: 'products',
        filters: { barcode: query }
      });
      
      if (res.data && res.data.length > 0) {
        setAdjustingProduct(res.data[0]);
        setAdjustType('arrival');
        setAdjustQty(0);
        setAdjustNotes('');
        setScanVal('');
      } else {
        alert(`Товар со штрихкодом "${query}" не найден в каталоге.`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustingProduct || adjustQty <= 0 || isAdjusting) return;
    setIsAdjusting(true);

    const change = adjustType === 'arrival' ? adjustQty : -adjustQty;
    const typeLabel = adjustType === 'arrival' ? 'Приход' : (adjustType === 'write_off' ? 'Списание' : 'Коррекция');

    try {
      await adminDbQuery({
        action: 'rpc',
        name: 'adjust_product_stock',
        data: {
          p_product_id: adjustingProduct.id,
          p_type: adjustType,
          p_quantity_change: change,
          p_notes: adjustNotes || `Ручная корректировка: ${typeLabel}`
        }
      });

      setAdjustingProduct(null);
      loadProducts();
      onRefreshDashboard();
    } catch (err: any) {
      alert("Ошибка изменения запасов: убедитесь, что SQL-скрипт выполнен в Supabase. " + (err.message || err));
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleSaveBarcode = async () => {
    if (!barcodingProduct || isSavingBarcode) return;
    setIsSavingBarcode(true);

    try {
      await adminDbQuery({
        action: 'update',
        table: 'products',
        id: barcodingProduct.id,
        data: { barcode: newBarcode.trim() || null }
      });

      setBarcodingProduct(null);
      loadProducts();
    } catch (err: any) {
      alert("Ошибка сохранения штрихкода: " + (err.message || err));
    } finally {
      setIsSavingBarcode(false);
    }
  };

  const exportStockToCSV = async () => {
    try {
      const res = await adminDbQuery({
        action: 'select',
        table: 'products',
        data: { order: { column: 'name', ascending: true } }
      });
      if (!res.data || res.data.length === 0) return alert('Нет товаров для экспорта');

      let csvContent = "\uFEFF";
      csvContent += "ID,Название,Штрихкод,Оптовая цена (смн),Розничная цена (смн),Остаток (шт)\n";
      
      res.data.forEach((p: Product) => {
        const retailPrice = Math.round(Number(p.price || 0) * (1 + (markupSettings.percent || 0) / 100) + (markupSettings.flat || 0));
        const row = [
          `"${p.id}"`,
          `"${p.name.replace(/"/g, '""')}"`,
          `"${(p.barcode || '').replace(/"/g, '""')}"`,
          p.price,
          retailPrice,
          p.stock_quantity || 0
        ].join(",");
        csvContent += row + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `warehouse_stock_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('Ошибка при экспорте остатков');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800">Управление запасами</h3>
          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded-md text-slate-500">Всего позиций: {totalCount}</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick scan form */}
          <form onSubmit={handleScanSubmit} className="relative flex items-center">
            <Barcode className="absolute left-3 text-slate-400" size={16} />
            <input 
              ref={scanInputRef}
              type="text" 
              placeholder="Сканер штрихкода..."
              className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all w-48"
              value={scanVal}
              onChange={e => setScanVal(e.target.value)}
            />
          </form>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Поиск по названию..."
              className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all w-60"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
            />
          </div>
          <button onClick={exportStockToCSV} className="bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-200 transition-colors">
            Экспорт CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Загрузка каталога...</div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 rounded-xl">
                <tr>
                  <th className="p-4 rounded-l-xl">ID</th>
                  <th className="p-4">Название</th>
                  <th className="p-4">Штрихкод</th>
                  <th className="p-4">Опт цена</th>
                  <th className="p-4">Розница (сайт)</th>
                  <th className="p-4">В наличии</th>
                  <th className="p-4 rounded-r-xl">Операции</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const retailPrice = Math.round(Number(p.price || 0) * (1 + (markupSettings.percent || 0) / 100) + (markupSettings.flat || 0));
                  const isLow = (p.stock_quantity || 0) < 5;
                  
                  return (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono text-xs text-slate-400">{p.id}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 leading-tight">{p.name}</div>
                        {p.full_name && p.full_name !== p.name && (
                          <div className="text-slate-400 text-[10px] mt-0.5 max-w-sm truncate">{p.full_name}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {p.barcode || 'нет'}
                          </span>
                          <button 
                            onClick={() => { setBarcodingProduct(p); setNewBarcode(p.barcode || ''); }}
                            className="p-1 text-slate-400 hover:text-slate-800 transition-colors"
                            title="Изменить штрихкод"
                          >
                            <Edit size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 font-medium">{p.price} смн</td>
                      <td className="p-4 text-slate-800 font-bold">{retailPrice} смн</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                          isLow ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {p.stock_quantity || 0} шт
                        </span>
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => {
                            setAdjustingProduct(p);
                            setAdjustType('arrival');
                            setAdjustQty(0);
                            setAdjustNotes('');
                          }}
                          className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Коррекция
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {products.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Товары не найдены.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalCount={totalCount} pageSize={pageSize} onChange={setPage} />
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-lg text-slate-800">Корректировка запасов</h4>
              <button onClick={() => setAdjustingProduct(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-400 uppercase font-semibold">Товар</p>
              <p className="font-bold text-sm text-slate-800 leading-tight mt-0.5">{adjustingProduct.name}</p>
              <p className="text-xs text-slate-500 mt-1">Текущий остаток: <strong>{adjustingProduct.stock_quantity || 0} шт</strong></p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Тип операции</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'arrival', label: 'Приход', icon: <ArrowUpLeft className="text-emerald-500" size={14} /> },
                    { id: 'write_off', label: 'Списание', icon: <ArrowDownRight className="text-red-500" size={14} /> },
                    { id: 'correction', label: 'Инвентарь', icon: <AlertCircle className="text-blue-500" size={14} /> }
                  ].map(op => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setAdjustType(op.id as any)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        adjustType === op.id 
                          ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {op.icon} {op.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  {adjustType === 'arrival' ? 'Добавить количество' : (adjustType === 'write_off' ? 'Списать количество' : 'Новое количество')} (шт)
                </label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-800 outline-none"
                  value={adjustQty || ''}
                  onChange={e => setAdjustQty(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Комментарий</label>
                <textarea 
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-800 outline-none resize-none"
                  value={adjustNotes}
                  onChange={e => setAdjustNotes(e.target.value)}
                  placeholder="Например: Поставка от дилера, Истек срок годности, Корректировка остатка"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleAdjustStock}
                disabled={adjustQty <= 0 || isAdjusting}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl disabled:opacity-40 transition-colors shadow-lg shadow-slate-850/10"
              >
                {isAdjusting ? 'Сохранение...' : 'Подтвердить'}
              </button>
              <button 
                onClick={() => setAdjustingProduct(null)} 
                disabled={isAdjusting}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Barcode Modal */}
      {barcodingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-lg text-slate-800">Привязать штрихкод</h4>
              <button onClick={() => setBarcodingProduct(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p className="text-slate-400 uppercase font-semibold">Товар</p>
              <p className="font-bold text-slate-800 leading-tight">{barcodingProduct.name}</p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Штрихкод (сканируйте или введите)</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-800 outline-none"
                value={newBarcode}
                onChange={e => setNewBarcode(e.target.value)}
                placeholder="Штрихкод продукта"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleSaveBarcode}
                disabled={isSavingBarcode}
                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl disabled:opacity-40 transition-colors shadow-lg shadow-slate-850/10"
              >
                {isSavingBarcode ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button 
                onClick={() => setBarcodingProduct(null)} 
                disabled={isSavingBarcode}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors"
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

// POS Cashier Tab
const PosTab = ({ 
  onRefreshDashboard, 
  markupSettings,
  initialCustomerId,
  onClearInitialCustomerId
}: { 
  onRefreshDashboard: () => void;
  markupSettings: MarkupSettings;
  initialCustomerId?: string;
  onClearInitialCustomerId?: () => void;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');

  const [cart, setCart] = useState<{product: Product, qty: number, retailPrice: number}[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Dynamic Customer Search autocomplete
  const [customerQuery, setCustomerQuery] = useState('');
  const [matchingCustomers, setMatchingCustomers] = useState<OfflineCustomer[]>([]);
  const [selectedCustObj, setSelectedCustObj] = useState<OfflineCustomer | null>(null);
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  useEffect(() => {
    if (initialCustomerId) {
      const fetchInitialCustomer = async () => {
        try {
          const res = await adminDbQuery({
            action: 'select',
            table: 'offline_customers',
            filters: { id: initialCustomerId }
          });
          if (res.data && res.data.length > 0) {
            const cust = res.data[0];
            setSelectedCustObj(cust);
            setSelectedCustomer(cust.id);
          }
        } catch (err) {
          console.error("Ошибка при загрузке клиента в POS:", err);
        } finally {
          if (onClearInitialCustomerId) {
            onClearInitialCustomerId();
          }
        }
      };
      fetchInitialCustomer();
    }
  }, [initialCustomerId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchVal);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal]);

  useEffect(() => {
    loadPosProducts();
  }, [search]);

  const loadPosProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await adminDbQuery({
        action: 'select',
        table: 'products',
        data: {
          range: { from: 0, to: 11 },
          search: search ? { column: 'name', query: search } : undefined,
          order: { column: 'name', ascending: true }
        }
      });
      if (res.data) setProducts(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = searchVal.trim();
      if (!query) return;
      e.preventDefault();

      setLoadingProducts(true);
      try {
        const res = await adminDbQuery({
          action: 'select',
          table: 'products',
          filters: { barcode: query }
        });

        if (res.data && res.data.length > 0) {
          const product = res.data[0];
          addToCart(product);
          setSearchVal('');
          setSearch('');
        }
      } catch (err) {
        console.error("Ошибка поиска по штрихкоду:", err);
      } finally {
        setLoadingProducts(false);
      }
    }
  };

  useEffect(() => {
    if (!customerQuery.trim()) {
      setMatchingCustomers([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await adminDbQuery({
          action: 'select',
          table: 'offline_customers',
          data: {
            range: { from: 0, to: 9 },
            search: { or: `name.ilike.%${customerQuery}%,phone.ilike.%${customerQuery}%` }
          }
        });
        if (res.data) setMatchingCustomers(res.data);
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerQuery]);

  // Calculate marked up total amount
  const totalAmount = cart.reduce((acc, item) => acc + (item.retailPrice * item.qty), 0);

  const addToCart = (p: Product) => {
    const existing = cart.find(i => i.product.id === p.id);
    const inStock = Number(p.stock_quantity) || 0;
    
    // Apply retail markup
    const retailPrice = Math.round(Number(p.price || 0) * (1 + (markupSettings.percent || 0) / 100) + (markupSettings.flat || 0));

    if (existing) {
      if (existing.qty >= inStock) return alert(`Недостаточно товара на складе! В наличии всего: ${inStock} шт`);
      setCart(cart.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      if (inStock < 1) return alert('Товара нет в наличии на складе!');
      setCart([...cart, { product: p, qty: 1, retailPrice }]);
    }
  };

  const removeFromCart = (id: string) => setCart(cart.filter(i => i.product.id !== id));

  const handleCheckout = async () => {
    if (cart.length === 0 || isCheckingOut) return;
    setIsCheckingOut(true);
    
    try {
      // Items list sent to POS RPC: uses marked up retail price
      const orderItems = cart.map(i => ({ 
        product_id: i.product.id, 
        name: i.product.name, 
        quantity: i.qty, 
        price: i.retailPrice 
      }));
      
      await adminDbQuery({
        action: 'rpc',
        name: 'process_offline_sale',
        data: {
          p_customer_id: selectedCustomer || null,
          p_items: orderItems,
          p_total_amount: totalAmount
        }
      });

      alert('Продажа успешно оформлена! Товар списан, лог записан.');
      setCart([]);
      setSelectedCustomer('');
      setSelectedCustObj(null);
      setCustomerQuery('');
      loadPosProducts();
      onRefreshDashboard();
    } catch (e: any) {
      alert('Ошибка при оформлении продажи: ' + (e.message || e));
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Products Selection */}
      <div className="flex-1 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input 
            type="text"
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-slate-800 outline-none transition-all placeholder:text-slate-400"
            placeholder="Поиск по названию или штрихкоду (Enter для сканера)..."
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        
        {loadingProducts ? (
          <div className="text-center py-20 text-slate-400">Поиск товаров...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {products.map(p => {
              const inStock = Number(p.stock_quantity) || 0;
              const hasStock = inStock > 0;
              const retailPrice = Math.round(Number(p.price || 0) * (1 + (markupSettings.percent || 0) / 100) + (markupSettings.flat || 0));
              
              return (
                <div 
                  key={p.id} 
                  onClick={() => hasStock && addToCart(p)}
                  className={`p-4 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-32 ${
                    hasStock 
                      ? 'hover:border-blue-500 hover:shadow-md border-slate-150 bg-white' 
                      : 'opacity-50 border-slate-100 bg-slate-50 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <p className="font-bold text-slate-800 text-xs line-clamp-2 leading-tight">{p.name}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">{p.barcode || 'без кода'}</p>
                  </div>
                  <div className="flex justify-between items-center mt-2 border-t border-slate-50 pt-2 shrink-0">
                    <span className="text-[10px] font-bold text-slate-500">{inStock} шт</span>
                    <span className="text-xs font-extrabold text-blue-600">{retailPrice} смн</span>
                  </div>
                </div>
              );
            })}
            {products.length === 0 && (
              <div className="col-span-full text-center py-20 text-slate-400 text-sm">Ничего не найдено.</div>
            )}
          </div>
        )}
      </div>

      {/* Cart / POS Panel */}
      <div className="w-full lg:w-96 bg-slate-50 border border-slate-100 rounded-3xl p-5 flex flex-col h-[calc(100vh-250px)] max-h-[600px] relative">
        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
          <ShoppingCart size={18} /> Чек продажи
        </h3>
        
        {/* Dynamic Autocomplete Customer Select */}
        <div className="mb-4 relative">
          {selectedCustObj ? (
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm shadow-sm">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{selectedCustObj.name}</p>
                <p className="text-xs text-slate-500">{selectedCustObj.phone || 'нет номера'}</p>
              </div>
              <button 
                onClick={() => { setSelectedCustObj(null); setSelectedCustomer(''); }} 
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input 
                type="text"
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-slate-800 outline-none"
                placeholder="Клиент (поиск по ФИО/телефону)..."
                value={customerQuery}
                onChange={e => { setCustomerQuery(e.target.value); setShowCustDropdown(true); }}
                onFocus={() => setShowCustDropdown(true)}
              />
              {showCustDropdown && customerQuery.trim() && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 p-2 space-y-1">
                  {matchingCustomers.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => {
                        setSelectedCustObj(c);
                        setSelectedCustomer(c.id);
                        setShowCustDropdown(false);
                        setCustomerQuery('');
                      }}
                      className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-left transition-colors"
                    >
                      <p className="font-bold text-slate-800 text-xs">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.phone || 'без телефона'}</p>
                    </div>
                  ))}
                  {matchingCustomers.length === 0 && (
                    <p className="p-2 text-center text-slate-400 text-xs">Ничего не найдено</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Корзина пуста. Выберите товары.
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-bold text-slate-800 truncate">{item.product.name}</p>
                  <p className="text-xs text-slate-500">{item.retailPrice} смн × {item.qty}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800 text-sm shrink-0">{item.retailPrice * item.qty} смн</span>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0"><X size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-4 mt-4 border-t border-slate-200">
          <div className="flex justify-between items-end mb-4">
            <span className="text-slate-500 text-xs">К оплате (розница):</span>
            <span className="text-3xl font-extrabold text-slate-800">{totalAmount} <span className="text-lg">смн</span></span>
          </div>
          {markupSettings.percent > 0 && (
            <div className="mb-3 text-[10px] text-emerald-600 font-semibold text-right">
              Применена наценка сайта +{markupSettings.percent}%
            </div>
          )}
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
              cart.length > 0 && !isCheckingOut ? 'bg-slate-800 hover:bg-slate-900 shadow-lg' : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {isCheckingOut ? 'Оформление...' : 'Оплатить и Списать'}
          </button>
        </div>
      </div>
    </div>
  );
};

// History and Transaction Logs Tab
const HistoryTab = () => {
  const [subTab, setSubTab] = useState<'sales' | 'transactions'>('transactions');

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setSubTab('transactions')}
          className={`pb-3 px-6 text-sm font-semibold border-b-2 transition-all ${
            subTab === 'transactions' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Журнал складских операций
        </button>
        <button
          onClick={() => setSubTab('sales')}
          className={`pb-3 px-6 text-sm font-semibold border-b-2 transition-all ${
            subTab === 'sales' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          История кассовых чеков
        </button>
      </div>

      <div>
        {subTab === 'transactions' ? <WarehouseTransactionsLog /> : <OfflineSalesLog />}
      </div>
    </div>
  );
};

// Subcomponent: Warehouse Transactions Log
const WarehouseTransactionsLog = () => {
  const [transactions, setTransactions] = useState<WarehouseTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    loadTransactions();
  }, [page]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = page * pageSize - 1;
      const res = await adminDbQuery({
        action: 'select',
        table: 'warehouse_transactions',
        data: {
          columns: '*,product:products(name)',
          range: { from, to },
          order: { column: 'created_at', ascending: false }
        }
      });
      if (res.data) setTransactions(res.data);
      if (res.count !== undefined) setTotalCount(res.count);
    } catch (e) {
      console.error("Ошибка при получении журнала транзакций:", e);
    } finally {
      setLoading(false);
    }
  };

  const getOpBadge = (type: string, change: number) => {
    const isPos = change > 0;
    const sign = isPos ? '+' : '';
    
    switch(type) {
      case 'arrival':
        return <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-100 rounded-md text-[10px] font-bold">Приход ({sign}{change})</span>;
      case 'write_off':
        return <span className="bg-red-50 text-red-700 px-2 py-0.5 border border-red-100 rounded-md text-[10px] font-bold">Списание ({change})</span>;
      case 'sale_offline':
        return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 border border-amber-100 rounded-md text-[10px] font-bold">Касса POS ({change})</span>;
      case 'sale_online':
        return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 border border-blue-100 rounded-md text-[10px] font-bold">Сайт ({change})</span>;
      case 'correction':
        return <span className="bg-purple-50 text-purple-700 px-2 py-0.5 border border-purple-100 rounded-md text-[10px] font-bold">Коррекция ({sign}{change})</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold">{sign}{change}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-10 text-slate-400">Загрузка журнала...</div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="p-4">Дата / Время</th>
                  <th className="p-4">Товар</th>
                  <th className="p-4">Операция</th>
                  <th className="p-4">Остаток до → после</th>
                  <th className="p-4">Ссылка/Заметка</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => {
                  const date = t.created_at ? new Date(t.created_at).toLocaleString('ru-RU') : '';
                  return (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-xs font-medium text-slate-500">{date}</td>
                      <td className="p-4 font-bold text-slate-800">
                        {t.product ? t.product.name : `Товар ID: ${t.product_id}`}
                      </td>
                      <td className="p-4">{getOpBadge(t.type, t.quantity_change)}</td>
                      <td className="p-4 text-xs text-slate-500">
                        {t.prev_quantity !== null ? t.prev_quantity : 0} шт &rarr; <strong>{t.new_quantity} шт</strong>
                      </td>
                      <td className="p-4 text-xs text-slate-400 max-w-xs truncate">
                        {t.reference_id ? `Док: #${t.reference_id.slice(0, 8)}` : (t.notes || '—')}
                      </td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400">Записей о движении товаров пока нет.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalCount={totalCount} pageSize={pageSize} onChange={setPage} />
        </div>
      )}
    </div>
  );
};

// Subcomponent: Offline Sales Log (POS Receipts)
const OfflineSalesLog = () => {
  const [orders, setOrders] = useState<OfflineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    loadOrders();
  }, [page]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const from = (page - 1) * pageSize;
      const to = page * pageSize - 1;
      const res = await adminDbQuery({
        action: 'select',
        table: 'offline_orders',
        data: {
          columns: '*,customer:offline_customers(name)',
          range: { from, to },
          order: { column: 'created_at', ascending: false }
        }
      });
      if (res.data) setOrders(res.data);
      if (res.count !== undefined) setTotalCount(res.count);
    } catch (e) {
      console.error("Ошибка при получении чеков:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-10 text-slate-400">Загрузка чеков...</div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-slate-500 py-10 text-center">Кассовых продаж пока не оформлено.</p>}
            {orders.map(o => {
              const date = o.created_at ? new Date(o.created_at).toLocaleString('ru-RU') : '';
              return (
                <div key={o.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-800">Чек #{o.id?.slice(0, 8)}</p>
                    <p className="text-xs text-slate-400 mb-3">{date}</p>
                    <div className="flex gap-2 flex-wrap">
                      {o.items.map((i, idx) => (
                        <span key={idx} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 shadow-sm">
                          {i.name} · {i.price} смн × {i.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-between shrink-0">
                    <div>
                      <p className="font-extrabold text-xl text-slate-800">{o.total_amount} смн</p>
                      <p className="text-xs text-blue-600 font-semibold mt-1">
                        {o.customer ? (
                          <span className="flex items-center justify-end gap-1"><Users size={12}/> {o.customer.name}</span>
                        ) : (
                          'Обычный покупатель'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} totalCount={totalCount} pageSize={pageSize} onChange={setPage} />
        </div>
      )}
    </div>
  );
};

// ======================== COMMON UI COMPONENTS ======================== //

const Pagination = ({ page, totalCount, pageSize, onChange }: { page: number, totalCount: number, pageSize: number, onChange: (p: number) => void }) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-sm">
      <span className="text-slate-500">
        Показано {Math.min((page - 1) * pageSize + 1, totalCount)}-{Math.min(page * pageSize, totalCount)} из {totalCount}
      </span>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onChange(page - 1)} 
          disabled={page === 1}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          Назад
        </button>
        <span className="text-slate-700 font-medium px-1">
          {page} / {totalPages}
        </span>
        <button 
          onClick={() => onChange(page + 1)} 
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
        >
          Вперед
        </button>
      </div>
    </div>
  );
};
