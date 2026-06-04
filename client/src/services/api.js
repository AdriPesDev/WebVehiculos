const call = (path, opts = {}) =>
  fetch('/api' + path, { credentials: 'include', ...opts }).then(r => r.json());

const json = (path, method, body) =>
  call(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const api = {
  // Auth
  me:             ()                   => call('/auth/me'),
  login:          (email, password)    => json('/auth/login', 'POST', { email, password }),
  logout:         ()                   => json('/auth/logout', 'POST'),
  register:       (name, email, pass)  => json('/auth/register', 'POST', { name, email, password: pass }),

  // Dashboard
  dashboard:      ()                   => call('/dashboard'),

  // Company
  companyList:    ()                   => call('/company/list'),
  companyCreate:  (companyName, companyEmail) => json('/company/create', 'POST', { companyName, companyEmail }),
  companyJoin:    (companyId)          => json(`/company/join/${companyId}`, 'POST'),

  // Admin — membership
  approveRequest: (requestId, role)    => json(`/admin/request/${requestId}/approve`, 'POST', { role }),
  rejectRequest:  (requestId)          => json(`/admin/request/${requestId}/reject`, 'POST'),

  // Admin — vehicles
  addVehicle:     (data)               => json('/admin/vehicle/add', 'POST', data),
  deleteVehicle:  (vehicleId)          => json('/admin/vehicle/delete', 'POST', { vehicleId }),

  // Admin — maintenance
  startMaintenance: (vehicleId, reason) => json('/admin/maintenance/start', 'POST', { vehicleId, reason: reason || null }),
  endMaintenance: (vehicleId, invoiceFile) => {
    const form = new FormData();
    form.append('vehicleId', vehicleId);
    if (invoiceFile) form.append('invoice', invoiceFile);
    return fetch('/api/admin/maintenance/end', { method: 'POST', credentials: 'include', body: form }).then(r => r.json());
  },

  // Admin — employees
  addEmployee:    (data)               => json('/admin/employee/add', 'POST', data),
  removeEmployee: (userId)             => json('/admin/employee/remove', 'POST', { userId }),

  // Admin — surveys
  createSurvey:   (data)               => json('/admin/survey/create', 'POST', data),
  getSurveys:     ()                   => call('/admin/surveys'),
  deleteSurvey:   (surveyId)           => json(`/admin/survey/${surveyId}`, 'DELETE'),

  // Vehicle detail
  vehicleDetail:  (vehicleId)          => call(`/vehicle/${vehicleId}`),

  // Trips
  checkout:         (vehicleId, driverId, destination)   => json('/vehicle/checkout', 'POST', { vehicleId, driverId: driverId || null, destination: destination || null }),
  resetVehicleState: (vehicleId)                        => json('/admin/vehicle/reset-state', 'POST', { vehicleId }),
  checkin:          (vehicleId, returnDriver, km, survey) => json('/vehicle/checkin', 'POST', { vehicleId, returnDriver, km: km || null, survey: survey || null }),
  addPassenger:     (vehicleId, passengerName, userId)  => json('/trip/add-passenger', 'POST', { vehicleId, passengerName, userId: userId || null }),
  removePassenger:  (vehicleId, passengerIndex)         => json('/trip/remove-passenger', 'POST', { vehicleId, passengerIndex }),

  // Superadmin
  deleteCompany:  (companyId)          => json('/superadmin/company/delete', 'POST', { companyId }),
};
