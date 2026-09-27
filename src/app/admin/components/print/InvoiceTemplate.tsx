"use client";

import React from 'react';
import PrintLayout from './PrintLayout';

interface InvoiceTemplateProps {
  doc: {
    doc_number: string;
    created_at: string;
    notes?: string;
    items: { product_name: string; quantity: number; price: number; total: number }[];
    total_amount: number;
  };
  buyer?: { name: string; legal_name?: string; inn?: string; address?: string; phone?: string };
  companyName?: string;
  companyDetails?: string;
  onClose: () => void;
}

export default function InvoiceTemplate({ doc, buyer, companyName = "ТОЖ Витамин", companyDetails, onClose }: InvoiceTemplateProps) {
  const formattedDate = new Date(doc.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formatMoney = (amount: number) => amount.toLocaleString('ru-RU') + ' TJS';

  return (
    <PrintLayout title={`Счёт на оплату №${doc.doc_number}`} onClose={onClose}>
      <div className="text-sm">
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold mb-2">СЧЁТ НА ОПЛАТУ №{doc.doc_number}</h1>
          <div className="text-lg">от {formattedDate}</div>
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex">
            <span className="font-semibold w-32 shrink-0">Поставщик:</span>
            <div className="flex-1">
              <span className="font-bold">{companyName}</span>
              {companyDetails && <div className="mt-1 text-xs">{companyDetails}</div>}
            </div>
          </div>
          {buyer && (
            <div className="flex">
              <span className="font-semibold w-32 shrink-0">Покупатель:</span>
              <div className="flex-1">
                <span className="font-bold">{buyer.legal_name || buyer.name}</span>
                {buyer.inn && <span>, ИНН: {buyer.inn}</span>}
                {buyer.address && <span>, Адрес: {buyer.address}</span>}
                {buyer.phone && <span>, Тел: {buyer.phone}</span>}
              </div>
            </div>
          )}
        </div>

        <table className="w-full mb-6 border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-2 text-center w-12">№</th>
              <th className="border border-gray-400 p-2 text-left">Наименование</th>
              <th className="border border-gray-400 p-2 text-center w-20">Ед.изм.</th>
              <th className="border border-gray-400 p-2 text-center w-20">Кол-во</th>
              <th className="border border-gray-400 p-2 text-right w-28">Цена</th>
              <th className="border border-gray-400 p-2 text-right w-32">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, idx) => (
              <tr key={idx}>
                <td className="border border-gray-400 p-2 text-center">{idx + 1}</td>
                <td className="border border-gray-400 p-2">{item.product_name}</td>
                <td className="border border-gray-400 p-2 text-center">шт</td>
                <td className="border border-gray-400 p-2 text-center">{item.quantity}</td>
                <td className="border border-gray-400 p-2 text-right">{item.price.toLocaleString('ru-RU')}</td>
                <td className="border border-gray-400 p-2 text-right">{item.total.toLocaleString('ru-RU')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={5} className="border border-gray-400 p-2 text-right">ИТОГО:</td>
              <td className="border border-gray-400 p-2 text-right">{formatMoney(doc.total_amount)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mb-12 space-y-3">
          <p>
            <span className="font-semibold">Всего наименований {doc.items.length}, на сумму {formatMoney(doc.total_amount)}</span>
          </p>
          <div className="flex items-end pt-2">
            <span className="font-bold shrink-0 mr-2">Сумма прописью:</span>
            <span className="flex-1 border-b border-black h-4 inline-block"></span>
          </div>
        </div>

        {doc.notes && (
          <div className="mb-12">
            <span className="font-semibold">Примечание:</span> {doc.notes}
          </div>
        )}

        <div className="flex justify-between mt-16 pt-8">
          <div className="flex-1 flex">
            <span className="inline-block font-semibold w-32">Руководитель:</span>
            <span className="inline-block flex-1 max-w-[200px] border-b border-black"></span>
          </div>
          <div className="flex-1 flex">
            <span className="inline-block font-semibold w-32">Бухгалтер:</span>
            <span className="inline-block flex-1 max-w-[200px] border-b border-black"></span>
          </div>
        </div>
      </div>
    </PrintLayout>
  );
}
