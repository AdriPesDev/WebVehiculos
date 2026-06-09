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
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    return { success: true };
  },
  register:       (name, email, pass)  => request('/auth/register', { method: 'POST', body: JSON.stringify({ nombre: name, email, password: pass }) })
    .then(() => {
      return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: pass }) });
    })
    .then(r => {
      if (r.token) {
        localStorage.setItem('token', r.token);
        localStorage.setItem('usuario', JSON.stringify(r.usuario));
      }
      return r;
    }),

  // Dashboard
  dashboard:      () => {
    // Primero obtener usuario para saber su rol
    return request('/auth/me').then(user => {
      const isAdmin = user?.rol === 'admin' || user?.rol === 'superadmin';

      // Armar llamadas condicionales basado en rol
      const calls = [
        request('/vehiculos'),
        request('/usos/activos'),
        isAdmin ? request('/usuarios') : Promise.resolve([]),
        isAdmin ? request('/solicitudes') : Promise.resolve([]),
        Promise.resolve(user)
      ];

      return Promise.allSettled(calls).then(([vehiculosRes, usosRes, usuariosRes, solicitudesRes, meRes]) => {
        const vehiculos = vehiculosRes.status === 'fulfilled' ? vehiculosRes.value : [];
        const usos = usosRes.status === 'fulfilled' ? usosRes.value : [];
        const usuarios = usuariosRes.status === 'fulfilled' ? usuariosRes.value : [];
        const solicitudes = solicitudesRes.status === 'fulfilled' ? solicitudesRes.value : [];
        const userData = meRes.status === 'fulfilled' ? meRes.value : null;

        // Obtener datos completos de la empresa solo si es admin
        const companyPromise = isAdmin && userData?.id_empresa
          ? request(`/empresas/${userData.id_empresa}`).catch(() => null)
          : Promise.resolve(null);

        return companyPromise.then(companyData => {
          const usosArray = Array.isArray(usos) ? usos : (usos?.usos || []);
          return {
            vehiculos,
            usos,
            companyVehicles: vehiculos,
            companyUsers: usuarios,
            activeTrips: usosArray.map(u => ({
              id: u.id_uso,
              vehicleModel: `${u.marca || ''} ${u.modelo || ''}`.trim(),
              vehiclePlate: u.matricula,
              driverName: u.nombre_conductor,
              destination: u.destino,
              checkoutTime: u.fecha_salida,
              passengers: u.pasajeros || [],
              vehicle_id: u.id_vehiculo
            })),
            pendingRequests: Array.isArray(solicitudes) ? solicitudes.filter(s => s.estado === 'pendiente') : [],
            company: companyData ? {
              name: companyData.nombre || 'Mi Empresa',
              id: companyData.id_empresa,
              location: companyData.direccion
            } : (userData ? {
              name: userData.nombre_empresa || 'Mi Empresa',
              id: userData.id_empresa,
              location: null
            } : {
              name: 'Mi Empresa',
              location: null
            })
          };
        });
      });
    });
  },

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
    .then(vehicle => ({ ok: true, vehicle })),
  updateVehicle:  (vehicleId, data)    => request(`/vehiculos/${vehicleId}`, { method: 'PUT', body: JSON.stringify(data) })
    .then(() => ({ ok: true }))
    .catch(err => ({ ok: false, error: err.message })),
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
    return request('/mantenimientos', { method: 'POST', body: JSON.stringify(body) })
      .then(() => ({ ok: true }))
      .catch(err => ({ ok: false, error: err.message }));
  },
  endMaintenance: (vehicleId) => {
    return request('/mantenimientos/activos')
      .then(activeMaintenance => {
        const maintenance = Array.isArray(activeMaintenance)
          ? activeMaintenance.find(m => m.id_vehiculo === vehicleId)
          : activeMaintenance.find?.(m => m.id_vehiculo === vehicleId);
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
  createSurvey:   async (data) => {
    try {
      const typeMap = { 'text': 'texto', 'number': 'numero', 'km': 'numero', 'boolean': 'booleano', 'radio': 'opciones' };
      const promises = data.questions.map((q, idx) =>
        request('/encuestas/preguntas', {
          method: 'POST',
          body: JSON.stringify({
            texto: q.text,
            tipo_respuesta: typeMap[q.type] || 'texto',
            obligatoria: q.required || false,
            orden: idx + 1,
            opciones: q.type === 'radio' ? q.options : [],
            id_vehiculos: [data.vehicleId]
          })
        })
      );
      const results = await Promise.all(promises);
      return { ok: true, questions: results };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  getSurveys:     async () => {
    // Note: GET /encuestas/preguntas requires id_uso parameter
    // No endpoint available to list all questions globally
    return { ok: true, surveys: [] };
  },
  deleteSurvey:   (surveyId) => request(`/encuestas/preguntas/${surveyId}`, { method: 'DELETE' })
    .then(() => ({ ok: true }))
    .catch(err => ({ ok: false, error: err.message })),
  getSurveyResponses: (usoId) => request(`/encuestas/respuestas/${usoId}`)
    .then(respuestas => ({ ok: true, respuestas }))
    .catch(err => ({ ok: false, error: err.message })),
  getSurveyHistory: (questionId) => request(`/encuestas/historico/${questionId}`)
    .then(data => ({ ok: true, respuestas: data?.registros || [] }))
    .catch(err => ({ ok: false, error: err.message })),
  getAllSurveyQuestions: () => request('/encuestas/preguntas/admin'),
  deactivateQuestion: (questionId) => request(`/encuestas/preguntas/${questionId}`, { method: 'DELETE' }),
  updateQuestion: (questionId, texto) => request(`/encuestas/preguntas/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify({ texto })
  })
    .then(() => ({ ok: true }))
    .catch(err => ({ ok: false, error: err.message })),
  addQuestionToVehicles: (questionId, vehicleIds) =>
    request(`/encuestas/preguntas/${questionId}/vehiculos`, {
      method: 'POST',
      body: JSON.stringify({ id_vehiculos: vehicleIds })
    })
    .then(() => ({ ok: true }))
    .catch(err => ({ ok: false, error: err.message })),

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
  checkin: async (usoId, returnDriver, km, survey) => {
    try {
      const res = await request(`/usos/${usoId}/entrada`, { method: 'PUT', body: JSON.stringify({ id_conductor_retorno: returnDriver, km: km || null, survey }) });
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  addPassenger: async (usoId, userId) => {
    try {
      const res = await request(`/usos/${usoId}/pasajeros`, { method: 'POST', body: JSON.stringify({ id_usuario: userId }) });
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  removePassenger: async (usoId, userId) => {
    try {
      const res = await request(`/usos/${usoId}/pasajeros/${userId}`, { method: 'DELETE' });
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },
  addObservacion: async (usoId, comentario) => {
    try {
      const res = await request('/observaciones', { method: 'POST', body: JSON.stringify({ id_uso: usoId, comentario }) });
      return { ok: true, data: res };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // Superadmin
  deleteCompany:     (companyId)       => request(`/empresas/${companyId}`, { method: 'DELETE' }),
  superadminStats:        ()                => request('/superadmin/stats'),
  superadminCompanies:    ()                => request('/superadmin/empresas'),
  superadminUsers:        ()                => request('/superadmin/usuarios'),
  superadminActiveTrips:  ()                => request('/superadmin/usos-activos'),
  superadminUpdateUser:   (userId, data)    => request(`/superadmin/usuarios/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),
};