import React, { useState, useEffect } from 'react';
import { DollarSign, Activity, Percent, TrendingUp, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, PieChart as PieChartIcon, Wallet, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getAllDocuments } from '../services/firebaseUtils';
import { parseISO, isSameMonth, subMonths, format, getDate, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = ['#d4af37', '#f472b6', '#94a3b8', '#fbbf24', '#db2777', '#cbd5e1'];

const Overview = ({ onNavigateToReports }) => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [stats, setStats] = useState({
    ingresosMes: 0,
    gastosMes: 0,
    utilidadMes: 0,
    utilidadMesAnterior: 0,
    ticketPromedio: 0,
    tasaOcupacion: 0
  });
  
  const [areaData, setAreaData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const [citas, planes, servicios, empleados, gastos, pedidos] = await Promise.all([
          getAllDocuments('citas'),
          getAllDocuments('sesiones'),
          getAllDocuments('servicios'),
          getAllDocuments('empleados'),
          getAllDocuments('gastos'),
          getAllDocuments('pedidos')
        ]);
        
        // For parsing month back to date
        const [yyyy, mm] = selectedMonth.split('-');
        const currentMonth = new Date(Number(yyyy), Number(mm) - 1, 1);
        const prevMonth = subMonths(currentMonth, 1);

        const servicePrices = {};
        const serviceNames = {};
        servicios.forEach(s => {
          const priceStr = String(s.price || s.precio || '0').replace(/\D/g, '');
          servicePrices[s.id] = Number(priceStr);
          serviceNames[s.id] = s.name || s.nombre || 'Servicio';
        });

        let ingresosMesActual = 0;
        let transaccionesMesActual = 0;
        let ingresosPorServicio = {};
        let citasProgramadasActuales = 0;

        let gastosMesActual = 0;

        // Init area data (1-31)
        const aData = Array.from({ length: 31 }, (_, i) => ({
          day: (i + 1).toString(),
          IngresosActual: 0,
          IngresosAnterior: 0,
          GastosActual: 0,
          GastosAnterior: 0,
          Actual: 0,
          Anterior: 0
        }));

        const addIngreso = (dateStr, price, sName) => {
          if (!dateStr) return;
          const d = parseISO(dateStr);
          if (!isValid(d)) return;

          if (isSameMonth(d, currentMonth)) {
            ingresosMesActual += price;
            transaccionesMesActual++;
            ingresosPorServicio[sName] = (ingresosPorServicio[sName] || 0) + price;
            const day = getDate(d) - 1;
            if (aData[day]) aData[day].IngresosActual += price;
          } else if (isSameMonth(d, prevMonth)) {
            const day = getDate(d) - 1;
            if (aData[day]) aData[day].IngresosAnterior += price;
          }
        };

        const addCitaProgramada = (dateStr) => {
          if (!dateStr) return;
          const d = parseISO(dateStr);
          if (isValid(d) && isSameMonth(d, currentMonth)) {
            citasProgramadasActuales++;
          }
        };

        // Citas
        citas.forEach(c => {
          addCitaProgramada(c.date);
          if (c.pagado) {
            const price = servicePrices[c.serviceId] || 0;
            const sName = serviceNames[c.serviceId] || c.serviceName || 'Otras Citas';
            addIngreso(c.date, price, sName);
          }
        });

        // Sesiones
        planes.forEach(p => {
          if (p.sesiones && Array.isArray(p.sesiones)) {
            p.sesiones.forEach(s => {
              addCitaProgramada(s.fecha);
              if (s.pagado && s.fecha) {
                const price = Number(p.precioPorSesion || 0);
                const sName = p.tratamiento || 'Sesión General';
                addIngreso(s.fecha, price, sName);
              }
            });
          }
        });

        // Pedidos (Web E-commerce & POS)
        try {
          pedidos.forEach(p => {
            if (p.status?.includes('Confirmada') || p.status?.includes('Pagado') || p.status?.includes('Aprobado')) {
               let dateStr = '';
               if (p.createdAt?.toDate) {
                 dateStr = p.createdAt.toDate().toISOString();
               } else if (p.createdAt) {
                 dateStr = new Date(p.createdAt).toISOString();
               } else if (p.date) {
                 dateStr = p.date;
               }

               if (dateStr) {
                 const price = Number(p.amount || 0);
                 const typeName = p.type === 'pos' ? 'Venta POS Mostrador' : 'Venta E-Commerce';
                 addIngreso(dateStr, price, typeName);
               }
            }
          });
        } catch (pedidoErr) {
          console.error("Error procesando pedidos en Overview:", pedidoErr);
        }

        // Gastos
        gastos.forEach(g => {
          if (!g.fecha) return;
          const d = parseISO(g.fecha);
          if (!isValid(d)) return;
          const monto = Number(g.monto || 0);

          if (isSameMonth(d, currentMonth)) {
            gastosMesActual += monto;
            const day = getDate(d) - 1;
            if (aData[day]) aData[day].GastosActual += monto;
          } else if (isSameMonth(d, prevMonth)) {
            const day = getDate(d) - 1;
            if (aData[day]) aData[day].GastosAnterior += monto;
          }
        });

        // Compute Area Data Net Profits
        let totalUtilidadMesActual = 0;
        let totalUtilidadMesAnterior = 0;

        aData.forEach(d => {
          d.Actual = d.IngresosActual - d.GastosActual;
          d.Anterior = d.IngresosAnterior - d.GastosAnterior;
          totalUtilidadMesActual += d.Actual;
          totalUtilidadMesAnterior += d.Anterior;
        });

        const ticketPromedio = transaccionesMesActual > 0 ? (ingresosMesActual / transaccionesMesActual) : 0;
        const activeStaff = empleados.filter(e => e.status !== 'Inactivo').length || 1;
        const maxCitas = activeStaff * 192; 
        const ocupacion = maxCitas > 0 ? Math.min((citasProgramadasActuales / maxCitas) * 100, 100) : 0;

        const pData = Object.keys(ingresosPorServicio)
          .map(k => ({ name: k, value: ingresosPorServicio[k] }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        
        const otrosValue = Object.keys(ingresosPorServicio)
          .sort((a,b) => ingresosPorServicio[b] - ingresosPorServicio[a])
          .slice(5)
          .reduce((sum, key) => sum + ingresosPorServicio[key], 0);
        
        if (otrosValue > 0) pData.push({ name: 'Otros', value: otrosValue });

        setStats({
          ingresosMes: ingresosMesActual,
          gastosMes: gastosMesActual,
          utilidadMes: totalUtilidadMesActual,
          utilidadMesAnterior: totalUtilidadMesAnterior,
          ticketPromedio,
          tasaOcupacion: ocupacion
        });
        setAreaData(aData);
        setPieData(pData);

      } catch (error) {
        console.error("Error fetching BI stats:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, [selectedMonth]);

  const formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  const percentChange = stats.utilidadMesAnterior > 0 
    ? ((stats.utilidadMes - stats.utilidadMesAnterior) / Math.abs(stats.utilidadMesAnterior)) * 100 
    : (stats.utilidadMes > 0 ? 100 : 0);

  const getOcupacionTheme = (tasa) => {
    if (tasa < 30) return { color: '#ef4444', badgeBg: '#fef2f2', text: '¡Alerta! Baja ocupación, considera lanzar una promoción.', shadow: '0 0 20px rgba(239, 68, 68, 0.3)' };
    if (tasa < 70) return { color: '#f59e0b', badgeBg: '#fffbeb', text: 'Ocupación estable. Buen flujo de clientes.', shadow: '0 0 20px rgba(245, 158, 11, 0.3)' };
    return { color: '#10b981', badgeBg: '#ecfdf5', text: '¡Excelente! SPA casi a máxima capacidad.', shadow: '0 0 20px rgba(16, 185, 129, 0.3)' };
  };
  const ocTheme = getOcupacionTheme(stats.tasaOcupacion);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-title">
          <h3 style={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={28} color="#d4af37" /> Dashboard de BI
          </h3>
          <p style={{ color: '#64748b' }}>Inteligencia de negocios y rentabilidad neta.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="modern-btn-small" onClick={() => onNavigateToReports && onNavigateToReports({ month: selectedMonth })} style={{ backgroundColor: '#0f172a', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 20px' }}>
            <BarChart2 size={16} /> Ver Reporte Detallado
          </button>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="modern-btn-outline" 
            style={{ border: '1px solid #d4af37', color: '#d4af37', outline: 'none', height: '42px', padding: '0 12px', boxSizing: 'border-box' }} 
          />
        </div>
      </div>

      <div className="row" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {/* KPI 1: Utilidad Neta */}
        <div className="col s12 m4" style={{ display: 'flex' }}>
          <div className="card-panel" style={{ width: '100%', padding: '1.75rem', borderRadius: '20px', boxShadow: '0 15px 35px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #d4af37', backgroundColor: stats.utilidadMes < 0 && !loading ? '#fef2f2' : (stats.utilidadMes > 0 && !loading ? '#ecfdf5' : 'var(--spa-surface)'), transition: 'background-color 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ padding: '12px', backgroundColor: '#fef9c3', borderRadius: '12px' }}>
                <DollarSign size={24} color="#d4af37" />
              </div>
              {percentChange >= 0 ? (
                <span style={{ display: 'flex', alignItems: 'center', color: '#10b981', fontSize: '0.88rem', fontWeight: 700, backgroundColor: '#ecfdf5', padding: '4px 8px', borderRadius: '20px' }}>
                  <ArrowUpRight size={16} style={{marginRight: '2px'}} /> +{percentChange.toFixed(1)}%
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', color: '#ef4444', fontSize: '0.88rem', fontWeight: 700, backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '20px' }}>
                  <ArrowDownRight size={16} style={{marginRight: '2px'}} /> {percentChange.toFixed(1)}%
                </span>
              )}
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>Utilidad Neta (Ganancia Real)</p>
              <h4 style={{ margin: 0, fontWeight: 900, color: '#0f172a', fontSize: '1.9rem', height: '34px', display: 'flex', alignItems: 'center' }}>
                {loading ? <div className="skeleton-text" style={{ width: '150px', height: '100%', borderRadius: '4px' }} /> : formatCOP(stats.utilidadMes)}
              </h4>
              {!loading && (
                <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '8px' }}>
                  <span>Ingresos: <strong style={{color: '#10b981'}}>{formatCOP(stats.ingresosMes)}</strong></span>
                  <span>Egresos: <strong style={{color: '#ef4444'}}>{formatCOP(stats.gastosMes)}</strong></span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* KPI 2: Ticket Promedio */}
        <div className="col s12 m4" style={{ display: 'flex' }}>
          <div className="card-panel" style={{ width: '100%', padding: '1.75rem', borderRadius: '20px', boxShadow: '0 15px 35px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #f472b6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ padding: '12px', backgroundColor: '#fce7f3', borderRadius: '12px' }}>
                <TrendingUp size={24} color="#db2777" />
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>Ticket Promedio de Ingresos</p>
              <h4 style={{ margin: 0, fontWeight: 900, color: '#0f172a', fontSize: '1.9rem', height: '34px', display: 'flex', alignItems: 'center' }}>
                {loading ? <div className="skeleton-text" style={{ width: '120px', height: '100%', borderRadius: '4px' }} /> : formatCOP(stats.ticketPromedio)}
              </h4>
            </div>
          </div>
        </div>

        {/* KPI 3: Tasa de Ocupación */}
        <div className="col s12 m4" style={{ display: 'flex' }}>
          <div className="card-panel" style={{ width: '100%', padding: '1.75rem', borderRadius: '20px', boxShadow: loading ? '0 15px 35px -5px rgba(0,0,0,0.05)' : ocTheme.shadow, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: `4px solid ${loading ? '#334155' : ocTheme.color}`, transition: 'box-shadow 0.5s ease, border-color 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ padding: '12px', backgroundColor: loading ? '#f1f5f9' : ocTheme.badgeBg, borderRadius: '12px', transition: 'background-color 0.5s ease' }}>
                <Percent size={24} color={loading ? '#334155' : ocTheme.color} style={{ transition: 'color 0.5s ease' }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '20px' }}>
                Basado en Staff
              </span>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>Ocupación de Agenda</p>
              <h4 style={{ margin: 0, fontWeight: 800, color: loading ? '#0f172a' : ocTheme.color, fontSize: '1.8rem', height: '34px', transition: 'color 0.5s ease' }}>
                {loading ? <div className="skeleton-text" style={{ width: '80px', height: '100%', borderRadius: '4px' }} /> : `${Math.round(stats.tasaOcupacion)}%`}
              </h4>
              {!loading && (
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                  {ocTheme.text}
                </p>
              )}
              <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '10px', marginTop: '12px' }}>
                <div style={{ width: `${stats.tasaOcupacion}%`, height: '100%', backgroundColor: loading ? '#334155' : ocTheme.color, borderRadius: '10px', transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ display: 'flex', flexWrap: 'wrap' }}>
        {/* Gráfico de Área */}
        <div className="col s12 m8">
          <div className="card-panel" style={{ padding: '2rem', borderRadius: '20px', boxShadow: '0 15px 35px -5px rgba(0,0,0,0.05)', height: '100%' }}>
            <h5 style={{ fontWeight: 800, marginBottom: '25px', color: '#0f172a', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="#d4af37" /> Crecimiento de Utilidades Netas
            </h5>
            <div style={{ width: '100%', height: 380 }}>
              {loading ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'flex-end', gap: '2%' }}>
                  {[30, 50, 40, 70, 60, 90, 80, 100].map((h, i) => (
                    <div key={i} className="skeleton-box" style={{ width: '10%', height: `${h}%`, borderRadius: '4px 4px 0 0' }}></div>
                  ))}
                </div>
              ) : (
                <ResponsiveContainer>
                  <AreaChart data={areaData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d4af37" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAnterior" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f8fafc" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f8fafc" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={15} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(value) => formatCOP(value)} labelFormatter={(label) => `Día ${label}`} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="Anterior" name="Mes Anterior" stroke="#cbd5e1" strokeWidth={2} fillOpacity={1} fill="url(#colorAnterior)" animationDuration={1500} />
                    <Area type="monotone" dataKey="Actual" name="Mes Actual" stroke="#d4af37" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Gráfico Circular */}
        <div className="col s12 m4">
          <div className="card-panel" style={{ padding: '2rem', borderRadius: '20px', boxShadow: '0 15px 35px -5px rgba(0,0,0,0.05)', height: '100%' }}>
            <h5 style={{ fontWeight: 800, marginBottom: '25px', color: '#0f172a', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChartIcon size={20} color="#f472b6" /> Ingresos por Servicio
            </h5>
            <div style={{ width: '100%', height: 380, position: 'relative' }}>
              {loading ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="skeleton-circle" style={{ width: '220px', height: '220px' }}></div>
                </div>
              ) : pieData.length === 0 ? (
                 <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center', fontSize: '0.9rem' }}>
                   No hay ingresos registrados este mes.
                 </div>
              ) : (
                <ResponsiveContainer width="99%" height={380}>
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      animationDuration={1500}
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          onClick={() => onNavigateToReports && onNavigateToReports({ month: selectedMonth, category: entry.name })}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCOP(value)} 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px', color: '#475569', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
