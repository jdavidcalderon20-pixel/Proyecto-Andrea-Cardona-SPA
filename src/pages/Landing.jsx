import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import CheckoutModal from '../components/CheckoutModal';
import { ShoppingBag, MessageCircle, Menu as MenuIcon, ArrowRight, Image as ImageIcon, Mail, Phone, Clock, ShieldCheck, X } from 'lucide-react';
import spaLogo from '../assets/Logo.jpeg';
import { useCart } from '../context/CartContext';
// Hero image generated for the redesign
const heroImg = "file:///C:/Users/Usuario/.gemini/antigravity/brain/a4a5d8ae-ea61-4272-b061-250a5dcfb8c5/spa_hero_organic_zen_1774724722686.png";

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

  const { cart, addToCart, cartCount, setCart } = useCart();

  useEffect(() => {
    const unsubServicios = onSnapshot(collection(db, 'servicios'), (snapshot) => {
      const servData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setServicios(servData);
    });

    const unsubProductos = onSnapshot(collection(db, 'productos'), (snapshot) => {
      const prodData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductos(prodData);
    });

    const unsubConfig = onSnapshot(doc(db, 'configuracion', 'general'), (doc) => {
      if (doc.exists()) {
        setConfig(doc.data());
      }
      setLoading(false);
    });

    return () => { unsubServicios(); unsubProductos(); unsubConfig(); };
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
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    // Open cart modal after adding
    setSelectedItem(null);
    setCartOpen(true);
  };

  const openCheckout = (item, type) => {
    setSelectedItem({ item, type });
    setCartOpen(true);
  };

  const olive = '#4A5D23';
  const cream = '#FCFBF8';
  const slate = '#1F2937';
  const lightSlate = '#6B7280';

  return (
    <div style={{ fontFamily: '"Inter", sans-serif', backgroundColor: '#FFFFFF', minHeight: '100vh', color: slate, paddingTop: '130px' }}>
      
      {/* Navbar Minimalist with Shrink Effect */}
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
          <div style={{ height: scrolled ? '55px' : '100px', transition: 'height 0.4s ease' }}>
            <img src={config?.imageUrl || spaLogo} alt="Logo" style={{ height: '100%', width: 'auto', objectFit: 'contain' }} />
          </div>
          
          <div className="hide-on-small-only" style={{ display: 'flex', gap: scrolled ? '20px' : '25px', alignItems: 'center', transition: 'all 0.4s ease' }}>
            <a href="#inicio" style={{ color: slate, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none', transition: 'all 0.4s' }}>Inicio</a>
            <a href="#servicios" style={{ color: slate, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none', transition: 'all 0.4s' }}>Servicios</a>
            <a href="#productos" style={{ color: slate, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none', transition: 'all 0.4s' }}>Productos</a>
            <a href="#contacto" style={{ color: slate, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none', transition: 'all 0.4s' }}>Contacto</a>
          </div>

          <button className="hide-on-med-and-up" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ background: 'none', border: 'none', color: slate, cursor: 'pointer' }}>
            <MenuIcon size={28} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="inicio" style={{ position: 'relative', height: '85vh', overflow: 'hidden', backgroundColor: '#000' }}>
        <img 
          src={config?.heroImageUrl || heroImg} 
          alt="Spa Zen" 
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7, filter: 'grayscale(10%)' }} 
        />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', textAlign: 'center' }}>
          <div style={{ maxWidth: '850px' }}>
            <p style={{ color: 'white', textTransform: 'uppercase', letterSpacing: '4px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '20px' }}>
              {config?.heroTagline || 'Experiencia Orgánica'}
            </p>
            <h1 style={{ fontFamily: '"Playfair Display", serif', color: 'white', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', margin: '0 0 30px 0', lineHeight: 1.1, fontWeight: 600 }}>
              {config?.heroTitle || 'Tu refugio de bienestar y belleza'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.2rem', lineHeight: 1.6, marginBottom: '40px', maxWidth: '650px', margin: '0 auto 40px auto' }}>
              {config?.heroSubtitle || 'Reconecta con tu esencia a través de tratamientos diseñados para armonizar cuerpo y mente en un entorno de paz absoluta.'}
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="#servicios" style={{ backgroundColor: olive, color: 'white', padding: '16px 36px', borderRadius: '8px', textDecoration: 'none', fontWeight: 500, fontSize: '1rem', transition: 'transform 0.2s' }} className="hover-lift">
                Explorar Tratamientos
              </a>
              <a href="#productos" style={{ color: 'white', padding: '16px 36px', textDecoration: 'none', fontWeight: 500, fontSize: '1rem', borderBottom: '1px solid white' }}>
                Conoce la Marca
              </a>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="preloader-wrapper active"><div className="spinner-layer spinner-green-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
        </div>
      ) : (
        <>
          {/* Servicios Section */}
          <section id="servicios" style={{ padding: '100px 5vw', backgroundColor: 'white' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '60px' }}>
                <div>
                  <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '3rem', margin: '0 0 15px 0', color: slate }}>Nuestros Servicios</h2>
                  <p style={{ color: lightSlate, maxWidth: '500px', fontSize: '1.1rem' }}>Rituales botánicos que combinan ciencia avanzada y la pureza de la naturaleza.</p>
                </div>
                <a href="#servicios" style={{ color: slate, fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #CCC', paddingBottom: '4px' }}>Ver todos los servicios</a>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2.5rem' }}>
                {servicios.slice(0, 4).map(s => (
                  <div key={s.id} style={{ backgroundColor: '#F9F9F7', borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.3s' }} className="hover-lift-soft">
                    <div style={{ height: '350px', position: 'relative' }}>
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' }}>
                          <ImageIcon size={48} color="#9CA3AF" />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ fontFamily: '"Playfair Display", serif', margin: 0, fontSize: '1.8rem' }}>{s.name}</h4>
                        <ImageIcon size={20} color={olive} />
                      </div>
                      <p style={{ color: lightSlate, lineHeight: 1.6, marginBottom: '2rem', height: '3em', overflow: 'hidden' }}>{s.description || 'Tratamiento personalizado para revitalizar tu piel.'}</p>
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
          <section id="productos" style={{ padding: '100px 5vw', backgroundColor: '#F4F3F0' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                <p style={{ textTransform: 'uppercase', letterSpacing: '3px', fontSize: '0.75rem', fontWeight: 600, color: lightSlate, marginBottom: '15px' }}>Cuidado en casa</p>
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '3.5rem', margin: 0, color: olive }}>Acompaña tu Rutina</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem' }}>
                {/* Philosophical block */}
                <div style={{ backgroundColor: '#E9E7E2', padding: '3rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.8rem', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                    {config?.philosophyTitle || 'Filosofía Botánica'}
                  </h3>
                  <p style={{ lineHeight: 1.7, color: lightSlate }}>
                    {config?.philosophyText || 'Nuestros productos son formulados con extractos puros y procesos de bajo impacto ambiental para garantizar la salud de tu piel.'}
                  </p>
                  <div style={{ width: '40px', height: '2px', backgroundColor: olive, marginTop: '2rem' }}></div>
                </div>

                {/* Products grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                  {productos.map(p => (
                    <div key={p.id} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'left' }}>
                      <div style={{ height: '280px', backgroundColor: '#F3F4F6', borderRadius: '4px', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon size={40} color="#D1D5DB" />
                          </div>
                        )}
                        <span style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: 'white', padding: '4px 12px', fontSize: '0.7rem', fontWeight: 700, borderRadius: '50px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>Best Seller</span>
                      </div>
                      <h5 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.2rem', margin: '0 0 10px 0' }}>{p.name}</h5>
                      <p style={{ fontSize: '0.85rem', color: lightSlate, marginBottom: '1.5rem', height: '2.5em', overflow: 'hidden' }}>{p.descripcion || 'Regeneración nocturna intensa.'}</p>
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
                            style={{ backgroundColor: olive, color: 'white', padding: '10px 14px', borderRadius: '6px', border: 'none', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            <ShoppingBag size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
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
          </div>

          <div>
             <h5 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px' }}>Contacto</h5>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <a href={`tel:${config?.phone}`} style={{ color: lightSlate, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <Phone size={16} color={olive} /> {config?.phone || '315 521 7625'}
                </a>
                <a href={`mailto:${config?.email}`} style={{ color: lightSlate, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <Mail size={16} color={olive} /> {config?.email || 'hola@andreacardonaspa.com'}
                </a>
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
         <MessageCircle size={22} /> <span className="hide-on-small-only">¿Dudas? Escríbenos</span>
      </a>

      <style dangerouslySetInnerHTML={{__html: `
        .hover-lift-soft:hover { transform: translateY(-8px); }
        .hover-lift:hover { transform: translateY(-4px); }
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
    </div>
  );
};

export default Landing;
