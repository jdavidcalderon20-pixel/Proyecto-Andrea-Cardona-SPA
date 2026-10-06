import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import LeadCaptureModal from '../components/LeadCaptureModal';
import { 
  ChevronLeft, 
  Clock, 
  Info, 
  CheckCircle, 
  BookOpen, 
  Award, 
  Users, 
  MessageCircle, 
  Send,
  Menu as MenuIcon,
  X,
  Star,
  ArrowRight
} from 'lucide-react';
import spaLogo from '../assets/Logo.jpeg';

const PublicCourseDetail = () => {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '' });
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [config, setConfig] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 100 || document.documentElement.scrollTop > 100;
      setScrolled(isScrolled);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const docRef = doc(db, 'cursos', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCourse({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error("Error fetching course:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();

    const unsubConfig = onSnapshot(doc(db, 'configuracion', 'general'), (doc) => {
      if (doc.exists()) setConfig(doc.data());
    });

    return () => unsubConfig();
  }, [id]);

  const handleSubmitLead = async (e) => {
    e.preventDefault();
    if (!leadData.name || !leadData.phone || !leadData.email) return;
    
    setIsSubmittingLead(true);
    try {
      await addDoc(collection(db, 'leads_academia'), {
        ...leadData,
        courseName: course?.name,
        createdAt: serverTimestamp(),
        status: 'Pendiente'
      });
      
      const message = `Hola Andrea! Mi nombre es ${leadData.name}. Estoy interesado en inscribirme en el curso: *${course?.name}*. ¿Podrías darme más información? Mis datos: ${leadData.email}, ${leadData.phone}`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${config?.phone?.replace(/\s/g, '') || '573155217625'}?text=${encodedMessage}`;
      
      setLeadModalOpen(false);
      setLeadData({ name: '', email: '', phone: '' });
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error("Error saving lead:", error);
      alert("Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const olive = '#C5A059';
  const slate = '#1A1A1A';
  const lightSlate = '#64748b';

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDFBF7' }}>
        <div style={{ textAlign: 'center' }}>
           <div className="loader" style={{ border: `4px solid #f3f3f3`, borderTop: `4px solid ${olive}`, borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
           <p style={{ color: lightSlate, fontWeight: 500 }}>Cargando detalles del curso...</p>
        </div>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', backgroundColor: '#FDFBF7' }}>
        <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: slate }}>Curso no encontrado</h3>
        <Link to="/inicio#academia" style={{ color: olive, fontWeight: 600, marginTop: '20px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ChevronLeft size={20} /> Volver a la Academia
        </Link>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: '"Inter", sans-serif', backgroundColor: '#FFFFFF', minHeight: '100vh', color: slate, paddingTop: '130px' }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
        
        .mobile-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 10001;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }
        .mobile-menu-overlay.active {
          opacity: 1;
          visibility: visible;
        }
        .mobile-menu-drawer {
          position: fixed;
          top: 0;
          right: -100%;
          width: 80%;
          max-width: 300px;
          height: 100%;
          background: white;
          z-index: 10002;
          padding: 40px 30px;
          transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
          box-shadow: -10px 0 30px rgba(0,0,0,0.1);
        }
        .mobile-menu-drawer.active {
          right: 0;
        }
        .course-header {
           background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${course.imageUrl || ''});
           background-size: cover;
           background-position: center;
           height: 400px;
           display: flex;
           align-items: center;
           justify-content: center;
           color: white;
           text-align: center;
           padding: 0 20px;
           margin-top: -130px;
        }
        .info-card {
           background: white;
           padding: 30px;
           borderRadius: '24px';
           boxShadow: '0 10px 40px rgba(0,0,0,0.05)';
           border: '1px solid #F1F1F1';
           height: 100%;
        }
        .sticky-sidebar {
           position: sticky;
           top: 150px;
        }
        @media (max-width: 768px) {
           .course-header { height: 300px; padding-top: 80px; }
           padding-top: 80px !important;
        }
      `}} />

      {/* Mobile Menu UI */}
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
      <div className={`mobile-menu-drawer ${isMobileMenuOpen ? 'active' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
          <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
             <X size={32} color={slate} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <Link to="/inicio" onClick={() => setIsMobileMenuOpen(false)} style={{ color: slate, fontWeight: 600, fontSize: '1.4rem', textDecoration: 'none' }}>Inicio</Link>
          <Link to="/inicio#servicios" onClick={() => setIsMobileMenuOpen(false)} style={{ color: slate, fontWeight: 600, fontSize: '1.4rem', textDecoration: 'none' }}>Servicios</Link>
          <Link to="/inicio#productos" onClick={() => setIsMobileMenuOpen(false)} style={{ color: slate, fontWeight: 600, fontSize: '1.4rem', textDecoration: 'none' }}>Productos</Link>
          <Link to="/inicio#academia" onClick={() => setIsMobileMenuOpen(false)} style={{ color: slate, fontWeight: 600, fontSize: '1.4rem', textDecoration: 'none' }}>Academia</Link>
          <Link to="/inicio#contacto" onClick={() => setIsMobileMenuOpen(false)} style={{ color: slate, fontWeight: 600, fontSize: '1.4rem', textDecoration: 'none' }}>Contacto</Link>
        </div>
      </div>
      
      {/* Navbar Consistent with Landing */}
      <nav style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.98)', 
        backdropFilter: 'blur(10px)',
        height: scrolled ? '70px' : '90px', 
        display: 'flex',
        alignItems: 'center',
        padding: '0 5vw', 
        position: 'fixed', 
        top: 0, 
        left: 0,
        right: 0,
        zIndex: 1000, 
        borderBottom: '1px solid #F3F4F6', 
        boxShadow: scrolled ? '0 10px 30px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <Link to="/inicio" style={{ height: scrolled ? '55px' : '90px', transition: 'height 0.4s ease', display: 'block' }}>
            <img src={config?.imageUrl || spaLogo} alt="Logo" style={{ height: '100%', width: 'auto', objectFit: 'contain' }} />
          </Link>
          
          <div className="hide-mobile" style={{ display: 'flex', gap: scrolled ? '15px' : '25px', alignItems: 'center', transition: 'all 0.4s ease' }}>
            <Link to="/inicio" style={{ color: slate, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none' }}>Inicio</Link>
            <Link to="/inicio#servicios" style={{ color: slate, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none' }}>Servicios</Link>
            <Link to="/inicio#productos" style={{ color: slate, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none' }}>Productos</Link>
            <Link to="/inicio#academia" style={{ color: olive, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none' }}>Academia</Link>
            <Link to="/inicio#contacto" style={{ color: slate, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none' }}>Contacto</Link>
          </div>

          <button className="hide-desktop" onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: slate, cursor: 'pointer' }}>
            <MenuIcon size={28} />
          </button>
        </div>
      </nav>

      <div className="course-header">
         <div style={{ maxWidth: '800px' }}>
            <span style={{ backgroundColor: olive, color: 'white', padding: '6px 16px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'inline-block' }}>
              {course.modality || 'Presencial'}
            </span>
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: '0 0 20px 0', lineHeight: 1.1 }}>
              {course.name}
            </h1>
            <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', fontSize: '1.1rem', opacity: 0.9 }}>
               <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={20} /> {course.duration || 'Consultar duración'}</span>
               <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={20} /> Cupos Limitados</span>
            </div>
         </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '60px 5vw 100px 5vw' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px' }}>
          
          {/* Main Content */}
          <div style={{ flex: '2' }}>
            <Link to="/inicio#academia" style={{ textDecoration: 'none', color: lightSlate, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, marginBottom: '40px' }}>
              <ChevronLeft size={20} /> Volver a la Academia
            </Link>

            <section style={{ marginBottom: '60px' }}>
               <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: olive, marginBottom: '25px' }}>Sobre el Curso</h2>
               <p style={{ fontSize: '1.1rem', color: lightSlate, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {course.detailedDescription || course.desc || 'Aprende las técnicas más avanzadas de la mano de expertos en bienestar orgánico.'}
               </p>
            </section>

            {course.syllabus && (
              <section style={{ marginBottom: '60px' }}>
                 <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: slate, marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <BookOpen size={28} color={olive} /> Temario del Curso
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {(() => {
                      const lines = course.syllabus.split('\n').filter(line => line.trim());
                      let mainPointIndex = 0;
                      
                      return lines.map((line, idx) => {
                        const isSubPoint = line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().startsWith('•');
                        const cleanLine = isSubPoint ? line.trim().substring(1).trim() : line.trim();
                        
                        if (!isSubPoint) mainPointIndex++;

                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              display: 'flex', 
                              gap: '15px', 
                              padding: isSubPoint ? '10px 20px 10px 60px' : '20px', 
                              backgroundColor: isSubPoint ? 'transparent' : '#FDFBF7', 
                              borderRadius: '12px',
                              borderLeft: isSubPoint ? `2px solid ${olive}33` : 'none',
                              marginLeft: isSubPoint ? '20px' : '0',
                              alignItems: 'flex-start'
                            }}
                          >
                             {!isSubPoint && (
                               <span style={{ color: olive, fontWeight: 700, fontSize: '1.1rem', minWidth: '25px' }}>
                                 {String(mainPointIndex).padStart(2, '0')}
                               </span>
                             )}
                             {isSubPoint && (
                               <div style={{ width: '8px', height: '8px', backgroundColor: olive, borderRadius: '50%', marginTop: '8px', flexShrink: 0 }} />
                             )}
                             <p style={{ 
                               margin: 0, 
                               color: slate, 
                               fontWeight: isSubPoint ? 400 : 600,
                               fontSize: isSubPoint ? '0.95rem' : '1.05rem',
                               lineHeight: 1.5
                             }}>
                               {cleanLine}
                             </p>
                          </div>
                        );
                      });
                    })()}
                 </div>
              </section>
            )}

            {course.requirements && (
              <section style={{ marginBottom: '60px' }}>
                 <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: slate, marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <CheckCircle size={28} color={olive} /> Requisitos
                 </h3>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    {course.requirements.split('\n').filter(line => line.trim()).map((req, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: lightSlate }}>
                         <CheckCircle size={20} color={olive} />
                         <span>{req}</span>
                      </div>
                    ))}
                 </div>
              </section>
            )}

            {/* Gallery */}
            {course.galleryUrls && course.galleryUrls.length > 0 && (
              <section>
                 <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: slate, marginBottom: '40px' }}>Galería del Curso</h3>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {course.galleryUrls.map((url, idx) => (
                      <div key={idx} style={{ height: '280px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                         <img src={url} alt={`${course.name} ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} className="hover-scale" />
                      </div>
                    ))}
                 </div>
              </section>
            )}
          </div>

          {/* Sidebar / CTA */}
          <div style={{ flex: '1' }}>
             <div className="sticky-sidebar">
                <div style={{ backgroundColor: '#FDFBF7', padding: '40px', borderRadius: '24px', border: `1px solid ${olive}22`, boxShadow: '0 20px 50px rgba(0,0,0,0.05)' }}>
                   <div style={{ marginBottom: '30px' }}>
                      <p style={{ color: lightSlate, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, marginBottom: '10px' }}>Inversión del Curso</p>
                      <h3 style={{ fontSize: '3rem', fontWeight: 800, color: slate, margin: 0 }}>
                         ${course.price?.toLocaleString()}
                      </h3>
                      <p style={{ color: olive, fontSize: '0.9rem', fontWeight: 600, marginTop: '5px' }}>IVA incluido • Facilidades de pago</p>
                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: lightSlate }}>
                         <Award size={24} color={olive} />
                         <span>Certificación Profesional</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: lightSlate }}>
                         <Users size={24} color={olive} />
                         <span>Grupos Reducidos</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: lightSlate }}>
                         <MessageCircle size={24} color={olive} />
                         <span>Soporte Post-Curso</span>
                      </div>
                   </div>

                   <button 
                     onClick={() => setLeadModalOpen(true)}
                     style={{ 
                        width: '100%', 
                        backgroundColor: olive, 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '12px', 
                        padding: '20px', 
                        fontSize: '1.1rem', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        boxShadow: `0 10px 20px ${olive}33`,
                        transition: 'all 0.3s'
                     }}
                     onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 15px 30px ${olive}44`; }}
                     onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 10px 20px ${olive}33`; }}
                   >
                      <Send size={20} /> Quiero Inscribirme
                   </button>

                   <p style={{ textAlign: 'center', color: lightSlate, fontSize: '0.85rem', marginTop: '20px', lineHeight: 1.5 }}>
                      Al hacer clic, un asesor te contactará para finalizar tu inscripción y resolver dudas.
                   </p>
                </div>

                <div style={{ marginTop: '30px', padding: '25px', borderRadius: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                   <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 700, color: slate }}>¿Tienes dudas?</h4>
                   <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: lightSlate }}>Habla directamente con Andrea Cardona para más información sobre el temario.</p>
                   <a 
                     href={`https://wa.me/${config?.phone?.replace(/\s/g, '') || '573155217625'}?text=Hola Andrea! Tengo una duda sobre el curso de ${course.name}`}
                     target="_blank"
                     rel="noreferrer"
                     style={{ color: olive, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
                   >
                      Chatear ahora <ArrowRight size={16} />
                   </a>
                </div>
             </div>
          </div>

        </div>
      </div>

      <footer style={{ backgroundColor: '#1A1A1A', color: 'white', padding: '80px 5vw 40px 5vw' }}>
         <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
            <h4 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', marginBottom: '20px' }}>{config?.spaName || 'Andrea Cardona SPA'}</h4>
            <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '600px', margin: '0 auto 40px auto', lineHeight: 1.8 }}>
               Formando profesionales de la belleza con una visión orgánica y científica. Tu camino hacia la excelencia comienza aquí.
            </p>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '30px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
               © {new Date().getFullYear()} {config?.spaName?.toUpperCase() || 'ANDREA CARDONA SPA'} • ACADEMIA DE BIENESTAR
            </div>
         </div>
      </footer>

      <LeadCaptureModal 
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        onSubmit={handleSubmitLead}
        leadData={leadData}
        setLeadData={setLeadData}
        isSubmitting={isSubmittingLead}
        courseName={course.name}
      />
    </div>
  );
};

export default PublicCourseDetail;
