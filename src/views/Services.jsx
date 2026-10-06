import React, { useState, useEffect } from 'react';
import { Plus, Search, Scissors, Heart, Sparkles, Sun, Droplets, Edit2, Trash2, Camera, X } from 'lucide-react';
import { getAllDocuments, createDocument, updateDocument, deleteDocument, uploadImage } from '../services/firebaseUtils';

const getCategoryIcon = (category, size = 20) => {
  switch(category) {
    case 'Facial': return <Sparkles size={size} color="#0d9488" />;
    case 'Corporal': return <Heart size={size} color="#e11d48" />;
    case 'Masaje': return <Droplets size={size} color="#0284c7" />;
    case 'Bronceado': return <Sun size={size} color="#d97706" />;
    default: return <Scissors size={size} color="#475569" />;
  }
};

const getCategoryBg = (category) => {
  switch(category) {
    case 'Facial': return '#ccfbf1';
    case 'Corporal': return '#ffe4e6';
    case 'Masaje': return '#e0f2fe';
    case 'Bronceado': return '#fef3c7';
    default: return '#f1f5f9';
  }
};

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: 'Facial', desc: '', detailedDescription: '', recommendations: '', price: 0, duration: '', imageUrl: '', galleryUrls: [] });
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await getAllDocuments('servicios');
      setServices(data);
    } catch (error) {
      window.M?.toast({ html: 'Error al cargar servicios', classes: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openAddModal = () => {
    setFormData({ name: '', category: 'Facial', desc: '', detailedDescription: '', recommendations: '', price: 0, duration: '', imageUrl: '', galleryUrls: [] });
    setImageFile(null);
    setGalleryFiles([]);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setFormData({ ...service, imageUrl: service.imageUrl || '', detailedDescription: service.detailedDescription || '', recommendations: service.recommendations || '', galleryUrls: service.galleryUrls || [] });
    setImageFile(null);
    setGalleryFiles([]);
    setEditingId(service.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submit triggered for service:", editingId ? "Edit" : "New");
    console.log("Form data:", formData);

    try {
      setIsUploading(true);
      let finalImageUrl = formData.imageUrl;
      
      if (imageFile) {
        console.log("Uploading main image...");
        window.M?.toast({ html: 'Subiendo imagen principal...', classes: 'blue rounded' });
        finalImageUrl = await uploadImage(imageFile, 'servicios');
        console.log("Main image uploaded:", finalImageUrl);
      }

      let finalGalleryUrls = [...(formData.galleryUrls || [])];
      if (galleryFiles.length > 0) {
        console.log(`Uploading ${galleryFiles.length} gallery images...`);
        window.M?.toast({ html: `Subiendo ${galleryFiles.length} fotos extra...`, classes: 'blue rounded' });
        for (let file of galleryFiles) {
          const gUrl = await uploadImage(file, 'servicios');
          finalGalleryUrls.push(gUrl);
        }
        console.log("Gallery images uploaded");
      }

      const dataToSave = {
        name: formData.name ? String(formData.name).trim() : '',
        category: formData.category ? String(formData.category).trim() : 'Facial',
        desc: formData.desc ? String(formData.desc).trim() : '',
        detailedDescription: formData.detailedDescription ? String(formData.detailedDescription).trim() : '',
        recommendations: formData.recommendations ? String(formData.recommendations).trim() : '',
        price: Number(formData.price) || 0,
        duration: formData.duration ? String(formData.duration).trim() : '',
        imageUrl: finalImageUrl || '',
        galleryUrls: finalGalleryUrls || []
      };

      console.log("Data to save in Firebase:", dataToSave);

      if (editingId) {
        await updateDocument('servicios', editingId, dataToSave);
        console.log("Service updated successfully");
        window.M?.toast({ html: 'Servicio actualizado', classes: 'green rounded' });
      } else {
        await createDocument('servicios', dataToSave);
        console.log("Service created successfully");
        window.M?.toast({ html: 'Servicio creado', classes: 'green rounded' });
      }
      setIsModalOpen(false);
      loadServices(); 
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      window.M?.toast({ html: 'Error: ' + (error.message || 'Error al procesar'), classes: 'red rounded' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este servicio permanetemente?")) {
      try {
        await deleteDocument('servicios', id);
        window.M?.toast({ html: 'Servicio eliminado', classes: 'green rounded' });
        loadServices();
      } catch (error) {
        window.M?.toast({ html: 'Error al eliminar', classes: 'red rounded' });
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h3>Catálogo de Servicios</h3>
          <p>Administra los tratamientos, precios y duraciones del SPA (Conectado a Firestore).</p>
        </div>
        <button className="modern-btn-small" onClick={openAddModal}><Plus size={18} /> Nuevo Servicio</button>
      </div>

      <div className="card-panel" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar tratamientos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', height: '38px', margin: 0, paddingLeft: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {['Todas', 'Facial', 'Corporal', 'Masaje', 'Bronceado', 'Cosmética'].map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={selectedCategory === cat ? 'modern-btn-small' : 'modern-btn-outline'}
                style={{ padding: '4px 12px', height: 'auto', fontSize: '0.8rem' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="center-align" style={{ padding: '2rem' }}>
           <div className="preloader-wrapper small active"><div className="spinner-layer spinner-green-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
        </div>
      ) : services.length === 0 ? (
        <div className="center-align" style={{ padding: '4rem 1rem', color: '#64748b' }}>
          <Scissors size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
          <h6>No hay servicios registrados</h6>
          <p>Haz clic en "Nuevo Servicio" para agregar el primero.</p>
        </div>
      ) : (
        <div className="row">
          {services
            .filter(service => {
              const matchesSearch = (service.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                   (service.category || '').toLowerCase().includes(searchTerm.toLowerCase());
              const matchesCategory = selectedCategory === 'Todas' || service.category === selectedCategory;
              return matchesSearch && matchesCategory;
            })
            .map(service => (
            <div className="col s12 m6 l4" key={service.id}>
              <div className="card-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
                
                {/* Visual Header */}
                <div style={{ position: 'relative', height: '170px', width: '100%', backgroundColor: service.imageUrl ? '#e2e8f0' : getCategoryBg(service.category), display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {service.imageUrl ? (
                    <img src={service.imageUrl} alt={service.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getCategoryIcon(service.category, 64)
                  )}
                  
                  {/* Actions overlay */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '5px', backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '4px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <button onClick={() => openEditModal(service)} className="btn-flat" style={{ padding: '4px', height: 'auto', lineHeight: 1, color: '#475569' }}><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(service.id)} className="btn-flat" style={{ padding: '4px', height: 'auto', lineHeight: 1, color: '#ef4444' }}><Trash2 size={16}/></button>
                  </div>

                  {/* Category Badge overlay */}
                  <div style={{ position: 'absolute', bottom: '-12px', left: '20px', backgroundColor: '#0f172a', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, border: '2px solid white' }}>
                    {service.category}
                  </div>
                </div>
                
                {/* Body Content */}
                <div style={{ padding: '24px 20px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h6 style={{ fontWeight: 800, margin: '0 0 10px 0', fontSize: '1.2rem', color: '#0f172a' }}>{service.name}</h6>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 20px 0', flex: 1 }}>{service.desc}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '15px', marginTop: 'auto' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Precio Base</span>
                      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--spa-primary-dark)' }}>${Number(service.price).toLocaleString()}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Duración</span>
                      <span style={{ fontWeight: 600, color: '#475569' }}>{service.duration}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Luxury Modal for Services */}
      {isModalOpen && (
        <div className="luxury-modal-overlay">
          <div className="luxury-modal-container" style={{ maxWidth: '600px' }}>
            <div className="luxury-modal-header">
              <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                {editingId ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h5>
              <button onClick={() => setIsModalOpen(false)} className="btn-flat" style={{ padding: 0 }}>
                <X size={24} color="#94a3b8" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="luxury-modal-body">
                <div className="row" style={{ margin: 0 }}>
                  <div className="col s12" style={{ marginBottom: '15px' }}>
                    <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Nombre del Servicio</label>
                    <input type="text" required className="browser-default" 
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                    <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Categoría</label>
                    <select className="browser-default"
                      value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="Facial">Facial</option>
                      <option value="Corporal">Corporal</option>
                      <option value="Masaje">Masaje</option>
                      <option value="Bronceado">Bronceado</option>
                      <option value="Cosmética">Cosmética</option>
                    </select>
                  </div>
                  
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Precio ($ COP)</label>
                     <input type="number" required min="0" className="browser-default" 
                      value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                  </div>
                  
                  <div className="col s12" style={{ marginBottom: '15px' }}>
                     <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Duración (Ej. '60 min')</label>
                     <input type="text" required className="browser-default" 
                      value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
                  </div>
                  
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label style={{ color: '#1e293b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Imagen Principal</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <label className="modern-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0, padding: '0 15px', height: '36px', color: '#1e293b', fontWeight: 600 }}>
                         <Camera size={18} /> Portada
                         <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files[0])} />
                       </label>
                       <span style={{ fontSize: '0.8rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                         {imageFile ? imageFile.name : formData.imageUrl ? '✓ Cargada' : 'Sin imagen'}
                       </span>
                     </div>
                  </div>

                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label style={{ color: '#1e293b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Galería Extra</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <label className="modern-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0, padding: '0 15px', height: '36px', color: '#1e293b', fontWeight: 600 }}>
                         <Plus size={18} /> Fotos
                         <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => setGalleryFiles(Array.from(e.target.files))} />
                       </label>
                       <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                         {galleryFiles.length > 0 ? `${galleryFiles.length} nuevas` : formData.galleryUrls?.length || 0}
                       </span>
                     </div>
                  </div>

                  <div className="col s12" style={{ marginBottom: '15px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <label style={{ color: '#1e293b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Descripción corta</label>
                       <span style={{ fontSize: '0.8rem', color: formData.desc.length >= 150 ? '#ef4444' : '#94a3b8' }}>
                         {formData.desc.length}/150
                       </span>
                     </div>
                     <textarea required maxLength={150} className="browser-default" style={{ height: '80px', resize: 'none' }} 
                      value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} />
                  </div>

                  <div className="col s12" style={{ marginBottom: '15px' }}>
                     <label style={{ color: '#1e293b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Descripción Larga</label>
                     <textarea className="browser-default" style={{ height: '100px', resize: 'vertical' }} 
                      value={formData.detailedDescription} onChange={e => setFormData({...formData, detailedDescription: e.target.value})} />
                  </div>

                  <div className="col s12">
                     <label style={{ color: '#1e293b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Recomendaciones</label>
                     <textarea className="browser-default" style={{ height: '80px', resize: 'vertical' }} 
                      value={formData.recommendations} onChange={e => setFormData({...formData, recommendations: e.target.value})} />
                  </div>
                </div>
              </div>
              
              <div className="luxury-modal-footer">
                <button type="button" className="modern-btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="modern-btn-small" disabled={isUploading}>
                  {isUploading ? 'Guardando...' : 'Guardar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default Services;
