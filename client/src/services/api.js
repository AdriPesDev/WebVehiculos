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

  const response = await fetch(`${BASE_URL}${path}`, { ...opts, headers });
  const data = await response.json();

  if (response.status === 401) {
    // En /auth/me el 401 es normal (no hay sesión), no redirigir
    if (path === "/auth/me") {
      return null;
    }
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

  // AuthContext llama a api.me() y espera { user: {...} }
  // Nuestra API devuelve el objeto directamente, así que lo envolvemos
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
        // El superadmin no tiene empresa propia, no puede llamar a /vehiculos
        // Obtenemos todos los vehículos a través de las empresas
        get("/superadmin/empresas")
          .then((emps) =>
            Promise.all(emps.map((e) => get(`/vehiculos`).catch(() => []))),
          )
          .then((arrays) => arrays.flat())
          .catch(() => []),
      ]);
      return {
        role: "superadmin",
        companies: empresas.map(normalizeEmpresa),
        users: usuarios.map(normalizeUsuario),
        vehicles: vehiculos.map(normalizeVehiculo),
      };
    }

    if (rol === "empleado") {
      const [empresas, vehiculos, usos] = await Promise.all([
        get("/empresas"),
        get("/vehiculos"),
        get("/usos"),
      ]);
      const empresa = empresas[0] || {};
      const usosNorm = usos.map(normalizeUso);
      // Uso activo del propio empleado (sin fecha de entrada)
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

    if (rol === "sin_empresa") {
      return { role: "sin_empresa" };
    }

    return { role: rol };
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
  // Drawer envía { model, plate, capacity, location }
  // Nuestra API espera { matricula, marca, modelo }
  // Separamos model en marca + modelo si hay espacio, si no lo ponemos todo en modelo
  addVehicle: ({ model, plate, capacity, location, companyId }) => {
    const partes = (model || "").trim().split(" ");
    const marca = partes.length > 1 ? partes[0] : "";
    const modelo = partes.length > 1 ? partes.slice(1).join(" ") : partes[0];
    return post("/vehiculos", { matricula: plate, marca, modelo })
      .then((r) => ({ ok: true, vehicle: normalizeVehiculo(r) }))
      .catch((e) => ({ ok: false, error: e.message }));
  },

  deleteVehicle: (id) =>
    del(`/vehiculos/${id}`)
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: e.message })),

  vehicleDetail: (id) =>
    get(`/usos/activos`).then((usos) => {
      const uso = usos.find((u) => u.id_vehiculo === parseInt(id));
      return get(`/vehiculos/${id}`).then((v) => ({
        vehicle: normalizeVehiculo(v),
        activeTrip: uso ? normalizeUso(uso) : null,
      }));
    }),

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
  // Drawer envía { name, email, password, role }
  addEmployee: ({ name, email, password, role }) =>
    post("/auth/register", { nombre: name, email, password })
      .then(async (r) => {
        // Si el rol pedido es admin, actualizamos después del registro
        if (role === "admin" && r.id_usuario) {
          await put(`/usuarios/${r.id_usuario}`, { rol: "admin" }).catch(
            () => {},
          );
        }
        return { ok: true, user: normalizeUsuario(r) };
      })
      .catch((e) => ({ ok: false, error: e.message })),

  removeEmployee: (id) =>
    del(`/usuarios/${id}`)
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: e.message })),

  companeros: () =>
    get("/usuarios/companeros").then((lista) => lista.map(normalizeUsuario)),

  // ── Viajes ────────────────────────────────────────────────────────────────────
  // DashboardEmpleado llama checkin(vehicleId) — buscamos el uso activo de ese vehículo
  checkin: (vehicleId) =>
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

  checkout: (id_vehiculo) =>
    post("/usos", { id_vehiculo })
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

  createSurvey: (data) =>
    post("/encuestas/preguntas", data)
      .then((r) => ({ ok: true, ...r }))
      .catch((e) => ({ ok: false, error: e.message })),

  deleteSurvey: (id) =>
    del(`/encuestas/preguntas/${id}`)
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: e.message })),

  responderEncuesta: (id_uso, respuestas) =>
    post("/encuestas/responder", { id_uso, respuestas })
      .then((r) => ({ ok: true, ...r }))
      .catch((e) => ({ ok: false, error: e.message })),

  getEncuestaViaje: (id_uso) => get(`/encuestas/preguntas?id_uso=${id_uso}`),
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
    name: u.nombre, // la UI usa .name
    nombre: u.nombre, // por si algún sitio usa .nombre
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
    passengers: (u.pasajeros || []).map((p) => ({
      id: p.id_usuario,
      name: p.nombre,
      userId: p.id_usuario,
    })),
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
    vehicleName:
      (p.vehiculos || []).map((v) => v.matricula).join(", ") || "Global",
    questions: p.opciones || [], // compatibilidad con SurveyBuilderModal
  };
}
