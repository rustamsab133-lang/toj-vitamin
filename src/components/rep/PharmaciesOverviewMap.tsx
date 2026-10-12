"use client";
import React, { useEffect, useRef, useState } from 'react';
import { 
  Navigation, Layers, Phone, MessageSquare, Compass, 
  Clock, MapPin, Building2, ExternalLink, ShoppingCart, 
  CheckCircle2, AlertTriangle, Search, Filter 
} from 'lucide-react';
import type { Map as LeafletMap } from 'leaflet';
import { Pharmacy } from '@/lib/types';

interface PharmaciesOverviewMapProps {
  pharmacies: Pharmacy[];
  userLat?: number | null;
  userLng?: number | null;
  onSelectPharmacy?: (pharmacy: Pharmacy) => void;
  onStartVisit?: (pharmacy: Pharmacy) => void;
  onAddNewPharmacy: () => void;
}

export const PharmaciesOverviewMap: React.FC<PharmaciesOverviewMapProps> = ({
  pharmacies,
  userLat,
  userLng,
  onSelectPharmacy,
  onStartVisit,
  onAddNewPharmacy
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const userMarkerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite'>('streets');

  // Filtered pharmacies with coordinates
  const validPharmacies = pharmacies.filter(p => {
    if (!p.latitude || !p.longitude) return false;
    if (categoryFilter !== 'ALL' && (p.category || 'B') !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchAddr = p.address?.toLowerCase().includes(q);
      const matchPerson = p.contact_person?.toLowerCase().includes(q);
      return matchName || matchAddr || matchPerson;
    }
    return true;
  });

  // Init Leaflet
  useEffect(() => {
    let isSubscribed = true;

    async function init() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      try {
        const L = (await import('leaflet')).default;

        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (!isSubscribed || !mapContainerRef.current) return;

        const defaultLat = userLat || 38.5598;
        const defaultLng = userLng || 68.7870;

        const map = L.map(mapContainerRef.current, {
          center: [defaultLat, defaultLng],
          zoom: 14,
          zoomControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;
        setMapLoaded(true);
      } catch (err) {
        console.error('Map init error:', err);
      }
    }

    init();

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update User Marker
  useEffect(() => {
    async function updateUserPin() {
      if (!mapInstanceRef.current || !userLat || !userLng) return;
      const L = (await import('leaflet')).default;

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLat, userLng]);
      } else {
        const userIcon = L.divIcon({
          className: 'user-location-pin',
          html: `
            <div style="position: relative; width: 22px; height: 22px;">
              <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #0284c7; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; width: 14px; height: 14px; top: 4px; left: 4px; border-radius: 50%; background: #0284c7; border: 2.5px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapInstanceRef.current);
      }
    }

    if (mapLoaded) {
      updateUserPin();
    }
  }, [userLat, userLng, mapLoaded]);

  // Update Pharmacy Markers
  useEffect(() => {
    async function renderPins() {
      if (!mapInstanceRef.current || !markersLayerRef.current) return;
      const L = (await import('leaflet')).default;

      markersLayerRef.current.clearLayers();

      validPharmacies.forEach(pharm => {
        if (!pharm.latitude || !pharm.longitude) return;

        const cat = pharm.category || 'B';
        const color = cat === 'A' ? '#f59e0b' : cat === 'B' ? '#10b981' : '#64748b';

        const icon = L.divIcon({
          className: 'pharmacy-map-pin',
          html: `
            <div style="
              background: ${color};
              color: white;
              padding: 4px 8px;
              border-radius: 12px;
              display: inline-flex;
              align-items: center;
              gap: 4px;
              box-shadow: 0 3px 8px rgba(0,0,0,0.25);
              border: 2px solid white;
              font-family: sans-serif;
              font-size: 11px;
              font-weight: 700;
              white-space: nowrap;
              transform: translate(-50%, -100%);
              cursor: pointer;
            ">
              <span>🏥</span>
              <span>${pharm.name.length > 15 ? pharm.name.substring(0, 15) + '…' : pharm.name}</span>
            </div>
          `,
          iconSize: [80, 30],
          iconAnchor: [40, 30]
        });

        const marker = L.marker([Number(pharm.latitude), Number(pharm.longitude)], { icon });
        marker.on('click', () => {
          setSelectedPharmacy(pharm);
          if (onSelectPharmacy) onSelectPharmacy(pharm);
          mapInstanceRef.current?.setView([Number(pharm.latitude), Number(pharm.longitude)], 16, { animate: true });
        });

        markersLayerRef.current.addLayer(marker);
      });
    }

    if (mapLoaded) {
      renderPins();
    }
  }, [validPharmacies, mapLoaded]);

  // Toggle Streets / Satellite
  const toggleMapLayer = async () => {
    if (!mapInstanceRef.current) return;
    const L = (await import('leaflet')).default;
    const nextLayer = mapLayer === 'streets' ? 'satellite' : 'streets';

    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    if (nextLayer === 'satellite') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '© Esri Satellite'
      }).addTo(mapInstanceRef.current);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(mapInstanceRef.current);
    }

    setMapLayer(nextLayer);
  };

  const centerOnUser = () => {
    if (mapInstanceRef.current && userLat && userLng) {
      mapInstanceRef.current.setView([userLat, userLng], 16, { animate: true });
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-100">
      {/* Search & Filter Top Bar */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 p-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            placeholder="Поиск аптеки по названию, адресу, ЛПР..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2"
            >
              Очистить
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {(['ALL', 'A', 'B', 'C'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm backdrop-blur-md transition-all whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-white/90 text-slate-700 hover:bg-white border border-slate-200/60'
              }`}
            >
              {cat === 'ALL' ? `Все аптеки (${pharmacies.filter(p => p.latitude).length})` : `Категория ${cat}`}
            </button>
          ))}
        </div>
      </div>

      {/* Map Viewport */}
      <div ref={mapContainerRef} className="w-full flex-1 relative z-0" />

      {/* Floating Controls Right */}
      <div className="absolute right-3 bottom-24 sm:bottom-28 z-[400] flex flex-col gap-2">
        {userLat && userLng && (
          <button
            onClick={centerOnUser}
            className="w-11 h-11 rounded-2xl bg-white shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-transform active:scale-95"
            title="Где я"
          >
            <Navigation className="w-5 h-5 text-blue-600 fill-blue-50" />
          </button>
        )}

        <button
          onClick={toggleMapLayer}
          className="w-11 h-11 rounded-2xl bg-white shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-transform active:scale-95"
          title="Слой карты"
        >
          <Layers className="w-5 h-5 text-indigo-600" />
        </button>
      </div>

      {/* Floating 'Add Pharmacy' FAB */}
      <div className="absolute left-4 right-4 bottom-4 z-[400]">
        {!selectedPharmacy && (
          <button
            onClick={onAddNewPharmacy}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <MapPin className="w-5 h-5" />
            + Добавить новую аптеку на карту
          </button>
        )}
      </div>

      {/* Selected Pharmacy Bottom Sheet Popup */}
      {selectedPharmacy && (
        <div className="absolute left-3 right-3 bottom-3 z-[500] bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-6">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  selectedPharmacy.category === 'A' ? 'bg-amber-100 text-amber-800' :
                  selectedPharmacy.category === 'B' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  Кат. {selectedPharmacy.category || 'B'}
                </span>
                <span className="text-xs text-slate-400">Скидка {selectedPharmacy.discount_percent}%</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900">{selectedPharmacy.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-1">{selectedPharmacy.address}</p>
              {selectedPharmacy.landmark && (
                <p className="text-[11px] text-emerald-700 font-medium line-clamp-1">
                  📍 {selectedPharmacy.landmark}
                </p>
              )}
            </div>

            <button
              onClick={() => setSelectedPharmacy(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              ✕
            </button>
          </div>

          {/* Contact Details */}
          <div className="flex items-center justify-between py-2 border-y border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{selectedPharmacy.contact_person || 'Заведующая'}</span>
            </div>

            {selectedPharmacy.preferred_time && (
              <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{selectedPharmacy.preferred_time}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {selectedPharmacy.phone ? (
              <a
                href={`tel:${selectedPharmacy.phone}`}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-slate-600" />
                Позвонить
              </a>
            ) : (
              <div className="py-2.5 rounded-xl bg-slate-50 text-slate-300 text-xs text-center">Нет тел.</div>
            )}

            {/* Direct Navigator in 2GIS / Yandex */}
            <a
              href={`https://yandex.ru/maps/?rtext=~${selectedPharmacy.latitude},${selectedPharmacy.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              В навигатор
            </a>

            {/* Start Visit Button */}
            <button
              onClick={() => {
                if (onStartVisit) onStartVisit(selectedPharmacy);
              }}
              className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Начать визит
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
