"use client";

import React from 'react';
import PrintLayout from './PrintLayout';

interface WriteOffTemplateProps {
  doc: {
    doc_number: string;
    created_at: string;
    notes?: string;
    items: { product_name: string; quantity: number; price: number; total: number }[];
    total_amount: number;
  };
  reason?: string;
  companyName?: string;
  onClose: () => void;
}

export default function WriteOffTemplate({ doc, reason, companyName = "ТОЖ Витамин", onClose }: WriteOffTemplateProps) {
  const formattedDate = new Date(doc.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formatMoney = (amount: number) => amount.toLocaleString('ru-RU') + ' TJS';

  return (
    <PrintLayout title={`Акт списания №${doc.doc_number}`} onClose={onClose}>
      <div className="text-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">АКТ СПИСАНИЯ ТОВАРОВ №{doc.doc_number}</h1>
          <div className="text-lg">от {formattedDate}</div>
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex">
            <span className="font-semibold w-32">Организация:</span>
            <div className="flex-1 font-bold">{companyName}</div>
          </div>
          <div className="flex items-end">
            <span className="font-semibold w-32">Основание:</span>
            <div className="flex-1 border-b border-black border-dashed min-h-[1.5rem]">
              {reason || doc.notes || ""}
            </div>
          </div>
        </div>

        <table className="w-full mb-6 border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 p-2 text-center w-12">№</th>
              <th className="border border-gray-400 p-2 text-left">Наименование</th>
              <th className="border border-gray-400 p-2 text-center w-20">Ед.изм.</th>
              <th className="border border-gray-400 p-2 text-center w-20">Кол-во</th>
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
              <td colSpan={5} className="border border-gray-400 p-2 text-right">ИТОГО списано:</td>
              <td className="border border-gray-400 p-2 text-right">{formatMoney(doc.total_amount)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-16 space-y-6">
          <div className="flex items-center">
            <span className="font-semibold w-48 shrink-0">Председатель комиссии:</span>
            <span className="flex-1 max-w-[250px] border-b border-black mr-4 inline-block"></span>
            <span className="text-gray-500 text-xs">/ _______________ /</span>
          </div>
          
          <div className="flex items-start">
            <span className="font-semibold w-48 shrink-0 mt-2">Члены комиссии:</span>
            <div className="space-y-6 flex-1">
              <div className="flex items-center">
                <span className="flex-1 max-w-[250px] border-b border-black mr-4 inline-block"></span>
                <span className="text-gray-500 text-xs">/ _______________ /</span>
              </div>
              <div className="flex items-center">
                <span className="flex-1 max-w-[250px] border-b border-black mr-4 inline-block"></span>
                <span className="text-gray-500 text-xs">/ _______________ /</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PrintLayout>
  );
}
