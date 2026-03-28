import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PenLine, RotateCcw, CheckCircle2, X } from 'lucide-react';

/**
 * FirmaDigital – Modal de firma digital reutilizable.
 * Props:
 *  - onConfirm(base64): callback al confirmar la firma
 *  - onCancel(): callback al cerrar sin confirmar
 *  - clienteNombre: nombre del cliente (informativo)
 *  - sesionInfo: texto descriptivo de lo que se está firmando
 */
const FirmaDigital = ({ onConfirm, onCancel, clienteNombre = '', sesionInfo = '' }) => {
  const sigCanvas = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const handleClear = () => {
    sigCanvas.current.clear();
    setIsEmpty(true);
  };

  const handleConfirm = async () => {
    try {
      if (sigCanvas.current.isEmpty()) {
        alert('Por favor, firme en el recuadro antes de confirmar.');
        return;
      }
      setConfirming(true);
      const base64 = sigCanvas.current.getCanvas().toDataURL('image/png');
      await onConfirm(base64);
    } catch (err) {
      console.error('Error en confirmar firma:', err);
      alert('Error al confirmar la firma: ' + (err.message || 'Error desconocido'));
      setConfirming(false);
    }
  };

  const handleEnd = () => {
    setIsEmpty(sigCanvas.current.isEmpty());
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 1200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '540px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          padding: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '10px',
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <PenLine size={20} color="white" />
            </div>
            <div>
              <h5 style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>Firma Digital</h5>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>Confirmación de pago y servicio</p>
            </div>
          </div>
          <button onClick={onCancel}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px' }}>
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* Info */}
          <div style={{
            backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '1.25rem'
          }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#065f46', lineHeight: 1.5 }}>
              <strong>{clienteNombre}</strong> confirma haber recibido y pagado el servicio:<br />
              <span style={{ color: '#059669' }}>{sesionInfo}</span>
            </p>
          </div>

          {/* Canvas */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{
              display: 'block', fontSize: '0.8rem', color: '#64748b',
              fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              Firme en el recuadro:
            </label>
            <div style={{
              border: '2px dashed #cbd5e1', borderRadius: '12px',
              backgroundColor: '#f8fafc', overflow: 'hidden', position: 'relative'
            }}>
              <SignatureCanvas
                ref={sigCanvas}
                penColor="#0f172a"
                canvasProps={{
                  width: 490,
                  height: 180,
                  style: { width: '100%', height: '180px', display: 'block' }
                }}
                onEnd={handleEnd}
              />
              {isEmpty && (
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 500,
                  pointerEvents: 'none', textAlign: 'center'
                }}>
                  <PenLine size={28} style={{ marginBottom: '6px', display: 'block', margin: '0 auto 6px' }} />
                  Dibuje su firma aquí
                </div>
              )}
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 1.25rem 0', textAlign: 'center' }}>
            Al firmar, el cliente acepta y confirma el servicio prestado y el pago realizado.
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleClear}
              style={{
                background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '0.55rem 1rem', cursor: 'pointer', color: '#64748b',
                display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, fontSize: '0.9rem'
              }}>
              <RotateCcw size={16} /> Limpiar
            </button>
            <button
              onClick={onCancel}
              style={{
                background: 'none', border: '1px solid #cbd5e1', borderRadius: '8px',
                padding: '0.55rem 1.2rem', cursor: 'pointer', color: '#475569',
                fontWeight: 500, fontSize: '0.9rem'
              }}>
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={isEmpty || confirming}
              style={{
                backgroundColor: (isEmpty || confirming) ? '#d1fae5' : '#059669',
                color: (isEmpty || confirming) ? '#6ee7b7' : 'white',
                border: 'none', borderRadius: '8px',
                padding: '0.55rem 1.4rem', cursor: (isEmpty || confirming) ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s ease'
              }}>
              {confirming ? (
                <><div style={{ width: 18, height: 18, border: '2px solid #6ee7b7', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Guardando...</>
              ) : (
                <><CheckCircle2 size={18} /> Confirmar Firma</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirmaDigital;
