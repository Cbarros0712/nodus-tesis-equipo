import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';

const CENTRO_CORDOBA = [-31.4167, -64.1833];

const iconoHospital = (cantidad, vencido) => L.divIcon({
  className: '',
  html: `<div style="
    width:34px;height:34px;border-radius:50%;
    background:${vencido ? '#E85A6D' : '#2C7DA0'};color:white;
    border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    font:700 13px system-ui,sans-serif;">${cantidad}</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18]
});

const iconoSeleccion = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#F2A541;border:3px solid white;box-shadow:0 0 0 2px #F2A541;"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const estaVencido = (p) => p.fechaEstimadaDevolucion && new Date(p.fechaEstimadaDevolucion) < new Date();
const fecha = (iso) => iso ? iso.split('T')[0].split('-').reverse().join('/') : '—';

const parsearCoordenadas = (texto) => {
  const nums = texto.trim().match(/-?\d+(?:[.,]\d+)?/g);
  if (!nums || nums.length !== 2) return null;
  const [lat, lng] = nums.map(n => parseFloat(n.replace(',', '.')));
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

function AjustarVista({ puntos }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 1) map.setView(puntos[0], 15);
    else if (puntos.length > 1) map.fitBounds(puntos, { padding: [50, 50], maxZoom: 15 });
  }, [map, puntos]);
  return null;
}

function ClickEnMapa({ activo, onClick }) {
  useMapEvents({ click: (e) => { if (activo) onClick(e.latlng); } });
  return null;
}

function MapaPrestamos() {
  const [prestamos, setPrestamos] = useState([]);
  const [hospitales, setHospitales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const [geocodificando, setGeocodificando] = useState(false);
  const [resultadoGeo, setResultadoGeo] = useState(null);

  const [editandoId, setEditandoId] = useState(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [pegado, setPegado] = useState('');
  const [errorCoord, setErrorCoord] = useState('');

  const cargar = () =>
    Promise.all([api.get('/prestamos/mapa'), api.get('/hospitalesexternos')])
      .then(([rm, rh]) => {
        setPrestamos(rm.data);
        setHospitales(rh.data);
        setErrorCarga('');
      })
      .catch((err) => {
        const status = err.response?.status;
        setErrorCarga(status
          ? `No se pudieron cargar los préstamos (error ${status} de la API). Si la API se actualizó, reiniciala.`
          : 'No se pudo conectar con la API.');
      })
      .finally(() => setCargando(false));

  useEffect(() => { cargar(); }, []);

  const marcadores = useMemo(() => {
    const porHospital = new Map();
    for (const p of prestamos) {
      if (p.latitud == null || p.longitud == null) continue;
      if (!porHospital.has(p.idHospital)) {
        porHospital.set(p.idHospital, {
          idHospital: p.idHospital, hospital: p.hospital, direccion: p.direccion, localidad: p.localidad,
          contacto: p.contacto, telefono: p.telefono, posicion: [p.latitud, p.longitud], prestamos: []
        });
      }
      porHospital.get(p.idHospital).prestamos.push(p);
    }
    return [...porHospital.values()];
  }, [prestamos]);

  const puntos = useMemo(() => marcadores.map(m => m.posicion), [marcadores]);

  const activosPorHospital = useMemo(() => {
    const cuenta = {};
    for (const p of prestamos) cuenta[p.idHospital] = (cuenta[p.idHospital] || 0) + 1;
    return cuenta;
  }, [prestamos]);

  const sinCoordenadas = useMemo(() =>
    hospitales
      .filter(h => h.activo && (h.latitud == null || h.longitud == null))
      .sort((a, b) => (activosPorHospital[b.idHospital] || 0) - (activosPorHospital[a.idHospital] || 0) || a.nombre.localeCompare(b.nombre)),
    [hospitales, activosPorHospital]);

  const prestamosFueraDelMapa = prestamos.filter(p => p.latitud == null || p.longitud == null).length;

  const geocodificar = async () => {
    setGeocodificando(true);
    setResultadoGeo(null);
    try {
      const r = await api.post('/hospitalesexternos/geocodificar');
      setResultadoGeo(r.data);
      await cargar();
    } catch {
      setResultadoGeo({ error: 'No se pudo completar la geocodificación. Revisá la conexión e intentá de nuevo.' });
    } finally {
      setGeocodificando(false);
    }
  };

  const abrirEdicion = (h) => {
    setEditandoId(h.idHospital);
    setLat(''); setLng(''); setPegado(''); setErrorCoord('');
  };
  const cerrarEdicion = () => { setEditandoId(null); setErrorCoord(''); };

  const alPegar = (texto) => {
    setPegado(texto);
    const c = parsearCoordenadas(texto);
    if (c) { setLat(String(c.lat)); setLng(String(c.lng)); setErrorCoord(''); }
  };

  const guardarCoordenadas = async () => {
    const la = parseFloat(String(lat).replace(',', '.'));
    const ln = parseFloat(String(lng).replace(',', '.'));
    if (Number.isNaN(la) || Number.isNaN(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) {
      setErrorCoord('Latitud o longitud inválida.');
      return;
    }
    try {
      await api.put(`/hospitalesexternos/${editandoId}/coordenadas`, { latitud: la, longitud: ln });
      cerrarEdicion();
      cargar();
    } catch {
      setErrorCoord('No se pudieron guardar las coordenadas.');
    }
  };

  const posicionSeleccionada = useMemo(() => {
    const la = parseFloat(String(lat).replace(',', '.'));
    const ln = parseFloat(String(lng).replace(',', '.'));
    return editandoId && !Number.isNaN(la) && !Number.isNaN(ln) ? [la, ln] : null;
  }, [editandoId, lat, lng]);

  return (
    <>
      <div className="rwd-page-header" style={{ padding: '20px 24px 0', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: '0.5px' }}>GESTIÓN DE PRÉSTAMOS</h2>
          <span style={{
            background: 'rgba(124, 110, 250, 0.12)', color: '#5e51d6',
            border: '1px solid rgba(124, 110, 250, 0.25)', padding: '4px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 600
          }}>MAPA DE PRÉSTAMOS</span>
          <p style={{ fontSize: 13, color: '#6B7C8C', margin: 0 }}>Ubicación de los equipos prestados actualmente</p>
        </div>

        {errorCarga && <div style={bannerError}>⚠ {errorCarga}</div>}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <span style={chipResumen}>🤝 {prestamos.length} préstamo(s) activo(s)</span>
          <span style={chipResumen}>🏥 {marcadores.length} hospital(es) en el mapa</span>
          {prestamosFueraDelMapa > 0 && (
            <span style={{ ...chipResumen, background: '#FFF4E5', color: '#8A5A00' }}>
              ⚠ {prestamosFueraDelMapa} préstamo(s) sin ubicación: cargá las coordenadas en el panel
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 24px 24px', background: 'white', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {}
        <div style={{ flex: '1 1 480px', minWidth: 0, position: 'relative' }}>
          <MapContainer center={CENTRO_CORDOBA} zoom={12} style={{ height: '70vh', minHeight: 420, borderRadius: 12, border: '1px solid #E5EDF3' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <AjustarVista puntos={puntos} />
            <ClickEnMapa activo={!!editandoId} onClick={(ll) => {
              setLat(ll.lat.toFixed(6)); setLng(ll.lng.toFixed(6)); setPegado(''); setErrorCoord('');
            }} />

            {marcadores.map(m => (
              <Marker key={m.idHospital} position={m.posicion} icon={iconoHospital(m.prestamos.length, m.prestamos.some(estaVencido))}>
                <Popup maxWidth={320}>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>{m.hospital}</div>
                    <div style={{ color: '#6B7C8C', marginTop: 2 }}>{[m.direccion, m.localidad].filter(Boolean).join(', ') || 'Sin dirección'}</div>
                    {(m.contacto || m.telefono) && (
                      <div style={{ color: '#4A5868', marginTop: 4 }}>👤 {[m.contacto, m.telefono].filter(Boolean).join(' · ')}</div>
                    )}
                    <div style={{ fontWeight: 600, marginTop: 10, marginBottom: 4, fontSize: 11, color: '#6B7C8C', textTransform: 'uppercase' }}>
                      Equipos prestados ({m.prestamos.length})
                    </div>
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {m.prestamos.map(p => (
                        <div key={p.idPrestamo} style={{ padding: '6px 0', borderTop: '1px solid #F1F4F7' }}>
                          <div style={{ fontWeight: 600 }}>
                            {[p.tipoActivo, p.marca, p.modelo].filter(Boolean).join(' · ')}
                            {estaVencido(p) && <span style={{ color: '#E85A6D', marginLeft: 6, fontSize: 11 }}>VENCIDO</span>}
                          </div>
                          <div style={{ color: '#6B7C8C', fontSize: 12 }}>
                            N° serie {p.nroSerie} · desde {fecha(p.fechaPrestamo)}
                            {p.fechaEstimadaDevolucion && ` · vuelve ${fecha(p.fechaEstimadaDevolucion)}`}
                          </div>
                          {p.componentes?.length > 0 && (
                            <div style={{ color: '#6B7C8C', fontSize: 12 }}>Con: {p.componentes.join(', ')}</div>
                          )}
                          {p.responsable && <div style={{ color: '#6B7C8C', fontSize: 12 }}>Registró: {p.responsable}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {posicionSeleccionada && <Marker position={posicionSeleccionada} icon={iconoSeleccion} />}
          </MapContainer>

          {!cargando && !errorCarga && prestamos.length === 0 && (
            <div style={avisoSobreMapa}>No hay préstamos activos en este momento.</div>
          )}
        </div>

        {}
        <aside style={{ flex: '0 1 340px', minWidth: 280, border: '1px solid #E5EDF3', borderRadius: 12, display: 'flex', flexDirection: 'column', maxHeight: '70vh', minHeight: 420 }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #F0F3F7' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>Hospitales sin ubicación ({sinCoordenadas.length})</div>
            <p style={{ margin: '4px 0 12px', fontSize: 12, color: '#6B7C8C' }}>
              No aparecen en el mapa hasta tener coordenadas.
            </p>
            <button onClick={geocodificar} disabled={geocodificando || sinCoordenadas.length === 0} style={{ ...btnSave, width: '100%', opacity: geocodificando || sinCoordenadas.length === 0 ? 0.6 : 1 }}>
              {geocodificando ? `Buscando... (~${Math.ceil(sinCoordenadas.length * 2.2)} seg)` : '📍 Buscar coordenadas automáticamente'}
            </button>
            {resultadoGeo && (
              <div style={{ marginTop: 10, fontSize: 12, color: resultadoGeo.error ? '#842029' : '#1E6B45' }}>
                {resultadoGeo.error
                  ? `⚠ ${resultadoGeo.error}`
                  : `✓ ${resultadoGeo.geocodificados.length} ubicado(s) · ${resultadoGeo.sinResultado.length} sin resultado`}
              </div>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {sinCoordenadas.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#9E9CBB', fontSize: 13 }}>
                ✓ Todos los hospitales tienen coordenadas.
              </div>
            )}
            {sinCoordenadas.map(h => (
              <div key={h.idHospital} style={{ padding: '12px 18px', borderBottom: '1px solid #F1F4F7', background: editandoId === h.idHospital ? '#F7FAFC' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#2D3748' }}>{h.nombre}</div>
                    <div style={{ fontSize: 12, color: '#6B7C8C' }}>{[h.direccion, h.localidad].filter(Boolean).join(', ') || 'Sin dirección cargada'}</div>
                    {activosPorHospital[h.idHospital] > 0 && (
                      <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 600, color: '#8A5A00', background: '#FFF4E5', padding: '2px 8px', borderRadius: 6 }}>
                        {activosPorHospital[h.idHospital]} préstamo(s) activo(s)
                      </span>
                    )}
                  </div>
                  {editandoId !== h.idHospital && (
                    <button onClick={() => abrirEdicion(h)} style={btnChico}>Cargar</button>
                  )}
                </div>

                {editandoId === h.idHospital && (
                  <div style={{ marginTop: 10 }}>
                    <label style={lblStyle}>Pegar coordenadas</label>
                    <input value={pegado} onChange={e => alPegar(e.target.value)} placeholder="-31.4064, -64.1580" style={inpStyle} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      <div>
                        <label style={lblStyle}>Latitud</label>
                        <input value={lat} onChange={e => setLat(e.target.value)} placeholder="-31.4064" style={inpStyle} />
                      </div>
                      <div>
                        <label style={lblStyle}>Longitud</label>
                        <input value={lng} onChange={e => setLng(e.target.value)} placeholder="-64.1580" style={inpStyle} />
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: '#6B7C8C', margin: '8px 0 0' }}>
                      También podés hacer click en el mapa para marcar la ubicación.
                    </p>
                    {errorCoord && <span style={errStyle}>⚠ {errorCoord}</span>}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                      <button onClick={cerrarEdicion} style={btnGhost}>Cancelar</button>
                      <button onClick={guardarCoordenadas} style={btnSave}>✓ Guardar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

const chipResumen = { background: '#F0F6FA', color: '#4A5868', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 };
const lblStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#4A5868', marginBottom: 4 };
const inpStyle = { width: '100%', padding: '8px 10px', border: '1.5px solid #E5EDF3', borderRadius: 8, fontSize: 13, background: '#FAFBFC', outline: 'none', boxSizing: 'border-box' };
const errStyle = { display: 'block', color: '#E85A6D', fontSize: 11, marginTop: 6, fontWeight: 500 };
const btnGhost = { background: 'white', color: '#6B7C8C', border: '1px solid #E5EDF3', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const btnSave = { background: 'linear-gradient(135deg, #2C7DA0 0%, #4A9BB8 100%)', color: 'white', border: 'none', padding: '9px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const btnChico = { background: '#F0F6FA', color: '#2C7DA0', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
const bannerError = { background: '#FDECEE', border: '1px solid #F5C2C7', color: '#842029', padding: '12px 14px', borderRadius: 10, fontSize: 13, marginTop: 14 };
const avisoSobreMapa = { position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'white', padding: '8px 14px', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', fontSize: 13, color: '#4A5868' };

export default MapaPrestamos;
