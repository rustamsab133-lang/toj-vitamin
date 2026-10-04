"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { adminDbQuery } from '@/lib/admin-api';
import { Pharmacy, PharmacyOrder } from '@/lib/types';
import { 
  ChevronLeft, Building2, TrendingUp, BarChart3, Search, 
  UserPlus, Phone, Calendar, ClipboardList, Trash2, X, Plus, Minus,
  Edit, Copy, Check, ShoppingCart, Clock, ShieldAlert, Award, Package, RefreshCw,
  MessageSquare, MapPin, User, ExternalLink, Filter, Printer, Edit3, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import B2BInvoiceTemplate, { B2BInvoiceProps } from './print/B2BInvoiceTemplate';
import { numberToWordsRu } from '@/lib/numberToWords';

type SubTab = 'dashboard' | 'pharmacies' | 'new-order' | 'prices';

interface PharmacyOrdersDashboardProps {
  onBack: () => void;
}

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; next?: string }> = {
  new: { label: 'Новый (B2B)', color: 'bg-blue-50 text-blue-600', next: 'confirmed' },
  confirmed: { label: 'Подтвержден', color: 'bg-indigo-50 text-indigo-600', next: 'assembled' },
  assembled: { label: 'Собран', color: 'bg-amber-50 text-amber-600', next: 'shipped' },
  shipped: { label: 'Отправлен', color: 'bg-sky-50 text-sky-600', next: 'delivered' },
  delivered: { label: 'Доставлен', color: 'bg-emerald-50 text-emerald-600' },
  cancelled: { label: 'Отменен', color: 'bg-rose-50 text-rose-500' }
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string; next?: string }> = {
  unpaid: { label: 'Не оплачен', color: 'bg-red-50 text-red-600', next: 'paid' },
  partial: { label: 'Частично', color: 'bg-orange-50 text-orange-600', next: 'paid' },
  paid: { label: 'Оплачен', color: 'bg-emerald-50 text-emerald-600' }
};

