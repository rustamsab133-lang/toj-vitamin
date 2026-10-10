"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { adminDbQuery, getCorrectNow } from '@/lib/admin-api';
import { Order, OrderItem, Product, OfflineCustomer } from '@/lib/types';
import { getMarkupSettings, applyMarkupToProduct } from '@/lib/markup';
import { 
  Phone, MessageCircle, Send, Instagram, Globe, Store, 
  Search, Plus, Package, Truck, CheckCircle, XCircle, 
  ChevronRight, Clock, UserPlus, Save, AlertCircle, Eye, X, User, MapPin, CreditCard, Calendar, Edit3, RefreshCw,
  Sparkles, Sunrise, Sun, Moon, Copy, Check, LogOut, Minus, Trash2, RotateCcw,
  ChevronDown, ChevronUp
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new: { label: 'Новый / В работе', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: <Clock size={14} /> },
  delivering: { label: 'В доставке', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: <Truck size={14} /> },
  paid: { label: 'Оплата получена', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: <CheckCircle size={14} /> },
  cancelled: { label: 'Отменен', color: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={14} /> },
};

const STATUS_THEME: Record<string, { accentBorder: string; headerBg: string }> = {
  new: {
    accentBorder: 'border-l-[6px] border-l-blue-500',
    headerBg: 'bg-gradient-to-r from-blue-50/90 via-slate-50/60 to-white',
  },
  delivering: {
    accentBorder: 'border-l-[6px] border-l-amber-500',
    headerBg: 'bg-gradient-to-r from-amber-50/90 via-slate-50/60 to-white',
  },
  paid: {
    accentBorder: 'border-l-[6px] border-l-emerald-500',
    headerBg: 'bg-gradient-to-r from-emerald-50/90 via-slate-50/60 to-white',
  },
  cancelled: {
    accentBorder: 'border-l-[6px] border-l-rose-500',
    headerBg: 'bg-gradient-to-r from-rose-50/90 via-slate-50/60 to-white',
  },
};

const CHANNEL_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  phone: { label: 'Звонок', icon: <Phone size={14} />, color: 'text-indigo-600 bg-indigo-50' },
  whatsapp: { label: 'WhatsApp', icon: <MessageCircle size={14} />, color: 'text-green-600 bg-green-50' },
  telegram: { label: 'Telegram', icon: <Send size={14} />, color: 'text-sky-600 bg-sky-50' },
  instagram: { label: 'Instagram', icon: <Instagram size={14} />, color: 'text-pink-600 bg-pink-50' },
  website: { label: 'Сайт', icon: <Globe size={14} />, color: 'text-slate-600 bg-slate-100' },
  offline: { label: 'Офлайн', icon: <Store size={14} />, color: 'text-orange-600 bg-orange-50' },
};

export interface ParsedContact {
  phone: string | null;
  rawDigits: string;
  instagram: string | null;
  telegram: string | null;
  pickupNote: string | null;
  isPickup: boolean;
  raw: string;
}

export function extractInstagramNick(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i);
  if (urlMatch && urlMatch[1]) {
    const candidate = urlMatch[1].replace(/\/+$/, '');
    const reserved = ['p', 'reel', 'reels', 'stories', 'explore', 'direct'];
    if (!reserved.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return trimmed.replace(/^@+/, '').replace(/\/+$/, '');
}

export function extractTelegramNick(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_.]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].replace(/\/+$/, '');
  }
  return trimmed.replace(/^@+/, '').replace(/\/+$/, '');
}

export function formatOrderContact(opts: {
  phone?: string | null;
  instagram?: string | null;
  telegram?: string | null;
  pickupNote?: string | null;
}): string {
  const cleanPhone = (opts.phone || '').trim();
  const cleanIg = extractInstagramNick(opts.instagram || '');
  const cleanTg = extractTelegramNick(opts.telegram || '');
  const cleanPickup = (opts.pickupNote || '').trim();

  const tags: string[] = [];
  if (cleanIg && cleanTg) {
    tags.push(`IG: @${cleanIg}`);
    tags.push(`TG: @${cleanTg}`);
  } else if (cleanIg) {
    tags.push(`@${cleanIg}`);
  } else if (cleanTg) {
    tags.push(`TG: @${cleanTg}`);
  }

  if (cleanPickup) {
    tags.push(`Самовывоз: ${cleanPickup}`);
  }

  if (cleanPhone && tags.length > 0) {
    return `${cleanPhone} (${tags.join(', ')})`;
  } else if (cleanPhone) {
    return cleanPhone;
  } else if (tags.length > 0) {
    return tags.join(' | ');
  }

  return '';
}

export function parseOrderContact(contactStr: string | null | undefined, channel?: string): ParsedContact {
  const raw = (contactStr || '').trim();
  if (!raw) {
    return {
      phone: null,
      rawDigits: '',
      instagram: null,
      telegram: null,
      pickupNote: null,
      isPickup: channel === 'offline',
      raw: ''
    };
  }

  // 1. Detect profile URLs or tags or @nick
  let instagram: string | null = null;
  let telegram: string | null = null;

  // 1a. Explicit tags: IG: @nick or TG: @nick
  const igTagged = raw.match(/(?:IG|Instagram|Инстаграм|Инста)[:\s]*@?([a-zA-Z0-9_.]+)/i);
  if (igTagged && igTagged[1]) {
    const candidate = igTagged[1].replace(/\/+$/, '');
    const reserved = ['p', 'reel', 'reels', 'stories', 'explore', 'direct'];
    if (!reserved.includes(candidate.toLowerCase())) {
      instagram = candidate;
    }
  }

  const tgTagged = raw.match(/(?:TG|Telegram|Телеграм|ТГ)[:\s]*@?([a-zA-Z0-9_.]+)/i);
  if (tgTagged && tgTagged[1]) {
    telegram = tgTagged[1].replace(/\/+$/, '');
  }

  // 1b. Instagram URL match (e.g. instagram.com/username)
  if (!instagram) {
    const igUrlMatch = raw.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i);
    if (igUrlMatch && igUrlMatch[1]) {
      const candidate = igUrlMatch[1].replace(/\/+$/, '');
      const reserved = ['p', 'reel', 'reels', 'stories', 'explore', 'direct'];
      if (!reserved.includes(candidate.toLowerCase())) {
        instagram = candidate;
      }
    }
  }

  // 1c. Telegram URL match (e.g. t.me/username or telegram.me/username)
  if (!telegram) {
    const tgUrlMatch = raw.match(/(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_.]+)/i);
    if (tgUrlMatch && tgUrlMatch[1]) {
      telegram = tgUrlMatch[1].replace(/\/+$/, '');
    }
  }

  // 1d. Generic @nick(s)
  if (!instagram || !telegram) {
    const allNicks = Array.from(raw.matchAll(/@([a-zA-Z0-9_.]+)/g)).map(m => m[1]);
    if (allNicks.length === 1) {
      if (!instagram && !telegram) {
        if (channel === 'telegram') telegram = allNicks[0];
        else instagram = allNicks[0];
      }
    } else if (allNicks.length >= 2) {
      if (!instagram) instagram = allNicks[0];
      if (!telegram) telegram = allNicks[1];
    }
  }

  // 2. Check for pickup note
  const isPickup = raw.toLowerCase().includes('самовывоз') || channel === 'offline';
  let pickupNote: string | null = null;
  if (isPickup) {
    pickupNote = raw.replace(/\+?[\d\s()-]{6,}/, '').replace(/[()]/g, '').trim();
    if (!pickupNote || pickupNote === 'Самовывоз') pickupNote = 'Самовывоз из магазина';
  }

  // 3. Extract phone (look for standard phone patterns or digit blocks)
  const phonePattern = /(?:\+?992|8|\+7)?\s*\(?\d{2,4}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/;
  const match = raw.match(phonePattern);
  let phone: string | null = null;
  let rawDigits = '';

  if (match) {
    phone = match[0].trim();
    rawDigits = phone.replace(/[^0-9]/g, '');
  } else {
    // Check if there is any block of digits >= 6
    const blockMatch = raw.match(/\+?\d[\d\s-]{5,}\d/);
    if (blockMatch) {
      phone = blockMatch[0].trim();
      rawDigits = phone.replace(/[^0-9]/g, '');
    }
  }

  // 4. Fallback if no phone and no @nick found
  if (!phone && !instagram && channel === 'instagram') {
    const clean = raw.replace(/^@/, '').trim();
    // Only if it doesn't look like phone digits and isn't pickup
    if (clean && clean.replace(/[^0-9]/g, '').length < 5 && !clean.toLowerCase().includes('самовывоз')) {
      instagram = clean;
    }
  }

  if (!phone && !telegram && channel === 'telegram') {
    const clean = raw.replace(/^@/, '').trim();
    if (clean && clean.replace(/[^0-9]/g, '').length < 5 && !clean.toLowerCase().includes('самовывоз')) {
      telegram = clean;
    }
  }

  return {
    phone,
    rawDigits,
    instagram,
    telegram,
    pickupNote,
    isPickup,
    raw
  };
}

