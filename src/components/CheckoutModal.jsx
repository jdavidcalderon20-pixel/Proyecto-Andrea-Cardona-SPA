import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadImage } from '../services/firebaseUtils';
import { CheckCircle2, X, Check, Image as ImageIcon } from 'lucide-react';
import qrNequi from '../assets/qr_nequi.jpg';
import emailjs from '@emailjs/browser';
import logoBase64 from '../assets/logoBase64';

const CheckoutModal = ({ selectedItem, cartItems, setCart, onClose }) => {
  const isCart = cartItems && cartItems.length > 0;
  const isService = selectedItem && selectedItem.type === 'servicio';
  const totalPrice = isCart 
    ? cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0)
    : selectedItem?.item?.price;
  const itemName = isCart ? 'Productos Varios (Carrito)' : selectedItem?.item?.name;

  const [checkoutStep, setCheckoutStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('nequi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedTotal, setConfirmedTotal] = useState(0); // snapshot before cart is cleared

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);

  // Shipping Address (only for products)
  const [shippingCity, setShippingCity] = useState('');
  const [shippingBarrio, setShippingBarrio] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingRef, setShippingRef] = useState('');
  
  const [availableTimes, setAvailableTimes] = useState([]);
  const SPA_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

  useEffect(() => {
    if (isService && reservationDate) {
      const fetchAvailable = async () => {
        const q = query(
          collection(db, 'citas'),
          where('date', '==', reservationDate)
        );
        const snap = await getDocs(q);
        // Filtramos para ignorar citas canceladas (esas no ocupan lugar)
        const occupied = snap.docs
          .filter(doc => doc.data().status !== 'Cancelada')
          .map(doc => doc.data().time);
        
        setAvailableTimes(SPA_HOURS.filter(h => !occupied.includes(h)));
        setReservationTime('');
      };
      fetchAvailable();
    }
  }, [reservationDate, isService]);

  const checkAvailability = async () => {
    if (!isService) return true;
    const q = query(
      collection(db, 'citas'),
      where('date', '==', reservationDate),
      where('time', '==', reservationTime)
    );
    const snap = await getDocs(q);
    // Es libre si no hay documentos O si todos los documentos están "Cancelada"
    const hasActiveConflict = snap.docs.some(doc => doc.data().status !== 'Cancelada');
    return !hasActiveConflict;
  };

  const handleNextStep = async (e) => {
    e.preventDefault();
    if (checkoutStep === 1) {
      if (isService) {
        if (!reservationTime) {
          window.M?.toast({ html: 'Selecciona una hora disponible', classes: 'red rounded' });
          return;
        }
        const isFree = await checkAvailability();
        if (!isFree) {
          window.M?.toast({ html: 'El horario acaba de ser ocupado, recarga e intenta de nuevo.', classes: 'red rounded' });
          return;
        }
        // Service: go to payment step
        if (paymentMethod === 'nequi') {
          setCheckoutStep(2);
        } else {
          submitOrder(true);
        }
      } else {
        // Product: skip payment - go directly to confirmation (stock check first)
        submitOrder();
      }
    } else if (checkoutStep === 2) {
      submitOrder(false);
    }
  };

  const registerClientIfNew = async () => {
    try {
      // Intentar buscar por correo, o en su defecto celular
      const qEmail = query(collection(db, 'clientes'), where('email', '==', clientEmail.trim()));
      const snapEmail = await getDocs(qEmail);
      if (snapEmail.empty) {
        // Podría buscar por teléfono también
        const qPhone = query(collection(db, 'clientes'), where('phone', '==', clientPhone.replace(/\D/g, '')));
        const snapPhone = await getDocs(qPhone);
        
        if (snapPhone.empty) {
           await addDoc(collection(db, 'clientes'), {
             name: clientName,
             email: clientEmail.trim(),
             phone: clientPhone.replace(/\D/g, ''),
             createdAt: serverTimestamp()
           });
        }
      }
    } catch(err) {
      console.error("Error auto-registrando cliente:", err);
    }
  };

  const submitOrder = async (isPresencial = false) => {
    // Services require comprobante image on step 2
    if (isService && !isPresencial && !receiptImage) {
      window.M?.toast({ html: 'Sube el comprobante de pago', classes: 'red rounded' });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Validación de último segundo para evitar duplicados por concurrencia
      if (isService) {
        const isFree = await checkAvailability();
        if (!isFree) {
          window.M?.toast({ html: '🚫 Lo sentimos, alguien acaba de reservar este horario mientras realizabas el proceso.', classes: 'red rounded' });
          setIsSubmitting(false);
          setCheckoutStep(1); // Regresar al primer paso para que elija otro
          return;
        }
      }

      let receiptUrl = null;
      
      // Only upload receipt for service payments (not for product orders)
      if (isService && !isPresencial) {
        window.M?.toast({ html: 'Procesando...', classes: 'blue rounded' });
        if (receiptImage) receiptUrl = await uploadImage(receiptImage, 'comprobantes');
      }

      const collectionName = isService ? 'citas' : 'pedidos';
      const productStatus = 'Esperando confirmación de stock';
      
      const payload = {
        clientName,
        clientPhone,
        clientEmail,
        amount: totalPrice,
        itemRef: isCart ? 'cart' : selectedItem?.item?.id,
        itemName: itemName,
        type: isCart ? 'productos' : selectedItem?.type,
        receiptUrl,
        status: isService
          ? (isPresencial ? 'Confirmada - Pago Presencial' : 'Pendiente de Verificación')
          : productStatus,
        paymentMethod: isPresencial ? 'Presencial' : 'Nequi',
        createdAt: serverTimestamp(),
        // Shipping address (products only)
        ...(!isService && {
          shippingCity,
          shippingBarrio,
          shippingAddress,
          shippingRef,
        }),
      };
      
      if (isCart) {
        payload.cartItems = cartItems.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price }));
      }

      if (isService) {
        payload.date = reservationDate;
        payload.time = reservationTime;
        payload.serviceId = selectedItem?.item?.id;
        payload.serviceName = selectedItem?.item?.name;

        // Auto-asignar al primer empleado activo para que aparezca en el calendario
        try {
          const staffQ = query(collection(db, 'empleados'));
          const staffSnap = await getDocs(staffQ);
          const activeStaff = staffSnap.docs.filter(d => d.data().status !== 'Inactivo');
          if (activeStaff.length > 0) {
            payload.staffId = activeStaff[0].id;
            payload.staffName = activeStaff[0].data().name;
          }
        } catch(e) { console.error("Error asignando staff automático", e) }
      }

      await registerClientIfNew();
      await addDoc(collection(db, collectionName), payload);

      if (isService) {
        // Notificación interna a Andrea para Cita
        try {
          await addDoc(collection(db, 'notificaciones'), {
            title: '🔔 ¡Nueva Cita Agendada!',
            message: `${clientName} para ${itemName} el ${reservationDate} a las ${reservationTime}`,
            createdAt: serverTimestamp(),
            read: false
          });
        } catch(e) {}

        // 1. Confirmación por correo al cliente
        try {
          const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
          const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_APPT;
          const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
          if (serviceId && templateId && publicKey && clientEmail) {
            await emailjs.send(serviceId, templateId, {
               titulo_cabecera:    'Confirmación de Cita 🌿',
               to_name:            clientName,
               to_email:           clientEmail,
               mensaje_bienvenida: 'Tu espacio ha sido reservado con éxito.',
               label_1:            'Servicio',
               valor_1:            itemName,
               label_2:            'Fecha y Hora',
               valor_2:            `${reservationDate} · ${reservationTime}`,
               label_3:            'Sede',
               valor_3:            'Chinchiná',
               mensaje_pie_pagina: 'Por favor, llega 5 minutos antes de tu cita.',
               logo_url:           import.meta.env.VITE_LOGO_URL || logoBase64,
               operacion_id:       '',
               subject:            'Confirmación de Cita - Andrea Cardona SPA',
            }, publicKey);
          }
        } catch(err) {
           console.error('Error enviando correo al cliente:', err);
        }

        // 2. Notificación interna a Andrea (Independiente)
        try {
          const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
          const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_APPT;
          const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
          if (serviceId && templateId && publicKey) {
            await emailjs.send(serviceId, templateId, {
               titulo_cabecera:    '🚨 NUEVA CITA AGENDADA',
               to_name:            'Andrea',
               to_email:           'andrea.cardona.mar@outlook.com',
               mensaje_bienvenida: `Un cliente acaba de reservar desde la página web.\n\n👤 Cliente: ${clientName}\n📱 Celular: ${clientPhone}`,
               label_1:            'Servicio',
               valor_1:            itemName,
               label_2:            'Fecha y Hora',
               valor_2:            `${reservationDate} · ${reservationTime}`,
               label_3:            'Sede',
               valor_3:            'Chinchiná',
               mensaje_pie_pagina: 'Este es un aviso interno automático del sistema.',
               logo_url:           import.meta.env.VITE_LOGO_URL || logoBase64,
               operacion_id:       '',
               subject:            `[NUEVA CITA] ${clientName} - ${reservationDate}`,
            }, publicKey);
            console.log('Notificación interna a Andrea enviada con éxito');
          }
        } catch(err) {
           console.error('Error enviando notificación interna a Andrea:', err);
        }
      } else {
        // ── Producto: notificación interna + correo inmediato al cliente ──
        const productList = isCart
          ? cartItems.map(i => `${i.qty}x ${i.name}`).join(', ')
          : `${selectedItem?.item?.name || itemName}`;
        const capturedTotal = isCart
          ? cartItems.reduce((acc, i) => acc + (i.price * i.qty), 0)
          : (selectedItem?.item?.price || 0);

        // Internal notification for Andrea
        try {
          await addDoc(collection(db, 'notificaciones'), {
            title: '🛒 ¡Nuevo Pedido por Confirmar!',
            message: `${clientName} (${clientPhone}) quiere: ${productList} — Total: $${capturedTotal.toLocaleString()} — Dir: ${shippingCity}, ${shippingAddress}`,
            createdAt: serverTimestamp(),
            read: false,
            clientPhone,
            clientName,
            productList,
            totalPrice: capturedTotal,
          });
        } catch(e) {}

        // 1. Confirmación por correo al cliente
        try {
          const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
          const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_APPT;
          const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
          if (serviceId && templateId && publicKey && clientEmail) {
            await emailjs.send(serviceId, templateId, {
              titulo_cabecera:    'Confirmación de Pedido 🛍️',
              to_name:            clientName,
              to_email:           clientEmail,
              mensaje_bienvenida: 'Hemos recibido tu pedido correctamente. Andrea verificará el stock y te contactará por WhatsApp para el pago.',
              label_1:            'Productos',
              valor_1:            productList,
              label_2:            'Total a Pagar',
              valor_2:            `$${capturedTotal.toLocaleString()}`,
              label_3:            'Envío',
              valor_3:            'Pago Contra Entrega',
              mensaje_pie_pagina: 'Recuerda que el valor del envío lo pagas al recibir el paquete.',
              logo_url:           import.meta.env.VITE_LOGO_URL || logoBase64,
              operacion_id:       '',
              subject:            'Confirmación de Pedido - Andrea Cardona SPA',
            }, publicKey);
          }
        } catch(err) {
          console.error('Error enviando correo de pedido al cliente:', err);
        }

        // 2. Notificación interna a Andrea (Independiente)
        try {
          const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
          const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_APPT;
          const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
          if (serviceId && templateId && publicKey) {
            await emailjs.send(serviceId, templateId, {
               titulo_cabecera:    '🚨 NUEVO PEDIDO',
               to_name:            'Andrea',
               to_email:           'andrea.cardona.mar@outlook.com',
               mensaje_bienvenida: `Un cliente acaba de realizar un pedido web.\n\n👤 Cliente: ${clientName}\n📱 Celular: ${clientPhone}\n📍 Dirección: ${shippingCity}, ${shippingAddress}\n🔎 Ref: ${shippingRef}`,
               label_1:            'Productos',
               valor_1:            productList,
               label_2:            'Total',
               valor_2:            `$${capturedTotal.toLocaleString()}`,
               label_3:            'Sede',
               valor_3:            'Chinchiná',
               mensaje_pie_pagina: 'Revisa el panel de control para confirmar este pago.',
               logo_url:           import.meta.env.VITE_LOGO_URL || logoBase64,
               operacion_id:       '',
               subject:            `[NUEVO PEDIDO] ${clientName} - $${capturedTotal.toLocaleString()}`,
            }, publicKey);
            console.log('Notificación interna a Andrea por pedido enviada con éxito');
          }
        } catch(err) {
          console.error('Error enviando notificación interna de pedido a Andrea:', err);
        }
      }

      // WhatsApp a Andrea (Desactivada la apertura automática por bloqueadores de popups)
      // Se agregó un botón explícito en el Paso 3.
      
      if (isCart && setCart) {
        setConfirmedTotal(totalPrice); // capture before cart is cleared
        setCart([]);
      }
      setCheckoutStep(3);
    } catch (error) {
      console.error(error);
      window.M?.toast({ html: 'Hubo un error', classes: 'red rounded' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = '#e4d5b7';
  const darkOlive = '#4a5d23';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '500px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
        
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', zIndex: 10 }}>
          <X size={24} />
        </button>

        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
             {checkoutStep === 1 ? (isService ? 'Agenda tu Cita' : 'Completa tu Compra') : 
              checkoutStep === 2 ? 'Pago Exclusivo Nequi' : '¡Solicitud Recibida!'}
          </h5>
        </div>

        <div style={{ padding: '30px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {checkoutStep === 1 && (
            <form onSubmit={handleNextStep}>
              {isCart ? (
                <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '10px', display: 'block' }}>Tu Carrito</span>
                  {cartItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: '4px' }}>
                           <button type="button" onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, qty: Math.max(1, i.qty - 1)} : i))} style={{ background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer', fontWeight: 700 }}>-</button>
                           <span style={{ fontSize: '0.85rem', width: '15px', textAlign: 'center', fontWeight: 600 }}>{item.qty}</span>
                           <button type="button" onClick={() => setCart(prev => prev.map(i => i.id === item.id && i.qty < Number(i.stock || 99) ? {...i, qty: i.qty + 1} : i))} style={{ background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer', fontWeight: 700 }}>+</button>
                        </div>
                        <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>{item.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.95rem' }}>${(item.price * item.qty).toLocaleString()}</span>
                        <button type="button" onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>✖</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#111827' }}>Total</span>
                    <span style={{ fontWeight: 800, color: darkOlive, fontSize: '1.2rem' }}>${totalPrice?.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '12px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{selectedItem?.type}</span>
                    <h6 style={{ margin: '5px 0 0 0', fontWeight: 700, color: '#111827' }}>{itemName}</h6>
                  </div>
                  <span style={{ fontWeight: 800, color: darkOlive, fontSize: '1.2rem' }}>${totalPrice?.toLocaleString()}</span>
                </div>
              )}

              {!isService && (
                <div style={{ padding: '12px 15px', backgroundColor: '#fff7ed', borderRadius: '10px', border: '1px solid #fed7aa', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.2rem' }}>🚚</span>
                  <span style={{ fontSize: '0.85rem', color: '#9a3412', fontWeight: 500, lineHeight: '1.4' }}>
                    <strong>Envío: Pago Contra Entrega.</strong> El valor aproximado es de <strong>$10.000</strong> a ciudades principales y <strong>$16.000</strong> a nivel nacional (sujeto a cambios por la transportadora).
                  </span>
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '5px', display: 'block' }}>Nombre Completo</label>
                <input type="text" required value={clientName} onChange={e => setClientName(e.target.value)}
                  style={{ width: '100%', height: '45px', padding: '0 15px', borderRadius: '12px', border: '1px solid #e5e7eb', outline: 'none' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '5px', display: 'block' }}>Celular</label>
                  <input type="tel" required value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                    style={{ width: '100%', height: '45px', padding: '0 15px', borderRadius: '12px', border: '1px solid #e5e7eb', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '5px', display: 'block' }}>
                    Correo <span style={{ color: '#eab308', marginLeft: '5px', fontWeight: '500' }}>(Revisa que esté correcto para recibir confirmación)</span>
                  </label>
                  <input type="email" required value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                    style={{ width: '100%', height: '45px', padding: '0 15px', borderRadius: '12px', border: '1px solid #e5e7eb', outline: 'none' }} />
                </div>
              </div>



              {/* Address fields — only for product purchases */}
              {!isService && (
                <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 700, color: '#0369a1', fontSize: '0.85rem' }}>📦 Datos de Envío (obligatorio)</p>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Ciudad *</label>
                      <input type="text" required value={shippingCity} onChange={e => setShippingCity(e.target.value)} placeholder="Ej: Medellín"
                        style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e5e7eb', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Barrio *</label>
                      <input type="text" required value={shippingBarrio} onChange={e => setShippingBarrio(e.target.value)} placeholder="Ej: El Poblado"
                        style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e5e7eb', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Dirección completa *</label>
                    <input type="text" required value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} placeholder="Ej: Calle 10 # 43-55"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e5e7eb', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Referencias (Apto, piso, oficina, etc.) *</label>
                    <input type="text" required value={shippingRef} onChange={e => setShippingRef(e.target.value)} placeholder="Ej: Apto 302, frente al parque"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e5e7eb', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              )}

              {isService && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '5px', display: 'block' }}>Fecha</label>
                    <input type="date" required min={new Date().toISOString().split('T')[0]} value={reservationDate} onChange={e => setReservationDate(e.target.value)}
                      style={{ width: '100%', height: '45px', padding: '0 15px', borderRadius: '12px', border: '1px solid #e5e7eb', outline: 'none' }} />
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '5px', display: 'block' }}>Hora Disponible</label>
                    <select required className="browser-default" value={reservationTime} onChange={e => setReservationTime(e.target.value)}
                      style={{ width: '100%', height: '45px', padding: '0 15px', borderRadius: '12px', border: '1px solid #e5e7eb', outline: 'none', backgroundColor: 'white', '&:disabled': { backgroundColor: '#f3f4f6' } }} disabled={!reservationDate}>
                      <option value="" disabled>Selecciona la hora</option>
                      {availableTimes.length === 0 && reservationDate && <option value="" disabled>No hay horas disponibles</option>}
                      {availableTimes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {isService && (
                <div style={{ marginTop: '20px', marginBottom: '25px' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827', marginBottom: '12px', display: 'block' }}>Elige como prefieres pagar</label>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                     <div onClick={() => setPaymentMethod('nequi')} style={{ display: 'flex', alignItems: 'center', padding: '15px', border: `2px solid ${paymentMethod === 'nequi' ? darkOlive : '#e5e7eb'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: paymentMethod === 'nequi' ? '#f8faf6' : 'white' }}>
                       <div style={{ width: '22px', height: '22px', minWidth: '22px', borderRadius: '50%', border: `2px solid ${paymentMethod === 'nequi' ? darkOlive : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', backgroundColor: 'white' }}>
                          {paymentMethod === 'nequi' && <div style={{ width: '10px', height: '10px', backgroundColor: darkOlive, borderRadius: '50%' }}></div>}
                       </div>
                       <div>
                          <span style={{ display: 'block', fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>Pagar ahora por Nequi</span>
                          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Asegura tu cupo de inmediato</span>
                       </div>
                     </div>
                     <div onClick={() => setPaymentMethod('presencial')} style={{ display: 'flex', alignItems: 'center', padding: '15px', border: `2px solid ${paymentMethod === 'presencial' ? darkOlive : '#e5e7eb'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: paymentMethod === 'presencial' ? '#f8faf6' : 'white' }}>
                       <div style={{ width: '22px', height: '22px', minWidth: '22px', borderRadius: '50%', border: `2px solid ${paymentMethod === 'presencial' ? darkOlive : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', backgroundColor: 'white' }}>
                          {paymentMethod === 'presencial' && <div style={{ width: '10px', height: '10px', backgroundColor: darkOlive, borderRadius: '50%' }}></div>}
                       </div>
                       <div>
                          <span style={{ display: 'block', fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>Pagar en la Sede</span>
                          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Programa tu cita y paga allá</span>
                       </div>
                     </div>
                   </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="button" onClick={onClose} style={{ flex: 1, backgroundColor: 'transparent', color: '#6b7280', padding: '16px', borderRadius: '50px', border: '1px solid #e5e7eb', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ flex: 2, backgroundColor: darkOlive, color: 'white', padding: '16px', borderRadius: '50px', border: 'none', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {isService && paymentMethod === 'presencial' ? 'Confirmar Reserva' : 'Continuar al Pago'}
                </button>
              </div>
            </form>
          )}

          {checkoutStep === 2 && (
            <form onSubmit={handleNextStep}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h6 style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 5px 0' }}>Transferencia Oficial</h6>
              </div>
              <div style={{ padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '16px', textAlign: 'center', marginBottom: '25px', backgroundColor: '#f8fafc' }}>
                <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 10px 0' }}>Transfiere exacto <strong>${totalPrice?.toLocaleString()}</strong> a:</p>
                <div style={{ fontSize: '1.5rem', letterSpacing: '2px', fontWeight: 800, color: '#0f172a', marginBottom: '15px' }}>321 568 5254</div>
                <img src={qrNequi} alt="QR Nequi" style={{ width: '150px', height: '150px', objectFit: 'contain', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'block', margin: '0 auto' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '10px', display: 'block' }}>Comprobante de transacción</label>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100px', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', backgroundColor: receiptImage ? '#f0fdf4' : '#fff' }}>
                  {receiptImage ? (
                    <><CheckCircle2 color="#16a34a" size={24} style={{ marginBottom: '5px' }} /> <span style={{ color: '#16a34a', fontSize: '0.9rem', fontWeight: 600 }}>¡Foto adjunta!</span></>
                  ) : (
                    <><ImageIcon color="#94a3b8" size={24} style={{ marginBottom: '5px' }} /> <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Toca aquí para subir captura</span></>
                  )}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setReceiptImage(e.target.files[0])} />
                </label>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setCheckoutStep(1)} style={{ flex: 1, backgroundColor: 'transparent', color: '#6b7280', padding: '16px', borderRadius: '50px', border: '1px solid #e5e7eb', fontWeight: 600, cursor: 'pointer' }}>
                  Atrás
                </button>
                <button type="submit" disabled={isSubmitting || !receiptImage} style={{ flex: 2, backgroundColor: darkOlive, color: 'white', padding: '16px', borderRadius: '50px', border: 'none', fontWeight: 600, cursor: (isSubmitting || !receiptImage) ? 'not-allowed' : 'pointer', opacity: (isSubmitting || !receiptImage) ? 0.7 : 1 }}>
                  {isSubmitting ? 'Cargando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          )}

          {checkoutStep === 3 && (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7', color: '#16a34a', borderRadius: '50%', width: '70px', height: '70px', marginBottom: '20px' }}>
                <Check size={36} />
              </div>
              <h4 style={{ margin: '0 0 10px 0', color: '#0f172a', fontWeight: 800 }}>
                {isService ? '¡Solicitud Recibida!' : '¡Pedido Recibido!'}
              </h4>
              <p style={{ color: '#475569', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                {isService && paymentMethod === 'presencial'
                  ? '¡Cita agendada exitosamente! Revisa tu correo electrónico para ver la confirmación. ¡Te esperamos!'
                  : isService
                  ? 'El equipo está verificando el pago y recibirás un correo apenas sea aprobado.'
                  : '✅ Andrea revisará el stock de tu pedido y te escribirá por WhatsApp con los datos de pago en unos minutos. ¡No necesitas hacer nada más por ahora!'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                <a 
                  href={isService
                    ? `https://wa.me/573155217625?text=${encodeURIComponent('Hola Andrea! Acabe de registrar una cita para ' + itemName + ' el ' + reservationDate + ' a las ' + reservationTime + '. Mi nombre es ' + clientName + ' y mi celular es ' + clientPhone + '.')}`
                    : `https://wa.me/573155217625?text=${encodeURIComponent('Hola Andrea! Acabo de realizar un pedido en tu pagina web. Mi nombre es ' + clientName + ' y el total de mis productos es $' + (confirmedTotal || totalPrice || 0).toLocaleString() + '. Quedo atento a que me confirmes la disponibilidad y el costo del envio para realizar el pago. Gracias!')}`
                  }
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ backgroundColor: '#25D366', color: 'white', padding: '14px 25px', borderRadius: '50px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(37,211,102,0.3)', width: '100%', justifyContent: 'center', boxSizing: 'border-box' }}
                >
                   Avisar por WhatsApp
                </a>
                <button onClick={onClose} style={{ backgroundColor: 'transparent', color: darkOlive, padding: '12px 25px', borderRadius: '50px', border: `2px solid ${darkOlive}`, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                  Volver al inicio
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
