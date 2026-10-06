import React, { useState, useEffect } from 'react';
import { Search, Users, Phone, Mail, BookOpen, Trash2, Calendar, CheckCircle, DollarSign, X, RotateCcw, AlertCircle, MessageCircle } from 'lucide-react';
import { getAllDocuments, deleteDocument, updateDocument, createDocument } from '../services/firebaseUtils';

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [paymentModal, setPaymentModal] = useState(null); // Lead being paid
  const [paymentData, setPaymentData] = useState({ amount: '', method: 'efectivo' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const [leadsData, coursesData] = await Promise.all([
        getAllDocuments('leads_academia'),
        getAllDocuments('cursos')
      ]);
      
      // Ordenar por fecha descendente
      const sorted = leadsData.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      
      setLeads(sorted);
      setCourses(coursesData);
    } catch (error) {
      window.M?.toast({ html: 'Error al cargar información', classes: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este registro?")) {
      try {
        await deleteDocument('leads_academia', id);
        window.M?.toast({ html: 'Registro eliminado', classes: 'green rounded' });
        loadLeads();
      } catch (error) {
        window.M?.toast({ html: 'Error al eliminar', classes: 'red rounded' });
      }
    }
  };

  const toggleStatus = async (lead) => {
    if (lead.status === 'Pagado' || lead.status === 'Reembolsado') return;
    try {
      let newStatus = 'Contactado';
      if (lead.status === 'Contactado') newStatus = 'Pendiente de Pago';
      else if (lead.status === 'Pendiente de Pago') newStatus = 'Pendiente';
      
      await updateDocument('leads_academia', lead.id, { status: newStatus });
      window.M?.toast({ html: `Marcado como ${newStatus}`, classes: 'green rounded' });
      loadLeads();
    } catch (error) {
      window.M?.toast({ html: 'Error al actualizar', classes: 'red rounded' });
    }
  };

  const handleRefund = async (lead) => {
    if (!window.confirm(`¿Seguro que deseas reembolsar el pago de ${lead.name}? Se registrará un movimiento negativo en los reportes.`)) return;

    try {
      setIsSubmitting(true);
      
      // 1. Actualizar el Lead
      await updateDocument('leads_academia', lead.id, { 
        status: 'Reembolsado',
        refundedAt: new Date()
      });

      // 2. Crear el Pedido Negativo (Sincronización con Reports.jsx)
      const amount = Number(lead.paymentAmount || 0);
      const refundPedido = {
        type: 'academia',
        clientName: lead.name,
        itemName: `REEMBOLSO: ${lead.courseName || 'Curso Academia'}`,
        amount: -amount, // Valor negativo para restar en reportes
        paymentMethod: lead.paymentMethod || 'transferencia',
        status: 'Reembolsado',
        createdAt: new Date(),
        date: new Date().toISOString().split('T')[0]
      };
      await createDocument('pedidos', refundPedido);

      window.M?.toast({ html: 'Reembolso procesado exitosamente', classes: 'orange rounded' });
      loadLeads();
    } catch (error) {
      window.M?.toast({ html: 'Error al procesar reembolso', classes: 'red rounded' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentModal = (lead) => {
    const course = courses.find(c => c.id === lead.courseId || c.name === lead.courseName);
    setPaymentModal(lead);
    setPaymentData({
      amount: course?.price || '',
      method: 'efectivo'
    });
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    if (!paymentModal || isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      // 1. Actualizar el Lead
      const leadUpdate = {
        status: 'Pagado',
        paymentAmount: Number(paymentData.amount),
        paymentMethod: paymentData.method,
        paidAt: new Date()
      };
      await updateDocument('leads_academia', paymentModal.id, leadUpdate);

      // 2. Crear el Pedido para Reportes (Sincronización con Reports.jsx)
      const pedidoData = {
        type: 'academia',
        clientName: paymentModal.name,
        clientPhone: paymentModal.phone,
        clientEmail: paymentModal.email,
        itemName: `Curso: ${paymentModal.courseName || 'Academia'}`,
        amount: Number(paymentData.amount),
        paymentMethod: paymentData.method,
        status: 'Pagado', // Status simplificado para coincidir con filtros de Reports
        createdAt: new Date(),
        date: new Date().toISOString().split('T')[0]
      };
      await createDocument('pedidos', pedidoData);

      window.M?.toast({ html: 'Pago registrado exitosamente', classes: 'green rounded' });
      setPaymentModal(null);
      loadLeads();
    } catch (error) {
      window.M?.toast({ html: 'Error al registrar pago', classes: 'red rounded' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Reciente';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h3>Interesados en Academia</h3>
          <p>Gestiona los prospectos que se han registrado para tomar cursos o clases.</p>
        </div>
      </div>

      <div className="card-panel" style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, curso o correo..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', height: '38px', margin: 0, paddingLeft: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="center-align" style={{ padding: '2rem' }}>
           <div className="preloader-wrapper small active"><div className="spinner-layer spinner-green-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="center-align" style={{ padding: '4rem 1rem', color: '#64748b' }}>
          <Users size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
          <h6>No hay interesados registrados aún</h6>
          <p>Los clientes que se inscriban en la web aparecerán aquí.</p>
        </div>
      ) : (
        <div className="card-panel" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
          <div className="table-responsive-wrapper" style={{ overflowX: 'auto' }}>
            <table className="leads-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '15px' }}>Nombre</th>
                  <th style={{ padding: '15px' }}>Contacto</th>
                  <th style={{ padding: '15px' }}>Curso</th>
                  <th style={{ padding: '15px' }}>Fecha</th>
                  <th style={{ padding: '15px' }}>Estado</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{lead.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{lead.email}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone size={14} color="#64748b" />
                          <span style={{ fontSize: '0.9rem' }}>{lead.phone}</span>
                          <a 
                            href={`https://wa.me/57${lead.phone?.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              backgroundColor: '#25D366', color: 'white', borderRadius: '50%',
                              width: '24px', height: '24px'
                            }}
                          >
                            <MessageCircle size={14} />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500, color: '#0369a1', fontSize: '0.9rem' }}>
                        <BookOpen size={14} /> {lead.courseName || 'General'}
                      </span>
                    </td>
                    <td style={{ padding: '15px', fontSize: '0.85rem', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={14} /> {formatDate(lead.createdAt)}
                      </div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <span 
                        onClick={() => (lead.status !== 'Pagado' && lead.status !== 'Reembolsado') && toggleStatus(lead)}
                        style={{ 
                          padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, 
                          cursor: (lead.status === 'Pagado' || lead.status === 'Reembolsado') ? 'default' : 'pointer',
                          backgroundColor: 
                            lead.status === 'Pagado' ? '#dcfce7' : 
                            lead.status === 'Reembolsado' ? '#fee2e2' :
                            lead.status === 'Pendiente de Pago' ? '#ffedd5' :
                            lead.status === 'Contactado' ? '#e0f2fe' : '#fef9c3',
                          color: 
                            lead.status === 'Pagado' ? '#15803d' : 
                            lead.status === 'Reembolsado' ? '#b91c1c' :
                            lead.status === 'Pendiente de Pago' ? '#9a3412' :
                            lead.status === 'Contactado' ? '#0369a1' : '#854d0e',
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        {lead.status === 'Pagado' && <CheckCircle size={12} />}
                        {lead.status === 'Reembolsado' && <AlertCircle size={12} />}
                        {lead.status || 'Pendiente'}
                      </span>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        {lead.status === 'Pagado' ? (
                          <button 
                            onClick={() => handleRefund(lead)}
                            className="btn-flat" 
                            title="Reembolsar"
                            style={{ color: '#f97316', padding: '0 8px' }}
                          >
                            <RotateCcw size={18} />
                          </button>
                        ) : lead.status !== 'Reembolsado' && (
                          <button 
                            onClick={() => openPaymentModal(lead)}
                            className="btn-flat" 
                            title="Registrar Pago"
                            style={{ color: '#10b981', padding: '0 8px' }}
                          >
                            <DollarSign size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(lead.id)}
                          className="btn-flat" 
                          title="Eliminar"
                          style={{ color: '#ef4444', padding: '0 8px' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Registro de Pago */}
      {paymentModal && (
        <div className="luxury-modal-overlay">
          <div className="luxury-modal-container" style={{ maxWidth: '400px' }}>
            <div className="luxury-modal-header">
              <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Registrar Pago</h5>
              <button onClick={() => setPaymentModal(null)} className="btn-flat" style={{ padding: 0 }}>
                <X size={24} color="#94a3b8" />
              </button>
            </div>
            
            <form onSubmit={handleRegisterPayment}>
              <div className="luxury-modal-body">
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>Cliente</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{paymentModal.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>{paymentModal.courseName}</div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Monto a Cobrar ($ COP)</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    className="browser-default" 
                    style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1.1rem', fontWeight: 700 }}
                    value={paymentData.amount} 
                    onChange={e => setPaymentData({...paymentData, amount: e.target.value})} 
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Método de Pago</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {['efectivo', 'nequi', 'tarjeta', 'transferencia'].map(m => (
                      <button 
                        key={m}
                        type="button"
                        onClick={() => setPaymentData({...paymentData, method: m})}
                        style={{ 
                          padding: '10px 0', border: `1px solid ${paymentData.method === m ? '#10b981' : '#e2e8f0'}`,
                          borderRadius: '8px', backgroundColor: paymentData.method === m ? '#f0fdf4' : 'white',
                          color: paymentData.method === m ? '#15803d' : '#64748b', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize'
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="luxury-modal-footer">
                <button type="button" className="modern-btn-outline" onClick={() => setPaymentModal(null)}>Cancelar</button>
                <button type="submit" className="modern-btn-small" disabled={isSubmitting}>
                  {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
