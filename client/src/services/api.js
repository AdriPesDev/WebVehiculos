const BASE_URL =
  import.meta.env.VITE_API_URL || "http://192.168.69.163:3456/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, opts = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...opts.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers,
    credentials: "include",
  });
  const data = await response.json();

  if (response.status === 401) {
    if (path === "/auth/me") return null;
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/login";
    return;
  }

  if (!response.ok) {
    throw new Error(data.error || "Error desconocido");
  }

  return data;
}

const get = (path) => request(path, { method: "GET" });
const post = (path, body) =>
  request(path, { method: "POST", body: JSON.stringify(body) });
const put = (path, body) =>
  request(path, { method: "PUT", body: JSON.stringify(body) });
const del = (path) => request(path, { method: "DELETE" });

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }).then((res) => {
      if (res?.token) {
        localStorage.setItem("token", res.token);
        localStorage.setItem("usuario", JSON.stringify(res.usuario));
      }
      return res;
    }),

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/login";
  },

  register: (nombre, email, password) =>
    post("/auth/register", { nombre, email, password }),

  me: () =>
    get("/auth/me")
      .then((u) => (u ? { user: normalizeUsuario(u) } : { user: null }))
      .catch(() => ({ user: null })),

  refresh: () =>
    post("/auth/refresh", {}).then((res) => {
      if (res?.token) {
        localStorage.setItem("token", res.token);
        localStorage.setItem("usuario", JSON.stringify(res.usuario));
      }
      return res;
    }),

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  dashboard: async () => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
    if (!usuario) throw new Error("No autenticado");

    if (["admin", "empleado"].includes(usuario.rol) && !usuario.id_empresa) {
      try {
        const refreshed = await post("/auth/refresh", {});
        if (refreshed?.token) {
          localStorage.setItem("token", refreshed.token);
          localStorage.setItem("usuario", JSON.stringify(refreshed.usuario));
          if (!refreshed.usuario?.id_empresa) return { role: "sin_empresa" };
        }
      } catch {
        return { role: "sin_empresa" };
      }
    }

    const rol = usuario.rol;

    if (rol === "admin") {
      const [empresas, vehiculos, usuarios, solicitudes, usos] =
        await Promise.all([
          get("/empresas"),
          get("/vehiculos"),
          get("/usuarios"),
          get("/solicitudes"),
          get("/usos/activos"),
        ]);
      const empresa = empresas[0] || {};
      return {
        role: "admin",
        company: normalizeEmpresa(empresa),
        companyVehicles: vehiculos.map(normalizeVehiculo),
        companyUsers: usuarios.map(normalizeUsuario),
        pendingRequests: solicitudes
          .filter((s) => s.estado === "pendiente")
          .map(normalizeSolicitud),
        activeTrips: usos.map(normalizeUso),
      };
    }

    if (rol === "superadmin") {
      const [empresas, usuarios, vehiculos] = await Promise.all([
        get("/superadmin/empresas"),
        get("/superadmin/usuarios"),
        get("/superadmin/vehiculos"),
      ]);
      return {
        role: "superadmin",
        companies: empresas.map(normalizeEmpresa),
        users: usuarios.map(normalizeUsuario),
        vehicles: vehiculos.map((v) => ({
          ...normalizeVehiculo(v),
          nombre_empresa: v.nombre_empresa,
        })),
      };
    }

    if (rol === "empleado") {
      const [empresas, vehiculos, usos] = await Promise.all([
        get("/empresas/publico"),
        get("/vehiculos"),
        get("/usos"),
      ]);
      const empresaPublica =
        empresas.find((e) => e.id_empresa === usuario.id_empresa) || {};
      const empresa = {
        id_empresa: empresaPublica.id_empresa,
        nombre: empresaPublica.nombre,
      };
      const usosNorm = usos.map(normalizeUso);
      const myActiveTrip =
        usosNorm.find(
          (u) => u.id_usuario === usuario.id_usuario && !u.checkinTime,
        ) || null;
      const activeVehicle = myActiveTrip
        ? vehiculos
            .map(normalizeVehiculo)
            .find((v) => v.id === myActiveTrip.vehicle_id) || null
        : null;
      return {
        role: "empleado",
        company: normalizeEmpresa(empresa),
        companyVehicles: vehiculos.map(normalizeVehiculo),
        userTrips: usosNorm,
        myActiveTrip,
        activeVehicle,
      };
    }

    return { role: "sin_empresa" };
  },

  // ── Empresas ──────────────────────────────────────────────────────────────────
  companyList: () => get("/empresas/publico"),
  companyCreate: (nombre, cif, direccion) =>
    post("/empresas", { nombre, cif, direccion }),
  deleteCompany: (id) =>
    del(`/empresas/${id}`)
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: e.message })),

  // ── Solicitudes ───────────────────────────────────────────────────────────────
  companyJoin: (id_empresa) => post("/solicitudes", { id_empresa }),
  misSolicitudes: () => get("/solicitudes/mis-solicitudes"),

  approveRequest: (id) =>
    put(`/solicitudes/${id}`, { estado: "aprobada" })
      .then((r) => ({ ok: true, ...r }))
      .catch((e) => ({ ok: false, error: e.message })),

  rejectRequest: (id) =>
    put(`/solicitudes/${id}`, { estado: "rechazada" })
      .then((r) => ({ ok: true, ...r }))
      .catch((e) => ({ ok: false, error: e.message })),

  // ── Vehículos ─────────────────────────────────────────────────────────────────
  // Drawer envía { model, plate, tipo, capacity, location }
  // model se separa en marca + modelo por el primer espacio
  addVehicle: ({ model, plate, tipo, capacity, location }) => {
    const partes = (model || "").trim().split(" ");
    const marca = partes.length > 1 ? partes[0] : "";
    const modelo = partes.length > 1 ? partes.slice(1).join(" ") : partes[0];
    return post("/vehiculos", {
      matricula: plate,
      marca,
      modelo,
      tipo: tipo || null,
      capacidad: capacity || null,
      ubicacion: location || null,
    })
      .then((r) => ({ ok: true, vehicle: normalizeVehiculo(r) }))
      .catch((e) => ({ ok: false, error: e.message }));
  },

  deleteVehicle: (id) =>
    del(`/vehiculos/${id}`)
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: e.message })),

  updateVehicle: (id, datos) =>
    put(`/vehiculos/${id}`, datos).catch((e) => {
      throw new Error(e.message);
    }),

  // Usa el nuevo endpoint de detalle completo
  vehicleDetail: (id) =>
    get(`/vehiculos/${id}/detalle`)
      .then((res) => ({
        vehicle: normalizeVehiculo(res.vehicle),
        company: normalizeEmpresa(res.company),
        vehicleTrips: (res.vehicleTrips || []).map(normalizeUso),
        activeTrip: res.activeTrip ? normalizeUso(res.activeTrip) : null,
        canManageTrip: res.canManageTrip || false,
        companyUsers: (res.companyUsers || []).map(normalizeUsuario),
        maintenanceHistory: (res.maintenanceHistory || []).map(normalizeMant),
      }))
      .catch((e) => ({ error: e.message })),

  resetVehicleState: (id) =>
    put(`/vehiculos/${id}`, { estado: "disponible" })
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: e.message })),

  // ── Mantenimientos ────────────────────────────────────────────────────────────
  startMaintenance: (id_vehiculo, descripcion) =>
    post("/mantenimientos", {
      id_vehiculo,
      fecha_inicio: new Date().toISOString().split("T")[0],
      descripcion: descripcion || null,
    })
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: e.message })),

  endMaintenance: (id_vehiculo) =>
    get("/mantenimientos")
      .then((lista) => {
        const mant = lista.find(
          (m) => m.id_vehiculo === id_vehiculo && !m.fecha_fin,
        );
        if (!mant)
          return { ok: false, error: "Mantenimiento activo no encontrado" };
        return put(`/mantenimientos/${mant.id_mantenimiento}`, {
          fecha_fin: new Date().toISOString().split("T")[0],
        })
          .then(() => ({ ok: true }))
          .catch((e) => ({ ok: false, error: e.message }));
      })
      .catch((e) => ({ ok: false, error: e.message })),

  // ── Empleados ─────────────────────────────────────────────────────────────────
  // Ahora usa el nuevo POST /api/usuarios que asigna empresa directamente
  addEmployee: ({ name, email, password, role }) =>
    post("/usuarios", {
      nombre: name,
      email,
      password,
      rol: role || "empleado",
    })
      .then((r) => ({ ok: true, user: normalizeUsuario(r) }))
      .catch((e) => ({ ok: false, error: e.message })),

  updateUsuario: (id, datos) =>
    put(`/usuarios/${id}`, datos).catch((e) => {
      throw new Error(e.message);
    }),

  removeEmployee: (id) =>
    del(`/usuarios/${id}`)
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: e.message })),

  companeros: () =>
    get("/usuarios/companeros").then((lista) => lista.map(normalizeUsuario)),

  // ── Viajes ────────────────────────────────────────────────────────────────────
  // VehicleDetail llama checkin con id_uso directamente
  checkin: (id_uso) =>
    put(`/usos/${id_uso}/entrada`, {})
      .then((r) => ({ ok: true, ...r }))
      .catch((e) => ({ ok: false, error: e.message })),

  // DashboardEmpleado llama checkin con vehicleId — lo resolvemos buscando el uso activo
  checkinByVehicle: (vehicleId) =>
    get("/usos/activos")
      .then((usos) => {
        const uso = usos.find((u) => u.id_vehiculo === parseInt(vehicleId));
        if (!uso)
          return { ok: false, error: "No hay viaje activo para este vehículo" };
        return put(`/usos/${uso.id_uso}/entrada`, {})
          .then((r) => ({ ok: true, ...r }))
          .catch((e) => ({ ok: false, error: e.message }));
      })
      .catch((e) => ({ ok: false, error: e.message })),

  checkout: (id_vehiculo, id_conductor, id_pasajeros = []) =>
    post("/usos", { id_vehiculo, id_conductor, id_pasajeros })
      .then((r) => ({ ok: true, ...r }))
      .catch((e) => ({ ok: false, error: e.message })),

  addPassenger: (id_uso, id_usuario) =>
    post(`/usos/${id_uso}/pasajeros`, { id_usuario })
      .then((r) => ({ ok: true, ...r }))
      .catch((e) => ({ ok: false, error: e.message })),

  removePassenger: (id_uso, id_usuario) =>
    del(`/usos/${id_uso}/pasajeros/${id_usuario}`)
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: e.message })),

  usoActivo: () => get("/usos/activos"),
  usoDetalle: (id) => get(`/usos/${id}`),
  usoHistorial: () => get("/usos"),

  // ── Observaciones ─────────────────────────────────────────────────────────────
  addObservacion: (id_uso, comentario) =>
    post("/observaciones", { id_uso, comentario })
      .then((r) => ({ ok: true, ...r }))
      .catch((e) => ({ ok: false, error: e.message })),

  getObservaciones: (id_uso) => get(`/observaciones/${id_uso}`),

  // ── Encuestas ─────────────────────────────────────────────────────────────────
  getSurveys: () =>
    get("/encuestas/preguntas/admin")
      .then((preguntas) => ({ surveys: preguntas.map(normalizePregunta) }))
      .catch(() => ({ surveys: [] })),

  createSurvey: async ({ vehicleId, questions }) => {
    const tipoMap = {
      text: "texto",
      number: "numero",
      km: "numero",
      radio: "opciones",
    };

    try {
      for (const q of questions) {
        await post("/encuestas/preguntas", {
          texto: q.text,
          tipo_respuesta: tipoMap[q.type] || "texto",
          obligatoria: q.required || false,
          opciones: q.type === "radio" ? q.options.filter((o) => o.trim()) : [],
          id_vehiculos: vehicleId ? [parseInt(vehicleId)] : [],
          id_admins_notificar: (q.adminsNotificar || []).map((id) =>
            parseInt(id),
          ),
        });
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  deleteSurvey: (id) =>
    del(`/encuestas/preguntas/${id}`)
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: e.message })),

  responderEncuesta: (id_uso, respuestas) =>
    post("/encuestas/responder", { id_uso, respuestas })
      .then((r) => ({ ok: true, ...r }))
      .catch((e) => ({ ok: false, error: e.message })),

  getEncuestaViaje: (id_uso) => get(`/encuestas/preguntas?id_uso=${id_uso}`),

  getSuperadminEncuestas: () =>
    get("/superadmin/encuestas")
      .then((preguntas) =>
        preguntas.map((p) => ({
          ...normalizePregunta(p),
          nombre_empresa: p.nombre_empresa,
        })),
      )
      .catch(() => []),

  updateSurvey: (id, datos) =>
    put(`/encuestas/preguntas/${id}`, datos)
      .then((r) => ({ ok: true, ...r }))
      .catch((e) => ({ ok: false, error: e.message })),

  updateSurveyVehiculos: (id, id_vehiculos) =>
    post(`/encuestas/preguntas/${id}/vehiculos`, { id_vehiculos })
      .then((r) => ({ ok: true, ...r }))
      .catch((e) => ({ ok: false, error: e.message })),

  updateSurveyNotificaciones: (id, id_admins_notificar) =>
    put(`/encuestas/preguntas/${id}/notificaciones`, { id_admins_notificar })
      .then((r) => ({ ok: true, ...r }))
      .catch((e) => ({ ok: false, error: e.message })),
};

