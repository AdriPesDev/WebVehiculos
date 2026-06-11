import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { api } from "../services/api";
import Layout from "../components/Layout";
import Badge from "../components/Badge";
import Alert from "../components/Alert";
import Drawer from "../components/Drawer";
import SurveyBuilderModal from "../components/SurveyBuilderModal";
import VehicleEditModal from "../components/VehicleEditModal";

export default function DashboardAdmin({ data: initialData }) {
  const [data, setData] = useState(initialData);
  const [flash, setFlash] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("vehicle");
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [companySurveys, setCompanySurveys] = useState([]);
  const [deleteSurveyModal, setDeleteSurveyModal] = useState(null);
  const [editVehicleModal, setEditVehicleModal] = useState(null);

  // Historial
  const [historial, setHistorial] = useState([]);
  const [historialCargado, setHistorialCargado] = useState(false);
  const [expandedTrip, setExpandedTrip] = useState(null);
  const [tripEncuestas, setTripEncuestas] = useState({});

  const [approveModal, setApproveModal] = useState(null);
  const [maintModal, setMaintModal] = useState(null);
  const [maintLoading, setMaintLoading] = useState(false);
  const [endMaintModal, setEndMaintModal] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [removeEmpModal, setRemoveEmpModal] = useState(null);

  const {
    company,
    companyVehicles,
    companyUsers,
    pendingRequests,
    activeTrips = [],
  } = data;

  useEffect(() => {
    loadSurveys();
  }, []);

  async function loadSurveys() {
    const res = await api.getSurveys();
    if (res.surveys) setCompanySurveys(res.surveys);
  }

  async function loadHistorial() {
    if (historialCargado) return;
    try {
      const usos = await api.usoHistorial();
      setHistorial(usos);
      setHistorialCargado(true);
    } catch {
      setFlash({ type: "error", message: "Error al cargar el historial." });
    }
  }

  async function toggleTrip(tripId) {
    if (expandedTrip === tripId) {
      setExpandedTrip(null);
      return;
    }
    setExpandedTrip(tripId);
    if (!tripEncuestas[tripId]) {
      try {
        const enc = await api.getEncuestaViaje(tripId);
        setTripEncuestas((prev) => ({
          ...prev,
          [tripId]: enc?.preguntas || [],
        }));
      } catch {
        setTripEncuestas((prev) => ({ ...prev, [tripId]: [] }));
      }
    }
  }

  async function confirmApprove(role) {
    const { requestId, userName } = approveModal;
    setApproveModal(null);
    const res = await api.approveRequest(requestId, role);
    if (res.ok) {
      setFlash({
        type: "success",
        message: `${userName} aprobado como ${role === "admin" ? "administrador" : "empleado"}.`,
      });
      setData((d) => ({
        ...d,
        pendingRequests: d.pendingRequests.filter((r) => r.id !== requestId),
      }));
    } else setFlash({ type: "error", message: res.error });
  }

  async function handleReject(requestId) {
    const res = await api.rejectRequest(requestId);
    if (res.ok) {
      setFlash({ type: "success", message: "Solicitud rechazada." });
      setData((d) => ({
        ...d,
        pendingRequests: d.pendingRequests.filter((r) => r.id !== requestId),
      }));
    } else setFlash({ type: "error", message: res.error });
  }

  async function confirmMaintenance() {
    setMaintLoading(true);
    const res = await api.startMaintenance(
      maintModal.vehicleId,
      maintModal.reason,
    );
    setMaintModal(null);
    setMaintLoading(false);
    if (res.ok) {
      setFlash({ type: "success", message: "Mantenimiento iniciado." });
      const updated = await api.dashboard();
      setData(updated);
    } else setFlash({ type: "error", message: res.error });
  }

  async function confirmEndMaintenance() {
    const { vehicleId } = endMaintModal;
    setEndMaintModal(null);
    setMaintLoading(true);
    const res = await api.endMaintenance(vehicleId, invoiceFile);
    setInvoiceFile(null);
    setMaintLoading(false);
    if (res.ok) {
      setFlash({ type: "success", message: "Mantenimiento finalizado." });
      const updated = await api.dashboard();
      setData(updated);
    } else setFlash({ type: "error", message: res.error });
  }

  async function confirmDelete() {
    const { vehicleId } = deleteModal;
    setDeleteModal(null);
    const res = await api.deleteVehicle(vehicleId);
    if (res.ok) {
      setFlash({ type: "success", message: "Vehículo eliminado." });
      setData((d) => ({
        ...d,
        companyVehicles: d.companyVehicles.filter((v) => v.id !== vehicleId),
      }));
    } else setFlash({ type: "error", message: res.error });
  }

  async function confirmRemoveEmployee() {
    const { userId } = removeEmpModal;
    setRemoveEmpModal(null);
    const res = await api.removeEmployee(userId);
    if (res.ok) {
      setFlash({ type: "success", message: "Empleado retirado." });
      setData((d) => ({
        ...d,
        companyUsers: d.companyUsers.filter((u) => u.id !== userId),
      }));
    } else setFlash({ type: "error", message: res.error });
  }

  async function confirmDeleteSurvey() {
    const { surveyId } = deleteSurveyModal;
    setDeleteSurveyModal(null);
    const res = await api.deleteSurvey(surveyId);
    if (res.ok) {
      setFlash({ type: "success", message: "Pregunta eliminada." });
      setCompanySurveys((s) => s.filter((srv) => srv.id !== surveyId));
    } else setFlash({ type: "error", message: res.error });
  }

  function handleVehicleUpdated(vehicleActualizado) {
    setData((d) => ({
      ...d,
      companyVehicles: d.companyVehicles.map((v) =>
        v.id === vehicleActualizado.id_vehiculo
          ? {
              ...v,
              plate: vehicleActualizado.matricula,
              model:
                [vehicleActualizado.marca, vehicleActualizado.modelo]
                  .filter(Boolean)
                  .join(" ") || "—",
              marca: vehicleActualizado.marca,
              modelo: vehicleActualizado.modelo,
              tipo: vehicleActualizado.tipo || "—",
              capacity: vehicleActualizado.capacidad || "—",
              location: vehicleActualizado.ubicacion || "—",
            }
          : v,
      ),
    }));
    setFlash({ type: "success", message: "Vehículo actualizado." });
  }

  return (
    <Layout>
      <section className="dashboard">
        <div className="dashboard-header">
          <div>
            <h2>Panel administrativo</h2>
            <p>
              Empresa: <strong>{company.name}</strong>
            </p>
          </div>
          <div className="dashboard-actions">
            <button
              className="button button-outline"
              onClick={() => {
                setDrawerTab("vehicle");
                setDrawerOpen(true);
              }}
            >
              🚗➕ Añadir vehículo
            </button>
            <button
              className="button button-outline"
              onClick={() => {
                setDrawerTab("employee");
                setDrawerOpen(true);
              }}
            >
              👷➕ Añadir empleado
            </button>
            <button
              className="button button-outline"
              onClick={() => setSurveyModalOpen(true)}
            >
              📋➕ Añadir encuesta
            </button>
            <Link to="/kiosko" className="button button-outline">
              📟 Modo kiosco
            </Link>
          </div>
        </div>

        {flash && (
          <Alert
            type={flash.type}
            message={flash.message}
            onClose={() => setFlash(null)}
          />
        )}

        {/* Tarjetas */}
        <div className="admin-cards">
          <div className="admin-card admin-card-vehicles">
            <h3>🚗 Vehículos</h3>
            <span className="stat-number">{companyVehicles.length}</span>
            <p>en flota</p>
          </div>
          <div className="admin-card admin-card-employees">
            <h3>👥 Empleados</h3>
            <span className="stat-number">
              {companyUsers.filter((u) => u.role === "empleado").length}
            </span>
            <p>empleados activos</p>
          </div>
          <div className="admin-card admin-card-requests">
            <h3>⏳ Solicitudes</h3>
            <span className="stat-number">{pendingRequests.length}</span>
            <p>por revisar</p>
          </div>
        </div>

        {/* Solicitudes pendientes */}
        {pendingRequests.length > 0 && (
          <div className="table-section">
            <h3>Solicitudes de membresía pendientes</h3>
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.userName}</td>
                    <td>{r.userEmail}</td>
                    <td>{new Date(r.createdAt).toLocaleDateString("es-ES")}</td>
                    <td>
                      <button
                        className="button button-outline"
                        onClick={() =>
                          setApproveModal({
                            requestId: r.id,
                            userName: r.userName,
                          })
                        }
                      >
                        Aprobar
                      </button>{" "}
                      <button
                        className="button button-danger"
                        onClick={() => handleReject(r.id)}
                      >
                        Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Vehículos */}
        <div className="table-section">
          <h3>Vehículos de la empresa</h3>
          <table>
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Matrícula</th>
                <th>Tipo</th>
                <th>Plazas</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companyVehicles.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      color: "var(--muted)",
                      padding: "1.5rem",
                    }}
                  >
                    No hay vehículos en la flota todavía.
                  </td>
                </tr>
              )}
              {companyVehicles.map((v) => {
                const states = v.states || [];
                const inMaint = states.includes("mantenimiento");
                return (
                  <tr key={v.id}>
                    <td>{v.model}</td>
                    <td>{v.plate}</td>
                    <td>{v.tipo !== "—" ? v.tipo : "—"}</td>
                    <td>{v.capacity !== "—" ? v.capacity : "—"}</td>
                    <td>
                      <Badge states={states} />
                    </td>
                    <td className="table-actions">
                      <Link
                        to={`/vehicle/${v.id}`}
                        className="button button-small button-outline"
                      >
                        Detalles
                      </Link>
                      <button
                        className="button button-small button-outline"
                        onClick={() => setEditVehicleModal(v)}
                      >
                        ✏️ Editar
                      </button>
                      {inMaint ? (
                        <button
                          className="button button-small button-warning"
                          disabled={maintLoading}
                          onClick={() =>
                            setEndMaintModal({
                              vehicleId: v.id,
                              vehicleName: v.model,
                            })
                          }
                        >
                          Fin mant.
                        </button>
                      ) : (
                        <button
                          className="button button-small button-warning"
                          disabled={maintLoading}
                          onClick={() =>
                            setMaintModal({
                              vehicleId: v.id,
                              vehicleName: v.model,
                              reason: "",
                            })
                          }
                        >
                          Mantenimiento
                        </button>
                      )}
                      <button
                        className="button button-small button-danger"
                        onClick={() =>
                          setDeleteModal({
                            vehicleId: v.id,
                            vehicleName: v.model,
                          })
                        }
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empleados */}
        <div className="table-section">
          <h3>Empleados de la empresa</h3>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companyUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      textAlign: "center",
                      color: "var(--muted)",
                      padding: "1.5rem",
                    }}
                  >
                    No hay trabajadores en la empresa todavía.
                  </td>
                </tr>
              )}
              {companyUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge">{u.role}</span>
                  </td>
                  <td>
                    {u.role === "empleado" && (
                      <button
                        className="button button-small button-danger"
                        onClick={() =>
                          setRemoveEmpModal({ userId: u.id, userName: u.name })
                        }
                      >
                        Quitar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Encuestas configuradas */}
        <div className="table-section">
          <h3>Preguntas de encuesta</h3>
          <table>
            <thead>
              <tr>
                <th>Pregunta</th>
                <th>Tipo</th>
                <th>Vehículos</th>
                <th>Obligatoria</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companySurveys.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      color: "var(--muted)",
                      padding: "1.5rem",
                    }}
                  >
                    No hay preguntas configuradas todavía.
                  </td>
                </tr>
              )}
              {companySurveys.map((s) => (
                <tr key={s.id}>
                  <td>{s.text}</td>
                  <td>
                    <span className="badge">{s.type}</span>
                  </td>
                  <td>{s.vehicleName}</td>
                  <td>{s.required ? "✓" : "—"}</td>
                  <td>
                    <span
                      className={`badge ${s.active ? "badge-success" : "badge-warning"}`}
                    >
                      {s.active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="button button-small button-danger"
                      onClick={() =>
                        setDeleteSurveyModal({
                          surveyId: s.id,
                          surveyName: s.text,
                        })
                      }
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Viajes activos */}
        {activeTrips.length > 0 && (
          <div className="table-section">
            <h3>Viajes en curso ({activeTrips.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Matrícula</th>
                  <th>Conductor</th>
                  <th>Salida</th>
                  <th>Pasajeros</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activeTrips.map((t) => (
                  <tr key={t.id}>
                    <td>{t.vehicleModel}</td>
                    <td>{t.vehiclePlate}</td>
                    <td>{t.driverName}</td>
                    <td>{new Date(t.checkoutTime).toLocaleString("es-ES")}</td>
                    <td>{t.passengers?.length ?? 0}</td>
                    <td>
                      <Link
                        to={`/vehicle/${t.vehicle_id}`}
                        className="button button-small button-outline"
                      >
                        Gestionar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Historial de viajes */}
        <div className="table-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <h3 style={{ margin: 0 }}>Historial de viajes</h3>
            {!historialCargado && (
              <button className="button button-outline" onClick={loadHistorial}>
                Cargar historial
              </button>
            )}
          </div>
          {historialCargado && (
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Vehículo</th>
                  <th>Conductor</th>
                  <th>Salida</th>
                  <th>Entrada</th>
                  <th>Pasajeros</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {historial.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        color: "var(--muted)",
                        padding: "1.5rem",
                      }}
                    >
                      Sin viajes registrados.
                    </td>
                  </tr>
                )}
                {historial.map((t) => (
                  <>
                    <tr
                      key={t.id_uso}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggleTrip(t.id_uso)}
                    >
                      <td style={{ width: 32, textAlign: "center" }}>
                        {expandedTrip === t.id_uso ? "▾" : "▸"}
                      </td>
                      <td>
                        {[t.marca, t.modelo].filter(Boolean).join(" ") || "—"} ·{" "}
                        {t.matricula}
                      </td>
                      <td>{t.nombre_conductor}</td>
                      <td>
                        {t.fecha_salida
                          ? new Date(t.fecha_salida).toLocaleString("es-ES")
                          : "—"}
                      </td>
                      <td>
                        {t.fecha_entrada
                          ? new Date(t.fecha_entrada).toLocaleString("es-ES")
                          : "—"}
                      </td>
                      <td>{parseInt(t.num_pasajeros) || 0}</td>
                      <td>
                        <span
                          className={`badge ${!t.fecha_entrada ? "badge-warning" : "badge-success"}`}
                        >
                          {!t.fecha_entrada ? "En curso" : "Completado"}
                        </span>
                      </td>
                    </tr>
                    {expandedTrip === t.id_uso && (
                      <tr key={`${t.id_uso}-detail`}>
                        <td
                          colSpan={7}
                          style={{
                            background: "var(--bg)",
                            padding: "1rem 1.5rem",
                          }}
                        >
                          {tripEncuestas[t.id_uso] === undefined ? (
                            <p style={{ color: "var(--muted)", margin: 0 }}>
                              Cargando encuesta...
                            </p>
                          ) : tripEncuestas[t.id_uso].length === 0 ? (
                            <p style={{ color: "var(--muted)", margin: 0 }}>
                              Sin preguntas de encuesta para este viaje.
                            </p>
                          ) : (
                            <div>
                              <strong
                                style={{
                                  display: "block",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                Respuestas de encuesta:
                              </strong>
                              <table
                                style={{ width: "100%", fontSize: "0.88rem" }}
                              >
                                <thead>
                                  <tr>
                                    <th
                                      style={{
                                        textAlign: "left",
                                        paddingRight: "1rem",
                                      }}
                                    >
                                      Pregunta
                                    </th>
                                    <th style={{ textAlign: "left" }}>
                                      Respuesta
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tripEncuestas[t.id_uso].map((q) => (
                                    <tr key={q.id_pregunta}>
                                      <td
                                        style={{
                                          paddingRight: "1rem",
                                          paddingBottom: "0.25rem",
                                        }}
                                      >
                                        {q.texto}
                                      </td>
                                      <td style={{ paddingBottom: "0.25rem" }}>
                                        {q.id_respuesta ? (
                                          (q.valor_texto ??
                                          q.valor_numero ??
                                          (q.valor_boolean !== null
                                            ? q.valor_boolean
                                              ? "Sí"
                                              : "No"
                                            : null) ??
                                          q.texto_opcion ??
                                          "—")
                                        ) : (
                                          <span
                                            style={{ color: "var(--muted)" }}
                                          >
                                            Sin respuesta
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
          {!historialCargado && (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              Pulsa "Cargar historial" para ver todos los viajes de la empresa.
            </p>
          )}
        </div>
      </section>

      {/* Modales */}
      {approveModal && (
        <>
          <button
            type="button"
            className="modal-overlay"
            aria-label="Cerrar"
            onClick={() => setApproveModal(null)}
          />
          <dialog open className="modal-box">
            <h3>Aprobar solicitud</h3>
            <p>
              ¿Con qué rol quieres añadir a{" "}
              <strong>{approveModal.userName}</strong>?
            </p>
            <div className="modal-actions">
              <button
                className="button button-outline"
                onClick={() => setApproveModal(null)}
              >
                Cancelar
              </button>
              <button
                className="button button-outline"
                onClick={() => confirmApprove("empleado")}
              >
                Empleado
              </button>
              <button
                className="button button-primary"
                onClick={() => confirmApprove("admin")}
              >
                Administrador
              </button>
            </div>
          </dialog>
        </>
      )}

      {endMaintModal && (
        <>
          <button
            type="button"
            className="modal-overlay"
            aria-label="Cerrar"
            onClick={() => setEndMaintModal(null)}
          />
          <dialog open className="modal-box">
            <h3>Finalizar mantenimiento</h3>
            <p>
              Vehículo: <strong>{endMaintModal.vehicleName}</strong>
            </p>
            <div className="field">
              <label
                htmlFor="invoice-file-admin"
                className="button button-outline file-btn"
              >
                📎{" "}
                {invoiceFile ? invoiceFile.name : "Adjuntar factura (opcional)"}
              </label>
              <input
                id="invoice-file-admin"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={(e) => setInvoiceFile(e.target.files[0] || null)}
              />
            </div>
            <div className="modal-actions">
              <button
                className="button button-outline"
                onClick={() => setEndMaintModal(null)}
              >
                Cancelar
              </button>
              <button
                className="button button-primary"
                onClick={confirmEndMaintenance}
              >
                Finalizar
              </button>
            </div>
          </dialog>
        </>
      )}

      {maintModal && (
        <>
          <button
            type="button"
            className="modal-overlay"
            aria-label="Cerrar"
            onClick={() => setMaintModal(null)}
          />
          <dialog open className="modal-box">
            <h3>Iniciar mantenimiento</h3>
            <p>
              Vehículo: <strong>{maintModal.vehicleName}</strong>
            </p>
            <textarea
              rows={3}
              placeholder="Motivo (opcional)"
              value={maintModal.reason}
              onChange={(e) =>
                setMaintModal((m) => ({ ...m, reason: e.target.value }))
              }
              autoFocus
            />
            <div className="modal-actions">
              <button
                className="button button-outline"
                onClick={() => setMaintModal(null)}
              >
                Cancelar
              </button>
              <button
                className="button button-warning"
                onClick={confirmMaintenance}
              >
                Iniciar mantenimiento
              </button>
            </div>
          </dialog>
        </>
      )}

      {deleteModal && (
        <>
          <button
            type="button"
            className="modal-overlay"
            aria-label="Cerrar"
            onClick={() => setDeleteModal(null)}
          />
          <dialog open className="modal-box">
            <h3>Eliminar vehículo</h3>
            <p>
              ¿Seguro que quieres eliminar{" "}
              <strong>{deleteModal.vehicleName}</strong>? Esta acción es
              permanente.
            </p>
            <div className="modal-actions">
              <button
                className="button button-outline"
                onClick={() => setDeleteModal(null)}
              >
                Cancelar
              </button>
              <button className="button button-danger" onClick={confirmDelete}>
                Eliminar
              </button>
            </div>
          </dialog>
        </>
      )}

      {removeEmpModal && (
        <>
          <button
            type="button"
            className="modal-overlay"
            aria-label="Cerrar"
            onClick={() => setRemoveEmpModal(null)}
          />
          <dialog open className="modal-box">
            <h3>Quitar empleado</h3>
            <p>
              ¿Seguro que quieres quitar a{" "}
              <strong>{removeEmpModal.userName}</strong>? Quedará sin empresa
              asignada.
            </p>
            <div className="modal-actions">
              <button
                className="button button-outline"
                onClick={() => setRemoveEmpModal(null)}
              >
                Cancelar
              </button>
              <button
                className="button button-danger"
                onClick={confirmRemoveEmployee}
              >
                Quitar empleado
              </button>
            </div>
          </dialog>
        </>
      )}

      {deleteSurveyModal && (
        <>
          <button
            type="button"
            className="modal-overlay"
            aria-label="Cerrar"
            onClick={() => setDeleteSurveyModal(null)}
          />
          <dialog open className="modal-box">
            <h3>Eliminar pregunta</h3>
            <p>
              ¿Seguro que quieres eliminar la pregunta{" "}
              <strong>"{deleteSurveyModal.surveyName}"</strong>?
            </p>
            <div className="modal-actions">
              <button
                className="button button-outline"
                onClick={() => setDeleteSurveyModal(null)}
              >
                Cancelar
              </button>
              <button
                className="button button-danger"
                onClick={confirmDeleteSurvey}
              >
                Eliminar
              </button>
            </div>
          </dialog>
        </>
      )}

      <VehicleEditModal
        open={!!editVehicleModal}
        vehicle={editVehicleModal}
        onClose={() => setEditVehicleModal(null)}
        onUpdated={handleVehicleUpdated}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onVehicleAdded={(v) => {
          setData((d) => ({
            ...d,
            companyVehicles: [...d.companyVehicles, v],
          }));
          setFlash({ type: "success", message: "Vehículo añadido." });
        }}
        onEmployeeAdded={(u) => {
          setData((d) => ({ ...d, companyUsers: [...d.companyUsers, u] }));
          setFlash({ type: "success", message: "Empleado añadido." });
        }}
        initialTab={drawerTab}
      />

      <SurveyBuilderModal
        open={surveyModalOpen}
        onClose={() => setSurveyModalOpen(false)}
        companyVehicles={companyVehicles}
        onSurveyCreated={() => {
          setFlash({ type: "success", message: "Encuesta creada." });
          loadSurveys();
          setSurveyModalOpen(false);
        }}
      />
    </Layout>
  );
}

DashboardAdmin.propTypes = {
  data: PropTypes.object.isRequired,
};
