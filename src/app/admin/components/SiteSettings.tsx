"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { adminDbQuery } from '@/lib/admin-api';
import { Save, ChevronLeft, Globe } from 'lucide-react';

interface Setting {
  key: string;
  value: string;
}

const SETTING_LABELS: Record<string, { label: string; description: string; multiline?: boolean }> = {
  brand_name: { label: 'Название бренда', description: 'Отображается в шапке и подвале' },
  hero_title: { label: 'Заголовок Hero', description: 'Главный заголовок на главной странице' },
  hero_subtitle: { label: 'Подзаголовок Hero', description: 'Текст под заголовком', multiline: true },
  hero_badge_text: { label: 'Текст бейджа', description: 'Маленький статус над заголовком (напр. ВАШ ГИД)' },
  hero_cta_text: { label: 'Текст кнопки Юнита', description: 'Текст на кнопке перехода к тесту' },
  whatsapp_phone: { label: 'WhatsApp номер', description: 'Номер для приёма заказов (без +)' },
};

export const SiteSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*');
    if (data) setSettings(data);
  };

  const updateValue = (key: string, value: string) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const s of settings) {
      await adminDbQuery({
        action: 'upsert',
        table: 'site_settings',
        data: { key: s.key, value: s.value, updated_at: new Date().toISOString() }
      });
    }
    setMsg('Настройки сохранены!');
    setTimeout(() => setMsg(''), 2000);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
          <ChevronLeft size={18} className="text-slate-400" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Настройки сайта</h2>
      </div>

      <div className="space-y-4">
        {settings.map(s => {
          const meta = SETTING_LABELS[s.key] || { label: s.key, description: '' };
          return (
            <div key={s.key} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-slate-400" />
                <h3 className="font-bold text-sm text-slate-800">{meta.label}</h3>
              </div>
              <p className="text-xs text-slate-400">{meta.description}</p>
              {meta.multiline ? (
                <textarea
                  value={s.value}
                  onChange={(e) => updateValue(s.key, e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium outline-none resize-none focus:border-slate-200 transition-colors"
                />
              ) : (
                <input
                  type="text"
                  value={s.value}
                  onChange={(e) => updateValue(s.key, e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium outline-none focus:border-slate-200 transition-colors"
                />
              )}
            </div>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
        <Save size={16} /> {saving ? 'Сохраняем...' : 'Сохранить настройки'}
      </button>
      {msg && <p className="text-center text-sm font-semibold text-emerald-500">{msg}</p>}
    </div>
  );
};
