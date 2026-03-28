import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { LogOut, LayoutDashboard, Calendar, Users, Scissors, UserCircle, Menu, Settings, Megaphone, CreditCard, Package, BarChart2, ClipboardList, Activity, Wallet, Bell, Cake, CheckCircle, ShoppingCart } from 'lucide-react';
import '../dashboard.css'; // Global dashboard overrides
import spaLogo from '../assets/Logo.jpeg';

// Modular Views
import Overview from '../views/Overview';
import Appointments from '../views/Appointments';
import Services from '../views/Services';
import Clients from '../views/Clients';
import Staff from '../views/Staff';
import Products from '../views/Products';
import Reports from '../views/Reports';
import FichasTecnicas from '../views/FichasTecnicas';
import Profile from '../views/Profile';
import Expenses from '../views/Expenses';
import Marketing from '../views/Marketing';
import PagosPendientes from '../views/PagosPendientes';
import PosSales from '../views/PosSales';
import ErrorBoundary from '../components/ErrorBoundary';
import SettingsView from '../views/Settings';
import Sesiones from '../views/Sesiones';

function Dashboard() {
  const [currentView, setCurrentView] = useState('overview');
  const [reportFilters, setReportFilters] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [accessModules, setAccessModules] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  
  // --- Notifications State ---
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState('pendientes');
  
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/');
      } else {
        setUserEmail(user.email);

        // RBAC Check
        try {
          const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role);
            setAccessModules(data.accessModules || []);
            
            // Forzar Admin en tiempo real si es el correo principal
            const ADMIN_EMAILS = ['andrea.cardona.mar@outlook.com', 'jdavidcalderon20@gmail.com'];
            if (ADMIN_EMAILS.includes(user.email) && data.role !== 'admin') {
              await setDoc(doc(db, 'usuarios', user.uid), { role: 'admin' }, { merge: true });
              setUserRole('admin');
            }

            if (data.role !== 'admin' && !ADMIN_EMAILS.includes(user.email)) {
              const firstModule = (data.accessModules && data.accessModules.length > 0) ? data.accessModules[0] : 'appointments';
              setCurrentView(firstModule);
            }
          } else {
            // Migración Mágica
            await setDoc(doc(db, 'usuarios', user.uid), {
              name: user.email === 'andrea.cardona.mar@outlook.com' ? 'Andrea Cardona (Admin)' : user.email.includes('jdavid') ? 'Juan (Desarrollador)' : 'Administrador',
              email: user.email,
              role: 'admin',
              accessModules: [],
              createdAt: new Date().toISOString()
            });
            setUserRole('admin');
            setAccessModules([]);
          }
        } catch (error) {
          console.error("Error validando permisos", error);
          setUserRole('empleado');
          setAccessModules(['appointments', 'clients', 'fichas']);
          setCurrentView('appointments');
        }

        setUserLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // --- Process Notifications ---
  useEffect(() => {
    if (userLoading || !userEmail) return;

    const fetchNotifications = async () => {
      try {
        const timestamp = new Date().getTime();
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const todayRaw = new Date();
        const todayMMDD = `-${String(todayRaw.getMonth() + 1).padStart(2, '0')}-${String(todayRaw.getDate()).padStart(2, '0')}`;
        const todayYYYYMMDD = `${todayRaw.getFullYear()}${todayMMDD}`;
        
        const newNotifs = [];

        // 1. Cumpleaños
        if (hasAccess('marketing')) {
          const clientsSnap = await getDocs(collection(db, 'clientes'));
          clientsSnap.forEach(doc => {
            const c = doc.data();
            if (c.birthdate && c.birthdate.endsWith(todayMMDD)) {
              newNotifs.push({
                id: `bday-${doc.id}`,
                type: 'birthday',
                message: `Hoy cumple años ${c.name}. ¡Haz clic para enviarle su regalo!`,
                icon: Cake,
                color: '#ec4899',
                action: () => changeView('marketing'),
                read: false
              });
            }
          });
        }

        // 2. Inventario Bajo (< 3)
        if (hasAccess('products')) {
          const productsSnap = await getDocs(collection(db, 'productos'));
          productsSnap.forEach(doc => {
            const p = doc.data();
            if (Number(p.stock) < 3) {
              newNotifs.push({
                id: `stock-${doc.id}`,
                type: 'inventory',
                message: `¡Alerta! Quedan ${p.stock || 0} unidades de ${p.name}.`,
                icon: Package,
                color: '#f59e0b',
                action: () => changeView('products'),
                read: false
              });
            }
          });
        }

        // 3. Citas de Hoy
        if (hasAccess('appointments')) {
          const appointmentsSnap = await getDocs(query(collection(db, 'citas'), where('date', '==', todayYYYYMMDD)));
          if (!appointmentsSnap.empty) {
             newNotifs.push({
                id: `citas-${todayYYYYMMDD}`,
                type: 'appointment',
                message: `Tienes ${appointmentsSnap.size} citas programadas para el día de hoy.`,
                icon: Calendar,
                color: '#3b82f6',
                action: () => changeView('appointments'),
                read: false
             });
          }
        }

        // 4. Pagos por Verificar (Nequi Landing)
        if (hasAccess('sesiones') || hasAccess('appointments')) {
          const checkSnap = await getDocs(query(collection(db, 'citas'), where('status', '==', 'Pendiente de Verificación')));
          checkSnap.forEach(doc => {
            newNotifs.push({
              id: `verify-${doc.id}`,
              type: 'verification',
              message: `Nuevo pago por verificar de ${doc.data().clientName}.`,
              icon: CreditCard,
              color: '#10b981',
              action: () => changeView('pagos-pendientes'),
              read: false
            });
          });
          
          const checkPedidos = await getDocs(query(collection(db, 'pedidos'), where('status', '==', 'Pendiente de Verificación')));
          checkPedidos.forEach(doc => {
             newNotifs.push({
              id: `verify-ped-${doc.id}`,
              type: 'verification',
              message: `Nuevo pago de producto de ${doc.data().clientName}.`,
              icon: Package,
              color: '#10b981',
              action: () => changeView('pagos-pendientes'),
              read: false
            });
          });
        }

        // 5. Notificaciones desde la Web Pública
        if (hasAccess('appointments')) {
          const { deleteDoc, doc } = await import('firebase/firestore');
          const webNotifsSnap = await getDocs(collection(db, 'notificaciones'));
          const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);

          for (const document of webNotifsSnap.docs) {
            const data = document.data();
            const createdAtMs = data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : Date.now();
            
            if (createdAtMs < threeDaysAgo) {
               try { await deleteDoc(doc(db, 'notificaciones', document.id)); } catch(e) { console.error(e) }
            } else {
               const isOrder = data.title && (
                 data.title.includes('Pedido') ||
                 data.title.includes('Compra') ||
                 data.title.includes('🛒') ||
                 data.title.includes('🛍️')
               );
               newNotifs.push({
                 id: `web-${document.id}`,
                 type: isOrder ? 'web_order' : 'web_appointment',
                 message: data.title ? `${data.title}: ${data.message}` : data.message,
                 icon: Bell,
                 color: isOrder ? '#10b981' : '#8b5cf6',
                 action: () => changeView(isOrder ? 'pagos-pendientes' : 'appointments'),
                 read: data.read || false,
                 createdAtMs
               });
            }
          }
        }

        setNotifications(newNotifs);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, [userLoading, userEmail, userRole, accessModules]);

  const markNotificationAsRead = async (id, action) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setIsNotificationsOpen(false);
    
    if (String(id).startsWith('web-')) {
      try {
        const { updateDoc, doc } = await import('firebase/firestore');
        const docId = String(id).replace('web-', '');
        await updateDoc(doc(db, 'notificaciones', docId), { read: true });
      } catch (err) {
        console.error("Error marking as read", err);
      }
    }
    
    if (action) action();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  const changeView = (view) => {
    setCurrentView(view);
    if (view !== 'reports') setReportFilters(null);
    setIsMobileMenuOpen(false); // Close mobile menu when navigating
    setIsProfileMenuOpen(false);
  };

  const handleNavigateToReports = (filters) => {
    setReportFilters(filters);
    setCurrentView('reports');
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  const navigateToFicha = (clienteId) => {
    setSelectedClientId(clienteId);
    setCurrentView('fichas');
  };

  const renderContent = () => {
    switch(currentView) {
      case 'overview': return <Overview onNavigateToReports={handleNavigateToReports} />;
      case 'appointments': return <Appointments />;
      case 'clients': return <Clients onVerFicha={navigateToFicha} />;
      case 'services': return <Services />;
      case 'staff': return <Staff />;
      case 'products': return <Products />;
      case 'reports': return <Reports initialFilters={reportFilters} />;
      case 'profile': return <Profile userEmail={userEmail} />;
      case 'fichas': return <FichasTecnicas selectedClientId={selectedClientId} />;
      case 'sesiones': return <ErrorBoundary><Sesiones /></ErrorBoundary>;
      case 'pos': return <PosSales />;
      case 'expenses': return <Expenses />;
      case 'settings': return <SettingsView />;
      case 'marketing': return <Marketing />;
      case 'pagos-pendientes': return <PagosPendientes />;
      case 'billing':
        return (
          <div className="page-container center-align" style={{ marginTop: '10vh' }}>
            <h4 style={{ color: '#0f172a', fontWeight: 600 }}>Módulo de Facturación</h4>
            <p style={{ color: '#64748b' }}>Esta sección está actualmente en construcción. Aquí podrás gestionar las facturas electrónicas e historial de cobros pronto.</p>
            <button className="modern-btn-outline" style={{ margin: '20px auto' }} onClick={() => changeView('overview')}>Volver al Panel</button>
          </div>
        );
      case 'marketing': return <Marketing />;
      default: return <Overview />;
    }
  };

  if (userLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f5f9' }}>
        <div className="preloader-wrapper big active">
          <div className="spinner-layer spinner-green-only">
            <div className="circle-clipper left"><div className="circle"></div></div>
          </div>
        </div>
      </div>
    );
  }

  const hasAccess = (moduleId) => {
    if (userRole === 'admin') return true;
    return accessModules.includes(moduleId);
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Area */}
      <aside className={`dashboard-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ height: 'auto', minHeight: '130px', padding: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
            <img 
              src={spaLogo} 
              alt="Andrea Cardona SPA Logo" 
              style={{ width: '100%', maxWidth: '240px', maxHeight: '180px', height: 'auto', objectFit: 'contain' }} 
            />
          </div>
        </div>
        <div className="sidebar-nav">
          {hasAccess('overview') && (
            <>
              <div className="nav-section">Gestión Principal</div>
              <div className={`nav-item ${currentView === 'overview' ? 'active' : ''}`} onClick={() => changeView('overview')}>
                <LayoutDashboard size={20} /> Panel Principal
              </div>
            </>
          )}

          {(hasAccess('appointments') || hasAccess('clients') || hasAccess('fichas')) && <div className="nav-section">Atención al Cliente</div>}
          
          {hasAccess('appointments') && (
            <div className={`nav-item ${currentView === 'appointments' ? 'active' : ''}`} onClick={() => changeView('appointments')}>
              <Calendar size={20} /> Citas
            </div>
          )}
          {hasAccess('clients') && (
            <div className={`nav-item ${currentView === 'clients' ? 'active' : ''}`} onClick={() => changeView('clients')}>
              <Users size={20} /> Clientes
            </div>
          )}
          {hasAccess('fichas') && (
            <div className={`nav-item ${currentView === 'fichas' ? 'active' : ''}`} onClick={() => { setSelectedClientId(null); changeView('fichas'); }}>
              <ClipboardList size={20} /> Fichas Técnicas
            </div>
          )}

          {(hasAccess('services') || hasAccess('products') || hasAccess('staff') || hasAccess('sesiones') || hasAccess('billing') || hasAccess('expenses')) && (
            <div className="nav-section">Operaciones</div>
          )}
          {hasAccess('services') && (
            <div className={`nav-item ${currentView === 'services' ? 'active' : ''}`} onClick={() => changeView('services')}>
              <Scissors size={20} /> Servicios
            </div>
          )}
          {hasAccess('products') && (
            <div className={`nav-item ${currentView === 'products' ? 'active' : ''}`} onClick={() => changeView('products')}>
              <Package size={20} /> Inventario
            </div>
          )}
          {hasAccess('staff') && (
            <div className={`nav-item ${currentView === 'staff' ? 'active' : ''}`} onClick={() => changeView('staff')}>
              <UserCircle size={20} /> Profesionales
            </div>
          )}
          {hasAccess('sesiones') && (
            <div className={`nav-item ${currentView === 'sesiones' ? 'active' : ''}`} onClick={() => changeView('sesiones')}>
              <Activity size={20} /> Sesiones y Pagos
            </div>
          )}
          {hasAccess('billing') && (
            <div className={`nav-item ${currentView === 'billing' ? 'active' : ''}`} onClick={() => changeView('billing')}>
              <CreditCard size={20} /> Facturación
            </div>
          )}
          {hasAccess('expenses') && (
            <div className={`nav-item ${currentView === 'expenses' ? 'active' : ''}`} onClick={() => changeView('expenses')}>
              <Wallet size={20} /> Gestión de Gastos
            </div>
          )}

          {(hasAccess('reports') || hasAccess('marketing') || hasAccess('settings')) && (
            <div className="nav-section">Herramientas</div>
          )}
          {hasAccess('reports') && (
            <div className={`nav-item ${currentView === 'reports' ? 'active' : ''}`} onClick={() => changeView('reports')}>
              <BarChart2 size={20} /> Reportes
            </div>
          )}
          {hasAccess('marketing') && (
            <div className={`nav-item ${currentView === 'marketing' ? 'active' : ''}`} onClick={() => changeView('marketing')}>
              <Megaphone size={20} /> Marketing y SMS
            </div>
          )}
          {(hasAccess('sesiones') || hasAccess('appointments')) && (
            <div className={`nav-item ${currentView === 'pagos-pendientes' ? 'active' : ''}`} onClick={() => changeView('pagos-pendientes')} style={{ position: 'relative' }}>
              <CheckCircle size={20} /> Aprobar Pagos Web
            </div>
          )}
          {hasAccess('products') && (
            <div className={`nav-item ${currentView === 'pos' ? 'active' : ''}`} onClick={() => changeView('pos')} style={{ position: 'relative' }}>
              <ShoppingCart size={20} /> POS (Venta Manual)
            </div>
          )}
          {hasAccess('settings') && (
            <div className={`nav-item ${currentView === 'settings' ? 'active' : ''}`} onClick={() => changeView('settings')}>
              <Settings size={20} /> Ajustes
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid #e2e8f0', marginTop: 'auto' }}>
          <button className="modern-btn-outline" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center', color: '#b91c1c', borderColor: '#fca5a5' }}>
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Top Navigation */}
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h5 style={{ margin: 0, fontWeight: 600, color: '#334155', display: 'none' }} className="hide-on-small-only">
              Administración
            </h5>
          </div>
          
          <div className="topbar-right" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '20px' }}>
            
            {/* Notification Bell */}
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => { setIsNotificationsOpen(!isNotificationsOpen); setIsProfileMenuOpen(false); }}>
              <Bell size={22} color="#475569" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span style={{
                  position: 'absolute', top: '-5px', right: '-5px',
                  backgroundColor: '#ef4444', color: 'white',
                  fontSize: '0.65rem', fontWeight: 700,
                  width: '16px', height: '16px',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </div>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: '50px', marginTop: '0.5rem',
                backgroundColor: 'white', borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0',
                width: '320px', zIndex: 1000, overflow: 'hidden'
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>Notificaciones</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={(e) => { e.stopPropagation(); setActiveNotifTab('pendientes') }} style={{ border: 'none', background: activeNotifTab === 'pendientes' ? '#e2e8f0' : 'transparent', padding: '4px 8px', borderRadius: '4px', color: '#334155', fontSize: '0.75rem', cursor: 'pointer', fontWeight: activeNotifTab === 'pendientes' ? 600 : 400 }}>Pendientes</button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveNotifTab('historial') }} style={{ border: 'none', background: activeNotifTab === 'historial' ? '#e2e8f0' : 'transparent', padding: '4px 8px', borderRadius: '4px', color: '#334155', fontSize: '0.75rem', cursor: 'pointer', fontWeight: activeNotifTab === 'historial' ? 600 : 400 }}>Historial</button>
                  </div>
                </div>
                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {(() => {
                    const filtered = notifications.filter(n => activeNotifTab === 'pendientes' ? !n.read : n.read);
                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                          No tienes notificaciones en esta sección.
                        </div>
                      );
                    }
                    return filtered.map(n => {
                      const Icon = n.icon;
                      return (
                        <div 
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id, n.action)}
                          style={{ 
                            padding: '12px 16px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer',
                            display: 'flex', gap: '12px', alignItems: 'flex-start',
                            backgroundColor: n.read ? '#ffffff' : '#fefce8',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = n.read ? '#f8fafc' : '#fef9c3'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.read ? '#ffffff' : '#fefce8'}
                        >
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: `${n.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={16} color={n.color} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: '1.4' }}>{n.message}</p>
                            {!n.read && <span style={{ fontSize: '0.7rem', color: '#ca8a04', fontWeight: 600 }}>Nueva</span>}
                          </div>
                        </div>
                      )
                    });
                  })()}
                </div>
              </div>
            )}

            <div 
              className="user-profile" 
              onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsNotificationsOpen(false); }}
            >
              <div style={{ textAlign: 'right' }} className="hide-on-small-only">
                <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                   {userRole === 'admin' ? 'Administrador' : 'Profesional SPA'}
                </span>
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8' }}>{userEmail}</span>
              </div>
              <div className="avatar" style={{ backgroundColor: userRole === 'admin' ? '#10b981' : '#3b82f6' }}>
                 {userRole === 'admin' ? 'AD' : 'PR'}
              </div>
            </div>

            {/* Profile Dropdown */}
            {isProfileMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '0.5rem',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                border: '1px solid #e2e8f0',
                width: '200px',
                zIndex: 1000,
                overflow: 'hidden'
              }}>
                 <div 
                   style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                   onClick={() => changeView('profile')}
                   onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                   onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                 >
                   <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <UserCircle size={16} /> Ver Perfil
                   </span>
                 </div>
                 <div 
                   style={{ padding: '12px 16px', cursor: 'pointer' }}
                   onClick={handleLogout}
                   onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                   onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                 >
                   <span style={{ fontSize: '0.9rem', color: '#b91c1c', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <LogOut size={16} /> Cerrar Sesión
                   </span>
                 </div>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Page Rendering */}
        <div className="page-container">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
