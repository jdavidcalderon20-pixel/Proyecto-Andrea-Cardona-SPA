import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import heic2any from "heic2any";

// ============================================
// Funciones Genéricas CRUD
// ============================================

/**
 * Comprime una imagen usando Canvas API antes de subirla.
 * Reduce imágenes grandes (ej. 15MB de iPhone) a menos de 1.5MB.
 * @param {File} file - Archivo de imagen original
 * @param {number} maxWidth - Ancho máximo en píxeles (default 1920)
 * @param {number} quality - Calidad JPEG inicial de 0 a 1 (default 0.85)
 * @returns {Promise<Blob>} Imagen comprimida como Blob
 */
const compressImage = (file, maxWidth = 1920, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Reducir dimensiones si excede el máximo
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Intentar con calidad inicial, reducir si sigue siendo muy grande
        const tryCompress = (q) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) { reject(new Error('No se pudo comprimir la imagen')); return; }
              // Si sigue siendo >8MB y podemos bajar más la calidad, reintentar
              if (blob.size > 8 * 1024 * 1024 && q > 0.5) {
                tryCompress(q - 0.15);
              } else {
                console.log(`Imagen comprimida: ${(blob.size / 1024 / 1024).toFixed(2)}MB (calidad: ${q})`);
                resolve(blob);
              }
            },
            'image/jpeg',
            q
          );
        };

        tryCompress(quality);
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen para comprimir'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
};

/**
 * Sube una imagen a Cloudinary (Frontend Unsigned Upload) y devuelve su URL pública segura.
 * Soporta conversión automática de formatos iPhone (HEIC/HEIF) y compresión.
 */
export const uploadImage = async (file, folderPath = 'spa_images') => {
  try {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset || cloudName === 'tu_cloud_name' || uploadPreset === 'tu_upload_preset') {
      console.error("ERROR: Credenciales de Cloudinary no configuradas correctamente en .env");
      throw new Error("Credenciales de Cloudinary no configuradas. Por favor verifica tu archivo .env");
    }

    let fileToProcess = file;
    const fileName = file.name || 'image.jpg';

    // 1. Manejo de HEIC (iPhone)
    const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' || fileName.toLowerCase().endsWith('.heic') || fileName.toLowerCase().endsWith('.heif');
    
    if (isHEIC) {
      console.log('Detectado formato HEIC/HEIF de iPhone. Convirtiendo a JPEG...');
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8
        });
        // heic2any puede devolver un array si el HEIC tiene múltiples imágenes
        fileToProcess = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        console.log('Conversión HEIC completada con éxito.');
      } catch (convErr) {
        console.error('Error convirtiendo HEIC:', convErr);
        // Continuamos con el archivo original si falla la conversión (aunque probablemente falle después)
      }
    }

    // 2. COMPRESIÓN automática si es muy grande (>2MB)
    let fileToUpload = fileToProcess;
    if (fileToProcess.size > 2 * 1024 * 1024) {
      console.log(`Imagen pesada (${(fileToProcess.size / 1024 / 1024).toFixed(2)}MB). Comprimiendo...`);
      fileToUpload = await compressImage(fileToProcess);
    }

    const formData = new FormData();
    // Aseguramos que el nombre de archivo termine en .jpg si fue procesado
    const safeName = fileName.replace(/\.[^.]+$/, '.jpg');
    formData.append('file', fileToUpload, safeName);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folderPath);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        let errorMessage = "Error remoto al subir a Cloudinary";
        let errorCode = "";
        try {
            const errorData = await response.json();
            console.error('Error detallado de Cloudinary:', errorData);
            errorMessage = errorData.error?.message || errorMessage;
            errorCode = errorData.error?.http_code || response.status;
            
            if (errorMessage.includes("Unknown API key")) {
              errorMessage = "Credenciales de Cloudinary inválidas. Revisa el VITE_CLOUDINARY_CLOUD_NAME en tu .env";
            } else if (errorMessage.includes("Upload preset must be specified")) {
              errorMessage = "Falta el Upload Preset. Revisa VITE_CLOUDINARY_UPLOAD_PRESET en tu .env";
            }
        } catch (e) {
            console.error('No se pudo parsear el error de Cloudinary:', response.statusText);
            errorCode = response.status;
        }
        throw new Error(`${errorMessage} (Código: ${errorCode})`);
    }

    const data = await response.json();
    console.log('Imagen subida con éxito a Cloudinary:', data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error(`ERROR CRÍTICO en uploadImage:`, error);
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
 * Obtener citas de una fecha o rango específico.
 * @param {Date|string} startDate - Fecha inicio (Date object o string ISO)
 * @param {Date|string} endDate - Fecha fin (opcional)
 */
export const getAppointmentsByDateRange = async (startDate, endDate) => {
  try {
    const appointmentsRef = collection(db, 'appointments');
    let q;

    // Convertir a Date objects si son strings
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    
    // Si es el mismo día, ajustar end para cubrir las 24h
    if (!endDate) {
      end.setHours(23, 59, 59, 999);
    }

    q = query(
      appointmentsRef,
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error en getAppointmentsByDateRange:", error);
    throw error;
  }
};