interface OperatorWorkspaceProps {
  onBack?: () => void;
  onLogout?: () => void;
}

export const OperatorWorkspace: React.FC<OperatorWorkspaceProps> = ({ onBack, onLogout }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create order state
  const [isCreating, setIsCreating] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    channel: 'phone',
    status: 'new',
    items: [],
    payment_method: 'cash',
    payment_status: 'unpaid'
  });
  
  // Customer & Contact lookup
  type ContactMode = 'phone' | 'instagram' | 'telegram' | 'pickup';
  const [contactMode, setContactMode] = useState<ContactMode>('phone');
  const [customerPhone, setCustomerPhone] = useState('');
  const [instagramNick, setInstagramNick] = useState('');
  const [telegramNick, setTelegramNick] = useState('');
  const [pickupNote, setPickupNote] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<OfflineCustomer | null>(null);
  
  // Product lookup
  const [productSearch, setProductSearch] = useState('');
  
  // Order Details Modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editableCourier, setEditableCourier] = useState('');
  const [editableNotes, setEditableNotes] = useState('');
  const [editableAddress, setEditableAddress] = useState('');
  const [editablePhone, setEditablePhone] = useState('');
  const [editableIg, setEditableIg] = useState('');
  const [editableTg, setEditableTg] = useState('');
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [expandedOrderItems, setExpandedOrderItems] = useState<Record<number, boolean>>({});

  // Map of products for instant name resolution & fallback
  const productsMap = useMemo(() => new Map(products.map(p => [String(p.id), p])), [products]);

  // Robust parser for order items (handles JSON strings, missing fields, or empty names)
  const getOrderItems = useCallback((order: Partial<Order> | null | undefined): OrderItem[] => {
    if (!order || !order.items) return [];
    let raw: any = order.items;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(raw)) return [];
    return raw.map((it: any) => {
      const pId = String(it.id || it.product_id || '');
      const matchedProduct = pId ? productsMap.get(pId) : null;
      const name = it.name || it.title || it.product_name || matchedProduct?.name || (pId ? `Товар #${pId}` : 'Товар');
      return {
        id: pId,
        name,
        price: Number(it.price) || (matchedProduct ? Number(matchedProduct.price) : 0),
        quantity: Number(it.quantity) || 1
      };
    });
  }, [productsMap]);

  // Order items editing state inside modal
  const [editableItems, setEditableItems] = useState<OrderItem[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isSavingItems, setIsSavingItems] = useState(false);
  const [itemsSaveSuccess, setItemsSaveSuccess] = useState(false);

  // Recalculate totals for editable items in selectedOrder
  const editedSubtotal = useMemo(() => {
    return editableItems.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  }, [editableItems]);

  const editedDiscount = useMemo(() => {
    if (!selectedOrder) return 0;
    const baseDiscount = Number(selectedOrder.discount) || 0;
    return Math.min(baseDiscount, editedSubtotal);
  }, [selectedOrder, editedSubtotal]);

  const editedTotal = useMemo(() => {
    return Math.max(0, editedSubtotal - editedDiscount);
  }, [editedSubtotal, editedDiscount]);

  // Check if items or quantities differ from selectedOrder
  const isOrderCompositionChanged = useMemo(() => {
    if (!selectedOrder) return false;
    const originalItems = getOrderItems(selectedOrder);
    if (originalItems.length !== editableItems.length) return true;
    for (let i = 0; i < originalItems.length; i++) {
      const orig = originalItems[i];
      const curr = editableItems[i];
      if (!curr || String(orig.id) !== String(curr.id) || orig.quantity !== curr.quantity || orig.price !== curr.price) {
        return true;
      }
    }
    return false;
  }, [selectedOrder, editableItems, getOrderItems]);

  const updateItemQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setEditableItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: newQty } : item));
  };

  const removeItemFromOrder = (index: number) => {
    const itemToRemove = editableItems[index];
    if (editableItems.length === 1) {
      if (!confirm(`Вы действительно хотите удалить единственный товар "${itemToRemove?.name || ''}" из заказа?`)) {
        return;
      }
    }
    setEditableItems(prev => prev.filter((_, i) => i !== index));
  };

  const addItemToOrder = (prod: Product) => {
    setEditableItems(prev => {
      const existingIndex = prev.findIndex(i => String(i.id) === String(prod.id));
      if (existingIndex >= 0) {
        return prev.map((item, idx) => idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        id: prod.id,
        name: prod.name,
        price: Number(prod.price) || 0,
        quantity: 1
      }];
    });
    setItemSearchQuery('');
  };

  const resetItemsToOriginal = () => {
    if (!selectedOrder) return;
    const parsed = getOrderItems(selectedOrder);
    setEditableItems(JSON.parse(JSON.stringify(parsed)));
    setItemSearchQuery('');
  };

  const matchingCatalogProducts = useMemo(() => {
    if (!itemSearchQuery.trim()) return [];
    const q = itemSearchQuery.toLowerCase().trim();
    return products.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.full_name?.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [itemSearchQuery, products]);

  const saveOrderItems = async () => {
    if (!selectedOrder) return;
    if (editableItems.length === 0) {
      if (!confirm("Внимание: в заказе не осталось товаров. Сохранить заказ с пустым составом?")) {
        return;
      }
    }
    setIsSavingItems(true);
    try {
      await adminDbQuery({
        action: 'update',
        table: 'orders',
        id: selectedOrder.id,
        data: {
          items: editableItems,
          total: editedTotal,
          original_total: editedSubtotal,
          discount: editedDiscount
        }
      });

      const updated: Order = {
        ...selectedOrder,
        items: editableItems,
        total: editedTotal,
        original_total: editedSubtotal,
        discount: editedDiscount
      };

      setSelectedOrder(updated);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
      setItemsSaveSuccess(true);
      setTimeout(() => setItemsSaveSuccess(false), 3000);
    } catch (e: any) {
      console.error("Failed to update order items:", e);
      alert("Ошибка при сохранении состава заказа: " + (e?.message || e));
    } finally {
      setIsSavingItems(false);
    }
  };

  // Copilot (ИИ-Нутрициолог) state
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState<any>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runOrderCopilot = async () => {
    const itemsToAnalyze = editableItems && editableItems.length > 0 ? editableItems : selectedOrder?.items;
    if (!selectedOrder || !itemsToAnalyze || itemsToAnalyze.length === 0) return;
    setCopilotLoading(true);
    try {
      const res = await fetch('/api/agents/consultant-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_order',
          items: itemsToAnalyze,
          customerPhone: parseOrderContact(selectedOrder.phone, selectedOrder.channel).phone || selectedOrder.phone || '',
          customerNotes: editableNotes || selectedOrder.delivery_notes || '',
          lang: 'ru'
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCopilotResult(json.data);
        setCopilotOpen(true);
      } else {
        alert(json.error || 'Не удалось проанализировать заказ');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при вызове ИИ-Нутрициолога');
    } finally {
      setCopilotLoading(false);
    }
  };

  // Lock body scroll when order detail modal is open
  useEffect(() => {
    if (selectedOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedOrder]);

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order);
    setEditableCourier(order.courier_name || '');
    setEditableNotes(order.operator_notes || '');
    setEditableAddress(order.delivery_address || '');
    const parsed = parseOrderContact(order.phone, order.channel);
    setEditablePhone(parsed.phone || (!parsed.instagram && !parsed.telegram ? (order.phone || '') : ''));
    setEditableIg(parsed.instagram || '');
    setEditableTg(parsed.telegram || '');
    setIsEditingContact(false);
    const parsedItems = getOrderItems(order);
    setEditableItems(parsedItems.length > 0 ? JSON.parse(JSON.stringify(parsedItems)) : []);
    setItemSearchQuery('');
    setItemsSaveSuccess(false);
    setCopilotResult(null);
    setCopilotOpen(false);
  };

  const saveOrderDetails = async () => {
    if (!selectedOrder) return;
    setIsSavingDetails(true);
    try {
      const parsedOriginal = parseOrderContact(selectedOrder.phone, selectedOrder.channel);
      const newContactString = formatOrderContact({
        phone: editablePhone,
        instagram: editableIg,
        telegram: editableTg,
        pickupNote: parsedOriginal.pickupNote
      });

      const isContactChanged = newContactString.trim() !== (selectedOrder.phone || '').trim();
      const updatePayload: any = {
        courier_name: editableCourier,
        operator_notes: editableNotes,
        delivery_address: editableAddress,
        phone: newContactString.trim()
      };

      if (isOrderCompositionChanged) {
        updatePayload.items = editableItems;
        updatePayload.total = editedTotal;
        updatePayload.original_total = editedSubtotal;
        updatePayload.discount = editedDiscount;
      }

      await adminDbQuery({
        action: 'update',
        table: 'orders',
        data: updatePayload,
        id: selectedOrder.id
      });
      if (isContactChanged && selectedOrder.customer_id) {
        try {
          const notesParts: string[] = [];
          const ig = extractInstagramNick(editableIg);
          const tg = extractTelegramNick(editableTg);
          if (ig) notesParts.push(`Instagram: @${ig}`);
          if (tg) notesParts.push(`Telegram: @${tg}`);
          if (parsedOriginal.pickupNote) notesParts.push(`Самовывоз: ${parsedOriginal.pickupNote}`);
          const custUpdate: any = { notes: notesParts.join(' | ') };
          if (editablePhone.trim()) custUpdate.phone = editablePhone.trim();
          await adminDbQuery({ action: 'update', table: 'offline_customers', data: custUpdate, id: selectedOrder.customer_id });
        } catch (custErr) {
          console.warn("Failed to sync customer contacts", custErr);
        }
      }
      const updated: Order = {
        ...selectedOrder,
        phone: newContactString.trim(),
        courier_name: editableCourier,
        operator_notes: editableNotes,
        delivery_address: editableAddress,
        ...(isOrderCompositionChanged ? {
          items: editableItems,
          total: editedTotal,
          original_total: editedSubtotal,
          discount: editedDiscount
        } : {})
      };
      setSelectedOrder(updated);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
      setIsEditingContact(false);
      if (isOrderCompositionChanged || isContactChanged) {
        setItemsSaveSuccess(true);
        setTimeout(() => setItemsSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Failed to save order details", e);
      alert("Не удалось сохранить данные заказа");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    // Auto-refresh orders every 15 seconds to sync dynamically in background!
    const timer = setInterval(() => {
      loadData(true);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);
    try {
      const [ordersRes, productsRes, markupSettings] = await Promise.all([
        adminDbQuery({ action: 'select', table: 'orders', data: { order: { column: 'created_at', ascending: false } } }),
        adminDbQuery({ action: 'select', table: 'products' }),
        getMarkupSettings()
      ]);
      if (ordersRes.data) setOrders(ordersRes.data);
      if (productsRes.data) {
        const retailProducts = productsRes.data.map((p: Product) => 
          applyMarkupToProduct(p, markupSettings)
        );
        setProducts(retailProducts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!isBackground) setLoading(false);
      else setIsRefreshing(false);
    }
  };

  const handleClientLookup = async () => {
    let qPhone = customerPhone.replace(/[^0-9]/g, '');
    let qIg = extractInstagramNick(instagramNick);
    let qTg = extractTelegramNick(telegramNick);
    let qPickup = pickupNote.trim();

    let queryParams: any = {};
    if (qPhone && qPhone.length >= 5) {
      queryParams = { search: { column: 'phone', query: qPhone } };
    } else if (qIg && qIg.length >= 2) {
      queryParams = { search: { or: `name.ilike.%${qIg}%,notes.ilike.%${qIg}%` } };
    } else if (qTg && qTg.length >= 2) {
      queryParams = { search: { or: `name.ilike.%${qTg}%,notes.ilike.%${qTg}%` } };
    } else if (qPickup && qPickup.length >= 2) {
      queryParams = { search: { or: `name.ilike.%${qPickup}%,notes.ilike.%${qPickup}%` } };
    } else {
      return;
    }

    try {
      const { data } = await adminDbQuery({
        action: 'select',
        table: 'offline_customers',
        data: queryParams
      });
      if (data && data.length > 0) {
        const cust = data[0];
        setFoundCustomer(cust);
        setNewOrder(prev => ({ 
          ...prev, 
          customer_id: cust.id 
        }));
        if (cust.phone && !customerPhone) {
          setCustomerPhone(cust.phone);
        }
        if (cust.notes) {
          const igM = cust.notes.match(/Instagram:\s*@?([a-zA-Z0-9_.]+)/i);
          if (igM && !instagramNick) setInstagramNick(igM[1]);
          const tgM = cust.notes.match(/Telegram:\s*@?([a-zA-Z0-9_.]+)/i);
          if (tgM && !telegramNick) setTelegramNick(tgM[1]);
        }
      } else {
        setFoundCustomer(null);
      }
    } catch (e) {
      console.error("Client lookup error:", e);
    }
  };

  const addToCart = (prod: Product) => {
    const existing = newOrder.items?.find(i => i.id === prod.id);
    if (existing) {
      setNewOrder(prev => ({
        ...prev,
        items: prev.items?.map(i => i.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i)
      }));
    } else {
      setNewOrder(prev => ({
        ...prev,
        items: [...(prev.items || []), { id: prod.id, name: prod.name, price: prod.price, quantity: 1 }]
      }));
    }
  };

  const removeFromCart = (id: string) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items?.filter(i => i.id !== id)
    }));
  };

  const cartTotal = (newOrder.items || []).reduce((acc, i) => acc + (i.price * i.quantity), 0);

  const saveOrder = async () => {
    if (!newOrder.items?.length) return alert("Добавьте товары в заказ");

    const cleanPhone = customerPhone.trim();
    const cleanIg = extractInstagramNick(instagramNick);
    const cleanTg = extractTelegramNick(telegramNick);
    const cleanPickup = pickupNote.trim();

    if (!cleanPhone && !cleanIg && !cleanTg && !cleanPickup) {
      return alert("Укажите хотя бы один контакт клиента (телефон, Instagram, Telegram или самовывоз)");
    }

    const finalIdentifier = formatOrderContact({
      phone: cleanPhone,
      instagram: cleanIg,
      telegram: cleanTg,
      pickupNote: cleanPickup
    });

    let customerName = cleanPhone 
      ? `Клиент ${cleanPhone}` 
      : cleanIg 
      ? `Instagram: @${cleanIg}` 
      : cleanTg 
      ? `Telegram: @${cleanTg}` 
      : 'Клиент (Самовывоз)';

    let orderChannel = newOrder.channel || (cleanIg ? 'instagram' : cleanTg ? 'telegram' : cleanPickup ? 'offline' : 'phone');

    // Auto-create customer if doesn't exist
    let cid = newOrder.customer_id;
    if (!foundCustomer) {
      try {
        const notesParts: string[] = [];
        if (cleanIg) notesParts.push(`Instagram: @${cleanIg}`);
        if (cleanTg) notesParts.push(`Telegram: @${cleanTg}`);
        if (cleanPickup) notesParts.push(`Самовывоз: ${cleanPickup}`);

        const custPayload: any = {
          name: customerName,
          total_spent: 0,
          notes: notesParts.join(' | ')
        };
        if (cleanPhone) {
          custPayload.phone = cleanPhone;
        }
        const { data: newCustData } = await adminDbQuery({
          action: 'insert',
          table: 'offline_customers',
          data: [custPayload]
        });
        if (newCustData && newCustData[0]) cid = newCustData[0].id;
      } catch (e) { 
        console.error("Customer create failed", e); 
      }
    }
    
    const fullPayload = {
      ...newOrder,
      channel: orderChannel,
      phone: finalIdentifier,
      customer_id: cid,
      total: cartTotal,
      created_at: getCorrectNow().toISOString()
    };

    try {
      // First try inserting full payload
      try {
        await adminDbQuery({
          action: 'insert',
          table: 'orders',
          data: [fullPayload]
        });
      } catch (e: any) {
        console.warn("Full payload insert failed, falling back to base columns:", e);
        // Fallback: strip extra columns if Supabase Postgres table doesn't have them yet
        const basePayload = {
          phone: finalIdentifier,
          total: cartTotal,
          status: newOrder.status || 'new',
          items: newOrder.items || [],
          created_at: getCorrectNow().toISOString()
        };
        await adminDbQuery({
          action: 'insert',
          table: 'orders',
          data: [basePayload]
        });
      }

      // If the created order is paid, deduct stock immediately
      const isInitialPaid = (newOrder.status || 'new') === 'paid';
      if (isInitialPaid && newOrder.items) {
        for (const item of newOrder.items) {
          try {
            await adminDbQuery({
              action: 'rpc',
              name: 'adjust_product_stock',
              data: {
                p_product_id: String(item.id),
                p_type: 'sale_online',
                p_quantity_change: -item.quantity,
                p_notes: `Списание по онлайн-заказу (создан как Оплачен)`
              }
            });
          } catch (stockErr) {
            console.error("Failed to deduct stock for new paid order", item.id, stockErr);
          }
        }
      }

      setIsCreating(false);
      setNewOrder({ channel: 'phone', status: 'new', items: [], payment_method: 'cash', payment_status: 'unpaid' });
      setCustomerPhone('');
      setInstagramNick('');
      setTelegramNick('');
      setPickupNote('');
      setContactMode('phone');
      setFoundCustomer(null);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении заказа");
    }
  };

  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const updateOrderStatus = async (id: number, newStatus: string) => {
    if (updatingOrderId === id) return; // Prevent double-click
    setUpdatingOrderId(id);

    try {
      const order = orders.find(o => o.id === id);
      const oldStatus = order ? order.status : 'new';

      // Try full payload first (with payment_status), fallback to status-only
      try {
        const updatePayload: Record<string, any> = { status: newStatus };
        if (newStatus === 'paid') {
          updatePayload.payment_status = 'paid';
        }
        await adminDbQuery({
          action: 'update',
          table: 'orders',
          data: updatePayload,
          id
        });
      } catch (e: any) {
        // Fallback: payment_status column may not exist in Supabase
        console.warn("Full update failed, retrying with status only:", e);
        await adminDbQuery({
          action: 'update',
          table: 'orders',
          data: { status: newStatus },
          id
        });
      }
      
      // Update LTV in CRM if paid
      if (newStatus === 'paid' && order && order.customer_id && order.status !== 'paid') {
        try {
          const { data: custData } = await adminDbQuery({
            action: 'select',
            table: 'offline_customers',
            filters: { id: order.customer_id }
          });
          
          if (custData && custData[0]) {
            const newSpent = (custData[0].total_spent || 0) + Number(order.total);
            await adminDbQuery({
              action: 'update',
              table: 'offline_customers',
              data: { total_spent: newSpent },
              id: order.customer_id
            });
          }
        } catch (ltvErr) {
          console.warn("LTV update failed (non-critical):", ltvErr);
        }
      }

      // Deduct stock if transitions to 'paid'
      if (newStatus === 'paid' && oldStatus !== 'paid' && order?.items) {
        for (const item of order.items) {
          try {
            await adminDbQuery({
              action: 'rpc',
              name: 'adjust_product_stock',
              data: {
                p_product_id: String(item.id),
                p_type: 'sale_online',
                p_quantity_change: -item.quantity,
                p_notes: `Списание по онлайн-заказу #${id}`
              }
            });
          } catch (stockErr) {
            console.error("Failed to deduct stock for product", item.id, stockErr);
          }
        }
      }

      // Restore stock if transitions from 'paid' to 'cancelled'
      if (oldStatus === 'paid' && newStatus === 'cancelled' && order?.items) {
        for (const item of order.items) {
          try {
            await adminDbQuery({
              action: 'rpc',
              name: 'adjust_product_stock',
              data: {
                p_product_id: String(item.id),
                p_type: 'correction',
                p_quantity_change: item.quantity,
                p_notes: `Возврат при отмене заказа #${id}`
              }
            });
          } catch (stockErr) {
            console.error("Failed to restore stock for product", item.id, stockErr);
          }
        }
      }

      // Only update UI AFTER server confirms success
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    } catch (e) {
      console.error("Failed to update status:", e);
      alert("Не удалось обновить статус заказа. Попробуйте ещё раз.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Helper to format date in Asia/Dushanbe timezone (GMT+5) as YYYY-MM-DD
  const getGmt5DateString = (date: Date) => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dushanbe',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch (err) {
      return date.toISOString().split('T')[0];
    }
  };

  // Filters & Search state
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Stats Period state
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'yesterday' | '7days' | '30days' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(getGmt5DateString(getCorrectNow()));

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filterStatus !== 'all' && o.status !== filterStatus) return false;
      if (filterChannel !== 'all' && (o.channel || 'website') !== filterChannel) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const phoneMatch = (o.phone || '').toLowerCase().includes(q);
        const idMatch = String(o.id).includes(q);
        const addressMatch = (o.delivery_address || '').toLowerCase().includes(q);
        const itemsMatch = Array.isArray(o.items) && o.items.some((i: OrderItem) => i.name.toLowerCase().includes(q));
        if (!phoneMatch && !idMatch && !addressMatch && !itemsMatch) return false;
      }
      return true;
    });
  }, [orders, filterStatus, filterChannel, searchQuery]);

  // Period Stats summary calculation
  const periodStats = useMemo(() => {
    const now = getCorrectNow();
    const todayGmt5 = getGmt5DateString(now);
    
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    const yesterdayGmt5 = getGmt5DateString(yesterday);

    const selectedOrders = orders.filter(o => {
      const orderDate = new Date(o.created_at);
      const orderGmt5 = getGmt5DateString(orderDate);

      if (statsPeriod === 'today') {
        return orderGmt5 === todayGmt5;
      }
      if (statsPeriod === 'yesterday') {
        return orderGmt5 === yesterdayGmt5;
      }
      if (statsPeriod === '7days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (statsPeriod === '30days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      if (statsPeriod === 'custom' && customDate) {
        return orderGmt5 === customDate;
      }
      return true;
    });

    const totalRevenue = selectedOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + Number(o.total || 0), 0);
    const inDelivery = selectedOrders.filter(o => o.status === 'delivering').length;
    const newCount = selectedOrders.filter(o => o.status === 'new').length;
    const paidCount = selectedOrders.filter(o => o.status === 'paid').length;

    let periodLabel = 'За сегодня';
    if (statsPeriod === 'yesterday') periodLabel = 'За вчера';
    if (statsPeriod === '7days') periodLabel = 'За 7 дней';
    if (statsPeriod === '30days') periodLabel = 'За 30 дней';
    if (statsPeriod === 'custom') periodLabel = `За ${new Date(customDate).toLocaleDateString('ru-RU')}`;

    return {
      count: selectedOrders.length,
      revenue: totalRevenue,
      inDelivery,
      newCount,
      paidCount,
      periodLabel
    };
  }, [orders, statsPeriod, customDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors" title="Назад в пульт управления">
              <ChevronRight size={18} className="text-slate-400 rotate-180" />
            </button>
          ) : (
            <a href="/admin" className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-sm" title="В пульт управления">
              <img src="/logo-square.webp" alt="TOJ" className="w-5 h-5 object-contain" />
            </a>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">АРМ Оператора</h1>
            <p className="text-slate-500 text-sm">Прием заказов и управление доставкой</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {onLogout && (
            <button
              onClick={onLogout}
              className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-3.5 py-2.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors shadow-sm text-sm"
              title="Выйти из системы"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Выйти</span>
            </button>
          )}
          <button 
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0"
            title="Обновить данные с базы"
          >
            <RefreshCw size={16} className={`text-slate-500 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm flex-1 md:flex-initial justify-center"
          >
            <Plus size={18} /> Создать заказ (Экспресс)
          </button>
        </div>
      </div>

      {isCreating ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Новый заказ</h2>
            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">
              <XCircle size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Client & Info */}
            <div className="space-y-5 lg:col-span-1">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Канал поступления</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CHANNEL_MAP).map(([k, v]) => (
                    <button 
                      key={k}
                      type="button"
                      onClick={() => {
                        setNewOrder(prev => ({ ...prev, channel: k as any }));
                        if (k === 'instagram') setContactMode('instagram');
                        else if (k === 'telegram') setContactMode('telegram');
                        else if (k === 'offline') setContactMode('pickup');
                        else setContactMode('phone');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        newOrder.channel === k ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50/60 rounded-2xl border border-slate-200 p-3.5 space-y-3">
                <label className="block text-xs font-semibold text-slate-500 uppercase">Контакты клиента</label>
                <p className="text-[11px] text-slate-400 -mt-2">Заполните всё, что известно — достаточно одного контакта.</p>

                <div>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-1"><Phone size={12} /> Телефон (звонки / WhatsApp)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="+992 900 00 00 00"
                      className="flex-1 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm px-3 py-2 outline-none"
                    />
                    <button type="button" onClick={handleClientLookup} title="Найти в CRM"
                      className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 rounded-xl flex items-center justify-center transition-colors">
                      <Search size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-pink-600 mb-1"><Instagram size={12} /> Instagram (ссылка или @ник)</label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center bg-white rounded-xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 overflow-hidden">
                      <span className="px-3 text-slate-400 font-bold text-sm bg-slate-50 border-r border-slate-200 py-2">@</span>
                      <input
                        type="text"
                        value={instagramNick.replace(/^@/, '')}
                        onChange={e => setInstagramNick(extractInstagramNick(e.target.value))}
                        placeholder="https://instagram.com/... или ник"
                        className="w-full text-sm px-3 py-2 outline-none"
                      />
                    </div>
                    <button type="button" onClick={handleClientLookup} title="Найти в CRM"
                      className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 rounded-xl flex items-center justify-center transition-colors">
                      <Search size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 mb-1"><Send size={12} /> Telegram (ссылка или @юзернейм)</label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center bg-white rounded-xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 overflow-hidden">
                      <span className="px-3 text-slate-400 font-bold text-sm bg-slate-50 border-r border-slate-200 py-2">@</span>
                      <input
                        type="text"
                        value={telegramNick.replace(/^@/, '')}
                        onChange={e => setTelegramNick(extractTelegramNick(e.target.value))}
                        placeholder="https://t.me/... или юзернейм"
                        className="w-full text-sm px-3 py-2 outline-none"
                      />
                    </div>
                    <button type="button" onClick={handleClientLookup} title="Найти в CRM"
                      className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 rounded-xl flex items-center justify-center transition-colors">
                      <Search size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 mb-1"><Store size={12} /> Заметка / самовывоз (необязательно)</label>
                  <input
                    type="text"
                    value={pickupNote}
                    onChange={e => setPickupNote(e.target.value)}
                    placeholder="Например: Самовывоз из аптеки / Алишер"
                    className="w-full rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm px-3 py-2 outline-none"
                  />
                </div>

                {foundCustomer && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm flex items-start gap-2">
                    <UserPlus size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{foundCustomer.name || 'Без имени'}</p>
                      <p className="text-emerald-600 text-xs">Клиент найден в CRM. Всего покупок: {foundCustomer.total_spent || 0} смн</p>
                    </div>
                  </div>
                )}
                {!foundCustomer && (customerPhone.length > 5 || instagramNick.length > 2 || telegramNick.length > 2 || pickupNote.length > 2) && (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><AlertCircle size={12}/> Новый клиент (будет создан профиль в CRM)</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Адрес доставки</label>
                <textarea 
                  value={newOrder.delivery_address || ''}
                  onChange={e => setNewOrder(prev => ({ ...prev, delivery_address: e.target.value }))}
                  placeholder="Район, Улица, Дом..."
                  rows={2}
                  className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            {/* Middle: Products */}
            <div className="space-y-5 lg:col-span-1">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Поиск товаров</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Название или код..."
                    className="w-full pl-9 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div className="h-[300px] overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50/50 space-y-1">
                {filteredProducts.slice(0, 15).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 hover:border-indigo-200 cursor-pointer" onClick={() => addToCart(p)}>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.price} смн
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          (p.stock_quantity || 0) < 5 
                            ? 'bg-red-50 text-red-600' 
                            : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          остаток: {p.stock_quantity || 0} шт
                        </span>
                      </p>
                    </div>
                    <Plus size={16} className="text-indigo-600" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Cart & Summary */}
            <div className="lg:col-span-1 bg-slate-50 rounded-xl p-5 flex flex-col h-full border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center justify-between">
                Корзина заказа
                <span className="bg-indigo-100 text-indigo-800 py-0.5 px-2 rounded-full text-xs">{newOrder.items?.length || 0}</span>
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {newOrder.items?.map(i => (
                  <div key={i.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 truncate">{i.name}</p>
                      <p className="text-xs text-slate-500">{i.price} × {i.quantity} = <span className="font-semibold text-slate-700">{i.price * i.quantity}</span> смн</p>
                    </div>
                    <button onClick={() => removeFromCart(i.id)} className="text-slate-400 hover:text-red-500 p-1">
                      <XCircle size={16} />
                    </button>
                  </div>
                ))}
                {!newOrder.items?.length && (
                  <div className="text-center py-10 text-slate-400 text-sm">Корзина пуста</div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium text-slate-600">Итого:</span>
                  <span className="text-2xl font-bold text-slate-900">{cartTotal} смн</span>
                </div>
                <button 
                  onClick={saveOrder}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium flex justify-center items-center gap-2 transition-colors"
                >
                  <Save size={18} /> Оформить заказ
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats Summary with Period Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                📊 Статистика: <span className="text-indigo-600">{periodStats.periodLabel}</span>
              </span>

              {/* Period selection tabs */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'today', label: 'Сегодня' },
                  { id: 'yesterday', label: 'Вчера' },
                  { id: '7days', label: '7 дней' },
                  { id: '30days', label: '30 дней' },
                  { id: 'custom', label: 'Выбрать дату' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setStatsPeriod(p.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      statsPeriod === p.id 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}

                {statsPeriod === 'custom' && (
                  <input 
                    type="date"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="text-xs py-0.5 px-2 rounded-lg border-slate-200 focus:ring-indigo-500 text-slate-700 bg-white ml-1"
                  />
                )}
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Заказов ({periodStats.periodLabel})</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{periodStats.count}</p>
              </div>
              <div className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500">Новые</p>
                <p className="text-2xl font-bold text-blue-600 mt-0.5">{periodStats.newCount}</p>
              </div>
              <div className="bg-amber-50/50 rounded-xl p-3.5 border border-amber-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">В доставке</p>
                <p className="text-2xl font-bold text-amber-600 mt-0.5">{periodStats.inDelivery}</p>
              </div>
              <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Выручка ({periodStats.periodLabel})</p>
                <p className="text-2xl font-bold text-emerald-700 mt-0.5">{periodStats.revenue} <span className="text-xs text-slate-400 font-normal">смн</span></p>
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Поиск по ID, телефону, адресу или названию товара..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <XCircle size={16} />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'new', label: '🟡 Новые' },
                  { id: 'delivering', label: '🚚 В доставке' },
                  { id: 'paid', label: '💰 Оплачены' },
                  { id: 'cancelled', label: '❌ Отмена' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filterStatus === tab.id 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Channel filter chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-medium mr-1">Канал:</span>
              <button
                onClick={() => setFilterChannel('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterChannel === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Все каналы
              </button>
              {Object.entries(CHANNEL_MAP).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFilterChannel(k)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterChannel === k ? 'bg-indigo-600 text-white' : `${v.color} hover:opacity-80`
                  }`}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Orders View: Distinct, framed cards with status accent and full product titles */}
          <div className="md:hidden space-y-5">
            {filteredOrders.map(order => {
              const ch = CHANNEL_MAP[order.channel || 'website'] || CHANNEL_MAP.website;
              const st = STATUS_MAP[order.status] || STATUS_MAP.new;
              const theme = STATUS_THEME[order.status] || STATUS_THEME.new;
              return (
                <div 
                  key={order.id}
                  className={`bg-white rounded-3xl border border-slate-200/90 shadow-md shadow-slate-200/60 overflow-hidden transition-all ${theme.accentBorder}`}
                >
                  {/* Card Header Bar with Status Gradient, Bold ID Pill, and Channel */}
                  <div className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 ${theme.headerBg}`}>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => openOrderModal(order)}
                        className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-sm tracking-tight flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                      >
                        #{order.id}
                        <Eye size={13} className="text-slate-300" />
                      </button>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                        <Clock size={12} className="text-slate-400 shrink-0" />
                        <span>{new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
                        <span className="text-slate-300">•</span>
                        <span>{new Date(order.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-2xs ${ch.color}`}>
                        {ch.icon} {ch.label}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Client Contact Info */}
                    <div className="text-xs">
                      {(() => {
                        const parsed = parseOrderContact(order.phone, order.channel);
                        return (
                          <div className="space-y-1">
                            {parsed.phone && (
                              <div className="flex items-center gap-2">
                                <a 
                                  href={`tel:${parsed.phone.replace(/[^\d+]/g, '')}`}
                                  className="font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-1.5 text-sm"
                                >
                                  <Phone size={13} className="text-slate-400 shrink-0" />
                                  {parsed.phone}
                                </a>
                                {parsed.rawDigits && parsed.rawDigits.length >= 5 && (
                                  <a
                                    href={`https://wa.me/${parsed.rawDigits}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="p-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                    title="Написать в WhatsApp"
                                  >
                                    <MessageCircle size={13} />
                                  </a>
                                )}
                              </div>
                            )}
                            {parsed.instagram && (
                              <div>
                                <a
                                  href={`https://instagram.com/${parsed.instagram}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-pink-600 hover:underline"
                                >
                                  <Instagram size={12} className="shrink-0" /> @{parsed.instagram}
                                </a>
                              </div>
                            )}
                            {parsed.telegram && (
                              <div>
                                <a
                                  href={`https://t.me/${parsed.telegram}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline"
                                >
                                  <Send size={12} className="shrink-0" /> @{parsed.telegram}
                                </a>
                              </div>
                            )}
                            {parsed.isPickup && parsed.pickupNote && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Store size={12} className="text-amber-600 shrink-0" /> {parsed.pickupNote}
                              </span>
                            )}
                            {!parsed.phone && !parsed.instagram && !parsed.telegram && !parsed.pickupNote && (
                              <span className="font-medium text-slate-500">{parsed.raw || 'Номер не указан'}</span>
                            )}
                            {order.delivery_address && (
                              <p className="text-[11px] text-slate-500 break-words mt-1">📍 {order.delivery_address}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Order Items (Состав заказа) with full product names */}
                    {(() => {
                      const orderItems = getOrderItems(order);
                      if (orderItems.length === 0) return null;
                      const isExpanded = !!expandedOrderItems[order.id];
                      const visibleItems = isExpanded ? orderItems : orderItems.slice(0, 4);

                      return (
                        <div className="bg-slate-50/90 rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5 text-indigo-700">
                              <Package size={14} className="text-indigo-600 shrink-0" /> 
                              Товары в заказе ({orderItems.length} поз.)
                            </span>
                            <span className="text-slate-500 font-bold normal-case">
                              {orderItems.reduce((s: number, i: OrderItem) => s + (i.quantity || 1), 0)} шт.
                            </span>
                          </div>

                          <div className="space-y-2 divide-y divide-slate-100">
                            {visibleItems.map((item: OrderItem, itemIdx: number) => (
                              <div key={itemIdx} className={`flex items-start justify-between gap-2.5 ${itemIdx > 0 ? 'pt-2' : ''}`}>
                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                  <span className="w-5 h-5 rounded-md bg-indigo-100/80 text-indigo-700 font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                    {itemIdx + 1}
                                  </span>
                                  <span className="font-bold text-slate-900 text-[13px] sm:text-sm break-words flex-1 leading-snug">
                                    {item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 pl-1 pt-0.5">
                                  <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded-lg text-xs">
                                    ×{item.quantity}
                                  </span>
                                  <span className="font-bold text-slate-800 text-xs whitespace-nowrap">
                                    {item.price * item.quantity} с.
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {orderItems.length > 4 && (
                            <button
                              type="button"
                              onClick={() => setExpandedOrderItems(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 pt-2 flex items-center gap-1 w-full justify-center transition-colors border-t border-slate-200/60"
                            >
                              {isExpanded ? (
                                <>Свернуть <ChevronUp size={13} /></>
                              ) : (
                                <>Показать все {orderItems.length} товаров (+{orderItems.length - 4}) <ChevronDown size={13} /></>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Card Footer Bar */}
                  <div className="px-4 py-3 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">К оплате:</span>
                      <span className="text-lg font-black text-slate-900 tracking-tight">{order.total} смн</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select 
                        value={order.status || 'new'}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        disabled={updatingOrderId === order.id}
                        className={`text-xs font-bold px-2.5 py-2 rounded-xl border focus:outline-none cursor-pointer ${updatingOrderId === order.id ? 'opacity-50 cursor-wait' : ''} ${st.color}`}
                      >
                        <option value="new">🟡 Новый</option>
                        <option value="delivering">🚚 В доставке</option>
                        <option value="paid">💰 Оплачен</option>
                        <option value="cancelled">❌ Отменен</option>
                      </select>

                      <button 
                        type="button"
                        onClick={() => openOrderModal(order)}
                        className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-all shadow-xs"
                        title="Открыть карточку заказа"
                      >
                        <Eye size={13} /> Карточка
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && !loading && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                Заказов не найдено
              </div>
            )}
          </div>

          {/* Desktop Orders Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500">ID / Дата</th>
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500">Канал</th>
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500">Клиент / Адрес</th>
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500 min-w-[220px]">Товары в заказе</th>
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500">Сумма</th>
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500">Изменить статус</th>
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500 text-right">Быстрые действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map(order => {
                  const ch = CHANNEL_MAP[order.channel || 'website'] || CHANNEL_MAP.website;
                  const st = STATUS_MAP[order.status] || STATUS_MAP.new;
                  const orderItems = getOrderItems(order);
                  return (
                    <tr 
                      key={order.id} 
                      onClick={() => openOrderModal(order)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-5 align-top">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">#{order.id}</span>
                          <Eye size={14} className="text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('ru-RU')} {new Date(order.created_at).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}</p>
                      </td>
                      <td className="py-3.5 px-5 align-top">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${ch.color}`}>
                          {ch.icon} {ch.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 align-top max-w-xs">
                        {(() => {
                          const parsed = parseOrderContact(order.phone, order.channel);
                          if (!parsed.raw && !parsed.phone && !parsed.instagram && !parsed.telegram) {
                            return <p className="text-sm font-semibold text-slate-400">Номер не указан</p>;
                          }

                          return (
                            <div className="space-y-1">
                              {/* Phone if available */}
                              {parsed.phone && (
                                <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                  <Phone size={13} className="text-slate-400 shrink-0" />
                                  <span>{parsed.phone}</span>
                                </p>
                              )}

                              {/* Instagram nick if available */}
                              {parsed.instagram && (
                                <div>
                                  <a
                                    href={`https://instagram.com/${parsed.instagram}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-pink-600 hover:text-pink-700 hover:underline"
                                    title="Открыть Instagram"
                                  >
                                    <Instagram size={13} className="shrink-0" /> @{parsed.instagram}
                                  </a>
                                </div>
                              )}

                              {/* Telegram nick if available */}
                              {parsed.telegram && (
                                <div>
                                  <a
                                    href={`https://t.me/${parsed.telegram}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline"
                                    title="Открыть Telegram"
                                  >
                                    <Send size={13} className="shrink-0" /> @{parsed.telegram}
                                  </a>
                                </div>
                              )}

                              {/* Pickup note if available */}
                              {parsed.isPickup && parsed.pickupNote && (
                                <div className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  <Store size={12} className="shrink-0 text-amber-600" />
                                  <span className="truncate max-w-[200px]">{parsed.pickupNote}</span>
                                </div>
                              )}

                              {/* Fallback if no phone, no ig, no tg, no pickup note */}
                              {!parsed.phone && !parsed.instagram && !parsed.telegram && !parsed.pickupNote && (
                                <p className="text-sm font-semibold text-slate-900">{parsed.raw}</p>
                              )}

                              {order.delivery_address && (
                                <p className="text-[11px] text-slate-500 mt-1 break-words">📍 {order.delivery_address}</p>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-5 align-top max-w-sm">
                        {orderItems.length > 0 ? (
                          <div className="space-y-1.5">
                            {orderItems.map((i, idx) => (
                              <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                                <span className="font-bold text-slate-900 break-words flex-1 leading-snug">
                                  {idx + 1}. {i.name}
                                </span>
                                <span className="font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                                  ×{i.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Нет товаров</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 align-top">
                        <p className="text-sm font-extrabold text-slate-900">{order.total} смн</p>
                      </td>
                      <td className="py-3.5 px-5 align-top" onClick={e => e.stopPropagation()}>
                        {/* Direct dropdown for instant status change */}
                        <select 
                          value={order.status || 'new'}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          disabled={updatingOrderId === order.id}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${updatingOrderId === order.id ? 'opacity-50 cursor-wait' : ''} ${st.color}`}
                        >
                          <option value="new">🟡 Новый / В работе</option>
                          <option value="delivering">🚚 В доставке</option>
                          <option value="paid">💰 Оплата получена</option>
                          <option value="cancelled">❌ Отменен</option>
                        </select>
                        {updatingOrderId === order.id && (
                          <p className="text-[10px] text-indigo-500 mt-1 animate-pulse">Сохранение...</p>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right align-top" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openOrderModal(order); }}
                            title="Открыть детали заказа"
                            className="px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all"
                          >
                            <Eye size={13} /> Карточка
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'delivering'); }}
                            disabled={updatingOrderId === order.id}
                            title="Перевести в Доставку"
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all ${
                              updatingOrderId === order.id ? 'opacity-50 cursor-wait' :
                              order.status === 'delivering' 
                                ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            <Truck size={13} /> Доставка
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'paid'); }}
                            disabled={updatingOrderId === order.id}
                            title="Отметить как Оплачен"
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all ${
                              updatingOrderId === order.id ? 'opacity-50 cursor-wait' :
                              order.status === 'paid' 
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            <CheckCircle size={13} /> Оплата
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">Заказов пока нет</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* Detailed Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  #{selectedOrder.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">Заказ #{selectedOrder.id}</h3>
                    {(() => {
                      const ch = CHANNEL_MAP[selectedOrder.channel || 'website'] || CHANNEL_MAP.website;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${ch.color}`}>
                          {ch.icon} {ch.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(selectedOrder.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })} в {new Date(selectedOrder.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              
              {/* Grid 2 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Col: Customer & Payment */}
                <div className="space-y-4">
                  {/* Customer Card */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <User size={14} className="text-indigo-500" /> Информация о клиенте
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingContact(!isEditingContact)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Edit3 size={12} /> {isEditingContact ? 'Свернуть' : 'Изменить контакт'}
                      </button>
                    </div>

                    {isEditingContact ? (
                      <div className="space-y-2 pt-1 pb-1">
                        <div>
                          <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mb-1"><Phone size={12} /> Телефон</label>
                          <input
                            type="text"
                            value={editablePhone}
                            onChange={e => setEditablePhone(e.target.value)}
                            placeholder="+992 900 00 00 00"
                            className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-1 text-[11px] font-semibold text-pink-600 mb-1"><Instagram size={12} /> Instagram (ссылка или ник)</label>
                          <input
                            type="text"
                            value={editableIg}
                            onChange={e => setEditableIg(extractInstagramNick(e.target.value))}
                            placeholder="https://instagram.com/... или ник"
                            className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 mb-1"><Send size={12} /> Telegram (ссылка или юзернейм)</label>
                          <input
                            type="text"
                            value={editableTg}
                            onChange={e => setEditableTg(extractTelegramNick(e.target.value))}
                            placeholder="https://t.me/... или юзернейм"
                            className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        {(() => {
                          const contactToParse = selectedOrder.phone || '';
                          const parsed = parseOrderContact(contactToParse, selectedOrder.channel);

                          if (!parsed.raw && !parsed.phone && !parsed.instagram && !parsed.telegram) {
                            return <p className="font-semibold text-slate-400 text-base">Контакт не указан</p>;
                          }

                          return (
                            <div className="space-y-3">
                              {/* Phone Block */}
                              {parsed.phone && (
                                <div>
                                  <p className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                                    <Phone size={15} className="text-slate-400" /> {parsed.phone}
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    <a 
                                      href={`tel:${parsed.phone.replace(/[^0-9+]/g, '')}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold transition-colors"
                                    >
                                      <Phone size={13} /> Позвонить
                                    </a>
                                    {parsed.rawDigits.length >= 5 && (
                                      <a 
                                        href={`https://wa.me/${parsed.rawDigits}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                                      >
                                        <MessageCircle size={13} /> WhatsApp
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Instagram Block */}
                              {parsed.instagram && (
                                <div className={`${parsed.phone ? 'pt-2.5 border-t border-slate-200/60' : ''}`}>
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-bold text-pink-600 text-sm flex items-center gap-1.5">
                                      <Instagram size={15} /> @{parsed.instagram}
                                    </p>
                                    <a
                                      href={`https://instagram.com/${parsed.instagram}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-bold shadow-sm transition-all"
                                    >
                                      <Instagram size={13} /> Открыть в Instagram
                                    </a>
                                  </div>
                                </div>
                              )}

                              {/* Telegram Block */}
                              {parsed.telegram && (
                                <div className={`${parsed.phone ? 'pt-2.5 border-t border-slate-200/60' : ''}`}>
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-bold text-sky-600 text-sm flex items-center gap-1.5">
                                      <Send size={15} /> @{parsed.telegram}
                                    </p>
                                    <a
                                      href={`https://t.me/${parsed.telegram}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm transition-all"
                                    >
                                      <Send size={13} /> Открыть в Telegram
                                    </a>
                                  </div>
                                </div>
                              )}

                              {/* Pickup Block */}
                              {parsed.isPickup && (
                                <div className={`${parsed.phone ? 'pt-2.5 border-t border-slate-200/60' : ''}`}>
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                                    <Store size={14} className="text-amber-600" /> {parsed.pickupNote || 'Самовывоз из магазина'}
                                  </div>
                                </div>
                              )}

                              {/* Fallback text if none matched */}
                              {!parsed.phone && !parsed.instagram && !parsed.telegram && !parsed.isPickup && (
                                <p className="font-semibold text-slate-800 text-base">{parsed.raw}</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Delivery Address & Notes */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <MapPin size={14} className="text-amber-500" /> Доставка
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium">Адрес доставки:</label>
                      <input 
                        type="text"
                        value={editableAddress}
                        onChange={e => setEditableAddress(e.target.value)}
                        placeholder="Укажите адрес..."
                        className="w-full mt-1 text-xs py-1.5 px-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    {selectedOrder.delivery_notes && (
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium">Примечание к доставке:</span>
                        <p className="text-xs text-slate-700 bg-white p-2 rounded-xl border border-slate-100 mt-1">{selectedOrder.delivery_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Payment Details */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <CreditCard size={14} className="text-emerald-500" /> Оплата
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-slate-500">Способ оплаты:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedOrder.payment_method === 'card' ? '💳 Банковская карта' :
                         selectedOrder.payment_method === 'alif' ? '📲 Alif Моби' :
                         selectedOrder.payment_method === 'dc' ? '📲 Dushanbe City' :
                         selectedOrder.payment_method === 'transfer' ? '🏦 Перевод' : '💵 Наличные'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Статус оплаты:</span>
                      <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                        selectedOrder.payment_status === 'paid' || selectedOrder.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {selectedOrder.payment_status === 'paid' || selectedOrder.status === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
                      </span>
                    </div>
                  </div>

                  {/* Marketing & Attribution Details */}
                  {(selectedOrder.promocode || selectedOrder.utm_source || (selectedOrder.discount && Number(selectedOrder.discount) > 0)) ? (
                    <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-500">
                        <Globe size={14} /> Источник заказа и Маркетинг
                      </div>
                      
                      {selectedOrder.promocode && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Промокод:</span>
                          <span className="font-extrabold px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 font-outfit">
                            {selectedOrder.promocode}
                          </span>
                        </div>
                      )}

                      {selectedOrder.discount !== undefined && selectedOrder.discount !== null && Number(selectedOrder.discount) > 0 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Скидка по промокоду:</span>
                          <span className="font-extrabold text-red-600">
                            -{selectedOrder.discount} смн
                          </span>
                        </div>
                      )}

                      {selectedOrder.original_total && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Сумма без скидки:</span>
                          <span className="font-bold text-slate-700">
                            {selectedOrder.original_total} смн
                          </span>
                        </div>
                      )}

                      {(selectedOrder.utm_source || selectedOrder.utm_medium || selectedOrder.utm_campaign) && (
                        <div className="pt-2 border-t border-indigo-100/50 space-y-1.5 text-[11px]">
                          <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">UTM-метки:</p>
                          {selectedOrder.utm_source && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Источник (source):</span>
                              <span className="font-semibold text-slate-800">{selectedOrder.utm_source}</span>
                            </div>
                          )}
                          {selectedOrder.utm_medium && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Канал (medium):</span>
                              <span className="font-semibold text-slate-800">{selectedOrder.utm_medium}</span>
                            </div>
                          )}
                          {selectedOrder.utm_campaign && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Кампания (campaign):</span>
                              <span className="font-semibold text-slate-800">{selectedOrder.utm_campaign}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <Globe size={14} className="text-slate-500" /> Источник заказа
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Переход:</span>
                        <span className="font-semibold text-slate-800">
                          Прямой переход / Органический трафик с сайта
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Col: Status Control, Courier & Operator Notes */}
                <div className="space-y-4">
                  {/* Status Change Control */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Текущий статус</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${STATUS_MAP[selectedOrder.status]?.color || STATUS_MAP.new.color}`}>
                        {STATUS_MAP[selectedOrder.status]?.icon} {STATUS_MAP[selectedOrder.status]?.label}
                      </span>
                    </div>
                    <div className="pt-2 flex flex-wrap gap-2">
                      {[
                        { key: 'new', label: '🟡 Новый', color: 'hover:bg-blue-100 text-blue-700 bg-blue-50 border-blue-200' },
                        { key: 'delivering', label: '🚚 В доставку', color: 'hover:bg-amber-100 text-amber-700 bg-amber-50 border-amber-200' },
                        { key: 'paid', label: '💰 Оплачен', color: 'hover:bg-emerald-100 text-emerald-700 bg-emerald-50 border-emerald-200' },
                        { key: 'cancelled', label: '❌ Отмена', color: 'hover:bg-red-100 text-red-700 bg-red-50 border-red-200' },
                      ].map(st => (
                        <button
                          key={st.key}
                          disabled={updatingOrderId === selectedOrder.id}
                          onClick={async () => {
                            await updateOrderStatus(selectedOrder.id, st.key);
                            setSelectedOrder(prev => prev ? { ...prev, status: st.key } : null);
                          }}
                          className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-xl border transition-all ${st.color} ${
                            selectedOrder.status === st.key ? 'ring-2 ring-indigo-500 font-bold' : ''
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Courier & Operator Notes Input */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <Truck size={14} className="text-indigo-500" /> Назначение и заметки
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium">Имя курьера:</label>
                      <input 
                        type="text"
                        value={editableCourier}
                        onChange={e => setEditableCourier(e.target.value)}
                        placeholder="Укажите имя курьера..."
                        className="w-full mt-1 text-xs py-1.5 px-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium">Заметка оператора:</label>
                      <textarea 
                        rows={2}
                        value={editableNotes}
                        onChange={e => setEditableNotes(e.target.value)}
                        placeholder="Внутренние примечания..."
                        className="w-full mt-1 text-xs py-1.5 px-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white resize-none"
                      />
                    </div>
                    <button
                      onClick={saveOrderDetails}
                      disabled={isSavingDetails}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Save size={14} /> {isSavingDetails ? 'Сохранение...' : 'Сохранить курьера и заметки'}
                    </button>
                  </div>
                </div>

              </div>

              {/* Copilot (ИИ-Нутрициолог) Trigger & Schedule Card */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 p-3.5 rounded-2xl border border-emerald-100/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">ИИ-Нутрициолог (Copilot)</p>
                      <p className="text-[10px] text-slate-500">Схема приёма, совместимость и скрипт допродажи</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={runOrderCopilot}
                    disabled={copilotLoading || !selectedOrder.items?.length}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                  >
                    {copilotLoading ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Анализируем состав...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>{copilotResult ? 'Обновить схему' : 'Рассчитать схему приёма'}</span>
                      </>
                    )}
                  </button>
                </div>

                {copilotResult && copilotOpen && (
                  <div className="bg-slate-50/90 rounded-2xl p-4 border border-emerald-100 space-y-3.5 animate-in fade-in duration-200">
                    {/* Summary */}
                    <div className="text-xs text-slate-700 leading-relaxed font-medium bg-white p-3 rounded-xl border border-slate-100">
                      💡 <span className="font-bold text-slate-900">Заключение:</span> {copilotResult.summary}
                    </div>

                    {/* Schedule 3 cols */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
                          <Sunrise size={13} className="text-amber-600" /> 🌅 Утро
                        </div>
                        {copilotResult.schedule?.morning?.length > 0 ? (
                          copilotResult.schedule.morning.map((m: any, i: number) => (
                            <div key={i} className="text-[11px] bg-white/80 p-1.5 rounded-lg border border-amber-100">
                              <p className="font-bold text-slate-800">{m.product}</p>
                              <p className="text-amber-900">{m.dosage}</p>
                            </div>
                          ))
                        ) : <p className="text-[10px] text-slate-400 italic">Нет назначений</p>}
                      </div>

                      <div className="bg-orange-50/80 border border-orange-100 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-orange-800">
                          <Sun size={13} className="text-orange-600" /> ☀️ Обед
                        </div>
                        {copilotResult.schedule?.afternoon?.length > 0 ? (
                          copilotResult.schedule.afternoon.map((m: any, i: number) => (
                            <div key={i} className="text-[11px] bg-white/80 p-1.5 rounded-lg border border-orange-100">
                              <p className="font-bold text-slate-800">{m.product}</p>
                              <p className="text-orange-900">{m.dosage}</p>
                            </div>
                          ))
                        ) : <p className="text-[10px] text-slate-400 italic">Нет назначений</p>}
                      </div>

                      <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-800">
                          <Moon size={13} className="text-indigo-600" /> 🌙 Вечер
                        </div>
                        {copilotResult.schedule?.evening?.length > 0 ? (
                          copilotResult.schedule.evening.map((m: any, i: number) => (
                            <div key={i} className="text-[11px] bg-white/80 p-1.5 rounded-lg border border-indigo-100">
                              <p className="font-bold text-slate-800">{m.product}</p>
                              <p className="text-indigo-900">{m.dosage}</p>
                            </div>
                          ))
                        ) : <p className="text-[10px] text-slate-400 italic">Нет назначений</p>}
                      </div>
                    </div>

                    {/* Upsell Script */}
                    {copilotResult.upsell && (
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-xl border border-indigo-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-700 text-[11px] uppercase tracking-wide">
                            🚀 Допродажа: {copilotResult.upsell.recommended_product}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(copilotResult.upsell.operator_phone_script, 'modal_upsell')}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            {copiedKey === 'modal_upsell' ? <Check size={11} /> : <Copy size={11} />}
                            {copiedKey === 'modal_upsell' ? 'Скопировано!' : 'Скопировать фразу'}
                          </button>
                        </div>
                        <p className="text-slate-600 italic bg-white/80 p-2 rounded-lg border border-indigo-100/50">
                          «{copilotResult.upsell.operator_phone_script}»
                        </p>
                      </div>
                    )}

                    {/* WhatsApp Message */}
                    {copilotResult.whatsapp_message && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                        <span className="text-[11px] text-slate-500 font-medium">Готова схема приёма для клиента</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(copilotResult.whatsapp_message, 'modal_wa')}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            {copiedKey === 'modal_wa' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            {copiedKey === 'modal_wa' ? 'Скопировано' : 'Скопировать'}
                          </button>
                          {(() => {
                            const parsed = parseOrderContact(selectedOrder.phone, selectedOrder.channel);
                            if (parsed.rawDigits && parsed.rawDigits.length >= 5) {
                              return (
                                <a
                                  href={`https://wa.me/${parsed.rawDigits}?text=${encodeURIComponent(copilotResult.whatsapp_message)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                                >
                                  <MessageCircle size={12} /> В WhatsApp
                                </a>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Composition of Order */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Package size={16} className="text-indigo-600" /> Состав заказа ({editableItems.length} поз.)
                    </h4>
                    {isOrderCompositionChanged && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 animate-pulse">
                        Не сохранен
                      </span>
                    )}
                    {itemsSaveSuccess && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Check size={12} /> Сохранено!
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    {isOrderCompositionChanged ? (
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span>Было: <span className="line-through">{selectedOrder.total} смн</span></span>
                          <span className="text-slate-300">➔</span>
                          <span className="font-bold text-emerald-600 text-sm">Стало: {editedTotal} смн</span>
                        </div>
                        {editedDiscount > 0 && (
                          <span className="block text-[11px] font-semibold text-red-500">Скидка: -{editedDiscount} смн</span>
                        )}
                      </div>
                    ) : (
                      <div className="text-right">
                        {selectedOrder.discount && Number(selectedOrder.discount) > 0 && (
                          <span className="block text-xs font-semibold text-red-500">Скидка: -{selectedOrder.discount} смн</span>
                        )}
                        <span className="text-lg font-bold text-slate-900">Итого: {selectedOrder.total} смн</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Catalog Search & Quick Add to Order */}
                <div className="relative">
                  <div className="flex items-center gap-2 bg-slate-100/80 rounded-xl px-3 py-2 border border-slate-200/80 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                    <Search size={15} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={itemSearchQuery}
                      onChange={e => setItemSearchQuery(e.target.value)}
                      placeholder="Добавить товар в заказ: введите название или штрихкод..."
                      className="bg-transparent text-xs w-full outline-none placeholder:text-slate-400"
                    />
                    {itemSearchQuery && (
                      <button 
                        type="button"
                        onClick={() => setItemSearchQuery('')}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Search Autocomplete Dropdown */}
                  {itemSearchQuery.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-30 max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {matchingCatalogProducts.length > 0 ? (
                        matchingCatalogProducts.map(p => {
                          const inOrder = editableItems.find(i => String(i.id) === String(p.id));
                          return (
                            <div 
                              key={p.id}
                              onClick={() => addItemToOrder(p)}
                              className="p-2.5 px-3 flex items-center justify-between hover:bg-indigo-50/50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                {p.image_url ? (
                                  <img src={p.image_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-100 shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                    <Package size={14} />
                                  </div>
                                )}
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {p.barcode ? `Штрихкод: ${p.barcode} • ` : ''}В наличии: <strong className={p.stock_quantity && p.stock_quantity > 0 ? 'text-emerald-600' : 'text-amber-600'}>{p.stock_quantity || 0} шт</strong>
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-bold text-slate-900">{p.price} смн</span>
                                <button
                                  type="button"
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                                >
                                  <Plus size={12} /> {inOrder ? `+1 (в заказе ${inOrder.quantity})` : 'Добавить'}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400">
                          Товары не найдены по запросу «{itemSearchQuery}»
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="bg-slate-50/70 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                  {editableItems.map((item, idx) => (
                    <div key={item.id ? `${item.id}-${idx}` : idx} className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white transition-colors gap-2.5 sm:gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-sm sm:text-base break-words leading-snug">{item.name}</p>
                          <p className="text-[12px] font-semibold text-slate-500 mt-0.5">{item.price} смн / шт.</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-slate-100 sm:border-0 pl-8 sm:pl-0">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(idx, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                            title="Уменьшить на 1"
                          >
                            <Minus size={12} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 1) updateItemQuantity(idx, val);
                            }}
                            className="w-10 text-center font-bold text-xs text-slate-800 outline-none bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(idx, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                            title="Увеличить на 1"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Item Total */}
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm sm:w-20 text-right">
                          {item.price * item.quantity} смн
                        </span>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => removeItemFromOrder(idx)}
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                          title="Удалить позицию из заказа"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {editableItems.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      В заказе нет товаров. Воспользуйтесь поиском выше, чтобы добавить товары.
                    </div>
                  )}
                </div>

                {/* Action Save Bar if Composition Changed */}
                {isOrderCompositionChanged && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                    <div className="flex items-center gap-2 text-xs text-indigo-900">
                      <AlertCircle size={15} className="text-indigo-600 shrink-0" />
                      <span>Состав заказа изменен. Не забудьте сохранить!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={resetItemsToOriginal}
                        disabled={isSavingItems}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw size={12} /> Сбросить
                      </button>
                      <button
                        type="button"
                        onClick={saveOrderItems}
                        disabled={isSavingItems}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                      >
                        <Save size={13} /> {isSavingItems ? 'Сохранение...' : 'Сохранить состав заказа'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors"
              >
                Закрыть
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
