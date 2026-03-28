import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Plus, ChevronLeft, Save, User, Heart, Stethoscope,
  Sparkles, FileText, AlertCircle, CheckCircle2, Edit2, Eye
} from 'lucide-react';
import { getAllDocuments, createDocument, updateDocument } from '../services/firebaseUtils';

// Campos por sección para la ficha técnica
const SKIN_TYPES = ['Normal','Seca','Grasa','Mixta','Sensible','Deshidratada'];
const FOTO_TYPES = ['Fototipo I (Muy clara)','Fototipo II (Clara)','Fototipo III (Media)','Fototipo IV (Oliva)','Fototipo V (Oscura)','Fototipo VI (Muy oscura)'];
const TIPOS_FICHA = ['Facial', 'Procedimiento Dermapen', 'Tratamiento Reducción de Medidas'];

// ── Input helpers ──────────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{
      display: 'block', fontSize: '0.82rem', color: '#64748b',
      fontWeight: 600, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em'
    }}>
      {label}{required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
    </label>
    {children}
  </div>
);

const inputStyle = {
  width: '100%', height: '40px', padding: '0 12px',
  borderRadius: '8px', border: '1px solid #e2e8f0',
  fontSize: '0.9rem', color: '#0f172a', boxSizing: 'border-box', outline: 'none'
};

const textareaStyle = {
  ...inputStyle, height: '80px', padding: '10px 12px', resize: 'vertical'
};

const SectionHeader = ({ icon: Icon, title, color = '#059669' }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 14px', backgroundColor: '#f8fafc',
    borderRadius: '10px', marginBottom: '1rem', marginTop: '1.5rem',
    borderLeft: `4px solid ${color}`
  }}>
    <Icon size={18} color={color} />
    <h6 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{title}</h6>
  </div>
);

