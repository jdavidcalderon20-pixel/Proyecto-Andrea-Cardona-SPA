import React, { useState, useEffect } from 'react';
import { Plus, UserCircle, Search, Star, MessageCircle, Calendar, Edit2, Trash2 } from 'lucide-react';
import { getAllDocuments, createDocument, updateDocument, deleteDocument } from '../services/firebaseUtils';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: '', exp: '', availability: '', status: 'Activa' });

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await getAllDocuments('empleados');
      setStaff(data);
    } catch (error) {
      window.M?.toast({ html: 'Error al cargar empleados', classes: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const openAddModal = () => {
    setFormData({ name: '', role: '', exp: '', availability: '', status: 'Activa' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (member) => {
    setFormData({ ...member });
    setEditingId(member.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDocument('empleados', editingId, formData);
        window.M?.toast({ html: 'Profesional actualizado', classes: 'green rounded' });
      } else {
        await createDocument('empleados', { ...formData, rating: 5.0, reviews: 0 }); 
        window.M?.toast({ html: 'Profesional registrado', classes: 'green rounded' });
      }
      setIsModalOpen(false);
      loadStaff();
    } catch (error) {
      window.M?.toast({ html: 'Error al procesar la solicitud', classes: 'red rounded' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar a este profesional del sistema?")) {
      try {
        await deleteDocument('empleados', id);
        window.M?.toast({ html: 'Profesional eliminado', classes: 'green rounded' });
        loadStaff();
      } catch (error) {
        window.M?.toast({ html: 'Error al eliminar', classes: 'red rounded' });
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h3>Equipo de Profesionales</h3>
          <p>Directorio, especialidades y horarios del personal del SPA.</p>
        </div>
        <button className="modern-btn-small" onClick={openAddModal}><Plus size={18} /> Nuevo Profesional</button>
      </div>

      <div className="card-panel" style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Buscar profesional..." 
            style={{ width: '100%', height: '38px', margin: 0, paddingLeft: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="center-align" style={{ padding: '2rem' }}>
           <div className="preloader-wrapper small active"><div className="spinner-layer spinner-blue-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
        </div>
      ) : staff.length === 0 ? (
        <div className="center-align" style={{ padding: '4rem 1rem', color: '#64748b' }}>
          <UserCircle size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
          <h6>No hay profesionales registrados</h6>
          <p>Haz clic en "Nuevo Profesional" para iniciar.</p>
        </div>
      ) : (
        <div className="row">
          {staff.map(member => (
            <div className="col s12 m6 l4" key={member.id}>
              <div className="card-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div className="avatar" style={{ width: '60px', height: '60px', fontSize: '1.5rem', backgroundColor: '#fdf2f8', color: '#db2777' }}>
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h6 style={{ margin: '0 0 5px 0', fontWeight: 700, color: '#0f172a' }}>{member.name}</h6>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block' }}>{member.role}</span>
                      <span className={`badge-soft ${member.status === 'Activa' ? 'badge-green' : 'badge-gray'}`} style={{ marginTop: '5px', display: 'inline-block' }}>
                        {member.status}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => openEditModal(member)} className="btn-flat" style={{ padding: '4px', height: 'auto', lineHeight: 1, color: '#475569' }}><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(member.id)} className="btn-flat" style={{ padding: '4px', height: 'auto', lineHeight: 1, color: '#ef4444' }}><Trash2 size={16}/></button>
                  </div>
                </div>

                <div style={{ marginTop: '20px', flex: 1 }}>
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ flex: 1, textAlign: 'center', padding: '10px', backgroundColor: '#fcf8ff', borderRadius: '8px', border: '1px solid #f3e8ff' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: '#9333ea', fontWeight: 600 }}>
                        <Star size={14} fill="#9333ea" /> {member.rating || 'N/A'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{member.reviews || 0} Reseñas</span>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ display: 'block', color: '#334155', fontWeight: 600 }}>
                        {member.exp}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Experiencia</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <Calendar size={14} /> <strong>Disponibilidad:</strong> {member.availability}
                  </div>
                </div>
                
                <div style={{ marginTop: '15px' }}>
                  <button className="modern-btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                    <MessageCircle size={16} style={{ marginRight: '8px' }} /> Enviar Mensaje
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modern Custom Modal overlay */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h5 style={{ marginTop: 0, fontWeight: 600 }}>{editingId ? 'Editar Profesional' : 'Nuevo Profesional'}</h5>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div className="row">
                <div className="col s12" style={{ marginBottom: '15px' }}>
                  <label>Nombre Completo</label>
                  <input type="text" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="col s6" style={{ marginBottom: '15px' }}>
                   <label>Especialidad / Rol</label>
                   <input type="text" required placeholder="Ej. Cosmetóloga" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                </div>
                <div className="col s6" style={{ marginBottom: '15px' }}>
                   <label>Años de Experiencia</label>
                   <input type="text" required placeholder="Ej. 5 años" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    value={formData.exp} onChange={e => setFormData({...formData, exp: e.target.value})} />
                </div>
                <div className="col s6" style={{ marginBottom: '15px' }}>
                   <label>Disponibilidad</label>
                   <input type="text" required placeholder="Ej. Lunes a Viernes" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})} />
                </div>
                <div className="col s6" style={{ marginBottom: '15px' }}>
                  <label>Estado</label>
                  <select className="browser-default" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', height: '40px' }}
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Activa">Activa</option>
                    <option value="Inactiva">Inactiva</option>
                    <option value="Vacaciones">Vacaciones</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="modern-btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="modern-btn-small">Guardar Profesional</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Staff;