export const PharmacyOrdersDashboard: React.FC<PharmacyOrdersDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<SubTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data lists
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Analytics
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalDebt: 0,
    activePharmacies: 0,
    newOrdersCount: 0
  });

  // Registry form/modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [pharmacyForm, setPharmacyForm] = useState({
    name: '',
    phone: '',
    address: '',
    contact_person: '',
    discount_percent: 0,
    credit_limit: 0
  });

  // Manual Order states
  const [selectedPharmacyForOrder, setSelectedPharmacyForOrder] = useState<string>('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderCart, setOrderCart] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState('');
  const [orderDeliveryDate, setOrderDeliveryDate] = useState('');
  const [isSubmittingManualOrder, setIsSubmittingManualOrder] = useState(false);

  // B2B Pricing states
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [priceEdits, setPriceEdits] = useState<Record<string, number>>({});
  const [savingProductIds, setSavingProductIds] = useState<Record<string, boolean>>({});
  const [savedProductIds, setSavedProductIds] = useState<Record<string, boolean>>({});
  const [markupSettings, setMarkupSettings] = useState({ percent: 0, flat: 0 });

  // Price adjustment helper states for modal (Discount vs Markup)
  const [adjustmentType, setAdjustmentType] = useState<'discount' | 'markup'>('discount');
  const [adjustmentVal, setAdjustmentVal] = useState<number>(0);

  // General utility states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [copiedPhoneOrder, setCopiedPhoneOrder] = useState<string | null>(null);

  // Orders tab filter & search
  const [ordersFilterQuery, setOrdersFilterQuery] = useState('');
  const [ordersFilterStatus, setOrdersFilterStatus] = useState<string>('all');

  // Order Correction & Invoice Print States
  const [isOrderEditorOpen, setIsOrderEditorOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PharmacyOrder | null>(null);
  const [editingItems, setEditingItems] = useState<Array<{
    product_id: string;
    name: string;
    quantity: number;
    price: number;
    base_price: number;
  }>>([]);
  const [editingDiscountPercent, setEditingDiscountPercent] = useState<number>(0);
  const [saveDiscountAsPharmacyDefault, setSaveDiscountAsPharmacyDefault] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingDeliveryDate, setEditingDeliveryDate] = useState('');
  const [orderProductSearch, setOrderProductSearch] = useState('');
  const [isSavingOrderEdits, setIsSavingOrderEdits] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<B2BInvoiceProps | null>(null);

  // Computed values with guaranteed zero-drift arithmetic
  const editorSubtotal = useMemo(() => {
    return Math.round(
      editingItems.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0) * 100
    ) / 100;
  }, [editingItems]);

  const editorDiscountAmount = useMemo(() => {
    if (editingDiscountPercent <= 0) return 0;
    return Math.round(((editorSubtotal * editingDiscountPercent) / 100) * 100) / 100;
  }, [editorSubtotal, editingDiscountPercent]);

  const editorFinalTotal = useMemo(() => {
    return Math.max(0, Math.round((editorSubtotal - editorDiscountAmount) * 100) / 100);
  }, [editorSubtotal, editorDiscountAmount]);

  const filteredAvailableProducts = useMemo(() => {
    if (!orderProductSearch.trim()) return [];
    const q = orderProductSearch.toLowerCase().trim();
    return products
      .filter((p: any) => p.name.toLowerCase().includes(q) || String(p.id).includes(q))
      .slice(0, 6);
  }, [products, orderProductSearch]);

  // Fast map lookup for pharmacies
  const pharmacyMap = useMemo(() => {
    const map = new Map<string, Pharmacy>();
    pharmacies.forEach(p => map.set(p.id, p));
    return map;
  }, [pharmacies]);

  // Robust resolver for order pharmacy information
  const getOrderPharmacy = (order: PharmacyOrder): Partial<Pharmacy> => {
    const joined = Array.isArray(order.pharmacies) ? order.pharmacies[0] : order.pharmacies;
    const fromMap = order.pharmacy_id ? pharmacyMap.get(order.pharmacy_id) : undefined;
    return {
      ...joined,
      ...fromMap,
      name: fromMap?.name || joined?.name || 'Удаленная аптека',
      phone: fromMap?.phone || joined?.phone || '',
      address: fromMap?.address || joined?.address || '',
      contact_person: fromMap?.contact_person || joined?.contact_person || '',
      status: fromMap?.status || joined?.status || 'lead',
      discount_percent: fromMap?.discount_percent ?? joined?.discount_percent ?? 0
    };
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Status filter
      if (ordersFilterStatus !== 'all') {
        if (ordersFilterStatus === 'unpaid' && order.payment_status !== 'unpaid') return false;
        if (ordersFilterStatus === 'paid' && order.payment_status !== 'paid') return false;
        if (['new', 'confirmed', 'assembled', 'shipped', 'delivered', 'cancelled'].includes(ordersFilterStatus)) {
          if (order.order_status !== ordersFilterStatus) return false;
        }
      }

      // 2. Search query filter
      if (ordersFilterQuery.trim()) {
        const q = ordersFilterQuery.toLowerCase().trim();
        const ph = getOrderPharmacy(order);
        const orderIdMatch = order.id.toLowerCase().includes(q);
        const nameMatch = (ph.name || '').toLowerCase().includes(q);
        const phoneMatch = (ph.phone || '').replace(/[\s\-\(\)\+]/g, '').includes(q.replace(/[\s\-\(\)\+]/g, ''));
        const notesMatch = (order.notes || '').toLowerCase().includes(q);
        if (!orderIdMatch && !nameMatch && !phoneMatch && !notesMatch) return false;
      }

      return true;
    });
  }, [orders, ordersFilterQuery, ordersFilterStatus, pharmacyMap]);

  // Lock body scroll when pharmacy modal, order editor or invoice print is open
  useEffect(() => {
    if (isModalOpen || isOrderEditorOpen || !!printInvoiceData) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen, isOrderEditorOpen, printInvoiceData]);

  useEffect(() => {
    loadAllData(true);
    // Background polling every 15 seconds to catch new pharmacy orders live
    const pollInterval = setInterval(() => {
      loadAllData(false);
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [activeTab]);

  const loadAllData = async (showSpinner = true) => {
    if (showSpinner) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      // 1. Fetch Pharmacies
      const { data: pharmData } = await adminDbQuery({
        action: 'select',
        table: 'pharmacies',
        data: { order: { column: 'name', ascending: true } }
      });
      if (pharmData) setPharmacies(pharmData);

      // 2. Fetch Orders with pharmacy relation (including phone, address, contact_person)
      const { data: ordData } = await adminDbQuery({
        action: 'select',
        table: 'pharmacy_orders',
        data: { 
          columns: '*,pharmacies:pharmacies(id,name,discount_percent,phone,address,contact_person,status)',
          order: { column: 'created_at', ascending: false } 
        }
      });
      if (ordData) setOrders(ordData);

      // 3. Fetch site markup settings
      const { data: settingsData } = await adminDbQuery({
        action: 'select',
        table: 'site_settings',
      });
      const percentSetting = settingsData?.find((s: any) => s.key === 'price_markup_percent');
      const flatSetting = settingsData?.find((s: any) => s.key === 'price_markup_flat');
      const newMarkupSettings = {
        percent: parseFloat(percentSetting?.value || '0') || 0,
        flat: parseFloat(flatSetting?.value || '0') || 0
      };
      setMarkupSettings(newMarkupSettings);

      const retailOnlySetting = settingsData?.find((s: any) => s.key === 'retail_only_product_ids');
      let retailOnlyIds: string[] = [];
      if (retailOnlySetting?.value) {
        try {
          const parsed = JSON.parse(retailOnlySetting.value);
          if (Array.isArray(parsed)) retailOnlyIds = parsed.map(String);
        } catch (e) {}
      }

      // 4. Fetch Products (исключаем товары «Только для розницы» из оптовых заказов)
      const { data: prodData } = await adminDbQuery({
        action: 'select',
        table: 'products',
        data: { order: { column: 'name', ascending: true } }
      });
      if (prodData) {
        const wholesaleProds = prodData.filter((p: any) => !retailOnlyIds.includes(String(p.id)));
        // Apply retail markup
        const markedUp = wholesaleProds.map((p: any) => {
          let retail = Number(p.price) || 0;
          if (newMarkupSettings.percent > 0) retail = retail * (1 + newMarkupSettings.percent / 100);
          retail = retail + newMarkupSettings.flat;
          return {
            ...p,
            retail_price: Math.round(retail)
          };
        });
        setProducts(markedUp);
      }

      // Calculate stats (filter out leads from active pharmacy stats)
      if (pharmData && ordData) {
        const activePharmList = pharmData.filter((p: any) => p.status !== 'lead');
        const totalRevenue = ordData
          .filter((o: any) => o.order_status !== 'cancelled')
          .reduce((acc: number, o: any) => acc + Number(o.total_amount || 0), 0);
        const totalDebt = activePharmList.reduce((acc: number, p: any) => acc + Number(p.balance || 0), 0);
        const activeCount = activePharmList.length;
        const newOrdersCount = ordData.filter((o: any) => o.order_status === 'new').length;

        setStats({
          totalRevenue,
          totalDebt,
          activePharmacies: activeCount,
          newOrdersCount
        });
      }

    } catch (err) {
      console.error('B2B dashboard loading error:', err);
    } finally {
      if (showSpinner) setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Copy B2B Link
  const copyB2BLink = (token: string, pharmacyId: string) => {
    if (typeof window === 'undefined') return;
    const link = `${window.location.origin}/b2b/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(pharmacyId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Open Add/Edit Modal
  const openPharmacyModal = (mode: 'create' | 'edit', p?: Pharmacy) => {
    setModalMode(mode);
    if (mode === 'edit' && p) {
      setSelectedPharmacyId(p.id);
      setPharmacyForm({
        name: p.name,
        phone: p.phone || '',
        address: p.address || '',
        contact_person: p.contact_person || '',
        discount_percent: p.discount_percent,
        credit_limit: p.credit_limit
      });
      // Sync markup/discount adjustment fields
      if (p.discount_percent < 0) {
        setAdjustmentType('markup');
        setAdjustmentVal(Math.abs(p.discount_percent));
      } else {
        setAdjustmentType('discount');
        setAdjustmentVal(p.discount_percent);
      }
    } else {
      setSelectedPharmacyId(null);
      setPharmacyForm({
        name: '',
        phone: '',
        address: '',
        contact_person: '',
        discount_percent: 0,
        credit_limit: 0
      });
      setAdjustmentType('discount');
      setAdjustmentVal(0);
    }
    setIsModalOpen(true);
  };

  // Save Pharmacy
  const handleSavePharmacy = async () => {
    if (!pharmacyForm.name.trim()) return alert('Имя аптеки обязательно');
    
    // Calculate signed discount_percent (markup is represented as a negative discount)
    const finalDiscountPercent = adjustmentType === 'markup' ? -adjustmentVal : adjustmentVal;

    try {
      if (modalMode === 'create') {
        await adminDbQuery({
          action: 'insert',
          table: 'pharmacies',
          data: {
            name: pharmacyForm.name.trim(),
            phone: pharmacyForm.phone.trim(),
            address: pharmacyForm.address.trim(),
            contact_person: pharmacyForm.contact_person.trim(),
            discount_percent: finalDiscountPercent,
            credit_limit: Number(pharmacyForm.credit_limit) || 0,
            balance: 0,
            status: 'active' // Создаваемые вручную сразу активны
          }
        });
      } else if (modalMode === 'edit' && selectedPharmacyId) {
        await adminDbQuery({
          action: 'update',
          table: 'pharmacies',
          id: selectedPharmacyId,
          data: {
            name: pharmacyForm.name.trim(),
            phone: pharmacyForm.phone.trim(),
            address: pharmacyForm.address.trim(),
            contact_person: pharmacyForm.contact_person.trim(),
            discount_percent: finalDiscountPercent,
            credit_limit: Number(pharmacyForm.credit_limit) || 0,
            status: 'active' // При редактировании (или одобрении) переводим в активные
          }
        });
      }
      setIsModalOpen(false);
      loadAllData();
    } catch (e) {
      alert('Ошибка при сохранении: ' + e);
    }
  };

  // Delete Pharmacy
  const handleDeletePharmacy = async (id: string) => {
    if (!confirm('Вы действительно хотите удалить эту аптеку? Связанные заказы могут вызвать ошибку целостности данных.')) return;
    try {
      await adminDbQuery({
        action: 'delete',
        table: 'pharmacies',
        id
      });
      loadAllData();
    } catch (e) {
      alert('Ошибка при удалении: ' + e);
    }
  };

  // Change order status
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await adminDbQuery({
        action: 'update',
        table: 'pharmacy_orders',
        id: orderId,
        data: { order_status: status }
      });
      loadAllData();
    } catch (e) {
      alert('Ошибка обновления статуса: ' + e);
    }
  };

  // Change payment status
  const handleUpdatePaymentStatus = async (order: PharmacyOrder, status: 'unpaid' | 'partial' | 'paid') => {
    try {
      // 1. Update status
      await adminDbQuery({
        action: 'update',
        table: 'pharmacy_orders',
        id: order.id,
        data: { payment_status: status }
      });

      // 2. If transitioning from unpaid/partial to PAID, decrease the pharmacy's balance
      if (status === 'paid' && order.payment_status !== 'paid') {
        const ph = pharmacies.find(p => p.id === order.pharmacy_id);
        if (ph) {
          const newBalance = Math.max(Number(ph.balance || 0) - Number(order.total_amount), 0);
          await adminDbQuery({
            action: 'update',
            table: 'pharmacies',
            id: ph.id,
            data: { balance: newBalance }
          });
        }
      }

      loadAllData();
    } catch (e) {
      alert('Ошибка при изменении оплаты: ' + e);
    }
  };

  // Cancel Order (adjust balance back!)
  const handleCancelOrder = async (order: PharmacyOrder) => {
    if (!confirm('Отменить заказ? При этом сумма заказа спишется с долга аптеки.')) return;
    try {
      // 1. Update order status
      await adminDbQuery({
        action: 'update',
        table: 'pharmacy_orders',
        id: order.id,
        data: { order_status: 'cancelled' }
      });

      // 2. Subtract from pharmacy balance if it wasn't paid yet
      if (order.payment_status !== 'paid') {
        const ph = pharmacies.find(p => p.id === order.pharmacy_id);
        if (ph) {
          const newBalance = Math.max(Number(ph.balance || 0) - Number(order.total_amount), 0);
          await adminDbQuery({
            action: 'update',
            table: 'pharmacies',
            id: ph.id,
            data: { balance: newBalance }
          });
        }
      }

      loadAllData();
    } catch (e) {
      alert('Ошибка отмены заказа: ' + e);
    }
  };

  // Open Order Correction Modal
  const handleOpenOrderEditor = (order: PharmacyOrder) => {
    const ph = getOrderPharmacy(order);
    const orderItems = Array.isArray(order.items) ? order.items : [];
    
    const mappedItems = orderItems.map((it: any) => {
      const catalogProd = products.find(p => String(p.id) === String(it.product_id));
      const basePrice = catalogProd ? Number(catalogProd.price) : Number(it.price);
      return {
        product_id: String(it.product_id || ''),
        name: it.name || catalogProd?.name || 'Товар',
        quantity: Math.max(1, parseInt(it.quantity) || 1),
        price: Number(it.price) || basePrice || 0,
        base_price: basePrice || Number(it.price) || 0
      };
    });

    setEditingOrder(order);
    setEditingItems(mappedItems);
    setEditingDiscountPercent(Number(ph.discount_percent) || 0);
    setSaveDiscountAsPharmacyDefault(false);
    setEditingNotes(order.notes || '');
    setEditingDeliveryDate(order.delivery_date || '');
    setOrderProductSearch('');
    setIsOrderEditorOpen(true);
  };

  // Stepper for quantity in editor
  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setEditingItems(prev => prev.map((item, idx) => idx === index ? { ...item, quantity: newQty } : item));
  };

  // Remove item ("Out of stock" / "Нет в наличии")
  const handleRemoveItemFromOrder = (index: number) => {
    const itemToRemove = editingItems[index];
    if (editingItems.length === 1) {
      if (!confirm(`Вы действительно хотите исключить единственный товар "${itemToRemove?.name || ''}" из заказа?`)) {
        return;
      }
    }
    setEditingItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Add replacement / new product from warehouse
  const handleAddProductToEditor = (prod: any) => {
    const existingIndex = editingItems.findIndex(i => String(i.product_id) === String(prod.id));
    if (existingIndex >= 0) {
      setEditingItems(prev => prev.map((item, idx) => 
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setEditingItems(prev => [
        ...prev,
        {
          product_id: String(prod.id),
          name: prod.name,
          quantity: 1,
          price: Number(prod.price) || 0,
          base_price: Number(prod.price) || 0
        }
      ]);
    }
    setOrderProductSearch('');
  };

  // Save Order Edits (updates order, balance & optionally pharmacy default discount)
  const handleSaveOrderEdits = async (andPrint = false) => {
    if (!editingOrder) return;
    if (editingItems.length === 0) {
      alert('В заказе должен оставаться хотя бы один товар. Если заказ полностью аннулирован, используйте кнопку «Отменить заказ».');
      return;
    }

    setIsSavingOrderEdits(true);
    try {
      const oldTotal = Number(editingOrder.total_amount) || 0;
      const diff = editorFinalTotal - oldTotal;

      const dbItems = editingItems.map(it => ({
        product_id: it.product_id,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        base_price: it.base_price
      }));

      // 1. Update pharmacy_orders
      await adminDbQuery({
        action: 'update',
        table: 'pharmacy_orders',
        id: editingOrder.id,
        data: {
          items: dbItems,
          total_amount: editorFinalTotal,
          notes: editingNotes.trim(),
          delivery_date: editingDeliveryDate || null
        }
      });

      // 2. Adjust debt balance if unpaid
      if (editingOrder.payment_status !== 'paid' && diff !== 0) {
        const ph = pharmacies.find(p => p.id === editingOrder.pharmacy_id);
        if (ph) {
          const newBalance = Math.max(0, Math.round(((Number(ph.balance) || 0) + diff) * 100) / 100);
          await adminDbQuery({
            action: 'update',
            table: 'pharmacies',
            id: ph.id,
            data: { balance: newBalance }
          });
        }
      }

      // 3. Update Pharmacy default discount if requested
      if (saveDiscountAsPharmacyDefault && editingOrder.pharmacy_id) {
        await adminDbQuery({
          action: 'update',
          table: 'pharmacies',
          id: editingOrder.pharmacy_id,
          data: { discount_percent: editingDiscountPercent }
        });
      }

      // 4. If andPrint, trigger print preview
      if (andPrint) {
        const ph = getOrderPharmacy(editingOrder);
        setPrintInvoiceData({
          orderId: editingOrder.id,
          createdAt: editingOrder.created_at || new Date().toISOString(),
          pharmacy: {
            ...ph,
            name: ph.name || 'Оптовый покупатель',
            phone: ph.phone || '',
            address: ph.address || '',
            contact_person: ph.contact_person || '',
            discount_percent: editingDiscountPercent
          },
          items: dbItems,
          subtotal: editorSubtotal,
          discountPercent: editingDiscountPercent,
          discountAmount: editorDiscountAmount,
          finalTotal: editorFinalTotal,
          notes: editingNotes.trim(),
          deliveryDate: editingDeliveryDate || null,
          onClose: () => setPrintInvoiceData(null)
        });
      }

      setIsOrderEditorOpen(false);
      await loadAllData(false);
    } catch (e: any) {
      alert('Ошибка при сохранении изменений заказа: ' + (e.message || e));
    } finally {
      setIsSavingOrderEdits(false);
    }
  };

  // Direct print invoice for existing order without editing
  const handleDirectPrintInvoice = (order: PharmacyOrder) => {
    const ph = getOrderPharmacy(order);
    const orderItems = Array.isArray(order.items) ? order.items : [];
    
    const subtotal = Math.round(
      orderItems.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0) * 100
    ) / 100;
    
    const discountPercent = Number(ph.discount_percent) || 0;
    let discountAmount = 0;
    const finalTotal = Number(order.total_amount) || subtotal;

    if (discountPercent > 0 && subtotal > finalTotal) {
      discountAmount = Math.round((subtotal - finalTotal) * 100) / 100;
    } else if (subtotal > finalTotal) {
      discountAmount = Math.round((subtotal - finalTotal) * 100) / 100;
    }

    setPrintInvoiceData({
      orderId: order.id,
      createdAt: order.created_at || new Date().toISOString(),
      pharmacy: {
        ...ph,
        name: ph.name || 'Оптовый покупатель',
        phone: ph.phone || '',
        address: ph.address || '',
        contact_person: ph.contact_person || '',
        discount_percent: discountPercent
      },
      items: orderItems,
      subtotal: subtotal,
      discountPercent: discountPercent,
      discountAmount: discountAmount,
      finalTotal: finalTotal,
      notes: order.notes || '',
      deliveryDate: order.delivery_date || null,
      onClose: () => setPrintInvoiceData(null)
    });
  };

  // Send corrected order to WhatsApp
  const handleSendUpdatedWa = () => {
    if (!editingOrder) return;
    const ph = getOrderPharmacy(editingOrder);
    const cleanPhone = (ph.phone || '').replace(/[^0-9]/g, '');
    const itemsText = editingItems
      .map((item, idx) => `${idx + 1}. ${item.name} — ${item.quantity} шт. (${Math.round(item.price * item.quantity).toLocaleString()} смн)`)
      .join('\n');
    const discountText = editingDiscountPercent > 0 
      ? `\n🎁 Индивидуальная скидка: ${editingDiscountPercent}% (-${editorDiscountAmount.toLocaleString()} смн)` 
      : '';
    const msg = `Здравствуйте! Ваш оптовый заказ #${editingOrder.id.slice(0, 8).toUpperCase()} для аптеки "${ph.name}" скорректирован по наличию на складе:\n\n${itemsText}${discountText}\n\nИТОГО К ОПЛАТЕ: ${editorFinalTotal.toLocaleString()} смн\n\nТоварная накладная подготовлена. Пожалуйста, подтвердите готовность к доставке.`;
    
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      navigator.clipboard.writeText(msg);
      alert('Текст скопирован в буфер обмена!');
    }
  };

  // Manual Order Management
  const selectedPharmObj = useMemo(() => {
    return pharmacies.find(p => p.id === selectedPharmacyForOrder) || null;
  }, [selectedPharmacyForOrder, pharmacies]);

  const filteredCatalogForOrder = useMemo(() => {
    if (!orderSearchQuery.trim()) return products.slice(0, 10);
    const q = orderSearchQuery.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || p.id.includes(q));
  }, [products, orderSearchQuery]);

  const manualOrderItems = useMemo(() => {
    return Object.entries(orderCart).map(([id, qty]) => {
      const p = products.find(prod => prod.id === id);
      const discount = selectedPharmObj ? selectedPharmObj.discount_percent : 0;
      const baseWholesale = p ? Number(p.price) || 0 : 0;
      const b2bPrice = Math.round(baseWholesale * (1 - discount / 100));

      return p ? { product: p, quantity: qty, b2bPrice } : null;
    }).filter(Boolean) as { product: any; quantity: number; b2bPrice: number }[];
  }, [orderCart, products, selectedPharmObj]);

  const manualOrderTotal = useMemo(() => {
    return manualOrderItems.reduce((acc, item) => acc + item.b2bPrice * item.quantity, 0);
  }, [manualOrderItems]);

  const updateManualCartQty = (productId: string, delta: number) => {
    setOrderCart(prev => {
      const next = (prev[productId] || 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleCreateManualOrder = async () => {
    if (!selectedPharmacyForOrder) return alert('Выберите аптеку');
    if (manualOrderItems.length === 0) return alert('Добавьте товары в заказ');
    setIsSubmittingManualOrder(true);

    try {
      const dbItems = manualOrderItems.map(item => ({
        product_id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.b2bPrice
      }));

      // Insert Order
      const res = await adminDbQuery({
        action: 'insert',
        table: 'pharmacy_orders',
        data: {
          pharmacy_id: selectedPharmacyForOrder,
          items: dbItems,
          total_amount: manualOrderTotal,
          payment_method: 'deferred',
          payment_status: 'unpaid',
          order_status: 'new',
          notes: orderNotes.trim(),
          delivery_date: orderDeliveryDate || null
        }
      });

      // Update Balance
      if (selectedPharmObj) {
        const newBalance = (Number(selectedPharmObj.balance) || 0) + manualOrderTotal;
        await adminDbQuery({
          action: 'update',
          table: 'pharmacies',
          id: selectedPharmacyForOrder,
          data: { balance: newBalance }
        });
      }

      alert('Оптовый заказ успешно создан!');
      setOrderCart({});
      setOrderNotes('');
      setOrderDeliveryDate('');
      setSelectedPharmacyForOrder('');
      setActiveTab('dashboard');
    } catch (e) {
      alert('Ошибка при создании заказа: ' + e);
    } finally {
      setIsSubmittingManualOrder(false);
    }
  };

  // B2B Pricing Handlers & Memos
  const filteredProductsForPrices = useMemo(() => {
    if (!priceSearchQuery.trim()) return products;
    const q = priceSearchQuery.toLowerCase();
    return products.filter((p: any) => 
      p.name.toLowerCase().includes(q) || 
      (p.full_name && p.full_name.toLowerCase().includes(q)) ||
      String(p.id).includes(q)
    );
  }, [products, priceSearchQuery]);

  const handleSaveProductPrice = async (productId: string, newPrice: number) => {
    setSavingProductIds(prev => ({ ...prev, [productId]: true }));
    try {
      await adminDbQuery({
        action: 'update',
        table: 'products',
        id: productId,
        data: { price: newPrice }
      });
      
      // Обновляем локальный стейт товаров
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { 
              ...p, 
              price: newPrice, 
              retail_price: Math.round(newPrice * (1 + markupSettings.percent / 100) + markupSettings.flat) 
            } 
          : p
      ));
      
      // Показываем статус "Сохранено" на время
      setSavedProductIds(prev => ({ ...prev, [productId]: true }));
      setPriceEdits(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      setTimeout(() => {
        setSavedProductIds(prev => ({ ...prev, [productId]: false }));
      }, 2000);
    } catch (e) {
      alert('Ошибка при сохранении цены: ' + e);
    } finally {
      setSavingProductIds(prev => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={20} className="text-slate-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Building2 size={24} className="text-emerald-600" /> Закупки аптек
            </h2>
            <p className="text-xs text-slate-400 font-medium">B2B оптовые закупки, ссылки аптек и аналитика</p>
          </div>
        </div>

        {/* Tab selection & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-slate-100">
            {[
              { id: 'dashboard', label: 'Заказы', icon: <ClipboardList size={16} /> },
              { id: 'pharmacies', label: 'Аптеки', icon: <Building2 size={16} /> },
              { id: 'prices', label: 'Цены B2B', icon: <TrendingUp size={16} /> },
              { id: 'new-order', label: 'Новый заказ', icon: <Plus size={16} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SubTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.icon} <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => loadAllData(false)}
            title="Обновить заказы"
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-emerald-600' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center text-slate-400 text-sm">
          Загрузка модуля закупок B2B...
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: DASHBOARD / ORDERS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Analytics row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-emerald-500 bg-emerald-50 rounded-bl-2xl">
                    <TrendingUp size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Выручка B2B</p>
                  <p className="text-2xl font-extrabold text-slate-800 mt-2">{stats.totalRevenue.toLocaleString()} смн</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-orange-500 bg-orange-50 rounded-bl-2xl">
                    <ShieldAlert size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Долг аптек (Баланс)</p>
                  <p className="text-2xl font-extrabold text-orange-600 mt-2">{stats.totalDebt.toLocaleString()} смн</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-blue-500 bg-blue-50 rounded-bl-2xl">
                    <Building2 size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Всего аптек</p>
                  <p className="text-2xl font-extrabold text-slate-800 mt-2">{stats.activePharmacies} точек</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-indigo-500 bg-indigo-50 rounded-bl-2xl">
                    <Clock size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Новые заявки</p>
                  <p className="text-2xl font-extrabold text-indigo-600 mt-2">{stats.newOrdersCount} шт</p>
                </div>
              </div>

              {/* Orders List */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-slate-800 font-outfit">Лента оптовых заказов</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                    <span>Показано: <strong className="text-slate-700">{filteredOrders.length}</strong> из {orders.length}</span>
                  </div>
                </div>

                {/* Search & Status Filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={ordersFilterQuery}
                      onChange={e => setOrdersFilterQuery(e.target.value)}
                      placeholder="Поиск по телефону (+992...), названию аптеки или ID заказа..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 outline-none focus:border-slate-800 transition-colors placeholder:text-slate-400"
                    />
                    {ordersFilterQuery && (
                      <button 
                        onClick={() => setOrdersFilterQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { id: 'all', label: 'Все' },
                      { id: 'new', label: 'Новые' },
                      { id: 'unpaid', label: 'Не оплачен' },
                      { id: 'confirmed', label: 'Подтвержден' },
                      { id: 'delivered', label: 'Доставлен' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setOrdersFilterStatus(f.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          ordersFilterStatus === f.id
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    {orders.length === 0 ? 'Оптовых заказов от аптек пока не поступало.' : 'Заказов по заданному фильтру не найдено.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map(order => {
                      const statusInfo = ORDER_STATUS_MAP[order.order_status] || ORDER_STATUS_MAP.new;
                      const paymentInfo = PAYMENT_STATUS_MAP[order.payment_status] || PAYMENT_STATUS_MAP.unpaid;
                      const isExpanded = expandedOrderId === order.id;

                      const ph = getOrderPharmacy(order);
                      const formattedPhone = ph.phone || '';
                      const cleanPhone = formattedPhone.replace(/[^0-9]/g, '');

                      const formattedDate = order.created_at 
                        ? new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                        : '';
                      const deliveryDate = order.delivery_date 
                        ? new Date(order.delivery_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) 
                        : 'Не указана';

                      return (
                        <div 
                          key={order.id}
                          className={`border rounded-2xl p-4 transition-all cursor-pointer ${
                            isExpanded ? 'border-slate-800 bg-slate-50/20 shadow-md' : 'border-slate-100 hover:border-slate-200 bg-white'
                          }`}
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          {/* Row Header */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="font-extrabold text-sm text-slate-800">#{order.id.slice(0, 8).toUpperCase()}</span>
                              
                              {/* Pharmacy Name */}
                              <span className="font-bold text-sm text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                <Building2 size={13} className="text-slate-500 shrink-0" />
                                {ph.name || 'Удаленная аптека'}
                              </span>

                              {/* Pharmacy Phone Badge (Direct click to call or WhatsApp) */}
                              {formattedPhone ? (
                                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                  <a
                                    href={`tel:${formattedPhone}`}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                                    title="Позвонить аптеке"
                                  >
                                    <Phone size={12} className="text-emerald-600 shrink-0" />
                                    <span>{formattedPhone}</span>
                                  </a>
                                  <a
                                    href={`https://wa.me/${cleanPhone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#25D366] hover:bg-[#20ba59] px-2 py-1 rounded-lg transition-colors shadow-2xs"
                                    title="Открыть чат WhatsApp"
                                  >
                                    <MessageSquare size={11} className="shrink-0" />
                                    <span>WA</span>
                                  </a>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(formattedPhone);
                                      setCopiedPhoneOrder(order.id);
                                      setTimeout(() => setCopiedPhoneOrder(null), 1500);
                                    }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                    title="Скопировать номер телефона"
                                  >
                                    {copiedPhoneOrder === order.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-lg font-medium">
                                  Номер не указан
                                </span>
                              )}

                              {/* Status Badges */}
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${paymentInfo.color}`}>
                                Оплата: {paymentInfo.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-bold shrink-0">{formattedDate}</span>
                          </div>

                          {/* Row Body */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                            <p className="text-slate-500 truncate max-w-lg">
                              {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                            </p>
                            <span className="font-extrabold text-slate-800 text-sm shrink-0">{order.total_amount.toLocaleString()} смн</span>
                          </div>

                          {/* Quick Address preview in collapsed view */}
                          {ph.address && (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg mt-2 font-medium border border-slate-100/80">
                              <MapPin size={12} className="text-emerald-600 shrink-0" />
                              <span className="truncate">Адрес: <strong>{ph.address}</strong></span>
                              {ph.contact_person && (
                                <span className="text-slate-400 shrink-0">({ph.contact_person})</span>
                              )}
                            </div>
                          )}

                          {/* Quick Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleOpenOrderEditor(order)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-bold transition-all shadow-2xs active:scale-95"
                              title="Скорректировать наличие товаров, количество и скидку"
                            >
                              <Edit3 size={13} className="text-amber-700" />
                              <span>Скорректировать заказ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectPrintInvoice(order)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 text-xs font-bold transition-all shadow-2xs active:scale-95"
                              title="Распечатать официальную товарную накладную"
                            >
                              <Printer size={13} className="text-emerald-700" />
                              <span>Накладная (Печать)</span>
                            </button>
                          </div>

                          {/* Expanded content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-slate-100 space-y-4 cursor-default"
                                onClick={e => e.stopPropagation()}
                              >
                                {/* Pharmacy / Customer Contact Details Card */}
                                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                                        <Building2 size={20} />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="font-extrabold text-slate-900 text-sm sm:text-base">{ph.name || 'Удаленная аптека'}</p>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                            ph.status === 'lead' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                          }`}>
                                            {ph.status === 'lead' ? 'Новая заявка с сайта' : 'Партнер B2B'}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                          {ph.address ? `Адрес: ${ph.address}` : 'Адрес аптеки не указан'}
                                          {ph.contact_person ? ` • Контакт: ${ph.contact_person}` : ''}
                                        </p>
                                      </div>
                                    </div>

                                    {formattedPhone && (
                                      <div className="flex items-center gap-2 shrink-0">
                                        <a 
                                          href={`tel:${formattedPhone}`} 
                                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm"
                                        >
                                          <Phone size={14} /> Позвонить
                                        </a>
                                        <a 
                                          href={`https://wa.me/${cleanPhone}`} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm"
                                        >
                                          <MessageSquare size={14} /> WhatsApp
                                        </a>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                                      <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Номер телефона:</span>
                                      <span className="font-extrabold text-slate-800 text-sm select-all mt-0.5 block">{formattedPhone || 'Не указан'}</span>
                                    </div>
                                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                                      <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Контактное лицо:</span>
                                      <span className="font-bold text-slate-700 text-xs mt-0.5 block">{ph.contact_person || '—'}</span>
                                    </div>
                                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                                      <div>
                                        <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Адрес доставки:</span>
                                        <span className="font-bold text-slate-700 text-xs mt-0.5 block select-all">{ph.address || '—'}</span>
                                      </div>
                                      {ph.address && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const copyText = `Аптека: ${ph.name}\nТелефон: ${ph.phone || ''}\nКонтакт: ${ph.contact_person || ''}\nАдрес доставки: ${ph.address}`;
                                            navigator.clipboard.writeText(copyText);
                                            setCopiedId(order.id + '_addr');
                                            setTimeout(() => setCopiedId(null), 2000);
                                          }}
                                          className="mt-1.5 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 self-start cursor-pointer"
                                        >
                                          {copiedId === order.id + '_addr' ? <Check size={11} /> : <Copy size={11} />}
                                          <span>{copiedId === order.id + '_addr' ? 'Скопировано!' : 'Копировать курьеру'}</span>
                                        </button>
                                      )}
                                    </div>
                                    <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                                      <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Скидка аптеки:</span>
                                      <span className="font-bold text-emerald-600 text-xs mt-0.5 block">{ph.discount_percent || 0}%</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Items Table */}
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Состав заказа:</p>
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                      <span className="text-slate-600 font-medium">{item.name} <strong className="text-slate-400">×{item.quantity}</strong></span>
                                      <span className="font-bold text-slate-800">{item.price * item.quantity} смн <span className="text-[10px] font-medium text-slate-400">({item.price} смн/шт)</span></span>
                                    </div>
                                  ))}
                                </div>

                                {/* Order details */}
                                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <div>
                                    <p className="text-slate-400 font-medium">Желаемая дата доставки:</p>
                                    <p className="font-bold text-slate-700 mt-0.5">{deliveryDate}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400 font-medium">Комментарий аптеки:</p>
                                    <p className="font-bold text-slate-700 mt-0.5">{order.notes || '—'}</p>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap items-center gap-2 pt-2">
                                  <button 
                                    type="button"
                                    onClick={() => handleOpenOrderEditor(order)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                                  >
                                    <Edit3 size={14} /> Скорректировать заказ и скидку
                                  </button>

                                  <button 
                                    type="button"
                                    onClick={() => handleDirectPrintInvoice(order)}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                                  >
                                    <Printer size={14} /> Товарная накладная (А4)
                                  </button>

                                  {statusInfo.next && (
                                    <button 
                                      onClick={() => handleUpdateOrderStatus(order.id, statusInfo.next!)}
                                      className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                                    >
                                      Перевести в: {ORDER_STATUS_MAP[statusInfo.next!].label}
                                    </button>
                                  )}
                                  
                                  {order.payment_status !== 'paid' && (
                                    <button 
                                      onClick={() => handleUpdatePaymentStatus(order, 'paid')}
                                      className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-50"
                                    >
                                      Отметить оплату ✅
                                    </button>
                                  )}

                                  {order.order_status !== 'cancelled' && (
                                    <button 
                                      onClick={() => handleCancelOrder(order)}
                                      className="border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-bold transition-all ml-auto"
                                    >
                                      Отменить заказ
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PHARMACY REGISTRY */}
          {activeTab === 'pharmacies' && (() => {
            const activePartners = pharmacies.filter(p => p.status !== 'lead');
            const leadPartners = pharmacies.filter(p => p.status === 'lead');

            return (
              <div className="space-y-6">
                {/* Section 1: Leads/Requests from Website */}
                {leadPartners.length > 0 && (
                  <div className="bg-amber-50/40 rounded-3xl border border-amber-200/60 p-6 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-amber-900 font-outfit flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        Заявки на партнерство с сайта
                      </h3>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        {leadPartners.length} новых
                      </span>
                    </div>

                    <div className="overflow-x-auto bg-white rounded-2xl border border-amber-100">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                            <th className="p-4 rounded-l-xl">Аптека</th>
                            <th className="p-4">Контактное лицо</th>
                            <th className="p-4">Телефон (WhatsApp)</th>
                            <th className="p-4">Адрес / Регион</th>
                            <th className="p-4">Дата заявки</th>
                            <th className="p-4 rounded-r-xl text-right">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {leadPartners.map(p => {
                            const date = p.created_at 
                              ? new Date(p.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                              : '—';
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 font-bold text-slate-800">{p.name}</td>
                                <td className="p-4 text-slate-600 font-semibold">{p.contact_person || '—'}</td>
                                <td className="p-4 font-semibold text-slate-700">{p.phone || '—'}</td>
                                <td className="p-4 text-slate-500">{p.address || '—'}</td>
                                <td className="p-4 text-slate-400 font-bold">{date}</td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                  <button 
                                    onClick={() => openPharmacyModal('edit', p)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all"
                                  >
                                    Одобрить
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePharmacy(p.id)}
                                    className="border border-red-200 text-red-500 hover:bg-red-50 font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all"
                                  >
                                    Отклонить
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Section 2: Active B2B Partners */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-800 font-outfit">Реестр аптек-партнеров</h3>
                    <button 
                      onClick={() => openPharmacyModal('create')}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-50"
                    >
                      <UserPlus size={14} /> Добавить аптеку
                    </button>
                  </div>

                  {activePartners.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Действующие аптеки не зарегистрированы. Одобрите заявку или добавьте партнера вручную!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                            <th className="p-4 rounded-l-xl">Аптека</th>
                            <th className="p-4">Скидка</th>
                            <th className="p-4">Баланс долга</th>
                            <th className="p-4">Контакты</th>
                            <th className="p-4">Ссылка для заказа</th>
                            <th className="p-4 rounded-r-xl">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {activePartners.map(p => {
                            const usedCreditPercent = Math.min((p.balance / p.credit_limit) * 100, 100);
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4">
                                  <p className="font-extrabold text-slate-800">{p.name}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{p.address || 'Адрес не указан'}</p>
                                </td>
                                <td className="p-4">
                                  {p.discount_percent < 0 ? (
                                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-bold border border-amber-100">
                                      +{Math.abs(p.discount_percent)}% наценка
                                    </span>
                                  ) : p.discount_percent > 0 ? (
                                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold border border-emerald-100">
                                      -{p.discount_percent}% скидка
                                    </span>
                                  ) : (
                                    <span className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md font-bold border border-slate-100">
                                      Опт
                                    </span>
                                  )}
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center justify-between max-w-[120px] mb-1 font-bold text-slate-700">
                                    <span>{p.balance} смн</span>
                                    <span className="text-[10px] text-slate-400">/ {p.credit_limit}</span>
                                  </div>
                                  <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${usedCreditPercent > 85 ? 'bg-red-500' : usedCreditPercent > 50 ? 'bg-amber-400' : 'bg-blue-500'}`}
                                      style={{ width: `${usedCreditPercent}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="p-4">
                                  <p className="font-bold text-slate-700">{p.contact_person || '—'}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{p.phone || '—'}</p>
                                </td>
                                <td className="p-4">
                                  <button 
                                    onClick={() => copyB2BLink(p.token, p.id)}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 border ${
                                      copiedId === p.id 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {copiedId === p.id ? (
                                      <>
                                        <Check size={10} /> Ссылка скопирована
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={10} /> Копировать ссылку
                                      </>
                                    )}
                                  </button>
                                </td>
                                <td className="p-4 flex gap-1.5">
                                  <button 
                                    onClick={() => openPharmacyModal('edit', p)}
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePharmacy(p.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 3: MANUAL ORDER CREATION */}
          {activeTab === 'new-order' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Input Side */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 font-outfit border-b border-slate-50 pb-3">
                  Новый ручной оптовый заказ
                </h3>

                <div className="space-y-4">
                  {/* Select Pharmacy */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Выберите аптеку-партнера</label>
                    <select
                      value={selectedPharmacyForOrder}
                      onChange={e => { setSelectedPharmacyForOrder(e.target.value); setOrderCart({}); }}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold outline-none focus:bg-white focus:border-slate-300 transition-colors"
                    >
                      <option value="">-- Выбрать аптеку --</option>
                      {pharmacies.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.discount_percent < 0 ? `(наценка +${Math.abs(p.discount_percent)}%)` : p.discount_percent > 0 ? `(скидка -${p.discount_percent}%)` : '(базовый опт)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPharmacyForOrder ? (
                    <div className="space-y-4">
                      {/* Search items */}
                      <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Быстрый поиск товаров</label>
                        <div className="relative">
                          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                          <input 
                            type="text" 
                            placeholder="Наберите первые буквы для фильтрации..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300 transition-colors"
                            value={orderSearchQuery}
                            onChange={e => setOrderSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Products Grid selector */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredCatalogForOrder.map(p => {
                          const cartQty = orderCart[p.id] || 0;
                          const discount = selectedPharmObj ? selectedPharmObj.discount_percent : 0;
                          const baseWholesale = Number(p.price) || 0;
                          const b2bPrice = Math.round(baseWholesale * (1 - discount / 100));

                          return (
                            <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center">
                              <div className="min-w-0 pr-2">
                                <p className="font-extrabold text-xs text-slate-800 truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                  Опт: <strong className="text-emerald-600">{b2bPrice} смн</strong> <span className="line-through">({p.retail_price})</span>
                                </p>
                              </div>

                              {cartQty > 0 ? (
                                <div className="flex items-center bg-slate-900 text-white rounded-lg p-0.5">
                                  <button onClick={() => updateManualCartQty(p.id, -1)} className="w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded"><Minus size={10}/></button>
                                  <span className="w-6 text-center text-xs font-bold">{cartQty}</span>
                                  <button onClick={() => updateManualCartQty(p.id, 1)} className="w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded"><Plus size={10}/></button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => updateManualCartQty(p.id, 1)}
                                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                                >
                                  Добавить
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Details inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Желаемая дата доставки</label>
                          <input 
                            type="date"
                            className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300"
                            value={orderDeliveryDate}
                            onChange={e => setOrderDeliveryDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Комментарий</label>
                          <input 
                            type="text"
                            placeholder="Особые пожелания к отгрузке..."
                            className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300"
                            value={orderNotes}
                            onChange={e => setOrderNotes(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                      Пожалуйста, выберите аптеку для начала подбора товаров.
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Summary Side */}
              <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 lg:sticky lg:top-24 flex flex-col">
                <h3 className="font-bold text-slate-800 text-base border-b border-slate-50 pb-3 font-outfit flex items-center gap-2">
                  <ShoppingCart size={18} className="text-emerald-600" /> Накладная заказа
                </h3>

                <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px]">
                  {manualOrderItems.map(item => (
                    <div key={item.product.id} className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="min-w-0 pr-2 flex-1">
                        <p className="font-bold text-slate-700 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.b2bPrice} смн × {item.quantity}</p>
                      </div>
                      <span className="font-extrabold text-slate-850 shrink-0">{item.b2bPrice * item.quantity} смн</span>
                    </div>
                  ))}

                  {manualOrderItems.length === 0 && (
                    <p className="py-12 text-center text-slate-400 text-xs font-medium">Товары не выбраны.</p>
                  )}
                </div>

                {manualOrderItems.length > 0 && (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="flex justify-between items-end">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Итого к оплате:</span>
                      <span className="text-2xl font-extrabold text-slate-800 leading-none">
                        {manualOrderTotal.toLocaleString()} <span className="text-xs font-bold text-slate-400">смн</span>
                      </span>
                    </div>

                    <button
                      onClick={handleCreateManualOrder}
                      disabled={isSubmittingManualOrder}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {isSubmittingManualOrder ? 'Оформление...' : 'Создать накладную заказа'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: B2B PRODUCT PRICING */}
          {activeTab === 'prices' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 font-outfit">Цены B2B каталога</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Здесь вы можете изменить базовые оптовые цены товаров. Розничные цены рассчитываются автоматически на основе наценки сайта.
                  </p>
                </div>
                <div className="bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-100 text-slate-650">
                  Текущая наценка розницы: <span className="font-extrabold text-slate-800">+{markupSettings.percent}%</span> + <span className="font-extrabold text-slate-800">{markupSettings.flat} смн</span>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Поиск товара по названию или ID..."
                  value={priceSearchQuery}
                  onChange={e => setPriceSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300 transition-colors"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                      <th className="p-4 rounded-l-xl">Товар</th>
                      <th className="p-4">Базовая B2B цена</th>
                      <th className="p-4">Расчетная розница</th>
                      <th className="p-4 rounded-r-xl text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProductsForPrices.map(p => {
                      const currentEditVal = priceEdits[p.id] !== undefined ? priceEdits[p.id] : p.price;
                      
                      // Calculate dynamic retail preview
                      let retailPreview = currentEditVal;
                      if (markupSettings.percent > 0) retailPreview = retailPreview * (1 + markupSettings.percent / 100);
                      retailPreview = retailPreview + markupSettings.flat;
                      const retailPreviewRounded = Math.round(retailPreview);

                      const isSaving = savingProductIds[p.id];
                      const isSaved = savedProductIds[p.id];
                      const isChanged = priceEdits[p.id] !== undefined && priceEdits[p.id] !== p.price;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover border border-slate-100" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                <Package size={14} />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-800">{p.name}</p>
                              <p className="text-[10px] text-slate-400">ID: {p.id}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 max-w-[120px]">
                              <input
                                type="number"
                                value={currentEditVal}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  setPriceEdits(prev => ({
                                    ...prev,
                                    [p.id]: isNaN(val) ? 0 : val
                                  }));
                                }}
                                className="w-20 h-9 px-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold outline-none focus:bg-white focus:border-slate-400 transition-all text-center"
                              />
                              <span className="text-slate-400 font-medium">смн</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-700">{retailPreviewRounded} смн</span>
                              <span className="text-[9px] text-slate-400 mt-0.5">наценка розницы</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleSaveProductPrice(p.id, currentEditVal)}
                              disabled={isSaving || (!isChanged && !isSaved)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                isSaved
                                  ? 'bg-emerald-50 border border-emerald-250 text-emerald-600'
                                  : isChanged
                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                    : 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed'
                              }`}
                            >
                              {isSaving ? '...' : isSaved ? 'Сохранено ✓' : 'Сохранить'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProductsForPrices.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-400">
                          Товары не найдены.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Slide-over Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Slide-over panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 p-6 flex flex-col justify-between border-l border-slate-100"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <h3 className="text-lg font-bold text-slate-800 font-outfit">
                    {modalMode === 'create' ? 'Регистрация аптеки' : 'Редактировать аптеку'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Название аптеки</label>
                    <input 
                      type="text" 
                      placeholder="Например: Аптека Шифо №12"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-350"
                      value={pharmacyForm.name}
                      onChange={e => setPharmacyForm({ ...pharmacyForm, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Контактное лицо</label>
                    <input 
                      type="text" 
                      placeholder="ФИО закупщика..."
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-350"
                      value={pharmacyForm.contact_person}
                      onChange={e => setPharmacyForm({ ...pharmacyForm, contact_person: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Номер телефона</label>
                    <input 
                      type="text" 
                      placeholder="+992 901 234 567"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-350"
                      value={pharmacyForm.phone}
                      onChange={e => setPharmacyForm({ ...pharmacyForm, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Адрес доставки</label>
                    <input 
                      type="text" 
                      placeholder="Улица, дом, город..."
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-350"
                      value={pharmacyForm.address}
                      onChange={e => setPharmacyForm({ ...pharmacyForm, address: e.target.value })}
                    />
                  </div>

                  <div className="space-y-4 pt-2 border-t border-slate-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Тип цены B2B</label>
                        <select
                          value={adjustmentType}
                          onChange={e => setAdjustmentType(e.target.value as 'discount' | 'markup')}
                          className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300 transition-colors"
                        >
                          <option value="discount">Скидка (%)</option>
                          <option value="markup">Наценка опта (%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Размер коррекции (%)</label>
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300 transition-colors"
                          value={adjustmentVal}
                          onChange={e => setAdjustmentVal(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Лимит долга (смн)</label>
                      <input 
                        type="number" 
                        className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300 transition-colors"
                        value={pharmacyForm.credit_limit}
                        onChange={e => setPharmacyForm({ ...pharmacyForm, credit_limit: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSavePharmacy}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                Сохранить партнера
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ORDER CORRECTION & INVOICE BUILDER */}
      <AnimatePresence>
        {isOrderEditorOpen && editingOrder && (() => {
          const ph = getOrderPharmacy(editingOrder);

          return (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-4xl shadow-2xl space-y-5 my-8 max-h-[92vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0">
                      <Edit3 size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 font-outfit">
                        Корректировка заказа #{editingOrder.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Аптека: <strong className="text-slate-800">{ph.name || 'Оптовый покупатель'}</strong>
                        {ph.phone && <span> • Тел: <strong>{ph.phone}</strong></span>}
                        {ph.contact_person && <span> • Контакт: {ph.contact_person}</span>}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOrderEditorOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="overflow-y-auto pr-1 space-y-5 flex-1 text-xs">
                  {/* 1. Items List (Наличие и количество) */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <span>1. Контроль наличия и количества товаров</span>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {editingItems.length} поз.
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Скорректируйте количество штук или исключите отсутствующие на складе товары перед печатью накладной.
                      </p>
                    </div>

                    {editingItems.length === 0 ? (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-center">
                        В заказе не осталось товаров. Добавьте товар из каталога ниже.
                      </div>
                    ) : (
                      <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                        <div className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider grid grid-cols-12 px-4 py-2.5">
                          <div className="col-span-5 sm:col-span-6">Товар</div>
                          <div className="col-span-3 sm:col-span-2 text-center">Цена (TJS)</div>
                          <div className="col-span-4 sm:col-span-4 text-right">Кол-во / Сумма</div>
                        </div>

                        {editingItems.map((item, idx) => {
                          const lineTotal = Math.round((Number(item.quantity) * Number(item.price)) * 100) / 100;
                          return (
                            <div key={idx} className="grid grid-cols-12 px-4 py-3 items-center hover:bg-slate-50/50 transition-colors">
                              <div className="col-span-5 sm:col-span-6 pr-2">
                                <p className="font-bold text-slate-900 text-xs sm:text-sm">{item.name}</p>
                                <p className="text-[10px] text-slate-400">ID: {item.product_id}</p>
                              </div>

                              <div className="col-span-3 sm:col-span-2 text-center">
                                <span className="font-bold text-slate-700 text-xs sm:text-sm">
                                  {item.price} смн
                                </span>
                              </div>

                              <div className="col-span-4 sm:col-span-4 flex items-center justify-end gap-2 sm:gap-3">
                                {/* Quantity stepper */}
                                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQty(idx, item.quantity - 1)}
                                    className="px-2 py-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors active:scale-90"
                                    title="Уменьшить на 1"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={e => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)}
                                    className="w-11 sm:w-12 text-center bg-white font-extrabold text-slate-900 text-xs py-1 outline-none border-x border-slate-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItemQty(idx, item.quantity + 1)}
                                    className="px-2 py-1.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors active:scale-90"
                                    title="Увеличить на 1"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>

                                {/* Line sum */}
                                <div className="w-16 sm:w-20 text-right font-black text-slate-900 text-xs sm:text-sm shrink-0">
                                  {lineTotal.toLocaleString()} смн
                                </div>

                                {/* Out of stock / Remove */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemFromOrder(idx)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Нет в наличии (исключить из партии)"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add replacement or extra product */}
                    <div className="relative">
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 focus-within:border-slate-800 transition-colors">
                        <Search size={15} className="text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={orderProductSearch}
                          onChange={e => setOrderProductSearch(e.target.value)}
                          placeholder="Добавить замену или товар со склада (поиск по названию)..."
                          className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
                        />
                        {orderProductSearch && (
                          <button
                            type="button"
                            onClick={() => setOrderProductSearch('')}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {filteredAvailableProducts.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                          {filteredAvailableProducts.map((p: any) => (
                            <div
                              key={p.id}
                              onClick={() => handleAddProductToEditor(p)}
                              className="px-4 py-2.5 hover:bg-emerald-50/60 cursor-pointer flex items-center justify-between transition-colors"
                            >
                              <div>
                                <p className="font-bold text-slate-800 text-xs">{p.name}</p>
                                <p className="text-[10px] text-slate-400">ID: {p.id}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-black text-emerald-700 text-xs">{p.price} смн</span>
                                <span className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                                  <Plus size={12} /> Добавить
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Individual Discount Section */}
                  <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-1.5">
                          <Sparkles size={16} className="text-emerald-600" />
                          <span>2. Индивидуальная скидка перед печатью накладной</span>
                        </h4>
                        <p className="text-[11px] text-emerald-700/80 mt-0.5">
                          Примените согласованный процент скидки. Итоговая сумма и накладная будут рассчитаны с абсолютной математической точностью.
                        </p>
                      </div>

                      <div className="flex items-center gap-1 bg-white border border-emerald-200 rounded-xl p-1 shadow-2xs">
                        {[0, 3, 5, 7, 10, 15, 20].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setEditingDiscountPercent(pct)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${
                              editingDiscountPercent === pct
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-emerald-800 hover:bg-emerald-100/60'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-emerald-200/60">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-700">Свой % скидки:</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={editingDiscountPercent}
                          onChange={e => setEditingDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                          className="w-20 bg-white border border-emerald-300 rounded-xl px-2.5 py-1 text-xs font-extrabold text-emerald-900 outline-none focus:border-emerald-600 text-center shadow-2xs"
                        />
                        <span className="text-xs font-bold text-emerald-800">%</span>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={saveDiscountAsPharmacyDefault}
                          onChange={e => setSaveDiscountAsPharmacyDefault(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Сохранить {editingDiscountPercent}% как постоянную скидку в профиле этой аптеки</span>
                      </label>
                    </div>
                  </div>

                  {/* 3. Mathematical Summary */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
                    <div className="flex justify-between items-center text-xs text-slate-300 pb-2 border-b border-slate-800">
                      <span>Сумма по позициям (Подитог без скидки):</span>
                      <span className="font-extrabold text-sm text-white">
                        {editorSubtotal.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} смн
                      </span>
                    </div>

                    {editingDiscountPercent > 0 && (
                      <div className="flex justify-between items-center text-xs text-emerald-400 pb-2 border-b border-slate-800">
                        <span>Индивидуальная скидка ({editingDiscountPercent}%):</span>
                        <span className="font-extrabold text-sm">
                          - {editorDiscountAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} смн
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">ИТОГО К ОПЛАТЕ:</span>
                        <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                          {editorFinalTotal.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} смн
                        </span>
                      </div>

                      <div className="sm:text-right max-w-md">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Сумма прописью:</span>
                        <span className="text-xs font-semibold text-slate-200 italic">
                          {numberToWordsRu(editorFinalTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={handleSendUpdatedWa}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                    title="Отправить обновленный состав в WhatsApp аптеке"
                  >
                    <MessageSquare size={14} /> Отправить в WhatsApp
                  </button>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setIsOrderEditorOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                    >
                      Отмена
                    </button>

                    <button
                      type="button"
                      disabled={isSavingOrderEdits}
                      onClick={() => handleSaveOrderEdits(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      {isSavingOrderEdits ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>

                    <button
                      type="button"
                      disabled={isSavingOrderEdits}
                      onClick={() => handleSaveOrderEdits(true)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                    >
                      <Printer size={15} />
                      <span>Сохранить и распечатать накладную</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* PRINT INVOICE MODAL */}
      {printInvoiceData && (
        <B2BInvoiceTemplate {...printInvoiceData} />
      )}
    </div>
  );
};
