import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Globe } from 'lucide-react';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAllDocuments, createDocument, updateDocument, deleteDocument } from '../services/firebaseUtils';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import emailjs from '@emailjs/browser';
import logoBase64 from '../assets/logoBase64.js';
import FirmaDigital from '../components/FirmaDigital';
import ModalRecibo from '../components/ModalRecibo';

const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta'];
// Utility colors for appointment blocks
const APPT_COLORS = [
  { bg: '#d9f99d', border: '#84cc16' }, // Lime/Green
  { bg: '#7dd3fc', border: '#0284c7' }, // Light Blue
  { bg: '#fbcfe8', border: '#ec4899' }, // Light Pink
  { bg: '#fde047', border: '#eab308' }, // Yellow
  { bg: '#e9d5ff', border: '#a855f7' }, // Purple
];

const getColorPair = (idString) => {
  if (!idString) return APPT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < idString.length; i++) {
    hash = idString.charCodeAt(i) + ((hash << 5) - hash);
  }
  return APPT_COLORS[Math.abs(hash) % APPT_COLORS.length];
};

const addMins = (timeStr, mins) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + m + mins;
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
};

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    clientId: '', clientName: '', 
    serviceId: '', serviceName: '', 
    staffId: '', staffName: '', 
    date: '', time: '', 
    status: 'Pendiente',
    notifyEmail: false,
    notifyWhatsApp: false,
    pagado: false,
    metodoPago: 'efectivo'
  });

  // Pago y Firma State
  const [pagoModal, setPagoModal] = useState(null);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState('efectivo');
  const [firmaModal, setFirmaModal] = useState(null);
  const [reciboModal, setReciboModal] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [apptsData, clientsData, servicesData, staffData] = await Promise.all([
        getAllDocuments('citas'),
        getAllDocuments('clientes'),
        getAllDocuments('servicios'),
        getAllDocuments('empleados')
      ]);
      
      setAppointments(apptsData);
      setClients(clientsData);
      setServices(servicesData);
      // Filter out inactive staff
      setStaff(staffData.filter(s => s.status !== 'Inactivo'));
    } catch (error) {
      window.M?.toast({ html: 'Error cargando datos del calendario', classes: 'red rounded' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = (clickedDate, clickedTime, clickedStaffId) => {
    setFormData({ 
      clientId: '', clientName: '', 
      serviceId: '', serviceName: '', 
      staffId: clickedStaffId || '', staffName: '', 
      date: clickedDate || selectedDate, 
      time: clickedTime || '10:00', 
      status: 'Pendiente',
      notifyEmail: false,
      notifyWhatsApp: false
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (appt) => {
    // Resolve client contact info through multiple fallbacks
    let enrichedAppt = { ...appt, notifyEmail: false, notifyWhatsApp: false };
    let resolvedEmail = '';
    let resolvedPhone = '';
    
    // 1. Try local clients list by ID
    const localClient = clients.find(c => c.id === appt.clientId);
    if (localClient) {
      resolvedEmail = localClient.email || localClient.correo || '';
      resolvedPhone = localClient.phone || localClient.telefono || localClient.celular || '';
    }
    
    // 2. Use stored fields from landing page bookings (override if better)
    if (!resolvedEmail && appt.clientEmail) resolvedEmail = appt.clientEmail;
    if (!resolvedPhone && appt.clientPhone) resolvedPhone = appt.clientPhone;

    // 3. Fetch from Firestore by clientId if still missing
    if ((!resolvedEmail || !resolvedPhone) && appt.clientId) {
      try {
        const snap = await getDoc(doc(db, 'clientes', appt.clientId));
        if (snap.exists()) {
          const d = snap.data();
          if (!resolvedEmail) resolvedEmail = d.email || d.correo || '';
          if (!resolvedPhone) resolvedPhone = d.phone || d.telefono || d.celular || '';
        }
      } catch(e) { console.warn('Fetch client fallback error', e); }
    }

    // 4. Last resort: search by name in local clients
    if (!resolvedEmail && !resolvedPhone && appt.clientName) {
      const byName = clients.find(c => c.name?.toLowerCase() === appt.clientName?.toLowerCase());
      if (byName) {
        resolvedEmail = byName.email || byName.correo || '';
        resolvedPhone = byName.phone || byName.telefono || byName.celular || '';
      }
    }

    enrichedAppt.resolvedEmail = resolvedEmail;
    enrichedAppt.resolvedPhone = resolvedPhone;
    
    setFormData(enrichedAppt);
    setEditingId(appt.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      const selectedService = services.find(s => s.id === formData.serviceId);
      const selectedStaff = staff.find(s => s.id === formData.staffId);

      const finalData = {
        ...formData,
        clientName: selectedClient?.name || formData.clientName,
        serviceName: selectedService?.name || formData.serviceName,
        staffName: selectedStaff?.name || formData.staffName,
      };

      const dataToSave = { ...finalData };
      delete dataToSave.notifyEmail;
      delete dataToSave.notifyWhatsApp;

      if (editingId) {
        // If status changed to Cancelada, delete the appointment to free the slot
        if (dataToSave.status === 'Cancelada') {
          await deleteDocument('citas', editingId);
          window.M?.toast({ html: 'Cita cancelada. Horario liberado.', classes: 'orange rounded' });
        } else {
          await updateDocument('citas', editingId, dataToSave);
          window.M?.toast({ html: 'Cita actualizada', classes: 'green rounded' });
        }
      } else {
        // Check for duplicate time slot before creating
        const dupeQ = query(
          collection(db, 'citas'),
          where('date', '==', dataToSave.date),
          where('time', '==', dataToSave.time)
        );
        const dupeSnap = await getDocs(dupeQ);
        const activeConflict = dupeSnap.docs.some(d => {
          const s = d.data().status;
          return s !== 'Cancelada';
        });
        if (activeConflict) {
          window.M?.toast({ html: '🚫 Horario no disponible. Andrea, ya tienes una cita programada a esta hora.', classes: 'red rounded' });
          return;
        }
        await createDocument('citas', dataToSave);
        window.M?.toast({ html: 'Cita agendada', classes: 'green rounded' });
      }
      
      setIsModalOpen(false);
      loadData();

      // Notificaciones
      if (formData.notifyEmail) {
        // Resolve email: use enriched field, then local clients, then appointment's own stored email
        const resolvedEmail = formData.resolvedEmail 
          || selectedClient?.email 
          || formData.clientEmail 
          || '';
          
        if (resolvedEmail) {
          const emailjsServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
          const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_APPT || 'YOUR_TEMPLATE_ID';
          const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

          emailjs.send(emailjsServiceId, templateId, {
            titulo_cabecera:    'Confirmación de Cita 🌿',
            to_name:            finalData.clientName,
            to_email:           resolvedEmail,
            mensaje_bienvenida: 'Tu espacio ha sido reservado con éxito.',
            label_1:            'Servicio',
            valor_1:            finalData.serviceName || 'Tratamiento SPA',
            label_2:            'Fecha y Hora',
            valor_2:            `${finalData.date || ''} · ${finalData.time || ''}`,
            label_3:            'Sede',
            valor_3:            'Chinchiná',
            mensaje_pie_pagina: 'Por favor, llega 5 minutos antes de tu cita.',
            logo_url:           import.meta.env.VITE_LOGO_URL || logoBase64,
            operacion_id:       editingId || '',
            subject:            'Confirmación de Cita - Andrea Cardona SPA',
          }, publicKey)
          .then(() => window.M?.toast({ html: 'Correo de confirmación enviado', classes: 'green rounded' }))
          .catch(err => {
            console.error('Error enviando correo de cita:', err);
            window.M?.toast({ html: 'Error al enviar el correo', classes: 'orange rounded' });
          });
        } else {
          window.M?.toast({ html: 'El cliente no tiene correo registrado en el sistema', classes: 'orange rounded' });
        }
      }

      if (formData.notifyWhatsApp) {
        // Try to resolve phone from enriched appt, client list, or stored field
        const resolvedPhone = formData.resolvedPhone
          || selectedClient?.phone || selectedClient?.telefono || selectedClient?.celular
          || formData.clientPhone || '';
        if (resolvedPhone) {
          const num = resolvedPhone.replace(/\D/g, '');
          const cleanNum = num.startsWith('57') ? num : `57${num}`;
          const mensaje = encodeURIComponent(
            `🌿 *Andrea Cardona SPA – Cita*\n\n` +
            `Hola *${finalData.clientName}*,\n\n` +
            `Tu cita ha sido ${editingId ? 'actualizada' : 'agendada'}:\n\n` +
            `📋 *Tratamiento:* ${finalData.serviceName}\n` +
            `📅 *Fecha:* ${finalData.date}\n` +
            `⏰ *Hora:* ${finalData.time}\n` +
            `👩‍⚕️ *Profesional:* ${finalData.staffName}\n\n` +
            `¡Te esperamos! 🌷`
          );
          window.open(`https://wa.me/${cleanNum}?text=${mensaje}`, '_blank');
        } else {
          window.M?.toast({ html: 'El cliente no tiene teléfono registrado', classes: 'orange rounded' });
        }
      }
    } catch (error) {
      window.M?.toast({ html: 'Error al procesar la cita', classes: 'red rounded' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas cancelar y eliminar esta cita?")) {
      try {
        await deleteDocument('citas', id);
        window.M?.toast({ html: 'Cita eliminada', classes: 'green rounded' });
        setIsModalOpen(false);
        loadData();
      } catch (error) {
        window.M?.toast({ html: 'Error cancelando cita', classes: 'red rounded' });
      }
    }
  };

  const abrirPagoModal = (appt) => {
    setMetodoPagoSeleccionado('efectivo');
    setPagoModal(appt);
  };

  const handleConfirmarPagoMethod = () => {
    setFirmaModal({ appt: pagoModal, metodoPago: metodoPagoSeleccionado });
    setPagoModal(null);
  };

  const handleFirmaConfirmada = async (base64) => {
    try {
      const appt = firmaModal.appt;
      const mPago = firmaModal.metodoPago;
      const selectedService = services.find(s => s.id === appt.serviceId);
      const precio = selectedService?.price || 0;

      const dataToSave = {
        ...appt,
        pagado: true,
        metodoPago: mPago,
        firma: base64,
        status: 'Completada' // automatically complete when paid
      };

      await updateDocument('citas', appt.id, dataToSave);
      await loadData();
      setFirmaModal(null);
      setIsModalOpen(false);

      // Abrir recibo — resolve contact from multiple sources
      const clientDoc = clients.find(c => c.id === appt.clientId);
      setReciboModal({
        clienteNombre: appt.clientName,
        clienteEmail: appt.resolvedEmail || appt.clientEmail || clientDoc?.email || clientDoc?.correo || '',
        clientePhone: appt.resolvedPhone || appt.clientPhone || clientDoc?.phone || clientDoc?.telefono || clientDoc?.celular || '',
        tratamiento: appt.serviceName,
        numeroSesion: 'N/A (Cita Normal)',
        totalSesiones: '1',
        monto: precio,
        metodoPago: mPago,
        fecha: appt.date,
        profesional: appt.staffName,
        observaciones: `Cita Normal - ${appt.time}`,
        firma: base64,
      });

    } catch (err) {
      console.error('Error al confirmar firma de cita:', err);
      window.M?.toast({ html: 'Error guardando pago y firma', classes: 'red rounded' });
    }
  };


  // Timeline UI Configuration
  const START_HOUR = 8;
  const END_HOUR = 20; // 8 PM
  const HOUR_HEIGHT = 80; // pixels per hour
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

  const getServiceDuration = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    if (service && service.duration) {
       const match = service.duration.match(/\d+/);
       if(match) return Number(match[0]);
    }
    return 60; // default 60 mins
  };

  const moveDate = (days) => {
     let d = parseISO(selectedDate);
     d = days > 0 ? addDays(d, days) : subDays(d, Math.abs(days));
     setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '15px' }}>
        <div className="page-title">
          <h3>Agenda de Turnos</h3>
          <p>Organización visual de profesionales y citas del día.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="modern-btn-small" onClick={() => openAddModal()}><Plus size={18} /> Agendar Cita</button>
        </div>
      </div>

      <div className="card-panel" style={{ padding: '1rem', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <button className="btn-flat" style={{ padding: '0 8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} onClick={() => moveDate(-1)}><ChevronLeft size={20}/></button>
             <h6 style={{ margin: 0, fontWeight: 700, color: '#0f172a', width: '200px', textAlign: 'center' }}>
               {format(parseISO(selectedDate), "EEEE d 'de' MMMM", { locale: es })}
             </h6>
             <button className="btn-flat" style={{ padding: '0 8px', border: '1px solid #e2e8f0', borderRadius: '8px' }} onClick={() => moveDate(1)}><ChevronRight size={20}/></button>
             
             <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} 
                style={{ height: '38px', margin: 0, padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0', width: 'auto' }} />
          </div>

          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar cita..." 
              style={{ width: '100%', height: '38px', margin: 0, paddingLeft: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* TIMELINE CALENDAR GRID */}
      {loading ? (
           <div className="center-align" style={{ padding: '2rem' }}>
              <div className="preloader-wrapper small active"><div className="spinner-layer spinner-blue-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
           </div>
      ) : staff.length === 0 ? (
           <div className="center-align card-panel">
               <User size={48} color="#cbd5e1" />
               <h6>No hay profesionales activos</h6>
               <p>Registra empleados en el módulo de Staff para ver la agenda.</p>
           </div>
      ) : (
        <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white', minHeight: '600px' }}>
          
          {/* Time Axis Column */}
          <div style={{ width: '80px', flexShrink: 0, borderRight: '1px solid #e2e8f0', backgroundColor: '#fcfcfc' }}>
            <div style={{ height: '70px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Clock size={20} color="#94a3b8" />
            </div>
            <div style={{ position: 'relative', height: `${hours.length * HOUR_HEIGHT}px` }}>
              {hours.map(hour => (
                 <div key={hour} style={{ 
                     height: `${HOUR_HEIGHT}px`, borderBottom: '1px solid #e2e8f0', padding: '10px 15px', 
                     color: '#64748b', fontSize: '0.85rem', textAlign: 'right', fontWeight: 500, boxSizing: 'border-box'
                 }}>
                   {`${hour.toString().padStart(2, '0')}:00`}
                 </div>
              ))}
            </div>
          </div>

          {/* Staff Columns Overlay Container */}
          <div style={{ flex: 1, display: 'flex', overflowX: 'auto', position: 'relative' }}>
            {staff.map(member => {
              // Get current day's appointments for this specific staff member
              const dailyAppts = appointments.filter(a => a.date === selectedDate && a.staffId === member.id);
              
              return (
                <div key={member.id} style={{ minWidth: '220px', flex: 1, borderRight: '1px solid #e2e8f0', position: 'relative' }}>
                  
                  {/* Sticky Staff Header */}
                  <div style={{ 
                      height: '70px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', 
                      alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', position: 'sticky', top: 0, zIndex: 10 
                  }}>
                     <div className="avatar" style={{width: '32px', height:'32px', fontSize: '14px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>
                        {member.name.charAt(0)}
                     </div>
                     <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginTop: '6px' }}>{member.name.split(' ')[0]} {member.name.split(' ')[1] || ''}</span>
                  </div>

                  {/* Grid Lines & Clickable Empty Area (Double Click to Create) */}
                  <div style={{ position: 'relative', height: `${hours.length * HOUR_HEIGHT}px` }}>
                    {hours.map(hour => (
                       <div key={hour} 
                            onDoubleClick={() => openAddModal(selectedDate, `${hour.toString().padStart(2, '0')}:00`, member.id)}
                            style={{ height: `${HOUR_HEIGHT}px`, borderBottom: '1px dashed #e2e8f0', cursor: 'cell', opacity: 0.5, '&:hover': {backgroundColor: '#f8fafc'} }} />
                    ))}

                    {/* Rendering Appointment Blocks */}
                    {dailyAppts.map(appt => {
                       if (!appt.time) return null;
                       const [hStr, mStr] = appt.time.split(':');
                       const h = Number(hStr);
                       const m = Number(mStr) || 0;
                       
                       // Skip rendering if before start hour (out of visual bounds)
                       if (h < START_HOUR) return null; 

                       const durationMins = getServiceDuration(appt.serviceId);
                       
                       // Calculate position
                       const topPosition = ((h - START_HOUR) + (m / 60)) * HOUR_HEIGHT;
                       const blockHeight = (durationMins / 60) * HOUR_HEIGHT;
                       
                       const colors = getColorPair(appt.clientId);

                       return (
                         <div key={appt.id} 
                              onClick={() => openEditModal(appt)} 
                              title={`${appt.clientName} - ${appt.serviceName}`}
                              style={{ 
                                position: 'absolute', top: `${topPosition}px`, left: '4px', right: '4px', height: `${blockHeight - 2}px`, 
                                backgroundColor: colors.bg, borderRadius: '6px', padding: '8px 10px', overflow: 'hidden', cursor: 'pointer',
                                borderLeft: `5px solid ${colors.border}`, display: 'flex', flexDirection: 'column', transition: 'transform 0.1s',
                                zIndex: 5
                              }}
                              onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(0.95)'}
                              onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                               <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>{appt.clientName} {appt.pagado && <span style={{color: '#059669', fontSize: '0.8rem'}}>✓</span>}</span>
                               <Globe size={12} color={colors.border} style={{ opacity: 0.8 }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#334155', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                               {appt.serviceName}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#475569', marginTop: 'auto', fontWeight: 500 }}>
                               {appt.time} - {addMins(appt.time, durationMins)}
                            </span>
                         </div>
                       )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }}>
          <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h4 style={{ marginTop: 0, marginBottom: '24px', fontWeight: 700, color: '#1e293b', fontSize: '1.75rem' }}>
              {editingId ? '📋 Gestión de Cita' : 'Agendar Nueva Cita'}
            </h4>
            <form onSubmit={handleSubmit}>
              <div className="row" style={{ margin: 0 }}>
                {/* Primera Fila */}
                <div className="col s12 m6" style={{ padding: '0 10px 20px 0' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>Cliente</label>
                  <select required className="browser-default" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', height: '44px', padding: '0 12px', color: '#0f172a', fontSize: '0.95rem', backgroundColor: '#ffffff', outline: 'none' }}
                    value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                    <option value="" disabled>Seleccionar Cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col s12 m6" style={{ padding: '0 0 20px 10px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>Servicio</label>
                  <select required className="browser-default" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', height: '44px', padding: '0 12px', color: '#0f172a', fontSize: '0.95rem', backgroundColor: '#ffffff', outline: 'none' }}
                    value={formData.serviceId} onChange={e => setFormData({...formData, serviceId: e.target.value})}>
                    <option value="" disabled>Seleccionar Servicio...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} (${Number(s.price).toLocaleString()})</option>)}
                  </select>
                </div>

                {/* Segunda Fila */}
                <div className="col s12 m4" style={{ padding: '0 10px 20px 0' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>Profesional</label>
                  <select required className="browser-default" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', height: '44px', padding: '0 12px', color: '#0f172a', fontSize: '0.95rem', backgroundColor: '#ffffff', outline: 'none' }}
                    value={formData.staffId} onChange={e => setFormData({...formData, staffId: e.target.value})}>
                    <option value="" disabled>Seleccionar Profesional...</option>
                    {staff.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                  </select>
                </div>
                <div className="col s6 m4" style={{ padding: '0 10px 20px 10px' }}>
                   <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>Fecha</label>
                   <input type="date" required className="browser-default" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', height: '44px', padding: '0 12px', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' }} 
                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="col s6 m4" style={{ padding: '0 0 20px 10px' }}>
                   <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>Hora</label>
                   <input type="time" required className="browser-default" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', height: '44px', padding: '0 12px', color: '#0f172a', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none' }} 
                    value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                </div>

                {editingId && (
                  <div className="col s12" style={{ padding: '0 0 20px 0' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>Estado de la Cita</label>
                    <select className="browser-default" style={{
                      width: '100%', border: '2px solid',
                      borderColor: formData.status === 'Pendiente' ? '#eab308' : formData.status === 'Confirmada' ? '#3b82f6' : formData.status === 'Completada' ? '#10b981' : formData.status === 'Cancelada' ? '#ef4444' : '#e2e8f0',
                      borderRadius: '8px', height: '44px', padding: '0 12px',
                      color: formData.status === 'Pendiente' ? '#854d0e' : formData.status === 'Confirmada' ? '#1e40af' : formData.status === 'Completada' ? '#065f46' : formData.status === 'Cancelada' ? '#991b1b' : '#0f172a',
                      fontSize: '0.95rem', fontWeight: 700,
                      backgroundColor: formData.status === 'Pendiente' ? '#fefce8' : formData.status === 'Confirmada' ? '#eff6ff' : formData.status === 'Completada' ? '#f0fdf4' : formData.status === 'Cancelada' ? '#fef2f2' : '#ffffff',
                      outline: 'none'
                    }}
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Pendiente">⏳ Pendiente</option>
                      <option value="Confirmada">✅ Confirmada</option>
                      <option value="Completada">⭐ Completada</option>
                      <option value="Cancelada">❌ Cancelada</option>
                      <option value="Pendiente de Verificación">💳 Pendiente de Verificación</option>
                      <option value="Confirmada - Pago Presencial">💵 Confirmada - Pago Presencial</option>
                    </select>
                    {formData.status === 'Cancelada' && (
                      <p style={{ margin: '8px 0 0 0', color: '#ef4444', fontSize: '0.8rem', fontWeight: 500 }}>
                        ⚠️ Al guardar con estado "Cancelada", el horario quedará libre automáticamente.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {editingId && formData.pagado && (
                <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                   <span style={{ color: '#065f46', fontWeight: 600, fontSize: '0.9rem' }}>✅ Cita Pagada ({formData.metodoPago || 'efectivo'})</span>
                </div>
              )}
              {editingId && !formData.pagado && formData.status !== 'Cancelada' && (
                <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                   <div>
                     <span style={{ color: '#64748b', fontWeight: 500, fontSize: '0.9rem' }}>Pendiente de Pago</span>
                     {formData.resolvedEmail && (
                       <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', marginTop: '2px' }}>📧 {formData.resolvedEmail}</span>
                     )}
                     {formData.resolvedPhone && (
                       <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem' }}>📱 {formData.resolvedPhone}</span>
                     )}
                   </div>
                   <button type="button" onClick={() => { setIsModalOpen(false); abrirPagoModal({...formData, clientEmail: formData.resolvedEmail, clientPhone: formData.resolvedPhone}); }} className="modern-btn-small" style={{ margin: 0 }}>Registrar Pago</button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '20px', padding: '10px 0', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" className="filled-in" checked={formData.notifyEmail} onChange={e => setFormData({...formData, notifyEmail: e.target.checked})} />
                  <span style={{ color: '#0f172a', fontWeight: 500, fontSize: '0.9rem' }}>📩 Notificar por Correo</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" className="filled-in" checked={formData.notifyWhatsApp} onChange={e => setFormData({...formData, notifyWhatsApp: e.target.checked})} />
                  <span style={{ color: '#0f172a', fontWeight: 500, fontSize: '0.9rem' }}>💬 Notificar por WhatsApp</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                {editingId ? (
                   <button type="button" onClick={() => handleDelete(editingId)} className="btn-flat" style={{ color: '#ef4444', padding: '0', fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer' }}>Eliminar Cita</button>
                ) : <div></div>}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0 20px', height: '44px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.target.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.target.style.backgroundColor = '#ffffff'}>
                    Cancelar
                  </button>
                  <button type="submit" style={{ padding: '0 24px', height: '44px', backgroundColor: '#10b981', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)', transition: 'all 0.2s' }} onMouseOver={(e) => e.target.style.backgroundColor = '#059669'} onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}>
                    Guardar Cita
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Seleccionar Método de Pago */}
      {pagoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-panel" style={{ width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '24px' }}>
            <h5 style={{ marginTop: 0, marginBottom: '20px', fontWeight: 700, color: '#0f172a' }}>Método de Pago</h5>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>Selecciona cómo el cliente realizará el pago para la cita: <strong>{pagoModal.serviceName}</strong></p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {METODOS_PAGO.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetodoPagoSeleccionado(m)}
                  style={{
                    padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                    border: '2px solid', textAlign: 'left',
                    borderColor: metodoPagoSeleccionado === m ? '#059669' : '#e2e8f0',
                    backgroundColor: metodoPagoSeleccionado === m ? '#f0fdf4' : 'white',
                    color: metodoPagoSeleccionado === m ? '#059669' : '#475569',
                    transition: 'all 0.15s'
                  }}>
                  {m === 'efectivo' ? '💵 Efectivo' : m === 'transferencia' ? '🏦 Transferencia' : '💳 Tarjeta / Datáfono'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="modern-btn-outline" onClick={() => { setPagoModal(null); setIsModalOpen(true); }}>Atrás</button>
              <button className="modern-btn-small" onClick={handleConfirmarPagoMethod}>Continuar a Firma</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Firma Digital */}
      {firmaModal && (
        <FirmaDigital
          clienteNombre={firmaModal.appt.clientName || 'Cliente'}
          sesionInfo={`${firmaModal.appt.serviceName} · ${firmaModal.appt.date} ${firmaModal.appt.time}`}
          onConfirm={handleFirmaConfirmada}
          onCancel={() => { setFirmaModal(null); setIsModalOpen(true); }}
        />
      )}

      {/* Modal: Recibo */}
      {reciboModal && (
        <ModalRecibo datos={reciboModal} onClose={() => setReciboModal(null)} />
      )}

    </div>
  );
};

export default Appointments;
