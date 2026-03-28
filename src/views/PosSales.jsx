import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ShoppingCart, Plus, Minus, Search, CheckCircle2, DollarSign, Package, Trash2 } from 'lucide-react';

const PosSales = () => {
  const [productos, setProductos] = useState([]);
  const [posCart, setPosCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [clientName, setClientName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const darkOlive = '#4a5d23';
  const lightColor = '#f9fafb';

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'productos'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductos(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const addToCart = (product) => {
    const stockAvailable = Number(product.stock) || 0;
    if (stockAvailable <= 0) {
      window.M?.toast({ html: 'Producto sin stock', classes: 'red rounded' });
      return;
    }
    
    setPosCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty + 1 > stockAvailable) {
           window.M?.toast({ html: 'Stock máximo alcanzado', classes: 'orange rounded' });
           return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setPosCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateCartQty = (productId, delta) => {
    setPosCart(prev => prev.map(item => {
      if (item.id === productId) {
        const productData = productos.find(p => p.id === productId);
        const maxStock = productData ? Number(productData.stock) : 0;
        const newQty = item.qty + delta;
        
        if (newQty < 1) return item;
        if (newQty > maxStock) {
           window.M?.toast({ html: 'Stock máximo alcanzado', classes: 'orange rounded' });
           return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const filteredProducts = productos.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPrice = posCart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const handleProcessSale = async () => {
    if (posCart.length === 0) {
      window.M?.toast({ html: 'El carrito está vacío', classes: 'red rounded' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Registrar Venta
      const payload = {
        type: 'pos',
        clientName: clientName || 'Cliente Mostrador',
        paymentMethod,
        amount: totalPrice,
        status: 'Confirmada - POS',
        itemName: 'Venta Directa',
        cartItems: posCart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'pedidos'), payload);

      // Descontar Stock
      for (const item of posCart) {
        const prodData = productos.find(p => p.id === item.id);
        if (prodData) {
           const newStock = Math.max(0, Number(prodData.stock) - item.qty);
           await updateDoc(doc(db, 'productos', item.id), { stock: newStock.toString() });
        }
      }

      window.M?.toast({ html: 'Venta registrada exitosamente', classes: 'green rounded' });
      setPosCart([]);
      setClientName('');
      setPaymentMethod('efectivo');

    } catch (error) {
      console.error(error);
      window.M?.toast({ html: 'Error al registrar la venta', classes: 'red rounded' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '24px', minHeight: 'calc(100vh - 120px)' }}>
      {/* Columna Izquierda: Catálogo de Productos */}
      <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
             <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Punto de Venta</h4>
             <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Registra ventas en el local web restando stock automático</p>
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            className="browser-default"
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', height: '44px', padding: '0 15px 0 40px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', backgroundColor: '#f8fafc', outline: 'none' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
          {loading ? (
             <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Cargando inventario...</div>
          ) : filteredProducts.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No se encontraron productos</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
              {filteredProducts.map(p => {
                 const stock = Number(p.stock) || 0;
                 return (
                  <div key={p.id} onClick={() => addToCart(p)} style={{ 
                    border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', cursor: stock > 0 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s', backgroundColor: 'white', opacity: stock > 0 ? 1 : 0.6
                  }} onMouseEnter={e => stock > 0 && (e.currentTarget.style.borderColor = darkOlive)} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                    <div style={{ height: '120px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }} />
                      ) : (
                        <Package size={32} color="#cbd5e1" />
                      )}
                    </div>
                    <div style={{ padding: '12px' }}>
                      <h6 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h6>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: darkOlive }}>${p.price?.toLocaleString()}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: stock > 0 ? '#64748b' : '#ef4444', backgroundColor: stock > 0 ? '#f1f5f9' : '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
                          Stock: {stock}
                        </span>
                      </div>
                    </div>
                  </div>
                 )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Carrito */}
      <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc', borderLeft: '1px solid #e2e8f0' }}>
         <h5 style={{ margin: '0 0 20px 0', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={22} color={darkOlive} /> Detalle de Venta
         </h5>

         <div style={{ flex: 1, overflowY: 'auto' }}>
            {posCart.length === 0 ? (
               <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  <Package size={48} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>El carrito está vacío</p>
               </div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {posCart.map(item => (
                    <div key={item.id} style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', position: 'relative' }}>
                       <button onClick={() => removeFromCart(item.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>
                         <Trash2 size={16} />
                       </button>
                       <h6 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', paddingRight: '20px' }}>{item.name}</h6>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontWeight: 700, color: darkOlive }}>${(item.price * item.qty).toLocaleString()}</span>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
                           <button onClick={() => updateCartQty(item.id, -1)} style={{ background: 'white', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}><Minus size={14} /></button>
                           <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '20px', textAlign: 'center' }}>{item.qty}</span>
                           <button onClick={() => updateCartQty(item.id, 1)} style={{ background: 'white', border: 'none', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}><Plus size={14} /></button>
                         </div>
                       </div>
                    </div>
                 ))}
               </div>
            )}
         </div>

         {/* Zona de Resumen */}
         <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '20px', marginTop: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
               <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '5px' }}>Nombre del Cliente (Opcional)</label>
               <input type="text" className="browser-default" placeholder="Ej. Cliente Mostrador" value={clientName} onChange={e => setClientName(e.target.value)} style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.9rem' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
               <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Método de Pago</label>
               <div style={{ display: 'flex', gap: '8px' }}>
                 {['efectivo', 'nequi', 'tarjeta'].map(m => (
                    <button key={m} onClick={() => setPaymentMethod(m)} style={{ 
                      flex: 1, padding: '8px 0', border: `1px solid ${paymentMethod === m ? darkOlive : '#cbd5e1'}`,
                      borderRadius: '8px', backgroundColor: paymentMethod === m ? '#f0fdf4' : 'white',
                      color: paymentMethod === m ? darkOlive : '#64748b', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize'
                    }}>
                       {m}
                    </button>
                 ))}
               </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Total a pagar</span>
               <span style={{ fontSize: '1.5rem', fontWeight: 800, color: darkOlive }}>${totalPrice.toLocaleString()}</span>
            </div>

            <button 
              onClick={handleProcessSale}
              disabled={isSubmitting || posCart.length === 0}
              style={{ width: '100%', padding: '16px', backgroundColor: posCart.length > 0 ? darkOlive : '#94a3b8', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: (isSubmitting || posCart.length === 0) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
               {isSubmitting ? 'Procesando...' : <><DollarSign size={20} /> Registrar Venta</>}
            </button>
         </div>
      </div>
    </div>
  );
};

export default PosSales;
