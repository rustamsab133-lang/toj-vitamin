"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Plus, Trash2, ChevronLeft, Eye, EyeOff, Palette } from 'lucide-react';
import { motion } from 'framer-motion';

import { Complex, Product } from '@/lib/types';

const PASTEL_COLORS = ['#E8F0E8', '#F5F0EB', '#EEEAF6', '#F6ECEE', '#E8F0F8', '#FFF8E8', '#F0E8F6'];

export const ComplexEditor: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Complex | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [{ data: cData }, { data: pData }] = await Promise.all([
      supabase.from('complexes').select('*').order('sort_order'),
      supabase.from('products').select('*').order('id'),
    ]);
    if (cData) setComplexes(cData);
    if (pData) setProducts(pData);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from('complexes').upsert(editing);
    if (!error) {
      setMsg('Сохранено!');
      setTimeout(() => setMsg(''), 2000);
      loadAll();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот комплекс?')) return;
    await supabase.from('complexes').delete().eq('id', id);
    setEditing(null);
    loadAll();
  };

  const handleNew = () => {
    setEditing({
      id: `complex-${Date.now()}`,
      title: '',
      subtitle: '',
      description: '',
      product_a_id: products[0]?.id || '',
      product_b_id: products[1]?.id || '',
      bg_color: '#E8F0E8',
      sort_order: complexes.length,
      is_active: true,
    });
  };

  const toggleActive = async (c: Complex) => {
    await supabase.from('complexes').update({ is_active: !c.is_active }).eq('id', c.id);
    loadAll();
  };

  const productName = (id: string) => products.find(p => p.id === id)?.name || `ID: ${id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Комплексы «Синергия»</h2>
        </div>
        <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors">
          <Plus size={16} /> Новый
        </button>
      </div>

      {/* Complex List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {complexes.map(c => (
          <div
            key={c.id}
            onClick={() => setEditing(c)}
            className={`relative p-5 rounded-2xl cursor-pointer border transition-all ${
              editing?.id === c.id ? 'border-slate-800 shadow-lg' : 'border-slate-100 hover:border-slate-200'
            } ${!c.is_active ? 'opacity-50' : ''}`}
            style={{ backgroundColor: c.bg_color }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-800">{c.title || 'Без названия'}</h3>
                <p className="text-xs text-slate-500">{c.subtitle}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleActive(c); }}
                className="w-8 h-8 rounded-lg hover:bg-white/50 flex items-center justify-center transition-colors"
              >
                {c.is_active ? <Eye size={14} className="text-slate-500" /> : <EyeOff size={14} className="text-slate-400" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 mb-3">{c.description}</p>
            <div className="flex gap-2 text-[10px] font-semibold text-slate-400">
              <span className="px-2 py-1 rounded-lg bg-white/50">{productName(c.product_a_id)}</span>
              <span className="text-slate-300">+</span>
              <span className="px-2 py-1 rounded-lg bg-white/50">{productName(c.product_b_id)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Form */}
      {editing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <h3 className="font-bold text-slate-800">Редактирование комплекса</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Название" value={editing.title} onChange={(v) => setEditing({...editing, title: v})} />
            <Field label="Подзаголовок" value={editing.subtitle || ''} onChange={(v) => setEditing({...editing, subtitle: v})} />
          </div>

          <Field label="Описание" value={editing.description || ''} onChange={(v) => setEditing({...editing, description: v})} multiline />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5 block">Товар A</label>
              <select value={editing.product_a_id} onChange={(e) => setEditing({...editing, product_a_id: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium outline-none">
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5 block">Товар B</label>
              <select value={editing.product_b_id} onChange={(e) => setEditing({...editing, product_b_id: e.target.value})} className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium outline-none">
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>)}
              </select>
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><Palette size={12} /> Цвет фона</label>
            <div className="flex gap-2">
              {PASTEL_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setEditing({...editing, bg_color: color})}
                  className={`w-10 h-10 rounded-xl transition-all ${editing.bg_color === color ? 'ring-2 ring-slate-800 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 h-11 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              <Save size={14} /> {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
            <button onClick={() => handleDelete(editing.id)} className="h-11 px-4 rounded-xl bg-red-50 text-red-500 text-sm font-semibold hover:bg-red-100 transition-colors flex items-center justify-center">
              <Trash2 size={14} />
            </button>
          </div>
          {msg && <p className="text-center text-sm font-semibold text-emerald-500">{msg}</p>}
        </motion.div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; multiline?: boolean }> = ({ label, value, onChange, multiline }) => (
  <div>
    <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5 block">{label}</label>
    {multiline ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium outline-none resize-none focus:border-slate-200 transition-colors" />
    ) : (
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium outline-none focus:border-slate-200 transition-colors" />
    )}
  </div>
);
