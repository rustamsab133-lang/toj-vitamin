"use client";

import React, { useEffect, useRef } from 'react';
import PrintLayout from './PrintLayout';
import JsBarcode from 'jsbarcode';

interface BarcodeLabelProps {
  products: {
    name: string;
    barcode?: string;
    price: number;
  }[];
  labelSize?: '58mm' | '40x30mm';
  onClose: () => void;
}

const Label = ({ product, labelSize }: { product: BarcodeLabelProps['products'][0], labelSize: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && product.barcode) {
      try {
        JsBarcode(svgRef.current, product.barcode, {
          format: "CODE128",
          width: labelSize === '40x30mm' ? 1.2 : 1.5,
          height: labelSize === '40x30mm' ? 30 : 40,
          displayValue: true,
          fontSize: 10,
          margin: 0,
        });
      } catch (err) {
        console.error("Failed to generate barcode for", product.barcode, err);
      }
    }
  }, [product.barcode, labelSize]);

  // Dimensions based on selected size
  const containerStyle = labelSize === '40x30mm' 
    ? { width: '40mm', height: '30mm', padding: '1.5mm', boxSizing: 'border-box' as const }
    : { width: '58mm', height: '40mm', padding: '2mm', boxSizing: 'border-box' as const };

  return (
    <div 
      className="flex flex-col items-center justify-center bg-white border border-gray-200 print:border-none overflow-hidden"
      style={containerStyle}
    >
      <div className="text-[9px] leading-[1.1] text-center font-semibold mb-0.5 line-clamp-2 w-full max-h-[2.4em] overflow-hidden break-words text-black">
        {product.name}
      </div>
      
      {product.barcode ? (
        <svg ref={svgRef} className="max-w-full" style={{ maxHeight: labelSize === '40x30mm' ? '14mm' : '18mm' }}></svg>
      ) : (
        <div className="text-[10px] text-black border border-dashed border-gray-400 p-1 my-1 w-full text-center">Нет штрихкода</div>
      )}
      
      <div className="text-[11px] font-bold mt-0.5 text-black">
        {product.price.toLocaleString('ru-RU')} TJS
      </div>
    </div>
  );
};

export default function BarcodeLabels({ products, labelSize = '58mm', onClose }: BarcodeLabelProps) {
  return (
    <PrintLayout title={`Печать этикеток (${labelSize})`} onClose={onClose}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            margin: 0;
            size: ${labelSize === '40x30mm' ? 'A4' : '58mm auto'};
          }
          body {
            margin: 0;
            padding: 0;
            background-color: white;
          }
          .print-label-grid {
            display: ${labelSize === '40x30mm' ? 'flex' : 'block'} !important;
            flex-wrap: wrap !important;
            align-content: flex-start !important;
            gap: 0 !important;
          }
          .print-label-item {
            page-break-inside: avoid;
            margin: 0 !important;
          }
        }
      `}} />
      <div className={`print-label-grid grid gap-4 ${labelSize === '40x30mm' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {products.map((p, idx) => (
          <div key={idx} className="print-label-item flex justify-center items-start">
             <Label product={p} labelSize={labelSize} />
          </div>
        ))}
      </div>
    </PrintLayout>
  );
}
