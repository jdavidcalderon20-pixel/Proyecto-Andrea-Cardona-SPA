import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Search, MessageCircle, FileText, Send, Cake, Gift } from 'lucide-react';

const PLANTILLAS = [
  {
    id: 'limpieza_facial',
    nombre: 'Limpieza Facial (Promo)',
    texto: '¡Hola {{nombre}}! 🌸 Tu piel merece un respiro. Solo por esta semana, agenda tu Limpieza Facial Profunda con un 20% de descuento.'
  },
  {
    id: 'masaje_relax',
    nombre: 'Masaje Relax (Dúo)',
    texto: '¡Hola {{nombre}}! ✨ Trae a tu persona favorita y la segunda paga solo la mitad en Masaje Relajante. Válido hasta el sábado.'
  },
  {
    id: 'cumpleanos',
    nombre: 'Especial Cumpleaños',
    texto: '¡Feliz Cumpleaños {{nombre}}! 🥳 En Andrea Cardona SPA te regalamos un 30% de descuento en cualquier servicio hoy.'
  }
];

const Marketing = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mensajeBase, setMensajeBase] = useState('');
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState('');

  useEffect(() => {
    // Escuchar la colección de clientes en tiempo real
    const q = query(collection(db, 'clientes'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = [];
      snapshot.forEach((doc) => {
        clientsData.push({ id: doc.id, ...doc.data() });
      });
      setClientes(clientsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePlantillaChange = (e) => {
    const pId = e.target.value;
    setPlantillaSeleccionada(pId);
    
    if (pId) {
      const plantilla = PLANTILLAS.find(p => p.id === pId);
      if (plantilla) {
        setMensajeBase(plantilla.texto);
      }
    } else {
      setMensajeBase('');
    }
  };

  const enviarMensajeWhatsApp = (telefono, nombre, textoBase) => {
    if (!telefono) {
      window.M?.toast({ html: 'El cliente no tiene un teléfono registrado.', classes: 'red rounded' });
      return;
    }
    if (!textoBase.trim()) {
      window.M?.toast({ html: 'Por favor redacta o selecciona un mensaje primero.', classes: 'orange rounded' });
      return;
    }

    const numeroLimpio = telefono.toString().replace(/\D/g, '');
    
    // Si el numero es muy corto, probablemente este mal digitado
    if (numeroLimpio.length < 10) {
      window.M?.toast({ html: 'El número de teléfono parece inválido.', classes: 'orange rounded' });
      return;
    }

    // Prepend country code if missing (Assuming Colombia +57 for this SPA based on context, but let's just use the clean number if it already has country code)
    // Most users save local numbers like 3001234567, so we prefix 57. If it's already 57300..., we don't.
    let numeroFinal = numeroLimpio;
    if (numeroFinal.length === 10 && numeroFinal.startsWith('3')) {
      numeroFinal = `57${numeroFinal}`;
    }

    // Replace first name only
    const firstName = nombre.split(' ')[0];
    const mensajePersonalizado = textoBase.replace('{{nombre}}', firstName);
    
    const mensajeEncoded = encodeURIComponent(mensajePersonalizado);
    const url = `https://api.whatsapp.com/send?phone=${numeroFinal}&text=${mensajeEncoded}`;
    
    window.open(url, '_blank');
  };

  const clientesFiltrados = clientes.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  const enviarRegaloCumple = (telefono, nombre) => {
    if (!telefono) {
      window.M?.toast({ html: 'El cliente no tiene un teléfono registrado.', classes: 'red rounded' });
      return;
    }
    const primerNombre = nombre.split(' ')[0];
    const mensaje = `¡Feliz Cumpleaños ${primerNombre}! 🥳 En Andrea Cardona SPA queremos celebrarte: Hoy tienes un 30% de descuento en cualquier servicio + un detalle especial. ¡Te esperamos!`;
    const url = `https://api.whatsapp.com/send?phone=57${telefono.toString().replace(/\D/g, '')}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const todayRaw = new Date();
  const todayMMDD = `-${String(todayRaw.getMonth() + 1).padStart(2, '0')}-${String(todayRaw.getDate()).padStart(2, '0')}`;
  
  const cumpleanerosHoy = clientes.filter(c => c.birthdate && c.birthdate.endsWith(todayMMDD));

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <div className="page-title">
          <h3 style={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Marketing y SMS
          </h3>
          <p style={{ color: '#64748b' }}>Comunícate con tus clientes y envía campañas por WhatsApp.</p>
        </div>
      </div>

      {cumpleanerosHoy.length > 0 && (
        <div className="row" style={{ marginBottom: '20px' }}>
          <div className="col s12">
            <div className="card-panel" style={{ padding: '20px', borderRadius: '12px', border: '1px solid #fecdd3', backgroundColor: '#fff1f2', margin: 0 }}>
              <h6 style={{ fontWeight: 700, color: '#be123c', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cake size={20} /> Cumpleañeros de Hoy
              </h6>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {cumpleanerosHoy.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: '10px 15px', borderRadius: '8px', border: '1px solid #fda4af', width: '100%', maxWidth: '300px' }}>
                    <div>
                      <span style={{ display: 'block', fontWeight: 600, color: '#881337', fontSize: '0.95rem' }}>{c.name}</span>
                      <span style={{ fontSize: '0.8rem', color: '#be123c' }}>{c.phone}</span>
                    </div>
                    <button onClick={() => enviarRegaloCumple(c.phone, c.name)} className="btn-flat" style={{ padding: '0 12px', backgroundColor: '#ec4899', color: 'white', borderRadius: '6px', height: '34px', display: 'inline-flex', alignItems: 'center', gap: '6px' }} title="Enviar Regalo de Cumpleaños">
                      <Gift size={16} /> Regalo
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {/* Panel Izquierdo: Redactor de Mensajes */}
        <div className="col s12 m4">
          <div className="card-panel" style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', backgroundColor: '#f8fafc' }}>
            <h6 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={20} color="#3b82f6" /> 
              Redactar Campaña
            </h6>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>
                Plantillas Rápidas
              </label>
              <select 
                className="browser-default" 
                value={plantillaSeleccionada}
                onChange={handlePlantillaChange}
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
              >
                <option value="">-- Seleccionar o escribir uno nuevo --</option>
                {PLANTILLAS.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>
                Contenido del Mensaje
              </label>
              <textarea 
                value={mensajeBase}
                onChange={(e) => setMensajeBase(e.target.value)}
                placeholder="Escribe tu mensaje aquí. Puedes usar {{nombre}} para personalizarlo..."
                style={{ 
                  width: '100%', 
                  height: '180px', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem'
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px' }}>
                Tip: La etiqueta <code>{`{{nombre}}`}</code> se reemplazará automáticamente por el nombre del cliente.
              </p>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Lista de Clientes */}
        <div className="col s12 m8">
          <div className="card-panel" style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h6 style={{ fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#10b981" /> 
                Listado de Clientes
              </h6>
              
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '0 12px', width: '250px', border: '1px solid #e2e8f0' }}>
                <Search size={18} color="#64748b" />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o celular..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: 'none', backgroundColor: 'transparent', height: '38px', margin: 0, paddingLeft: '8px', outline: 'none', boxShadow: 'none', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
              <table className="striped highlight">
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, borderBottom: '2px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ color: '#64748b', fontWeight: 600 }}>Nombre</th>
                    <th style={{ color: '#64748b', fontWeight: 600 }}>Celular</th>
                    <th style={{ color: '#64748b', fontWeight: 600 }}>Última Cita</th>
                    <th style={{ color: '#64748b', fontWeight: 600, textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="preloader-wrapper small active" style={{ width: '24px', height: '24px' }}>
                          <div className="spinner-layer spinner-blue-only">
                            <div className="circle-clipper left"><div className="circle"></div></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : clientesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        No se encontraron clientes.
                      </td>
                    </tr>
                  ) : (
                    clientesFiltrados.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500, color: '#334155' }}>{c.name}</td>
                        <td style={{ color: '#64748b' }}>{c.phone || 'N/A'}</td>
                        <td style={{ color: '#64748b' }}>{c.lastVisit || 'Sin registro'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="modern-btn-small"
                            onClick={() => enviarMensajeWhatsApp(c.phone, c.name, mensajeBase)}
                            style={{ 
                              backgroundColor: '#25D366', // WhatsApp Green
                              padding: '0 12px',
                              height: '32px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                            title="Enviar WhatsApp"
                          >
                            <Send size={14} /> Enviar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketing;
