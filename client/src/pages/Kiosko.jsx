import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://192.168.69.163:3456/api";

function apiFetch(path) {
  return fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  }).then((r) => r.json());
}

function apiPost(path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

function apiPut(path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

// ── Estilos inline para pantalla táctil ──────────────────────────────────────
const s = {
  root: {
    minHeight: "100dvh",
    background: "var(--bg)",
    display: "flex",
    flexDirection: "column",
    fontFamily: "var(--font, sans-serif)",
    userSelect: "none",
  },
  header: {
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    padding: "1rem 1.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  body: {
    flex: 1,
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    overflowY: "auto",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "1rem",
  },
  card: (selected, color) => ({
    background: selected ? color || "var(--accent)" : "var(--surface)",
    color: selected ? "#fff" : "inherit",
    border: `2px solid ${selected ? color || "var(--accent)" : "var(--border)"}`,
    borderRadius: "0.75rem",
    padding: "1.25rem",
    cursor: "pointer",
    transition: "all 0.15s",
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
    minHeight: 100,
  }),
  cardTitle: { fontWeight: 700, fontSize: "1.05rem" },
  cardSub: { fontSize: "0.85rem", opacity: 0.75 },
  btn: (color) => ({
    background: color || "var(--accent)",
    color: "#fff",
    border: "none",
    borderRadius: "0.75rem",
    padding: "1rem 2rem",
    fontSize: "1.1rem",
    fontWeight: 600,
    cursor: "pointer",
    minHeight: 56,
    minWidth: 160,
  }),
  btnOutline: {
    background: "transparent",
    border: "2px solid var(--border)",
    borderRadius: "0.75rem",
    padding: "1rem 2rem",
    fontSize: "1.1rem",
    fontWeight: 600,
    cursor: "pointer",
    minHeight: 56,
    minWidth: 160,
  },
  section: {
    background: "var(--surface)",
    borderRadius: "1rem",
    padding: "1.25rem",
    border: "1px solid var(--border)",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 700,
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  actions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    marginTop: "1rem",
  },
  badge: (color) => ({
    display: "inline-block",
    background: color,
    color: "#fff",
    borderRadius: "999px",
    padding: "0.2rem 0.6rem",
    fontSize: "0.75rem",
    fontWeight: 600,
  }),
  flash: (type) => ({
    background: type === "success" ? "#d1fae5" : "#fee2e2",
    color: type === "success" ? "#065f46" : "#991b1b",
    borderRadius: "0.75rem",
    padding: "1rem 1.25rem",
    fontWeight: 600,
    fontSize: "1rem",
  }),
  // Estilos para encuesta
  preguntaBox: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    padding: "1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  inputEncuesta: {
    width: "100%",
    padding: "0.6rem 0.8rem",
    borderRadius: "0.5rem",
    border: "1px solid var(--border)",
    fontSize: "1rem",
    background: "var(--surface)",
    color: "inherit",
    boxSizing: "border-box",
  },
};

const PASO = {
  HOME: "home",
  SALIDA_VEHICULO: "salida_vehiculo",
  SALIDA_CONDUCTOR: "salida_conductor",
  SALIDA_PASAJEROS: "salida_pasajeros",
  SALIDA_CONFIRMAR: "salida_confirmar",
  LLEGADA_VIAJE: "llegada_viaje",
  LLEGADA_CONDUCTOR: "llegada_conductor",
  LLEGADA_ENCUESTA: "llegada_encuesta",
};

const TITULO_PASO = {
  [PASO.HOME]: "🚗 Gestión de vehículos",
  [PASO.SALIDA_VEHICULO]: "Paso 1 · Selecciona vehículo",
  [PASO.SALIDA_CONDUCTOR]: "Paso 2 · Selecciona conductor",
  [PASO.SALIDA_PASAJEROS]: "Paso 3 · Añadir pasajeros",
  [PASO.SALIDA_CONFIRMAR]: "Paso 4 · Confirmar salida",
  [PASO.LLEGADA_VIAJE]: "Llegada · Selecciona viaje",
  [PASO.LLEGADA_CONDUCTOR]: "Llegada · Conductor de vuelta",
  [PASO.LLEGADA_ENCUESTA]: "Llegada · Encuesta del vehículo",
};

export default function Kiosko() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [paso, setPaso] = useState(PASO.HOME);
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [flash, setFlash] = useState(null);
  const [operando, setOperando] = useState(false);

  // Salida
  const [vehiculoSel, setVehiculoSel] = useState(null);
  const [conductorSel, setConductorSel] = useState(null);
  const [pasajerosSel, setPasajerosSel] = useState([]);

  // Llegada
  const [viajeSelLlegada, setViajeSelLlegada] = useState(null);
  const [conductorVuelta, setConductorVuelta] = useState(null); // null = mismo de ida
  const [preguntasEncuesta, setPreguntasEncuesta] = useState([]);
  const [respuestas, setRespuestas] = useState({}); // { id_pregunta: valor }
  const [cargandoEncuesta, setCargandoEncuesta] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [disponibles, activos, usuarios] = await Promise.all([
        apiFetch("/vehiculos/disponibles"),
        apiFetch("/usos/activos"),
        apiFetch("/usuarios"),
      ]);
      setEstado({ disponibles, activos, usuarios });
    } catch {
      setFlash({
        type: "error",
        msg: "Error al cargar datos. Reintentando...",
      });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 30000);
    return () => clearInterval(interval);
  }, [cargar]);

  useEffect(() => {
    if (flash) {
      const t = setTimeout(() => setFlash(null), 3500);
      return () => clearTimeout(t);
    }
  }, [flash]);

  function resetFlujo() {
    setVehiculoSel(null);
    setConductorSel(null);
    setPasajerosSel([]);
    setViajeSelLlegada(null);
    setConductorVuelta(null);
    setPreguntasEncuesta([]);
    setRespuestas({});
    setPaso(PASO.HOME);
  }

  // ── Salida ──────────────────────────────────────────────────────────────────

  async function confirmarSalida() {
    setOperando(true);
    try {
      const res = await apiPost("/usos", {
        id_vehiculo: vehiculoSel.id_vehiculo,
        id_conductor: conductorSel.id_usuario,
        id_pasajeros: pasajerosSel.map((p) => p.id_usuario),
      });
      if (res.id_uso || !res.error) {
        setFlash({
          type: "success",
          msg: `✅ Salida registrada. ¡Buen viaje, ${conductorSel.nombre}!`,
        });
        await cargar();
        resetFlujo();
      } else {
        setFlash({
          type: "error",
          msg: res.error || "Error al registrar la salida.",
        });
        resetFlujo();
      }
    } catch {
      setFlash({ type: "error", msg: "Error de conexión." });
      resetFlujo();
    } finally {
      setOperando(false);
    }
  }

  // ── Llegada ─────────────────────────────────────────────────────────────────

  async function seleccionarViajeLlegada(viaje) {
    setViajeSelLlegada(viaje);
    setPaso(PASO.LLEGADA_CONDUCTOR);
  }

  async function avanzarAEncuesta() {
    setCargandoEncuesta(true);
    try {
      const data = await apiFetch(
        `/encuestas/preguntas?id_uso=${viajeSelLlegada.id_uso}`,
      );
      const preguntas = data?.preguntas || [];
      setPreguntasEncuesta(preguntas);
      // Inicializa respuestas vacías
      const init = {};
      preguntas.forEach((p) => {
        init[p.id_pregunta] = "";
      });
      setRespuestas(init);
      if (preguntas.length === 0) {
        // Sin encuesta: confirmar directamente
        await confirmarLlegada();
      } else {
        setPaso(PASO.LLEGADA_ENCUESTA);
      }
    } catch {
      // Si falla la carga de encuesta, dejamos pasar igualmente
      await confirmarLlegada();
    } finally {
      setCargandoEncuesta(false);
    }
  }

  async function confirmarLlegada() {
    setOperando(true);
    try {
      const body = {};
      if (conductorVuelta !== null) {
        body.conductor_vuelta = conductorVuelta.id_usuario;
      }

      const res = await apiPut(`/usos/${viajeSelLlegada.id_uso}/entrada`, body);

      if (!res.error) {
        // Si hay respuestas de encuesta, enviarlas
        const respuestasArray = preguntasEncuesta
          .map((p) => buildRespuesta(p, respuestas[p.id_pregunta]))
          .filter(Boolean);

        if (respuestasArray.length > 0) {
          await apiPost("/encuestas/responder", {
            id_uso: viajeSelLlegada.id_uso,
            respuestas: respuestasArray,
          });
        }

        const nombreConductor =
          conductorVuelta?.nombre ||
          viajeSelLlegada.nombre_conductor ||
          "el conductor";

        setFlash({
          type: "success",
          msg: `✅ Llegada registrada. Bienvenido/a, ${nombreConductor}.`,
        });
        await cargar();
        resetFlujo();
      } else {
        setFlash({
          type: "error",
          msg: res.error || "Error al registrar la llegada.",
        });
        resetFlujo();
      }
    } catch {
      setFlash({ type: "error", msg: "Error de conexión." });
      resetFlujo();
    } finally {
      setOperando(false);
    }
  }

  // Convierte el valor del estado local al formato que espera la API
  function buildRespuesta(pregunta, valor) {
    if (valor === "" || valor === null || valor === undefined) return null;
    const base = { id_pregunta: pregunta.id_pregunta };
    switch (pregunta.tipo_respuesta) {
      case "texto":
        return { ...base, valor_texto: valor };
      case "numero":
        return { ...base, valor_numero: parseFloat(valor) };
      case "booleano":
        return { ...base, valor_boolean: valor === "true" };
      case "opciones":
        return { ...base, id_opcion: parseInt(valor) };
      default:
        return null;
    }
  }

  function togglePasajero(u) {
    setPasajerosSel((prev) =>
      prev.some((p) => p.id_usuario === u.id_usuario)
        ? prev.filter((p) => p.id_usuario !== u.id_usuario)
        : [...prev, u],
    );
  }

  // Validación encuesta: obligatorias cubiertas
  function encuestaValida() {
    return preguntasEncuesta
      .filter((p) => p.obligatoria)
      .every(
        (p) =>
          respuestas[p.id_pregunta] !== "" &&
          respuestas[p.id_pregunta] !== null &&
          respuestas[p.id_pregunta] !== undefined,
      );
  }

  if (!user || (user.rol !== "admin" && user.role !== "admin")) {
    return (
      <div
        style={{ ...s.root, justifyContent: "center", alignItems: "center" }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
          <h2>Acceso restringido</h2>
          <p style={{ color: "var(--muted)" }}>
            Esta pantalla solo está disponible para administradores.
          </p>
          <button style={s.btn()} onClick={() => navigate("/dashboard")}>
            Volver al panel
          </button>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <div
        style={{ ...s.root, justifyContent: "center", alignItems: "center" }}
      >
        <p style={{ fontSize: "1.2rem", color: "var(--muted)" }}>Cargando...</p>
      </div>
    );
  }

  const { disponibles = [], activos = [], usuarios = [] } = estado || {};

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {paso !== PASO.HOME && (
            <button style={s.btnOutline} onClick={resetFlujo}>
              ← Cancelar
            </button>
          )}
          <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700 }}>
            {TITULO_PASO[paso]}
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            {disponibles.length} disponibles · {activos.length} en uso
          </span>
          <button
            style={{
              ...s.btnOutline,
              minWidth: "auto",
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
            }}
            onClick={() => navigate("/dashboard")}
          >
            Panel admin
          </button>
        </div>
      </div>

      {/* Flash */}
      {flash && (
        <div style={{ padding: "0 1.5rem", paddingTop: "1rem" }}>
          <div style={s.flash(flash.type)}>{flash.msg}</div>
        </div>
      )}

      <div style={s.body}>
        {/* ── HOME ── */}
        {paso === PASO.HOME && (
          <>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <button
                style={{
                  ...s.btn("#0ea5e9"),
                  flex: 1,
                  minWidth: 200,
                  fontSize: "1.2rem",
                  minHeight: 80,
                }}
                onClick={() => setPaso(PASO.SALIDA_VEHICULO)}
                disabled={disponibles.length === 0}
              >
                🚗 Registrar salida
              </button>
              <button
                style={{
                  ...s.btn("#10b981"),
                  flex: 1,
                  minWidth: 200,
                  fontSize: "1.2rem",
                  minHeight: 80,
                }}
                onClick={() => setPaso(PASO.LLEGADA_VIAJE)}
                disabled={activos.length === 0}
              >
                🏁 Registrar llegada
              </button>
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}>
                <span style={s.badge("#0ea5e9")}>✓</span>
                Vehículos disponibles ({disponibles.length})
              </div>
              {disponibles.length === 0 ? (
                <p
                  style={{
                    color: "var(--muted)",
                    textAlign: "center",
                    padding: "1rem",
                  }}
                >
                  No hay vehículos disponibles ahora mismo.
                </p>
              ) : (
                <div style={s.grid}>
                  {disponibles.map((v) => (
                    <div
                      key={v.id_vehiculo}
                      style={{
                        ...s.card(false),
                        cursor: "default",
                        borderColor: "#0ea5e9",
                      }}
                    >
                      <span style={s.cardTitle}>
                        {[v.marca, v.modelo].filter(Boolean).join(" ") ||
                          v.matricula}
                      </span>
                      <span style={s.cardSub}>{v.matricula}</span>
                      {v.tipo && <span style={s.cardSub}>{v.tipo}</span>}
                      {v.capacidad && (
                        <span style={s.cardSub}>{v.capacidad} plazas</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}>
                <span style={s.badge("#f59e0b")}>⏳</span>
                Viajes en curso ({activos.length})
              </div>
              {activos.length === 0 ? (
                <p
                  style={{
                    color: "var(--muted)",
                    textAlign: "center",
                    padding: "1rem",
                  }}
                >
                  No hay viajes activos.
                </p>
              ) : (
                <div style={s.grid}>
                  {activos.map((u) => (
                    <div
                      key={u.id_uso}
                      style={{
                        ...s.card(false),
                        cursor: "default",
                        borderColor: "#f59e0b",
                      }}
                    >
                      <span style={s.cardTitle}>
                        {[u.marca, u.modelo].filter(Boolean).join(" ") ||
                          u.matricula}
                      </span>
                      <span style={s.cardSub}>{u.matricula}</span>
                      <span style={s.cardSub}>🧑‍✈️ {u.nombre_conductor}</span>
                      <span style={s.cardSub}>
                        🕐{" "}
                        {new Date(u.fecha_salida).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {u.pasajeros?.length > 0 && (
                        <span style={s.cardSub}>
                          👥 {u.pasajeros.map((p) => p.nombre).join(", ")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SALIDA: PASO 1 Vehículo ── */}
        {paso === PASO.SALIDA_VEHICULO && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Selecciona el vehículo</div>
            <div style={s.grid}>
              {disponibles.map((v) => (
                <div
                  key={v.id_vehiculo}
                  style={s.card(
                    vehiculoSel?.id_vehiculo === v.id_vehiculo,
                    "#0ea5e9",
                  )}
                  onClick={() => setVehiculoSel(v)}
                >
                  <span style={s.cardTitle}>
                    {[v.marca, v.modelo].filter(Boolean).join(" ") ||
                      v.matricula}
                  </span>
                  <span style={s.cardSub}>{v.matricula}</span>
                  {v.tipo && <span style={s.cardSub}>{v.tipo}</span>}
                  {v.capacidad && (
                    <span style={s.cardSub}>{v.capacidad} plazas</span>
                  )}
                </div>
              ))}
            </div>
            <div style={s.actions}>
              <button
                style={s.btn()}
                disabled={!vehiculoSel}
                onClick={() => setPaso(PASO.SALIDA_CONDUCTOR)}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* ── SALIDA: PASO 2 Conductor ── */}
        {paso === PASO.SALIDA_CONDUCTOR && (
          <div style={s.section}>
            <div style={s.sectionTitle}>
              Selecciona el conductor
              <span style={{ ...s.badge("#0ea5e9"), marginLeft: "auto" }}>
                {vehiculoSel?.matricula}
              </span>
            </div>
            <div style={s.grid}>
              {usuarios.map((u) => (
                <div
                  key={u.id_usuario}
                  style={s.card(conductorSel?.id_usuario === u.id_usuario)}
                  onClick={() => setConductorSel(u)}
                >
                  <span style={s.cardTitle}>{u.nombre}</span>
                  <span style={s.cardSub}>
                    {u.rol === "admin" ? "Administrador" : "Empleado"}
                  </span>
                </div>
              ))}
            </div>
            <div style={s.actions}>
              <button
                style={s.btnOutline}
                onClick={() => setPaso(PASO.SALIDA_VEHICULO)}
              >
                ← Atrás
              </button>
              <button
                style={s.btn()}
                disabled={!conductorSel}
                onClick={() => setPaso(PASO.SALIDA_PASAJEROS)}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* ── SALIDA: PASO 3 Pasajeros ── */}
        {paso === PASO.SALIDA_PASAJEROS && (
          <div style={s.section}>
            <div style={s.sectionTitle}>
              Añadir pasajeros (opcional)
              <span style={{ ...s.badge("#0ea5e9"), marginLeft: "auto" }}>
                {vehiculoSel?.matricula} · {conductorSel?.nombre}
              </span>
            </div>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Pulsa los nombres para seleccionar. Pulsa de nuevo para
              deseleccionar.
            </p>
            <div style={s.grid}>
              {usuarios
                .filter((u) => u.id_usuario !== conductorSel?.id_usuario)
                .map((u) => (
                  <div
                    key={u.id_usuario}
                    style={s.card(
                      pasajerosSel.some((p) => p.id_usuario === u.id_usuario),
                      "#8b5cf6",
                    )}
                    onClick={() => togglePasajero(u)}
                  >
                    <span style={s.cardTitle}>{u.nombre}</span>
                    <span style={s.cardSub}>
                      {pasajerosSel.some((p) => p.id_usuario === u.id_usuario)
                        ? "✓ Seleccionado"
                        : "Pulsar para añadir"}
                    </span>
                  </div>
                ))}
            </div>
            {pasajerosSel.length > 0 && (
              <p style={{ marginTop: "0.75rem", fontWeight: 600 }}>
                Pasajeros: {pasajerosSel.map((p) => p.nombre).join(", ")}
              </p>
            )}
            <div style={s.actions}>
              <button
                style={s.btnOutline}
                onClick={() => setPaso(PASO.SALIDA_CONDUCTOR)}
              >
                ← Atrás
              </button>
              <button
                style={s.btn()}
                onClick={() => setPaso(PASO.SALIDA_CONFIRMAR)}
              >
                {pasajerosSel.length > 0
                  ? `Continuar (${pasajerosSel.length} pasajero${pasajerosSel.length > 1 ? "s" : ""})`
                  : "Continuar sin pasajeros"}
              </button>
            </div>
          </div>
        )}

        {/* ── SALIDA: PASO 4 Confirmar ── */}
        {paso === PASO.SALIDA_CONFIRMAR && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Confirmar salida</div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                fontSize: "1.1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                🚗 <strong>Vehículo:</strong>{" "}
                {[vehiculoSel?.marca, vehiculoSel?.modelo]
                  .filter(Boolean)
                  .join(" ") || vehiculoSel?.matricula}{" "}
                ({vehiculoSel?.matricula})
              </div>
              <div>
                🧑‍✈️ <strong>Conductor:</strong> {conductorSel?.nombre}
              </div>
              <div>
                👥 <strong>Pasajeros:</strong>{" "}
                {pasajerosSel.length > 0
                  ? pasajerosSel.map((p) => p.nombre).join(", ")
                  : "Ninguno"}
              </div>
              <div>
                🕐 <strong>Hora:</strong>{" "}
                {new Date().toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div style={s.actions}>
              <button
                style={s.btnOutline}
                onClick={() => setPaso(PASO.SALIDA_PASAJEROS)}
              >
                ← Atrás
              </button>
              <button
                style={{
                  ...s.btn("#10b981"),
                  fontSize: "1.2rem",
                  minHeight: 64,
                  minWidth: 220,
                }}
                disabled={operando}
                onClick={confirmarSalida}
              >
                {operando ? "Registrando..." : "✅ Confirmar salida"}
              </button>
            </div>
          </div>
        )}

        {/* ── LLEGADA: Seleccionar viaje ── */}
        {paso === PASO.LLEGADA_VIAJE && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Selecciona el viaje que ha llegado</div>
            {activos.length === 0 ? (
              <p
                style={{
                  color: "var(--muted)",
                  textAlign: "center",
                  padding: "2rem",
                }}
              >
                No hay viajes activos.
              </p>
            ) : (
              <div style={s.grid}>
                {activos.map((u) => (
                  <div
                    key={u.id_uso}
                    style={{
                      ...s.card(
                        viajeSelLlegada?.id_uso === u.id_uso,
                        "#10b981",
                      ),
                      cursor: "pointer",
                    }}
                    onClick={() => seleccionarViajeLlegada(u)}
                  >
                    <span style={s.cardTitle}>
                      {[u.marca, u.modelo].filter(Boolean).join(" ") ||
                        u.matricula}
                    </span>
                    <span style={s.cardSub}>{u.matricula}</span>
                    <span style={s.cardSub}>🧑‍✈️ {u.nombre_conductor}</span>
                    <span style={s.cardSub}>
                      🕐{" "}
                      {new Date(u.fecha_salida).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {u.pasajeros?.length > 0 && (
                      <span style={s.cardSub}>
                        👥 {u.pasajeros.map((p) => p.nombre).join(", ")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={s.actions}>
              <button style={s.btnOutline} onClick={() => setPaso(PASO.HOME)}>
                ← Volver
              </button>
            </div>
          </div>
        )}

        {/* ── LLEGADA: Conductor de vuelta ── */}
        {paso === PASO.LLEGADA_CONDUCTOR && viajeSelLlegada && (
          <div style={s.section}>
            <div style={s.sectionTitle}>
              ¿Quién conduce de vuelta?
              <span style={{ ...s.badge("#10b981"), marginLeft: "auto" }}>
                {viajeSelLlegada.matricula}
              </span>
            </div>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Conductor de ida:{" "}
              <strong>{viajeSelLlegada.nombre_conductor}</strong>. Selecciona
              otro conductor si la vuelta la hace una persona distinta.
            </p>
            <div style={s.grid}>
              {/* Opción "el mismo de ida" */}
              <div
                style={s.card(conductorVuelta === null, "#10b981")}
                onClick={() => setConductorVuelta(null)}
              >
                <span style={s.cardTitle}>
                  {viajeSelLlegada.nombre_conductor}
                </span>
                <span style={s.cardSub}>✓ El mismo de ida</span>
              </div>
              {/* Resto de usuarios */}
              {usuarios
                .filter((u) => u.id_usuario !== viajeSelLlegada.id_usuario)
                .map((u) => (
                  <div
                    key={u.id_usuario}
                    style={s.card(
                      conductorVuelta?.id_usuario === u.id_usuario,
                      "#10b981",
                    )}
                    onClick={() => setConductorVuelta(u)}
                  >
                    <span style={s.cardTitle}>{u.nombre}</span>
                    <span style={s.cardSub}>
                      {u.rol === "admin" ? "Administrador" : "Empleado"}
                    </span>
                  </div>
                ))}
            </div>
            <div style={s.actions}>
              <button
                style={s.btnOutline}
                onClick={() => setPaso(PASO.LLEGADA_VIAJE)}
              >
                ← Atrás
              </button>
              <button
                style={s.btn("#10b981")}
                disabled={cargandoEncuesta}
                onClick={avanzarAEncuesta}
              >
                {cargandoEncuesta ? "Cargando encuesta..." : "Siguiente →"}
              </button>
            </div>
          </div>
        )}

        {/* ── LLEGADA: Encuesta ── */}
        {paso === PASO.LLEGADA_ENCUESTA && (
          <div style={s.section}>
            <div style={s.sectionTitle}>
              Encuesta del vehículo
              <span style={{ ...s.badge("#10b981"), marginLeft: "auto" }}>
                {viajeSelLlegada?.matricula}
              </span>
            </div>
            <p
              style={{
                color: "var(--muted)",
                marginTop: 0,
                marginBottom: "1rem",
              }}
            >
              Completa las preguntas antes de registrar la llegada.
              {preguntasEncuesta.some((p) => p.obligatoria) && (
                <span style={{ color: "#ef4444" }}>
                  {" "}
                  Las marcadas con * son obligatorias.
                </span>
              )}
            </p>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {preguntasEncuesta.map((p) => (
                <div key={p.id_pregunta} style={s.preguntaBox}>
                  <label style={{ fontWeight: 600, fontSize: "1rem" }}>
                    {p.texto}
                    {p.obligatoria && (
                      <span style={{ color: "#ef4444" }}> *</span>
                    )}
                  </label>

                  {p.tipo_respuesta === "texto" && (
                    <input
                      type="text"
                      style={s.inputEncuesta}
                      value={respuestas[p.id_pregunta] || ""}
                      onChange={(e) =>
                        setRespuestas((r) => ({
                          ...r,
                          [p.id_pregunta]: e.target.value,
                        }))
                      }
                      placeholder="Escribe tu respuesta..."
                    />
                  )}

                  {p.tipo_respuesta === "numero" && (
                    <input
                      type="number"
                      style={s.inputEncuesta}
                      value={respuestas[p.id_pregunta] || ""}
                      onChange={(e) =>
                        setRespuestas((r) => ({
                          ...r,
                          [p.id_pregunta]: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  )}

                  {p.tipo_respuesta === "booleano" && (
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      {[
                        { val: "true", label: "✅ Sí" },
                        { val: "false", label: "❌ No" },
                      ].map(({ val, label }) => (
                        <div
                          key={val}
                          style={{
                            ...s.card(
                              respuestas[p.id_pregunta] === val,
                              val === "true" ? "#10b981" : "#ef4444",
                            ),
                            minHeight: "auto",
                            padding: "0.75rem 1.5rem",
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onClick={() =>
                            setRespuestas((r) => ({
                              ...r,
                              [p.id_pregunta]: val,
                            }))
                          }
                        >
                          <span
                            style={{ fontWeight: 700, fontSize: "1.05rem" }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {p.tipo_respuesta === "opciones" && (
                    <div style={s.grid}>
                      {(p.opciones || []).map((o) => (
                        <div
                          key={o.id_opcion}
                          style={{
                            ...s.card(
                              respuestas[p.id_pregunta] === String(o.id_opcion),
                              "#8b5cf6",
                            ),
                            minHeight: "auto",
                            padding: "0.75rem 1rem",
                          }}
                          onClick={() =>
                            setRespuestas((r) => ({
                              ...r,
                              [p.id_pregunta]: String(o.id_opcion),
                            }))
                          }
                        >
                          <span style={s.cardTitle}>{o.texto}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={s.actions}>
              <button
                style={s.btnOutline}
                onClick={() => setPaso(PASO.LLEGADA_CONDUCTOR)}
              >
                ← Atrás
              </button>
              <button
                style={{
                  ...s.btn("#10b981"),
                  fontSize: "1.1rem",
                  minHeight: 60,
                  minWidth: 220,
                }}
                disabled={operando || !encuestaValida()}
                onClick={confirmarLlegada}
              >
                {operando ? "Registrando..." : "✅ Confirmar llegada"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
