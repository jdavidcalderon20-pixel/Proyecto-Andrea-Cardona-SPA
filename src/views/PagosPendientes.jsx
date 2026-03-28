import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CheckCircle, XCircle, Eye, AlertTriangle, Image as ImageIcon, MessageCircle, Truck, Package, Clock, RotateCcw } from 'lucide-react';
import emailjs from '@emailjs/browser';
import logoBase64 from '../assets/logoBase64';

const NEQUI_NUMBER = '3155217625';

// ──────────────────────────────────────────────
//  Status configuration
// ──────────────────────────────────────────────
const STATUS_CONFIG = {
  'Esperando confirmación de stock': { label: 'Verificar Stock',         color: '#854d0e', bg: '#fef9c3', border: '#fde047', icon: '⏳' },
  'Pendiente de Verificación':       { label: 'Verificar Pago',          color: '#1e40af', bg: '#dbeafe', border: '#93c5fd', icon: '💳' },
  'Pagado / Por Despachar':          { label: 'Pagado · Por Despachar',  color: '#065f46', bg: '#d1fae5', border: '#6ee7b7', icon: '✅' },
  'Enviado':                         { label: 'En Camino',               color: '#1e40af', bg: '#e0f2fe', border: '#7dd3fc', icon: '🚚' },
  'Entregado / Finalizado':          { label: 'Entregado',               color: '#374151', bg: '#f3f4f6', border: '#d1d5db', icon: '📦' },
  'Pago Rechazado':                  { label: 'Rechazado',               color: '#991b1b', bg: '#fee2e2', border: '#fca5a5', icon: '✖' },
  'Pagado y Despachado':             { label: 'Pagado y Despachado',     color: '#5b21b6', bg: '#ede9fe', border: '#c4b5fd', icon: '📦' },
};

const Badge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#374151', bg: '#f3f4f6', border: '#d1d5db', icon: '•' };
  return (
    <span style={{
      backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap'
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ──────────────────────────────────────────────
//  Dispatch Modal
// ──────────────────────────────────────────────
const DispatchModal = ({ pago, onClose, onSave }) => {
  const [carrier, setCarrier] = useState('');
  const [guide, setGuide] = useState('');
  const [saving, setSaving] = useState(false);
  const CARRIERS = ['Interrapidísimo', 'Servientrega', 'Coordinadora', 'Deprisa', 'TCC', 'La Libertad', 'Envía', 'Otra'];

  const handleSave = async (e) => {
    e.preventDefault();
    if (!carrier || !guide.trim()) return;
    setSaving(true);
    await onSave(pago, carrier, guide.trim());
    setSaving(false);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
        <h5 style={{ margin: '0 0 8px 0', fontWeight: 800, color: '#0f172a' }}>📦 Registrar Despacho</h5>
        <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '0.9rem' }}>
          Pedido de <strong>{pago.clientName}</strong> · ${Number(pago.amount || 0).toLocaleString()}
        </p>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: '0.85rem', marginBottom: '6px' }}>Empresa de Mensajería *</label>
            <select required value={carrier} onChange={e => setCarrier(e.target.value)} className="browser-default"
              style={{ width: '100%', height: '44px', padding: '0 12px', borderRadius: '10px', border: '1px solid #e5e7eb', outline: 'none', fontSize: '0.95rem' }}>
              <option value="">Seleccionar...</option>
              {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: '0.85rem', marginBottom: '6px' }}>Número de Guía *</label>
            <input type="text" required placeholder="Ej: 123456789" value={guide} onChange={e => setGuide(e.target.value)}
              style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '10px', border: '1px solid #e5e7eb', outline: 'none', boxSizing: 'border-box', fontSize: '0.95rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', fontWeight: 600, cursor: 'pointer', color: '#64748b' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, backgroundColor: '#10b981', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 700, cursor: 'pointer', color: 'white', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : '✉️ Guardar y Notificar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
