// ─────────────────────────────────────────────────────────────────────────────
//  Mock-backend en memoria para desarrollo del frontend SIN API real.
//  Se activa con VITE_DEV_FAKE_AUTH=true. Intercepta window.fetch y responde
//  a /api/... con las formas CRUDAS del backend (campos en español), de modo
//  que api.js (normalizadores incluidos) y Kiosko (fetch directo) funcionen.
//
//  ponytail: store en localStorage para que los flujos sobrevivan a recargas.
//  Para reiniciar los datos: localStorage.removeItem("mockdb") y recargar.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = "mockdb";
const now = () => new Date().toISOString();

function seed() {
  return {
    _seq: 100,
    tokens: {}, // token -> id_usuario
    empresas: [
      { id_empresa: 1, nombre: "Nethive Demo S.L.", cif: "B12345678", direccion: "Calle Falsa 123, Madrid" },
    ],
    usuarios: [
      { id_usuario: 1, nombre: "Admin Demo", email: "admin@demo.com", rol: "admin", id_empresa: 1, activo: true, fecha_registro: now() },
      { id_usuario: 2, nombre: "Ana López", email: "ana@demo.com", rol: "empleado", id_empresa: 1, activo: true, fecha_registro: now() },
      { id_usuario: 3, nombre: "Luis Ruiz", email: "luis@demo.com", rol: "empleado", id_empresa: 1, activo: true, fecha_registro: now() },
      { id_usuario: 4, nombre: "Marta Gil", email: "marta@demo.com", rol: "empleado", id_empresa: 1, activo: true, fecha_registro: now() },
      { id_usuario: 9, nombre: "Kiosko", email: "kiosko@nethive.es", rol: "admin", id_empresa: 1, activo: true, fecha_registro: now() },
    ],
    vehiculos: [
      { id_vehiculo: 1, matricula: "1234-ABC", marca: "Renault", modelo: "Kangoo", tipo: "Furgoneta", id_empresa: 1, estado: "disponible", ubicacion: "Madrid", capacidad: "3" },
      { id_vehiculo: 2, matricula: "5678-DEF", marca: "Ford", modelo: "Transit", tipo: "Furgoneta", id_empresa: 1, estado: "disponible", ubicacion: "Madrid", capacidad: "3" },
      { id_vehiculo: 3, matricula: "9012-GHI", marca: "Citroën", modelo: "Berlingo", tipo: "Furgoneta", id_empresa: 1, estado: "en_uso", ubicacion: "Barcelona", capacidad: "2" },
      { id_vehiculo: 4, matricula: "3456-JKL", marca: "Peugeot", modelo: "Partner", tipo: "Furgoneta", id_empresa: 1, estado: "mantenimiento", ubicacion: "Sevilla", capacidad: "2" },
    ],
    usos: [
      { id_uso: 10, id_vehiculo: 3, id_usuario: 2, destino: "Reparto Barcelona", fecha_salida: now(), fecha_entrada: null, pasajeros: [{ id_usuario: 3, nombre: "Luis Ruiz" }] },
      { id_uso: 11, id_vehiculo: 1, id_usuario: 3, destino: "Reparto Madrid centro", fecha_salida: "2026-07-10T08:00:00.000Z", fecha_entrada: "2026-07-10T14:00:00.000Z", pasajeros: [] },
    ],
    mantenimientos: [
      { id_mantenimiento: 20, id_vehiculo: 4, fecha_inicio: "2026-07-12", fecha_fin: null, descripcion: "Cambio de embrague" },
      { id_mantenimiento: 21, id_vehiculo: 1, fecha_inicio: "2026-06-01", fecha_fin: "2026-06-03", descripcion: "Revisión general" },
    ],
    solicitudes: [
      { id_solicitud: 30, id_usuario: 4, nombre_usuario: "Marta Gil", email: "marta@demo.com", fecha_solicitud: now(), estado: "pendiente" },
    ],
    observaciones: {}, // id_uso -> [{ comentario, fecha }]
    preguntas: [
      { id_pregunta: 40, texto: "¿En qué estado devuelves el vehículo?", tipo_respuesta: "opciones", obligatoria: true, activa: true, orden: 1, fecha_creacion: now(),
        opciones: [{ id_opcion: 1, texto: "Perfecto" }, { id_opcion: 2, texto: "Con desperfectos" }],
        vehiculos: [], admins_notificar: [] },
      { id_pregunta: 41, texto: "Kilómetros al finalizar", tipo_respuesta: "numero", obligatoria: false, activa: true, orden: 2, fecha_creacion: now(),
        opciones: [], vehiculos: [], admins_notificar: [] },
    ],
  };
}

