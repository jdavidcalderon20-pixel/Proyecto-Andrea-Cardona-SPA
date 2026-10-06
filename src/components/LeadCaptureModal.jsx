import React from 'react';
import { X, Loader2, Send } from 'lucide-react';

const LeadCaptureModal = ({ isOpen, onClose, onSubmit, leadData, setLeadData, isSubmitting, courseName }) => {
  if (!isOpen) return null;

  const olive = '#C5A059';
  const slate = '#1A1A1A';
  const lightSlate = '#64748b';

  return (
    <div 
      onClick={onClose}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        backdropFilter: 'blur(5px)',
        zIndex: 10001, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '1rem' 
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          backgroundColor: 'white', 
          width: '100%', 
          maxWidth: '500px', 
          maxHeight: '90vh',
          borderRadius: '24px', 
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative'
        }}
      >
        {/* Header Decorativo */}
        <div style={{ 
          height: '10px', 
          background: `linear-gradient(90deg, ${olive}, #E5C07B)` 
        }} />
        
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '25px', 
            right: '25px', 
            background: '#F3F4F6', 
            border: 'none', 
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
        >
          <X size={24} color={slate} />
        </button>

        <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ 
              backgroundColor: '#FEF3C7', 
              color: olive, 
              padding: '6px 16px', 
              borderRadius: '50px', 
              fontSize: '0.75rem', 
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Inscripción Academia
            </span>
            <h3 style={{ 
              fontFamily: '"Playfair Display", serif', 
              fontSize: '1.5rem', 
              color: slate, 
              marginTop: '10px',
              marginBottom: '5px'
            }}>
              {courseName}
            </h3>
            <p style={{ color: lightSlate, fontSize: '0.9rem', lineHeight: 1.6 }}>
              Déjanos tus datos para formalizar tu interés y Andrea se pondrá en contacto contigo vía WhatsApp.
            </p>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: slate, marginBottom: '6px' }}>Nombre Completo</label>
              <input 
                required
                type="text" 
                placeholder="Ej. Maria Garcia"
                value={leadData.name}
                onChange={(e) => setLeadData({...leadData, name: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '10px 14px', 
                  borderRadius: '10px', 
                  border: '1px solid #E5E7EB',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = olive}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: slate, marginBottom: '6px' }}>Teléfono WhatsApp</label>
              <input 
                required
                type="tel" 
                placeholder="Ej. +57 300 000 0000"
                value={leadData.phone}
                onChange={(e) => setLeadData({...leadData, phone: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '10px 14px', 
                  borderRadius: '10px', 
                  border: '1px solid #E5E7EB',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = olive}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: slate, marginBottom: '6px' }}>Correo Electrónico</label>
              <input 
                required
                type="email" 
                placeholder="ejemplo@correo.com"
                value={leadData.email}
                onChange={(e) => setLeadData({...leadData, email: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '10px 14px', 
                  borderRadius: '10px', 
                  border: '1px solid #E5E7EB',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = olive}
                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <button 
                type="button"
                onClick={onClose}
                style={{ 
                  flex: 1, 
                  backgroundColor: '#F3F4F6', 
                  color: slate, 
                  border: 'none', 
                  borderRadius: '10px', 
                  padding: '12px', 
                  fontSize: '0.9rem',
                  fontWeight: 600, 
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                Cancelar
              </button>
              <button 
                disabled={isSubmitting}
                type="submit" 
                style={{ 
                  flex: 2, 
                  backgroundColor: olive, 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '10px', 
                  padding: '12px', 
                  fontSize: '0.9rem',
                  fontWeight: 600, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'transform 0.2s, opacity 0.2s',
                  opacity: isSubmitting ? 0.7 : 1
                }}
                className="btn-luxury"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Inscribirme
                  </>
                )}
              </button>
            </div>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: lightSlate, marginTop: '15px' }}>
            Al enviar, aceptas ser contactado para recibir información educativa.
          </p>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { from {transform: rotate(0deg);} to {transform: rotate(360deg);} }
        .animate-spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
};

export default LeadCaptureModal;