//  Main Component
// ──────────────────────────────────────────────
const PagosPendientes = () => {
  const [pagos, setPagos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalImage, setModalImage] = useState(null);
  const [procesandoPago, setProcesandoPago] = useState(null);
  const [dispatchModal, setDispatchModal] = useState(null);
  const [activeTab, setActiveTab] = useState('activos'); // 'activos' | 'historial'

  // ── Active statuses (main view) ──
  const ACTIVE_STATUSES = [
    'Esperando confirmación de stock',
    'Pendiente de Verificación',
    'Pagado / Por Despachar',
    'Enviado',
  ];
  // ── Closed statuses (history) ──
  const HISTORY_STATUSES = ['Entregado / Finalizado', 'Pago Rechazado', 'Pagado y Despachado', 'Pagado'];

  useEffect(() => {
    // ─── Live listeners for ACTIVE orders (citas + pedidos) ───
    const unsubList = [];

    const combinedActive = {};
    const combinedHistory = {};

    const refresh = () => {
      const activeArr = Object.values(combinedActive).sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      const histArr = Object.values(combinedHistory).sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      setPagos(activeArr);
      setHistorial(histArr);
      setLoading(false);
    };

    // Citas active
    const qCitasActive = query(collection(db, 'citas'), where('status', 'in', ['Pendiente de Verificación']));
    unsubList.push(onSnapshot(qCitasActive, snap => {
      snap.forEach(d => { combinedActive[d.id] = { ...d.data(), id: d.id, collectionMode: 'citas' }; });
      snap.docChanges().filter(c => c.type === 'removed').forEach(c => { delete combinedActive[c.doc.id]; });
      refresh();
    }));

    // Pedidos active
    ACTIVE_STATUSES.forEach(status => {
      const q = query(collection(db, 'pedidos'), where('status', '==', status));
      unsubList.push(onSnapshot(q, snap => {
        snap.forEach(d => { combinedActive[d.id] = { ...d.data(), id: d.id, collectionMode: 'pedidos' }; });
        snap.docChanges().filter(c => c.type === 'removed').forEach(c => { delete combinedActive[c.doc.id]; });
        refresh();
      }));
    });

    // Pedidos history
    HISTORY_STATUSES.forEach(status => {
      const q = query(collection(db, 'pedidos'), where('status', '==', status));
      unsubList.push(onSnapshot(q, snap => {
        snap.forEach(d => { combinedHistory[d.id] = { ...d.data(), id: d.id, collectionMode: 'pedidos' }; });
        snap.docChanges().filter(c => c.type === 'removed').forEach(c => { delete combinedHistory[c.doc.id]; });
        refresh();
      }));
    });

    // Citas history (finalized)
    const qCitasHistory = query(collection(db, 'citas'), where('status', '==', 'Completada'));
    unsubList.push(onSnapshot(qCitasHistory, snap => {
      snap.forEach(d => { combinedHistory[d.id] = { id: d.id, collectionMode: 'citas', ...d.data() }; });
      snap.docChanges().filter(c => c.type === 'removed').forEach(c => { delete combinedHistory[c.doc.id]; });
      refresh();
    }));

    return () => unsubList.forEach(u => u());
  }, []);

  // ── Email: Send shipping notification ──────
  const sendShippingEmail = async (pago, carrier, guide) => {
    try {
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_APPT; // single unified template
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      if (!serviceId || !publicKey || !pago.clientEmail) return;

      await emailjs.send(serviceId, templateId, {
        titulo_cabecera:   'Notificación de Envío 🚚',
        to_name:           pago.clientName || 'Cliente',
        to_email:          pago.clientEmail,
        mensaje_bienvenida: '¡Tu pedido va en camino!',
        label_1:           'Empresa',
        valor_1:           carrier,
        label_2:           'Nro. Guía',
        valor_2:           guide,
        label_3:           'Destino',
        valor_3:           pago.shippingCity || 'Colombia',
        mensaje_pie_pagina: 'Puedes rastrear tu paquete en la web oficial de la transportadora.',
        logo_url:          import.meta.env.VITE_LOGO_URL || logoBase64,
        operacion_id:      pago.id || '',
        subject:           'Tu pedido va en camino - Andrea Cardona SPA',
      }, publicKey);
    } catch (e) {
      console.error('Error enviando correo de despacho:', e);
      window.M?.toast({ html: 'Correo de despacho falló, pero el pedido fue actualizado.', classes: 'orange' });
    }
  };

  // ── Email: Confirmation on payment / cita ─
  const sendConfirmationEmail = async (pago) => {
    try {
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_APPT; // single unified template
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      if (!serviceId || !publicKey || !pago.clientEmail) return;

      let params = {};

      if (pago.collectionMode === 'citas') {
        params = {
          titulo_cabecera:    'Confirmación de Cita 🌿',
          to_name:            pago.clientName || 'Cliente',
          to_email:           pago.clientEmail,
          mensaje_bienvenida: 'Tu espacio ha sido reservado con éxito.',
          label_1:            'Servicio',
          valor_1:            pago.itemName || pago.serviceName || 'Tratamiento SPA',
          label_2:            'Fecha y Hora',
          valor_2:            `${pago.date || ''} · ${pago.time || ''}`,
          label_3:            'Sede',
          valor_3:            'Chinchiná',
          mensaje_pie_pagina: 'Por favor, llega 5 minutos antes de tu cita.',
          logo_url:           import.meta.env.VITE_LOGO_URL || logoBase64,
          operacion_id:       pago.id || '',
          subject:            'Confirmación de Cita - Andrea Cardona SPA',
        };
      } else {
        // Pedido / Producto
        params = {
          titulo_cabecera:    'Comprobante de Pago ✅',
          to_name:            pago.clientName || 'Cliente',
          to_email:           pago.clientEmail,
          mensaje_bienvenida: 'Hemos registrado correctamente tu pago.',
          label_1:            'Concepto',
          valor_1:            pago.itemName || 'Productos Web',
          label_2:            'Fecha',
          valor_2:            new Date().toLocaleDateString('es-CO'),
          label_3:            'Total',
          valor_3:            `$${Number(pago.amount || 0).toLocaleString()}`,
          mensaje_pie_pagina: 'Tu pedido está siendo preparado para el despacho.',
          logo_url:           import.meta.env.VITE_LOGO_URL || logoBase64,
          operacion_id:       pago.id || '',
          subject:            'Pago Confirmado - Andrea Cardona SPA',
        };
      }

      await emailjs.send(serviceId, templateId, params, publicKey);
    } catch (e) {
      console.error('Error enviando correo confirmación:', e);
      window.M?.toast({ html: 'Pago aprobado pero falló el correo.', classes: 'orange' });
    }
  };

  // ── Actions ───────────────────────────────
  const confirmarStockYSolicitarPago = async (pago) => {
    try {
      setProcesandoPago(pago.id);
      await updateDoc(doc(db, 'pedidos', pago.id), {
        status: 'Pendiente de Verificación',
        stockConfirmedAt: new Date().toISOString(),
      });

      const total = Number(pago.amount || 0).toLocaleString();
      const msgText = [
        'Hola ' + (pago.clientName || 'Cliente') + '! Soy Andrea.',
        'He verificado tu pedido por $' + total + '.',
        'El envio es Pago Contra Entrega (Aprox. $10k a ciudades principales / $16k nacional).',
        'Estas de acuerdo con el costo del envio para pasarte los datos de pago y confirmar tu despacho?'
      ].join(' ');

      const phone = (pago.clientPhone || '').replace(/\D/g, '');
      const cleanPhone = phone.startsWith('57') ? phone : '57' + phone;
      window.open('https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(msgText), '_blank');
      window.M?.toast({ html: 'Stock confirmado. WhatsApp abierto.', classes: 'green rounded' });
    } catch (err) {
      window.M?.toast({ html: 'Error confirmando stock', classes: 'red rounded' });
    } finally { setProcesandoPago(null); }
  };

  const aprobarPago = async (pago) => {
    if (!window.confirm(`¿Confirmas que el pago de $${pago.amount?.toLocaleString()} de ${pago.clientName} ingresó a Nequi?`)) return;
    try {
      setProcesandoPago(pago.id);
      const newStatus = pago.collectionMode === 'pedidos' ? 'Pagado / Por Despachar' : 'Pagado';

      const batch = writeBatch(db);

      // 1. Update the order / cita status
      batch.update(doc(db, pago.collectionMode, pago.id), {
        status: newStatus,
        verificationDate: new Date().toISOString(),
      });

      // 2. Decrement product stock (only for product orders)
      if (pago.collectionMode === 'pedidos') {
        const items = pago.cartItems && pago.cartItems.length > 0
          ? pago.cartItems
          : pago.itemRef && pago.itemRef !== 'cart'
            ? [{ id: pago.itemRef, qty: 1 }]
            : [];

        items.forEach(item => {
          if (item.id) {
            batch.update(doc(db, 'productos', item.id), {
              stock: increment(-(item.qty || 1))
            });
          }
        });
      }

      await batch.commit();
      await sendConfirmationEmail(pago);
      window.M?.toast({ html: '¡Pago aprobado y stock actualizado!', classes: 'green rounded' });
    } catch (err) {
      console.error('Error aprobando pago:', err);
      window.M?.toast({ html: 'Error aprobando pago', classes: 'red rounded' });
    } finally { setProcesandoPago(null); }
  };

  const rechazarPago = async (pago) => {
    if (!window.confirm(`¿Rechazar solicitud de ${pago.clientName}?`)) return;
    try {
      setProcesandoPago(pago.id);
      await updateDoc(doc(db, pago.collectionMode, pago.id), { status: 'Pago Rechazado', notes: 'Rechazado por la administradora.' });
      window.M?.toast({ html: 'Solicitud rechazada.', classes: 'green rounded' });
    } catch (err) {
      window.M?.toast({ html: 'Error al rechazar', classes: 'red rounded' });
    } finally { setProcesandoPago(null); }
  };

  const registrarDespacho = async (pago, carrier, guide) => {
    try {
      setProcesandoPago(pago.id);
      await updateDoc(doc(db, pago.collectionMode, pago.id), {
        status: 'Enviado',
        dispatchCarrier: carrier,
        dispatchGuide: guide,
        dispatchedAt: new Date().toISOString(),
      });
      await sendShippingEmail(pago, carrier, guide);
      window.M?.toast({ html: '¡Despacho registrado! Cliente notificado por correo.', classes: 'green rounded' });
    } catch (err) {
      window.M?.toast({ html: 'Error registrando despacho', classes: 'red rounded' });
    } finally { setProcesandoPago(null); }
  };

  const confirmarEntrega = async (pago) => {
    if (!window.confirm(`¿Confirmar que ${pago.clientName} recibió su pedido?`)) return;
    try {
      setProcesandoPago(pago.id);
      await updateDoc(doc(db, pago.collectionMode, pago.id), {
        status: 'Entregado / Finalizado',
        deliveredAt: new Date().toISOString(),
      });
      window.M?.toast({ html: '¡Pedido finalizado y movido al historial!', classes: 'green rounded' });
    } catch (err) {
      window.M?.toast({ html: 'Error confirmando entrega', classes: 'red rounded' });
    } finally { setProcesandoPago(null); }
  };

  // ── Row Actions ──────────────────────────
  const getActions = (pago) => {
    const status = pago.status;
    const busy = procesandoPago === pago.id;

    switch (status) {
      case 'Esperando confirmación de stock':
        return (
          <button onClick={() => confirmarStockYSolicitarPago(pago)} disabled={busy}
            style={{ backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <MessageCircle size={14} /> {busy ? '...' : 'Confirmar y Solicitar Pago'}
          </button>
        );

      case 'Pendiente de Verificación':
        return (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => aprobarPago(pago)} disabled={busy}
              style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
              <CheckCircle size={14} /> {busy ? '...' : 'Aprobar Pago'}
            </button>
            <button onClick={() => rechazarPago(pago)} disabled={busy}
              style={{ backgroundColor: 'white', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', padding: '0 10px', height: '36px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <XCircle size={14} />
            </button>
          </div>
        );

      case 'Pagado / Por Despachar':
      case 'Pagado y Despachado':
        return (
          <button onClick={() => setDispatchModal(pago)} disabled={busy}
            style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <Truck size={14} /> Registrar Despacho
          </button>
        );

      case 'Enviado':
        return (
          <button onClick={() => confirmarEntrega(pago)} disabled={busy}
            style={{ backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
            <Package size={14} /> {busy ? '...' : 'Confirmar Entrega'}
          </button>
        );

      // Citas
      case 'Confirmada - Pago Presencial':
        return (
          <button onClick={() => aprobarPago(pago)} disabled={busy}
            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' }}>
            <CheckCircle size={14} /> Aprobar
          </button>
        );

      default:
        return <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>;
    }
  };

  // ── Table Renderer ────────────────────────
  const renderTable = (items, emptyMsg) => {
    if (items.length === 0) {
      return (
        <div className="center-align" style={{ padding: '4rem 2rem', color: '#64748b' }}>
          <div style={{ backgroundColor: '#f1f5f9', display: 'inline-flex', padding: '20px', borderRadius: '50%', marginBottom: '15px' }}>
            <CheckCircle size={48} color="#94a3b8" />
          </div>
          <h5 style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#334155' }}>{emptyMsg}</h5>
        </div>
      );
    }
    return (
      <div style={{ overflowX: 'auto' }}>
        <table className="striped highlight" style={{ minWidth: '800px' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Estado</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Cliente</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Concepto</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Dirección Envío</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Total</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', textAlign: 'center', fontSize: '0.85rem' }}>Comprobante</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', textAlign: 'right', fontSize: '0.85rem' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {items.map(pago => (
              <tr key={pago.id}>
                <td style={{ padding: '14px 16px' }}><Badge status={pago.status} /></td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{pago.clientName}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{pago.clientPhone}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{pago.clientEmail}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '200px' }}>
                    <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{pago.itemName || pago.serviceName}</span>
                    {pago.cartItems && pago.cartItems.length > 1 && (
                      <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                        {pago.cartItems.map(i => `${i.qty}x ${i.name}`).join(' · ')}
                      </span>
                    )}
                    {pago.collectionMode === 'citas' && pago.date && (
                      <span style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '3px' }}>
                        📅 {pago.date} · {pago.time}
                      </span>
                    )}
                    {pago.dispatchCarrier && (
                      <span style={{ fontSize: '0.78rem', color: '#3b82f6', marginTop: '3px' }}>
                        🚚 {pago.dispatchCarrier} · Guía: {pago.dispatchGuide}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  {pago.shippingCity ? (
                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.82rem', color: '#475569', maxWidth: '180px' }}>
                      <span style={{ fontWeight: 600 }}>📍 {pago.shippingCity}</span>
                      <span>{pago.shippingBarrio}</span>
                      <span>{pago.shippingAddress}</span>
                      {pago.shippingRef && <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{pago.shippingRef}</span>}
                    </div>
                  ) : (
                    <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
                    ${Number(pago.amount || 0).toLocaleString()}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  {pago.receiptUrl ? (
                    <button onClick={() => setModalImage(pago.receiptUrl)} className="btn-flat"
                      style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem' }}>
                      <Eye size={14} /> Ver
                    </button>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}><ImageIcon size={14} /></span>
                  )}
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  {getActions(pago)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const tabStyle = (tab) => ({
    padding: '10px 24px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
    border: 'none', background: 'transparent', borderBottom: activeTab === tab ? '3px solid #10b981' : '3px solid transparent',
    color: activeTab === tab ? '#10b981' : '#64748b', transition: 'all 0.2s',
  });

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-title">
          <h3 style={{ fontWeight: 800, color: '#0f172a' }}>Gestión de Pedidos</h3>
          <p style={{ color: '#64748b' }}>Flujo completo: Stock → Pago → Despacho → Entrega → Historial.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex' }}>
        <button style={tabStyle('activos')} onClick={() => setActiveTab('activos')}>
          📋 Pedidos Activos {pagos.length > 0 && <span style={{ marginLeft: '6px', backgroundColor: '#10b981', color: 'white', borderRadius: '12px', padding: '1px 8px', fontSize: '0.75rem' }}>{pagos.length}</span>}
        </button>
        <button style={tabStyle('historial')} onClick={() => setActiveTab('historial')}>
          🗂️ Historial de Ventas {historial.length > 0 && <span style={{ marginLeft: '6px', backgroundColor: '#94a3b8', color: 'white', borderRadius: '12px', padding: '1px 8px', fontSize: '0.75rem' }}>{historial.length}</span>}
        </button>
      </div>

      <div className="card-panel" style={{ padding: '0', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div className="center-align" style={{ padding: '4rem' }}>
            <div className="preloader-wrapper small active"><div className="spinner-layer spinner-blue-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
          </div>
        ) : activeTab === 'activos'
          ? renderTable(pagos, 'Sin pedidos activos en este momento')
          : renderTable(historial, 'El historial de ventas finalizadas aparecerá aquí')
        }
      </div>

      {/* Image Lightbox */}
      {modalImage && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
          onClick={() => setModalImage(null)}>
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <img src={modalImage} alt="Comprobante" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
            <button onClick={() => setModalImage(null)}
              style={{ position: 'absolute', top: '-40px', right: 0, background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
              Cerrar <XCircle size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchModal && (
        <DispatchModal
          pago={dispatchModal}
          onClose={() => setDispatchModal(null)}
          onSave={registrarDespacho}
        />
      )}
    </div>
  );
};

export default PagosPendientes;
