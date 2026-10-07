"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import B2BInvoiceTemplate, { B2BInvoiceProps } from '@/app/admin/components/print/B2BInvoiceTemplate';

export default function StandaloneInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<B2BInvoiceProps | null>(null);

  useEffect(() => {
    if (!orderId) return;

    async function fetchInvoice() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/b2b/invoice?id=${encodeURIComponent(orderId)}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Накладная не найдена');
        }

        setInvoiceData({
          orderId: json.order.id,
          createdAt: json.order.created_at,
          pharmacy: json.pharmacy,
          items: json.items,
          subtotal: json.subtotal,
          discountPercent: json.discountPercent,
          discountAmount: json.discountAmount,
          finalTotal: json.finalTotal,
          notes: json.order.notes,
          deliveryDate: json.order.delivery_date,
          isStandalone: true,
          onClose: () => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              router.push('/b2b');
            }
          }
        });
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки накладной');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoice();
  }, [orderId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
        <p className="text-slate-600 font-bold text-sm">Загрузка электронной накладной...</p>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-lg text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Накладная недоступна</h2>
            <p className="text-xs text-slate-500 mt-1">{error || 'Указанный заказ не найден в базе данных.'}</p>
          </div>
          <button
            onClick={() => router.push('/b2b')}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Перейти в B2B портал</span>
          </button>
        </div>
      </div>
    );
  }

  return <B2BInvoiceTemplate {...invoiceData} />;
}
