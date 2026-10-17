"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  MapPin, Navigation, Layers, Check, Loader2, AlertCircle, 
  Search, Crosshair, Sparkles, Building2, HelpCircle 
} from 'lucide-react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

interface PharmacyMapPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  existingPharmacies?: Array<{
    id: string;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
    category?: string;
  }>;
  onLocationSelect: (data: {
    lat: number;
    lng: number;
    suggestedAddress?: string;
    district?: string;
    accuracyMeters?: number;
  }) => void;
}

// Default center: Dushanbe, Tajikistan
const DEFAULT_CENTER = {
  lat: 38.5598,
  lng: 68.7870
};

export const PharmacyMapPicker: React.FC<PharmacyMapPickerProps> = ({
  initialLat,
  initialLng,
  existingPharmacies = [],
  onLocationSelect
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const currentMarkerRef = useRef<LeafletMarker | null>(null);
  const existingMarkersLayerRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat || DEFAULT_CENTER.lat,
    lng: initialLng || DEFAULT_CENTER.lng
  });
  const [reverseAddress, setReverseAddress] = useState<string>('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite'>('streets');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Perform reverse geocoding via OpenStreetMap Nominatim (with immediate offline coordinate callback)
  const fetchReverseGeocode = useCallback(async (lat: number, lng: number, accuracyOverride?: number) => {
    // 1. Immediately pass coordinates to parent form so offline mode never loses GPS!
    onLocationSelect({
      lat,
      lng,
      accuracyMeters: accuracyOverride ?? (gpsAccuracy || undefined)
    });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setReverseAddress('Координаты GPS сохранены (Оффлайн-режим)');
      return;
    }

    setIsReverseGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'ru,tg,en'
          }
        }
      );
      if (response.ok) {
        const data = await response.json();
        const addr = data.address || {};
        const road = addr.road || addr.street || addr.pedestrian || '';
        const houseNumber = addr.house_number || '';
        const district = addr.suburb || addr.city_district || addr.neighbourhood || '';
        const city = addr.city || addr.town || addr.county || 'Душанбе';

        const formatted = [road, houseNumber, district, city].filter(Boolean).join(', ');
        const finalAddress = formatted || data.display_name || '';
        
        setReverseAddress(finalAddress);
        onLocationSelect({
          lat,
          lng,
          suggestedAddress: finalAddress,
          district,
          accuracyMeters: accuracyOverride ?? (gpsAccuracy || undefined)
        });
      }
    } catch (err) {
      setReverseAddress('Точка GPS зафиксирована на карте');
    } finally {
      setIsReverseGeocoding(false);
    }
  }, [gpsAccuracy, onLocationSelect]);

  // Initialize Leaflet Map
  useEffect(() => {
    let isSubscribed = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      try {
        const L = (await import('leaflet')).default;
        // Dynamically load CSS if not already present
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (!isSubscribed || !mapContainerRef.current) return;

        const startLat = initialLat || DEFAULT_CENTER.lat;
        const startLng = initialLng || DEFAULT_CENTER.lng;

        const map = L.map(mapContainerRef.current, {
          center: [startLat, startLng],
          zoom: 16,
          zoomControl: false
        });

        // Add standard OpenStreetMap layer
        const streetTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        // Custom Pin Icon for Selected Pharmacy
        const customPinIcon = L.divIcon({
          className: 'custom-pharmacy-pin',
          html: `
            <div style="position: relative; width: 42px; height: 42px; transform: translate(-50%, -100%);">
              <div style="
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                width: 42px;
                height: 42px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.45);
                border: 3px solid #ffffff;
              ">
                <span style="transform: rotate(45deg); font-size: 20px; font-weight: bold; color: white; line-height: 1;">+</span>
              </div>
              <div style="
                position: absolute;
                bottom: -6px;
                left: 17px;
                width: 8px;
                height: 8px;
                background: rgba(0,0,0,0.3);
                border-radius: 50%;
                filter: blur(1px);
              "></div>
            </div>
          `,
          iconSize: [42, 42],
          iconAnchor: [21, 42]
        });

        // Draggable Marker for the pharmacy
        const marker = L.marker([startLat, startLng], {
          draggable: true,
          icon: customPinIcon
        }).addTo(map);

        // Marker drag handler
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          setSelectedCoords({ lat: pos.lat, lng: pos.lng });
          fetchReverseGeocode(pos.lat, pos.lng);
        });

        // Map click handler (moves pin to clicked spot)
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setSelectedCoords({ lat, lng });
          fetchReverseGeocode(lat, lng);
        });

        // Layer for existing pharmacies
        const existingLayer = L.layerGroup().addTo(map);
        existingPharmacies.forEach(p => {
          if (p.latitude && p.longitude) {
            const isCatA = p.category === 'A';
            const bg = isCatA ? '#f59e0b' : '#3b82f6';
            const otherIcon = L.divIcon({
              className: 'existing-pharmacy-pin',
              html: `
                <div style="
                  background: ${bg};
                  color: white;
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 11px;
                  font-weight: 700;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                  border: 2px solid white;
                  transform: translate(-50%, -50%);
                ">
                  🏥
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            L.marker([Number(p.latitude), Number(p.longitude)], { icon: otherIcon })
              .bindPopup(`<b>${p.name}</b><br/><span style="font-size:11px;color:#6b7280;">Категория: ${p.category || 'B'}</span>`)
              .addTo(existingLayer);
          }
        });

        mapInstanceRef.current = map;
        currentMarkerRef.current = marker;
        existingMarkersLayerRef.current = existingLayer;
        setMapLoaded(true);

        // Initial geocode
        fetchReverseGeocode(startLat, startLng);
      } catch (err) {
        console.error('Failed to load Leaflet:', err);
      }
    }

    initMap();

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update existing pharmacies markers if list changes
  useEffect(() => {
    async function updateOtherMarkers() {
      if (!mapInstanceRef.current || !existingMarkersLayerRef.current) return;
      const L = (await import('leaflet')).default;
      existingMarkersLayerRef.current.clearLayers();

      existingPharmacies.forEach(p => {
        if (p.latitude && p.longitude) {
          const isCatA = p.category === 'A';
          const bg = isCatA ? '#f59e0b' : '#3b82f6';
          const otherIcon = L.divIcon({
            className: 'existing-pharmacy-pin',
            html: `
              <div style="
                background: ${bg};
                color: white;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 700;
                box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                border: 2px solid white;
                transform: translate(-50%, -50%);
              ">
                🏥
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          L.marker([Number(p.latitude), Number(p.longitude)], { icon: otherIcon })
            .bindPopup(`<b>${p.name}</b><br/><span style="font-size:11px;color:#6b7280;">Категория: ${p.category || 'B'}</span>`)
            .addTo(existingMarkersLayerRef.current);
        }
      });
    }

    if (mapLoaded) {
      updateOtherMarkers();
    }
  }, [existingPharmacies, mapLoaded]);

  // Switch between Street view and Satellite view
  const toggleMapLayer = async () => {
    if (!mapInstanceRef.current) return;
    const L = (await import('leaflet')).default;
    const nextLayer = mapLayer === 'streets' ? 'satellite' : 'streets';

    // Remove old tile layers
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    if (nextLayer === 'satellite') {
      // Esri World Imagery (Satellite)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '© Esri Satellite'
      }).addTo(mapInstanceRef.current);
    } else {
      // OpenStreetMap (Streets)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(mapInstanceRef.current);
    }

    setMapLayer(nextLayer);
  };

  // Button: Locate via Device GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Геолокация не поддерживается вашим браузером');
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsAccuracy(Math.round(accuracy));
        setSelectedCoords({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current && currentMarkerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 18, { animate: true });
          currentMarkerRef.current.setLatLng([latitude, longitude]);
        }

        fetchReverseGeocode(latitude, longitude);
        setIsLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        let msg = 'Не удалось получить GPS координаты';
        if (err.code === 1) msg = 'Доступ к геолокации запрещен в настройках браузера';
        else if (err.code === 2) msg = 'Слабый сигнал GPS. Укажите точку на карте пальцем';
        else if (err.code === 3) msg = 'Время ожидания GPS истекло';
        setErrorMessage(msg);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex flex-col">
      {/* Top Banner / Guidance */}
      <div className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs z-10">
        <div className="flex items-center gap-2 text-slate-700 font-medium">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate">
            {isReverseGeocoding ? (
              <span className="flex items-center gap-1.5 text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Определение адреса...
              </span>
            ) : reverseAddress ? (
              reverseAddress
            ) : (
              'Перетащите маркер на здание аптеки'
            )}
          </span>
        </div>

        {/* GPS Accuracy Pill */}
        {gpsAccuracy !== null && (
          <span className="shrink-0 ml-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium text-[11px] border border-emerald-200 flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-600" /> ±{gpsAccuracy}м
          </span>
        )}
      </div>

      {/* Map Area */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-[320px] sm:h-[380px] relative z-0"
        style={{ minHeight: '320px' }}
      />

      {/* Floating Controls on Map */}
      <div className="absolute top-14 right-3 flex flex-col gap-2 z-[400]">
        {/* Locate Me (GPS) Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="bg-white/95 hover:bg-white active:scale-95 text-slate-800 p-2.5 rounded-xl shadow-lg border border-slate-200/80 transition-all flex items-center justify-center font-medium text-xs gap-1.5"
          title="Определить мое местоположение по GPS"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          ) : (
            <Navigation className="w-5 h-5 text-emerald-600 fill-emerald-50" />
          )}
        </button>

        {/* Layer Switch (Streets / Satellite) */}
        <button
          type="button"
          onClick={toggleMapLayer}
          className="bg-white/95 hover:bg-white active:scale-95 text-slate-800 p-2.5 rounded-xl shadow-lg border border-slate-200/80 transition-all flex items-center justify-center font-medium text-xs"
          title={mapLayer === 'streets' ? 'Включить Спутник' : 'Включить Схему'}
        >
          <Layers className="w-5 h-5 text-indigo-600" />
        </button>
      </div>

      {/* Bottom Floating Tip & Coordinates Bar */}
      <div className="bg-white px-3.5 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Координаты:</span>
          <span className="font-mono font-medium text-slate-700">
            {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Crosshair className="w-3.5 h-3.5" />
          Я стою у входа (GPS)
        </button>
      </div>

      {/* Error notification if GPS rejected */}
      {errorMessage && (
        <div className="bg-amber-50 border-t border-amber-200 px-3.5 py-2 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
