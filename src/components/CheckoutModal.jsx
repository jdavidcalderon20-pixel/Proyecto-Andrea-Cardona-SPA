import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadImage } from '../services/firebaseUtils';
import { CheckCircle2, X, Check, Image as ImageIcon, Trash2, Plus, Minus, MessageCircle, ShieldCheck, Info, UserCheck } from 'lucide-react';
import qrNequi from '../assets/qr_nequi.jpg';
import emailjs from '@emailjs/browser';
import logoBase64 from '../assets/logoBase64';

const CheckoutModal = ({ selectedItem, cartItems, setCart, onClose }) => {
  const isCart = cartItems && cartItems.length > 0;
  const isService = selectedItem && selectedItem.type === 'servicio';

  const parsePrice = (price) => {
    if (typeof price === 'number') return price;
    if (!price) return 0;
    // Remove symbols, dots and commas, but handle potential decimals if any
    const clean = String(price).replace(/[^0-9]/g, '');
    return parseFloat(clean) || 0;
  };

  const totalPrice = isCart 
    ? cartItems.reduce((acc, item) => acc + (parsePrice(item.price) * (parseInt(item.quantity) || 1)), 0)
    : (parsePrice(selectedItem?.item?.price) || 0);
  const itemName = isCart ? 'Productos Varios (Carrito)' : selectedItem?.item?.name;

  const [checkoutStep, setCheckoutStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('nequi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedTotal, setConfirmedTotal] = useState(0); // snapshot before cart is cleared
  const [capturedProductList, setCapturedProductList] = useState('');

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

  // Habeas Data & Recurring Client State
  const [acceptHabeasData, setAcceptHabeasData] = useState(false);
  const [showHabeasModal, setShowHabeasModal] = useState(false);
  const [isReturningClient, setIsReturningClient] = useState(false);
  
  const [availableTimes, setAvailableTimes] = useState([]);
  const SPA_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

  // Cargar datos previos de cliente recurrente desde almacenamiento local
  useEffect(() => {
    try {
      const cached = localStorage.getItem('andrea_spa_client');
      if (cached) {
        const data = JSON.parse(cached);
        if (data.name) setClientName(data.name);
        if (data.phone) setClientPhone(data.phone);
        if (data.email) setClientEmail(data.email);
        if (data.shippingCity) setShippingCity(data.shippingCity);
        if (data.shippingBarrio) setShippingBarrio(data.shippingBarrio);
        if (data.shippingAddress) setShippingAddress(data.shippingAddress);
        if (data.shippingRef) setShippingRef(data.shippingRef);
        if (data.aceptaHabeasData) setAcceptHabeasData(true);
        setIsReturningClient(true);
      }
    } catch (e) {
      console.warn("No se pudo leer datos locales del cliente:", e);
    }
  }, []);

  const handleClearSavedData = () => {
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setShippingCity('');
    setShippingBarrio('');
    setShippingAddress('');
    setShippingRef('');
    setAcceptHabeasData(false);
    setIsReturningClient(false);
    try {
      localStorage.removeItem('andrea_spa_client');
    } catch (e) {}
  };

  useEffect(() => {
    if (isService && reservationDate) {
      const fetchAvailable = async () => {
        try {
          const q = query(
            collection(db, 'citas'),
            where('date', '==', reservationDate)
          );
          const snap = await getDocs(q);
          
          // Obtenemos los servicios para saber duraciones (opcional pero recomendado para solapamientos)
          // Para simplificar y cumplir con el pedido: si hay una cita en el panel, bloqueamos el slot.
          const occupied = snap.docs
            .filter(doc => doc.data().status !== 'Cancelada')
            .map(doc => doc.data().time);
          
          const timeToMins = (t) => {
            if (!t) return 0;
            const [h, m] = t.split(':').map(Number);
            return h * 60 + (m || 0);
          };

          // Filtramos SPA_HOURS
          let filteredTimes = SPA_HOURS.filter(h => {
            const hMins = timeToMins(h);
            // Bloqueo exacto y bloqueo por proximidad (si hay cita en el panel a las 10:30, bloquea 10:00 y 11:00)
            return !occupied.some(occTime => {
              const occMins = timeToMins(occTime);
              return Math.abs(occMins - hMins) < 60; // Bloquea si hay menos de 60 mins de diferencia
            });
          });

          // Filtro adicional: Si la fecha es hoy, ocultar horas pasadas
          const today = new Date();
          const todayStr = today.toLocaleDateString('en-CA'); // format YYYY-MM-DD
          
          if (reservationDate === todayStr) {
            const currentMins = today.getHours() * 60 + today.getMinutes();
            filteredTimes = filteredTimes.filter(timeStr => {
              const mins = timeToMins(timeStr);
              // Solo mostrar si es al menos 30 minutos después de ahora
              return mins > (currentMins + 30);
            });
          }
          
          setAvailableTimes(filteredTimes);
          setReservationTime('');
        } catch (error) {
          console.error("Error fetching availability:", error);
        }
      };
      fetchAvailable();
    }
  }, [reservationDate, isService]);

  const checkAvailability = async () => {
    if (!isService) return true;
    
    // Validar si es hoy y la hora ya pasó
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    const timeToMins = (t) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    if (reservationDate === todayStr) {
      const currentMins = today.getHours() * 60 + today.getMinutes();
      if (timeToMins(reservationTime) <= (currentMins + 30)) {
        return false;
      }
    }

    const q = query(
      collection(db, 'citas'),
      where('date', '==', reservationDate)
    );
    const snap = await getDocs(q);
    
    const hMins = timeToMins(reservationTime);
    const hasConflict = snap.docs.some(doc => {
      const d = doc.data();
      if (d.status === 'Cancelada') return false;
      const occMins = timeToMins(d.time);
      return Math.abs(occMins - hMins) < 60;
    });

    return !hasConflict;
  };

  const handleNextStep = async (e) => {
    e.preventDefault();
    
    // Manual field trimming
    const trimmedName = clientName.trim();
    const trimmedEmail = clientEmail.trim();
    const trimmedPhone = clientPhone.trim().replace(/\D/g, '');
    
    // Product specific fields
    const trimmedCity = shippingCity.trim();
    const trimmedBarrio = shippingBarrio.trim();
    const trimmedAddress = shippingAddress.trim();
    const trimmedRef = shippingRef.trim();

    // Validation
    if (!trimmedName || !trimmedPhone || !trimmedEmail) {
      window.M?.toast({ html: 'Completa los datos de contacto', classes: 'red rounded' });
      return;
    }
    
    if (checkoutStep === 1 && !acceptHabeasData) {
      window.M?.toast({ html: 'Debes autorizar la Política de Tratamiento de Datos (Habeas Data) para continuar', classes: 'red rounded' });
      return;
    }
    
    if (!isService && (!trimmedCity || !trimmedBarrio || !trimmedAddress)) {
      window.M?.toast({ html: 'Completa los datos de envío', classes: 'red rounded' });
      return;
    }

    if (checkoutStep === 1) {
      if (isService) {
        if (!reservationDate) {
          window.M?.toast({ html: 'Selecciona una fecha', classes: 'red rounded' });
          return;
        }
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
      const cleanPhone = clientPhone.trim().replace(/\D/g, '');
      const cleanEmail = clientEmail.trim().toLowerCase();
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Buscar si ya existe por teléfono (identificador unívoco móvil para WhatsApp)
      let existingDoc = null;
      if (cleanPhone) {
        const qPhone = query(collection(db, 'clientes'), where('phone', '==', cleanPhone));
        const snapPhone = await getDocs(qPhone);
        if (!snapPhone.empty) {
          existingDoc = snapPhone.docs[0];
        }
      }

      // 2. Si no se encontró por teléfono, buscar por correo
      if (!existingDoc && cleanEmail) {
        const qEmail = query(collection(db, 'clientes'), where('email', '==', cleanEmail));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          existingDoc = snapEmail.docs[0];
        }
      }

      if (existingDoc) {
        // ACTUALIZACIÓN INTELIGENTE (Cero duplicidad en BD)
        const currentData = existingDoc.data();
        const currentVisits = Number(currentData.totalVisits || currentData.totalVisitas || 0);

        await updateDoc(doc(db, 'clientes', existingDoc.id), {
          name: clientName.trim(),
          phone: cleanPhone,
          email: cleanEmail,
          totalVisits: currentVisits + 1,
          totalVisitas: currentVisits + 1,
          lastVisit: reservationDate || todayStr,
          ultimaVisita: serverTimestamp(),
          aceptaHabeasData: true,
          fechaAceptacionHabeasData: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // CREACIÓN DE NUEVO CLIENTE (Primer registro)
        await addDoc(collection(db, 'clientes'), {
          name: clientName.trim(),
          phone: cleanPhone,
          email: cleanEmail,
          totalVisits: 1,
          totalVisitas: 1,
          lastVisit: reservationDate || todayStr,
          createdAt: serverTimestamp(),
          ultimaVisita: serverTimestamp(),
          aceptaHabeasData: true,
          fechaAceptacionHabeasData: serverTimestamp(),
          origen: 'Web'
        });
      }

      // Guardar en el dispositivo del cliente para agilizar futuras visitas
      try {
        localStorage.setItem('andrea_spa_client', JSON.stringify({
          name: clientName.trim(),
          phone: cleanPhone,
          email: cleanEmail,
          shippingCity: shippingCity.trim(),
          shippingBarrio: shippingBarrio.trim(),
          shippingAddress: shippingAddress.trim(),
          shippingRef: shippingRef.trim(),
          aceptaHabeasData: true
        }));
      } catch (cacheErr) {
        console.warn("No se pudo persistir cliente en localStorage", cacheErr);
      }
    } catch(err) {
      console.error("Error auto-registrando o actualizando cliente:", err);
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
      
      if (totalPrice <= 0) {
        window.M?.toast({ html: 'El total de la compra debe ser mayor a 0.', classes: 'red rounded' });
        setIsSubmitting(false);
        return;
      }

      const payload = {
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim().replace(/\D/g, ''),
        clientEmail: clientEmail.trim(),
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
        aceptaHabeasData: true,
        fechaAceptacionHabeasData: serverTimestamp(),
        // Shipping address (products only)
        ...(!isService && {
          shippingCity: shippingCity.trim(),
          shippingBarrio: shippingBarrio.trim(),
          shippingAddress: shippingAddress.trim(),
          shippingRef: shippingRef.trim(),
        }),
      };
      
      if (isCart) {
        payload.cartItems = cartItems.map(i => ({ 
          id: String(i.id), 
          name: i.name, 
          quantity: parseInt(i.quantity) || 1, 
          price: parseFloat(i.price) || 0 
        }));
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
          ? cartItems.map(i => `${parseInt(i.quantity) || 1}x ${i.name}`).join(', ')
          : `${selectedItem?.item?.name || itemName}`;
        const capturedTotal = isCart
          ? cartItems.reduce((acc, i) => acc + (parseFloat(i.price) * parseInt(i.quantity)), 0)
          : (parseFloat(selectedItem?.item?.price) || 0);

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
        setConfirmedTotal(totalPrice);
        setCapturedProductList(cartItems.map(item => `- ${item.quantity}x ${item.name}`).join('\n'));
        setCart([]);
      } else if (isService) {
        setConfirmedTotal(totalPrice);
      }
      setCheckoutStep(3);
    } catch (error) {
      console.error("🔴 Checkout Submission Error:", error);
      window.M?.toast({ html: `Hubo un error: ${error.message || 'Error desconocido'}`, classes: 'red rounded' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = '#e4d5b7';
  const darkOlive = '#4a5d23';

  return (
    <div className="luxury-modal-overlay">
      <div className="luxury-modal-container" style={{ maxWidth: '500px' }}>
        
        {/* Header con botón X fijo */}
        <div className="luxury-modal-header">
          <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
             {checkoutStep === 1 ? (isService ? 'Agenda tu Cita' : 'Completa tu Compra') : 
              checkoutStep === 2 ? 'Pago Exclusivo Nequi' : '¡Solicitud Recibida!'}
          </h5>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '5px' }}>
            <X size={24} />
          </button>
        </div>

        <div className="luxury-modal-body">
          {checkoutStep === 1 && (
            <form onSubmit={handleNextStep}>
              {isCart ? (
                <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '12px', marginBottom: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>
                      Resumen de Compra ({cartItems.reduce((acc, i) => acc + (parseInt(i.quantity) || 1), 0)} productos)
                    </p>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (window.confirm('¿Deseas vaciar todos los productos del carrito?')) {
                          setCart([]);
                          if (!selectedItem) onClose();
                        }
                      }}
                      style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 600 }}
                      title="Borrar totalmente el carrito"
                    >
                      <Trash2 size={13} /> Vaciar Carrito
                    </button>
                  </div>
                  {cartItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', fontSize: '0.95rem', gap: '10px', padding: '10px', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <button 
                          type="button"
                          onClick={() => {
                            const newCart = cartItems.filter((_, i) => i !== idx);
                            setCart(newCart);
                            if (newCart.length === 0 && !selectedItem) onClose();
                          }}
                          style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                        >
                          <Trash2 size={14} />
                        </button>
                        <div>
                          <span style={{ display: 'block', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{item.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button 
                              type="button"
                              onClick={() => {
                                const newCart = [...cartItems];
                                const currentQty = Number(newCart[idx].quantity) || 1;
                                if (currentQty > 1) {
                                  newCart[idx].quantity = currentQty - 1;
                                  setCart(newCart);
                                }
                              }}
                              style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                            >
                              <Minus size={12} />
                            </button>
                            <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{parseInt(item.quantity) || 1}</span>
                            <button 
                              type="button"
                              onClick={() => {
                                const newCart = [...cartItems];
                                newCart[idx].quantity = (Number(newCart[idx].quantity) || 1) + 1;
                                setCart(newCart);
                              }}
                              style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, color: '#0f172a' }}>${(parsePrice(item.price) * (parseInt(item.quantity) || 1)).toLocaleString()}</span>
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

              {isReturningClient && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCheck size={18} color="#16a34a" />
                    <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
                      ¡Hola de nuevo, {clientName.split(' ')[0] || 'cliente'}! Cargamos tus datos para mayor rapidez.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSavedData}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#15803d',
                      fontSize: '0.78rem',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: 0
                    }}
                  >
                    Cambiar datos
                  </button>
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="checkout-name" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '5px', display: 'block' }}>Nombre Completo</label>
                <input id="checkout-name" type="text" required value={clientName} onChange={e => setClientName(e.target.value)}
                  className="browser-default luxury-input" />
              </div>
              
              <div className="input-group-responsive">
                <div>
                  <label htmlFor="checkout-phone" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '5px', display: 'block' }}>Celular</label>
                  <input id="checkout-phone" type="tel" required value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                    className="browser-default luxury-input" />
                </div>
                <div>
                  <label htmlFor="checkout-email" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '5px', display: 'block' }}>
                    Correo <span style={{ color: '#eab308', marginLeft: '5px', fontWeight: '500' }}>(Revisa que esté correcto para recibir confirmación)</span>
                  </label>
                  <input id="checkout-email" type="email" required value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                    className="browser-default luxury-input" />
                </div>
              </div>

              {/* Address fields — only for product purchases */}
              {!isService && (
                <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '16px', border: '1px solid #bae6fd' }}>
                  <p style={{ margin: '0 0 15px 0', fontWeight: 800, color: '#0369a1', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📦</span> Datos de Envío (obligatorio)
                  </p>
                  <div className="input-group-responsive" style={{ marginBottom: '15px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>Ciudad *</label>
                      <input type="text" required value={shippingCity} onChange={e => setShippingCity(e.target.value)} placeholder="Ej: Medellín"
                        className="browser-default luxury-input" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>Barrio *</label>
                      <input type="text" required value={shippingBarrio} onChange={e => setShippingBarrio(e.target.value)} placeholder="Ej: El Poblado"
                        className="browser-default luxury-input" />
                    </div>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>Dirección completa *</label>
                    <input type="text" required value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} placeholder="Ej: Calle 10 # 43-55"
                      className="browser-default luxury-input" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>Referencias (Apto, piso, oficina, etc.) *</label>
                    <input type="text" required value={shippingRef} onChange={e => setShippingRef(e.target.value)} placeholder="Ej: Apto 302, frente al parque"
                      className="browser-default luxury-input" />
                  </div>
                </div>
              )}

              {isService && (
                <div className="input-group-responsive">
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '5px', display: 'block' }}>Fecha</label>
                    <input type="date" required min={new Date().toISOString().split('T')[0]} value={reservationDate} onChange={e => setReservationDate(e.target.value)}
                      className="browser-default luxury-input" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '5px', display: 'block' }}>Hora</label>
                    <select required value={reservationTime} onChange={e => setReservationTime(e.target.value)}
                      className="browser-default luxury-input">
                      <option value="">Selecciona...</option>
                      {availableTimes.length > 0 ? (
                        availableTimes.map((slot, idx) => (
                          <option key={idx} value={slot}>{slot}</option>
                        ))
                      ) : (
                        <option disabled>No hay horas disponibles</option>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {isService && (
                <div style={{ marginBottom: '25px' }}>
                   <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '12px', display: 'block' }}>Método de Pago</label>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                     <div onClick={() => setPaymentMethod('nequi')} style={{ display: 'flex', alignItems: 'center', padding: '15px', border: `2px solid ${paymentMethod === 'nequi' ? darkOlive : '#e5e7eb'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: paymentMethod === 'nequi' ? '#f8faf6' : 'white' }}>
                       <div style={{ width: '22px', height: '22px', minWidth: '22px', borderRadius: '50%', border: `2px solid ${paymentMethod === 'nequi' ? darkOlive : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', backgroundColor: 'white' }}>
                          {paymentMethod === 'nequi' && <div style={{ width: '10px', height: '10px', backgroundColor: darkOlive, borderRadius: '50%' }}></div>}
                       </div>
                       <div>
                          <span style={{ display: 'block', fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>Pagar ahora por Nequi</span>
                       </div>
                     </div>
                     <div onClick={() => setPaymentMethod('presencial')} style={{ display: 'flex', alignItems: 'center', padding: '15px', border: `2px solid ${paymentMethod === 'presencial' ? darkOlive : '#e5e7eb'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: paymentMethod === 'presencial' ? '#f8faf6' : 'white' }}>
                       <div style={{ width: '22px', height: '22px', minWidth: '22px', borderRadius: '50%', border: `2px solid ${paymentMethod === 'presencial' ? darkOlive : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', backgroundColor: 'white' }}>
                          {paymentMethod === 'presencial' && <div style={{ width: '10px', height: '10px', backgroundColor: darkOlive, borderRadius: '50%' }}></div>}
                       </div>
                       <div>
                          <span style={{ display: 'block', fontWeight: 600, color: '#111827', fontSize: '0.95rem' }}>Pagar en la Sede</span>
                       </div>
                     </div>
                   </div>
                </div>
              )}

              {/* Manejo de Datos y Consentimiento Habeas Data (Ley 1581 de 2012) */}
              <div style={{
                marginTop: '15px',
                marginBottom: '15px',
                padding: '12px 14px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: acceptHabeasData ? '1px solid #cbd5e1' : '1px solid #fed7aa',
                transition: 'border 0.2s'
              }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={acceptHabeasData}
                    onChange={(e) => setAcceptHabeasData(e.target.checked)}
                    style={{
                      marginTop: '3px',
                      width: '18px',
                      height: '18px',
                      accentColor: darkOlive,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: '1.45' }}>
                    <span>
                      {isService ? (
                        <>Autorizo el tratamiento de mis datos personales según la <strong>Ley 1581 de 2012</strong> (Habeas Data) para la gestión de mi reserva, confirmación de cita y envío de recordatorios y novedades por WhatsApp y correo electrónico.{' '}</>
                      ) : (
                        <>Autorizo el tratamiento de mis datos personales según la <strong>Ley 1581 de 2012</strong> (Habeas Data) para la facturación, despacho domiciliario de mis productos, confirmación de envío y novedades de la tienda.{' '}</>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowHabeasModal(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        color: darkOlive,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <Info size={13} /> Ver política de datos
                    </button>
                  </div>
                </label>
              </div>
            </form>
          )}

          {checkoutStep === 2 && (
            <form onSubmit={handleNextStep}>
              <div style={{ padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '16px', textAlign: 'center', marginBottom: '25px', backgroundColor: '#f8fafc' }}>
                <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 10px 0' }}>Transfiere exacto <strong>${totalPrice?.toLocaleString()}</strong> a:</p>
                <div style={{ fontSize: '1.5rem', letterSpacing: '2px', fontWeight: 800, color: '#0f172a', marginBottom: '15px' }}>321 568 5254</div>
                <div style={{ 
                  width: '100%',
                  maxWidth: '280px',
                  height: '240px', 
                  overflow: 'hidden', 
                  margin: '0 auto 15px auto', 
                  borderRadius: '16px', 
                  border: '1px solid #e2e8f0', 
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  <img 
                    src={qrNequi} 
                    alt="QR Nequi" 
                    style={{ 
                      width: '100%', 
                      transform: 'scale(1.8) translateY(15%)', 
                      transformOrigin: 'center center',
                      display: 'block'
                    }} 
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '10px 0 0 0' }}>💡 Puedes escanear el código directamente o guardar la imagen.</p>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100px', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', backgroundColor: receiptImage ? '#f0fdf4' : '#fff' }}>
                  {receiptImage ? (
                    <><CheckCircle2 color="#16a34a" size={24} style={{ marginBottom: '5px' }} /> <span style={{ color: '#16a34a', fontSize: '0.9rem', fontWeight: 600 }}>¡Foto adjunta!</span></>
                  ) : (
                    <><ImageIcon color="#94a3b8" size={24} style={{ marginBottom: '5px' }} /> <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Toca aquí para subir captura</span></>
                  )}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setReceiptImage(e.target.files[0])} />
                </label>
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
              <p style={{ color: '#475569', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 25px 0' }}>
                {isService && paymentMethod === 'presencial'
                  ? '¡Cita agendada exitosamente!'
                  : '✅ Andrea verificará tu solicitud en breve.'}
              </p>
              
              <button 
                onClick={() => {
                  let message = "";
                  if (isService) {
                    message = `✨ *Nueva Cita Agendada - Andrea Cardona SPA* ✨\n\nHola Andrea, acabo de agendar una cita desde la web:\n\n💆‍♀️ *Servicio:* ${selectedItem?.item?.name}\n📅 *Fecha:* ${reservationDate}\n⏰ *Hora:* ${reservationTime}\n👤 *Cliente:* ${clientName}\n\n*Favor confirmar mi cita y enviarme cualquier instrucción adicional.* 🙏`;
                  } else {
                    const products = capturedProductList || cartItems.map(item => `- ${item.quantity}x ${item.name}`).join('\n');
                    const total = confirmedTotal || totalPrice;
                    message = `✨ *Nuevo Pedido - Andrea Cardona SPA* ✨\n\nHola Andrea, acabo de realizar un pedido desde la web:\n\n------------------------------------------\n${products}\n------------------------------------------\n💰 *Total a pagar: $${total.toLocaleString()}*\n👤 *Cliente:* ${clientName}\n\n*Favor confirmar mi pedido y enviarme los medios de pago.* 🙏`;
                  }
                  const url = `https://wa.me/573155217625?text=${encodeURIComponent(message)}`;
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  if (isMobile) {
                    window.location.assign(url);
                  } else {
                    window.open(url, '_blank');
                  }
                }}
                style={{ 
                  backgroundColor: '#25D366', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '12px', 
                  padding: '14px 24px', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  boxShadow: '0 4px 15px rgba(37, 211, 102, 0.2)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
               >
                 <MessageCircle size={20} /> Notificar por WhatsApp
               </button>
            </div>
          )}
        </div>

        <div className="luxury-modal-footer">
           <button onClick={checkoutStep === 3 ? onClose : () => (checkoutStep > 1 ? setCheckoutStep(checkoutStep - 1) : onClose())} className="btn-secondary">
             {checkoutStep === 3 ? 'Cerrar' : 'Atrás'}
           </button>
           {checkoutStep < 3 && (
             <button onClick={handleNextStep} className="btn-primary" disabled={isSubmitting}>
               {isSubmitting ? 'Procesando...' : (checkoutStep === 1 ? 'Continuar' : 'Confirmar Pago')}
             </button>
           )}
        </div>

        {/* Modal Informativo Detallado de Política de Tratamiento de Datos (Ley 1581 de 2012) */}
        {showHabeasModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              {/* Header de la política */}
              <div style={{
                padding: '18px 24px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: darkOlive
                  }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h6 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                      Tratamiento de Datos Personales
                    </h6>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Habeas Data · Ley 1581 de 2012</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHabeasModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Contenido legal comprensible */}
              <div style={{
                padding: '20px 24px',
                overflowY: 'auto',
                fontSize: '0.85rem',
                color: '#475569',
                lineHeight: '1.6'
              }}>
                <p style={{ marginTop: 0 }}>
                  En cumplimiento de la <strong>Ley Estatutaria 1581 de 2012</strong> y el Decreto 1377 de 2013 de Colombia, <strong>Andrea Cardona SPA</strong> (Chinchiná, Caldas) le informa que como titular de los datos personales suministrados voluntariamente mediante esta plataforma web, estos serán tratados bajo estrictos principios de confidencialidad, seguridad y transparencia.
                </p>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '12px 0' }}>
                  <h6 style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.86rem', margin: '0 0 6px 0' }}>
                    1. Finalidades Autorizadas del Tratamiento:
                  </h6>
                  <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '0.82rem' }}>
                    <li style={{ marginBottom: '4px' }}>Gestión, agendamiento, confirmación y recordatorio oportuno de sus citas o pedidos de productos.</li>
                    <li style={{ marginBottom: '4px' }}>Vinculación y actualización unificada de su historial estético y ficha técnica sin duplicidad en la base de datos.</li>
                    <li style={{ marginBottom: '4px' }}>Envío de avisos de estado, recordatorios de puntualidad y notas de cuidado por WhatsApp y correo electrónico.</li>
                    <li>Comunicaciones de fidelización, promociones de temporada, beneficios de cumpleaños y novedades del spa.</li>
                  </ul>
                </div>

                <div style={{ backgroundColor: '#fffbeb', padding: '12px 14px', borderRadius: '12px', border: '1px solid #fef3c7', margin: '12px 0' }}>
                  <h6 style={{ color: '#92400e', fontWeight: 700, fontSize: '0.86rem', margin: '0 0 4px 0' }}>
                    2. Compromiso de Cero Cesión a Terceros:
                  </h6>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#78350f' }}>
                    Sus datos de contacto jamás serán vendidos, transferidos ni compartidos con empresas externas o bases de datos comerciales de terceros.
                  </p>
                </div>

                <div style={{ backgroundColor: '#f0fdf4', padding: '12px 14px', borderRadius: '12px', border: '1px solid #bbf7d0', margin: '12px 0' }}>
                  <h6 style={{ color: '#166534', fontWeight: 700, fontSize: '0.86rem', margin: '0 0 4px 0' }}>
                    3. Derechos del Titular (Habeas Data):
                  </h6>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#14532d' }}>
                    Usted podrá en cualquier momento conocer, actualizar, rectificar o solicitar la supresión de sus datos personales notificándonos al WhatsApp <strong>+57 315 521 7625</strong> o al correo <strong>andrea.cardona.mar@outlook.com</strong>.
                  </p>
                </div>
              </div>

              {/* Footer del modal informativo */}
              <div style={{
                padding: '14px 24px',
                borderTop: '1px solid #f1f5f9',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
              }}>
                <button
                  type="button"
                  onClick={() => setShowHabeasModal(false)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAcceptHabeasData(true);
                    setShowHabeasModal(false);
                    window.M?.toast({ html: 'Autorización registrada correctamente', classes: 'green rounded' });
                  }}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.84rem' }}
                >
                  Autorizo y Acepto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
