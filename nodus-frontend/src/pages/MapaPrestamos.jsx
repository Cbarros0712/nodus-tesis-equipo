import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';
import { useToast, mensajeDeError } from '../components/Toast';

const CENTRO_CORDOBA = [-31.4167, -64.1833];

const iconoHospital = (cantidad, vencido) => L.divIcon({
  className: '',
  html: `<div style="
    width:34px;height:34px;border-radius:50%;
    background:${vencido ? '#B93B1B' : '#1F6E8F'};color:white;
    border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    font:700 13px system-ui,sans-serif;">${cantidad}${vencido ? '!' : ''}</div>`,
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

const hoyLocal = () => {
  const d = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
};
const estaVencido = (p) => !!p.fechaEstimadaDevolucion && p.fechaEstimadaDevolucion.split('T')[0] < hoyLocal();
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
  const toast = useToast();
  const montado = useRef(true);
  useEffect(() => () => { montado.current = false; }, []);
  const [guardando, setGuardando] = useState(false);
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
        if (!montado.current) return;
        setPrestamos(rm.data);
        setHospitales(rh.data);
        setErrorCarga('');
      })
      .catch((err) => {
        if (!montado.current) return;
        const status = err.response?.status;
        setErrorCarga(status
          ? `No se pudieron cargar los préstamos (error ${status} de la API). Si la API se actualizó, reiniciala.`
          : 'No se pudo conectar con la API.');
      })
      .finally(() => { if (montado.current) setCargando(false); });

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
    if (geocodificando) return;
    setGeocodificando(true);
    setResultadoGeo(null);
    try {
      const r = await api.post('/hospitalesexternos/geocodificar');
      setResultadoGeo(r.data);
      toast.success('Búsqueda terminada', `${r.data.geocodificados.length} hospital(es) ubicado(s), ${r.data.sinResultado.length} sin resultado`);
      await cargar();
    } catch {
      setResultadoGeo({ error: 'No se pudo completar la geocodificación. Revisá la conexión e intentá de nuevo.' });
    } finally {
      if (montado.current) setGeocodificando(false);
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
    if (guardando) return;
    if (!String(lat).trim() || !String(lng).trim()) {
      setErrorCoord('Completá la latitud y la longitud, o hacé click en el mapa.');
      return;
    }
    const la = parseFloat(String(lat).replace(',', '.'));
    const ln = parseFloat(String(lng).replace(',', '.'));
    if (Number.isNaN(la) || Number.isNaN(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) {
      setErrorCoord('Latitud o longitud inválida (latitud entre -90 y 90, longitud entre -180 y 180).');
      return;
    }
    setGuardando(true);
    try {
      await api.put(`/hospitalesexternos/${editandoId}/coordenadas`, { latitud: la, longitud: ln });
      cerrarEdicion();
      toast.success('Coordenadas guardadas', 'El hospital ya aparece en el mapa si tiene préstamos activos.');
      cargar();
    } catch (err) {
      setErrorCoord(mensajeDeError(err, 'No se pudieron guardar las coordenadas.'));
    } finally {
      if (montado.current) setGuardando(false);
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
            background: 'rgba(124, 110, 250, 0.12)', color: '#4B3FBF',
            border: '1px solid rgba(124, 110, 250, 0.25)', padding: '4px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 600
          }}>MAPA DE PRÉSTAMOS</span>
          <p style={{ fontSize: 13, color: '#5C6B7A', margin: 0 }}>Ubicación de los equipos prestados actualmente</p>
        </div>

        {errorCarga && (
          <div role="alert" style={bannerError}>
            ⚠ {errorCarga}{' '}
            <button type="button" onClick={cargar} style={{ ...btnGhost, marginLeft: 8 }}>Reintentar</button>
          </div>
        )}
        {cargando && <div role="status" style={{ fontSize: 13, color: '#5C6B7A', marginTop: 12 }}>Cargando mapa…</div>}

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
        <div role="region" aria-label="Mapa de préstamos activos" style={{ flex: '1 1 480px', minWidth: 0, position: 'relative' }}>
          <MapContainer center={CENTRO_CORDOBA} zoom={12} style={{ height: '70vh', minHeight: 420, borderRadius: 12, border: '1px solid #8493A2' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <AjustarVista puntos={puntos} />
            <ClickEnMapa activo={!!editandoId} onClick={(ll) => {
              setLat(ll.lat.toFixed(6)); setLng(ll.lng.toFixed(6)); setPegado(''); setErrorCoord('');
            }} />

            {marcadores.map(m => (
              <Marker key={m.idHospital} position={m.posicion} title={`${m.hospital}: ${m.prestamos.length} préstamo(s) activo(s)${m.prestamos.some(estaVencido) ? ', con vencidos' : ''}`} icon={iconoHospital(m.prestamos.length, m.prestamos.some(estaVencido))}>
                <Popup maxWidth={320}>
                  <div style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>{m.hospital}</div>
                    <div style={{ color: '#5C6B7A', marginTop: 2 }}>{[m.direccion, m.localidad].filter(Boolean).join(', ') || 'Sin dirección'}</div>
                    {(m.contacto || m.telefono) && (
                      <div style={{ color: '#4A5868', marginTop: 4 }}>👤 {[m.contacto, m.telefono].filter(Boolean).join(' · ')}</div>
                    )}
                    <div style={{ fontWeight: 600, marginTop: 10, marginBottom: 4, fontSize: 11, color: '#5C6B7A', textTransform: 'uppercase' }}>
                      Equipos prestados ({m.prestamos.length})
                    </div>
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {m.prestamos.map(p => (
                        <div key={p.idPrestamo} style={{ padding: '6px 0', borderTop: '1px solid #F1F4F7' }}>
                          <div style={{ fontWeight: 600 }}>
                            {[p.tipoActivo, p.marca, p.modelo].filter(Boolean).join(' · ')}
                            {estaVencido(p) && <span style={{ color: '#B93B1B', marginLeft: 6, fontSize: 11, fontWeight: 700 }}>VENCIDO</span>}
                          </div>
                          <div style={{ color: '#5C6B7A', fontSize: 12 }}>
                            N° serie {p.nroSerie} · desde {fecha(p.fechaPrestamo)}
                            {p.fechaEstimadaDevolucion && ` · vuelve ${fecha(p.fechaEstimadaDevolucion)}`}
                          </div>
                          {p.componentes?.length > 0 && (
                            <div style={{ color: '#5C6B7A', fontSize: 12 }}>Con: {p.componentes.join(', ')}</div>
                          )}
                          {p.responsable && <div style={{ color: '#5C6B7A', fontSize: 12 }}>Registró: {p.responsable}</div>}
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
        <aside aria-label="Hospitales sin ubicación" style={{ flex: '0 1 340px', minWidth: 280, border: '1px solid #8493A2', borderRadius: 12, display: 'flex', flexDirection: 'column', maxHeight: '70vh', minHeight: 420 }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #F0F3F7' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>Hospitales sin ubicación ({sinCoordenadas.length})</div>
            <p style={{ margin: '4px 0 12px', fontSize: 12, color: '#5C6B7A' }}>
              No aparecen en el mapa hasta tener coordenadas.
            </p>
            <button type="button" onClick={geocodificar} disabled={geocodificando || sinCoordenadas.length === 0} style={{ ...btnSave, width: '100%', opacity: geocodificando || sinCoordenadas.length === 0 ? 0.6 : 1 }}>
              {geocodificando ? `Buscando... (~${Math.ceil(sinCoordenadas.length * 2.2)} seg)` : '📍 Buscar coordenadas automáticamente'}
            </button>
            {resultadoGeo && (
              <div role="status" style={{ marginTop: 10, fontSize: 12, color: resultadoGeo.error ? '#842029' : '#1E6B45' }}>
                {resultadoGeo.error
                  ? `⚠ ${resultadoGeo.error}`
                  : `✓ ${resultadoGeo.geocodificados.length} ubicado(s) · ${resultadoGeo.sinResultado.length} sin resultado`}
              </div>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {sinCoordenadas.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#5C6B7A', fontSize: 13 }}>
                ✓ Todos los hospitales tienen coordenadas.
              </div>
            )}
            {sinCoordenadas.map(h => (
              <div key={h.idHospital} style={{ padding: '12px 18px', borderBottom: '1px solid #F1F4F7', background: editandoId === h.idHospital ? '#F7FAFC' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#2D3748' }}>{h.nombre}</div>
                    <div style={{ fontSize: 12, color: '#5C6B7A' }}>{[h.direccion, h.localidad].filter(Boolean).join(', ') || 'Sin dirección cargada'}</div>
                    {activosPorHospital[h.idHospital] > 0 && (
                      <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 600, color: '#8A5A00', background: '#FFF4E5', padding: '2px 8px', borderRadius: 6 }}>
                        {activosPorHospital[h.idHospital]} préstamo(s) activo(s)
                      </span>
                    )}
                  </div>
                  {editandoId !== h.idHospital && (
                    <button type="button" onClick={() => abrirEdicion(h)} aria-label={`Cargar coordenadas de ${h.nombre}`} style={btnChico}>Cargar</button>
                  )}
                </div>

                {editandoId === h.idHospital && (
                  <div style={{ marginTop: 10 }} onKeyDown={(e) => { if (e.key === 'Escape') cerrarEdicion(); }}>
                    <label htmlFor="geo-pegado" style={lblStyle}>Pegar coordenadas</label>
                    <input id="geo-pegado" autoFocus value={pegado} onChange={e => alPegar(e.target.value)} placeholder="-31.4064, -64.1580" style={inpStyle} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      <div>
                        <label htmlFor="geo-lat" style={lblStyle}>Latitud</label>
                        <input id="geo-lat" inputMode="decimal" value={lat} onChange={e => setLat(e.target.value)} placeholder="-31.4064" style={inpStyle} />
                      </div>
                      <div>
                        <label htmlFor="geo-lng" style={lblStyle}>Longitud</label>
                        <input id="geo-lng" inputMode="decimal" value={lng} onChange={e => setLng(e.target.value)} placeholder="-64.1580" style={inpStyle} />
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: '#5C6B7A', margin: '8px 0 0' }}>
                      También podés hacer click en el mapa para marcar la ubicación.
                    </p>
                    {errorCoord && <span role="alert" style={errStyle}>⚠ {errorCoord}</span>}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                      <button type="button" onClick={cerrarEdicion} disabled={guardando} style={btnGhost}>Cancelar</button>
                      <button type="button" onClick={guardarCoordenadas} disabled={guardando} style={{ ...btnSave, opacity: guardando ? 0.6 : 1 }}>{guardando ? 'Guardando…' : '✓ Guardar'}</button>
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
const inpStyle = { width: '100%', padding: '8px 10px', border: '1.5px solid #8493A2', borderRadius: 8, fontSize: 13, background: 'white', outline: 'none', boxSizing: 'border-box' };
const errStyle = { display: 'block', color: '#B93B1B', fontSize: 12, marginTop: 6, fontWeight: 600 };
const btnGhost = { background: 'white', color: '#5C6B7A', border: '1px solid #8493A2', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const btnSave = { background: 'linear-gradient(135deg, #1B6585 0%, #1F6E8F 100%)', color: 'white', border: 'none', padding: '9px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const btnChico = { background: '#F0F6FA', color: '#1F6E8F', border: 'none', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
const bannerError = { background: '#FDECEE', border: '1px solid #F5C2C7', color: '#842029', padding: '12px 14px', borderRadius: 10, fontSize: 13, marginTop: 14 };
const avisoSobreMapa = { position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'white', padding: '8px 14px', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', fontSize: 13, color: '#4A5868' };

export default MapaPrestamos;
