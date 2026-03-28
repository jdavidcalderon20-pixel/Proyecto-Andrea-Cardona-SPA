import React, { useState, useEffect } from 'react';
import { Plus, Wallet, Trash2, Edit2, ArrowLeft, Filter, AlertCircle, Calendar } from 'lucide-react';
import { getAllDocuments, createDocument, updateDocument, deleteDocument } from '../services/firebaseUtils';

const CATEGORIAS_GASTO = [
  'Arriendo / Renta',
  'Insumos y Productos',
  'Servicios Públicos (Agua, Luz, Int.)',
  'Nómina / Pagos Profesionales',
  'Publicidad / Marketing',
  'Mantenimiento',
  'Otros'
];

const Expenses = () => {
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Filtros
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');

  const emptyForm = {
    concepto: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    categoria: CATEGORIAS_GASTO[0]
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadGastos();
  }, []);

  const loadGastos = async () => {
    try {
      setLoading(true);
      const data = await getAllDocuments('gastos');
      // Ordenar por fecha descendente
      data.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
      setGastos(data);
    } catch (error) {
      console.error("Error cargando gastos:", error);
    } finally {
      setLoading(false);
    }
  };

  const openForm = (gastoToEdit = null) => {
    if (gastoToEdit) {
      setFormData({
        concepto: gastoToEdit.concepto || '',
        monto: gastoToEdit.monto || '',
        fecha: gastoToEdit.fecha || '',
        categoria: gastoToEdit.categoria || CATEGORIAS_GASTO[0]
      });
      setEditingId(gastoToEdit.id);
    } else {
      setFormData(emptyForm);
      setEditingId(null);
    }
    setView('form');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.concepto || !formData.monto || !formData.fecha) {
      alert("Por favor completa los campos principales.");
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        monto: Number(formData.monto)
      };

      if (editingId) {
        await updateDocument('gastos', editingId, dataToSave);
      } else {
        await createDocument('gastos', dataToSave);
      }
      
      await loadGastos();
      setView('list');
    } catch (error) {
      alert("Error guardando el gasto. Revisa consola.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de querer eliminar permanentemente este registro de gasto?")) {
      try {
        await deleteDocument('gastos', id);
        await loadGastos();
      } catch (error) {
        alert("Error al eliminar.");
      }
    }
  };

  // Filtrado de vistas
  const gastosFiltrados = gastos.filter(g => {
    if (!g.fecha) return false;
    const mesGasto = g.fecha.substring(0, 7);
    const cumpleMes = (mesGasto === filtroMes);
    const cumpleCategoria = (filtroCategoria === 'Todas' || g.categoria === filtroCategoria);
    return cumpleMes && cumpleCategoria;
  });

  const totalFiltrado = gastosFiltrados.reduce((sum, g) => sum + Number(g.monto || 0), 0);

  const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  // -------------------------------------------------------------
  // LIST VIEW
  // -------------------------------------------------------------
  if (view === 'list') {
    return (
      <div style={{ paddingBottom: '2rem' }}>
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <div className="page-title">
            <h3 style={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wallet size={28} color="#ef4444" /> Gestión de Gastos
            </h3>
            <p style={{ color: '#64748b' }}>Registra y monitorea las salidas de dinero (arriendos, insumos, nómina).</p>
          </div>
          <button className="modern-btn" style={{ backgroundColor: '#ef4444', border: 'none' }} onClick={() => openForm()}>
            <Plus size={18} style={{marginRight: '8px'}} /> Nuevo Gasto
          </button>
        </div>

        {/* Filters and Summary Header */}
        <div className="card-panel" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', justifyContent: 'space-between', backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }}>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#991b1b', marginBottom: '5px', display: 'block' }}>Mes de Análisis</label>
              <input 
                type="month" 
                value={filtroMes} 
                onChange={(e) => setFiltroMes(e.target.value)}
                style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #fca5a5', backgroundColor: 'white', color: '#7f1d1d', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#991b1b', marginBottom: '5px', display: 'block' }}>Categoría</label>
              <select 
                className="browser-default" 
                value={filtroCategoria} 
                onChange={(e) => setFiltroCategoria(e.target.value)}
                style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #fca5a5', backgroundColor: 'white', color: '#7f1d1d', outline: 'none', minWidth: '200px' }}
              >
                <option value="Todas">Todas las categorías</option>
                {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#991b1b', fontWeight: 600 }}>Total Egresos (Filtrados)</p>
            <h4 style={{ margin: 0, fontWeight: 800, color: '#b91c1c', fontSize: '1.8rem' }}>{formatCOP(totalFiltrado)}</h4>
          </div>
        </div>

        {/* Table Area */}
        <div className="card-panel" style={{ padding: '0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {loading ? (
             <div style={{ padding: '2rem' }}>
               {[1, 2, 3, 4, 5].map(i => (
                 <div key={i} className="skeleton-box" style={{ width: '100%', height: '50px', marginBottom: '15px', borderRadius: '8px' }}></div>
               ))}
             </div>
          ) : gastosFiltrados.length === 0 ? (
             <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
               <Wallet size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
               <h6 style={{ fontWeight: 600, color: '#475569' }}>Sin registros este mes</h6>
               <p>No se encontraron egresos con los filtros actuales.</p>
             </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="highlight responsive-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '15px 20px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Fecha</th>
                    <th style={{ padding: '15px 20px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Concepto</th>
                    <th style={{ padding: '15px 20px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Categoría</th>
                    <th style={{ padding: '15px 20px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>Monto</th>
                    <th style={{ padding: '15px 20px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosFiltrados.map(g => (
                    <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '15px 20px', color: '#475569', fontSize: '0.9rem' }}>{g.fecha}</td>
                      <td style={{ padding: '15px 20px', fontWeight: 500, color: '#0f172a' }}>{g.concepto}</td>
                      <td style={{ padding: '15px 20px' }}>
                        <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {g.categoria}
                        </span>
                      </td>
                      <td style={{ padding: '15px 20px', fontWeight: 700, color: '#b91c1c', textAlign: 'right' }}>
                        {formatCOP(g.monto)}
                      </td>
                      <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                        <button onClick={() => openForm(g)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: '#3b82f6', marginRight: '5px' }} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: '#ef4444' }} title="Eliminar">
                          <Trash2 size={16} />
                        </button>
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

  // -------------------------------------------------------------
  // FORM VIEW
  // -------------------------------------------------------------
  const inputStyle = { width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', color: '#0f172a', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '6px' };

  return (
    <div style={{ paddingBottom: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <button 
        onClick={() => setView('list')}
        style={{ background: 'none', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginBottom: '1.5rem', padding: 0, fontWeight: 500 }}
      >
        <ArrowLeft size={18} /> Volver al Listado
      </button>

      <div className="card-panel" style={{ padding: '2rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
        <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: 800, color: '#0f172a', fontSize: '1.5rem' }}>
          {editingId ? 'Editar Registro de Gasto' : 'Registrar Nuevo Gasto'}
        </h4>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Concepto / Descripción del Gasto <span style={{color:'#ef4444'}}>*</span></label>
              <input 
                type="text" 
                name="concepto" 
                value={formData.concepto} 
                onChange={handleChange} 
                placeholder="Ej. Pago de arriendo del local, Compra de jeringas, Luz..."
                style={inputStyle} 
                required 
              />
            </div>
            
            <div>
              <label style={labelStyle}>Monto Total (COP) <span style={{color:'#ef4444'}}>*</span></label>
              <input 
                type="number" 
                name="monto" 
                value={formData.monto} 
                onChange={handleChange} 
                placeholder="0"
                style={inputStyle} 
                required 
              />
            </div>

            <div>
              <label style={labelStyle}>Fecha <span style={{color:'#ef4444'}}>*</span></label>
              <input 
                type="date" 
                name="fecha" 
                value={formData.fecha} 
                onChange={handleChange} 
                style={inputStyle} 
                required 
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Categoría <span style={{color:'#ef4444'}}>*</span></label>
              <select 
                className="browser-default" 
                name="categoria" 
                value={formData.categoria} 
                onChange={handleChange} 
                style={inputStyle}
              >
                {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <button 
              type="submit" 
              disabled={saving}
              style={{
                backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', 
                padding: '0.75rem 1.5rem', fontWeight: 600, fontSize: '0.95rem', cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              {saving ? 'Guardando...' : editingId ? 'Actualizar Gasto' : 'Registrar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Expenses;
