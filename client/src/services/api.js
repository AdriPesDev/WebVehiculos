const API_BASE = import.meta.env.VITE_API_URL || 'http://192.168.69.163:3456/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    throw new Error(data.error || 'Sesión expirada. Por favor inicia sesión de nuevo.');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Error desconocido');
  }

  return data;
}

// Métodos de conveniencia
export const api = {
  get:    (endpoint) => request(endpoint, { method: 'GET' }),
  post:   (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put:    (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

  // Auth
  me:             ()                   => request('/auth/me'),
  login:          (email, password)    => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }).then(r => {
    if (r.token) {
      localStorage.setItem('token', r.token);
      localStorage.setItem('usuario', JSON.stringify(r.usuario));
    }
    return r;
  }),
  logout:         ()                   => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    return Promise.resolve({ success: true });
  },
  register:       (name, email, pass)  => request('/auth/register', { method: 'POST', body: JSON.stringify({ nombre: name, email, password: pass }) })
    .then(() => {
      // Después del registro, hacer login para obtener JWT
      console.log('Register successful, doing automatic login to get JWT');
      return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: pass }) });
    })
    .then(r => {
      console.log('Login response:', r);
      if (r.token) {
        localStorage.setItem('token', r.token);
        localStorage.setItem('usuario', JSON.stringify(r.usuario));
        console.log('Token and user saved to localStorage');
      }
      return r;
    })
    .catch(err => {
      console.error('Register/Login failed:', err);
      throw err;
    }),

  // Dashboard
  dashboard:      () => Promise.allSettled([
    request('/vehiculos'),
    request('/usos/activos'),
    request('/usuarios'),
    request('/solicitudes'),
    request('/auth/me')
  ]).then(([vehiculosRes, usosRes, usuariosRes, solicitudesRes, meRes]) => {
    const vehiculos = vehiculosRes.status === 'fulfilled' ? vehiculosRes.value : [];
    const usos = usosRes.status === 'fulfilled' ? usosRes.value : [];
    const usuarios = usuariosRes.status === 'fulfilled' ? usuariosRes.value : [];
    const solicitudes = solicitudesRes.status === 'fulfilled' ? solicitudesRes.value : [];
    const user = meRes.status === 'fulfilled' ? meRes.value : null;

    // Obtener datos completos de la empresa si el usuario tiene id_empresa
    const companyPromise = user && user.id_empresa
      ? request(`/empresas/${user.id_empresa}`).catch(() => null)
      : Promise.resolve(null);

    return companyPromise.then(companyData => ({
      vehiculos,
      usos,
      companyVehicles: vehiculos,
      companyUsers: usuarios,
      activeTrips: Array.isArray(usos) ? usos : (usos?.usos || []),
      pendingRequests: Array.isArray(solicitudes) ? solicitudes.filter(s => s.estado === 'pendiente') : [],
      company: companyData ? {
        name: companyData.nombre || 'Mi Empresa',
        id: companyData.id_empresa,
        location: companyData.direccion
      } : (user ? {
        name: user.nombre_empresa || 'Mi Empresa',
        id: user.id_empresa,
        location: null
      } : {
        name: 'Mi Empresa',
        location: null
      })
    }));
  }),

  // Company
  companyList:    ()                   => request('/empresas'),
  companyPublicList: ()                => request('/empresas/publico'),
  companyCreate:  (data)               => request('/empresas', { method: 'POST', body: JSON.stringify(data) })
    .then(() => {
      // Después de crear empresa, hacer login automático para obtener JWT con rol actualizado
      const email = sessionStorage.getItem('temp_email');
      const password = sessionStorage.getItem('temp_password');
      if (email && password) {
        return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      }
      return request('/auth/me');
    })
    .then(r => {
      // Guardar token nuevo si viene en la respuesta (del login)
      if (r.token) {
        localStorage.setItem('token', r.token);
      }
      // Guardar usuario actualizado
      const usuario = r.usuario || r;
      localStorage.setItem('usuario', JSON.stringify(usuario));
      // Limpiar credenciales temporales
      sessionStorage.removeItem('temp_email');
      sessionStorage.removeItem('temp_password');
      return { ok: true, user: usuario };
    }),
  companyJoin:    (companyId)          => request('/solicitudes', { method: 'POST', body: JSON.stringify({ id_empresa: companyId }) })
    .then(() => request('/auth/me'))
    .then(usuario => {
      localStorage.setItem('usuario', JSON.stringify(usuario));
      return { ok: true, user: usuario };
    }),

  // Admin — membership
  approveRequest: (requestId)          => request(`/solicitudes/${requestId}`, { method: 'PUT', body: JSON.stringify({ estado: 'aprobada' }) }),
  rejectRequest:  (requestId)          => request(`/solicitudes/${requestId}`, { method: 'PUT', body: JSON.stringify({ estado: 'rechazada' }) }),

  // Admin — vehicles
  addVehicle:     (data)               => request('/vehiculos', { method: 'POST', body: JSON.stringify(data) })
    .then(vehicle => {
      console.log('Vehicle created:', vehicle);
      return { ok: true, vehicle };
    }),
  deleteVehicle:  (vehicleId)          => request(`/vehiculos/${vehicleId}`, { method: 'DELETE' })
    .then(() => ({ ok: true }))
    .catch(err => ({ ok: false, error: err.message })),

  // Admin — maintenance
  startMaintenance: (vehicleId, reason) => {
    const body = {
      id_vehiculo: vehicleId,
      descripcion: reason || null,
      fecha_inicio: new Date().toISOString()
    };
    console.log('Starting maintenance with body:', body);
    return request('/mantenimientos', { method: 'POST', body: JSON.stringify(body) })
      .then(res => {
        console.log('Maintenance response:', res);
        return { ok: true };
      })
      .catch(err => {
        console.error('Maintenance error:', err);
        return { ok: false, error: err.message };
      });
  },
  endMaintenance: (vehicleId) => {
    return request('/mantenimientos/activos')
      .then(activeMaintenance => {
        const maintenance = Array.isArray(activeMaintenance)
          ? activeMaintenance.find(m => m.id_vehiculo === vehicleId)
          : activeMaintenance.find && activeMaintenance.find(m => m.id_vehiculo === vehicleId);
        if (!maintenance) {
          throw new Error('No se encontró un mantenimiento activo para este vehículo');
        }
        const maintenanceId = maintenance.id_mantenimiento || maintenance.id;
        if (!maintenanceId) {
          throw new Error('El mantenimiento no tiene un ID válido');
        }
        const token = getToken();
        const headers = {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        };
        const body = {
          fecha_fin: new Date().toISOString()
        };
        return fetch(`${API_BASE}/mantenimientos/${maintenanceId}`, { method: 'PUT', headers, body: JSON.stringify(body) })
          .then(r => r.json())
          .then(() => ({ ok: true }))
          .catch(err => ({ ok: false, error: err.message }));
      })
      .catch(err => ({ ok: false, error: err.message }));
  },

  // Admin — employees
  addEmployee:    (data)               => request('/usuarios', { method: 'POST', body: JSON.stringify(data) }),
  removeEmployee: (userId)             => request(`/usuarios/${userId}`, { method: 'DELETE' }),

  // Admin — surveys
  createSurvey:   (data)               => request('/admin/survey/create', { method: 'POST', body: JSON.stringify(data) }),
  getSurveys:     ()                   => request('/admin/surveys'),
  deleteSurvey:   (surveyId)           => request(`/admin/survey/${surveyId}`, { method: 'DELETE' }),

  // Vehicle detail
  vehicleDetail:  (vehicleId)          => request(`/vehiculos/${vehicleId}`),

  checkout: async (vehicleId, driverId, destination) => {
    try {
      const res = await request('/usos', { method: 'POST', body: JSON.stringify({ id_vehiculo: vehicleId, id_conductor: driverId || null, destino: destination || null }) });
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  resetVehicleState: async (vehicleId) => {
    try {
      const res = await request(`/vehiculos/${vehicleId}/reset`, { method: 'PUT' });
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  checkin: async (vehicleId, returnDriver, km, survey) => {
    try {
      const res = await request(`/usos/${vehicleId}/entrada`, { method: 'PUT', body: JSON.stringify({ id_conductor_retorno: returnDriver, km: km || null, survey }) });
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  addPassenger: async (vehicleId, passengerName, userId) => {
    try {
      const res = await request('/observaciones', { method: 'POST', body: JSON.stringify({ id_uso: vehicleId, descripcion: passengerName, id_usuario: userId || null }) });
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  removePassenger: async (vehicleId, passengerIndex) => {
    try {
      const res = await request(`/observaciones/${passengerIndex}`, { method: 'DELETE' });
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // Superadmin
  deleteCompany:  (companyId)          => request(`/empresas/${companyId}`, { method: 'DELETE' }),
};