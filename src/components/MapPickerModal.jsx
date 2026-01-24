import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet icon paths when bundlers don't handle them automatically
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapPickerModal({ dateLabel, initialPos, onClose, onConfirm }) {
    const [marker, setMarker] = useState(initialPos || null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    function ClickHandler() {
        useMapEvents({
            click(e) {
                setMarker({ lat: e.latlng.lat, lng: e.latlng.lng });
            }
        });
        return null;
    }

    const searchAddress = async (q) => {
        if (!q || q.trim() === '') return;
        setIsSearching(true);
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=6`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Search failed');
            const json = await res.json();
            setResults(json || []);
        } catch (e) {
            console.error('Search error', e);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(2,6,23,0.55)',
                padding: 20
            }}
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div style={{ width: '100%', maxWidth: 980, height: '80vh', borderRadius: 12, overflow: 'hidden', background: '#fff' }}
                onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                    <div style={{ fontWeight: 900 }}>Buscar / seleccionar ubicación - {dateLabel}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={onClose} style={{ padding: '8px 10px', borderRadius: 8, background: '#efefef', border: 'none', fontWeight: 700 }}>Cerrar</button>
                        <button
                            onClick={() => {
                                if (!marker) return alert('Seleccione un punto en el mapa o desde resultados');
                                onConfirm(marker.lat, marker.lng);
                                onClose();
                            }}
                            style={{ padding: '8px 10px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 900 }}
                        >
                            Guardar ubicación
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', height: 'calc(100% - 48px)' }}>
                    <div style={{ width: 360, borderRight: '1px solid #eee', padding: 12, overflowY: 'auto' }}>
                        <div style={{ marginBottom: 8 }}>
                            <input
                                placeholder="Buscar dirección, calle, ciudad..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') searchAddress(query); }}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd' }}
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button onClick={() => searchAddress(query)} style={{ padding: '8px 10px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', fontWeight: 900 }}>
                                    {isSearching ? 'Buscando...' : 'Buscar'}
                                </button>
                                <button onClick={() => { setQuery(''); setResults([]); }} style={{ padding: '8px 10px', borderRadius: 8, background: '#efefef', border: 'none', fontWeight: 800 }}>
                                    Limpiar
                                </button>
                            </div>
                        </div>

                        <div>
                            <div style={{ fontWeight: 900, marginBottom: 8 }}>Resultados</div>
                            {results.length === 0 && <div style={{ color: '#666', fontSize: 13 }}>Sin resultados</div>}
                            {results.map((r, i) => (
                                <div key={i} onClick={() => {
                                    setMarker({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
                                }} style={{ cursor: 'pointer', padding: 8, borderRadius: 8, background: '#fafafa', marginBottom: 8, border: marker && marker.lat === parseFloat(r.lat) && marker.lng === parseFloat(r.lon) ? '2px solid #10b981' : '1px solid #eee' }}>
                                    <div style={{ fontWeight: 800 }}>{r.display_name.split(',')[0]}</div>
                                    <div style={{ fontSize: 12, color: '#555' }}>{r.display_name}</div>
                                </div>
                            ))}
                        </div>

                    </div>

                    <div style={{ flex: 1 }}>
                        <MapContainer center={ initialPos ? [initialPos.lat, initialPos.lng] : [ -36.8485, 174.7633 ] } zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <ClickHandler />
                            {marker && (
                                <Marker position={[marker.lat, marker.lng]}>
                                    <Popup>
                                        {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
                                    </Popup>
                                </Marker>
                            )}
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MapPickerModal;