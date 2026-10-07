"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';

interface PrintLayoutProps {
  title: string;
  onClose: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function PrintLayout({ title, onClose, actions, children }: PrintLayoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Make sure body and html allow multi-page printing when print dialog opens
    const handleBeforePrint = () => {
      document.body.style.overflow = 'visible';
      document.documentElement.style.overflow = 'visible';
    };

    const handleAfterPrint = () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const handlePrint = () => {
    document.body.style.overflow = 'visible';
    document.documentElement.style.overflow = 'visible';
    window.print();
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div id="print-portal-root" className="print-portal-root">
      {/* Screen Modal Overlay */}
      <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-xs overflow-y-auto print-layout-screen-wrapper">
        {/* Top Control Bar — Hidden in Print */}
        <div className="print-hide sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
              <Printer size={16} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 font-outfit">{title}</h2>
              <p className="text-[11px] text-slate-400 font-medium">Предварительный просмотр перед печатью на А4 / экспортом в PDF</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {actions}

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-600/20"
            >
              <Printer className="w-4 h-4" />
              <span>Печать / Сохранить в PDF</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Закрыть</span>
            </button>
          </div>
        </div>

        {/* Printable Content Container */}
        <div className="max-w-[210mm] mx-auto bg-white min-h-[297mm] p-6 sm:p-10 my-6 shadow-2xl rounded-2xl print-page-container text-black">
          {children}
        </div>
      </div>

      {/* Global CSS for 100% Reliable Multi-Page Printing Without Clipping */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* 1. Global Reset to allow full multi-page document pagination */
          html, body {
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            position: static !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* 2. Hide all existing app elements in body EXCEPT our print portal root */
          body > *:not(#print-portal-root) {
            display: none !important;
          }

          /* 3. Make print portal root normal static document flow */
          #print-portal-root {
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .print-layout-screen-wrapper {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }

          /* 4. Hide all screen UI tools */
          .print-hide, .no-print, .print\\:hidden, [data-no-print] {
            display: none !important;
          }

          /* 5. A4 container reset for paper */
          .print-page-container {
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            display: block !important;
          }

          /* 6. Standard A4 Margins */
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }

          /* 7. Multi-page Table Rules: Header repeats on page 2, rows never cut in half */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          thead {
            display: table-header-group !important;
          }

          tfoot {
            display: table-footer-group !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* 8. Keep signatures and totals intact */
          .keep-together, .signature-block, .summary-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
    </div>,
    document.body
  );
}
