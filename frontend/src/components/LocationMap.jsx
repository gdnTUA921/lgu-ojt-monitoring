import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon paths in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function LocationMap({ lat, lng, label = '', height = 240 }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !lat || !lng) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([lat, lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    if (label) {
      L.marker([lat, lng]).addTo(map)
        .bindPopup(`<b>${label}</b><br>Lat: ${lat}<br>Lng: ${lng}`)
        .openPopup();
    } else {
      L.marker([lat, lng]).addTo(map);
    }

    // Invalidate size after render to fix any sizing issues
    setTimeout(() => map.invalidateSize(), 100);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, label]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
    />
  );
}
