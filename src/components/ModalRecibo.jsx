import React, { useState } from 'react';
import { X, Download, MessageCircle, Mail, CheckCircle, Send } from 'lucide-react';
import { generarReciboPDF, formatearCOP } from '../services/pdfService';
import emailjs from '@emailjs/browser';
import logoBase64 from '../assets/logoBase64.js';

/**
 * ModalRecibo – muestra resumen del pago, permite descargar PDF,
 * y enviar por WhatsApp o correo (sin link externo por ahora).
 */
const ModalRecibo = ({ datos, onClose }) => {
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);
  const [errorEmail, setErrorEmail] = useState('');

  // ── Descargar PDF ────────────────────────────────────────
  const handleDescargarPDF = () => {
    generarReciboPDF(datos);
  };

  // ── WhatsApp ───────────────────────────────────────────
  const handleWhatsApp = () => {
    const telefono = datos.clientePhone?.replace(/\D/g, '');
    if (!telefono) {
      alert('El cliente no tiene teléfono registrado.');
      return;
    }
    const mensaje =
      `🌿 *Cardona SPA – Recibo de Pago*\n\n` +
      `Hola *${datos.clienteNombre}*, aquí está tu recibo:\n\n` +
      `📋 *Tratamiento:* ${datos.tratamiento}\n` +
      `💆 *Sesión:* ${datos.numeroSesion} de ${datos.totalSesiones}\n` +
      `📅 *Fecha:* ${datos.fecha}\n` +
      `👩‍⚕️ *Profesional:* ${datos.profesional || '—'}\n` +
      `💳 *Método de pago:* ${datos.metodoPago}\n` +
      `💰 *Total pagado:* ${formatearCOP(datos.monto)}\n\n` +
      `✅ Pago confirmado. ¡Gracias por tu confianza! 🌷`;

    const num = telefono.startsWith('57') ? telefono : `57${telefono}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // ── Correo (EmailJS) ───────────────────────────────────
  const handleEmail = async () => {
    if (!datos.clienteEmail) {
      alert('El cliente no tiene correo electrónico registrado.');
      return;
    }

    setEnviandoEmail(true);
    setErrorEmail('');
    try {
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_APPT || 'YOUR_TEMPLATE_ID';
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

      await emailjs.send(serviceId, templateId, {
        titulo_cabecera:    'Comprobante de Pago ✅',
        to_name:            datos.clienteNombre,
        to_email:           datos.clienteEmail,
        mensaje_bienvenida: `Hemos registrado tu pago por el servicio de ${datos.tratamiento}.`,
        label_1:            'Servicio',
        valor_1:            datos.tratamiento,
        label_2:            'Método de Pago',
        valor_2:            datos.metodoPago,
        label_3:            'Total Pagado',
        valor_3:            formatearCOP(datos.monto),
        mensaje_pie_pagina: `Sesión ${datos.numeroSesion} de ${datos.totalSesiones}. ¡Gracias por tu confianza!`,
        logo_url:           import.meta.env.VITE_LOGO_URL || logoBase64,
        operacion_id:       '',
        subject:            'Comprobante de Pago - Andrea Cardona SPA',
      }, publicKey);

      setEmailEnviado(true);
    } catch (err) {
      console.error('Error enviando email:', err);
      const serverMsg = err.text || err.message || JSON.stringify(err);
      setErrorEmail('Error EmailJS: ' + serverMsg);
    } finally {
      setEnviandoEmail(false);
    }
  };

  const metodoPagoLabel = {
    efectivo: '💵 Efectivo',
    transferencia: '🏦 Transferencia',
    tarjeta: '💳 Tarjeta',
  }[datos.metodoPago] || datos.metodoPago;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.65)',
      zIndex: 1300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h5 style={{ margin: 0, color: 'white', fontWeight: 700 }}>Recibo Generado ✓</h5>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
              Elige cómo enviar el comprobante
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <X size={22} />
          </button>
        </div>

        {/* Resumen del recibo */}
        <div style={{ padding: '1.5rem' }}>
          <div style={{
            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem',
            position: 'relative', overflow: 'hidden'
          }}>
            {/* Sello PAGADO visual */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%) rotate(-20deg)',
              fontSize: '3rem', fontWeight: 900, color: 'rgba(5, 150, 105, 0.08)',
              pointerEvents: 'none', whiteSpace: 'nowrap', letterSpacing: '8px'
            }}>PAGADO</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Cliente</span>
              <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{datos.clienteNombre}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Tratamiento</span>
              <span style={{ fontWeight: 500, color: '#334155', fontSize: '0.85rem', textAlign: 'right', maxWidth: '55%' }}>{datos.tratamiento}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Sesión</span>
              <span style={{ fontWeight: 500, color: '#334155', fontSize: '0.85rem' }}>
                {datos.numeroSesion} de {datos.totalSesiones}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Método de Pago</span>
              <span style={{ fontWeight: 500, color: '#334155', fontSize: '0.85rem' }}>{metodoPagoLabel}</span>
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>TOTAL</span>
              <span style={{ fontWeight: 800, color: '#059669', fontSize: '1.2rem' }}>{formatearCOP(datos.monto)}</span>
            </div>
          </div>

          {/* Firma preview */}
          {datos.firma && (
            <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Firma del cliente</p>
              <img
                src={datos.firma}
                alt="Firma"
                style={{
                  maxHeight: '60px', border: '1px solid #e2e8f0',
                  borderRadius: '8px', backgroundColor: '#f8fafc', padding: '4px'
                }}
              />
            </div>
          )}

          {/* Feedback email */}
          {emailEnviado && (
            <div style={{
              backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '1rem',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <CheckCircle size={18} color="#059669" />
              <span style={{ color: '#065f46', fontSize: '0.88rem', fontWeight: 500 }}>
                Correo enviado a {datos.clienteEmail}
              </span>
            </div>
          )}
          {errorEmail && (
            <div style={{
              backgroundColor: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '1rem',
              fontSize: '0.82rem', color: '#b91c1c'
            }}>
              {errorEmail}
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleDescargarPDF}
              style={{
                backgroundColor: '#0f172a', color: 'white', border: 'none',
                borderRadius: '10px', padding: '0.75rem 1.25rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', fontWeight: 600, fontSize: '0.95rem', width: '100%'
              }}>
              <Download size={18} /> Descargar PDF
            </button>

            <button
              onClick={handleWhatsApp}
              style={{
                backgroundColor: '#25d366', color: 'white', border: 'none',
                borderRadius: '10px', padding: '0.75rem 1.25rem',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', fontWeight: 600, fontSize: '0.95rem', width: '100%'
              }}>
              <MessageCircle size={18} /> Enviar por WhatsApp
            </button>

            <button
              onClick={handleEmail}
              disabled={enviandoEmail || emailEnviado}
              style={{
                backgroundColor: emailEnviado ? '#f0fdf4' : '#3b82f6',
                color: emailEnviado ? '#059669' : 'white',
                border: emailEnviado ? '1px solid #bbf7d0' : 'none',
                borderRadius: '10px', padding: '0.75rem 1.25rem',
                cursor: (enviandoEmail || emailEnviado) ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', fontWeight: 600, fontSize: '0.95rem', width: '100%',
                transition: 'all 0.2s'
              }}>
              {enviandoEmail ? (
                <><div style={{ width: 18, height: 18, border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Enviando...</>
              ) : emailEnviado ? (
                <><CheckCircle size={18} /> Correo Enviado ✓</>
              ) : (
                <><Send size={18} /> Enviar por Correo</>
              )}
            </button>

            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent', color: '#64748b',
                border: '1px solid #e2e8f0', borderRadius: '10px',
                padding: '0.65rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem'
              }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalRecibo;
