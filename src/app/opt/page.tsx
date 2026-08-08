"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, CheckCircle2, ShieldCheck, Truck, Download, 
  HelpCircle, ChevronDown, MessageSquare, Star, ArrowRight, X, Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// SEO Meta Data (for SSR engines, here declared for static rendering check)
const META = {
  title: "Оптовые поставки витаминов и БАДов в Таджикистане — TojVitamin B2B",
  description: "Официальный дистрибьютор витаминов и БАДов в Таджикистане. Оптовые цены, быстрая доставка по всей стране, 100% оригинал и сертификаты GMP."
};

// Популярные категории для SEO (LSI ключевые слова)
const LSI_CATEGORIES = [
  { name: "Витамин D3 оптом", count: "более 15 позиций" },
  { name: "Омега-3 и рыбный жир", count: "высокая концентрация" },
  { name: "Детские витамины БАДы", count: "сертифицировано" },
  { name: "Коллаген и гиалуроновая кислота", count: "топ продаж" },
  { name: "Магний B6 и антистресс", count: "высокий спрос" },
  { name: "Комплексы для иммунитета", count: "сезонный хит" },
  { name: "Спортивные витамины", count: "для активных" },
  { name: "Цинк, Селен, Железо", count: "минералы оптом" }
];

// Города доставки (локальное SEO)
const CITIES = ["Душанбе", "Худжанд", "Бохтар", "Куляб", "Турсунзаде", "Истаравшан", "Вахдат", "Яван", "Канибадам", "Исфара"];

// Вопросы и ответы (FAQ)
const FAQ_ITEMS = [
  {
    q: "Какова минимальная сумма оптового заказа?",
    a: "Минимальный заказ отсутствует. Вы можете сделать заказ на любую сумму, что делает сотрудничество удобным для аптек любого масштаба."
  },
  {
    q: "Предоставляете ли вы сертификаты качества?",
    a: "Да, на каждую партию товара мы предоставляем полный пакет разрешительных документов: сертификаты соответствия Республики Таджикистан, лабораторные заключения и международные сертификаты GMP/ISO от производителей."
  },
  {
    q: "Как быстро осуществляется доставка?",
    a: "По Душанбе доставка осуществляется в день заказа или на следующий день. В регионы (Худжанд, Бохтар, Куляб и др.) отправляем специализированным транспортом в течение 24-48 часов."
  },
  {
    q: "Есть ли у вас отсрочка платежа?",
    a: "Нет, мы работаем по принципу прямых поставок без отсрочки платежа. Отгрузка товаров осуществляется по 100% предоплате или с оплатой по факту получения заказа."
  }
];

// Отзывы аптек
const REVIEWS = [
  {
    name: "Аптечная сеть «Шифо»",
    city: "г. Душанбе",
    text: "Сотрудничаем с TojVitamin более года. Очень радует быстрая доставка и то, что все документы и сертификаты всегда в порядке. Клиенты часто спрашивают именно бренд GLS.",
    rating: 5
  },
  {
    name: "ООО «Фарм-Альянс»",
    city: "г. Худжанд",
    text: "Лучшие оптовые цены на рынке Таджикистана. Условия сотрудничества всегда прозрачные, а менеджеры помогают подобрать ходовые позиции под сезон.",
    rating: 5
  }
];

