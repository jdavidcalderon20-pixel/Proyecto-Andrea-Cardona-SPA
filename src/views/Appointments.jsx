import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, Globe, X } from 'lucide-react';
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
const SPA_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

const APPT_COLORS = [
  { bg: '#d9f99d', border: '#84cc16' }, // Lime/Green
  { bg: '#7dd3fc', border: '#0284c7' }, // Light Blue
  { bg: '#fbcfe8', border: '#ec4899' }, // Light Pink
  { bg: '#fde047', border: '#eab308' }, // Yellow
  { bg: '#e9d5ff', border: '#a855f7' }, // Purple
];

const getColorPair = (idString) => {
  if (idString === 'BLOQUEO') return { bg: '#334155', border: '#0f172a', text: '#ffffff' };
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
    // Sugerir una hora válida (próxima hora en punto)
    let suggestedTime = clickedTime || '10:00';
    const dateToUse = clickedDate || selectedDate;
    
    if (!clickedTime && dateToUse === new Date().toISOString().split('T')[0]) {
      const now = new Date();
      const currentH = now.getHours();
      // Solo sugerir horas futuras si es hoy
      const futureHours = SPA_HOURS.filter(h => {
        const [hLimit] = h.split(':').map(Number);
        return hLimit > currentH;
      });
      suggestedTime = futureHours.length > 0 ? futureHours[0] : '08:00';
    }

    setFormData({ 
      clientId: '', clientName: '', 
      serviceId: '', serviceName: '', 
      staffId: clickedStaffId || '', staffName: '', 
      date: dateToUse, 
      time: suggestedTime, 
      status: 'Pendiente',
      notifyEmail: false,
      notifyWhatsApp: false
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openBlockModal = (clickedDate, clickedTime, clickedStaffId) => {
    setFormData({ 
      clientId: 'BLOQUEO', clientName: 'BLOQUEO ADMINISTRATIVO', 
      serviceId: 'BLOQUEO', serviceName: 'Indisponible (Diligencia)', 
      staffId: clickedStaffId || '', staffName: '', 
      date: clickedDate || selectedDate, 
      time: clickedTime || '08:00', 
      status: 'Bloqueado',
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

      // 1. Validar que no sea en el pasado (solo para citas nuevas o si cambió la hora)
      const now = new Date();
      // Creamos la fecha local para comparar correctamente
      const [year, month, day] = dataToSave.date.split('-').map(Number);
      const [hour, min] = dataToSave.time.split(':').map(Number);
      const apptDateTime = new Date(year, month - 1, day, hour, min);

      if (apptDateTime < now && !editingId) {
        window.M?.toast({ html: '🚫 No puedes agendar citas en el pasado.', classes: 'red rounded' });
        return;
      }

      // 2. Validar conflictos de horario (considerando duración y profesional)
      const durationMins = getServiceDuration(dataToSave.serviceId);
      const startTotalMins = hour * 60 + min;
      const endTotalMins = startTotalMins + durationMins;

      const hasConflict = appointments.some(a => {
        if (a.id === editingId) return false;
        if (a.date !== dataToSave.date) return false;
        if (a.staffId !== dataToSave.staffId) return false;
        if (a.status === 'Cancelada') return false;

        const [ah, am] = a.time.split(':').map(Number);
        const aStart = ah * 60 + am;
        const aDuration = getServiceDuration(a.serviceId);
        const aEnd = aStart + aDuration;

        // Lógica de solapamiento: (InicioA < FinB) && (FinA > InicioB)
        return startTotalMins < aEnd && endTotalMins > aStart;
      });

      if (hasConflict) {
        window.M?.toast({ html: '🚫 El profesional ya tiene una cita o el horario se cruza con otra atención.', classes: 'red rounded' });
        return;
      }

      if (editingId) {
        // If status changed to Cancelada, delete the appointment to free the slot
        if (dataToSave.status === 'Cancelada') {
          await deleteDocument('citas', editingId);
          window.M?.toast({ html: 'Cita cancelada. Horario liberado.', classes: 'orange rounded' });
        } else {
          await updateDocument('citas', editingId, dataToSave);
          window.M?.toast({ html: 'Cita/Bloqueo actualizado', classes: 'green rounded' });
        }
      } else {
        await createDocument('citas', dataToSave);
        window.M?.toast({ html: dataToSave.clientId === 'BLOQUEO' ? 'Horario bloqueado' : 'Cita agendada', classes: 'green rounded' });
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

      if (formData.notifyWhatsApp && formData.clientId !== 'BLOQUEO') {
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
          
          const waUrl = `https://wa.me/${cleanNum}?text=${mensaje}`;
          
          // CRITICAL: On mobile, async waits break window.open.
          // We use window.location.assign for mobile as it's more reliable.
          setTimeout(() => {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
              window.location.assign(waUrl);
            } else {
              window.open(waUrl, '_blank');
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      window.M?.toast({ html: 'Error al procesar la cita', classes: 'red rounded' });
    }
  };

  const handleManualEmail = async (appt) => {
    const clientDoc = clients.find(c => c.id === appt.clientId);
    const resolvedEmail = appt.resolvedEmail || appt.clientEmail || clientDoc?.email || clientDoc?.correo || '';
    
    if (!resolvedEmail) {
      window.M?.toast({ html: 'El cliente no tiene correo registrado', classes: 'orange rounded' });
      return;
    }

    try {
      const emailjsServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_APPT;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      await emailjs.send(emailjsServiceId, templateId, {
        titulo_cabecera:    'Confirmación de Cita 🌿',
        to_name:            appt.clientName,
        to_email:           resolvedEmail,
        mensaje_bienvenida: 'Recordatorio de tu espacio reservado.',
        label_1:            'Servicio',
        valor_1:            appt.serviceName,
        label_2:            'Fecha y Hora',
        valor_2:            `${appt.date} · ${appt.time}`,
        label_3:            'Sede',
        valor_3:            'Chinchiná',
        mensaje_pie_pagina: 'Por favor, llega 5 minutos antes de tu cita.',
        logo_url:           import.meta.env.VITE_LOGO_URL || logoBase64,
        operacion_id:       appt.id,
        subject:            'Recordatorio de Cita - Andrea Cardona SPA',
      }, publicKey);
      
      window.M?.toast({ html: 'Correo enviado con éxito', classes: 'green rounded' });
    } catch (err) {
      console.error('Error manual email:', err);
      window.M?.toast({ html: 'Error al enviar correo', classes: 'red rounded' });
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
    if (serviceId === 'BLOQUEO') return 60; // blocks are 1 hour by default
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
          <button className="modern-btn-small" style={{ backgroundColor: '#475569' }} onClick={() => openBlockModal()}><Clock size={18} /> Bloquear Horario</button>
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
                       const isBlock = appt.clientId === 'BLOQUEO';

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
                               <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isBlock ? '#ffffff' : '#0f172a', lineHeight: 1.1 }}>
                                 {appt.clientName} {appt.pagado && <span style={{color: '#059669', fontSize: '0.8rem'}}>✓</span>}
                               </span>
                               <Globe size={12} color={isBlock ? '#ffffff' : colors.border} style={{ opacity: 0.8 }} />
                            </div>
                            
                            {!isBlock && (
                              <div style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: '4px', 
                                fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', 
                                borderRadius: '4px', marginTop: '4px', width: 'fit-content',
                                backgroundColor: 'rgba(255,255,255,0.5)', color: '#1e293b'
                              }}>
                                {appt.status === 'Pendiente' && '⏳'}
                                {appt.status === 'Confirmada' && '✅'}
                                {appt.status === 'Completada' && '⭐'}
                                {appt.status === 'Cancelada' && '❌'}
                                {appt.status === 'Pendiente de Verificación' && '💳'}
                                {appt.status}
                              </div>
                            )}

                            <span style={{ fontSize: '0.75rem', color: isBlock ? '#cbd5e1' : '#334155', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                               {appt.serviceName}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: isBlock ? '#94a3b8' : '#475569', marginTop: 'auto', fontWeight: 500 }}>
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

      {/* Luxury Booking Modal */}
      {isModalOpen && (
        <div className="luxury-modal-overlay">
          <div className="luxury-modal-container" style={{ maxWidth: '650px' }}>
            <div className="luxury-modal-header">
              <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                {formData.clientId === 'BLOQUEO' 
                  ? (editingId ? 'Editar Bloqueo' : 'Nuevo Bloqueo Administrativo')
                  : (editingId ? 'Gestión de Cita' : 'Agendar Nueva Cita')}
              </h5>
              <button onClick={() => setIsModalOpen(false)} className="btn-flat" style={{ padding: 0 }}>
                <X size={24} color="#94a3b8" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="luxury-modal-body">
                <div className="row" style={{ margin: 0 }}>
                  {/* Primera Fila */}
                  {formData.clientId !== 'BLOQUEO' ? (
                    <>
                      <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Cliente</label>
                        <select required className="browser-default"
                          value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                          <option value="" disabled>Seleccionar Cliente...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Servicio</label>
                        <select required className="browser-default"
                          value={formData.serviceId} onChange={e => setFormData({...formData, serviceId: e.target.value})}>
                          <option value="" disabled>Seleccionar Servicio...</option>
                          {services.map(s => <option key={s.id} value={s.id}>{s.name} (${Number(s.price).toLocaleString()})</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="col s12" style={{ marginBottom: '20px' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#475569', textAlign: 'center' }}>
                        <Clock size={24} style={{ marginBottom: '8px', color: 'var(--spa-gold)' }} />
                        <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Bloqueo Administrativo</p>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Este horario no estará disponible en la página web.</p>
                      </div>
                    </div>
                  )}

                  {/* Segunda Fila */}
                  {/* Segunda Fila - Agrupada para Responsividad */}
                  <div className="col s12" style={{ padding: 0 }}>
                    <div className="input-group-responsive">
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Profesional</label>
                        <select required className="browser-default"
                          value={formData.staffId} onChange={e => setFormData({...formData, staffId: e.target.value})}>
                          <option value="" disabled>Seleccionar...</option>
                          {staff.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                        </select>
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Fecha</label>
                        <input type="date" required className="browser-default luxury-input"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Hora</label>
                        <select required className="browser-default luxury-input"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}>
                            <option value="" disabled>Seleccionar...</option>
                            {SPA_HOURS.filter(h => {
                              const todayStr = new Date().toLocaleDateString('en-CA');
                              
                              // 1. Ocultar si ya está ocupado por este profesional (Cita o Bloqueo)
                              const isBusy = appointments.some(a => 
                                a.date === formData.date && 
                                a.staffId === formData.staffId && 
                                a.time === h && 
                                a.status !== 'Cancelada' &&
                                a.id !== editingId
                              );
                              if (isBusy) return false;

                              // 2. Ocultar si es hoy y la hora ya pasó
                              if (formData.date === todayStr) {
                                  const now = new Date();
                                  const currentMins = now.getHours() * 60 + now.getMinutes();
                                  const [hLimit, mLimit] = h.split(':').map(Number);
                                  const slotMins = hLimit * 60 + (mLimit || 0);
                                  return slotMins > currentMins;
                              }
                              // Evitar fechas pasadas completamente
                              if (formData.date < todayStr) return false;
                              return true;
                            }).map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        {formData.staffId && formData.date && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--spa-primary-dark)', display: 'block', marginTop: '4px' }}>
                            Solo horarios disponibles
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {editingId && (
                    <div className="col s12" style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ color: '#475569', fontWeight: 600 }}>Estado de la Cita</label>
                        {formData.status === 'Pendiente' && (
                          <button 
                            type="button" 
                            onClick={() => {
                              const resolvedPhone = formData.resolvedPhone || formData.clientPhone || '';
                              if (!resolvedPhone) {
                                window.M?.toast({ html: 'Sin teléfono registrado', classes: 'orange rounded' });
                                return;
                              }
                              const num = resolvedPhone.replace(/\D/g, '');
                              const cleanNum = num.startsWith('57') ? num : `57${num}`;
                              const mensaje = encodeURIComponent(
                                `🌿 *Confirmación de Cita – Andrea Cardona SPA*\n\n` +
                                `Hola *${formData.clientName}*,\n\n` +
                                `Te escribimos para confirmar tu cita programada:\n\n` +
                                `📋 *Tratamiento:* ${formData.serviceName}\n` +
                                `📅 *Fecha:* ${formData.date}\n` +
                                `⏰ *Hora:* ${formData.time}\n\n` +
                                `¿Podrías confirmarnos si asistirás? ¡Muchas gracias! 🌷`
                              );
                              
                              const waUrl = `https://wa.me/${cleanNum}?text=${mensaje}`;
                              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                              if (isMobile) {
                                window.location.assign(waUrl);
                              } else {
                                window.open(waUrl, '_blank');
                              }
                            }}
                            style={{ 
                              fontSize: '0.75rem', backgroundColor: '#25d366', color: 'white', 
                              border: 'none', padding: '4px 10px', borderRadius: '20px', 
                              cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' 
                            }}
                          >
                            📲 Pedir Confirmación WA
                          </button>
                        )}
                      </div>
                      <select className="browser-default" style={{
                        fontWeight: 700,
                        borderColor: formData.status === 'Cancelada' ? '#ef4444' : 'var(--spa-gold)',
                        color: formData.status === 'Cancelada' ? '#991b1b' : '#0f172a'
                      }}
                        value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                        <option value="Pendiente">⏳ Pendiente</option>
                        <option value="Confirmada">✅ Confirmada</option>
                        <option value="Completada">⭐ Completada</option>
                        <option value="Cancelada">❌ Cancelada</option>
                        <option value="Pendiente de Verificación">💳 Verificación Pago</option>
                      </select>
                    </div>
                  )}

                  {editingId && !formData.pagado && formData.status !== 'Cancelada' && (
                    <div className="col s12" style={{ marginBottom: '20px' }}>
                      <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Pendiente de Pago</p>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>{formData.resolvedEmail || 'Sin correo'}</p>
                        </div>
                        <button type="button" onClick={() => { setIsModalOpen(false); abrirPagoModal({...formData, clientEmail: formData.resolvedEmail, clientPhone: formData.resolvedPhone}); }} className="modern-button-small" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                          Ir a Pagar
                        </button>
                      </div>
                    </div>
                  )}

                  {formData.clientId !== 'BLOQUEO' && (
                    <div className="col s12" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" className="filled-in" checked={formData.notifyEmail} onChange={e => setFormData({...formData, notifyEmail: e.target.checked})} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Notificar Email</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" className="filled-in" checked={formData.notifyWhatsApp} onChange={e => setFormData({...formData, notifyWhatsApp: e.target.checked})} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Notificar WhatsApp</span>
                        </label>
                      </div>

                      {editingId && (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button 
                            type="button" 
                            onClick={() => handleManualEmail(formData)}
                            style={{ 
                              fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', 
                              border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', 
                              cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' 
                            }}
                          >
                            📧 Reenviar Email
                          </button>
                          <button 
                            type="button" 
                            onClick={() => {
                              const resolvedPhone = formData.resolvedPhone || formData.clientPhone || '';
                              if (!resolvedPhone) return;
                              const num = resolvedPhone.replace(/\D/g, '');
                              const cleanNum = num.startsWith('57') ? num : `57${num}`;
                              const mensaje = encodeURIComponent(
                                `🌿 *Recordatorio de Cita – Andrea Cardona SPA*\n\n` +
                                `Hola *${formData.clientName}*,\n\n` +
                                `Te recordamos tu cita:\n\n` +
                                `📋 *Tratamiento:* ${formData.serviceName}\n` +
                                `📅 *Fecha:* ${formData.date}\n` +
                                `⏰ *Hora:* ${formData.time}\n\n` +
                                `¡Te esperamos! 🌷`
                              );
                              const waUrl = `https://wa.me/${cleanNum}?text=${mensaje}`;
                              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                              if (isMobile) {
                                window.location.assign(waUrl);
                              } else {
                                window.open(waUrl, '_blank');
                              }
                            }}
                            style={{ 
                              fontSize: '0.75rem', backgroundColor: '#e8f5e9', color: '#2e7d32', 
                              border: '1px solid #c8e6c9', padding: '6px 12px', borderRadius: '8px', 
                              cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' 
                            }}
                          >
                            📲 Reenviar WhatsApp
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="luxury-modal-footer">
                {editingId && (
                   <button type="button" onClick={() => handleDelete(editingId)} style={{ color: '#ef4444', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', marginRight: 'auto' }}>Eliminar</button>
                )}
                <button type="button" className="modern-btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="modern-btn-small">
                   {editingId ? 'Actualizar' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Luxury Modal: Seleccionar Método de Pago */}
      {pagoModal && (
        <div className="luxury-modal-overlay">
          <div className="luxury-modal-container" style={{ maxWidth: '400px' }}>
            <div className="luxury-modal-header">
              <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Método de Pago</h5>
              <button onClick={() => { setPagoModal(null); setIsModalOpen(true); }} className="btn-flat" style={{ padding: 0 }}>
                <X size={24} color="#94a3b8" />
              </button>
            </div>
            
            <div className="luxury-modal-body">
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>Selecciona cómo el cliente realizará el pago para la cita: <strong>{pagoModal.serviceName}</strong></p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {METODOS_PAGO.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetodoPagoSeleccionado(m)}
                    style={{
                      padding: '15px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem',
                      border: '2px solid', textAlign: 'left',
                      borderColor: metodoPagoSeleccionado === m ? 'var(--spa-gold)' : '#e2e8f0',
                      backgroundColor: metodoPagoSeleccionado === m ? 'rgba(197, 160, 89, 0.05)' : 'white',
                      color: metodoPagoSeleccionado === m ? 'var(--spa-gold)' : '#475569',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                    <span style={{ fontSize: '1.4rem' }}>{m === 'efectivo' ? '💵' : m === 'transferencia' ? '🏦' : '💳'}</span>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="luxury-modal-footer">
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
