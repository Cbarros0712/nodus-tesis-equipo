import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { EVENTO_PRESTAMOS_ACTUALIZADOS } from '../vencimientos';
import { urlDocumento, urlRemito, urlFirmado, fechaDMY, fechaHora, faltaFirma } from '../documentosPrestamo';
import { ModalSubirFirmado } from '../components/DocumentosPrestamo';
import { useToast, mensajeDeError } from '../components/Toast';

function Remitos() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const remitoDestacado = searchParams.get('remito');

  const [prestamos, setPrestamos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [modalFirma, setModalFirma] = useState(null);

  const cargar = async () => {
    try {
      const r = await api.get('/prestamos');
      setPrestamos(r.data);
      window.dispatchEvent(new CustomEvent(EVENTO_PRESTAMOS_ACTUALIZADOS, { detail: r.data }));
    } catch (err) {
      toast.error('No se pudieron cargar los remitos', mensajeDeError(err, 'Revisá la conexión e intentá de nuevo.'));
    }
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (remitoDestacado && prestamos.length > 0)
      document.getElementById(`remito-${remitoDestacado}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [remitoDestacado, prestamos]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && modalFirma) setModalFirma(null); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalFirma]);

  const conteos = useMemo(() => {
    const falta = prestamos.filter(faltaFirma).length;
    return { todos: prestamos.length, 'falta-firma': falta, 'al-dia': prestamos.length - falta };
  }, [prestamos]);

  const remitosFiltrados = useMemo(() => {
    let lista = [...prestamos].sort((a, b) => (b.numeroRemito || '').localeCompare(a.numeroRemito || ''));
    if (filtro === 'falta-firma') lista = lista.filter(faltaFirma);
    if (filtro === 'al-dia') lista = lista.filter(p => !faltaFirma(p));
    const q = busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter(p =>
        p.numeroRemito?.toLowerCase().includes(q) ||
        p.numeroRemitoDevolucion?.toLowerCase().includes(q) ||
        p.equipo?.modelo?.toLowerCase().includes(q) ||
        p.equipo?.nroSerie?.toLowerCase().includes(q) ||
        p.hospital?.nombre?.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [prestamos, filtro, busqueda]);

  const hayFiltros = filtro !== 'todos' || !!busqueda.trim();
  const limpiarFiltros = () => { setFiltro('todos'); setBusqueda(''); };

  const tabStyle = (activo) => ({
    padding: '10px 0', fontSize: 14, fontWeight: activo ? 600 : 400,
    color: activo ? '#1a1a1a' : '#5C6B7A',
    borderBottom: activo ? '2px solid #1a1a1a' : '2px solid transparent',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
  });

  const tabProps = (valor) => ({
    role: 'button',
    tabIndex: 0,
    'aria-pressed': filtro === valor,
    onClick: () => setFiltro(valor),
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFiltro(valor); } }
  });

  const alSubirFirmado = (tipo, prestamo) => {
    setModalFirma(null);
    toast.success(
      'Firmado cargado',
      `Se guardó el escaneo firmado del remito de ${tipo === 'salida' ? 'salida' : 'devolución'} ${tipo === 'salida' ? prestamo.numeroRemito : prestamo.numeroRemitoDevolucion}.`
    );
    cargar();
  };

  return (
    <>
      <div className="rwd-page-header" style={{ padding: '20px 24px 0', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0, letterSpacing: '0.5px' }}>GESTIÓN DE PRÉSTAMOS</h2>
          <span style={{
            background: 'rgba(124, 110, 250, 0.12)', color: '#5e51d6',
            border: '1px solid rgba(124, 110, 250, 0.25)', padding: '4px 12px', borderRadius: 8,
            fontSize: 12, fontWeight: 600
          }}>REMITOS</span>
          <p style={{ fontSize: 13, color: '#5C6B7A', margin: 0 }}>Remitos de salida y devolución, cada uno con su escaneo firmado</p>
        </div>

        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid #E5EDF3', marginTop: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div {...tabProps('todos')} style={tabStyle(filtro === 'todos')}>Todos ({conteos.todos})</div>
          <div {...tabProps('falta-firma')} style={tabStyle(filtro === 'falta-firma')} title="Algún remito todavía no tiene el escaneo firmado">
            Falta subir firmado
            <span style={{
              minWidth: 20, padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 700, textAlign: 'center',
              background: conteos['falta-firma'] > 0 ? '#FAEEDA' : '#EEF1F4',
              color: conteos['falta-firma'] > 0 ? '#633806' : '#5C6B7A',
              border: conteos['falta-firma'] > 0 ? '1px solid #EBCF9F' : '1px solid transparent'
            }}>{conteos['falta-firma']}</span>
          </div>
          <div {...tabProps('al-dia')} style={tabStyle(filtro === 'al-dia')} title="Todos sus remitos tienen el escaneo firmado">
            Firmados ({conteos['al-dia']})
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text" placeholder="Buscar remito, equipo u hospital..."
              aria-label="Buscar remito, equipo u hospital"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              style={{ ...inpStyle, width: 240 }}
            />
            {hayFiltros && (
              <button
                onClick={limpiarFiltros}
                style={{
                  background: 'transparent', border: '1px solid #E5EDF3', borderRadius: 8,
                  padding: '8px 12px', fontSize: 12, color: '#2C7DA0', fontWeight: 600, cursor: 'pointer'
                }}
              >Limpiar filtros</button>
            )}
          </div>
        </div>
      </div>

      <div className="rwd-table-wrap" style={{ padding: '20px 24px', background: 'white', overflowX: 'auto' }}>
        <table className="rwd-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              <th style={thStyle}>Préstamo</th>
              <th style={thStyle}>Equipo</th>
              <th style={thStyle}>Hospital</th>
              <th style={thStyle}>Remitos</th>
            </tr>
          </thead>
          <tbody>
            {remitosFiltrados.map((p, idx) => {
              const destacado = p.numeroRemito === remitoDestacado;
              const fondo = destacado ? '#EEF6FB' : (idx % 2 === 1 ? '#F8FAFC' : 'white');
              return (
                <tr
                  key={p.idPrestamo}
                  id={`remito-${p.numeroRemito}`}
                  style={{
                    borderBottom: '1px solid #F1F4F7',
                    background: fondo,
                    boxShadow: destacado ? 'inset 3px 0 0 #2C7DA0' : undefined,
                    transition: 'background 0.1s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = destacado ? '#E3F0F8' : '#F0F6FA'}
                  onMouseOut={(e) => e.currentTarget.style.background = fondo}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{p.estado}</div>
                    <Link to={`/prestamos?prestamo=${p.idPrestamo}`} style={{ fontSize: 11, color: '#4B3FBF', fontWeight: 600, textDecoration: 'none' }}>
                      Ver préstamo →
                    </Link>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500 }}>{p.equipo?.modelo}</div>
                    <div style={{ fontSize: 11, color: '#5C6B7A', fontFamily: 'monospace' }}>{p.equipo?.nroSerie}</div>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: 140 }}>{p.hospital?.nombre}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'normal' }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <TarjetaRemito
                        titulo="Remito de salida" numero={p.numeroRemito} color="#1F6E8F"
                        detalle={`Emitido ${fechaHora(p.fechaEmisionRemito)}`}
                        ver={urlRemito(p.idPrestamo)} descargar={urlRemito(p.idPrestamo, true)}
                        firmado={p.tieneFirmaSalida} fechaFirma={p.fechaCargaFirmaSalida}
                        verFirmado={urlFirmado(p.idPrestamo, 'salida')}
                        onSubir={() => setModalFirma({ prestamo: p, tipo: 'salida' })}
                      />
                      {p.numeroRemitoDevolucion ? (
                        <TarjetaRemito
                          titulo="Remito de devolución" numero={p.numeroRemitoDevolucion} color="#0F6E56"
                          detalle={`Devuelto el ${fechaDMY(p.fechaDevolucionReal)}`}
                          ver={urlDocumento(p.idPrestamo, 'remito-devolucion')} descargar={urlDocumento(p.idPrestamo, 'remito-devolucion', true)}
                          firmado={p.tieneFirmaDevolucion} fechaFirma={p.fechaCargaFirmaDevolucion}
                          verFirmado={urlFirmado(p.idPrestamo, 'devolucion')}
                          onSubir={() => setModalFirma({ prestamo: p, tipo: 'devolucion' })}
                        />
                      ) : p.estado === 'Devuelto' && (
                        <div style={{ ...tarjeta, borderStyle: 'dashed', color: '#5C6B7A', fontSize: 12, justifyContent: 'center' }}>
                          Devuelto el {fechaDMY(p.fechaDevolucionReal)}, antes de existir el remito de devolución
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {remitosFiltrados.length === 0 && (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: '#5C6B7A', fontSize: 13 }}>
                {prestamos.length === 0 ? 'No hay remitos registrados.' : 'No hay remitos que coincidan con los filtros.'}
              </td></tr>
            )}
          </tbody>
        </table>

        <p style={{ fontSize: 12, color: '#5C6B7A', margin: '16px 0 0', textAlign: 'left' }}>
          {remitosFiltrados.length} {remitosFiltrados.length === 1 ? 'préstamo' : 'préstamos'}
          {remitosFiltrados.length !== prestamos.length ? ` (de ${prestamos.length})` : ''}
        </p>
      </div>

      {modalFirma && (
        <ModalSubirFirmado
          prestamo={modalFirma.prestamo} tipo={modalFirma.tipo}
          onCerrar={() => setModalFirma(null)}
          onSubido={() => alSubirFirmado(modalFirma.tipo, modalFirma.prestamo)}
        />
      )}
    </>
  );
}

function TarjetaRemito({ titulo, numero, color, detalle, ver, descargar, firmado, fechaFirma, verFirmado, onSubir }) {
  return (
    <div style={{ ...tarjeta, borderColor: firmado ? '#BFE5D6' : '#E5EDF3' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#5C6B7A', fontWeight: 600 }}>{titulo}</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, color }}>{numero}</div>
          <div style={{ fontSize: 11, color: '#5C6B7A' }}>{detalle}</div>
        </div>
        <span
          title={firmado ? 'Firmado cargado' : 'Falta subir el firmado'}
          style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: firmado ? '#E1F5EE' : '#F1EFE8',
            color: firmado ? '#0F6E56' : '#444441',
            border: `1px solid ${firmado ? '#B8E7D4' : '#D9D6CB'}`
          }}
        >{firmado ? '✓ Firmado' : '– Pendiente'}</span>
      </div>

      <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
        <a href={ver} target="_blank" rel="noreferrer" style={lnkDoc}>📄 Ver PDF</a>
        <a href={descargar} style={{ ...lnkDoc, color: '#5C6B7A' }}>⬇ Descargar</a>
      </div>

      <div style={{ borderTop: '1px solid #F1F4F7', paddingTop: 8 }}>
        {firmado ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
            <a href={verFirmado} target="_blank" rel="noreferrer" style={{ ...lnkDoc, color: '#0F6E56' }}>✍ Ver firmado</a>
            <span style={{ fontSize: 11, color: '#5C6B7A' }}>cargado {fechaHora(fechaFirma)}</span>
            <button onClick={onSubir} style={btnReemplazar} title="Subir otro escaneo en lugar del actual">Reemplazar</button>
          </div>
        ) : (
          <button onClick={onSubir} style={btnSubir}>⬆ Subir firmado</button>
        )}
      </div>
    </div>
  );
}

const thStyle = { fontSize: 11, fontWeight: 600, color: '#5C6B7A', padding: '12px 8px', borderBottom: '1px solid #E5EDF3', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left' };
const tdStyle = { padding: '14px 8px', fontSize: 13, color: '#2D3748', whiteSpace: 'nowrap', verticalAlign: 'top' };
const inpStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #E5EDF3', borderRadius: 8, fontSize: 13, background: '#FAFBFC', outline: 'none', boxSizing: 'border-box' };
const lnkDoc = { color: '#1F6E8F', fontWeight: 600, textDecoration: 'none' };
const tarjeta = { width: 230, boxSizing: 'border-box', border: '1px solid #E5EDF3', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, background: 'white' };
const btnSubir = { background: '#F0F6FA', color: '#1F6E8F', border: '1px solid #D6E4EE', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const btnReemplazar = { background: 'none', border: 'none', padding: 0, color: '#5C6B7A', fontSize: 11, textDecoration: 'underline', cursor: 'pointer' };

export default Remitos;