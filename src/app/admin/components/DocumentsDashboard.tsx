"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { adminDbQuery } from '@/lib/admin-api';
import { Product } from '@/lib/types';
import { 
  ChevronLeft, FileText, Plus, Trash2, Save, X, Search, 
  Edit, RefreshCw, Printer, Package, Users as UsersIcon, 
  CheckCircle, XCircle, Clock, Filter, ChevronDown, Tag, Building2,
  ArrowDownRight, ArrowUpLeft, RotateCcw, FileWarning, AlertTriangle, Upload, FileSpreadsheet
} from 'lucide-react';

// ==================== TYPES ====================

interface Supplier {
  id: string;
  name: string;
  legal_name?: string;
  inn?: string;
  phone?: string;
  email?: string;
  address?: string;
  contact_person?: string;
  payment_terms?: string;
  notes?: string;
  is_active: boolean;
  created_at?: string;
}

type DocType = 'receipt' | 'write_off' | 'invoice' | 'return';
type DocStatus = 'draft' | 'confirmed' | 'cancelled';

interface WarehouseDocument {
  id: string;
  doc_number: string;
  doc_type: DocType;
  supplier_id?: string;
  total_amount: number;
  status: DocStatus;
  notes?: string;
  created_by?: string;
  confirmed_at?: string;
  created_at?: string;
  supplier?: Supplier;
  items?: DocItem[];
}

interface DocItem {
  id?: string;
  document_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

interface ExcelMatchedRow {
  rowIndex: number;
  excelName: string;
  excelBarcode: string;
  excelQty: number;
  excelPrice: number;
  matchedProduct: Product | null;
  matchConfidence: number;
  matchMethod: 'barcode' | 'name' | 'none';
  priceChanged: boolean;
  oldPrice: number;
  included: boolean;
}

type Tab = 'documents' | 'create' | 'suppliers' | 'labels';

const DOC_TYPE_MAP: Record<DocType, { label: string; icon: React.ReactNode; color: string; prefix: string }> = {
  receipt: { label: 'Приходная накладная', icon: <ArrowDownRight size={14} />, color: 'emerald', prefix: 'ТН' },
  write_off: { label: 'Акт списания', icon: <FileWarning size={14} />, color: 'red', prefix: 'СП' },
  invoice: { label: 'Счёт на оплату', icon: <FileText size={14} />, color: 'blue', prefix: 'СЧ' },
  return: { label: 'Возврат', icon: <RotateCcw size={14} />, color: 'amber', prefix: 'ВЗ' },
};

const DOC_STATUS_MAP: Record<DocStatus, { label: string; color: string }> = {
  draft: { label: 'Черновик', color: 'slate' },
  confirmed: { label: 'Проведён', color: 'emerald' },
  cancelled: { label: 'Отменён', color: 'red' },
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatMoney = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 0 });

// ==================== MAIN COMPONENT ====================

export const DocumentsDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>('documents');

  const navItems = [
    { id: 'documents' as Tab, label: 'Документы', icon: <FileText size={16} /> },
    { id: 'create' as Tab, label: 'Создать', icon: <Plus size={16} /> },
    { id: 'suppliers' as Tab, label: 'Поставщики', icon: <Building2 size={16} /> },
    { id: 'labels' as Tab, label: 'Этикетки', icon: <Tag size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Документы и печать</h2>
            <p className="text-slate-400 text-xs mt-0.5">Накладные, счета, акты списания и этикетки</p>
          </div>
        </div>
        
        <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-slate-100 self-start lg:self-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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
        {activeTab === 'documents' && <DocumentsListTab />}
        {activeTab === 'create' && <CreateDocumentTab onCreated={() => setActiveTab('documents')} />}
        {activeTab === 'suppliers' && <SuppliersTab />}
        {activeTab === 'labels' && <LabelsTab />}
      </div>
    </div>
  );
};

// ==================== DOCUMENTS LIST TAB ====================

