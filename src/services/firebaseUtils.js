import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================
// Funciones Genéricas CRUD
// ============================================

/**
 * Sube una imagen a Cloudinary (Frontend Unsigned Upload) y devuelve su URL pública segura
 */
export const uploadImage = async (file, folderPath = 'spa_images') => {
  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Faltan credenciales de Cloudinary en el archivo .env");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folderPath); // Subcarpeta (productos o servicios)

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Error remoto al subir a Cloudinary");
    }

    const data = await response.json();
    return data.secure_url; // Retorna URL pública HTTPS
  } catch (error) {
    console.error(`Error subiendo imagen a Cloudinary:`, error);
    throw error;
  }
};

/**
 * Sube un PDF (como Blob) a Cloudinary usando el endpoint raw/upload.
 * @param {Blob} pdfBlob - El PDF como Blob
 * @param {string} fileName - Nombre para el archivo (sin extensión)
 * @returns {string} secure_url del PDF público
 */
export const uploadPDF = async (pdfBlob, fileName = 'recibo', folderPath = 'recibos') => {
  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Faltan credenciales de Cloudinary en el archivo .env");
    }

    const formData = new FormData();
    formData.append('file', pdfBlob, `${fileName}.pdf`);
    formData.append('upload_preset', uploadPreset);
    if (folderPath) {
      formData.append('folder', folderPath);
    }
    // En configuraciones Unsigned (sin firma) de Cloudinary, los endpoints 'raw' o 'auto'
    // suelen estar bloqueados. PDFs se suben mediante 'image/upload'.
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Error subiendo PDF a Cloudinary");
    }

    const data = await response.json();
    console.log('PDF subido con éxito:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error('Error subiendo PDF a Cloudinary:', error);
    throw error;
  }
};

/**
 * Obtiene todos los documentos de una colección
 */
export const getAllDocuments = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error obteniendo documentos de ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Crea un nuevo documento en una colección
 */
export const createDocument = async (collectionName, data) => {
  try {
    // Agregamos timestamp de creación automáticamente
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, collectionName), docData);
    return { id: docRef.id, ...docData };
  } catch (error) {
    console.error(`Error creando documento en ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Actualiza un documento existente
 */
export const updateDocument = async (collectionName, documentId, data) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    
    // Agregamos timestamp de actualización
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, updateData);
    return { id: documentId, ...updateData };
  } catch (error) {
    console.error(`Error actualizando el documento ${documentId}:`, error);
    throw error;
  }
};

/**
 * Elimina un documento
 */
export const deleteDocument = async (collectionName, documentId) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error eliminando el documento ${documentId}:`, error);
    throw error;
  }
};

// ============================================
// Consultas Específicas
// ============================================

/**
 * Obtener citas de una fecha o rango específico
 */
export const getAppointmentsByDateRange = async (startDate, endDate) => {
    // TODO: Implementar query con where() dependiendo el modelo exacto de fechas (Timestamp vs String)
};
