import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, AlertTriangle, Edit2, Trash2, Filter, Camera, Sparkles, Leaf, Droplet, ShoppingBag } from 'lucide-react';
import { getAllDocuments, createDocument, updateDocument, deleteDocument, uploadImage } from '../services/firebaseUtils';

const getCategoryIcon = (category, size = 20) => {
  switch(category) {
    case 'Cosmética': return <Sparkles size={size} color="#db2777" />;
    case 'Suplementos': return <Leaf size={size} color="#16a34a" />;
    case 'Aceites y Esencias': return <Droplet size={size} color="#0284c7" />;
    case 'Accesorios': return <ShoppingBag size={size} color="#d97706" />;
    default: return <Package size={size} color="#475569" />;
  }
};

const getCategoryBg = (category) => {
  switch(category) {
    case 'Cosmética': return '#fce7f3';
    case 'Suplementos': return '#dcfce7';
    case 'Aceites y Esencias': return '#e0f2fe';
    case 'Accesorios': return '#fef3c7';
    default: return '#f1f5f9';
  }
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', sku: '', category: 'Cosmética', price: '', stock: '', minStock: '', imageUrl: '', descripcion: '', consejos: '' 
  });
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getAllDocuments('productos');
      setProducts(data);
    } catch (error) {
      window.M?.toast({ html: 'Error al cargar el inventario', classes: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openAddModal = () => {
    setFormData({ name: '', sku: '', category: 'Cosmética', price: '', stock: '', minStock: '', imageUrl: '', descripcion: '', consejos: '' });
    setImageFile(null);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setFormData({ ...product, imageUrl: product.imageUrl || '', descripcion: product.descripcion || '', consejos: product.consejos || '' });
    setImageFile(null);
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsUploading(true);
      let finalImageUrl = formData.imageUrl;
      
      if (imageFile) {
        window.M?.toast({ html: 'Subiendo imagen...', classes: 'blue rounded' });
        finalImageUrl = await uploadImage(imageFile, 'productos');
      }

      const dataToSave = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        imageUrl: finalImageUrl
      };

      if (editingId) {
        await updateDocument('productos', editingId, dataToSave);
        window.M?.toast({ html: 'Producto actualizado', classes: 'green rounded' });
      } else {
        await createDocument('productos', dataToSave);
        window.M?.toast({ html: 'Producto creado en inventario', classes: 'green rounded' });
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (error) {
      window.M?.toast({ html: 'Error al procesar la solicitud', classes: 'red rounded' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar definitivamente este producto?")) {
      try {
        await deleteDocument('productos', id);
        window.M?.toast({ html: 'Producto eliminado', classes: 'green rounded' });
        loadProducts();
      } catch (error) {
        window.M?.toast({ html: 'Error al eliminar', classes: 'red rounded' });
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h3>Control de Inventario</h3>
          <p>Gestiona productos físicos, ventas secundarias y control de stock.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="modern-btn-small" onClick={openAddModal}><Plus size={18} /> Agregar Producto</button>
        </div>
      </div>

      <div className="row">
        {/* Resumen Ráptido */}
        <div className="col s12 m4">
          <div className="card-panel" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ padding: '15px', backgroundColor: '#e0f2fe', borderRadius: '12px', color: '#0284c7' }}>
              <Package size={28} />
            </div>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Total Referencias</p>
              <h4 style={{ margin: '0.2rem 0 0 0', fontWeight: 700, color: '#0f172a' }}>{loading ? '-' : products.length}</h4>
            </div>
          </div>
        </div>
        <div className="col s12 m4">
          <div className="card-panel" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ padding: '15px', backgroundColor: '#fef3c7', borderRadius: '12px', color: '#d97706' }}>
              <AlertTriangle size={28} />
            </div>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Stock Bajo o Crítico</p>
              <h4 style={{ margin: '0.2rem 0 0 0', fontWeight: 700, color: '#0f172a' }}>
                 {loading ? '-' : products.filter(p => Number(p.stock) <= Number(p.minStock)).length}
              </h4>
            </div>
          </div>
        </div>
      </div>

      <div className="card-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Buscar por código (SKU) o nombre..."
              style={{ width: '100%', height: '38px', margin: 0, paddingLeft: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}
            />
          </div>
          <button className="modern-btn-outline"><Filter size={18} style={{marginRight: '8px'}} /> Filtrar Categoría</button>
        </div>

        {loading ? (
             <div className="center-align" style={{ padding: '2rem' }}>
                <div className="preloader-wrapper small active"><div className="spinner-layer spinner-blue-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
             </div>
        ) : products.length === 0 ? (
             <div className="center-align" style={{ padding: '4rem 1rem', color: '#64748b' }}>
               <Package size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
               <h6>No hay productos registrados en el inventario</h6>
               <p>Haz clic en "Agregar Producto".</p>
             </div>
        ) : (
          <div className="row">
            {products.map(item => (
              <div className="col s12 m6 l4" key={item.id}>
                <div className="card-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
                  
                  {/* Visual Header */}
                  <div style={{ position: 'relative', height: '170px', width: '100%', backgroundColor: item.imageUrl ? '#e2e8f0' : getCategoryBg(item.category), display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      getCategoryIcon(item.category, 64)
                    )}
                    
                    {/* Actions overlay */}
                    <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '5px', backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '4px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <button onClick={() => openEditModal(item)} className="btn-flat" style={{ padding: '4px', height: 'auto', lineHeight: 1, color: '#475569' }}><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(item.id)} className="btn-flat" style={{ padding: '4px', height: 'auto', lineHeight: 1, color: '#ef4444' }}><Trash2 size={16}/></button>
                    </div>

                    {/* Category Badge overlay */}
                    <div style={{ position: 'absolute', bottom: '-12px', left: '20px', backgroundColor: '#0f172a', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, border: '2px solid white' }}>
                      {item.category}
                    </div>
                  </div>
                  
                  {/* Body Content */}
                  <div style={{ padding: '24px 20px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h6 style={{ fontWeight: 800, margin: '0 0 5px 0', fontSize: '1.2rem', color: '#0f172a' }}>{item.name}</h6>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>SKU: {item.sku}</p>
                    
                    {/* Stock progress */}
                    <div style={{ marginBottom: '15px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Stock Disponible</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: Number(item.stock) <= Number(item.minStock) ? '#ef4444' : '#10b981' }}>{item.stock} unds</span>
                      </div>
                      <div style={{ width: '100%', backgroundColor: '#e2e8f0', height: '6px', borderRadius: '3px' }}>
                        <div style={{
                          width: `${Math.min((Number(item.stock) / (Number(item.minStock) * 2)) * 100, 100)}%`,
                          backgroundColor: Number(item.stock) <= Number(item.minStock) ? '#ef4444' : '#10b981',
                          height: '100%', borderRadius: '3px'
                        }}></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Precio Venta</span>
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--spa-primary-dark)' }}>${Number(item.price).toLocaleString()}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {Number(item.stock) <= Number(item.minStock) ? (
                          <span className="badge-soft badge-red">Alerta</span>
                        ) : (
                          <span className="badge-soft badge-green">Óptimo</span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h5 style={{ marginTop: 0, fontWeight: 600 }}>{editingId ? 'Editar Producto' : 'Crear Producto'}</h5>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div className="row">
                <div className="col s12 m8" style={{ marginBottom: '15px' }}>
                  <label>Nombre del Producto</label>
                  <input type="text" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="col s12 m4" style={{ marginBottom: '15px' }}>
                   <label>Código SKU</label>
                   <input type="text" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                </div>
                <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                  <label>Categoría</label>
                  <select className="browser-default" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', height: '40px' }}
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="Cosmética">Cosmética</option>
                    <option value="Suplementos">Suplementos</option>
                    <option value="Aceites y Esencias">Aceites y Esencias</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </div>
                <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                   <label>Precio de Venta ($)</label>
                   <input type="number" min="0" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="col s6" style={{ marginBottom: '15px' }}>
                   <label>Stock Actual (Unidades)</label>
                   <input type="number" min="0" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                </div>
                <div className="col s6" style={{ marginBottom: '15px' }}>
                   <label>Alerta Stock Mínimo</label>
                   <input type="number" min="0" required className="browser-default" style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} />
                </div>
                <div className="col s12" style={{ marginBottom: '15px' }}>
                   <label>Descripción del Producto</label>
                   <textarea className="browser-default" style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'vertical', fontFamily: 'inherit' }}
                    placeholder="Escribe para qué sirve, beneficios, componentes..."
                    value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})}></textarea>
                </div>
                <div className="col s12" style={{ marginBottom: '15px' }}>
                   <label>Consejos de Aplicación (Se ve en la Web)</label>
                   <textarea className="browser-default" style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'vertical', fontFamily: 'inherit' }}
                    placeholder="Escribe consejos de cómo aplicarse, frecuencia, etc."
                    value={formData.consejos} onChange={e => setFormData({...formData, consejos: e.target.value})}></textarea>
                </div>
                <div className="col s12" style={{ marginBottom: '20px' }}>
                   <label>Imagen Representativa (Opcional)</label>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                     <label className="modern-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0 }}>
                       <Camera size={18} /> Subir Foto
                       <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files[0])} />
                     </label>
                     <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                       {imageFile ? imageFile.name : formData.imageUrl ? 'Imagen anexada' : 'Ninguna imagen seleccionada'}
                     </span>
                   </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="modern-btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="modern-btn-small" disabled={isUploading}>
                  {isUploading ? 'Subiendo...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;