const DocumentsListTab = () => {
  const [docs, setDocs] = useState<WarehouseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<DocType | ''>('');
  const [statusFilter, setStatusFilter] = useState<DocStatus | ''>('');
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [printDoc, setPrintDoc] = useState<WarehouseDocument | null>(null);
  const [printType, setPrintType] = useState<'receipt' | 'invoice' | 'writeoff' | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminDbQuery({
        action: 'select',
        table: 'warehouse_documents',
        data: { 
          columns: '*, supplier:suppliers(*), items:warehouse_document_items(*)',
          order: 'created_at.desc'
        }
      });
      let filtered = res.data || [];
      if (typeFilter) filtered = filtered.filter((d: any) => d.doc_type === typeFilter);
      if (statusFilter) filtered = filtered.filter((d: any) => d.status === statusFilter);
      setDocs(filtered);
    } catch (err) {
      console.error('Ошибка загрузки документов:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const confirmDoc = async (id: string) => {
    try {
      await adminDbQuery({
        action: 'update',
        table: 'warehouse_documents',
        id,
        data: { status: 'confirmed', confirmed_at: new Date().toISOString() }
      });
      loadDocs();
    } catch (err) {
      alert('Ошибка проведения документа');
    }
  };

  const cancelDoc = async (id: string) => {
    if (!confirm('Отменить документ? Это действие нельзя отменить.')) return;
    try {
      await adminDbQuery({
        action: 'update',
        table: 'warehouse_documents',
        id,
        data: { status: 'cancelled' }
      });
      loadDocs();
    } catch (err) {
      alert('Ошибка отмены документа');
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('Удалить черновик документа?')) return;
    try {
      await adminDbQuery({ action: 'delete', table: 'warehouse_document_items', filters: { document_id: id } });
      await adminDbQuery({ action: 'delete', table: 'warehouse_documents', id });
      loadDocs();
    } catch (err) {
      alert('Ошибка удаления документа');
    }
  };

  const handlePrint = (doc: WarehouseDocument) => {
    if (doc.doc_type === 'receipt' || doc.doc_type === 'return') {
      setPrintType('receipt');
    } else if (doc.doc_type === 'invoice') {
      setPrintType('invoice');
    } else {
      setPrintType('writeoff');
    }
    setPrintDoc(doc);
  };

  // Print overlay
  if (printDoc && printType) {
    return (
      <PrintableDocument doc={printDoc} type={printType} onClose={() => { setPrintDoc(null); setPrintType(null); }} />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Фильтры:</span>
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as DocType | '')}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Все типы</option>
          {Object.entries(DOC_TYPE_MAP).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as DocStatus | '')}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Все статусы</option>
          {Object.entries(DOC_STATUS_MAP).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <button onClick={loadDocs} className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
          <RefreshCw size={14} /> Обновить
        </button>
        <span className="text-xs text-slate-300 ml-auto">{docs.length} документов</span>
      </div>

      {/* Documents Table */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Загрузка документов...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400">Нет документов</p>
          <p className="text-xs text-slate-300 mt-1">Создайте первый документ на вкладке «Создать»</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="pb-3 pr-3">Номер</th>
                <th className="pb-3 pr-3">Тип</th>
                <th className="pb-3 pr-3">Поставщик</th>
                <th className="pb-3 pr-3">Сумма</th>
                <th className="pb-3 pr-3">Статус</th>
                <th className="pb-3 pr-3">Дата</th>
                <th className="pb-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {docs.map(doc => {
                const typeInfo = DOC_TYPE_MAP[doc.doc_type] || DOC_TYPE_MAP.receipt;
                const statusInfo = DOC_STATUS_MAP[doc.status] || DOC_STATUS_MAP.draft;
                const isExpanded = expandedDoc === doc.id;

                return (
                  <React.Fragment key={doc.id}>
                    <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}>
                      <td className="py-3 pr-3">
                        <span className="font-mono font-semibold text-slate-700">{doc.doc_number}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-${typeInfo.color}-50 text-${typeInfo.color}-700`}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        {doc.supplier?.name || '—'}
                      </td>
                      <td className="py-3 pr-3 font-semibold text-slate-800">
                        {formatMoney(doc.total_amount)} смн
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${statusInfo.color}-50 text-${statusInfo.color}-600`}>
                          {doc.status === 'confirmed' && <CheckCircle size={12} />}
                          {doc.status === 'cancelled' && <XCircle size={12} />}
                          {doc.status === 'draft' && <Clock size={12} />}
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-slate-500 text-xs">{formatDate(doc.created_at)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handlePrint(doc)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="Печать">
                            <Printer size={16} />
                          </button>
                          {doc.status === 'draft' && (
                            <>
                              <button onClick={() => confirmDoc(doc.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition-colors" title="Провести">
                                <CheckCircle size={16} />
                              </button>
                              <button onClick={() => cancelDoc(doc.id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors" title="Отменить">
                                <XCircle size={16} />
                              </button>
                              <button onClick={() => deleteDoc(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Удалить">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Expanded items */}
                    {isExpanded && doc.items && doc.items.length > 0 && (
                      <tr>
                        <td colSpan={7} className="bg-slate-50/50 px-4 py-3">
                          <div className="text-xs text-slate-500 mb-2 font-semibold">Позиции документа:</div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-400 uppercase tracking-wider">
                                <th className="text-left pb-1">№</th>
                                <th className="text-left pb-1">Наименование</th>
                                <th className="text-right pb-1">Кол-во</th>
                                <th className="text-right pb-1">Цена</th>
                                <th className="text-right pb-1">Сумма</th>
                              </tr>
                            </thead>
                            <tbody>
                              {doc.items.map((item, idx) => (
                                <tr key={item.id || idx} className="border-t border-slate-100">
                                  <td className="py-1">{idx + 1}</td>
                                  <td className="py-1 text-slate-700">{item.product_name}</td>
                                  <td className="py-1 text-right">{item.quantity}</td>
                                  <td className="py-1 text-right">{formatMoney(item.price)}</td>
                                  <td className="py-1 text-right font-semibold">{formatMoney(item.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {doc.notes && (
                            <p className="text-xs text-slate-400 mt-2 italic">Примечание: {doc.notes}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ==================== CREATE DOCUMENT TAB ====================

const CreateDocumentTab: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const [docType, setDocType] = useState<DocType>('receipt');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DocItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Excel import state
  const [excelMode, setExcelMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [excelParsing, setExcelParsing] = useState(false);
  const [excelRows, setExcelRows] = useState<ExcelMatchedRow[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSuppliersAndProducts();
  }, []);

  const loadSuppliersAndProducts = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        adminDbQuery({ action: 'select', table: 'suppliers', data: { columns: '*', filters: { is_active: true } } }),
        adminDbQuery({ action: 'select', table: 'products', data: { columns: 'id,name,price,stock_quantity,barcode', order: 'name.asc' } })
      ]);
      setSuppliers(supRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    }
  };

  const filteredProducts = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q));
  });

  const addItem = (product: Product) => {
    const existing = items.find(i => i.product_id === String(product.id));
    if (existing) {
      setItems(items.map(i => 
        i.product_id === String(product.id)
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price }
          : i
      ));
    } else {
      setItems([...items, {
        product_id: String(product.id),
        product_name: product.name,
        quantity: 1,
        price: Number(product.price) || 0,
        total: Number(product.price) || 0,
      }]);
    }
    setSearch('');
  };

  const updateItemField = (idx: number, field: 'quantity' | 'price', value: number) => {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      updated.total = updated.quantity * updated.price;
      return updated;
    }));
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalAmount = items.reduce((sum, i) => sum + i.total, 0);

  const handleSave = async () => {
    if (items.length === 0) { alert('Добавьте хотя бы одну позицию'); return; }
    setSaving(true);
    try {
      // Generate doc number
      const prefix = DOC_TYPE_MAP[docType].prefix;
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Get existing count for this month/type
      const countRes = await adminDbQuery({
        action: 'select',
        table: 'warehouse_documents',
        data: { 
          columns: 'id',
          filters: { doc_type: docType },
        }
      });
      const seq = ((countRes.data?.length || 0) + 1).toString().padStart(4, '0');
      const docNumber = `${prefix}-${ym}-${seq}`;

      // Create document
      const docRes = await adminDbQuery({
        action: 'insert',
        table: 'warehouse_documents',
        data: {
          doc_number: docNumber,
          doc_type: docType,
          supplier_id: supplierId || null,
          total_amount: totalAmount,
          status: 'draft',
          notes: notes || null,
          created_by: 'admin',
        }
      });

      const docId = docRes.data?.[0]?.id;
      if (!docId) throw new Error('Не удалось создать документ');

      // Create items
      for (const item of items) {
        await adminDbQuery({
          action: 'insert',
          table: 'warehouse_document_items',
          data: {
            document_id: docId,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          }
        });
      }

      alert(`Документ ${docNumber} создан!`);
      onCreated();
    } catch (err: any) {
      alert('Ошибка создания документа: ' + (err?.message || 'Неизвестная ошибка'));
    } finally {
      setSaving(false);
    }
  };

  // ==================== EXCEL IMPORT LOGIC ====================

  const COLUMN_PATTERNS: Record<string, RegExp> = {
    name: /^(наименование|название|товар|продукт|name|product|описание|номенклатура|позиция)/i,
    barcode: /^(штрихкод|штрих.?код|баркод|barcode|ean|код.?товара|артикул|код|sku|арт)/i,
    quantity: /^(кол[ив\-]?[чв]?[ое]?ство|кол[\.\-]?во|qty|quantity|шт|кол\.?$|количество)/i,
    price: /^(цена|стоимость|price|цена.?закуп|закуп\.?цена|цена.?за.?ед|себестоимость|cost)/i,
  };

  const detectColumns = (headers: string[]): Record<string, number> => {
    const mapping: Record<string, number> = {};
    const normalizedHeaders = headers.map(h => (h || '').toString().trim());

    for (const [field, pattern] of Object.entries(COLUMN_PATTERNS)) {
      const idx = normalizedHeaders.findIndex(h => pattern.test(h));
      if (idx !== -1) mapping[field] = idx;
    }

    // Fallback: if no name column, use first text-like column
    if (mapping.name === undefined) {
      const textColIdx = normalizedHeaders.findIndex((h, i) => 
        h.length > 0 && !Object.values(mapping).includes(i)
      );
      if (textColIdx !== -1) mapping.name = textColIdx;
    }

    // Fallback: if no quantity, look for any numeric-looking header
    if (mapping.quantity === undefined) {
      const numIdx = normalizedHeaders.findIndex((h, i) => 
        /^\d|кол|шт/i.test(h) && !Object.values(mapping).includes(i)
      );
      if (numIdx !== -1) mapping.quantity = numIdx;
    }

    return mapping;
  };

  const normalizeForMatch = (str: string): string => {
    return str.toLowerCase()
      .replace(/[«»""']/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\(.*?\)/g, '')
      .replace(/капс\.?|таб\.?|порошок|экстракт|комплекс|сироп|gls|pharm|№\d+|\d+\s*мг|\d+\s*г|\d+\s*ие|\d+\s*ме/gi, '')
      .trim();
  };

  const matchProductByBarcode = (barcode: string): Product | null => {
    if (!barcode) return null;
    const cleanBarcode = barcode.toString().replace(/\D/g, '').trim();
    if (cleanBarcode.length < 4) return null;
    return products.find(p => p.barcode && p.barcode.replace(/\D/g, '') === cleanBarcode) || null;
  };

  const matchProductByName = (excelName: string): { product: Product | null; confidence: number } => {
    if (!excelName || excelName.trim().length < 2) return { product: null, confidence: 0 };
    
    const normalized = normalizeForMatch(excelName);
    
    // 1. Exact match
    const exact = products.find(p => p.name.toLowerCase() === excelName.toLowerCase().trim());
    if (exact) return { product: exact, confidence: 100 };

    // 2. Normalized exact
    const normalExact = products.find(p => normalizeForMatch(p.name) === normalized);
    if (normalExact) return { product: normalExact, confidence: 95 };

    // 3. Contains match (Excel name contains product name or vice versa)
    let bestMatch: Product | null = null;
    let bestScore = 0;

    for (const p of products) {
      const pNorm = normalizeForMatch(p.name);
      if (pNorm.length < 3) continue;

      if (normalized.includes(pNorm) || pNorm.includes(normalized)) {
        // Score based on length similarity
        const score = Math.min(normalized.length, pNorm.length) / Math.max(normalized.length, pNorm.length) * 85;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = p;
        }
      }

      // 4. Word overlap
      const excelWords = normalized.split(' ').filter(w => w.length > 2);
      const prodWords = pNorm.split(' ').filter(w => w.length > 2);
      if (excelWords.length > 0 && prodWords.length > 0) {
        const overlap = excelWords.filter(w => prodWords.some(pw => pw.includes(w) || w.includes(pw)));
        const wordScore = (overlap.length / Math.max(excelWords.length, prodWords.length)) * 75;
        if (wordScore > bestScore) {
          bestScore = wordScore;
          bestMatch = p;
        }
      }
    }

    return { product: bestMatch, confidence: Math.round(bestScore) };
  };

  const processExcelFile = async (file: File) => {
    setExcelParsing(true);
    setExcelFileName(file.name);

    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rawData.length < 2) {
        alert('Файл пуст или содержит только заголовки');
        setExcelParsing(false);
        return;
      }

      // Find header row (first row with multiple non-empty text cells)
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        const row = rawData[i];
        const textCells = row.filter((c: any) => typeof c === 'string' && c.trim().length > 1);
        if (textCells.length >= 2) {
          headerRowIdx = i;
          break;
        }
      }

      const headers = rawData[headerRowIdx].map((h: any) => String(h || '').trim());
      const columnMap = detectColumns(headers);

      if (columnMap.name === undefined) {
        alert('Не удалось определить колонку с наименованием товара. Проверьте заголовки в файле.');
        setExcelParsing(false);
        return;
      }

      const dataRows = rawData.slice(headerRowIdx + 1).filter(
        (row: any[]) => row.some((cell: any) => cell !== '' && cell !== null && cell !== undefined)
      );

      const matched: ExcelMatchedRow[] = dataRows.map((row: any[], rowIdx: number) => {
        const excelName = String(row[columnMap.name] || '').trim();
        const excelBarcode = columnMap.barcode !== undefined ? String(row[columnMap.barcode] || '').trim() : '';
        const excelQty = columnMap.quantity !== undefined ? Math.max(1, Math.round(Number(row[columnMap.quantity]) || 0)) : 1;
        const excelPrice = columnMap.price !== undefined ? Number(row[columnMap.price]) || 0 : 0;

        if (!excelName && !excelBarcode) {
          return null;
        }

        // Try matching: barcode first, then name
        let matchedProduct: Product | null = null;
        let matchConfidence = 0;
        let matchMethod: 'barcode' | 'name' | 'none' = 'none';

        const barcodeMatch = matchProductByBarcode(excelBarcode);
        if (barcodeMatch) {
          matchedProduct = barcodeMatch;
          matchConfidence = 100;
          matchMethod = 'barcode';
        } else {
          const nameMatch = matchProductByName(excelName);
          if (nameMatch.product && nameMatch.confidence >= 50) {
            matchedProduct = nameMatch.product;
            matchConfidence = nameMatch.confidence;
            matchMethod = 'name';
          }
        }

        const priceChanged = matchedProduct && excelPrice > 0 && Math.abs(excelPrice - Number(matchedProduct.price)) > 1;

        return {
          rowIndex: rowIdx,
          excelName,
          excelBarcode,
          excelQty: excelQty || 1,
          excelPrice,
          matchedProduct,
          matchConfidence,
          matchMethod,
          priceChanged: !!priceChanged,
          oldPrice: matchedProduct ? Number(matchedProduct.price) : 0,
          included: matchedProduct !== null,
        };
      }).filter(Boolean) as ExcelMatchedRow[];

      setExcelRows(matched);
    } catch (err: any) {
      console.error('Ошибка парсинга Excel:', err);
      alert('Ошибка чтения файла: ' + (err?.message || 'Неизвестный формат'));
    } finally {
      setExcelParsing(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processExcelFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processExcelFile(file);
    if (e.target) e.target.value = '';
  };

  const toggleExcelRow = (rowIdx: number) => {
    setExcelRows(prev => prev.map(r => r.rowIndex === rowIdx ? { ...r, included: !r.included } : r));
  };

  const applyExcelToItems = () => {
    const included = excelRows.filter(r => r.included && r.matchedProduct);
    const newItems: DocItem[] = included.map(r => ({
      product_id: String(r.matchedProduct!.id),
      product_name: r.matchedProduct!.name,
      quantity: r.excelQty,
      price: r.excelPrice > 0 ? r.excelPrice : Number(r.matchedProduct!.price) || 0,
      total: r.excelQty * (r.excelPrice > 0 ? r.excelPrice : Number(r.matchedProduct!.price) || 0),
    }));
    setItems(prev => [...prev, ...newItems]);
    setExcelRows([]);
    setExcelMode(false);
    setExcelFileName('');
  };

  // ==================== EXCEL PREVIEW UI ====================

  if (excelRows.length > 0) {
    const matched = excelRows.filter(r => r.matchedProduct !== null);
    const unmatched = excelRows.filter(r => r.matchedProduct === null);
    const priceChanged = excelRows.filter(r => r.priceChanged);
    const includedCount = excelRows.filter(r => r.included).length;

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">📥 Предпросмотр импорта</h3>
            <p className="text-xs text-slate-400 mt-0.5">Файл: {excelFileName} · {excelRows.length} строк</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setExcelRows([]); setExcelFileName(''); }} className="px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors">
              <X size={16} className="inline mr-1" /> Отмена
            </button>
            <button
              onClick={applyExcelToItems}
              disabled={includedCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <CheckCircle size={16} /> Добавить {includedCount} позиций
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Сопоставлено</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{matched.length}</p>
            <p className="text-[10px] text-emerald-500">готово к оприходованию</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Цена изменилась</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{priceChanged.length}</p>
            <p className="text-[10px] text-amber-500">закупочная цена отличается</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 border border-red-100">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">Не найдено</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{unmatched.length}</p>
            <p className="text-[10px] text-red-400">нет в справочнике</p>
          </div>
        </div>

        {/* Matched rows table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-3 py-2 w-10">
                  <input
                    type="checkbox"
                    checked={excelRows.filter(r => r.matchedProduct).every(r => r.included)}
                    onChange={() => {
                      const allIncluded = excelRows.filter(r => r.matchedProduct).every(r => r.included);
                      setExcelRows(prev => prev.map(r => r.matchedProduct ? { ...r, included: !allIncluded } : r));
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-2">Из Excel</th>
                <th className="px-3 py-2">→ Товар в базе</th>
                <th className="px-3 py-2 text-center w-16">Кол-во</th>
                <th className="px-3 py-2 text-right w-24">Цена Excel</th>
                <th className="px-3 py-2 text-right w-24">Цена в базе</th>
                <th className="px-3 py-2 w-24">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {excelRows.map(row => {
                let statusBadge: React.ReactNode;
                if (!row.matchedProduct) {
                  statusBadge = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600"><XCircle size={12} /> Не найден</span>;
                } else if (row.priceChanged) {
                  statusBadge = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600"><AlertTriangle size={12} /> Цена ≠</span>;
                } else if (row.matchMethod === 'barcode') {
                  statusBadge = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600"><CheckCircle size={12} /> Штрихкод</span>;
                } else {
                  statusBadge = <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600"><Search size={12} /> {row.matchConfidence}%</span>;
                }

                return (
                  <tr key={row.rowIndex} className={`transition-colors ${!row.matchedProduct ? 'bg-red-50/30' : row.included ? 'hover:bg-slate-50/50' : 'opacity-40'}`}>
                    <td className="px-3 py-2">
                      {row.matchedProduct && (
                        <input
                          type="checkbox"
                          checked={row.included}
                          onChange={() => toggleExcelRow(row.rowIndex)}
                          className="rounded"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-slate-700 text-xs">{row.excelName}</p>
                      {row.excelBarcode && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.excelBarcode}</p>}
                    </td>
                    <td className="px-3 py-2">
                      {row.matchedProduct ? (
                        <p className="text-slate-800 font-medium text-xs">{row.matchedProduct.name}</p>
                      ) : (
                        <p className="text-red-400 text-xs italic">Товар не найден в справочнике</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold">{row.excelQty}</td>
                    <td className="px-3 py-2 text-right">
                      {row.excelPrice > 0 ? (
                        <span className={row.priceChanged ? 'text-amber-600 font-semibold' : 'text-slate-600'}>{formatMoney(row.excelPrice)}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {row.matchedProduct ? formatMoney(row.oldPrice) : '—'}
                    </td>
                    <td className="px-3 py-2">{statusBadge}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Document type selector */}
      <div>
        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-2">Тип документа</label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {(Object.entries(DOC_TYPE_MAP) as [DocType, typeof DOC_TYPE_MAP.receipt][]).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setDocType(key)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                docType === key 
                  ? `bg-${val.color}-50 border-${val.color}-200 text-${val.color}-700 shadow-sm` 
                  : 'border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              {val.icon} {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier (only for receipts and returns) */}
      {(docType === 'receipt' || docType === 'return') && (
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-2">Поставщик</label>
          <select
            value={supplierId}
            onChange={e => setSupplierId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">Выберите поставщика...</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.inn ? ` (ИНН: ${s.inn})` : ''}</option>
            ))}
          </select>
        </div>
      )}

      {/* Excel Import or Manual toggle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Добавить товары</label>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setExcelMode(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!excelMode ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Search size={12} className="inline mr-1" /> Вручную
            </button>
            <button
              onClick={() => setExcelMode(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${excelMode ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <FileSpreadsheet size={12} className="inline mr-1" /> Из Excel
            </button>
          </div>
        </div>

        {excelMode ? (
          /* Excel Drag & Drop zone */
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragOver 
                ? 'border-blue-400 bg-blue-50/50 scale-[1.01]' 
                : 'border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {excelParsing ? (
              <div className="space-y-3">
                <div className="w-10 h-10 border-3 border-slate-300 border-t-blue-500 rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-500 font-medium">Анализ файла {excelFileName}...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
                  <FileSpreadsheet size={28} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Перетащите файл Excel сюда</p>
                  <p className="text-xs text-slate-400 mt-1">или нажмите для выбора · .xlsx, .xls, .csv</p>
                </div>
                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 mt-3">
                  <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-400" /> Авто-определение колонок</span>
                  <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-400" /> Сопоставление по штрихкоду</span>
                  <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-400" /> Контроль цен</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Manual product search */
          <div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию или штрихкоду..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
        {search && (
          <div className="mt-2 max-h-48 overflow-y-auto border border-slate-100 rounded-xl bg-white shadow-lg">
            {filteredProducts.slice(0, 20).map(p => (
              <button
                key={p.id}
                onClick={() => addItem(p)}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors"
              >
                <span className="text-slate-700">{p.name}</span>
                <span className="text-xs text-slate-400 flex items-center gap-2">
                  {p.barcode && <span className="font-mono">{p.barcode}</span>}
                  <span className="font-semibold text-slate-600">{formatMoney(Number(p.price))} смн</span>
                </span>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">Ничего не найдено</p>
            )}
          </div>
        )}
          </div>
        )}
      </div>

      {/* Items table */}
      {items.length > 0 && (
        <div>
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-2">
            Позиции документа ({items.length})
          </label>
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-4 py-2">№</th>
                  <th className="px-4 py-2">Наименование</th>
                  <th className="px-4 py-2 text-center w-24">Кол-во</th>
                  <th className="px-4 py-2 text-right w-32">Цена</th>
                  <th className="px-4 py-2 text-right w-32">Сумма</th>
                  <th className="px-4 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2 text-slate-700 font-medium">{item.product_name}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => updateItemField(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={e => updateItemField(idx, 'price', Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full text-right border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-800">
                      {formatMoney(item.total)}
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => removeItem(idx)} className="p-1 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={4} className="px-4 py-3 text-right text-slate-600">ИТОГО:</td>
                  <td className="px-4 py-3 text-right text-lg text-slate-800">{formatMoney(totalAmount)} смн</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-2">Примечание</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Необязательно..."
          rows={2}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
        />
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || items.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Save size={16} /> {saving ? 'Сохранение...' : 'Сохранить черновик'}
        </button>
        <span className="text-xs text-slate-400">
          После сохранения можно провести или распечатать документ
        </span>
      </div>
    </div>
  );
};

// ==================== SUPPLIERS TAB ====================

const SuppliersTab = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminDbQuery({
        action: 'select',
        table: 'suppliers',
        data: { columns: '*', order: 'name.asc' }
      });
      setSuppliers(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки поставщиков:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const saveSupplier = async () => {
    if (!editingSupplier?.name) { alert('Укажите название поставщика'); return; }
    setSaving(true);
    try {
      if (editingSupplier.id) {
        await adminDbQuery({
          action: 'update',
          table: 'suppliers',
          id: editingSupplier.id,
          data: editingSupplier
        });
      } else {
        await adminDbQuery({
          action: 'insert',
          table: 'suppliers',
          data: { ...editingSupplier, is_active: true }
        });
      }
      setEditingSupplier(null);
      loadSuppliers();
    } catch (err) {
      alert('Ошибка сохранения поставщика');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (supplier: Supplier) => {
    try {
      await adminDbQuery({
        action: 'update',
        table: 'suppliers',
        id: supplier.id,
        data: { is_active: !supplier.is_active }
      });
      loadSuppliers();
    } catch (err) {
      alert('Ошибка обновления статуса');
    }
  };

  // Edit form modal
  if (editingSupplier !== null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {editingSupplier.id ? 'Редактирование поставщика' : 'Новый поставщик'}
          </h3>
          <button onClick={() => setEditingSupplier(null)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'name', label: 'Название *', placeholder: 'ООО Фармацевтика' },
            { key: 'legal_name', label: 'Юрид. наименование', placeholder: 'ООО «Фармацевтика»' },
            { key: 'inn', label: 'ИНН', placeholder: '7712345678' },
            { key: 'phone', label: 'Телефон', placeholder: '+992 900 123456' },
            { key: 'email', label: 'Email', placeholder: 'info@pharma.tj' },
            { key: 'contact_person', label: 'Контактное лицо', placeholder: 'Иванов И.И.' },
            { key: 'address', label: 'Адрес', placeholder: 'г. Душанбе, ул. Рудаки, 10' },
            { key: 'payment_terms', label: 'Условия оплаты', placeholder: 'Предоплата 100%' },
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs text-slate-400 font-semibold block mb-1">{field.label}</label>
              <input
                type="text"
                value={(editingSupplier as any)[field.key] || ''}
                onChange={e => setEditingSupplier({ ...editingSupplier, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs text-slate-400 font-semibold block mb-1">Заметки</label>
          <textarea
            value={editingSupplier.notes || ''}
            onChange={e => setEditingSupplier({ ...editingSupplier, notes: e.target.value })}
            placeholder="Дополнительная информация..."
            rows={2}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
          />
        </div>

        <button
          onClick={saveSupplier}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <Save size={16} /> {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Справочник поставщиков</h3>
        <button
          onClick={() => setEditingSupplier({})}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <Plus size={16} /> Добавить
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Загрузка...</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-20">
          <Building2 size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400">Нет поставщиков</p>
          <p className="text-xs text-slate-300 mt-1">Добавьте первого поставщика</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suppliers.map(s => (
            <div key={s.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${s.is_active ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
              <div>
                <p className="font-semibold text-slate-700">{s.name}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  {s.inn && <span>ИНН: {s.inn}</span>}
                  {s.phone && <span>📞 {s.phone}</span>}
                  {s.contact_person && <span>👤 {s.contact_person}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditingSupplier(s)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => toggleActive(s)}
                  className={`p-2 rounded-lg transition-colors ${s.is_active ? 'hover:bg-red-50 text-red-400' : 'hover:bg-emerald-50 text-emerald-400'}`}
                  title={s.is_active ? 'Деактивировать' : 'Активировать'}
                >
                  {s.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== LABELS TAB ====================

const LabelsTab = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [labelSize, setLabelSize] = useState<'58mm' | '40x30mm'>('58mm');
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await adminDbQuery({
        action: 'select',
        table: 'products',
        data: { columns: 'id,name,price,barcode,retail_price', order: 'name.asc' }
      });
      setProducts(res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки товаров:', err);
    }
  };

  const toggleProduct = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === filteredProducts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredProducts.map(p => String(p.id))));
    }
  };

  const filteredProducts = products.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q));
  });

  const selectedProducts = products.filter(p => selected.has(String(p.id)));

  const handlePrint = () => {
    if (selectedProducts.length === 0) { alert('Выберите товары для печати'); return; }
    setPrinting(true);
  };

  if (printing) {
    return (
      <BarcodeLabelsView 
        products={selectedProducts.map(p => ({
          name: p.name,
          barcode: p.barcode,
          price: Number(p.retail_price || p.price) || 0,
        }))}
        labelSize={labelSize}
        onClose={() => setPrinting(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-bold text-slate-800">Печать этикеток</h3>
        <div className="flex items-center gap-3">
          <select
            value={labelSize}
            onChange={e => setLabelSize(e.target.value as '58mm' | '40x30mm')}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="58mm">Лента 58мм</option>
            <option value="40x30mm">Стикеры 40×30мм</option>
          </select>
          <button
            onClick={handlePrint}
            disabled={selected.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <Printer size={16} /> Печать ({selected.size})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию или штрихкоду..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>

      {/* Select all */}
      <button onClick={selectAll} className="text-xs text-blue-500 hover:underline">
        {selected.size === filteredProducts.length ? 'Снять все' : 'Выбрать все'}
      </button>

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
        {filteredProducts.map(p => {
          const isSelected = selected.has(String(p.id));
          return (
            <button
              key={p.id}
              onClick={() => toggleProduct(String(p.id))}
              className={`text-left p-3 rounded-xl border text-sm transition-all ${
                isSelected 
                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' 
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                }`}>
                  {isSelected && <CheckCircle size={12} className="text-white" />}
                </div>
                <div className="min-w-0">
                  <p className="text-slate-700 font-medium truncate">{p.name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    {p.barcode && <span className="font-mono">{p.barcode}</span>}
                    <span className="font-semibold text-slate-600">{formatMoney(Number(p.price))} смн</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ==================== BARCODE LABELS PRINT VIEW ====================

const BarcodeLabelsView: React.FC<{
  products: { name: string; barcode?: string; price: number }[];
  labelSize: '58mm' | '40x30mm';
  onClose: () => void;
}> = ({ products, labelSize, onClose }) => {
  const barcodeRefs = React.useRef<Map<number, SVGSVGElement>>(new Map());

  useEffect(() => {
    // Dynamically import JsBarcode and render barcodes
    import('jsbarcode').then(({ default: JsBarcode }) => {
      products.forEach((p, idx) => {
        const svg = barcodeRefs.current.get(idx);
        if (svg && p.barcode) {
          try {
            JsBarcode(svg, p.barcode, {
              format: 'CODE128',
              width: labelSize === '58mm' ? 1.5 : 1,
              height: labelSize === '58mm' ? 40 : 25,
              displayValue: true,
              fontSize: labelSize === '58mm' ? 12 : 8,
              margin: 2,
              textMargin: 2,
            });
          } catch (e) {
            console.error('Barcode error:', e);
          }
        }
      });
    }).catch(err => console.error('JsBarcode import error:', err));
  }, [products, labelSize]);

  return (
    <div>
      {/* Toolbar — hidden on print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <h3 className="text-lg font-bold text-slate-800">Этикетки ({products.length} шт.)</h3>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <Printer size={16} /> Печать
        </button>
      </div>

      {/* Labels grid */}
      <div className={`${labelSize === '40x30mm' ? 'grid grid-cols-3 gap-1' : 'flex flex-col gap-1'}`}>
        {products.map((p, idx) => (
          <div
            key={idx}
            className="border border-slate-200 bg-white p-2 text-center"
            style={{
              width: labelSize === '58mm' ? '58mm' : '40mm',
              minHeight: labelSize === '58mm' ? 'auto' : '30mm',
              pageBreakInside: 'avoid',
            }}
          >
            <p className="text-[10px] leading-tight font-medium text-slate-800 line-clamp-2 mb-1">{p.name}</p>
            {p.barcode ? (
              <svg ref={el => { if (el) barcodeRefs.current.set(idx, el); }} />
            ) : (
              <p className="text-[8px] text-slate-400 italic my-2">Нет штрихкода</p>
            )}
            <p className="text-sm font-bold text-slate-900 mt-1">{formatMoney(p.price)} смн</p>
          </div>
        ))}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          #__next { visibility: visible; }
          @page {
            margin: 2mm;
            size: ${labelSize === '58mm' ? '58mm auto' : 'A4'};
          }
        }
      `}</style>
    </div>
  );
};

// ==================== PRINTABLE DOCUMENT ====================

const PrintableDocument: React.FC<{
  doc: WarehouseDocument;
  type: 'receipt' | 'invoice' | 'writeoff';
  onClose: () => void;
}> = ({ doc, type, onClose }) => {
  const formatFullDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) + ' г.';
  };

  const companyName = 'ТОЖ Витамин';

  return (
    <div>
      {/* Toolbar — hidden on print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <h3 className="text-lg font-bold text-slate-800">Предпросмотр документа</h3>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          <Printer size={16} /> Печать
        </button>
      </div>

      {/* Document — the printable area */}
      <div id="printable-doc" className="bg-white p-8 border border-slate-200 rounded-xl max-w-[210mm] mx-auto" style={{ fontFamily: 'serif' }}>
        {/* Header */}
        <div className="text-center mb-6">
          {type === 'receipt' && (
            <h1 className="text-xl font-bold uppercase tracking-wide">Товарная накладная №{doc.doc_number}</h1>
          )}
          {type === 'invoice' && (
            <h1 className="text-xl font-bold uppercase tracking-wide">Счёт на оплату №{doc.doc_number}</h1>
          )}
          {type === 'writeoff' && (
            <h1 className="text-xl font-bold uppercase tracking-wide">Акт списания товаров №{doc.doc_number}</h1>
          )}
          <p className="text-sm text-gray-600 mt-1">от {formatFullDate(doc.created_at)}</p>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          {type === 'receipt' && doc.supplier && (
            <>
              <div className="border-b border-gray-200 pb-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Поставщик</p>
                <p className="font-semibold">{doc.supplier.name}</p>
                {doc.supplier.legal_name && <p className="text-gray-600">{doc.supplier.legal_name}</p>}
                {doc.supplier.inn && <p className="text-gray-500">ИНН: {doc.supplier.inn}</p>}
                {doc.supplier.address && <p className="text-gray-500">{doc.supplier.address}</p>}
              </div>
              <div className="border-b border-gray-200 pb-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Получатель</p>
                <p className="font-semibold">{companyName}</p>
              </div>
            </>
          )}
          {type === 'invoice' && (
            <>
              <div className="border-b border-gray-200 pb-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Продавец</p>
                <p className="font-semibold">{companyName}</p>
              </div>
              <div className="border-b border-gray-200 pb-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Покупатель</p>
                {doc.supplier ? (
                  <>
                    <p className="font-semibold">{doc.supplier.name}</p>
                    {doc.supplier.inn && <p className="text-gray-500">ИНН: {doc.supplier.inn}</p>}
                  </>
                ) : (
                  <p className="text-gray-400">—</p>
                )}
              </div>
            </>
          )}
          {type === 'writeoff' && (
            <div className="col-span-2 border-b border-gray-200 pb-3">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Организация</p>
              <p className="font-semibold">{companyName}</p>
              {doc.notes && (
                <p className="text-gray-600 mt-1">Основание: {doc.notes}</p>
              )}
            </div>
          )}
        </div>

        {/* Items table */}
        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left py-2 px-2 w-10">№</th>
              <th className="text-left py-2 px-2">Наименование</th>
              <th className="text-center py-2 px-2 w-16">Ед.изм.</th>
              <th className="text-right py-2 px-2 w-20">Кол-во</th>
              <th className="text-right py-2 px-2 w-24">Цена (TJS)</th>
              <th className="text-right py-2 px-2 w-28">Сумма (TJS)</th>
            </tr>
          </thead>
          <tbody>
            {doc.items?.map((item, idx) => (
              <tr key={item.id || idx} className="border-b border-gray-200">
                <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                <td className="py-2 px-2">{item.product_name}</td>
                <td className="py-2 px-2 text-center text-gray-500">шт</td>
                <td className="py-2 px-2 text-right">{item.quantity}</td>
                <td className="py-2 px-2 text-right">{formatMoney(item.price)}</td>
                <td className="py-2 px-2 text-right font-semibold">{formatMoney(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-800">
              <td colSpan={5} className="py-3 px-2 text-right font-bold text-base">ИТОГО:</td>
              <td className="py-3 px-2 text-right font-bold text-base">{formatMoney(doc.total_amount)} TJS</td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-2 gap-12 text-sm">
          {type === 'receipt' && (
            <>
              <div>
                <p className="text-gray-500 mb-8">Отпустил:</p>
                <div className="border-b border-gray-400 mb-1"></div>
                <p className="text-xs text-gray-400">(подпись / расшифровка)</p>
              </div>
              <div>
                <p className="text-gray-500 mb-8">Принял:</p>
                <div className="border-b border-gray-400 mb-1"></div>
                <p className="text-xs text-gray-400">(подпись / расшифровка)</p>
              </div>
            </>
          )}
          {type === 'invoice' && (
            <>
              <div>
                <p className="text-gray-500 mb-8">Руководитель:</p>
                <div className="border-b border-gray-400 mb-1"></div>
                <p className="text-xs text-gray-400">(подпись / расшифровка)</p>
              </div>
              <div>
                <p className="text-gray-500 mb-8">Бухгалтер:</p>
                <div className="border-b border-gray-400 mb-1"></div>
                <p className="text-xs text-gray-400">(подпись / расшифровка)</p>
              </div>
            </>
          )}
          {type === 'writeoff' && (
            <>
              <div>
                <p className="text-gray-500 mb-8">Председатель комиссии:</p>
                <div className="border-b border-gray-400 mb-1"></div>
                <p className="text-xs text-gray-400">(подпись / расшифровка)</p>
              </div>
              <div>
                <p className="text-gray-500 mb-8">Члены комиссии:</p>
                <div className="border-b border-gray-400 mb-1"></div>
                <p className="text-xs text-gray-400">(подпись / расшифровка)</p>
                <div className="border-b border-gray-400 mt-8 mb-1"></div>
                <p className="text-xs text-gray-400">(подпись / расшифровка)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          #printable-doc, #printable-doc * { visibility: visible; }
          #printable-doc { 
            position: absolute; left: 0; top: 0; 
            width: 100%; border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 10mm !important;
          }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>
    </div>
  );
};