export default function OptPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Данные формы
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    address: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone) return;

    setLoading(true);
    try {
      // Подставляем имя по умолчанию, так как поле name является обязательным в базе
      const submissionData = {
        ...formData,
        name: formData.name || `Заявка с сайта ${formData.phone}`
      };

      // 1. Отправляем лид на сервер
      const res = await fetch('/api/b2b/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert('Произошла ошибка при отправке заявки. Пожалуйста, попробуйте снова.');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка подключения к серверу.');
    } finally {
      setLoading(false);
    }
  };

  // JSON-LD для FAQ разметки Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_ITEMS.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a
      }
    }))
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Внедрение структурированных данных FAQ для поисковиков */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
              TV
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">TojVitamin</span>
              <span className="text-emerald-600 font-bold ml-1.5 text-xs px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100 uppercase tracking-wider">B2B</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/b2b" 
              className="text-slate-600 hover:text-slate-900 font-bold text-xs px-4 py-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Вход B2B (Кабинет)
            </Link>
            <button 
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-emerald-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg active:scale-95"
            >
              <Download size={16} /> Прайс-лист
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_45%)]" />
        <div className="max-w-6xl mx-auto relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Оптовые поставки витаминов и БАДов в Таджикистане
            </h1>
            <p className="text-slate-300 text-lg sm:text-xl font-normal leading-relaxed">
              Прямой дистрибьютор оригинальных брендов. Быстрая отгрузка, полный пакет сертификатов GMP/ISO и гибкие скидки до 25% для аптек и дилеров.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button 
                onClick={() => setModalOpen(true)}
                className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base px-8 py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-95"
              >
                Получить прайс-лист <ArrowRight size={18} />
              </button>
              <Link 
                href="/b2b"
                className="flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all"
              >
                Войти в личный кабинет
              </Link>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl space-y-6">
            <h3 className="text-xl font-bold text-emerald-400">Условия сотрудничества</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">100% Оригинал</h4>
                  <p className="text-xs text-slate-400">Только сертифицированная продукция напрямую с заводов</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <Building2 size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Для аптек любого масштаба</h4>
                  <p className="text-xs text-slate-400">Минимальный заказ отсутствует</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <Truck size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Экспресс-доставка</h4>
                  <p className="text-xs text-slate-400">Собственная логистика по всей Республике Таджикистан</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO LSI Cloud Categories */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Популярные категории для аптек</h2>
          <p className="text-slate-500 mt-2">Оптовый ассортимент, который всегда востребован покупателями</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {LSI_CATEGORIES.map((cat, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-default">
              <h4 className="font-bold text-slate-800 text-sm">{cat.name}</h4>
              <p className="text-xs text-slate-400 mt-1">{cat.count}</p>
            </div>
          ))}
        </div>
      </section>


      {/* Geolocation pSEO Section */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Доставка по всему Таджикистану</h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm">
            Мы выстроили надежную логистическую сеть. Доставляем заказы в аптеки следующих городов и прилегающих к ним районов:
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {CITIES.map((city, idx) => (
              <span key={idx} className="bg-slate-100 text-slate-700 font-semibold text-xs px-3.5 py-1.5 rounded-full border border-slate-200">
                📍 {city}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-16 px-6 bg-slate-100 border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Отзывы наших партнеров</h2>
            <p className="text-slate-500 mt-2">Посмотрите, что говорят владельцы аптечного бизнеса о работе с нами</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {REVIEWS.map((rev, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800">{rev.name}</h4>
                    <p className="text-xs text-slate-400">{rev.city}</p>
                  </div>
                  <div className="flex text-amber-400">
                    {[...Array(rev.rating)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                  </div>
                </div>
                <p className="text-slate-600 text-sm italic leading-relaxed">
                  «{rev.text}»
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-3">
            <HelpCircle className="text-emerald-600" /> Вопросы и ответы
          </h2>
          <p className="text-slate-500 mt-2">Вся базовая информация для новых контрагентов</p>
        </div>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = faqOpen === idx;
            return (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300">
                <button 
                  onClick={() => setFaqOpen(isOpen ? null : idx)}
                  className="w-full px-6 py-5 text-left font-bold text-slate-800 flex justify-between items-center hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm sm:text-base pr-4">{item.q}</span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-6 pb-6 pt-1 text-slate-500 text-sm leading-relaxed border-t border-slate-100">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-500 py-12 px-6 border-t border-slate-800 text-center text-sm space-y-4">
        <p className="font-bold text-white text-base">TojVitamin B2B Дистрибьюция</p>
        <p className="max-w-md mx-auto text-xs text-slate-400">
          Официальный поставщик витаминно-минеральных комплексов, БАДов и спортивного питания на территории Республики Таджикистан.
        </p>
        <p className="text-[10px] text-slate-600">
          © {new Date().getFullYear()} TojVitamin. Все права защищены.
        </p>
      </footer>

      {/* Lead Modal Form */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-100"
            >
              <button 
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors border border-slate-100"
              >
                <X size={16} />
              </button>

              {!submitted ? (
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Получить оптовый прайс</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Для защиты наших оптовых цен мы предоставляем прайс-лист только проверенным партнерам. Выберите удобный способ получения:
                    </p>
                  </div>

                  {/* Option 1: WhatsApp (Quickest) */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Быстрый способ (в 1 клик):</p>
                    <a 
                      href={`https://wa.me/992176660707?text=${encodeURIComponent("Здравствуйте! Хочу получить оптовый прайс-лист TojVitamin для своей аптеки.")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl text-base transition-all duration-200 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
                    >
                      <span className="text-lg">🟢</span> Получить в WhatsApp
                    </a>
                  </div>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink mx-4 text-[10px] text-slate-300 font-bold uppercase">или</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                  </div>

                  {/* Option 2: Leave Phone on Website */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Оставить заявку на сайте:</p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Ваш мобильный телефон (WhatsApp)</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 text-slate-400" size={14} />
                        <input 
                          type="tel" 
                          name="phone"
                          required
                          placeholder="+992 900 00 0000"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value, name: `Заявка с сайта ${e.target.value}` })}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
                    >
                      {loading ? 'Отправка...' : <>Оставить заявку <ArrowRight size={16} /></>}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-8 text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Заявка отправлена!</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Наш оптовый менеджер свяжется с вами в WhatsApp по номеру <strong className="text-slate-800">{formData.phone}</strong> для верификации вашей аптеки и отправки оптового прайс-листа TojVitamin.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setModalOpen(false);
                      setSubmitted(false);
                      setFormData({ name: '', contact_person: '', phone: '', address: '' });
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all"
                  >
                    Вернуться на страницу
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
