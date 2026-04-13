import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Lang } from '@/lib/types';

interface MedicalDisclaimerProps {
  lang: Lang;
  className?: string;
}

export const MedicalDisclaimer: React.FC<MedicalDisclaimerProps> = ({ lang, className = '' }) => {
  return (
    <div className={`bg-[#F1F5F9]/60 border border-[#E2E8F0] rounded-2xl p-4 flex items-start gap-3 ${className}`}>
      <div className="shrink-0 pt-0.5 text-[#64748B]">
        <AlertCircle size={18} strokeWidth={2} />
      </div>
      <div>
        <h4 className="text-[13px] font-bold text-[#475569] uppercase tracking-wider mb-1 font-outfit">
          {lang === 'ru' ? 'Внимание' : 'Огоҳӣ'}
        </h4>
        <p className="text-[13px] text-[#64748B] leading-relaxed font-inter">
          {lang === 'ru' 
            ? 'Представленная информация носит ознакомительный характер. Продукция не является лекарственным средством. Перед применением рекомендуем проконсультироваться с врачом.'
            : 'Маълумоти пешниҳодшуда танҳо барои шиносоӣ мебошад. Маҳсулот доруворӣ нест. Пеш аз истифода бо духтур маслиҳат намоед.'}
        </p>
      </div>
    </div>
  );
};
