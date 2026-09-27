"use client";

import React from 'react';
import PrintLayout from './PrintLayout';

interface ReceiptTemplateProps {
  doc: {
    doc_number: string;
    doc_type: 'receipt' | 'write_off' | 'invoice' | 'return';
    created_at: string;
    notes?: string;
    supplier?: { name: string; legal_name?: string; inn?: string; address?: string; phone?: string };
    items: { product_name: string; quantity: number; price: number; total: number }[];
    total_amount: number;
  };
  companyName?: string;
  onClose: () => void;
}

export default function ReceiptTemplate({ doc, companyName = "ТОЖ Витамин", onClose }: ReceiptTemplateProps) {
  const formattedDate = new Date(doc.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formatMoney = (amount: number) => amount.toLocaleString('ru-RU') + ' TJS';

  return (
    <PrintLayout title={`Накладная №${doc.doc_number}`} onClose={onClose}>
      <div className="text-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">ТОВАРНАЯ НАКЛАДНАЯ №{doc.doc_number}</h1>
          <div className="text-right">от {formattedDate}</div>
        </div>

        <div className="mb-6 space-y-2">
          {doc.supplier && (
            <div className="flex">
              <span className="font-semibold w-32">Поставщик:</span>
              <div className="flex-1">
                <span className="font-bold">{doc.supplier.name}</span>
                {doc.supplier.inn && <span>, ИНН: {doc.supplier.inn}</span>}
                {doc.supplier.address && <span>, Адрес: {doc.supplier.address}</span>}
              </div>
            </div>
          )}
          <div className="flex">
            <span className="font-semibold w-32">Получатель:</span>
            <div className="flex-1 font-bold">{companyName}</div>
          </div>
        </div>

        <table className="w-full mb-6 border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-2 text-center w-12">№</th>
              <th className="border border-gray-400 p-2 text-left">Наименование</th>
              <th className="border border-gray-400 p-2 text-center w-20">Ед.изм.</th>
              <th className="border border-gray-400 p-2 text-center w-24">Количество</th>
              <th className="border border-gray-400 p-2 text-right w-28">Цена (TJS)</th>
              <th className="border border-gray-400 p-2 text-right w-32">Сумма (TJS)</th>
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

        {doc.notes && (
          <div className="mb-12">
            <span className="font-semibold">Примечание:</span> {doc.notes}
          </div>
        )}

        <div className="flex justify-between mt-16 pt-8 border-t border-gray-800">
          <div className="flex-1">
            <span className="inline-block w-24">Отпустил:</span>
            <span className="inline-block w-48 border-b border-black"></span>
          </div>
          <div className="flex-1 text-right">
            <span className="inline-block w-24 text-left">Принял:</span>
            <span className="inline-block w-48 border-b border-black"></span>
          </div>
        </div>
      </div>
    </PrintLayout>
  );
}
