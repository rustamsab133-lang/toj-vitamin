"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Save, Trash2, X, Upload, Image as ImageIcon, ChevronLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '@/lib/imageUtils';
import { QuizCategory } from '@/lib/types';

export const CategoryEditor: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [editing, setEditing] = useState<QuizCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    const { data } = await supabase.from('quiz_categories').select('*').order('sort_order');
    if (data) {
      const collator = new Intl.Collator(['ru', 'tg', 'en'], { sensitivity: 'base', numeric: true });
      const sorted = [...data].sort((a, b) => collator.compare((a.title || '').trim(), (b.title || '').trim()));
      setCategories(sorted);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from('quiz_categories').upsert({
      id: editing.id,
      title: editing.title,
      question: editing.question,
      sort_order: editing.sort_order,
      image_url: editing.image_url,
      // Сохраняем пустые объекты для языков, если их нет
      title_lang: editing.title_lang || { ru: editing.title, tj: '' },
      question_lang: editing.question_lang || { ru: editing.question, tj: '' },
    });
    
    if (!error) {
      setMsg('Сохранено!');
      setTimeout(() => setMsg(''), 2000);
      loadCategories();
    } else {
      setMsg('Ошибка сохранения');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту категорию? Все связанные вопросы могут сломаться.')) return;
    await supabase.from('quiz_categories').delete().eq('id', id);
    setEditing(null);
    loadCategories();
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);

    try {
      const compressedBlob = await compressImage(file, 200);
      const fileName = `cat/${editing.id}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('product-images') // Используем тот же бакет для простоты
        .upload(fileName, compressedBlob, { 
          contentType: 'image/jpeg',
          upsert: true 
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        setEditing({ ...editing, image_url: urlData.publicUrl });
      }
    } catch (err) {
      console.error(err);
      setMsg('Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const handleNew = () => {
    const newId = `cat-${Date.now()}`;
    setEditing({
      id: newId,
      title: '',
      question: '',
      sort_order: categories.length,
      image_url: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center transition-colors shadow-sm border border-slate-100">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Категории квиза</h2>
        </div>
        <button onClick={handleNew} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
          <Plus size={18} /> Создать
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6 items-start">
        {/* List */}
        <div className={`space-y-3 ${editing ? 'hidden lg:block' : 'block'}`}>
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              onClick={() => setEditing(cat)}
              className={`p-4 rounded-2xl cursor-pointer transition-all border flex items-center gap-4 ${
                editing?.id === cat.id ? 'bg-white border-blue-500 ring-2 ring-blue-50' : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
                {cat.image_url ? (
                  <img src={cat.image_url} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon size={20} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-[15px]">{cat.title || 'Без названия'}</p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{cat.question}</p>
              </div>
              <div className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-1 rounded">#{idx + 1}</div>
            </div>
          ))}
        </div>

        {/* Editor */}
        <AnimatePresence mode="wait">
          {editing && (
            <motion.div
              key={editing.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] border border-slate-200 p-6 space-y-6 shadow-xl lg:shadow-none lg:sticky lg:top-24"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Редактирование</h3>
                <button onClick={() => setEditing(null)} className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400">
                  <X size={20} />
                </button>
              </div>

              {/* Photo */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Иконка категории</label>
                <div
                  onClick={() => !uploading && fileRef.current?.click()}
                  className={`relative aspect-square rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 hover:border-blue-300 cursor-pointer flex items-center justify-center overflow-hidden transition-all ${uploading ? 'opacity-50' : ''}`}
                >
                  {editing.image_url ? (
                    <img src={editing.image_url} alt="" className="w-full h-full object-contain p-4" />
                  ) : (
                    <div className="text-center space-y-2">
                      {uploading ? <Loader2 size={24} className="animate-spin text-blue-500 mx-auto" /> : <Upload size={24} className="text-slate-300 mx-auto" />}
                      <p className="text-[10px] text-slate-400 font-bold px-4">Загрузите или сделайте фото</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />
              </div>

              <div className="space-y-4">
                <Field label="Заголовок (RU)" value={editing.title} onChange={(v) => setEditing({...editing, title: v})} />
                <Field label="Вопрос квиза (RU)" value={editing.question} onChange={(v) => setEditing({...editing, question: v})} multiline />
                <Field label="Порядок (0, 1, 2...)" value={String(editing.sort_order)} onChange={(v) => setEditing({...editing, sort_order: Number(v) || 0})} type="number" />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 h-12 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
                  <Save size={16} /> {saving ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <button onClick={() => handleDelete(editing.id)} className="h-12 px-4 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
              {msg && <p className="text-center text-sm font-bold text-emerald-500">{msg}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
}> = ({ label, value, onChange, type = 'text', multiline }) => (
  <div>
    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-[14px] font-medium outline-none resize-none focus:border-blue-200 transition-colors"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-[14px] font-medium outline-none focus:border-blue-200 transition-colors"
      />
    )}
  </div>
);
