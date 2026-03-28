import React, { useState, useEffect } from 'react';
import { Search, Plus, UserCircle, Phone, Mail, FileText, Edit2, Trash2, ClipboardList } from 'lucide-react';
import { getAllDocuments, createDocument, updateDocument, deleteDocument } from '../services/firebaseUtils';

const Clients = ({ onVerFicha }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', lastVisit: '', notes: '', birthdate: '' });

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await getAllDocuments('clientes');
      setClients(data);
    } catch (error) {
      window.M?.toast({ html: 'Error al cargar clientes', classes: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const openAddModal = () => {
    setFormData({ name: '', email: '', phone: '', lastVisit: new Date().toISOString().split('T')[0], notes: '', birthdate: '' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (client) => {
    setFormData({ ...client });
    setEditingId(client.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDocument('clientes', editingId, formData);
        window.M?.toast({ html: 'Cliente actualizado', classes: 'green rounded' });
      } else {
        await createDocument('clientes', { ...formData, totalVisits: 0 }); // Default initial visits
        window.M?.toast({ html: 'Cliente creado', classes: 'green rounded' });
      }
      setIsModalOpen(false);
      loadClients();
    } catch (error) {
      window.M?.toast({ html: 'Error al procesar la solicitud', classes: 'red rounded' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas borrar este cliente del sistema?")) {
      try {
        await deleteDocument('clientes', id);
        window.M?.toast({ html: 'Cliente eliminado', classes: 'green rounded' });
        loadClients();
      } catch (error) {
        window.M?.toast({ html: 'Error al eliminar', classes: 'red rounded' });
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h3>Directorio de Clientes</h3>
          <p>Gestiona la información de contacto y preferencias médicas de tus clientes.</p>
        </div>
        <button className="modern-btn-small" onClick={openAddModal}><Plus size={18} /> Nuevo Cliente</button>
      </div>

      <div className="card-panel">
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px', marginBottom: '20px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, email o teléfono..." 
            style={{ width: '100%', height: '38px', margin: 0, paddingLeft: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}
          />
        </div>

        {loading ? (
          <div className="center-align" style={{ padding: '2rem' }}>
             <div className="preloader-wrapper small active"><div className="spinner-layer spinner-blue-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
          </div>
        ) : clients.length === 0 ? (
          <div className="center-align" style={{ padding: '4rem 1rem', color: '#64748b' }}>
            <UserCircle size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
            <h6>No hay clientes registrados</h6>
            <p>Haz clic en "Nuevo Cliente" para agregar el primero.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="highlight responsive-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Última Visita</th>
                  <th>Notas Especiales</th>
                  <th className="center-align">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div className="avatar" style={{ width: '40px', height: '40px', backgroundColor: 'var(--spa-primary-light)', color: 'var(--spa-primary-dark)', fontSize: '1.2rem' }}>
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <span style={{ display: 'block', fontWeight: 600, color: '#0f172a' }}>{client.name}</span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{client.totalVisits || 0} visitas totales</span>
                          {!client.birthdate && (
                            <span style={{ fontSize: '0.75rem', color: '#ea580c', backgroundColor: '#ffedd5', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>Falta fecha de nacimiento para marketing de fidelización</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: '#475569' }}><Phone size={14}/> {client.phone}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: '#475569' }}><Mail size={14}/> {client.email}</span>
                      </div>
                    </td>
                    <td style={{ color: '#475569', fontWeight: 500 }}>{client.lastVisit}</td>
                    <td>
                      {client.notes ? (
                        <span className="badge-soft badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <FileText size={14} /> {(client.notes?.length > 30 ? client.notes.substring(0, 30) + '...' : client.notes)}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Sin notas</span>
                      )}
                    </td>
                    <td className="center-align">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                         <button onClick={() => onVerFicha && onVerFicha(client.id)} className="btn-flat" style={{ padding: '0 8px', color: '#059669' }} title="Ver Ficha Técnica"><ClipboardList size={18}/></button>
                         <button onClick={() => openEditModal(client)} className="btn-flat" style={{ padding: '0 8px', color: '#475569' }}><Edit2 size={18}/></button>
                         <button onClick={() => handleDelete(client.id)} className="btn-flat" style={{ padding: '0 8px', color: '#ef4444' }}><Trash2 size={18}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modern Custom Modal overlay */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h5 style={{ marginTop: 0, fontWeight: 600 }}>{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h5>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div className="row">
                <div className="col s12" style={{ marginBottom: '15px' }}>
                  <label>Nombre Completo</label>
                  <input type="text" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="col s6" style={{ marginBottom: '15px' }}>
                   <label>Teléfono</label>
                   <input type="text" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="col s6" style={{ marginBottom: '15px' }}>
                   <label>Correo Electrónico</label>
                   <input type="email" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="col s6" style={{ marginBottom: '15px' }}>
                   <label>Última Visita (Fecha)</label>
                   <input type="date" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    value={formData.lastVisit} onChange={e => setFormData({...formData, lastVisit: e.target.value})} />
                </div>
                <div className="col s6" style={{ marginBottom: '15px' }}>
                   <label>Fecha de Nacimiento</label>
                   <input type="date" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    value={formData.birthdate || ''} onChange={e => setFormData({...formData, birthdate: e.target.value})} />
                </div>
                <div className="col s12" style={{ marginBottom: '20px' }}>
                   <label>Notas Especiales (Alergias, preferencias...)</label>
                   <textarea className="browser-default" style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'vertical' }} 
                    value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="modern-btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="modern-btn-small">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Clients;
