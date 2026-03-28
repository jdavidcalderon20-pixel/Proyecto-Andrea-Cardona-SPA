import jsPDF from 'jspdf';

/**
 * generarReciboPDF
 * Genera y descarga automáticamente un recibo PDF de pago de sesión.
 *
 * @param {Object} datos
 * @param {string} datos.clienteNombre
 * @param {string} datos.clienteEmail
 * @param {string} datos.clientePhone
 * @param {string} datos.tratamiento
 * @param {number} datos.numeroSesion
 * @param {number} datos.totalSesiones
 * @param {number} datos.monto           – valor en COP
 * @param {string} datos.metodoPago      – efectivo | transferencia | tarjeta
 * @param {string} datos.fecha           – YYYY-MM-DD
 * @param {string} datos.profesional
 * @param {string} datos.observaciones
 * @param {string} datos.firma           – base64 PNG de la firma
 * @returns {string}  base64 del PDF (para adjuntar por email)
 */
const _buildReciboPDF = (datos) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = 210; // ancho A4 en mm
  const margin = 20;
  let y = 0;

  // ── HEADER ──────────────────────────────────────────────
  // Fondo verde superior
  doc.setFillColor(5, 150, 105);   // #059669
  doc.rect(0, 0, W, 42, 'F');

  // Nombre del SPA
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Cardona SPA', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Cuidado y Bienestar Profesional', margin, 26);

  // Recibo # en la esquina
  const reciboNum = `REC-${Date.now().toString().slice(-8)}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`RECIBO DE PAGO`, W - margin, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`N° ${reciboNum}`, W - margin, 22, { align: 'right' });
  doc.text(`Fecha: ${formatearFecha(datos.fecha)}`, W - margin, 29, { align: 'right' });

  y = 52;

  // ── DATOS DEL CLIENTE ────────────────────────────────────
  doc.setTextColor(15, 23, 42);    // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DATOS DEL CLIENTE', margin, y);
  y += 2;

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);   // slate-600

  const infoCliente = [
    ['Nombre:', datos.clienteNombre],
    ['Teléfono:', datos.clientePhone || '—'],
    ['Correo:', datos.clienteEmail || '—'],
  ];
  infoCliente.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(val, margin + 28, y);
    y += 7;
  });

  y += 4;

  // ── DETALLE DEL SERVICIO ─────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('DETALLE DEL SERVICIO', margin, y);
  y += 2;
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);

  const infoServicio = [
    ['Tratamiento:', datos.tratamiento],
    ['Sesión:', `${datos.numeroSesion} de ${datos.totalSesiones}`],
    ['Profesional:', datos.profesional || '—'],
  ];
  infoServicio.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(val, margin + 32, y);
    y += 7;
  });

  if (datos.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.text('Observaciones:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(datos.observaciones, W - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 2;
  }

  y += 4;

  // ── MONTO ────────────────────────────────────────────────
  doc.setFillColor(240, 253, 244); // green-50
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, W - margin * 2, 28, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(6, 95, 70);    // emerald-900
  doc.text('TOTAL PAGADO:', margin + 8, y + 11);

  doc.setFontSize(18);
  doc.setTextColor(5, 150, 105);  // emerald-600
  doc.text(formatearCOP(datos.monto), W - margin - 8, y + 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text(`Método de pago: ${capitalizar(datos.metodoPago)}`, margin + 8, y + 22);

  y += 38;

  // ── FIRMA ────────────────────────────────────────────────
  if (datos.firma) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('FIRMA DEL CLIENTE', margin, y);
    y += 2;
    doc.setLineWidth(0.5);
    doc.setDrawColor(16, 185, 129);
    doc.line(margin, y, W - margin, y);
    y += 6;

    try {
      // Dibujar caja de firma
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, 80, 38, 3, 3, 'FD');
      doc.addImage(datos.firma, 'PNG', margin + 2, y + 2, 76, 34);
    } catch (e) {
      console.warn('No se pudo insertar la firma en el PDF:', e);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(datos.clienteNombre, margin + 40, y + 44, { align: 'center' });
    doc.text('Firma del cliente', margin + 40, y + 50, { align: 'center' });
    y += 56;
  }

  // ── FOOTER ───────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 280, W, 17, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Cardona SPA · Este recibo es el comprobante oficial de tu pago.', W / 2, 289, { align: 'center' });
  doc.text('¡Gracias por tu confianza!', W / 2, 294, { align: 'center' });
  // Return the built doc object (no save)
  return { doc, fileName: `Recibo_${datos.clienteNombre.replace(/ /g, '_')}_S${datos.numeroSesion}_${datos.fecha}.pdf` };
};

/**
 * Genera y DESCARGA el PDF, luego retorna blob para upload.
 */
export const generarReciboPDF = (datos) => {
  const { doc, fileName } = _buildReciboPDF(datos);
  doc.save(fileName);
  const pdfBlob = doc.output('blob');
  const pdfBase64 = doc.output('datauristring');
  return { pdfBlob, pdfBase64, fileName };
};

/**
 * Genera el PDF en memoria SIN descargar. Para auto-upload a Cloudinary.
 */
export const generarReciboPDFBlob = (datos) => {
  const { doc, fileName } = _buildReciboPDF(datos);
  const pdfBlob = doc.output('blob');
  return { pdfBlob, fileName };
};

// ── HELPERS ──────────────────────────────────────────────────────────────────

const formatearFecha = (fechaStr) => {
  if (!fechaStr) return '—';
  const [y, m, d] = fechaStr.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${d} ${meses[parseInt(m, 10) - 1]} ${y}`;
};

export const formatearCOP = (valor) => {
  if (!valor && valor !== 0) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0
  }).format(valor);
};

const capitalizar = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};
