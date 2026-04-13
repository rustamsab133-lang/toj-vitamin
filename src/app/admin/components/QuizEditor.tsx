"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Save, Trash2, X, Upload, Image as ImageIcon, ChevronLeft, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '@/lib/imageUtils';
import { QuizCategory, QuizOption, QuizSynergy, Product, Lang } from '@/lib/types';

export const QuizEditor: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [options, setOptions] = useState<QuizOption[]>([]);
  const [synergies, setSynergies] = useState<QuizSynergy[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [activeCategory, setActiveCategory] = useState<QuizCategory | null>(null);
  const [activeOption, setActiveOption] = useState<QuizOption | null>(null);

  useEffect(() => { loadCategories(); loadProducts(); }, []);

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) setProducts(data);
  };

  const loadCategories = async () => {
    const { data } = await supabase.from('quiz_categories').select('*').order('sort_order');
    if (data) setCategories(data);
  };

  const loadOptions = async (categoryId: string) => {
    const { data } = await supabase.from('quiz_options').select('*').eq('category_id', categoryId).order('sort_order');
    if (data) setOptions(data);
  };

  const loadSynergies = async (optionId: string) => {
    const { data } = await supabase.from('quiz_synergies').select('*').eq('option_id', optionId).order('sort_order');
    if (data) setSynergies(data);
  };

  const selectCategory = (cat: QuizCategory) => {
    setActiveCategory(cat);
    setActiveOption(null);
    loadOptions(cat.id);
  };

  const selectOption = (opt: QuizOption) => {
    setActiveOption(opt);
    loadSynergies(opt.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm sticky top-20 z-10">
        <button onClick={() => {
            if (activeOption) setActiveOption(null);
            else if (activeCategory) setActiveCategory(null);
            else onBack();
        }} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors border border-slate-100">
          <ChevronLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <button onClick={() => { setActiveCategory(null); setActiveOption(null); }} className="hover:text-blue-600">Квиз</button>
          {activeCategory && (
            <>
              <ChevronRight size={14} className="text-slate-400" />
              <button onClick={() => setActiveOption(null)} className="hover:text-blue-600 truncate max-w-[150px]">{activeCategory.title}</button>
            </>
          )}
          {activeOption && (
            <>
              <ChevronRight size={14} className="text-slate-400" />
              <span className="truncate max-w-[200px] text-slate-400">{activeOption.text}</span>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!activeCategory && (
          <motion.div key="categories" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <CategoriesManager categories={categories} onSelect={selectCategory} onRefresh={loadCategories} />
          </motion.div>
        )}
        {activeCategory && !activeOption && (
          <motion.div key="options" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}}>
             <OptionsManager 
               category={activeCategory} 
               options={options} 
               onSelect={selectOption} 
               onRefresh={() => { loadCategories(); loadOptions(activeCategory.id); }} 
               categoriesCount={categories.length}
             />
          </motion.div>
        )}
        {activeOption && (
           <motion.div key="synergies" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}}>
              <SynergiesManager 
                option={activeOption} 
                synergies={synergies} 
                products={products}
                onRefresh={() => { loadOptions(activeCategory!.id); loadSynergies(activeOption.id); }}
                optionsCount={options.length}
              />
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- CATEGORY MANAGER ---
function CategoriesManager({ categories, onSelect, onRefresh }: { categories: QuizCategory[], onSelect: (c: QuizCategory)=>void, onRefresh: ()=>void }) {
  const handleNew = async () => {
    const { error } = await supabase.from('quiz_categories').insert({
      id: `cat_${Date.now()}`,
      title: 'Новая категория',
      question: 'Вопрос?',
      sort_order: categories.length + 1
    });
    if (!error) onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-xl font-bold text-slate-800">Направления (Категории)</h2>
        <button onClick={handleNew} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold flex gap-2 items-center hover:bg-blue-700">
          <Plus size={16} /> Добавить
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map(cat => (
          <div key={cat.id} onClick={() => onSelect(cat)} className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-blue-300 hover:shadow-lg cursor-pointer transition-all flex items-center gap-4 group">
            <div className="w-14 h-14 bg-slate-50 flex items-center justify-center rounded-xl overflow-hidden shrink-0">
               {cat.image_url ? <img src={cat.image_url} className="w-full h-full object-contain p-1" /> : <ImageIcon className="text-slate-300" />}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{cat.title}</h3>
              <p className="text-xs text-slate-500 line-clamp-1 mt-1">{cat.question}</p>
            </div>
            <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- OPTIONS MANAGER (Also edits Category Info) ---
function OptionsManager({ category, options, onSelect, onRefresh, categoriesCount }: any) {
  const [editingCat, setEditingCat] = useState(category);
  const [saving, setSaving] = useState(false);

  useEffect(() => setEditingCat(category), [category]);

  const saveCategory = async () => {
    setSaving(true);
    await supabase.from('quiz_categories').update({
      title: editingCat.title,
      question: editingCat.question,
      sort_order: editingCat.sort_order,
      image_url: editingCat.image_url,
      title_lang: editingCat.title_lang,
      question_lang: editingCat.question_lang
    }).eq('id', editingCat.id);
    onRefresh();
    setSaving(false);
  };

  const deleteCategory = async () => {
    if (!confirm('Удалить категорию?')) return;
    await supabase.from('quiz_categories').delete().eq('id', editingCat.id);
    onRefresh(); // this will bounce user back because category is gone
  };

  const addOption = async () => {
    await supabase.from('quiz_options').insert({
      id: `opt_${Date.now()}`,
      category_id: category.id,
      text: 'Новый вариант ответа',
      sort_order: options.length + 1
    });
    onRefresh();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-6 items-start">
       {/* Category Settings */}
       <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-5 lg:sticky lg:top-40">
         <h3 className="font-bold text-slate-800 border-b pb-3">Настройки направления</h3>
         
         {/* Photo Upload Here (simplified for space) */}
         <Field label="Название (RU)" value={editingCat.title} onChange={v => setEditingCat({...editingCat, title:v})} />
         <Field label="Вопрос (RU)" value={editingCat.question} onChange={v => setEditingCat({...editingCat, question:v})} multiline />
         
         <div className="pt-4 flex gap-2">
            <button onClick={saveCategory} className="flex-1 bg-slate-800 text-white rounded-xl py-3 font-bold text-sm hover:bg-slate-900">{saving ? 'Сохранение...' : 'Сохранить'}</button>
            <button onClick={deleteCategory} className="px-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"><Trash2 size={16} /></button>
         </div>
       </div>

       {/* Options List */}
       <div className="space-y-4">
         <div className="flex justify-between items-center px-2">
           <h3 className="text-lg font-bold text-slate-800">Варианты ответов</h3>
           <button onClick={addOption} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-blue-100">
             <Plus size={16}/> Добавить
           </button>
         </div>

         <div className="space-y-3">
           {options.map((opt: QuizOption) => (
             <div key={opt.id} onClick={() => onSelect(opt)} className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-blue-300 hover:shadow-lg cursor-pointer flex justify-between items-center group">
               <span className="font-semibold text-slate-800 group-hover:text-blue-700">{opt.text}</span>
               <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
             </div>
           ))}
           {options.length === 0 && <div className="text-center p-8 text-slate-400">Нет вариантов ответов</div>}
         </div>
       </div>
    </div>
  );
}

// --- SYNERGIES MANAGER (Also edits Option Info) ---
function SynergiesManager({ option, synergies, products, onRefresh }: any) {
  const [editingOpt, setEditingOpt] = useState(option);
  const [savingOpt, setSavingOpt] = useState(false);
  const [activeSyn, setActiveSyn] = useState<QuizSynergy | null>(null);

  useEffect(() => setEditingOpt(option), [option]);

  const saveOption = async () => {
    setSavingOpt(true);
    await supabase.from('quiz_options').update({ text: editingOpt.text }).eq('id', editingOpt.id);
    onRefresh();
    setSavingOpt(false);
  };

  const deleteOption = async () => {
    if (!confirm('Удалить вариант ответа? Все синергии будут удалены.')) return;
    await supabase.from('quiz_options').delete().eq('id', editingOpt.id);
    onRefresh();
  };

  const addSynergy = async () => {
    const newSyn = {
      id: `syn_${Date.now()}`,
      option_id: option.id,
      type: 'Новый набор',
      dosage: '',
      rule: '',
      products_data: [],
      sort_order: synergies.length + 1
    };
    await supabase.from('quiz_synergies').insert(newSyn);
    onRefresh();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-6 items-start">
       {/* Option Settings */}
       <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-5 lg:sticky lg:top-40">
         <h3 className="font-bold text-slate-800 border-b pb-3">Редактор ответа</h3>
         <Field label="Текст ответа (RU)" value={editingOpt.text} onChange={v => setEditingOpt({...editingOpt, text:v})} multiline />
         <div className="pt-4 flex gap-2">
            <button onClick={saveOption} className="flex-1 bg-slate-800 text-white rounded-xl py-3 font-bold text-sm hover:bg-slate-900">{savingOpt ? '...' : 'Сохранить ответ'}</button>
            <button onClick={deleteOption} className="px-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"><Trash2 size={16} /></button>
         </div>
       </div>

       {/* Synergies List / Editor */}
       <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-bold text-slate-800">Рекомендации (Синергии)</h3>
            {!activeSyn && (
              <button onClick={addSynergy} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-blue-100">
                <Plus size={16}/> Добавить
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!activeSyn ? (
              <motion.div key="list" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                {synergies.map((syn: QuizSynergy) => (
                  <div key={syn.id} onClick={() => setActiveSyn(syn)} className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-emerald-300 hover:shadow-lg cursor-pointer transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-emerald-600 text-lg">{syn.type}</h4>
                      <ChevronRight className="text-slate-300 group-hover:text-emerald-500" />
                    </div>
                    <p className="text-sm text-slate-600 mb-2 whitespace-pre-line">{syn.dosage}</p>
                    <div className="flex flex-wrap gap-2 mt-3 text-xs font-semibold">
                      {(syn.products_data || []).map((p: any, i: number) => (
                        <span key={i} className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded-md">{p.name}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {synergies.length === 0 && <div className="text-center p-8 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">Нет добавленных синергий</div>}
              </motion.div>
            ) : (
              <motion.div key="editor" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}}>
                 <SynergyDetailEditor 
                   syn={activeSyn} 
                   products={products} 
                   onClose={() => setActiveSyn(null)} 
                   onRefresh={() => { onRefresh(); setActiveSyn(null); }} 
                 />
              </motion.div>
            )}
          </AnimatePresence>
       </div>
    </div>
  );
}

// --- SYNERGY DETAIL EDITOR ---
function SynergyDetailEditor({ syn, products, onClose, onRefresh }: any) {
  const [editing, setEditing] = useState<QuizSynergy>(syn);
  
  const save = async () => {
    await supabase.from('quiz_synergies').update({
      type: editing.type,
      dosage: editing.dosage,
      rule: editing.rule,
      products_data: editing.products_data
    }).eq('id', editing.id);
    onRefresh();
  };

  const remove = async () => {
    if(!confirm('Удалить эту синергию?')) return;
    await supabase.from('quiz_synergies').delete().eq('id', editing.id);
    onRefresh();
  };

  const addProduct = (productId: string) => {
    const prod = products.find((p:any) => p.id === productId);
    if (!prod) return;
    const newData = [...(editing.products_data || []), { name: prod.name, properties: ['Новое свойство'] }];
    setEditing({...editing, products_data: newData});
  };

  const removeProduct = (idx: number) => {
    const newData = [...(editing.products_data || [])];
    newData.splice(idx, 1);
    setEditing({...editing, products_data: newData});
  };

  const updateProp = (pIdx: number, propIdx: number, val: string) => {
    const newData = [...(editing.products_data || [])];
    newData[pIdx].properties[propIdx] = val;
    setEditing({...editing, products_data: newData});
  };
  const addProp = (pIdx: number) => {
    const newData = [...(editing.products_data || [])];
    newData[pIdx].properties.push('');
    setEditing({...editing, products_data: newData});
  };
  const removeProp = (pIdx: number, propIdx: number) => {
    const newData = [...(editing.products_data || [])];
    newData[pIdx].properties.splice(propIdx, 1);
    setEditing({...editing, products_data: newData});
  };

  return (
    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-xl space-y-6">
      <div className="flex justify-between items-center pb-4 border-b">
         <h3 className="font-bold text-slate-800 text-lg">Настройка синергии</h3>
         <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20}/></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Тип (название)" value={editing.type} onChange={v => setEditing({...editing, type:v})} />
        <Field label="Схема приема" value={editing.dosage} onChange={v => setEditing({...editing, dosage:v})} />
      </div>
      <Field label="Важное правило" value={editing.rule} onChange={v => setEditing({...editing, rule:v})} multiline />

      <div className="pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center mb-4">
           <h4 className="font-bold text-slate-800">Продукты в синергии</h4>
           <select 
             onChange={(e) => { e.target.value && addProduct(e.target.value); e.target.value = ''; }}
             className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none"
           >
             <option value="">+ Добавить БАД</option>
             {products.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
           </select>
        </div>

        <div className="space-y-4">
          {(editing.products_data || []).map((p: any, pIdx: number) => (
            <div key={pIdx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative">
               <button onClick={() => removeProduct(pIdx)} className="absolute top-3 right-3 text-red-400 hover:text-red-500"><Trash2 size={16}/></button>
               <h5 className="font-bold text-blue-800 mb-2 pr-8">{p.name}</h5>
               <div className="space-y-2">
                 {p.properties.map((prop: string, propIdx: number) => (
                   <div key={propIdx} className="flex gap-2 items-center">
                     <input 
                       value={prop} 
                       onChange={(e) => updateProp(pIdx, propIdx, e.target.value)}
                       className="flex-1 px-3 py-1.5 text-sm rounded border border-slate-200 outline-none focus:border-blue-300"
                     />
                     <button onClick={() => removeProp(pIdx, propIdx)} className="text-slate-400 hover:text-red-500"><X size={16}/></button>
                   </div>
                 ))}
                 <button onClick={() => addProp(pIdx)} className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mt-2">+ Добавить свойство</button>
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-6 flex gap-2">
        <button onClick={save} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700">Сохранить синергию</button>
        <button onClick={remove} className="px-5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"><Trash2/></button>
      </div>
    </div>
  );
}

// --- Reusable Input Field ---
const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; multiline?: boolean }> = ({ label, value, onChange, multiline }) => (
  <div>
    <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5 block">{label}</label>
    {multiline ? (
      <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium outline-none resize-none focus:border-blue-200 transition-colors" />
    ) : (
      <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium outline-none focus:border-blue-200 transition-colors" />
    )}
  </div>
);
