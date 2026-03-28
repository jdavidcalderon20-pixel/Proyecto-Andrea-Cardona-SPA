import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, Calendar, Package, Filter } from 'lucide-react';
import ExportJsonExcel from 'js-export-excel';
import { getAllDocuments } from '../services/firebaseUtils';
import { parseISO, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Mock chart data for revenue until a Billing module is requested
const mockDailyRevenue = [
  { name: '10 Mar', servicios: 400, productos: 240 },
  { name: '11 Mar', servicios: 300, productos: 139 },
  { name: '12 Mar', servicios: 200, productos: 980 },
  { name: '13 Mar', servicios: 278, productos: 390 },
  { name: '14 Mar', servicios: 189, productos: 480 },
  { name: '15 Mar', servicios: 239, productos: 380 },
  { name: '16 Mar', servicios: 349, productos: 430 },
];

const COLORS = ['#10b981', '#0284c7', '#e11d48', '#d97706', '#8b5cf6', '#d4af37'];

const Reports = ({ initialFilters }) => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [products, setProducts] = useState([]);
  const [serviceDemographics, setServiceDemographics] = useState([]);
  const [startDate, setStartDate] = useState(initialFilters?.startDate || format(parseISO(`${format(new Date(), 'yyyy-MM')}-01T00:00:00`), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(initialFilters?.endDate || format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState(initialFilters?.category || 'Todas');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Todos');
  const [reportSummary, setReportSummary] = useState({ totalRegistros: 0, utilidadNeta: 0, ingresosBrutos: 0 });

  const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const [citasData, productosData, sesionesData, gastosData, serviciosData, pedidosData] = await Promise.all([
          getAllDocuments('citas'),
          getAllDocuments('productos'),
          getAllDocuments('sesiones'),
          getAllDocuments('gastos'),
          getAllDocuments('servicios'),
          getAllDocuments('pedidos')
        ]);
        
        const start = parseISO(`${startDate}T00:00:00`);
        const end = parseISO(`${endDate}T23:59:59`);
        
        const servicePrices = {};
        serviciosData.forEach(s => {
          const priceStr = String(s.price || s.precio || '0').replace(/\D/g, '');
          servicePrices[s.id] = Number(priceStr);
        });

        const demoCounts = {};
        
        let ingresosCalculados = 0;
        let registrosMes = 0;
        
        const matchedCitas = [];

        // Evaluar Citas
        citasData.forEach(apt => {
          if (!apt.date) return;
          const d = parseISO(`${apt.date}T12:00:00`); // Evita problemas de zona horaria aislando el dia
          if (isValid(d) && d >= start && d <= end) {
             const sn = apt.serviceName || 'Otros';
             
             // Simple category bucketing
             let cat = 'Otros';
             if(sn.toLowerCase().includes('masaje') || sn.toLowerCase().includes('relajante')) cat = 'Masajes';
             else if (sn.toLowerCase().includes('facial') || sn.toLowerCase().includes('limpieza') || sn.toLowerCase().includes('dermapen')) cat = 'Faciales';
             else if (sn.toLowerCase().includes('corporal') || sn.toLowerCase().includes('madero') || sn.toLowerCase().includes('reducci')) cat = 'Corporales';
             else if (sn.toLowerCase().includes('bronceado')) cat = 'Bronceado';
             
             // Filtrar por categoría seleccionada si no es 'Todas'
             if (selectedCategory !== 'Todas' && cat !== selectedCategory && sn !== selectedCategory) {
               return; // Skip if it doesn't match the specific exact service name or bucket
             }

             // Filtrar por pago
             const method = apt.metodoPago || 'efectivo';
             if (selectedPaymentMethod !== 'Todos' && selectedPaymentMethod !== method) {
               return; // Skip if payment method doesn't match
             }

             const price = servicePrices[apt.serviceId] || 0;
             apt.estadoExcel = apt.pagado ? formatCOP(price) : `${formatCOP(price)} (Pendiente)`;
             apt.metodoExcel = method; // Para fácil exportación
             matchedCitas.push(apt);

             registrosMes++;
             demoCounts[cat] = (demoCounts[cat] || 0) + 1;

             if (apt.pagado) {
               ingresosCalculados += price;
             }
          }
        });

        // Evaluar Sesiones
        sesionesData.forEach(p => {
          if (p.sesiones && Array.isArray(p.sesiones)) {
            p.sesiones.forEach(s => {
              if (!s.fecha) return;
              const d = parseISO(`${s.fecha}T12:00:00`);
              if (isValid(d) && d >= start && d <= end) {
                 const sn = p.tratamiento || 'Sesión General';
                 
                 let cat = 'Sesiones';
                 if (selectedCategory !== 'Todas' && cat !== selectedCategory && sn !== selectedCategory) {
                   return;
                 }
                 
                 // Filtrar por método de pago
                 const method = s.metodoPago || 'efectivo';
                 if (selectedPaymentMethod !== 'Todos' && selectedPaymentMethod !== method) {
                   return; // Skip si no coincide
                 }
                 
                 const priceSession = Number(p.precioPorSesion || 0);
                 const sCopy = { 
                   ...s, 
                   date: s.fecha, 
                   clientName: p.pacienteNombre || 'Paciente', 
                   serviceName: sn, 
                   staffName: p.profesionalAsignado || 'N/A', 
                   estadoExcel: s.pagado ? formatCOP(priceSession) : `${formatCOP(priceSession)} (Pendiente)`,
                   metodoExcel: method
                 };
                 matchedCitas.push(sCopy);

                 registrosMes++;
                 demoCounts[cat] = (demoCounts[cat] || 0) + 1;
                 
                 if (s.pagado) {
                   ingresosCalculados += priceSession;
                 }
              }
            });
          }
        });

        // Evaluar Pedidos
        try {
          pedidosData.forEach(p => {
            if (p.status?.includes('Confirmada') || p.status?.includes('Pagado') || p.status?.includes('Aprobado')) {
               let dStr = '';
               if (p.createdAt?.toDate) dStr = p.createdAt.toDate().toISOString();
               else if (p.createdAt) dStr = new Date(p.createdAt).toISOString();
               else dStr = p.date;
               
               if (!dStr) return;
               const d = parseISO(dStr);
               if (isValid(d) && d >= start && d <= end) {
                   const sn = p.type === 'pos' ? 'Venta Fija (Local)' : 'Venta Producto Web';
                   let cat = 'Productos';
                   
                   if (selectedCategory !== 'Todas' && cat !== selectedCategory && sn !== selectedCategory) {
                     return;
                   }
                   
                   const method = p.paymentMethod || 'transferencia';
                   if (selectedPaymentMethod !== 'Todos' && selectedPaymentMethod !== method.toLowerCase()) {
                     return;
                   }
                   
                   const priceItem = Number(p.amount || 0);
                   const sCopy = { 
                     id: p.id,
                     date: dStr.split('T')[0], 
                     clientName: p.clientName || 'Cliente General', 
                     serviceName: p.itemName || sn, 
                     staffName: 'N/A', 
                     estadoExcel: formatCOP(priceItem),
                     metodoExcel: method
                   };
                   matchedCitas.push(sCopy);
                   registrosMes++;
                   demoCounts[cat] = (demoCounts[cat] || 0) + 1;
                   ingresosCalculados += priceItem;
               }
            }
          });
        } catch (pedidoRepErr) {
          console.error("Error procesando pedidos en Reports", pedidoRepErr);
        }

        // Evaluar Gastos (solo para Utilidad Neta del mes completo)
        let totalGastos = 0;
        gastosData.forEach(g => {
          if (!g.fecha) return;
          const d = parseISO(`${g.fecha}T12:00:00`);
          if (isValid(d) && d >= start && d <= end) {
            totalGastos += Number(g.monto || 0);
          }
        });

        const newDemographics = Object.keys(demoCounts).map(k => ({
            name: k,
            value: Math.round((demoCounts[k] / registrosMes) * 100) || 0
        })).filter(d => d.value > 0);

        setAppointments(matchedCitas);
        setProducts(productosData);
        setServiceDemographics(newDemographics.length > 0 ? newDemographics : [{name: 'Sin datos', value: 100}]);
        
        setReportSummary({
          totalRegistros: registrosMes,
          ingresosBrutos: ingresosCalculados,
          utilidadNeta: ingresosCalculados - totalGastos,
          mesTexto: `del ${format(start, 'dd MMM yyyy', { locale: es })} al ${format(end, 'dd MMM yyyy', { locale: es })}`
        });

      } catch (error) {
        console.error("Error loading report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [startDate, endDate, selectedCategory, selectedPaymentMethod]);

  const handleExportExcel = () => {
    if(loading) return;

    let option = {};
    option.fileName = `Reporte_SPA_${startDate}_a_${endDate}`;
    option.datas = [
      {
        sheetData: products,
        sheetName: 'Inventario Productos',
        sheetFilter: ['sku', 'name', 'category', 'price', 'stock'],
        sheetHeader: ['Codigo', 'Producto', 'Categoria', 'Precio Venta', 'Stock Actual'],
      },
      {
        sheetData: appointments,
        sheetName: 'Historial Ingresos Filtrados',
        sheetFilter: ['date', 'time', 'clientName', 'serviceName', 'staffName', 'metodoExcel', 'estadoExcel'],
        sheetHeader: ['Fecha', 'Hora', 'Paciente', 'Servicio', 'Profesional', 'Método Pago', 'Valor Cobrado / Estado'],
      }
    ];
    let toExcel = new ExportJsonExcel(option); 
    toExcel.saveExcel();
    window.M?.toast({ html: 'Reporte Excel generado y descargado', classes: 'green rounded' });
  };

  const handleExportPDF = () => {
    if (loading) return;
    
    const doc = new jsPDF();
    const tituloReporte = `Reporte Financiero: ${reportSummary.mesTexto.toUpperCase()}`;
    
    // Título y encabezados
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Gris oscuro
    doc.text('ANDREA CARDONA SPA', 14, 20);
    doc.setFontSize(12);
    doc.text(tituloReporte, 14, 28);
    
    // Filtros activos
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Categoría: ${selectedCategory}`, 14, 38);
    doc.text(`Método de Pago: ${selectedPaymentMethod}`, 14, 44);
    
    // Tabla auto-generada (Citas pagadas)
    const tableBody = appointments.map(apt => [
      apt.date || '--',
      apt.clientName || 'N/A',
      apt.serviceName || 'N/A',
      apt.staffName || 'N/A',
      (apt.metodoExcel || '').toUpperCase(),
      apt.estadoExcel || '0'
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Fecha', 'Paciente', 'Tratamiento', 'Profesional', 'Método', 'Cobrado']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, font: 'helvetica' },
      headStyles: { fillColor: [16, 185, 129] }, // Verde SPA
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // Totales Finales
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Registros Pagados: ${reportSummary.totalRegistros}`, 14, finalY);
    doc.setFont(undefined, 'bold');
    doc.text(`Ingresos Brutos: ${formatCOP(reportSummary.ingresosBrutos)}`, 14, finalY + 8);
    
    if (selectedPaymentMethod === 'Todos') {
      doc.text(`Utilidad Neta: ${formatCOP(reportSummary.utilidadNeta)}`, 14, finalY + 16);
    }

    doc.save(`Reporte_SPA_${startDate}_a_${endDate}.pdf`);
    window.M?.toast({ html: 'Reporte PDF generado', classes: 'green rounded' });
  };

  const estimatedProductsSold = products.reduce((acc, p) => acc + (Number(p.minStock) > Number(p.stock) ? Number(p.minStock) - Number(p.stock) : 0), 0);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <div className="page-title">
          <h3 style={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Reportes y Estadísticas
          </h3>
          <p style={{ color: '#64748b' }}>Análisis profundo de la operación mensual.</p>
        </div>
        
        {/* Barra de Herramientas y Filtros */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 140px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Desde</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', margin: 0, boxSizing: 'border-box', width: '100%', fontFamily: 'inherit' }} 
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 140px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Hasta</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', margin: 0, boxSizing: 'border-box', width: '100%', fontFamily: 'inherit' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: '2 1 180px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Categoría / Servicio</label>
            <select 
              className="browser-default"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', margin: 0, boxSizing: 'border-box', width: '100%', fontFamily: 'inherit' }} 
            >
              <option value="Todas">Todas</option>
              <option value="Masajes">Masajes / Relajantes</option>
              <option value="Faciales">Faciales / Limpiezas</option>
              <option value="Corporales">Corporales / Reducción</option>
              <option value="Bronceado">Bronceado</option>
              <option value="Sesiones">Sesiones y Paquetes</option>
              <option value="Otros">Otros</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', flex: '2 1 180px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>Método Pago</label>
            <select 
              className="browser-default"
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              style={{ height: '42px', padding: '0 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: 'white', margin: 0, boxSizing: 'border-box', width: '100%', fontFamily: 'inherit' }} 
            >
              <option value="Todos">Todos</option>
              <option value="efectivo">Efectivo 💵</option>
              <option value="transferencia">Transferencia 🏦</option>
              <option value="tarjeta">Tarjeta (Datáfono) 💳</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            <button className="modern-btn-outline" onClick={handleExportExcel} disabled={loading} style={{ height: '42px', padding: '0 20px', color: '#16a34a', borderColor: '#bbf7d0', display: 'flex', justifyContent: 'center', margin: 0 }} title="Descargar en Excel">
              EXCEL
            </button>
            <button className="modern-btn-small" onClick={handleExportPDF} disabled={loading} style={{ height: '42px', padding: '0 20px', backgroundColor: '#dc2626', display: 'flex', justifyContent: 'center', margin: 0 }} title="Descargar como Documento PDF">
              <Download size={18} style={{marginRight: '8px'}} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Summary Banner */}
      {!loading && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', backgroundColor: '#e0e7ff', borderRadius: '8px', color: '#4f46e5' }}>
             <Filter size={20} />
          </div>
          <span style={{ fontSize: '0.95rem', color: '#334155', fontWeight: 500 }}>
            Este reporte contiene <strong style={{color:'#0f172a'}}>{reportSummary.totalRegistros}</strong> registros de <strong style={{color:'#0f172a', textTransform: 'capitalize'}}>{reportSummary.mesTexto}</strong> {selectedCategory !== 'Todas' ? `para la categoría "${selectedCategory}" ` : ''}{selectedPaymentMethod !== 'Todos' ? `pagados en "${selectedPaymentMethod}" ` : ''}con un ingreso bruto filtrado de <strong style={{color:'#10b981'}}>{formatCOP(reportSummary.ingresosBrutos)}</strong>.
          </span>
        </div>
      )}

      <div className="row" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {/* KPI 1 */}
        <div className="col s12 m4" style={{ display: 'flex' }}>
          <div className="card-panel" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ padding: '15px', backgroundColor: '#e0f2fe', borderRadius: '12px', color: '#0284c7' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Total Ingresos Brutos (Mes)</p>
              <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '1.5rem' }}>
                {loading ? <div className="skeleton-text" style={{width:'100px', height:'26px'}}/> : formatCOP(reportSummary.ingresosBrutos)}
              </h4>
            </div>
          </div>
        </div>
        {/* KPI 2 */}
        <div className="col s12 m4" style={{ display: 'flex' }}>
          <div className="card-panel" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ padding: '15px', backgroundColor: '#fce7f3', borderRadius: '12px', color: '#db2777' }}>
              <Calendar size={24} />
            </div>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Registros Filtrados</p>
              <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '1.5rem' }}>
                {loading ? <div className="skeleton-text" style={{width:'60px', height:'26px'}}/> : reportSummary.totalRegistros}
              </h4>
            </div>
          </div>
        </div>
        {/* KPI 3 */}
        <div className="col s12 m4" style={{ display: 'flex' }}>
          <div className="card-panel" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ padding: '15px', backgroundColor: '#fef3c7', borderRadius: '12px', color: '#d97706' }}>
              <Package size={24} />
            </div>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Déficit de Inventario</p>
              <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '1.5rem' }}>
                {loading ? <div className="skeleton-text" style={{width:'60px', height:'26px'}}/> : `${estimatedProductsSold} unds`}
              </h4>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {/* Chart 1: Bar Chart */}
        <div className="col s12 l7">
          <div className="card-panel" style={{ padding: '1.5rem', height: '100%' }}>
            <h6 style={{ fontWeight: 600, marginBottom: '1.5rem', color: '#334155' }}>Proyección Ingresos Diarios</h6>
            <div style={{ width: '100%', height: 300 }}>
              {loading ? <div className="skeleton-box" style={{width:'100%', height:'100%'}}/> : (
              <ResponsiveContainer>
                <BarChart data={mockDailyRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} dx={-10} tickFormatter={(val) => `$${val}k`} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="servicios" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} name="Servicios" />
                  <Bar dataKey="productos" stackId="a" fill="#0284c7" radius={[4, 4, 0, 0]} name="Productos" />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Chart 2: Pie Chart */}
        <div className="col s12 l5">
          <div className="card-panel" style={{ padding: '1.5rem', height: '100%' }}>
            <h6 style={{ fontWeight: 600, marginBottom: '1.5rem', color: '#334155' }}>Demanda por Categoría</h6>
            {loading ? (
               <div style={{height: '300px', display: 'flex', alignItems:'center', justifyContent:'center'}}>
                 <div className="skeleton-circle" style={{width:'200px', height:'200px'}}/>
               </div>
            ) : (
                <>
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={serviceDemographics}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {serviceDemographics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginTop: '10px' }}>
                  {serviceDemographics.map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{entry.name} ({entry.value}%)</span>
                    </div>
                  ))}
                </div>
                </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
