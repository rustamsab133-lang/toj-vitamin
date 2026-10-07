"use client";

import React, { useState } from 'react';
import PrintLayout from './PrintLayout';
import { numberToWordsRu } from '@/lib/numberToWords';
import { FileText, Layers } from 'lucide-react';

export interface B2BInvoiceItem {
  product_id?: string | number;
  name: string;
  quantity: number;
  price: number; // базовая цена за единицу
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
  onClose: () => void;
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
  onClose
}: B2BInvoiceProps) {
  // If order has > 22 items, user can switch between multi-page standard and ultra-compact 1-page mode
  const [isCompact, setIsCompact] = useState<boolean>(items.length >= 22);

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

  // Density toggle actions in the top toolbar
  const densityActions = (
    <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
      <button
        type="button"
        onClick={() => setIsCompact(false)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
          !isCompact
            ? 'bg-white text-slate-900 shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Обычный шрифт, плавный перенос на 2 листа"
      >
        <Layers size={13} />
        <span>Стандартный {items.length > 20 ? '(многостраничный)' : ''}</span>
      </button>

      <button
        type="button"
        onClick={() => setIsCompact(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
          isCompact
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Компактный шрифт и отступы, чтобы уместить до 28-30 позиций на 1 лист"
      >
        <FileText size={13} />
        <span>Компактный (уместить на 1 лист)</span>
      </button>
    </div>
  );

  return (
    <PrintLayout title={`Товарная накладная № ${docNumber}`} onClose={onClose} actions={densityActions}>
      <div className={`text-slate-900 font-sans leading-tight ${isCompact ? 'text-[11px]' : 'text-xs'}`}>
        {/* Top Header / Company details */}
        <div className={`border-b-2 border-slate-900 ${isCompact ? 'pb-2.5 mb-3' : 'pb-4 mb-5'}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-black tracking-tight text-slate-900 uppercase ${isCompact ? 'text-base sm:text-lg' : 'text-xl'}`}>
                  TOJ-VITAMIN DISTRIBUTION
                </span>
                <span className="text-[9px] bg-slate-900 text-white font-bold px-1.5 py-0.5 rounded">
                  B2B PHARMA
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-700 mt-0.5">
                ООО «Саховати Истаравшан» • Национальный фармацевтический дистрибьютор в РТ
              </p>
              <p className="text-[9.5px] text-slate-500 mt-0.5">
                Официальные прямые контракты GLS Pharmaceuticals • Склады с термоконтролем: г. Худжанд, г. Душанбе
              </p>
            </div>
            <div className="text-right text-[10px] text-slate-600">
              <p className="font-bold text-slate-900">Оптовый отдел:</p>
              <p>Тел: <span className="font-bold text-slate-900">+992 17 666 0707</span></p>
              <p>Email: <span className="font-medium">b2b@tojvitamin.tj</span></p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className={`text-center ${isCompact ? 'my-3' : 'my-5'}`}>
          <h1 className={`font-black uppercase tracking-wide text-slate-950 ${isCompact ? 'text-base sm:text-lg' : 'text-xl'}`}>
            ТОВАРНАЯ НАКЛАДНАЯ № {docNumber}
          </h1>
          <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
            от {formattedDate}
          </p>
        </div>

        {/* Parties Box */}
        <div className={`bg-slate-50/80 border border-slate-300 rounded-lg p-3 ${isCompact ? 'mb-3 space-y-1.5 text-[10.5px]' : 'mb-5 space-y-2 text-xs'}`}>
          <div className="flex">
            <span className="font-bold w-32 shrink-0 text-slate-700">Поставщик:</span>
            <div className="flex-1 font-semibold text-slate-900">
              ООО «Саховати Истаравшан» (TOJ-VITAMIN DISTRIBUTION), РТ, г. Худжанд / г. Душанбе, тел: +992 17 666 0707
            </div>
          </div>
          <div className="flex border-t border-slate-200/80 pt-1.5">
            <span className="font-bold w-32 shrink-0 text-slate-700">Покупатель (Аптека):</span>
            <div className="flex-1 text-slate-900">
              <span className="font-black">{pharmacy.name || 'Оптовый покупатель'}</span>
              {pharmacy.phone && (
                <span className="ml-2 font-semibold text-slate-700">| Тел: {pharmacy.phone}</span>
              )}
              {pharmacy.contact_person && (
                <span className="ml-2 text-slate-600">| Контакт: {pharmacy.contact_person}</span>
              )}
            </div>
          </div>
          {pharmacy.address && (
            <div className="flex border-t border-slate-200/80 pt-1.5">
              <span className="font-bold w-32 shrink-0 text-slate-700">Адрес доставки:</span>
              <div className="flex-1 font-semibold text-slate-800">
                {pharmacy.address}
              </div>
            </div>
          )}
          <div className="flex border-t border-slate-200/80 pt-1 text-[10px] text-slate-600">
            <span className="font-bold w-32 shrink-0 text-slate-700">Основание / Прим.:</span>
            <div className="flex-1">
              Оптовый заказ №{shortId}
              {formattedDeliveryDate ? ` • Дата отгрузки: ${formattedDeliveryDate}` : ''}
              {notes ? ` • Примечание: "${notes}"` : ''}
            </div>
          </div>
        </div>

        {/* Products Table — Multi-page enabled */}
        <table className={`w-full border-collapse border border-slate-400 ${isCompact ? 'mb-3 text-[10px]' : 'mb-5 text-[11px]'}`}>
          <thead>
            <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
              <th className="border border-slate-400 py-1.5 px-1 text-center w-8">№</th>
              <th className="border border-slate-400 py-1.5 px-2 text-left">Наименование товара и форма выпуска</th>
              <th className="border border-slate-400 py-1.5 px-1 text-center w-12">Ед.</th>
              <th className="border border-slate-400 py-1.5 px-1 text-center w-14">Кол-во</th>
              <th className="border border-slate-400 py-1.5 px-2 text-right w-24">Цена (TJS)</th>
              <th className="border border-slate-400 py-1.5 px-2 text-right w-24">Сумма (TJS)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const lineTotal = Math.round((Number(item.quantity) * Number(item.price)) * 100) / 100;
              return (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className={`border border-slate-400 text-center text-slate-600 ${isCompact ? 'py-0.5 px-1' : 'py-1 px-1.5'}`}>
                    {idx + 1}
                  </td>
                  <td className={`border border-slate-400 font-medium text-slate-900 ${isCompact ? 'py-0.5 px-2' : 'py-1 px-2'}`}>
                    {item.name}
                  </td>
                  <td className={`border border-slate-400 text-center text-slate-600 ${isCompact ? 'py-0.5 px-1' : 'py-1 px-1'}`}>
                    шт
                  </td>
                  <td className={`border border-slate-400 text-center font-bold text-slate-950 ${isCompact ? 'py-0.5 px-1' : 'py-1 px-1'}`}>
                    {item.quantity}
                  </td>
                  <td className={`border border-slate-400 text-right font-medium text-slate-800 ${isCompact ? 'py-0.5 px-2' : 'py-1 px-2'}`}>
                    {formatMoney(item.price)}
                  </td>
                  <td className={`border border-slate-400 text-right font-bold text-slate-950 ${isCompact ? 'py-0.5 px-2' : 'py-1 px-2'}`}>
                    {formatMoney(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {/* Subtotal row */}
            <tr className="font-semibold text-slate-700 bg-slate-50 border-t-2 border-slate-400">
              <td colSpan={3} className="border border-slate-400 py-1.5 px-2 text-right font-bold">Подитог (без скидки):</td>
              <td className="border border-slate-400 py-1.5 px-1 text-center font-bold">{totalQuantity} шт</td>
              <td className="border border-slate-400 py-1.5 px-2"></td>
              <td className="border border-slate-400 py-1.5 px-2 text-right font-bold">{formatMoney(subtotal)}</td>
            </tr>

            {/* Discount row if applicable */}
            {discountPercent > 0 && (
              <tr className="font-semibold text-emerald-800 bg-emerald-50/60">
                <td colSpan={5} className="border border-slate-400 py-1.5 px-2 text-right">
                  Индивидуальная скидка ({discountPercent}%):
                </td>
                <td className="border border-slate-400 py-1.5 px-2 text-right font-bold text-emerald-800">
                  - {formatMoney(discountAmount)}
                </td>
              </tr>
            )}

            {/* Total Row */}
            <tr className="font-black bg-slate-100 text-slate-950 border-t-2 border-slate-900">
              <td colSpan={5} className="border border-slate-400 py-2 px-2 text-right uppercase tracking-wider text-xs">
                ВСЕГО К ОПЛАТЕ:
              </td>
              <td className="border border-slate-400 py-2 px-2 text-right text-sm text-slate-950 font-black">
                {formatMoney(finalTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Text Summary — Block kept together */}
        <div className={`bg-slate-50 border border-slate-200 rounded-lg p-2.5 summary-block keep-together ${isCompact ? 'mb-4 text-[10px]' : 'mb-6 text-xs'}`}>
          <p>
            <span className="font-bold text-slate-700">Всего отпущено наименований:</span>{' '}
            <strong className="text-slate-950">{items.length}</strong> (общим количеством{' '}
            <strong className="text-slate-950">{totalQuantity} шт</strong>) на сумму{' '}
            <strong className="text-slate-950">{formatMoney(finalTotal)}</strong>.
          </p>
          <div className="pt-1">
            <span className="font-bold text-slate-700">Сумма прописью: </span>
            <span className="font-bold italic text-slate-950 underline decoration-slate-400 underline-offset-4">
              {numberToWordsRu(finalTotal)}
            </span>
          </div>
        </div>

        {/* Signatures & Seal — Block kept together */}
        <div className={`border-t border-slate-400 signature-block keep-together ${isCompact ? 'mt-6 pt-4' : 'mt-10 pt-6'}`}>
          <div className="grid grid-cols-2 gap-8 text-[10.5px]">
            {/* Supplier Signature */}
            <div className="space-y-4">
              <p className="font-bold uppercase tracking-wider text-[10px] text-slate-800">
                Отпустил (со склада Поставщика):
              </p>
              <div className="flex items-end gap-1.5">
                <span className="text-slate-500 w-20 shrink-0">Должность:</span>
                <span className="flex-1 border-b border-slate-800 font-semibold text-slate-800">
                  Заведующий складом / Экспедитор
                </span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-slate-500 w-20 shrink-0">Подпись:</span>
                <span className="flex-1 border-b border-slate-800 h-4"></span>
                <span className="text-slate-500">/</span>
                <span className="flex-1 border-b border-slate-800 h-4"></span>
              </div>
              <div className="pt-1 text-slate-400 font-bold text-[9px]">
                М. П. (Место для печати Поставщика)
              </div>
            </div>

            {/* Customer Signature */}
            <div className="space-y-4">
              <p className="font-bold uppercase tracking-wider text-[10px] text-slate-800">
                Принял (представитель Аптеки):
              </p>
              <div className="flex items-end gap-1.5">
                <span className="text-slate-500 w-20 shrink-0">Должность:</span>
                <span className="flex-1 border-b border-slate-800 font-semibold text-slate-800">
                  Фармацевт / Зав. аптекой
                </span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-slate-500 w-20 shrink-0">Подпись:</span>
                <span className="flex-1 border-b border-slate-800 h-4"></span>
                <span className="text-slate-500">/</span>
                <span className="flex-1 border-b border-slate-800 h-4"></span>
              </div>
              <div className="pt-1 text-slate-400 font-bold text-[9px]">
                М. П. (Место для печати Покупателя)
              </div>
            </div>
          </div>

          <div className="mt-5 text-center text-[9px] text-slate-400 border-t border-slate-200 pt-2">
            Претензии по количеству и целостности упаковок принимаются в момент приема-передачи товара.
          </div>
        </div>
      </div>
    </PrintLayout>
  );
}
