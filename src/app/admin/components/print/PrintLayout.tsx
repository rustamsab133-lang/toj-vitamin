"use client";

import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';

interface PrintLayoutProps {
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  subtitle?: string;
}

export default function PrintLayout({ title, onClose, children, actions, subtitle }: PrintLayoutProps) {
  useEffect(() => {
    const handleBeforePrint = () => {
      document.body.style.overflow = 'visible';
    };
    const handleAfterPrint = () => {
      // Handled by parent modal if needed
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  return (
    <div className="print-wrapper-root fixed inset-0 z-[100] bg-slate-100 print:bg-white overflow-y-auto">
      {/* Hide toolbar when printing */}
      <div className="print:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {actions}

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Печать накладной</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Закрыть</span>
            </button>
          )}
        </div>
      </div>

      {/* A4 Container */}
      <div className="print-a4-sheet max-w-[210mm] mx-auto bg-white min-h-[297mm] p-6 sm:p-8 print:p-0 my-4 sm:my-6 print:my-0 shadow-lg print:shadow-none print:max-w-none print:min-h-0 text-black border border-slate-200 print:border-none rounded-xl print:rounded-none">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 6mm 8mm;
            }
            html, body {
              overflow: visible !important;
              height: auto !important;
              min-height: 100% !important;
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            header, nav, aside {
              display: none !important;
            }
            .print-wrapper-root {
              position: static !important;
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
              background: transparent !important;
              inset: auto !important;
              display: block !important;
            }
            .print-a4-sheet {
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              min-height: 0 !important;
            }
            tr, .print-avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}} />
        {children}
      </div>
    </div>
  );
}
