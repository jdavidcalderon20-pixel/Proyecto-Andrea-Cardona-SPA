import React, { useState, useEffect } from 'react';
import { Camera, Save, Lock, Clock, Settings as SettingsIcon, Store, Mail, Phone, MapPin, Instagram, Facebook, Users, UserPlus, Trash2, Shield, Star, MessageSquare, HelpCircle } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { db, auth, firebaseConfig } from '../config/firebase';
import { uploadImage, getAllDocuments } from '../services/firebaseUtils';
import heic2any from 'heic2any';

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
    heroVideoUrl: '',
    philosophyTitle: 'Filosofía Botánica',
    philosophyText: 'Nuestros productos son formulados con extractos puros y procesos de bajo impacto ambiental para garantizar la salud de tu piel.',
    servicesTitle: 'Nuestros Servicios',
    servicesSubtitle: 'Rituales botánicos que combinan ciencia avanzada y la pureza de la naturaleza.',
    productsTitle: 'Acompaña tu Rutina',
    productsTagline: 'Cuidado en casa',
    testimoniosTitle: 'Experiencias que Inspiran',
    testimoniosTagline: 'Testimonios Reales',
    testimoniosItems: [],
    experienciasTitle: 'Momentos de Bienestar',
    experienciasTagline: 'VIVE LA EXPERIENCIA',
    experienciasItems: [],
    faqTitle: 'Preguntas Frecuentes',
    faqSubtitle: 'Queremos que tu experiencia sea perfecta desde el primer momento. Aquí resolvemos las inquietudes más comunes de nuestros clientes.',
    faqTagline: 'Resolviendo tus dudas',
    faqItems: [],
    academiaTitle: 'Academia & Formación',
    academiaSubtitle: 'Aprende las técnicas más avanzadas en estética y bienestar de la mano de profesionales.',
    academiaTagline: 'FORMA TU FUTURO',
    locationTitle: 'Donde el tiempo se detiene',
    locationTagline: 'Encuentra tu Santuario',
    locationCity: 'Chinchiná, Caldas',
    locationLabel: 'Visítanos hoy'
  });
  const [imageFile, setImageFile] = useState(null);
  const [heroFile, setHeroFile] = useState(null);
  const [expFiles, setExpFiles] = useState({}); // { index: File }
  const [testimonialFiles, setTestimonialFiles] = useState({}); // { index: File }
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Helper para procesar imágenes (HEIC -> JPG y Previsualización)
  const processImageForPreview = async (file, setFileCallback, label) => {
    if (!file) return;

    const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    
    if (isHEIC) {
      try {
        window.M?.toast({ html: `📱 Procesando imagen de iPhone (${label})...`, classes: 'blue rounded' });
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8
        });
        const finalFile = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        // Crear un nuevo File object para mantener el nombre
        const newFile = new File([finalFile], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
        setFileCallback(newFile);
      } catch (err) {
        console.error('Error al convertir HEIC:', err);
        window.M?.toast({ html: '❌ No se pudo procesar la imagen de iPhone', classes: 'red' });
        setFileCallback(file); // Intentar con el original de todos modos
      }
    } else {
      setFileCallback(file);
    }
  };

  // --- Schedule State ---
  const SPA_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
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
      if (generalDoc.exists()) {
        const data = generalDoc.data();
        setProfileData(prev => ({
          ...prev,
          ...data,
          // Asegurar que los arrays existan para evitar errores al mapear
          testimoniosItems: data.testimoniosItems || prev.testimoniosItems || [],
          faqItems: data.faqItems || prev.faqItems || [],
          experienciasItems: data.experienciasItems || prev.experienciasItems || []
        }));
      }

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
    
    // Verificar configuración de Cloudinary
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset || cloudName === 'tu_cloud_name' || uploadPreset === 'tu_upload_preset') {
      setTimeout(() => {
        window.M?.toast({ 
          html: '⚠️ Cloudinary no está configurado. Las cargas de imágenes fallarán.', 
          classes: 'orange darken-2 rounded',
          displayLength: 8000
        });
      }, 1500);
    }
  }, []);

  const loadDefaultLandingData = () => {
    if (window.confirm('¿Deseas cargar los textos e imágenes por defecto de la página? Esto sobrescribirá lo que tengas escrito actualmente en los campos de diseño (pero no se guardará hasta que presiones "Guardar Cambios").')) {
      setProfileData(prev => ({
        ...prev,
        heroTagline: 'Experiencia Orgánica',
        heroTitle: 'Tu refugio de bienestar y belleza',
        heroSubtitle: 'Reconecta con tu esencia a través de tratamientos diseñados para armonizar cuerpo y mente en un entorno de paz absoluta.',
        heroImageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=2000',
        philosophyTitle: 'Filosofía Botánica',
        philosophyText: 'Nuestros productos son formulados con extractos puros y procesos de bajo impacto ambiental para garantizar la salud de tu piel.',
        servicesTitle: 'Nuestros Servicios',
        servicesSubtitle: 'Rituales botánicos que combinan ciencia avanzada y la pureza de la naturaleza.',
        productsTitle: 'Acompaña tu Rutina',
        productsTagline: 'Cuidado en casa',
        testimoniosTitle: 'Experiencias que Inspiran',
        testimoniosTagline: 'Testimonios Reales',
        testimoniosItems: [
          { name: "Lucía Méndez", text: "La limpieza facial profunda cambió mi piel por completo. La atención es impecable y los productos orgánicos se sienten increíbles.", role: "Cliente Frecuente", rating: 5, color: '#F9F7F2' },
          { name: "Carlos Rodríguez", text: "El masaje relajante es de otro mundo. Salí como nuevo. Definitivamente el mejor SPA de la ciudad para desconectarse.", role: "Empresario", rating: 5, color: '#F4F3F0' },
          { name: "Marta Gómez", text: "Me encanta la filosofía botánica. Se nota que usan ingredientes puros. Mi rutina de skincare ahora es 100% Andrea Cardona.", role: "Influencer de Estilo", rating: 5, color: '#F9F7F2' }
        ],
        experienciasTitle: 'Momentos de Bienestar',
        experienciasTagline: 'VIVE LA EXPERIENCIA',
        experienciasItems: [
          { title: 'Rituales Faciales', text: 'Tratamientos personalizados con activos botánicos.', imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800' },
          { title: 'Masajes Holísticos', text: 'Equilibrio perfecto entre cuerpo, mente y espíritu.', imageUrl: 'https://images.unsplash.com/photo-1544161515-4ae6ce6ea8a8?auto=format&fit=crop&q=80&w=800' },
          { title: 'Cuidado Corporal', text: 'Exfoliaciones e hidrataciones profundas con sales naturales.', imageUrl: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=800' }
        ],
        faqTitle: 'Preguntas Frecuentes',
        faqSubtitle: 'Queremos que tu experiencia sea perfecta desde el primer momento. Aquí resolvemos las inquietudes más comunes de nuestros clientes.',
        faqTagline: 'Resolviendo tus dudas',
        faqItems: [
          { q: "¿Cómo puedo agendar una cita?", a: "Puedes agendar fácilmente a través de nuestro botón de WhatsApp o llamándonos directamente. Recomendamos hacerlo con al menos 48 horas de antelación para asegurar tu espacio preferido." },
          { q: "¿Qué debo llevar a mi sesión?", a: "Solo tu deseo de relajarte. Nosotros proporcionamos batas, toallas de alta calidad y todo lo necesario para que tu ritual de bienestar sea completo y sin preocupaciones." },
          { q: "¿Tienen certificados de regalo?", a: "Sí, contamos con Gift Cards personalizadas y experiencias empaquetadas para que puedas regalar un momento inolvidable a tus seres queridos." },
          { q: "¿Cuáles son sus métodos de pago?", a: "Aceptamos efectivo, transferencias bancarias y todas las tarjetas de crédito o débito a través de nuestra pasarela de pagos segura." },
          { q: "¿Puedo cancelar o reprogramar?", a: "Entendemos que los planes cambian. Agradecemos que cualquier cambio se notifique con al menos 24 horas de antelación para permitir que otros clientes puedan disfrutar del espacio." }
        ],
        locationTitle: 'Donde el tiempo se detiene',
        locationTagline: 'Encuentra tu Santuario',
        locationCity: 'Chinchiná, Caldas',
        locationLabel: 'Visítanos hoy',
        academiaTitle: 'Academia & Formación',
        academiaSubtitle: 'Aprende las técnicas más avanzadas en estética y bienestar de la mano de profesionales.',
        academiaTagline: 'FORMA TU FUTURO'
      }));
      window.M?.toast({ html: 'Datos por defecto cargados en el formulario', classes: 'blue rounded' });
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (isSavingProfile) return;

    try {
      setIsSavingProfile(true);

      // VALIDACIÓN PRE-VUELO
      if (!profileData.spaName?.trim()) {
        window.M?.toast({ html: '❌ El nombre del SPA es obligatorio', classes: 'red rounded' });
        setIsSavingProfile(false);
        return;
      }

      const totalUploads = (imageFile ? 1 : 0) + (heroFile ? 1 : 0) + Object.keys(expFiles).length + Object.keys(testimonialFiles).length;
      let currentUploadCount = 0;

      window.M?.toast({ html: `⏳ Iniciando actualización (0/${totalUploads} imágenes)...`, classes: 'blue rounded' });

      // 1. Clonar datos actuales para evitar mutaciones directas
      const currentProfile = JSON.parse(JSON.stringify(profileData));
      
      // 2. Procesamiento de archivos en serie para no saturar la conexión
      let updatedLogoUrl = currentProfile.imageUrl;
      let updatedHeroUrl = currentProfile.heroImageUrl;
      const updatedExpItems = [...(currentProfile.experienciasItems || [])];
      const updatedTestimoniosItems = [...(currentProfile.testimoniosItems || [])];

      // LOGO
      if (imageFile) {
        currentUploadCount++;
        window.M?.toast({ html: `📤 (${currentUploadCount}/${totalUploads}) Subiendo logo...`, classes: 'blue' });
        updatedLogoUrl = await uploadImage(imageFile, 'config');
      }

      // HERO
      if (heroFile) {
        currentUploadCount++;
        window.M?.toast({ html: `📤 (${currentUploadCount}/${totalUploads}) Subiendo portada...`, classes: 'blue' });
        updatedHeroUrl = await uploadImage(heroFile, 'config');
      }

      // EXPERIENCIAS
      const expKeys = Object.keys(expFiles);
      for (const idx of expKeys) {
        const i = parseInt(idx);
        currentUploadCount++;
        window.M?.toast({ html: `📤 (${currentUploadCount}/${totalUploads}) Subiendo imagen experiencia ${i+1}...`, classes: 'blue' });
        const url = await uploadImage(expFiles[idx], 'config/experiencias');
        if (updatedExpItems[i]) {
            updatedExpItems[i].imageUrl = url;
        } else {
            // Caso borde: el item fue eliminado mientras se subía, o no existe en el array original
            console.warn(`Intento de asignar imagen a experiencia inexistente en índice ${i}`);
        }
      }

      // TESTIMONIOS
      const testKeys = Object.keys(testimonialFiles);
      for (const idx of testKeys) {
        const i = parseInt(idx);
        currentUploadCount++;
        window.M?.toast({ html: `📤 (${currentUploadCount}/${totalUploads}) Subiendo foto testimonio ${i+1}...`, classes: 'blue' });
        const url = await uploadImage(testimonialFiles[idx], 'config/testimonios');
        if (updatedTestimoniosItems[i]) {
            updatedTestimoniosItems[i].imageUrl = url;
        } else {
            console.warn(`Intento de asignar imagen a testimonio inexistente en índice ${i}`);
        }
      }

      // 3. Limpieza de datos antes de guardar
      const dataToSave = {
        ...currentProfile,
        imageUrl: updatedLogoUrl,
        heroImageUrl: updatedHeroUrl,
        experienciasItems: updatedExpItems,
        testimoniosItems: updatedTestimoniosItems,
        updatedAt: serverTimestamp()
      };

      // 4. Guardar en Firestore
      window.M?.toast({ html: '💾 Sincronizando con base de datos...', classes: 'blue' });
      await setDoc(doc(db, 'configuracion', 'general'), dataToSave, { merge: true });
      
      // 5. Actualizar estado y limpiar archivos
      setProfileData(dataToSave);
      setImageFile(null);
      setHeroFile(null);
      setExpFiles({});
      setTestimonialFiles({});

      window.M?.toast({ html: '✅ Perfil actualizado correctamente', classes: 'green rounded' });
    } catch (error) {
      console.error("ERROR CRÍTICO AL GUARDAR PERFIL:", error);
      window.M?.toast({ 
        html: `❌ Error: ${error.message || 'Error desconocido'}`, 
        displayLength: 6000,
        classes: 'red rounded' 
      });
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
        padding: '16px 24px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: activeTab === id ? '3px solid var(--spa-gold)' : '3px solid transparent',
        color: activeTab === id ? 'var(--spa-gold)' : '#64748b',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: '0.9rem',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}
    >
      <Icon size={18} /> {label}
    </button>
  );

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '0', borderBottom: 'none' }}>
        <div className="page-title">
          <h3 style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>Ajustes del Sistema</h3>
          <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>Configura el perfil de tu marca, horarios de operación y cuentas de seguridad.</p>
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', gap: '5px', borderBottom: '1px solid #e2e8f0', marginBottom: '30px', backgroundColor: 'white', position: 'sticky', top: '0', zIndex: 10, overflowX: 'auto', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
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
            <div className="luxury-modal-container" style={{ maxWidth: '100%', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
              <div className="luxury-modal-header" style={{ padding: '24px 32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <h5 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
                    Configuración del Perfil
                  </h5>
                  <button 
                    type="button" 
                    onClick={loadDefaultLandingData}
                    className="modern-btn-outline" 
                    style={{ fontSize: '0.8rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <SettingsIcon size={16} /> Cargar Datos por Defecto
                  </button>
                </div>
              </div>
              <div className="luxury-modal-body" style={{ padding: '32px' }}>
              
              <form onSubmit={handleProfileSubmit}>
                <div className="row">
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                      <label style={{ fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Nombre del SPA</label>
                      <input type="text" required className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }} 
                        value={profileData.spaName} onChange={e => setProfileData({...profileData, spaName: e.target.value})} />
                  </div>
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label style={{ fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Logotipo Oficial</label>
                     <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
                       <div style={{ 
                         width: '80px', height: '80px', borderRadius: '12px', border: '2px dashed #e2e8f0', 
                         display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#f8fafc' 
                       }}>
                         {imageFile || profileData.imageUrl ? (
                           <img src={imageFile ? URL.createObjectURL(imageFile) : profileData.imageUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                         ) : (
                           <Store size={32} color="#cbd5e1" />
                         )}
                       </div>
                       <div>
                         <label className="modern-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '0 0 8px 0', padding: '8px 16px' }}>
                           <Camera size={18} /> Subir Logo
                           <input type="file" accept="image/*,.heic,.heif" style={{ display: 'none' }} onChange={e => processImageForPreview(e.target.files[0], setImageFile, 'Logo')} />
                         </label>
                         <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                           {imageFile ? imageFile.name : profileData.imageUrl ? 'Logo guardado' : 'Formatos: JPG, PNG'}
                         </p>
                       </div>
                     </div>
                  </div>
                  
                  <div className="col s12 m6" style={{ marginBottom: '20px' }}>
                     <label style={{ fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Teléfono / WhatsApp</label>
                     <input type="text" className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }} 
                      value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} />
                  </div>
                  <div className="col s12 m6" style={{ marginBottom: '20px' }}>
                     <label style={{ fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Correo Electrónico</label>
                     <input type="email" className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }} 
                      value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} />
                  </div>

                  <div className="col s12" style={{ marginBottom: '20px' }}>
                     <label style={{ fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Dirección Física</label>
                     <input type="text" className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }} 
                      value={profileData.address} onChange={e => setProfileData({...profileData, address: e.target.value})} />
                  </div>

                  <div className="col s12 m6" style={{ marginBottom: '20px' }}>
                     <label style={{ fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Instagram (URL)</label>
                     <input type="url" placeholder="https://instagram.com/..." className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }} 
                      value={profileData.instagram} onChange={e => setProfileData({...profileData, instagram: e.target.value})} />
                  </div>
                  <div className="col s12 m6" style={{ marginBottom: '20px' }}>
                     <label style={{ fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Facebook (URL)</label>
                     <input type="url" placeholder="https://facebook.com/..." className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }} 
                      value={profileData.facebook} onChange={e => setProfileData({...profileData, facebook: e.target.value})} />
                  </div>

                  {/* NUEVA SECCIÓN: DISEÑO LANDING */}
                  <div className="col s12" style={{ marginTop: '20px', borderTop: '2px dashed #e2e8f0', paddingTop: '20px' }}>
                    <h6 style={{ fontWeight: 700, color: 'var(--spa-primary-dark)', marginBottom: '15px' }}>Diseño de la Página Web (Landing)</h6>
                    
                    <div className="row">
                       <div className="col s12" style={{ marginBottom: '15px' }}>
                         <label style={{ fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Imagen de Portada (Hero Background)</label>
                         <div style={{ marginBottom: '15px', position: 'relative', height: '180px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>
                           {heroFile || profileData.heroImageUrl ? (
                             <img src={heroFile ? URL.createObjectURL(heroFile) : profileData.heroImageUrl} alt="Hero Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                           ) : (
                             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                               <Camera size={48} strokeWidth={1} />
                               <span>Sin imagen de portada</span>
                             </div>
                           )}
                           <label style={{ 
                             position: 'absolute', bottom: '15px', right: '15px', 
                             backgroundColor: 'white', padding: '8px 16px', borderRadius: '30px', 
                             cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                             boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 600, color: '#0f172a'
                           }}>
                             <Camera size={18} /> {heroFile ? 'Cambiar Selección' : 'Subir Nueva Imagen'}
                             <input type="file" accept="image/*,.heic,.heif" style={{ display: 'none' }} onChange={e => processImageForPreview(e.target.files[0], setHeroFile, 'Portada')} />
                           </label>
                         </div>
                         <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                           {heroFile ? `Seleccionado: ${heroFile.name}` : ''}
                         </p>
                         <p style={{ margin: '10px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <strong>💡 Tip:</strong> Para que la portada se vea completa en computadores, usa imágenes horizontales (1920x1080px). En móviles se verá el centro de la imagen.
                         </p>
                       </div>

                      <div className="col s12" style={{ marginBottom: '15px' }}>
                        <label>URL de Video de Portada (Opcional - reemplaza la imagen)</label>
                        <input type="text" className="browser-default" placeholder="https://ejemplo.com/video.mp4" 
                          style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          value={profileData.heroVideoUrl || ''} onChange={e => setProfileData({...profileData, heroVideoUrl: e.target.value})} />
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

                      {/* Textos de Secciones */}
                      <div className="col s12 m5" style={{ marginBottom: '15px', marginTop: '10px' }}>
                        <label>Título Sección Servicios</label>
                        <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          value={profileData.servicesTitle} onChange={e => setProfileData({...profileData, servicesTitle: e.target.value})} />
                      </div>
                      <div className="col s12 m7" style={{ marginBottom: '15px', marginTop: '10px' }}>
                        <label>Subtítulo Sección Servicios</label>
                        <textarea className="browser-default" style={{ width: '100%', minHeight: '40px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit', resize: 'vertical' }} 
                          value={profileData.servicesSubtitle} onChange={e => setProfileData({...profileData, servicesSubtitle: e.target.value})} />
                      </div>
                      <div className="col s12 m5" style={{ marginBottom: '15px' }}>
                        <label>Tagline de Productos</label>
                        <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          value={profileData.productsTagline} onChange={e => setProfileData({...profileData, productsTagline: e.target.value})} />
                      </div>
                      <div className="col s12 m7" style={{ marginBottom: '15px' }}>
                        <label>Título Sección Productos</label>
                        <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          value={profileData.productsTitle} onChange={e => setProfileData({...profileData, productsTitle: e.target.value})} />
                      </div>

                      {/* SECCIÓN TESTIMONIOS */}
                      <div className="col s12" style={{ marginTop: '30px', borderTop: '2px dashed #e2e8f0', paddingTop: '20px' }}>
                        <h6 style={{ fontWeight: 700, color: 'var(--spa-primary-dark)', marginBottom: '15px' }}>Testimonios / Experiencias</h6>
                        <div className="row">
                          <div className="col s12 m5" style={{ marginBottom: '15px' }}>
                            <label>Tagline (Texto pequeño arriba)</label>
                            <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              value={profileData.testimoniosTagline} onChange={e => setProfileData({...profileData, testimoniosTagline: e.target.value})} />
                          </div>
                          <div className="col s12 m7" style={{ marginBottom: '15px' }}>
                            <label>Título Sección</label>
                            <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              value={profileData.testimoniosTitle} onChange={e => setProfileData({...profileData, testimoniosTitle: e.target.value})} />
                          </div>
                        </div>

                        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {(profileData.testimoniosItems || []).map((item, idx) => (
                              <div key={idx} style={{ 
                                backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', 
                                padding: '24px', position: 'relative', transition: 'all 0.3s ease',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}>
                                <button type="button" style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                  onClick={() => {
                                    const newItems = profileData.testimoniosItems.filter((_, i) => i !== idx);
                                    setProfileData({...profileData, testimoniosItems: newItems});
                                    const newFiles = {...testimonialFiles};
                                    delete newFiles[idx];
                                    setTestimonialFiles(newFiles);
                                  }}>
                                  <Trash2 size={18} />
                                </button>

                                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                                  <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
                                    {(testimonialFiles[idx] || item.imageUrl) ? (
                                      <img src={testimonialFiles[idx] ? URL.createObjectURL(testimonialFiles[idx]) : item.imageUrl} 
                                           alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                        <Users size={24} />
                                      </div>
                                    )}
                                    <label style={{ 
                                      position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', 
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                      opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer' 
                                    }} className="hover-opacity">
                                      <Camera size={16} color="white" />
                                      <input type="file" accept="image/*,.heic,.heif" style={{ display: 'none' }} onChange={e => {
                                        processImageForPreview(e.target.files[0], (file) => {
                                          setTestimonialFiles(prev => ({ ...prev, [idx]: file }));
                                        }, `Testimonio ${idx + 1}`);
                                      }} />
                                    </label>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <input type="text" placeholder="Nombre del Cliente" className="browser-default"
                                      style={{ width: '100%', border: 'none', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: '1rem', padding: '4px 0', marginBottom: '4px' }}
                                      value={item.name} onChange={e => {
                                        const newItems = [...profileData.testimoniosItems];
                                        newItems[idx].name = e.target.value;
                                        setProfileData({...profileData, testimoniosItems: newItems});
                                      }} />
                                    <input type="text" placeholder="Cargo o Rol (Ej: Cliente VIP)" className="browser-default"
                                      style={{ width: '100%', border: 'none', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#64748b', padding: '4px 0' }}
                                      value={item.role} onChange={e => {
                                        const newItems = [...profileData.testimoniosItems];
                                        newItems[idx].role = e.target.value;
                                        setProfileData({...profileData, testimoniosItems: newItems});
                                      }} />
                                  </div>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Calificación</label>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <button key={star} type="button" 
                                        onClick={() => {
                                          const newItems = [...profileData.testimoniosItems];
                                          newItems[idx].rating = star;
                                          setProfileData({...profileData, testimoniosItems: newItems});
                                        }}
                                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                                        <Star size={20} fill={star <= (item.rating || 5) ? '#fbbf24' : 'none'} color={star <= (item.rating || 5) ? '#fbbf24' : '#cbd5e1'} />
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Testimonio</label>
                                  <textarea className="browser-default" placeholder="Escribe el testimonio aquí..."
                                    style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#fcfcfc', fontSize: '0.9rem', lineHeight: '1.5', resize: 'none' }}
                                    value={item.text} onChange={e => {
                                      const newItems = [...profileData.testimoniosItems];
                                      newItems[idx].text = e.target.value;
                                      setProfileData({...profileData, testimoniosItems: newItems});
                                    }} />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Color de Fondo:</label>
                                  <input type="color" style={{ width: '30px', height: '30px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    value={item.color || '#F9F7F2'} onChange={e => {
                                      const newItems = [...profileData.testimoniosItems];
                                      newItems[idx].color = e.target.value;
                                      setProfileData({...profileData, testimoniosItems: newItems});
                                    }} />
                                </div>
                                
                                <div style={{ marginTop: '16px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>O URL de Imagen Externa</label>
                                  <input type="text" placeholder="https://..." className="browser-default" 
                                    style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#94a3b8' }} 
                                    value={item.imageUrl} onChange={e => {
                                      const newItems = [...profileData.testimoniosItems];
                                      newItems[idx].imageUrl = e.target.value;
                                      setProfileData({...profileData, testimoniosItems: newItems});
                                    }} />
                                </div>
                              </div>
                            ))}
                            
                            <button type="button" 
                              style={{ 
                                border: '2px dashed #cbd5e1', borderRadius: '16px', minHeight: '300px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                gap: '12px', color: '#64748b', backgroundColor: '#ffffff', cursor: 'pointer', transition: 'all 0.2s'
                              }}
                              onClick={() => {
                                const newItems = [...(profileData.testimoniosItems || []), { name: '', text: '', role: '', rating: 5, color: '#F9F7F2' }];
                                setProfileData({...profileData, testimoniosItems: newItems});
                              }}
                            >
                              <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '50%' }}>
                                <MessageSquare size={32} />
                              </div>
                              <span style={{ fontWeight: 700 }}>Añadir Testimonio</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* SECCIÓN EXPERIENCIAS */}
                      <div className="col s12" style={{ marginTop: '30px', borderTop: '2px dashed #e2e8f0', paddingTop: '20px' }}>
                        <h6 style={{ fontWeight: 700, color: 'var(--spa-primary-dark)', marginBottom: '15px' }}>Galería de Experiencias</h6>
                        <div className="row">
                          <div className="col s12 m5" style={{ marginBottom: '15px' }}>
                            <label>Tagline (Texto pequeño arriba)</label>
                            <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              value={profileData.experienciasTagline} onChange={e => setProfileData({...profileData, experienciasTagline: e.target.value})} />
                          </div>
                          <div className="col s12 m7" style={{ marginBottom: '15px' }}>
                            <label>Título Sección</label>
                            <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              value={profileData.experienciasTitle} onChange={e => setProfileData({...profileData, experienciasTitle: e.target.value})} />
                          </div>
                        </div>

                        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                          {(profileData.experienciasItems || []).map((item, idx) => (
                            <div key={idx} style={{ 
                              backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', 
                              overflow: 'hidden', position: 'relative', transition: 'all 0.3s ease',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}>
                              <div style={{ height: '160px', backgroundColor: '#f1f5f9', position: 'relative' }}>
                                {(expFiles[idx] || item.imageUrl) ? (
                                  <img 
                                    src={expFiles[idx] ? URL.createObjectURL(expFiles[idx]) : item.imageUrl} 
                                    alt={item.title} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  />
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                    <Camera size={40} strokeWidth={1} />
                                  </div>
                                )}
                                <label style={{ 
                                  position: 'absolute', bottom: '10px', right: '10px', 
                                  backgroundColor: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: '20px',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem',
                                  fontWeight: 700, color: '#0f172a', backdropFilter: 'blur(4px)', border: '1px solid rgba(0,0,0,0.05)'
                                }}>
                                  <Camera size={14} /> {expFiles[idx] || item.imageUrl ? 'Cambiar' : 'Subir'}
                                  <input type="file" accept="image/*,.heic,.heif" style={{ display: 'none' }} onChange={e => {
                                    processImageForPreview(e.target.files[0], (file) => {
                                      setExpFiles(prev => ({ ...prev, [idx]: file }));
                                    }, `Experiencia ${idx + 1}`);
                                  }} />
                                </label>
                              </div>
                              
                              <div style={{ padding: '20px' }}>
                                <button type="button" style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                                  onClick={() => {
                                    const newItems = profileData.experienciasItems.filter((_, i) => i !== idx);
                                    setProfileData({...profileData, experienciasItems: newItems});
                                    // Limpiar archivo pendiente si existe
                                    const newFiles = {...expFiles};
                                    delete newFiles[idx];
                                    setExpFiles(newFiles);
                                  }}>
                                  <Trash2 size={16} />
                                </button>

                                <div style={{ marginBottom: '12px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Título de la Experiencia</label>
                                  <input type="text" className="browser-default" placeholder="Ej: Rituales Faciales"
                                    style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px', fontSize: '0.9rem' }} 
                                    value={item.title} onChange={e => {
                                      const newItems = [...profileData.experienciasItems];
                                      newItems[idx].title = e.target.value;
                                      setProfileData({...profileData, experienciasItems: newItems});
                                    }} />
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Breve Descripción</label>
                                  <textarea className="browser-default" placeholder="Descripción corta..."
                                    style={{ width: '100%', minHeight: '60px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'none' }} 
                                    value={item.text} onChange={e => {
                                      const newItems = [...profileData.experienciasItems];
                                      newItems[idx].text = e.target.value;
                                      setProfileData({...profileData, experienciasItems: newItems});
                                    }} />
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>O URL de Imagen Externa</label>
                                  <input type="text" placeholder="https://..." className="browser-default" 
                                    style={{ width: '100%', height: '32px', padding: '0 10px', borderRadius: '6px', border: '1px solid #f1f5f9', marginTop: '4px', fontSize: '0.8rem', color: '#94a3b8' }} 
                                    value={item.imageUrl} onChange={e => {
                                      const newItems = [...profileData.experienciasItems];
                                      newItems[idx].imageUrl = e.target.value;
                                      setProfileData({...profileData, experienciasItems: newItems});
                                    }} />
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          <button type="button" 
                            style={{ 
                              border: '2px dashed #cbd5e1', borderRadius: '16px', height: '100%', minHeight: '380px',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              gap: '12px', color: '#64748b', backgroundColor: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onClick={() => {
                              const newItems = [...(profileData.experienciasItems || []), { title: '', text: '', imageUrl: '' }];
                              setProfileData({...profileData, experienciasItems: newItems});
                            }}
                          >
                            <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                              <Users size={32} />
                            </div>
                            <span style={{ fontWeight: 700 }}>Añadir Nueva Experiencia</span>
                          </button>
                        </div>
                        </div>
                      </div>

                      {/* SECCIÓN FAQ */}
                      <div className="col s12" style={{ marginTop: '30px', borderTop: '2px dashed #e2e8f0', paddingTop: '20px' }}>
                        <h6 style={{ fontWeight: 700, color: 'var(--spa-primary-dark)', marginBottom: '15px' }}>Preguntas Frecuentes (FAQ)</h6>
                        <div className="row">
                          <div className="col s12 m4" style={{ marginBottom: '15px' }}>
                            <label>Tagline FAQ (Texto pequeño arriba)</label>
                            <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              value={profileData.faqTagline} onChange={e => setProfileData({...profileData, faqTagline: e.target.value})} />
                          </div>
                          <div className="col s12 m8" style={{ marginBottom: '15px' }}>
                            <label>Título Sección FAQ</label>
                            <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              value={profileData.faqTitle} onChange={e => setProfileData({...profileData, faqTitle: e.target.value})} />
                          </div>
                          <div className="col s12" style={{ marginBottom: '15px' }}>
                            <label>Descripción / Subtítulo FAQ</label>
                            <textarea className="browser-default" style={{ width: '100%', minHeight: '40px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit' }} 
                              value={profileData.faqSubtitle} onChange={e => setProfileData({...profileData, faqSubtitle: e.target.value})} />
                          </div>
                        </div>

                        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                            {(profileData.faqItems || []).map((item, idx) => (
                              <div key={idx} style={{ 
                                backgroundColor: item.color || 'white', padding: '20px', borderRadius: '12px', 
                                border: '1px solid #e2e8f0', position: 'relative',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                              }}>
                                <button type="button" style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                  onClick={() => {
                                    const newItems = profileData.faqItems.filter((_, i) => i !== idx);
                                    setProfileData({...profileData, faqItems: newItems});
                                  }}>
                                  <Trash2 size={18} />
                                </button>
                                
                                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--spa-primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <HelpCircle size={20} />
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Pregunta</label>
                                    <input type="text" className="browser-default" placeholder="Escribe la pregunta..."
                                      style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #f1f5f9', fontWeight: 600, fontSize: '0.95rem' }} 
                                      value={item.q} onChange={e => {
                                        const newItems = [...profileData.faqItems];
                                        newItems[idx].q = e.target.value;
                                        setProfileData({...profileData, faqItems: newItems});
                                      }} />
                                  </div>
                                </div>

                                <div style={{ marginLeft: '55px' }}>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Respuesta</label>
                                  <textarea className="browser-default" placeholder="Escribe la respuesta..."
                                    style={{ width: '100%', minHeight: '80px', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '0.9rem', lineHeight: '1.5', fontFamily: 'inherit', resize: 'vertical' }} 
                                    value={item.a} onChange={e => {
                                      const newItems = [...profileData.faqItems];
                                      newItems[idx].a = e.target.value;
                                      setProfileData({...profileData, faqItems: newItems});
                                    }} />
                                </div>
                              </div>
                            ))}
                            
                            <button type="button" 
                              style={{ 
                                border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: '10px', color: '#64748b', backgroundColor: '#ffffff', cursor: 'pointer', transition: 'all 0.2s'
                              }}
                              onClick={() => {
                                const newItems = [...(profileData.faqItems || []), { q: '', a: '', color: '#ffffff' }];
                                setProfileData({...profileData, faqItems: newItems});
                              }}
                            >
                              <HelpCircle size={20} />
                              <span style={{ fontWeight: 700 }}>Añadir Nueva Pregunta</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* SECCIÓN ACADEMIA */}
                      <div className="col s12" style={{ marginTop: '30px', borderTop: '2px dashed #e2e8f0', paddingTop: '20px' }}>
                        <h6 style={{ fontWeight: 700, color: 'var(--spa-primary-dark)', marginBottom: '15px' }}>Sección Academia (Enseñanza)</h6>
                        <div className="row">
                          <div className="col s12 m4" style={{ marginBottom: '15px' }}>
                            <label>Tagline Academia (Texto pequeño arriba)</label>
                            <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              value={profileData.academiaTagline} onChange={e => setProfileData({...profileData, academiaTagline: e.target.value})} />
                          </div>
                          <div className="col s12 m8" style={{ marginBottom: '15px' }}>
                            <label>Título Sección Academia</label>
                            <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              value={profileData.academiaTitle} onChange={e => setProfileData({...profileData, academiaTitle: e.target.value})} />
                          </div>
                          <div className="col s12" style={{ marginBottom: '15px' }}>
                            <label>Descripción / Subtítulo Academia</label>
                            <textarea className="browser-default" style={{ width: '100%', minHeight: '40px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit' }} 
                              value={profileData.academiaSubtitle} onChange={e => setProfileData({...profileData, academiaSubtitle: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      {/* SECCIÓN UBICACIÓN */}
                      <div className="col s12" style={{ marginTop: '30px', borderTop: '2px dashed #e2e8f0', paddingTop: '20px' }}>
                        <h6 style={{ fontWeight: 700, color: 'var(--spa-primary-dark)', marginBottom: '15px' }}>Sección Ubicación</h6>
                        <div className="row">
                          <div className="col s12 m5" style={{ marginBottom: '15px' }}>
                            <label>Tagline (Texto pequeño arriba)</label>
                            <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              value={profileData.locationTagline} onChange={e => setProfileData({...profileData, locationTagline: e.target.value})} />
                          </div>
                          <div className="col s12 m7" style={{ marginBottom: '15px' }}>
                            <label>Título Sección</label>
                            <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              value={profileData.locationTitle} onChange={e => setProfileData({...profileData, locationTitle: e.target.value})} />
                          </div>
                          <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                            <label>Ciudad (Letrero Flotante Mapa)</label>
                            <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              value={profileData.locationCity} onChange={e => setProfileData({...profileData, locationCity: e.target.value})} />
                          </div>
                          <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                            <label>Etiqueta (Letrero Flotante Mapa)</label>
                            <input type="text" className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                              value={profileData.locationLabel} onChange={e => setProfileData({...profileData, locationLabel: e.target.value})} />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                <div className="luxury-modal-footer" style={{ padding: '24px 32px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                  <button type="submit" className="modern-btn-small" disabled={isSavingProfile}>
                     {isSavingProfile ? 'Guardando...' : 'Guardar Perfil'}
                  </button>
                </div>
              </form>
              </div> 
            </div>
          )}

          {/* TAB 2: HORARIOS */}
          {activeTab === 'horarios' && (
            <div className="luxury-modal-container" style={{ maxWidth: '100%', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
              <div className="luxury-modal-header" style={{ padding: '24px 32px' }}>
                <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Horarios de Atención</h5>
              </div>
              <div className="luxury-modal-body" style={{ padding: '32px' }}>
                <form onSubmit={handleScheduleSubmit}>
                  {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map((day) => {
                    if (!schedule[day]) return null;
                    return (
                      <div key={day} style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        alignItems: 'center', 
                        gap: '10px', 
                        marginBottom: '15px', 
                        padding: '12px 15px', 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '12px',
                        border: '1px solid #f1f5f9'
                      }}>
                        <div style={{ width: '90px', flexShrink: 0 }}>
                          <span style={{ fontWeight: 700, textTransform: 'capitalize', color: '#334155', fontSize: '0.95rem' }}>{day}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                           <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                             <input type="checkbox" className="filled-in" checked={!schedule[day].isClosed} 
                                onChange={(e) => handleDayChange(day, 'isClosed', !e.target.checked)} />
                             <span style={{ fontWeight: 600, fontSize: '0.9rem', color: schedule[day].isClosed ? '#94a3b8' : 'var(--spa-gold)' }}>
                               {schedule[day].isClosed ? 'Cerrado' : 'Abierto'}
                             </span>
                           </label>
                        </div>

                        {!schedule[day].isClosed && (
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            flex: '1 1 200px', 
                            justifyContent: 'flex-start',
                            marginTop: '5px'
                          }}>
                            <input type="time" className="browser-default" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px', fontSize: '0.85rem', width: '85px', backgroundColor: 'white' }}
                               value={schedule[day].open} onChange={(e) => handleDayChange(day, 'open', e.target.value)} />
                            <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem' }}>a</span>
                            <input type="time" className="browser-default" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px', fontSize: '0.85rem', width: '85px', backgroundColor: 'white' }}
                               value={schedule[day].close} onChange={(e) => handleDayChange(day, 'close', e.target.value)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="luxury-modal-footer" style={{ marginTop: '20px', padding: '24px 0 0 0', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <button type="submit" className="modern-btn-small" disabled={isSavingSchedule}>
                       {isSavingSchedule ? 'Guardando...' : 'Guardar Horarios'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: SEGURIDAD */}
          {activeTab === 'seguridad' && (
            <div className="luxury-modal-container" style={{ maxWidth: '100%', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
              <div className="luxury-modal-header" style={{ padding: '24px 32px' }}>
                <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Seguridad de la Cuenta</h5>
              </div>
              <div className="luxury-modal-body" style={{ padding: '32px' }}>
                <p style={{ color: '#64748b', marginBottom: '32px' }}>Cambia tu contraseña de acceso de forma segura reescribiendo la actual.</p>
                
                <form onSubmit={handleSecuritySubmit}>
                  <div style={{ marginBottom: '24px' }}>
                     <label style={{ fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Contraseña Actual</label>
                     <input type="password" required className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }} 
                      value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} />
                  </div>
                  
                  <div className="row" style={{ margin: '0 -10px' }}>
                    <div className="col s12 m6" style={{ padding: '0 10px', marginBottom: '24px' }}>
                       <label style={{ fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Nueva Contraseña</label>
                       <input type="password" required className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }} 
                        value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} />
                    </div>
                    <div className="col s12 m6" style={{ padding: '0 10px', marginBottom: '24px' }}>
                       <label style={{ fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Confirmar Nueva Contraseña</label>
                       <input type="password" required className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }} 
                        value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} />
                    </div>
                  </div>

                  <div className="luxury-modal-footer" style={{ marginTop: '10px', padding: '24px 0 0 0', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <button type="submit" className="modern-btn-small" disabled={isSavingSecurity}>
                       {isSavingSecurity ? 'Verificando...' : 'Actualizar Contraseña'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: USUARIOS */}
          {activeTab === 'usuarios' && (
            <div className="luxury-modal-container" style={{ maxWidth: '100%', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>
              <div className="luxury-modal-header" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Directorio de Empleados</h5>
                {!isUserModalOpen && (
                  <button onClick={openCreateUserModal} className="modern-btn-small" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <UserPlus size={18} /> Nuevo Usuario
                  </button>
                )}
              </div>
              <div className="luxury-modal-body" style={{ padding: '32px' }}>
                <p style={{ margin: '0 0 32px 0', color: '#64748b' }}>Administra quién tiene acceso al sistema y restringe sus permisos.</p>

                {isUserModalOpen ? (
                  <div style={{ backgroundColor: '#f8fafc', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                    <h6 style={{ fontWeight: 700, marginTop: 0, marginBottom: '24px', color: '#0f172a' }}>{editingUserId ? 'Editar Roles del Empleado' : 'Crear Empleado / Admin'}</h6>
                    <form onSubmit={handleCreateOrUpdateUser}>
                      <div className="row" style={{ margin: '0 -10px' }}>
                        <div className="col s12 m6" style={{ padding: '0 10px', marginBottom: '20px' }}>
                          <label style={{ fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Nombre Completo</label>
                          <input type="text" required className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }} 
                            value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                        </div>
                        <div className="col s12 m6" style={{ padding: '0 10px', marginBottom: '20px' }}>
                          <label style={{ fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Correo Electrónico</label>
                          <input type="email" required={!editingUserId} disabled={!!editingUserId} className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem', backgroundColor: editingUserId ? '#f1f5f9' : 'white' }} 
                            value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                        </div>
                        {!editingUserId && (
                          <div className="col s12 m6" style={{ padding: '0 10px', marginBottom: '20px' }}>
                            <label style={{ fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Contraseña Provisional</label>
                            <input type="password" required minLength="6" className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }} 
                              value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                          </div>
                        )}
                        <div className="col s12 m6" style={{ padding: '0 10px', marginBottom: '20px' }}>
                          <label style={{ fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Rol de Permisos</label>
                          <select className="browser-default" style={{ width: '100%', height: '44px', padding: '0 15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.95rem' }} 
                            value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                            <option value="empleado">Empleado (Módulos Personalizados)</option>
                            <option value="admin">Administrador (Control Total)</option>
                          </select>
                        </div>

                        {newUser.role === 'empleado' && (
                          <div className="col s12" style={{ padding: '0 10px', marginBottom: '20px', marginTop: '10px' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '16px', color: '#1e293b' }}>
                              Módulos con Acceso
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                              {AVAILABLE_MODULES.map(mod => (
                                <label key={mod.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    className="filled-in" 
                                    checked={newUser.accessModules?.includes(mod.id) || false}
                                    onChange={() => handleModuleToggle(mod.id)}
                                  />
                                  <span style={{ color: '#475569', fontSize: '0.95rem', fontWeight: 500 }}>{mod.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                        <button type="button" className="modern-btn-outline" onClick={() => setIsUserModalOpen(false)}>Cancelar</button>
                        <button type="submit" className="modern-btn-small" disabled={isCreatingUser}>
                          {isCreatingUser ? 'Guardando...' : (editingUserId ? 'Guardar Cambios' : 'Crear Cuenta')}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="table-responsive-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: u.role === 'admin' ? 'var(--spa-gold)' : '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                  {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <span style={{ display: 'block', fontWeight: 700, color: '#0f172a' }}>{u.name}</span>
                                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{u.email}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              {u.role === 'admin' ? (
                                <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #ffedd5' }}>
                                  <Shield size={12} /> Administrador
                                </span>
                              ) : (
                                <span style={{ backgroundColor: '#f0f9ff', color: '#0369a1', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #e0f2fe' }}>
                                  Empleado
                                </span>
                              )}
                            </td>
                            <td style={{ color: '#64748b', fontSize: '0.9rem' }}>
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="right-align">
                              <button onClick={() => openEditUserModal(u)} className="btn-flat" style={{ padding: '0 8px', color: '#64748b' }} title="Editar Permisos">
                                <SettingsIcon size={20} />
                              </button>
                              {u.role !== 'admin' && (
                                <button onClick={() => handleDeleteUser(u.id, u.role)} className="btn-flat" style={{ padding: '0 8px', color: '#ef4444' }} title="Eliminar Usuario">
                                  <Trash2 size={20} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {usersList.length === 0 && (
                          <tr><td colSpan="4" className="center-align" style={{ padding: '40px', color: '#94a3b8' }}>No hay usuarios registrados</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default Settings;
