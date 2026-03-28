import React, { useState, useEffect } from 'react';
import {
  Plus, ChevronLeft, ChevronDown, ChevronRight, Activity,
  CheckCircle2, Clock, AlertCircle, CreditCard, PenLine,
  FileText, User, Edit2, Trash2
} from 'lucide-react';
import { getAllDocuments, createDocument, updateDocument, deleteDocument } from '../services/firebaseUtils';
import FirmaDigital from '../components/FirmaDigital';
import ModalRecibo from '../components/ModalRecibo';

const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta'];
const EST_COLORS = {
  pendiente: { bg: '#f1f5f9', color: '#64748b', label: 'Pendiente' },
  pagada: { bg: '#f0fdf4', color: '#059669', label: 'Pagada ✓' },
  proceso: { bg: '#fef3c7', color: '#b45309', label: 'En proceso' },
};

// ⚠️ Field definido FUERA de Sesiones para evitar re-montaje en cada render
const Field = ({ label, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{
      display: 'block', fontSize: '0.8rem', color: '#64748b',
      fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em'
    }}>{label}</label>
    {children}
  </div>
);

const Sesiones = () => {
  const [view, setView] = useState('list'); // 'list' | 'form' | 'plan'
  const [planes, setPlanes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Modales
  const [firmaModal, setFirmaModal] = useState(null); // { planId, sesionIndex }
  const [reciboModal, setReciboModal] = useState(null); // datos del recibo

  // Formulario nuevo plan
  const [formPlan, setFormPlan] = useState({
    clienteId: '', tratamiento: '', descripcion: '',
    totalSesiones: 4, precioPorSesion: 0,
  });

  // Modal de sesión (registrar pago)
  const [sesionModal, setSesionModal] = useState(null); // { planId, sesionIndex, sesion }
  const [sesionForm, setSesionForm] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        getAllDocuments('sesiones'),
        getAllDocuments('clientes'),
        getAllDocuments('servicios')
      ]);
      setPlanes(p);
      setClientes(c);
      setServicios(s);
    } catch { alert('Error cargando datos'); }
    finally { setLoading(false); }
  };

  const getCliente = (id) => clientes.find(c => c.id === id);
  const progreso = (plan) => {
    const pagadas = (plan.sesiones || []).filter(s => s.pagado).length;
    return { pagadas, total: plan.totalSesiones };
  };

  // ── Crear nuevo plan ─────────────────────────────────────────────────────
  const handleCrearPlan = async (e) => {
    e.preventDefault();
    if (!formPlan.clienteId) { alert('Selecciona un cliente'); return; }
    setSaving(true);
    try {
      const cliente = getCliente(formPlan.clienteId);
      const sesionesArray = Array.from({ length: Number(formPlan.totalSesiones) }, (_, i) => ({
        numero: i + 1,
        fecha: '',
        profesional: '',
        observaciones: '',
        pagado: false,
        metodoPago: 'efectivo',
        firma: '',
        reciboEnviado: false,
      }));
      await createDocument('sesiones', {
        ...formPlan,
        clienteNombre: cliente?.name || '',
        clienteEmail: cliente?.email || '',
        clientePhone: cliente?.phone || '',
        totalSesiones: Number(formPlan.totalSesiones),
        precioPorSesion: Number(formPlan.precioPorSesion),
        estado: 'activo',
        sesiones: sesionesArray,
      });
      await loadData();
      setView('list');
      setFormPlan({ clienteId: '', tratamiento: '', descripcion: '', totalSesiones: 4, precioPorSesion: 0 });
    } catch { alert('Error al crear el plan'); }
    finally { setSaving(false); }
  };

  // ── Abrir modal para registrar sesión ────────────────────────────────────
  const abrirSesionModal = (plan, idx) => {
    const s = plan.sesiones[idx];
    setSesionForm({
      fecha: s.fecha || new Date().toISOString().split('T')[0],
      profesional: s.profesional || '',
      observaciones: s.observaciones || '',
      metodoPago: s.metodoPago || 'efectivo',
    });
    setSesionModal({ planId: plan.id, sesionIndex: idx, plan, sesion: s });
  };

  // ── Guardar datos de sesión (sin pago aún) ───────────────────────────────
  const handleGuardarSesion = async () => {
    const { planId, sesionIndex, plan } = sesionModal;
    const nuevas = [...plan.sesiones];
    nuevas[sesionIndex] = { ...nuevas[sesionIndex], ...sesionForm, estado: 'proceso' };
    await updateDocument('sesiones', planId, { sesiones: nuevas });
    await loadData();
    setSesionModal(null);
  };

  // ── Marcar como pagada → abrir firma ─────────────────────────────────────
  const handleConfirmarPago = async () => {
    // Primero guardar cambios de la sesión
    const { planId, sesionIndex, plan } = sesionModal;
    const nuevas = [...plan.sesiones];
    nuevas[sesionIndex] = { ...nuevas[sesionIndex], ...sesionForm, estado: 'proceso' };
    await updateDocument('sesiones', planId, { sesiones: nuevas });
    await loadData();
    setSesionModal(null);
    // Abrir firma
    setFirmaModal({ planId, sesionIndex });
  };

  // ── Al confirmar firma ────────────────────────────────────────────────────
  const handleFirmaConfirmada = async (base64) => {
    try {
      const { planId, sesionIndex } = firmaModal;
      const plan = planes.find(p => p.id === planId);
      if (!plan) { alert('No se encontró el plan. Intenta de nuevo.'); return; }
      const nuevas = [...plan.sesiones];
      nuevas[sesionIndex] = {
        ...nuevas[sesionIndex],
        ...sesionForm,
        pagado: true,
        firma: base64,
        estado: 'pagada',
      };
      // Si todas pagadas → marcar plan como completado
      const todasPagadas = nuevas.every(s => s.pagado);
      await updateDocument('sesiones', planId, {
        sesiones: nuevas,
        ...(todasPagadas ? { estado: 'completado' } : {})
      });
      await loadData();
      setFirmaModal(null);

      // Abrir modal de recibo
      const sesionPagada = nuevas[sesionIndex];
      setReciboModal({
        clienteNombre: plan.clienteNombre,
        clienteEmail: plan.clienteEmail,
        clientePhone: plan.clientePhone,
        tratamiento: plan.tratamiento,
        numeroSesion: sesionPagada.numero,
        totalSesiones: plan.totalSesiones,
        monto: plan.precioPorSesion,
        metodoPago: sesionPagada.metodoPago,
        fecha: sesionPagada.fecha,
        profesional: sesionPagada.profesional,
        observaciones: sesionPagada.observaciones,
        firma: base64,
      });
    } catch (err) {
      console.error('Error al confirmar firma:', err);
      alert('Ocurrió un error al guardar la firma. Por favor intenta de nuevo.');
    }
  };

  const handleEliminarPlan = async (id) => {
    if (!window.confirm('¿Eliminar este plan de sesiones? Esta acción no se puede deshacer.')) return;
    await deleteDocument('sesiones', id);
    await loadData();
  };

  // ── Helpers UI ────────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px',
    border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#0f172a',
    boxSizing: 'border-box', outline: 'none',
  };

  // ── Variables para modal de firma (computadas fuera del JSX) ─────────────
  const planFirma = firmaModal ? planes.find(p => p.id === firmaModal.planId) : null;
  const sesionFirma = planFirma ? planFirma.sesiones?.[firmaModal.sesionIndex] : null;

  // ─────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">
            <h3>Sesiones y Pagos</h3>
            <p>Control de planes de tratamiento, pagos y firma por sesión.</p>
          </div>
          <button className="modern-btn-small" onClick={() => setView('form')}>
            <Plus size={18} /> Nuevo Plan
          </button>
        </div>

        {loading ? (
          <div className="center-align" style={{ padding: '3rem' }}>
            <div className="preloader-wrapper small active"><div className="spinner-layer spinner-blue-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
          </div>
        ) : planes.length === 0 ? (
          <div className="card-panel center-align" style={{ padding: '4rem 1rem', color: '#64748b' }}>
            <Activity size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <h6>No hay planes de sesiones activos</h6>
            <p>Crea un nuevo plan de tratamiento para comenzar.</p>
          </div>
        ) : (
          planes.map(plan => {
            const { pagadas, total } = progreso(plan);
            const pct = total && total > 0 ? Math.round((pagadas / total) * 100) : 0;
            const isOpen = expandedPlan === plan.id;
            return (
              <div key={plan.id} className="card-panel" style={{ marginBottom: '1rem', padding: '0 !important', overflow: 'hidden' }}>
                {/* Plan header */}
                <div
                  style={{
                    padding: '1.25rem 1.5rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '16px'
                  }}
                  onClick={() => setExpandedPlan(isOpen ? null : plan.id)}
                >
                  <div className="avatar" style={{
                    width: 44, height: 44,
                    backgroundColor: plan.estado === 'completado' ? '#d1fae5' : '#e0f2fe',
                    color: plan.estado === 'completado' ? '#059669' : '#0369a1',
                    fontSize: '1.1rem', flexShrink: 0
                  }}>
                    {String(plan.clienteNombre || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{plan.clienteNombre}</span>
                      <span className={`badge-soft ${plan.estado === 'completado' ? 'badge-green' : plan.estado === 'cancelado' ? 'badge-red' : 'badge-blue'}`}>
                        {plan.estado === 'completado' ? 'Completado' : plan.estado === 'cancelado' ? 'Cancelado' : 'Activo'}
                      </span>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{plan.tratamiento}</span>
                    {/* Progress bar */}
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, height: '6px', backgroundColor: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          backgroundColor: pct === 100 ? '#059669' : '#10b981',
                          borderRadius: '99px', transition: 'width 0.4s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {pagadas}/{total} sesiones · {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(plan.precioPorSesion || 0))} c/u
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button onClick={(e) => { e.stopPropagation(); handleEliminarPlan(plan.id); }}
                      className="btn-flat" style={{ padding: '0 6px', color: '#ef4444' }}>
                      <Trash2 size={16} />
                    </button>
                    {isOpen ? <ChevronDown size={20} color="#94a3b8" /> : <ChevronRight size={20} color="#94a3b8" />}
                  </div>
                </div>

                {/* Sesiones expandidas */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(plan.sesiones || []).map((sesion, idx) => {
                        const est = EST_COLORS[sesion?.estado] || EST_COLORS.pendiente;
                        return (
                          <div key={idx} style={{
                            display: 'flex', alignItems: 'center', gap: '14px',
                            padding: '12px 16px', borderRadius: '10px',
                            backgroundColor: est.bg, border: `1px solid ${est.bg === '#f1f5f9' ? '#e2e8f0' : est.bg}`
                          }}>
                            {/* Número */}
                            <div style={{
                               width: 34, height: 34, borderRadius: '50%',
                               backgroundColor: sesion?.pagado ? '#059669' : '#e2e8f0',
                               color: sesion?.pagado ? 'white' : '#94a3b8',
                               display: 'flex', alignItems: 'center', justifyContent: 'center',
                               fontWeight: 700, fontSize: '0.9rem', flexShrink: 0
                            }}>
                              {sesion?.pagado ? <CheckCircle2 size={18} /> : (sesion?.numero || idx + 1)}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                                  Sesión #{sesion?.numero || idx + 1}
                                </span>
                                <span style={{
                                  fontSize: '0.75rem', fontWeight: 600,
                                  color: est.color, padding: '2px 8px',
                                  backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '20px'
                                }}>
                                  {est.label}
                                </span>
                              </div>
                              {sesion?.fecha && (
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  {sesion.fecha} {sesion.profesional ? `· ${sesion.profesional}` : ''} {sesion.metodoPago && sesion.pagado ? `· ${sesion.metodoPago}` : ''}
                                </span>
                              )}
                              {sesion?.firma && (
                                <img src={sesion.firma} alt="firma" style={{ height: '28px', marginTop: '4px', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
                              )}
                            </div>

                            {/* Precio pagado */}
                            {sesion?.pagado && (
                              <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(plan.precioPorSesion || 0))}
                              </span>
                            )}

                            {/* Botón */}
                            {!sesion?.pagado && plan.estado !== 'cancelado' && (
                              <button
                                onClick={() => abrirSesionModal(plan, idx)}
                                className="modern-btn-small"
                                style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                              >
                                <CreditCard size={16} /> {sesion?.estado === 'proceso' ? 'Continuar' : 'Registrar'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Total */}
                    <div style={{
                      marginTop: '1rem', padding: '12px 16px',
                      backgroundColor: '#f8fafc', borderRadius: '10px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        Total cobrado: <strong style={{ color: '#0f172a' }}>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(pagadas || 0) * Number(plan.precioPorSesion || 0))}
                        </strong>
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        Total plan: <strong style={{ color: '#0f172a' }}>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(total || 0) * Number(plan.precioPorSesion || 0))}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Modal: Registrar sesión */}
        {sesionModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}>
            <div className="card-panel" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h5 style={{ margin: '0 0 1rem 0', fontWeight: 700, color: '#0f172a' }}>
                Sesión #{sesionModal.sesion.numero} – {sesionModal.plan.clienteNombre}
              </h5>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                {sesionModal.plan.tratamiento} · {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(sesionModal.plan.precioPorSesion)}
              </p>

              <Field label="Fecha de la sesión">
                <input type="date" style={inputStyle} value={sesionForm.fecha || ''}
                  onChange={e => setSesionForm(p => ({ ...p, fecha: e.target.value }))} />
              </Field>
              <Field label="Profesional">
                <input type="text" style={inputStyle} placeholder="Nombre del profesional que realiza la sesión"
                  value={sesionForm.profesional || ''}
                  onChange={e => setSesionForm(p => ({ ...p, profesional: e.target.value }))} />
              </Field>
              <Field label="Observaciones">
                <textarea style={{ ...inputStyle, height: '80px', padding: '10px 12px', resize: 'vertical' }}
                  placeholder="Notas de la sesión, reacciones, resultados..."
                  value={sesionForm.observaciones || ''}
                  onChange={e => setSesionForm(p => ({ ...p, observaciones: e.target.value }))} />
              </Field>
              <Field label="Método de Pago">
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {METODOS_PAGO.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSesionForm(p => ({ ...p, metodoPago: m }))}
                      style={{
                        padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                        fontSize: '0.85rem', border: '2px solid',
                        borderColor: sesionForm.metodoPago === m ? '#059669' : '#e2e8f0',
                        backgroundColor: sesionForm.metodoPago === m ? '#f0fdf4' : 'white',
                        color: sesionForm.metodoPago === m ? '#059669' : '#64748b',
                        transition: 'all 0.15s'
                      }}>
                      {m === 'efectivo' ? '💵' : m === 'transferencia' ? '🏦' : '💳'} {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </Field>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button className="modern-btn-outline" onClick={() => setSesionModal(null)}>Cancelar</button>
                <button className="modern-btn-outline" onClick={handleGuardarSesion}>
                  <FileText size={16} /> Guardar sin pagar
                </button>
                <button className="modern-btn-small" onClick={handleConfirmarPago}>
                  <PenLine size={16} /> Confirmar Pago y Firmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Firma Digital */}
        {firmaModal && planFirma && (
          <FirmaDigital
            clienteNombre={planFirma.clienteNombre || ''}
            sesionInfo={`${planFirma.tratamiento} · Sesión #${sesionFirma?.numero} · ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(planFirma.precioPorSesion)}`}
            onConfirm={handleFirmaConfirmada}
            onCancel={() => setFirmaModal(null)}
          />
        )}

        {/* Modal: Recibo */}
        {reciboModal && (
          <ModalRecibo datos={reciboModal} onClose={() => setReciboModal(null)} />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FORM: Nuevo plan
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <button className="modern-btn-outline" onClick={() => setView('list')}>
          <ChevronLeft size={18} /> Volver
        </button>
        <div>
          <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Nuevo Plan de Sesiones</h4>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Define el tratamiento, número de sesiones y precio por sesión</p>
        </div>
      </div>

      <form onSubmit={handleCrearPlan}>
        <div className="card-panel">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Cliente *">
              <select className="browser-default"
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#0f172a', boxSizing: 'border-box', backgroundColor: 'white' }}
                value={formPlan.clienteId} onChange={e => setFormPlan(p => ({ ...p, clienteId: e.target.value }))} required>
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>

            <Field label="Tratamiento *">
              {servicios.length > 0 ? (
                <select className="browser-default"
                  style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#0f172a', boxSizing: 'border-box', backgroundColor: 'white' }}
                  value={formPlan.tratamiento} onChange={e => setFormPlan(p => ({ ...p, tratamiento: e.target.value }))} required>
                  <option value="">Seleccionar servicio...</option>
                  {servicios.map(s => <option key={s.id} value={s.name || s.nombre}>{s.name || s.nombre}</option>)}
                </select>
              ) : (
                <input type="text" style={inputStyle} placeholder="Nombre del tratamiento" required
                  value={formPlan.tratamiento} onChange={e => setFormPlan(p => ({ ...p, tratamiento: e.target.value }))} />
              )}
            </Field>

            <Field label="Número de Sesiones *">
              <input type="number" style={inputStyle} min="1" max="60" required
                value={formPlan.totalSesiones} onChange={e => setFormPlan(p => ({ ...p, totalSesiones: e.target.value }))} />
            </Field>

            <Field label="Precio por Sesión (COP) *">
              <input type="number" style={inputStyle} min="0" required placeholder="Ej: 80000"
                value={formPlan.precioPorSesion} onChange={e => setFormPlan(p => ({ ...p, precioPorSesion: e.target.value }))} />
            </Field>

            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Descripción / Notas del Plan">
                <textarea style={{ ...inputStyle, height: '80px', padding: '10px 12px', resize: 'vertical' }}
                  placeholder="Observaciones generales, protocolo a seguir..."
                  value={formPlan.descripcion} onChange={e => setFormPlan(p => ({ ...p, descripcion: e.target.value }))} />
              </Field>
            </div>
          </div>

          {/* Preview */}
          {formPlan.totalSesiones > 0 && formPlan.precioPorSesion > 0 && (
            <div style={{
              backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '10px', padding: '12px 16px', marginTop: '0.5rem'
            }}>
              <span style={{ color: '#065f46', fontSize: '0.88rem', fontWeight: 600 }}>
                💰 Valor total del plan:{' '}
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(formPlan.totalSesiones) * Number(formPlan.precioPorSesion))}
                {' '}({formPlan.totalSesiones} sesiones × {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(formPlan.precioPorSesion))} c/u)
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '1.5rem' }}>
            <button type="button" className="modern-btn-outline" onClick={() => setView('list')}>Cancelar</button>
            <button type="submit" className="modern-btn-small" disabled={saving}>
              {saving ? 'Creando...' : <><Plus size={18} /> Crear Plan</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Sesiones;
