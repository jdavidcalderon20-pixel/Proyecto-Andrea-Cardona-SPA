import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import CheckoutModal from '../components/CheckoutModal';
import { ArrowLeft, Clock, Info, AlertCircle, Heart, Menu as MenuIcon, ChevronLeft, ShoppingBag, MessageCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import spaLogo from '../assets/Logo.jpeg';

const PublicServiceDetail = () => {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  const { cart, cartCount, setCart } = useCart();

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
    const fetchService = async () => {
      try {
        const docRef = doc(db, 'servicios', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setService({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchService();

    const unsubConfig = onSnapshot(doc(db, 'configuracion', 'general'), (doc) => {
      if (doc.exists()) setConfig(doc.data());
    });

    return () => unsubConfig();
  }, [id]);

  const darkOlive = '#4a5d23';

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p>Cargando información del tratamiento...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <h3>Servicio no encontrado</h3>
        <Link to="/inicio" style={{ color: darkOlive, fontWeight: 600, marginTop: '20px' }}>Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: '"Inter", sans-serif', backgroundColor: '#FCFBF8', minHeight: '100vh', color: '#1f2937', paddingTop: '130px' }}>
      
      {/* Navbar Minimalist with Shrink Effect (Consistent) */}
      <nav style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.98)', 
        backdropFilter: 'blur(10px)',
        height: scrolled ? '70px' : '130px', 
        display: 'flex',
        alignItems: 'center',
        padding: '0 5vw', 
        position: 'fixed', 
        top: 0, 
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 1000, 
        borderBottom: '1px solid #F3F4F6', 
        boxShadow: scrolled ? '0 10px 30px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <Link to="/inicio" style={{ height: scrolled ? '55px' : '100px', transition: 'height 0.4s ease', display: 'block' }}>
            <img src={config?.imageUrl || spaLogo} alt="Logo" style={{ height: '100%', width: 'auto', objectFit: 'contain' }} />
          </Link>
          
          <div className="hide-on-small-only" style={{ display: 'flex', gap: scrolled ? '20px' : '25px', alignItems: 'center', transition: 'all 0.4s ease' }}>
            <Link to="/inicio" style={{ color: '#1F2937', fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none', transition: 'all 0.4s' }}>Inicio</Link>
            <Link to="/inicio#servicios" style={{ color: '#1F2937', fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none', transition: 'all 0.4s' }}>Servicios</Link>
            <Link to="/inicio#productos" style={{ color: '#1F2937', fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none', transition: 'all 0.4s' }}>Productos</Link>
            <Link to="/inicio#contacto" style={{ color: '#1F2937', fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none', transition: 'all 0.4s' }}>Contacto</Link>
          </div>

          <button className="hide-on-med-and-up" style={{ background: 'none', border: 'none', color: '#1F2937', cursor: 'pointer' }}>
            <MenuIcon size={28} />
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 5vw 100px 5vw' }}>
        <Link to="/inicio" style={{ textDecoration: 'none', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, marginBottom: '30px' }}>
          <ChevronLeft size={20} /> <span className="hide-on-small-only">Volver al catálogo</span>
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px' }}>
          
          {/* Imagen de Servicio */}
          <div style={{ flex: '1 1 400px', order: 1 }}>
            <div style={{ width: '100%', height: '500px', backgroundColor: '#e2e8f0', borderRadius: '30px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
              {service.imageUrl ? (
                <img src={service.imageUrl} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
                  No Image Available
                </div>
              )}
            </div>
          </div>

          {/* Información del Tratamiento */}
          <div style={{ flex: '1 1 400px', order: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 4vw, 3rem)', color: darkOlive, margin: '0 0 15px 0', lineHeight: 1.1 }}>
              {service.name}
            </h1>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827' }}>
                ${service.price?.toLocaleString()}
              </span>
              {service.duration && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#6b7280', fontSize: '0.95rem' }}>
                  <Clock size={18} /> {service.duration} min
                </span>
              )}
            </div>

            <p style={{ fontSize: '1.05rem', color: '#4b5563', lineHeight: 1.6, marginBottom: '30px', fontWeight: 400 }}>
              {service.detailedDescription || service.description || 'Este es uno de nuestros tratamientos insignia. Diseñado para ofrecerte una relajación profunda y resultados visibles. Permítete desconectar de la rutina y darle a tu piel el cuidado premium que merece.'}
            </p>

            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', marginBottom: '30px' }}>
               <h5 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 15px 0', fontSize: '1.1rem', color: darkOlive, fontWeight: 600 }}>
                 <Info size={20} /> Recomendaciones Previas
               </h5>
               <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                 {service.recommendations || '• Asiste con el rostro limpio y sin maquillaje.\n• Evita la exposición prolongada al sol 24 horas antes.\n• Trae ropa cómoda para que tu experiencia sea totalmente relajante.'}
               </p>
            </div>

            <button onClick={() => { setSelectedItem({ type: 'servicio', item: service }); setCheckoutOpen(true); }} style={{ backgroundColor: darkOlive, color: 'white', border: 'none', borderRadius: '50px', padding: '18px 30px', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(74, 93, 35, 0.25)', transition: 'transform 0.2s' }}>
              <Heart size={20} /> Agendar Experiencia
            </button>
          </div>

        </div>

        {/* Galería de la Experiencia */}
        {service.galleryUrls && service.galleryUrls.length > 0 && (
          <div style={{ marginTop: '80px' }}>
            <h3 style={{ fontFamily: '"Playfair Display", serif', color: darkOlive, fontSize: '2rem', textAlign: 'center', marginBottom: '40px' }}>Galería de la Experiencia</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
              {service.galleryUrls.map((url, idx) => (
                <div key={idx} style={{ height: '300px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                  <img src={url} alt={`${service.name} Galería ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s cursor-pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cart Floating Button */}
      {cartCount > 0 && (
         <div onClick={() => { setSelectedItem(null); setCheckoutOpen(true); }} style={{ position: 'fixed', bottom: '90px', right: '30px', backgroundColor: darkOlive, color: 'white', borderRadius: '50px', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 1000, fontWeight: 600 }} className="hover-lift">
            <ShoppingBag size={24} /> 
            <span style={{ backgroundColor: 'white', color: darkOlive, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
              {cartCount}
            </span>
         </div>
      )}

      {/* Floating WhatsApp Button */}
      <a href="https://wa.me/573155217625?text=Hola,%20tengo%20una%20duda%20sobre%20este%20tratamiento." target="_blank" rel="noreferrer" style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#25D366', color: 'white', borderRadius: '50px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', boxShadow: '0 10px 25px rgba(37, 211, 102, 0.3)', zIndex: 1000, fontWeight: 500, fontSize: '0.95rem' }} className="hover-lift">
         <MessageCircle size={22} /> <span className="hide-on-small-only">¿Dudas? Escríbenos</span>
      </a>

      {checkoutOpen && (
        <CheckoutModal 
          selectedItem={selectedItem}
          cartItems={cart}
          setCart={setCart}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </div>
  );
};

export default PublicServiceDetail;
