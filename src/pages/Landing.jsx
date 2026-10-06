import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { collection, onSnapshot, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import CheckoutModal from '../components/CheckoutModal';
import LeadCaptureModal from '../components/LeadCaptureModal';
import { ShoppingBag, MessageCircle, Menu as MenuIcon, ArrowRight, Image as ImageIcon, Mail, Phone, Clock, ShieldCheck, X, Loader2 } from 'lucide-react';
import spaLogo from '../assets/Logo.jpeg';
import { useCart } from '../context/CartContext';
import GoogleMapsSection from '../components/GoogleMapsSection';
import { Star, Quote } from 'lucide-react';
// Hero image generated for the redesign
const heroImg = "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=2000";

const Landing = () => {
  const [servicios, setServicios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [legalModal, setLegalModal] = useState({ open: false, title: '', content: '' });
  const [scrolled, setScrolled] = useState(false);
  const [activeServiceCat, setActiveServiceCat] = useState('Todos');
  const [activeProductCat, setActiveProductCat] = useState('Todos');
  const [courses, setCourses] = useState([]);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '' });
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  
  const location = useLocation();

  // SEO & OpenGraph Implementation
  useEffect(() => {
    document.title = "Andrea Cardona SPA | Bienestar & Belleza Orgánica";
    
    const metaTags = [
      { name: 'description', content: 'Tu refugio de bienestar y belleza. Tratamientos diseñados para armonizar cuerpo y mente con la pureza de la naturaleza.' },
      { property: 'og:title', content: 'Andrea Cardona SPA | Experiencia Orgánica' },
      { property: 'og:description', content: 'Rituales botánicos que combinan ciencia avanzada y la pureza de la naturaleza.' },
      { property: 'og:image', content: config?.heroImageUrl || heroImg },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' }
    ];

    metaTags.forEach(tag => {
      let element = document.querySelector(`meta[${tag.name ? 'name' : 'property'}="${tag.name || tag.property}"]`);
      if (!element) {
        element = document.createElement('meta');
        if (tag.name) element.setAttribute('name', tag.name);
        if (tag.property) element.setAttribute('property', tag.property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', tag.content);
    });
  }, [config]);

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const id = location.hash.replace('#', '');
        scrollToSection(id);
      }, 150);
    }
  }, [location]);

  const { cart, addToCart, cartCount, setCart } = useCart();

  useEffect(() => {
    const unsubServicios = onSnapshot(collection(db, 'servicios'), (snapshot) => {
      const servData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServicios(servData);
    }, (error) => {
      console.error("Error fetching servicios:", error);
    });

    const unsubProductos = onSnapshot(collection(db, 'productos'), (snapshot) => {
      const prodData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductos(prodData);
    }, (error) => {
      console.error("Error fetching productos:", error);
    });

    const unsubConfig = onSnapshot(doc(db, 'configuracion', 'general'), (doc) => {
      try {
        if (doc.exists()) {
          setConfig(doc.data());
        }
      } catch (err) {
        console.error("Error processing config data:", err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error fetching config:", error);
      setLoading(false);
    });

    const unsubCourses = onSnapshot(collection(db, 'cursos'), (snapshot) => {
      const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Academy Courses Loaded:", coursesData); // Debugging sync
      setCourses(coursesData);
    }, (error) => {
      console.error("Error fetching courses:", error);
    });

    return () => { unsubServicios(); unsubProductos(); unsubConfig(); unsubCourses(); };
  }, []);

    useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 100 || document.documentElement.scrollTop > 100;
      setScrolled(isScrolled);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const addToCartLocal = (product) => {
    addToCart(product);
    // Ya no abre el modal automáticamente, permite seguir navegando
  };

  const openCheckout = (item, type) => {
    setSelectedItem({ item, type });
    setCartOpen(true);
  };

  const handleSubmitLead = async (e) => {
    e.preventDefault();
    if (!leadData.name || !leadData.phone || !leadData.email) return;
    
    setIsSubmittingLead(true);
    try {
      await addDoc(collection(db, 'leads_academia'), {
        ...leadData,
        courseName: selectedCourse?.name,
        createdAt: serverTimestamp(),
        status: 'Pendiente'
      });
      
      const message = `Hola Andrea! Mi nombre es ${leadData.name}. Estoy interesado en inscribirme en el curso: *${selectedCourse?.name}*. ¿Podrías darme más información? Mis datos: ${leadData.email}, ${leadData.phone}`;
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

  const olive = '#C5A059'; // Luxury Gold
  const cream = '#FDFBF7'; // Luxury Cream
  const slate = '#1A1A1A'; // Charcoal
  const lightSlate = '#64748b';

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleMobileMenuClick = (e, sectionId) => {
    e.stopPropagation();
    if (location.pathname === '/inicio' || location.pathname === '/') {
      if (sectionId) {
        e.preventDefault();
        scrollToSection(sectionId);
      }
    }
    setIsMobileMenuOpen(false);
  };

  const serviceCategories = ['Todos', ...new Set(servicios.map(s => s.category).filter(Boolean))];
  const productCategories = ['Todos', ...new Set(productos.map(p => p.category).filter(Boolean))];

  const filteredServicios = activeServiceCat === 'Todos' 
    ? servicios 
    : servicios.filter(s => s.category === activeServiceCat);

  const filteredProductos = activeProductCat === 'Todos'
    ? productos
    : productos.filter(p => p.category === activeProductCat);

  return (
    <div className="prevent-overflow" style={{ fontFamily: '"Inter", sans-serif', backgroundColor: '#FFFFFF', minHeight: '100vh', color: slate, paddingTop: '130px' }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@400;500;600;700&display=swap');
        
        :root {
          --olive: #C5A059;
          --cream: #FDFBF7;
          --slate: #1A1A1A;
          --light-slate: #64748b;
        }

        .hero-title {
          font-family: "Playfair Display", serif;
          color: white;
          font-size: clamp(2rem, 8vw, 4.5rem);
          margin: 0 0 25px 0;
          line-height: 1.1;
          font-weight: 600;
        }

        .responsive-section {
          padding: 80px 5vw;
        }

        .faq-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        @media (max-width: 992px) {
          .faq-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .responsive-section {
            padding: 60px 20px;
          }
          
          .nav-logo-container {
            height: 55px !important;
          }
          
          .hero-container {
            height: 70vh !important;
          }

          .hero-subtitle {
            font-size: 1rem !important;
            margin-bottom: 30px !important;
          }

          .section-title {
            font-size: 2.2rem !important;
          }

          .boutique-grid {
            grid-template-columns: 1fr !important;
          }

          .philosophy-card {
            padding: 2rem !important;
          }

          .mobile-center {
            text-align: center !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .mobile-nav {
            height: 70px !important;
          }
          
          div[style*="paddingTop: '130px'"] {
            padding-top: 80px !important;
          }
        }

        .hover-lift-soft:hover { transform: translateY(-8px); }
        .hover-lift:hover { transform: translateY(-4px); transition: transform 0.2s; }
        .btn-primary { background-color: var(--olive); color: white; transition: all 0.3s; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-2px); }

        .mobile-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 1900;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        }
        .mobile-menu-overlay.active {
          opacity: 1;
          visibility: visible;
        }

        .hide-mobile { display: flex; }
        .hide-desktop { display: none; }

        @media (max-width: 992px) {
          .hide-mobile { display: none !important; }
          .hide-desktop { display: block !important; }
        }

        .mobile-menu-drawer {
          position: fixed;
          top: 0;
          right: -100%;
          width: 80%;
          max-width: 300px;
          height: 100vh;
          background: white;
          z-index: 2000;
          transition: 0.4s ease;
          box-shadow: -10px 0 30px rgba(0,0,0,0.1);
          padding: 80px 30px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .mobile-menu-drawer.active {
          right: 0;
        }

        /* Improved Tabs for Mobile - Stacked as requested */
        @media (max-width: 600px) {
          .category-tabs-container {
            flex-direction: column !important;
            flex-wrap: nowrap !important;
            overflow-x: visible !important;
            gap: 12px !important;
            padding-bottom: 20px !important;
          }
          .category-tab-btn {
            width: 100% !important;
            text-align: center !important;
            flex: none !important;
            font-size: 1rem !important;
            padding: 12px !important;
          }
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <Link to="/inicio" onClick={(e) => handleMobileMenuClick(e, 'inicio')} style={{ color: slate, fontWeight: 600, fontSize: '1.3rem', textDecoration: 'none', display: 'block', width: '100%', padding: '5px 0' }}>Inicio</Link>
          <Link to="/inicio#servicios" onClick={(e) => handleMobileMenuClick(e, 'servicios')} style={{ color: slate, fontWeight: 600, fontSize: '1.3rem', textDecoration: 'none', display: 'block', width: '100%', padding: '5px 0' }}>Servicios</Link>
          <Link to="/inicio#productos" onClick={(e) => handleMobileMenuClick(e, 'productos')} style={{ color: slate, fontWeight: 600, fontSize: '1.3rem', textDecoration: 'none', display: 'block', width: '100%', padding: '5px 0' }}>Productos</Link>
          <Link to="/inicio#academia" onClick={(e) => handleMobileMenuClick(e, 'academia')} style={{ color: slate, fontWeight: 600, fontSize: '1.3rem', textDecoration: 'none', display: 'block', width: '100%', padding: '5px 0' }}>Academia</Link>
          <Link to="/inicio#experiencias" onClick={(e) => handleMobileMenuClick(e, 'experiencias')} style={{ color: slate, fontWeight: 600, fontSize: '1.3rem', textDecoration: 'none', display: 'block', width: '100%', padding: '5px 0' }}>Experiencias</Link>
          <Link to="/inicio#testimonios" onClick={(e) => handleMobileMenuClick(e, 'testimonios')} style={{ color: slate, fontWeight: 600, fontSize: '1.3rem', textDecoration: 'none', display: 'block', width: '100%', padding: '5px 0' }}>Testimonios</Link>
          <Link to="/inicio#faq" onClick={(e) => handleMobileMenuClick(e, 'faq')} style={{ color: slate, fontWeight: 600, fontSize: '1.3rem', textDecoration: 'none', display: 'block', width: '100%', padding: '5px 0' }}>Preguntas</Link>
          <Link to="/inicio#ubicacion" onClick={(e) => handleMobileMenuClick(e, 'ubicacion')} style={{ color: slate, fontWeight: 600, fontSize: '1.3rem', textDecoration: 'none', display: 'block', width: '100%', padding: '5px 0' }}>Ubicación</Link>
          <Link to="/inicio#contacto" onClick={(e) => handleMobileMenuClick(e, 'contacto')} style={{ color: slate, fontWeight: 600, fontSize: '1.3rem', textDecoration: 'none', display: 'block', width: '100%', padding: '5px 0' }}>Contacto</Link>
        </div>
      </div>

      {/* Navbar Minimalist with Shrink Effect */}
      <nav className="mobile-nav" style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.98)', 
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
          <div className="nav-logo-container" style={{ height: scrolled ? '55px' : '90px', transition: 'height 0.4s ease' }}>
            <Link to="/inicio" style={{ display: 'block', height: '100%' }}>
              <img src={config?.imageUrl || spaLogo} alt="Logo" style={{ height: '100%', width: 'auto', objectFit: 'contain' }} />
            </Link>
          </div>
          
          <div className="hide-mobile" style={{ display: 'flex', gap: scrolled ? '15px' : '25px', alignItems: 'center', transition: 'all 0.4s ease' }}>
            <Link to={location.pathname === '/inicio' || location.pathname === '/' ? '#inicio' : '/inicio'} onClick={(e) => { if (location.pathname === '/inicio' || location.pathname === '/') { e.preventDefault(); scrollToSection('inicio'); } }} style={{ color: slate, fontWeight: 600, textDecoration: 'none', fontSize: scrolled ? '0.85rem' : '1.1rem' }}>Inicio</Link>
            <Link to={location.pathname === '/inicio' || location.pathname === '/' ? '#servicios' : '/inicio#servicios'} onClick={(e) => { if (location.pathname === '/inicio' || location.pathname === '/') { e.preventDefault(); scrollToSection('servicios'); } }} style={{ color: slate, fontWeight: 600, textDecoration: 'none', fontSize: scrolled ? '0.85rem' : '1.1rem' }}>Servicios</Link>
            <Link to={location.pathname === '/inicio' || location.pathname === '/' ? '#productos' : '/inicio#productos'} onClick={(e) => { if (location.pathname === '/inicio' || location.pathname === '/') { e.preventDefault(); scrollToSection('productos'); } }} style={{ color: slate, fontWeight: 600, textDecoration: 'none', fontSize: scrolled ? '0.85rem' : '1.1rem' }}>Productos</Link>
            <Link to={location.pathname === '/inicio' || location.pathname === '/' ? '#academia' : '/inicio#academia'} onClick={(e) => { if (location.pathname === '/inicio' || location.pathname === '/') { e.preventDefault(); scrollToSection('academia'); } }} style={{ color: slate, fontWeight: 600, textDecoration: 'none', fontSize: scrolled ? '0.85rem' : '1.1rem' }}>Academia</Link>
            <Link to={location.pathname === '/inicio' || location.pathname === '/' ? '#experiencias' : '/inicio#experiencias'} onClick={(e) => { if (location.pathname === '/inicio' || location.pathname === '/') { e.preventDefault(); scrollToSection('experiencias'); } }} style={{ color: slate, fontWeight: 600, textDecoration: 'none', fontSize: scrolled ? '0.85rem' : '1.1rem' }}>Experiencias</Link>
            <Link to={location.pathname === '/inicio' || location.pathname === '/' ? '#testimonios' : '/inicio#testimonios'} onClick={(e) => { if (location.pathname === '/inicio' || location.pathname === '/') { e.preventDefault(); scrollToSection('testimonios'); } }} style={{ color: slate, fontWeight: 600, textDecoration: 'none', fontSize: scrolled ? '0.85rem' : '1.1rem' }}>Testimonios</Link>
            <Link to={location.pathname === '/inicio' || location.pathname === '/' ? '#faq' : '/inicio#faq'} onClick={(e) => { if (location.pathname === '/inicio' || location.pathname === '/') { e.preventDefault(); scrollToSection('faq'); } }} style={{ color: slate, fontWeight: 600, textDecoration: 'none', fontSize: scrolled ? '0.85rem' : '1.1rem' }}>Preguntas</Link>
            <Link to={location.pathname === '/inicio' || location.pathname === '/' ? '#ubicacion' : '/inicio#ubicacion'} onClick={(e) => { if (location.pathname === '/inicio' || location.pathname === '/') { e.preventDefault(); scrollToSection('ubicacion'); } }} style={{ color: slate, fontWeight: 600, textDecoration: 'none', fontSize: scrolled ? '0.85rem' : '1.1rem' }}>Ubicación</Link>
            <Link to={location.pathname === '/inicio' || location.pathname === '/' ? '#contacto' : '/inicio#contacto'} onClick={(e) => { if (location.pathname === '/inicio' || location.pathname === '/') { e.preventDefault(); scrollToSection('contacto'); } }} style={{ color: slate, fontWeight: 600, textDecoration: 'none', fontSize: scrolled ? '0.85rem' : '1.1rem' }}>Contacto</Link>
          </div>

          <button className="hide-desktop" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ background: 'none', border: 'none', color: slate, cursor: 'pointer', padding: '10px' }}>
            <MenuIcon size={28} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="hero-container" style={{ position: 'relative', height: '100vh', height: '100dvh', overflow: 'hidden', backgroundColor: '#000' }}>
        {config?.heroVideoUrl ? (
          <video 
            autoPlay 
            muted 
            loop 
            playsInline
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              transform: 'translate(-50%, -50%)',
              opacity: 0.6 
            }}
          >
            <source src={config.heroVideoUrl} type="video/mp4" />
          </video>
        ) : (
          (!loading || config?.heroImageUrl) && (
            <img 
              src={config?.heroImageUrl || heroImg} 
              alt="Spa Hero" 
              loading="eager"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} 
            />
          )
        )}
        
        {/* Overlay Gradients for Luxury Feel */}
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)',
          zIndex: 1
        }}></div>

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', textAlign: 'center', zIndex: 2 }}>
          <div className="reveal" style={{ maxWidth: '900px' }}>
            <p style={{ color: olive, textTransform: 'uppercase', letterSpacing: '8px', fontSize: '1rem', fontWeight: 600, marginBottom: '20px' }}>
              {config?.heroTagline || 'Pureza & Bienestar'}
            </p>
            <h1 className="hero-title" style={{ fontFamily: '"Playfair Display", serif', color: 'white', fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', lineHeight: 1.1, marginBottom: '25px', fontWeight: 700 }}>
              {config?.heroTitle || 'Tu refugio de bienestar y belleza'}
            </h1>
            <p className="hero-subtitle" style={{ color: 'rgba(255,255,255,0.9)', fontSize: 'clamp(1rem, 3vw, 1.25rem)', lineHeight: 1.7, marginBottom: '45px', maxWidth: '700px', margin: '0 auto 45px auto', fontFamily: '"Montserrat", sans-serif' }}>
              {config?.heroSubtitle || 'Reconecta con tu esencia a través de tratamientos diseñados para armonizar cuerpo y mente.'}
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => scrollToSection('servicios')} className="btn-luxury" style={{ height: '56px', fontSize: '0.9rem' }}>
                Explorar Tratamientos
              </button>
              <button onClick={() => scrollToSection('productos')} style={{ color: 'white', background: 'transparent', border: '1px solid rgba(255,255,255,0.5)', padding: '0 30px', height: '56px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.3s' }}>
                Nuestra Marca
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }}>
          <div className="preloader-wrapper active" style={{ width: '50px', height: '50px' }}>
            <div className="spinner-layer spinner-green-only">
              <div className="circle-clipper left"><div className="circle"></div></div>
              <div className="gap-patch"><div className="circle"></div></div>
              <div className="circle-clipper right"><div className="circle"></div></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Servicios Section */}
          <section id="servicios" className="responsive-section" style={{ backgroundColor: 'white' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div className="mobile-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '60px', gap: '25px' }}>
                <div className="mobile-center">
                  <h2 className="section-title" style={{ fontFamily: '"Playfair Display", serif', fontSize: '3.5rem', margin: '0 0 15px 0', color: slate }}>{config?.servicesTitle || 'Nuestros Servicios'}</h2>
                  <p style={{ color: lightSlate, maxWidth: '500px', fontSize: '1.1rem', whiteSpace: 'pre-wrap' }}>{config?.servicesSubtitle || 'Rituales botánicos que combinan ciencia avanzada y la pureza de la naturaleza.'}</p>
                </div>
              </div>

              {/* Service Categories Tabs */}
              <div className="category-tabs-container" style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '40px', paddingBottom: '10px' }}>
                {serviceCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveServiceCat(cat)}
                    className="category-tab-btn"
                    style={{
                      padding: '10px 20px',
                      borderRadius: '50px',
                      border: '1px solid',
                      borderColor: activeServiceCat === cat ? olive : '#E5E7EB',
                      backgroundColor: activeServiceCat === cat ? olive : 'transparent',
                      color: activeServiceCat === cat ? 'white' : lightSlate,
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="responsive-grid" style={{ gap: '2.5rem' }}>
                {filteredServicios.map(s => (
                  <div key={s.id} style={{ backgroundColor: '#F9F9F7', borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.3s' }} className="hover-lift-soft">
                    <div style={{ height: '350px', position: 'relative' }}>
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' }}>
                          <ImageIcon size={48} color="#9CA3AF" />
                        </div>
                      )}
                      {s.category && (
                        <span style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: 'rgba(255,255,255,0.9)', padding: '5px 12px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, color: olive }}>
                          {s.category}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ fontFamily: '"Playfair Display", serif', margin: 0, fontSize: '1.8rem' }}>{s.name}</h4>
                        <ImageIcon size={20} color={olive} />
                      </div>
                      <p style={{ color: lightSlate, lineHeight: 1.6, marginBottom: '2rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.desc || s.description || 'Tratamiento personalizado para revitalizar tu piel.'}</p>
                      <Link to={`/servicio/${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: slate, fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
                        Saber más <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Rutina / Productos Section */}
          <section id="productos" className="responsive-section" style={{ backgroundColor: '#F4F3F0' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div className="mobile-center" style={{ marginBottom: '60px' }}>
                <p style={{ textTransform: 'uppercase', letterSpacing: '3px', fontSize: '0.75rem', fontWeight: 600, color: lightSlate, marginBottom: '15px' }}>{config?.productsTagline || 'Cuidado en casa'}</p>
                <h2 className="section-title" style={{ fontFamily: '"Playfair Display", serif', fontSize: '3.5rem', margin: 0, color: olive }}>{config?.productsTitle || 'Acompaña tu Rutina'}</h2>
              </div>

              <div className="boutique-grid" style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem' }}>
                {/* Philosophical block */}
                <div className="philosophy-card" style={{ backgroundColor: '#E9E7E2', padding: '3.5rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', fontStyle: 'italic', marginBottom: '1.5rem', color: olive }}>
                    {config?.philosophyTitle || 'Filosofía Botánica'}
                  </h3>
                  <p style={{ lineHeight: 1.8, color: lightSlate, fontSize: '1.05rem' }}>
                    {config?.philosophyText || 'Nuestros productos son formulados con extractos puros y procesos de bajo impacto ambiental para garantizar la salud de tu piel.'}
                  </p>
                  <div style={{ width: '40px', height: '2px', backgroundColor: olive, marginTop: '2rem', opacity: 0.4 }}></div>
                </div>

                {/* Products grid with category tabs */}
                <div className="responsive-grid" style={{ gap: '2rem', display: 'flex', flexDirection: 'column' }}>
                  {/* Product Categories Tabs */}
                  <div className="category-tabs-container" style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '10px' }}>
                    {productCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveProductCat(cat)}
                        className="category-tab-btn"
                        style={{
                          padding: '8px 16px',
                          borderRadius: '50px',
                          border: '1px solid',
                          borderColor: activeProductCat === cat ? olive : '#E5E7EB',
                          backgroundColor: activeProductCat === cat ? olive : 'white',
                          color: activeProductCat === cat ? 'white' : lightSlate,
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="responsive-grid" style={{ gap: '2rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                    {filteredProductos.map(p => (
                      <div key={p.id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'left' }}>
                        <div style={{ height: '280px', backgroundColor: '#F3F4F6', borderRadius: '4px', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon size={40} color="#D1D5DB" />
                            </div>
                          )}
                          {p.category && (
                            <span style={{ position: 'absolute', top: '15px', left: '15px', backgroundColor: 'white', padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700, borderRadius: '50px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', color: olive }}>
                              {p.category}
                            </span>
                          )}
                        </div>
                        <h5 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.2rem', margin: '0 0 10px 0' }}>{p.name}</h5>
                        <p style={{ fontSize: '0.85rem', color: lightSlate, marginBottom: '2rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.descripcionCorta || p.descripcion || 'Regeneración nocturna intensa.'}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>${p.price?.toLocaleString()}</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Link 
                              to={`/producto/${p.id}`}
                              style={{ backgroundColor: '#F3F4F6', color: slate, padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}
                            >
                              Detalle
                            </Link>
                            <button 
                              onClick={() => addToCartLocal(p)}
                              style={{ backgroundColor: olive, color: 'white', padding: '10px 14px', borderRadius: '6px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                              <ShoppingBag size={16} />
                              <span>Añadir</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Academia Section */}
      <section id="academia" className="responsive-section" style={{ backgroundColor: cream, padding: '120px 5vw' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <p style={{ textTransform: 'uppercase', letterSpacing: '6px', fontSize: '0.85rem', fontWeight: 700, color: olive, marginBottom: '20px' }}>
              {config?.academyTagline || 'EDUCACIÓN & TÉCNICA'}
            </p>
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: 0, color: slate, lineHeight: 1.1 }}>
              {config?.academyTitle || 'Academia Andrea Cardona'}
            </h2>
            <p style={{ color: lightSlate, maxWidth: '700px', margin: '30px auto 0 auto', fontSize: '1.15rem', lineHeight: 1.8 }}>
              {config?.academySubtitle || 'Comparte el secreto del bienestar orgánico. Programas de formación profesional en técnicas estéticas avanzadas y cuidado botánico.'}
            </p>
          </div>

          <div className="responsive-grid" style={{ gap: '3rem' }}>
            {courses.length > 0 ? (
              courses.map(course => (
                <div key={course.id} style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', transition: 'all 0.4s ease' }} className="hover-lift-soft">
                  <div style={{ height: '300px', position: 'relative' }}>
                    {course.imageUrl ? (
                      <img src={course.imageUrl} alt={course.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' }}>
                        <ImageIcon size={48} color="#D1D5DB" />
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: olive, color: 'white', padding: '6px 15px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>
                      {course.modality || 'Presencial'}
                    </div>
                  </div>
                  <div style={{ padding: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <h4 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.8rem', margin: 0, color: slate }}>{course.name}</h4>
                    </div>
                    <p style={{ color: lightSlate, lineHeight: 1.7, fontSize: '1rem', marginBottom: '2.5rem', minHeight: '80px' }}>
                      {course.desc || 'Aprende las técnicas más exclusivas del sector estético de la mano de profesionales.'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6', paddingTop: '1.5rem' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: lightSlate, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Inversión</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: olive }}>${course.price?.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <Link 
                          to={`/curso/${course.id}`}
                          style={{ 
                            backgroundColor: '#F3F4F6', 
                            color: slate, 
                            padding: '12px 20px', 
                            borderRadius: '4px', 
                            fontSize: '0.85rem', 
                            fontWeight: 600, 
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'all 0.3s'
                          }}
                          className="hover-lift"
                        >
                          Ver Detalle
                        </Link>
                        <button 
                          onClick={() => { setSelectedCourse(course); setLeadModalOpen(true); }}
                          className="btn-luxury" 
                          style={{ padding: '12px 25px', fontSize: '0.85rem' }}
                        >
                          Inscribirme
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: lightSlate }}>
                <p>Próximamente nuevos cursos disponibles.</p>
              </div>
            )}
          </div>
        </div>
      </section>

          {/* Experiencias Section */}
          <section id="experiencias" className="responsive-section" style={{ backgroundColor: '#F9F8F6', padding: '100px 5vw' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                <p style={{ textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.8rem', fontWeight: 700, color: olive, marginBottom: '15px' }}>
                  {config?.experienciasTagline || 'VIVE LA EXPERIENCIA'}
                </p>
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', margin: 0, color: slate }}>
                  {config?.experienciasTitle || 'Momentos de Bienestar'}
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                {(config?.experienciasItems || [
                  { title: 'Rituales Faciales', text: 'Tratamientos personalizados con activos botánicos.', imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800' },
                  { title: 'Masajes Holísticos', text: 'Equilibrio perfecto entre cuerpo, mente y espíritu.', imageUrl: 'https://images.unsplash.com/photo-1544161515-4ae6ce6ea8a8?auto=format&fit=crop&q=80&w=800' },
                  { title: 'Cuidado Corporal', text: 'Exfoliaciones e hidrataciones profundas con sales naturales.', imageUrl: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&q=80&w=800' }
                ]).map((exp, idx) => (
                  <div key={idx} style={{ position: 'relative', height: '450px', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }} className="hover-lift-soft">
                    <img src={exp.imageUrl} alt={exp.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s' }} 
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} 
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px 30px', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)', color: 'white' }}>
                      <h4 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.6rem', marginBottom: '10px' }}>{exp.title}</h4>
                      <p style={{ fontSize: '0.95rem', opacity: 0.9, lineHeight: 1.5 }}>{exp.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonios Section */}
          <section id="testimonios" className="responsive-section" style={{ backgroundColor: 'white', padding: '120px 5vw' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                <p style={{ textTransform: 'uppercase', letterSpacing: '6px', fontSize: '0.85rem', fontWeight: 700, color: olive, marginBottom: '20px' }}>{config?.testimoniosTagline || 'Testimonios Reales'}</p>
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: 0, color: slate, lineHeight: 1.1 }}>{config?.testimoniosTitle || 'Experiencias que Inspiran'}</h2>
              </div>

              <div className="responsive-grid" style={{ gap: '3rem' }}>
                {(config?.testimoniosItems || [
                  {
                    name: "Lucía Méndez",
                    text: "La limpieza facial profunda cambió mi piel por completo. La atención es impecable y los productos orgánicos se sienten increíbles.",
                    role: "Cliente Frecuente",
                    rating: 5,
                    color: '#F9F7F2'
                  },
                  {
                    name: "Carlos Rodríguez",
                    text: "El masaje relajante es de otro mundo. Salí como nuevo. Definitivamente el mejor SPA de la ciudad para desconectarse.",
                    role: "Empresario",
                    rating: 5,
                    color: '#F4F3F0'
                  },
                  {
                    name: "Marta Gómez",
                    text: "Me encanta la filosofía botánica. Se nota que usan ingredientes puros. Mi rutina de skincare ahora es 100% Andrea Cardona.",
                    role: "Influencer de Estilo",
                    rating: 5,
                    color: '#F9F7F2'
                  }
                ]).map((t, i) => (
                  <div key={i} style={{ 
                    backgroundColor: t.color || '#F9F7F2', 
                    padding: '4rem 3rem', 
                    borderRadius: '4px', 
                    position: 'relative',
                    transition: 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)'
                  }} className="hover-lift-soft">
                    <Quote size={60} color={olive} style={{ opacity: 0.07, position: 'absolute', top: '30px', right: '30px' }} />
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '30px' }}>
                      {[...Array(t.rating || 5)].map((_, i) => <Star key={i} size={14} fill={olive} color={olive} />)}
                    </div>
                    <p style={{ fontSize: '1.2rem', fontStyle: 'italic', color: slate, lineHeight: 1.8, marginBottom: '35px', fontFamily: '"Playfair Display", serif' }}>"{t.text}"</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ width: '40px', height: '1px', backgroundColor: olive, opacity: 0.4 }}></div>
                      <div>
                        <h5 style={{ margin: '0 0 5px 0', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.85rem' }}>{t.name}</h5>
                        <span style={{ fontSize: '0.75rem', color: lightSlate, textTransform: 'uppercase', letterSpacing: '1px' }}>{t.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section id="faq" className="responsive-section" style={{ backgroundColor: '#FDFBF7', padding: '120px 5vw', borderTop: '1px solid #F3F4F6' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
                <div className="mobile-center" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
                  <p style={{ color: olive, textTransform: 'uppercase', letterSpacing: '6px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '20px' }}>{config?.faqTagline || 'Resolviendo tus dudas'}</p>
                  <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', margin: '0 0 30px 0', color: slate, lineHeight: 1.1 }}>{config?.faqTitle || 'Preguntas Frecuentes'}</h2>
                  <p style={{ color: lightSlate, fontSize: '1.15rem', lineHeight: 1.8, margin: '0 auto' }}>
                    {config?.faqSubtitle || 'Queremos que tu experiencia sea perfecta desde el primer momento. Aquí resolvemos las inquietudes más comunes de nuestros clientes.'}
                  </p>
                </div>
                
                <div className="faq-grid" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
                  gap: '30px',
                  width: '100%'
                }}>
                  {(config?.faqItems || [
                    { q: "¿Cómo puedo agendar una cita?", a: "Puedes agendar fácilmente a través de nuestro botón de WhatsApp o llamándonos directamente. Recomendamos hacerlo con al menos 48 horas de antelación para asegurar tu espacio preferido." },
                    { q: "¿Qué debo llevar a mi sesión?", a: "Solo tu deseo de relajarte. Nosotros proporcionamos batas, toallas de alta calidad y todo lo necesario para que tu ritual de bienestar sea completo y sin preocupaciones." },
                    { q: "¿Tienen certificados de regalo?", a: "Sí, contamos con Gift Cards personalizadas y experiencias empaquetadas para que puedas regalar un momento inolvidable a tus seres queridos." },
                    { q: "¿Cuáles son sus métodos de pago?", a: "Aceptamos efectivo, transferencias bancarias y todas las tarjetas de crédito o débito a través de nuestra pasarela de pagos segura." },
                    { q: "¿Puedo cancelar o reprogramar?", a: "Entendemos que los planes cambian. Agradecemos que cualquier cambio se notifique con al menos 24 horas de antelación para permitir que otros clientes puedan disfrutar del espacio." }
                  ]).map((item, idx) => (
                    <div key={idx} style={{ 
                      backgroundColor: item.color || 'white', 
                      padding: '40px', 
                      borderRadius: '12px', 
                      boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
                      border: item.color ? 'none' : '1px solid #F1F1F1',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '15px'
                    }} className="hover-lift">
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: '1.3rem', 
                        color: slate, 
                        fontWeight: 600, 
                        fontFamily: '"Playfair Display", serif',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '15px'
                      }}>
                        <span style={{ 
                          color: olive, 
                          fontSize: '0.9rem', 
                          fontWeight: 700, 
                          backgroundColor: 'rgba(197, 160, 89, 0.1)', 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </span> 
                        {item.q}
                      </h4>
                      <p style={{ 
                        margin: 0, 
                        color: lightSlate, 
                        lineHeight: 1.8, 
                        fontSize: '1rem',
                        paddingLeft: '47px'
                      }}>
                        {item.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          {/* Nueva Sección de Ubicación Premium */}
          <section id="ubicacion" className="responsive-section" style={{ backgroundColor: '#FDFBF7', padding: '120px 5vw' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '80px', alignItems: 'center' }}>
                <div className="reveal" style={{ position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', 
                    top: '-40px', 
                    left: '-20px', 
                    width: '100px', 
                    height: '100px', 
                    backgroundColor: 'rgba(197, 160, 89, 0.05)', 
                    borderRadius: '50%', 
                    zIndex: 0 
                  }}></div>
                  
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <p style={{ color: olive, textTransform: 'uppercase', letterSpacing: '6px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '20px' }}>{config?.locationTagline || 'Encuentra tu Santuario'}</p>
                    <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2.5rem, 5vw, 4rem)', margin: '0 0 40px 0', color: slate, lineHeight: 1.1 }}>{config?.locationTitle || 'Donde el tiempo se detiene'}</h2>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
                      <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
                        <div style={{ width: '45px', height: '45px', border: `1px solid ${olive}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ImageIcon size={20} color={olive} />
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 600, color: slate }}>Nuestra Dirección</h4>
                          <p style={{ margin: 0, color: lightSlate, fontSize: '1.05rem', lineHeight: 1.6 }}>{config?.address || 'Carrera 9 # 10-25, Chinchiná, Caldas'}</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
                        <div style={{ width: '45px', height: '45px', border: `1px solid ${olive}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Clock size={20} color={olive} />
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 600, color: slate }}>Horarios de Bienestar</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <p style={{ margin: 0, color: lightSlate, fontSize: '1.05rem' }}>Lunes a Viernes: 8:00 AM — 7:00 PM</p>
                            <p style={{ margin: 0, color: lightSlate, fontSize: '1.05rem' }}>Sábados: 9:00 AM — 6:00 PM</p>
                            <p style={{ margin: 0, color: olive, fontSize: '1.05rem', fontWeight: 600, marginTop: '5px' }}>Domingos & Festivos: Cita Previa</p>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
                        <div style={{ width: '45px', height: '45px', border: `1px solid ${olive}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Phone size={20} color={olive} />
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 600, color: slate }}>Reservas & Consultas</h4>
                          <p style={{ margin: 0, color: lightSlate, fontSize: '1.05rem' }}>{config?.phone || '315 521 7625'}</p>
                          <p style={{ margin: 0, color: lightSlate, fontSize: '0.9rem', opacity: 0.8 }}>Respuesta inmediata vía WhatsApp</p>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '50px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <a 
                        href={`https://wa.me/57${(config?.phone || '3155217625').replace(/\s/g, '')}`} 
                        className="btn-luxury" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', textDecoration: 'none', padding: '0 40px' }}
                      >
                        Agendar Ritual
                      </a>
                    </div>
                  </div>
                </div>
                
                <div style={{ position: 'relative', padding: '20px' }}>
                  {/* Decorative Frame */}
                  <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    right: 0, 
                    width: '90%', 
                    height: '90%', 
                    border: `1px solid ${olive}`, 
                    opacity: 0.2,
                    zIndex: 0
                  }}></div>
                  <div style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    left: 0, 
                    width: '90%', 
                    height: '90%', 
                    border: `1px solid ${olive}`, 
                    opacity: 0.2,
                    zIndex: 0
                  }}></div>
                  
                  <div style={{ 
                    position: 'relative', 
                    zIndex: 1, 
                    borderRadius: '4px', 
                    overflow: 'hidden', 
                    boxShadow: '0 30px 60px rgba(0,0,0,0.12)',
                    backgroundColor: 'white'
                  }}>
                    <GoogleMapsSection address={config?.address} height="600px" borderRadius="4px" />
                  </div>
                  
                  {/* Floating Info Tag */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '30px', 
                    left: '30px', 
                    backgroundColor: 'white', 
                    padding: '20px 30px', 
                    borderRadius: '4px', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    zIndex: 2
                  }} className="map-tag-responsive">
                    <p style={{ margin: 0, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '3px', color: olive, fontWeight: 700, marginBottom: '5px' }}>{config?.locationCity || 'Chinchiná, Caldas'}</p>
                    <p style={{ margin: 0, fontSize: '1rem', fontFamily: '"Playfair Display", serif' }}>{config?.locationLabel || 'Visítanos hoy'}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <footer id="contacto" style={{ backgroundColor: '#EBEAE6', padding: '80px 5vw 40px 5vw' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '50px' }}>
          <div>
            <h4 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.5rem', margin: '0 0 15px 0', color: slate }}>
              {config?.spaName || 'Andrea Cardona SPA'}
            </h4>
            <p style={{ color: lightSlate, fontSize: '0.85rem', maxWidth: '300px', textTransform: 'uppercase', lineHeight: 1.6, marginBottom: '20px' }}>
              {config?.address || 'EL ARTE DEL BIENESTAR ORGÁNICO. CALLE PRINCIPAL #123, EDIFICIO ZEN.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link to="#academia" onClick={(e) => { e.preventDefault(); scrollToSection('academia'); }} style={{ color: lightSlate, fontSize: '0.85rem', textDecoration: 'none', textTransform: 'uppercase' }}>Academia</Link>
                <Link to="#testimonios" onClick={(e) => { e.preventDefault(); scrollToSection('testimonios'); }} style={{ color: lightSlate, fontSize: '0.85rem', textDecoration: 'none', textTransform: 'uppercase' }}>Experiencias</Link>
                <Link to="#faq" onClick={(e) => { e.preventDefault(); scrollToSection('faq'); }} style={{ color: lightSlate, fontSize: '0.85rem', textDecoration: 'none', textTransform: 'uppercase' }}>Preguntas Frecuentes</Link>
            </div>
          </div>

          <div>
             <h5 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Contacto</h5>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <a href={`tel:${config?.phone}`} style={{ color: lightSlate, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <Phone size={16} color={olive} /> {config?.phone || '315 521 7625'}
                </a>
                <a href={`mailto:${config?.email}`} style={{ color: lightSlate, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <Mail size={16} color={olive} /> {config?.email || 'hola@andreacardonaspa.com'}
                </a>
             </div>
             
             {/* Ubicación Texto Minimalista */}
             <div style={{ marginTop: '30px' }}>
               <h5 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Visítanos</h5>
               <p style={{ color: lightSlate, fontSize: '0.9rem', lineHeight: 1.6 }}>{config?.address || 'Carrera 9 # 10-25, Chinchiná, Caldas'}</p>
             </div>
          </div>

          <div>
             <h5 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Redes Sociales</h5>
             <div style={{ display: 'flex', gap: '20px' }}>
                {config?.instagram && <a href={config.instagram} target="_blank" rel="noreferrer" style={{ color: lightSlate, textDecoration: 'none' }}>Instagram</a>}
                {config?.facebook && <a href={config.facebook} target="_blank" rel="noreferrer" style={{ color: lightSlate, textDecoration: 'none' }}>Facebook</a>}
             </div>
          </div>

          <div>
             <h5 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Legal</h5>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => setLegalModal({ open: true, title: 'Política de Privacidad', content: 'En Andrea Cardona SPA, la privacidad de nuestros clientes es prioridad. Los datos recolectados (nombre, teléfono, correo) se utilizan exclusivamente para la gestión de citas y pedidos de productos, garantizando su seguridad en nuestros servidores cifrados de Firebase.' })} style={{ background: 'none', border: 'none', color: lightSlate, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', padding: 0 }}>Privacidad</button>
                <button onClick={() => setLegalModal({ open: true, title: 'Términos y Condiciones', content: 'Todas las citas reservadas requieren puntualidad. En caso de cancelación, agradecemos notificar con 24 horas de antelación. Los productos físicos entregados cuentan con garantía por defectos de fábrica. Los resultados de los tratamientos pueden variar según el tipo de piel y el cuidado posterior recomendado.' })} style={{ background: 'none', border: 'none', color: lightSlate, fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', padding: 0 }}>Términos</button>
             </div>
          </div>
        </div>
        
        <div style={{ maxWidth: '1400px', margin: '60px auto 0 auto', borderTop: '1px solid #D1D5DB', paddingTop: '30px', textAlign: 'center' }}>
          <div style={{ color: lightSlate, fontSize: '0.8rem' }}>
            © {new Date().getFullYear()} {config?.spaName?.toUpperCase() || 'ANDREA CARDONA SPA'} • EL ARTE DEL BIENESTAR ORGÁNICO
          </div>
        </div>
      </footer>

      {/* Legal Modal Content */}
      {legalModal.open && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ backgroundColor: 'white', width: '100%', maxWidth: '500px', borderRadius: '20px', padding: '40px', position: 'relative' }}>
               <button onClick={() => setLegalModal({ ...legalModal, open: false })} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={24} color={lightSlate} />
               </button>
               <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.8rem', color: olive, marginTop: 0 }}>{legalModal.title}</h3>
               <p style={{ color: lightSlate, lineHeight: 1.7, fontSize: '1rem' }}>{legalModal.content}</p>
               <button onClick={() => setLegalModal({ ...legalModal, open: false })} style={{ width: '100%', marginTop: '30px', backgroundColor: olive, color: 'white', border: 'none', borderRadius: '8px', padding: '15px', fontWeight: 600, cursor: 'pointer' }}>Entendido</button>
            </div>
         </div>
      )}

      {/* Cart Floating Button */}
      {cartCount > 0 && (
         <div onClick={() => { setSelectedItem(null); setCartOpen(true); }} style={{ position: 'fixed', bottom: '90px', right: '30px', backgroundColor: olive, color: 'white', borderRadius: '50px', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 1000, fontWeight: 600 }} className="hover-lift">
            <ShoppingBag size={24} /> 
            <span style={{ backgroundColor: 'white', color: olive, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
              {cartCount}
            </span>
         </div>
      )}

      {/* Floating WhatsApp Button */}
      <a href="https://wa.me/573155217625?text=Hola,%20tengo%20una%20duda%20sobre%20el%20SPA." target="_blank" rel="noreferrer" style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#25D366', color: 'white', borderRadius: '50px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', boxShadow: '0 10px 25px rgba(37, 211, 102, 0.3)', zIndex: 1000, fontWeight: 500, fontSize: '0.95rem' }} className="hover-lift">
         <MessageCircle size={22} /> <span className="hide-mobile">¿Dudas? Escríbenos</span>
      </a>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { from {transform: rotate(0deg);} to {transform: rotate(360deg);} }
      `}} />

      {cartOpen && (
         <CheckoutModal 
           selectedItem={selectedItem} 
           cartItems={cart}
           setCart={setCart}
           onClose={() => setCartOpen(false)} 
         />
      )}

      <LeadCaptureModal 
        isOpen={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        onSubmit={handleSubmitLead}
        leadData={leadData}
        setLeadData={setLeadData}
        isSubmitting={isSubmittingLead}
        courseName={selectedCourse?.name}
      />
    </div>
  );
};

export default Landing;
