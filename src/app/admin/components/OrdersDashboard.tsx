"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { adminDbQuery } from '@/lib/admin-api';
import { ChevronLeft, Clock, Package, CheckCircle, Truck, ChevronRight } from 'lucide-react';

import { Order, OrderItem } from '@/lib/types';

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode; next?: string }> = {
  new: { label: 'Новый', color: 'bg-blue-50 text-blue-600', icon: <Clock size={14} />, next: 'processing' },
  processing: { label: 'В работе', color: 'bg-amber-50 text-amber-600', icon: <Package size={14} />, next: 'delivered' },
  delivered: { label: 'Доставлен', color: 'bg-emerald-50 text-emerald-600', icon: <Truck size={14} />, next: 'completed' },
  completed: { label: 'Завершён', color: 'bg-slate-50 text-slate-500', icon: <CheckCircle size={14} /> },
};

export const OrdersDashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try {
      const { data } = await adminDbQuery({
        action: 'select',
        table: 'orders',
        data: { order: { column: 'created_at', ascending: false } }
      });
      if (data) setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  const updateStatus = async (orderId: number, newStatus: string) => {
    await adminDbQuery({
      action: 'update',
      table: 'orders',
      data: { status: newStatus },
      id: orderId
    });
    loadOrders();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total), 0);
  const newOrders = orders.filter(o => o.status === 'new').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
          <ChevronLeft size={18} className="text-slate-400" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Заказы</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Всего заказов</p>
          <p className="text-3xl font-bold text-slate-800">{orders.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Новые</p>
          <p className="text-3xl font-bold text-blue-600">{newOrders}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Выручка</p>
          <p className="text-3xl font-bold text-slate-800">{totalRevenue} <span className="text-sm font-medium text-slate-400">смн</span></p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.length === 0 && (
          <div className="text-center py-16 text-slate-300">
            <Package size={40} className="mx-auto mb-3" />
            <p className="font-medium">Заказов пока нет</p>
          </div>
        )}
        {orders.map(order => {
          const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.new;
          return (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
              className={`bg-white rounded-2xl border p-5 cursor-pointer transition-all ${
                selectedOrder?.id === order.id ? 'border-slate-800 shadow-md' : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-800">#{order.id}</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusInfo.color}`}>
                    {statusInfo.icon} {statusInfo.label}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">{formatDate(order.created_at)}</span>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {Array.isArray(order.items) ? order.items.map((i: OrderItem) => `${i.name} ×${i.quantity}`).join(', ') : 'Товары'}
                </p>
                <p className="font-bold text-slate-800">{order.total} смн</p>
              </div>

              {/* Expanded Details */}
              {selectedOrder?.id === order.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  {Array.isArray(order.items) && order.items.map((item: OrderItem, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{item.name} <span className="text-slate-400">×{item.quantity}</span></span>
                      <span className="font-semibold text-slate-800">{item.price * item.quantity} смн</span>
                    </div>
                  ))}

                  {statusInfo.next && (
                    <button
                      onClick={(e) => { e.stopPropagation(); updateStatus(order.id, statusInfo.next!); }}
                      className="w-full h-10 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 mt-2"
                    >
                      Перевести: {STATUS_MAP[statusInfo.next].label} <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
