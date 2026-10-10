"use client";

import React, { useState } from 'react';
import PrintLayout from './PrintLayout';
import { numberToWordsRu } from '@/lib/numberToWords';
import { Copy, Check, MessageSquare, ExternalLink } from 'lucide-react';

export interface B2BInvoiceItem {
  product_id?: string | number;
  name: string;
  quantity: number;
  price: number; // цена за единицу
}

export interface B2BInvoicePharmacy {
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  discount_percent?: number;
}

export interface B2BInvoiceProps {
  orderId: string;
  createdAt?: string;
  pharmacy: B2BInvoicePharmacy;
  items: B2BInvoiceItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  finalTotal: number;
  notes?: string;
  deliveryDate?: string | null;
  onClose?: () => void;
  isStandalone?: boolean;
}

export default function B2BInvoiceTemplate({
  orderId,
  createdAt,
  pharmacy,
  items,
  subtotal,
  discountPercent,
  discountAmount,
  finalTotal,
  notes,
  deliveryDate,
  onClose,
  isStandalone = false
}: B2BInvoiceProps) {
  const [copied, setCopied] = useState(false);
  const shortId = orderId ? orderId.slice(0, 8).toUpperCase() : '00000000';
  const docNumber = `ТН-B2B-${shortId}`;

  const formattedDate = new Date(createdAt || Date.now()).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedDeliveryDate = deliveryDate
    ? new Date(deliveryDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const formatMoney = (amount: number) => {
    return (Number(amount) || 0).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' TJS';
  };

  const totalQuantity = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

  // Link for electronic invoice
  const getInvoiceUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/b2b/invoice/${orderId}`;
    }
    return `https://www.toj-vitamin.tj/b2b/invoice/${orderId}`;
  };

  const handleCopyLink = () => {
    const url = getInvoiceUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = (pharmacy.phone || '').replace(/[^0-9]/g, '');
    const url = getInvoiceUrl();
    const msg = `Здравствуйте! Товарная накладная № ${docNumber} для аптеки "${pharmacy.name}" готова к отгрузке.\n\nСумма: ${formatMoney(finalTotal)}\nЭлектронная накладная: ${url}\n\nПожалуйста, подтвердите получение.`;
    
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const customActions = (
    <>
      <button
        type="button"
        onClick={handleCopyLink}
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer"
        title="Скопировать прямую ссылку на накладную"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 font-bold">Ссылка скопирована!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-slate-500" />
            <span>Скопировать ссылку</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleShareWhatsApp}
        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer"
        title="Отправить накладную в WhatsApp"
      >
        <MessageSquare className="w-4 h-4 text-emerald-600" />
        <span className="hidden sm:inline">В WhatsApp</span>
      </button>
    </>
  );

  return (
    <PrintLayout
      title={`Товарная накладная № ${docNumber}`}
      subtitle={`Заказ № ${shortId} от ${formattedDate}`}
      onClose={onClose}
      actions={customActions}
    >
      <div className="text-slate-900 font-sans text-[10px] leading-tight print:text-[9.5px]">
        {/* Compact Header */}
        <div className="border-b-2 border-slate-900 pb-1.5 mb-2 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black tracking-tight text-slate-950 uppercase">
                TOJ-VITAMIN DISTRIBUTION
              </span>
              <span className="text-[9px] bg-slate-900 text-white font-extrabold px-1.5 py-0.5 rounded leading-none">
                B2B PHARMA
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-700 mt-0.5">
              ООО «Саховати Истаравшан» • Национальный дистрибьютор GLS Pharmaceuticals
            </p>
          </div>
          <div className="text-right text-[10px] text-slate-600 leading-tight">
            <p><span className="font-bold text-slate-900">Оптовый отдел: </span><span className="font-bold text-slate-950">+992 17 666 0707</span></p>
            <p>Email: <span className="font-medium text-slate-700">b2b@tojvitamin.tj</span></p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-2">
          <h1 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-950 inline-block">
            ТОВАРНАЯ НАКЛАДНАЯ № {docNumber}
          </h1>
          <span className="text-xs font-semibold text-slate-600 ml-2">
            от {formattedDate}
          </span>
        </div>

        {/* Parties Box */}
        <div className="bg-slate-50/90 border border-slate-300 rounded p-2 mb-2 space-y-1 text-[10px] leading-tight">
          <div className="flex">
            <span className="font-bold w-24 shrink-0 text-slate-700">Поставщик:</span>
            <div className="flex-1 font-semibold text-slate-900">
              ООО «Саховати Истаравшан» (TOJ-VITAMIN DISTRIBUTION), РТ, г. Худжанд / г. Душанбе, тел: +992 17 666 0707
            </div>
          </div>
          <div className="flex border-t border-slate-200/80 pt-1">
            <span className="font-bold w-24 shrink-0 text-slate-700">Покупатель:</span>
            <div className="flex-1 text-slate-900">
              <strong className="font-black text-slate-950">{pharmacy.name || 'Оптовый покупатель'}</strong>
              {pharmacy.phone && (
                <span className="ml-2 font-semibold text-slate-700">| Тел: {pharmacy.phone}</span>
              )}
              {pharmacy.contact_person && (
                <span className="ml-2 text-slate-600">| Контакт: {pharmacy.contact_person}</span>
              )}
              {pharmacy.address && (
                <span className="ml-2 text-slate-700">| Адрес: {pharmacy.address}</span>
              )}
            </div>
          </div>
          {(notes || formattedDeliveryDate) && (
            <div className="flex border-t border-slate-200/80 pt-1 text-[9.5px] text-slate-600">
              <span className="font-bold w-24 shrink-0 text-slate-700">Основание:</span>
              <div className="flex-1">
                Оптовый заказ №{shortId}
                {formattedDeliveryDate ? ` • Дата отгрузки: ${formattedDeliveryDate}` : ''}
                {notes ? ` • Прим.: "${notes}"` : ''}
              </div>
            </div>
          )}
        </div>

        {/* Products Table */}
        <table className="w-full mb-2 border-collapse border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <th className="border border-slate-400 py-1 px-1.5 text-center w-7">№</th>
              <th className="border border-slate-400 py-1 px-1.5 text-left">Наименование товара и форма выпуска</th>
              <th className="border border-slate-400 py-1 px-1 text-center w-8">Ед.</th>
              <th className="border border-slate-400 py-1 px-1.5 text-center w-12">Кол-во</th>
              <th className="border border-slate-400 py-1 px-2 text-right w-20">Цена (TJS)</th>
              <th className="border border-slate-400 py-1 px-2 text-right w-24">Сумма (TJS)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const lineTotal = Math.round((Number(item.quantity) * Number(item.price)) * 100) / 100;
              return (
                <tr key={idx} className="hover:bg-slate-50/50" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <td className="border border-slate-400 py-0.5 px-1 text-center text-slate-600">{idx + 1}</td>
                  <td className="border border-slate-400 py-0.5 px-1.5 font-medium text-slate-900 leading-tight">{item.name}</td>
                  <td className="border border-slate-400 py-0.5 px-1 text-center text-slate-600">шт</td>
                  <td className="border border-slate-400 py-0.5 px-1 text-center font-bold text-slate-950">{item.quantity}</td>
                  <td className="border border-slate-400 py-0.5 px-2 text-right font-medium text-slate-800">
                    {formatMoney(item.price)}
                  </td>
                  <td className="border border-slate-400 py-0.5 px-2 text-right font-bold text-slate-950">
                    {formatMoney(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {/* Subtotal row */}
            <tr className="font-semibold text-slate-700 bg-slate-50 border-t-2 border-slate-400" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <td colSpan={3} className="border border-slate-400 py-1 px-2 text-right">
                {discountPercent > 0 && discountAmount > 0 ? 'Подитог (без скидки):' : 'Итого по позициям:'}
              </td>
              <td className="border border-slate-400 py-1 px-1 text-center font-bold">{totalQuantity} шт</td>
              <td className="border border-slate-400 py-1 px-2"></td>
              <td className="border border-slate-400 py-1 px-2 text-right font-bold">{formatMoney(subtotal)}</td>
            </tr>

            {/* Discount row if applicable and > 0 */}
            {discountPercent > 0 && discountAmount > 0 && (
              <tr className="font-semibold text-emerald-800 bg-emerald-50/60" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <td colSpan={5} className="border border-slate-400 py-1 px-2 text-right">
                  Индивидуальная скидка ({discountPercent}%):
                </td>
                <td className="border border-slate-400 py-1 px-2 text-right font-bold text-emerald-800">
                  - {formatMoney(discountAmount)}
                </td>
              </tr>
            )}

            {/* Total Row */}
            <tr className="font-black text-xs sm:text-sm bg-slate-100 text-slate-950 border-t-2 border-slate-900" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <td colSpan={5} className="border border-slate-400 py-1.5 px-2 text-right uppercase tracking-wider">
                ВСЕГО К ОПЛАТЕ:
              </td>
              <td className="border border-slate-400 py-1.5 px-2 text-right text-xs sm:text-sm text-slate-950 font-black">
                {formatMoney(finalTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Text Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded p-2 mb-2 space-y-1 text-[10px] leading-tight" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <p>
            <span className="font-bold text-slate-700">Всего отпущено:</span>{' '}
            <strong className="text-slate-950">{items.length} наим.</strong> (общим количеством{' '}
            <strong className="text-slate-950">{totalQuantity} шт</strong>) на сумму{' '}
            <strong className="text-slate-950">{formatMoney(finalTotal)}</strong>.
          </p>
          <div>
            <span className="font-bold text-slate-700">Сумма прописью: </span>
            <span className="font-bold italic text-slate-950 underline decoration-slate-400 underline-offset-2">
              {numberToWordsRu(finalTotal)}
            </span>
          </div>
        </div>

        {/* Footnote */}
        <div className="text-center text-[9px] text-slate-400 border-t border-slate-200 pt-1" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          Претензии по количеству и качеству упаковок принимаются в момент приема-передачи товара.
        </div>
      </div>
    </PrintLayout>
  );
}
