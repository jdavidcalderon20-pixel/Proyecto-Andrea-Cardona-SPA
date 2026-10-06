import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('spa_cart');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('spa_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart(prev => {
      const productId = String(product.id);
      const existing = prev.find(item => String(item.id) === productId);
      if (existing) {
        return prev.map(item => String(item.id) === productId ? { ...item, quantity: (Number(item.quantity) || 1) + 1 } : item);
      }
      return [...prev, { ...product, id: productId, quantity: 1 }];
    });
    window.M?.toast({ html: '🛒 Producto agregado', classes: 'green rounded' });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => String(item.id) !== String(id)));
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (String(item.id) === String(id)) {
        const newQty = (Number(item.quantity) || 1) + delta;
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((acc, item) => acc + (Number(item.price || 0) * (Number(item.quantity) || 0)), 0);
  const cartCount = cart.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount, setCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