let db;
function load() {
  if (db) return db;
  try {
    db = JSON.parse(localStorage.getItem(KEY)) || seed();
  } catch {
    db = seed();
  }
  return db;
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
}
const nextId = () => ++db._seq;

// ── Helpers de forma ──────────────────────────────────────────────────────────
const empresaOf = (id) => db.empresas.find((e) => e.id_empresa === id) || {};
const vehWith = (v) => ({ ...v });
const usoWith = (u) => {
  const v = db.vehiculos.find((x) => x.id_vehiculo === u.id_vehiculo) || {};
  const c = db.usuarios.find((x) => x.id_usuario === u.id_usuario) || {};
  return { ...u, marca: v.marca, modelo: v.modelo, matricula: v.matricula, nombre_conductor: c.nombre };
};

function currentUser(headers) {
  const auth = headers.get ? headers.get("authorization") : headers.Authorization || headers.authorization;
  const token = (auth || "").replace(/^Bearer\s+/i, "");
  const id = db.tokens[token];
  return db.usuarios.find((u) => u.id_usuario === id) || null;
}
function issueToken(u) {
  const token = "mock-" + u.id_usuario + "-" + Date.now();
  db.tokens[token] = u.id_usuario;
  save();
  return token;
}

// ── Router ────────────────────────────────────────────────────────────────────
// Devuelve { status, body }. `seg` = segmentos de la ruta tras /api.
function route(method, path, query, body, headers) {
  load();
  const seg = path.split("/").filter(Boolean); // ej: ["vehiculos","3","detalle"]
  const p = "/" + seg.join("/");
  const me = currentUser(headers);

  // ── Auth ──
  if (method === "POST" && p === "/auth/login") {
    const u = db.usuarios.find((x) => x.email.toLowerCase() === (body.email || "").toLowerCase());
    // mock: cualquier contraseña vale
    if (!u) return { status: 401, body: { error: "Credenciales incorrectas" } };
    return { status: 200, body: { token: issueToken(u), usuario: u } };
  }
  if (method === "GET" && p === "/auth/me") {
    return me ? { status: 200, body: me } : { status: 401, body: { error: "No autenticado" } };
  }
  if (method === "POST" && p === "/auth/refresh") {
    return me ? { status: 200, body: { token: issueToken(me), usuario: me } } : { status: 401, body: { error: "No autenticado" } };
  }
  if (method === "POST" && p === "/auth/register") {
    const u = { id_usuario: nextId(), nombre: body.nombre, email: body.email, rol: "empleado", id_empresa: null, activo: true, fecha_registro: now() };
    db.usuarios.push(u); save();
    return { status: 201, body: { token: issueToken(u), usuario: u } };
  }
  if (method === "GET" && p === "/auth/kiosko") {
    const u = db.usuarios.find((x) => x.email === "kiosko@nethive.es");
    return { status: 200, body: { token: issueToken(u), usuario: u } };
  }

  // ── Empresas ──
  if (method === "GET" && p === "/empresas") return { status: 200, body: db.empresas };
  if (method === "GET" && p === "/empresas/publico") return { status: 200, body: db.empresas.map((e) => ({ id_empresa: e.id_empresa, nombre: e.nombre })) };
  if (method === "GET" && p === "/superadmin/empresas") return { status: 200, body: db.empresas };
  if (method === "POST" && p === "/empresas") {
    const e = { id_empresa: nextId(), nombre: body.nombre, cif: body.cif, direccion: body.direccion };
    db.empresas.push(e); save();
    return { status: 201, body: e };
  }
  if (method === "DELETE" && seg[0] === "empresas" && seg.length === 2) {
    db.empresas = db.empresas.filter((e) => e.id_empresa !== +seg[1]); save();
    return { status: 200, body: { ok: true } };
  }

  // ── Vehículos ──
  if (method === "GET" && p === "/vehiculos") return { status: 200, body: db.vehiculos.map(vehWith) };
  if (method === "GET" && p === "/vehiculos/disponibles") return { status: 200, body: db.vehiculos.filter((v) => v.estado === "disponible").map(vehWith) };
  if (method === "GET" && p === "/superadmin/vehiculos") return { status: 200, body: db.vehiculos.map((v) => ({ ...v, nombre_empresa: empresaOf(v.id_empresa).nombre })) };
  if (method === "GET" && seg[0] === "vehiculos" && seg[2] === "detalle") {
    const v = db.vehiculos.find((x) => x.id_vehiculo === +seg[1]);
    if (!v) return { status: 404, body: { error: "No encontrado" } };
    const trips = db.usos.filter((u) => u.id_vehiculo === v.id_vehiculo).map(usoWith);
    return { status: 200, body: {
      vehicle: v,
      company: empresaOf(v.id_empresa),
      vehicleTrips: trips,
      activeTrip: trips.find((u) => !u.fecha_entrada) || null,
      canManageTrip: true,
      companyUsers: db.usuarios.filter((u) => u.id_empresa === v.id_empresa),
      maintenanceHistory: db.mantenimientos.filter((m) => m.id_vehiculo === v.id_vehiculo),
    } };
  }
  if (method === "POST" && p === "/vehiculos") {
    const v = { id_vehiculo: nextId(), matricula: body.matricula, marca: body.marca, modelo: body.modelo, tipo: body.tipo, id_empresa: me?.id_empresa || 1, estado: "disponible", ubicacion: body.ubicacion, capacidad: body.capacidad };
    db.vehiculos.push(v); save();
    return { status: 201, body: v };
  }
  if (method === "PUT" && seg[0] === "vehiculos" && seg.length === 2) {
    const v = db.vehiculos.find((x) => x.id_vehiculo === +seg[1]);
    if (!v) return { status: 404, body: { error: "No encontrado" } };
    Object.assign(v, body); save();
    return { status: 200, body: v };
  }
  if (method === "DELETE" && seg[0] === "vehiculos" && seg.length === 2) {
    db.vehiculos = db.vehiculos.filter((x) => x.id_vehiculo !== +seg[1]); save();
    return { status: 200, body: { ok: true } };
  }

  // ── Usuarios ──
  if (method === "GET" && p === "/usuarios") return { status: 200, body: db.usuarios.filter((u) => u.email !== "kiosko@nethive.es") };
  if (method === "GET" && p === "/usuarios/companeros") return { status: 200, body: db.usuarios.filter((u) => u.id_empresa === (me?.id_empresa || 1) && u.id_usuario !== me?.id_usuario) };
  if (method === "GET" && p === "/superadmin/usuarios") return { status: 200, body: db.usuarios };
  if (method === "POST" && p === "/usuarios") {
    const u = { id_usuario: nextId(), nombre: body.nombre, email: body.email, rol: body.rol || "empleado", id_empresa: me?.id_empresa || 1, activo: true, fecha_registro: now() };
    db.usuarios.push(u); save();
    return { status: 201, body: u };
  }
  if (method === "PUT" && seg[0] === "usuarios" && seg.length === 2) {
    const u = db.usuarios.find((x) => x.id_usuario === +seg[1]);
    if (!u) return { status: 404, body: { error: "No encontrado" } };
    Object.assign(u, body); save();
    return { status: 200, body: u };
  }
  if (method === "DELETE" && seg[0] === "usuarios" && seg.length === 2) {
    db.usuarios = db.usuarios.filter((x) => x.id_usuario !== +seg[1]); save();
    return { status: 200, body: { ok: true } };
  }

  // ── Solicitudes ──
  if (method === "GET" && p === "/solicitudes") return { status: 200, body: db.solicitudes };
  if (method === "GET" && p === "/solicitudes/mis-solicitudes") return { status: 200, body: db.solicitudes.filter((s) => s.id_usuario === me?.id_usuario) };
  if (method === "POST" && p === "/solicitudes") {
    const s = { id_solicitud: nextId(), id_usuario: me?.id_usuario, nombre_usuario: me?.nombre, email: me?.email, fecha_solicitud: now(), estado: "pendiente" };
    db.solicitudes.push(s); save();
    return { status: 201, body: s };
  }
  if (method === "PUT" && seg[0] === "solicitudes" && seg.length === 2) {
    const s = db.solicitudes.find((x) => x.id_solicitud === +seg[1]);
    if (s) { s.estado = body.estado; save(); }
    return { status: 200, body: s || {} };
  }

  // ── Usos (viajes) ──
  if (method === "GET" && p === "/usos") return { status: 200, body: db.usos.map(usoWith) };
  if (method === "GET" && p === "/usos/activos") return { status: 200, body: db.usos.filter((u) => !u.fecha_entrada).map(usoWith) };
  if (method === "GET" && seg[0] === "usos" && seg.length === 2) {
    const u = db.usos.find((x) => x.id_uso === +seg[1]);
    return u ? { status: 200, body: usoWith(u) } : { status: 404, body: { error: "No encontrado" } };
  }
  if (method === "POST" && p === "/usos") {
    const u = {
      id_uso: nextId(), id_vehiculo: body.id_vehiculo, id_usuario: body.id_conductor,
      destino: body.destino || "—", fecha_salida: now(), fecha_entrada: null,
      pasajeros: (body.id_pasajeros || []).map((id) => ({ id_usuario: id, nombre: (db.usuarios.find((x) => x.id_usuario === id) || {}).nombre })),
    };
    db.usos.push(u);
    const v = db.vehiculos.find((x) => x.id_vehiculo === u.id_vehiculo);
    if (v) v.estado = "en_uso";
    save();
    return { status: 201, body: usoWith(u) };
  }
  if (method === "PUT" && seg[0] === "usos" && seg[2] === "entrada") {
    const u = db.usos.find((x) => x.id_uso === +seg[1]);
    if (!u) return { status: 404, body: { error: "No encontrado" } };
    u.fecha_entrada = now();
    if (body.conductor_vuelta) u.conductor_vuelta = body.conductor_vuelta;
    const v = db.vehiculos.find((x) => x.id_vehiculo === u.id_vehiculo);
    if (v) v.estado = "disponible";
    save();
    return { status: 200, body: usoWith(u) };
  }
  if (method === "POST" && seg[0] === "usos" && seg[2] === "pasajeros") {
    const u = db.usos.find((x) => x.id_uso === +seg[1]);
    if (u) { u.pasajeros.push({ id_usuario: body.id_usuario, nombre: (db.usuarios.find((x) => x.id_usuario === body.id_usuario) || {}).nombre }); save(); }
    return { status: 200, body: usoWith(u || {}) };
  }
  if (method === "DELETE" && seg[0] === "usos" && seg[2] === "pasajeros" && seg.length === 4) {
    const u = db.usos.find((x) => x.id_uso === +seg[1]);
    if (u) { u.pasajeros = u.pasajeros.filter((p) => p.id_usuario !== +seg[3]); save(); }
    return { status: 200, body: { ok: true } };
  }

  // ── Mantenimientos ──
  if (method === "GET" && p === "/mantenimientos") return { status: 200, body: db.mantenimientos };
  if (method === "POST" && p === "/mantenimientos") {
    const m = { id_mantenimiento: nextId(), id_vehiculo: body.id_vehiculo, fecha_inicio: body.fecha_inicio, fecha_fin: null, descripcion: body.descripcion };
    db.mantenimientos.push(m);
    const v = db.vehiculos.find((x) => x.id_vehiculo === body.id_vehiculo);
    if (v) v.estado = "mantenimiento";
    save();
    return { status: 201, body: m };
  }
  if (method === "PUT" && seg[0] === "mantenimientos" && seg.length === 2) {
    const m = db.mantenimientos.find((x) => x.id_mantenimiento === +seg[1]);
    if (!m) return { status: 404, body: { error: "No encontrado" } };
    Object.assign(m, body);
    if (body.fecha_fin) {
      const v = db.vehiculos.find((x) => x.id_vehiculo === m.id_vehiculo);
      if (v) v.estado = "disponible";
    }
    save();
    return { status: 200, body: m };
  }

  // ── Observaciones ──
  if (method === "POST" && p === "/observaciones") {
    (db.observaciones[body.id_uso] ||= []).push({ comentario: body.comentario, fecha: now() });
    save();
    return { status: 201, body: { ok: true } };
  }
  if (method === "GET" && seg[0] === "observaciones" && seg.length === 2) {
    return { status: 200, body: db.observaciones[+seg[1]] || [] };
  }

  // ── Encuestas ──
  if (method === "GET" && p === "/encuestas/preguntas/admin") return { status: 200, body: db.preguntas };
  if (method === "GET" && p === "/encuestas/preguntas") return { status: 200, body: { preguntas: db.preguntas.filter((q) => q.activa) } };
  if (method === "GET" && p === "/superadmin/encuestas") return { status: 200, body: db.preguntas.map((q) => ({ ...q, nombre_empresa: "Nethive Demo S.L." })) };
  if (method === "POST" && p === "/encuestas/preguntas") {
    const q = { id_pregunta: nextId(), texto: body.texto, tipo_respuesta: body.tipo_respuesta, obligatoria: !!body.obligatoria, activa: true, orden: db.preguntas.length + 1, fecha_creacion: now(),
      opciones: (body.opciones || []).map((t, i) => ({ id_opcion: nextId() + i, texto: t })), vehiculos: [], admins_notificar: [] };
    db.preguntas.push(q); save();
    return { status: 201, body: q };
  }
  if (method === "DELETE" && seg[0] === "encuestas" && seg[1] === "preguntas" && seg.length === 3) {
    db.preguntas = db.preguntas.filter((q) => q.id_pregunta !== +seg[2]); save();
    return { status: 200, body: { ok: true } };
  }
  if (method === "PUT" && seg[0] === "encuestas" && seg[1] === "preguntas" && seg.length === 3) {
    const q = db.preguntas.find((x) => x.id_pregunta === +seg[2]);
    if (q) { Object.assign(q, body); save(); }
    return { status: 200, body: q || {} };
  }
  if (method === "POST" && p === "/encuestas/responder") return { status: 201, body: { ok: true } };
  if (seg[0] === "encuestas" && (seg[3] === "vehiculos" || seg[3] === "notificaciones")) return { status: 200, body: { ok: true } };

  // ── Health / fallback ──
  if (p === "/health") return { status: 200, body: { estado: "ok", mock: true } };
  return { status: 404, body: { error: "Mock: ruta no implementada: " + method + " " + p } };
}

// ── Instalación del interceptor ────────────────────────────────────────────────
export function installMockServer() {
  if (import.meta.env.VITE_DEV_FAKE_AUTH !== "true") return;
  const orig = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const idx = url.indexOf("/api/");
    if (idx === -1) return orig(input, init); // no es la API → pasa de largo
    const rest = url.slice(idx + 4); // tras "/api"
    const [rawPath, qs] = rest.split("?");
    const query = Object.fromEntries(new URLSearchParams(qs || ""));
    const method = (init.method || "GET").toUpperCase();
    let body = {};
    try { body = init.body ? JSON.parse(init.body) : {}; } catch { body = {}; }
    const headers = new Headers(init.headers || {});
    const { status, body: resBody } = route(method, rawPath, query, body, headers);
    return new Response(JSON.stringify(resBody), { status, headers: { "Content-Type": "application/json" } });
  };
  // eslint-disable-next-line no-console
  console.info("%c[mock] Backend simulado activo (VITE_DEV_FAKE_AUTH). Datos en localStorage 'mockdb'.", "color:#009FE3;font-weight:bold");
}