// ── Normalizadores ────────────────────────────────────────────────────────────

function normalizeEmpresa(e) {
  if (!e) return {};
  return {
    id: e.id_empresa,
    name: e.nombre,
    cif: e.cif,
    address: e.direccion,
  };
}

function normalizeVehiculo(v) {
  if (!v) return {};
  return {
    id: v.id_vehiculo,
    plate: v.matricula,
    model: [v.marca, v.modelo].filter(Boolean).join(" ") || "—",
    marca: v.marca,
    modelo: v.modelo,
    tipo: v.tipo || "—",
    company_id: v.id_empresa,
    states: [v.estado].filter(Boolean),
    location: v.ubicacion || "—",
    capacity: v.capacidad || "—",
  };
}

function normalizeUsuario(u) {
  if (!u) return {};
  return {
    id: u.id_usuario,
    name: u.nombre,
    nombre: u.nombre,
    email: u.email,
    role: u.rol,
    rol: u.rol,
    active: u.activo,
    company_id: u.id_empresa,
  };
}

function normalizeSolicitud(s) {
  if (!s) return {};
  return {
    id: s.id_solicitud,
    userName: s.nombre_usuario,
    userEmail: s.email,
    createdAt: s.fecha_solicitud,
    estado: s.estado,
  };
}

