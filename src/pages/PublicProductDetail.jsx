import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import CheckoutModal from '../components/CheckoutModal';
import { ArrowLeft, ShoppingBag, Info, Sparkles, ChevronLeft, Menu as MenuIcon, MessageCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import spaLogo from '../assets/Logo.jpeg';

const PublicProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { cart, addToCart, cartCount, setCart } = useCart();

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
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, 'productos', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();

    const unsubConfig = onSnapshot(doc(db, 'configuracion', 'general'), (doc) => {
      if (doc.exists()) setConfig(doc.data());
    });

    return () => unsubConfig();
  }, [id]);

  const olive = '#4A5D23';
  const slate = '#1F2937';
  const lightSlate = '#6B7280';

  const handleBuyNow = () => {
    addToCart(product);
    setCheckoutOpen(true);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="preloader-wrapper active"><div className="spinner-layer spinner-green-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <h3 style={{ fontFamily: '"Playfair Display", serif' }}>Producto no encontrado</h3>
        <Link to="/inicio" style={{ color: olive, fontWeight: 600, marginTop: '20px' }}>Volver a la tienda</Link>
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
            <Link to="/inicio" style={{ color: slate, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none', transition: 'all 0.4s' }}>Inicio</Link>
            <Link to="/inicio#servicios" style={{ color: slate, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none', transition: 'all 0.4s' }}>Servicios</Link>
            <Link to="/inicio#productos" style={{ color: slate, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none', transition: 'all 0.4s' }}>Productos</Link>
            <Link to="/inicio#contacto" style={{ color: slate, fontWeight: 600, fontSize: scrolled ? '0.85rem' : '1.1rem', textDecoration: 'none', transition: 'all 0.4s' }}>Contacto</Link>
          </div>

          <button className="hide-on-med-and-up" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ background: 'none', border: 'none', color: slate, cursor: 'pointer' }}>
            <MenuIcon size={28} />
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 5vw 100px 5vw' }}>
        <Link to="/inicio" style={{ textDecoration: 'none', color: lightSlate, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '0.9rem', marginBottom: '30px' }}>
          <ChevronLeft size={20} /> Volver a la colección
        </Link>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '60px', alignItems: 'start' }}>
          
          {/* Image Gallery Side */}
          <div style={{ position: 'sticky', top: '100px' }}>
            <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '30px' }} />
              ) : (
                <ShoppingBag size={80} color="#E5E7EB" />
              )}
            </div>
            {/* Tagline */}
            <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
               <div style={{ flex: 1, backgroundColor: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid #F3F4F6' }}>
                  <Sparkles size={18} color={olive} style={{ marginBottom: '5px' }} />
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Natural</p>
               </div>
               <div style={{ flex: 1, backgroundColor: 'white', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid #F3F4F6' }}>
                  <Info size={18} color={olive} style={{ marginBottom: '5px' }} />
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Botánico</p>
               </div>
            </div>
          </div>

          {/* Details Side */}
          <div>
            <div style={{ marginBottom: '10px' }}>
              <span style={{ color: olive, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px' }}>{product.category}</span>
            </div>
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 'clamp(2rem, 5vw, 3.5rem)', margin: '0 0 20px 0', lineHeight: 1.1 }}>
              {product.name}
            </h1>
            
            <div style={{ fontSize: '2rem', fontWeight: 700, color: slate, marginBottom: '30px' }}>
              ${product.price?.toLocaleString()}
            </div>

            <div style={{ marginBottom: '40px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>Descripción</h4>
              <p style={{ fontSize: '1.05rem', color: lightSlate, lineHeight: 1.7 }}>
                {product.descripcion || 'Este producto ha sido cuidadosamente seleccionado por su pureza y eficacia. Ideal para complementar tu rutina de cuidado personal en casa con la misma calidad que recibes en nuestro SPA.'}
              </p>
            </div>

            {/* Application Tips SECTION */}
            <div style={{ backgroundColor: '#F4F3F0', padding: '30px', borderRadius: '16px', marginBottom: '40px', borderLeft: `4px solid ${olive}` }}>
               <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 700, margin: '0 0 15px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                 <Sparkles size={20} /> Consejos de Aplicación
               </h4>
               <p style={{ color: slate, fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
                 {product.consejos || '• Aplica una pequeña cantidad sobre la zona deseada.\n• Realiza masajes circulares ascendentes para una mejor absorción.\n• Úsalo preferiblemente después de tu ritual de limpieza nocturno.'}
               </p>
            </div>

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <button 
                onClick={handleBuyNow}
                style={{ flex: 1, backgroundColor: olive, color: 'white', border: 'none', borderRadius: '8px', padding: '18px 30px', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(74, 93, 35, 0.2)' }}
              >
                <ShoppingBag size={20} /> Comprar Ahora
              </button>
            </div>
            
            <p style={{ marginTop: '20px', fontSize: '0.85rem', color: lightSlate, textAlign: 'center' }}>
              Envío nacional disponible • Pago seguro contra entrega o transferencia
            </p>
          </div>

        </div>
      </div>

      {/* Cart Floating Button */}
      {cartCount > 0 && (
         <div onClick={() => { setSelectedItem(null); setCheckoutOpen(true); }} style={{ position: 'fixed', bottom: '90px', right: '30px', backgroundColor: olive, color: 'white', borderRadius: '50px', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 1000, fontWeight: 600 }} className="hover-lift">
            <ShoppingBag size={24} /> 
            <span style={{ backgroundColor: 'white', color: olive, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
              {cartCount}
            </span>
         </div>
      )}

      {/* Floating WhatsApp Button */}
      <a href="https://wa.me/573155217625?text=Hola,%20tengo%20una%20duda%20sobre%20este%20producto." target="_blank" rel="noreferrer" style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#25D366', color: 'white', borderRadius: '50px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', boxShadow: '0 10px 25px rgba(37, 211, 102, 0.3)', zIndex: 1000, fontWeight: 500, fontSize: '0.95rem' }} className="hover-lift">
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

export default PublicProductDetail;