const FichasTecnicas = ({ selectedClientId, onNavigate }) => {
  const [view, setView] = useState('list'); // 'list' | 'form' | 'detail'
  const [clientes, setClientes] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedFicha, setSelectedFicha] = useState(null);

  const fichaVacia = {
    clienteId: selectedClientId || '',
    tipoFicha: 'Facial',
    // Datos personales
    edad: '', ocupacion: '', direccion: '',
    // Anamnesis médica
    antecedentesPatologicos: '', medicamentosActuales: '',
    alergias: '', procedimientosQuirurgicos: '', usaProtectorSolar: false,
    // Estado de la piel (Facial)
    tipoPiel: '', fototipo: '', lesionesActivas: '', sensibilidad: '',
    texturaObservada: '', hidratacion: '', poros: '', arrugas: '',
    // Procedimiento Dermapen
    dermapenAgujas: '', dermapenProfundidad: '', dermapenActivo: '', dermapenZonas: '', dermapenEritema: '',
    // Reducción de Medidas
    reduccionZonas: '', reduccionPeso: '', reduccionMedidas: '', reduccionTecnicas: '',
    // Tratamientos
    tratamientosPrevios: '', contraindicaciones: '', objetivos: '',
    // Observaciones
    observacionesProfesional: '',
    // Consentimiento
    aceptaConsentimiento: false,
    fechaFicha: new Date().toISOString().split('T')[0],
  };
  const [formData, setFormData] = useState(fichaVacia);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClientId && view === 'list') {
      // Si viene con clienteId preseleccionado, abrir directamente el form
      const existente = fichas.find(f => f.clienteId === selectedClientId);
      if (existente) {
        openDetail(existente);
      } else {
        openForm(null, selectedClientId);
      }
    }
  }, [selectedClientId, fichas]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, f] = await Promise.all([
        getAllDocuments('clientes'),
        getAllDocuments('fichas_tecnicas')
      ]);
      setClientes(c);
      setFichas(f);
    } catch {
      alert('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const getClienteNombre = (id) => clientes.find(c => c.id === id)?.name || '—';

  const openForm = (ficha = null, preClienteId = '') => {
    if (ficha) {
      setFormData({ ...fichaVacia, ...ficha });
      setEditingId(ficha.id);
    } else {
      setFormData({ ...fichaVacia, clienteId: preClienteId });
      setEditingId(null);
    }
    setView('form');
  };

  const openDetail = (ficha) => {
    setSelectedFicha(ficha);
    setView('detail');
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.clienteId) { alert('Selecciona un cliente'); return; }
    if (!formData.aceptaConsentimiento) { alert('El cliente debe aceptar el consentimiento informado para guardar la ficha.'); return; }

    setSaving(true);
    try {
      const cliente = clientes.find(c => c.id === formData.clienteId);
      const dataToSave = {
        ...formData,
        clienteNombre: cliente?.name || '',
        clienteEmail: cliente?.email || '',
        clientePhone: cliente?.phone || '',
      };
      if (editingId) {
        await updateDocument('fichas_tecnicas', editingId, dataToSave);
      } else {
        await createDocument('fichas_tecnicas', dataToSave);
      }
      await loadData();
      setView('list');
    } catch {
      alert('Error al guardar la ficha técnica');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LIST VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">
            <h3>Fichas Técnicas</h3>
            <p>Historia clínica y evaluación de piel por cliente.</p>
          </div>
          <button className="modern-btn-small" onClick={() => openForm()}>
            <Plus size={18} /> Nueva Ficha
          </button>
        </div>

        <div className="card-panel">
          {loading ? (
            <div className="center-align" style={{ padding: '3rem' }}>
              <div className="preloader-wrapper small active"><div className="spinner-layer spinner-blue-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
            </div>
          ) : fichas.length === 0 ? (
            <div className="center-align" style={{ padding: '4rem 1rem', color: '#64748b' }}>
              <ClipboardList size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
              <h6>No hay fichas técnicas registradas</h6>
              <p>Crea la primera ficha para un cliente.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="highlight responsive-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Fecha Ficha</th>
                    <th>Tipo Ficha</th>
                    <th>Alergias</th>
                    <th>Consentimiento</th>
                    <th className="center-align">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {fichas.map(ficha => (
                    <tr key={ficha.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar" style={{ width: 36, height: 36, backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '1rem' }}>
                            {(ficha.clienteNombre || getClienteNombre(ficha.clienteId)).charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            {ficha.clienteNombre || getClienteNombre(ficha.clienteId)}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: '#475569' }}>{ficha.fechaFicha || '—'}</td>
                      <td>
                        <span className="badge-soft badge-blue">{ficha.tipoFicha || 'Facial'}</span>
                      </td>
                      <td style={{ maxWidth: '160px' }}>
                        {ficha.alergias ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#b45309', fontSize: '0.85rem' }}>
                            <AlertCircle size={14} />{ficha.alergias.length > 30 ? ficha.alergias.substring(0,30)+'...' : ficha.alergias}
                          </span>
                        ) : <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Sin alergias</span>}
                      </td>
                      <td>
                        {ficha.aceptaConsentimiento ? (
                          <span className="badge-soft badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={13} /> Firmado
                          </span>
                        ) : (
                          <span className="badge-soft badge-red">Pendiente</span>
                        )}
                      </td>
                      <td className="center-align">
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button onClick={() => openDetail(ficha)} className="btn-flat" style={{ padding: '0 8px', color: '#0369a1' }} title="Ver detalle">
                            <Eye size={18} />
                          </button>
                          <button onClick={() => openForm(ficha)} className="btn-flat" style={{ padding: '0 8px', color: '#475569' }} title="Editar">
                            <Edit2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW (read-only)
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'detail' && selectedFicha) {
    const f = selectedFicha;
    const Row = ({ label, value }) => value ? (
      <div style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ color: '#64748b', fontSize: '0.85rem', minWidth: '160px', flexShrink: 0 }}>{label}</span>
        <span style={{ color: '#0f172a', fontSize: '0.88rem', fontWeight: 500 }}>{value}</span>
      </div>
    ) : null;

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <button className="modern-btn-outline" onClick={() => setView('list')}>
            <ChevronLeft size={18} /> Volver
          </button>
          <div>
            <h4 style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
              Ficha Técnica – {f.clienteNombre}
            </h4>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Fecha: {f.fechaFicha}</p>
          </div>
          <button className="modern-btn-small" style={{ marginLeft: 'auto' }} onClick={() => openForm(f)}>
            <Edit2 size={16} /> Editar
          </button>
        </div>

        <div className="card-panel">
          <SectionHeader icon={User} title="Datos Personales" color="#3b82f6" />
          <Row label="Edad" value={f.edad} />
          <Row label="Ocupación" value={f.ocupacion} />
          <Row label="Dirección" value={f.direccion} />

          <SectionHeader icon={Stethoscope} title="Anamnesis Médica" color="#ef4444" />
          <Row label="Antecedentes Patológicos" value={f.antecedentesPatologicos} />
          <Row label="Medicamentos Actuales" value={f.medicamentosActuales} />
          <Row label="Alergias" value={f.alergias} />
          <Row label="Procedimientos Quirúrgicos" value={f.procedimientosQuirurgicos} />
          <Row label="Usa Protector Solar" value={f.usaProtectorSolar ? 'Sí' : 'No'} />

          {(!f.tipoFicha || f.tipoFicha === 'Facial') && (
            <>
              <SectionHeader icon={Sparkles} title="Evaluación de Piel" color="#8b5cf6" />
              <Row label="Tipo de Piel" value={f.tipoPiel} />
              <Row label="Fototipo" value={f.fototipo} />
              <Row label="Lesiones Activas" value={f.lesionesActivas} />
              <Row label="Sensibilidad" value={f.sensibilidad} />
              <Row label="Textura Observada" value={f.texturaObservada} />
              <Row label="Hidratación" value={f.hidratacion} />
              <Row label="Poros" value={f.poros} />
              <Row label="Arrugas" value={f.arrugas} />
            </>
          )}
          {f.tipoFicha === 'Procedimiento Dermapen' && (
            <>
              <SectionHeader icon={Sparkles} title="Detalles de Procedimiento Dermapen" color="#8b5cf6" />
              <Row label="Zonas Tratadas" value={f.dermapenZonas} />
              <Row label="Agujas (Tipo/Número)" value={f.dermapenAgujas} />
              <Row label="Profundidad (mm)" value={f.dermapenProfundidad} />
              <Row label="Principio Activo" value={f.dermapenActivo} />
              <Row label="Reacción/Eritema" value={f.dermapenEritema} />
            </>
          )}
          {f.tipoFicha === 'Tratamiento Reducción de Medidas' && (
            <>
              <SectionHeader icon={Sparkles} title="Detalles de Reducción de Medidas" color="#8b5cf6" />
              <Row label="Zonas a Tratar" value={f.reduccionZonas} />
              <Row label="Peso Inicial (kg)" value={f.reduccionPeso} />
              <Row label="Medidas Corporales" value={f.reduccionMedidas} />
              <Row label="Técnicas a Utilizar" value={f.reduccionTecnicas} />
            </>
          )}

          <SectionHeader icon={Heart} title="Tratamientos y Objetivos" color="#f59e0b" />
          <Row label="Tratamientos Previos" value={f.tratamientosPrevios} />
          <Row label="Contraindicaciones" value={f.contraindicaciones} />
          <Row label="Objetivos del Tratamiento" value={f.objetivos} />

          <SectionHeader icon={FileText} title="Observaciones del Profesional" color="#059669" />
          <Row label="Observaciones" value={f.observacionesProfesional} />

          <div style={{
            marginTop: '1.5rem', padding: '12px 16px',
            backgroundColor: f.aceptaConsentimiento ? '#f0fdf4' : '#fef2f2',
            borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <CheckCircle2 size={20} color={f.aceptaConsentimiento ? '#059669' : '#ef4444'} />
            <span style={{ fontWeight: 600, color: f.aceptaConsentimiento ? '#065f46' : '#b91c1c', fontSize: '0.9rem' }}>
              Consentimiento Informado: {f.aceptaConsentimiento ? 'Aceptado' : 'No aceptado'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FORM VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <button className="modern-btn-outline" onClick={() => setView('list')}>
          <ChevronLeft size={18} /> Volver
        </button>
        <div>
          <h4 style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>
            {editingId ? 'Editar Ficha Técnica' : 'Nueva Ficha Técnica'}
          </h4>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Historia clínica y evaluación epidérmica del cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card-panel" style={{ marginBottom: '1.5rem' }}>
          <SectionHeader icon={User} title="Datos del Cliente" color="#3b82f6" />

          <div style={{ marginBottom: '1.5rem' }}>
             <Field label="Tipo de Ficha Técnica" required>
               <select className="browser-default" style={{ ...inputStyle, backgroundColor: '#f8fafc', fontWeight: 600, borderColor: '#cbd5e1' }}
                 value={formData.tipoFicha || 'Facial'} onChange={e => handleChange('tipoFicha', e.target.value)}>
                 {TIPOS_FICHA.map(t => <option key={t} value={t}>{t}</option>)}
               </select>
             </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <Field label="Cliente" required>
              <select
                className="browser-default"
                style={{ ...inputStyle, backgroundColor: 'white' }}
                value={formData.clienteId}
                onChange={e => handleChange('clienteId', e.target.value)}
                required
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Fecha de Ficha">
              <input type="date" style={inputStyle} value={formData.fechaFicha}
                onChange={e => handleChange('fechaFicha', e.target.value)} />
            </Field>
            <Field label="Edad">
              <input type="number" style={inputStyle} placeholder="Ej: 32" value={formData.edad}
                onChange={e => handleChange('edad', e.target.value)} min="1" max="120" />
            </Field>
            <Field label="Ocupación">
              <input type="text" style={inputStyle} placeholder="Profesión u oficio" value={formData.ocupacion}
                onChange={e => handleChange('ocupacion', e.target.value)} />
            </Field>
            <Field label="Dirección" >
              <input type="text" style={inputStyle} placeholder="Ciudad / barrio" value={formData.direccion}
                onChange={e => handleChange('direccion', e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="card-panel" style={{ marginBottom: '1.5rem' }}>
          <SectionHeader icon={Stethoscope} title="Anamnesis Médica" color="#ef4444" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Antecedentes Patológicos">
              <textarea style={textareaStyle} placeholder="Diabetes, HTA, enfermedades autoinmunes..."
                value={formData.antecedentesPatologicos} onChange={e => handleChange('antecedentesPatologicos', e.target.value)} />
            </Field>
            <Field label="Medicamentos Actuales">
              <textarea style={textareaStyle} placeholder="Medicamentos con dosis..."
                value={formData.medicamentosActuales} onChange={e => handleChange('medicamentosActuales', e.target.value)} />
            </Field>
            <Field label="Alergias (cosméticos, ingredientes, alimentos)">
              <textarea style={textareaStyle} placeholder="Especificar alergias conocidas..."
                value={formData.alergias} onChange={e => handleChange('alergias', e.target.value)} />
            </Field>
            <Field label="Procedimientos Quirúrgicos Previos">
              <textarea style={textareaStyle} placeholder="Cirugías, tratamientos estéticos previos..."
                value={formData.procedimientosQuirurgicos} onChange={e => handleChange('procedimientosQuirurgicos', e.target.value)} />
            </Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '0.5rem' }}>
            <input type="checkbox" checked={formData.usaProtectorSolar}
              onChange={e => handleChange('usaProtectorSolar', e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
            <span style={{ fontSize: '0.9rem', color: '#334155' }}>El cliente usa protector solar regularmente</span>
          </label>
        </div>

        {(!formData.tipoFicha || formData.tipoFicha === 'Facial') && (
          <div className="card-panel" style={{ marginBottom: '1.5rem' }}>
            <SectionHeader icon={Sparkles} title="Evaluación Epidérmica" color="#8b5cf6" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <Field label="Tipo de Piel">
                <select className="browser-default" style={{ ...inputStyle, backgroundColor: 'white' }}
                  value={formData.tipoPiel} onChange={e => handleChange('tipoPiel', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {SKIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Fototipo Cutáneo">
                <select className="browser-default" style={{ ...inputStyle, backgroundColor: 'white' }}
                  value={formData.fototipo} onChange={e => handleChange('fototipo', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {FOTO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Sensibilidad">
                <select className="browser-default" style={{ ...inputStyle, backgroundColor: 'white' }}
                  value={formData.sensibilidad} onChange={e => handleChange('sensibilidad', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {['Alta','Media','Baja'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Lesiones Activas">
                <input type="text" style={inputStyle} placeholder="Acné, manchas, rosácea..."
                  value={formData.lesionesActivas} onChange={e => handleChange('lesionesActivas', e.target.value)} />
              </Field>
              <Field label="Textura Observada">
                <input type="text" style={inputStyle} placeholder="Lisa, rugosa, descamada..."
                  value={formData.texturaObservada} onChange={e => handleChange('texturaObservada', e.target.value)} />
              </Field>
              <Field label="Hidratación">
                <select className="browser-default" style={{ ...inputStyle, backgroundColor: 'white' }}
                  value={formData.hidratacion} onChange={e => handleChange('hidratacion', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {['Buena','Regular','Deficiente'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Poros">
                <select className="browser-default" style={{ ...inputStyle, backgroundColor: 'white' }}
                  value={formData.poros} onChange={e => handleChange('poros', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {['Cerrados','Dilatados','Muy dilatados'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Arrugas / Líneas de Expresión">
                <select className="browser-default" style={{ ...inputStyle, backgroundColor: 'white' }}
                  value={formData.arrugas} onChange={e => handleChange('arrugas', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {['Sin arrugas','Líneas finas','Arrugas moderadas','Arrugas profundas'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          </div>
        )}

        {formData.tipoFicha === 'Procedimiento Dermapen' && (
          <div className="card-panel" style={{ marginBottom: '1.5rem' }}>
            <SectionHeader icon={Sparkles} title="Detalles de Procedimiento Dermapen" color="#8b5cf6" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Zonas Tratadas">
                <input type="text" style={inputStyle} placeholder="Rostro completo, cuello, cicatrices específicas..."
                  value={formData.dermapenZonas} onChange={e => handleChange('dermapenZonas', e.target.value)} />
              </Field>
              <Field label="Agujas (Tipo/Número)">
                <input type="text" style={inputStyle} placeholder="Ej: Nanopore, 12 pines, 36 pines..."
                  value={formData.dermapenAgujas} onChange={e => handleChange('dermapenAgujas', e.target.value)} />
              </Field>
              <Field label="Profundidad (mm)">
                <input type="text" style={inputStyle} placeholder="Ej: 0.5mm - 1.5mm..."
                  value={formData.dermapenProfundidad} onChange={e => handleChange('dermapenProfundidad', e.target.value)} />
              </Field>
              <Field label="Principio Activo Utilizado">
                <input type="text" style={inputStyle} placeholder="Vitamina C, Ácido Hialurónico, Plasma..."
                  value={formData.dermapenActivo} onChange={e => handleChange('dermapenActivo', e.target.value)} />
              </Field>
              <Field label="Reacción de la piel (Eritema)">
                <select className="browser-default" style={{ ...inputStyle, backgroundColor: 'white' }}
                  value={formData.dermapenEritema} onChange={e => handleChange('dermapenEritema', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {['Leve', 'Moderado', 'Severo'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          </div>
        )}

        {formData.tipoFicha === 'Tratamiento Reducción de Medidas' && (
          <div className="card-panel" style={{ marginBottom: '1.5rem' }}>
            <SectionHeader icon={Sparkles} title="Detalles de Reducción de Medidas" color="#8b5cf6" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Zonas a Tratar">
                <input type="text" style={inputStyle} placeholder="Abdomen, Piernas, Brazos, Flancos..."
                  value={formData.reduccionZonas} onChange={e => handleChange('reduccionZonas', e.target.value)} />
              </Field>
              <Field label="Peso Inicial (kg)">
                <input type="number" step="0.1" style={inputStyle} placeholder="Ej: 70.5"
                  value={formData.reduccionPeso} onChange={e => handleChange('reduccionPeso', e.target.value)} />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Medidas Corporales (Cintura, Abdomen, Cadera, Piernas, etc.)">
                  <textarea style={textareaStyle} placeholder="Ej: Cintura: 85cm, Abdomen Alto: 90cm, Cadera: 100cm..."
                    value={formData.reduccionMedidas} onChange={e => handleChange('reduccionMedidas', e.target.value)} />
                </Field>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Técnicas a Utilizar">
                  <textarea style={{ ...textareaStyle, height: '60px' }} placeholder="Maderoterapia, Cavitación, Radiofrecuencia, Masaje Reductor..."
                    value={formData.reduccionTecnicas} onChange={e => handleChange('reduccionTecnicas', e.target.value)} />
                </Field>
              </div>
            </div>
          </div>
        )}

        <div className="card-panel" style={{ marginBottom: '1.5rem' }}>
          <SectionHeader icon={Heart} title="Tratamientos y Objetivos" color="#f59e0b" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Tratamientos Previos">
              <textarea style={textareaStyle} placeholder="Tratamientos realizados anteriormente..."
                value={formData.tratamientosPrevios} onChange={e => handleChange('tratamientosPrevios', e.target.value)} />
            </Field>
            <Field label="Contraindicaciones">
              <textarea style={textareaStyle} placeholder="Restricciones para tratamientos..."
                value={formData.contraindicaciones} onChange={e => handleChange('contraindicaciones', e.target.value)} />
            </Field>
            <Field label="Objetivos del Tratamiento" required>
              <textarea style={{ ...textareaStyle, height: '70px' }} placeholder="¿Qué busca conseguir el cliente?..."
                value={formData.objetivos} onChange={e => handleChange('objetivos', e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="card-panel" style={{ marginBottom: '1.5rem' }}>
          <SectionHeader icon={FileText} title="Observaciones del Profesional" color="#059669" />
          <Field label="Observaciones Generales">
            <textarea style={{ ...textareaStyle, height: '100px' }}
              placeholder="Notas clínicas, recomendaciones, seguimiento..."
              value={formData.observacionesProfesional}
              onChange={e => handleChange('observacionesProfesional', e.target.value)} />
          </Field>
        </div>

        {/* Consentimiento */}
        <div className="card-panel" style={{
          marginBottom: '1.5rem',
          backgroundColor: formData.aceptaConsentimiento ? '#f0fdf4' : '#fff',
          border: formData.aceptaConsentimiento ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
        }}>
          <h6 style={{ fontWeight: 700, color: '#0f172a', marginTop: 0 }}>Consentimiento Informado *</h6>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.6 }}>
            El/La cliente declara haber recibido información completa sobre los tratamientos a realizar,
            sus posibles efectos secundarios, contraindicaciones y precauciones. Autoriza al equipo de
            Cardona SPA a realizar los procedimientos acordados y confirma que la información clínica
            proporcionada es verídica.
          </p>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={formData.aceptaConsentimiento}
              onChange={e => handleChange('aceptaConsentimiento', e.target.checked)}
              style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer', flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>
              El cliente ha leído y acepta el consentimiento informado. (Requerido para guardar)
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="modern-btn-outline" onClick={() => setView('list')}>Cancelar</button>
          <button type="submit" className="modern-btn-small" disabled={saving}>
            {saving ? 'Guardando...' : <><Save size={18} /> {editingId ? 'Actualizar Ficha' : 'Guardar Ficha'}</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FichasTecnicas;
