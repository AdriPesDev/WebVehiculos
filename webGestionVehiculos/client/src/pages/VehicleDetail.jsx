import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import Alert from '../components/Alert';

function duration(start, end) {
  if (!start) return '—';
  const ms = new Date(end || Date.now()) - new Date(start);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

async function loadMaintenanceHistory(vehicleId) {
  try {
    const maintenanceList = await api.get('/mantenimientos');
    const filtered = Array.isArray(maintenanceList)
      ? maintenanceList.filter(m => m.id_vehiculo === vehicleId)
      : [];

    const detailed = await Promise.all(
      filtered.map(m => api.get(`/mantenimientos/${m.id_mantenimiento}`))
    );

    return detailed;
  } catch (err) {
    console.error('Error loading maintenance history:', err);
    return [];
  }
}

async function loadTripsData(vehicleId) {
  try {
    const [usosList, allUsos] = await Promise.all([
      api.get('/usos/activos'),
      api.get('/usos')
    ]);

    const activeUsoFromActivos = Array.isArray(usosList)
      ? usosList.find(u => u.id_vehiculo === vehicleId)
      : null;

    // /usos (historial completo) puede incluir pasajeros; úsalo como fallback
    const activeUsoFromAll = Array.isArray(allUsos)
      ? allUsos.find(u => u.id_vehiculo === vehicleId && !u.fecha_entrada)
      : null;

    const activeUso = activeUsoFromActivos ?? activeUsoFromAll ?? null;

    // El API no expone pasajeros en ningún endpoint GET — leer de localStorage
    const storedKey = activeUso?.id_uso ? `trip_passengers_${activeUso.id_uso}` : null;
    const storedPassengers = storedKey
      ? JSON.parse(localStorage.getItem(storedKey) || '[]')
      : [];

    const rawPassengers = (() => {
      const a = activeUsoFromActivos?.pasajeros;
      const b = activeUsoFromAll?.pasajeros;
      if (Array.isArray(a) && a.length > 0) return a;
      if (Array.isArray(b) && b.length > 0) return b;
      return storedPassengers;
    })();

    let surveyTemplate = null;
    if (activeUso?.id_uso) {
      try {
        const surveyRes = await api.get(`/encuestas/preguntas?id_uso=${activeUso.id_uso}`);
        if (surveyRes && surveyRes.preguntas && Array.isArray(surveyRes.preguntas)) {
          surveyTemplate = {
            id: activeUso.id_uso,
            questions: surveyRes.preguntas.map(p => ({
              id: p.id_pregunta,
              text: p.texto,
              type: p.tipo_respuesta === 'numero' ? 'number' : p.tipo_respuesta === 'opciones' ? 'radio' : 'text',
              required: p.obligatoria,
              options: (p.opciones || []).map(opt =>
                typeof opt === 'string'
                  ? { id: undefined, text: opt }
                  : { id: opt.id_opcion, text: opt.texto || opt }
              )
            }))
          };
        }
      } catch (err) {
        console.warn('Failed to load survey:', err.message);
      }
    }

    const activeTrip = activeUso ? {
      id: activeUso.id_uso,
      checkoutTime: activeUso.fecha_salida,
      driverName: activeUso.nombre_conductor || 'N/A',
      driverId: activeUso.id_usuario,
      destination: activeUso.destino,
      passengers: rawPassengers.map(p => ({
        id: p.id || p.user_id || p.id_usuario,
        name: p.nombre || p.name,
        user_id: p.id || p.user_id || p.id_usuario,
        email: p.email
      }))
    } : null;

    const vehicleUsos = Array.isArray(allUsos)
      ? allUsos.filter(u => u.id_vehiculo === vehicleId)
      : [];

    const vehicleTrips = vehicleUsos.map(u => ({
      id: u.id_uso,
      usoId: u.id_uso,
      checkoutTime: u.fecha_salida,
      checkinTime: u.fecha_entrada,
      driverName: u.nombre_conductor || 'N/A',
      returnDriverName: u.nombre_conductor_vuelta,
      destination: u.destino,
      passengers: u.pasajeros || [],
      km: u.km,
      status: u.fecha_entrada ? 'completed' : 'active'
    }));

    if (activeTrip) {
      activeTrip.usoId = activeTrip.id;
    }

    return { activeTrip, vehicleTrips, surveyTemplate };
  } catch (err) {
    console.error('Error loading trips:', err);
    return { activeTrip: null, vehicleTrips: [], surveyTemplate: null };
  }
}

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  const [destination, setDestination] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addingPassenger, setAddingPassenger] = useState(false);
  const [checkoutPassengers, setCheckoutPassengers] = useState([]);
  const [checkoutPassengerSelect, setCheckoutPassengerSelect] = useState('');
  const [checkoutReturnDriverId, setCheckoutReturnDriverId] = useState('');
  const [checkoutDriverId, setCheckoutDriverId] = useState('');
  // Pasajeros del último checkout — persisten entre renders si el API no los devuelve
  const [tripPassengersOverride, setTripPassengersOverride] = useState([]);

  const [surveyModal, setSurveyModal] = useState(false);
  const [surveyTemplate, setSurveyTemplate] = useState(null);
  const [surveyAnswers, setSurveyAnswers] = useState({});
  const [observacionText, setObservacionText] = useState('');
  const [returnDriver, setReturnDriver] = useState('');
  const [resetModal, setResetModal] = useState(false);
  const [viewSurveyModal, setViewSurveyModal] = useState(null);
  const [companyUsersList, setCompanyUsersList] = useState([]);

  const [maintModal, setMaintModal] = useState(null);
  const [maintLoading, setMaintLoading] = useState(false);
  const [endMaintModal, setEndMaintModal] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [editVehicleModal, setEditVehicleModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  async function refresh() {
    try {
      const res = await api.vehicleDetail(id);
      if (res?.error) {
        console.error('Error in vehicle detail:', res.error);
        return;
      }

      const vehicleId = res.vehicle?.id_vehiculo || res.id_vehiculo;
      const updatedData = { ...res };

      const [maintenanceHistory, { activeTrip, vehicleTrips, surveyTemplate }, dashboardData] = await Promise.all([
        loadMaintenanceHistory(vehicleId),
        loadTripsData(vehicleId),
        api.dashboard().catch(() => ({}))
      ]);

      const companyUsersRes = dashboardData?.companyUsers || [];

      updatedData.maintenanceHistory = maintenanceHistory;
      updatedData.activeTrip = activeTrip;
      updatedData.vehicleTrips = vehicleTrips;
      updatedData.companyUsers = companyUsersRes;
      updatedData.surveyTemplate = surveyTemplate;

      setData(updatedData);
      setCompanyUsersList(companyUsersRes);
    } catch (err) {
      console.error('Refresh error:', err);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await api.vehicleDetail(id);
        if (res.error) {
          setError(res.error);
          return;
        }

        const vehicleId = res.vehicle?.id_vehiculo || res.id_vehiculo;
        const updatedData = { ...res };

        const [maintenanceHistory, { activeTrip, vehicleTrips, surveyTemplate }, dashboardData] = await Promise.all([
          loadMaintenanceHistory(vehicleId),
          loadTripsData(vehicleId),
          api.dashboard().catch(() => ({}))
        ]);

        const companyUsersRes = dashboardData?.companyUsers || [];

        updatedData.maintenanceHistory = maintenanceHistory;
        updatedData.activeTrip = activeTrip;
        updatedData.vehicleTrips = vehicleTrips;
        updatedData.companyUsers = companyUsersRes;
        updatedData.surveyTemplate = surveyTemplate;

        setData(updatedData);
        setCompanyUsersList(companyUsersRes);
      } catch (err) {
        console.error('Error loading vehicle:', err);
        setError('Error al cargar el vehículo.');
      }
    })();
  }, [id]);

  useEffect(() => {
    if (data?.surveyTemplate && !surveyTemplate) {
      setTimeout(() => {
        setSurveyTemplate(data.surveyTemplate);
        setSurveyAnswers({});
      }, 0);
    }
  }, [data?.surveyTemplate, data?.surveyTemplate?.id, surveyTemplate]);

  if (error) return <Layout><p className="alert alert-error">{error}</p></Layout>;
  if (!data) return <Layout><p>Cargando vehículo...</p></Layout>;

  // Manejar tanto estructura { vehicle: {...} } como directa {...}
  const vehicle = data.vehicle || data;
  const vehicleTrips = data.vehicleTrips || [];
  const company = data.company || null;
  const activeTrip = data.activeTrip || null;
  const canManageTrip = data.canManageTrip !== false;
  const companyUsers = companyUsersList || data.companyUsers || [];

  const states = vehicle?.states || vehicle?.estado || [];
  const maintenanceHistory = vehicle?.maintenanceHistory || [];
  const inMaint = Array.isArray(states) ? states.includes('mantenimiento') : states === 'mantenimiento';
  const isAvailable = (Array.isArray(states) ? states.includes('disponible') : states === 'disponible') && !activeTrip;
  const shownPassengers = (activeTrip?.passengers?.length ?? 0) > 0
    ? activeTrip.passengers
    : tripPassengersOverride;

  async function handleCheckout() {
    const vehicleId = vehicle.id_vehiculo || vehicle.id;
    const driverId = checkoutDriverId ? Number(checkoutDriverId) : null;
    const res = await api.checkout(vehicleId, driverId, destination || null);
    if (res.ok) {
      const usoId = res.data?.id_uso ?? res.data?.id;

      // El conductor activo del viaje (el seleccionado o, si no, el usuario actual)
      const conductorId = driverId ?? (user?.id_usuario ?? user?.id);

      // Pasajeros: selección manual + conductor de vuelta, excluyendo siempre al conductor
      const passengerIds = new Set(
        checkoutPassengers.map(p => p.id).filter(id => id !== conductorId)
      );
      if (checkoutReturnDriverId && Number(checkoutReturnDriverId) !== conductorId) {
        passengerIds.add(Number(checkoutReturnDriverId));
      }

      if (usoId && passengerIds.size > 0) {
        await Promise.all([...passengerIds].map(id => api.addPassenger(usoId, id)));
      }

      const addedPassengers = [...passengerIds].map(id => {
        const u = companyUsers.find(u => (u.id_usuario ?? u.id) === id);
        return { id, user_id: id, name: u?.nombre ?? String(id) };
      });

      if (checkoutReturnDriverId) setReturnDriver(checkoutReturnDriverId);
      setCheckoutPassengers([]);
      setCheckoutPassengerSelect('');
      setCheckoutReturnDriverId('');
      setCheckoutDriverId('');
      setDestination('');
      setTripPassengersOverride(addedPassengers);
      if (usoId && addedPassengers.length > 0) {
        localStorage.setItem(`trip_passengers_${usoId}`, JSON.stringify(addedPassengers));
      }
      setFlash({ type: 'success', message: 'Vehículo en uso.' });
      await refresh();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function confirmCheckin() {
    const usoId = activeTrip?.id;
    if (!usoId) {
      setFlash({ type: 'error', message: 'No hay viaje activo para completar.' });
      return;
    }

    // Admins siempre pueden registrar llegadas
    // Empleados solo si son participantes del viaje
    const isAdmin = user?.rol === 'admin' || user?.rol === 'superadmin';
    if (!isAdmin) {
      const isDriver = activeTrip?.driverId && user?.id_usuario && activeTrip.driverId === user.id_usuario;
      const isPassenger = activeTrip?.passengers?.some(p =>
        p.id === user?.id_usuario ||
        p.user_id === user?.id_usuario ||
        p.id_usuario === user?.id_usuario
      );

      if (!isDriver && !isPassenger) {
        setFlash({ type: 'error', message: 'Solo los participantes del viaje pueden registrar la llegada.' });
        return;
      }
    }

    if (surveyTemplate) {
      for (const q of surveyTemplate.questions) {
        if (q.required && !surveyAnswers[q.id]) {
          setFlash({ type: 'error', message: `La pregunta "${q.text}" es obligatoria.` });
          return;
        }
      }
    }

    try {
      // Primero guardar respuestas de encuesta si existen
      if (surveyTemplate && Object.keys(surveyAnswers).length > 0) {
        const respuestas = [];

        for (const q of surveyTemplate.questions) {
          const answer = surveyAnswers[q.id];
          if (!answer && answer !== false && answer !== 0) continue;

          const respuesta = { id_pregunta: q.id };

          if (q.type === 'number') {
            respuesta.valor_numero = answer;
          } else if (q.type === 'radio') {
            respuesta.id_opcion = answer;
          } else if (q.type === 'text') {
            respuesta.valor_texto = answer;
          } else if (q.type === 'boolean') {
            respuesta.valor_boolean = answer;
          }

          respuestas.push(respuesta);
        }

        await api.post('/encuestas/responder', {
          id_uso: usoId,
          respuestas
        });
      }

      if (observacionText.trim()) {
        await api.addObservacion(usoId, observacionText.trim());
      }

      // Luego completar el viaje
      const res = await api.checkin(usoId, returnDriver || null, null, null);
      setSurveyModal(false);
      setSurveyTemplate(null);
      setSurveyAnswers({});
      setObservacionText('');
      setReturnDriver('');
      if (res.ok) {
        setTripPassengersOverride([]);
        if (activeTrip?.usoId) localStorage.removeItem(`trip_passengers_${activeTrip.usoId}`);
        setFlash({ type: 'success', message: 'Vehículo devuelto. Viaje completado.' });
        await refresh();
      } else {
        setFlash({ type: 'error', message: res.error });
      }
    } catch (err) {
      console.error('Checkin error:', err);
      setFlash({ type: 'error', message: err.message });
    }
  }

  async function confirmResetState() {
    setResetModal(false);
    const vehicleId = vehicle.id_vehiculo || vehicle.id;
    const res = await api.resetVehicleState(vehicleId);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Estado restablecido a disponible.' });
      await refresh();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function handleAddPassenger(e) {
    e.preventDefault();
    setAddingPassenger(true);

    if (!selectedUserId || selectedUserId === '') {
      setFlash({ type: 'error', message: 'Selecciona un pasajero.' });
      setAddingPassenger(false);
      return;
    }

    if (!activeTrip?.usoId) {
      setFlash({ type: 'error', message: 'No hay viaje activo para añadir pasajeros.' });
      setAddingPassenger(false);
      return;
    }

    const userId = Number.parseInt(selectedUserId, 10);
    const res = await api.addPassenger(activeTrip.usoId, userId);
    setAddingPassenger(false);
    if (res.ok) {
      setSelectedUserId('');
      // Guardar en localStorage para que persista al recargar
      const u = companyUsers.find(u => (u.id_usuario ?? u.id) === userId);
      const newPassenger = { id: userId, user_id: userId, name: u?.nombre ?? String(userId) };
      setTripPassengersOverride(prev => {
        const updated = prev.some(p => (p.user_id ?? p.id) === userId) ? prev : [...prev, newPassenger];
        localStorage.setItem(`trip_passengers_${activeTrip.usoId}`, JSON.stringify(updated));
        return updated;
      });
      setFlash({ type: 'success', message: 'Pasajero añadido.' });
      await refresh();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function handleRemovePassenger(passenger) {
    const userId = passenger.user_id ?? passenger.id;
    if (!userId || !activeTrip?.usoId) {
      setFlash({ type: 'error', message: 'No se puede eliminar este pasajero.' });
      return;
    }
    const res = await api.removePassenger(activeTrip.usoId, userId);
    if (res.ok) {
      setTripPassengersOverride(prev => {
        const updated = prev.filter(p => (p.user_id ?? p.id) !== userId);
        if (activeTrip.usoId) {
          if (updated.length > 0) localStorage.setItem(`trip_passengers_${activeTrip.usoId}`, JSON.stringify(updated));
          else localStorage.removeItem(`trip_passengers_${activeTrip.usoId}`);
        }
        return updated;
      });
      setFlash({ type: 'success', message: 'Pasajero eliminado.' });
      await refresh();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function loadSurveyResponses(usoId) {
    try {
      const res = await api.getSurveyResponses(usoId);
      if (res.ok) {
        setViewSurveyModal({ usoId, respuestas: res.respuestas || [] });
      } else {
        console.warn('Survey responses error:', res.error);
        setFlash({ type: 'error', message: 'Error al cargar respuestas de encuesta.' });
      }
    } catch (err) {
      console.error('Survey responses exception:', err);
      setFlash({ type: 'error', message: err.message });
    }
  }

  async function confirmMaintenance() {
    setMaintLoading(true);
    const res = await api.startMaintenance(maintModal.vehicleId, maintModal.reason);
    setMaintModal(null);
    setMaintLoading(false);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Mantenimiento iniciado.' });
      await refresh();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  function handleEndMaintenance(vehicleId, vehicleName) {
    setInvoiceFile(null);
    setEndMaintModal({ vehicleId, vehicleName });
  }

  async function confirmEndMaintenance() {
    const { vehicleId } = endMaintModal;
    setEndMaintModal(null);
    setMaintLoading(true);
    const res = await api.endMaintenance(vehicleId);
    setInvoiceFile(null);
    setMaintLoading(false);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Mantenimiento finalizado.' });
      await refresh();
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  async function confirmEditVehicle() {
    const { vehicleId, matricula, marca, modelo } = editVehicleModal;
    setEditVehicleModal(null);
    try {
      await api.updateVehicle(vehicleId, { matricula, marca, modelo });
      setFlash({ type: 'success', message: 'Vehículo actualizado.' });
      await refresh();
    } catch (err) {
      setFlash({ type: 'error', message: err.message });
    }
  }

  async function confirmDelete() {
    const { vehicleId } = deleteModal;
    setDeleteModal(null);
    const res = await api.deleteVehicle(vehicleId);
    if (res.ok) {
      setFlash({ type: 'success', message: 'Vehículo eliminado.' });
      setTimeout(() => navigate('/dashboard'), 1000);
    } else {
      setFlash({ type: 'error', message: res.error });
    }
  }

  return (
    <Layout>
      <section className="dashboard">
        <div className="dashboard-header">
          <div>
            <h2>{vehicle.modelo || vehicle.model}</h2>
            <p>Matrícula: <strong>{vehicle.matricula || vehicle.plate}</strong> · {company?.name}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
            <Link to="/dashboard" className="button button-outline" style={{ flex: 1, minWidth: '120px', textAlign: 'center', fontSize: '1rem' }}>← Volver al panel</Link>
            {user?.rol === 'admin' && (
              <>
                <button
                  className="button button-outline"
                  onClick={() => setEditVehicleModal({
                    vehicleId: vehicle.id_vehiculo || vehicle.id,
                    matricula: vehicle.matricula || vehicle.plate,
                    marca: vehicle.marca || vehicle.brand || '',
                    modelo: vehicle.modelo || vehicle.model || ''
                  })}
                  style={{ flex: 1, minWidth: '120px', fontSize: '1rem' }}
                >
                  Editar
                </button>
                <button
                  className="button button-warning"
                  disabled={maintLoading}
                  onClick={() => {
                    if (inMaint) {
                      handleEndMaintenance(vehicle.id_vehiculo || vehicle.id, vehicle.modelo || vehicle.model);
                    } else {
                      setMaintModal({ vehicleId: vehicle.id_vehiculo || vehicle.id, vehicleName: vehicle.modelo || vehicle.model, reason: '' });
                    }
                  }}
                  style={{ flex: 1, minWidth: '120px', fontSize: '1rem' }}
                >
                  {inMaint ? 'Acabar mant.' : 'Mantenimiento'}
                </button>
                <button
                  className="button button-danger"
                  onClick={() => setDeleteModal({ vehicleId: vehicle.id_vehiculo || vehicle.id, vehicleName: vehicle.modelo || vehicle.model })}
                  style={{ flex: 1, minWidth: '120px', fontSize: '1rem' }}
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>

        {flash && <Alert type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}

        <div className="admin-cards">
          <div className="admin-card">
            <h3>Estado</h3>
            <Badge states={states} />
          </div>
          <div className="admin-card admin-card-employees">
            <h3>Ubicación</h3>
            <span className="stat-number" style={{ fontSize: '1.2rem' }}>{vehicle.ubicacion || vehicle.location || 'N/A'}</span>
          </div>
          <div className="admin-card admin-card-requests">
            <h3>Total viajes</h3>
            <span className="stat-number">{vehicleTrips.length}</span>
          </div>
          <div className="admin-card">
            <h3>Km totales</h3>
            <span className="stat-number">{vehicle.totalKm ?? 0}</span>
            <p>kilómetros</p>
          </div>
        </div>

        {/* ── Checkout (vehículo disponible) ── */}
        {isAvailable && (
          <div className="table-section">
            <h3>Registrar salida</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480 }}>

              {/* Destino */}
              <div className="field">
                <label htmlFor="checkout-dest">
                  Destino <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.85rem' }}>(opcional)</span>
                </label>
                <input
                  id="checkout-dest"
                  type="text"
                  placeholder="Ciudad o dirección"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                />
              </div>

              {/* Conductor — solo admin */}
              {user?.rol === 'admin' && companyUsers.length > 0 && (
                <div className="field">
                  <label htmlFor="checkout-driver">
                    Conductor <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.85rem' }}>(opcional)</span>
                  </label>
                  <select
                    id="checkout-driver"
                    value={checkoutDriverId}
                    onChange={e => {
                      setCheckoutDriverId(e.target.value);
                      setCheckoutPassengers([]);
                      setCheckoutPassengerSelect('');
                    }}
                  >
                    <option value="">— Sin especificar —</option>
                    {companyUsers.map(u => (
                      <option key={u.id_usuario ?? u.id} value={u.id_usuario ?? u.id}>
                        {u.nombre} ({u.rol})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conductor de vuelta */}
              {companyUsers.length > 0 && (
                <div className="field">
                  <label htmlFor="checkout-return-driver">
                    Conductor de vuelta <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.85rem' }}>(opcional)</span>
                  </label>
                  <select
                    id="checkout-return-driver"
                    value={checkoutReturnDriverId}
                    onChange={e => setCheckoutReturnDriverId(e.target.value)}
                  >
                    <option value="">— El mismo conductor de la ida —</option>
                    {companyUsers
                      .filter(u => String(u.id_usuario ?? u.id) !== String(checkoutDriverId || (user?.id_usuario ?? user?.id)))
                      .map(u => (
                        <option key={u.id_usuario ?? u.id} value={u.id_usuario ?? u.id}>
                          {u.nombre} ({u.rol})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Pasajeros */}
              {companyUsers.length > 0 && (
                <div className="field">
                  <label>
                    Pasajeros <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.85rem' }}>(opcional)</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      value={checkoutPassengerSelect}
                      onChange={e => setCheckoutPassengerSelect(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">Seleccionar pasajero…</option>
                      {companyUsers
                        .filter(u => {
                          const uid = String(u.id_usuario ?? u.id);
                          const driverId = String(checkoutDriverId || (user?.id_usuario ?? user?.id));
                          const returnId = String(checkoutReturnDriverId);
                          return uid !== driverId
                            && (!returnId || uid !== returnId)
                            && !checkoutPassengers.some(p => String(p.id) === uid);
                        })
                        .map(u => (
                          <option key={u.id_usuario ?? u.id} value={u.id_usuario ?? u.id}>
                            {u.nombre} ({u.rol})
                          </option>
                        ))}
                    </select>
                    <button
                      className="button button-outline"
                      type="button"
                      disabled={!checkoutPassengerSelect}
                      onClick={() => {
                        const uid = Number(checkoutPassengerSelect);
                        const usr = companyUsers.find(u => (u.id_usuario ?? u.id) === uid);
                        if (usr) {
                          setCheckoutPassengers(prev => [...prev, { id: uid, nombre: usr.nombre }]);
                          setCheckoutPassengerSelect('');
                        }
                      }}
                    >
                      + Añadir
                    </button>
                  </div>
                  {checkoutPassengers.length > 0 && (
                    <ul style={{ margin: '0.5rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {checkoutPassengers.map(p => (
                        <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.95rem' }}>{p.nombre}</span>
                          <button
                            type="button"
                            className="button button-small button-outline"
                            onClick={() => setCheckoutPassengers(prev => prev.filter(x => x.id !== p.id))}
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <button className="button button-primary" onClick={handleCheckout}>
                Registrar salida
              </button>
            </div>
          </div>
        )}

        {/* ── Reseteo de estado (admin, sin viaje activo) ── */}
        {user?.rol === 'admin' && !isAvailable && !activeTrip && (
          <div className="table-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{ margin: 0, color: 'var(--muted)' }}>El vehículo aparece como no disponible sin viaje activo registrado.</p>
            <button className="button button-outline" onClick={() => setResetModal(true)}>
              Restablecer a disponible
            </button>
          </div>
        )}

        {/* ── Viaje activo ── */}
        {activeTrip && (
          <div className="trip-active-card">
            <h3>Viaje en curso</h3>

            <p style={{ margin: `0 0 var(--space-sm)` }}>
              <strong>Conductor:</strong> {activeTrip.driverName} &nbsp;·&nbsp;
              <strong>Salida:</strong> {new Date(activeTrip.checkoutTime).toLocaleString('es-ES')} &nbsp;·&nbsp;
              <strong>Duración:</strong> {duration(activeTrip.checkoutTime, null)}
              {activeTrip.destination && (
                <> &nbsp;·&nbsp; <strong>Destino:</strong> {activeTrip.destination}</>
              )}
            </p>

            {/* Conductor de vuelta */}
            <div style={{ margin: `var(--space-md) 0`, paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
              <label htmlFor="return-driver-active" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Conductor de vuelta <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.85rem' }}>(opcional)</span>
              </label>
              <select
                id="return-driver-active"
                value={returnDriver}
                onChange={(e) => setReturnDriver(e.target.value)}
                style={{ width: '100%', maxWidth: '300px', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.25rem' }}
              >
                <option value="">-- El mismo conductor de la ida --</option>
                {companyUsersList.filter(u => u.id !== user?.id_usuario && u.id_usuario !== user?.id_usuario).map(u => (
                  <option key={u.id || u.id_usuario} value={u.id || u.id_usuario}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Pasajeros */}
            <div style={{ margin: `var(--space-md) 0` }}>
              <strong>Pasajeros ({shownPassengers.length}):</strong>
              {shownPassengers.length === 0 && (
                <span style={{ color: 'var(--muted)', marginLeft: '0.5rem' }}>Sin pasajeros aún.</span>
              )}
              <ul style={{ margin: '0.5rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {shownPassengers.map((p) => (
                  <li key={p.id || p.user_id || p.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>
                      {p.name}
                      {p.user_id && (
                        <span className="badge badge-success" style={{ marginLeft: '0.4rem', fontSize: '0.7rem' }}>
                          empleado
                        </span>
                      )}
                    </span>
                    {canManageTrip && (
                      <button
                        className="button button-small button-danger"
                        onClick={() => handleRemovePassenger(p)}
                        title="Eliminar pasajero"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Añadir pasajero */}
            {canManageTrip && (
              <form onSubmit={handleAddPassenger} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end', marginTop: '0.75rem' }}>
                <div className="field-group">
                  <label htmlFor="passenger-select">Pasajero</label>
                  <select
                    id="passenger-select"
                    className="input-inline"
                    value={selectedUserId}
                    onChange={e => {
                      setSelectedUserId(e.target.value);
                    }}
                  >
                    <option value="">Seleccionar pasajero…</option>
                    {companyUsers
                      .filter(u => (u.id || u.id_usuario) !== (user?.id || user?.id_usuario))
                      .map(u => {
                        const userId = String(u.id || u.id_usuario);
                        return (
                          <option key={userId} value={userId}>{u.nombre} ({u.rol})</option>
                        );
                      })}
                  </select>
                </div>

                <button type="submit" className="button button-small button-outline" disabled={addingPassenger}>
                  + Añadir
                </button>
              </form>
            )}

            {/* Checkin */}
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <button className="button button-outline" onClick={() => setSurveyModal(true)}>
                Registrar llegada
              </button>
            </div>
          </div>
        )}

        {/* ── Historial de viajes ── */}
        <div className="table-section">
          <h3>Historial de viajes</h3>
          {vehicleTrips.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>
              {user?.role === 'empleado'
                ? 'No tienes viajes registrados en este vehículo.'
                : 'Sin viajes registrados.'}
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Conductor</th><th>Destino</th><th>Salida</th><th>Entrada</th><th>Duración</th><th>Km</th><th>Pasajeros</th><th>Encuesta</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {vehicleTrips.map(t => (
                  <tr key={t.id}>
                    <td>{t.driverName}</td>
                    <td>{t.destination || '—'}</td>
                    <td>{new Date(t.checkoutTime).toLocaleString('es-ES')}</td>
                    <td>{t.checkinTime ? new Date(t.checkinTime).toLocaleString('es-ES') : '—'}</td>
                    <td>{duration(t.checkoutTime, t.checkinTime)}</td>
                    <td>{t.km == null ? '—' : `${t.km} km`}</td>
                    <td>
                      {(t.passengers?.length ?? 0) > 0
                        ? `${t.passengers.length} (${t.passengers.map(p => p.name).join(', ')})`
                        : '0'}
                    </td>
                    <td>
                      {t.status === 'completed' ? (
                        <button
                          className="button button-small button-outline"
                          onClick={() => loadSurveyResponses(t.id)}
                          title="Ver respuestas de encuesta"
                        >
                          Ver
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className={`badge ${t.status === 'active' ? 'badge-warning' : 'badge-success'}`}>
                        {t.status === 'active' ? 'En curso' : 'Completado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Historial de mantenimientos ── */}
        <div className="table-section">
          <h3>Historial de mantenimientos</h3>
          {maintenanceHistory.length === 0 ? (
            <p className="empty-state">Sin mantenimientos registrados</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Inicio</th><th>Fin</th><th>Duración</th><th>Motivo</th><th>Factura</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceHistory.map((m, i) => {
                  const inicio = m.fecha_inicio || m.start;
                  const fin = m.fecha_fin || m.end;
                  const motivo = m.descripcion || m.reason;
                  return (
                    <tr key={m.id_mantenimiento || m.id || i}>
                      <td>{inicio ? new Date(inicio).toLocaleDateString('es-ES') : '—'}</td>
                      <td>{fin ? new Date(fin).toLocaleDateString('es-ES') : 'En curso'}</td>
                      <td>{duration(inicio, fin)}</td>
                      <td>{motivo || '—'}</td>
                      <td>
                        {m.invoicePath
                          ? <a href={m.invoicePath} target="_blank" rel="noreferrer" className="button button-small button-outline">Ver</a>
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Modal: restablecer estado ── */}
      {resetModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setResetModal(false)} />
          <dialog open className="modal-box" aria-labelledby="reset-modal-title">
            <h3 id="reset-modal-title">Restablecer a disponible</h3>
            <p>El vehículo pasará a estado <strong>disponible</strong> aunque no haya un viaje registrado. Usa esto solo si el estado es incorrecto.</p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setResetModal(false)}>Cancelar</button>
              <button className="button button-primary" onClick={confirmResetState}>Restablecer</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: encuesta de devolución ── */}
      {surveyModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setSurveyModal(false)} />
          <dialog open className="modal-box modal-survey" aria-labelledby="survey-title">
            <h3 id="survey-title">Registrar llegada</h3>
            {surveyTemplate ? (
              <>
                <p style={{ color: 'var(--muted)', marginTop: 0 }}>Responde las preguntas de la encuesta.</p>
                {surveyTemplate.questions.map((q, idx) => {
                  return (
                  <div key={q.id || idx} className="field">
                    <label htmlFor={`q-${q.id}`}>
                      {q.text || q.texto}
                      {q.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    {q.type === 'text' && (
                      <input
                        id={`q-${q.id}`}
                        type="text"
                        value={surveyAnswers[q.id] || ''}
                        onChange={(e) => setSurveyAnswers({ ...surveyAnswers, [q.id]: e.target.value })}
                        placeholder="Escribe tu respuesta..."
                      />
                    )}
                    {q.type === 'number' && (
                      <input
                        id={`q-${q.id}`}
                        type="number"
                        value={surveyAnswers[q.id] || ''}
                        onChange={(e) => setSurveyAnswers({ ...surveyAnswers, [q.id]: e.target.value })}
                        placeholder="Escribe un número..."
                      />
                    )}
                    {q.type === 'km' && (
                      <input
                        id={`q-${q.id}`}
                        type="number"
                        min="0"
                        value={surveyAnswers[q.id] || ''}
                        onChange={(e) => setSurveyAnswers({ ...surveyAnswers, [q.id]: e.target.value })}
                        placeholder="ej. 142"
                      />
                    )}
                    {q.type === 'boolean' && (
                      <div className="survey-options">
                        <div className="survey-option">
                          <input
                            type="radio"
                            id={`q-${q.id}-true`}
                            name={q.id}
                            value="true"
                            checked={surveyAnswers[q.id] === true || surveyAnswers[q.id] === 'true'}
                            onChange={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: true })}
                          />
                          <label htmlFor={`q-${q.id}-true`}>Sí</label>
                        </div>
                        <div className="survey-option">
                          <input
                            type="radio"
                            id={`q-${q.id}-false`}
                            name={q.id}
                            value="false"
                            checked={surveyAnswers[q.id] === false || surveyAnswers[q.id] === 'false'}
                            onChange={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: false })}
                          />
                          <label htmlFor={`q-${q.id}-false`}>No</label>
                        </div>
                      </div>
                    )}
                    {q.type === 'radio' && (
                      <div className="survey-options">
                        {q.options.map((opt, idx) => {
                          const optId = typeof opt === 'object' ? opt.id : undefined;
                          const optText = typeof opt === 'object' ? opt.text : opt;
                          const inputId = `q-${q.id}-opt-${idx}`;
                          return (
                            <div key={idx} className="survey-option">
                              <input
                                type="radio"
                                id={inputId}
                                name={q.id}
                                value={optId || optText}
                                checked={surveyAnswers[q.id] === (optId || optText)}
                                onChange={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: optId || optText })}
                              />
                              <label htmlFor={inputId}>{optText}</label>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  );
                })}
              </>
            ) : (
              <p style={{ color: 'var(--muted)' }}>No hay encuesta asignada a este vehículo. Confirma la devolución para completar el viaje.</p>
            )}

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <label htmlFor="observacion-text" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Observaciones <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.85rem' }}>(opcional)</span>
              </label>
              <textarea
                id="observacion-text"
                rows={3}
                placeholder="Ej: El vehículo presentaba ruido en la rueda delantera izquierda."
                value={observacionText}
                onChange={e => setObservacionText(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <label htmlFor="return-driver" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Conductor de vuelta <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.85rem' }}>(opcional)</span>
              </label>
              <select
                id="return-driver"
                value={returnDriver}
                onChange={(e) => setReturnDriver(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.25rem', boxSizing: 'border-box' }}
              >
                <option value="">-- El mismo conductor de la ida --</option>
                {companyUsersList.filter(u => u.id !== user?.id_usuario && u.id_usuario !== user?.id_usuario).map(u => (
                  <option key={u.id || u.id_usuario} value={u.id || u.id_usuario}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setSurveyModal(false)}>Cancelar</button>
              <button className="button button-primary" onClick={confirmCheckin}>Confirmar llegada</button>
            </div>
          </dialog>
        </>
      )}

      {viewSurveyModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setViewSurveyModal(null)} />
          <dialog open className="modal-box" aria-labelledby="survey-responses-title">
            <h3 id="survey-responses-title">Respuestas de encuesta</h3>
            {viewSurveyModal.respuestas && viewSurveyModal.respuestas.length > 0 ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {viewSurveyModal.respuestas.map((resp, i) => (
                  <div key={i} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <strong>{resp.texto_pregunta}</strong>
                    <p style={{ marginTop: '0.5rem', color: 'var(--muted)', margin: '0.5rem 0 0 0' }}>
                      {resp.valor_numero && `${resp.valor_numero} km`}
                      {resp.texto_opcion && resp.texto_opcion}
                      {resp.valor_texto && resp.valor_texto}
                      {resp.valor_boolean !== null && resp.valor_boolean !== undefined && (resp.valor_boolean ? 'Sí' : 'No')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1rem', background: 'var(--bg)', borderRadius: '0.375rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--muted)', margin: 0 }}>
                  Este viaje tiene encuesta asignada pero no hay respuestas registradas.
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>
                  Es posible que se haya completado sin responder las preguntas.
                </p>
              </div>
            )}
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setViewSurveyModal(null)}>Cerrar</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: editar vehículo ── */}
      {editVehicleModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setEditVehicleModal(null)} />
          <dialog open className="modal-box" aria-labelledby="edit-vehicle-modal-title">
            <h3 id="edit-vehicle-modal-title">Editar vehículo</h3>
            <div className="field">
              <label htmlFor="edit-matricula">Matrícula</label>
              <input
                id="edit-matricula"
                type="text"
                value={editVehicleModal.matricula}
                onChange={e => setEditVehicleModal(m => ({ ...m, matricula: e.target.value }))}
                placeholder="Matrícula"
              />
            </div>
            <div className="field">
              <label htmlFor="edit-marca">Marca</label>
              <input
                id="edit-marca"
                type="text"
                value={editVehicleModal.marca}
                onChange={e => setEditVehicleModal(m => ({ ...m, marca: e.target.value }))}
                placeholder="Marca"
              />
            </div>
            <div className="field">
              <label htmlFor="edit-modelo">Modelo</label>
              <input
                id="edit-modelo"
                type="text"
                value={editVehicleModal.modelo}
                onChange={e => setEditVehicleModal(m => ({ ...m, modelo: e.target.value }))}
                placeholder="Modelo"
              />
            </div>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setEditVehicleModal(null)}>Cancelar</button>
              <button className="button button-primary" onClick={confirmEditVehicle}>Guardar cambios</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: iniciar mantenimiento ── */}
      {maintModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setMaintModal(null)} />
          <dialog open className="modal-box" aria-labelledby="maint-modal-title">
            <h3 id="maint-modal-title">Iniciar mantenimiento</h3>
            <p>Vehículo: <strong>{maintModal.vehicleName}</strong></p>
            <textarea
              rows={3}
              placeholder="Motivo del mantenimiento (opcional)"
              value={maintModal.reason}
              onChange={e => setMaintModal(m => ({ ...m, reason: e.target.value }))}
              autoFocus
            />
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setMaintModal(null)}>Cancelar</button>
              <button className="button button-warning" onClick={confirmMaintenance}>Iniciar mantenimiento</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: finalizar mantenimiento ── */}
      {endMaintModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setEndMaintModal(null)} />
          <dialog open className="modal-box" aria-labelledby="endmaint-modal-title">
            <h3 id="endmaint-modal-title">Finalizar mantenimiento</h3>
            <p>Vehículo: <strong>{endMaintModal.vehicleName}</strong></p>
            <div className="field">
              <label htmlFor="invoice-file" className="button button-outline file-btn">
                📎 {invoiceFile ? invoiceFile.name : 'Adjuntar factura (opcional)'}
              </label>
              <input
                id="invoice-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={e => setInvoiceFile(e.target.files[0] || null)}
              />
            </div>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setEndMaintModal(null)}>Cancelar</button>
              <button className="button button-primary" onClick={confirmEndMaintenance}>Finalizar</button>
            </div>
          </dialog>
        </>
      )}

      {/* ── Modal: confirmar eliminación ── */}
      {deleteModal && (
        <>
          <button type="button" className="modal-overlay" aria-label="Cerrar" onClick={() => setDeleteModal(null)} />
          <dialog open className="modal-box" aria-labelledby="delete-modal-title">
            <h3 id="delete-modal-title">Eliminar vehículo</h3>
            <p>
              ¿Seguro que quieres eliminar <strong>{deleteModal.vehicleName}</strong>?
              Esta acción es permanente y no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button className="button button-outline" onClick={() => setDeleteModal(null)}>Cancelar</button>
              <button className="button button-danger" onClick={confirmDelete}>Eliminar</button>
            </div>
          </dialog>
        </>
      )}
    </Layout>
  );
}
