"use client";

import React from 'react';
import PrintLayout from './PrintLayout';
import { numberToWordsRu } from '@/lib/numberToWords';

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

  return (
    <PrintLayout title={`Товарная накладная № ${docNumber}`} onClose={onClose}>
      <div className="text-slate-900 font-sans text-xs leading-relaxed">
        {/* Top Header / Company details */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  TOJ-VITAMIN DISTRIBUTION
                </span>
                <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded">
                  B2B PHARMA
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                ООО «Саховати Истаравшан» • Национальный фармацевтический дистрибьютор
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Официальные прямые контракты GLS Pharmaceuticals • Климатические склады: г. Худжанд, г. Душанбе
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-600">
              <p className="font-bold text-slate-900">Отдел оптовых продаж:</p>
              <p>Тел / WhatsApp: <span className="font-bold text-slate-900">+992 17 666 0707</span></p>
              <p>Email: <span className="font-medium">b2b@tojvitamin.tj</span></p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-6">
          <h1 className="text-xl font-black uppercase tracking-wide text-slate-950">
            ТОВАРНАЯ НАКЛАДНАЯ № {docNumber}
          </h1>
          <p className="text-xs font-semibold text-slate-600 mt-1">
            от {formattedDate}
          </p>
        </div>

        {/* Parties Box */}
        <div className="bg-slate-50/80 border border-slate-300 rounded-lg p-3.5 mb-6 space-y-2 text-xs">
          <div className="flex">
            <span className="font-bold w-36 shrink-0 text-slate-700">Поставщик:</span>
            <div className="flex-1 font-semibold text-slate-900">
              ООО «Саховати Истаравшан» (TOJ-VITAMIN DISTRIBUTION), РТ, г. Худжанд / г. Душанбе, тел: +992 17 666 0707
            </div>
          </div>
          <div className="flex border-t border-slate-200/80 pt-2">
            <span className="font-bold w-36 shrink-0 text-slate-700">Покупатель (Аптека):</span>
            <div className="flex-1 text-slate-900">
              <span className="font-black text-sm">{pharmacy.name || 'Оптовый покупатель'}</span>
              {pharmacy.phone && (
                <span className="ml-2 font-semibold text-slate-700">| Тел: {pharmacy.phone}</span>
              )}
              {pharmacy.contact_person && (
                <span className="ml-2 text-slate-600">| Контакт: {pharmacy.contact_person}</span>
              )}
            </div>
          </div>
          {pharmacy.address && (
            <div className="flex border-t border-slate-200/80 pt-2">
              <span className="font-bold w-36 shrink-0 text-slate-700">Адрес доставки:</span>
              <div className="flex-1 font-semibold text-slate-800">
                {pharmacy.address}
              </div>
            </div>
          )}
          <div className="flex border-t border-slate-200/80 pt-2 text-[11px] text-slate-600">
            <span className="font-bold w-36 shrink-0 text-slate-700">Основание / Прим.:</span>
            <div className="flex-1">
              Оптовый заказ №{shortId}
              {formattedDeliveryDate ? ` • Дата отгрузки: ${formattedDeliveryDate}` : ''}
              {notes ? ` • Примечание: "${notes}"` : ''}
            </div>
          </div>
        </div>

        {/* Products Table */}
        <table className="w-full mb-5 border-collapse border border-slate-400 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-400">
              <th className="border border-slate-400 p-2 text-center w-10">№</th>
              <th className="border border-slate-400 p-2 text-left">Наименование товара и форма выпуска</th>
              <th className="border border-slate-400 p-2 text-center w-14">Ед.</th>
              <th className="border border-slate-400 p-2 text-center w-16">Кол-во</th>
              <th className="border border-slate-400 p-2 text-right w-24">Цена (TJS)</th>
              <th className="border border-slate-400 p-2 text-right w-28">Сумма (TJS)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const lineTotal = Math.round((Number(item.quantity) * Number(item.price)) * 100) / 100;
              return (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="border border-slate-400 p-1.5 text-center text-slate-600">{idx + 1}</td>
                  <td className="border border-slate-400 p-1.5 font-medium text-slate-900">{item.name}</td>
                  <td className="border border-slate-400 p-1.5 text-center text-slate-600">шт</td>
                  <td className="border border-slate-400 p-1.5 text-center font-bold text-slate-950">{item.quantity}</td>
                  <td className="border border-slate-400 p-1.5 text-right font-medium text-slate-800">
                    {formatMoney(item.price)}
                  </td>
                  <td className="border border-slate-400 p-1.5 text-right font-bold text-slate-950">
                    {formatMoney(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {/* Subtotal row */}
            <tr className="font-semibold text-slate-700 bg-slate-50 border-t-2 border-slate-400">
              <td colSpan={3} className="border border-slate-400 p-2 text-right">Подитог (без скидки):</td>
              <td className="border border-slate-400 p-2 text-center font-bold">{totalQuantity} шт</td>
              <td className="border border-slate-400 p-2"></td>
              <td className="border border-slate-400 p-2 text-right font-bold">{formatMoney(subtotal)}</td>
            </tr>

            {/* Discount row if applicable */}
            {discountPercent > 0 && (
              <tr className="font-semibold text-emerald-800 bg-emerald-50/60">
                <td colSpan={5} className="border border-slate-400 p-2 text-right">
                  Индивидуальная скидка ({discountPercent}%):
                </td>
                <td className="border border-slate-400 p-2 text-right font-bold text-emerald-800">
                  - {formatMoney(discountAmount)}
                </td>
              </tr>
            )}

            {/* Total Row */}
            <tr className="font-black text-sm bg-slate-100 text-slate-950 border-t-2 border-slate-900">
              <td colSpan={5} className="border border-slate-400 p-2.5 text-right uppercase tracking-wider">
                ВСЕГО К ОПЛАТЕ:
              </td>
              <td className="border border-slate-400 p-2.5 text-right text-base text-slate-950 font-black">
                {formatMoney(finalTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Text Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 space-y-1.5">
          <p className="text-xs">
            <span className="font-bold text-slate-700">Всего отпущено наименований:</span>{' '}
            <strong className="text-slate-950">{items.length}</strong> (общим количеством{' '}
            <strong className="text-slate-950">{totalQuantity} шт</strong>) на сумму{' '}
            <strong className="text-slate-950">{formatMoney(finalTotal)}</strong>.
          </p>
          <div className="text-xs pt-1">
            <span className="font-bold text-slate-700">Сумма прописью: </span>
            <span className="font-bold italic text-slate-950 underline decoration-slate-400 underline-offset-4">
              {numberToWordsRu(finalTotal)}
            </span>
          </div>
        </div>

        {/* Signatures & Seal */}
        <div className="mt-12 pt-6 border-t border-slate-400">
          <div className="grid grid-cols-2 gap-12 text-xs">
            {/* Supplier Signature */}
            <div className="space-y-6">
              <p className="font-bold uppercase tracking-wider text-[11px] text-slate-800">
                Отпустил (со склада Поставщика):
              </p>
              <div className="flex items-end gap-2">
                <span className="text-slate-500 w-24">Должность:</span>
                <span className="flex-1 border-b border-slate-800 font-semibold text-slate-800">
                  Заведующий складом / Экспедитор
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-slate-500 w-24">Подпись:</span>
                <span className="flex-1 border-b border-slate-800 h-5"></span>
                <span className="text-slate-500">/</span>
                <span className="flex-1 border-b border-slate-800 h-5"></span>
              </div>
              <div className="pt-2 text-slate-400 font-bold text-[10px]">
                М. П. (Место для печати Поставщика)
              </div>
            </div>

            {/* Customer Signature */}
            <div className="space-y-6">
              <p className="font-bold uppercase tracking-wider text-[11px] text-slate-800">
                Принял (представитель Аптеки):
              </p>
              <div className="flex items-end gap-2">
                <span className="text-slate-500 w-24">Должность:</span>
                <span className="flex-1 border-b border-slate-800 font-semibold text-slate-800">
                  Фармацевт / Зав. аптекой
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-slate-500 w-24">Подпись:</span>
                <span className="flex-1 border-b border-slate-800 h-5"></span>
                <span className="text-slate-500">/</span>
                <span className="flex-1 border-b border-slate-800 h-5"></span>
              </div>
              <div className="pt-2 text-slate-400 font-bold text-[10px]">
                М. П. (Место для печати Покупателя)
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
            Претензии по количеству и целостности упаковок принимаются в момент приема-передачи товара.
          </div>
        </div>
      </div>
    </PrintLayout>
  );
}
