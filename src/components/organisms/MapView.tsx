import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../services/api';
import type { MapEntry } from '../../types/entry';

// District coordinates mapping (主要城市)
const DISTRICT_COORDS: Record<string, [number, number]> = {
  '北京': [39.9042, 116.4074],
  '北京市': [39.9042, 116.4074],
  '东城区': [39.9155, 116.4039],
  '海淀区': [39.9592, 116.2982],
  '上海': [31.2304, 121.4737],
  '上海市': [31.2304, 121.4737],
  '浦东新区': [31.2304, 121.5437],
  '广州': [23.1291, 113.2644],
  '广州市': [23.1291, 113.2644],
  '杭州': [30.2741, 120.1551],
  '杭州市': [30.2741, 120.1551],
  '浙江省杭州市': [30.2741, 120.1551],
  '成都': [30.5728, 104.0668],
  '成都市': [30.5728, 104.0668],
  '武侯区': [30.6573, 104.0713],
  '四川省': [30.6573, 104.0713],
  '四川': [30.6573, 104.0713],
  '深圳': [22.5431, 114.0579],
  '深圳市': [22.5431, 114.0579],
  '江苏省苏州市': [31.2989, 120.5954],
  '苏州': [31.2989, 120.5954],
};

const DEFAULT_CENTER: [number, number] = [30.6573, 104.0713];
const DEFAULT_ZOOM = 5;

const remToPx = (rem: number) => {
  const root = typeof window !== 'undefined' ? window.getComputedStyle(document.documentElement).fontSize : '1rem';
  const rootSize = Number.parseFloat(root) || 16;
  return Math.round(rem * rootSize);
};

const MapViewUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
};

const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  const size = remToPx(2.875);

  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:2.875rem;height:2.875rem;border-radius:50%;background:rgba(96,165,250,0.18);border:0.125rem solid rgba(255,255,255,0.85);color:#0369A1;font-size:0.875rem;font-weight:700;box-shadow:0 0 0 0.125rem rgba(255,255,255,0.5);">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(size, size, true),
  });
};

const createMarkerIcon = () => {
  const size = remToPx(1.125);
  const anchor = Math.round(size / 2);

  return L.divIcon({
    html: '<div style="width:1.125rem;height:1.125rem;border-radius:50%;background:rgba(96,165,250,0.95);border:0.125rem solid rgba(255,255,255,0.9);"></div>',
    className: 'custom-marker-icon',
    iconSize: L.point(size, size, true),
    iconAnchor: [anchor, anchor],
  });
};

const getCoordinatesFromDistrict = (district: string): [number, number] => {
  const normalized = district.trim();
  for (const [key, coords] of Object.entries(DISTRICT_COORDS)) {
    if (normalized.includes(key)) {
      return coords;
    }
  }

  if (/四川|成都|武侯区/.test(normalized)) {
    return [30.6573, 104.0713];
  }
  if (/北京/.test(normalized)) {
    return [39.9042, 116.4074];
  }
  if (/上海/.test(normalized)) {
    return [31.2304, 121.4737];
  }
  if (/广州/.test(normalized)) {
    return [23.1291, 113.2644];
  }
  if (/杭州/.test(normalized)) {
    return [30.2741, 120.1551];
  }
  if (/深圳/.test(normalized)) {
    return [22.5431, 114.0579];
  }
  if (/苏州/.test(normalized)) {
    return [31.2989, 120.5954];
  }

  return DEFAULT_CENTER;
};

const MapView = () => {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [permissionStatus, setPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [entries, setEntries] = useState<MapEntry[]>([]);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('[Geolocation] Geolocation API not available');
      setPermissionStatus('denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        console.log(`[Geolocation] Got coordinates: lat=${coords.latitude}, lng=${coords.longitude}`);
        setCenter([coords.latitude, coords.longitude]);
        setPermissionStatus('granted');
      },
      (error) => {
        console.error('[Geolocation] Error getting position - Code:', error.code, 'Message:', error.message);
        setPermissionStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const data = await api.getEntries();
        if (Array.isArray(data)) {
          const mapEntries = data.map((entry: any) => {
            const [lat, lng] = entry.district ? getCoordinatesFromDistrict(entry.district) : center;
            return {
              id: entry.id,
              title: entry.title || '日记',
              content: entry.content,
              district: entry.district || '未知地点',
              timestamp: entry.created_at,
              lat,
              lng,
            };
          });
          setEntries(mapEntries);
        }
      } catch (err) {
        console.error('Failed to load map entries:', err);
      }
    };
    fetchEntries();
  }, []);

  const markers = useMemo(
    () =>
      entries.map((entry) => (
        <Marker
          key={entry.id}
          position={[entry.lat, entry.lng]}
          icon={createMarkerIcon()}
        >
          <Popup>
            <div className="max-w-xs">
              <p className="font-semibold text-slate-900">{entry.title}</p>
              <p className="mt-1 text-sm text-slate-600 line-clamp-2">{entry.content}</p>
              <p className="mt-2 text-xs text-slate-400">{entry.district}</p>
            </div>
          </Popup>
        </Marker>
      )),
    [entries]
  );

  return (
    <div className="relative min-h-0 bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">日志</p>
            <h1 className="text-3xl font-semibold text-slate-950">地图足迹</h1>
          </div>
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
            <span className="font-semibold text-slate-900">地图</span>
          </div>
        </div>
      </header>

      <div className="relative h-[min(62dvh,42rem)] w-full">
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          zoomControl
          className="h-full w-full"
        >
          <MapViewUpdater center={center} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={createClusterIcon}
            showCoverageOnHover={false}
            spiderfyOnMaxZoom
            zoomToBoundsOnClick
          >
            {markers}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      <button className="absolute bottom-6 right-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--theme-blue)] text-white shadow-[0_1.125rem_2.5rem_-1.125rem_rgba(91,206,250,0.7)] transition hover:brightness-95">
        <span className="text-3xl leading-none">+</span>
      </button>

      {permissionStatus === 'denied' ? (
        <div className="pointer-events-none absolute left-1/2 top-24 z-30 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-2 text-sm text-slate-600 shadow-sm">
          当前无法获取地理位置，默认显示北京中心。
        </div>
      ) : null}
    </div>
  );
};

export default MapView;