function normalizeUso(u) {
  if (!u) return {};
  return {
    id: u.id_uso,
    vehicle_id: u.id_vehiculo,
    id_uso: u.id_uso,
    id_usuario: u.id_usuario,
    vehicleModel:
      [u.marca, u.modelo].filter(Boolean).join(" ") || u.modelo || "—",
    vehiclePlate: u.matricula,
    driverName: u.nombre_conductor,
    destination: u.destino || "—",
    checkoutTime: u.fecha_salida,
    checkinTime: u.fecha_entrada,
    status: u.fecha_entrada ? "completed" : "active",
    passengers: Array.isArray(u.pasajeros)
      ? u.pasajeros.map((p) => ({
          id: p.id_usuario,
          name: p.nombre,
          userId: p.id_usuario,
          user_id: p.id_usuario,
        }))
      : [],
  };
}

function normalizeMant(m) {
  if (!m) return {};
  return {
    id: m.id_mantenimiento,
    start: m.fecha_inicio,
    end: m.fecha_fin || null,
    reason: m.descripcion || "—",
    invoicePath: null,
  };
}

function normalizePregunta(p) {
  if (!p) return {};
  return {
    id: p.id_pregunta,
    text: p.texto,
    type: p.tipo_respuesta,
    required: p.obligatoria,
    active: p.activa,
    order: p.orden,
    createdAt: p.fecha_creacion,
    options: (p.opciones || []).map((o) => ({
      id: o.id_opcion,
      text: o.texto,
    })),
    vehicleIds: (p.vehiculos || []).map((v) => v.id_vehiculo),
    vehicleName:
      (p.vehiculos || []).map((v) => v.matricula).join(", ") || "Global",
    questions: p.opciones || [],
    adminsNotificar: (p.admins_notificar || []).map((a) => ({
      id: a.id_usuario,
      name: a.nombre,
      email: a.email,
    })),
  };
}
