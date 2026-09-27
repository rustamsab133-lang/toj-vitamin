"use client";

import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';

interface PrintLayoutProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function PrintLayout({ title, onClose, children }: PrintLayoutProps) {
  useEffect(() => {
    // Automatically focus window or log for print view
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-gray-100 print:bg-white overflow-y-auto">
      {/* Hide toolbar when printing */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        <div className="flex gap-4">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-5 h-5" />
            <span>Печать</span>
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
            <span>Закрыть</span>
          </button>
        </div>
      </div>

      {/* A4 Container */}
      <div className="max-w-[210mm] mx-auto bg-white min-h-[297mm] p-10 print:p-0 my-8 print:my-0 shadow-lg print:shadow-none print:max-w-none print:min-h-0 text-black">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background-color: white;
            }
          }
        `}} />
        {children}
      </div>
    </div>
  );
}
