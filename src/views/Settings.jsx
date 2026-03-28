import React, { useState, useEffect } from 'react';
import { Camera, Save, Lock, Clock, Settings as SettingsIcon, Store, Mail, Phone, MapPin, Instagram, Facebook, Users, UserPlus, Trash2, Shield } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { db, auth, firebaseConfig } from '../config/firebase';
import { uploadImage, getAllDocuments } from '../services/firebaseUtils';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('perfil'); // 'perfil' | 'horarios' | 'seguridad'
  const [loading, setLoading] = useState(true);

  // --- Profile State ---
  const [profileData, setProfileData] = useState({
    spaName: '', email: '', phone: '', address: '', facebook: '', instagram: '', imageUrl: '',
    heroTagline: 'Experiencia Orgánica',
    heroTitle: 'Tu refugio de bienestar y belleza',
    heroSubtitle: 'Reconecta con tu esencia a través de tratamientos diseñados para armonizar cuerpo y mente en un entorno de paz absoluta.',
    heroImageUrl: '',
    philosophyTitle: 'Filosofía Botánica',
    philosophyText: 'Nuestros productos son formulados con extractos puros y procesos de bajo impacto ambiental para garantizar la salud de tu piel.'
  });
  const [imageFile, setImageFile] = useState(null);
  const [heroFile, setHeroFile] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // --- Schedule State ---
  const initialSchedule = {
    lunes: { open: '08:00', close: '20:00', isClosed: false },
    martes: { open: '08:00', close: '20:00', isClosed: false },
    miercoles: { open: '08:00', close: '20:00', isClosed: false },
    jueves: { open: '08:00', close: '20:00', isClosed: false },
    viernes: { open: '08:00', close: '20:00', isClosed: false },
    sabado: { open: '08:00', close: '14:00', isClosed: false },
    domingo: { open: '08:00', close: '20:00', isClosed: true },
  };
  const [schedule, setSchedule] = useState(initialSchedule);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // --- Security State ---
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  // --- Users State ---
  const [usersList, setUsersList] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null); // Para saber si estamos editando
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'empleado', accessModules: ['appointments', 'clients', 'fichas'] });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  const AVAILABLE_MODULES = [
    { id: 'overview', label: 'Panel Principal' },
    { id: 'appointments', label: 'Citas' },
    { id: 'clients', label: 'Clientes' },
    { id: 'fichas', label: 'Fichas Técnicas' },
    { id: 'services', label: 'Servicios' },
    { id: 'products', label: 'Inventario' },
    { id: 'staff', label: 'Profesionales' },
    { id: 'sesiones', label: 'Sesiones y Pagos' },
    { id: 'billing', label: 'Facturación' },
    { id: 'expenses', label: 'Gestión de Gastos' },
    { id: 'reports', label: 'Reportes' },
    { id: 'marketing', label: 'Marketing y SMS' },
    { id: 'settings', label: 'Ajustes' }
  ];

  const loadUsers = async () => {
    try {
      const data = await getAllDocuments('usuarios');
      setUsersList(data);
    } catch(e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const generalDoc = await getDoc(doc(db, 'configuracion', 'general'));
      if (generalDoc.exists()) setProfileData(generalDoc.data());

      const horariosDoc = await getDoc(doc(db, 'configuracion', 'horarios'));
      if (horariosDoc.exists()) setSchedule(horariosDoc.data());

      await loadUsers();
    } catch (error) {
      console.error("Error al cargar configuraciones", error);
      window.M?.toast({ html: 'Error al cargar ajustes', classes: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      let finalImageUrl = profileData.imageUrl;
      let finalHeroUrl = profileData.heroImageUrl;

      if (imageFile) {
        window.M?.toast({ html: 'Subiendo logotipo...', classes: 'blue rounded' });
        finalImageUrl = await uploadImage(imageFile, 'config');
      }

      if (heroFile) {
        window.M?.toast({ html: 'Subiendo imagen de portada...', classes: 'blue rounded' });
        finalHeroUrl = await uploadImage(heroFile, 'config');
      }

      const dataToSave = {
        ...profileData,
        imageUrl: finalImageUrl,
        heroImageUrl: finalHeroUrl,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'configuracion', 'general'), dataToSave, { merge: true });
      window.M?.toast({ html: 'Perfil y diseño actualizados', classes: 'green rounded' });
      
      setProfileData(dataToSave);
      setImageFile(null);
      setHeroFile(null);
    } catch (error) {
      window.M?.toast({ html: 'Error al actualizar perfil', classes: 'red rounded' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSavingSchedule(true);
      await setDoc(doc(db, 'configuracion', 'horarios'), {
        ...schedule,
        updatedAt: serverTimestamp()
      }, { merge: true });
      window.M?.toast({ html: 'Horarios guardados', classes: 'green rounded' });
    } catch (error) {
      window.M?.toast({ html: 'Error al guardar horarios', classes: 'red rounded' });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleDayChange = (day, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      window.M?.toast({ html: 'Las contraseñas nuevas no coinciden', classes: 'red rounded' });
      return;
    }
    
    try {
      setIsSavingSecurity(true);
      const user = auth.currentUser;
      if (!user) throw new Error("No hay usuario activo");

      // 1. Reautenticar para poder cambiar el password
      const credential = EmailAuthProvider.credential(user.email, passwords.current);
      await reauthenticateWithCredential(user, credential);

      // 2. Cambiar Password
      await updatePassword(user, passwords.new);

      window.M?.toast({ html: 'Contraseña actualizada correctamente', classes: 'green rounded' });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
         window.M?.toast({ html: 'La contraseña actual es incorrecta', classes: 'red rounded' });
      } else {
         window.M?.toast({ html: 'Error al cambiar contraseña', classes: 'red rounded' });
      }
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleCreateOrUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUserId && (!newUser.name || !newUser.email || !newUser.password)) {
      window.M?.toast({ html: 'Todos los campos son obligatorios', classes: 'red rounded' });
      return;
    }
    if (editingUserId && (!newUser.name || !newUser.role)) {
      window.M?.toast({ html: 'El nombre y rol son obligatorios', classes: 'red rounded' });
      return;
    }
    
    try {
      setIsCreatingUser(true);
      
      if (editingUserId) {
        window.M?.toast({ html: 'Actualizando usuario...', classes: 'blue rounded' });
        await setDoc(doc(db, 'usuarios', editingUserId), {
          name: newUser.name,
          role: newUser.role,
          accessModules: newUser.role === 'admin' ? [] : newUser.accessModules || [],
          updatedAt: new Date().toISOString()
        }, { merge: true });
        window.M?.toast({ html: 'Usuario actualizado exitosamente', classes: 'green rounded' });
      } else {
        window.M?.toast({ html: 'Creando cuenta de usuario...', classes: 'blue rounded' });
        
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);
        
        const { user: createdUser } = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
        
        await setDoc(doc(db, 'usuarios', createdUser.uid), {
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          accessModules: newUser.role === 'admin' ? [] : newUser.accessModules || [],
          createdAt: new Date().toISOString()
        });
        
        await signOut(secondaryAuth);
        window.M?.toast({ html: 'Usuario creado exitosamente', classes: 'green rounded' });
      }
      
      setIsUserModalOpen(false);
      setEditingUserId(null);
      setNewUser({ name: '', email: '', password: '', role: 'empleado', accessModules: ['appointments', 'clients', 'fichas'] });
      loadUsers();
    } catch (error) {
      console.error(error);
      window.M?.toast({ html: `Error: ${error.message}`, classes: 'red rounded' });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId, userRole) => {
    if (userRole === 'admin') {
       window.M?.toast({ html: 'No puedes eliminar a un Administrador', classes: 'red rounded' });
       return;
    }
    if (window.confirm("¿Estás seguro de que deseas revocar a este empleado? Perderá el acceso instantáneamente.")) {
      try {
        await deleteDoc(doc(db, 'usuarios', userId));
        window.M?.toast({ html: 'Acceso de usuario revocado', classes: 'green rounded' });
        loadUsers();
      } catch (error) {
        window.M?.toast({ html: 'Error al revocar usuario', classes: 'red rounded' });
      }
    }
  };

  const openEditUserModal = (user) => {
    setNewUser({
      name: user.name || '',
      email: user.email || '',
      password: '', // Password is not editable here directly to avoid saving plaintext
      role: user.role || 'empleado',
      accessModules: user.accessModules || []
    });
    setEditingUserId(user.id);
    setIsUserModalOpen(true);
  };

  const handleModuleToggle = (moduleId) => {
    setNewUser(prev => {
      const isSelected = prev.accessModules?.includes(moduleId);
      return {
        ...prev,
        accessModules: isSelected 
          ? prev.accessModules.filter(m => m !== moduleId)
          : [...(prev.accessModules || []), moduleId]
      };
    });
  };

  const openCreateUserModal = () => {
    setNewUser({ name: '', email: '', password: '', role: 'empleado', accessModules: ['appointments', 'clients', 'fichas'] });
    setEditingUserId(null);
    setIsUserModalOpen(true);
  };

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 24px',
        backgroundColor: activeTab === id ? 'white' : 'transparent',
        border: 'none',
        borderBottom: activeTab === id ? '3px solid var(--spa-primary)' : '3px solid transparent',
        color: activeTab === id ? 'var(--spa-primary-dark)' : '#64748b',
        fontWeight: activeTab === id ? 700 : 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: '0.95rem'
      }}
    >
      <Icon size={18} /> {label}
    </button>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h3>Ajustes del Sistema</h3>
          <p>Configura el perfil de tu marca, horarios de operación y cuentas de seguridad.</p>
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', gap: '5px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <TabButton id="perfil" icon={Store} label="Perfil del SPA" />
        <TabButton id="horarios" icon={Clock} label="Horarios de Atención" />
        <TabButton id="usuarios" icon={Users} label="Gestión de Usuarios" />
        <TabButton id="seguridad" icon={Lock} label="Seguridad y Acceso" />
      </div>

      {loading ? (
         <div className="center-align" style={{ padding: '4rem' }}>
           <div className="preloader-wrapper small active"><div className="spinner-layer spinner-green-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
         </div>
      ) : (
        <div style={{ maxWidth: '800px' }}>
          
          {/* TAB 1: PERFIL */}
          {activeTab === 'perfil' && (
            <div className="card-panel" style={{ borderRadius: '16px', padding: '2rem' }}>
              <h5 style={{ marginTop: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
                <Store size={22} color="var(--spa-primary)" /> Configuración General
              </h5>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>Personaliza la información pública e identidad visual del SPA.</p>
              
              <form onSubmit={handleProfileSubmit}>
                <div className="row">
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label>Nombre del SPA</label>
                     <div style={{ position: 'relative' }}>
                       <Store size={18} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                       <input type="text" required className="browser-default" style={{ width: '100%', height: '40px', paddingLeft: '35px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                        value={profileData.spaName} onChange={e => setProfileData({...profileData, spaName: e.target.value})} />
                     </div>
                  </div>
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label>Logotipo Oficial</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                       <label className="modern-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0 }}>
                         <Camera size={18} /> Subir Logo
                         <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files[0])} />
                       </label>
                       <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                         {imageFile ? imageFile.name : profileData.imageUrl ? 'Logo guardado' : 'No hay logo'}
                       </span>
                     </div>
                  </div>
                  
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label>Teléfono / WhatsApp</label>
                     <div style={{ position: 'relative' }}>
                       <Phone size={18} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                       <input type="text" className="browser-default" style={{ width: '100%', height: '40px', paddingLeft: '35px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                        value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} />
                     </div>
                  </div>
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label>Correo Electrónico de Contacto</label>
                     <div style={{ position: 'relative' }}>
                       <Mail size={18} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                       <input type="email" className="browser-default" style={{ width: '100%', height: '40px', paddingLeft: '35px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                        value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} />
                     </div>
                  </div>

                  <div className="col s12" style={{ marginBottom: '15px' }}>
                     <label>Dirección Física</label>
                     <div style={{ position: 'relative' }}>
                       <MapPin size={18} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                       <input type="text" className="browser-default" style={{ width: '100%', height: '40px', paddingLeft: '35px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                        value={profileData.address} onChange={e => setProfileData({...profileData, address: e.target.value})} />
                     </div>
                  </div>

                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label>Enlace de Instagram</label>
                     <div style={{ position: 'relative' }}>
                       <Instagram size={18} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                       <input type="url" placeholder="https://instagram.com/..." className="browser-default" style={{ width: '100%', height: '40px', paddingLeft: '35px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                        value={profileData.instagram} onChange={e => setProfileData({...profileData, instagram: e.target.value})} />
                     </div>
                  </div>
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label>Enlace de Facebook</label>
                     <div style={{ position: 'relative' }}>
                       <Facebook size={18} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                       <input type="url" placeholder="https://facebook.com/..." className="browser-default" style={{ width: '100%', height: '40px', paddingLeft: '35px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                        value={profileData.facebook} onChange={e => setProfileData({...profileData, facebook: e.target.value})} />
                     </div>
                  </div>

                  {/* NUEVA SECCIÓN: DISEÑO LANDING */}
                  <div className="col s12" style={{ marginTop: '20px', borderTop: '2px dashed #e2e8f0', paddingTop: '20px' }}>
                    <h6 style={{ fontWeight: 700, color: 'var(--spa-primary-dark)', marginBottom: '15px' }}>Diseño de la Página Web (Landing)</h6>
                    
                    <div className="row">
                      <div className="col s12" style={{ marginBottom: '15px' }}>
                        <label>Imagen de Portada (Hero Background)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                           <label className="modern-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0 }}>
                             <Camera size={18} /> Cambiar Fondo Hero
                             <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setHeroFile(e.target.files[0])} />
                           </label>
                           <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                             {heroFile ? heroFile.name : profileData.heroImageUrl ? 'Imagen activa cargada' : 'Sin imagen personalizada'}
                           </span>
                        </div>
                      </div>

                      <div className="col s12 m4" style={{ marginBottom: '15px' }}>
                        <label>Tagline (Texto Superior Hero)</label>
                        <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          value={profileData.heroTagline} onChange={e => setProfileData({...profileData, heroTagline: e.target.value})} />
                      </div>
                      <div className="col s12 m8" style={{ marginBottom: '15px' }}>
                        <label>Título Principal Hero</label>
                        <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          value={profileData.heroTitle} onChange={e => setProfileData({...profileData, heroTitle: e.target.value})} />
                      </div>
                      <div className="col s12" style={{ marginBottom: '15px' }}>
                        <label>Subtítulo / Descripción Hero</label>
                        <textarea className="browser-default" style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit' }} 
                          value={profileData.heroSubtitle} onChange={e => setProfileData({...profileData, heroSubtitle: e.target.value})} />
                      </div>

                      <div className="col s12 m5" style={{ marginBottom: '15px' }}>
                        <label>Título Sección Filosofía</label>
                        <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          value={profileData.philosophyTitle} onChange={e => setProfileData({...profileData, philosophyTitle: e.target.value})} />
                      </div>
                      <div className="col s12 m7" style={{ marginBottom: '15px' }}>
                        <label>Texto Filosofía / Rutina</label>
                        <textarea className="browser-default" style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit' }} 
                          value={profileData.philosophyText} onChange={e => setProfileData({...profileData, philosophyText: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', textAlign: 'right' }}>
                  <button type="submit" className="modern-btn-small" disabled={isSavingProfile}>
                     <Save size={18} /> {isSavingProfile ? 'Guardando...' : 'Guardar Perfil'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: HORARIOS */}
          {activeTab === 'horarios' && (
            <div className="card-panel" style={{ borderRadius: '16px', padding: '2rem' }}>
              <h5 style={{ marginTop: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
                <Clock size={22} color="var(--spa-primary)" /> Horarios de Funcionamiento
              </h5>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>Configura tus bloques horarios de disponibilidad para citas.</p>

              <form onSubmit={handleScheduleSubmit}>
                {Object.keys(schedule).filter(key => key !== 'updatedAt').map((day) => (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    <div style={{ width: '120px' }}>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#334155' }}>{day}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <label>
                         <input type="checkbox" className="filled-in" checked={!schedule[day].isClosed} 
                            onChange={(e) => handleDayChange(day, 'isClosed', !e.target.checked)} />
                         <span>{schedule[day].isClosed ? 'Cerrado' : 'Abierto'}</span>
                       </label>
                    </div>

                    {!schedule[day].isClosed && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
                        <input type="time" className="browser-default" style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px' }}
                           value={schedule[day].open} onChange={(e) => handleDayChange(day, 'open', e.target.value)} />
                        <span style={{ color: '#94a3b8' }}>a</span>
                        <input type="time" className="browser-default" style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px' }}
                           value={schedule[day].close} onChange={(e) => handleDayChange(day, 'close', e.target.value)} />
                      </div>
                    )}
                  </div>
                ))}

                <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', textAlign: 'right' }}>
                  <button type="submit" className="modern-btn-small" disabled={isSavingSchedule}>
                     <Save size={18} /> {isSavingSchedule ? 'Guardando...' : 'Guardar Horarios'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: SEGURIDAD */}
          {activeTab === 'seguridad' && (
            <div className="card-panel" style={{ borderRadius: '16px', padding: '2rem' }}>
              <h5 style={{ marginTop: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
                <Lock size={22} color="var(--spa-primary)" /> Seguridad del Administrador
              </h5>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>Cambia tu contraseña de acceso de forma segura reescribiendo la actual.</p>

              <form onSubmit={handleSecuritySubmit}>
                <div style={{ marginBottom: '20px' }}>
                   <label>Contraseña Actual</label>
                   <input type="password" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} />
                </div>
                
                <div className="row" style={{ margin: 0 }}>
                  <div className="col s12 m6" style={{ paddingLeft: 0, marginBottom: '20px' }}>
                     <label>Nueva Contraseña</label>
                     <input type="password" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                      value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} />
                  </div>
                  <div className="col s12 m6" style={{ paddingRight: 0, marginBottom: '20px' }}>
                     <label>Confirmar Nueva Contraseña</label>
                     <input type="password" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                      value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} />
                  </div>
                </div>

                <div style={{ marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', textAlign: 'right' }}>
                  <button type="submit" className="modern-btn-small" disabled={isSavingSecurity} style={{ backgroundColor: '#0f172a' }}>
                     {isSavingSecurity ? 'Verificando...' : 'Actualizar Contraseña'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: USUARIOS */}
          {activeTab === 'usuarios' && (
            <div className="card-panel" style={{ borderRadius: '16px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h5 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
                    <Users size={22} color="var(--spa-primary)" /> Directorio de Empleados
                  </h5>
                  <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Administra quién tiene acceso al sistema y restringe sus permisos.</p>
                </div>
                {!isUserModalOpen && (
                  <button onClick={openCreateUserModal} className="modern-btn-small" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <UserPlus size={18} /> Nuevo Usuario
                  </button>
                )}
              </div>

              {isUserModalOpen ? (
                <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <h6 style={{ fontWeight: 600, marginTop: 0 }}>{editingUserId ? 'Editar Roles del Empleado' : 'Crear Empleado / Admin'}</h6>
                  <form onSubmit={handleCreateOrUpdateUser}>
                    <div className="row" style={{ margin: 0 }}>
                      <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                        <label>Nombre Completo</label>
                        <input type="text" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                      </div>
                      <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                        <label>Correo Electrónico</label>
                        <input type="email" required={!editingUserId} disabled={!!editingUserId} className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: editingUserId ? '#f1f5f9' : 'white', cursor: editingUserId ? 'not-allowed' : 'text' }} 
                          value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                      </div>
                      {!editingUserId && (
                        <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                          <label>Contraseña Provisional</label>
                          <input type="password" required minLength="6" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                            value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                        </div>
                      )}
                      <div className={`col s12 ${editingUserId ? 'm6' : 'm6'}`} style={{ marginBottom: '15px' }}>
                        <label>Rol de Permisos</label>
                        <select className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                          <option value="empleado">Empleado (Módulos Personalizados)</option>
                          <option value="admin">Administrador (Control Total)</option>
                        </select>
                      </div>

                      {newUser.role === 'empleado' && (
                        <div className="col s12" style={{ marginBottom: '15px', marginTop: '10px' }}>
                          <label style={{ display: 'block', fontWeight: 600, marginBottom: '10px', color: '#1e293b' }}>
                            Módulos con Acceso (Selecciona los que apliquen)
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                            {AVAILABLE_MODULES.map(mod => (
                              <label key={mod.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', ':hover': { borderColor: 'var(--spa-primary)' } }}>
                                <input 
                                  type="checkbox" 
                                  className="filled-in" 
                                  checked={newUser.accessModules?.includes(mod.id) || false}
                                  onChange={() => handleModuleToggle(mod.id)}
                                />
                                <span style={{ color: '#475569', fontSize: '0.9rem' }}>{mod.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                      <button type="button" className="modern-btn-outline" onClick={() => setIsUserModalOpen(false)}>Cancelar</button>
                      <button type="submit" className="modern-btn-small" disabled={isCreatingUser}>
                        {isCreatingUser ? 'Guardando...' : (editingUserId ? 'Guardar Cambios' : 'Crear Cuenta')}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="highlight rounded-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Rol Asignado</th>
                        <th>Fecha Creación</th>
                        <th className="right-align">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '35px', height: '35px', backgroundColor: u.role === 'admin' ? '#10b981' : '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <span style={{ display: 'block', fontWeight: 600, color: '#0f172a' }}>{u.name}</span>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            {u.role === 'admin' ? (
                              <span style={{ backgroundColor: '#d1fae5', color: '#047857', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Shield size={12} /> Administrador
                              </span>
                            ) : (
                              <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                                Empleado
                              </span>
                            )}
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="right-align">
                            <button onClick={() => openEditUserModal(u)} className="btn-flat" style={{ padding: '0 8px', color: '#475569' }} title="Editar Permisos">
                              <SettingsIcon size={18} />
                            </button>
                            {u.role !== 'admin' && (
                              <button onClick={() => handleDeleteUser(u.id, u.role)} className="btn-flat" style={{ padding: '0 8px', color: '#ef4444' }} title="Eliminar Usuario">
                                <Trash2 size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {usersList.length === 0 && (
                        <tr><td colSpan="4" className="center-align" style={{ padding: '20px', color: '#94a3b8' }}>No hay usuarios registrados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default Settings;
