import React, { useState } from 'react';
import { Camera, Save, Key, Shield } from 'lucide-react';
import { auth } from '../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

const Profile = ({ userEmail }) => {
  const [formData, setFormData] = useState({
    name: 'Administrador SPA',
    phone: '300-123-4567',
    email: userEmail || 'admin@spa.com',
    role: 'Gerente General',
  });

  const handleSave = (e) => {
    e.preventDefault();
    window.M?.toast({ html: 'Perfil actualizado exitosamente', classes: 'green rounded' });
  };

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, formData.email);
      window.M?.toast({ html: 'Correo de recuperación enviado. Revisa tu bandeja de entrada.', classes: 'green rounded' });
    } catch (error) {
       console.error("Error sending reset email:", error);
       window.M?.toast({ html: 'Error al enviar el correo de recuperación', classes: 'red rounded' });
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-title">
          <h3>Mi Perfil</h3>
          <p>Gestiona tu información personal y credenciales de acceso.</p>
        </div>
      </div>

      <div className="row">
        <div className="col s12 m4">
          <div className="card-panel center-align" style={{ padding: '2rem 1rem' }}>
            <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto 1.5rem auto' }}>
              <div className="avatar" style={{ width: '100px', height: '100px', fontSize: '2.5rem', backgroundColor: 'var(--spa-primary-dark)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', borderRadius: '50%' }}>
                {formData.name.charAt(0)}
              </div>
              <button className="btn-floating" style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: 'white', border: '1px solid #e2e8f0', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px' }}>
                <Camera size={16} />
              </button>
            </div>
            <h5 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, fontSize: '1.2rem' }}>{formData.name}</h5>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>{formData.role}</p>
            <span className="badge-soft badge-blue" style={{ marginTop: '1rem', display: 'inline-block' }}>Administrador</span>
          </div>
        </div>

        <div className="col s12 m8">
          <div className="card-panel">
            <h6 style={{ fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="var(--spa-primary)" /> Información Personal
            </h6>
            <form onSubmit={handleSave}>
              <div className="row">
                <div className="col s12">
                  <label>Nombre Completo</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }} />
                </div>
                <div className="col s6">
                  <label>Teléfono</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }} />
                </div>
                <div className="col s6">
                  <label>Correo Electrónico (No editable)</label>
                  <input type="email" value={formData.email} disabled className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem', backgroundColor: '#f1f5f9' }} />
                </div>
              </div>

              <h6 style={{ fontWeight: 600, margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="var(--spa-primary)" /> Seguridad
              </h6>
              <div className="row">
                <div className="col s12">
                  <button type="button" onClick={handlePasswordReset} className="modern-btn-outline" style={{width: 'auto'}}>Cambiar Contraseña (Vía Email)</button>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px' }}>Se enviará un correo de restablecimiento seguro a {formData.email}</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                <button type="submit" className="modern-btn-small"><Save size={18} /> Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
