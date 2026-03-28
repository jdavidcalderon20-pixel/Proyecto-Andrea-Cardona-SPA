import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import PublicServiceDetail from './pages/PublicServiceDetail';
import PublicProductDetail from './pages/PublicProductDetail';
import { CartProvider } from './context/CartContext';

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/inicio" element={<Landing />} />
          <Route path="/servicio/:id" element={<PublicServiceDetail />} />
          <Route path="/producto/:id" element={<PublicProductDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
