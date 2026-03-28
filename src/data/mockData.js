export const mockClients = [
  { id: 'C001', name: 'Emma Wilson', email: 'emma.w@email.com', phone: '300-123-4567', visits: 12, registered: '2025-01-15', preferences: 'Piel sensible, no usar aloe vera.' },
  { id: 'C002', name: 'Sarah Davis', email: 'sarah.d@email.com', phone: '301-987-6543', visits: 8, registered: '2025-01-22', preferences: 'Prefiere masajes de presión fuerte.' },
  { id: 'C003', name: 'Laura Martínez', email: 'laura.m@email.com', phone: '315-456-7890', visits: 3, registered: '2025-02-10', preferences: 'Alerta alergia a frutos secos.' },
  { id: 'C004', name: 'Valentina Gómez', email: 'valen.g@email.com', phone: '320-111-2222', visits: 1, registered: '2025-03-01', preferences: 'Primera visita, busca relajación por estrés.' }
];

export const mockStaff = [
  { id: 'S001', name: 'María González', role: 'Masajista Licenciada', experience: '8 años', available: true, skills: ['Sueco', 'Tejido Profundo', 'Piedras Calientes'] },
  { id: 'S002', name: 'Sofía Ramírez', role: 'Cosmetóloga Facial', experience: '5 años', available: true, skills: ['Limpiezas', 'Peelings', 'Antiedad'] },
  { id: 'S003', name: 'Ana Restrepo', role: 'Especialista Corporal', experience: '10 años', available: false, skills: ['Reductores', 'Exfoliaciones', 'Bronceado'] }
];

export const mockServices = [
  // Faciales
  { id: 'SRV01', category: 'Facial', name: 'Limpieza Facial Profunda', duration: '60 min', price: 90000, desc: 'Extracción de impurezas y mascarilla nutritiva.' },
  { id: 'SRV02', category: 'Facial', name: 'Tratamiento Antiedad Premium', duration: '90 min', price: 150000, desc: 'Radiofrecuencia y ampolletas de colágeno.' },
  { id: 'SRV03', category: 'Facial', name: 'Peeling Químico Suave', duration: '45 min', price: 120000, desc: 'Renovación celular y luminosidad.' },
  // Corporales
  { id: 'SRV04', category: 'Corporal', name: 'Masaje Reductor (Sesión)', duration: '60 min', price: 80000, desc: 'Técnicas manuales y maderoterapia.' },
  { id: 'SRV05', category: 'Corporal', name: 'Exfoliación con Sales Marinas', duration: '45 min', price: 70000, desc: 'Eliminación de células muertas corporales.' },
  // Relajantes
  { id: 'SRV06', category: 'Masaje', name: 'Masaje Sueco Relajante', duration: '60 min', price: 85000, desc: 'Masaje de cuerpo completo para liberar tensión.' },
  { id: 'SRV07', category: 'Masaje', name: 'Terapia de Piedras Calientes', duration: '90 min', price: 130000, desc: 'Alivio profundo muscular con calor volcánico.' },
  // Otros
  { id: 'SRV08', category: 'Bronceado', name: 'Bronceado en Aerógrafo', duration: '30 min', price: 60000, desc: 'Bronceado uniforme sin daño solar (DHA organic).' },
];

export const mockAppointments = [
  { id: 'APT01', date: '2026-03-18', time: '09:00', clientId: 'C001', clientName: 'Emma Wilson', serviceName: 'Limpieza Facial Profunda', staffId: 'S002', status: 'Confirmada', price: 90000 },
  { id: 'APT02', date: '2026-03-18', time: '11:30', clientId: 'C002', clientName: 'Sarah Davis', serviceName: 'Masaje Sueco Relajante', staffId: 'S001', status: 'Pendiente', price: 85000 },
  { id: 'APT03', date: '2026-03-19', time: '14:00', clientId: 'C003', clientName: 'Laura Martínez', serviceName: 'Bronceado en Aerógrafo', staffId: 'S003', status: 'Confirmada', price: 60000 },
  { id: 'APT04', date: '2026-03-19', time: '16:00', clientId: 'C004', clientName: 'Valentina Gómez', serviceName: 'Tratamiento Antiedad Premium', staffId: 'S002', status: 'Cancelada', price: 150000 }
];

export const mockRevenueData = [
  { name: 'Lun', ingresos: 450000 },
  { name: 'Mar', ingresos: 580000 },
  { name: 'Mié', ingresos: 320000 },
  { name: 'Jue', ingresos: 710000 },
  { name: 'Vie', ingresos: 850000 },
  { name: 'Sáb', ingresos: 1120000 },
  { name: 'Dom', ingresos: 200000 },
];
