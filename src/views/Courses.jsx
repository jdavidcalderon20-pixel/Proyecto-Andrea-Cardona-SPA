import React, { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, Monitor, MapPin, Edit2, Trash2, Camera, X } from 'lucide-react';
import { getAllDocuments, createDocument, updateDocument, deleteDocument, uploadImage } from '../services/firebaseUtils';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    modality: 'Presencial', 
    desc: '', 
    detailedDescription: '', 
    syllabus: '',
    requirements: '',
    price: 0, 
    imageUrl: '',
    galleryUrls: []
  });
  const [imageFile, setImageFile] = useState(null);
  const [galleryFile, setGalleryFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await getAllDocuments('cursos');
      setCourses(data);
    } catch (error) {
      window.M?.toast({ html: 'Error al cargar cursos', classes: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const openAddModal = () => {
    setFormData({ 
      name: '', 
      modality: 'Presencial', 
      desc: '', 
      detailedDescription: '', 
      syllabus: '',
      requirements: '',
      price: 0, 
      imageUrl: '',
      galleryUrls: []
    });
    setImageFile(null);
    setGalleryFile(null);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (course) => {
    setFormData({ 
      ...course,
      galleryUrls: course.galleryUrls || [] 
    });
    setImageFile(null);
    setGalleryFile(null);
    setEditingId(course.id);
    setIsModalOpen(true);
  };

  const handleAddGalleryImage = async (file) => {
    if (!file) return;
    try {
      setIsUploading(true);
      window.M?.toast({ html: 'Subiendo a galería...', classes: 'blue rounded' });
      const url = await uploadImage(file, 'cursos_galeria');
      setFormData(prev => ({
        ...prev,
        galleryUrls: [...prev.galleryUrls, url]
      }));
      window.M?.toast({ html: 'Imagen añadida', classes: 'green rounded' });
    } catch (error) {
      window.M?.toast({ html: 'Error al subir: ' + error.message, classes: 'red rounded' });
    } finally {
      setIsUploading(false);
      setGalleryFile(null);
    }
  };

  const removeGalleryImage = (index) => {
    setFormData(prev => ({
      ...prev,
      galleryUrls: prev.galleryUrls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsUploading(true);
      let finalImageUrl = formData.imageUrl;
      
      if (imageFile) {
        window.M?.toast({ html: 'Subiendo portada...', classes: 'blue rounded' });
        finalImageUrl = await uploadImage(imageFile, 'cursos');
      }

      const dataToSave = {
        name: formData.name.trim(),
        modality: formData.modality,
        desc: formData.desc.trim(),
        detailedDescription: formData.detailedDescription.trim(),
        syllabus: formData.syllabus?.trim() || '',
        requirements: formData.requirements?.trim() || '',
        price: Number(formData.price) || 0,
        imageUrl: finalImageUrl || '',
        galleryUrls: formData.galleryUrls || []
      };

      if (editingId) {
        await updateDocument('cursos', editingId, dataToSave);
        window.M?.toast({ html: 'Curso actualizado', classes: 'green rounded' });
      } else {
        await createDocument('cursos', dataToSave);
        window.M?.toast({ html: 'Curso creado', classes: 'green rounded' });
      }
      setIsModalOpen(false);
      loadCourses(); 
    } catch (error) {
      window.M?.toast({ html: 'Error: ' + (error.message || 'Error al procesar'), classes: 'red rounded' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este curso?")) {
      try {
        await deleteDocument('cursos', id);
        window.M?.toast({ html: 'Curso eliminado', classes: 'green rounded' });
        loadCourses();
      } catch (error) {
        window.M?.toast({ html: 'Error al eliminar', classes: 'red rounded' });
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">
          <h3>Gestión de Academia</h3>
          <p>Administra los cursos, clases y talleres que ofrece el SPA.</p>
        </div>
        <button className="modern-btn-small" onClick={openAddModal}><Plus size={18} /> Nuevo Curso</button>
      </div>

      <div className="card-panel" style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Buscar cursos..." 
            style={{ width: '100%', height: '38px', margin: 0, paddingLeft: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="center-align" style={{ padding: '2rem' }}>
           <div className="preloader-wrapper small active"><div className="spinner-layer spinner-green-only"><div className="circle-clipper left"><div className="circle"></div></div></div></div>
        </div>
      ) : courses.length === 0 ? (
        <div className="center-align" style={{ padding: '4rem 1rem', color: '#64748b' }}>
          <BookOpen size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
          <h6>No hay cursos registrados</h6>
          <p>Comienza agregando tu primer curso de capacitación.</p>
        </div>
      ) : (
        <div className="row">
          {courses.map(course => (
            <div className="col s12 m6 l4" key={course.id}>
              <div className="card-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
                
                <div style={{ position: 'relative', height: '170px', width: '100%', backgroundColor: '#f1f5f9' }}>
                  {course.imageUrl ? (
                    <img src={course.imageUrl} alt={course.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <BookOpen size={64} color="#cbd5e1" />
                    </div>
                  )}
                  
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '5px', backgroundColor: 'rgba(255, 255, 255, 0.9)', padding: '4px', borderRadius: '10px' }}>
                    <button onClick={() => openEditModal(course)} className="btn-flat" style={{ padding: '4px', height: 'auto', color: '#475569' }}><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(course.id)} className="btn-flat" style={{ padding: '4px', height: 'auto', color: '#ef4444' }}><Trash2 size={16}/></button>
                  </div>

                  <div style={{ position: 'absolute', bottom: '-12px', left: '20px', backgroundColor: '#0f172a', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, border: '2px solid white', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {course.modality === 'Online' ? <Monitor size={14} /> : <MapPin size={14} />}
                    {course.modality}
                  </div>
                </div>
                
                <div style={{ padding: '24px 20px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h6 style={{ fontWeight: 800, margin: '0 0 10px 0', fontSize: '1.2rem', color: '#0f172a' }}>{course.name}</h6>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 20px 0', flex: 1 }}>{course.desc}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '15px', marginTop: 'auto' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>INVERSIÓN</span>
                      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--spa-primary-dark)' }}>${Number(course.price).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="luxury-modal-overlay">
          <div className="luxury-modal-container" style={{ maxWidth: '800px' }}>
            <div className="luxury-modal-header">
              <h5 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                {editingId ? 'Editar Curso' : 'Nuevo Curso'}
              </h5>
              <button onClick={() => setIsModalOpen(false)} className="btn-flat" style={{ padding: 0 }}>
                <X size={24} color="#94a3b8" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="luxury-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="row" style={{ margin: 0 }}>
                  <div className="col s12" style={{ marginBottom: '15px' }}>
                    <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Nombre del Curso/Taller</label>
                    <input type="text" required className="browser-default" 
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                    <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Modalidad</label>
                    <select className="browser-default"
                      value={formData.modality} onChange={e => setFormData({...formData, modality: e.target.value})}>
                      <option value="Presencial">Presencial</option>
                      <option value="Online">Online</option>
                      <option value="Híbrido">Híbrido</option>
                    </select>
                  </div>
                  
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label style={{ color: '#475569', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Precio ($ COP)</label>
                     <input type="number" required min="0" className="browser-default" 
                      value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                  </div>
                  
                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label style={{ color: '#1e293b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Imagen de Portada</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <label className="modern-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0, padding: '0 15px', height: '36px', color: '#1e293b', fontWeight: 600 }}>
                         <Camera size={18} /> Subir Foto
                         <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files[0])} />
                       </label>
                       <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                         {imageFile ? imageFile.name : formData.imageUrl ? '✓ Imagen actual' : 'Sin imagen'}
                       </span>
                     </div>
                  </div>

                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label style={{ color: '#1e293b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Añadir a Galería</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                       <label className="modern-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0, padding: '0 15px', height: '36px', color: '#1e293b', fontWeight: 600 }}>
                         <Plus size={18} /> Subir a Galería
                         <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleAddGalleryImage(e.target.files[0])} />
                       </label>
                     </div>
                  </div>

                  <div className="col s12" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '12px', minHeight: '60px' }}>
                      {formData.galleryUrls.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden' }}>
                          <img src={url} alt="Gallery" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" onClick={() => removeGalleryImage(idx)} style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(239, 68, 68, 0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {formData.galleryUrls.length === 0 && (
                        <p style={{ margin: 'auto', color: '#94a3b8', fontSize: '0.85rem' }}>No hay imágenes en la galería</p>
                      )}
                    </div>
                  </div>

                  <div className="col s12" style={{ marginBottom: '15px' }}>
                     <label style={{ color: '#1e293b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Descripción corta (Para la tarjeta)</label>
                     <textarea required maxLength={200} className="browser-default" style={{ height: '60px', resize: 'none' }} 
                      value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} />
                  </div>

                  <div className="col s12" style={{ marginBottom: '15px' }}>
                     <label style={{ color: '#1e293b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Descripción del Curso (Presentación)</label>
                     <textarea className="browser-default" style={{ height: '80px', resize: 'vertical' }} 
                      value={formData.detailedDescription} onChange={e => setFormData({...formData, detailedDescription: e.target.value})} />
                  </div>

                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label style={{ color: '#1e293b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Temario (Usa '-' para subpuntos)</label>
                     <textarea className="browser-default" style={{ height: '120px', resize: 'vertical' }} 
                      placeholder="Técnica de Masaje&#10;- Maniobras básicas&#10;- Protocolo reductor&#10;Teoría de la Piel"
                      value={formData.syllabus} onChange={e => setFormData({...formData, syllabus: e.target.value})} />
                  </div>

                  <div className="col s12 m6" style={{ marginBottom: '15px' }}>
                     <label style={{ color: '#1e293b', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Requisitos</label>
                     <textarea className="browser-default" style={{ height: '120px', resize: 'vertical' }} 
                      placeholder="• Ser mayor de edad&#10;• Kit básico"
                      value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})} />
                  </div>
                </div>
              </div>
              
              <div className="luxury-modal-footer">
                <button type="button" className="modern-btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="modern-btn-small" disabled={isUploading}>
                  {isUploading ? 'Procesando...' : 'Guardar Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Courses;
